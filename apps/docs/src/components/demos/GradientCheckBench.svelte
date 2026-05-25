<script lang="ts">
  /**
   * GradientCheckBench — M12.5. Pick a function, scrub ε on a log axis,
   * watch the characteristic U-curve of relative error: truncation error
   * dominates at large ε, floating-point cancellation at tiny ε. The
   * minimum is ~1e-5 for centered finite differences in float64.
   */

  type FnKey = 'square' | 'sin' | 'tanh' | 'exp';

  type FnSpec = {
    label: string;
    f: (x: number) => number;
    fp: (x: number) => number;
    x: number;
  };

  const fns: Record<FnKey, FnSpec> = {
    square: { label: 'x²', f: (x) => x * x, fp: (x) => 2 * x, x: 1.7 },
    sin: { label: 'sin x', f: Math.sin, fp: Math.cos, x: 0.6 },
    tanh: { label: 'tanh x', f: Math.tanh, fp: (x) => 1 - Math.tanh(x) ** 2, x: 0.4 },
    exp: { label: 'eˣ', f: Math.exp, fp: Math.exp, x: 0.5 },
  };

  let key = $state<FnKey>('square');
  const spec = $derived(fns[key]);

  // log10(ε) slider; default at the sweet spot
  let logEps = $state(-5);
  const eps = $derived(Math.pow(10, logEps));

  function relerr(f: (x: number) => number, fp: (x: number) => number, x: number, e: number) {
    const num = (f(x + e) - f(x - e)) / (2 * e);
    const ana = fp(x);
    const denom = Math.abs(ana) + Math.abs(num);
    if (denom === 0) return 0;
    return Math.abs(ana - num) / denom;
  }

  const currentRelerr = $derived(relerr(spec.f, spec.fp, spec.x, eps));

  // Precompute the U-curve points across log10(ε) ∈ [-12, 0]
  const samples = $derived.by(() => {
    const pts: Array<{ logE: number; logErr: number }> = [];
    for (let le = -12; le <= 0; le += 0.25) {
      const e = Math.pow(10, le);
      const r = relerr(spec.f, spec.fp, spec.x, e);
      pts.push({ logE: le, logErr: Math.log10(Math.max(r, 1e-18)) });
    }
    return pts;
  });

  // SVG layout
  const W = 480;
  const H = 240;
  const PAD_L = 50;
  const PAD_R = 14;
  const PAD_T = 16;
  const PAD_B = 36;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = H - PAD_T - PAD_B;

  // log ε axis: -12 to 0 maps to PAD_L .. W-PAD_R
  function xMap(logE: number) {
    return PAD_L + ((logE - -12) / (0 - -12)) * PLOT_W;
  }
  // log err axis: -18 to 0 maps to bottom up
  function yMap(logErr: number) {
    return PAD_T + ((-logErr - -0) / (18 - 0)) * PLOT_H;
  }

  const pathD = $derived(
    samples
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xMap(p.logE).toFixed(1)} ${yMap(p.logErr).toFixed(1)}`)
      .join(' '),
  );

  // Sweet-spot band: ε ∈ [1e-6, 1e-4]
  const sweetX1 = xMap(-6);
  const sweetX2 = xMap(-4);

  // x-axis ticks at integer log values
  const xTicks = Array.from({ length: 13 }, (_, i) => -12 + i);
  // y-axis ticks every 4 log decades
  const yTicks = [0, -4, -8, -12, -16];

  const fmt = (n: number) => {
    if (n === 0) return '0';
    if (Math.abs(n) < 1e-4 || Math.abs(n) >= 1e4) return n.toExponential(1);
    return n.toFixed(4);
  };
</script>

<div class="widget">
  <div class="picker" role="tablist">
    {#each Object.entries(fns) as [k, s] (k)}
      <button
        type="button"
        role="tab"
        class="pill"
        class:active={key === k}
        aria-selected={key === k}
        onclick={() => (key = k as FnKey)}
      >{s.label}</button>
    {/each}
  </div>

  <div class="readouts">
    <div class="r">
      <span class="k">f</span>
      <span class="v">{spec.label}</span>
    </div>
    <div class="r">
      <span class="k">x</span>
      <span class="v">{spec.x}</span>
    </div>
    <div class="r">
      <span class="k">analytical f'(x)</span>
      <span class="v">{fmt(spec.fp(spec.x))}</span>
    </div>
    <div class="r">
      <span class="k">numerical (ε = {fmt(eps)})</span>
      <span class="v">{fmt((spec.f(spec.x + eps) - spec.f(spec.x - eps)) / (2 * eps))}</span>
    </div>
    <div class="r">
      <span class="k">relative error</span>
      <span class="v" class:sweet={currentRelerr < 1e-7}>{fmt(currentRelerr)}</span>
    </div>
  </div>

  <label class="slider-field">
    <span class="slider-label">
      log₁₀(ε) = {logEps.toFixed(2)} &nbsp;⇒&nbsp; ε = {fmt(eps)}
    </span>
    <input type="range" min="-12" max="0" step="0.05" bind:value={logEps} />
    <span class="slider-ends">
      <span>1e-12</span><span>1e0</span>
    </span>
  </label>

  <div class="stage">
    <svg viewBox={`0 0 ${W} ${H}`} aria-label="U-curve of relative error vs epsilon">
      <!-- sweet-spot band -->
      <rect
        x={sweetX1}
        y={PAD_T}
        width={sweetX2 - sweetX1}
        height={PLOT_H}
        fill="color-mix(in srgb, var(--cta) 14%, transparent)"
      />
      <text
        x={(sweetX1 + sweetX2) / 2}
        y={PAD_T + 12}
        text-anchor="middle"
        font-family="var(--font-mono)"
        font-size="9"
        fill="var(--cta)"
      >sweet spot</text>

      <!-- axes -->
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--site-fg-muted)" />
      <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--site-fg-muted)" />

      <!-- x ticks & labels -->
      {#each xTicks as t (t)}
        <line
          x1={xMap(t)}
          y1={H - PAD_B}
          x2={xMap(t)}
          y2={H - PAD_B + 4}
          stroke="var(--site-fg-muted)"
        />
        {#if t % 3 === 0}
          <text
            x={xMap(t)}
            y={H - PAD_B + 16}
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="9"
            fill="var(--site-fg-muted)"
          >10^{t}</text>
        {/if}
      {/each}
      <text
        x={(PAD_L + W - PAD_R) / 2}
        y={H - 6}
        text-anchor="middle"
        font-family="var(--font-mono)"
        font-size="9.5"
        fill="var(--site-fg-muted)"
      >ε</text>

      <!-- y ticks & labels -->
      {#each yTicks as t (t)}
        <line
          x1={PAD_L - 4}
          y1={yMap(t)}
          x2={PAD_L}
          y2={yMap(t)}
          stroke="var(--site-fg-muted)"
        />
        <text
          x={PAD_L - 8}
          y={yMap(t) + 3}
          text-anchor="end"
          font-family="var(--font-mono)"
          font-size="9"
          fill="var(--site-fg-muted)"
        >10^{t}</text>
      {/each}
      <text
        x={14}
        y={PAD_T + 8}
        text-anchor="start"
        font-family="var(--font-mono)"
        font-size="9.5"
        fill="var(--site-fg-muted)"
      >relerr</text>

      <!-- U-curve -->
      <path d={pathD} fill="none" stroke="var(--ink-sea)" stroke-width="2" />

      <!-- current epsilon marker -->
      <line
        x1={xMap(logEps)}
        y1={PAD_T}
        x2={xMap(logEps)}
        y2={H - PAD_B}
        stroke="var(--ink-coral)"
        stroke-width="1.5"
        stroke-dasharray="3 3"
      />
      <circle
        cx={xMap(logEps)}
        cy={yMap(Math.log10(Math.max(currentRelerr, 1e-18)))}
        r="4"
        fill="var(--ink-coral)"
      />
    </svg>
  </div>

  <p class="hint">
    Large ε: the centered difference is a polynomial approximation, so
    truncation error grows as ε². Tiny ε: subtracting two nearly-equal
    floating-point numbers in <code>f(x+ε) − f(x−ε)</code> wipes out
    significant digits. The minimum sits near √(machine epsilon) ≈ 1e-8 for
    centered differences in float64 — typically pick ε ≈ 1e-5 in practice.
  </p>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border, var(--site-border));
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .pill {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    cursor: pointer;
  }

  .pill.active {
    background: color-mix(in srgb, var(--ink-red) 14%, transparent);
    border-color: var(--ink-red);
  }

  .readouts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
  }

  .r {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    font-family: var(--font-mono);
    min-width: 7rem;
  }

  .k {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
  }

  .v {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
  }

  .v.sweet {
    color: var(--cta);
  }

  .slider-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .slider-label {
    font-family: var(--font-mono);
    font-size: 0.84rem;
    color: var(--site-fg);
  }

  .slider-field input[type='range'] {
    width: 100%;
    accent-color: var(--ink-coral);
  }

  .slider-ends {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--site-fg-muted);
  }

  .stage {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    padding: 0.3rem;
  }

  .stage svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.55;
  }

  .hint code {
    font-family: var(--font-mono);
    font-size: 0.86em;
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    padding: 0.05em 0.3em;
    border-radius: 4px;
  }
</style>
