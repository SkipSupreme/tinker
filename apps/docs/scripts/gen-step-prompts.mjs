#!/usr/bin/env node
/**
 * gen-step-prompts.mjs
 *
 * Phase E of the stage-1 retention layer. Builds the prompt manifest the
 * /review surface reads at request time. The review page must NOT render
 * lesson MDX (that path runs Astro/Svelte components, widgets, and Step
 * wrappers); instead it resolves a due card's stepId to pre-rendered HTML
 * from this build-time JSON.
 *
 * For every <StepCheck> and <StepChoice> in apps/docs/src/content/lessons/
 * *.mdx, we capture the opening-tag attributes, render the markdown body
 * (prose + $math$) to HTML through the SAME remark-math + rehype-katex
 * pipeline the site uses, and emit:
 *
 *   {
 *     "<stepId>": {
 *       lessonSlug, title, hint,
 *       answerType: "check" | "choice",
 *       promptHTML,
 *       // check:
 *       answer: <number>, answerLabel: <prompt attr | "answer">,
 *       // choice:
 *       single: <bool>, options: [{ html, correct: <bool> }]
 *     }
 *   }
 *
 * Reuses stripIgnorableRegions from validate-step-ids.mjs so <StepCheck>
 * examples inside fenced code blocks / HTML comments don't get scraped.
 *
 * Wired into `prebuild` (after validate-step-ids.mjs) so the JSON always
 * exists before `astro build` bundles the import into the Worker.
 *
 * Output: apps/docs/src/generated/step-prompts.json (committed, not
 * gitignored, so astro check and fresh builds resolve the import).
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';

import { stripIgnorableRegions } from './validate-step-ids.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = resolve(SCRIPT_DIR, '..', 'src', 'content', 'lessons');
const OUT_DIR = resolve(SCRIPT_DIR, '..', 'src', 'generated');
const OUT_FILE = join(OUT_DIR, 'step-prompts.json');

// One shared processor: markdown text -> HTML, matching the site's
// remark-math + rehype-katex config so the KaTeX markup is byte-identical
// to what the lesson body produces.
const md = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex)
  .use(rehypeStringify);

/**
 * Strip embedded JSX components (capitalized tags, e.g. widgets like
 * <BigramHeatmap .../> or <SecantToTangent .../>) from a body before it is
 * rendered as markdown. The /review surface renders the manifest HTML
 * statically and cannot mount Svelte/Astro widgets; left in place, remark
 * HTML-escapes the raw JSX (`&#x3C;BigramHeatmap ...`) into visible garbage.
 *
 * Handles both self-closing (`<Comp ... />`) and paired (`<Comp>..</Comp>`)
 * forms. Multi-line attribute lists (the common widget shape) are covered by
 * the [\s\S] match. <Choice> is handled separately by extractChoices, so it
 * is exempt here.
 */
function stripJsxComponents(body) {
  return body
    .replace(/<([A-Z][A-Za-z0-9]*)\b[\s\S]*?<\/\1>/g, '')
    .replace(/<[A-Z][A-Za-z0-9]*\b[^>]*\/>/g, '')
    .replace(/<[A-Z][A-Za-z0-9]*\b[\s\S]*?>/g, '');
}

/** Render a markdown fragment to a trimmed HTML string. */
function renderMarkdown(source) {
  const html = String(md.processSync(source));
  return html.trim();
}

/**
 * Find each opening tag's terminating `>`, respecting JSX expressions
 * `{...}` and quoted strings (so `answer={6.2832}` and `prompt="a > b"`
 * don't end the tag early). Returns the index of that `>`, or -1.
 *
 * Mirrors findOpeningTagEnd in validate-step-ids.mjs (kept private there).
 */
function findOpeningTagEnd(source, start) {
  let i = start + 1;
  let braceDepth = 0;
  let stringChar = null;
  while (i < source.length) {
    const c = source[i];
    if (stringChar) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === stringChar) stringChar = null;
    } else if (braceDepth > 0) {
      if (c === '{') braceDepth++;
      else if (c === '}') braceDepth--;
      else if (c === '"' || c === "'") stringChar = c;
    } else {
      if (c === '"' || c === "'") stringChar = c;
      else if (c === '{') braceDepth++;
      else if (c === '>') return i;
    }
    i++;
  }
  return -1;
}

/** Pull a double-quoted string attribute (e.g. id="..."). */
function stringAttr(tagText, name) {
  const m = tagText.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

/** Pull a JSX-expression numeric attribute (e.g. answer={6.2832}). */
function numberAttr(tagText, name) {
  const m = tagText.match(new RegExp(`\\b${name}=\\{\\s*([^}]*?)\\s*\\}`));
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

/** True if a bare boolean attribute (e.g. `single`) is present. */
function boolAttr(tagText, name) {
  return new RegExp(`\\b${name}(?=[\\s>])`).test(tagText);
}

/**
 * Extract each <Choice ...>OPTION</Choice> from a StepChoice body. Returns
 * { options: [{ raw, correct }], rest } where `rest` is the body with the
 * Choice lines removed (the prompt markdown).
 */
function extractChoices(body) {
  const options = [];
  const choiceRe = /<Choice\b([^>]*)>([\s\S]*?)<\/Choice>/g;
  let m;
  while ((m = choiceRe.exec(body)) !== null) {
    const attrs = m[1];
    const correct = /\bcorrect(?=[\s>=])/.test(attrs) || /\bcorrect$/.test(attrs.trim());
    options.push({ raw: m[2].trim(), correct });
  }
  const rest = body.replace(choiceRe, '').trim();
  return { options, rest };
}

/**
 * Scan one lesson file for StepCheck / StepChoice blocks and append
 * manifest entries into `out`. `slug` is the filename without .mdx.
 *
 * Returns { check, choice, embedded } counts where `embedded` lists step
 * ids whose body contained a nested JSX component (a widget), which we
 * cannot cleanly render as markdown.
 */
function harvest(slug, rawSource, out) {
  const source = stripIgnorableRegions(rawSource);
  let check = 0;
  let choice = 0;
  const embedded = [];

  for (const tag of ['StepCheck', 'StepChoice']) {
    const opener = new RegExp(`<${tag}(?=[\\s>])`, 'g');
    let match;
    while ((match = opener.exec(source)) !== null) {
      const openStart = match.index;
      const openEnd = findOpeningTagEnd(source, openStart);
      if (openEnd === -1) continue;
      const tagText = source.slice(openStart, openEnd + 1);

      // The matching close tag. StepCheck/StepChoice never nest, so the
      // first occurrence after the opener is the right one.
      const closeTok = `</${tag}>`;
      const closeIdx = source.indexOf(closeTok, openEnd + 1);
      if (closeIdx === -1) continue;

      const body = source.slice(openEnd + 1, closeIdx);

      const id = stringAttr(tagText, 'id');
      if (!id) continue; // validate-step-ids.mjs already enforces presence
      const title = stringAttr(tagText, 'title');
      const hint = stringAttr(tagText, 'hint');

      if (tag === 'StepCheck') {
        check++;
        // A StepCheck body containing a nested JSX component (e.g. a widget)
        // can't be rendered as plain markdown. Flag it; we still render the
        // text we can.
        if (/<[A-Z][A-Za-z0-9]*[\s/>]/.test(body)) embedded.push(id);

        out[id] = {
          lessonSlug: slug,
          title: title ?? null,
          hint: hint ?? null,
          answerType: 'check',
          promptHTML: renderMarkdown(stripJsxComponents(body)),
          answer: numberAttr(tagText, 'answer') ?? null,
          answerLabel: stringAttr(tagText, 'prompt') ?? 'answer',
        };
      } else {
        choice++;
        const { options, rest } = extractChoices(body);
        // After removing <Choice> lines, any remaining JSX component is an
        // embedded widget in the prompt; flag it.
        if (/<[A-Z][A-Za-z0-9]*[\s/>]/.test(rest)) embedded.push(id);

        out[id] = {
          lessonSlug: slug,
          title: title ?? null,
          hint: hint ?? null,
          answerType: 'choice',
          promptHTML: renderMarkdown(stripJsxComponents(rest)),
          single: boolAttr(tagText, 'single'),
          options: options.map((o) => ({
            html: renderMarkdown(o.raw),
            correct: o.correct,
          })),
        };
      }
    }
  }

  return { check, choice, embedded };
}

function run() {
  const names = readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
    .map((e) => e.name)
    .sort();

  const out = {};
  let totalCheck = 0;
  let totalChoice = 0;
  const allEmbedded = [];

  for (const name of names) {
    const slug = name.slice(0, -'.mdx'.length);
    const raw = readFileSync(join(LESSONS_DIR, name), 'utf8');
    const { check, choice, embedded } = harvest(slug, raw, out);
    totalCheck += check;
    totalChoice += choice;
    for (const id of embedded) allEmbedded.push(id);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const total = Object.keys(out).length;
  process.stdout.write(
    `✓ wrote ${total} step prompts (${totalCheck} check, ${totalChoice} choice) to src/generated/step-prompts.json\n`,
  );
  if (allEmbedded.length > 0) {
    process.stdout.write(
      `  note: ${allEmbedded.length} block(s) had embedded JSX in the body (text rendered, component dropped): ${allEmbedded.join(', ')}\n`,
    );
  }
}

run();
