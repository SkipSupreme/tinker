<script lang="ts">
  import { Mafs, Coordinates, Plot, MovablePoint, Line, Point, Text } from 'svelte-mafs';

  type FnId = 'hole' | 'jump' | 'osc' | 'blowup';

  interface FnDef {
    id: FnId;
    label: string;
    f: (x: number) => number;
    defaultA: number;
  }

  const FUNCTIONS: FnDef[] = [
    {
      id: 'hole',
      label: '(x^2-4)/(x-2)',
      f: (x: number) => (x * x - 4) / (x - 2),
      defaultA: 2,
    },
    {
      id: 'jump',
      label: '|x|/x',
      f: (x: number) => Math.abs(x) / x,
      defaultA: 0,
    },
    {
      id: 'osc',
      label: 'sin(1/x)',
      f: (x: number) => Math.sin(1 / x),
      defaultA: 0,
    },
    {
      id: 'blowup',
      label: '1/x^2',
      f: (x: number) => 1 / (x * x),
      defaultA: 0,
    },
  ];

  const X_MIN = -4.5;
  const X_MAX = 4.5;
  const Y_MIN = -3.2;
  const Y_MAX = 3.2;
  const BASE_STEP = 0.1;

  // --- state ---
  let fnId = $state<FnId>('hole');
  let a = $state(2);
  let aY = $state(0);
  let step = $state(BASE_STEP);

  const selected = $derived<FnDef>(
    FUNCTIONS.find((d) => d.id === fnId) ?? FUNCTIONS[0],
  );

  // The deltas the table marches inward through.
  const DELTAS = [1, 0.1, 0.01, 0.001, 0.0001];

  interface Row {
    delta: number;
    x: number;
    y: number;
  }

  const leftRows = $derived.by<Row[]>(() =>
    DELTAS.map((m) => {
      const d = step * m;
      const x = a - d;
      return { delta: d, x, y: selected.f(x) };
    }),
  );

  const rightRows = $derived.by<Row[]>(() =>
    DELTAS.map((m) => {
      const d = step * m;
      const x = a + d;
      return { delta: d, x, y: selected.f(x) };
    }),
  );

  // The closest-in samples (last row, smallest delta).
  const leftNear = $derived(leftRows[leftRows.length - 1].y);
  const rightNear = $derived(rightRows[rightRows.length - 1].y);

  function fmtX(n: number): string {
    if (!Number.isFinite(n)) return '-';
    return n.toFixed(5);
  }

  function fmtY(n: number): string {
    if (Number.isNaN(n)) return 'undef';
    if (!Number.isFinite(n)) return n > 0 ? '+inf' : '-inf';
    const abs = Math.abs(n);
    if (abs >= 1e6) return n.toExponential(3);
    return n.toFixed(5);
  }

  interface Verdict {
    tone: 'limit' | 'dne';
    text: string;
  }

  const verdict = $derived.by<Verdict>(() => {
    const id = selected.id;

    if (id === 'hole') {
      // Removable hole. Both sides converge to the same finite value.
      const avg = (leftNear + rightNear) / 2;
      if (Number.isFinite(avg)) {
        return {
          tone: 'limit',
          text: `both sides close in on the same number: limit = ${avg.toFixed(4)}`,
        };
      }
      return { tone: 'dne', text: 'the values are not settling here' };
    }

    if (id === 'jump') {
      // Jump discontinuity: left and right disagree finitely.
      if (
        Number.isFinite(leftNear) &&
        Number.isFinite(rightNear) &&
        Math.abs(leftNear - rightNear) > 1e-6
      ) {
        return {
          tone: 'dne',
          text: `left approaches ${leftNear.toFixed(2)}, right approaches ${rightNear.toFixed(2)}: they disagree (jump), so the limit DNE`,
        };
      }
      return { tone: 'limit', text: `both sides agree: limit = ${rightNear.toFixed(4)}` };
    }

    if (id === 'osc') {
      // Oscillation: the closest rows swing wildly, never settling.
      const sampleYs = [...leftRows, ...rightRows]
        .map((r) => r.y)
        .filter((y) => Number.isFinite(y));
      const spread =
        sampleYs.length > 0
          ? Math.max(...sampleYs) - Math.min(...sampleYs)
          : 0;
      if (spread > 0.2) {
        return {
          tone: 'dne',
          text: 'the values keep swinging between -1 and 1 no matter how close you get: it never settles (oscillation), so the limit DNE',
        };
      }
      return {
        tone: 'limit',
        text: `the values have settled near ${rightNear.toFixed(4)}`,
      };
    }

    // blowup: values grow without bound.
    const big = Math.abs(leftNear) > 1e3 && Math.abs(rightNear) > 1e3;
    if (big) {
      return {
        tone: 'dne',
        text: 'the values grow without bound as you close in: it blows up to infinity, so the limit DNE',
      };
    }
    return {
      tone: 'limit',
      text: `the values are converging near ${rightNear.toFixed(4)}`,
    };
  });

  // The vertical probe line spans the full visible y-range.
  const probeTop = $derived<[number, number]>([a, Y_MAX]);
  const probeBottom = $derived<[number, number]>([a, Y_MIN]);

  function selectFn(def: FnDef) {
    fnId = def.id;
    a = def.defaultA;
    aY = 0;
    step = BASE_STEP;
  }

  function zoomIn() {
    step = step / 10;
  }

  function resetStep() {
    step = BASE_STEP;
  }

  // Keep the probe handle pinned to the x-axis.
  function constrainToAxis([x]: [number, number]): [number, number] {
    return [x, 0];
  }

  $effect(() => {
    if (aY !== 0) aY = 0;
  });
</script>

<div class="widget">
  <div class="controls">
    {#each FUNCTIONS as def}
      <button
        type="button"
        class="toggle"
        class:on={fnId === def.id}
        aria-pressed={fnId === def.id}
        onclick={() => selectFn(def)}
      >
        {def.label}
      </button>
    {/each}
  </div>

  <div class="controls">
    <button type="button" class="toggle action" onclick={zoomIn}>
      zoom in 10x
    </button>
    <button type="button" class="toggle" onclick={resetStep}>
      reset step
    </button>
    <span class="step-readout">
      step = {step.toPrecision(2)}
    </span>
  </div>

  <div class="stage">
    <Mafs
      width={560}
      height={340}
      viewBox={{ x: [X_MIN, X_MAX], y: [Y_MIN, Y_MAX] }}
    >
      <Coordinates.Cartesian />

      <Plot.OfX y={selected.f} color="var(--ink-red)" weight={2.5} />

      <!-- faint vertical probe line through x = a -->
      <Line.Segment
        point1={probeTop}
        point2={probeBottom}
        color="var(--ink-sea)"
        weight={1.5}
        opacity={0.4}
      />

      <Text
        x={a + 0.55}
        y={Y_MAX - 0.35}
        latex={`x = ${a.toFixed(3)}`}
        size={13}
        color="var(--ink-sea)"
      />

      <!-- the dot the learner drags along the x-axis -->
      <MovablePoint
        bind:x={a}
        bind:y={aY}
        constrain={constrainToAxis}
        color="var(--ink-coral)"
        label="point of interest a"
      />
    </Mafs>
  </div>

  <div class="table-wrap">
    <table class="probe-table">
      <thead>
        <tr>
          <th colspan="2" class="side-left">approaching from the LEFT</th>
          <th colspan="2" class="side-right">approaching from the RIGHT</th>
        </tr>
        <tr class="subhead">
          <th>x</th>
          <th>f(x)</th>
          <th>x</th>
          <th>f(x)</th>
        </tr>
      </thead>
      <tbody>
        {#each DELTAS as _, i}
          <tr class:closest={i === DELTAS.length - 1}>
            <td class="cell-x">{fmtX(leftRows[i].x)}</td>
            <td class="cell-y">{fmtY(leftRows[i].y)}</td>
            <td class="cell-x">{fmtX(rightRows[i].x)}</td>
            <td class="cell-y">{fmtY(rightRows[i].y)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div
    class="verdict"
    class:limit={verdict.tone === 'limit'}
    class:dne={verdict.tone === 'dne'}
    aria-live="polite"
  >
    <span class="verdict-tag">
      {verdict.tone === 'limit' ? 'limit found' : 'DNE'}
    </span>
    <span class="verdict-text">{verdict.text}</span>
  </div>

  <p class="hint">
    drag the coral dot to move the point of interest a, then zoom in to watch
    the table close in
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
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .toggle.on,
  .toggle[aria-pressed='true'] {
    background: color-mix(in srgb, var(--ink-sun) 22%, transparent);
    border-color: var(--ink-sun);
  }

  .toggle.action {
    background: color-mix(in srgb, var(--ink-coral) 16%, transparent);
    border-color: var(--ink-coral);
  }

  .step-readout {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    font-variant-numeric: tabular-nums;
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

  .table-wrap {
    overflow-x: auto;
  }

  .probe-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
    color: var(--site-fg);
  }

  .probe-table th,
  .probe-table td {
    padding: 0.32rem 0.5rem;
    text-align: right;
  }

  .probe-table thead th {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
    font-weight: 600;
  }

  .probe-table thead th.side-left,
  .probe-table thead th.side-right {
    text-align: center;
    padding-bottom: 0.15rem;
  }

  .probe-table thead th.side-left {
    color: var(--ink-sea);
  }

  .probe-table thead th.side-right {
    color: var(--ink-coral);
  }

  .probe-table tr.subhead th {
    border-bottom: 1px solid
      color-mix(in srgb, var(--site-fg) 16%, transparent);
  }

  /* visual gutter separating the left-approach and right-approach halves */
  .probe-table th:nth-child(2),
  .probe-table td:nth-child(2) {
    border-right: 2px solid
      color-mix(in srgb, var(--site-fg) 18%, transparent);
    padding-right: 0.8rem;
  }

  .probe-table td:nth-child(3) {
    padding-left: 0.8rem;
  }

  .probe-table tbody tr:nth-child(even) {
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
  }

  .probe-table tbody tr.closest {
    background: color-mix(in srgb, var(--ink-sun) 16%, transparent);
    font-weight: 600;
  }

  .cell-x {
    color: var(--site-fg-muted);
  }

  .cell-y {
    color: var(--site-fg);
  }

  .verdict {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.55rem;
    padding: 0.65rem 0.85rem;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 0.88rem;
    line-height: 1.4;
  }

  .verdict.limit {
    background: color-mix(in srgb, var(--ink-teal) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-teal) 45%, transparent);
  }

  .verdict.dne {
    background: color-mix(in srgb, var(--ink-sun) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-sun) 50%, transparent);
  }

  .verdict-tag {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
    padding: 0.16rem 0.5rem;
    border-radius: 999px;
    white-space: nowrap;
  }

  .verdict.limit .verdict-tag {
    background: color-mix(in srgb, var(--ink-teal) 32%, transparent);
    color: var(--site-fg);
  }

  .verdict.dne .verdict-tag {
    background: color-mix(in srgb, var(--ink-sun) 38%, transparent);
    color: var(--site-fg);
  }

  .verdict-text {
    flex: 1;
    min-width: 12rem;
    color: var(--site-fg);
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  @media (max-width: 520px) {
    .probe-table {
      font-size: 0.7rem;
    }

    .probe-table th,
    .probe-table td {
      padding: 0.26rem 0.32rem;
    }

    .toggle,
    .step-readout {
      font-size: 0.72rem;
    }

    .verdict {
      font-size: 0.8rem;
    }
  }
</style>
