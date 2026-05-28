import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { seedCard, scheduleNext, type FsrsRating } from './fsrs';

const NOW = new Date('2026-01-01T00:00:00Z');

describe('seedCard', () => {
  it('returns a fresh card in state=0 with sensible defaults', () => {
    const card = seedCard(NOW);
    expect(card.state).toBe(0);
    expect(card.due.getTime()).toBe(NOW.getTime());
    expect(card.lastReview).toBeNull();
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.elapsedDays).toBe(0);
    expect(card.scheduledDays).toBe(0);
  });

  it('uses the current time when called without an argument', () => {
    const before = Date.now();
    const card = seedCard();
    const after = Date.now();
    expect(card.due.getTime()).toBeGreaterThanOrEqual(before);
    expect(card.due.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('scheduleNext (fresh card)', () => {
  const ratings: FsrsRating[] = ['again', 'hard', 'good', 'easy'];

  for (const rating of ratings) {
    it(`returns a sensible card shape after rating=${rating}`, () => {
      const seed = seedCard(NOW);
      const { card } = scheduleNext(seed, rating, NOW);

      expect(card.reps).toBeGreaterThan(0);
      expect(card.lastReview?.getTime()).toBe(NOW.getTime());
      // State transitions away from 0 (new) on the first review.
      expect(card.state).toBeGreaterThanOrEqual(1);
      expect(card.state).toBeLessThanOrEqual(3);
      // Due is a valid future-ish date.
      expect(card.due).toBeInstanceOf(Date);
      expect(Number.isFinite(card.due.getTime())).toBe(true);
    });
  }

  it('again-rated fresh card has lapses incremented or stays in learning', () => {
    const seed = seedCard(NOW);
    const { card } = scheduleNext(seed, 'again', NOW);
    // First review with `again` from a new card puts it in learning (1) and
    // does not necessarily increment lapses (lapses count post-review failures).
    expect([1, 3]).toContain(card.state);
  });

  it('easy advances the due date further than hard', () => {
    const seed = seedCard(NOW);
    const hard = scheduleNext(seed, 'hard', NOW).card;
    const easy = scheduleNext(seed, 'easy', NOW).card;
    expect(easy.due.getTime()).toBeGreaterThan(hard.due.getTime());
  });
});

describe('scheduleNext log payload', () => {
  it('returns a log with the rating, the BEFORE state, and review=now', () => {
    const seed = seedCard(NOW);
    const { log } = scheduleNext(seed, 'good', NOW);
    expect(log.rating).toBe('good');
    expect(log.state).toBe(0); // BEFORE state — fresh card was new
    expect(log.review.getTime()).toBe(NOW.getTime());
  });

  it('log.state on the second review reflects the post-first-review state', () => {
    const seed = seedCard(NOW);
    const first = scheduleNext(seed, 'good', NOW);
    const second = scheduleNext(first.card, 'good', new Date(NOW.getTime() + 86_400_000));
    // BEFORE state of the second review equals the AFTER state of the first.
    expect(second.log.state).toBe(first.card.state);
  });
});

describe('scheduleNext across multiple reviews', () => {
  it('preserves state through seed -> good -> good -> again', () => {
    const day = 86_400_000;
    const t0 = NOW;
    const t1 = new Date(NOW.getTime() + day);
    const t2 = new Date(NOW.getTime() + 2 * day);
    const t3 = new Date(NOW.getTime() + 10 * day);

    const seed = seedCard(t0);
    const r1 = scheduleNext(seed, 'good', t1).card;
    const r2 = scheduleNext(r1, 'good', t2).card;
    const r3 = scheduleNext(r2, 'again', t3).card;

    // After a failed review, card is in learning (1) or relearning (3).
    expect([1, 3]).toContain(r3.state);
    // A genuine lapse on a card that had reached review state increments lapses.
    if (r2.state === 2) {
      expect(r3.lapses).toBeGreaterThan(0);
    }
    expect(r3.reps).toBeGreaterThan(r2.reps);
    expect(r3.lastReview?.getTime()).toBe(t3.getTime());
  });
});

describe('library isolation', () => {
  it("only fsrs.ts imports from 'ts-fsrs'", () => {
    const srcDir = resolve(__dirname, '..');
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          walk(full);
        } else if (/\.(ts|tsx|astro|svelte|mts|cts|js|mjs|cjs)$/.test(entry)) {
          // Skip the wrapper itself and this test.
          if (full.endsWith('server/fsrs.ts') || full.endsWith('server/fsrs.test.ts')) continue;
          const text = readFileSync(full, 'utf8');
          if (/from\s+['"]ts-fsrs['"]/.test(text) || /require\(\s*['"]ts-fsrs['"]\s*\)/.test(text)) {
            offenders.push(full);
          }
        }
      }
    }

    walk(srcDir);
    expect(offenders).toEqual([]);
  });
});
