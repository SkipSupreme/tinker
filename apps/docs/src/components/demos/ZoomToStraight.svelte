<script lang="ts">
  import {
    Mafs,
    Coordinates,
    Plot,
    MovablePoint,
    Line,
    snapToCurve,
  } from 'svelte-mafs';

  // The curve under study.
  const f = (x: number) => x * x;
  // Local direction of the curve at x. Used only to draw the straight
  // line so it hugs the curve. This number is never surfaced to the learner.
  const localSlope = (x: number) => 2 * x;

  const CURVE_MIN = -3;
  const CURVE_MAX = 3;

  // Draggable point P, constrained to the curve. Default at x = 1.
  let px = $state(1);
  let py = $state(f(1));

  // Zoom is a 4-stop control.
  const ZOOM_STOPS = [1, 10, 100, 1000] as const;
  let zoomIndex = $state(0);
  const zoom = $derived(ZOOM_STOPS[zoomIndex]);

  const canZoomIn = $derived(zoomIndex < ZOOM_STOPS.length - 1);
  const canZoomOut = $derived(zoomIndex > 0);

  function zoomIn() {
    if (canZoomIn) zoomIndex += 1;
  }
  function zoomOut() {
    if (canZoomOut) zoomIndex -= 1;
  }

  // Constrain the handle to the curve y = x^2.
  const onCurve = snapToCurve(
    (t) => [t, t * t] as const,
    [CURVE_MIN, CURVE_MAX],
    400,
  );

  // The viewBox is centered on P with equal half-width in x and y, so both
  // axes are magnified by the same factor (equal aspect is critical).
  const half = $derived(3 / zoom);
  const viewBox = $derived({
    x: [px - half, px + half] as [number, number],
    y: [py - half, py + half] as [number, number],
  });

  // The straight line the curve becomes, drawn through P with the curve's
  // local direction so it overlaps the curve when zoomed. The endpoints
  // span the current viewBox. The line's slope is computed internally and
  // intentionally never displayed.
  const lineA = $derived<[number, number]>([
    px - half,
    py - localSlope(px) * half,
  ]);
  const lineB = $derived<[number, number]>([
    px + half,
    py + localSlope(px) * half,
  ]);
</script>

<div class="widget">
  <div class="controls">
    <button
      type="button"
      class="toggle"
      onclick={zoomOut}
      disabled={!canZoomOut}
    >
      zoom out
    </button>
    <button
      type="button"
      class="toggle"
      onclick={zoomIn}
      disabled={!canZoomIn}
    >
      zoom in
    </button>
    <div class="stops" aria-hidden="true">
      {#each ZOOM_STOPS as stop, i}
        <span class="stop" class:active={i === zoomIndex}>{stop}x</span>
      {/each}
    </div>
  </div>

  <div class="stage">
    <Mafs width={480} height={480} {viewBox}>
      <Coordinates.Cartesian />

      <!-- the straight line the curve flattens into (slope never shown) -->
      <Line.Segment
        point1={lineA}
        point2={lineB}
        color="var(--ink-coral)"
        weight={2}
        opacity={0.6}
      />

      <!-- the curve y = x^2 -->
      <Plot.OfX y={f} color="var(--ink-red)" weight={2.5} />

      <!-- draggable point P on the curve -->
      <MovablePoint
        bind:x={px}
        bind:y={py}
        constrain={onCurve}
        color="var(--ink-coral)"
      />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="line">
      <span class="key">zoom</span>
      <span class="val">{zoom}x</span>
    </div>
    <div class="line">
      <span class="key">point</span>
      <span class="val">({px.toFixed(3)}, {py.toFixed(3)})</span>
    </div>
    <p class="caption">
      Keep zooming. The curve becomes a straight line. The next module gives
      that line its name.
    </p>
    <p class="hint">drag the dot · or tab + arrow keys</p>
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

  .toggle:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .stops {
    display: flex;
    gap: 0.35rem;
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 0.74rem;
  }

  .stop {
    color: var(--site-fg-muted);
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    border: 1px solid transparent;
  }

  .stop.active {
    color: var(--site-fg);
    background: color-mix(in srgb, var(--ink-coral) 20%, transparent);
    border-color: var(--ink-coral);
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
    flex: 0 0 5rem;
    color: var(--site-fg-muted);
  }

  .val {
    flex: 1;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .caption {
    margin: 0.2rem 0 0;
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--site-fg);
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .readout {
      font-size: 0.74rem;
    }

    .toggle,
    .stops {
      font-size: 0.72rem;
    }

    .stops {
      margin-left: 0;
      width: 100%;
      justify-content: space-between;
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
