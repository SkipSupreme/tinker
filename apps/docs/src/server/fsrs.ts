import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';

/**
 * Pure-function wrapper around ts-fsrs.
 *
 * ts-fsrs imports are confined to this module so future scheduler swaps
 * (a future FSRS algorithm version, or a different library entirely)
 * are a one-file change.
 *
 * This module does not touch the DB. Phase C (record-review endpoint) owns
 * persistence; fsrs.ts only computes the next card state.
 */

/**
 * FSRS-relevant subset of the `fsrs_card` row. Caller adds userId/stepId/
 * lessonSlug/moduleSlug/knowledgeType when persisting.
 *
 * `state` follows ts-fsrs's enum: 0=new, 1=learning, 2=review, 3=relearning.
 */
export interface FsrsCardState {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3;
  lastReview: Date | null;
}

export type FsrsRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Review log entry. Fields capture the state BEFORE the rating was applied,
 * plus the rating itself and the `now` used for scheduling.
 */
export interface FsrsLog {
  rating: FsrsRating;
  state: 0 | 1 | 2 | 3;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  review: Date;
}

const RATING_TO_ENUM: Record<FsrsRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const ENUM_TO_RATING: Record<number, FsrsRating> = {
  [Rating.Again]: 'again',
  [Rating.Hard]: 'hard',
  [Rating.Good]: 'good',
  [Rating.Easy]: 'easy',
};

// Tinker's review surface is once-per-day spaced repetition, not in-session
// re-practice. Short-term learning steps (default ['1m', '10m']) would force
// us to persist cur_step across sessions in the fsrs_card schema. Disabling
// short-term keeps the wrapper's data shape sufficient and matches the
// Quantum Country / mnemonic-medium pedagogy this layer is modeled after.
// Tuning the rest of the parameters needs months of real review data; doing
// it now would be premature.
const scheduler = fsrs({ enable_short_term: false });

// ts-fsrs flags `elapsed_days` deprecated (planned removal in v6) while the
// runtime still uses it. We read it via index access to keep the deprecation
// hint out of astro-check until we upgrade.
// TODO(ts-fsrs v6): inline `card.elapsed_days` - field will be removed
// in v6; this typed-access shim goes away with the upgrade.
function readElapsedDays(o: { elapsed_days: number }): number {
  return (o as unknown as Record<string, number>).elapsed_days;
}

function toState(card: Card): FsrsCardState {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: readElapsedDays(card),
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as 0 | 1 | 2 | 3,
    lastReview: card.last_review ?? null,
  };
}

function toCard(state: FsrsCardState): Card {
  const card: Card = {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    // learning_steps is unused: we constructed `fsrs` with enable_short_term=false
    // (see top of file), so the scheduler never reads or writes this field.
    // Keep at 0 to satisfy the ts-fsrs Card type.
    learning_steps: 0,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
  };
  if (state.lastReview) {
    card.last_review = state.lastReview;
  }
  return card;
}

/**
 * Create a fresh card in state=0 (new), due immediately.
 *
 * Returns just the FSRS shape — the caller (Phase C) attaches identifiers
 * (userId, stepId, lessonSlug, moduleSlug, knowledgeType) before insert.
 */
export function seedCard(now: Date = new Date()): FsrsCardState {
  const card = createEmptyCard(now);
  return toState(card);
}

/**
 * Apply a rating to a card. Returns the next card state and a review log.
 *
 * The log captures the BEFORE state so callers can write an audit trail
 * alongside the new card state if desired.
 */
export function scheduleNext(
  card: FsrsCardState,
  rating: FsrsRating,
  now: Date = new Date(),
): { card: FsrsCardState; log: FsrsLog } {
  const ratingEnum = RATING_TO_ENUM[rating];
  const result = scheduler.next(toCard(card), now, ratingEnum);

  const nextLog: FsrsLog = {
    rating: ENUM_TO_RATING[result.log.rating],
    state: result.log.state as 0 | 1 | 2 | 3,
    due: result.log.due,
    stability: result.log.stability,
    difficulty: result.log.difficulty,
    elapsedDays: readElapsedDays(result.log),
    scheduledDays: result.log.scheduled_days,
    review: result.log.review,
  };

  return { card: toState(result.card), log: nextLog };
}
