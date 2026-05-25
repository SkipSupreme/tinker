<script lang="ts">
  /**
   * DerivativeTracer — M5.2. Drag the sun handle along the x-axis; the
   * teal f'(x) curve draws itself in the region you have swept. For |x|
   * and ∛x, the trace either jumps or blows up at 0, making non-
   * differentiability visible rather than asserted.
   */
  import { Mafs, Coordinates, Plot, MovablePoint, Line, Point } from 'svelte-mafs';

  type FnKey = 'square' | 'sin' | 'exp' | 'abs' | 'cbrt';

  type FnSpec = {
    label: string;
    f: (x: number) => number;
    fp: (x: number) => number;
    domain: [number, number];
    range: [number, number];
    note?: string;
  };

  const fns: Record<FnKey, FnSpec> = {
    square: {
      label: 'x²',
      f: (x) => x * x,
      fp: (x) => 2 * x,
      domain: [-2.4, 2.4],
      range: [-2.5, 4.5],
    },
    sin: {
      label: 'sin x',
      f: Math.sin,
      fp: Math.cos,
      domain: [-2 * Math.PI, 2 * Math.PI],
      range: [-1.6, 1.6],
    },
    exp: {
      label: 'eˣ',
      f: Math.exp,
      fp: Math.exp,
      domain: [-2.5, 2.0],
      range: [-1, 7],
    },
    abs: {
      label: '|x|',
      f: (x) => Math.abs(x),
      fp: (x) => (x > 0 ? 1 : x < 0 ? -1 : NaN),
      domain: [-2.4, 2.4],
      range: [-1.6, 2.6],
      note: 'no slope at x = 0 — the secant from the left says −1, from the right says +1',
    },
    cbrt: {
      label: '∛x',
      f: (x) => Math.cbrt(x),
      fp: (x) => (Math.abs(x) < 1e-6 ? NaN : (1 / 3) * Math.pow(Math.abs(x), -2 / 3)),
      domain: [-2.4, 2.4],
      range: [-1.8, 1.8],
      note: 'vertical tangent at x = 0 — slope diverges, no finite f′(0)',
    },
  };

  let key = $state<FnKey>('square');
  const spec = $derived(fns[key]);

  let xa = $state(1);
  let ya = $state(0);

  let minSeen = $state(1);
  let maxSeen = $state(1);

  $effect(() => {
    if (xa < minSeen) minSeen = xa;
    if (xa > maxSeen) maxSeen = xa;
  });

  function constrainToAxis([x]: [number, number]): [number, number] {
    const [lo, hi] = spec.domain;
    return [Math.min(hi - 0.05, Math.max(lo + 0.05, x)), 0];
  }

  function pick(k: FnKey) {
    key = k;
    const mid = (fns[k].domain[0] + fns[k].domain[1]) / 2;
    xa = mid;
    minSeen = mid;
    maxSeen = mid;
  }

  function clearTrace() {
    minSeen = xa;
    maxSeen = xa;
  }

  const fAtX = $derived(spec.f(xa));
  const fpAtX = $derived(spec.fp(xa));

  const TANG_HALF = $derived((spec.domain[1] - spec.domain[0]) * 0.12);
  const tA = $derived<[number, number]>([xa - TANG_HALF, fAtX - fpAtX * TANG_HALF]);
  const tB = $derived<[number, number]>([xa + TANG_HALF, fAtX + fpAtX * TANG_HALF]);

  const fpFaint = (x: number) => spec.fp(x);
  const fpBright = (x: number) =>
    x >= minSeen && x <= maxSeen ? spec.fp(x) : NaN;

  const slopeFmt = $derived(
    Number.isNaN(fpAtX) || !Number.isFinite(fpAtX) ? 'undefined' : fpAtX.toFixed(2),
  );
  const fFmt = $derived(Number.isFinite(fAtX) ? fAtX.toFixed(2) : '—');
</script>

<div class="widget">
  <div class="picker" role="tablist" aria-label="function">
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
      <Plot.OfX y={fpFaint} color="var(--ink-sea)" weight={1.2} opacity={0.22} />
      <Plot.OfX y={fpBright} color="var(--ink-sea)" weight={2.5} />

      {#if Number.isFinite(fpAtX)}
        <Line.Segment
          point1={tA}
          point2={tB}
          color="var(--ink-coral)"
          weight={2}
          opacity={0.88}
        />
      {/if}

      <Point x={xa} y={fAtX} color="var(--ink-red)" />
      {#if Number.isFinite(fpAtX)}
        <Point x={xa} y={fpAtX} color="var(--ink-sea)" />
      {/if}

      <MovablePoint
        bind:x={xa}
        bind:y={ya}
        constrain={constrainToAxis}
        color="var(--ink-sun)"
      />
    </Mafs>
  </div>

  <div class="readouts">
    <div class="r">
      <span class="k">x</span>
      <span class="v">{xa.toFixed(2)}</span>
    </div>
    <div class="r">
      <span class="k">f(x)</span>
      <span class="v red">{fFmt}</span>
    </div>
    <div class="r">
      <span class="k">f'(x)</span>
      <span class="v sea" class:undef={!Number.isFinite(fpAtX)}>{slopeFmt}</span>
    </div>
    <button type="button" class="clear" onclick={clearTrace}>
      clear trace
    </button>
  </div>

  {#if spec.note}
    <p class="note">{spec.note}</p>
  {/if}

  <p class="hint">
    drag the sun handle along the x-axis. red = f. coral = tangent line at x.
    teal = f′(x), drawn in wherever you have swept.
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
    transition:
      background 140ms ease,
      border-color 140ms ease;
  }

  .pill:hover {
    border-color: color-mix(in srgb, var(--ink-red) 55%, transparent);
  }

  .pill.active {
    background: color-mix(in srgb, var(--ink-red) 14%, transparent);
    border-color: var(--ink-red);
    color: var(--site-fg);
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
    flex-wrap: wrap;
    align-items: center;
    gap: 0.8rem;
    padding-top: 0.5rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
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

  .v.sea {
    color: var(--ink-sea);
  }

  .v.undef {
    color: var(--ink-coral);
    font-style: italic;
  }

  .clear {
    margin-left: auto;
    font-family: var(--font-body);
    font-size: 0.78rem;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg-muted);
    cursor: pointer;
  }

  .clear:hover {
    color: var(--site-fg);
  }

  .note {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.86rem;
    line-height: 1.5;
    color: var(--ink-coral);
    background: color-mix(in srgb, var(--ink-coral) 8%, transparent);
    padding: 0.55rem 0.8rem;
    border-radius: 10px;
    border-left: 3px solid var(--ink-coral);
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.5;
  }

  @media (max-width: 520px) {
    .v {
      font-size: 0.9rem;
    }
  }
</style>
