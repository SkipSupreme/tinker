import type { APIRoute } from 'astro';
import { requireSession, jsonError, jsonOk } from '../../../server/middleware';
import { getDueCards } from '../../../server/steps';
import { getEnv } from '../../../server/env';
import { withApiErrors } from '../../../server/lesson-slugs';

export const prerender = false;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const GET: APIRoute = async ({ request }) => {
  const env = getEnv();
  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const url = new URL(request.url);
  const rawLimit = url.searchParams.get('limit');
  let limit = DEFAULT_LIMIT;
  if (rawLimit !== null) {
    const n = Number.parseInt(rawLimit, 10);
    if (!Number.isFinite(n) || n <= 0) {
      return jsonError(400, 'bad_request', 'limit must be a positive integer');
    }
    limit = Math.min(n, MAX_LIMIT);
  }

  return withApiErrors('review/queue', ctx.session.user.id, async () => {
    const cards = await getDueCards(ctx.db, ctx.session.user.id, limit);
    return jsonOk({
      cards: cards.map((c) => ({
        stepId: c.stepId,
        lessonSlug: c.lessonSlug,
        moduleSlug: c.moduleSlug,
        due: c.due.getTime(),
        state: c.state,
        reps: c.reps,
        lapses: c.lapses,
      })),
    });
  });
};
