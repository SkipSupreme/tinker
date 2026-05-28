import { createAuth, getSession, type AuthEnv, type SessionContext } from './auth';
import { getDb, type DB } from './db';

const CSRF_COOKIE_PATTERN = /(?:^|;\s*)__Secure-tinker\.csrf_token=([^;]+)/;
const CSRF_DEV_COOKIE_PATTERN = /(?:^|;\s*)tinker\.csrf_token=([^;]+)/;

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

export function requireCsrf(request: Request): Response | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match =
    cookieHeader.match(CSRF_COOKIE_PATTERN) ?? cookieHeader.match(CSRF_DEV_COOKIE_PATTERN);
  const csrfCookie = match?.[1];
  const csrfHeader = request.headers.get('x-tinker-csrf');
  if (csrfCookie && csrfHeader && timingSafeEqual(csrfCookie, csrfHeader)) {
    return null;
  }

  // Better Auth 1.6 does not mint the csrf_token cookie this app originally
  // expected. Fall back to Origin/Referer validation so same-origin fetches
  // keep working while cross-site form/script attempts are still rejected.
  return requireSameOrigin(request, new URL(request.url).origin);
}

/**
 * Origin check for HTML form POSTs that can't easily attach an x-tinker-csrf
 * header (welcome.astro, me.astro). The double-submit CSRF token covers JSON
 * endpoints; this covers traditional form submits as belt-and-suspenders on
 * top of the session cookie's SameSite=Lax setting.
 *
 * Returns 403 if Origin/Referer doesn't match PUBLIC_SITE_URL. GET is
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
