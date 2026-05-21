<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Circle, Polygon, Line, Text } from 'svelte-mafs';

  // The learner drags vertex P freely in the first quadrant.
  // Everything else — the triangle, the legs, the ratios — is derived from P.
  let px = $state(1.6);
  let py = $state(1.2);

  // Constrain P to the first quadrant and clamp its distance from the origin.
  const R_MIN = 0.3;
  const R_MAX = 3.5;
  function constrainP([x, y]: [number, number]): [number, number] {
    let cx = Math.max(0.05, x);
    let cy = Math.max(0.05, y);
    const r = Math.hypot(cx, cy);
    if (r < R_MIN) {
      const s = R_MIN / r;
      cx *= s;
      cy *= s;
    } else if (r > R_MAX) {
      const s = R_MAX / r;
      cx *= s;
      cy *= s;
    }
    return [cx, cy];
  }

  const r = $derived(Math.hypot(px, py));
  const theta = $derived(Math.atan2(py, px));

  // Triangle vertices: origin, foot of perpendicular, P.
  const O: [number, number] = [0, 0];
  const F = $derived<[number, number]>([r * Math.cos(theta), 0]);
  const P = $derived<[number, number]>([r * Math.cos(theta), r * Math.sin(theta)]);

  const adjLen = $derived(r * Math.cos(theta)); // along the x-axis
  const oppLen = $derived(r * Math.sin(theta)); // vertical leg

  // The ratios — the heart of the widget. These depend only on theta.
  const sinT = $derived(oppLen / r);
  const cosT = $derived(adjLen / r);

  const fmt = (n: number) => n.toFixed(3);
  const deg = $derived((theta * 180) / Math.PI);

  // Right-angle square mark at F (small, scaled to the view).
  const tick = 0.18;
  const rightAngle = $derived<[number, number][]>([
    [F[0] - tick, 0],
    [F[0] - tick, tick],
    [F[0], tick],
  ]);

  function snapToUnit() {
    px = Math.cos(theta);
    py = Math.sin(theta);
  }
</script>

<div class="widget">
  <div class="controls">
    <button type="button" class="snap" onclick={snapToUnit}>snap r to 1</button>
    <span class="hint">Drag the coral point.</span>
  </div>

  <div class="stage">
    <Mafs width={520} height={420} viewBox={{ x: [-1, 4], y: [-1, 4] }}>
      <Coordinates.Cartesian />

      <!-- Faint unit circle: the reference the triangle morphs against. -->
      <Circle
        center={[0, 0]}
        radius={1}
        color="var(--ink-sea)"
        weight={1.5}
        strokeOpacity={0.4}
        fillOpacity={0}
      />

      <!-- The right triangle, faintly filled. -->
      <Polygon
        points={[O, F, P]}
        color="var(--ink-sea)"
        weight={0}
        fillColor="var(--ink-sun)"
        fillOpacity={0.16}
      />

      <!-- Adjacent leg along the x-axis. -->
      <Line.Segment point1={O} point2={F} color="var(--ink-sea)" weight={3} />
      <!-- Opposite leg, vertical. -->
      <Line.Segment point1={F} point2={P} color="var(--ink-red)" weight={3} />
      <!-- Hypotenuse OP. -->
      <Line.Segment point1={O} point2={P} color="var(--ink-red)" weight={3} />

      <!-- Right-angle square mark at the foot. -->
      <Line.Segment point1={rightAngle[0]} point2={rightAngle[1]} color="var(--ink-sea)" weight={1.5} />
      <Line.Segment point1={rightAngle[1]} point2={rightAngle[2]} color="var(--ink-sea)" weight={1.5} />

      <!-- Leg + hypotenuse labels. -->
      <Text x={F[0] + 0.32} y={oppLen / 2} latex={`r\\sin\\theta = ${fmt(oppLen)}`} size={16} color="var(--ink-red)" />
      <Text x={adjLen / 2} y={-0.32} latex={`r\\cos\\theta = ${fmt(adjLen)}`} size={16} color="var(--ink-sea)" />
      <Text x={P[0] / 2 - 0.34} y={P[1] / 2 + 0.3} latex={`r = ${fmt(r)}`} size={16} color="var(--ink-red)" />

      <MovablePoint bind:x={px} bind:y={py} color="var(--ink-coral)" constrain={constrainP} />
    </Mafs>
  </div>

  <dl class="readout" aria-live="polite">
    <div class="row">
      <dt>r</dt><dd>{fmt(r)}</dd>
    </div>
    <div class="row">
      <dt>θ</dt><dd>{fmt(theta)} rad &nbsp;·&nbsp; {deg.toFixed(1)}°</dd>
    </div>
    <div class="row">
      <dt>opposite = r·sinθ</dt><dd>{fmt(oppLen)}</dd>
    </div>
    <div class="row">
      <dt>adjacent = r·cosθ</dt><dd>{fmt(adjLen)}</dd>
    </div>
    <div class="row">
      <dt>hypotenuse = r</dt><dd>{fmt(r)}</dd>
    </div>

    <div class="ratios">
      <div class="row key">
        <dt>opposite / hypotenuse = sin θ</dt><dd>{fmt(sinT)}</dd>
      </div>
      <div class="row key">
        <dt>adjacent / hypotenuse = cos θ</dt><dd>{fmt(cosT)}</dd>
      </div>
    </div>

    <p class="note">
      Stretch the hypotenuse: the leg lengths change, but the ratios don't.
      That ratio is sine and cosine.
    </p>
  </dl>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sea) 50%, transparent);
  }

  .controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .snap {
    padding: 0.55rem 0.9rem;
    border-radius: var(--radius-pill, 999px);
    border: 1.5px solid var(--ink-coral);
    color: var(--ink-coral);
    background: transparent;
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  .snap:hover {
    background: color-mix(in srgb, var(--ink-coral) 10%, transparent);
  }
  .hint {
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }

  .stage {
    width: 100%;
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .stage :global(svg) { display: block; width: 100%; height: auto; max-width: 100%; }

  .readout {
    margin: 0;
    padding-top: 0.5rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    color: var(--site-fg);
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }
  .row dt {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .row dd {
    margin: 0;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--site-fg);
  }

  .ratios {
    margin-top: 0.45rem;
    padding: 0.6rem 0.75rem;
    border-radius: 12px;
    background: color-mix(in srgb, var(--cta-hover) 12%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--cta-hover) 45%, transparent);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .row.key dt {
    color: var(--site-fg);
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.84rem;
  }
  .row.key dd {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--cta-hover);
  }

  .note {
    margin: 0.2rem 0 0;
    font-family: var(--font-body);
    font-size: 0.84rem;
    line-height: 1.45;
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .row { gap: 0.5rem; }
    .row dt { font-size: 0.74rem; }
    .row.key dd { font-size: 1rem; }
  }
</style>
