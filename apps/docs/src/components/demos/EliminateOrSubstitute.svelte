<script lang="ts">
  /**
   * EliminateOrSubstitute
   *
   * Teaches: solving a 2x2 linear system via elimination/substitution is a
   * sequence of VALUE-PRESERVING row operations. The intersection point (the
   * solution) never moves, even as the equations simplify.
   *
   * Each equation stored as { a, b, c } meaning a*x + b*y = c.
   * Special solved forms: { solved: 'x', value: n } or { solved: 'y', value: n }.
   */

  import { Mafs, Coordinates, Line, Point } from 'svelte-mafs';

  // ── Types ────────────────────────────────────────────────────────────────────

  interface Eq {
    a: number;
    b: number;
    c: number;
  }

  type SystemKind = 'unique' | 'inconsistent' | 'dependent';

  // ── Preset systems ───────────────────────────────────────────────────────────

  const PRESETS: Record<SystemKind, { eq1: Eq; eq2: Eq; label: string }> = {
    unique: {
      label: 'Unique solution',
      eq1: { a: 2, b: 3, c: 12 },
      eq2: { a: 4, b: -1, c: 10 },
    },
    inconsistent: {
      label: 'No solution (parallel)',
      eq1: { a: 1, b: 2, c: 3 },
      eq2: { a: 2, b: 4, c: 10 },
    },
    dependent: {
      label: 'Infinitely many (same line)',
      eq1: { a: 1, b: 2, c: 3 },
      eq2: { a: 2, b: 4, c: 6 },
    },
  };

  // ── Core state ───────────────────────────────────────────────────────────────

  let activePreset = $state<SystemKind>('unique');
  let row1 = $state<Eq>({ ...PRESETS.unique.eq1 });
  let row2 = $state<Eq>({ ...PRESETS.unique.eq2 });

  // Operation controls
  let scaleRow = $state<1 | 2>(1);       // which row to scale
  let scaleK = $state(2);                 // scale factor

  let addSrcRow = $state<1 | 2>(1);      // row i (source)
  let addDstRow = $state<2 | 1>(2);      // row j (destination: replace rowj += k*rowi)
  let addK = $state(1);                  // multiplier for source

  let feedback = $state('');
  let feedbackKind = $state<'ok' | 'error' | 'solved' | 'inconsistent' | 'dependent'>('ok');

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function fmt(n: number): string {
    // Round to 4 sig figs to dodge floating-point noise, then display cleanly
    const r = Math.round(n * 10000) / 10000;
    if (r === Math.round(r)) return String(Math.round(r));
    return r.toFixed(3).replace(/\.?0+$/, '');
  }

  /** Format a*x + b*y = c as a string. */
  function eqStr(eq: Eq): string {
    const { a, b, c } = eq;
    const xPart = a === 0 ? '' : a === 1 ? 'x' : a === -1 ? '-x' : `${fmt(a)}x`;
    const yPart = (() => {
      if (b === 0) return '';
      const abs = Math.abs(b);
      const coef = abs === 1 ? 'y' : `${fmt(abs)}y`;
      if (!xPart) return b < 0 ? `-${coef}` : coef;
      return b < 0 ? ` - ${coef}` : ` + ${coef}`;
    })();
    const lhs = (xPart || yPart) ? `${xPart}${yPart}` : '0';
    return `${lhs} = ${fmt(c)}`;
  }

  /** Clamp integer inputs. */
  function clampInt(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  // ── Derived: detect special states ──────────────────────────────────────────

  const state1 = $derived.by((): 'normal' | 'x-only' | 'y-only' | 'trivial-true' | 'trivial-false' => {
    const { a, b, c } = row1;
    if (a === 0 && b === 0) return Math.abs(c) < 0.0001 ? 'trivial-true' : 'trivial-false';
    if (a === 0) return 'y-only';
    if (b === 0) return 'x-only';
    return 'normal';
  });

  const state2 = $derived.by((): 'normal' | 'x-only' | 'y-only' | 'trivial-true' | 'trivial-false' => {
    const { a, b, c } = row2;
    if (a === 0 && b === 0) return Math.abs(c) < 0.0001 ? 'trivial-true' : 'trivial-false';
    if (a === 0) return 'y-only';
    if (b === 0) return 'x-only';
    return 'normal';
  });

  // True solution from original preset
  const originalSolution = $derived.by(() => {
    const p = PRESETS[activePreset];
    const { a: a1, b: b1, c: c1 } = p.eq1;
    const { a: a2, b: b2, c: c2 } = p.eq2;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 0.0001) return null;
    const sx = (c1 * b2 - c2 * b1) / det;
    const sy = (a1 * c2 - a2 * c1) / det;
    return { x: sx, y: sy };
  });

  // Solved check: both rows resolved
  const xValue = $derived.by((): number | null => {
    if (state1 === 'x-only') return row1.c / row1.a;
    if (state2 === 'x-only') return row2.c / row2.a;
    return null;
  });
  const yValue = $derived.by((): number | null => {
    if (state1 === 'y-only') return row1.c / row1.b;
    if (state2 === 'y-only') return row2.c / row2.b;
    return null;
  });

  const isInconsistent = $derived(
    state1 === 'trivial-false' || state2 === 'trivial-false'
  );

  const isDependent = $derived(
    !isInconsistent && (state1 === 'trivial-true' || state2 === 'trivial-true')
  );

  const isSolved = $derived(
    !isInconsistent && !isDependent &&
    xValue !== null && yValue !== null
  );

  // ── Geometry: get two points on a line a*x + b*y = c ───────────────────────
  // Returns [x1, y1] and [x2, y2] for drawing, or null if degenerate.
  function linePoints(eq: Eq, xRange: [number, number]): [[number, number], [number, number]] | null {
    const { a, b, c } = eq;
    if (b !== 0) {
      // y = (c - a*x) / b
      const y1 = (c - a * xRange[0]) / b;
      const y2 = (c - a * xRange[1]) / b;
      return [[xRange[0], y1], [xRange[1], y2]];
    } else if (a !== 0) {
      // Vertical line x = c/a
      const vx = c / a;
      return [[vx, xRange[0]], [vx, xRange[1]]];
    }
    return null;
  }

  const xRange: [number, number] = [-7, 7];

  const pts1 = $derived(linePoints(row1, xRange));
  const pts2 = $derived(linePoints(row2, xRange));

  // ── Operations ───────────────────────────────────────────────────────────────

  function setFeedback(msg: string, kind: typeof feedbackKind = 'ok') {
    feedback = msg;
    feedbackKind = kind;
  }

  function applyScale() {
    if (scaleK === 0) {
      setFeedback('Cannot scale by 0 — the equation would be lost.', 'error');
      return;
    }
    if (scaleRow === 1) {
      row1 = { a: row1.a * scaleK, b: row1.b * scaleK, c: row1.c * scaleK };
      setFeedback(`Row 1 scaled by ${scaleK}.`);
    } else {
      row2 = { a: row2.a * scaleK, b: row2.b * scaleK, c: row2.c * scaleK };
      setFeedback(`Row 2 scaled by ${scaleK}.`);
    }
    checkTerminal();
  }

  function applyAdd() {
    if (addSrcRow === addDstRow) {
      setFeedback('Source and destination are the same row — pick different rows.', 'error');
      return;
    }
    if (addK === 0) {
      setFeedback('Multiplier is 0, so nothing would change. Try a non-zero value.', 'error');
      return;
    }
    const src = addSrcRow === 1 ? row1 : row2;
    const dst = addDstRow === 1 ? row1 : row2;
    const newEq: Eq = {
      a: dst.a + addK * src.a,
      b: dst.b + addK * src.b,
      c: dst.c + addK * src.c,
    };
    if (addDstRow === 1) {
      row1 = newEq;
    } else {
      row2 = newEq;
    }
    const sign = addK >= 0 ? '+' : '';
    setFeedback(`Row ${addDstRow} ← Row ${addDstRow} ${sign}${addK}·Row ${addSrcRow}.`);
    checkTerminal();
  }

  function applySwap() {
    const tmp = row1;
    row1 = row2;
    row2 = tmp;
    setFeedback('Rows swapped.');
    checkTerminal();
  }

  function solveSingleVar(rowNum: 1 | 2) {
    const eq = rowNum === 1 ? row1 : row2;
    const st = rowNum === 1 ? state1 : state2;
    if (st === 'x-only') {
      const val = eq.c / eq.a;
      const newEq: Eq = { a: 1, b: 0, c: val };
      if (rowNum === 1) row1 = newEq; else row2 = newEq;
      setFeedback(`Row ${rowNum} simplified to x = ${fmt(val)}.`);
    } else if (st === 'y-only') {
      const val = eq.c / eq.b;
      const newEq: Eq = { a: 0, b: 1, c: val };
      if (rowNum === 1) row1 = newEq; else row2 = newEq;
      setFeedback(`Row ${rowNum} simplified to y = ${fmt(val)}.`);
    } else if (st === 'trivial-true' || st === 'trivial-false') {
      setFeedback(`Row ${rowNum} is already a trivial equation.`, 'error');
    } else {
      setFeedback(
        `Row ${rowNum} still has both variables — eliminate one first by adding rows or scaling.`,
        'error'
      );
    }
    checkTerminal();
  }

  function checkTerminal() {
    if (state1 === 'trivial-false' || state2 === 'trivial-false') {
      setFeedback('Reached 0 = k (k ≠ 0) — this system is inconsistent. No solution exists (parallel lines).', 'inconsistent');
    } else if (!isInconsistent && (state1 === 'trivial-true' || state2 === 'trivial-true')) {
      setFeedback('Reached 0 = 0 — this system is dependent. Infinitely many solutions (same line).', 'dependent');
    } else if (isSolved) {
      setFeedback(`Solved: x = ${fmt(xValue!)}, y = ${fmt(yValue!)} ✓`, 'solved');
    }
  }

  function loadPreset(kind: SystemKind) {
    activePreset = kind;
    const p = PRESETS[kind];
    row1 = { ...p.eq1 };
    row2 = { ...p.eq2 };
    feedback = '';
    feedbackKind = 'ok';
    scaleK = 2;
    addK = 1;
    addSrcRow = 1;
    addDstRow = 2;
    scaleRow = 1;
  }

  function reset() {
    loadPreset(activePreset);
  }

  // Clamp helpers for inputs
  function handleScaleK(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(v)) scaleK = clampInt(v, -10, 10);
  }
  function handleAddK(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(v)) addK = clampInt(v, -10, 10);
  }

  // View bounds
  const VIEW_X: [number, number] = [-5, 5];
  const VIEW_Y: [number, number] = [-5, 5];
</script>

<div class="widget">

  <!-- ── Preset chooser ──────────────────────────────────────────────────── -->
  <div class="presets">
    {#each Object.entries(PRESETS) as [kind, preset]}
      <button
        type="button"
        class="preset-btn"
        class:active={activePreset === kind}
        onclick={() => loadPreset(kind as SystemKind)}
      >
        {preset.label}
      </button>
    {/each}
  </div>

  <!-- ── Main layout: equations + graph ────────────────────────────────────── -->
  <div class="main-layout">

    <!-- Left column: equations + operations -->
    <div class="left-col">

      <!-- Current equations -->
      <div class="eq-display" aria-live="polite">
        <div class="eq-row" class:highlight={state1 !== 'normal'}>
          <span class="row-label">①</span>
          <span class="eq-text">{eqStr(row1)}</span>
          {#if state1 === 'x-only' || state1 === 'y-only'}
            <button type="button" class="btn btn-solve" onclick={() => solveSingleVar(1)}>
              simplify
            </button>
          {/if}
        </div>
        <div class="eq-row" class:highlight={state2 !== 'normal'}>
          <span class="row-label">②</span>
          <span class="eq-text">{eqStr(row2)}</span>
          {#if state2 === 'x-only' || state2 === 'y-only'}
            <button type="button" class="btn btn-solve" onclick={() => solveSingleVar(2)}>
              simplify
            </button>
          {/if}
        </div>
      </div>

      <!-- Divider -->
      <div class="op-divider"></div>

      <!-- Operations panel -->
      {#if !isSolved && !isInconsistent && !isDependent}
        <div class="ops">

          <!-- Scale a row -->
          <fieldset class="op-group">
            <legend class="op-legend">Scale a row</legend>
            <div class="op-row">
              <label class="op-label" for="scale-row">Row</label>
              <select
                id="scale-row"
                class="sel"
                bind:value={scaleRow}
              >
                <option value={1}>① Row 1</option>
                <option value={2}>② Row 2</option>
              </select>
              <span class="op-by">by</span>
              <input
                type="number"
                class="num-input"
                min="-10"
                max="10"
                value={scaleK}
                oninput={handleScaleK}
                aria-label="Scale factor"
              />
              <button type="button" class="btn btn-op" onclick={applyScale}>Apply</button>
            </div>
          </fieldset>

          <!-- Add rows -->
          <fieldset class="op-group">
            <legend class="op-legend">Add rows</legend>
            <div class="op-row">
              <span class="op-label">Row</span>
              <select class="sel" bind:value={addDstRow}>
                <option value={1}>① Row 1</option>
                <option value={2}>② Row 2</option>
              </select>
              <span class="op-by">←</span>
              <span class="op-label">Row</span>
              <select class="sel" bind:value={addSrcRow}>
                <option value={1}>① Row 1</option>
                <option value={2}>② Row 2</option>
              </select>
              <span class="op-by">×</span>
              <input
                type="number"
                class="num-input"
                min="-10"
                max="10"
                value={addK}
                oninput={handleAddK}
                aria-label="Row multiplier"
              />
              <button type="button" class="btn btn-op" onclick={applyAdd}>Apply</button>
            </div>
          </fieldset>

          <!-- Swap rows -->
          <div class="op-inline">
            <button type="button" class="btn btn-swap" onclick={applySwap}>
              ⇅ Swap rows
            </button>
          </div>
        </div>
      {/if}

      <!-- Feedback readout -->
      <div
        class="readout"
        class:readout-error={feedbackKind === 'error'}
        class:readout-solved={feedbackKind === 'solved'}
        class:readout-inconsistent={feedbackKind === 'inconsistent'}
        class:readout-dependent={feedbackKind === 'dependent'}
        aria-live="polite"
      >
        {#if feedback}
          <span class="feedback-text">{feedback}</span>
        {:else}
          <span class="hint">Apply row operations to isolate variables. Same intersection, simpler equations.</span>
        {/if}
      </div>

      <!-- Reset -->
      <button type="button" class="btn btn-reset" onclick={reset}>Reset</button>

    </div>

    <!-- Right column: Mafs graph -->
    <div class="right-col">
      <div class="stage">
        <Mafs
          width={360}
          height={340}
          viewBox={{ x: VIEW_X, y: VIEW_Y }}
        >
          <Coordinates.Cartesian />

          <!-- Line 1 (ink-red) -->
          {#if pts1}
            <Line.ThroughPoints
              point1={pts1[0]}
              point2={pts1[1]}
              color="var(--ink-red)"
              weight={2.5}
              opacity={0.85}
            />
          {/if}

          <!-- Line 2 (ink-sea) -->
          {#if pts2}
            <Line.ThroughPoints
              point1={pts2[0]}
              point2={pts2[1]}
              color="var(--ink-sea)"
              weight={2.5}
              opacity={0.85}
            />
          {/if}

          <!-- Intersection dot -->
          {#if originalSolution && !isInconsistent}
            <Point
              x={originalSolution.x}
              y={originalSolution.y}
              color={isDependent ? "var(--ink-teal)" : "var(--ink-coral)"}
              opacity={1}
            />
          {/if}
        </Mafs>
      </div>

      <!-- Graph legend -->
      <div class="legend" aria-hidden="true">
        <span class="legend-item">
          <span class="legend-dot" style="background: var(--ink-red);"></span>
          <span class="legend-label">① {eqStr(PRESETS[activePreset].eq1)}</span>
        </span>
        <span class="legend-item">
          <span class="legend-dot" style="background: var(--ink-sea);"></span>
          <span class="legend-label">② {eqStr(PRESETS[activePreset].eq2)}</span>
        </span>
        {#if originalSolution && !isInconsistent && !isDependent}
          <span class="legend-item">
            <span class="legend-dot" style="background: var(--ink-coral);"></span>
            <span class="legend-label">({fmt(originalSolution.x)}, {fmt(originalSolution.y)})</span>
          </span>
        {/if}
      </div>
    </div>

  </div><!-- /main-layout -->

</div><!-- /widget -->

<style>
  /* ── Widget shell ─────────────────────────────────────────────────────────── */
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  /* ── Preset chooser ──────────────────────────────────────────────────────── */
  .presets {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .preset-btn {
    font-family: var(--font-mono);
    font-size: 0.77rem;
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg-muted);
    cursor: pointer;
    transition: background 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out;
    white-space: nowrap;
  }

  .preset-btn:hover {
    background: color-mix(in srgb, var(--ink-red) 10%, var(--demo-stage));
    border-color: color-mix(in srgb, var(--ink-red) 35%, transparent);
    color: var(--site-fg);
  }

  .preset-btn.active {
    background: color-mix(in srgb, var(--ink-red) 16%, var(--demo-stage));
    border-color: color-mix(in srgb, var(--ink-red) 55%, transparent);
    color: var(--ink-red);
    font-weight: 600;
  }

  /* ── Main two-column layout ──────────────────────────────────────────────── */
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 1rem;
    align-items: start;
  }

  /* ── Left column ─────────────────────────────────────────────────────────── */
  .left-col {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* ── Equations ───────────────────────────────────────────────────────────── */
  .eq-display {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border-radius: var(--radius-lg);
    padding: 0.65rem 0.85rem;
  }

  .eq-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-height: 2rem;
  }

  .eq-row.highlight .eq-text {
    color: var(--ink-sun);
  }

  .row-label {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--site-fg-muted);
    flex-shrink: 0;
    width: 1.2rem;
  }

  .eq-text {
    font-family: var(--font-mono);
    font-size: clamp(0.95rem, 2.5vw, 1.1rem);
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
    transition: color 200ms ease;
    flex: 1;
  }

  /* ── Ops divider ─────────────────────────────────────────────────────────── */
  .op-divider {
    height: 1px;
    background: color-mix(in srgb, var(--site-fg) 10%, transparent);
  }

  /* ── Operations ──────────────────────────────────────────────────────────── */
  .ops {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .op-group {
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    border-radius: var(--radius-md);
    padding: 0.5rem 0.7rem 0.6rem;
    margin: 0;
  }

  .op-legend {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--site-fg-muted);
    padding: 0 4px;
  }

  .op-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    margin-top: 0.35rem;
  }

  .op-label {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
    flex-shrink: 0;
  }

  .op-by {
    font-family: var(--font-mono);
    font-size: 0.88rem;
    color: var(--site-fg-muted);
  }

  .sel {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    border: 1px solid color-mix(in srgb, var(--site-fg) 22%, transparent);
    background: var(--demo-card);
    color: var(--site-fg);
    cursor: pointer;
    max-width: 110px;
  }

  .num-input {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    width: 3.2rem;
    padding: 4px 6px;
    border-radius: var(--radius-sm);
    border: 1px solid color-mix(in srgb, var(--site-fg) 22%, transparent);
    background: var(--demo-card);
    color: var(--site-fg);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .num-input:focus,
  .sel:focus {
    outline: 2px solid color-mix(in srgb, var(--ink-red) 55%, transparent);
    outline-offset: 1px;
  }

  .op-inline {
    display: flex;
  }

  /* ── Buttons ─────────────────────────────────────────────────────────────── */
  .btn {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 6px 13px;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 120ms ease-out, background 120ms ease-out;
  }

  .btn:hover { transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }

  .btn-op {
    background: color-mix(in srgb, var(--ink-sea) 14%, var(--demo-stage));
    border-color: color-mix(in srgb, var(--ink-sea) 40%, transparent);
    color: var(--ink-sea);
    font-weight: 600;
  }

  .btn-op:hover {
    background: color-mix(in srgb, var(--ink-sea) 22%, var(--demo-stage));
  }

  .btn-swap {
    background: color-mix(in srgb, var(--ink-sun) 12%, var(--demo-stage));
    border-color: color-mix(in srgb, var(--ink-sun) 40%, transparent);
    color: var(--ink-sun);
  }

  .btn-swap:hover {
    background: color-mix(in srgb, var(--ink-sun) 20%, var(--demo-stage));
  }

  .btn-solve {
    font-size: 0.72rem;
    padding: 3px 9px;
    background: color-mix(in srgb, var(--cta) 14%, var(--demo-stage));
    border-color: color-mix(in srgb, var(--cta) 40%, transparent);
    color: var(--cta);
    font-weight: 600;
  }

  .btn-solve:hover {
    background: color-mix(in srgb, var(--cta) 22%, var(--demo-stage));
  }

  .btn-reset {
    align-self: flex-start;
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    padding: 5px 12px;
  }

  /* ── Readout / feedback ──────────────────────────────────────────────────── */
  .readout {
    font-family: var(--font-mono);
    font-size: 0.86rem;
    color: var(--site-fg);
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    padding-top: 0.55rem;
    min-height: 2.6rem;
    transition: color 200ms ease;
  }

  .hint {
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .feedback-text {
    display: block;
    line-height: 1.45;
  }

  .readout-error .feedback-text {
    color: var(--ink-coral);
  }

  .readout-solved .feedback-text {
    color: var(--cta);
    font-weight: 700;
    font-size: 0.95rem;
  }

  .readout-inconsistent .feedback-text {
    color: var(--ink-sun);
  }

  .readout-dependent .feedback-text {
    color: var(--ink-teal);
  }

  /* ── Right column: graph ─────────────────────────────────────────────────── */
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stage {
    width: 100%;
    background: var(--demo-stage);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .stage :global(svg) {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
  }

  /* ── Legend ──────────────────────────────────────────────────────────────── */
  .legend {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 0.2rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .legend-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: var(--radius-pill);
    flex-shrink: 0;
  }

  .legend-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--site-fg-muted);
  }

  /* ── Mobile responsive ───────────────────────────────────────────────────── */
  @media (max-width: 520px) {
    .main-layout {
      grid-template-columns: 1fr;
    }

    .right-col {
      order: -1;
    }

    .op-row {
      gap: 0.35rem;
    }

    .sel {
      max-width: 90px;
      font-size: 0.78rem;
    }

    .num-input {
      width: 2.8rem;
    }
  }

  /* ── Reduced motion ──────────────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .btn { transition: none; }
    .preset-btn { transition: none; }
    .eq-text { transition: none; }
    .readout { transition: none; }
  }
</style>
