/**
 * The adaptive placement engine: a binary search for the learner's knowledge
 * frontier over the five ordered levels in items.ts.
 *
 * Pure and deterministic (no DOM, no fetch, no Math.random) so it unit-tests
 * cleanly. The Svelte component drives it: createSession -> nextItem ->
 * recordAnswer -> (isDone) -> result. To vary item order across runs, pass a
 * pre-shuffled `items` array to createSession; the engine itself never shuffles.
 *
 * The whole design rests on two ideas from the research pass
 * (docs/plans/2026-05-29-m0-diagnostic-placement-design.md):
 *   1. Prerequisite propagation — passing level L credits every level below it,
 *      failing level L debits every level above it, so we test ~one level per
 *      decision instead of all five. This is what lets a strong learner finish
 *      in a handful of questions.
 *   2. Err low — the entry point is `lo + 1`, the first level ABOVE the highest
 *      *confirmed* pass. Anything merely uncertain resolves downward, to the
 *      easier module. Cheap to skim known material; expensive to strand someone.
 */
import { ITEMS, LEVELS, CLEARED_ALL, type DiagnosticItem, type Level } from './items';

/** Hard ceiling on questions. The research's "20-item cap"; rarely reached. */
export const MAX_ITEMS = 20;
/** First probe: the median "did calc in college, forgot it" engineer. */
export const START_LEVEL: Level = 3;

const LEVEL_VALUES: Level[] = [1, 2, 3, 4, 5];
/** `hi === NO_FAIL` means no level has been failed yet (passes everything). */
const NO_FAIL = 6;

export interface AnsweredItem {
  itemId: string;
  level: Level;
  correct: boolean;
}

export interface DiagnosticSession {
  /** Highest level confirmed PASSED (0 = none yet). */
  lo: number;
  /** Lowest level confirmed FAILED (6 = none yet). */
  hi: number;
  /** Level currently being probed. */
  target: Level;
  answered: AnsweredItem[];
  /** Correct/total tallies per level for the mini-probe decision. */
  levelTally: Record<number, { correct: number; total: number }>;
  /** Item pool (defaults to ITEMS; pass a shuffled copy for run-to-run variety). */
  pool: DiagnosticItem[];
  done: boolean;
}

export function createSession(opts: { items?: DiagnosticItem[] } = {}): DiagnosticSession {
  return {
    lo: 0,
    hi: NO_FAIL,
    target: START_LEVEL,
    answered: [],
    levelTally: {},
    pool: opts.items ?? ITEMS,
    done: false,
  };
}

export function isDone(s: DiagnosticSession): boolean {
  return s.done;
}

/** True iff the given choice index is the correct answer for the item. */
export function gradeChoice(item: DiagnosticItem, choiceIndex: number): boolean {
  return Boolean(item.choices[choiceIndex]?.correct);
}

function tallyFor(s: DiagnosticSession, level: number): { correct: number; total: number } {
  return s.levelTally[level] ?? { correct: 0, total: 0 };
}

/**
 * The next item to ask, or null if the session is done / the bank is exhausted
 * at the needed level. Opens a level with a `core` item, holds `hard` items in
 * reserve for the tie-break third question.
 */
export function nextItem(s: DiagnosticSession): DiagnosticItem | null {
  if (s.done) return null;
  const asked = new Set(s.answered.map((a) => a.itemId));
  const rank = { core: 0, easy: 1, hard: 2 } as const;
  const candidates = s.pool
    .filter((it) => it.level === s.target && !asked.has(it.id))
    .sort((a, b) => rank[a.difficulty] - rank[b.difficulty]);
  return candidates[0] ?? null;
}

/**
 * Mini-probe verdict for a level from its running tally:
 *   2/2 -> pass, 0/2 -> fail, 1/2 -> ask a third, then 2-of-3 -> pass else fail.
 */
function decideLevel(t: { correct: number; total: number }): 'pass' | 'fail' | 'undecided' {
  if (t.total < 2) return 'undecided';
  if (t.total === 2) {
    if (t.correct === 2) return 'pass';
    if (t.correct === 0) return 'fail';
    return 'undecided';
  }
  return t.correct >= 2 ? 'pass' : 'fail';
}

const midpoint = (a: number, b: number): Level => Math.floor((a + b) / 2) as Level;

/**
 * Record an answer and advance the search. Returns a new session (immutable).
 * Passing a `done` session is a no-op.
 */
export function recordAnswer(
  s: DiagnosticSession,
  item: DiagnosticItem,
  correct: boolean,
): DiagnosticSession {
  if (s.done) return s;

  const answered = [...s.answered, { itemId: item.id, level: item.level, correct }];
  const prev = tallyFor(s, item.level);
  const levelTally = {
    ...s.levelTally,
    [item.level]: { correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 },
  };

  let { lo, hi, target } = s;
  let done = false;

  const verdict = decideLevel(levelTally[item.level]);
  if (verdict === 'pass') {
    lo = item.level; // credits every level below it
  } else if (verdict === 'fail') {
    hi = item.level; // debits every level above it
  }

  if (verdict !== 'undecided') {
    if (hi - lo <= 1) {
      done = true; // frontier pinned between lo (passed) and lo+1 (failed)
    } else {
      target = midpoint(lo + 1, hi - 1);
    }
  }

  // Hard cap (err low: result() reads the current lo, so uncertain middle
  // levels resolve downward).
  if (answered.length >= MAX_ITEMS) done = true;

  const next: DiagnosticSession = { ...s, answered, levelTally, lo, hi, target, done };

  // Bank exhausted at the level we still need to probe: stop rather than spin.
  if (!next.done && nextItem(next) === null) {
    return { ...next, done: true };
  }
  return next;
}

export type StrandStatus = 'passed' | 'start' | 'ahead';

export interface PlacementResult {
  /** Module to start in, e.g. "m5-calculus" (or "m10-optimization" if cleared). */
  entryModule: string;
  /** First lesson of the entry module (a verified fallback; the page resolves
   *  the live slug at build time and may override this). */
  entryLessonSlug: string;
  /** The level the learner starts at, or 'cleared' when all five are passed. */
  entryLevel: Level | 'cleared';
  itemsAnswered: number;
  /** Per-strand readout for the result screen. */
  strands: Array<{ level: Level; strand: string; status: StrandStatus }>;
  /** Compact frontier, persisted for later calibration/analytics. */
  frontier: { lo: number; hi: number };
}

export function result(s: DiagnosticSession): PlacementResult {
  const { lo, hi } = s;
  const cleared = lo >= 5;
  const entryLevel = (lo + 1) as Level; // err low: first level above confirmed pass
  const meta = cleared ? CLEARED_ALL : LEVELS[entryLevel];

  const strands = LEVEL_VALUES.map((level) => {
    let status: StrandStatus;
    if (level <= lo) status = 'passed';
    else if (!cleared && level === entryLevel) status = 'start';
    else status = 'ahead';
    return { level, strand: LEVELS[level].strand, status };
  });

  return {
    entryModule: meta.entryModule,
    entryLessonSlug: meta.entryLessonSlug,
    entryLevel: cleared ? 'cleared' : entryLevel,
    itemsAnswered: s.answered.length,
    strands,
    frontier: { lo, hi },
  };
}
