import { createAuth, getSession, type AuthEnv, type SessionContext } from './auth';
import { getDb, type DB } from './db';

export interface SessionedContext {
  session: SessionContext;
  db: DB;
  env: AuthEnv;
  auth: ReturnType<typeof createAuth>;
}

export type RequireSessionResult =
  | SessionedContext
  | { error: Response };

export async function requireSession(
  request: Request,
  env: AuthEnv,
): Promise<RequireSessionResult> {
  const auth = createAuth(env);
  const session = await getSession(auth, request.headers);
  if (!session) {
    return { error: jsonError(401, 'unauthorized', 'Sign in required') };
  }
  return { session, db: getDb(env.DB), env, auth };
}

/**
 * CSRF protection for every state-changing request.
 *
 * This used to attempt a double-submit token (a `*.csrf_token` cookie matched
 * against an `x-tinker-csrf` header), but Better Auth 1.6 never mints that
 * cookie and no client ever sends that header, so the token branch was dead
 * code guarded by a green-but-unreachable test. The real, OWASP-endorsed
 * defense is the SameSite=Lax session cookie plus this server-side
 * Origin/Referer check, which fails closed. Keep this as the single, honest
 * entry point so any future weakening of requireSameOrigin is caught by its
 * dedicated tests rather than hidden behind a defunct token path.
 */
export function requireCsrf(request: Request): Response | null {
  return requireSameOrigin(request, new URL(request.url).origin);
}

/**
 * Server-side Origin/Referer check — the app's primary CSRF defense. Called by
 * requireCsrf for all JSON API routes, and directly by the HTML form POSTs in
 * welcome.astro / me.astro. Layered on top of the session cookie's
 * SameSite=Lax setting; fails closed.
 *
 * Returns 403 if Origin/Referer doesn't match PUBLIC_SITE_URL. GET/HEAD are
 * permitted without an Origin (browsers omit it on top-level navigations).
 */
export function requireSameOrigin(request: Request, publicSiteUrl: string): Response | null {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const expectedOrigin = new URL(publicSiteUrl).origin;
  const origin = request.headers.get('origin');
  if (origin) {
    if (origin !== expectedOrigin) {
      return jsonError(403, 'forbidden', 'Origin mismatch');
    }
    return null;
  }
  // No Origin: some legacy form posts. Fall back to Referer prefix check.
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).origin === expectedOrigin) return null;
    } catch {
      // Malformed Referer should fail closed below, not bubble as a 500.
    }
  }
  return jsonError(403, 'forbidden', 'Origin/Referer required for state-changing request');
}

// Authenticated JSON often carries PII (e.g. /api/me/state returns the user's
// email). no-store keeps it out of the browser disk cache and any heuristic
// intermediary cache; these are credentialed same-origin fetches that should
// never be reused.
const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
} as const;

export function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...JSON_HEADERS },
  });
}

export function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS },
  });
}
