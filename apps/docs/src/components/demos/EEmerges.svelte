<script lang="ts">
  import { Mafs, Coordinates, Plot, MovablePoint, Line, Point, Text } from 'svelte-mafs';

  const E = Math.E;

  // --- LEFT PANEL: the limit (1 + 1/n)^n ---
  // slider value is a continuous log exponent 0..6, n = 10^exp
  let logN = $state(0);

  const n = $derived(Math.pow(10, logN));
  const limitValue = $derived(Math.pow(1 + 1 / n, n));

  // formatted n: integer-ish for clean readout
  const nDisplay = $derived.by(() => {
    if (n >= 1000) return Math.round(n).toLocaleString('en-US');
    if (n >= 10) return Math.round(n).toString();
    return n.toFixed(2).replace(/\.00$/, '');
  });

  // converged when n is large enough that the limit is close to e
  const converged = $derived(Math.abs(limitValue - E) < 0.01);

  // --- RIGHT PANEL: the slope-1 base ---
  // learner drags b along a horizontal axis from 1 to 5
  let b = $state(2);
  let bY = $state(0);

  function constrainB([x]: [number, number]): [number, number] {
    const clamped = Math.min(5, Math.max(1, x));
    return [clamped, 0];
  }

  const expBase = (x: number) => Math.pow(b, x);
  const slope = $derived(Math.log(b)); // d/dx b^x at x=0 is ln(b)

  // tangent at x=0: passes through (0,1), slope = ln(b)
  const RX_MIN = -2.2;
  const RX_MAX = 2.2;
  const tangentA = $derived<[number, number]>([RX_MIN, 1 + slope * RX_MIN]);
  const tangentB = $derived<[number, number]>([RX_MAX, 1 + slope * RX_MAX]);

  const slopeLocked = $derived(Math.abs(slope - 1) < 0.01);

  // --- PAYOFF ---
  const aha = $derived(converged && slopeLocked);
</script>

<div class="widget">
  <div class="panels">
    <!-- LEFT: the limit -->
    <section class="panel">
      <header class="panel-head">
        <h3>the limit</h3>
        <p class="formula">(1 + 1/n)<sup>n</sup></p>
      </header>

      <label class="slider-field">
        <span class="slider-label">n = {nDisplay}</span>
        <input
          type="range"
          min="0"
          max="6"
          step="0.01"
          bind:value={logN}
          aria-label="n on a logarithmic scale from 1 to one million"
        />
        <span class="slider-ends" aria-hidden="true">
          <span>1</span>
          <span>1,000,000</span>
        </span>
      </label>

      <div class="stage">
        <Mafs
          width={520}
          height={140}
          viewBox={{ x: [2, 3], y: [-0.5, 0.5] }}
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian yAxis={false} grid={false} />
          <!-- e marker -->
          <Line.Segment
            point1={[E, -0.32]}
            point2={[E, 0.32]}
            color="var(--ink-teal)"
            weight={2}
            style="dashed"
          />
          <Text x={E} y={0.42} latex="e" size={13} color="var(--ink-teal)" />
          <!-- the climbing value -->
          <Point
            x={Math.min(2.999, Math.max(2.001, limitValue))}
            y={0}
            color={converged ? 'var(--ink-teal)' : 'var(--ink-coral)'}
          />
        </Mafs>
      </div>

      <div class="readout" aria-live="polite">
        <span class="key">value</span>
        <span class="val" class:hit={converged}>{limitValue.toFixed(5)}</span>
      </div>
    </section>

    <!-- RIGHT: the slope-1 base -->
    <section class="panel">
      <header class="panel-head">
        <h3>the slope-1 base</h3>
        <p class="formula">y = b<sup>x</sup></p>
      </header>

      <div class="stage">
        <Mafs
          width={520}
          height={300}
          viewBox={{ x: [RX_MIN, RX_MAX], y: [-0.6, 3.6] }}
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian />
          <Plot.OfX y={expBase} color="var(--ink-red)" weight={2.5} />
          <!-- tangent at x = 0 -->
          <Line.Segment
            point1={tangentA}
            point2={tangentB}
            color="var(--ink-coral)"
            weight={2}
            opacity={0.9}
          />
          <Point x={0} y={1} color="var(--ink-coral)" />
          <!-- b dragged along the x-axis -->
          <MovablePoint
            bind:x={b}
            bind:y={bY}
            constrain={constrainB}
            color="var(--ink-sun)"
            label="base b"
          />
          <Text
            x={b}
            y={-0.32}
            latex={`b=${b.toFixed(3)}`}
            size={13}
            color="var(--ink-sun)"
          />
        </Mafs>
      </div>

      <div class="readout" aria-live="polite">
        <span class="key">slope at x=0</span>
        <span class="val slope" class:hit={slopeLocked}>
          ln(b) = {slope.toFixed(4)}
        </span>
      </div>
    </section>
  </div>

  {#if aha}
    <div class="aha" aria-live="polite">
      Same number. The base where the slope at 0 is exactly 1 is the same number
      (1+1/n)<sup>n</sup> climbs to: e ~ 2.71828.
    </div>
  {/if}

  <p class="hint">
    drag n toward one million on the left, drag b until the slope locks at 1 on
    the right
  </p>
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

  .panels {
    display: flex;
    gap: 1rem;
    align-items: stretch;
  }

  .panel {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .panel-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
  }

  .panel-head h3 {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--site-fg);
  }

  .formula {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.95rem;
    color: var(--ink-red);
  }

  .formula sup {
    font-size: 0.7em;
  }

  .slider-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .slider-label {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
  }

  .slider-field input[type='range'] {
    width: 100%;
    accent-color: var(--ink-sun);
    cursor: pointer;
  }

  .slider-ends {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 0.68rem;
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
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    font-family: var(--font-mono);
    padding-top: 0.35rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }

  .key {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--site-fg-muted);
  }

  .val {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--ink-coral);
    font-variant-numeric: tabular-nums;
  }

  .val.slope {
    font-size: 1.05rem;
  }

  .val.hit {
    color: var(--ink-teal);
  }

  .aha {
    background: color-mix(in srgb, var(--ink-teal) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-teal) 45%, transparent);
    border-radius: 12px;
    padding: 0.7rem 0.9rem;
    font-family: var(--font-body);
    font-size: 0.86rem;
    line-height: 1.45;
    color: var(--site-fg);
  }

  .aha sup {
    font-size: 0.7em;
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .panels {
      flex-direction: column;
    }

    .readout {
      font-size: 0.9rem;
    }

    .hint {
      font-size: 0.74rem;
    }
  }
</style>
