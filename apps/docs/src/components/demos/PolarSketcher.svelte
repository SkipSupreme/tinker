<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Plot, Text, Circle, Vector, Point } from 'svelte-mafs';

  const TAU = Math.PI * 2;
  const RING = 2.3;

  type Preset = {
    id: string;
    label: string;
    r: (t: number) => number;
  };

  const PRESETS: Preset[] = [
    { id: 'circle', label: 'circle', r: () => 1 },
    { id: 'cardioid', label: 'cardioid', r: (t) => 1 + Math.cos(t) },
    { id: 'rose', label: 'rose', r: (t) => Math.cos(3 * t) },
    { id: 'spiral', label: 'spiral', r: (t) => t / 3 },
    { id: 'limacon', label: 'limaçon', r: (t) => 1 + 2 * Math.cos(t) },
  ];

  // --- state ---
  let presetId = $state('cardioid');

  // theta dial handle, constrained to the guide ring
  let hx = $state(RING);
  let hy = $state(0);

  const preset = $derived(PRESETS.find((p) => p.id === presetId) ?? PRESETS[1]);
  const r = $derived(preset.r);

  // theta normalized to [0, 2pi)
  const theta = $derived.by(() => {
    let t = Math.atan2(hy, hx);
    if (t < 0) t += TAU;
    return t;
  });

  // constrain the handle to the guide ring
  function constrain([x, y]: [number, number]): [number, number] {
    const m = Math.hypot(x, y) || 1;
    return [(x / m) * RING, (y / m) * RING];
  }

  const rVal = $derived(r(theta));
  const xVal = $derived(rVal * Math.cos(theta));
  const yVal = $derived(rVal * Math.sin(theta));
</script>

<div class="widget">
  <div class="controls">
    {#each PRESETS as p}
      <button
        type="button"
        class="toggle"
        class:on={p.id === presetId}
        aria-pressed={p.id === presetId}
        onclick={() => (presetId = p.id)}
      >
        {p.label}
      </button>
    {/each}
  </div>

  <div class="stages">
    <div class="stage">
      <Mafs width={360} height={360} viewBox={{ x: [-2.6, 2.6], y: [-2.6, 2.6] }}>
        <Coordinates.Cartesian subdivisions={2} />

        <!-- guide ring: the theta dial -->
        <Circle
          center={[0, 0]}
          radius={RING}
          color="var(--ink-sea)"
          weight={1.5}
          strokeOpacity={0.35}
          fillOpacity={0}
        />

        <!-- traced polar curve so far -->
        {#if theta > 0.0005}
          <Plot.Parametric
            xy={(t) => [r(t) * Math.cos(t), r(t) * Math.sin(t)]}
            t={[0, theta]}
            color="var(--ink-red)"
            weight={2.5}
          />
        {/if}

        <!-- radius vector from origin to current point -->
        <Vector tail={[0, 0]} tip={[xVal, yVal]} color="var(--ink-sea)" weight={2} />

        <!-- current point -->
        <Point x={xVal} y={yVal} color="var(--ink-sun)" />

        <!-- draggable theta dial handle -->
        <MovablePoint
          bind:x={hx}
          bind:y={hy}
          color="var(--ink-coral)"
          {constrain}
          label="drag to scrub the angle theta"
        />
      </Mafs>
    </div>

    <div class="stage">
      <Mafs width={360} height={360} viewBox={{ x: [-0.5, 6.8], y: [-2.5, 2.8] }}>
        <Coordinates.Cartesian subdivisions={2} />

        <!-- r(theta) over [0, current theta] -->
        {#if theta > 0.0005}
          <Plot.Parametric
            xy={(t) => [t, r(t)]}
            t={[0, theta]}
            color="var(--ink-sea)"
            weight={2.5}
          />
        {/if}

        <!-- moving dot at [theta, r(theta)] -->
        <Point x={theta} y={rVal} color="var(--ink-sun)" />

        <Text x={6.0} y={-2.1} latex="\theta" size={13} color="var(--ink-sea)" />
        <Text x={0.32} y={2.5} latex="r" size={13} color="var(--ink-sea)" />
      </Mafs>
    </div>
  </div>

  <div class="readout" aria-live="polite">
    <div class="line">
      <span class="key">curve</span>
      <span class="val">{preset.label}</span>
    </div>
    <div class="line">
      <span class="key">theta</span>
      <span class="val">{theta.toFixed(3)} rad</span>
    </div>
    <div class="line">
      <span class="key">r = r(theta)</span>
      <span class="val">{rVal.toFixed(3)}</span>
    </div>
    <div class="line">
      <span class="key">x = r cos theta</span>
      <span class="val">{xVal.toFixed(3)}</span>
    </div>
    <div class="line">
      <span class="key">y = r sin theta</span>
      <span class="val">{yVal.toFixed(3)}</span>
    </div>
    <div class="line muted">
      <span class="key">note</span>
      <span class="val">
        The same function is a loop on the left and a wave on the right. x = r cos
        theta, y = r sin theta is the bridge.
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
      0 24px 48px -28px color-mix(in srgb, var(--ink-teal) 50%, transparent);
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg);
    background: var(--demo-stage);
    border: 1px solid var(--demo-card-border);
    border-radius: 999px;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .toggle.on,
  .toggle[aria-pressed='true'] {
    background: color-mix(in srgb, var(--ink-sun) 22%, transparent);
    border-color: var(--ink-sun);
  }

  .stages {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }

  .stage {
    flex: 1 1 280px;
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
    font-size: 0.82rem;
    color: var(--site-fg);
    display: flex;
    flex-direction: column;
    gap: 0.32rem;
  }

  .line {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }

  .key {
    flex: 0 0 8.5rem;
    color: var(--site-fg-muted);
  }

  .val {
    flex: 1;
  }

  .line.muted .val {
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .stages {
      flex-direction: column;
    }

    .stage {
      flex: 1 1 auto;
    }

    .readout {
      font-size: 0.74rem;
    }

    .toggle {
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
