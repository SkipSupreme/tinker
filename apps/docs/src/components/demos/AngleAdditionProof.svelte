<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Point, Plot, Text, Circle } from 'svelte-mafs';

  const TAU = Math.PI * 2;

  // --- draggable handles, each constrained to the unit circle ---
  let ax = $state(Math.cos(0.6));
  let ay = $state(Math.sin(0.6));
  let bx = $state(Math.cos(1.9));
  let by = $state(Math.sin(1.9));

  // normalize any [x, y] back onto the unit circle
  function constrain([x, y]: [number, number]): [number, number] {
    const m = Math.hypot(x, y) || 1;
    return [x / m, y / m];
  }

  function norm(t: number): number {
    let v = t % TAU;
    if (v < 0) v += TAU;
    return v;
  }

  const alpha = $derived(norm(Math.atan2(ay, ax)));
  const beta = $derived(norm(Math.atan2(by, bx)));
  const sum = $derived(alpha + beta);

  const cosA = $derived(Math.cos(alpha));
  const sinA = $derived(Math.sin(alpha));
  const cosB = $derived(Math.cos(beta));
  const sinB = $derived(Math.sin(beta));

  // the formula predictions
  const cosPredict = $derived(cosA * cosB - sinA * sinB);
  const sinPredict = $derived(sinA * cosB + cosA * sinB);

  // the actual point at angle alpha+beta
  const abx = $derived(Math.cos(sum));
  const aby = $derived(Math.sin(sum));

  const cosMatch = $derived(Math.abs(cosPredict - abx) < 1e-6);
  const sinMatch = $derived(Math.abs(sinPredict - aby) < 1e-6);

  function fmt(n: number): string {
    return (n >= 0 ? ' ' : '') + n.toFixed(4);
  }
</script>

<div class="widget">
  <p class="caption">
    Drag P&alpha; and P&beta;. The four coordinates you read off the circle,
    plugged into the formula, always reproduce the third point. The angle
    addition formula is not magic &mdash; it is this arithmetic.
  </p>

  <div class="stage">
    <Mafs width={460} height={460} viewBox={{ x: [-1.7, 1.7], y: [-1.7, 1.7] }}>
      <Coordinates.Cartesian subdivisions={2} />

      <!-- unit circle -->
      <Circle
        center={[0, 0]}
        radius={1}
        color="var(--ink-sea)"
        weight={1.5}
        strokeOpacity={0.4}
        fillOpacity={0}
      />

      <!-- alpha arc: 0 -> alpha -->
      {#if alpha > 0.0008}
        <Plot.Parametric
          xy={(t) => [Math.cos(t), Math.sin(t)]}
          t={[0, alpha]}
          color="var(--ink-coral)"
          weight={4}
          opacity={0.95}
        />
      {/if}

      <!-- beta arc: alpha -> alpha+beta (stacked on top of alpha) -->
      {#if beta > 0.0008}
        <Plot.Parametric
          xy={(t) => [Math.cos(t), Math.sin(t)]}
          t={[alpha, sum]}
          color="var(--ink-teal)"
          weight={4}
          opacity={0.95}
        />
      {/if}

      <!-- the predicted third point at angle alpha+beta -->
      <Point x={abx} y={aby} color="var(--ink-red)" />
      <Text
        x={abx + (abx >= 0 ? 0.28 : -0.28)}
        y={aby + (aby >= 0 ? 0.22 : -0.22)}
        latex={'P_{\\alpha+\\beta}'}
        size={15}
        color="var(--ink-red)"
      />

      <!-- alpha handle -->
      <Text
        x={ax + (ax >= 0 ? 0.26 : -0.26)}
        y={ay + (ay >= 0 ? 0.2 : -0.2)}
        latex="P_\alpha"
        size={15}
        color="var(--ink-coral)"
      />
      <MovablePoint
        bind:x={ax}
        bind:y={ay}
        color="var(--ink-coral)"
        {constrain}
        label="angle alpha on the unit circle"
      />

      <!-- beta handle -->
      <Text
        x={bx + (bx >= 0 ? 0.26 : -0.26)}
        y={by + (by >= 0 ? 0.2 : -0.2)}
        latex="P_\beta"
        size={15}
        color="var(--ink-teal)"
      />
      <MovablePoint
        bind:x={bx}
        bind:y={by}
        color="var(--ink-teal)"
        {constrain}
        label="angle beta on the unit circle"
      />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="line muted">
      <span class="key">read off</span>
      <span class="val">
        cos&alpha;={fmt(cosA)}&nbsp;&nbsp;sin&alpha;={fmt(sinA)}&nbsp;&nbsp;cos&beta;={fmt(cosB)}&nbsp;&nbsp;sin&beta;={fmt(sinB)}
      </span>
    </div>
    <div class="line" class:verified={cosMatch}>
      <span class="key">cos(&alpha;+&beta;)</span>
      <span class="val">
        cos&alpha;&middot;cos&beta; &minus; sin&alpha;&middot;sin&beta; ={fmt(cosPredict)}
        &nbsp;vs&nbsp; x of P<sub>&alpha;+&beta;</sub> ={fmt(abx)}
        {#if cosMatch}&nbsp;&#10003;{/if}
      </span>
    </div>
    <div class="line" class:verified={sinMatch}>
      <span class="key">sin(&alpha;+&beta;)</span>
      <span class="val">
        sin&alpha;&middot;cos&beta; + cos&alpha;&middot;sin&beta; ={fmt(sinPredict)}
        &nbsp;vs&nbsp; y of P<sub>&alpha;+&beta;</sub> ={fmt(aby)}
        {#if sinMatch}&nbsp;&#10003;{/if}
      </span>
    </div>
    <div class="line muted">
      <span class="key">angles</span>
      <span class="val">
        &alpha;={alpha.toFixed(3)} rad&nbsp;&nbsp;&beta;={beta.toFixed(3)} rad&nbsp;&nbsp;&alpha;+&beta;={sum.toFixed(3)} rad
      </span>
    </div>
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
    gap: 0.8rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sun) 50%, transparent);
  }

  .caption {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.86rem;
    line-height: 1.5;
    color: var(--site-fg-muted);
  }

  .stage {
    background: var(--demo-stage);
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
    max-width: 100%;
  }

  .readout {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--site-fg);
    display: flex;
    flex-direction: column;
    gap: 0.34rem;
  }

  .line {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }

  .key {
    flex: 0 0 6.5rem;
    color: var(--site-fg-muted);
  }

  .val {
    flex: 1;
  }

  .line.verified .val {
    color: var(--cta-hover);
  }

  .line.muted .val {
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .readout {
      font-size: 0.72rem;
    }

    .caption {
      font-size: 0.8rem;
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
