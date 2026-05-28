import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from './db';
import * as schema from './schema';

export interface AuthEnv {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  PUBLIC_SITE_URL: string;
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Better Auth instance: email + password only.
 * No magic link, no OAuth, no email transport.
 * 30-day sessions with daily refresh; secure cookies in production.
 */
export function createAuth(env: AuthEnv) {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required');
  }
  if (!env.PUBLIC_SITE_URL) {
    throw new Error('PUBLIC_SITE_URL is required');
  }

  const db = getDb(env.DB);
  const isHttps = env.PUBLIC_SITE_URL.startsWith('https://');

  return betterAuth({
    // Pass `schema` so Better Auth can resolve custom model names (in particular
    // `rate_limit`). Drizzle already knows the full schema map via getDb(), but
    // the dev-mode Vite transform path doesn't always expose it to the adapter,
    // which makes /api/auth/* return 500 on every request. Explicit wins.
    database: drizzleAdapter(db, { provider: 'sqlite', schema }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.PUBLIC_SITE_URL,
    trustedOrigins: [env.PUBLIC_SITE_URL],
    emailAndPassword: { enabled: true, autoSignIn: true },
    advanced: {
      cookiePrefix: '__Secure-tinker',
      useSecureCookies: isHttps,
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: isHttps,
        httpOnly: true,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'user', input: false },
      },
    },
    // Memory-backed rate limit: per-Cloudflare-isolate, so a determined
    // attacker can spread attempts across edge nodes — known limitation.
    // The DB-backed alternative requires aligning our rate_limit schema
    // (key/count/resetAt) with Better Auth's expected shape
    // (id/key/count/lastRequest), or wiring a customStorage adapter. Until
    // that's done, memory storage at least enforces something AND keeps
    // logs clean; the prior `storage: 'database'` config silently failed
    // on every request because the field map didn't match.
    rateLimit: {
      enabled: true,
      storage: 'memory',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
        '/forget-password': { window: 60, max: 3 },
        '/reset-password': { window: 60, max: 5 },
      },
    },
  });
}

export type SessionContext = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
    emailVerified?: boolean;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
};

export async function getSession(
  auth: Auth,
  headers: Headers,
): Promise<SessionContext | null> {
  const result = await auth.api.getSession({ headers });
  if (!result || !result.user || !result.session) return null;
  return result as unknown as SessionContext;
}
