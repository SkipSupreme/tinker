import prompts from '../generated/step-prompts.json';

interface ChoiceOption {
  html: string;
  correct: boolean;
}

interface PromptEntry {
  lessonSlug: string;
  answerType?: 'check' | 'choice';
  /** check: the expected numeric answer (null when the step has no gradeable
      ground truth, e.g. a body that embeds a widget). */
  answer?: number | null;
  /** check: numeric tolerance; defaults to DEFAULT_CHECK_TOLERANCE when null. */
  tolerance?: number | null;
  /** choice: the options in source order; `correct` flags the right ones. */
  options?: ChoiceOption[];
  single?: boolean;
}

const manifest = prompts as Record<string, PromptEntry>;

// Mirrors the client default in Lesson.astro's StepCheck branch.
const DEFAULT_CHECK_TOLERANCE = 0.01;

export function resolveKnownStep(stepId: string, lessonSlug: string): PromptEntry | null {
  const entry = manifest[stepId];
  if (!entry || entry.lessonSlug !== lessonSlug) return null;
  return entry;
}

/**
 * Authoritatively grade a submitted answer against the build-time manifest, so
 * `is_correct` can't be spoofed by the client.
 *
 * Returns `true`/`false` when the step is gradeable, or `null` when it isn't
 * (no numeric answer, no options, or an unparseable submission shape) — callers
 * should fall back to the client-reported value in that case.
 *
 * Wire formats (set by Lesson.astro): check submits the raw numeric string the
 * learner typed; choice submits the picked option indices as a comma-separated
 * string (e.g. "1,3"), indices matching the manifest's `options` order.
 */
export function gradeStepAnswer(entry: PromptEntry, submitted: string): boolean | null {
  if (entry.answerType === 'check') {
    if (typeof entry.answer !== 'number') return null;
    const n = Number.parseFloat(submitted.trim().replace(/,/g, '.'));
    if (!Number.isFinite(n)) return false;
    const tol = typeof entry.tolerance === 'number' ? entry.tolerance : DEFAULT_CHECK_TOLERANCE;
    return Math.abs(n - entry.answer) <= tol;
  }

  if (entry.answerType === 'choice') {
    const options = entry.options;
    if (!options || options.length === 0) return null;
    const picked = parseIndexSet(submitted, options.length);
    if (!picked) return null;
    const correct = new Set(
      options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0),
    );
    if (picked.size !== correct.size) return false;
    for (const i of picked) if (!correct.has(i)) return false;
    return true;
  }

  return null;
}

/** Parse "1,3" -> {1,3}. Returns null if any token is out of range / non-int. */
function parseIndexSet(s: string, optionCount: number): Set<number> | null {
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const set = new Set<number>();
  for (const p of parts) {
    const n = Number.parseInt(p, 10);
    if (!Number.isInteger(n) || n < 0 || n >= optionCount) return null;
    set.add(n);
  }
  return set;
}
