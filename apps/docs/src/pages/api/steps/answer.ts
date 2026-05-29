import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { z } from 'zod';
import { requireSession, requireCsrf, jsonError, jsonOk } from '../../../server/middleware';
import { checkRateLimit } from '../../../server/ratelimit';
import { recordStepAttempt } from '../../../server/steps';
import { getEnv } from '../../../server/env';
import { withApiErrors } from '../../../server/lesson-slugs';
import { resolveKnownStep } from '../../../server/step-manifest';

export const prerender = false;

const Body = z.object({
  step_id: z.string().min(1).max(300),
  lesson_slug: z.string().min(1).max(200),
  module_slug: z.string().min(1).max(200),
  answer: z.string().max(4_000),
  is_correct: z.boolean(),
  rating: z.enum(['again', 'hard', 'good', 'easy']).optional(),
});

let lessonModuleCache: Map<string, string> | null = null;
let lessonModulePromise: Promise<Map<string, string>> | null = null;

async function loadLessonModules(): Promise<Map<string, string>> {
  if (lessonModuleCache) return lessonModuleCache;
  if (lessonModulePromise) return lessonModulePromise;
  lessonModulePromise = (async () => {
    const lessons = await getCollection('lessons', (l) => !l.data.draft);
    lessonModuleCache = new Map(lessons.map((l) => [l.id, l.data.module]));
    return lessonModuleCache;
  })();
  return lessonModulePromise;
}

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

  return withApiErrors('steps/answer', ctx.session.user.id, async () => {
    const knownStep = resolveKnownStep(parsed.data.step_id, parsed.data.lesson_slug);
    if (!knownStep) {
      return jsonError(404, 'unknown_step', 'Unknown step for this lesson');
    }

    const lessonModules = await loadLessonModules();
    const moduleSlug = lessonModules.get(parsed.data.lesson_slug);
    if (!moduleSlug) {
      return jsonError(404, 'unknown_lesson', 'Unknown lesson slug');
    }
    if (parsed.data.module_slug !== moduleSlug) {
      return jsonError(400, 'bad_request', 'module_slug does not match lesson');
    }

    const r = await recordStepAttempt(ctx.db, ctx.session.user.id, {
      stepId: parsed.data.step_id,
      lessonSlug: parsed.data.lesson_slug,
      moduleSlug,
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
