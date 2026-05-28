import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { makeTestDb, type TestDb } from '../../tests/support/d1';
import { user as userTbl, fsrsCard, stepCheck } from './schema';
import {
  FsrsCardNotFoundError,
  getDueCards,
  gradeReviewCard,
  recordStepAttempt,
} from './steps';

const NOW = new Date('2026-01-01T00:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

let db: TestDb;
const USER = 'u-steps';
const OTHER = 'u-other-steps';
const STEP = 'a-fraction-is-one-number#reduce-18-over-24';
const LESSON = 'a-fraction-is-one-number';
const MODULE = 'fractions';

beforeEach(async () => {
  db = makeTestDb();
  const now = new Date();
  await db.client.insert(userTbl).values([
    {
      id: USER,
      email: 'a@b.co',
      emailVerified: true,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: OTHER,
      email: 'c@d.co',
      emailVerified: true,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    },
  ]);
});

afterEach(() => db.close());

describe('recordStepAttempt', () => {
  it('seeds a new fsrs_card on first attempt (attemptNo=1)', async () => {
    const r = await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: '3/4',
        isCorrect: true,
      },
      NOW,
    );

    expect(r.attemptNo).toBe(1);
    expect(r.stepId).toBe(STEP);
    expect(r.rating).toBe('good');

    const cards = await db.client
      .select()
      .from(fsrsCard)
      .where(and(eq(fsrsCard.userId, USER), eq(fsrsCard.stepId, STEP)));
    expect(cards).toHaveLength(1);
    expect(cards[0].moduleSlug).toBe(MODULE);
    expect(cards[0].lessonSlug).toBe(LESSON);
    expect(cards[0].reps).toBeGreaterThan(0);

    const checks = await db.client
      .select()
      .from(stepCheck)
      .where(and(eq(stepCheck.userId, USER), eq(stepCheck.stepId, STEP)));
    expect(checks).toHaveLength(1);
    expect(checks[0].attemptNo).toBe(1);
    expect(checks[0].rating).toBe('good');
    expect(JSON.parse(checks[0].answerJson)).toEqual({ answer: '3/4' });
  });

  it('reuses the existing fsrs_card on a second attempt for the same (user, step)', async () => {
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: 'wrong',
        isCorrect: false,
      },
      NOW,
    );
    const second = await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: '3/4',
        isCorrect: true,
      },
      new Date(NOW.getTime() + DAY_MS),
    );

    expect(second.attemptNo).toBe(2);

    const cards = await db.client
      .select()
      .from(fsrsCard)
      .where(and(eq(fsrsCard.userId, USER), eq(fsrsCard.stepId, STEP)));
    expect(cards).toHaveLength(1);
    // Two reviews recorded on the same card.
    expect(cards[0].reps).toBeGreaterThanOrEqual(2);

    const checks = await db.client
      .select()
      .from(stepCheck)
      .where(and(eq(stepCheck.userId, USER), eq(stepCheck.stepId, STEP)));
    expect(checks).toHaveLength(2);
    const attemptNos = checks.map((c) => c.attemptNo).sort();
    expect(attemptNos).toEqual([1, 2]);
  });

  it("defaults rating to 'good' when isCorrect and no explicit rating", async () => {
    const r = await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: '3/4',
        isCorrect: true,
      },
      NOW,
    );
    expect(r.rating).toBe('good');
  });

  it("defaults rating to 'again' when !isCorrect and no explicit rating", async () => {
    const r = await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: 'wrong',
        isCorrect: false,
      },
      NOW,
    );
    expect(r.rating).toBe('again');
  });

  it('rating advances the due date: easy > good > hard > again', async () => {
    // Distinct stepId per rating so each starts from a fresh card. One
    // user is enough.
    const results: Record<string, Date> = {};
    for (const rating of ['again', 'hard', 'good', 'easy'] as const) {
      const r = await recordStepAttempt(
        db.client,
        USER,
        {
          stepId: `step-${rating}`,
          lessonSlug: LESSON,
          moduleSlug: MODULE,
          answer: 'x',
          isCorrect: rating !== 'again',
          rating,
        },
        NOW,
      );
      results[rating] = r.due;
    }
    expect(results.again.getTime()).toBeLessThan(results.hard.getTime());
    expect(results.hard.getTime()).toBeLessThan(results.good.getTime());
    expect(results.good.getTime()).toBeLessThan(results.easy.getTime());
  });

  it('isolates fsrs_card rows per user for the same stepId', async () => {
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: '3/4',
        isCorrect: true,
      },
      NOW,
    );
    await recordStepAttempt(
      db.client,
      OTHER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: '3/4',
        isCorrect: true,
      },
      NOW,
    );

    const userCards = await db.client
      .select()
      .from(fsrsCard)
      .where(and(eq(fsrsCard.userId, USER), eq(fsrsCard.stepId, STEP)));
    const otherCards = await db.client
      .select()
      .from(fsrsCard)
      .where(and(eq(fsrsCard.userId, OTHER), eq(fsrsCard.stepId, STEP)));
    expect(userCards).toHaveLength(1);
    expect(otherCards).toHaveLength(1);
  });
});

describe('gradeReviewCard', () => {
  it('throws FsrsCardNotFoundError when no card exists for (user, step)', async () => {
    await expect(
      gradeReviewCard(db.client, USER, 'nonexistent#step', 'good', NOW),
    ).rejects.toBeInstanceOf(FsrsCardNotFoundError);
  });

  it('updates the existing card and inserts a review-context step_check row', async () => {
    // Seed a card via the lesson flow first.
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: '3/4',
        isCorrect: true,
      },
      NOW,
    );

    const before = db.client
      .select()
      .from(fsrsCard)
      .where(and(eq(fsrsCard.userId, USER), eq(fsrsCard.stepId, STEP)))
      .get();
    expect(before).toBeTruthy();

    const reviewTime = new Date(NOW.getTime() + 10 * DAY_MS);
    const r = await gradeReviewCard(db.client, USER, STEP, 'good', reviewTime);

    expect(r.stepId).toBe(STEP);
    expect(r.due.getTime()).toBeGreaterThan(reviewTime.getTime());

    const after = db.client
      .select()
      .from(fsrsCard)
      .where(and(eq(fsrsCard.userId, USER), eq(fsrsCard.stepId, STEP)))
      .get();
    expect(after!.reps).toBeGreaterThan(before!.reps);

    const checks = await db.client
      .select()
      .from(stepCheck)
      .where(and(eq(stepCheck.userId, USER), eq(stepCheck.stepId, STEP)));
    // First row from the lesson submit + second from the review grade.
    expect(checks).toHaveLength(2);
    const reviewRow = checks.find((c) => c.attemptNo === 2);
    expect(reviewRow).toBeTruthy();
    expect(reviewRow!.answerJson).toBe('{"context":"review"}');
    expect(reviewRow!.rating).toBe('good');
    expect(reviewRow!.isCorrect).toBe(true);
  });

  it("records isCorrect=false on a 'again' grade", async () => {
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: STEP,
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: '3/4',
        isCorrect: true,
      },
      NOW,
    );
    await gradeReviewCard(db.client, USER, STEP, 'again', new Date(NOW.getTime() + 10 * DAY_MS));
    const checks = await db.client
      .select()
      .from(stepCheck)
      .where(and(eq(stepCheck.userId, USER), eq(stepCheck.stepId, STEP)));
    const reviewRow = checks.find((c) => c.attemptNo === 2)!;
    expect(reviewRow.isCorrect).toBe(false);
    expect(reviewRow.rating).toBe('again');
  });
});

describe('getDueCards', () => {
  it('returns only rows with due <= now', async () => {
    // Seed step A (due ~+1 day from NOW after a 'good' rating).
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: 'step-a',
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: 'x',
        isCorrect: true,
      },
      NOW,
    );
    // Seed step B (also future-due).
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: 'step-b',
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: 'x',
        isCorrect: true,
      },
      NOW,
    );

    // Query at NOW: cards rated 'good' at NOW have due ~24h+ later,
    // so nothing should be due yet.
    const stillFuture = await getDueCards(db.client, USER, 20, NOW);
    expect(stillFuture).toHaveLength(0);

    // Jump 30 days ahead. Both should now be due.
    const later = await getDueCards(db.client, USER, 20, new Date(NOW.getTime() + 30 * DAY_MS));
    expect(later).toHaveLength(2);
  });

  it('orders due rows by due ASC', async () => {
    // A: 'easy' (long interval). B: 'hard' (short interval).
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: 'step-easy',
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: 'x',
        isCorrect: true,
        rating: 'easy',
      },
      NOW,
    );
    await recordStepAttempt(
      db.client,
      USER,
      {
        stepId: 'step-hard',
        lessonSlug: LESSON,
        moduleSlug: MODULE,
        answer: 'x',
        isCorrect: true,
        rating: 'hard',
      },
      NOW,
    );

    // 1 year later, both due. The 'hard' card has a sooner due date.
    const list = await getDueCards(
      db.client,
      USER,
      20,
      new Date(NOW.getTime() + 365 * DAY_MS),
    );
    expect(list.length).toBe(2);
    expect(list[0].stepId).toBe('step-hard');
    expect(list[1].stepId).toBe('step-easy');
    expect(list[0].due.getTime()).toBeLessThan(list[1].due.getTime());
  });

  it('respects the limit argument', async () => {
    for (let i = 0; i < 5; i++) {
      await recordStepAttempt(
        db.client,
        USER,
        {
          stepId: `step-${i}`,
          lessonSlug: LESSON,
          moduleSlug: MODULE,
          answer: 'x',
          isCorrect: true,
        },
        NOW,
      );
    }
    const list = await getDueCards(
      db.client,
      USER,
      2,
      new Date(NOW.getTime() + 30 * DAY_MS),
    );
    expect(list).toHaveLength(2);
  });
});
