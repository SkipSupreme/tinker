<script lang="ts">
  /**
   * BalanceSolver: visualises solving a·x + b = c as a pan-balance.
   * The only legal moves are applying the same inverse operation to BOTH sides.
   * The beam stays level throughout (the equation is always balanced).
   */

  interface Props {
    a?: number;
    b?: number;
    c?: number;
  }

  let { a = 3, b = 7, c = 19 }: Props = $props();

  // ── Solve state ──────────────────────────────────────────────────────────
  // step 0 → original: a·x + b = c
  // step 1 → subtracted b: a·x = c−b   (skip if b===0)
  // step 2 → divided by a: x = (c−b)/a (solved)
  let step = $state(0);
  let settling = $state(false);   // triggers the beam-settle animation

  const cbDiff = $derived(c - b);          // c − b
  const solution = $derived(cbDiff / a);   // (c − b) / a

  // The maximum step is 2 if b > 0, else 1 (no subtract step needed).
  const maxStep = $derived(b === 0 ? 1 : 2);
  const solved = $derived(step === maxStep);

  // Log of moves in plain English
  let log: string[] = $state([]);

  function applyMove() {
    if (solved) return;

    // If b===0, step goes directly 0 → 1 (the divide step).
    if (step === 0 && b > 0) {
      // Subtract b from both sides
      log = [...log, `subtracted ${b} from both sides`];
      step = 1;
    } else {
      // Divide both sides by a
      log = [...log, `divided both sides by ${a}`];
      step = maxStep;
    }

    // Trigger settle animation
    settling = true;
    setTimeout(() => { settling = false; }, 400);
  }

  function reset() {
    step = 0;
    log = [];
    settling = false;
  }

  // ── Derived equation text ────────────────────────────────────────────────
  const equationText = $derived.by(() => {
    if (step === 0) {
      if (b === 0) return `${a}x = ${c}`;
      return `${a}x + ${b} = ${c}`;
    }
    if (step === 1 && b > 0) return `${a}x = ${cbDiff}`;
    // solved
    return `x = ${solution}`;
  });

  // ── Button label for the next move ───────────────────────────────────────
  const moveLabel = $derived.by(() => {
    if (step === 0 && b > 0) return `subtract ${b} from both sides`;
    return `divide both sides by ${a}`;
  });

  // ── SVG layout constants ─────────────────────────────────────────────────
  const W = 480;
  const H = 220;
  const CX = W / 2;       // beam pivot x
  const FULCRUM_Y = 170;  // tip of fulcrum triangle
  const BEAM_Y = 130;     // beam resting y (level)
  const PAN_W = 100;      // pan width
  const PAN_H = 8;        // pan height
  const PAN_GAP = 44;     // horizontal gap from centre to pan edge
  // left pan centre-x
  const LEFT_PX = CX - PAN_GAP - PAN_W / 2;
  // right pan centre-x
  const RIGHT_PX = CX + PAN_GAP + PAN_W / 2;

  // BLOCK RENDERING ─────────────────────────────────────────────────────────
  // Blocks sit inside the pan area. We stack them vertically up from the pan.
  const BLOCK_W = 14;
  const BLOCK_H = 12;
  const BLOCK_GAP = 2;

  // For the left pan: a x-blocks (--ink-sun) + b unit-blocks (--ink-sea).
  // For the right pan: c unit-blocks.
  // After step 1 (subtract b): left has a x-blocks, right has c−b units.
  // After step 2 (divide by a): left has 1 x-block, right has (c−b)/a units.

  const leftXCount = $derived(step >= maxStep ? 1 : a);
  const leftUnitCount = $derived(step >= 1 ? 0 : b);
  const rightUnitCount = $derived.by(() => {
    if (step >= maxStep) return solution;
    if (step >= 1) return cbDiff;
    return c;
  });

  /** Compute SVG rects for a row of blocks inside a pan.
   *  Returns an array of { x, y, color, label }.
   *  Blocks are rendered left-to-right, up to 8 per row, then new row on top.
   */
  function buildBlocks(
    panCx: number,
    xCount: number,
    unitCount: number,
    panY: number,
  ): { x: number; y: number; w: number; h: number; color: 'x' | 'unit' }[] {
    const blocks: { x: number; y: number; w: number; h: number; color: 'x' | 'unit' }[] = [];
    const total = xCount + unitCount;
    if (total === 0) return blocks;

    const PER_ROW = 8;
    const rows = Math.ceil(total / PER_ROW);
    // Total width of a full row
    const rowPx = Math.min(total, PER_ROW) * (BLOCK_W + BLOCK_GAP) - BLOCK_GAP;
    const startX = panCx - rowPx / 2;

    let i = 0;
    for (let idx = 0; idx < total; idx++) {
      const col = idx % PER_ROW;
      const row = Math.floor(idx / PER_ROW); // row 0 = bottom
      const bx = startX + col * (BLOCK_W + BLOCK_GAP);
      // Stack upward from pan surface
      const by = panY - BLOCK_H - row * (BLOCK_H + BLOCK_GAP);
      blocks.push({
        x: bx,
        y: by,
        w: BLOCK_W,
        h: BLOCK_H,
        color: idx < xCount ? 'x' : 'unit',
      });
      i++;
    }
    return blocks;
  }

  const PAN_Y = BEAM_Y + 10; // pan top edge (hangs below beam)

  const leftBlocks = $derived(
    buildBlocks(LEFT_PX, leftXCount, leftUnitCount, PAN_Y + PAN_H)
  );
  const rightBlocks = $derived(
    buildBlocks(RIGHT_PX, rightUnitCount, 0, PAN_Y + PAN_H)
  );

  // Beam settle: a tiny rotation oscillation
  const beamRotation = $derived(settling ? 0.8 : 0);
</script>

<div class="widget">
  <!-- Equation display -->
  <div class="equation-row" aria-live="polite">
    <span class="equation-text" class:solved={solved}>{equationText}</span>
    {#if solved}
      <span class="solved-badge">solved ✓</span>
    {/if}
  </div>

  <!-- Balance SVG -->
  <div class="stage">
    <svg
      viewBox="0 0 {W} {H}"
      width={W}
      height={H}
      role="img"
      aria-label="Pan balance showing the equation {equationText}"
      class:settle={settling}
    >
      <!-- Fulcrum triangle -->
      <polygon
        points="{CX},{FULCRUM_Y - 2} {CX - 18},{FULCRUM_Y + 32} {CX + 18},{FULCRUM_Y + 32}"
        fill="color-mix(in srgb, var(--site-fg) 60%, transparent)"
      />
      <!-- Fulcrum base -->
      <rect
        x={CX - 28}
        y={FULCRUM_Y + 32}
        width={56}
        height={6}
        rx={3}
        fill="color-mix(in srgb, var(--site-fg) 40%, transparent)"
      />

      <!-- Beam (rotates during settle) -->
      <g
        transform="rotate({beamRotation}, {CX}, {BEAM_Y})"
        style="transform-origin: {CX}px {BEAM_Y}px; transition: transform 400ms cubic-bezier(0.34,1.56,0.64,1);"
      >
        <!-- Beam bar -->
        <rect
          x={CX - PAN_GAP - PAN_W - 6}
          y={BEAM_Y - 5}
          width={2 * (PAN_GAP + PAN_W) + 12}
          height={10}
          rx={5}
          fill="color-mix(in srgb, var(--site-fg) 55%, transparent)"
        />
        <!-- Pivot dot -->
        <circle cx={CX} cy={BEAM_Y} r={7} fill="color-mix(in srgb, var(--site-fg) 70%, transparent)" />

        <!-- Strings (left and right) -->
        <line
          x1={LEFT_PX} y1={BEAM_Y + 5}
          x2={LEFT_PX} y2={PAN_Y}
          stroke="color-mix(in srgb, var(--site-fg) 35%, transparent)"
          stroke-width={1.5}
        />
        <line
          x1={RIGHT_PX} y1={BEAM_Y + 5}
          x2={RIGHT_PX} y2={PAN_Y}
          stroke="color-mix(in srgb, var(--site-fg) 35%, transparent)"
          stroke-width={1.5}
        />

        <!-- Left pan -->
        <rect
          x={LEFT_PX - PAN_W / 2}
          y={PAN_Y}
          width={PAN_W}
          height={PAN_H}
          rx={4}
          fill="color-mix(in srgb, var(--site-fg) 50%, transparent)"
        />

        <!-- Right pan -->
        <rect
          x={RIGHT_PX - PAN_W / 2}
          y={PAN_Y}
          width={PAN_W}
          height={PAN_H}
          rx={4}
          fill="color-mix(in srgb, var(--site-fg) 50%, transparent)"
        />

        <!-- Left blocks (x-blocks = sun, unit-blocks = sea) -->
        {#each leftBlocks as blk}
          <rect
            x={blk.x}
            y={blk.y}
            width={blk.w}
            height={blk.h}
            rx={2}
            fill={blk.color === 'x'
              ? 'var(--ink-sun)'
              : 'var(--ink-sea)'}
            opacity={0.9}
          />
        {/each}

        <!-- Right blocks (all unit = sea) -->
        {#each rightBlocks as blk}
          <rect
            x={blk.x}
            y={blk.y}
            width={blk.w}
            height={blk.h}
            rx={2}
            fill="var(--ink-sea)"
            opacity={0.9}
          />
        {/each}

        <!-- Solved glow ring around left pan -->
        {#if solved}
          <ellipse
            cx={LEFT_PX}
            cy={PAN_Y + 4}
            rx={PAN_W / 2 + 8}
            ry={18}
            fill="color-mix(in srgb, var(--cta) 14%, transparent)"
            stroke="var(--cta)"
            stroke-width={1.5}
          />
        {/if}
      </g>

      <!-- Legend -->
      <g transform="translate(8, {H - 26})">
        <rect x={0} y={0} width={12} height={10} rx={2} fill="var(--ink-sun)" opacity={0.9} />
        <text x={16} y={9} font-family="var(--font-mono)" font-size={10} fill="var(--site-fg-muted)">x-block</text>
        <rect x={72} y={0} width={12} height={10} rx={2} fill="var(--ink-sea)" opacity={0.9} />
        <text x={88} y={9} font-family="var(--font-mono)" font-size={10} fill="var(--site-fg-muted)">unit-block</text>
      </g>
    </svg>
  </div>

  <!-- Controls -->
  <div class="controls">
    {#if !solved}
      <button type="button" class="btn btn-primary" onclick={applyMove}>
        {moveLabel}
      </button>
    {:else}
      <div class="solved-display" aria-live="polite">
        <span class="x-result">x = {solution}</span>
      </div>
    {/if}
    <button type="button" class="btn btn-reset" onclick={reset} aria-label="Reset to start">
      Reset
    </button>
  </div>

  <!-- Step log -->
  {#if log.length > 0}
    <ol class="log" aria-label="Steps applied">
      {#each log as entry, i}
        <li class="log-entry">
          <span class="log-step">step {i + 1}</span>
          <span class="log-text">{entry}</span>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── Equation header ──────────────────────────────────────────────────── */
  .equation-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .equation-text {
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 4vw, 1.75rem);
    font-weight: 600;
    color: var(--site-fg);
    letter-spacing: -0.01em;
    transition: color 300ms ease;
  }
  .equation-text.solved {
    color: var(--cta);
  }
  .solved-badge {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--cta) 15%, transparent);
    color: var(--cta);
    border: 1px solid color-mix(in srgb, var(--cta) 40%, transparent);
  }

  /* ── Stage / SVG ──────────────────────────────────────────────────────── */
  .stage {
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stage svg {
    display: block;
    width: 100%;
    height: auto;
  }

  /* Settle animation: slight rock on the whole SVG */
  @keyframes settle-rock {
    0%   { transform: rotate(0deg); }
    20%  { transform: rotate(0.6deg); }
    45%  { transform: rotate(-0.5deg); }
    65%  { transform: rotate(0.3deg); }
    80%  { transform: rotate(-0.15deg); }
    100% { transform: rotate(0deg); }
  }
  .stage svg.settle {
    animation: settle-rock 400ms cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @media (prefers-reduced-motion: reduce) {
    .stage svg.settle {
      animation: none;
    }
  }

  /* ── Controls ─────────────────────────────────────────────────────────── */
  .controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .btn {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    padding: 9px 16px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 120ms ease-out, background 120ms ease-out;
  }
  .btn:hover { transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }

  .btn-primary {
    background: color-mix(in srgb, var(--ink-coral) 14%, var(--demo-stage));
    border-color: color-mix(in srgb, var(--ink-coral) 45%, transparent);
    color: var(--ink-coral);
    font-weight: 600;
  }
  .btn-primary:hover {
    background: color-mix(in srgb, var(--ink-coral) 22%, var(--demo-stage));
  }

  .btn-reset {
    font-size: 0.8rem;
    color: var(--site-fg-muted);
  }

  /* Solved result display */
  .solved-display {
    flex: 1;
  }
  .x-result {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--cta);
    letter-spacing: -0.01em;
  }

  /* ── Step log ─────────────────────────────────────────────────────────── */
  .log {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .log-entry {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }
  .log-step {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    min-width: 44px;
    flex-shrink: 0;
  }
  .log-text {
    font-family: var(--font-mono);
    font-size: 0.88rem;
    color: var(--site-fg);
  }
</style>
