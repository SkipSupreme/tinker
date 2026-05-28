import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireSession, requireCsrf, jsonError, jsonOk } from '../../../server/middleware';
import { checkRateLimit } from '../../../server/ratelimit';
import { recordStepAttempt } from '../../../server/steps';
import { getEnv } from '../../../server/env';
import { isKnownLesson, withApiErrors } from '../../../server/lesson-slugs';

export const prerender = false;

const Body = z.object({
  step_id: z.string().min(1).max(300),
  lesson_slug: z.string().min(1).max(200),
  module_slug: z.string().min(1).max(200),
  answer: z.string().max(4_000),
  is_correct: z.boolean(),
  rating: z.enum(['again', 'hard', 'good', 'easy']).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const rl = await checkRateLimit(ctx.db, `step-answer:${ctx.session.user.id}`, {
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

  return withApiErrors('steps/answer', ctx.session.user.id, async () => {
    const r = await recordStepAttempt(ctx.db, ctx.session.user.id, {
      stepId: parsed.data.step_id,
      lessonSlug: parsed.data.lesson_slug,
      moduleSlug: parsed.data.module_slug,
      answer: parsed.data.answer,
      isCorrect: parsed.data.is_correct,
      rating: parsed.data.rating,
    });
    return jsonOk({
      stepId: r.stepId,
      rating: r.rating,
      // Date -> ms at the JSON boundary so the client gets a primitive.
      due: r.due.getTime(),
      state: r.state,
      attemptNo: r.attemptNo,
    });
  });
};
