/**
 * Client-side auth state, fetched once per page load and cached.
 *
 * Lesson and listing pages are prerendered/static, so the server can't tell
 * the client whether it's signed in. Components used to each fire their own
 * authenticated fetch and let it 401 for anonymous visitors — which works, but
 * logs a red "Failed to load resource: 401" in the console on every page for
 * logged-out users.
 *
 * Better Auth's get-session endpoint returns 200 with `{ user: null }` for
 * anonymous visitors (NOT 401), so it's a noise-free way to learn auth state.
 * We call it at most once per page (the promise is memoized) and let every
 * authenticated-only, fire-on-load fetch await it first. If signed out, those
 * fetches are skipped entirely — no request, no 401, no console error.
 *
 * This is a hint for suppressing pointless requests, not a security boundary:
 * every endpoint still enforces its own session check server-side.
 */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}

let cached: Promise<SessionUser | null> | null = null;

/** The signed-in user, or null. Memoized for the lifetime of the page. */
export function getSessionUser(): Promise<SessionUser | null> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = (await res.json()) as { user?: SessionUser } | null;
      return data?.user ?? null;
    } catch {
      // Network failure: treat as anonymous. The worst case is a skipped
      // authed fetch, never a wrongly-shown signed-in UI.
      return null;
    }
  })();
  return cached;
}

/** True if a session is active. Awaits the memoized get-session check. */
export async function isAuthed(): Promise<boolean> {
  return (await getSessionUser()) !== null;
}
