/**
 * Read the Better Auth CSRF cookie set by /api/auth so we can echo it in the
 * `x-tinker-csrf` header on mutating fetches. Server-side `requireCsrf` in
 * `src/server/middleware.ts` does a constant-time compare against this value.
 *
 * Two cookie names because Better Auth uses a `__Secure-` prefix in HTTPS
 * and a plain prefix on localhost.
 */
const SECURE_PATTERN = /(?:^|;\s*)__Secure-tinker\.csrf_token=([^;]+)/;
const DEV_PATTERN = /(?:^|;\s*)tinker\.csrf_token=([^;]+)/;

export function getCsrf(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(SECURE_PATTERN) ?? document.cookie.match(DEV_PATTERN);
  return m?.[1] ? decodeURIComponent(m[1]) : '';
}
