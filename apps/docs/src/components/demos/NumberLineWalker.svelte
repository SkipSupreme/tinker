<script lang="ts">
  interface Props {
    domain?: [number, number];
    start?: number;
    steps?: number[];
  }

  let {
    domain = [-10, 10],
    start = 0,
    steps = [],
  }: Props = $props();

  // ── State ────────────────────────────────────────────────────────────────
  let position = $state(start);
  let stepsApplied = $state(0); // how many steps have been consumed
  let queue = $state<number[]>([...steps]);
  let stepInput = $state(1);
  let animating = $state(false);

  // arc animation: from / to position pair + progress 0..1
  let arcFrom = $state<number | null>(null);
  let arcTo = $state<number | null>(null);
  let arcProgress = $state(0); // 0 → 1 during glide

  // ── Derived ──────────────────────────────────────────────────────────────
  const [dMin, dMax] = domain;
  const domainSpan = dMax - dMin;

  // ticks
  const ticks = $derived(
    Array.from({ length: domainSpan + 1 }, (_, i) => dMin + i),
  );

  // expression built from applied steps
  const expression = $derived.by(() => {
    let parts: string[] = [String(start)];
    for (let i = 0; i < stepsApplied; i++) {
      const s = queue[i] ?? 0;
      parts.push(s < 0 ? `(${s})` : String(s));
    }
    return parts.join(' + ');
  });

  // result of applied steps (position matches this)
  const result = $derived(position);

  // walker x% across the SVG stage
  const SVG_W = 560;
  const SVG_H = 120;
  const PAD_X = 40; // horizontal padding inside SVG (left & right)
  const AXIS_Y = 72; // y of the number line
  const TICK_H = 8;  // half-height of tick

  function toSvgX(val: number): number {
    return PAD_X + ((val - dMin) / domainSpan) * (SVG_W - PAD_X * 2);
  }

  // walker animated x during arc (lerp position between arcFrom and arcTo)
  const walkerX = $derived.by(() => {
    if (arcFrom !== null && arcTo !== null) {
      return toSvgX(arcFrom + (arcTo - arcFrom) * arcProgress);
    }
    return toSvgX(position);
  });

  // arc path: quadratic bezier above the line between arcFrom → arcTo
  const arcPath = $derived.by((): string | null => {
    if (arcFrom === null || arcTo === null || arcFrom === arcTo) return null;
    const x1 = toSvgX(arcFrom);
    const x2 = toSvgX(arcTo);
    const mx = (x1 + x2) / 2;
    const span = Math.abs(x2 - x1);
    const lift = Math.max(18, span * 0.55); // curve height proportional to step size
    const cy = AXIS_Y - lift;
    return `M ${x1} ${AXIS_Y} Q ${mx} ${cy} ${x2} ${AXIS_Y}`;
  });

  // arc tip direction for arrowhead (pointing at arcTo end)
  const arcArrowAngle = $derived.by((): number => {
    if (arcFrom === null || arcTo === null) return 0;
    const x1 = toSvgX(arcFrom);
    const x2 = toSvgX(arcTo);
    const span = Math.abs(x2 - x1);
    const lift = Math.max(18, span * 0.55);
    // tangent at end of bezier: (arcTo - midpoint control) direction
    // end control slope: (x2 - mx, AXIS_Y - cy) normalized
    const mx = (x1 + x2) / 2;
    const cy = AXIS_Y - lift;
    const dx = x2 - mx;
    const dy = AXIS_Y - cy;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  });

  // ── Animation helpers ─────────────────────────────────────────────────────
  function glide(from: number, to: number): Promise<void> {
    return new Promise((resolve) => {
      // respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        arcFrom = from;
        arcTo = to;
        arcProgress = 1;
        position = to;
        resolve();
        return;
      }

      arcFrom = from;
      arcTo = to;
      arcProgress = 0;
      const DURATION = 420; // ms
      const t0 = performance.now();

      function tick(now: number) {
        const elapsed = now - t0;
        arcProgress = Math.min(1, elapsed / DURATION);
        if (arcProgress < 1) {
          requestAnimationFrame(tick);
        } else {
          position = to;
          // keep arc visible briefly
          setTimeout(() => {
            arcFrom = null;
            arcTo = null;
            arcProgress = 0;
            resolve();
          }, 160);
        }
      }
      requestAnimationFrame(tick);
    });
  }

  async function stepOnce() {
    if (animating || stepsApplied >= queue.length) return;
    animating = true;
    const s = queue[stepsApplied];
    const from = position;
    const raw = from + s;
    const to = Math.max(dMin, Math.min(dMax, raw));
    await glide(from, to);
    stepsApplied += 1;
    animating = false;
  }

  async function walkAll() {
    if (animating) return;
    while (stepsApplied < queue.length) {
      await stepOnce();
    }
  }

  function reset() {
    if (animating) return;
    position = start;
    stepsApplied = 0;
    arcFrom = null;
    arcTo = null;
    arcProgress = 0;
  }

  function addStep(s: number) {
    queue = [...queue, s];
  }

  function removeStep(i: number) {
    // can only remove steps not yet consumed
    if (i < stepsApplied) return;
    queue = queue.filter((_, idx) => idx !== i);
  }

  // ── Drag logic for walker token ────────────────────────────────────────────
  let svgEl = $state<SVGSVGElement | null>(null);

  function svgXToVal(clientX: number): number {
    if (!svgEl) return position;
    const rect = svgEl.getBoundingClientRect();
    const svgClientW = rect.width;
    // map client x to SVG coordinate
    const svgX = ((clientX - rect.left) / svgClientW) * SVG_W;
    const val = dMin + ((svgX - PAD_X) / (SVG_W - PAD_X * 2)) * domainSpan;
    return Math.round(Math.max(dMin, Math.min(dMax, val)));
  }

  let dragging = $state(false);

  function onPointerDown(e: PointerEvent) {
    if (animating) return;
    dragging = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || animating) return;
    const v = svgXToVal(e.clientX);
    if (v !== position) {
      position = v;
      // moving start also resets expression
      stepsApplied = 0;
    }
  }

  function onPointerUp() {
    dragging = false;
    // snap start to current position
    start = position;
  }

  function onTokenKeydown(e: KeyboardEvent) {
    if (animating) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      position = Math.min(dMax, position + 1);
      start = position;
      stepsApplied = 0;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      position = Math.max(dMin, position - 1);
      start = position;
      stepsApplied = 0;
    }
  }

  // chip label helper
  function chipLabel(s: number): string {
    return s < 0 ? `(${s})` : `+${s}`;
  }

  // format step for display inside chip as "+ 3" or "+ (−4)"
  function chipDisplay(s: number): string {
    if (s < 0) return `+ (${s})`;
    return `+ ${s}`;
  }

  const stepsRemaining = $derived(queue.length - stepsApplied);
  const canStep = $derived(!animating && stepsRemaining > 0);
  const canReset = $derived(!animating && (position !== start || stepsApplied !== 0));
</script>

<div class="widget">
  <!-- SVG stage ─────────────────────────────────────────────────── -->
  <div class="stage" aria-label="Number line from {dMin} to {dMax}">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {SVG_W} {SVG_H}"
      width={SVG_W}
      height={SVG_H}
      role="img"
      aria-label="Number line"
    >
      <!-- axis line -->
      <line
        x1={PAD_X - 6} y1={AXIS_Y}
        x2={SVG_W - PAD_X + 6} y2={AXIS_Y}
        stroke="color-mix(in srgb, var(--site-fg) 30%, transparent)"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <!-- arrowheads on axis -->
      <polygon
        points="{SVG_W - PAD_X + 6},{AXIS_Y} {SVG_W - PAD_X + 2},{AXIS_Y - 4} {SVG_W - PAD_X + 2},{AXIS_Y + 4}"
        fill="color-mix(in srgb, var(--site-fg) 30%, transparent)"
      />
      <polygon
        points="{PAD_X - 6},{AXIS_Y} {PAD_X - 2},{AXIS_Y - 4} {PAD_X - 2},{AXIS_Y + 4}"
        fill="color-mix(in srgb, var(--site-fg) 30%, transparent)"
      />

      <!-- ticks + labels -->
      {#each ticks as t}
        {@const tx = toSvgX(t)}
        {@const isZero = t === 0}
        <line
          x1={tx} y1={AXIS_Y - TICK_H}
          x2={tx} y2={AXIS_Y + TICK_H}
          stroke={isZero
            ? 'var(--site-fg)'
            : 'color-mix(in srgb, var(--site-fg) 35%, transparent)'}
          stroke-width={isZero ? 2 : 1}
          stroke-linecap="round"
        />
        <text
          x={tx}
          y={AXIS_Y + TICK_H + 13}
          text-anchor="middle"
          font-family="var(--font-mono)"
          font-size={isZero ? '12' : '10'}
          font-weight={isZero ? '700' : '400'}
          fill={isZero
            ? 'var(--site-fg)'
            : 'color-mix(in srgb, var(--site-fg-muted) 80%, transparent)'}
        >{t}</text>
      {/each}

      <!-- arc for current/last step -->
      {#if arcPath}
        <!-- arrowhead marker -->
        <defs>
          <marker
            id="arc-arrow"
            markerWidth="6" markerHeight="6"
            refX="5" refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--ink-coral)" opacity="0.85" />
          </marker>
        </defs>
        <path
          d={arcPath}
          fill="none"
          stroke="var(--ink-coral)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-dasharray={arcProgress < 1 ? `${arcProgress * 500} 500` : 'none'}
          marker-end="url(#arc-arrow)"
          opacity={0.7 + arcProgress * 0.3}
        />
      {/if}

      <!-- walker token (draggable) -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <g
        transform="translate({walkerX}, {AXIS_Y})"
        style="cursor: {animating ? 'default' : 'grab'}; touch-action: none;"
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onkeydown={onTokenKeydown}
        role="slider"
        tabindex="0"
        aria-label="Walker position"
        aria-valuenow={position}
        aria-valuemin={dMin}
        aria-valuemax={dMax}
      >
        <!-- shadow -->
        <ellipse cx="0" cy="10" rx="10" ry="4"
          fill="rgba(0,0,0,0.12)"
        />
        <!-- body -->
        <circle r="13" fill="var(--ink-coral)" />
        <!-- inner ring -->
        <circle r="9" fill="none"
          stroke="color-mix(in srgb, var(--on-color-fg) 50%, transparent)"
          stroke-width="1.5"
        />
        <!-- position label -->
        <text
          text-anchor="middle"
          dominant-baseline="central"
          font-family="var(--font-mono)"
          font-size="10"
          font-weight="700"
          fill="var(--on-color-fg)"
        >{position}</text>
      </g>
    </svg>
  </div>

  <!-- Readout ──────────────────────────────────────────────────── -->
  <div class="readout" aria-live="polite">
    <span class="expr">{expression}</span>
    {#if stepsApplied > 0}
      <span class="equals">= {result}</span>
    {/if}
    <span class="pos-badge" style="background: color-mix(in srgb, var(--ink-coral) 14%, var(--demo-stage));">
      position: <strong>{position}</strong>
    </span>
  </div>

  <!-- Queue chips ─────────────────────────────────────────────── -->
  <div class="queue-area">
    <span class="section-label">steps queue</span>
    <div class="chips">
      {#if queue.length === 0}
        <span class="empty-hint">no steps; add some below</span>
      {/if}
      {#each queue as s, i}
        {@const consumed = i < stepsApplied}
        <span
          class="chip"
          class:chip-consumed={consumed}
          class:chip-pending={!consumed}
          class:chip-negative={s < 0}
        >
          {chipDisplay(s)}
          {#if !consumed}
            <button
              class="chip-remove"
              type="button"
              aria-label="Remove step {s}"
              onclick={() => removeStep(i)}
            >×</button>
          {/if}
        </span>
      {/each}
    </div>
  </div>

  <!-- Quick-add buttons ────────────────────────────────────────── -->
  <div class="controls">
    <div class="quick-btns">
      <span class="section-label">quick add</span>
      <div class="btn-row">
        {#each [1, -1, 3, -3] as q}
          <button
            class="btn-quick"
            type="button"
            onclick={() => addStep(q)}
          >{q >= 0 ? `+${q}` : `−${Math.abs(q)}`}</button>
        {/each}
      </div>
    </div>

    <div class="custom-add">
      <span class="section-label">custom step</span>
      <div class="btn-row">
        <input
          class="step-input"
          type="number"
          bind:value={stepInput}
          aria-label="Custom step value"
        />
        <button
          class="btn-add"
          type="button"
          onclick={() => addStep(Number(stepInput))}
        >add step</button>
      </div>
    </div>
  </div>

  <!-- Playback buttons ─────────────────────────────────────────── -->
  <div class="playback">
    <button
      class="btn-action btn-step"
      type="button"
      disabled={!canStep}
      onclick={stepOnce}
    >Step →</button>
    <button
      class="btn-action btn-walk"
      type="button"
      disabled={!canStep}
      onclick={walkAll}
    >Walk all</button>
    <button
      class="btn-action btn-reset"
      type="button"
      disabled={!canReset}
      onclick={reset}
    >Reset</button>
    <span class="steps-remain" aria-live="polite">
      {stepsRemaining} step{stepsRemaining !== 1 ? 's' : ''} left
    </span>
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(14px, 2vw, 20px);
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Stage ── */
  .stage {
    width: 100%;
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .stage svg {
    display: block;
    width: 100%;
    height: auto;
  }

  /* ── Readout ── */
  .readout {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: clamp(13px, 2vw, 16px);
    color: var(--site-fg);
    padding: 10px 12px;
    background: var(--demo-stage);
    border-radius: 10px;
  }
  .expr {
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
  }
  .equals {
    font-weight: 700;
    color: var(--ink-sea);
    font-variant-numeric: tabular-nums;
  }
  .pos-badge {
    margin-left: auto;
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 99px;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .pos-badge strong {
    color: var(--ink-coral);
  }

  /* ── Queue ── */
  .queue-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 34px;
    align-items: center;
  }
  .empty-hint {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--site-fg-muted);
    font-style: italic;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 8px;
    font-variant-numeric: tabular-nums;
  }
  .chip-consumed {
    background: color-mix(in srgb, var(--site-fg) 8%, transparent);
    color: var(--site-fg-muted);
    text-decoration: line-through;
    opacity: 0.6;
  }
  .chip-pending {
    background: color-mix(in srgb, var(--ink-sea) 12%, var(--demo-stage));
    color: var(--ink-sea);
    border: 1px solid color-mix(in srgb, var(--ink-sea) 30%, transparent);
  }
  .chip-pending.chip-negative {
    background: color-mix(in srgb, var(--ink-coral) 12%, var(--demo-stage));
    color: var(--ink-coral);
    border-color: color-mix(in srgb, var(--ink-coral) 30%, transparent);
  }
  .chip-remove {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;
    color: inherit;
    opacity: 0.6;
    min-width: 20px;
    min-height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }
  .chip-remove:hover { opacity: 1; }

  /* ── Controls ── */
  .section-label {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--site-fg-muted);
  }
  .controls {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }
  .quick-btns,
  .custom-add {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .btn-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }
  .btn-quick {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    min-width: 44px;
    min-height: 36px;
    padding: 4px 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 16%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 100ms ease-out, background 100ms;
  }
  .btn-quick:hover {
    transform: translateY(-1px);
    background: color-mix(in srgb, var(--ink-sea) 10%, var(--demo-stage));
  }
  .step-input {
    font-family: var(--font-mono);
    font-size: 14px;
    width: 72px;
    min-height: 36px;
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    text-align: right;
  }
  .btn-add {
    font-family: var(--font-mono);
    font-size: 13px;
    min-height: 36px;
    padding: 4px 14px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--ink-sea) 40%, transparent);
    background: color-mix(in srgb, var(--ink-sea) 12%, var(--demo-stage));
    color: var(--ink-sea);
    cursor: pointer;
    transition: transform 100ms ease-out;
  }
  .btn-add:hover { transform: translateY(-1px); }

  /* ── Playback ── */
  .playback {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    padding-top: 12px;
  }
  .btn-action {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    min-height: 38px;
    padding: 6px 18px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    transition: transform 100ms ease-out, opacity 120ms;
  }
  .btn-action:disabled { opacity: 0.38; cursor: default; transform: none; }
  .btn-action:not(:disabled):hover { transform: translateY(-1px); }

  .btn-step {
    background: var(--ink-coral);
    color: var(--on-color-fg);
  }
  .btn-walk {
    background: color-mix(in srgb, var(--ink-coral) 18%, var(--demo-stage));
    color: var(--ink-coral);
    border: 1px solid color-mix(in srgb, var(--ink-coral) 35%, transparent);
  }
  .btn-reset {
    background: var(--demo-stage);
    color: var(--site-fg-muted);
    border: 1px solid color-mix(in srgb, var(--site-fg) 16%, transparent);
  }
  .steps-remain {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--site-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  /* ── Mobile ── */
  @media (max-width: 640px) {
    .controls { flex-direction: column; }
    .btn-quick { min-width: 48px; min-height: 44px; }
    .step-input { min-height: 44px; }
    .btn-add { min-height: 44px; }
    .btn-action { min-height: 44px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .btn-quick,
    .btn-add,
    .btn-action { transition: none; }
  }
</style>
