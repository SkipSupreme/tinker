#!/usr/bin/env node
/**
 * validate-step-ids.mjs
 *
 * Phase A2 of the stage-1 retention layer. Walks every lesson MDX file,
 * extracts the `id="..."` attribute from every <StepCheck> and <StepChoice>
 * opening tag, and enforces four invariants:
 *
 *   1. Completeness   - every tag has an id attribute
 *   2. Uniqueness     - no id string appears twice across all lessons
 *   3. Shape          - matches /^[a-z][a-z0-9-]*#[A-Za-z0-9-]+$/
 *   4. Slug match     - pre-# slug matches the MDX filename (without .mdx)
 *
 * On violation, prints clear file:line errors to stderr and exits 1.
 *
 * Scope is strictly apps/docs/src/content/lessons/*.mdx. The dev harness
 * at /dev/step-choice-harness.astro is intentionally excluded.
 *
 * Wired as a `prebuild` script in apps/docs/package.json so the main
 * Astro build fails on any violation. Also exposed as `validate:ids`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = resolve(SCRIPT_DIR, '..', 'src', 'content', 'lessons');

const TAG_NAMES = ['StepCheck', 'StepChoice'];
const ID_SHAPE = /^[a-z][a-z0-9-]*#[A-Za-z0-9-]+$/;

/**
 * Find every <StepCheck ...> or <StepChoice ...> opening tag in the source,
 * returning each tag's name, the captured `id="..."` value (or null), and
 * the 1-based line number where the tag starts.
 *
 * Handles multi-line opening tags (id="..." typically lives on the line
 * *after* `<StepCheck`). We grab everything from `<TagName` up to the
 * first `>` that is not inside a JSX expression or a string.
 *
 * Returns an array of { tag, id, line }.
 */
export function extractTags(source) {
  const tags = [];

  for (const tagName of TAG_NAMES) {
    // Match `<StepCheck` only when followed by a whitespace or `>` so we
    // don't accidentally match a hypothetical <StepCheckThing>.
    const opener = new RegExp(`<${tagName}(?=[\\s>])`, 'g');
    let match;
    while ((match = opener.exec(source)) !== null) {
      const start = match.index;
      const end = findOpeningTagEnd(source, start);
      if (end === -1) {
        // Malformed: no closing `>` found. Skip; the build will surface this.
        continue;
      }
      const tagText = source.slice(start, end + 1);
      const line = lineNumberAt(source, start);

      // Extract id="..." (double-quoted only, matching the codebase
      // convention). If anyone switches to single quotes or curly braces,
      // we'd want to extend this, but for now strict double-quoted matches
      // the entire backfilled corpus.
      const idMatch = tagText.match(/\bid="([^"]*)"/);
      tags.push({
        tag: tagName,
        id: idMatch ? idMatch[1] : null,
        line,
      });
    }
  }

  return tags;
}

/**
 * Given the position of a `<` in source, find the index of the matching
 * closing `>` of the opening tag. We track whether we're inside a JSX
 * expression `{...}` (which can contain `>`) or a string ("..." or '...')
 * and ignore `>` inside either.
 *
 * Returns -1 if no terminator is found.
 */
function findOpeningTagEnd(source, start) {
  let i = start + 1;
  let braceDepth = 0;
  let stringChar = null; // '"' or "'" while inside a string
  while (i < source.length) {
    const c = source[i];
    if (stringChar) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === stringChar) {
        stringChar = null;
      }
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

function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/**
 * Pure validator: takes an array of { filename, content } and returns
 * { errors, stats } where errors is an array of strings (one per
 * violation) and stats is { totalIds, files, stepCheckCount,
 * stepChoiceCount }.
 *
 * `filename` is the bare MDX filename (e.g. "a-fraction-is-one-number.mdx").
 * `displayPath` is what we print in error messages; if omitted we use
 * `filename`.
 */
export function validate(files) {
  const errors = [];
  // id -> first { displayPath, line } we saw it at
  const seen = new Map();
  let stepCheckCount = 0;
  let stepChoiceCount = 0;
  let totalIds = 0;

  for (const file of files) {
    const { filename, content } = file;
    const displayPath = file.displayPath ?? filename;

    if (!filename.endsWith('.mdx')) continue;
    const slug = filename.slice(0, -'.mdx'.length);

    const tags = extractTags(content);
    for (const { tag, id, line } of tags) {
      if (tag === 'StepCheck') stepCheckCount++;
      else if (tag === 'StepChoice') stepChoiceCount++;

      // 1. Completeness
      if (id === null) {
        errors.push(`${displayPath}:${line} - missing id on <${tag}>`);
        continue;
      }

      totalIds++;

      // 2. Uniqueness
      const prior = seen.get(id);
      if (prior) {
        errors.push(
          `${displayPath}:${line} - duplicate id "${id}" (also at ${prior.displayPath}:${prior.line})`,
        );
        // fall through so we still validate shape/slug for this occurrence
      } else {
        seen.set(id, { displayPath, line });
      }

      // 3. Shape
      if (!ID_SHAPE.test(id)) {
        errors.push(
          `${displayPath}:${line} - malformed id "${id}" (expected /^[a-z][a-z0-9-]*#[A-Za-z0-9-]+$/, slug must be lowercase kebab-case)`,
        );
        // Don't run the slug check on a malformed id - the # split is unreliable.
        continue;
      }

      // 4. Slug match
      const hashIdx = id.indexOf('#');
      const idSlug = id.slice(0, hashIdx);
      if (idSlug !== slug) {
        errors.push(
          `${displayPath}:${line} - id slug "${idSlug}" does not match filename "${slug}"`,
        );
      }
    }
  }

  return {
    errors,
    stats: {
      totalIds,
      files: files.filter((f) => f.filename.endsWith('.mdx')).length,
      stepCheckCount,
      stepChoiceCount,
    },
  };
}

/**
 * CLI entry point: read all lesson MDX files from disk, validate them,
 * print results, exit nonzero on any error.
 */
function runCli() {
  const entries = readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
    .map((e) => e.name)
    .sort();

  const files = entries.map((name) => {
    const abs = join(LESSONS_DIR, name);
    return {
      filename: name,
      displayPath: `apps/docs/src/content/lessons/${name}`,
      content: readFileSync(abs, 'utf8'),
    };
  });

  const { errors, stats } = validate(files);

  if (errors.length > 0) {
    for (const err of errors) {
      process.stderr.write(err + '\n');
    }
    process.stderr.write(
      `\nStep ID validation failed: ${errors.length} error${errors.length === 1 ? '' : 's'} across ${stats.files} lesson file${stats.files === 1 ? '' : 's'}.\n`,
    );
    process.exit(1);
  }

  process.stdout.write(
    `✓ Step ID validation: ${stats.totalIds} IDs across ${stats.files} lesson files (${stats.stepCheckCount} StepCheck, ${stats.stepChoiceCount} StepChoice).\n`,
  );
}

// Only run the CLI when invoked directly (node scripts/validate-step-ids.mjs),
// not when imported from a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
