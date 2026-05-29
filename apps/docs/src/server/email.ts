import { dropTemplate, accountDeletedTemplate } from './email-templates';

const RESEND_URL = 'https://api.resend.com/emails';
const FROM = 'Tinker <hello@learntinker.com>';

interface ResendPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

/**
 * Custom error class so callers can distinguish Resend transport failures
 * (domain not verified, key revoked, recipient bounced) from logic bugs.
 * Lets the auth handler surface a clean 503 instead of a generic 500.
 */
export class ResendError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Resend ${status}: ${body.slice(0, 200)}`);
    this.name = 'ResendError';
  }
}

async function postResend(apiKey: string, payload: ResendPayload): Promise<{ id: string }> {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ResendError(res.status, text);
  }
  return res.json() as Promise<{ id: string }>;
}

export async function sendDropEmail(
  apiKey: string,
  to: string,
  subject: string,
  bodyHtml: string,
  unsubUrl: string,
) {
  return postResend(apiKey, {
    from: FROM,
    to: [to],
    subject,
    html: dropTemplate({ bodyHtml, unsubUrl }),
    headers: {
      'List-Unsubscribe': `<${unsubUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export async function sendAccountDeletedEmail(apiKey: string, to: string) {
  return postResend(apiKey, {
    from: FROM,
    to: [to],
    subject: 'Your Tinker account has been deleted',
    html: accountDeletedTemplate(),
  });
}

// HMAC-signed unsubscribe tokens. Lets us verify "this is the same user we
// signed for" without a DB lookup on every unsubscribe click.

const enc = new TextEncoder();

function bytesToB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlToBytes(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Unsubscribe tokens expire after 90 days. The token-shape is
 * `${userId}.${ts}.${sig}` where the signed payload is `${userId}|${ts}`.
 * The pre-2026-05-27 legacy 2-segment shape (`${userId}.${sig}`, no timestamp)
 * was accepted forever, which let a single leaked old link be replayed to flip
 * a user's marketing opt-out indefinitely. That branch has been removed: only
 * timestamped, expiring tokens are honored. A subscriber holding a stale legacy
 * link just hits the unsubscribe page's account-link fallback instead.
 */
const UNSUB_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export async function signUnsubscribeToken(userId: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const ts = Date.now();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${userId}|${ts}`));
  return `${userId}.${ts}.${bytesToB64Url(sig)}`;
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
): Promise<string | null> {
  const parts = token.split('.');
  // Only the timestamped 3-segment shape is honored: ${userId}.${ts}.${sig}.
  // (The legacy untimestamped 2-segment shape was removed — see TTL note above.)
  if (parts.length !== 3) return null;
  const [userId, tsStr, sigB64] = parts;
  if (!userId || !tsStr || !sigB64) return null;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (Date.now() - ts > UNSUB_TOKEN_TTL_MS) return null;
  try {
    const key = await importHmacKey(secret);
    const ok = await crypto.subtle.verify(
      'HMAC', key, b64UrlToBytes(sigB64), enc.encode(`${userId}|${ts}`),
    );
    return ok ? userId : null;
  } catch (e) {
    console.error('[unsub] token verify threw:', e);
    return null;
  }
}
