<script lang="ts">
  /**
   * Three side-by-side panels:
   *   left: pmf bars (draggable); right-flank: H(P) readout
   *   mid: surprise per outcome: -log₂ P(xᵢ) bars (computed)
   *   right: entropy contributions P(xᵢ)·(-log₂ P(xᵢ)) as stacked area
   *           whose total height equals H(P) exactly.
   */

  interface Props {
    initialP?: number[];
    labels?: string[];
  }

  let {
    initialP = [0.25, 0.25, 0.25, 0.25],
    labels = ['x₁', 'x₂', 'x₃', 'x₄'],
  }: Props = $props();

  const V = initialP.length;

  function normalize(arr: number[]): number[] {
    const s = arr.reduce((a, b) => a + b, 0);
    if (s <= 0) return arr.map(() => 1 / arr.length);
    return arr.map((x) => x / s);
  }

  let p: number[] = $state(normalize([...initialP]));

  // log₂ surprise per outcome. Use 0 for outcomes with P = 0 (limiting convention).
  function surpriseBits(prob: number): number {
    return prob > 0 ? -Math.log2(prob) : 0;
  }
  function contributionBits(prob: number): number {
    return prob > 0 ? -prob * Math.log2(prob) : 0;
  }

  const surprise: number[] = $derived(p.map(surpriseBits));
  const contributions: number[] = $derived(p.map(contributionBits));
  const H = $derived(contributions.reduce((a, b) => a + b, 0));

  // ---- Presets ----
  function setUniform() { p = Array(V).fill(1 / V); }
  function setOneHot() { const next = Array(V).fill(0); next[0] = 1; p = next; }
  function setSkewed() {
    // First bin gets 80%, rest split.
    const next = Array(V).fill(0.2 / (V - 1));
    next[0] = 0.8;
    p = next;
  }
  function reset() { p = normalize([...initialP]); }

  // ---- Geometry ----
  const W = 560;
  const H_PX = 320;
  const padT = 24;
  const padB = 36;
  const padL = 30;
  const padR = 18;
  const innerH = H_PX - padT - padB;

  const colGap = 16;
  const colW = (W - padL - padR - colGap * 2) / 3;
  const xPmf = padL;
  const xSur = padL + colW + colGap;
  const xCon = padL + 2 * (colW + colGap);

  const barGap = 4;
  const barW = (colW - barGap * (V - 1)) / V;
  function barX(col: number, i: number): number {
    return col + i * (barW + barGap);
  }

  // pmf bars: y axis [0, 1].
  function pmfBarY(prob: number): number { return padT + innerH - prob * innerH; }
  function pmfBarH(prob: number): number { return prob * innerH; }

  // surprise bars: scale to a sane ceiling so big surprises don't escape.
  const SUR_CEIL_BITS = $derived(Math.max(...surprise, 4));
  function surBarY(s: number): number { return padT + innerH - (s / SUR_CEIL_BITS) * innerH; }
  function surBarH(s: number): number { return (s / SUR_CEIL_BITS) * innerH; }

  // contribution stack: total = H. Render as a single stacked bar in the right column
  // whose total height = (H / log2(V)) * innerH so the ceiling visually equals max-entropy.
  const HMax = $derived(Math.log2(V));
  // contributions sorted by index (preserve identity for color); cumulative tops in pixels.
  const stackTops: number[] = $derived.by(() => {
    const tops: number[] = [];
    let cum = 0;
    for (const c of contributions) {
      tops.push(padT + innerH - (cum / HMax) * innerH);
      cum += c;
    }
    return tops;
  });
  function stackH(c: number): number { return (c / HMax) * innerH; }
  function fmt(n: number, d = 2): string { return n.toFixed(d); }

  // ---- Drag bars ----
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
    const yInPlot = Math.max(0, Math.min(innerH, yLocal - padT));
    const target = Math.max(0.001, Math.min(0.998, 1 - yInPlot / innerH));
    // Rescale the others to preserve their ratio.
    const others = p.reduce((acc, v, k) => acc + (k === i ? 0 : v), 0);
    const remaining = 1 - target;
    const next = p.map((v, k) => {
      if (k === i) return target;
      return others > 0 ? (v / others) * remaining : remaining / (V - 1);
    });
    p = normalize(next);
  }
</script>

<div class="widget">
  <svg
    viewBox={`0 0 ${W} ${H_PX}`}
    role="img"
    aria-label="PMF, surprise per outcome, and entropy contributions"
    class="stage"
  >
    <!-- Panel labels -->
    <text x={xPmf + colW / 2} y={padT - 8} text-anchor="middle" class="panel-label">P(xᵢ) (drag)</text>
    <text x={xSur + colW / 2} y={padT - 8} text-anchor="middle" class="panel-label">−log₂ P(xᵢ) bits</text>
    <text x={xCon + colW / 2} y={padT - 8} text-anchor="middle" class="panel-label">P·(−log₂ P) stack = H</text>

    <!-- ====== PMF panel ====== -->
    {#each p as prob, i}
      {@const x = barX(xPmf, i)}
      <rect
        x={x}
        y={pmfBarY(prob)}
        width={barW}
        height={pmfBarH(prob)}
        rx={3}
        ry={3}
        class="bar pmf"
      />
      <!-- Hit target for drag -->
      <rect
        x={x}
        y={padT}
        width={barW}
        height={innerH}
        fill="transparent"
        style="cursor: ns-resize; touch-action: none"
        onpointerdown={(e) => pointerDown(e, i)}
        onpointermove={(e) => pointerMove(e, i)}
        onpointerup={(e) => pointerUp(e, i)}
        onpointercancel={(e) => pointerUp(e, i)}
        role="slider"
        tabindex={0}
        aria-label={`Probability of ${labels[i] ?? `x${i}`}`}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={prob}
      />
      <text x={x + barW / 2} y={padT + innerH + 14} text-anchor="middle" class="tick-label">{labels[i] ?? `x${i}`}</text>
      <text x={x + barW / 2} y={padT + innerH + 28} text-anchor="middle" class="tick-num">{fmt(prob)}</text>
    {/each}
    <line x1={xPmf} y1={padT + innerH} x2={xPmf + colW} y2={padT + innerH} class="axis" />

    <!-- ====== Surprise panel ====== -->
    {#each surprise as s, i}
      {@const x = barX(xSur, i)}
      <rect
        x={x}
        y={surBarY(s)}
        width={barW}
        height={surBarH(s)}
        rx={3}
        ry={3}
        class="bar surprise"
      />
      <text x={x + barW / 2} y={padT + innerH + 14} text-anchor="middle" class="tick-label">{labels[i] ?? `x${i}`}</text>
      <text x={x + barW / 2} y={padT + innerH + 28} text-anchor="middle" class="tick-num">{fmt(s)}</text>
    {/each}
    <line x1={xSur} y1={padT + innerH} x2={xSur + colW} y2={padT + innerH} class="axis" />

    <!-- ====== Contribution stack ====== -->
    {#each contributions as c, i}
      {@const top = stackTops[i]}
      {@const h = stackH(c)}
      <rect
        x={xCon + colW * 0.18}
        y={top - h}
        width={colW * 0.64}
        height={h}
        class={`stack k${i % 5}`}
      />
      {#if h > 14}
        <text
          x={xCon + colW * 0.5}
          y={top - h / 2 + 4}
          text-anchor="middle"
          class="stack-num"
        >{fmt(c, 2)}</text>
      {/if}
    {/each}
    <!-- Max-entropy ceiling reference -->
    <line
      x1={xCon} y1={padT}
      x2={xCon + colW} y2={padT}
      class="ref"
    />
    <text x={xCon + colW + 2} y={padT + 4} class="ref-label">log₂ {V} = {fmt(HMax, 2)}</text>
    <line x1={xCon} y1={padT + innerH} x2={xCon + colW} y2={padT + innerH} class="axis" />

    <!-- Big H readout sitting under the stack -->
    <g transform={`translate(${xCon + colW / 2}, ${padT + innerH + 28})`}>
      <text class="h-readout" text-anchor="middle">H(P) = {fmt(H, 3)} bits</text>
    </g>
  </svg>

  <div class="controls">
    <div class="presets">
      <button type="button" class="btn" onclick={setUniform}>Uniform (max H)</button>
      <button type="button" class="btn" onclick={setOneHot}>One-hot (H = 0)</button>
      <button type="button" class="btn" onclick={setSkewed}>Skewed</button>
      <button type="button" class="btn ghost" onclick={reset}>Reset</button>
    </div>
    <div class="readout">
      <span class="k">H(P)</span>
      <span class="v">{fmt(H, 3)} bits</span>
      <span class="sep">·</span>
      <span class="k">{fmt(H * Math.LN2, 3)} nats</span>
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
  .panel-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .axis { stroke: color-mix(in srgb, var(--site-fg) 28%, transparent); stroke-width: 1; }
  .ref {
    stroke: color-mix(in srgb, var(--ink-sun) 60%, transparent);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }
  .ref-label {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: color-mix(in srgb, var(--ink-sun) 80%, var(--site-fg));
  }
  .tick-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg);
  }
  .tick-num {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--site-fg-muted);
  }
  .bar.pmf { fill: var(--ink-red); }
  .bar.surprise { fill: var(--ink-sea); }
  /* Five varietals so the stack panel reads as distinct contributions. */
  .stack.k0 { fill: var(--ink-red); }
  .stack.k1 { fill: var(--ink-coral); }
  .stack.k2 { fill: var(--ink-sun); }
  .stack.k3 { fill: var(--ink-teal); }
  .stack.k4 { fill: var(--ink-orange); }
  .stack-num {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: white;
    pointer-events: none;
  }
  .h-readout {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--site-fg);
    font-weight: 700;
  }
  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .presets { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn {
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 120ms ease-out;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn.ghost { background: transparent; }
  .readout {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--site-fg);
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .readout .k { color: var(--site-fg-muted); }
  .readout .v { color: var(--ink-red); font-weight: 700; }
  .readout .sep { color: color-mix(in srgb, var(--site-fg) 30%, transparent); }
</style>
