/**
 * server/auth.ts — STUB shim for feature/alive-layer.
 *
 * The real Better Auth implementation lives on feature/auth-v1 and
 * lands when that branch merges. This stub lets Nav.astro (and
 * anything else that imports createAuth) build cleanly without it.
 *
 * Returns a session-of-null surface so all auth-aware UI degrades
 * to "signed out" until auth-v1 lands.
 */
export function createAuth(_env: unknown) {
  return {
    api: {
      async getSession(_opts: { headers: Headers }) {
        return null as { user: { name: string; email: string } } | null;
      },
    },
  };
}
