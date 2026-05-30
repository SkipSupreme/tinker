<script lang="ts">
  import type { PlacementResult } from '../../lib/diagnostic/engine';

  interface ModuleEntry {
    id: string;
    /** Module number, e.g. 5 for m5. */
    num: number;
    title: string;
    firstLessonSlug: string;
    firstLessonTitle: string;
    /** Short anchor on the Course Atlas, e.g. "m5". */
    anchor: string;
  }

  let {
    result,
    modules,
    authed,
    onretake,
  }: {
    result: PlacementResult;
    modules: Record<string, ModuleEntry>;
    authed: boolean;
    onretake: () => void;
  } = $props();

  const entry = $derived(modules[result.entryModule]);
  const firstModule = $derived(modules['m1-pre-algebra']);

  // One-line reason, keyed to where the frontier landed.
  const REASONS: Record<string, string> = {
    '1': "Let's rebuild the fundamentals — arithmetic and the number line — before anything leans on them.",
    '2': 'Your arithmetic is solid. Algebra is the next rung.',
    '3': "Algebra's there. The prerequisite-math arc opens with trigonometry.",
    '4': 'Functions and precalc are review for you — calculus is where the new material starts.',
    '5': 'Your calculus intuition holds up. Probability is the piece to shore up before the ML.',
    cleared: 'The math is review for you. Start where the machine learning begins.',
  };
  const reason = $derived(REASONS[String(result.entryLevel)] ?? '');

  const STATUS_LABEL = { passed: 'solid', start: 'start here', ahead: 'ahead' } as const;
</script>

<div class="result">
  <p class="eyebrow">Your starting point</p>

  <div class="entry-card">
    <span class="entry-num">M{entry?.num}</span>
    <div class="entry-body">
      <h2 class="entry-title">{entry?.title}</h2>
      <p class="entry-reason">{reason}</p>
      <a class="start-btn" href={`/lessons/${entry?.firstLessonSlug}`}>
        Start: {entry?.firstLessonTitle} <span aria-hidden="true">→</span>
      </a>
    </div>
  </div>

  <div class="readout" aria-label="What the diagnostic found across the strands">
    {#each result.strands as s (s.level)}
      <span class="strand strand--{s.status}">
        <span class="strand-dot" aria-hidden="true"></span>
        <span class="strand-name">{s.strand}</span>
        <span class="strand-status">{STATUS_LABEL[s.status]}</span>
      </span>
    {/each}
  </div>

  <p class="answered">Settled in {result.itemsAnswered} question{result.itemsAnswered === 1 ? '' : 's'}.</p>

  <div class="secondary">
    <a class="link" href={`/courses/ml-math#${entry?.anchor ?? ''}`}>See the full map</a>
    {#if result.entryModule !== 'm1-pre-algebra' && firstModule}
      <a class="link" href={`/lessons/${firstModule.firstLessonSlug}`}>Start from the beginning instead</a>
    {/if}
    <button type="button" class="link link-btn" onclick={onretake}>Retake</button>
  </div>

  {#if !authed}
    <p class="save-note">
      <a href="/auth?mode=signup">Sign up</a> to save where you start and track your progress.
    </p>
  {/if}
</div>

<style>
  .result {
    max-width: 640px;
    margin: 0 auto;
  }
  .eyebrow {
    font-family: var(--font-display);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--site-fg-muted);
    margin: 0 0 0.75rem;
  }

  .entry-card {
    display: flex;
    gap: 1.1rem;
    align-items: flex-start;
    padding: 1.5rem;
    border: 1.5px solid color-mix(in srgb, var(--cta) 40%, var(--site-border));
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--cta) 7%, var(--site-surface));
  }
  .entry-num {
    flex-shrink: 0;
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--cta-hover);
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--cta) 16%, transparent);
  }
  .entry-body { min-width: 0; }
  .entry-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    margin: 0.1rem 0 0.4rem;
    color: var(--site-fg);
  }
  .entry-reason {
    margin: 0 0 1.1rem;
    color: var(--site-fg-muted);
    line-height: 1.5;
  }
  .start-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.7rem 1.3rem;
    background: var(--cta);
    color: var(--cta-fg);
    border-radius: var(--radius-md);
    font-weight: 600;
    text-decoration: none;
    transition: transform 140ms ease, background-color 140ms ease;
  }
  .start-btn:hover { background: var(--cta-hover); transform: translateY(-1px); }

  .readout {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.5rem 0 0.5rem;
  }
  .strand {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--site-border);
    border-radius: var(--radius-pill);
    font-size: 0.85rem;
    color: var(--site-fg-muted);
    background: var(--site-surface);
  }
  .strand-dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: var(--site-border);
  }
  .strand--passed { color: var(--site-fg); border-color: color-mix(in srgb, var(--cta) 45%, var(--site-border)); }
  .strand--passed .strand-dot { background: var(--cta); }
  .strand--start { color: var(--site-fg); border-color: color-mix(in srgb, var(--ink-sea) 55%, var(--site-border)); }
  .strand--start .strand-dot { background: var(--ink-sea); }
  .strand--start .strand-status { color: var(--ink-sea); font-weight: 600; }
  .strand-status { opacity: 0.85; }

  .answered {
    margin: 0.75rem 0 0;
    font-size: 0.85rem;
    color: var(--site-fg-muted);
  }

  .secondary {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    margin-top: 1.75rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--site-border);
  }
  .link {
    color: var(--site-fg-muted);
    text-decoration: none;
    font-size: 0.92rem;
    border-bottom: 1px solid transparent;
    transition: color 140ms ease, border-color 140ms ease;
  }
  .link:hover { color: var(--site-fg); border-bottom-color: var(--site-fg); }
  .link-btn {
    background: none;
    border: none;
    border-bottom: 1px solid transparent;
    padding: 0;
    cursor: pointer;
    font: inherit;
    font-size: 0.92rem;
  }

  .save-note {
    margin-top: 1.5rem;
    font-size: 0.9rem;
    color: var(--site-fg-muted);
  }
  .save-note a { color: var(--cta-hover); font-weight: 600; }
</style>
