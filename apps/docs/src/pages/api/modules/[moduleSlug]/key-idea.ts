import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireSession, requireCsrf, jsonError, jsonOk } from '../../../../server/middleware';
import { checkRateLimit } from '../../../../server/ratelimit';
import { upsertKeyIdea, getKeyIdea, KEY_IDEA_MAX_LEN } from '../../../../server/key-ideas';
import { getEnv } from '../../../../server/env';
import { withApiErrors } from '../../../../server/lesson-slugs';
import { loadModuleOrder } from '../../../../server/module-order';

export const prerender = false;

const Body = z.object({
  text: z.string().trim().min(1).max(KEY_IDEA_MAX_LEN),
});

// Save (overwrite) the learner's key idea for a module. PUT, not POST: there
// is one key idea per (user, module), so this replaces a single resource.
export const PUT: APIRoute = async ({ request, params }) => {
  const env = getEnv();
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const moduleSlug = params.moduleSlug;
  if (!moduleSlug) return jsonError(400, 'bad_request', 'Missing module slug');

  const rl = await checkRateLimit(ctx.db, `key-idea:${ctx.session.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!rl.allowed) return jsonError(429, 'rate_limited', 'Too many requests');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'bad_json', 'Could not parse JSON body');
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    const t = (body as { text?: unknown })?.text;
    if (typeof t === 'string' && t.trim().length > KEY_IDEA_MAX_LEN) {
      return jsonError(413, 'too_large', `Key idea exceeds ${KEY_IDEA_MAX_LEN} characters`);
    }
    return jsonError(400, 'bad_request', 'Invalid payload');
  }

  return withApiErrors('modules/key-idea/put', ctx.session.user.id, async () => {
    // Module-known check inside the wrapper: loadModuleOrder hits the content
    // layer, which can throw on a cold Worker.
    const order = await loadModuleOrder();
    if (!order.has(moduleSlug)) return jsonError(404, 'unknown_module', 'Unknown module slug');
    const r = await upsertKeyIdea(ctx.db, ctx.session.user.id, moduleSlug, parsed.data.text);
    return jsonOk({ text: parsed.data.text, updatedAt: r.updatedAt.toISOString() });
  });
};

export const GET: APIRoute = async ({ request, params }) => {
  const env = getEnv();
  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const moduleSlug = params.moduleSlug;
  if (!moduleSlug) return jsonError(400, 'bad_request', 'Missing module slug');

  return withApiErrors('modules/key-idea/get', ctx.session.user.id, async () => {
    const order = await loadModuleOrder();
    if (!order.has(moduleSlug)) return jsonError(404, 'unknown_module', 'Unknown module slug');
    const r = await getKeyIdea(ctx.db, ctx.session.user.id, moduleSlug);
    return jsonOk({ text: r?.text ?? '', updatedAt: r?.updatedAt?.toISOString() ?? null });
  });
};
