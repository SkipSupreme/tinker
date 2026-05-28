import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireSession, requireCsrf, jsonError, jsonOk } from '../../../server/middleware';
import { checkRateLimit } from '../../../server/ratelimit';
import { FsrsCardNotFoundError, gradeReviewCard } from '../../../server/steps';
import { getEnv } from '../../../server/env';
import { withApiErrors } from '../../../server/lesson-slugs';

export const prerender = false;

const Body = z.object({
  stepId: z.string().min(1).max(300),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const rl = await checkRateLimit(ctx.db, `review-grade:${ctx.session.user.id}`, {
    limit: 120,
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

  return withApiErrors('review/grade', ctx.session.user.id, async () => {
    try {
      const r = await gradeReviewCard(
        ctx.db,
        ctx.session.user.id,
        parsed.data.stepId,
        parsed.data.rating,
      );
      return jsonOk({
        stepId: r.stepId,
        due: r.due.getTime(),
        state: r.state,
        reps: r.reps,
        lapses: r.lapses,
      });
    } catch (e) {
      if (e instanceof FsrsCardNotFoundError) {
        return jsonError(404, 'not_found', 'No card for this step');
      }
      throw e;
    }
  });
};
