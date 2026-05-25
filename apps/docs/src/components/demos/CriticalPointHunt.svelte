<script lang="ts">
  /**
   * CriticalPointHunt — M5.6. Drag a marker along f(x) hunting for points
   * where f'(x) = 0. When you land, the second derivative classifies it:
   * f'' > 0 → local min, f'' < 0 → local max, f'' = 0 → inconclusive.
   * Three functions covering all three cases (and one with a saddle).
   */
  import { Mafs, Coordinates, Plot, MovablePoint, Point, Line } from 'svelte-mafs';

  type FnKey = 'cubic' | 'quartic' | 'saddle';

  type FnSpec = {
    label: string;
    name: string;
    f: (x: number) => number;
    fp: (x: number) => number;
    fpp: (x: number) => number;
    domain: [number, number];
    range: [number, number];
    /** Locations of all interior critical points, used to gate the StepCheck. */
    crits: number[];
  };

  const fns: Record<FnKey, FnSpec> = {
    cubic: {
      label: 'x³ − 3x',
      name: 'x cubed minus 3x',
      f: (x) => x ** 3 - 3 * x,
      fp: (x) => 3 * x * x - 3,
      fpp: (x) => 6 * x,
      domain: [-2.4, 2.4],
      range: [-3.5, 3.5],
      crits: [-1, 1],
    },
    quartic: {
      label: 'x⁴ − 4x²',
      name: 'x to the fourth minus 4x squared',
      f: (x) => x ** 4 - 4 * x * x,
      fp: (x) => 4 * x ** 3 - 8 * x,
      fpp: (x) => 12 * x * x - 8,
      domain: [-2.4, 2.4],
      range: [-4.6, 3.4],
      crits: [-Math.sqrt(2), 0, Math.sqrt(2)],
    },
    saddle: {
      label: 'x³',
      name: 'x cubed',
      f: (x) => x ** 3,
      fp: (x) => 3 * x * x,
      fpp: (x) => 6 * x,
      domain: [-1.7, 1.7],
      range: [-3, 3],
      crits: [0],
    },
  };

  let key = $state<FnKey>('cubic');
  const spec = $derived(fns[key]);

  let xa = $state(0.3);
  let ya = $state(0);

  // landed[] = set of critical point x-coords the user has found this session
  let landed = $state<Set<number>>(new Set());

  $effect(() => {
    if (Math.abs(spec.fp(xa)) < 0.05) {
      // snap landed to the nearest known critical point so duplicates collapse
      const nearest = spec.crits.reduce(
        (best, c) => (Math.abs(c - xa) < Math.abs(best - xa) ? c : best),
        spec.crits[0],
      );
      if (Math.abs(nearest - xa) < 0.18 && !landed.has(nearest)) {
        landed = new Set([...landed, nearest]);
      }
    }
  });

  function constrainToCurve([x]: [number, number]): [number, number] {
    const [lo, hi] = spec.domain;
    const cx = Math.min(hi - 0.05, Math.max(lo + 0.05, x));
    return [cx, spec.f(cx)];
  }

  function pick(k: FnKey) {
    key = k;
    landed = new Set();
    xa = (fns[k].domain[0] + fns[k].domain[1]) / 4;
  }

  function classify(x: number, fp: number, fpp: number): {
    label: string;
    tone: 'min' | 'max' | 'incon' | 'no';
  } {
    if (Math.abs(fp) > 0.05) return { label: 'not a critical point', tone: 'no' };
    if (Math.abs(fpp) < 0.05) return { label: 'inconclusive (f″ = 0)', tone: 'incon' };
    return fpp > 0
      ? { label: 'local minimum', tone: 'min' }
      : { label: 'local maximum', tone: 'max' };
  }

  const fAtX = $derived(spec.f(xa));
  const fpAtX = $derived(spec.fp(xa));
  const fppAtX = $derived(spec.fpp(xa));
  const verdict = $derived(classify(xa, fpAtX, fppAtX));
  const onZero = $derived(Math.abs(fpAtX) < 0.05);

  // tangent at marker for visual feedback
  const TANG = $derived((spec.domain[1] - spec.domain[0]) * 0.18);
  const tA = $derived<[number, number]>([xa - TANG, fAtX - fpAtX * TANG]);
  const tB = $derived<[number, number]>([xa + TANG, fAtX + fpAtX * TANG]);

  const fmt = (n: number) => (Math.abs(n) < 0.005 ? '0.00' : n.toFixed(2));
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
        onclick={() => pick(k as FnKey)}
      >
        {s.label}
      </button>
    {/each}
  </div>

  <div class="stage">
    <Mafs
      width={520}
      height={340}
      viewBox={{ x: spec.domain, y: spec.range }}
      pan={false}
      zoom={false}
    >
      <Coordinates.Cartesian />
      <Plot.OfX y={spec.f} color="var(--ink-red)" weight={2.5} />
      <Plot.OfX y={spec.fp} color="var(--ink-sea)" weight={1.5} opacity={0.45} />

      <Line.Segment
        point1={tA}
        point2={tB}
        color={onZero ? 'var(--cta)' : 'var(--ink-coral)'}
        weight={2.2}
        opacity={0.9}
      />

      <!-- mark all critical points the user has landed -->
      {#each [...landed] as cx (cx)}
        <Point
          x={cx}
          y={spec.f(cx)}
          color="var(--cta)"
          opacity={0.85}
        />
      {/each}

      <MovablePoint
        bind:x={xa}
        bind:y={ya}
        constrain={constrainToCurve}
        color={onZero ? 'var(--cta)' : 'var(--ink-sun)'}
      />
    </Mafs>
  </div>

  <div class="readouts">
    <div class="row top">
      <div class="r">
        <span class="k">x</span>
        <span class="v">{fmt(xa)}</span>
      </div>
      <div class="r">
        <span class="k">f(x)</span>
        <span class="v red">{fmt(fAtX)}</span>
      </div>
      <div class="r">
        <span class="k">f'(x)</span>
        <span class="v" class:near={onZero}>{fmt(fpAtX)}</span>
      </div>
      <div class="r">
        <span class="k">f″(x)</span>
        <span class="v">{fmt(fppAtX)}</span>
      </div>
    </div>

    <div class="verdict tone-{verdict.tone}" aria-live="polite">
      {verdict.label}
    </div>
  </div>

  <div class="progress">
    <span class="pkey">critical points found:</span>
    <span class="pval">{landed.size} / {spec.crits.length}</span>
    {#if landed.size === spec.crits.length}
      <span class="done">all found</span>
    {/if}
  </div>

  <p class="hint">
    Drag the marker. Red = f(x), faint teal = f′(x). The marker glows green and
    the verdict snaps when f′ ≈ 0. Then read f″ to classify.
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
    transition: background 140ms, border-color 140ms;
  }

  .pill:hover {
    border-color: color-mix(in srgb, var(--ink-red) 55%, transparent);
  }

  .pill.active {
    background: color-mix(in srgb, var(--ink-red) 14%, transparent);
    border-color: var(--ink-red);
  }

  .stage {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .stage :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  .readouts {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }

  .row.top {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .r {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    font-family: var(--font-mono);
  }

  .k {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--site-fg-muted);
  }

  .v {
    font-size: 1rem;
    font-weight: 600;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
  }

  .v.red {
    color: var(--ink-red);
  }

  .v.near {
    color: var(--cta);
  }

  .verdict {
    font-family: var(--font-body);
    font-size: 0.92rem;
    padding: 0.55rem 0.8rem;
    border-radius: 10px;
    text-align: center;
    transition: background 180ms;
  }

  .verdict.tone-no {
    background: color-mix(in srgb, var(--site-fg) 6%, transparent);
    color: var(--site-fg-muted);
  }

  .verdict.tone-min {
    background: color-mix(in srgb, var(--cta) 18%, transparent);
    color: var(--site-fg);
    border-left: 3px solid var(--cta);
  }

  .verdict.tone-max {
    background: color-mix(in srgb, var(--ink-coral) 18%, transparent);
    color: var(--site-fg);
    border-left: 3px solid var(--ink-coral);
  }

  .verdict.tone-incon {
    background: color-mix(in srgb, var(--ink-sun) 18%, transparent);
    color: var(--site-fg);
    border-left: 3px solid var(--ink-sun);
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }

  .pval {
    color: var(--site-fg);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .done {
    color: var(--cta);
    font-weight: 600;
    margin-left: auto;
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.5;
  }
</style>
