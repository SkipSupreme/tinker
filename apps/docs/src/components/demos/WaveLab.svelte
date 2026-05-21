<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Plot, Text, Line } from 'svelte-mafs';

  const TAU = Math.PI * 2;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  // --- core parameters: y = A * sin(k*x + phi) ---
  let A = $state(2);
  let k = $state(1);
  let phi = $state(0);

  let showCos = $state(false);

  // The wave itself.
  const wave = (x: number) => A * Math.sin(k * x + phi);
  const cosWave = (x: number) => A * Math.cos(k * x + phi);

  // --- handle positions, recomputed every render from (A, k, phi) ---

  // AMPLITUDE handle: first positive peak, where k*x + phi = pi/2.
  // x is locked to that peak; y rides at +A.
  const ampX = $derived.by(() => {
    const safeK = k || 1e-6;
    let x = (Math.PI / 2 - phi) / safeK;
    // pull the peak into the visible window [0, 12] by shifting whole periods
    const period = TAU / safeK;
    while (x < 0.4) x += period;
    while (x > 12) x -= period;
    return x;
  });
  const ampHandleX = $derived(ampX);
  const ampHandleY = $derived(A);

  // PERIOD handle: the next positive peak one full period to the right.
  // y is locked to A; x is free.
  const periodHandleX = $derived(ampX + TAU / (k || 1e-6));
  const periodHandleY = $derived(A);

  // PHASE handle: a rising zero crossing, where k*x + phi = 0 (y = 0 going up).
  // y is locked to 0; x is free.
  const phaseX = $derived.by(() => {
    const safeK = k || 1e-6;
    let x = -phi / safeK;
    const period = TAU / safeK;
    while (x < 0) x += period;
    while (x > 12) x -= period;
    return x;
  });
  const phaseHandleX = $derived(phaseX);
  const phaseHandleY = $derived(0);

  // --- drag callbacks: each writes back only its own parameter ---

  function setAmplitude([, y]: [number, number]): [number, number] {
    A = clamp(Math.abs(y), 0.3, 3.4);
    // x locked to the peak
    return [ampX, A];
  }

  function setPeriod([x]: [number, number]): [number, number] {
    let period = x - ampX;
    period = clamp(period, 1.2, 11);
    k = TAU / period;
    // y locked to the peak height
    return [ampX + period, A];
  }

  function setPhase([x]: [number, number]): [number, number] {
    // crossing at x => k*x + phi = 0 => phi = -k * x
    let nextPhi = -k * x;
    // keep phi in a sensible range (-pi, pi]
    nextPhi = ((nextPhi + Math.PI) % TAU + TAU) % TAU - Math.PI;
    phi = nextPhi;
    // y locked to 0
    return [x, 0];
  }

  // --- derived readout values ---
  const period = $derived(TAU / (k || 1e-6));
  const frequency = $derived((k || 1e-6) / TAU);
  const phaseShift = $derived(-phi / (k || 1e-6));

  const equation = $derived(
    `y = ${A.toFixed(2)}\\,\\sin(${k.toFixed(2)}x ${phi >= 0 ? '+' : '-'} ${Math.abs(phi).toFixed(2)})`
  );

  // y for the period bracket, sitting just above the wave
  const bracketY = $derived(clamp(A + 0.7, 1.1, 3.3));
</script>

<div class="widget">
  <div class="controls">
    <button
      type="button"
      class="toggle"
      class:on={showCos}
      aria-pressed={showCos}
      onclick={() => (showCos = !showCos)}
    >
      {showCos ? 'hiding cos θ' : 'show cos θ'}
    </button>
    <span class="hint">drag the three coral handles on the wave</span>
  </div>

  <div class="stage">
    <Mafs width={620} height={380} viewBox={{ x: [-1, 13], y: [-3.6, 3.6] }}>
      <Coordinates.Cartesian />

      <!-- the sine wave -->
      <Plot.OfX
        y={wave}
        domain={[-1, 13]}
        color="var(--ink-red)"
        weight={2.5}
        style="solid"
      />

      <!-- optional cosine overlay: sine shifted by pi/2 -->
      {#if showCos}
        <Plot.OfX
          y={cosWave}
          domain={[-1, 13]}
          color="var(--ink-sea)"
          weight={2}
          opacity={0.9}
          style="dashed"
        />
      {/if}

      <!-- period bracket between two consecutive peaks -->
      <Line.Segment
        point1={[ampX, bracketY]}
        point2={[periodHandleX, bracketY]}
        color="var(--ink-teal)"
        weight={2}
      />
      <Line.Segment
        point1={[ampX, bracketY - 0.18]}
        point2={[ampX, bracketY + 0.18]}
        color="var(--ink-teal)"
        weight={2}
      />
      <Line.Segment
        point1={[periodHandleX, bracketY - 0.18]}
        point2={[periodHandleX, bracketY + 0.18]}
        color="var(--ink-teal)"
        weight={2}
      />
      <Text
        x={(ampX + periodHandleX) / 2}
        y={bracketY + 0.4}
        latex={`2\\pi/k = ${period.toFixed(2)}`}
        size={13}
        color="var(--ink-teal)"
      />

      <!-- AMPLITUDE handle: drag vertically, sets A -->
      <MovablePoint
        x={ampHandleX}
        y={ampHandleY}
        color="var(--ink-coral)"
        constrain={setAmplitude}
        label="drag up/down to set amplitude A"
      />

      <!-- PERIOD handle: drag horizontally, sets k via period -->
      <MovablePoint
        x={periodHandleX}
        y={periodHandleY}
        color="var(--ink-coral)"
        constrain={setPeriod}
        label="drag left/right to set the period"
      />

      <!-- PHASE handle: drag horizontally along y=0, sets phase -->
      <MovablePoint
        x={phaseHandleX}
        y={phaseHandleY}
        color="var(--ink-coral)"
        constrain={setPhase}
        label="drag along the x-axis to set the phase shift"
      />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="line">
      <span class="key">equation</span>
      <span class="val">
        y = {A.toFixed(2)} sin({k.toFixed(2)}x {phi >= 0 ? '+' : '-'} {Math.abs(phi).toFixed(2)})
      </span>
    </div>
    <div class="line">
      <span class="key">amplitude A</span>
      <span class="val">{A.toFixed(2)} &mdash; peak height of the wave</span>
    </div>
    <div class="line">
      <span class="key">k</span>
      <span class="val">{k.toFixed(3)} &mdash; angular frequency</span>
    </div>
    <div class="line">
      <span class="key">period</span>
      <span class="val">2&pi;/k = {period.toFixed(3)} &mdash; longer period, slower wave</span>
    </div>
    <div class="line">
      <span class="key">frequency</span>
      <span class="val">k/2&pi; = {frequency.toFixed(3)} &mdash; moves opposite the period</span>
    </div>
    <div class="line muted">
      <span class="key">phase shift</span>
      <span class="val">&minus;&phi;/k = {phaseShift.toFixed(3)}</span>
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
      0 24px 48px -28px color-mix(in srgb, var(--ink-coral) 50%, transparent);
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
    background: color-mix(in srgb, var(--ink-sea) 22%, transparent);
    border-color: var(--ink-sea);
  }

  .hint {
    font-family: var(--font-body);
    font-size: 0.78rem;
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
    flex: 0 0 7rem;
    color: var(--site-fg-muted);
  }

  .val {
    flex: 1;
  }

  .line.muted .val {
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .readout {
      font-size: 0.74rem;
    }

    .toggle,
    .hint {
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
