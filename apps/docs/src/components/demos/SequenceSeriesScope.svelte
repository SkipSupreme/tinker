<script lang="ts">
  import { Mafs, Coordinates, Line, Point, Text, MovablePoint } from 'svelte-mafs';

  type SeqType = 'arithmetic' | 'geometric';

  const N = 14;
  const A1 = 1;

  // --- state ---
  let seqType = $state<SeqType>('geometric');

  // parameter handle x-position on the little number-line strip.
  // for arithmetic this is d (range -2..2); for geometric this is r (range -1.5..1.5).
  let dParam = $state(0.6);
  let rParam = $state(0.6);
  // y of the handle is locked to 0; bind targets that we keep at 0.
  let dY = $state(0);
  let rY = $state(0);

  const D_MIN = -2;
  const D_MAX = 2;
  const R_MIN = -1.5;
  const R_MAX = 1.5;

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // constrain handles to their horizontal strip (y = 0, x clamped to range)
  function constrainD([x]: [number, number]): [number, number] {
    return [clamp(x, D_MIN, D_MAX), 0];
  }
  function constrainR([x]: [number, number]): [number, number] {
    return [clamp(x, R_MIN, R_MAX), 0];
  }

  const d = $derived(clamp(dParam, D_MIN, D_MAX));
  const r = $derived(clamp(rParam, R_MIN, R_MAX));

  // --- the sequences ---
  const terms = $derived.by<number[]>(() => {
    const out: number[] = [];
    for (let n = 1; n <= N; n++) {
      if (seqType === 'arithmetic') {
        out.push(A1 + (n - 1) * d);
      } else {
        out.push(A1 * Math.pow(r, n - 1));
      }
    }
    return out;
  });

  const partials = $derived.by<number[]>(() => {
    const out: number[] = [];
    let run = 0;
    for (const t of terms) {
      run += t;
      out.push(run);
    }
    return out;
  });

  // geometric infinite-sum limit (only meaningful for |r| < 1)
  const converges = $derived(seqType === 'geometric' && Math.abs(r) < 1);
  const limit = $derived(converges ? A1 / (1 - r) : NaN);

  // --- y view ranges, auto-scaled with headroom ---
  function rangeFor(values: number[]): [number, number] {
    let lo = 0;
    let hi = 0;
    for (const v of values) {
      if (Number.isFinite(v)) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    // hard cap so a blow-up does not flatten the plot to nothing
    lo = Math.max(lo, -40);
    hi = Math.min(hi, 40);
    const span = Math.max(hi - lo, 2);
    const pad = span * 0.18;
    return [lo - pad, hi + pad];
  }

  const termsY = $derived.by<[number, number]>(() => {
    const base = rangeFor(terms);
    // keep the limit line in view too when relevant
    if (converges && Number.isFinite(limit)) {
      return rangeFor([...terms, limit]);
    }
    return base;
  });

  const partialsY = $derived.by<[number, number]>(() => {
    if (converges && Number.isFinite(limit)) {
      return rangeFor([...partials, limit]);
    }
    return rangeFor(partials);
  });

  // clamp a stem value into a visible range so points never escape the viewBox
  function clampVal(v: number, range: [number, number]): number {
    return clamp(v, range[0], range[1]);
  }

  // --- readout text ---
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '-');

  const formula = $derived(
    seqType === 'arithmetic'
      ? `a_n = a_1 + (n-1)d = 1 + (n-1)(${d.toFixed(2)})`
      : `a_n = a_1 \\cdot r^{n-1} = 1 \\cdot (${r.toFixed(2)})^{n-1}`,
  );

  const sumFormula = $derived(
    seqType === 'arithmetic'
      ? `S_n = \\frac{n}{2}\\,(2a_1 + (n-1)d)`
      : converges
        ? `S_\\infty = \\frac{a_1}{1-r}`
        : `S_n = a_1\\,\\frac{1-r^{n}}{1-r}`,
  );

  // verdict line about the partial sums
  const verdict = $derived.by(() => {
    if (seqType === 'arithmetic') {
      if (d === 0) return { kind: 'diverge', text: 'partial sums grow without bound (S_n = n)' };
      return { kind: 'diverge', text: 'arithmetic partial sums always diverge' };
    }
    if (Math.abs(r) < 1) {
      return {
        kind: 'converge',
        text: `converges to a/(1-r) = ${fmt(limit)}`,
      };
    }
    if (r === 1) return { kind: 'diverge', text: 'r = 1: terms stay at 1, sum diverges' };
    if (r === -1) return { kind: 'diverge', text: 'r = -1: sum oscillates, never settles' };
    if (r > 1) return { kind: 'diverge', text: 'diverges: terms blow up' };
    return { kind: 'diverge', text: 'diverges: terms swing wider and wider' };
  });

  // last partial sum, for the readout
  const lastSum = $derived(partials[partials.length - 1] ?? 0);
</script>

<div class="widget">
  <div class="controls">
    <div class="seg" role="group" aria-label="sequence type">
      <button
        type="button"
        class="toggle"
        class:on={seqType === 'arithmetic'}
        aria-pressed={seqType === 'arithmetic'}
        onclick={() => (seqType = 'arithmetic')}
      >
        arithmetic
      </button>
      <button
        type="button"
        class="toggle"
        class:on={seqType === 'geometric'}
        aria-pressed={seqType === 'geometric'}
        onclick={() => (seqType = 'geometric')}
      >
        geometric
      </button>
    </div>
    <span class="param-tag">
      a_1 = 1 ·
      {#if seqType === 'arithmetic'}
        d = {d.toFixed(2)}
      {:else}
        r = {r.toFixed(2)}
      {/if}
    </span>
  </div>

  <!-- parameter number-line strip -->
  <div class="stage strip">
    {#if seqType === 'arithmetic'}
      <Mafs width={560} height={96} viewBox={{ x: [D_MIN - 0.3, D_MAX + 0.3], y: [-0.6, 0.6] }}>
        <Coordinates.Cartesian grid={false} yAxis={false} />
        <Text x={0} y={0.42} latex="\text{drag } d" size={12} color="var(--site-fg-muted)" />
        <MovablePoint
          bind:x={dParam}
          bind:y={dY}
          constrain={constrainD}
          color="var(--ink-coral)"
        />
      </Mafs>
    {:else}
      <Mafs width={560} height={96} viewBox={{ x: [R_MIN - 0.3, R_MAX + 0.3], y: [-0.6, 0.6] }}>
        <Coordinates.Cartesian grid={false} yAxis={false} />
        <!-- the |r| = 1 thresholds: crossing these is the key moment -->
        <Line.Segment point1={[-1, -0.3]} point2={[-1, 0.3]} color="var(--ink-red)" weight={2} opacity={0.7} />
        <Line.Segment point1={[1, -0.3]} point2={[1, 0.3]} color="var(--ink-red)" weight={2} opacity={0.7} />
        <Text x={-1} y={0.44} latex="|r| = 1" size={11} color="var(--ink-red)" />
        <Text x={1} y={0.44} latex="|r| = 1" size={11} color="var(--ink-red)" />
        <MovablePoint
          bind:x={rParam}
          bind:y={rY}
          constrain={constrainR}
          color="var(--ink-coral)"
        />
      </Mafs>
    {/if}
  </div>

  <!-- TOP: sequence terms a_n -->
  <div class="plot-label"><span class="dot sea"></span>terms a_n</div>
  <div class="stage">
    <Mafs width={560} height={210} viewBox={{ x: [0, N + 1], y: termsY }}>
      <Coordinates.Cartesian />
      {#each terms as value, i}
        {@const n = i + 1}
        {@const v = clampVal(value, termsY)}
        <Line.Segment point1={[n, 0]} point2={[n, v]} color="var(--ink-sea)" weight={2} />
        <Point x={n} y={v} color="var(--ink-sea)" />
      {/each}
    </Mafs>
  </div>

  <!-- BOTTOM: partial sums S_n -->
  <div class="plot-label"><span class="dot red"></span>partial sums S_n</div>
  <div class="stage">
    <Mafs width={560} height={210} viewBox={{ x: [0, N + 1], y: partialsY }}>
      <Coordinates.Cartesian />
      {#if converges && Number.isFinite(limit)}
        <!-- infinite-sum limit line -->
        <Line.Segment
          point1={[0, limit]}
          point2={[N + 1, limit]}
          color="var(--ink-teal)"
          weight={2}
          svg={{ 'stroke-dasharray': '6 5' }}
        />
        <Text
          x={N - 2.4}
          y={limit}
          latex={`\\frac{a_1}{1-r}=${fmt(limit)}`}
          size={12}
          color="var(--ink-teal)"
        />
      {/if}
      {#each partials as value, i}
        {@const n = i + 1}
        {@const v = clampVal(value, partialsY)}
        <Line.Segment point1={[n, 0]} point2={[n, v]} color="var(--ink-red)" weight={2} />
        <Point x={n} y={v} color="var(--ink-red)" />
      {/each}
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="line">
      <span class="key">term rule</span>
      <span class="val mono-sub">{formula}</span>
    </div>
    <div class="line">
      <span class="key">sum rule</span>
      <span class="val mono-sub">{sumFormula}</span>
    </div>
    <div class="line">
      <span class="key">S_{N}</span>
      <span class="val">{fmt(lastSum)}</span>
    </div>
    <div class="line" class:verified={verdict.kind === 'converge'} class:warn={verdict.kind === 'diverge'}>
      <span class="key">verdict</span>
      <span class="val">{verdict.text}</span>
    </div>
    <p class="hint">drag the coral handle across the number line</p>
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
  }

  .seg {
    display: inline-flex;
    gap: 0.3rem;
  }

  .toggle {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg);
    background: var(--demo-stage);
    border: 1px solid var(--demo-card-border);
    border-radius: 999px;
    padding: 0.4rem 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .toggle.on,
  .toggle[aria-pressed='true'] {
    background: color-mix(in srgb, var(--ink-sun) 22%, transparent);
    border-color: var(--ink-sun);
  }

  .param-tag {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--site-fg-muted);
    font-variant-numeric: tabular-nums;
  }

  .plot-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    margin-bottom: -0.25rem;
  }

  .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 999px;
    display: inline-block;
  }
  .dot.sea {
    background: var(--ink-sea);
  }
  .dot.red {
    background: var(--ink-red);
  }

  .stage {
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .stage.strip {
    margin-bottom: 0.1rem;
  }

  .stage :global(svg) {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
  }

  .readout {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
    padding-top: 0.35rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }

  .line {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }

  .key {
    flex: 0 0 5.5rem;
    color: var(--site-fg-muted);
  }

  .val {
    flex: 1;
  }

  .mono-sub {
    font-size: 0.78rem;
  }

  .line.verified .val {
    color: var(--cta-hover);
    font-weight: 600;
  }

  .line.warn .val {
    color: var(--ink-red);
    font-weight: 600;
  }

  .hint {
    margin: 0.1rem 0 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .readout {
      font-size: 0.74rem;
    }

    .toggle,
    .param-tag {
      font-size: 0.72rem;
    }

    .line {
      flex-direction: column;
      gap: 0.05rem;
    }

    .key {
      flex: none;
    }
  }
</style>
