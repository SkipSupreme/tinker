<script lang="ts">
  /**
   * The learner is the language model. A Shakespeare-style prefix is shown,
   * with K candidate continuations. The learner drags probability mass onto
   * candidates. Live perplexity readout + animated "effective die" sized by
   * perplexity. "Reveal truth" picks one candidate as the actual next token and
   * computes the NLL on that single revealed example.
   */

  interface Candidate {
    label: string;
    truth?: boolean;
  }

  interface Props {
    prefix?: string;
    candidates?: Candidate[];
    /** The Shannon floor for English in bits/char ≈ 1.3 → PPL ≈ 2.46. */
    shannonFloorPpl?: number;
  }

  const DEFAULT_CANDIDATES: Candidate[] = [
    { label: 'be', truth: true },
    { label: 'live' },
    { label: 'die' },
    { label: 'speak' },
    { label: 'fight' },
    { label: 'know' },
    { label: 'sleep' },
    { label: 'love' },
    { label: 'hide' },
    { label: 'run' },
  ];

  let {
    prefix = 'To be, or not to ___',
    candidates = DEFAULT_CANDIDATES,
    shannonFloorPpl = 2.46,
  }: Props = $props();

  const K = candidates.length;

  function normalize(arr: number[]): number[] {
    const s = arr.reduce((a, b) => a + b, 0);
    if (s <= 0) return arr.map(() => 1 / arr.length);
    return arr.map((x) => x / s);
  }

  let p: number[] = $state(normalize(Array(K).fill(1)));
  let revealed = $state(false);

  const H = $derived(-p.reduce((s, pi) => s + (pi > 0 ? pi * Math.log(pi) : 0), 0));
  const PPL = $derived(Math.exp(H));
  const truthIdx = $derived(candidates.findIndex((c) => c.truth) ?? -1);
  const truthNll = $derived(truthIdx >= 0 && p[truthIdx] > 0 ? -Math.log(p[truthIdx]) : Infinity);

  function fmt(n: number, d = 2): string {
    if (!Number.isFinite(n)) return '∞';
    return n.toFixed(d);
  }

  function reset() {
    p = normalize(Array(K).fill(1));
    revealed = false;
  }
  function makeConfident() {
    if (truthIdx < 0) return;
    const arr = Array(K).fill(0.02);
    arr[truthIdx] = 1 - 0.02 * (K - 1);
    p = normalize(arr);
  }

  // ---- Geometry ----
  const W = 560;
  const H_PX = 300;
  const padL = 16;
  const padR = 16;
  const padT = 28;
  const padB = 52;
  const plotW = W - padL - padR;
  const plotH = H_PX - padT - padB;

  const barGap = 6;
  const barW = (plotW - barGap * (K - 1)) / K;
  function barX(i: number): number { return padL + i * (barW + barGap); }
  function barY(prob: number): number {
    // Cap visible bar height so individual mass-up-to-1 lands within the panel.
    return padT + plotH - prob * plotH;
  }
  function barH(prob: number): number { return prob * plotH; }

  // ---- Drag ----
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
    const yIn = Math.max(0, Math.min(plotH, yLocal - padT));
    const target = Math.max(0.005, Math.min(0.99, 1 - yIn / plotH));
    const others = p.reduce((acc, v, k) => acc + (k === i ? 0 : v), 0);
    const remaining = 1 - target;
    const next = p.map((v, k) => {
      if (k === i) return target;
      return others > 0 ? (v / others) * remaining : remaining / (K - 1);
    });
    p = normalize(next);
  }

  // ---- "Effective die" diameter scales with sqrt(PPL) so visual size grows sensibly ----
  const dieDiameter = $derived(Math.min(140, 30 + 14 * Math.sqrt(Math.max(1, PPL))));

  // Scale ceiling for the floor-bar comparison strip (between PPL, uniform-K, and Shannon).
  const floorBarMaxPpl = $derived(Math.max(K * 1.1, PPL * 1.1, 12));
</script>

<div class="widget">
  <div class="prefix">
    <span class="prefix-label">PREFIX</span>
    <span class="prefix-text">{prefix}</span>
  </div>

  <svg
    viewBox={`0 0 ${W} ${H_PX}`}
    role="img"
    aria-label="Probability bar chart over candidate next tokens"
    class="stage"
  >
    {#each p as prob, i}
      {@const x = barX(i)}
      {@const isTruth = i === truthIdx && revealed}
      <rect
        x={x}
        y={barY(prob)}
        width={barW}
        height={barH(prob)}
        rx={4}
        ry={4}
        class="bar"
        class:truth={isTruth}
      />
      <rect
        x={x}
        y={padT}
        width={barW}
        height={plotH}
        fill="transparent"
        style="cursor: ns-resize; touch-action: none"
        onpointerdown={(e) => pointerDown(e, i)}
        onpointermove={(e) => pointerMove(e, i)}
        onpointerup={(e) => pointerUp(e, i)}
        onpointercancel={(e) => pointerUp(e, i)}
        role="slider"
        tabindex={0}
        aria-label={`Probability of ${candidates[i].label}`}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={prob}
      />
      <text x={x + barW / 2} y={padT + plotH + 14} text-anchor="middle" class="word">{candidates[i].label}</text>
      <text x={x + barW / 2} y={padT + plotH + 28} text-anchor="middle" class="prob">{prob.toFixed(2)}</text>
    {/each}
    <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} class="axis" />
  </svg>

  <div class="readout-row">
    <div class="metric">
      <div class="metric-label">cross-entropy (nats)</div>
      <div class="metric-value">{fmt(H, 3)}</div>
    </div>
    <div class="metric ppl">
      <div class="metric-label">perplexity = e^H</div>
      <div class="metric-value">{fmt(PPL, 2)}</div>
      <div class="metric-sub">"effective number of equally likely options"</div>
    </div>
    <div
      class="die"
      style={`width: ${dieDiameter}px; height: ${dieDiameter}px`}
      aria-label={`Effective die of ${fmt(PPL, 2)} faces`}
    >
      <span>{fmt(PPL, 1)}</span>
    </div>
  </div>

  <div class="floor-row">
    <div class="floor-bar">
      <div class="floor-fill" style={`width: ${Math.min(100, (PPL / floorBarMaxPpl) * 100)}%`}></div>
      <div class="floor-marker" style={`left: ${Math.min(100, (shannonFloorPpl / floorBarMaxPpl) * 100)}%`}>
        <span class="floor-tick"></span>
        <span class="floor-text">Shannon floor (English) ≈ {shannonFloorPpl}</span>
      </div>
      <div class="floor-marker right" style={`left: ${Math.min(100, (K / floorBarMaxPpl) * 100)}%`}>
        <span class="floor-tick alt"></span>
        <span class="floor-text alt">uniform = {K}</span>
      </div>
    </div>
  </div>

  <div class="controls">
    <div class="buttons">
      <button type="button" class="btn primary" onclick={() => (revealed = true)} disabled={revealed}>
        Reveal truth
      </button>
      <button type="button" class="btn" onclick={makeConfident}>Be confident on truth</button>
      <button type="button" class="btn ghost" onclick={reset}>Reset uniform</button>
    </div>
    {#if revealed}
      <div class="reveal-readout">
        truth was <strong class="truth-strong">{candidates[truthIdx].label}</strong>;
        you gave it <strong>{fmt(p[truthIdx], 3)}</strong> probability;
        NLL on this token = <strong class="truth-strong">{fmt(truthNll, 3)} nats</strong>.
      </div>
    {/if}
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
  }
  .prefix {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--demo-stage);
    border-radius: 10px;
    font-family: var(--font-mono);
  }
  .prefix-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--site-fg-muted);
  }
  .prefix-text {
    font-size: 16px;
    color: var(--site-fg);
    font-weight: 600;
  }
  .stage {
    display: block;
    width: 100%;
    height: auto;
    background: var(--demo-stage);
    border-radius: 12px;
  }
  .axis { stroke: color-mix(in srgb, var(--site-fg) 28%, transparent); stroke-width: 1; }
  .bar { fill: var(--ink-sea); transition: y 120ms ease-out, height 120ms ease-out; }
  .bar.truth { fill: var(--ink-red); }
  .word {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg);
    font-weight: 600;
  }
  .prob {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--site-fg-muted);
  }

  .readout-row {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-top: 14px;
    flex-wrap: wrap;
  }
  .metric { display: flex; flex-direction: column; gap: 2px; }
  .metric-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .metric-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    color: var(--site-fg);
    line-height: 1;
  }
  .metric.ppl .metric-value { color: var(--ink-sun); }
  .metric-sub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--site-fg-muted);
    margin-top: 2px;
  }
  .die {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18%;
    background: color-mix(in srgb, var(--ink-sun) 18%, var(--demo-stage));
    border: 2px solid var(--ink-sun);
    color: var(--ink-sun);
    font-family: var(--font-display);
    font-weight: 800;
    transition: width 200ms ease-out, height 200ms ease-out;
    margin-left: auto;
  }
  .die span { font-size: 22px; }

  .floor-row { margin-top: 18px; }
  .floor-bar {
    position: relative;
    height: 18px;
    background: var(--demo-stage);
    border-radius: 4px;
    overflow: visible;
  }
  .floor-fill {
    height: 100%;
    background: color-mix(in srgb, var(--ink-sun) 50%, transparent);
    border-radius: 4px;
    transition: width 200ms ease-out;
  }
  .floor-marker {
    position: absolute;
    top: -3px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }
  .floor-tick {
    width: 2px;
    height: 24px;
    background: var(--ink-red);
  }
  .floor-tick.alt { background: var(--site-fg-muted); }
  .floor-text {
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--ink-red);
    white-space: nowrap;
  }
  .floor-text.alt { color: var(--site-fg-muted); }
  .floor-marker.right .floor-text { transform: translateX(-30%); }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
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
  .btn:hover:not(:disabled) { transform: translateY(-1px); }
  .btn:disabled { opacity: 0.5; cursor: default; }
  .btn.primary { background: var(--ink-red); color: white; border-color: var(--ink-red); }
  .btn.ghost { background: transparent; }
  .reveal-readout {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--site-fg-muted);
  }
  .truth-strong { color: var(--ink-red); font-weight: 700; }
</style>
