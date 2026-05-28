import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { seedCard, scheduleNext, type FsrsRating } from './fsrs';

const NOW = new Date('2026-01-01T00:00:00Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

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

  it('again-rated fresh card jumps straight to review state (enable_short_term=false)', () => {
    const seed = seedCard(NOW);
    const { card } = scheduleNext(seed, 'again', NOW);
    // With enable_short_term=false the learning steps are bypassed, so a
    // fresh card moves directly to state=2 (review) regardless of rating.
    // Lapses count post-review failures, so a first-review `again` does not
    // increment the lapse counter.
    expect(card.state).toBe(2);
    expect(card.lapses).toBe(0);
  });

  it('easy advances the due date further than hard', () => {
    const seed = seedCard(NOW);
    const hard = scheduleNext(seed, 'hard', NOW).card;
    const easy = scheduleNext(seed, 'easy', NOW).card;
    expect(easy.due.getTime()).toBeGreaterThan(hard.due.getTime());
  });

  it('rating ordering: again < hard < good < easy on a fresh card', () => {
    const seed = seedCard(NOW);
    const again = scheduleNext(seed, 'again', NOW).card.due.getTime();
    const hard = scheduleNext(seed, 'hard', NOW).card.due.getTime();
    const good = scheduleNext(seed, 'good', NOW).card.due.getTime();
    const easy = scheduleNext(seed, 'easy', NOW).card.due.getTime();
    // With enable_short_term=false the four ratings land on strictly
    // increasing day-scale intervals (~24h / 48h / 72h / 192h on a fresh
    // card with default params).
    expect(again).toBeLessThan(hard);
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
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
  it('multi-review: seed -> good -> good -> again produces a lapse', () => {
    const seed = seedCard(NOW);
    const r1 = scheduleNext(seed, 'good', NOW).card;
    const r2 = scheduleNext(r1, 'good', new Date(NOW.getTime() + DAY_MS)).card;
    const r3 = scheduleNext(r2, 'again', new Date(NOW.getTime() + 2 * DAY_MS)).card;

    // With enable_short_term=false, the card jumps straight to review (2) on
    // the first rating and stays there: relearning steps (state=3) are
    // skipped, so a lapse increments `lapses` but keeps state at 2.
    expect(r1.state).toBe(2);
    expect(r2.state).toBe(2);
    expect(r3.state).toBe(2);
    expect(r3.lapses).toBe(1);
    expect(r3.reps).toBeGreaterThan(r2.reps);
    expect(r3.lastReview?.getTime()).toBe(NOW.getTime() + 2 * DAY_MS);
  });

  it('handles early review (now < card.due)', () => {
    const seed = seedCard(NOW);
    const r1 = scheduleNext(seed, 'good', NOW).card;
    // Review the card 1 hour later, before its scheduled due time.
    const earlyNow = new Date(NOW.getTime() + 1 * HOUR_MS);
    expect(earlyNow.getTime()).toBeLessThan(r1.due.getTime());
    // Should not throw; should produce a valid next card.
    const { card: r2, log } = scheduleNext(r1, 'good', earlyNow);
    expect(r2.due.getTime()).toBeGreaterThan(earlyNow.getTime());
    expect(log.review.getTime()).toBe(earlyNow.getTime());
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
