import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { user } from '../../../server/schema';
import { requireSession, requireCsrf, jsonError } from '../../../server/middleware';
import { checkRateLimit } from '../../../server/ratelimit';
import { sendAccountDeletedEmail } from '../../../server/email';
import { getEnv } from '../../../server/env';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = getEnv();
  const csrf = requireCsrf(request);
  if (csrf) return csrf;

  const ctx = await requireSession(request, env);
  if ('error' in ctx) return ctx.error;
  const { session, db, auth } = ctx;

  // Cap account-deletion at 3/min per user. A hijacked session can otherwise
  // wake Resend in a loop; the first call is irreversible regardless.
  const rl = await checkRateLimit(db, `me:delete:${session.user.id}`, {
    limit: 3,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return jsonError(429, 'rate_limited', 'Too many delete attempts; wait a minute.');
  }

  const originalEmail = session.user.email;

  // Hard delete. ON DELETE CASCADE wipes session, account, user_profile,
  // lesson_view, exercise_answer, bookmark, note. GDPR right-to-be-forgotten.
  await db.delete(user).where(eq(user.id, session.user.id));

  // Sign out via Better Auth (clears session cookie + DB row).
  try {
    await auth.api.signOut({ headers: request.headers });
  } catch (e) {
    // Cookie-clear belt-and-suspenders still sets via response header below.
    // Logged so silent half-delete patterns are detectable in tail logs.
    console.error('[me] signOut after delete failed:', e);
  }

  if (env.RESEND_API_KEY) {
    (locals as App.Locals).cfContext.waitUntil(
      sendAccountDeletedEmail(env.RESEND_API_KEY, originalEmail).catch((e) =>
        console.error('account-deleted email failed:', e),
      ),
    );
  }

  return new Response(null, {
    status: 204,
    headers: {
      // Belt-and-suspenders cookie clear in case Better Auth's signOut path failed.
      'Set-Cookie': '__Secure-tinker.session_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    },
  });
};

export const GET: APIRoute = async () => jsonError(405, 'method_not_allowed', 'Use DELETE');
