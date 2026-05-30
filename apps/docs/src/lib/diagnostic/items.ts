/**
 * The M0 placement diagnostic item bank.
 *
 * Items probe five ordered competency LEVELS (1 = arithmetic ... 5 =
 * probability). The adaptive engine (engine.ts) binary-searches the levels for
 * the learner's frontier; the entry module is the module teaching the lowest
 * level they did NOT demonstrate. See docs/plans/2026-05-29-m0-diagnostic-
 * placement-design.md.
 *
 * Design notes that matter for editing:
 * - Each item is single-answer: EXACTLY ONE choice has `correct: true`.
 * - Distractors carry a `misconception` string where they diagnose a specific
 *   error (false distributivity, gambler's fallacy, reciprocal-vs-inverse, ...).
 *   These are not user-facing yet; they're here so a later pass can turn the
 *   result screen into "here's the mistake you made" feedback and so analytics
 *   can cluster errors. Keep them honest.
 * - Math is written in plain Unicode (x², √, ½, π, ≈) on purpose: the engine is
 *   a runtime Svelte component with no KaTeX, and these items are short enough
 *   not to need it. Do NOT introduce $latex$ here.
 * - Voice: engineer-to-engineer, no contrived word problems, no time pressure.
 */

/** A competency rung. 1 is the floor (arithmetic), 5 the ceiling (probability). */
export type Level = 1 | 2 | 3 | 4 | 5;

export interface Choice {
  text: string;
  /** The single correct option. Exactly one per item. */
  correct?: boolean;
  /** If this distractor encodes a specific known error, name it. */
  misconception?: string;
}

export interface DiagnosticItem {
  id: string;
  level: Level;
  /** First-probe ordering hint within a level. The engine opens a level with a
   *  `core` item and keeps `hard` items in reserve for tie-breaks. */
  difficulty: 'easy' | 'core' | 'hard';
  prompt: string;
  choices: Choice[];
}

/**
 * Level metadata: the single source of truth for the strand label shown in the
 * result readout and the module a level routes to. `entryModule` is the module
 * that TEACHES this level — i.e. where a learner who fails it should start.
 */
export interface LevelMeta {
  level: Level;
  /** Short label for the per-strand result readout. */
  strand: string;
  /** Module that teaches this level; the entry point if this is the lowest gap. */
  entryModule: string;
  /** First lesson slug of that module, for the result deep-link. */
  entryLessonSlug: string;
}

export const LEVELS: Record<Level, LevelMeta> = {
  1: { level: 1, strand: 'Arithmetic', entryModule: 'm1-pre-algebra', entryLessonSlug: 'quantities-live-on-a-line' },
  2: { level: 2, strand: 'Algebra', entryModule: 'm2-algebra', entryLessonSlug: 'same-value-different-shape' },
  3: { level: 3, strand: 'Functions & precalc', entryModule: 'm3-trigonometry', entryLessonSlug: 'what-a-radian-actually-is' },
  4: { level: 4, strand: 'Calculus intuition', entryModule: 'm5-calculus', entryLessonSlug: 'what-is-a-derivative' },
  5: { level: 5, strand: 'Probability', entryModule: 'm8-probability', entryLessonSlug: 'what-does-probability-measure' },
};

/**
 * Where a learner who demonstrated ALL five levels starts: the first module of
 * the ML arc. "The math is review for you — start where the ML begins."
 */
export const CLEARED_ALL = {
  entryModule: 'm10-optimization',
  entryLessonSlug: 'minimize-a-function',
};

export const ITEMS: DiagnosticItem[] = [
  // ---------------------------------------------------------------- Level 1
  {
    id: 'l1-frac-add',
    level: 1,
    difficulty: 'core',
    prompt: 'What is  1/2 + 1/3 ?',
    choices: [
      { text: '5/6', correct: true },
      { text: '2/5', misconception: 'adds numerators and denominators straight across' },
      { text: '1/6' },
      { text: '3/5' },
    ],
  },
  {
    id: 'l1-order-ops',
    level: 1,
    difficulty: 'easy',
    prompt: 'Evaluate  2 + 3 × 4.',
    choices: [
      { text: '14', correct: true },
      { text: '20', misconception: 'left-to-right, ignores operator precedence' },
      { text: '24' },
      { text: '9' },
    ],
  },
  {
    id: 'l1-neg',
    level: 1,
    difficulty: 'core',
    prompt: 'Evaluate  −3 − (−7).',
    choices: [
      { text: '4', correct: true },
      { text: '−10', misconception: 'treats minus-a-negative as more negative' },
      { text: '−4' },
      { text: '10' },
    ],
  },
  {
    id: 'l1-percent',
    level: 1,
    difficulty: 'core',
    prompt: 'What is 15% of 80?',
    choices: [
      { text: '12', correct: true },
      { text: '1.2', misconception: 'misplaces the decimal (0.15 vs 0.0015)' },
      { text: '5.33' },
      { text: '15' },
    ],
  },
  {
    id: 'l1-frac-div',
    level: 1,
    difficulty: 'hard',
    prompt: 'What is  (3/4) ÷ (1/2) ?',
    choices: [
      { text: '3/2', correct: true },
      { text: '3/8', misconception: 'multiplies instead of inverting the divisor' },
      { text: '2/3' },
      { text: '4/3' },
    ],
  },
  {
    id: 'l1-exp',
    level: 1,
    difficulty: 'easy',
    prompt: 'What is  2³ ?',
    choices: [
      { text: '8', correct: true },
      { text: '6', misconception: 'multiplies base by exponent' },
      { text: '9' },
      { text: '5' },
    ],
  },

  // ---------------------------------------------------------------- Level 2
  {
    id: 'l2-solve-linear',
    level: 2,
    difficulty: 'easy',
    prompt: 'Solve for x:  3x − 7 = 11.',
    choices: [
      { text: '6', correct: true },
      { text: '4/3', misconception: 'subtracts 7 instead of adding it (sign error)' },
      { text: '18', misconception: 'solves 3x = 18 but forgets to divide by 3' },
      { text: '2' },
    ],
  },
  {
    id: 'l2-expand',
    level: 2,
    difficulty: 'core',
    prompt: 'Expand  (a + b)².',
    choices: [
      { text: 'a² + 2ab + b²', correct: true },
      { text: 'a² + b²', misconception: 'false distributivity: squares each term' },
      { text: 'a² + ab + b²' },
      { text: '2a + 2b' },
    ],
  },
  {
    id: 'l2-factor',
    level: 2,
    difficulty: 'core',
    prompt: 'Which is a factor of  x² + 5x + 6 ?',
    choices: [
      { text: '(x + 2)', correct: true },
      { text: '(x − 2)', misconception: 'sign error in factoring a positive constant term' },
      { text: '(x + 5)' },
      { text: '(x + 1)' },
    ],
  },
  {
    id: 'l2-exp-laws',
    level: 2,
    difficulty: 'core',
    prompt: 'Simplify  x⁵ / x²   (x ≠ 0).',
    choices: [
      { text: 'x³', correct: true },
      { text: 'x²·⁵', misconception: 'divides the exponents' },
      { text: 'x⁷', misconception: 'adds the exponents' },
      { text: 'x¹⁰' },
    ],
  },
  {
    id: 'l2-log',
    level: 2,
    difficulty: 'hard',
    prompt: 'What is  log₂(8) ?',
    choices: [
      { text: '3', correct: true },
      { text: '4', misconception: 'computes 8 ÷ 2' },
      { text: '16' },
      { text: '1/3' },
    ],
  },
  {
    id: 'l2-log-product',
    level: 2,
    difficulty: 'hard',
    prompt: 'Which expression equals  log(a) + log(b) ?',
    choices: [
      { text: 'log(ab)', correct: true },
      { text: 'log(a + b)', misconception: 'confuses log of a product with log of a sum' },
      { text: 'log(a) · log(b)' },
      { text: 'log(a / b)' },
    ],
  },

  // ---------------------------------------------------------------- Level 3
  {
    id: 'l3-fn-eval',
    level: 3,
    difficulty: 'easy',
    prompt: 'If  f(x) = x² − 3,  what is  f(4) ?',
    choices: [
      { text: '13', correct: true },
      { text: '5', misconception: 'reads x² as 2x' },
      { text: '19', misconception: 'computes 4² + 3' },
      { text: '8' },
    ],
  },
  {
    id: 'l3-composition',
    level: 3,
    difficulty: 'core',
    prompt: 'If  f(x) = 2x  and  g(x) = x + 1,  what is  f(g(3)) ?',
    choices: [
      { text: '8', correct: true },
      { text: '7', misconception: 'applies f then g (composition order reversed)' },
      { text: '14' },
      { text: '4', misconception: 'evaluates only the inner function' },
    ],
  },
  {
    id: 'l3-inverse',
    level: 3,
    difficulty: 'hard',
    prompt: 'If  f(x) = 3x + 6,  what is the inverse  f⁻¹(x) ?',
    choices: [
      { text: '(x − 6) / 3', correct: true },
      { text: '1 / (3x + 6)', misconception: 'confuses inverse function with reciprocal' },
      { text: '3x − 6' },
      { text: '(x + 6) / 3' },
    ],
  },
  {
    id: 'l3-fxh',
    level: 3,
    difficulty: 'hard',
    prompt: 'For  f(x) = x²,  what is  f(x + h) ?',
    choices: [
      { text: 'x² + 2xh + h²', correct: true },
      { text: 'x² + h', misconception: 'treats f(x + h) as f(x) + h' },
      { text: 'x² + h²' },
      { text: 'x² + 2x + h' },
    ],
  },
  {
    id: 'l3-radian',
    level: 3,
    difficulty: 'core',
    prompt: 'π radians is how many degrees?',
    choices: [
      { text: '180°', correct: true },
      { text: '90°', misconception: 'confuses π with π/2' },
      { text: '360°', misconception: 'confuses π with 2π (a full turn)' },
      { text: '57.3°' },
    ],
  },
  {
    id: 'l3-sin',
    level: 3,
    difficulty: 'core',
    prompt: 'What is  sin(π/2) ?',
    choices: [
      { text: '1', correct: true },
      { text: '0', misconception: 'confuses sin(π/2) with sin(0) or sin(π)' },
      { text: '1/2' },
      { text: '√2 / 2' },
    ],
  },

  // ---------------------------------------------------------------- Level 4
  {
    id: 'l4-slope',
    level: 4,
    difficulty: 'easy',
    prompt: 'On a position-vs-time graph, where the curve is steepest, the speed is ___.',
    choices: [
      { text: 'highest there', correct: true },
      { text: 'zero there', misconception: 'associates steep slope with a turning point' },
      { text: 'lowest there' },
      { text: 'undefined there' },
    ],
  },
  {
    id: 'l4-limit',
    level: 4,
    difficulty: 'hard',
    prompt: 'As x gets closer and closer to 2, the value of  (x² − 4)/(x − 2)  approaches ___.',
    choices: [
      { text: '4', correct: true },
      { text: 'undefined — it is 0/0', misconception: 'reads the indeterminate form as no limit' },
      { text: '0' },
      { text: '2' },
    ],
  },
  {
    id: 'l4-local-linear',
    level: 4,
    difficulty: 'core',
    prompt: 'Zoom far enough into a smooth curve at one point and it starts to look like ___.',
    choices: [
      { text: 'a straight line', correct: true },
      { text: 'a single point', misconception: 'misses local linearity (the basis of the derivative)' },
      { text: 'a parabola' },
      { text: 'a circle' },
    ],
  },
  {
    id: 'l4-rate',
    level: 4,
    difficulty: 'core',
    prompt: 'A tank fills fast at first, then the depth levels off. Over time, the RATE the depth rises is ___.',
    choices: [
      { text: 'decreasing', correct: true },
      { text: 'increasing', misconception: 'confuses rising depth with a rising rate' },
      { text: 'constant' },
      { text: 'negative' },
    ],
  },
  {
    id: 'l4-tangent',
    level: 4,
    difficulty: 'core',
    prompt: 'The slope of the line just touching  y = x²  at  x = 0  is ___.',
    choices: [
      { text: '0', correct: true },
      { text: '1', misconception: 'guesses a unit slope at the origin' },
      { text: '2' },
      { text: 'undefined' },
    ],
  },
  {
    id: 'l4-inst',
    level: 4,
    difficulty: 'hard',
    prompt: 'Average speed is distance ÷ time over a trip. Instantaneous speed is that same idea with the time interval ___.',
    choices: [
      { text: 'shrinking toward zero', correct: true },
      { text: 'stretched over the whole trip', misconception: 'does not see the instant as a limit' },
      { text: 'fixed at one hour' },
      { text: 'set to the maximum' },
    ],
  },

  // ---------------------------------------------------------------- Level 5
  {
    id: 'l5-two-coins',
    level: 5,
    difficulty: 'core',
    prompt: 'You flip two fair coins. What is the probability of getting two heads?',
    choices: [
      { text: '1/4', correct: true },
      { text: '1/2', misconception: 'does not multiply independent probabilities' },
      { text: '1/3', misconception: 'treats HT and TH as one outcome (3 cases)' },
      { text: '2/3' },
    ],
  },
  {
    id: 'l5-gambler',
    level: 5,
    difficulty: 'core',
    prompt: 'A fair coin lands heads 5 times in a row. The probability the next flip is heads is ___.',
    choices: [
      { text: '1/2', correct: true },
      { text: 'less than 1/2 — tails is "due"', misconception: 'gambler’s fallacy' },
      { text: 'more than 1/2 — heads is "hot"', misconception: 'hot-hand fallacy' },
      { text: '1/32' },
    ],
  },
  {
    id: 'l5-ev',
    level: 5,
    difficulty: 'hard',
    prompt: 'You roll one fair six-sided die and win its face value in dollars. The expected payout is ___.',
    choices: [
      { text: '$3.50', correct: true },
      { text: '$3', misconception: 'guesses the middle face value' },
      { text: '$21', misconception: 'sums the faces but forgets to divide by 6' },
      { text: '$6' },
    ],
  },
  {
    id: 'l5-cond',
    level: 5,
    difficulty: 'hard',
    prompt: 'Draw one card from a standard deck. Given that it is a face card (J, Q, K), the probability it is a King is ___.',
    choices: [
      { text: '1/3', correct: true },
      { text: '1/13', misconception: 'ignores the condition (uses unconditional P)' },
      { text: '1/4' },
      { text: '3/4' },
    ],
  },
  {
    id: 'l5-dist',
    level: 5,
    difficulty: 'easy',
    prompt: 'On a bell-shaped (normal) distribution, most of the data lies ___.',
    choices: [
      { text: 'near the mean', correct: true },
      { text: 'out at the extremes', misconception: 'inverts where mass concentrates' },
      { text: 'evenly across all values' },
      { text: 'below zero' },
    ],
  },
  {
    id: 'l5-range',
    level: 5,
    difficulty: 'easy',
    prompt: 'Which of these can NOT be a probability?',
    choices: [
      { text: '1.4', correct: true },
      { text: '0.99', misconception: 'thinks probabilities cannot be close to 1' },
      { text: '0' },
      { text: '1' },
    ],
  },
];

/** All items at a given level, in author order. */
export function itemsForLevel(level: Level): DiagnosticItem[] {
  return ITEMS.filter((it) => it.level === level);
}
