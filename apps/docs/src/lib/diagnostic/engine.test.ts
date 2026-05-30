import { describe, it, expect } from 'vitest';
import {
  createSession,
  nextItem,
  recordAnswer,
  isDone,
  result,
  gradeChoice,
  MAX_ITEMS,
  START_LEVEL,
  type DiagnosticSession,
} from './engine';
import { ITEMS, LEVELS, type Level } from './items';

/**
 * Drive a full session for a simulated learner who answers every item at level
 * <= `knownThrough` correctly and everything above it wrong. Returns the final
 * session. `correctAtFrontier` lets us model a shaky learner who gets one of two
 * frontier items right (a 1/2 split).
 */
function runLearner(knownThrough: number): DiagnosticSession {
  let s = createSession();
  let guard = 0;
  while (!isDone(s) && guard++ < 100) {
    const item = nextItem(s);
    if (!item) break;
    s = recordAnswer(s, item, item.level <= knownThrough);
  }
  return s;
}

describe('item bank integrity', () => {
  it('has exactly one correct choice per item', () => {
    for (const it of ITEMS) {
      const correct = it.choices.filter((c) => c.correct);
      expect(correct.length, `item ${it.id}`).toBe(1);
    }
  });

  it('has at least 3 unused items at every level (room for a tie-break third)', () => {
    for (const level of [1, 2, 3, 4, 5] as Level[]) {
      const n = ITEMS.filter((it) => it.level === level).length;
      expect(n, `level ${level}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every level routes to a known entry lesson slug', () => {
    for (const level of [1, 2, 3, 4, 5] as Level[]) {
      expect(LEVELS[level].entryLessonSlug.length).toBeGreaterThan(0);
    }
  });
});

describe('session start', () => {
  it('opens at the median level', () => {
    const s = createSession();
    expect(s.target).toBe(START_LEVEL);
    expect(nextItem(s)?.level).toBe(START_LEVEL);
    expect(isDone(s)).toBe(false);
  });
});

describe('placement by ability (err low, prerequisite propagation)', () => {
  const cases: Array<{ knownThrough: number; entryModule: string; label: string }> = [
    { knownThrough: 0, entryModule: 'm1-pre-algebra', label: 'knows nothing' },
    { knownThrough: 1, entryModule: 'm2-algebra', label: 'arithmetic only' },
    { knownThrough: 2, entryModule: 'm3-trigonometry', label: 'through algebra' },
    { knownThrough: 3, entryModule: 'm5-calculus', label: 'through functions/precalc' },
    { knownThrough: 4, entryModule: 'm8-probability', label: 'through calculus intuition' },
    { knownThrough: 5, entryModule: 'm10-optimization', label: 'clears all five' },
  ];

  for (const c of cases) {
    it(`places a learner who ${c.label} into ${c.entryModule}`, () => {
      const s = runLearner(c.knownThrough);
      expect(isDone(s)).toBe(true);
      expect(result(s).entryModule).toBe(c.entryModule);
    });
  }
});

describe('efficiency — strong and weak learners finish fast', () => {
  it('a learner who clears everything finishes in well under the cap', () => {
    const s = runLearner(5);
    expect(s.answered.length).toBeLessThanOrEqual(8);
    expect(result(s).entryLevel).toBe('cleared');
  });

  it('the modal "calculus is rusty" engineer finishes quickly and lands at m5', () => {
    const s = runLearner(3);
    expect(s.answered.length).toBeLessThanOrEqual(8);
    expect(result(s).entryModule).toBe('m5-calculus');
  });

  it('never exceeds the hard cap', () => {
    for (let k = 0; k <= 5; k++) {
      const s = runLearner(k);
      expect(s.answered.length).toBeLessThanOrEqual(MAX_ITEMS);
    }
  });

  it('never re-tests a level below a confirmed pass (propagation credits prereqs)', () => {
    const s = runLearner(4); // strong; should never ask a level-1 item
    const levelsAsked = new Set(s.answered.map((a) => a.level));
    expect(levelsAsked.has(1)).toBe(false);
    expect(levelsAsked.has(2)).toBe(false);
  });
});

describe('strand readout', () => {
  it('marks passed strands, the entry strand, and the ones ahead', () => {
    const r = result(runLearner(3)); // passes through level 3, starts at level 4 (m5)
    const byLevel = Object.fromEntries(r.strands.map((x) => [x.level, x.status]));
    expect(byLevel[1]).toBe('passed');
    expect(byLevel[2]).toBe('passed');
    expect(byLevel[3]).toBe('passed');
    expect(byLevel[4]).toBe('start');
    expect(byLevel[5]).toBe('ahead');
  });

  it('marks every strand passed when the learner clears all five', () => {
    const r = result(runLearner(5));
    expect(r.strands.every((x) => x.status === 'passed')).toBe(true);
  });
});

describe('a shaky frontier resolves downward (err low)', () => {
  it('a 1/2 split at the frontier draws a third item and does not place high', () => {
    // Learner aces levels 1-3, then at level 4 gets exactly one of the first
    // two right and misses the rest. Should NOT be credited level 4.
    let s = createSession();
    let level4Seen = 0;
    let guard = 0;
    while (!isDone(s) && guard++ < 100) {
      const item = nextItem(s);
      if (!item) break;
      let correct: boolean;
      if (item.level <= 3) correct = true;
      else if (item.level === 4) {
        level4Seen += 1;
        correct = level4Seen === 1; // first L4 right, rest wrong -> 1/2 then fail
      } else correct = false;
      s = recordAnswer(s, item, correct);
    }
    expect(level4Seen).toBeGreaterThanOrEqual(3); // the split forced a third item
    expect(result(s).entryModule).toBe('m5-calculus'); // level 4 NOT credited
  });
});

describe('gradeChoice', () => {
  it('returns true only for the correct option', () => {
    const item = ITEMS.find((i) => i.id === 'l2-expand')!;
    const correctIndex = item.choices.findIndex((c) => c.correct);
    expect(gradeChoice(item, correctIndex)).toBe(true);
    expect(gradeChoice(item, (correctIndex + 1) % item.choices.length)).toBe(false);
    expect(gradeChoice(item, 99)).toBe(false);
  });
});
