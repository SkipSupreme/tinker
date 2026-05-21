<script lang="ts">
  /**
   * NotationToggle: one number, three notations.
   * A draggable dot on a number line [0,1] updates a fraction, a decimal,
   * and a percent badge simultaneously, teaching that notation is a cast, not a type change.
   */

  interface Props {
    initial?: number;
  }

  let { initial = 0.375 }: Props = $props();

  // ── state ──────────────────────────────────────────────────────────────────
  let v = $state(Math.max(0, Math.min(1, initial)));
  let lowestTerms = $state(true);
  let dragging = $state(false);

  // Editing state per badge: null means not editing
  let fracInput = $state<string | null>(null);
  let decInput  = $state<string | null>(null);
  let pctInput  = $state<string | null>(null);

  // ── SVG layout ─────────────────────────────────────────────────────────────
  const SVG_W = 560;
  const SVG_H = 80;
  const PAD_L = 28;
  const PAD_R = 28;
  const LINE_Y = 46;
  const LINE_X0 = PAD_L;
  const LINE_X1 = SVG_W - PAD_R;
  const LINE_LEN = LINE_X1 - LINE_X0;
  const DOT_R = 10;

  // ── math helpers ───────────────────────────────────────────────────────────
  function clamp(x: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, x));
  }

  function gcd(a: number, b: number): number {
    a = Math.abs(Math.round(a));
    b = Math.abs(Math.round(b));
    while (b !== 0) { const t = b; b = a % b; a = t; }
    return a || 1;
  }

  /** Find best fraction for `val` in [0,1] searching denominators 1..64. */
  function bestFraction(val: number): { n: number; d: number } {
    let bestN = 0, bestD = 1, bestErr = Math.abs(val);
    for (let d = 1; d <= 64; d++) {
      const n = Math.round(val * d);
      const err = Math.abs(val - n / d);
      if (err < bestErr) { bestErr = err; bestN = n; bestD = d; }
      if (bestErr < 1e-10) break;
    }
    return { n: bestN, d: bestD };
  }

  // ── derived display values ──────────────────────────────────────────────────
  const fraction = $derived.by(() => {
    const { n, d } = bestFraction(v);
    if (!lowestTerms) return { n, d };
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  });

  const decimalStr = $derived.by(() => {
    // up to 4 significant figures, trailing zeros trimmed
    const s = v.toPrecision(4);
    return parseFloat(s).toString();
  });

  const percentStr = $derived.by(() => {
    const p = v * 100;
    const s = parseFloat(p.toPrecision(4)).toString();
    return s + '%';
  });

  // dot X position
  const dotX = $derived(LINE_X0 + v * LINE_LEN);

  // tick marks at 0, 0.1, 0.2, ..., 1.0 with labels at 0, 0.25, 0.5, 0.75, 1
  const ticks: Array<{ x: number; label: string | null }> = $derived.by(() => {
    const result: Array<{ x: number; label: string | null }> = [];
    for (let i = 0; i <= 20; i++) {
      const frac = i / 20;
      const x = LINE_X0 + frac * LINE_LEN;
      // Label every quarter
      const labeled = [0, 5, 10, 15, 20].includes(i);
      const label = labeled ? (i === 0 ? '0' : i === 20 ? '1' : (i / 20).toString()) : null;
      result.push({ x, label });
    }
    return result;
  });

  // ── snap helper ─────────────────────────────────────────────────────────────
  function snapToGrid(raw: number): number {
    const GRID = 1 / 64;
    return clamp(Math.round(raw / GRID) * GRID, 0, 1);
  }

  // ── pointer drag ────────────────────────────────────────────────────────────
  let svgEl = $state<SVGSVGElement | null>(null);

  function pxToValue(clientX: number): number {
    if (!svgEl) return v;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = SVG_W / rect.width;
    const px = (clientX - rect.left) * scaleX;
    return snapToGrid((px - LINE_X0) / LINE_LEN);
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    dragging = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    v = pxToValue(e.clientX);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    v = pxToValue(e.clientX);
  }

  function onPointerUp() {
    dragging = false;
  }

  // ── keyboard on dot ─────────────────────────────────────────────────────────
  function onDotKeyDown(e: KeyboardEvent) {
    const STEP = 1 / 64;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      v = snapToGrid(clamp(v + STEP, 0, 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      v = snapToGrid(clamp(v - STEP, 0, 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      v = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      v = 1;
    }
  }

  // ── badge input handlers ────────────────────────────────────────────────────
  function commitFrac(raw: string) {
    const m = raw.trim().match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (!m) return;
    const n = parseInt(m[1], 10);
    const d = parseInt(m[2], 10);
    if (!isFinite(n) || !isFinite(d) || d === 0) return;
    const candidate = n / d;
    if (candidate >= 0 && candidate <= 1) v = snapToGrid(candidate);
  }

  function commitDec(raw: string) {
    const n = parseFloat(raw.trim());
    if (!isFinite(n)) return;
    if (n >= 0 && n <= 1) v = snapToGrid(n);
  }

  function commitPct(raw: string) {
    const cleaned = raw.trim().replace(/%$/, '');
    const n = parseFloat(cleaned);
    if (!isFinite(n)) return;
    const candidate = n / 100;
    if (candidate >= 0 && candidate <= 1) v = snapToGrid(candidate);
  }

  function startEdit(badge: 'frac' | 'dec' | 'pct') {
    if (badge === 'frac') {
      fracInput = `${fraction.n}/${fraction.d}`;
      decInput = null;
      pctInput = null;
    } else if (badge === 'dec') {
      decInput = decimalStr;
      fracInput = null;
      pctInput = null;
    } else {
      pctInput = (v * 100).toPrecision(4).replace(/\.?0+$/, '');
      fracInput = null;
      decInput = null;
    }
  }

  function blurFrac() {
    if (fracInput !== null) commitFrac(fracInput);
    fracInput = null;
  }

  function blurDec() {
    if (decInput !== null) commitDec(decInput);
    decInput = null;
  }

  function blurPct() {
    if (pctInput !== null) commitPct(pctInput);
    pctInput = null;
  }

  function keydownFrac(e: KeyboardEvent) {
    if (e.key === 'Enter') { blurFrac(); (e.target as HTMLElement).blur(); }
    if (e.key === 'Escape') { fracInput = null; }
  }

  function keydownDec(e: KeyboardEvent) {
    if (e.key === 'Enter') { blurDec(); (e.target as HTMLElement).blur(); }
    if (e.key === 'Escape') { decInput = null; }
  }

  function keydownPct(e: KeyboardEvent) {
    if (e.key === 'Enter') { blurPct(); (e.target as HTMLElement).blur(); }
    if (e.key === 'Escape') { pctInput = null; }
  }
</script>

<div class="widget">
  <!-- ── number line stage ──────────────────────────────────────────────── -->
  <div class="stage" aria-label="Number line from 0 to 1">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {SVG_W} {SVG_H}"
      width={SVG_W}
      height={SVG_H}
      role="presentation"
      aria-hidden="true"
      style="width:100%;height:auto;display:block;touch-action:none;user-select:none;-webkit-user-select:none;"
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
    >
      <!-- axis line -->
      <line
        x1={LINE_X0} y1={LINE_Y}
        x2={LINE_X1} y2={LINE_Y}
        stroke="var(--site-fg-muted)"
        stroke-width="2"
        stroke-linecap="round"
      />

      <!-- ticks -->
      {#each ticks as tick}
        <line
          x1={tick.x} y1={LINE_Y - (tick.label ? 8 : 4)}
          x2={tick.x} y2={LINE_Y + (tick.label ? 8 : 4)}
          stroke="var(--site-fg-muted)"
          stroke-width={tick.label ? 1.5 : 1}
          opacity={tick.label ? 0.7 : 0.35}
        />
        {#if tick.label}
          <text
            x={tick.x}
            y={LINE_Y + 22}
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="11"
            fill="var(--site-fg-muted)"
          >{tick.label}</text>
        {/if}
      {/each}

      <!-- drag hit area (wide strip for easy pointer capture) -->
      <rect
        x={LINE_X0 - DOT_R}
        y={LINE_Y - 24}
        width={LINE_LEN + DOT_R * 2}
        height={48}
        fill="transparent"
        style="cursor:{dragging ? 'grabbing' : 'grab'}"
        onpointerdown={onPointerDown}
      />

      <!-- filled track -->
      <line
        x1={LINE_X0} y1={LINE_Y}
        x2={dotX}    y2={LINE_Y}
        stroke="var(--ink-coral)"
        stroke-width="3"
        stroke-linecap="round"
        opacity="0.55"
      />

      <!-- dot (decorative, behind the keyboard element) -->
      <circle
        cx={dotX}
        cy={LINE_Y}
        r={DOT_R}
        fill="var(--ink-coral)"
        stroke="var(--demo-card)"
        stroke-width="2.5"
        style="filter:drop-shadow(0 2px 6px color-mix(in srgb, var(--ink-coral) 40%, transparent));transition:cx 60ms ease-out;"
        aria-hidden="true"
      />
    </svg>

    <!-- keyboard-accessible dot overlay -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="dot-kb"
      tabindex="0"
      role="slider"
      aria-label="Value on number line"
      aria-valuenow={Math.round(v * 1000) / 1000}
      aria-valuemin={0}
      aria-valuemax={1}
      style="left:calc({(v - 0) / 1 * 100}% * {LINE_LEN / SVG_W} + {LINE_X0 / SVG_W * 100}%);"
      onkeydown={onDotKeyDown}
    ></div>
  </div>

  <!-- ── badge row ──────────────────────────────────────────────────────── -->
  <div class="badges" aria-live="polite">
    <!-- Fraction badge -->
    <div class="badge badge-frac">
      <span class="badge-label">Fraction</span>
      {#if fracInput !== null}
        <input
          class="badge-input"
          type="text"
          bind:value={fracInput}
          onblur={blurFrac}
          onkeydown={keydownFrac}
          aria-label="Enter fraction"
          autocomplete="off"
          spellcheck={false}
        />
      {:else}
        <button
          class="badge-val badge-val-frac"
          onclick={() => startEdit('frac')}
          title="Click to edit fraction"
          aria-label="Fraction: {fraction.n}/{fraction.d}. Click to edit."
        >
          <span class="frac-num">{fraction.n}</span>
          <span class="frac-bar"></span>
          <span class="frac-den">{fraction.d}</span>
        </button>
      {/if}
      <label class="toggle-row">
        <input type="checkbox" bind:checked={lowestTerms} />
        <span class="toggle-label">lowest terms</span>
      </label>
    </div>

    <!-- Decimal badge -->
    <div class="badge badge-dec">
      <span class="badge-label">Decimal</span>
      {#if decInput !== null}
        <input
          class="badge-input"
          type="text"
          bind:value={decInput}
          onblur={blurDec}
          onkeydown={keydownDec}
          aria-label="Enter decimal"
          autocomplete="off"
          spellcheck={false}
        />
      {:else}
        <button
          class="badge-val"
          onclick={() => startEdit('dec')}
          title="Click to edit decimal"
          aria-label="Decimal: {decimalStr}. Click to edit."
        >
          {decimalStr}
        </button>
      {/if}
    </div>

    <!-- Percent badge -->
    <div class="badge badge-pct">
      <span class="badge-label">Percent</span>
      {#if pctInput !== null}
        <input
          class="badge-input"
          type="text"
          bind:value={pctInput}
          onblur={blurPct}
          onkeydown={keydownPct}
          aria-label="Enter percent (without % sign)"
          autocomplete="off"
          spellcheck={false}
        />
      {:else}
        <button
          class="badge-val"
          onclick={() => startEdit('pct')}
          title="Click to edit percent"
          aria-label="Percent: {percentStr}. Click to edit."
        >
          {percentStr}
        </button>
      {/if}
    </div>
  </div>

  <!-- ── caption ────────────────────────────────────────────────────────── -->
  <p class="caption">Drag the dot, or click any value to edit. One number, three ways to write it.</p>
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    circle { transition: none !important; }
  }

  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(14px, 2.5vw, 20px);
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* ── stage ── */
  .stage {
    background: var(--demo-stage);
    border-radius: 12px;
    padding: 4px 0;
    position: relative;
    overflow: visible;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  /* invisible keyboard-accessible slider overlay positioned over the dot */
  .dot-kb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    outline: none;
    cursor: grab;
  }
  .dot-kb:focus-visible {
    box-shadow: 0 0 0 3px var(--demo-card), 0 0 0 5px var(--ink-coral);
  }

  /* ── badges ── */
  .badges {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  @media (max-width: 480px) {
    .badges {
      grid-template-columns: 1fr;
    }
  }

  .badge {
    background: var(--demo-stage);
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 80px;
  }

  .badge-frac {
    border: 1.5px solid color-mix(in srgb, var(--ink-red) 35%, transparent);
  }
  .badge-dec {
    border: 1.5px solid color-mix(in srgb, var(--ink-sea) 35%, transparent);
  }
  .badge-pct {
    border: 1.5px solid color-mix(in srgb, var(--ink-teal) 35%, transparent);
  }

  .badge-label {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
    font-weight: 600;
  }
  .badge-frac .badge-label { color: color-mix(in srgb, var(--ink-red) 70%, var(--site-fg-muted)); }
  .badge-dec  .badge-label { color: color-mix(in srgb, var(--ink-sea) 70%, var(--site-fg-muted)); }
  .badge-pct  .badge-label { color: color-mix(in srgb, var(--ink-teal) 70%, var(--site-fg-muted)); }

  /* editable value button */
  .badge-val {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 700;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
    background: transparent;
    border: none;
    padding: 0;
    cursor: text;
    text-align: left;
    line-height: 1.1;
    min-height: 44px;
    display: flex;
    align-items: center;
    border-radius: 4px;
    transition: color 80ms;
  }
  .badge-frac .badge-val { color: var(--ink-red); }
  .badge-dec  .badge-val { color: var(--ink-sea); }
  .badge-pct  .badge-val { color: var(--ink-teal); }

  .badge-val:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-style: dashed;
  }

  /* fraction layout */
  .badge-val-frac {
    flex-direction: column;
    gap: 1px;
    font-size: 18px;
  }
  .frac-num {
    display: block;
    text-align: center;
    line-height: 1;
    width: 100%;
  }
  .frac-bar {
    display: block;
    border-top: 2px solid var(--ink-red);
    width: 100%;
    height: 0;
    overflow: hidden;
    color: transparent;
    font-size: 0;
    line-height: 0;
    margin: 2px 0;
  }
  .frac-den {
    display: block;
    text-align: center;
    line-height: 1;
    width: 100%;
  }

  /* editable input */
  .badge-input {
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 700;
    color: var(--site-fg);
    background: color-mix(in srgb, var(--site-fg) 6%, transparent);
    border: 2px solid color-mix(in srgb, var(--ink-coral) 60%, transparent);
    border-radius: 6px;
    padding: 4px 6px;
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    outline: none;
  }
  .badge-frac .badge-input { border-color: var(--ink-red); }
  .badge-dec  .badge-input { border-color: var(--ink-sea); }
  .badge-pct  .badge-input { border-color: var(--ink-teal); }

  /* lowest terms toggle */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    margin-top: auto;
    padding-top: 4px;
  }
  .toggle-row input[type="checkbox"] {
    accent-color: var(--ink-red);
    width: 14px;
    height: 14px;
    cursor: pointer;
  }
  .toggle-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--site-fg-muted);
    user-select: none;
  }

  /* ── caption ── */
  .caption {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    text-align: center;
  }
</style>
