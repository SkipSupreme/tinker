<script lang="ts">
  import { getCsrf } from '../../lib/csrf-client';

  let { lessonSlug } = $props<{ lessonSlug: string }>();

  let open = $state(false);
  let body = $state('');
  let status = $state<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  let errorContext = $state<'load' | 'save' | null>(null);
  let lastSavedAt = $state<Date | null>(null);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  // Abort the in-flight save when a newer keystroke triggers another save.
  // Without this a slow request can land AFTER a fresher one and overwrite
  // the user's latest text with stale content.
  let inFlightSave: AbortController | null = null;

  async function load() {
    status = 'loading';
    errorContext = null;
    try {
      const res = await fetch('/api/notes/' + encodeURIComponent(lessonSlug), {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('load failed');
      const data = (await res.json()) as { body: string; updatedAt: string | null };
      body = data.body;
      lastSavedAt = data.updatedAt ? new Date(data.updatedAt) : null;
      status = 'idle';
    } catch {
      status = 'error';
      errorContext = 'load';
    }
  }

  async function save() {
    if (inFlightSave) inFlightSave.abort();
    const controller = new AbortController();
    inFlightSave = controller;
    status = 'saving';
    errorContext = null;
    try {
      const res = await fetch('/api/notes/' + encodeURIComponent(lessonSlug), {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-tinker-csrf': getCsrf(),
        },
        body: JSON.stringify({ body }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('save failed');
      const data = (await res.json()) as { updatedAt: string };
      // Only update if this is still the most recent save in flight.
      if (inFlightSave === controller) {
        lastSavedAt = new Date(data.updatedAt);
        status = 'saved';
        inFlightSave = null;
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // superseded by newer save
      if (inFlightSave === controller) {
        status = 'error';
        errorContext = 'save';
        inFlightSave = null;
      }
    }
  }

  function onInput(ev: Event) {
    body = (ev.currentTarget as HTMLTextAreaElement).value;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1500);
  }

  function toggle() {
    open = !open;
    if (open && status === 'idle' && !lastSavedAt) load();
  }
</script>

<button class="notes-toggle" type="button" onclick={toggle} aria-expanded={open}>
  📝 Notes
</button>

{#if open}
  <aside class="notes-drawer" role="complementary" aria-label="Notes">
    <header>
      <h3>Notes for this lesson</h3>
      <button type="button" onclick={() => (open = false)} aria-label="Close notes">×</button>
    </header>
    <textarea
      placeholder="Your private notes for this lesson…"
      value={body}
      oninput={onInput}
      disabled={status === 'loading'}
    ></textarea>
    <footer>
      {#if status === 'loading'}
        <span class="status">Loading…</span>
      {:else if status === 'saving'}
        <span class="status">Saving…</span>
      {:else if status === 'saved' && lastSavedAt}
        <span class="status">Saved {lastSavedAt.toLocaleTimeString()}</span>
      {:else if status === 'error'}
        <span class="status err">
          {errorContext === 'load' ? "Couldn't load notes." : "Couldn't save."}
          <button onclick={errorContext === 'load' ? load : save}>Retry</button>
        </span>
      {:else if lastSavedAt}
        <span class="status">Last saved {lastSavedAt.toLocaleString()}</span>
      {/if}
    </footer>
  </aside>
{/if}

<style>
  .notes-toggle {
    background: var(--site-surface);
    border: 1px solid var(--site-border);
    border-radius: var(--radius-md);
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    font: inherit;
    color: var(--site-fg);
  }
  .notes-toggle:hover { background: color-mix(in srgb, var(--site-surface) 70%, var(--site-bg)); }
  .notes-drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(420px, 100vw);
    background: var(--site-bg);
    border-left: 1px solid var(--site-border);
    z-index: 50;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-drawer);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--site-border);
  }
  header h3 { margin: 0; font-size: 1rem; }
  header button {
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    color: var(--site-fg-muted);
  }
  textarea {
    flex: 1;
    width: 100%;
    border: none;
    outline: none;
    padding: 1rem;
    background: var(--site-bg);
    color: var(--site-fg);
    font-family: var(--font-body);
    font-size: 0.95rem;
    resize: none;
  }
  footer {
    padding: 0.6rem 1rem;
    border-top: 1px solid var(--site-border);
    color: var(--site-fg-muted);
    font-size: 0.8rem;
  }
  .status.err { color: var(--site-error); }
  .status button {
    background: none;
    border: none;
    color: var(--site-fg);
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font: inherit;
  }
</style>
