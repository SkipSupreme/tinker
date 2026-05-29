<script lang="ts">
  import { getSessionUser, type SessionUser as User } from '../../lib/auth-state';

  let user = $state<User | null>(null);
  let open = $state(false);

  async function loadSession() {
    // Shared, memoized get-session check (also used to gate authed-only
    // fetches elsewhere), so the whole page makes one session request.
    user = await getSessionUser();
  }

  async function signOut() {
    try {
      const res = await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        console.error('[usermenu] sign-out returned', res.status);
        alert("Couldn't sign you out. Try again.");
        return;
      }
    } catch (e) {
      console.error('[usermenu] sign-out failed', e);
      alert("Couldn't sign you out. Try again.");
      return;
    }
    location.href = '/';
  }

  function handleDocumentClick(ev: MouseEvent) {
    if (!(ev.target instanceof Node)) return;
    const root = document.querySelector('.usermenu-root');
    if (root && !root.contains(ev.target)) open = false;
  }

  $effect(() => {
    loadSession();
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  });

  function initial(u: User) {
    return (u.name ?? u.email)[0]?.toUpperCase() ?? '?';
  }
</script>

<div class="usermenu-root">
  <!-- No loading placeholder: an anonymous visitor (the common case, and the
       SSR default) would otherwise see a gray circle paint then vanish on
       hydration. Render nothing until a real user is confirmed; the avatar
       pops in for signed-in users. Anon "Sign in" lives in Nav's .auth-slot. -->
  {#if user}
    <button
      class="avatar-btn"
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      {#if user.image}
        <img src={user.image} alt="" />
      {:else}
        <span class="initial">{initial(user)}</span>
      {/if}
    </button>
    {#if open}
      <ul class="menu" role="menu">
        <li role="none" class="email"><span>{user.email}</span></li>
        <li role="none"><a role="menuitem" href="/me">Account</a></li>
        <li role="none"><a role="menuitem" href="/me/bookmarks">Bookmarks</a></li>
        {#if user.role === 'admin'}
          <li role="none"><a role="menuitem" href="/admin">Admin</a></li>
        {/if}
        <li role="none" class="divider" aria-hidden="true"></li>
        <li role="none"><button role="menuitem" type="button" onclick={signOut}>Sign out</button></li>
      </ul>
    {/if}
  {/if}
  <!-- Anon state is rendered by Nav.astro's auth-slot (.auth-links): that's
       the SSR-fast version visible before JS hydrates. UserMenu.svelte only
       takes over once it knows there's a logged-in user. -->

</div>

<style>
  .usermenu-root {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }
  .avatar-btn {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    cursor: pointer;
    display: grid;
    place-items: center;
    overflow: hidden;
    padding: 0;
    font-weight: 600;
    font-size: 0.9rem;
    transition: border-color 120ms ease;
  }
  .avatar-btn:hover { border-color: var(--site-fg-muted); }
  .avatar-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    min-width: 12rem;
    background: var(--site-bg);
    border: 1px solid var(--site-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    list-style: none;
    padding: 0.4rem;
    margin: 0;
    z-index: 20;
  }
  .menu li { margin: 0; }
  .menu .email {
    padding: 0.4rem 0.6rem 0.6rem;
    font-size: 0.8rem;
    color: var(--site-fg-muted);
    word-break: break-all;
  }
  .menu .divider {
    height: 1px;
    background: var(--site-border);
    margin: 0.25rem 0;
  }
  .menu a, .menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.45rem 0.6rem;
    border-radius: var(--radius-sm);
    color: var(--site-fg);
    text-decoration: none;
    font-size: 0.9rem;
    background: none;
    border: none;
    cursor: pointer;
    font: inherit;
  }
  .menu a:hover, .menu button:hover { background: var(--site-surface); }
  a.muted { color: var(--site-fg-muted); padding: 0.4rem 0.65rem; font-size: 0.95rem; }
  a.muted:hover { color: var(--site-fg); }
  a.cta {
    background: var(--site-fg);
    color: var(--site-bg);
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
  }
  a.cta:hover { transform: translateY(-1px); }
</style>
