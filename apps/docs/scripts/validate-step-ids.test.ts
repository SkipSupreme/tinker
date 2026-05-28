/**
 * Tests for the step-id build-time validator.
 *
 * The validator's pure core (validate()) accepts an array of in-memory
 * { filename, content } objects, so these tests are hermetic - no fs
 * mocking, no fixture files on disk. A separate smoke test does run the
 * real CLI against the real corpus to catch fs/glob-shaped bugs.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  validate,
  extractTags,
  stripIgnorableRegions,
  describeMalformedId,
} from './validate-step-ids.mjs';

const SCRIPT = resolve(__dirname, 'validate-step-ids.mjs');

describe('extractTags', () => {
  it('captures id from a multi-line StepCheck opening tag', () => {
    const src = [
      'intro text',
      '',
      '<StepCheck',
      '  id="lesson-a#one"',
      '  title="t"',
      '  answer={1}',
      '>',
      'body',
      '</StepCheck>',
    ].join('\n');
    const tags = extractTags(src);
    expect(tags).toEqual([{ tag: 'StepCheck', id: 'lesson-a#one', line: 3 }]);
  });

  it('captures id from a multi-line StepChoice opening tag', () => {
    const src = '<StepChoice\n  id="lesson-b#two"\n  single\n>\nbody\n</StepChoice>';
    const tags = extractTags(src);
    expect(tags).toEqual([{ tag: 'StepChoice', id: 'lesson-b#two', line: 1 }]);
  });

  it('returns id=null when the tag has no id attribute', () => {
    const src = '<StepCheck title="no id here" answer={1}>\n</StepCheck>';
    const tags = extractTags(src);
    expect(tags).toEqual([{ tag: 'StepCheck', id: null, line: 1 }]);
  });

  it('ignores `>` characters inside JSX expressions when finding the tag end', () => {
    // The answer={x > 0 ? 1 : 0} contains a `>` that must NOT be treated
    // as the end of the opening tag.
    const src = '<StepCheck\n  id="lesson-a#expr"\n  answer={x > 0 ? 1 : 0}\n>\n</StepCheck>';
    const tags = extractTags(src);
    expect(tags).toEqual([{ tag: 'StepCheck', id: 'lesson-a#expr', line: 1 }]);
  });

  it('finds multiple tags in the same file', () => {
    const src =
      '<StepCheck id="lesson-a#one" answer={1}>\nx\n</StepCheck>\n\n<StepChoice id="lesson-a#two" single>\ny\n</StepChoice>';
    const tags = extractTags(src);
    expect(tags).toHaveLength(2);
    expect(tags[0].tag).toBe('StepCheck');
    expect(tags[1].tag).toBe('StepChoice');
  });
});

describe('validate', () => {
  it('passes a clean fixture', () => {
    const { errors, stats } = validate([
      {
        filename: 'lesson-a.mdx',
        content:
          '<StepCheck id="lesson-a#one" answer={1}>\n</StepCheck>\n<StepChoice id="lesson-a#two" single>\n</StepChoice>',
      },
    ]);
    expect(errors).toEqual([]);
    expect(stats).toEqual({
      totalIds: 2,
      files: 1,
      stepCheckCount: 1,
      stepChoiceCount: 1,
    });
  });

  // 1. Completeness
  it('flags a missing id on <StepCheck>', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: '\n\n<StepCheck title="t" answer={1}>\n</StepCheck>',
      },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe('lesson-a.mdx:3 - missing id on <StepCheck>');
  });

  // 2. Uniqueness
  it('flags a duplicate id and cites both source locations', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: '<StepCheck id="lesson-a#dup" answer={1}>\n</StepCheck>',
      },
      {
        filename: 'lesson-b.mdx',
        content:
          'line 1\nline 2\nline 3\n<StepCheck id="lesson-a#dup" answer={2}>\n</StepCheck>',
      },
    ]);
    // The duplicate fires once (on the second occurrence). The second
    // occurrence is also caught for slug mismatch (lesson-a# in lesson-b.mdx),
    // which is correct - that's a second, independent invariant violation.
    const dup = errors.find((e) => e.includes('duplicate'));
    expect(dup).toBeDefined();
    expect(dup).toContain('lesson-b.mdx:4');
    expect(dup).toContain('"lesson-a#dup"');
    expect(dup).toContain('lesson-a.mdx:1');
  });

  // 3. Shape - uppercase slug
  it('flags a malformed id whose slug has uppercase letters', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: '<StepCheck id="UPPERCASE-slug#x" answer={1}>\n</StepCheck>',
      },
    ]);
    const malformed = errors.find((e) => e.includes('malformed'));
    expect(malformed).toBeDefined();
    expect(malformed).toContain('"UPPERCASE-slug#x"');
  });

  // 3. Shape - permits uppercase in the shortname portion
  it('accepts canonical math-variable casing (e.g. #L, #X, #W) in the shortname', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content:
          '<StepCheck id="lesson-a#solve-for-L" answer={1}>\n</StepCheck>\n<StepCheck id="lesson-a#what-is-W" answer={2}>\n</StepCheck>',
      },
    ]);
    expect(errors).toEqual([]);
  });

  // 3. Shape - missing #
  it('flags an id missing the # separator', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: '<StepCheck id="lesson-a-no-hash" answer={1}>\n</StepCheck>',
      },
    ]);
    expect(errors.some((e) => e.includes('malformed'))).toBe(true);
  });

  // 4. Slug match
  it('flags a slug mismatch between id prefix and filename', () => {
    const { errors } = validate([
      {
        filename: 'this-lesson.mdx',
        content: '<StepCheck id="other-lesson#x" answer={1}>\n</StepCheck>',
      },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe(
      'this-lesson.mdx:1 - id slug "other-lesson" does not match filename "this-lesson"',
    );
  });

  it('reports multiple distinct violations in the same file', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: [
          '<StepCheck',
          '  id="lesson-a#one"',
          '  answer={1}',
          '>',
          '</StepCheck>',
          '',
          '<StepCheck',
          '  title="missing id"',
          '  answer={2}',
          '>',
          '</StepCheck>',
          '',
          '<StepCheck',
          '  id="Bad-Slug#x"',
          '  answer={3}',
          '>',
          '</StepCheck>',
        ].join('\n'),
      },
    ]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('missing id');
    expect(errors[1]).toContain('malformed');
  });
});

describe('stripIgnorableRegions', () => {
  it('blanks a triple-backtick fence with an mdx info string', () => {
    const src = [
      'before',
      '```mdx',
      '<StepCheck id="x#y" />',
      '```',
      'after',
    ].join('\n');
    const out = stripIgnorableRegions(src);
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
    expect(out).not.toContain('<StepCheck');
    expect(out.startsWith('before\n')).toBe(true);
    expect(out.endsWith('\nafter')).toBe(true);
  });

  it('blanks a bare ``` fence (no info string)', () => {
    const src = '```\n<StepCheck id="x#y" />\n```';
    const out = stripIgnorableRegions(src);
    expect(out).not.toContain('<StepCheck');
    expect(out.split('\n')).toHaveLength(3);
  });

  it('blanks a ~~~ fence', () => {
    const src = '~~~\n<StepCheck id="x#y" />\n~~~';
    const out = stripIgnorableRegions(src);
    expect(out).not.toContain('<StepCheck');
    expect(out.split('\n')).toHaveLength(3);
  });

  it('blanks ```` (four-backtick) fences', () => {
    const src = '````\n```\n<StepCheck id="x#y" />\n```\n````';
    const out = stripIgnorableRegions(src);
    expect(out).not.toContain('<StepCheck');
    expect(out.split('\n')).toHaveLength(5);
  });

  it('blanks HTML comments spanning multiple lines', () => {
    const src = 'before\n<!--\n<StepCheck id="x#y" />\n-->\nafter';
    const out = stripIgnorableRegions(src);
    expect(out).not.toContain('<StepCheck');
    expect(out).not.toContain('<!--');
    expect(out).not.toContain('-->');
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
  });

  it('blanks an inline HTML comment', () => {
    const src = 'a <!-- <StepCheck id="x#y" /> --> b';
    const out = stripIgnorableRegions(src);
    expect(out).not.toContain('<StepCheck');
    expect(out).not.toContain('<!--');
  });

  it('treats an unterminated fence as closing at EOF', () => {
    const src = 'before\n```\n<StepCheck id="x#y" />\n';
    expect(() => stripIgnorableRegions(src)).not.toThrow();
    const out = stripIgnorableRegions(src);
    expect(out).not.toContain('<StepCheck');
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
  });

  it('treats an unterminated comment as closing at EOF', () => {
    const src = 'before\n<!--\n<StepCheck id="x#y" />\n';
    expect(() => stripIgnorableRegions(src)).not.toThrow();
    const out = stripIgnorableRegions(src);
    expect(out).not.toContain('<StepCheck');
  });

  it('preserves line numbers (same line count as input)', () => {
    const src = [
      'line 1',
      'line 2',
      '```mdx',
      '<StepCheck id="x#y" />',
      'still inside fence',
      '```',
      'line 7',
      '<!-- comment',
      'spans here -->',
      'line 10',
    ].join('\n');
    const out = stripIgnorableRegions(src);
    expect(out.split('\n')).toHaveLength(src.split('\n').length);
  });

  it('is a no-op on input with no fences or comments', () => {
    const src = 'plain markdown\n\n<StepCheck id="x#y" />\n\nmore text';
    const out = stripIgnorableRegions(src);
    expect(out).toBe(src);
  });

  it('leaves inline code (single backticks) alone', () => {
    const src = 'see `<StepCheck>` in the docs';
    const out = stripIgnorableRegions(src);
    expect(out).toBe(src);
  });
});

describe('extractTags - fenced/commented regions', () => {
  it('ignores <StepCheck> inside a ```mdx fence', () => {
    const src = [
      'intro',
      '```mdx',
      '<StepCheck id="lesson-a#fenced" answer={1}>',
      '</StepCheck>',
      '```',
    ].join('\n');
    expect(extractTags(src)).toEqual([]);
  });

  it('ignores <StepCheck> inside a bare ``` fence', () => {
    const src = '```\n<StepCheck id="lesson-a#fenced" answer={1}>\n</StepCheck>\n```';
    expect(extractTags(src)).toEqual([]);
  });

  it('ignores <StepCheck> inside a ~~~ fence', () => {
    const src = '~~~\n<StepCheck id="lesson-a#fenced" answer={1}>\n</StepCheck>\n~~~';
    expect(extractTags(src)).toEqual([]);
  });

  it('ignores <StepCheck> inside an HTML comment', () => {
    const src = '<!-- <StepCheck id="lesson-a#commented" answer={1} /> -->';
    expect(extractTags(src)).toEqual([]);
  });

  it('finds only the real tag when both real and fenced examples are present', () => {
    const src = [
      '<StepCheck id="lesson-a#real" answer={1}>', // line 1
      '</StepCheck>',
      '',
      '```mdx',
      '<StepCheck id="lesson-a#fenced-example" answer={2}>',
      '</StepCheck>',
      '```',
    ].join('\n');
    const tags = extractTags(src);
    expect(tags).toEqual([{ tag: 'StepCheck', id: 'lesson-a#real', line: 1 }]);
  });

  it('does not crash on an unterminated fence with content after', () => {
    const src = [
      '<StepCheck id="lesson-a#real" answer={1}>', // line 1
      '</StepCheck>',
      '```',
      '<StepCheck id="lesson-a#fenced-example" answer={2}>',
    ].join('\n');
    expect(() => extractTags(src)).not.toThrow();
    const tags = extractTags(src);
    // Real tag is found, fenced-example after the unterminated fence is dropped.
    expect(tags).toEqual([{ tag: 'StepCheck', id: 'lesson-a#real', line: 1 }]);
  });
});

describe('validate - fenced/commented regions', () => {
  it('does not count or validate <StepCheck> inside a fence', () => {
    const { errors, stats } = validate([
      {
        filename: 'lesson-a.mdx',
        content: [
          '<StepCheck id="lesson-a#real" answer={1}>',
          '</StepCheck>',
          '',
          '```mdx',
          '<StepCheck id="WRONG-slug#x" answer={2}>',
          '</StepCheck>',
          '```',
        ].join('\n'),
      },
    ]);
    expect(errors).toEqual([]);
    expect(stats.totalIds).toBe(1);
    expect(stats.stepCheckCount).toBe(1);
  });
});

describe('describeMalformedId', () => {
  it('flags a missing # separator', () => {
    expect(describeMalformedId('no-hash')).toBe(
      `malformed id "no-hash" is missing the '#' separator (expected '<slug>#<shortname>')`,
    );
  });

  it('flags an empty slug', () => {
    expect(describeMalformedId('#shortname')).toBe(
      `malformed id "#shortname" has an empty slug (expected '<slug>#<shortname>')`,
    );
  });

  it('flags uppercase in the slug', () => {
    expect(describeMalformedId('Bad-Slug#x')).toBe(
      `malformed id "Bad-Slug#x" has uppercase in slug "Bad-Slug" (slug must be lowercase kebab-case)`,
    );
  });

  it('flags a slug that does not start with a letter', () => {
    expect(describeMalformedId('1bad#x')).toBe(
      `malformed id "1bad#x" slug "1bad" must be lowercase kebab-case starting with a letter`,
    );
  });

  it('flags a slug with bad characters (underscore)', () => {
    expect(describeMalformedId('bad_slug#x')).toBe(
      `malformed id "bad_slug#x" slug "bad_slug" must be lowercase kebab-case starting with a letter`,
    );
  });

  it('flags an empty shortname', () => {
    expect(describeMalformedId('lesson-a#')).toBe(
      `malformed id "lesson-a#" has an empty shortname after '#'`,
    );
  });

  it('flags a shortname with bad characters', () => {
    expect(describeMalformedId('lesson-a#bad shortname')).toBe(
      `malformed id "lesson-a#bad shortname" shortname "bad shortname" must be kebab-case (uppercase letters allowed for canonical math variables like L, T, X)`,
    );
  });
});

describe('validate - classified malformed-id errors', () => {
  it('surfaces the missing-# classification through validate()', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: '<StepCheck id="no-hash-here" answer={1}>\n</StepCheck>',
      },
    ]);
    const malformed = errors.find((e) => e.includes('malformed'));
    expect(malformed).toBe(
      `lesson-a.mdx:1 - malformed id "no-hash-here" is missing the '#' separator (expected '<slug>#<shortname>')`,
    );
  });

  it('surfaces the uppercase-slug classification through validate()', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: '<StepCheck id="Bad-Slug#x" answer={1}>\n</StepCheck>',
      },
    ]);
    const malformed = errors.find((e) => e.includes('malformed'));
    expect(malformed).toBe(
      `lesson-a.mdx:1 - malformed id "Bad-Slug#x" has uppercase in slug "Bad-Slug" (slug must be lowercase kebab-case)`,
    );
  });

  it('surfaces the empty-shortname classification through validate()', () => {
    const { errors } = validate([
      {
        filename: 'lesson-a.mdx',
        content: '<StepCheck id="lesson-a#" answer={1}>\n</StepCheck>',
      },
    ]);
    const malformed = errors.find((e) => e.includes('malformed'));
    expect(malformed).toBe(
      `lesson-a.mdx:1 - malformed id "lesson-a#" has an empty shortname after '#'`,
    );
  });
});

describe('CLI smoke test', () => {
  it('passes against the current lesson corpus', () => {
    // Just runs the real CLI; exits 0 if all 240 ids are valid. If the
    // child process exits nonzero, execFileSync throws and the test
    // fails with the validator's stderr included.
    const out = execFileSync('node', [SCRIPT], { encoding: 'utf8' });
    expect(out).toMatch(/✓ Step ID validation: \d+ IDs across \d+ lesson files/);
  });
});
