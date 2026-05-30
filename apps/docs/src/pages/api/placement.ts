import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireSession, requireCsrf, jsonError, jsonOk } from '../../server/middleware';
import { checkRateLimit } from '../../server/ratelimit';
import { upsertPlacement, getPlacement } from '../../server/placement';
import { loadModuleOrder } from '../../server/module-order';
import { getEnv } from '../../server/env';
import { withApiErrors } from '../../server/lesson-slugs';

export const prerender = false;

const StrandSchema = z.object({
  level: z.number().int().min(1).max(5),
  strand: z.string().min(1).max(60),
  status: z.enum(['passed', 'start', 'ahead']),
});

const Body = z.object({
  course_slug: z.string().min(1).max(100),
  entry_module: z.string().min(1).max(100),
  // '1'..'5' or 'cleared'; accept a number and coerce so the client can send
  // the engine's `entryLevel` verbatim.
  entry_level: z.union([z.number().int(), z.string().min(1).max(20)]).transform(String),
  items_answered: z.number().int().min(0).max(100),
  strands: z.array(StrandSchema).max(10),
  frontier: z.object({ lo: z.number().int(), hi: z.number().int() }),
  // Plain string; the handler parses it and ignores an invalid date.
  taken_at: z.string().max(40).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;

  const rl = await checkRateLimit(ctx.db, `placement:${ctx.session.user.id}`, {
    limit: 10,
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
  if (!parsed.success) return jsonError(400, 'bad_request', 'Invalid payload');

  // Don't trust a client-supplied module slug: it must be a real module.
  const order = await loadModuleOrder();
  if (!order.has(parsed.data.entry_module)) {
    return jsonError(400, 'unknown_module', 'Unknown entry module');
  }

  return withApiErrors('placement/post', ctx.session.user.id, async () => {
    const takenAt = parsed.data.taken_at ? new Date(parsed.data.taken_at) : undefined;
    const r = await upsertPlacement(ctx.db, ctx.session.user.id, {
      courseSlug: parsed.data.course_slug,
      entryModule: parsed.data.entry_module,
      entryLevel: parsed.data.entry_level,
      strandScores: JSON.stringify({
        strands: parsed.data.strands,
        frontier: parsed.data.frontier,
      }),
      itemsAnswered: parsed.data.items_answered,
      takenAt: takenAt && !isNaN(takenAt.getTime()) ? takenAt : undefined,
    });
    return jsonOk({ takenAt: r.takenAt.toISOString() });
  });
};

export const GET: APIRoute = async ({ request, url }) => {
  const env = getEnv();
  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;
  const courseSlug = url.searchParams.get('course') ?? 'ml-math';
  return withApiErrors('placement/get', ctx.session.user.id, async () => {
    const r = await getPlacement(ctx.db, ctx.session.user.id, courseSlug);
    if (!r) return jsonOk({ placement: null });
    return jsonOk({
      placement: {
        courseSlug: r.courseSlug,
        entryModule: r.entryModule,
        entryLevel: r.entryLevel,
        itemsAnswered: r.itemsAnswered,
        takenAt: r.takenAt.toISOString(),
        ...(JSON.parse(r.strandScores) as Record<string, unknown>),
      },
    });
  });
};
