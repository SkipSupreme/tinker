<script lang="ts">
  /**
   * P is a fixed-shape mixture of two Gaussians (a bimodal "truth").
   * Q is a single Gaussian whose μ and σ the learner drags.
   * Both D_KL(P‖Q) and D_KL(Q‖P) are computed by numerical integration and
   * displayed live. Two "optimize" buttons snap to the canonical mode-seeking
   * / mass-covering optima so the learner can see the picture both ways.
   */

  interface Props {
    initialMu?: number;
    initialSigma?: number;
  }

  let {
    initialMu = 0,
    initialSigma = 1.5,
  }: Props = $props();

  // P (fixed for the demo): mixture of two N(±2, 0.7) with equal weight.
  const P_MIX = [
    { w: 0.5, mu: -2.2, sigma: 0.7 },
    { w: 0.5, mu: 2.2, sigma: 0.7 },
  ];

  let qMu = $state(initialMu);
  let qSigma = $state(Math.max(0.2, initialSigma));

  // ---- Math ----
  const X_MIN = -6;
  const X_MAX = 6;
  const Y_CEIL = 0.7;

  function gauss(x: number, mu: number, sigma: number): number {
    return (1 / (sigma * Math.sqrt(2 * Math.PI))) *
      Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
  }
  function P(x: number): number {
    return P_MIX.reduce((s, m) => s + m.w * gauss(x, m.mu, m.sigma), 0);
  }
  function Q(x: number): number {
    return gauss(x, qMu, qSigma);
  }

  // Numerical integration on a fine grid.
  const N_GRID = 400;
  const dx = (X_MAX - X_MIN) / N_GRID;

  const xs = $derived.by(() => {
    const out: number[] = [];
    for (let i = 0; i <= N_GRID; i++) out.push(X_MIN + i * dx);
    return out;
  });
  const ps = $derived.by(() => xs.map(P));
  const qs = $derived.by(() => xs.map(Q));

  // D_KL(P‖Q) = ∫ p(x) log(p(x)/q(x)) dx
  function trapz(values: number[]): number {
    let s = 0;
    for (let i = 0; i < values.length - 1; i++) s += 0.5 * (values[i] + values[i + 1]);
    return s * dx;
  }

  const KL_PQ = $derived.by(() => {
    const integrand = ps.map((p, i) => {
      const q = qs[i];
      if (p <= 1e-12) return 0;
      if (q <= 1e-12) return Infinity;
      return p * Math.log(p / q);
    });
    if (integrand.some((v) => !Number.isFinite(v))) return Infinity;
    return trapz(integrand);
  });
  const KL_QP = $derived.by(() => {
    const integrand = qs.map((q, i) => {
      const p = ps[i];
      if (q <= 1e-12) return 0;
      if (p <= 1e-12) return Infinity;
      return q * Math.log(q / p);
    });
    if (integrand.some((v) => !Number.isFinite(v))) return Infinity;
    return trapz(integrand);
  });

  // Signed integrand for forward KL: what's actually being "charged" at each x.
  const integrandFwd = $derived.by(() =>
    ps.map((p, i) => {
      const q = qs[i];
      if (p <= 1e-12 || q <= 1e-12) return 0;
      return p * Math.log(p / q);
    }),
  );

  function fmt(n: number, d = 3): string {
    if (!Number.isFinite(n)) return '∞';
    return n.toFixed(d);
  }

  // Mode-seeking optimum (reverse-KL): Q sits on one mode.
  function optimizeReverseKL() {
    qMu = P_MIX[0].mu;
    qSigma = P_MIX[0].sigma;
  }
  // Mass-covering optimum (forward-KL): Q centered between modes, wide.
  function optimizeForwardKL() {
    qMu = 0;
    qSigma = 2.6;
  }

  // ---- Geometry ----
  const W = 560;
  const H_PX = 320;
  const padL = 36;
  const padR = 16;
  const padT = 22;
  const padB = 56;
  const plotW = W - padL - padR;
  const plotH = H_PX - padT - padB;

  function xToPx(x: number): number {
    return padL + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW;
  }
  function yToPx(y: number): number {
    return padT + (1 - Math.min(y, Y_CEIL) / Y_CEIL) * plotH;
  }

  // Curve paths.
  const Ppath = $derived.by(() => {
    let d = '';
    for (let i = 0; i <= N_GRID; i++) {
      const x = X_MIN + i * dx;
      const y = ps[i];
      const px = xToPx(x).toFixed(2);
      const py = yToPx(y).toFixed(2);
      d += (i === 0 ? 'M' : 'L') + px + ',' + py + ' ';
    }
    return d.trim();
  });
  const Qpath = $derived.by(() => {
    let d = '';
    for (let i = 0; i <= N_GRID; i++) {
      const x = X_MIN + i * dx;
      const y = qs[i];
      const px = xToPx(x).toFixed(2);
      const py = yToPx(y).toFixed(2);
      d += (i === 0 ? 'M' : 'L') + px + ',' + py + ' ';
    }
    return d.trim();
  });

  // Signed-integrand bars (sparse, every 6th sample) to render under the curves.
  const integrandStep = 6;
  const integrandMaxAbs = $derived.by(() => {
    let m = 0;
    for (const v of integrandFwd) if (Math.abs(v) > m) m = Math.abs(v);
    return Math.max(m, 0.05);
  });
  function integrandBarH(v: number): number {
    return (Math.abs(v) / integrandMaxAbs) * 32;
  }

  // ---- Drag the Q peak (horizontal: μ; vertical of inflection: σ) ----
  // To keep this widget compact, expose μ and σ via slider input fields plus a
  // peak handle for μ and an inflection handle for σ (matching GaussianForge).
  type DragMode = null | 'peak' | 'infl';
  let dragMode: DragMode = $state(null);

  const Qpeak = $derived(1 / (qSigma * Math.sqrt(2 * Math.PI)));
  const Qinfl = $derived(Qpeak * Math.exp(-0.5));

  function svgPos(e: PointerEvent): [number, number] | null {
    const svg = (e.currentTarget as Element).ownerSVGElement;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H_PX];
  }
  function pxToX(px: number): number {
    return X_MIN + ((px - padL) / plotW) * (X_MAX - X_MIN);
  }
  function startDrag(e: PointerEvent, mode: 'peak' | 'infl') {
    dragMode = mode;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    onDrag(e);
  }
  function onDrag(e: PointerEvent) {
    if (!dragMode) return;
    const p = svgPos(e);
    if (!p) return;
    const xMath = Math.max(X_MIN + 0.1, Math.min(X_MAX - 0.1, pxToX(p[0])));
    if (dragMode === 'peak') {
      qMu = xMath;
    } else {
      qSigma = Math.max(0.2, Math.min(4, xMath - qMu));
    }
  }
  function endDrag(e: PointerEvent) {
    if (!dragMode) return;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    dragMode = null;
  }
</script>

<div class="widget">
  <svg
    viewBox={`0 0 ${W} ${H_PX}`}
    role="img"
    aria-label="KL divergence asymmetry: bimodal P vs unimodal Q"
    class="stage"
  >
    <!-- Axes -->
    <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} class="axis" />
    {#each [-4, -2, 0, 2, 4] as t}
      <text x={xToPx(t)} y={padT + plotH + 14} text-anchor="middle" class="tick">{t}</text>
    {/each}

    <!-- Signed integrand bars under the curves -->
    {#each integrandFwd as v, i}
      {#if i % integrandStep === 0 && Math.abs(v) > 1e-4}
        {@const x = X_MIN + i * dx}
        {@const px = xToPx(x)}
        {@const h = integrandBarH(v)}
        {@const sign = v > 0 ? 1 : -1}
        <rect
          x={px - 2}
          y={padT + plotH - h}
          width={4}
          height={h}
          class={sign > 0 ? 'integrand pos' : 'integrand neg'}
        />
      {/if}
    {/each}

    <!-- P curve (bimodal) -->
    <path d={Ppath} class="curve p" fill="none" />
    <!-- Q curve (unimodal, draggable) -->
    <path d={Qpath} class="curve q" fill="none" />

    <!-- Q peak handle (drag horizontally → μ) -->
    <circle
      cx={xToPx(qMu)}
      cy={yToPx(Qpeak)}
      r={9}
      class="handle peak"
      style="cursor: ew-resize; touch-action: none"
      onpointerdown={(e) => startDrag(e, 'peak')}
      onpointermove={onDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      role="slider"
      tabindex={0}
      aria-label="Q mean (μ)"
      aria-valuenow={qMu}
    />
    <text x={xToPx(qMu)} y={yToPx(Qpeak) - 14} text-anchor="middle" class="handle-label">μ</text>

    <!-- Q inflection handle (drag horizontally → σ) -->
    <circle
      cx={xToPx(qMu + qSigma)}
      cy={yToPx(Qinfl)}
      r={9}
      class="handle infl"
      style="cursor: ew-resize; touch-action: none"
      onpointerdown={(e) => startDrag(e, 'infl')}
      onpointermove={onDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
      role="slider"
      tabindex={0}
      aria-label="Q standard deviation (σ)"
      aria-valuenow={qSigma}
    />
    <text x={xToPx(qMu + qSigma)} y={yToPx(Qinfl) - 14} text-anchor="middle" class="handle-label infl">σ</text>

    <!-- Legend -->
    <g transform={`translate(${padL + 8}, ${padT + 4})`}>
      <rect x={0} y={0} width={12} height={2.5} class="legend-line p" />
      <text x={18} y={4} class="legend-text">P (bimodal truth)</text>
      <rect x={0} y={14} width={12} height={2.5} class="legend-line q" />
      <text x={18} y={18} class="legend-text">Q (unimodal, drag to fit)</text>
    </g>
  </svg>

  <div class="controls">
    <div class="readouts">
      <div class="readout-item fwd">
        <span class="k">D_KL(P ‖ Q)</span>
        <span class="v">{fmt(KL_PQ)} nats</span>
      </div>
      <div class="readout-item rev">
        <span class="k">D_KL(Q ‖ P)</span>
        <span class="v">{fmt(KL_QP)} nats</span>
      </div>
      <div class="readout-item params">
        <span class="k">μ = {fmt(qMu, 2)}</span>
        <span class="k">σ = {fmt(qSigma, 2)}</span>
      </div>
    </div>
    <div class="buttons">
      <button type="button" class="btn fwd" onclick={optimizeForwardKL}>Best forward-KL Q (mass-covering)</button>
      <button type="button" class="btn rev" onclick={optimizeReverseKL}>Best reverse-KL Q (mode-seeking)</button>
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
  .axis { stroke: color-mix(in srgb, var(--site-fg) 28%, transparent); stroke-width: 1; }
  .tick {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
  }
  .curve.p {
    stroke: var(--ink-red);
    stroke-width: 2.5;
  }
  .curve.q {
    stroke: var(--ink-sea);
    stroke-width: 2.5;
  }
  .integrand.pos { fill: color-mix(in srgb, var(--ink-sun) 65%, transparent); }
  .integrand.neg { fill: color-mix(in srgb, var(--ink-teal) 65%, transparent); }
  .handle {
    fill: var(--ink-sea);
    stroke: white;
    stroke-width: 2;
  }
  .handle.peak { fill: var(--ink-sea); }
  .handle.infl { fill: color-mix(in srgb, var(--ink-sea) 60%, var(--ink-teal)); }
  .handle:hover, .handle:focus { r: 11; outline: none; }
  .handle-label {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 14px;
    fill: var(--ink-sea);
    font-weight: 700;
    pointer-events: none;
  }
  .legend-line { rx: 1; ry: 1; }
  .legend-line.p { fill: var(--ink-red); }
  .legend-line.q { fill: var(--ink-sea); }
  .legend-text {
    font-family: var(--font-mono);
    font-size: 10px;
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
  .readouts {
    display: flex;
    gap: 16px;
    align-items: baseline;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  .readout-item { display: inline-flex; flex-direction: column; gap: 2px; }
  .readout-item .k { color: var(--site-fg-muted); font-size: 11px; }
  .readout-item .v { color: var(--site-fg); font-weight: 700; }
  .readout-item.fwd .v { color: var(--ink-sun); }
  .readout-item.rev .v { color: var(--ink-teal); }
  .readout-item.params { flex-direction: row; gap: 14px; }
  .buttons { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn {
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn.fwd { border-color: var(--ink-sun); color: var(--ink-sun); }
  .btn.rev { border-color: var(--ink-teal); color: var(--ink-teal); }
</style>
