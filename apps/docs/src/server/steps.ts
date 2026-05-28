import { and, asc, eq, lte, max } from 'drizzle-orm';
import { fsrsCard, stepCheck } from './schema';
import type { DB } from './db';
import {
  scheduleNext,
  seedCard,
  type FsrsCardState,
  type FsrsRating,
} from './fsrs';

/**
 * Service layer for the SR (spaced-repetition) loop, backing
 * /api/steps/answer, /api/review/queue, and /api/review/grade.
 *
 * Ties Phase B's `fsrs_card` + `step_check` tables to the Phase D `fsrs.ts`
 * wrapper. Persistence + identifier-mapping live here; the FSRS algorithm
 * stays in fsrs.ts.
 *
 * The endpoint files are thin wrappers (auth -> parse -> call service ->
 * format response). Business logic lives here and is covered by
 * steps.test.ts.
 *
 * All public functions accept an optional `now` parameter so callers
 * (notably tests) can drive deterministic schedules. Production callers
 * leave `now` undefined and get `new Date()`.
 *
 * TODO: there is no integration-test pattern in this codebase for invoking
 * Astro APIRoute modules against a mocked cloudflare:workers env. When one
 * is added (likely with the recap/key-idea/streak endpoint batch in Phase
 * F/I/J), backfill end-to-end coverage for the SR loop.
 */

export interface StepAttemptInput {
  stepId: string;
  lessonSlug: string;
  moduleSlug: string;
  answer: string;
  isCorrect: boolean;
  rating?: FsrsRating;
}

export interface StepAttemptResult {
  stepId: string;
  rating: FsrsRating;
  due: Date;
  state: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
  attemptNo: number;
}

export interface ReviewGradeResult {
  stepId: string;
  due: Date;
  state: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
}

export interface DueCardSummary {
  stepId: string;
  lessonSlug: string;
  moduleSlug: string;
  due: Date;
  state: 0 | 1 | 2 | 3;
  reps: number;
  lapses: number;
}

/**
 * Thrown when {@link gradeReviewCard} is called for a step the user has
 * never attempted. The /review surface is for already-seeded cards; a
 * grade on an unknown step is a client bug, not a 500.
 */
export class FsrsCardNotFoundError extends Error {
  readonly userId: string;
  readonly stepId: string;
  constructor(userId: string, stepId: string) {
    super(`No fsrs_card for user=${userId} step=${stepId}`);
    this.name = 'FsrsCardNotFoundError';
    this.userId = userId;
    this.stepId = stepId;
  }
}

const REVIEW_CONTEXT_SENTINEL = '{"context":"review"}';

function readFsrsRow(row: typeof fsrsCard.$inferSelect): FsrsCardState {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    scheduledDays: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as 0 | 1 | 2 | 3,
    lastReview: row.lastReview ?? null,
  };
}

async function nextAttemptNo(db: DB, userId: string, stepId: string): Promise<number> {
  const prev = await db
    .select({ n: max(stepCheck.attemptNo) })
    .from(stepCheck)
    .where(and(eq(stepCheck.userId, userId), eq(stepCheck.stepId, stepId)))
    .get();
  return (prev?.n ?? 0) + 1;
}

/**
 * Compose insert-or-update for the fsrs_card composite PK (userId, stepId).
 * Drizzle's onConflictDoUpdate maps to SQLite's
 * `INSERT INTO ... ON CONFLICT(user_id, step_id) DO UPDATE SET ...`.
 *
 * The conflict columns are required; without them SQLite errors with
 * "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint".
 */
async function upsertCard(
  db: DB,
  userId: string,
  stepId: string,
  lessonSlug: string,
  moduleSlug: string,
  next: FsrsCardState,
): Promise<void> {
  await db
    .insert(fsrsCard)
    .values({
      userId,
      stepId,
      lessonSlug,
      moduleSlug,
      // Phase C does not classify knowledge type; the Matuschak taxonomy
      // is a Stage-1.5 polish (see plan). Leave null for now.
      knowledgeType: null,
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      elapsedDays: next.elapsedDays,
      scheduledDays: next.scheduledDays,
      reps: next.reps,
      lapses: next.lapses,
      state: next.state,
      lastReview: next.lastReview,
    })
    .onConflictDoUpdate({
      target: [fsrsCard.userId, fsrsCard.stepId],
      set: {
        // Don't touch lessonSlug/moduleSlug on update: those are
        // denormalized identifiers, not mutable state. (A step that
        // changes lesson/module is a rename, handled by step_id_alias,
        // not by mutating an existing row.)
        due: next.due,
        stability: next.stability,
        difficulty: next.difficulty,
        elapsedDays: next.elapsedDays,
        scheduledDays: next.scheduledDays,
        reps: next.reps,
        lapses: next.lapses,
        state: next.state,
        lastReview: next.lastReview,
      },
    });
}

/**
 * Record a step-gate submission from the lesson flow.
 *
 * Seeds a new fsrs_card on first attempt; otherwise applies the rating
 * to the existing card. Always inserts a step_check row with an
 * auto-incremented attemptNo.
 *
 * If the caller doesn't send a rating, default to 'good' on correct,
 * 'again' on incorrect.
 */
export async function recordStepAttempt(
  db: DB,
  userId: string,
  input: StepAttemptInput,
  now: Date = new Date(),
): Promise<StepAttemptResult> {
  const existing = await db
    .select()
    .from(fsrsCard)
    .where(and(eq(fsrsCard.userId, userId), eq(fsrsCard.stepId, input.stepId)))
    .get();

  const prior: FsrsCardState = existing ? readFsrsRow(existing) : seedCard(now);
  const rating: FsrsRating = input.rating ?? (input.isCorrect ? 'good' : 'again');
  const { card: next } = scheduleNext(prior, rating, now);

  await upsertCard(db, userId, input.stepId, input.lessonSlug, input.moduleSlug, next);

  const attemptNo = await nextAttemptNo(db, userId, input.stepId);
  await db.insert(stepCheck).values({
    id: crypto.randomUUID(),
    userId,
    lessonSlug: input.lessonSlug,
    stepId: input.stepId,
    answerJson: JSON.stringify({ answer: input.answer }),
    isCorrect: input.isCorrect,
    rating,
    attemptNo,
    createdAt: now,
  });

  return {
    stepId: input.stepId,
    rating,
    due: next.due,
    state: next.state,
    reps: next.reps,
    lapses: next.lapses,
    attemptNo,
  };
}

/**
 * Apply a rating to an existing fsrs_card from the /review surface.
 *
 * Distinct from {@link recordStepAttempt}: there's no answer to record
 * (the user re-rated the card without re-submitting an answer), and the
 * card must already exist (a review on an un-seeded step is a client bug).
 */
export async function gradeReviewCard(
  db: DB,
  userId: string,
  stepId: string,
  rating: FsrsRating,
  now: Date = new Date(),
): Promise<ReviewGradeResult> {
  const existing = await db
    .select()
    .from(fsrsCard)
    .where(and(eq(fsrsCard.userId, userId), eq(fsrsCard.stepId, stepId)))
    .get();

  if (!existing) {
    throw new FsrsCardNotFoundError(userId, stepId);
  }

  const prior = readFsrsRow(existing);
  const { card: next } = scheduleNext(prior, rating, now);

  await upsertCard(db, userId, stepId, existing.lessonSlug, existing.moduleSlug, next);

  const attemptNo = await nextAttemptNo(db, userId, stepId);
  await db.insert(stepCheck).values({
    id: crypto.randomUUID(),
    userId,
    lessonSlug: existing.lessonSlug,
    stepId,
    // Sentinel meaning "this attempt came from /review, no actual answer
    // was re-submitted." Distinct from a real lesson submission so a
    // future review-history view can filter.
    answerJson: REVIEW_CONTEXT_SENTINEL,
    // Proxy: anything other than 'again' is treated as a pass for the
    // step_check audit row. The authoritative scheduler state is on
    // fsrs_card; this column just lets us count attempts.
    isCorrect: rating !== 'again',
    rating,
    attemptNo,
    createdAt: now,
  });

  return {
    stepId,
    due: next.due,
    state: next.state,
    reps: next.reps,
    lapses: next.lapses,
  };
}

/**
 * List due fsrs_card rows for the user, oldest-due first.
 *
 * "Due" = `due <= now`. Phase E will resolve prompt text via a build-time
 * manifest; this endpoint deliberately returns IDs only.
 */
export async function getDueCards(
  db: DB,
  userId: string,
  limit: number,
  now: Date = new Date(),
): Promise<DueCardSummary[]> {
  const rows = await db
    .select({
      stepId: fsrsCard.stepId,
      lessonSlug: fsrsCard.lessonSlug,
      moduleSlug: fsrsCard.moduleSlug,
      due: fsrsCard.due,
      state: fsrsCard.state,
      reps: fsrsCard.reps,
      lapses: fsrsCard.lapses,
    })
    .from(fsrsCard)
    .where(and(eq(fsrsCard.userId, userId), lte(fsrsCard.due, now)))
    .orderBy(asc(fsrsCard.due))
    .limit(limit);

  return rows.map((r) => ({
    stepId: r.stepId,
    lessonSlug: r.lessonSlug,
    moduleSlug: r.moduleSlug,
    due: r.due,
    state: r.state as 0 | 1 | 2 | 3,
    reps: r.reps,
    lapses: r.lapses,
  }));
}
