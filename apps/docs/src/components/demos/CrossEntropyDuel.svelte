<script lang="ts">
  /**
   * Two pmfs side by side: P (truth) and Q (model). Drag bar tops to set each.
   * Right-hand readout panel: H(P), H(P,Q), D_KL(P‖Q), rendered as nested bars
   * so the KL gap is visibly the height *between* H(P) and H(P,Q).
   * "Swap P ↔ Q" button makes asymmetry of KL visible.
   * "Lock P" toggle freezes the truth so the learner can hunt Q.
   */

  interface Props {
    initialP?: number[];
    initialQ?: number[];
    labels?: string[];
  }

  let {
    initialP = [0.5, 0.5],
    initialQ = [0.9, 0.1],
    labels = ['heads', 'tails'],
  }: Props = $props();

  const V = initialP.length;

  function normalize(arr: number[]): number[] {
    const s = arr.reduce((a, b) => a + b, 0);
    if (s <= 0) return arr.map(() => 1 / arr.length);
    return arr.map((x) => x / s);
  }

  let P: number[] = $state(normalize([...initialP]));
  let Q: number[] = $state(normalize([...initialQ]));
  let lockP = $state(false);

  function safeLog2(x: number): number { return x > 0 ? Math.log2(x) : 0; }

  const Hp = $derived(-P.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0));
  const Hpq = $derived(-P.reduce((s, p, i) => s + (p > 0 && Q[i] > 0 ? p * Math.log2(Q[i]) : (p > 0 && Q[i] === 0 ? Infinity : 0)), 0));
  const KL = $derived(Number.isFinite(Hpq) ? Hpq - Hp : Infinity);

  function fmt(n: number, d = 3): string {
    if (!Number.isFinite(n)) return '∞';
    return n.toFixed(d);
  }

  function swap() {
    const tmp = P;
    P = Q;
    Q = tmp;
  }
  function matchQtoP() {
    Q = [...P];
  }
  function reset() {
    P = normalize([...initialP]);
    Q = normalize([...initialQ]);
  }

  // ---- Geometry ----
  const W = 560;
  const H_PX = 320;
  const padT = 24;
  const padB = 36;
  const padL = 24;
  const padR = 16;
  const innerH = H_PX - padT - padB;

  // Three columns: P panel, Q panel, readout panel.
  const colGap = 16;
  const readW = 140;
  const pmfColW = (W - padL - padR - readW - colGap * 2) / 2;
  const pColX = padL;
  const qColX = padL + pmfColW + colGap;
  const rColX = padL + 2 * pmfColW + 2 * colGap;

  const barGap = 6;
  const barW = (pmfColW - barGap * (V - 1)) / V;

  function barX(col: number, i: number): number { return col + i * (barW + barGap); }
  function barY(prob: number): number { return padT + innerH - prob * innerH; }
  function barH(prob: number): number { return prob * innerH; }

  // Readout bars (right column): nested rectangles for H(P), H(P,Q), KL.
  // Scale to a sane ceiling: max of H(P,Q) over current draggers; capped at log2(V) + 2 so
  // we never zoom too far.
  const CEIL = $derived.by(() => {
    const finiteHpq = Number.isFinite(Hpq) ? Hpq : Math.log2(V) + 3;
    return Math.max(finiteHpq * 1.1, Math.log2(V) + 0.3);
  });
  function readY(val: number): number {
    return padT + innerH - (Math.min(val, CEIL) / CEIL) * innerH;
  }
  function readH(val: number): number {
    return (Math.min(val, CEIL) / CEIL) * innerH;
  }

  // ---- Drag bars ----
  type DragMode = null | { panel: 'P' | 'Q'; idx: number };
  let dragging: DragMode = $state(null);

  function pointerDown(e: PointerEvent, panel: 'P' | 'Q', i: number) {
    if (panel === 'P' && lockP) return;
    dragging = { panel, idx: i };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointerDrag(e);
  }
  function pointerMove(e: PointerEvent) {
    if (!dragging) return;
    pointerDrag(e);
  }
  function pointerUp(e: PointerEvent) {
    if (!dragging) return;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    dragging = null;
  }
  function pointerDrag(e: PointerEvent) {
    if (!dragging) return;
    const svg = (e.currentTarget as Element).ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const yClient = e.clientY - rect.top;
    const yLocal = (yClient / rect.height) * H_PX;
    const yInPlot = Math.max(0, Math.min(innerH, yLocal - padT));
    const target = Math.max(0.001, Math.min(0.998, 1 - yInPlot / innerH));

    const isP = dragging.panel === 'P';
    const cur = isP ? P : Q;
    const idx = dragging.idx;
    const others = cur.reduce((acc, v, k) => acc + (k === idx ? 0 : v), 0);
    const remaining = 1 - target;
    const next = cur.map((v, k) => {
      if (k === idx) return target;
      return others > 0 ? (v / others) * remaining : remaining / (V - 1);
    });
    const fresh = normalize(next);
    if (isP) P = fresh; else Q = fresh;
  }
</script>

<div class="widget">
  <svg
    viewBox={`0 0 ${W} ${H_PX}`}
    role="img"
    aria-label="Cross-entropy and KL divergence between two distributions"
    class="stage"
  >
    <!-- Panel labels -->
    <text x={pColX + pmfColW / 2} y={padT - 8} text-anchor="middle" class="panel-label p-color">P (truth)</text>
    <text x={qColX + pmfColW / 2} y={padT - 8} text-anchor="middle" class="panel-label q-color">Q (model)</text>
    <text x={rColX + readW / 2} y={padT - 8} text-anchor="middle" class="panel-label">readout</text>

    <!-- ====== P panel ====== -->
    {#each P as prob, i}
      {@const x = barX(pColX, i)}
      <rect
        x={x}
        y={barY(prob)}
        width={barW}
        height={barH(prob)}
        rx={3}
        ry={3}
        class="bar p"
        class:locked={lockP}
      />
      <rect
        x={x}
        y={padT}
        width={barW}
        height={innerH}
        fill="transparent"
        style={`cursor: ${lockP ? 'not-allowed' : 'ns-resize'}; touch-action: none`}
        onpointerdown={(e) => pointerDown(e, 'P', i)}
        onpointermove={pointerMove}
        onpointerup={pointerUp}
        onpointercancel={pointerUp}
        role="slider"
        tabindex={lockP ? -1 : 0}
        aria-label={`P probability of ${labels[i] ?? `x${i}`}`}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={prob}
      />
      <text x={x + barW / 2} y={padT + innerH + 14} text-anchor="middle" class="tick-label">{labels[i] ?? `x${i}`}</text>
      <text x={x + barW / 2} y={padT + innerH + 28} text-anchor="middle" class="tick-num">{fmt(prob, 2)}</text>
    {/each}
    <line x1={pColX} y1={padT + innerH} x2={pColX + pmfColW} y2={padT + innerH} class="axis" />

    <!-- ====== Q panel ====== -->
    {#each Q as prob, i}
      {@const x = barX(qColX, i)}
      <rect
        x={x}
        y={barY(prob)}
        width={barW}
        height={barH(prob)}
        rx={3}
        ry={3}
        class="bar q"
      />
      <rect
        x={x}
        y={padT}
        width={barW}
        height={innerH}
        fill="transparent"
        style="cursor: ns-resize; touch-action: none"
        onpointerdown={(e) => pointerDown(e, 'Q', i)}
        onpointermove={pointerMove}
        onpointerup={pointerUp}
        onpointercancel={pointerUp}
        role="slider"
        tabindex={0}
        aria-label={`Q probability of ${labels[i] ?? `x${i}`}`}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={prob}
      />
      <text x={x + barW / 2} y={padT + innerH + 14} text-anchor="middle" class="tick-label">{labels[i] ?? `x${i}`}</text>
      <text x={x + barW / 2} y={padT + innerH + 28} text-anchor="middle" class="tick-num">{fmt(prob, 2)}</text>
    {/each}
    <line x1={qColX} y1={padT + innerH} x2={qColX + pmfColW} y2={padT + innerH} class="axis" />

    <!-- ====== Readout panel: nested bars ====== -->
    {#if Number.isFinite(Hpq)}
      <!-- H(P,Q): outer bar -->
      <rect
        x={rColX + 20}
        y={readY(Hpq)}
        width={readW - 40}
        height={readH(Hpq)}
        class="read hpq"
      />
      <!-- H(P): inner shorter bar on top of H(P,Q) -->
      <rect
        x={rColX + 30}
        y={readY(Hp)}
        width={readW - 60}
        height={readH(Hp)}
        class="read hp"
      />
      <!-- KL gap callout: the band between H(P) top and H(P,Q) top -->
      <rect
        x={rColX + readW - 20}
        y={readY(Hpq)}
        width={6}
        height={readH(Hpq) - readH(Hp)}
        class="read kl-band"
      />

      <!-- Top labels -->
      <text x={rColX + 20} y={readY(Hpq) - 4} class="read-num small">H(P,Q) = {fmt(Hpq, 3)}</text>
      <text x={rColX + 30} y={readY(Hp) - 4} class="read-num small">H(P) = {fmt(Hp, 3)}</text>
      <text x={rColX + readW - 4} y={readY(Hpq) + (readH(Hpq) - readH(Hp)) / 2 + 4} text-anchor="end" class="kl-label">KL = {fmt(KL, 3)}</text>
    {:else}
      <!-- KL is infinite (Q has a zero where P doesn't). -->
      <rect
        x={rColX + 20}
        y={padT}
        width={readW - 40}
        height={innerH}
        class="read overflow"
      />
      <text x={rColX + readW / 2} y={padT + innerH / 2} text-anchor="middle" class="overflow-label">
        D_KL = ∞
      </text>
      <text x={rColX + readW / 2} y={padT + innerH / 2 + 18} text-anchor="middle" class="overflow-sub">
        (Q assigns 0 where P doesn't)
      </text>
    {/if}
    <line x1={rColX} y1={padT + innerH} x2={rColX + readW} y2={padT + innerH} class="axis" />
    <text x={rColX} y={padT + innerH + 14} class="tick-num">0</text>
    <text x={rColX} y={padT + 4} class="tick-num">{fmt(CEIL, 2)}</text>
  </svg>

  <div class="controls">
    <div class="readouts">
      <div class="readout-item p"><span class="k">H(P)</span><span class="v">{fmt(Hp)} bits</span></div>
      <div class="readout-item q"><span class="k">H(P, Q)</span><span class="v">{fmt(Hpq)} bits</span></div>
      <div class="readout-item kl"><span class="k">D_KL(P‖Q)</span><span class="v">{fmt(KL)} bits</span></div>
    </div>
    <div class="buttons">
      <label class="checkbox">
        <input type="checkbox" bind:checked={lockP} />
        Lock P
      </label>
      <button type="button" class="btn" onclick={swap}>Swap P ↔ Q</button>
      <button type="button" class="btn" onclick={matchQtoP}>Match Q = P</button>
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
  .panel-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .panel-label.p-color { fill: var(--ink-red); }
  .panel-label.q-color { fill: var(--ink-sea); }
  .axis { stroke: color-mix(in srgb, var(--site-fg) 28%, transparent); stroke-width: 1; }
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
  .bar.p { fill: var(--ink-red); }
  .bar.p.locked { fill: color-mix(in srgb, var(--ink-red) 50%, transparent); }
  .bar.q { fill: var(--ink-sea); }

  .read.hpq { fill: color-mix(in srgb, var(--ink-sea) 80%, transparent); }
  .read.hp  { fill: color-mix(in srgb, var(--ink-red) 80%, transparent); }
  .read.kl-band { fill: var(--ink-sun); }
  .read.overflow {
    fill: color-mix(in srgb, var(--ink-coral) 30%, transparent);
    stroke: var(--ink-coral);
    stroke-width: 2;
    stroke-dasharray: 6 4;
  }
  .read-num {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg);
  }
  .read-num.small { font-size: 10px; }
  .kl-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--ink-sun);
    font-weight: 700;
  }
  .overflow-label {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    fill: var(--ink-coral);
  }
  .overflow-sub {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
  }

  .controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .readouts { display: flex; gap: 16px; flex-wrap: wrap; font-family: var(--font-mono); font-size: 13px; }
  .readout-item { display: inline-flex; gap: 6px; align-items: baseline; }
  .readout-item .k { color: var(--site-fg-muted); }
  .readout-item .v { color: var(--site-fg); font-weight: 700; }
  .readout-item.p .v { color: var(--ink-red); }
  .readout-item.q .v { color: var(--ink-sea); }
  .readout-item.kl .v { color: var(--ink-sun); }
  .buttons { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--site-fg-muted);
  }
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
</style>
