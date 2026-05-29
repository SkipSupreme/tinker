import { and, desc, eq, max } from 'drizzle-orm';
import { exerciseAnswer } from './schema';
import type { DB } from './db';

export const EXERCISE_ANSWER_MAX_BYTES = 16_384;
const utf8 = new TextEncoder();

export interface ExerciseSubmission {
  lessonSlug: string;
  exerciseId: string;
  answerJson: unknown;
  isCorrect: boolean | null;
}

export type ExerciseAnswerPayloadErrorReason = 'non_serializable' | 'missing' | 'too_large';

export class ExerciseAnswerPayloadError extends Error {
  constructor(
    readonly reason: ExerciseAnswerPayloadErrorReason,
    readonly byteLength?: number,
  ) {
    super(`Invalid exercise answer payload: ${reason}`);
    this.name = 'ExerciseAnswerPayloadError';
  }
}

export function serializeExerciseAnswer(answerJson: unknown): string {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(answerJson);
  } catch {
    throw new ExerciseAnswerPayloadError('non_serializable');
  }

  if (!serialized) {
    throw new ExerciseAnswerPayloadError('missing');
  }

  const byteLength = utf8.encode(serialized).byteLength;
  if (byteLength > EXERCISE_ANSWER_MAX_BYTES) {
    throw new ExerciseAnswerPayloadError('too_large', byteLength);
  }

  return serialized;
}

export async function recordExerciseAnswer(
  db: DB,
  userId: string,
  s: ExerciseSubmission,
): Promise<{ id: string; attemptNo: number }> {
  const serializedAnswer = serializeExerciseAnswer(s.answerJson);
  const createdAt = new Date();
  // attemptNo is MAX+1; under concurrent submissions two inserts can collide on
  // it. The exercise_answer_user_lesson_ex_attempt UNIQUE index turns that into
  // a retryable error rather than a silent duplicate audit row.
  for (let i = 0; ; i++) {
    const prev = await db
      .select({ n: max(exerciseAnswer.attemptNo) })
      .from(exerciseAnswer)
      .where(
        and(
          eq(exerciseAnswer.userId, userId),
          eq(exerciseAnswer.lessonSlug, s.lessonSlug),
          eq(exerciseAnswer.exerciseId, s.exerciseId),
        ),
      )
      .get();
    const attemptNo = (prev?.n ?? 0) + 1;
    const id = crypto.randomUUID();
    try {
      await db.insert(exerciseAnswer).values({
        id,
        userId,
        lessonSlug: s.lessonSlug,
        exerciseId: s.exerciseId,
        answerJson: serializedAnswer,
        isCorrect: s.isCorrect,
        attemptNo,
        createdAt,
      });
      return { id, attemptNo };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (i < 3 && /UNIQUE constraint failed/i.test(msg)) continue;
      throw e;
    }
  }
}

export async function getLatestAnswers(
  db: DB,
  userId: string,
  lessonSlug: string,
): Promise<Array<{ exerciseId: string; answerJson: unknown; isCorrect: boolean | null; attemptNo: number; createdAt: Date }>> {
  const rows = await db
    .select()
    .from(exerciseAnswer)
    .where(and(eq(exerciseAnswer.userId, userId), eq(exerciseAnswer.lessonSlug, lessonSlug)))
    .orderBy(desc(exerciseAnswer.attemptNo), desc(exerciseAnswer.createdAt));
  // Keep only the latest per exerciseId
  const seen = new Set<string>();
  const out: Array<{ exerciseId: string; answerJson: unknown; isCorrect: boolean | null; attemptNo: number; createdAt: Date }> = [];
  for (const r of rows) {
    if (seen.has(r.exerciseId)) continue;
    seen.add(r.exerciseId);
    out.push({
      exerciseId: r.exerciseId,
      answerJson: safeJsonParse(r.answerJson, userId, r.lessonSlug, r.exerciseId),
      isCorrect: r.isCorrect,
      attemptNo: r.attemptNo,
      createdAt: r.createdAt,
    });
  }
  return out;
}

function safeJsonParse(
  s: string,
  userId: string,
  lessonSlug: string,
  exerciseId: string,
): unknown {
  try {
    return JSON.parse(s);
  } catch (e) {
    // Returning null silently means a corrupted answer reads back as
    // "no answer". Log the row identifiers so corruption is discoverable.
    console.error(
      `[exercises] corrupt answerJson user=${userId} lesson=${lessonSlug} ex=${exerciseId}:`,
      e,
    );
    return null;
  }
}
