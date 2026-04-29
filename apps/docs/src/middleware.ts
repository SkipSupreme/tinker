import { defineMiddleware } from 'astro:middleware';

/**
 * Security headers for every response.
 *
 * - HSTS: force HTTPS (1 year, subdomains, preload-eligible).
 * - X-Content-Type-Options: stop MIME-sniffing.
 * - Referrer-Policy: strip referrer on cross-origin nav.
 * - X-Frame-Options + frame-ancestors: deny embedding (clickjacking).
 * - Permissions-Policy: shut off APIs we don't use.
 * - CSP: locked to 'self' for scripts/styles, plus the small set of CDNs we
 *   actually use (Google Fonts, Resend tracking pixel for email metadata).
 *   `unsafe-inline` for style is still required by Astro's island runtime
 *   and Shiki's per-token style spans — accepted, can tighten later with a
 *   nonce-based config once Astro's CSP integration stabilizes.
 */
const HSTS = 'max-age=31536000; includeSubDomains; preload';

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // 'unsafe-inline' on script-src is needed for Astro's hydration shims and
  // inline initialization scripts. 'unsafe-eval' is needed by KaTeX in some
  // edge cases. We can drop both with strict-dynamic + nonces later.
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "manifest-src 'self'",
].join('; ');

const PERMISSIONS = [
  'camera=()',
  'microphone=()',
  'geolocation=()',
  'payment=()',
  'usb=()',
  'magnetometer=()',
  'accelerometer=()',
  'gyroscope=()',
  'interest-cohort=()',
].join(', ');

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  // Don't clobber asset caching/etag responses, but everything else gets the
  // headers. Safe to set on all paths — they're response headers, not redirects.
  const headers = response.headers;
  if (!headers.has('strict-transport-security')) headers.set('strict-transport-security', HSTS);
  if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
  if (!headers.has('referrer-policy')) headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (!headers.has('x-frame-options')) headers.set('x-frame-options', 'DENY');
  if (!headers.has('permissions-policy')) headers.set('permissions-policy', PERMISSIONS);

  // Only attach CSP to HTML responses — the API endpoints return JSON and
  // don't need it, and JSON CSPs sometimes confuse browser dev tools.
  const contentType = headers.get('content-type') ?? '';
  if (contentType.includes('text/html') && !headers.has('content-security-policy')) {
    headers.set('content-security-policy', CSP);
  }

  return response;
});
