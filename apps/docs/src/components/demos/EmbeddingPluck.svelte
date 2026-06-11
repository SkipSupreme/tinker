<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Mafs, Coordinates, MovablePoint, Point } from 'svelte-mafs';

  import { TINKER_HERO_EVENT, emitHeroEvent } from '../../lib/events';
  import type { TinkerHeroEventName } from '../../lib/events';

  interface Props {
    /** Initial selected character. */
    initialPick?: string;
    /** Hero variant: stripped chrome, dispatches tinker:hero:* events on its closest [data-hero-region] ancestor. */
    hero?: boolean;
  }

  let { initialPick = 'a', hero = false }: Props = $props();

  let stageEl: HTMLDivElement | undefined = $state();

  // Cache the hero region ancestor on mount; events bubble naturally to it.
  let heroRegion: Element | null = $state(null);

  function findHeroRegion(): Element | null {
    if (!stageEl) return null;
    return stageEl.closest('[data-hero-region]');
  }

  function dispatchHero<T>(name: TinkerHeroEventName, detail: T) {
    const target = heroRegion ?? findHeroRegion();
    if (!target) return;
    emitHeroEvent(target, name, detail);
  }

  // Normalize Mafs viewBox coords to [0,1] hero-region space.
  // viewBox: x in [-2.7, 2.7], y in [-1.9, 1.9]. y inverts (top is +1.9 in math, 0 in CSS).
  function norm(x: number, y: number): { x: number; y: number } {
    const nx = (x - -2.7) / (2.7 - -2.7);
    const ny = (1.9 - y) / (1.9 - -1.9);
    return { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };
  }

  const VOCAB: string[] = ['.', ...'abcdefghijklmnopqrstuvwxyz'.split('')];
  const display = (c: string) => (c === '.' ? '·' : c);

  // Ideal embedding positions, pre-arranged into rough clusters that
  // reflect bigram co-occurrence (vowels group, common consonants group,
  // rare letters scatter at the edges). The simulated loss is the mean
  // squared deviation from these ideals; "training" the embedding means
  // pulling each character toward its ideal.
  const idealMap: Record<string, [number, number]> = {
    '.': [0.0, 1.4],
    a: [-1.4, 0.5], e: [-1.6, -0.3], i: [-1.0, 0.9], o: [-1.7, 0.2], u: [-1.2, -0.6], y: [-0.9, -0.9],
    n: [0.6, 0.4], r: [0.9, 0.0], s: [0.4, -0.5], t: [0.7, 0.6], l: [0.2, 0.3], d: [0.5, -0.2], m: [0.3, 0.7],
    h: [1.1, 0.4], c: [0.3, -0.8], b: [0.1, 1.0], f: [-0.5, -1.2], g: [0.6, -0.6],
    p: [1.2, -0.4], k: [1.4, 0.7], v: [-0.3, -0.4], w: [-0.6, 1.1], j: [1.6, -0.9],
    q: [2.1, -1.3], x: [-2.0, 1.2], z: [1.9, 1.1],
  };

  function makeInitialEmbeddings(): Record<string, [number, number]> {
    // Start at ideal + tiny noise so the layout looks "trained" but the
    // user can still see drift if they pluck a character far away.
    const out: Record<string, [number, number]> = {};
    for (const c of VOCAB) {
      const [ix, iy] = idealMap[c] ?? [0, 0];
      out[c] = [ix + (Math.random() - 0.5) * 0.06, iy + (Math.random() - 0.5) * 0.06];
    }
    return out;
  }

  let positions: Record<string, [number, number]> = $state(makeInitialEmbeddings());
  let selected: string = $state(initialPick);

  function loss(): number {
    let s = 0;
    for (const c of VOCAB) {
      const [px, py] = positions[c];
      const [ix, iy] = idealMap[c] ?? [0, 0];
      s += (px - ix) ** 2 + (py - iy) ** 2;
    }
    return s / VOCAB.length;
  }
  const currentLoss = $derived.by(() => {
    void positions; // re-run on positions change
    return loss();
  });

  // In hero mode the loss pill tints coral once the visitor has dragged a
  // letter meaningfully off its cluster. Baseline noise loss is ~0.002.
  const lossBad = $derived(currentLoss > 0.02);

  // Success milestone: the visitor pulled a letter out of its cluster (loss
  // climbed past the "bad" line) and then brought the layout back to a tight,
  // low-loss state — the "I re-trained it" moment. That's what earns the
  // apple's celebratory burst. Hysteresis (bad > 0.02, recovered < 0.008)
  // keeps it from flapping on jitter; re-arm after each success so a fresh
  // pull-and-recover fires again. Keyed on currentLoss (all letters), so it
  // reacts no matter which dot the visitor grabbed.
  let lossWasBad = $state(false);
  $effect(() => {
    if (!hero) return;
    const l = currentLoss;
    if (l > 0.02) {
      lossWasBad = true;
    } else if (lossWasBad && l < 0.008) {
      lossWasBad = false;
      dispatchHero(TINKER_HERO_EVENT.success, { milestone: 'recovered' });
    }
  });

  // Two-way bind for the selected point so dragging updates state.
  const selX = $derived(positions[selected]?.[0] ?? 0);
  const selY = $derived(positions[selected]?.[1] ?? 0);
  function setSelectedX(x: number) {
    positions = { ...positions, [selected]: [x, positions[selected][1]] };
  }
  function setSelectedY(y: number) {
    positions = { ...positions, [selected]: [positions[selected][0], y] };
  }

  function pick(c: string) {
    selected = c;
  }

  function snapToIdeal(): void {
    const next = { ...positions };
    const [ix, iy] = idealMap[selected];
    next[selected] = [ix, iy];
    positions = next;
  }
  function reset(): void {
    positions = makeInitialEmbeddings();
  }
  function shuffle(): void {
    const next: Record<string, [number, number]> = {};
    for (const c of VOCAB) {
      next[c] = [(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3];
    }
    positions = next;
  }

  // Cluster a char belongs to (for color coding).
  const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);
  const COMMON = new Set(['n', 'r', 's', 't', 'l', 'd', 'm', 'h', 'c']);
  function colorFor(c: string): string {
    if (c === '.') return 'var(--ink-sun)';
    if (VOWELS.has(c)) return 'var(--ink-red)';
    if (COMMON.has(c)) return 'var(--ink-sea)';
    return 'var(--site-fg-muted)';
  }

  const fmt = (n: number) => n.toFixed(3);
  const isFar = $derived.by(() => {
    const [px, py] = positions[selected];
    const [ix, iy] = idealMap[selected];
    return Math.hypot(px - ix, py - iy) > 0.5;
  });

  // Hero event dispatch: when the selected position changes (the user is
  // dragging via MovablePoint), emit tinker:hero:drag. When isFar transitions,
  // emit tinker:hero:threshold so the apple can react with a face-shift.
  let lastIsFar = $state(false);
  let dragStartFired = $state(false);
  $effect(() => {
    if (!hero) return;
    const [x, y] = positions[selected];
    const n = norm(x, y);
    if (!dragStartFired) {
      dispatchHero(TINKER_HERO_EVENT.drag, { x: n.x, y: n.y, handle: selected, phase: 'start' });
      dragStartFired = true;
      // Schedule a phase=end after stillness, debounced via timeout.
    } else {
      dispatchHero(TINKER_HERO_EVENT.drag, { x: n.x, y: n.y, handle: selected, phase: 'move' });
    }
    if (isFar !== lastIsFar) {
      dispatchHero(TINKER_HERO_EVENT.threshold, {
        kind: isFar ? 'left-cluster' : 'in-cluster',
        label: `${display(selected)} is ${isFar ? 'far from' : 'near'} its trained position`,
      });
      lastIsFar = isFar;
    }
  });

  // Hover focus tracking on the stage: apple eye-tracks toward where
  // the visitor is exploring. Throttled to ~60Hz via raf.
  let focusRaf = 0;
  function clearTextSelection() {
    globalThis.getSelection?.()?.removeAllRanges();
  }
  function onStagePointerMove(e: PointerEvent) {
    if (!hero || !stageEl) return;
    if (focusRaf) return;
    focusRaf = requestAnimationFrame(() => {
      focusRaf = 0;
      if (!stageEl) return;
      const rect = stageEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      dispatchHero(TINKER_HERO_EVENT.focus, { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
    });
  }
  function onStagePointerLeave() {
    if (!hero) return;
    dispatchHero(TINKER_HERO_EVENT.idle, {});
  }

  onDestroy(() => {
    if (focusRaf) {
      cancelAnimationFrame(focusRaf);
      focusRaf = 0;
    }
  });
</script>

<div class="widget" class:widget-hero={hero}>
  {#if !hero}
    <header class="head">
      <div class="meta">
        <span class="meta-key">selected</span>
        <span class="meta-val sel">{display(selected)}</span>
      </div>
      <div class="meta">
        <span class="meta-key">C[{display(selected)}]</span>
        <span class="meta-val">({fmt(selX)}, {fmt(selY)})</span>
      </div>
      <div class="meta meta-loss" class:bad={isFar}>
        <span class="meta-key">simulated loss</span>
        <span class="meta-val">{fmt(currentLoss)}</span>
      </div>
    </header>
  {/if}

  <div
    class="stage"
    class:stage-hero={hero}
    bind:this={stageEl}
    onpointerdown={clearTextSelection}
    onpointermove={onStagePointerMove}
    onpointerleave={onStagePointerLeave}
  >
    <Mafs width={460} height={hero ? 250 : 340} viewBox={{ x: [-2.7, 2.7], y: [-1.9, 1.9] }}>
      {#if !hero}
        <Coordinates.Cartesian
          xAxis={{ labels: () => '' }}
          yAxis={{ labels: () => '' }}
        />
      {/if}

      <!-- Non-hero: every char except the selected one is a static point;
           the picker grid below chooses which single point is movable.
           Hero: every char is its own MovablePoint, so the visitor can grab
           any letter directly without picker chrome. -->
      {#each VOCAB as c}
        {#if hero}
          <MovablePoint
            bind:x={positions[c][0]}
            bind:y={positions[c][1]}
            color={colorFor(c)}
            label={`Embedding of ${display(c)}, drag to reposition`}
          />
        {:else if c !== selected}
          <Point x={positions[c][0]} y={positions[c][1]} color={colorFor(c)} opacity={0.8} />
        {/if}
      {/each}

      {#if !hero}
        <!-- Selected char as the single movable point (aria-label only,
             not a visible Mafs tooltip). -->
        <MovablePoint
          bind:x={positions[selected][0]}
          bind:y={positions[selected][1]}
          color={colorFor(selected)}
          label={`Embedding of ${display(selected)}`}
        />
      {/if}
    </Mafs>

    <!-- Overlay labels, positioned via CSS calc on the SVG-coord system.
         Label center maps directly to dot center: same percentage of the
         viewBox in both axes, so labels sit exactly on their dots. The
         text-shadow halo is gone (replaced with a pill bg), so the old
         interior-padding workaround is unnecessary and was misaligning
         labels from dots. -->
    <div class="labels" aria-hidden="true">
      {#each VOCAB as c}
        {@const [x, y] = positions[c]}
        {@const left = ((x - -2.7) / (2.7 - -2.7)) * 100}
        {@const top = ((1.9 - y) / (1.9 - -1.9)) * 100}
        <span
          class="lbl"
          class:active={c === selected}
          style="left:{left}%; top:{top}%; color:{colorFor(c)};"
        >{display(c)}</span>
      {/each}
    </div>

    {#if hero}
      <!-- Live loss readout: the core feedback loop. Dragging a letter off
           its cluster raises the loss; the pill tints coral when it does. -->
      <div class="loss-pill" class:bad={lossBad} aria-hidden="true">
        <span class="loss-k">loss</span>
        <span class="loss-v">{fmt(currentLoss)}</span>
      </div>
      <div class="try-me" aria-hidden="true">drag any letter</div>
    {/if}
  </div>

  {#if hero}
    <div class="hero-foot">
      <p class="hero-cap">
        Every dot is a letter's learned position. Drag any of them and the
        <em>loss</em> climbs as you pull a letter away from where training
        put it. Red dots are vowels, blue are common consonants.
      </p>
      <button type="button" class="hero-reset" onclick={reset}>Reset</button>
    </div>
  {/if}

  {#if !hero}
    <div class="picker">
      <span class="picker-label">click a token to pluck →</span>
      <div class="picker-grid">
        {#each VOCAB as c}
          <button
            type="button"
            class="pick-btn"
            class:active={c === selected}
            style={c === selected ? `border-color:${colorFor(c)};color:${colorFor(c)};` : ''}
            onclick={() => pick(c)}
            aria-pressed={c === selected}
          >{display(c)}</button>
        {/each}
      </div>
    </div>

    <div class="controls">
      <button type="button" class="btn" onclick={snapToIdeal}>Snap {display(selected)} to its trained position</button>
      <button type="button" class="btn btn-ghost" onclick={shuffle}>Shuffle (untrained init)</button>
      <button type="button" class="btn btn-ghost" onclick={reset}>Reset</button>
    </div>

    <p class="caption">
      Each dot is a row of the embedding matrix <em>C</em>. Vowels (red) cluster
      together because the model learned that their following-character
      distributions are similar; common consonants (blue) cluster too. Pluck
      one and drag it across the plane: you're physically editing
      <em>C[i]</em>, and the simulated loss reacts. The point of an embedding
      isn't anything mystical: it's a vector of learned parameters that
      happens to encode semantic structure.
    </p>
  {/if}
</div>

<style>
  .widget {
    display: flex; flex-direction: column; gap: 0.85rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.85rem, 2vw, 1.4rem);
    color: var(--site-fg);
    box-shadow:
      var(--shadow-hairline),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sea) 50%, transparent);
  }
  .head {
    display: flex; flex-wrap: wrap; gap: 0.5rem 1.1rem;
    font-family: var(--font-mono); font-size: 0.78rem; color: var(--site-fg-muted);
  }
  .meta { display: inline-flex; gap: 0.4rem; align-items: baseline; }
  .meta-key { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7rem; }
  .meta-val { color: var(--site-fg); font-variant-numeric: tabular-nums; font-weight: 600; }
  .meta-val.sel {
    background: var(--site-fg); color: var(--demo-card);
    padding: 0 0.4rem; border-radius: 4px;
  }
  .meta-loss.bad .meta-val { color: var(--ink-coral); }

  .stage {
    position: relative;
    width: 100%; background: var(--demo-stage); border-radius: 12px;
    overflow: hidden; user-select: none; -webkit-user-select: none; touch-action: none;
  }
  .stage :global(svg) {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
    /* Mafs sets overflow:visible inline so axis labels can render outside
       the viewBox; clip it back so SVG content can't bleed past the
       stage's rounded corners. Quality Bar invariant: edges are clean. */
    overflow: hidden;
  }

  .labels {
    position: absolute; inset: 0;
    pointer-events: none;
  }
  .lbl {
    position: absolute;
    transform: translate(-50%, -120%);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    /* No text-shadow: at the top edge a thick 4-direction shadow can
       merge across labels into solid white blobs. Use a subtle
       padding+background pill instead so labels read against any
       neighbor color without visual artifacts. */
    padding: 1px 4px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--demo-card) 88%, transparent);
    line-height: 1;
  }
  .lbl.active { font-size: 0.85rem; transform: translate(-50%, -135%); font-weight: 700; }

  .picker { display: flex; flex-direction: column; gap: 0.35rem; }
  .picker-label {
    font-family: var(--font-mono); font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));
    gap: 3px;
  }
  .pick-btn {
    width: 100%; aspect-ratio: 1;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    background: transparent;
    color: var(--site-fg);
    border-radius: 4px;
    font-family: var(--font-mono); font-size: 0.78rem; font-weight: 600;
    cursor: pointer;
  }
  .pick-btn:hover { border-color: var(--site-fg); }
  .pick-btn.active { border-width: 2px; font-weight: 700; }

  .controls { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .btn {
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: transparent; color: var(--site-fg);
    border-radius: 999px; padding: 0.35rem 0.85rem;
    font-size: 0.83rem; font-weight: 600; cursor: pointer;
    transition: background 160ms ease, transform 120ms ease, border-color 160ms ease;
  }
  .btn:hover { transform: translateY(-1px); border-color: var(--site-fg); }
  .btn-ghost { color: var(--site-fg-muted); font-weight: 500; }

  .caption {
    margin: 0; font-size: 0.85rem; color: var(--site-fg-muted); line-height: 1.55;
  }
  .caption em {
    color: var(--site-fg); font-style: normal;
    font-family: var(--font-mono); font-size: 0.85em;
  }

  /* === Hero variant: stripped chrome, bigger stage, "try me" hint. === */
  .widget-hero {
    background: transparent;
    border: none;
    padding: 0;
    box-shadow: none;
  }
  .widget-hero .stage {
    background: var(--demo-stage);
    /* 20px: the DESIGN.md widget-card radius. */
    border-radius: 20px;
    border: 1px solid color-mix(in srgb, var(--ink-sea) 16%, transparent);
    box-shadow:
      var(--shadow-hairline),
      0 32px 56px -36px color-mix(in srgb, var(--ink-sea) 60%, transparent);
    overflow: hidden;
  }
  /* In hero mode: bigger labels, same clean pill background as the
     full-chrome variant. No text-shadow: clipped halos at the widget
     edge merge into ugly white blobs. The pill is finite and predictable. */
  .widget-hero .lbl {
    font-size: 0.82rem;
    padding: 2px 5px;
    background: color-mix(in srgb, var(--demo-card) 92%, transparent);
    border-radius: 5px;
  }
  .widget-hero .lbl.active {
    font-size: 1rem;
    font-weight: 800;
    padding: 3px 7px;
  }

  /* Drag affordance: every letter in the hero variant is a movable point,
     so a per-dot pulsing halo (27 of them) would be visual noise. Keep it
     to a grab cursor plus a soft glow on hover only. */
  .widget-hero :global(.mafs-movable-point) {
    cursor: grab;
    transition: filter 140ms ease;
  }
  .widget-hero :global(.mafs-movable-point):hover {
    filter: drop-shadow(0 0 7px color-mix(in srgb, var(--ink-red) 60%, transparent));
  }
  .widget-hero :global(.mafs-movable-point):active { cursor: grabbing; }

  /* Live loss readout pill: top-right of the hero stage. */
  .loss-pill {
    position: absolute;
    top: 10px;
    right: 10px;
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--demo-stage) 92%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    color: var(--site-fg-muted);
    transition: color 220ms ease, border-color 220ms ease;
  }
  .loss-pill .loss-k {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.62rem;
  }
  .loss-pill .loss-v {
    color: var(--site-fg);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .loss-pill.bad { border-color: color-mix(in srgb, var(--ink-coral) 50%, transparent); }
  .loss-pill.bad .loss-v { color: var(--ink-coral); }

  /* Hero caption + reset row below the stage. */
  .hero-foot {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
  }
  .hero-cap {
    margin: 0;
    flex: 1;
    font-size: 0.82rem;
    line-height: 1.5;
    color: var(--site-fg-muted);
  }
  .hero-cap em {
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 0.92em;
    color: var(--site-fg);
  }
  .hero-reset {
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: transparent;
    color: var(--site-fg-muted);
    border-radius: 999px;
    min-height: 44px;
    padding: 0.4rem 1rem;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 160ms ease, color 160ms ease, transform 120ms ease;
  }
  .hero-reset:hover {
    border-color: var(--site-fg);
    color: var(--site-fg);
    transform: translateY(-1px);
  }

  .try-me {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: color-mix(in srgb, var(--site-fg) 55%, transparent);
    background: color-mix(in srgb, var(--demo-stage) 92%, transparent);
    padding: 0.32rem 0.7rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    pointer-events: none;
    animation: try-me-pulse 2.4s ease-in-out infinite;
  }
  @keyframes try-me-pulse {
    0%, 100% { opacity: 0.55; transform: translateX(-50%) translateY(0); }
    50%      { opacity: 0.95; transform: translateX(-50%) translateY(-2px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .try-me { animation: none; opacity: 0.7; }
  }
</style>
