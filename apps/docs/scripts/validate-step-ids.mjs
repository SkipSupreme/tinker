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
const SLUG_SHAPE = /^[a-z][a-z0-9-]*$/;
const SHORTNAME_SHAPE = /^[A-Za-z0-9-]+$/;

/**
 * Replace fenced code blocks (``` or ~~~, 3+ delimiters, optional info
 * string) and HTML comments (<!-- ... -->) with whitespace that
 * preserves line breaks. We must keep line numbers stable so that
 * subsequent error messages line up with the original source.
 *
 * Behavior:
 *   - A fence opener is a line whose first non-whitespace content is
 *     a run of >=3 of the same delimiter char (` or ~). The closing
 *     fence must use the same char and at least as many delimiters.
 *   - Info strings (e.g. ```mdx, ```{filename=foo.mjs}) are allowed
 *     on the opener line and are blanked out along with the fence body.
 *   - HTML comments <!-- ... --> may span multiple lines.
 *   - Unterminated fences or comments are treated as closing at EOF.
 *     We don't throw; the goal is best-effort scrubbing.
 *   - Inline code with single backticks is left alone. The downstream
 *     tag scanner is anchored on `<TagName` followed by whitespace or
 *     `>`, so inline `<StepCheck>` (with no attributes) doesn't trigger
 *     a false positive in practice.
 *
 * Pure: no I/O, no globals. Exported for unit testing.
 */
export function stripIgnorableRegions(source) {
  // Replace every non-newline char in `source.slice(start, end)` with a
  // space, preserving newlines. Returns the rebuilt string.
  function blank(input, start, end) {
    let blanked = '';
    for (let i = start; i < end; i++) {
      blanked += input[i] === '\n' ? '\n' : ' ';
    }
    return input.slice(0, start) + blanked + input.slice(end);
  }

  let result = source;

  // Pass 1: HTML comments. Do these first so a comment containing the
  // text "```" can't accidentally be interpreted as a fence opener.
  // Walk left-to-right so nested/sequential comments are all caught.
  {
    let i = 0;
    while (i < result.length) {
      const open = result.indexOf('<!--', i);
      if (open === -1) break;
      const close = result.indexOf('-->', open + 4);
      const end = close === -1 ? result.length : close + 3;
      result = blank(result, open, end);
      i = end;
    }
  }

  // Pass 2: fenced code blocks. Scan line by line to identify openers,
  // then find the next line whose first non-whitespace run is the same
  // delimiter char with >= the opening fence's count.
  {
    const lines = result.split('\n');
    // Track byte offsets for each line start so we can call blank() on
    // the original `result` string by character range.
    const lineStarts = new Array(lines.length);
    {
      let off = 0;
      for (let i = 0; i < lines.length; i++) {
        lineStarts[i] = off;
        off += lines[i].length + 1; // +1 for the \n we split on
      }
    }
    const fenceOpener = /^(\s*)(`{3,}|~{3,})(.*)$/;

    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(fenceOpener);
      if (!m) {
        i++;
        continue;
      }
      const delimChar = m[2][0]; // '`' or '~'
      const openCount = m[2].length;

      // Search for a matching closer.
      let closeLine = -1;
      for (let j = i + 1; j < lines.length; j++) {
        const cm = lines[j].match(/^(\s*)(`{3,}|~{3,})\s*$/);
        if (cm && cm[2][0] === delimChar && cm[2].length >= openCount) {
          closeLine = j;
          break;
        }
      }

      // Unterminated fence: treat as closing at EOF.
      const lastLine = closeLine === -1 ? lines.length - 1 : closeLine;

      const blankFrom = lineStarts[i];
      const blankToExclusive =
        lastLine + 1 < lines.length
          ? lineStarts[lastLine + 1] - 1 // up to (but not including) the \n that terminates the closer line
          : result.length;
      result = blank(result, blankFrom, blankToExclusive);
      i = lastLine + 1;
    }
  }

  return result;
}

/**
 * Find every <StepCheck ...> or <StepChoice ...> opening tag in the source,
 * returning each tag's name, the captured `id="..."` value (or null), and
 * the 1-based line number where the tag starts.
 *
 * Handles multi-line opening tags (id="..." typically lives on the line
 * *after* `<StepCheck`). We grab everything from `<TagName` up to the
 * first `>` that is not inside a JSX expression or a string.
 *
 * Tags inside fenced code blocks and HTML comments are stripped before
 * scanning so example snippets in lesson copy don't trigger false
 * positives.
 *
 * Returns an array of { tag, id, line }.
 */
export function extractTags(source) {
  const cleaned = stripIgnorableRegions(source);
  const tags = [];

  for (const tagName of TAG_NAMES) {
    // Match `<StepCheck` only when followed by a whitespace or `>` so we
    // don't accidentally match a hypothetical <StepCheckThing>.
    const opener = new RegExp(`<${tagName}(?=[\\s>])`, 'g');
    let match;
    while ((match = opener.exec(cleaned)) !== null) {
      const start = match.index;
      const end = findOpeningTagEnd(cleaned, start);
      if (end === -1) {
        // Malformed: no closing `>` found. Skip; the build will surface this.
        continue;
      }
      const tagText = cleaned.slice(start, end + 1);
      const line = lineNumberAt(cleaned, start);

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
 * Build a precise error message describing *why* an id failed ID_SHAPE.
 * The blanket "expected /regex/, slug must be lowercase kebab-case"
 * misled authors when the actual problem was, e.g., a missing '#' or
 * a bad shortname character. Exported for tests.
 */
export function describeMalformedId(id) {
  if (!id.includes('#')) {
    return `malformed id "${id}" is missing the '#' separator (expected '<slug>#<shortname>')`;
  }
  const hashIdx = id.indexOf('#');
  const slug = id.slice(0, hashIdx);
  const shortname = id.slice(hashIdx + 1);
  if (slug === '') {
    return `malformed id "${id}" has an empty slug (expected '<slug>#<shortname>')`;
  }
  if (/[A-Z]/.test(slug)) {
    return `malformed id "${id}" has uppercase in slug "${slug}" (slug must be lowercase kebab-case)`;
  }
  if (!SLUG_SHAPE.test(slug)) {
    return `malformed id "${id}" slug "${slug}" must be lowercase kebab-case starting with a letter`;
  }
  if (shortname === '') {
    return `malformed id "${id}" has an empty shortname after '#'`;
  }
  if (!SHORTNAME_SHAPE.test(shortname)) {
    return `malformed id "${id}" shortname "${shortname}" must be kebab-case (uppercase letters allowed for canonical math variables like L, T, X)`;
  }
  // Defensive fallback: shouldn't be reachable if ID_SHAPE rejected.
  return `malformed id "${id}" does not match expected shape '<slug>#<shortname>'`;
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
        errors.push(`${displayPath}:${line} - ${describeMalformedId(id)}`);
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
