import { describe, expect, it } from 'vitest';
import { resolveKnownStep } from './step-manifest';

describe('resolveKnownStep', () => {
  it('accepts a real step id for its own lesson', () => {
    expect(
      resolveKnownStep(
        'a-fraction-is-one-number#reduce-18-over-24',
        'a-fraction-is-one-number',
      ),
    ).toMatchObject({ lessonSlug: 'a-fraction-is-one-number' });
  });

  it('rejects unknown step ids', () => {
    expect(resolveKnownStep('made-up#step', 'a-fraction-is-one-number')).toBeNull();
  });

  it('rejects a real step id paired with the wrong lesson', () => {
    expect(
      resolveKnownStep(
        'a-fraction-is-one-number#reduce-18-over-24',
        'vectors',
      ),
    ).toBeNull();
  });
});
