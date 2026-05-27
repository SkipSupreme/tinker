import type { APIRoute } from 'astro';
import { requireSession, requireCsrf, jsonError, jsonOk } from '../../../server/middleware';
import { checkRateLimit } from '../../../server/ratelimit';
import { deleteBookmark } from '../../../server/bookmarks';
import { getEnv } from '../../../server/env';
import { withApiErrors } from '../../../server/lesson-slugs';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params }) => {
  const env = getEnv();
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const rl = await checkRateLimit(ctx.db, `bookmark:delete:${ctx.session.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) return jsonError(429, 'rate_limited', 'Too many requests');

  const id = params.id;
  if (!id) return jsonError(400, 'bad_request', 'Missing id');

  return withApiErrors('bookmarks/delete', ctx.session.user.id, async () => {
    const r = await deleteBookmark(ctx.db, ctx.session.user.id, id);
    if (!r.deleted) return jsonError(404, 'not_found', 'Bookmark not found');
    return jsonOk({ deleted: true });
  });
};
