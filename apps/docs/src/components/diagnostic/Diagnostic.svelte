<script lang="ts">
  import { onMount } from 'svelte';
  import {
    createSession,
    nextItem,
    recordAnswer,
    isDone,
    result as computeResult,
    type DiagnosticSession,
    type PlacementResult,
  } from '../../lib/diagnostic/engine';
  import { ITEMS, type DiagnosticItem } from '../../lib/diagnostic/items';
  import { LS_KEY } from '../../lib/storage-keys';
  import { isAuthed } from '../../lib/auth-state';
  import DiagnosticResult from './DiagnosticResult.svelte';

  interface ModuleEntry {
    id: string;
    num: number;
    title: string;
    firstLessonSlug: string;
    firstLessonTitle: string;
    anchor: string;
  }

  let {
    modules,
    courseSlug = 'ml-math',
  }: { modules: Record<string, ModuleEntry>; courseSlug?: string } = $props();

  type Phase = 'intro' | 'asking' | 'result';
  let phase = $state<Phase>('intro');
  let session = $state<DiagnosticSession>(createSession());
  let current = $state<DiagnosticItem | null>(null);
  let selected = $state<number | null>(null);
  let placement = $state<PlacementResult | null>(null);
  let authed = $state(false);

  onMount(() => {
    void isAuthed().then((a) => (authed = a));
  });

  /** Fisher–Yates over a copy. Run order varies per attempt for exposure control. */
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function start() {
    // Shuffle each item's choices as well as the run order: the bank is
    // authored correct-answer-first, so without this "always pick option 1"
    // aces the placement.
    session = createSession({
      items: shuffle(ITEMS).map((it) => ({ ...it, choices: shuffle(it.choices) })),
    });
    current = nextItem(session);
    selected = null;
    phase = 'asking';
  }

  function choose(i: number) {
    selected = i;
  }

  async function persist(r: PlacementResult) {
    const payload = {
      course_slug: courseSlug,
      entry_module: r.entryModule,
      entry_level: r.entryLevel,
      items_answered: r.itemsAnswered,
      strands: r.strands,
      frontier: r.frontier,
      taken_at: new Date().toISOString(),
    };
    try {
      if (authed) {
        await fetch('/api/placement', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        // A signed-in retake supersedes any stale anonymous result.
        localStorage.removeItem(LS_KEY.placement);
      } else {
        localStorage.setItem(LS_KEY.placement, JSON.stringify(payload));
      }
    } catch {
      // Non-fatal: the learner still sees their result; we just didn't save it.
    }
  }

  function commit() {
    if (current == null || selected == null) return;
    const correct = Boolean(current.choices[selected]?.correct);
    const next = recordAnswer(session, current, correct);
    session = next;
    if (isDone(next)) {
      placement = computeResult(next);
      void persist(placement);
      phase = 'result';
      return;
    }
    current = nextItem(next);
    selected = null;
    if (current == null) {
      // Bank exhausted unexpectedly: still show a result rather than dead-end.
      placement = computeResult(next);
      void persist(placement);
      phase = 'result';
    }
  }

  // Keyboard: 1–9 pick an option, Enter / → advances.
  function onkey(e: KeyboardEvent) {
    if (phase !== 'asking' || current == null) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= current.choices.length) {
      choose(n - 1);
      e.preventDefault();
    } else if ((e.key === 'Enter' || e.key === 'ArrowRight') && selected != null) {
      commit();
      e.preventDefault();
    }
  }

  const questionNumber = $derived(session.answered.length + 1);
</script>

<svelte:window onkeydown={onkey} />

{#if phase === 'intro'}
  <div class="intro">
    <h1>Find your starting point</h1>
    <p class="lede">
      A short, adaptive check — usually under a dozen questions. It isn't graded and it
      doesn't teach. It just finds the right place to start so you skip what you already
      know and don't get dropped in over your head. Answer honestly; guessing only buys
      you a harder start.
    </p>
    <button type="button" class="primary" onclick={start}>Begin</button>
    <p class="skip"><a href="/courses/ml-math">Skip — just show me the whole course</a></p>
  </div>
{:else if phase === 'asking' && current}
  <div class="asking">
    <p class="progress" aria-live="polite">
      Question {questionNumber} <span class="progress-sub">· no clock, no grade</span>
    </p>
    <h2 class="prompt">{current.prompt}</h2>
    <div class="choices" role="group" aria-label="Answer choices">
      {#each current.choices as choice, i (choice.text)}
        <button
          type="button"
          class="choice"
          aria-pressed={selected === i}
          onclick={() => choose(i)}
        >
          <span class="choice-mark" aria-hidden="true"></span>
          <span class="choice-key" aria-hidden="true">{i + 1}</span>
          <span class="choice-text">{choice.text}</span>
        </button>
      {/each}
    </div>
    <button type="button" class="primary" disabled={selected == null} onclick={commit}>
      Continue
    </button>
  </div>
{:else if phase === 'result' && placement}
  <DiagnosticResult result={placement} {modules} {authed} onretake={start} />
{/if}

<style>
  .intro,
  .asking {
    max-width: 640px;
    margin: 0 auto;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 2rem;
    margin: 0 0 0.9rem;
    color: var(--site-fg);
  }
  .lede {
    color: var(--site-fg-muted);
    line-height: 1.6;
    margin: 0 0 1.75rem;
  }
  .skip {
    margin: 1.25rem 0 0;
    font-size: 0.9rem;
  }
  .skip a {
    color: var(--site-fg-muted);
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  .skip a:hover {
    color: var(--site-fg);
    border-bottom-color: var(--site-fg);
  }

  .progress {
    font-family: var(--font-display);
    font-size: 0.85rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--site-fg-muted);
    margin: 0 0 0.85rem;
  }
  .progress-sub {
    text-transform: none;
    letter-spacing: 0;
    opacity: 0.75;
  }
  .prompt {
    font-family: var(--font-display);
    font-size: 1.4rem;
    line-height: 1.35;
    margin: 0 0 1.5rem;
    color: var(--site-fg);
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-bottom: 1.75rem;
  }
  /* Mirrors the lesson <Choice> treatment, using site tokens (this lives outside
     the lesson shell). No purple; the picked state uses the green CTA accent. */
  .choice {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    padding: 0.85rem 1rem;
    border: 1.5px solid var(--site-border);
    border-radius: var(--radius-md);
    background: var(--site-surface);
    color: var(--site-fg);
    font: inherit;
    font-size: 1.02rem;
    text-align: left;
    cursor: pointer;
    transition: border-color 140ms ease, background-color 140ms ease, transform 140ms ease;
  }
  .choice:hover {
    border-color: color-mix(in srgb, var(--cta) 55%, var(--site-border));
    transform: translateY(-1px);
  }
  .choice[aria-pressed='true'] {
    border-color: var(--cta);
    background: color-mix(in srgb, var(--cta) 12%, var(--site-surface));
  }
  .choice-mark {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    border: 1.5px solid var(--site-border);
    border-radius: var(--radius-sm);
    background: transparent;
    position: relative;
    transition: border-color 140ms ease, background-color 140ms ease;
  }
  .choice[aria-pressed='true'] .choice-mark {
    border-color: var(--cta);
    background: var(--cta);
  }
  .choice[aria-pressed='true'] .choice-mark::after {
    content: '';
    position: absolute;
    left: 0.4rem;
    top: 0.16rem;
    width: 0.28rem;
    height: 0.58rem;
    border: solid var(--cta-fg);
    border-width: 0 2.5px 2.5px 0;
    transform: rotate(45deg);
  }
  .choice-key {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--site-fg-muted);
    opacity: 0.6;
  }
  .choice-text {
    min-width: 0;
  }

  .primary {
    padding: 0.75rem 1.5rem;
    background: var(--cta);
    color: var(--cta-fg);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 140ms ease, transform 140ms ease;
  }
  .primary:hover:not(:disabled) {
    background: var(--cta-hover);
    transform: translateY(-1px);
  }
  .primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    .choice,
    .primary,
    .choice-mark {
      transition: none;
    }
    .choice:hover,
    .primary:hover:not(:disabled) {
      transform: none;
    }
  }
</style>
