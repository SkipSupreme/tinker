<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Line, Text } from 'svelte-mafs';

  let ax = $state(-2);
  let ay = $state(-1);
  let bx = $state(2);
  let by = $state(2);

  const rise = $derived(by - ay);
  const run  = $derived(bx - ax);
  const slope = $derived(run === 0 ? NaN : rise / run);
  const yIntercept = $derived(Number.isFinite(slope) ? ay - slope * ax : NaN);

  // Midpoints for the rise/run labels
  const runMidX  = $derived((ax + bx) / 2);
  const runMidY  = $derived(ay - 0.28);
  const riseMidX = $derived(bx + 0.32);
  const riseMidY = $derived((ay + by) / 2);

  // Format helpers
  function fmtNum(n: number, decimals = 2): string {
    if (!Number.isFinite(n)) return '?';
    // Show clean integer if it is one
    if (Number.isInteger(n)) return String(n);
    // Try simple halves/quarters
    const r = Math.round(n * 4) / 4;
    if (Math.abs(r - n) < 0.001 && r !== 0) {
      if (Number.isInteger(r)) return String(r);
      if (Number.isInteger(r * 2)) return (r * 2) + '/2'; // e.g. 1/2
      if (Number.isInteger(r * 4)) return (r * 4) + '/4';
    }
    return n.toFixed(decimals);
  }

  // Remove leading '+' for display in equations
  function coeff(n: number): string {
    if (!Number.isFinite(n)) return '?';
    return fmtNum(n);
  }

  // Equation form 1: y − ay = m(x − ax)
  const eq1 = $derived.by(() => {
    if (!Number.isFinite(slope)) return 'x = ' + coeff(ax) + '  (vertical line)';
    const m = coeff(slope);
    const dy = ay >= 0 ? ` − ${coeff(ay)}` : ` + ${coeff(-ay)}`;
    const dx = ax >= 0 ? ` − ${coeff(ax)}` : ` + ${coeff(-ax)}`;
    return `y${dy} = ${m}(x${dx})`;
  });

  // Equation form 2: y − by = m(x − bx)
  const eq2 = $derived.by(() => {
    if (!Number.isFinite(slope)) return 'x = ' + coeff(bx) + '  (vertical line)';
    const m = coeff(slope);
    const dy = by >= 0 ? ` − ${coeff(by)}` : ` + ${coeff(-by)}`;
    const dx = bx >= 0 ? ` − ${coeff(bx)}` : ` + ${coeff(-bx)}`;
    return `y${dy} = ${m}(x${dx})`;
  });

  // Slope-intercept: y = mx + b parts
  const slopeStr = $derived(Number.isFinite(slope) ? coeff(slope) : '?');
  const interceptStr = $derived(Number.isFinite(yIntercept) ? coeff(yIntercept) : '?');
  const interceptSign = $derived(
    Number.isFinite(yIntercept)
      ? (yIntercept >= 0 ? ' + ' : ' − ')
      : ' + '
  );
  const interceptAbs = $derived(
    Number.isFinite(yIntercept) ? coeff(Math.abs(yIntercept)) : '?'
  );

  // On-canvas delta labels
  const deltaX = $derived(run === 0 ? '0' : fmtNum(run, 1));
  const deltaY = $derived(fmtNum(rise, 1));

  // Snap A onto the line at its current x position (keeps m, b fixed, moves ay)
  function snapA() {
    if (!Number.isFinite(slope)) return;
    ay = slope * ax + yIntercept;
  }
</script>

<div class="widget">
  <div class="stage">
    <Mafs width={560} height={340} viewBox={{ x: [-4.5, 4.5], y: [-3, 3] }}>
      <Coordinates.Cartesian />

      <!-- The full line through A and B -->
      <Line.ThroughPoints
        point1={[ax, ay]}
        point2={[bx, by]}
        color="var(--ink-red)"
        weight={2}
        opacity={0.85}
      />

      <!-- Rise/run staircase (only if not vertical) -->
      {#if run !== 0}
        <!-- Run: horizontal segment from A to (bx, ay) -->
        <Line.Segment
          point1={[ax, ay]}
          point2={[bx, ay]}
          color="var(--ink-sea)"
          weight={2}
          opacity={0.65}
        />
        <!-- Rise: vertical segment from (bx, ay) to B -->
        <Line.Segment
          point1={[bx, ay]}
          point2={[bx, by]}
          color="var(--ink-coral)"
          weight={2}
          opacity={0.65}
        />

        <!-- Delta labels on canvas -->
        <Text
          x={runMidX}
          y={runMidY}
          color="var(--ink-sea)"
          size={13}
          latex={`\\Delta x=${deltaX}`}
        />
        <Text
          x={riseMidX}
          y={riseMidY}
          color="var(--ink-coral)"
          size={13}
          latex={`\\Delta y=${deltaY}`}
        />
      {/if}

      <!-- Point A -->
      <MovablePoint bind:x={ax} bind:y={ay} color="var(--ink-red)" />
      <!-- Point B -->
      <MovablePoint bind:x={bx} bind:y={by} color="var(--ink-coral)" />

      <!-- A / B labels -->
      <Text x={ax + 0.18} y={ay + 0.32} color="var(--ink-red)" size={14} latex="A" />
      <Text x={bx + 0.18} y={by + 0.32} color="var(--ink-coral)" size={14} latex="B" />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <!-- Slope hero -->
    <div class="slope-hero">
      {#if Number.isFinite(slope)}
        <span class="label">slope</span>
        <span class="slope-val">
          m = <span class="accent">{slopeStr}</span>
        </span>
        <span class="slope-fraction">
          <span class="dot coral"></span>Δy = {deltaY}
          &nbsp;/&nbsp;
          <span class="dot sea"></span>Δx = {deltaX}
        </span>
      {:else}
        <span class="label">slope</span>
        <span class="slope-val undefined-slope">undefined — vertical line</span>
      {/if}
    </div>

    <!-- Three equation forms -->
    <div class="equations">
      <div class="eq-row">
        <span class="eq-label">point-slope (A)</span>
        <code class="eq-text">{eq1}</code>
      </div>
      <div class="eq-row">
        <span class="eq-label">point-slope (B)</span>
        <code class="eq-text">{eq2}</code>
      </div>
      {#if Number.isFinite(slope)}
        <div class="eq-row featured">
          <span class="eq-label">slope-intercept</span>
          <code class="eq-text">
            y = <span class="accent">{slopeStr}</span>x{interceptSign}<span class="accent">{interceptAbs}</span>
          </code>
        </div>
      {/if}
    </div>

    <!-- Snap + hint -->
    <div class="footer">
      <button class="snap-btn" onclick={snapA} disabled={!Number.isFinite(slope)}>
        snap A onto line
      </button>
      <p class="hint">
        drag either anchor — the slope and intercept don't care which two points you pick
      </p>
    </div>
  </div>
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
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  /* ── Stage ── */
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

  /* ── Readout ── */
  .readout {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.65rem;
    font-family: var(--font-mono);
    color: var(--site-fg);
  }

  /* Slope hero */
  .slope-hero {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    flex-shrink: 0;
  }
  .slope-val {
    font-size: 1.25rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--site-fg);
  }
  .slope-val.undefined-slope {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--site-fg-muted);
  }
  .slope-fraction {
    font-size: 0.8rem;
    color: var(--site-fg-muted);
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-variant-numeric: tabular-nums;
  }
  .dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .dot.coral { background: var(--ink-coral); }
  .dot.sea   { background: var(--ink-sea); }

  /* Equations */
  .equations {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .eq-row {
    display: grid;
    grid-template-columns: 11rem 1fr;
    gap: 0.5rem;
    align-items: baseline;
  }
  .eq-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
    font-family: var(--font-body);
    white-space: nowrap;
  }
  .eq-text {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    color: var(--site-fg);
    background: none;
    border: none;
    padding: 0;
  }
  .eq-row.featured .eq-text {
    font-size: 1rem;
    font-weight: 600;
  }
  .accent { color: var(--ink-red); }

  /* Footer */
  .footer {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .snap-btn {
    font-family: var(--font-body);
    font-size: 0.78rem;
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--ink-red) 50%, transparent);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    color: var(--ink-red);
    cursor: pointer;
    transition: background 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .snap-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ink-red) 16%, transparent);
  }
  .snap-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.4;
  }

  /* Mobile */
  @media (max-width: 520px) {
    .eq-row {
      grid-template-columns: 1fr;
      gap: 0.1rem;
    }
    .slope-hero {
      gap: 0.4rem;
    }
    .footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
