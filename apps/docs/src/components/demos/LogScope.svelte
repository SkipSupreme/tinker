<script lang="ts">
  /**
   * LogScope — teaches log(∏pᵢ) = ∑log(pᵢ).
   * Three probability markers on a log-scale strip.
   * Multiply track detects IEEE-754 underflow to 0.
   * Log-sum track stays finite. The moment they diverge is the lesson.
   */

  // ── State ─────────────────────────────────────────────────────────────────

  // Store each pᵢ as its base-10 exponent for stable log-scale dragging.
  // exponent ∈ [-320, 0], p = 10^exponent.
  let exps: number[] = $state([-1, -2, -1.3]); // ~ 0.1, 0.01, 0.05

  const MIN_EXP = -320;
  const MAX_EXP = 0; // p = 1

  function clampExp(e: number): number {
    return Math.max(MIN_EXP, Math.min(MAX_EXP, e));
  }

  function prob(e: number): number {
    return Math.pow(10, e);
  }

  // ── Derived computations ───────────────────────────────────────────────────

  const p1 = $derived(prob(exps[0]));
  const p2 = $derived(prob(exps[1]));
  const p3 = $derived(prob(exps[2]));

  const product = $derived(p1 * p2 * p3);

  // true product in log space for checking
  const trueLogProduct = $derived(exps[0] + exps[1] + exps[2]); // log10 sum

  // JS multiplied to literal 0 while all inputs are positive
  const underflowed = $derived(product === 0 && p1 > 0 && p2 > 0 && p3 > 0);

  // Log-sum track (log10 for readability with the exponent display)
  const logSum = $derived(Math.log10(p1) + Math.log10(p2) + Math.log10(p3));
  // = exps[0] + exps[1] + exps[2] since log10(10^e) = e, but compute properly
  const logSumActual = $derived(
    exps[0] + exps[1] + exps[2]
  );

  // log10 of the JS product (breaks on underflow)
  const logOfProduct = $derived(
    underflowed
      ? -Infinity
      : product > 0
        ? Math.log10(product)
        : -Infinity
  );

  // Verdict
  const verdict = $derived(
    underflowed
      ? `Product underflowed to 0. log₁₀(0) = −∞. Sum of logs = ${logSumActual.toFixed(2)} (exact).`
      : `No underflow yet. Both tracks agree: ${logSumActual.toFixed(4)}`
  );

  // ── Formatting helpers ────────────────────────────────────────────────────

  function fmtProb(p: number): string {
    if (p >= 0.001) return p.toPrecision(3);
    const e = Math.log10(p);
    return `10^(${e.toFixed(1)})`;
  }

  function fmtProduct(p: number, uf: boolean): string {
    if (uf) return '0  ← UNDERFLOW';
    if (p >= 0.001) return p.toPrecision(3);
    const e = Math.log10(p);
    return `10^(${e.toFixed(2)})`;
  }

  function fmtLogOfProduct(val: number, uf: boolean): string {
    if (uf) return '−∞  (broken)';
    if (!Number.isFinite(val)) return '−∞';
    return val.toFixed(4);
  }

  // ── SVG strip geometry ────────────────────────────────────────────────────

  const STRIP_W = 600;
  const STRIP_H = 72;
  const MARKER_R = 10;
  const TICK_EXPS = [0, -50, -100, -150, -200, -250, -300];

  function expToX(e: number): number {
    // maps [MIN_EXP, MAX_EXP] → [MARKER_R, STRIP_W - MARKER_R]
    const frac = (e - MIN_EXP) / (MAX_EXP - MIN_EXP);
    return MARKER_R + frac * (STRIP_W - 2 * MARKER_R);
  }

  function xToExp(x: number): number {
    const frac = (x - MARKER_R) / (STRIP_W - 2 * MARKER_R);
    return MIN_EXP + frac * (MAX_EXP - MIN_EXP);
  }

  // ── Drag logic ────────────────────────────────────────────────────────────

  let dragging: number | null = $state(null);
  let svgEl: SVGSVGElement | null = $state(null);

  function getClientX(e: MouseEvent | TouchEvent): number {
    if ('touches' in e && e.touches.length > 0) return e.touches[0].clientX;
    if ('clientX' in e) return e.clientX;
    return 0;
  }

  function svgX(clientX: number): number {
    if (!svgEl) return 0;
    const rect = svgEl.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * STRIP_W;
  }

  function onPointerDown(idx: number, e: MouseEvent | TouchEvent) {
    e.preventDefault();
    dragging = idx;
  }

  function onPointerMove(e: MouseEvent | TouchEvent) {
    if (dragging === null) return;
    const cx = getClientX(e);
    const x = svgX(cx);
    const newExp = clampExp(xToExp(x));
    exps = exps.map((v, i) => (i === dragging ? newExp : v));
  }

  function onPointerUp() {
    dragging = null;
  }

  // ── Keyboard stepper ─────────────────────────────────────────────────────

  function onKeyDown(idx: number, e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      exps = exps.map((v, i) => (i === idx ? clampExp(v - step) : v));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      exps = exps.map((v, i) => (i === idx ? clampExp(v + step) : v));
    }
  }

  // ── Preset buttons ────────────────────────────────────────────────────────

  function pushSmall() {
    exps = [-200, -200, -200]; // product = 10^-600 → underflows
  }

  function resetValues() {
    exps = [-1, -2, -1.3];
  }

  // ── Marker colors ─────────────────────────────────────────────────────────

  const MARKER_COLORS = [
    'var(--ink-sun)',
    'var(--ink-teal)',
    'var(--ink-red)',
  ];

  const LABELS = ['p₁', 'p₂', 'p₃'];
</script>

<svelte:window
  onmousemove={onPointerMove}
  onmouseup={onPointerUp}
  ontouchmove={onPointerMove}
  ontouchend={onPointerUp}
/>

<div class="widget">
  <!-- Log-scale strip stage -->
  <div class="stage">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {STRIP_W} {STRIP_H}"
      width="100%"
      height={STRIP_H}
      aria-label="Logarithmic probability strip. Drag markers to set p₁, p₂, p₃."
      role="img"
    >
      <!-- Track background -->
      <rect x={MARKER_R} y={STRIP_H / 2 - 6} width={STRIP_W - 2 * MARKER_R} height={12} rx={6}
        fill="color-mix(in srgb, var(--site-fg) 8%, transparent)" />

      <!-- Gradient fill from right (p=1) to left (tiny p) -->
      <defs>
        <linearGradient id="track-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="var(--ink-coral)" stop-opacity="0.18" />
          <stop offset="100%" stop-color="var(--ink-sea)" stop-opacity="0.18" />
        </linearGradient>
      </defs>
      <rect x={MARKER_R} y={STRIP_H / 2 - 6} width={STRIP_W - 2 * MARKER_R} height={12} rx={6}
        fill="url(#track-grad)" />

      <!-- Tick marks -->
      {#each TICK_EXPS as te}
        {@const tx = expToX(te)}
        <line x1={tx} y1={STRIP_H / 2 - 12} x2={tx} y2={STRIP_H / 2 + 12}
          stroke="color-mix(in srgb, var(--site-fg) 20%, transparent)" stroke-width="1" />
        <text
          x={tx}
          y={STRIP_H - 4}
          text-anchor="middle"
          font-size="9"
          font-family="var(--font-mono)"
          fill="var(--site-fg-muted)"
        >
          {te === 0 ? '1' : `10^${te}`}
        </text>
      {/each}

      <!-- Direction labels -->
      <text x={MARKER_R + 4} y={14} font-size="9" font-family="var(--font-mono)"
        fill="var(--ink-coral)">← tiny</text>
      <text x={STRIP_W - MARKER_R - 4} y={14} font-size="9" font-family="var(--font-mono)"
        text-anchor="end" fill="var(--ink-sea)">large →</text>

      <!-- Draggable markers -->
      {#each exps as e, idx}
        {@const mx = expToX(e)}
        {@const color = MARKER_COLORS[idx]}
        <g
          role="slider"
          aria-label="{LABELS[idx]} = {fmtProb(prob(e))}"
          aria-valuemin={MIN_EXP}
          aria-valuemax={MAX_EXP}
          aria-valuenow={e}
          tabindex="0"
          style="cursor: ew-resize; outline: none;"
          onmousedown={(ev) => onPointerDown(idx, ev)}
          ontouchstart={(ev) => onPointerDown(idx, ev)}
          onkeydown={(ev) => onKeyDown(idx, ev)}
        >
          <!-- Vertical line from track to marker -->
          <line x1={mx} y1={STRIP_H / 2 - 6} x2={mx} y2={STRIP_H / 2 - 16}
            stroke={color} stroke-width="2" />
          <!-- Marker circle -->
          <circle cx={mx} cy={STRIP_H / 2 - 22} r={MARKER_R}
            fill={color}
            stroke="var(--demo-card)"
            stroke-width="2"
          />
          <!-- Label -->
          <text x={mx} y={STRIP_H / 2 - 18} text-anchor="middle"
            font-size="9" font-family="var(--font-mono)"
            fill="var(--demo-card)" font-weight="700">
            {LABELS[idx]}
          </text>
        </g>
      {/each}
    </svg>
  </div>

  <!-- Controls -->
  <div class="controls">
    <button class="btn-danger" onclick={pushSmall}>push all three tiny</button>
    <button class="btn-reset" onclick={resetValues}>reset</button>
  </div>

  <!-- Per-probability display -->
  <div class="probs-row">
    {#each exps as e, idx}
      {@const color = MARKER_COLORS[idx]}
      <div class="prob-chip" style="--chip-color: {color};">
        <span class="prob-label" style="color: {color};">{LABELS[idx]}</span>
        <span class="prob-val">{fmtProb(prob(e))}</span>
        <div class="exp-stepper">
          <button
            aria-label="decrease {LABELS[idx]} exponent"
            onclick={() => { exps = exps.map((v, i) => i === idx ? clampExp(v - 10) : v); }}
          >−</button>
          <span class="exp-val">10^{e.toFixed(0)}</span>
          <button
            aria-label="increase {LABELS[idx]} exponent"
            onclick={() => { exps = exps.map((v, i) => i === idx ? clampExp(v + 10) : v); }}
          >+</button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Two computation tracks -->
  <div class="tracks">
    <!-- Multiply track -->
    <div class="track track-multiply" class:underflow={underflowed}>
      <div class="track-header">
        <span class="track-title">multiply track</span>
        <span class="track-formula">p₁ × p₂ × p₃</span>
      </div>
      <div class="track-value" class:underflow-value={underflowed}
        aria-live="polite"
        aria-label="Product: {fmtProduct(product, underflowed)}">
        {fmtProduct(product, underflowed)}
      </div>
      {#if underflowed}
        <div class="track-alert">underflowed to 0 — information lost</div>
        <div class="log-of-product broken">
          log₁₀(product) = {fmtLogOfProduct(logOfProduct, underflowed)}
        </div>
      {:else}
        <div class="log-of-product ok">
          log₁₀(product) = {logOfProduct.toFixed(4)}
        </div>
      {/if}
    </div>

    <!-- Log-sum track -->
    <div class="track track-log">
      <div class="track-header">
        <span class="track-title">log-sum track</span>
        <span class="track-formula">log₁₀(p₁) + log₁₀(p₂) + log₁₀(p₃)</span>
      </div>
      <div class="track-value log-value"
        aria-live="polite"
        aria-label="Sum of logs: {logSumActual.toFixed(4)}">
        {logSumActual.toFixed(4)}
      </div>
      <div class="log-of-product ok">
        still exact — no underflow possible
      </div>
    </div>
  </div>

  <!-- Identity reconciliation -->
  <div class="reconcile" aria-live="polite">
    <span class="reconcile-label">identity check:</span>
    {#if underflowed}
      <span class="reconcile-broken">log₁₀(product) = −∞</span>
      <span class="reconcile-vs">≠</span>
      <span class="reconcile-ok">∑log = {logSumActual.toFixed(2)}</span>
      <span class="reconcile-note">identity broken by underflow</span>
    {:else}
      <span class="reconcile-ok">log₁₀(product) ≈ ∑log = {logSumActual.toFixed(4)}</span>
      <span class="reconcile-note">identity holds</span>
    {/if}
  </div>

  <!-- Readout + hint -->
  <div class="readout" aria-live="polite">
    {verdict}
    <p class="hint">
      Drag the markers tiny. Watch the multiply track collapse to zero while the
      sum-of-logs track keeps the real number. That collapse is why every
      training loss is a sum of logs.
    </p>
  </div>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .stage {
    width: 100%;
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    padding: 0.5rem 0;
  }

  /* ── Controls ─────────────────────────────────────────────────────────── */
  .controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  button {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    border: none;
    border-radius: var(--radius-pill);
    padding: 0.35rem 0.9rem;
    cursor: pointer;
    transition: filter 0.15s;
  }
  button:hover { filter: brightness(1.1); }
  button:active { filter: brightness(0.9); }

  .btn-danger {
    background: color-mix(in srgb, var(--ink-coral) 15%, transparent);
    color: var(--ink-coral);
    border: 1px solid color-mix(in srgb, var(--ink-coral) 30%, transparent);
    font-weight: 600;
  }

  .btn-reset {
    background: color-mix(in srgb, var(--site-fg) 8%, transparent);
    color: var(--site-fg-muted);
    border: 1px solid color-mix(in srgb, var(--site-fg) 15%, transparent);
  }

  /* ── Per-probability chips ────────────────────────────────────────────── */
  .probs-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .prob-chip {
    flex: 1;
    min-width: 120px;
    background: color-mix(in srgb, var(--chip-color) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--chip-color) 25%, transparent);
    border-radius: var(--radius-md);
    padding: 0.45rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .prob-label {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .prob-val {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .exp-stepper {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.15rem;
  }

  .exp-stepper button {
    padding: 0.1rem 0.45rem;
    font-size: 0.85rem;
    background: color-mix(in srgb, var(--site-fg) 10%, transparent);
    color: var(--site-fg);
    border: 1px solid color-mix(in srgb, var(--site-fg) 15%, transparent);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    line-height: 1;
  }

  .exp-val {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--site-fg-muted);
    flex: 1;
    text-align: center;
  }

  /* ── Two-track panel ─────────────────────────────────────────────────── */
  .tracks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  @media (max-width: 520px) {
    .tracks { grid-template-columns: 1fr; }
  }

  .track {
    border-radius: var(--radius-md);
    padding: 0.7rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .track-multiply {
    background: color-mix(in srgb, var(--ink-coral) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-coral) 20%, transparent);
  }

  .track-multiply.underflow {
    background: color-mix(in srgb, var(--ink-coral) 14%, transparent);
    border-color: color-mix(in srgb, var(--ink-coral) 50%, transparent);
  }

  .track-log {
    background: color-mix(in srgb, var(--ink-sea) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-sea) 20%, transparent);
  }

  .track-header {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .track-title {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--site-fg-muted);
  }

  .track-formula {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--site-fg-muted);
    opacity: 0.7;
  }

  .track-value {
    font-family: var(--font-mono);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--site-fg);
    word-break: break-all;
  }

  .track-value.underflow-value {
    color: var(--ink-coral);
    font-size: 1.1rem;
  }

  .log-value {
    color: var(--ink-sea);
  }

  .track-alert {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--ink-coral);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .log-of-product {
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }

  .log-of-product.ok {
    color: var(--ink-sea);
  }

  .log-of-product.broken {
    color: var(--ink-coral);
    font-weight: 700;
  }

  /* ── Identity reconciliation ─────────────────────────────────────────── */
  .reconcile {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 0.45rem 0.6rem;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
  }

  .reconcile-label {
    color: var(--site-fg-muted);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reconcile-ok {
    color: var(--ink-sea);
    font-weight: 600;
  }

  .reconcile-broken {
    color: var(--ink-coral);
    font-weight: 700;
  }

  .reconcile-vs {
    color: var(--ink-coral);
    font-weight: 700;
    font-size: 1rem;
  }

  .reconcile-note {
    font-size: 0.7rem;
    color: var(--site-fg-muted);
    font-style: italic;
  }

  /* ── Readout + hint ──────────────────────────────────────────────────── */
  .readout {
    font-family: var(--font-mono);
    font-size: 0.83rem;
    color: var(--site-fg);
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.5rem;
  }

  .hint {
    margin: 0.2rem 0 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }
</style>
