<script lang="ts">
  // Models the qualitative gradient-norm-per-layer profile from Xiong et al.
  // 2020. The exact theorem is stated for layer L (the top); we extend to
  // layer ℓ with a simple monotone profile. The pedagogical claim — post-LN
  // gradients diverge across depth, pre-LN stay flat — survives the
  // approximation.

  let L = $state(24);

  function postLnGrad(layer: number, depth: number): number {
    const norm = Math.log(depth + 1);
    const t = (layer - 1) / Math.max(1, depth - 1); // 0 at bottom, 1 at top
    return norm * (0.05 + 0.95 * t * t);
  }
  function preLnGrad(_layer: number, depth: number): number {
    return Math.log(depth + 1) / Math.sqrt(depth);
  }

  const layers = $derived(Array.from({ length: L }, (_, i) => i + 1));
  const postCurve = $derived(layers.map((l) => postLnGrad(l, L)));
  const preCurve = $derived(layers.map((l) => preLnGrad(l, L)));

  const yMax = $derived(Math.max(0.5, ...postCurve, ...preCurve) * 1.1);

  const postMax = $derived(Math.max(...postCurve));
  const preMax = $derived(Math.max(...preCurve));
  const ratio = $derived(postMax / Math.max(preMax, 1e-9));
  const warmupRequired = $derived(ratio > 3);

  // SVG geometry
  const W = 540;
  const H = 240;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 36;

  function xFor(layer: number) {
    if (L === 1) return PAD_L + (W - PAD_L - PAD_R) / 2;
    return PAD_L + ((layer - 1) / (L - 1)) * (W - PAD_L - PAD_R);
  }
  function yFor(value: number) {
    return H - PAD_B - (value / yMax) * (H - PAD_T - PAD_B);
  }

  const postPath = $derived(
    postCurve.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i + 1).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ')
  );
  const prePath = $derived(
    preCurve.map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i + 1).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ')
  );

  // Y-axis tick values
  const yTicks = $derived([0, yMax * 0.5, yMax]);
</script>

<div class="widget">
  <div class="controls">
    <label class="ctrl">
      <span class="ctrl-label">depth L</span>
      <input type="range" min="2" max="48" step="1" bind:value={L} />
      <output class="ctrl-val">{L}</output>
    </label>
    <div class="legend-inline">
      <span class="key post"></span><span>post-LN</span>
      <span class="key pre"></span><span>pre-LN</span>
    </div>
  </div>

  <svg viewBox={`0 0 ${W} ${H}`} class="plot" role="img" aria-label="gradient norm vs layer">
    <!-- Axes -->
    <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} class="axis" />
    <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} class="axis" />

    <!-- Y ticks -->
    {#each yTicks as t}
      <line x1={PAD_L - 4} y1={yFor(t)} x2={PAD_L} y2={yFor(t)} class="axis" />
      <text x={PAD_L - 8} y={yFor(t) + 4} class="tick-label" text-anchor="end">{t.toFixed(2)}</text>
    {/each}

    <!-- X ticks -->
    {#each [1, Math.ceil(L / 2), L] as l}
      <line x1={xFor(l)} y1={H - PAD_B} x2={xFor(l)} y2={H - PAD_B + 4} class="axis" />
      <text x={xFor(l)} y={H - PAD_B + 18} class="tick-label" text-anchor="middle">ℓ = {l}</text>
    {/each}

    <!-- Axis labels -->
    <text x={PAD_L - 36} y={(H - PAD_B + PAD_T) / 2} class="axis-label" transform={`rotate(-90 ${PAD_L - 36} ${(H - PAD_B + PAD_T) / 2})`} text-anchor="middle">‖∂L / ∂θ_ℓ‖</text>
    <text x={(W + PAD_L - PAD_R) / 2} y={H - 4} class="axis-label" text-anchor="middle">layer index</text>

    <!-- Curves -->
    <path d={postPath} class="curve post" fill="none" />
    <path d={prePath} class="curve pre" fill="none" />

    <!-- Endpoint dots -->
    <circle cx={xFor(L)} cy={yFor(postCurve[L - 1])} r="4" class="dot post" />
    <circle cx={xFor(L)} cy={yFor(preCurve[L - 1])} r="4" class="dot pre" />
  </svg>

  <div class="metrics">
    <div class="metric post">
      <span class="metric-label">post-LN max norm</span>
      <span class="metric-val">{postMax.toFixed(2)}</span>
    </div>
    <div class="metric pre">
      <span class="metric-label">pre-LN max norm</span>
      <span class="metric-val">{preMax.toFixed(2)}</span>
    </div>
    <div class="metric ratio" data-state={warmupRequired ? 'warn' : 'ok'}>
      <span class="metric-label">post : pre ratio</span>
      <span class="metric-val">{ratio.toFixed(1)}×</span>
    </div>
    <div class="verdict" data-state={warmupRequired ? 'warn' : 'ok'}>
      {warmupRequired ? 'post-LN at this depth → warmup required' : 'post-LN at this depth → still trainable as-is'}
    </div>
  </div>

  <p class="footnote">
    qualitative profile after Xiong et al. 2020. post-LN's gradient grows toward the output as L increases; pre-LN's flattens at <em>O(1/√L)</em>.
  </p>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(1rem, 2vw, 1.5rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sea) 55%, transparent);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    justify-content: space-between;
  }
  .ctrl {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
  .ctrl-label {
    color: var(--site-fg-muted);
    font-weight: 600;
  }
  .ctrl input[type='range'] {
    width: 220px;
    accent-color: var(--ink-sea);
  }
  .ctrl-val {
    min-width: 2rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--site-fg);
  }
  .legend-inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }
  .key {
    width: 1.1rem;
    height: 3px;
    border-radius: 2px;
  }
  .key.post { background: var(--ink-coral); }
  .key.pre { background: var(--ink-sea); }

  .plot {
    width: 100%;
    height: auto;
    background: var(--demo-stage);
    border-radius: 12px;
  }
  .axis {
    stroke: color-mix(in srgb, var(--site-fg) 30%, transparent);
    stroke-width: 1;
  }
  .tick-label {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--site-fg-muted);
  }
  .axis-label {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--site-fg-muted);
  }
  .curve {
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: d 220ms ease;
  }
  .curve.post { stroke: var(--ink-coral); }
  .curve.pre { stroke: var(--ink-sea); }
  .dot.post { fill: var(--ink-coral); }
  .dot.pre { fill: var(--ink-sea); }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border-left: 3px solid var(--site-fg-muted);
  }
  .metric.post {
    border-left-color: var(--ink-coral);
    background: color-mix(in srgb, var(--ink-coral) 8%, transparent);
  }
  .metric.pre {
    border-left-color: var(--ink-sea);
    background: color-mix(in srgb, var(--ink-sea) 8%, transparent);
  }
  .metric.ratio[data-state='warn'] {
    border-left-color: var(--ink-orange);
    background: color-mix(in srgb, var(--ink-orange) 12%, transparent);
  }
  .metric-label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .metric-val {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--site-fg);
  }

  .verdict {
    grid-column: 1 / -1;
    padding: 0.55rem 0.85rem;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border-left: 3px solid var(--site-fg-muted);
  }
  .verdict[data-state='warn'] {
    background: color-mix(in srgb, var(--ink-orange) 12%, transparent);
    border-left-color: var(--ink-orange);
  }
  .verdict[data-state='ok'] {
    background: color-mix(in srgb, var(--cta-hover) 10%, transparent);
    border-left-color: var(--cta-hover);
  }

  .footnote {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }
  .footnote em {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    color: var(--site-fg);
  }
</style>
