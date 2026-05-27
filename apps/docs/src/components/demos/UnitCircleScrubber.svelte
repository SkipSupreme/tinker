<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Plot, Text, Circle, Vector, Line, Point } from 'svelte-mafs';

  const TAU = Math.PI * 2;

  // Reference angles: union of multiples of pi/6 and pi/4, within [0, 2pi)
  const REFERENCE_ANGLES: number[] = (() => {
    const set = new Set<number>();
    for (let k = 0; k < 12; k++) set.add(((k * Math.PI) / 6) % TAU);
    for (let k = 0; k < 8; k++) set.add(((k * Math.PI) / 4) % TAU);
    return [...set].sort((a, b) => a - b);
  })();

  // --- state ---
  let px = $state(1);
  let py = $state(0);
  let snap = $state(false);
  let useDegrees = $state(false);
  let degreeInput = $state(0);

  // theta normalized to [0, 2pi)
  const theta = $derived.by(() => {
    let t = Math.atan2(py, px);
    if (t < 0) t += TAU;
    return t;
  });

  function snapTheta(t: number): number {
    let best = REFERENCE_ANGLES[0];
    let bestDist = Infinity;
    for (const a of REFERENCE_ANGLES) {
      const d = Math.min(Math.abs(t - a), TAU - Math.abs(t - a));
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return best;
  }

  // Constrain the dragged handle to the unit circle (and optionally snap)
  function constrain([x, y]: [number, number]): [number, number] {
    const m = Math.hypot(x, y) || 1;
    let nx = x / m;
    let ny = y / m;
    if (snap) {
      let t = Math.atan2(ny, nx);
      if (t < 0) t += TAU;
      const s = snapTheta(t);
      nx = Math.cos(s);
      ny = Math.sin(s);
    }
    return [nx, ny];
  }

  // Re-apply constraint when the snap toggle changes
  $effect(() => {
    const [nx, ny] = constrain([px, py]);
    if (nx !== px || ny !== py) {
      px = nx;
      py = ny;
    }
  });

  // Try to express theta as a clean fraction of pi
  const piFraction = $derived.by(() => {
    const frac = theta / Math.PI; // multiples of pi
    const denominators = [1, 2, 3, 4, 6];
    for (const d of denominators) {
      const n = frac * d;
      if (Math.abs(n - Math.round(n)) < 1e-9) {
        const num = Math.round(n);
        if (num === 0) return '0';
        const g = gcd(Math.abs(num), d);
        const sn = num / g;
        const sd = d / g;
        if (sd === 1) return sn === 1 ? '\\pi' : `${sn}\\pi`;
        const top = sn === 1 ? '\\pi' : `${sn}\\pi`;
        return `\\frac{${top.replace('\\pi', '')}\\pi}{${sd}}`.replace('{\\pi}', '{1\\pi}');
      }
    }
    return null;
  });

  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  const thetaDeg = $derived((theta * 180) / Math.PI);
  const cosVal = $derived(px);
  const sinVal = $derived(py);
  const pythagoras = $derived(sinVal * sinVal + cosVal * cosVal);

  const angleDisplay = $derived(
    useDegrees
      ? `${thetaDeg.toFixed(1)}\\degree`
      : `${theta.toFixed(3)}\\,\\text{rad}`
  );

  function applyDegreeInput() {
    let d = degreeInput;
    if (!Number.isFinite(d)) return;
    d = ((d % 360) + 360) % 360;
    const t = (d * Math.PI) / 180;
    let nx = Math.cos(t);
    let ny = Math.sin(t);
    if (snap) {
      const s = snapTheta(t);
      nx = Math.cos(s);
      ny = Math.sin(s);
    }
    px = nx;
    py = ny;
  }

  // Mirror the live angle into the degree input ONLY when the input isn't
  // focused. The earlier two-way mirror fought the user mid-keystroke: typing
  // "-9" briefly resolved thetaDeg to 351 and clobbered the field back to 351
  // before they could finish typing "-90".
  let degreeInputEl: HTMLInputElement | undefined = $state();
  $effect(() => {
    const rounded = Math.round(thetaDeg);
    if (!degreeInputEl || document.activeElement !== degreeInputEl) {
      degreeInput = rounded;
    }
  });
</script>

<div class="widget">
  <div class="controls">
    <button
      type="button"
      class="toggle"
      class:on={snap}
      aria-pressed={snap}
      onclick={() => (snap = !snap)}
    >
      {snap ? 'snapping to reference angles' : 'snap to reference angles'}
    </button>

    <button
      type="button"
      class="toggle"
      aria-pressed={useDegrees}
      onclick={() => (useDegrees = !useDegrees)}
    >
      {useDegrees ? 'showing degrees' : 'showing radians'}
    </button>

    <label class="num-field">
      <span>angle (deg)</span>
      <input
        type="number"
        min="0"
        max="360"
        step="1"
        bind:this={degreeInputEl}
        bind:value={degreeInput}
        onchange={applyDegreeInput}
        oninput={applyDegreeInput}
      />
    </label>
  </div>

  <div class="stage">
    <Mafs width={440} height={440} viewBox={{ x: [-1.7, 1.7], y: [-1.7, 1.7] }}>
      <Coordinates.Cartesian subdivisions={2} />

      <!-- unit circle outline -->
      <Circle
        center={[0, 0]}
        radius={1}
        color="var(--ink-sea)"
        weight={1.5}
        strokeOpacity={0.45}
        fillOpacity={0}
      />

      <!-- faint reference-angle dots -->
      {#each REFERENCE_ANGLES as a}
        <Point x={Math.cos(a)} y={Math.sin(a)} color="var(--ink-sea)" opacity={0.35} />
      {/each}

      <!-- swept arc from 0 to theta -->
      {#if theta > 0.0005}
        <Plot.Parametric
          xy={(t) => [Math.cos(t), Math.sin(t)]}
          t={[0, theta]}
          color="var(--ink-sun)"
          weight={5}
          opacity={0.95}
        />
      {/if}

      <!-- cos: horizontal segment along x-axis -->
      <Line.Segment
        point1={[0, 0]}
        point2={[cosVal, 0]}
        color="var(--ink-sea)"
        weight={4}
      />

      <!-- sin: vertical segment up to the point -->
      <Line.Segment
        point1={[cosVal, 0]}
        point2={[cosVal, sinVal]}
        color="var(--ink-red)"
        weight={4}
      />

      <!-- radius vector -->
      <Vector tail={[0, 0]} tip={[cosVal, sinVal]} color="var(--ink-red)" weight={2.5} />

      <!-- value labels: hide each when its leg collapses (would crowd the handle) -->
      {#if Math.abs(cosVal) > 0.18}
        <Text
          x={cosVal / 2}
          y={sinVal >= 0 ? -0.32 : 0.32}
          latex={`\\cos\\theta=${cosVal.toFixed(3)}`}
          size={12}
          color="var(--ink-sea)"
        />
      {/if}
      {#if Math.abs(sinVal) > 0.18}
        <Text
          x={cosVal + (cosVal >= 0 ? 0.34 : -0.34)}
          y={sinVal / 2}
          latex={`\\sin\\theta=${sinVal.toFixed(3)}`}
          size={12}
          color="var(--ink-red)"
        />
      {/if}

      <!-- draggable handle on the circle -->
      <MovablePoint bind:x={px} bind:y={py} color="var(--ink-coral)" {constrain} label="angle on the unit circle" />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="line">
      <span class="key">theta</span>
      <span class="val">
        {theta.toFixed(3)} rad{#if piFraction}
          &nbsp;= {piFraction === '0' ? '0' : piFraction.replace(/\\frac\{(.+?)\}\{(.+?)\}/, '$1/$2').replace(/\\pi/g, 'pi')}
        {/if}
        &nbsp;= {thetaDeg.toFixed(1)}&deg;
      </span>
    </div>
    <div class="line">
      <span class="key">(cos, sin)</span>
      <span class="val">({cosVal.toFixed(3)}, {sinVal.toFixed(3)})</span>
    </div>
    <div class="line">
      <span class="key">arc length</span>
      <span class="val">{theta.toFixed(3)} &mdash; arc length equals the radian measure</span>
    </div>
    <div class="line verified">
      <span class="key">identity</span>
      <span class="val">sin&sup2;&theta; + cos&sup2;&theta; = {pythagoras.toFixed(3)}</span>
    </div>
    <div class="line muted">
      <span class="key">showing</span>
      <span class="val">{useDegrees ? `${thetaDeg.toFixed(1)} degrees` : `${theta.toFixed(3)} radians`}</span>
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
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
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

  .num-field {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .num-field input {
    width: 4.2rem;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
    background: var(--demo-stage);
    border: 1px solid var(--demo-card-border);
    border-radius: 8px;
    padding: 0.3rem 0.45rem;
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
      font-size: 0.74rem;
    }

    .toggle,
    .num-field {
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
