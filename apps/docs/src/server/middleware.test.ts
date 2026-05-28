import { describe, expect, it } from 'vitest';
import { requireCsrf, requireSameOrigin } from './middleware';

describe('requireCsrf', () => {
  it('allows a valid double-submit token when present', () => {
    const req = new Request('https://learntinker.com/api/progress/view', {
      method: 'POST',
      headers: {
        cookie: '__Secure-tinker.csrf_token=abc123',
        'x-tinker-csrf': 'abc123',
      },
    });

    expect(requireCsrf(req)).toBeNull();
  });

  it('falls back to same-origin validation when no csrf cookie exists', () => {
    const req = new Request('https://learntinker.com/api/progress/view', {
      method: 'POST',
      headers: {
        origin: 'https://learntinker.com',
        'content-type': 'application/json',
      },
    });

    expect(requireCsrf(req)).toBeNull();
  });

  it('rejects cross-origin state-changing requests', () => {
    const req = new Request('https://learntinker.com/api/progress/view', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'content-type': 'application/json',
      },
    });

    const res = requireCsrf(req);
    expect(res?.status).toBe(403);
  });
});

describe('requireSameOrigin', () => {
  it('allows same-origin referrer fallback', () => {
    const req = new Request('https://learntinker.com/me', {
      method: 'POST',
      headers: {
        referer: 'https://learntinker.com/me',
      },
    });

    expect(requireSameOrigin(req, 'https://learntinker.com')).toBeNull();
  });

  it('rejects missing origin and referrer on state-changing requests', () => {
    const req = new Request('https://learntinker.com/me', { method: 'POST' });

    const res = requireSameOrigin(req, 'https://learntinker.com');
    expect(res?.status).toBe(403);
  });

  it('rejects malformed referrers instead of throwing', () => {
    const req = new Request('https://learntinker.com/me', {
      method: 'POST',
      headers: {
        referer: '%%%not-a-url',
      },
    });

    const res = requireSameOrigin(req, 'https://learntinker.com');
    expect(res?.status).toBe(403);
  });

  // Regression: `localhost` and `127.0.0.1` are distinct origins to the
  // browser, to Better Auth's trustedOrigins, and to this check. CI seeds
  // PUBLIC_SITE_URL and the Playwright BASE_URL — they must agree on which
  // one to use, or every state-changing auth/progress POST 403s in CI.
  it('treats localhost and 127.0.0.1 as different origins', () => {
    const req = new Request('http://localhost:4321/me', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:4321' },
    });

    const res = requireSameOrigin(req, 'http://localhost:4321');
    expect(res?.status).toBe(403);
  });

  it('allows matching localhost dev origin', () => {
    const req = new Request('http://localhost:4321/me', {
      method: 'POST',
      headers: { origin: 'http://localhost:4321' },
    });

    expect(requireSameOrigin(req, 'http://localhost:4321')).toBeNull();
  });
});
