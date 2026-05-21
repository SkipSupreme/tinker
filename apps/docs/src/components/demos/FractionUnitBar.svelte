<script lang="ts">
  interface Props {
    a?: [number, number];
    b?: [number, number];
    mode?: 'add' | 'subtract';
  }

  let {
    a = [3, 4],
    b = [5, 6],
    mode = 'add',
  }: Props = $props();

  // Multipliers: how finely each bar is sliced (1–12)
  let kA = $state(1);
  let kB = $state(1);

  // Derived current numerators and denominators after re-slicing
  const numA = $derived(a[0] * kA);
  const denA = $derived(a[1] * kA);
  const numB = $derived(b[0] * kB);
  const denB = $derived(b[1] * kB);

  const aligned = $derived(denA === denB);
  const commonDen = $derived(denA); // Only meaningful when aligned

  // Result fraction (only meaningful when aligned)
  const resultNum = $derived(mode === 'add' ? numA + numB : numA - numB);
  const resultDen = $derived(denA); // same as denB when aligned

  // GCD for reducing the result fraction label
  function gcd(x: number, y: number): number {
    x = Math.abs(x); y = Math.abs(y);
    while (y) { const t = y; y = x % y; x = t; }
    return x || 1;
  }

  const resultGcd = $derived(gcd(Math.abs(resultNum), resultDen));
  const resultNumReduced = $derived(resultNum / resultGcd);
  const resultDenReduced = $derived(resultDen / resultGcd);

  // SVG layout constants
  const SVG_W = 560;
  const SVG_H = 72;          // height per bar row
  const AXIS_H = 28;         // axis tick row height
  const LEFT_PAD = 44;       // room for fraction label
  const RIGHT_PAD = 10;
  const BAR_Y = 10;          // top of bar within its row
  const BAR_H = 36;          // bar height
  const TRACK_W = $derived(SVG_W - LEFT_PAD - RIGHT_PAD);

  // The axis spans 0..2; we show fractions that can be > 1
  const AXIS_MAX = 2;
  function xOf(val: number): number {
    return LEFT_PAD + (val / AXIS_MAX) * TRACK_W;
  }

  // Build segment rects for a bar
  function buildSegments(num: number, den: number): { x: number; w: number; filled: boolean }[] {
    const segs: { x: number; w: number; filled: boolean }[] = [];
    const segW = TRACK_W / (den * AXIS_MAX); // width of one unit segment (denom·k segs span 0..1)
    for (let i = 0; i < den; i++) {
      segs.push({
        x: LEFT_PAD + i * segW,
        w: segW,
        filled: i < num,
      });
    }
    return segs;
  }

  const segsA = $derived(buildSegments(numA, denA));
  const segsB = $derived(buildSegments(numB, denB));
  const segsResult = $derived(aligned ? buildSegments(resultNum, resultDen) : []);

  // Axis ticks: integers 0, 1, 2 plus the landing tick for result
  function axisTicksFor(den: number): number[] {
    // Major ticks at whole numbers, minor at each denominator unit
    const ticks: number[] = [];
    for (let i = 0; i <= den * AXIS_MAX; i++) {
      ticks.push(i / den);
    }
    return ticks;
  }

  const ticksA = $derived(axisTicksFor(denA));
  const ticksB = $derived(axisTicksFor(denB));
  const ticksResult = $derived(aligned ? axisTicksFor(resultDen) : [0, 1, 2]);

  // Total SVG height: bar A + bar B + result bar + axis row
  const RESULT_LABEL_H = 20;
  const TOTAL_H = $derived(SVG_H + SVG_H + (aligned ? SVG_H : SVG_H) + AXIS_H + RESULT_LABEL_H);

  // Y offsets for each section
  const Y_A = 0;
  const Y_B = $derived(Y_A + SVG_H);
  const Y_RESULT = $derived(Y_B + SVG_H + 12);
  const Y_AXIS = $derived(Y_RESULT + SVG_H);

  // Fraction string helpers
  function fracLabel(num: number, den: number): string {
    return `${num}/${den}`;
  }

  function originalFrac(pair: [number, number]): string {
    return `${pair[0]}/${pair[1]}`;
  }

  // Clamp multiplier
  function clamp(v: number): number {
    return Math.max(1, Math.min(12, v));
  }

  // Status label
  const statusText = $derived(
    aligned
      ? `common denominator: ${commonDen}, aligned`
      : `denominators differ (${denA} vs ${denB}), can't combine yet`
  );

  // Result equation string
  const equationText = $derived(
    mode === 'add'
      ? `${fracLabel(numA, denA)} + ${fracLabel(numB, denB)} = ${fracLabel(resultNum, resultDen)}`
      : `${fracLabel(numA, denA)} − ${fracLabel(numB, denB)} = ${fracLabel(resultNum, resultDen)}`
  );

  // Reduced form label (show when different from unreduced)
  const resultReducedLabel = $derived(
    resultDenReduced !== resultDen
      ? ` = ${resultNumReduced}/${resultDenReduced}`
      : ''
  );
</script>

<div class="widget">
  <!-- Bar diagram -->
  <div class="stage" aria-label="Fraction unit bars">
    <svg
      viewBox={`0 0 ${SVG_W} ${TOTAL_H}`}
      width={SVG_W}
      height={TOTAL_H}
      role="img"
      aria-label="Unit bars showing fractions A and B and their {mode === 'add' ? 'sum' : 'difference'}"
    >
      <!-- ── Bar A ── -->
      <g transform={`translate(0,${Y_A})`}>
        <!-- Row label -->
        <text x="2" y={BAR_Y + BAR_H / 2 + 5} class="bar-label" fill="var(--ink-red)" font-family="var(--font-mono)" font-size="13" font-weight="700">A</text>

        <!-- Track background -->
        <rect x={LEFT_PAD} y={BAR_Y} width={TRACK_W} height={BAR_H}
              rx="4"
              fill="color-mix(in srgb, var(--ink-red) 8%, var(--demo-stage))"
              stroke="color-mix(in srgb, var(--ink-red) 20%, transparent)"
              stroke-width="1" />

        <!-- Segments -->
        {#each segsA as seg, i (i)}
          <rect
            x={seg.x + 0.5}
            y={BAR_Y + 0.5}
            width={Math.max(0, seg.w - 1)}
            height={BAR_H - 1}
            rx="3"
            fill={seg.filled
              ? "color-mix(in srgb, var(--ink-red) 72%, transparent)"
              : "transparent"}
            stroke="color-mix(in srgb, var(--ink-red) 28%, transparent)"
            stroke-width="0.75"
          />
        {/each}

        <!-- Value line at fraction value -->
        <line
          x1={xOf(a[0] / a[1])}
          y1={BAR_Y - 3}
          x2={xOf(a[0] / a[1])}
          y2={BAR_Y + BAR_H + 3}
          stroke="var(--ink-red)"
          stroke-width="2"
          stroke-dasharray="3 2"
          opacity="0.55"
        />
      </g>

      <!-- ── Bar B ── -->
      <g transform={`translate(0,${Y_B})`}>
        <text x="2" y={BAR_Y + BAR_H / 2 + 5} class="bar-label" fill="var(--ink-sea)" font-family="var(--font-mono)" font-size="13" font-weight="700">B</text>

        <rect x={LEFT_PAD} y={BAR_Y} width={TRACK_W} height={BAR_H}
              rx="4"
              fill="color-mix(in srgb, var(--ink-sea) 8%, var(--demo-stage))"
              stroke="color-mix(in srgb, var(--ink-sea) 20%, transparent)"
              stroke-width="1" />

        {#each segsB as seg, i (i)}
          <rect
            x={seg.x + 0.5}
            y={BAR_Y + 0.5}
            width={Math.max(0, seg.w - 1)}
            height={BAR_H - 1}
            rx="3"
            fill={seg.filled
              ? "color-mix(in srgb, var(--ink-sea) 72%, transparent)"
              : "transparent"}
            stroke="color-mix(in srgb, var(--ink-sea) 28%, transparent)"
            stroke-width="0.75"
          />
        {/each}

        <line
          x1={xOf(b[0] / b[1])}
          y1={BAR_Y - 3}
          x2={xOf(b[0] / b[1])}
          y2={BAR_Y + BAR_H + 3}
          stroke="var(--ink-sea)"
          stroke-width="2"
          stroke-dasharray="3 2"
          opacity="0.55"
        />
      </g>

      <!-- ── Divider ── -->
      <line
        x1={LEFT_PAD} y1={Y_RESULT - 4}
        x2={SVG_W - RIGHT_PAD} y2={Y_RESULT - 4}
        stroke="color-mix(in srgb, var(--site-fg) 14%, transparent)"
        stroke-width="1"
        stroke-dasharray="4 3"
      />

      <!-- ── Result bar ── -->
      <g transform={`translate(0,${Y_RESULT})`} opacity={aligned ? 1 : 0.32}>
        <text x="2" y={BAR_Y + BAR_H / 2 + 5} class="bar-label" fill="var(--ink-coral)" font-family="var(--font-mono)" font-size="13" font-weight="700">
          {mode === 'add' ? 'A+B' : 'A−B'}
        </text>

        <rect x={LEFT_PAD} y={BAR_Y} width={TRACK_W} height={BAR_H}
              rx="4"
              fill="color-mix(in srgb, var(--ink-coral) 8%, var(--demo-stage))"
              stroke="color-mix(in srgb, var(--ink-coral) 20%, transparent)"
              stroke-width="1" />

        {#if aligned}
          {#each segsResult as seg, i (i)}
            <rect
              x={seg.x + 0.5}
              y={BAR_Y + 0.5}
              width={Math.max(0, seg.w - 1)}
              height={BAR_H - 1}
              rx="3"
              fill={seg.filled
                ? "color-mix(in srgb, var(--ink-coral) 72%, transparent)"
                : "transparent"}
              stroke="color-mix(in srgb, var(--ink-coral) 28%, transparent)"
              stroke-width="0.75"
            />
          {/each}

          <!-- Landing tick at result value -->
          <line
            x1={xOf(resultNum / resultDen)}
            y1={BAR_Y - 3}
            x2={xOf(resultNum / resultDen)}
            y2={BAR_Y + BAR_H + 3}
            stroke="var(--ink-coral)"
            stroke-width="2.5"
          />
        {:else}
          <!-- "align first" overlay text inside bar -->
          <text
            x={LEFT_PAD + TRACK_W / 2}
            y={BAR_Y + BAR_H / 2 + 5}
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="12"
            fill="var(--site-fg-muted)"
          >align the units first</text>
        {/if}
      </g>

      <!-- ── Axis ── -->
      <g transform={`translate(0,${Y_AXIS})`}>
        <!-- Baseline -->
        <line x1={LEFT_PAD} y1="12" x2={SVG_W - RIGHT_PAD} y2="12"
              stroke="color-mix(in srgb, var(--site-fg) 28%, transparent)"
              stroke-width="1" />

        <!-- Major ticks 0, 1, 2 -->
        {#each [0, 1, 2] as v}
          <line x1={xOf(v)} y1="6" x2={xOf(v)} y2="18"
                stroke="color-mix(in srgb, var(--site-fg) 48%, transparent)"
                stroke-width="1.5" />
          <text
            x={xOf(v)}
            y="28"
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="11"
            fill="var(--site-fg-muted)"
          >{v}</text>
        {/each}
      </g>
    </svg>
  </div>

  <!-- Controls row -->
  <div class="controls">
    <!-- Bar A controls -->
    <div class="bar-controls">
      <div class="bar-id" style="color: var(--ink-red)">A</div>
      <div class="fraction-display">
        <span class="orig">{originalFrac(a)}</span>
        <span class="eq-arrow">→</span>
        <span class="recut">{fracLabel(numA, denA)}</span>
      </div>
      <div class="stepper">
        <button
          type="button"
          class="step-btn"
          aria-label="Cut bar A coarser"
          disabled={kA <= 1}
          onclick={() => (kA = clamp(kA - 1))}
        >−</button>
        <span class="step-val" aria-label="Bar A multiplier: {kA}">×{kA}</span>
        <button
          type="button"
          class="step-btn"
          aria-label="Cut bar A finer"
          disabled={kA >= 12}
          onclick={() => (kA = clamp(kA + 1))}
        >+</button>
      </div>
      <span class="den-badge" style="color: var(--ink-red)">den: {denA}</span>
    </div>

    <!-- Bar B controls -->
    <div class="bar-controls">
      <div class="bar-id" style="color: var(--ink-sea)">B</div>
      <div class="fraction-display">
        <span class="orig">{originalFrac(b)}</span>
        <span class="eq-arrow">→</span>
        <span class="recut">{fracLabel(numB, denB)}</span>
      </div>
      <div class="stepper">
        <button
          type="button"
          class="step-btn"
          aria-label="Cut bar B coarser"
          disabled={kB <= 1}
          onclick={() => (kB = clamp(kB - 1))}
        >−</button>
        <span class="step-val" aria-label="Bar B multiplier: {kB}">×{kB}</span>
        <button
          type="button"
          class="step-btn"
          aria-label="Cut bar B finer"
          disabled={kB >= 12}
          onclick={() => (kB = clamp(kB + 1))}
        >+</button>
      </div>
      <span class="den-badge" style="color: var(--ink-sea)">den: {denB}</span>
    </div>
  </div>

  <!-- Status + readout -->
  <div class="readout" aria-live="polite">
    <div class="status" class:aligned class:misaligned={!aligned}>
      <span class="status-dot"></span>
      <span class="status-text">{statusText}</span>
    </div>

    {#if aligned}
      <div class="equation">
        <span class="eq-str">{equationText}{resultReducedLabel}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(14px, 2vw, 20px);
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Stage */
  .stage {
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    width: 100%;
  }
  .stage svg {
    display: block;
    width: 100%;
    height: auto;
    touch-action: none;
  }

  /* Controls */
  .controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .bar-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .bar-id {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
    min-width: 16px;
  }

  .fraction-display {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--site-fg);
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 110px;
  }
  .orig {
    color: var(--site-fg-muted);
  }
  .eq-arrow {
    color: var(--site-fg-muted);
  }
  .recut {
    font-weight: 600;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .step-btn {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 100ms ease-out, background 100ms;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .step-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--site-fg) 8%, var(--demo-stage));
    transform: translateY(-1px);
  }
  .step-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .step-val {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--site-fg-muted);
    min-width: 32px;
    text-align: center;
  }

  .den-badge {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    background: color-mix(in srgb, currentColor 10%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
  }

  /* Readout */
  .readout {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 13px;
    border-radius: 8px;
    padding: 8px 12px;
  }
  .status.aligned {
    background: color-mix(in srgb, var(--cta) 10%, var(--demo-stage));
    border: 1px solid color-mix(in srgb, var(--cta) 36%, transparent);
    color: color-mix(in srgb, var(--cta) 85%, var(--site-fg));
  }
  .status.misaligned {
    background: color-mix(in srgb, var(--ink-sun) 10%, var(--demo-stage));
    border: 1px solid color-mix(in srgb, var(--ink-sun) 36%, transparent);
    color: color-mix(in srgb, var(--ink-sun) 75%, var(--site-fg));
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .aligned .status-dot {
    background: var(--cta);
  }
  .misaligned .status-dot {
    background: var(--ink-sun);
  }

  .equation {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 600;
    color: var(--ink-coral);
    padding: 6px 12px;
    background: color-mix(in srgb, var(--ink-coral) 8%, var(--demo-stage));
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--ink-coral) 20%, transparent);
  }

  /* Reduced-motion: skip SVG fill transitions */
  @media (prefers-reduced-motion: reduce) {
    .step-btn {
      transition: none;
    }
  }

  /* Mobile touch target check: buttons are 44px, already set above */
  @media (max-width: 640px) {
    .bar-controls {
      gap: 8px;
    }
    .fraction-display {
      font-size: 13px;
      min-width: 96px;
    }
    .step-val {
      min-width: 28px;
    }
  }
</style>
