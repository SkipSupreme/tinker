import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { makeTestDb, type TestDb } from '../support/d1';
import * as schema from '../../src/server/schema';

// Mirror the production rateLimit config in apps/docs/src/server/auth.ts.
// If you change one, change the other.
const PROD_RATE_LIMIT = {
  enabled: true as const,
  storage: 'database' as const,
  window: 60,
  max: 60,
  customRules: {
    '/sign-in/email': { window: 60, max: 5 },
    '/sign-up/email': { window: 60, max: 3 },
  },
};

let db: TestDb;
let auth: ReturnType<typeof betterAuth>;

function buildAuth(database: ReturnType<typeof drizzleAdapter>) {
  return betterAuth({
    database,
    secret: 'a'.repeat(64),
    baseURL: 'http://localhost',
    trustedOrigins: ['http://localhost'],
    emailAndPassword: { enabled: true, autoSignIn: true },
    advanced: {
      cookiePrefix: 'tinker',
      useSecureCookies: false,
      // Mirror src/server/auth.ts: Cloudflare's canonical client-IP header
      // first, x-forwarded-for as fallback. Tests below pin one or the other
      // to exercise both paths.
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
    },
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'user', input: false },
      },
    },
    rateLimit: PROD_RATE_LIMIT,
  });
}

function clientHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-forwarded-for': '203.0.113.7',
  };
}

async function signUp(email: string, password: string) {
  return auth.handler(
    new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ email, password, name: email.split('@')[0] }),
    }),
  );
}

async function signIn(email: string, password: string) {
  return auth.handler(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: clientHeaders(),
      body: JSON.stringify({ email, password }),
    }),
  );
}

beforeEach(() => {
  db = makeTestDb();
  auth = buildAuth(
    drizzleAdapter(db.client, { provider: 'sqlite', schema }),
  ) as unknown as typeof auth;
});

afterEach(() => {
  db.close();
});

describe('Better Auth with database-backed rate limit', () => {
  it('sign-up returns 200 (not 500) when rate_limit table is aligned', async () => {
    const res = await signUp('first@example.com', 'correcthorse1');
    expect(res.status).toBeLessThan(500);
    // 200 OK on autoSignIn flow.
    expect(res.status).toBe(200);
  });

  it('sign-in returns 200 (not 500) for a real user', async () => {
    await signUp('user@example.com', 'correcthorse1');
    const res = await signIn('user@example.com', 'correcthorse1');
    expect(res.status).toBe(200);
  });

  it('sign-in records a row in rate_limit on each attempt', async () => {
    await signUp('persisted@example.com', 'correcthorse1');
    await signIn('persisted@example.com', 'correcthorse1');

    const rows = db.client.select().from(schema.rateLimit).all();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => typeof r.count === 'number')).toBe(true);
    expect(rows.every((r) => typeof r.lastRequest === 'number')).toBe(true);
  });

  it('rate-limits /sign-in/email after the custom-rule threshold', async () => {
    await signUp('flood@example.com', 'correcthorse1');
    // customRules pin /sign-in/email at max:5 per 60s. Hammer it past
    // the limit and assert at least one 429.
    const responses: Response[] = [];
    for (let i = 0; i < 8; i++) {
      responses.push(await signIn('flood@example.com', 'wrong-password-on-purpose'));
    }
    const codes = responses.map((r) => r.status);
    expect(codes.some((c) => c === 429)).toBe(true);
  });

  it('does not 500 even after the limit triggers', async () => {
    await signUp('safe@example.com', 'correcthorse1');
    for (let i = 0; i < 8; i++) {
      const res = await signIn('safe@example.com', 'wrong-password-on-purpose');
      expect(res.status).not.toBe(500);
    }
  });

  // Regression: on real Cloudflare, the client IP arrives only in
  // `cf-connecting-ip`; x-forwarded-for is not always populated. If the
  // header isn't listed in ipAddressHeaders, Better Auth's getIp() either
  // returns null (skip rate limit) or — under vitest's NODE_ENV=test —
  // falls back to 127.0.0.1, which silently bucketizes every real visitor
  // into the same key. We send cf-connecting-ip and NOTHING else, then
  // assert the rate_limit row's key contains the real IP from the header
  // rather than the localhost fallback. That's the exact behavior that
  // would have failed before commit 752c2d6.
  it('records and enforces rate limit when only cf-connecting-ip is present', async () => {
    const FAKE_IP = '203.0.113.42';
    const cfHeaders = {
      'content-type': 'application/json',
      'cf-connecting-ip': FAKE_IP,
    };
    const post = (path: string, body: object) =>
      auth.handler(
        new Request(`http://localhost/api/auth${path}`, {
          method: 'POST',
          headers: cfHeaders,
          body: JSON.stringify(body),
        }),
      );

    await post('/sign-up/email', {
      email: 'cf@example.com',
      password: 'correcthorse1',
      name: 'cf',
    });

    const responses: Response[] = [];
    for (let i = 0; i < 8; i++) {
      responses.push(
        await post('/sign-in/email', {
          email: 'cf@example.com',
          password: 'wrong-password-on-purpose',
        }),
      );
    }

    const codes = responses.map((r) => r.status);
    expect(codes.every((c) => c !== 500)).toBe(true);
    expect(codes.some((c) => c === 429)).toBe(true);

    // The critical regression assertion: keys must contain the IP from
    // cf-connecting-ip, NOT the 127.0.0.1 localhost fallback. Better Auth
    // builds rate_limit keys as `${ip}|${path}`, so a row keyed on the
    // localhost address means cf-connecting-ip was never read.
    const rows = db.client.select().from(schema.rateLimit).all();
    expect(rows.length).toBeGreaterThan(0);
    const keys = rows.map((r) => r.key);
    expect(keys.some((k) => k.includes(FAKE_IP))).toBe(true);
    expect(keys.every((k) => !k.includes('127.0.0.1'))).toBe(true);
  });
});
