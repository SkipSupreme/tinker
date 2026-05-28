import type { APIRoute } from 'astro';
import { requireSession, jsonOk } from '../../../server/middleware';
import { countRetainedSkills } from '../../../server/steps';
import { getEnv } from '../../../server/env';
import { withApiErrors } from '../../../server/lesson-slugs';

export const prerender = false;

// Count of the signed-in user's "retained" skills (FSRS retrievability >= 0.9).
// The lesson index (/lessons) is prerendered, so it can't compute this at
// request time the way /me and /review do — it fetches this instead.
export const GET: APIRoute = async ({ request }) => {
  const env = getEnv();
  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  return withApiErrors('me/retained', ctx.session.user.id, async () => {
    const retained = await countRetainedSkills(ctx.db, ctx.session.user.id);
    return jsonOk({ retained });
  });
};
