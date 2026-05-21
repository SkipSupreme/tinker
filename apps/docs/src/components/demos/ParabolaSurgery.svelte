<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Point, Plot, Text } from 'svelte-mafs';

  // --- State: vertex (h, k) and steepness handle (always at x = h+2)
  let h = $state(0);
  let k = $state(-2);
  let steepX = $state(2);   // x of steepness handle — locked to h+2 via derived
  let steepY = $state(1.5); // y of steepness handle — draggable; sets `a`

  // Keep steepX pinned to h+2 whenever h moves.
  // We do this by computing steepness handle position from h and a.
  // Strategy: the handle is always at x = h + 2. Its y = a*(2)^2 + k = 4a + k.
  // We derive `a` from steepY: a = (steepY - k) / 4.
  // Clamped so a is never 0.

  const HANDLE_OFFSET = 2; // x-offset from vertex for the steepness handle

  // a is derived from the steepness handle y position
  const a = $derived.by(() => {
    const raw = (steepY - k) / (HANDLE_OFFSET * HANDLE_OFFSET);
    // clamp to avoid a=0 (degenerate line) and very flat curves
    const clamped = Math.max(-4, Math.min(4, raw));
    return Math.abs(clamped) < 0.05 ? (clamped < 0 ? -0.05 : 0.05) : clamped;
  });

  // Standard form coefficients
  const b = $derived(-2 * a * h);
  const c = $derived(a * h * h + k);

  // Discriminant
  const disc = $derived(b * b - 4 * a * c);

  // Roots (real only when disc >= 0)
  const hasRealRoots = $derived(disc >= -1e-9);
  const r1 = $derived(hasRealRoots ? (-b - Math.sqrt(Math.max(0, disc))) / (2 * a) : NaN);
  const r2 = $derived(hasRealRoots ? (-b + Math.sqrt(Math.max(0, disc))) / (2 * a) : NaN);
  const repeatedRoot = $derived(Math.abs(disc) < 1e-9);

  // Steepness handle actual y (recalculated from a, h, k so it stays on-curve)
  const handleY = $derived(a * HANDLE_OFFSET * HANDLE_OFFSET + k);

  // Formatting helpers
  const round2 = (n: number) => {
    const r = Math.round(n * 100) / 100;
    return r;
  };

  const fmtCoeff = (n: number, forceSign = false): string => {
    const v = round2(n);
    const s = Number.isInteger(v) ? v.toString() : v.toFixed(2);
    return forceSign && v > 0 ? '+' + s : s;
  };

  const fmtNum = (n: number): string => {
    const v = round2(n);
    return Number.isInteger(v) ? v.toString() : v.toFixed(2);
  };

  // Vertex form string: y = a(x - h)² + k
  const vertexForm = $derived.by(() => {
    const av = fmtNum(a);
    const hv = round2(h);
    const kv = fmtNum(k);
    const hSign = hv === 0 ? '' : (hv > 0 ? ` - ${fmtNum(hv)}` : ` + ${fmtNum(-hv)}`);
    const kSign = round2(k) === 0 ? '' : (round2(k) > 0 ? ` + ${kv}` : ` - ${fmtNum(-round2(k))}`);
    return `y = ${av}(x${hSign})²${kSign}`;
  });

  // Standard form string: y = ax² + bx + c
  const standardForm = $derived.by(() => {
    const av = fmtNum(a);
    const bv = round2(b);
    const cv = round2(c);
    let s = `y = ${av}x²`;
    if (bv !== 0) s += ` ${bv > 0 ? '+' : '-'} ${fmtNum(Math.abs(bv))}x`;
    if (cv !== 0) s += ` ${cv > 0 ? '+' : '-'} ${fmtNum(Math.abs(cv))}`;
    return s;
  });

  // Factored form string
  const factoredForm = $derived.by(() => {
    if (!hasRealRoots) return null;
    const av = fmtNum(a);
    const r1v = round2(r1);
    const r2v = round2(r2);
    const f1 = r1v === 0 ? 'x' : (r1v > 0 ? `(x - ${fmtNum(r1v)})` : `(x + ${fmtNum(-r1v)})`);
    const f2 = r2v === 0 ? 'x' : (r2v > 0 ? `(x - ${fmtNum(r2v)})` : `(x + ${fmtNum(-r2v)})`);
    if (repeatedRoot) {
      return `y = ${av}${f1}²`;
    }
    return `y = ${av}${f1}${f2}`;
  });

  // Discriminant badge color: sea (two), sun (one), coral (none)
  const discColor = $derived(
    disc > 1e-9 ? 'var(--ink-sea)' : (Math.abs(disc) < 1e-9 ? 'var(--ink-sun)' : 'var(--ink-coral)')
  );
  const discLabel = $derived(
    disc > 1e-9 ? 'two real roots' : (Math.abs(disc) < 1e-9 ? 'one repeated root' : 'no real roots')
  );

  // Handle steepness drag — only y moves; we back-compute a
  // When the steepness handle is dragged, update steepY; x is locked to h+HANDLE_OFFSET
  function onSteepDrag(nx: number, ny: number) {
    // nx will be bound but we only care about ny
    steepY = ny;
  }

  // Parabola y function
  const parabola = $derived((x: number) => a * x * x + b * x + c);
</script>

<div class="widget">
  <div class="stage">
    <Mafs width={560} height={380} viewBox={{ x: [-6, 6], y: [-5, 7] }}>
      <Coordinates.Cartesian />

      <!-- The parabola -->
      <Plot.OfX y={parabola} color="var(--ink-red)" weight={2.5} />

      <!-- Root dots (when real) -->
      {#if hasRealRoots && !repeatedRoot}
        <Point x={r1} y={0} color="var(--ink-teal)" />
        <Point x={r2} y={0} color="var(--ink-teal)" />
        <Text x={r1} y={-0.6} latex={`r_1=${fmtNum(r1)}`} size={11} color="var(--ink-teal)" />
        <Text x={r2} y={-0.6} latex={`r_2=${fmtNum(r2)}`} size={11} color="var(--ink-teal)" />
      {/if}
      {#if repeatedRoot}
        <Point x={r1} y={0} color="var(--ink-teal)" />
        <Text x={r1} y={-0.6} latex={`r=${fmtNum(r1)}`} size={11} color="var(--ink-teal)" />
      {/if}

      <!-- Vertex label -->
      <Text x={h} y={k + 0.55} latex={`V`} size={11} color="var(--ink-sun)" />

      <!-- Steepness handle — constrained to x = h+2 -->
      <MovablePoint
        bind:x={steepX}
        bind:y={steepY}
        color="var(--ink-sea)"
        label="Steepness handle"
        constrain={([, ny]) => [h + HANDLE_OFFSET, ny]}
      />

      <!-- Vertex handle (draggable freely) -->
      <MovablePoint
        bind:x={h}
        bind:y={k}
        color="var(--ink-sun)"
        label="Vertex"
      />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <!-- Three forms -->
    <div class="forms">
      <div class="form-row">
        <span class="form-label">vertex</span>
        <code class="form-eq">{vertexForm}</code>
      </div>
      <div class="form-row">
        <span class="form-label">standard</span>
        <code class="form-eq">{standardForm}</code>
      </div>
      <div class="form-row">
        <span class="form-label">factored</span>
        {#if factoredForm}
          <code class="form-eq">{factoredForm}</code>
        {:else}
          <span class="form-none">none (no real roots)</span>
        {/if}
      </div>
    </div>

    <!-- Discriminant badge -->
    <div class="disc-row">
      <span class="disc-label">
        <span class="delta">&#916;</span> = b&#178; &#8722; 4ac =
        <span class="disc-val">{fmtNum(disc)}</span>
      </span>
      <span class="disc-badge" style:background={discColor}>{discLabel}</span>
    </div>

    <p class="hint">
      drag the yellow vertex to move the parabola; drag the blue handle (at x = h+2) to bend it.
      the three formulas are three views of one curve.
    </p>
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

  .stage {
    width: 100%;
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
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
    gap: 0.5rem;
    padding-top: 0.55rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    font-family: var(--font-mono);
    color: var(--site-fg);
  }

  /* --- Three forms grid --- */
  .forms {
    display: flex;
    flex-direction: column;
    gap: 0.22rem;
  }
  .form-row {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .form-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--site-fg-muted);
    min-width: 4.5rem;
    flex-shrink: 0;
  }
  .form-eq {
    font-family: var(--font-mono);
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--site-fg);
    background: none;
    border: none;
    padding: 0;
  }
  .form-none {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
    font-style: italic;
  }

  /* --- Discriminant row --- */
  .disc-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-top: 0.15rem;
  }
  .disc-label {
    font-size: 0.82rem;
    color: var(--site-fg);
  }
  .delta {
    font-weight: 700;
    font-size: 1rem;
  }
  .disc-val {
    font-weight: 700;
  }
  .disc-badge {
    font-family: var(--font-body);
    font-size: 0.72rem;
    font-weight: 600;
    color: #fff;
    padding: 0.15rem 0.55rem;
    border-radius: var(--radius-pill, 999px);
    white-space: nowrap;
    letter-spacing: 0.03em;
  }

  /* --- Hint --- */
  .hint {
    margin: 0.1rem 0 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  /* --- Mobile --- */
  @media (max-width: 520px) {
    .form-label {
      min-width: 3.5rem;
    }
    .form-eq {
      font-size: 0.78rem;
    }
    .disc-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.3rem;
    }
  }
</style>
