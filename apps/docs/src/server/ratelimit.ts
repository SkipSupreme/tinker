import { eq } from 'drizzle-orm';
import { rateLimit } from './schema';
import type { DB } from './db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimitOpts {
  limit: number;
  windowMs: number;
}

/**
 * Single-row sliding-window limiter keyed by an arbitrary string.
 * Shares the `rate_limit` table with Better Auth's internal limiter:
 * column shape is `{key, count, last_request}` (see migration 0002).
 *
 * Window is "active" while `last_request` is within windowMs of now;
 * each call advances `last_request`, so a stream of requests at the
 * limit will stay blocked until the caller pauses for windowMs.
 *
 * Idempotent: safe to call from concurrent requests; the worst case
 * is undercounting by one in a tight race, which is acceptable for
 * abuse mitigation (not for billing).
 */
export async function checkRateLimit(
  db: DB,
  key: string,
  opts: RateLimitOpts,
): Promise<RateLimitResult> {
  const now = Date.now();
  const row = await db.select().from(rateLimit).where(eq(rateLimit.key, key)).get();

  if (!row || now - row.lastRequest > opts.windowMs) {
    await db
      .insert(rateLimit)
      .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: { count: 1, lastRequest: now },
      });
    return { allowed: true, remaining: opts.limit - 1, retryAfterMs: 0 };
  }

  if (row.count >= opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: row.lastRequest + opts.windowMs - now,
    };
  }

  await db
    .update(rateLimit)
    .set({ count: row.count + 1, lastRequest: now })
    .where(eq(rateLimit.key, key));
  return {
    allowed: true,
    remaining: opts.limit - 1 - row.count,
    retryAfterMs: 0,
  };
}
