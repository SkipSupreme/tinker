<script lang="ts">
  /**
   * ProductRuleRectangle — M5.4. A rectangle whose width is u(t) and
   * height v(t). Scrubbing t grows two strips (u·dv on top, v·du on
   * right) plus a tiny corner square (du·dv). Shrink dt and the corner
   * visibly vanishes faster than the strips — the geometric reason
   * (uv)' = u'v + uv'.
   */

  // u(t) and v(t) chosen so both stay positive and visibly co-vary
  // across t ∈ [0, π/2].
  const u = (t: number) => 1.4 + Math.sin(t);
  const v = (t: number) => 1.2 + 0.7 * t;
  const uPrime = (t: number) => Math.cos(t);
  const vPrime = (_t: number) => 0.7;

  let t = $state(0.55);
  let dt = $state(0.35);

  const T_MAX = Math.PI / 2 - 0.05;

  const u0 = $derived(u(t));
  const v0 = $derived(v(t));
  const u1 = $derived(u(Math.min(T_MAX + 0.5, t + dt)));
  const v1 = $derived(v(Math.min(T_MAX + 0.5, t + dt)));

  const du = $derived(u1 - u0);
  const dv = $derived(v1 - v0);

  const oldArea = $derived(u0 * v0);
  const stripTop = $derived(u0 * dv);   // u · dv
  const stripRight = $derived(v0 * du); // v · du
  const corner = $derived(du * dv);     // du · dv
  const newArea = $derived(u1 * v1);

  // limit prediction: (uv)' dt = (u'v + uv') dt
  const linearPrediction = $derived(
    (uPrime(t) * v0 + u0 * vPrime(t)) * dt,
  );

  // SVG layout
  const PAD = 26;
  const W = 360;
  const H = 280;
  const SCALE = 70; // px per math unit
  const ORIGIN_X = PAD;
  const ORIGIN_Y = H - PAD;

  function mx(x: number) {
    return ORIGIN_X + x * SCALE;
  }
  function my(y: number) {
    return ORIGIN_Y - y * SCALE;
  }

  const fmt = (n: number) => (Math.abs(n) < 0.005 ? '0.00' : n.toFixed(2));
</script>

<div class="widget">
  <div class="picture">
    <svg viewBox={`0 0 ${W} ${H}`} aria-label="product rule rectangle">
      <!-- axes -->
      <line
        x1={ORIGIN_X}
        y1={ORIGIN_Y}
        x2={W - PAD / 2}
        y2={ORIGIN_Y}
        stroke="var(--site-fg-muted)"
        stroke-width="1"
        opacity="0.45"
      />
      <line
        x1={ORIGIN_X}
        y1={ORIGIN_Y}
        x2={ORIGIN_X}
        y2={PAD / 2}
        stroke="var(--site-fg-muted)"
        stroke-width="1"
        opacity="0.45"
      />

      <!-- new (outer) rectangle, faint -->
      <rect
        x={mx(0)}
        y={my(v1)}
        width={u1 * SCALE}
        height={v1 * SCALE}
        fill="none"
        stroke="var(--site-fg-muted)"
        stroke-dasharray="3 3"
        stroke-width="1"
        opacity="0.6"
      />

      <!-- top strip: u · dv -->
      <rect
        x={mx(0)}
        y={my(v1)}
        width={u0 * SCALE}
        height={dv * SCALE}
        fill="color-mix(in srgb, var(--ink-sea) 36%, transparent)"
        stroke="var(--ink-sea)"
        stroke-width="1.2"
      />

      <!-- right strip: v · du -->
      <rect
        x={mx(u0)}
        y={my(v0)}
        width={du * SCALE}
        height={v0 * SCALE}
        fill="color-mix(in srgb, var(--ink-coral) 36%, transparent)"
        stroke="var(--ink-coral)"
        stroke-width="1.2"
      />

      <!-- corner: du · dv -->
      <rect
        x={mx(u0)}
        y={my(v1)}
        width={du * SCALE}
        height={dv * SCALE}
        fill="color-mix(in srgb, var(--ink-sun) 60%, transparent)"
        stroke="var(--ink-sun)"
        stroke-width="1.2"
      />

      <!-- original (inner) rectangle -->
      <rect
        x={mx(0)}
        y={my(v0)}
        width={u0 * SCALE}
        height={v0 * SCALE}
        fill="color-mix(in srgb, var(--ink-red) 18%, transparent)"
        stroke="var(--ink-red)"
        stroke-width="1.6"
      />

      <!-- axis labels -->
      <text
        x={mx(u0 / 2)}
        y={ORIGIN_Y + 16}
        text-anchor="middle"
        font-family="var(--font-mono)"
        font-size="11"
        fill="var(--ink-red)"
      >u = {fmt(u0)}</text>
      <text
        x={mx(u0) + 10}
        y={ORIGIN_Y + 16}
        text-anchor="start"
        font-family="var(--font-mono)"
        font-size="11"
        fill="var(--ink-coral)"
      >+ du = {fmt(du)}</text>
      <text
        x={ORIGIN_X - 8}
        y={my(v0 / 2)}
        text-anchor="end"
        dominant-baseline="middle"
        font-family="var(--font-mono)"
        font-size="11"
        fill="var(--ink-red)"
      >v = {fmt(v0)}</text>
      <text
        x={ORIGIN_X - 8}
        y={my(v0) - 8}
        text-anchor="end"
        dominant-baseline="middle"
        font-family="var(--font-mono)"
        font-size="11"
        fill="var(--ink-sea)"
      >+ dv = {fmt(dv)}</text>
    </svg>
  </div>

  <div class="sliders">
    <label class="slider-field">
      <span class="slider-label">t = {t.toFixed(2)}</span>
      <input
        type="range"
        min="0"
        max={T_MAX}
        step="0.01"
        bind:value={t}
        aria-label="scrub the parameter t"
      />
    </label>
    <label class="slider-field">
      <span class="slider-label">dt = {dt.toFixed(2)}</span>
      <input
        type="range"
        min="0.02"
        max="0.6"
        step="0.01"
        bind:value={dt}
        aria-label="shrink dt to see what survives the limit"
      />
    </label>
  </div>

  <div class="legend">
    <div class="row">
      <span class="swatch red"></span>
      <code>u · v</code>
      <span class="val">= {fmt(oldArea)}</span>
      <span class="tag">old area</span>
    </div>
    <div class="row">
      <span class="swatch sea"></span>
      <code>u · dv</code>
      <span class="val">= {fmt(stripTop)}</span>
      <span class="tag">top strip (height grows)</span>
    </div>
    <div class="row">
      <span class="swatch coral"></span>
      <code>v · du</code>
      <span class="val">= {fmt(stripRight)}</span>
      <span class="tag">right strip (width grows)</span>
    </div>
    <div class="row">
      <span class="swatch sun"></span>
      <code>du · dv</code>
      <span class="val">= {fmt(corner)}</span>
      <span class="tag">corner — vanishes faster than dt</span>
    </div>
  </div>

  <p class="punch">
    The change in area is <code>u·dv + v·du + du·dv</code>. Divide by <code>dt</code>:
    two finite slopes plus one tiny piece. Send <code>dt → 0</code>; the corner
    dies. What is left is <code>(uv)' = u·v' + v·u'</code>.
  </p>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border, var(--site-border));
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .picture {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    padding: 0.4rem;
    display: flex;
    justify-content: center;
  }

  .picture svg {
    width: 100%;
    max-width: 460px;
    height: auto;
  }

  .sliders {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .slider-field {
    flex: 1 1 14rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .slider-label {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
  }

  .slider-field input[type='range'] {
    width: 100%;
    accent-color: var(--ink-sun);
    cursor: pointer;
  }

  .legend {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.3rem;
    padding-top: 0.5rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }

  .row {
    display: grid;
    grid-template-columns: 1rem 5.5rem 4.5rem 1fr;
    align-items: center;
    gap: 0.6rem;
    font-family: var(--font-mono);
    font-size: 0.84rem;
    color: var(--site-fg);
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .swatch.red {
    background: color-mix(in srgb, var(--ink-red) 30%, transparent);
    border: 1.2px solid var(--ink-red);
  }
  .swatch.sea {
    background: color-mix(in srgb, var(--ink-sea) 36%, transparent);
    border: 1.2px solid var(--ink-sea);
  }
  .swatch.coral {
    background: color-mix(in srgb, var(--ink-coral) 36%, transparent);
    border: 1.2px solid var(--ink-coral);
  }
  .swatch.sun {
    background: color-mix(in srgb, var(--ink-sun) 60%, transparent);
    border: 1.2px solid var(--ink-sun);
  }

  .val {
    font-variant-numeric: tabular-nums;
    color: var(--site-fg-muted);
    text-align: right;
  }

  .tag {
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .punch {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.86rem;
    line-height: 1.6;
    color: var(--site-fg);
  }

  .punch code {
    font-family: var(--font-mono);
    font-size: 0.84em;
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    padding: 0.05em 0.3em;
    border-radius: 4px;
  }

  @media (max-width: 480px) {
    .row {
      grid-template-columns: 1rem 5rem 4rem;
    }
    .tag {
      display: none;
    }
  }
</style>
