<script lang="ts">
  /**
   * 10-bar softmax classifier. Drag logits up/down. Click 0–9 to set the
   * one-hot target. Three views update simultaneously:
   *   • softmax probabilities q = softmax(z)
   *   • the full cross-entropy sum −Σ pᵢ log qᵢ, with 9 of 10 terms greyed
   *   • the collapsed −log q_true, shown to equal the full sum
   *   • the gradient ∂L/∂zᵢ = qᵢ − pᵢ as a per-logit arrow
   */

  interface Props {
    initialLogits?: number[];
    initialTarget?: number;
  }

  function defaultLogits(): number[] {
    // Mild peak around index 7 so the picture isn't uniform on load.
    return [0.2, -0.4, 0.6, -0.1, 0.3, 0.1, -0.5, 1.6, 0.0, -0.3];
  }

  let {
    initialLogits = defaultLogits(),
    initialTarget = 7,
  }: Props = $props();

  let logits: number[] = $state([...initialLogits]);
  let target: number = $state(initialTarget);

  const K = logits.length;

  // ---- Softmax (numerically stable) ----
  const q: number[] = $derived.by(() => {
    const m = Math.max(...logits);
    const exps = logits.map((z) => Math.exp(z - m));
    const s = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / s);
  });

  const safeLog = (x: number) => (x > 1e-12 ? Math.log(x) : -Infinity);
  // p is one-hot on target.
  const p: number[] = $derived(Array.from({ length: K }, (_, i) => (i === target ? 1 : 0)));

  // Per-term contribution to the full cross-entropy sum.
  const termContrib: number[] = $derived.by(() => p.map((pi, i) => (pi > 0 ? -pi * safeLog(q[i]) : 0)));
  const lossFullSum: number = $derived(termContrib.reduce((a, b) => a + b, 0));
  const lossCollapsed: number = $derived(-safeLog(q[target]));
  // Gradient ∂L/∂zᵢ = qᵢ − pᵢ.
  const grad: number[] = $derived(q.map((qi, i) => qi - p[i]));

  function fmt(n: number, d = 3): string {
    if (!Number.isFinite(n)) return '∞';
    return n.toFixed(d);
  }

  function reset() {
    logits = [...initialLogits];
    target = initialTarget;
  }
  function randomize() {
    logits = Array.from({ length: K }, () => (Math.random() - 0.5) * 4);
  }

  // ---- SVG geometry ----
  const W = 560;
  const H_PX = 340;
  const padL = 20;
  const padR = 20;
  const padT = 28;
  const padB = 48;
  const plotH = H_PX - padT - padB;

  const numBars = K;
  const barGap = 6;
  const usableW = W - padL - padR;
  const barW = (usableW - barGap * (numBars - 1)) / numBars;
  function barX(i: number): number { return padL + i * (barW + barGap); }

  // Logits panel: top half. Logits range scaled to [-3, +3] for display.
  const Z_RANGE = 4;
  function zToYTop(z: number): number {
    const clipped = Math.max(-Z_RANGE, Math.min(Z_RANGE, z));
    const half = plotH * 0.42; // top half height
    const center = padT + half;
    return center - (clipped / Z_RANGE) * half;
  }
  function probToY(prob: number): number {
    // Bottom half: 0 at baseline, 1 at "halfway between baseline and middle"
    const baseline = padT + plotH;
    const half = plotH * 0.46;
    return baseline - prob * half;
  }
  const midLine = padT + plotH * 0.46;
  const baseline = padT + plotH;

  // ---- Drag logits ----
  let dragging: number | null = null;
  function pointerDown(e: PointerEvent, i: number) {
    dragging = i;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointerDrag(e, i);
  }
  function pointerMove(e: PointerEvent, i: number) {
    if (dragging !== i) return;
    pointerDrag(e, i);
  }
  function pointerUp(e: PointerEvent, i: number) {
    if (dragging === i) {
      try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }
    dragging = null;
  }
  function pointerDrag(e: PointerEvent, i: number) {
    const svg = (e.currentTarget as Element).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const yClient = e.clientY - rect.top;
    const yLocal = (yClient / rect.height) * H_PX;
    // Map yLocal to a logit value. y at center → 0, y at top → +Z_RANGE.
    const half = plotH * 0.42;
    const center = padT + half;
    const z = -((yLocal - center) / half) * Z_RANGE;
    const next = [...logits];
    next[i] = Math.max(-Z_RANGE, Math.min(Z_RANGE, z));
    logits = next;
  }
</script>

<div class="widget">
  <svg
    viewBox={`0 0 ${W} ${H_PX}`}
    role="img"
    aria-label="Logits, softmax probabilities, and gradient arrows for one-hot cross-entropy"
    class="stage"
  >
    <!-- Section labels -->
    <text x={padL} y={padT - 10} class="section-label">z (drag up/down)</text>
    <text x={padL} y={midLine - 6} class="section-label">q = softmax(z)</text>

    <!-- Midline -->
    <line x1={padL} y1={midLine} x2={padL + usableW} y2={midLine} class="midline" />
    <!-- Baseline -->
    <line x1={padL} y1={baseline} x2={padL + usableW} y2={baseline} class="axis" />
    <!-- Logit zero reference -->
    <line x1={padL} y1={zToYTop(0)} x2={padL + usableW} y2={zToYTop(0)} class="zero-ref" />

    {#each logits as z, i}
      {@const x = barX(i)}
      {@const isTarget = i === target}
      <!-- Logit bar: from zero-line to z value -->
      <rect
        x={x}
        y={Math.min(zToYTop(z), zToYTop(0))}
        width={barW}
        height={Math.abs(zToYTop(z) - zToYTop(0))}
        rx={3}
        ry={3}
        class="logit-bar"
        class:target={isTarget}
        class:negative={z < 0}
      />
      <!-- Hit target -->
      <rect
        x={x}
        y={padT}
        width={barW}
        height={midLine - padT - 8}
        fill="transparent"
        style="cursor: ns-resize; touch-action: none"
        onpointerdown={(e) => pointerDown(e, i)}
        onpointermove={(e) => pointerMove(e, i)}
        onpointerup={(e) => pointerUp(e, i)}
        onpointercancel={(e) => pointerUp(e, i)}
        role="slider"
        tabindex={0}
        aria-label={`Logit for class ${i}`}
        aria-valuemin={-Z_RANGE}
        aria-valuemax={Z_RANGE}
        aria-valuenow={z}
      />
      <!-- Gradient arrow: small arrow at top of logit bar pointing in direction grad pushes -->
      {#if Math.abs(grad[i]) > 0.005}
        {@const yBase = zToYTop(z)}
        {@const arrowH = Math.min(28, Math.abs(grad[i]) * 60)}
        {@const dir = grad[i] > 0 ? 1 : -1}
        <line
          x1={x + barW / 2}
          x2={x + barW / 2}
          y1={yBase}
          y2={yBase + dir * arrowH}
          class="grad-line"
          class:up={dir > 0}
        />
        <polygon
          points={`${x + barW / 2 - 4},${yBase + dir * arrowH} ${x + barW / 2 + 4},${yBase + dir * arrowH} ${x + barW / 2},${yBase + dir * (arrowH + 6)}`}
          class="grad-tip"
          class:up={dir > 0}
        />
      {/if}

      <!-- Softmax bar: bottom half, 0 → 1 -->
      <rect
        x={x}
        y={probToY(q[i])}
        width={barW}
        height={baseline - probToY(q[i])}
        rx={3}
        ry={3}
        class="prob-bar"
        class:target={isTarget}
        class:dimmed={!isTarget}
      />

      <!-- Class index label, clickable to set target -->
      <text
        x={x + barW / 2}
        y={baseline + 16}
        text-anchor="middle"
        class="class-num"
        class:target={isTarget}
        style="cursor: pointer"
        onclick={() => (target = i)}
        role="button"
        tabindex={0}
      >{i}</text>
      <text x={x + barW / 2} y={baseline + 30} text-anchor="middle" class="prob-num" class:target={isTarget}>{q[i].toFixed(2)}</text>
    {/each}

    <!-- "click to set target" hint -->
    <text x={padL + usableW / 2} y={H_PX - 4} text-anchor="middle" class="hint-text">click any class index to make it the target</text>
  </svg>

  <div class="formula-row">
    <div class="formula full">
      <div class="formula-label">Full cross-entropy sum (9 of 10 terms vanish)</div>
      <div class="formula-body">
        <span class="sigma">−</span>
        <span class="term-stack">
          {#each termContrib as t, i}
            <span class={`term ${i === target ? 'live' : 'dead'}`}>
              <span class="term-coef">{p[i]}</span>
              <span class="term-times">·</span>
              <span class="term-log">log({q[i].toFixed(3)})</span>
              {#if i !== K - 1}<span class="term-plus">+</span>{/if}
            </span>
          {/each}
        </span>
        <span class="equals">=</span>
        <span class="result">{fmt(lossFullSum)} nats</span>
      </div>
    </div>
    <div class="formula collapsed">
      <div class="formula-label">Collapsed form</div>
      <div class="formula-body">
        <span class="sigma">−log q</span>
        <sub class="target-sub">{target}</sub>
        <span class="equals">=</span>
        <span class="result">{fmt(lossCollapsed)} nats</span>
      </div>
    </div>
  </div>

  <div class="controls">
    <div class="readouts">
      <div class="readout-item">
        <span class="k">target class</span>
        <span class="v">{target}</span>
      </div>
      <div class="readout-item">
        <span class="k">q_true</span>
        <span class="v">{fmt(q[target])}</span>
      </div>
      <div class="readout-item">
        <span class="k">loss</span>
        <span class="v">{fmt(lossCollapsed)} nats</span>
      </div>
    </div>
    <div class="buttons">
      <button type="button" class="btn" onclick={randomize}>Randomize</button>
      <button type="button" class="btn ghost" onclick={reset}>Reset</button>
    </div>
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
  }
  .stage {
    display: block;
    width: 100%;
    height: auto;
    background: var(--demo-stage);
    border-radius: 12px;
  }
  .section-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .midline {
    stroke: color-mix(in srgb, var(--site-fg) 18%, transparent);
    stroke-width: 0.75;
    stroke-dasharray: 3 3;
  }
  .axis { stroke: color-mix(in srgb, var(--site-fg) 28%, transparent); stroke-width: 1; }
  .zero-ref {
    stroke: color-mix(in srgb, var(--site-fg) 12%, transparent);
    stroke-width: 1;
  }
  .logit-bar {
    fill: var(--ink-sea);
    transition: y 80ms linear, height 80ms linear;
  }
  .logit-bar.target { fill: var(--ink-red); }
  .logit-bar.negative { fill: color-mix(in srgb, var(--ink-sea) 50%, transparent); }
  .logit-bar.negative.target { fill: color-mix(in srgb, var(--ink-red) 50%, transparent); }

  .grad-line { stroke: var(--ink-sun); stroke-width: 2; }
  .grad-tip { fill: var(--ink-sun); }

  .prob-bar {
    fill: color-mix(in srgb, var(--ink-sea) 70%, transparent);
    transition: y 120ms ease-out, height 120ms ease-out;
  }
  .prob-bar.target { fill: var(--ink-red); }
  .prob-bar.dimmed { opacity: 0.55; }

  .class-num {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--site-fg-muted);
    font-weight: 600;
    user-select: none;
  }
  .class-num.target { fill: var(--ink-red); font-weight: 800; }
  .prob-num {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--site-fg-muted);
  }
  .prob-num.target { fill: var(--ink-red); font-weight: 700; }
  .hint-text {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--site-fg-muted);
  }

  .formula-row {
    display: flex;
    gap: 14px;
    margin-top: 14px;
    flex-wrap: wrap;
  }
  .formula {
    flex: 1;
    min-width: 260px;
    background: var(--demo-stage);
    border-radius: 10px;
    padding: 10px 12px;
  }
  .formula-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }
  .formula-body {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--site-fg);
  }
  .sigma { font-weight: 700; }
  .term-stack { display: inline-flex; gap: 4px; flex-wrap: wrap; }
  .term { display: inline-flex; gap: 2px; align-items: center; }
  .term.dead { opacity: 0.18; }
  .term.live { color: var(--ink-red); font-weight: 700; }
  .term-coef, .term-times, .term-log, .term-plus { display: inline; }
  .term-plus { margin-left: 2px; }
  .equals { font-weight: 700; }
  .result { color: var(--ink-sun); font-weight: 700; }
  .target-sub {
    color: var(--ink-red);
    font-weight: 700;
    font-size: 10px;
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .readouts {
    display: flex;
    gap: 16px;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .readout-item .k { color: var(--site-fg-muted); margin-right: 6px; }
  .readout-item .v { color: var(--site-fg); font-weight: 700; }
  .buttons { display: flex; gap: 8px; }
  .btn {
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn.ghost { background: transparent; }
</style>
