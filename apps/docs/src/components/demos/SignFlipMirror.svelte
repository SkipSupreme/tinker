<script lang="ts">
  interface Props {
    start?: number;
    domain?: [number, number];
  }

  let { start = 3, domain = [-10, 10] }: Props = $props();

  // ── state ─────────────────────────────────────────────────────────────────
  let v = $state(start);
  let reflections = $state(0);

  // animation state
  let animating = $state(false);
  let arcProgress = $state(0); // 0→1 during the flip arc animation
  let arcFrom = $state(0);     // value the arc starts from (pre-flip)

  // ── derived ───────────────────────────────────────────────────────────────
  const isNegative = $derived(v < 0);
  const parity = $derived(reflections % 2 === 0 ? 'even' : 'odd');
  const paritySign = $derived(reflections % 2 === 0 ? 'positive' : 'negative');

  const productExpr = $derived.by(() => {
    if (reflections === 0) return `${start}`;
    const minuses = Array(reflections).fill('(−1)').join(' · ');
    return `${minuses} · ${start} = ${v}`;
  });

  // ── SVG layout constants ──────────────────────────────────────────────────
  const SVG_W = 560;
  const SVG_H = 120;
  const PAD_L = 28;
  const PAD_R = 28;
  const AXIS_Y = 68;
  const LABEL_Y = AXIS_Y + 18;
  const lineW = SVG_W - PAD_L - PAD_R;

  function xForVal(val: number): number {
    const [lo, hi] = domain;
    return PAD_L + ((val - lo) / (hi - lo)) * lineW;
  }

  // tick integers within domain
  const ticks = $derived.by(() => {
    const [lo, hi] = domain;
    const out: number[] = [];
    for (let i = Math.ceil(lo); i <= Math.floor(hi); i++) out.push(i);
    return out;
  });

  // ── animated arc path (a semicircle from arcFrom to −arcFrom) ─────────────
  // We draw the arc as a partial path parameterised by arcProgress.
  // The arc sweeps over zero so the radius = |arcFrom|, center = 0.
  const arcPath = $derived.by(() => {
    if (!animating && arcProgress === 0) return '';
    const r = Math.abs(arcFrom);
    if (r === 0) return '';
    const cx = xForVal(0);
    // The sweep: start at xForVal(arcFrom), arc over the top (above axis)
    // ending at xForVal(-arcFrom). We parameterise by angle from π to 0
    // (going left-to-right in screen space, above axis).
    const startAngle = arcFrom > 0 ? Math.PI : 0;      // point on circle at arcFrom
    const endAngle   = arcFrom > 0 ? 0       : Math.PI; // point on circle at −arcFrom
    // current angle
    const angle = startAngle + (endAngle - startAngle) * arcProgress;
    // px radius = distance from 0 to arcFrom on screen
    const pxR = Math.abs(xForVal(arcFrom) - xForVal(0));
    // arc starts at xForVal(arcFrom), y=AXIS_Y
    const x0 = xForVal(arcFrom);
    const y0 = AXIS_Y;
    // current point
    const curX = cx + pxR * Math.cos(angle);
    const curY = AXIS_Y - pxR * Math.abs(Math.sin(angle)); // above axis
    if (arcProgress < 0.005) return `M ${x0} ${y0}`;
    // large-arc-flag=0, sweep-flag= arcFrom>0 ? 1 : 0
    const sweepFlag = arcFrom > 0 ? 1 : 0;
    // partial arc: just draw a line to current position via an arc
    // Use two-point arc approximation with current point
    return `M ${x0} ${y0} A ${pxR} ${pxR} 0 0 ${sweepFlag} ${curX.toFixed(2)} ${curY.toFixed(2)}`;
  });

  // ── interactions ──────────────────────────────────────────────────────────
  let svgEl: SVGSVGElement | undefined = $state();
  let dragging = $state(false);

  function valFromClientX(clientX: number): number {
    if (!svgEl) return v;
    const rect = svgEl.getBoundingClientRect();
    const scaleX = SVG_W / rect.width;
    const px = (clientX - rect.left) * scaleX;
    const [lo, hi] = domain;
    const raw = lo + ((px - PAD_L) / lineW) * (hi - lo);
    return Math.max(lo, Math.min(hi, Math.round(raw)));
  }

  function onPointerDown(e: PointerEvent) {
    if (animating) return;
    dragging = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    v = valFromClientX(e.clientX);
    reflections = 0;
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging || animating) return;
    v = valFromClientX(e.clientX);
  }
  function onPointerUp() { dragging = false; }

  function onKeyDown(e: KeyboardEvent) {
    if (animating) return;
    const [lo, hi] = domain;
    if (e.key === 'ArrowRight') { e.preventDefault(); v = Math.min(hi, v + 1); reflections = 0; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); v = Math.max(lo, v - 1); reflections = 0; }
  }

  // ── reflect animation ─────────────────────────────────────────────────────
  let rafId = 0;
  const ARC_DURATION = 420; // ms

  function reflect() {
    if (animating || v === 0) return;
    arcFrom = v;
    arcProgress = 0;
    animating = true;

    const target = -v;
    const startTime = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - startTime) / ARC_DURATION);
      // ease: smoothstep
      const ease = t * t * (3 - 2 * t);
      arcProgress = ease;

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        arcProgress = 0;
        animating = false;
        v = target;
        reflections += 1;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function reset() {
    if (rafId) cancelAnimationFrame(rafId);
    animating = false;
    arcProgress = 0;
    v = start;
    reflections = 0;
  }

  // ── animated point position ───────────────────────────────────────────────
  // While animating, the dot follows the arc
  const dotX = $derived.by(() => {
    if (!animating || arcProgress === 0) return xForVal(v);
    const cx = xForVal(0);
    const pxR = Math.abs(xForVal(arcFrom) - xForVal(0));
    const startAngle = arcFrom > 0 ? Math.PI : 0;
    const endAngle   = arcFrom > 0 ? 0       : Math.PI;
    const angle = startAngle + (endAngle - startAngle) * arcProgress;
    return cx + pxR * Math.cos(angle);
  });
  const dotY = $derived.by(() => {
    if (!animating || arcProgress === 0) return AXIS_Y;
    const pxR = Math.abs(xForVal(arcFrom) - xForVal(0));
    const startAngle = arcFrom > 0 ? Math.PI : 0;
    const endAngle   = arcFrom > 0 ? 0       : Math.PI;
    const angle = startAngle + (endAngle - startAngle) * arcProgress;
    return AXIS_Y - pxR * Math.abs(Math.sin(angle));
  });

  // sign color
  const dotColor = $derived(
    animating
      ? (arcFrom < 0 ? 'var(--ink-sea)' : 'var(--ink-red)')
      : (isNegative ? 'var(--ink-red)' : 'var(--ink-sea)')
  );

  // reduced-motion media query
  let prefersReducedMotion = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mq.matches;
    const handler = (e: MediaQueryListEvent) => { prefersReducedMotion = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });
</script>

<div class="widget">
  <!-- ── SVG number line ─────────────────────────────────────────────────── -->
  <div class="stage">
    <svg
      bind:this={svgEl}
      viewBox="0 0 {SVG_W} {SVG_H}"
      width={SVG_W}
      height={SVG_H}
      role="none"
      style="width:100%;height:auto;display:block;touch-action:none;"
    >
      <!-- axis line -->
      <line
        x1={PAD_L} y1={AXIS_Y}
        x2={SVG_W - PAD_R} y2={AXIS_Y}
        stroke="color-mix(in srgb, var(--site-fg) 28%, transparent)"
        stroke-width="2"
      />
      <!-- ticks + labels -->
      {#each ticks as t}
        {@const tx = xForVal(t)}
        {@const isZero = t === 0}
        <line
          x1={tx} y1={AXIS_Y - (isZero ? 10 : 5)}
          x2={tx} y2={AXIS_Y + (isZero ? 10 : 5)}
          stroke={isZero
            ? 'var(--site-fg)'
            : 'color-mix(in srgb, var(--site-fg) 35%, transparent)'}
          stroke-width={isZero ? 2 : 1}
        />
        <text
          x={tx}
          y={LABEL_Y + (isZero ? 4 : 0)}
          text-anchor="middle"
          font-family="var(--font-mono)"
          font-size={isZero ? '13' : '11'}
          font-weight={isZero ? '700' : '400'}
          fill={isZero
            ? 'var(--site-fg)'
            : 'color-mix(in srgb, var(--site-fg-muted) 80%, transparent)'}
        >
          {t === 0 ? '0' : t}
        </text>
      {/each}

      <!-- arc path (shown during animation or after progress > 0) -->
      {#if animating && !prefersReducedMotion && arcPath}
        <path
          d={arcPath}
          fill="none"
          stroke="var(--ink-coral)"
          stroke-width="2.5"
          stroke-dasharray="6 4"
          stroke-linecap="round"
          opacity="0.85"
        />
      {/if}

      <!-- draggable point -->
      <!-- invisible larger hit area -->
      <circle
        cx={xForVal(v)}
        cy={AXIS_Y}
        r="22"
        fill="transparent"
        style="cursor:{animating ? 'default' : 'ew-resize'}; touch-action:none;"
        tabindex="0"
        role="slider"
        aria-label="value point"
        aria-valuenow={v}
        aria-valuemin={domain[0]}
        aria-valuemax={domain[1]}
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={onPointerUp}
        onkeydown={onKeyDown}
      />
      <!-- visible dot -->
      <circle
        cx={dotX}
        cy={dotY}
        r="10"
        fill={dotColor}
        stroke="color-mix(in srgb, var(--site-fg) 15%, transparent)"
        stroke-width="1.5"
        style="pointer-events:none; transition: fill 240ms ease;"
      />
      <!-- value label above dot -->
      <text
        x={dotX}
        y={dotY - 16}
        text-anchor="middle"
        font-family="var(--font-mono)"
        font-size="13"
        font-weight="700"
        fill={dotColor}
        style="pointer-events:none;"
      >
        {animating ? arcFrom : v}
      </text>
    </svg>
  </div>

  <!-- ── controls ──────────────────────────────────────────────────────────── -->
  <div class="controls">
    <button
      class="btn-reflect"
      type="button"
      onclick={reflect}
      disabled={animating || v === 0}
      aria-label="Multiply by negative one, reflect across zero"
    >
      × (−1)
    </button>
    <button
      class="btn-reset"
      type="button"
      onclick={reset}
      aria-label="Reset to start value"
    >
      Reset
    </button>
  </div>

  <!-- ── readout ────────────────────────────────────────────────────────────── -->
  <div class="readout" aria-live="polite" aria-atomic="true">
    <div class="readout-row counter">
      <span class="readout-label">reflections</span>
      <span class="readout-value" style="color:var(--ink-coral);">{reflections}</span>
    </div>
    <div class="readout-row expr">
      <span class="readout-label">product</span>
      <span class="readout-value expr-val">{productExpr}</span>
    </div>
    <div class="readout-row parity" class:even={parity === 'even'} class:odd={parity === 'odd'}>
      <span class="readout-label">parity</span>
      <span class="readout-value parity-val">
        {parity} → {paritySign}
      </span>
    </div>
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(12px, 2vw, 20px);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 12px 32px -24px rgba(0, 0, 0, 0.18);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── stage ────────────────────────────────────────────────────────────── */
  .stage {
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    padding: 8px 0 4px;
  }

  /* ── controls ─────────────────────────────────────────────────────────── */
  .controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .btn-reflect,
  .btn-reset {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 700;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    min-height: 44px;
    padding: 0 20px;
    transition: transform 120ms ease-out, opacity 120ms;
  }

  .btn-reflect {
    background: var(--ink-coral);
    color: var(--demo-card);
    flex: 1;
  }
  .btn-reflect:hover:not(:disabled) { transform: translateY(-2px); }
  .btn-reflect:active:not(:disabled) { transform: translateY(0); }
  .btn-reflect:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-reset {
    background: var(--demo-stage);
    color: var(--site-fg-muted);
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    min-width: 80px;
  }
  .btn-reset:hover { transform: translateY(-1px); }
  .btn-reset:active { transform: translateY(0); }

  /* ── readout ──────────────────────────────────────────────────────────── */
  .readout {
    display: grid;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }

  .readout-row {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 8px;
    align-items: baseline;
  }

  .readout-label {
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--site-fg-muted);
  }

  .readout-value {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 600;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
  }

  .expr-val {
    font-size: 13px;
    font-weight: 500;
    word-break: break-word;
    color: var(--site-fg);
  }

  .parity-val {
    font-size: 13px;
  }

  .readout-row.even .parity-val { color: var(--ink-sea); }
  .readout-row.odd  .parity-val { color: var(--ink-red); }

  /* ── reduced motion ───────────────────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .btn-reflect,
    .btn-reset { transition: none; }
  }

  /* ── mobile ───────────────────────────────────────────────────────────── */
  @media (max-width: 639px) {
    .readout-row {
      grid-template-columns: 80px 1fr;
    }
    .btn-reflect {
      font-size: 16px;
    }
  }
</style>
