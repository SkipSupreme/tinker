import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireSession, requireCsrf, jsonError, jsonOk } from '../../../server/middleware';
import { checkRateLimit } from '../../../server/ratelimit';
import {
  EXERCISE_ANSWER_MAX_BYTES,
  ExerciseAnswerPayloadError,
  recordExerciseAnswer,
  serializeExerciseAnswer,
} from '../../../server/exercises';
import { getEnv } from '../../../server/env';
import { isKnownLesson, withApiErrors } from '../../../server/lesson-slugs';

export const prerender = false;

const Body = z.object({
  lesson_slug: z.string().min(1).max(200),
  exercise_id: z.string().min(1).max(200),
  answer_json: z.unknown(),
  is_correct: z.boolean().nullable(),
});

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const rl = await checkRateLimit(ctx.db, `exercise:${ctx.session.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) return jsonError(429, 'rate_limited', 'Too many submissions');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'bad_json', 'Could not parse JSON body');
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return jsonError(400, 'bad_request', 'Invalid payload');

  if (!(await isKnownLesson(parsed.data.lesson_slug))) {
    return jsonError(404, 'unknown_lesson', 'Unknown lesson slug');
  }

  // Reject non-serializable or oversized payloads before writing. The service
  // layer enforces the same cap for defense-in-depth.
  try {
    serializeExerciseAnswer(parsed.data.answer_json);
  } catch (e) {
    if (e instanceof ExerciseAnswerPayloadError) {
      if (e.reason === 'too_large') {
        return jsonError(413, 'too_large', `answer_json exceeds ${EXERCISE_ANSWER_MAX_BYTES} bytes`);
      }
      if (e.reason === 'missing') {
        return jsonError(400, 'bad_request', 'answer_json is required');
      }
    }
    return jsonError(400, 'bad_request', 'answer_json is not JSON-serializable');
  }

  return withApiErrors('exercises/answer', ctx.session.user.id, async () => {
    const result = await recordExerciseAnswer(ctx.db, ctx.session.user.id, {
      lessonSlug: parsed.data.lesson_slug,
      exerciseId: parsed.data.exercise_id,
      answerJson: parsed.data.answer_json,
      isCorrect: parsed.data.is_correct,
    });
    return jsonOk(result);
  });
};
