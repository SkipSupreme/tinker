<script lang="ts">
  const T = 5;
  const D = 24;
  const TOKENS = ['t₁', 't₂', 't₃', 't₄', 't₅'];

  function mulberry32(a: number) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng: () => number) {
    const u = 1 - rng();
    const v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const X: number[][] = (() => {
    const rng = mulberry32(7);
    return Array.from({ length: T }, () =>
      Array.from({ length: D }, () => gauss(rng))
    );
  })();

  const H_OPTIONS = [1, 2, 4, 8] as const;
  let h = $state<number>(2);
  const dk = $derived(D / h);

  function selfAttentionFromSlice(start: number, width: number): number[][] {
    // Slice X into a (T, width) submatrix. Use it as Q = K = V for this head.
    const slice = X.map((row) => row.slice(start, start + width));
    const sqrtDk = Math.sqrt(width);
    const scores: number[][] = [];
    for (let i = 0; i < T; i++) {
      const row: number[] = [];
      for (let j = 0; j < T; j++) {
        let dot = 0;
        for (let k = 0; k < width; k++) dot += slice[i][k] * slice[j][k];
        row.push(dot / sqrtDk);
      }
      scores.push(row);
    }
    return scores.map((row) => {
      const m = Math.max(...row);
      const exps = row.map((s) => Math.exp(s - m));
      const z = exps.reduce((a, b) => a + b, 0);
      return exps.map((e) => e / z);
    });
  }

  const heads = $derived(
    Array.from({ length: h }, (_, headIdx) =>
      selfAttentionFromSlice(headIdx * dk, dk)
    )
  );

  // Param accounting: W_Q is (D, dk) per head.
  const wqPerHead = $derived(D * dk);
  const wqTotal = $derived(wqPerHead * h);
</script>

<div class="widget">
  <div class="controls">
    <span class="label">heads (h)</span>
    <div class="seg" role="group">
      {#each H_OPTIONS as opt}
        <button
          type="button"
          class="seg-btn"
          class:active={h === opt}
          onclick={() => (h = opt)}
        >
          {opt}
        </button>
      {/each}
    </div>
  </div>

  <div class="passport">
    <div class="step">
      <span class="step-label">input</span>
      <code>X ∈ ℝ<sup>{T}×{D}</sup></code>
    </div>
    <span class="arrow">→</span>
    <div class="step">
      <span class="step-label">split d → (h, d/h)</span>
      <code>{h} × ℝ<sup>{T}×{dk}</sup></code>
    </div>
    <span class="arrow">→</span>
    <div class="step">
      <span class="step-label">per-head attention</span>
      <code>{h} × ℝ<sup>{T}×{T}</sup></code>
    </div>
    <span class="arrow">→</span>
    <div class="step">
      <span class="step-label">concat &amp; W<sub>O</sub></span>
      <code>ℝ<sup>{T}×{D}</sup></code>
    </div>
  </div>

  <div class="heads-grid" data-h={h}>
    {#each heads as head, headIdx}
      <div class="head">
        <h5>head {headIdx + 1} <span class="muted">d<sub>k</sub> = {dk}</span></h5>
        <div class="mini-grid">
          {#each head as row, i}
            <div class="mini-row">
              {#each row as w}
                <div class="mini-cell" style="--a:{w}"></div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="param-bar">
    <div class="metric">
      <span class="metric-label">W<sub>Q</sub> per head</span>
      <span class="metric-val">{D} × {dk} = {wqPerHead.toLocaleString()}</span>
    </div>
    <div class="metric hi">
      <span class="metric-label">total W<sub>Q</sub> params</span>
      <span class="metric-val">{wqTotal.toLocaleString()}</span>
    </div>
    <div class="metric">
      <span class="metric-label">single-head reference</span>
      <span class="metric-val">{D} × {D} = {(D * D).toLocaleString()}</span>
    </div>
  </div>

  <p class="legend">
    same total parameters and FLOPs at every <em>h</em>. structural diversity is free.
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
    align-items: center;
    gap: 0.65rem;
  }
  .label {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  .seg {
    display: inline-flex;
    border: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    border-radius: 10px;
    overflow: hidden;
  }
  .seg-btn {
    appearance: none;
    border: 0;
    padding: 0.4rem 0.85rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    background: transparent;
    color: var(--site-fg-muted);
    cursor: pointer;
    min-width: 2.5rem;
    font-weight: 600;
  }
  .seg-btn + .seg-btn {
    border-left: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
  }
  .seg-btn.active {
    background: color-mix(in srgb, var(--ink-sea) 18%, transparent);
    color: var(--site-fg);
  }

  .passport {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 0.85rem;
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border-radius: 12px;
    border-left: 3px solid var(--ink-sea);
  }
  .passport .step {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .step-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .passport code {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--site-fg);
    background: transparent;
    padding: 0;
  }
  .passport sup,
  .passport sub {
    font-size: 0.7em;
  }
  .passport .arrow {
    font-family: var(--font-mono);
    color: var(--site-fg-muted);
    margin: 0 0.2rem;
  }

  .heads-grid {
    display: grid;
    gap: 0.6rem;
    grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
  }
  .heads-grid[data-h='1'] {
    grid-template-columns: 1fr;
  }
  .heads-grid[data-h='2'] {
    grid-template-columns: repeat(2, 1fr);
  }
  .heads-grid[data-h='4'] {
    grid-template-columns: repeat(4, 1fr);
  }
  .heads-grid[data-h='8'] {
    grid-template-columns: repeat(4, 1fr);
  }
  .head {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.5rem 0.55rem;
    background: color-mix(in srgb, var(--site-fg) 3%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 8%, transparent);
    border-radius: 10px;
  }
  .head h5 {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
    font-weight: 700;
  }
  .head h5 .muted {
    color: var(--site-fg-muted);
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    margin-left: 0.4rem;
  }
  .mini-grid {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .mini-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 2px;
  }
  .mini-cell {
    aspect-ratio: 1;
    border-radius: 3px;
    background: color-mix(in srgb, var(--ink-sea) calc(var(--a) * 100%), transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 6%, transparent);
    transition: background 220ms ease;
  }

  .param-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    padding-top: 0.6rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
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
  .metric.hi {
    border-left-color: var(--ink-sun);
    background: color-mix(in srgb, var(--ink-sun) 12%, transparent);
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
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--site-fg);
  }

  .legend {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }
  .legend em {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    color: var(--site-fg);
  }
</style>
