<script lang="ts">
  const T = 8;
  const D_MAX = 512;
  const DK_STOPS = [2, 4, 8, 16, 32, 64, 128, 256, 512] as const;

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
  function generate(seed: number) {
    const rng = mulberry32(seed);
    const q = Array.from({ length: D_MAX }, () => gauss(rng));
    const keys = Array.from({ length: T }, () =>
      Array.from({ length: D_MAX }, () => gauss(rng))
    );
    return { q, keys };
  }

  const initial = generate(1);
  let q = $state<number[]>(initial.q);
  let keys = $state<number[][]>(initial.keys);
  let seed = $state(1);

  let dkIndex = $state(2); // default dk = 8
  let scaled = $state(true);

  const dk = $derived(DK_STOPS[dkIndex]);

  const scores = $derived.by(() => {
    const out = new Array(T);
    for (let j = 0; j < T; j++) {
      let s = 0;
      const k = keys[j];
      for (let i = 0; i < dk; i++) s += q[i] * k[i];
      out[j] = scaled ? s / Math.sqrt(dk) : s;
    }
    return out;
  });

  const weights = $derived.by(() => {
    const m = Math.max(...scores);
    const exps = scores.map((s) => Math.exp(s - m));
    const z = exps.reduce((a, b) => a + b, 0);
    return exps.map((e) => e / z);
  });

  const entropy = $derived.by(() => {
    let h = 0;
    for (const w of weights) if (w > 1e-12) h -= w * Math.log(w);
    return h;
  });
  const maxEntropy = Math.log(T);
  const maxAlpha = $derived(Math.max(...weights));
  const argmax = $derived(scores.indexOf(Math.max(...scores)));

  const scoreScale = $derived(Math.max(0.01, ...scores.map((s) => Math.abs(s))));

  function resample() {
    seed = (seed + 1) | 0;
    const r = generate(seed);
    q = r.q;
    keys = r.keys;
  }

  // 1 = max diversity (uniform), 0 = collapsed (one-hot)
  const survival = $derived(entropy / maxEntropy);
  const survivalLabel = $derived(
    survival > 0.85
      ? 'healthy'
      : survival > 0.5
        ? 'fading'
        : survival > 0.2
          ? 'dying'
          : 'dead'
  );
</script>

<div class="widget">
  <div class="controls">
    <label class="ctrl">
      <span class="ctrl-label">d<sub>k</sub></span>
      <input
        type="range"
        min="0"
        max={DK_STOPS.length - 1}
        step="1"
        bind:value={dkIndex}
        aria-label="key dimension d_k"
      />
      <output class="ctrl-val">{dk}</output>
    </label>

    <div class="seg" role="group" aria-label="Scale toggle">
      <button
        type="button"
        class="seg-btn"
        class:active={!scaled}
        onclick={() => (scaled = false)}
      >
        no scale
      </button>
      <button
        type="button"
        class="seg-btn"
        class:active={scaled}
        onclick={() => (scaled = true)}
      >
        ÷ √d<sub>k</sub>
      </button>
    </div>

    <button type="button" class="resample" onclick={resample}>
      ↻ resample q, k
    </button>
  </div>

  <div class="panel">
    <h4 class="panel-title">scores <span class="muted">(q · k<sub>j</sub>{scaled ? ' / √d<sub>k</sub>' : ''})</span></h4>
    <div class="bars score-bars">
      {#each scores as s, j}
        <div class="row">
          <span class="rowlabel">k<sub>{j + 1}</sub></span>
          <div class="track">
            <span class="zero"></span>
            {#if s >= 0}
              <span
                class="fill pos"
                class:argmax={j === argmax}
                style="width:{(s / scoreScale) * 50}%; left:50%;"
              ></span>
            {:else}
              <span
                class="fill neg"
                style="width:{(-s / scoreScale) * 50}%; right:50%;"
              ></span>
            {/if}
          </div>
          <span class="rowval">{s >= 0 ? '+' : ''}{s.toFixed(2)}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="panel">
    <h4 class="panel-title">softmax weights <span class="muted">α<sub>j</sub></span></h4>
    <div class="bars weight-bars">
      {#each weights as w, j}
        <div class="row">
          <span class="rowlabel">α<sub>{j + 1}</sub></span>
          <div class="track">
            <span
              class="fill weight"
              class:argmax={j === argmax}
              style="width:{w * 100}%"
            ></span>
          </div>
          <span class="rowval">{(w * 100).toFixed(1)}%</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="readout">
    <div class="metric">
      <span class="metric-label">max α</span>
      <span class="metric-val">{(maxAlpha * 100).toFixed(0)}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">entropy</span>
      <span class="metric-val">{entropy.toFixed(2)} <span class="muted">/ {maxEntropy.toFixed(2)}</span></span>
    </div>
    <div class="metric survival" data-state={survivalLabel}>
      <span class="metric-label">gradient survival</span>
      <span class="metric-val">{survivalLabel}</span>
    </div>
  </div>
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
    gap: 0.85rem;
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
  .ctrl-label sub {
    font-size: 0.75em;
  }
  .ctrl input[type='range'] {
    width: 140px;
    accent-color: var(--ink-sea);
  }
  .ctrl-val {
    min-width: 2.5rem;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    color: var(--site-fg);
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
    padding: 0.4rem 0.75rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: transparent;
    color: var(--site-fg-muted);
    cursor: pointer;
    transition:
      background 160ms ease,
      color 160ms ease;
  }
  .seg-btn + .seg-btn {
    border-left: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
  }
  .seg-btn.active {
    background: color-mix(in srgb, var(--ink-sea) 18%, transparent);
    color: var(--site-fg);
  }
  .seg-btn:hover:not(.active) {
    background: color-mix(in srgb, var(--site-fg) 5%, transparent);
  }

  .resample {
    appearance: none;
    border: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    background: transparent;
    color: var(--site-fg-muted);
    padding: 0.4rem 0.75rem;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    cursor: pointer;
    transition: background 160ms ease;
  }
  .resample:hover {
    background: color-mix(in srgb, var(--site-fg) 5%, transparent);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 0.5rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }
  .panel-title {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    font-weight: 700;
  }
  .muted {
    color: var(--site-fg-muted);
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .row {
    display: grid;
    grid-template-columns: 2.4rem 1fr 4rem;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
  .rowlabel {
    color: var(--site-fg-muted);
  }
  .rowval {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--site-fg);
  }

  .track {
    position: relative;
    height: 12px;
    background: color-mix(in srgb, var(--site-fg) 6%, transparent);
    border-radius: 6px;
    overflow: hidden;
  }
  .score-bars .track .zero {
    position: absolute;
    left: 50%;
    top: 0;
    width: 1px;
    height: 100%;
    background: color-mix(in srgb, var(--site-fg) 30%, transparent);
  }
  .fill {
    position: absolute;
    top: 0;
    height: 100%;
    border-radius: 6px;
    transition:
      width 220ms ease,
      background 220ms ease;
  }
  .fill.pos {
    background: var(--ink-sea);
  }
  .fill.neg {
    background: var(--ink-coral);
  }
  .fill.weight {
    left: 0;
    background: var(--ink-sea);
  }
  .fill.argmax {
    background: var(--ink-sun);
  }

  .readout {
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
    border-left: 3px solid var(--ink-sea);
  }
  .metric-label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
  }
  .metric-val {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--site-fg);
  }
  .survival[data-state='healthy'] {
    border-left-color: var(--cta-hover);
    background: color-mix(in srgb, var(--cta-hover) 10%, transparent);
  }
  .survival[data-state='fading'] {
    border-left-color: var(--ink-sun);
    background: color-mix(in srgb, var(--ink-sun) 12%, transparent);
  }
  .survival[data-state='dying'] {
    border-left-color: var(--ink-orange);
    background: color-mix(in srgb, var(--ink-orange) 12%, transparent);
  }
  .survival[data-state='dead'] {
    border-left-color: var(--ink-coral);
    background: color-mix(in srgb, var(--ink-coral) 14%, transparent);
  }
</style>
