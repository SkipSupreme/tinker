<script lang="ts">
  import { Mafs, Coordinates, MovablePoint, Point, Plot, Text, Circle, Vector } from 'svelte-mafs';

  /**
   * RotatePoint: the rotation map (x, y) ↦ (x·cosθ − y·sinθ, x·sinθ + y·cosθ)
   * presented as a function on PAIRS.
   *
   * The learner drags two geometric objects (never a slider):
   *   • P  — a free draggable point, the input pair.
   *   • the ANGLE DIAL — a point constrained to a unit guide circle; its
   *     polar angle IS the rotation angle θ.
   *
   * P' is computed by the rotation formula and drawn. A circular arc from
   * P to P' shows the path of the rotation.
   *
   * The "RoPE view" toggle reframes the same math as rotary positional
   * embedding — the positional scheme inside LLaMA 2/3, Mistral, Gemma,
   * Code-LLaMA, and PaLM.
   */

  const DIAL_R = 1;
  const LIM = 4.4; // clamp bound (just inside viewBox)

  // The input pair P — free drag, clamped to the viewBox.
  let px = $state(3);
  let py = $state(1);

  // The angle dial — constrained to the guide circle of radius DIAL_R.
  let dialX = $state(DIAL_R * Math.cos(Math.PI / 6));
  let dialY = $state(DIAL_R * Math.sin(Math.PI / 6));

  // RoPE reframing toggle.
  let rope = $state(false);

  // θ derived from the dial's polar angle, normalized to [0, 2π).
  const theta = $derived(((Math.atan2(dialY, dialX)) + 2 * Math.PI) % (2 * Math.PI));
  const cosT = $derived(Math.cos(theta));
  const sinT = $derived(Math.sin(theta));

  // The rotated pair P'.
  const ppx = $derived(px * cosT - py * sinT);
  const ppy = $derived(px * sinT + py * cosT);

  // Radius and base angle of P, for the connecting arc.
  const opMag = $derived(Math.hypot(px, py));
  const pAngle = $derived(Math.atan2(py, px));

  const clamp = (v: number) => Math.max(-LIM, Math.min(LIM, v));
  const fmt = (n: number) => {
    const s = n.toFixed(2);
    return n >= 0 ? s : `(${s})`;
  };
  const fmtDeg = () => `${((theta * 180) / Math.PI).toFixed(0)}°`;
</script>

<div class="widget">
  <div class="controls">
    <div class="title">
      {#if rope}
        <span>rotary positional embedding — <em>q′ = R(mθ<sub>i</sub>) q</em></span>
      {:else}
        <span>rotation map — <em>(x, y) ↦ (x cosθ − y sinθ,&nbsp; x sinθ + y cosθ)</em></span>
      {/if}
    </div>
    <button
      type="button"
      class="toggle"
      class:on={rope}
      aria-pressed={rope}
      onclick={() => (rope = !rope)}
    >
      RoPE view{rope ? ' · on' : ''}
    </button>
  </div>

  <div class="stage">
    <Mafs width={520} height={460} viewBox={{ x: [-4.5, 4.5], y: [-4.5, 4.5] }}>
      <Coordinates.Cartesian />

      <!-- Faint guide circle the angle dial rides on. -->
      <Circle
        center={[0, 0]}
        radius={DIAL_R}
        color="var(--ink-sea)"
        weight={1.25}
        strokeOpacity={0.55}
        fillColor="var(--ink-sea)"
        fillOpacity={0.05}
      />

      <!-- Radius vectors O→P and O→P'. -->
      <Vector tail={[0, 0]} tip={[px, py]} color="var(--ink-red)" weight={1.5} opacity={0.45} />
      <Vector tail={[0, 0]} tip={[ppx, ppy]} color="var(--ink-sun)" weight={1.5} opacity={0.55} />

      <!-- Circular arc carrying P to P' (radius |OP|, swept by θ). -->
      <Plot.Parametric
        xy={(t) => [opMag * Math.cos(pAngle + t), opMag * Math.sin(pAngle + t)]}
        t={[0, theta]}
        color="var(--ink-coral)"
        weight={2}
        opacity={0.9}
      />

      <!-- The rotated pair P'. -->
      <Point x={ppx} y={ppy} color="var(--ink-sun)" />
      <Text x={ppx} y={ppy + 0.45} latex={rope ? "q'" : "P'"} size={18} color="var(--ink-sun)" />

      <!-- The angle dial — drag around the guide circle. -->
      <MovablePoint
        bind:x={dialX}
        bind:y={dialY}
        color="var(--ink-coral)"
        constrain={([x, y]) => {
          const m = Math.hypot(x, y) || 1;
          return [(x / m) * DIAL_R, (y / m) * DIAL_R];
        }}
        label="rotation angle θ"
      />

      <!-- The input pair P — free drag, clamped to the viewBox. -->
      <MovablePoint
        bind:x={px}
        bind:y={py}
        color="var(--ink-red)"
        constrain={([x, y]) => [clamp(x), clamp(y)]}
        label={rope ? 'query pair (q1, q2)' : 'input pair P'}
      />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="given">
      {#if rope}
        <span><b>q₁</b> = {px.toFixed(2)}</span>
        <span><b>q₂</b> = {py.toFixed(2)}</span>
        <span><b>mθ<sub>i</sub></b> = {fmtDeg()}</span>
      {:else}
        <span><b>x</b> = {px.toFixed(2)}</span>
        <span><b>y</b> = {py.toFixed(2)}</span>
        <span><b>θ</b> = {fmtDeg()}</span>
      {/if}
      <span>cosθ = {cosT.toFixed(3)}</span>
      <span>sinθ = {sinT.toFixed(3)}</span>
    </div>
    <pre class="steps">x' = x·cosθ − y·sinθ = ({px.toFixed(2)})({cosT.toFixed(3)}) − ({py.toFixed(2)})({sinT.toFixed(3)}) = {ppx.toFixed(3)}
y' = x·sinθ + y·cosθ = ({px.toFixed(2)})({sinT.toFixed(3)}) + ({py.toFixed(2)})({cosT.toFixed(3)}) = {ppy.toFixed(3)}</pre>
    <div class="result">
      {rope ? "q'" : "P'"} = ({ppx.toFixed(2)}, {ppy.toFixed(2)})
    </div>
  </div>

  {#if rope}
    <p class="caption">
      This is rotary positional embedding (RoPE) — the positional scheme inside
      LLaMA 2/3, Mistral, Gemma, Code-LLaMA, and PaLM. The angle is proportional
      to the token's position. You will meet it again in the attention module.
    </p>
  {/if}
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
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .title {
    font-family: var(--font-display);
    font-size: 0.95rem;
    color: var(--site-fg);
  }
  .title em {
    font-style: italic;
    font-family: var(--font-mono);
    font-size: 0.88rem;
    color: var(--site-fg-muted);
  }

  .toggle {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--demo-card-border);
    background: var(--demo-stage);
    color: var(--site-fg-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .toggle:hover {
    border-color: var(--ink-teal);
    color: var(--site-fg);
  }
  .toggle.on {
    background: color-mix(in srgb, var(--ink-teal) 18%, transparent);
    border-color: var(--ink-teal);
    color: var(--site-fg);
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

  .readout {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    font-family: var(--font-mono);
  }
  .given {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.1rem;
    font-size: 0.84rem;
    color: var(--site-fg-muted);
  }
  .given b {
    color: var(--site-fg);
    font-weight: 700;
  }
  .steps {
    margin: 0;
    padding: 0.7rem 0.85rem;
    background: var(--demo-stage);
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.7;
    color: var(--site-fg);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .result {
    font-size: 1rem;
    font-weight: 700;
    color: var(--cta-hover);
  }

  .caption {
    margin: 0;
    padding: 0.7rem 0.85rem;
    background: color-mix(in srgb, var(--ink-teal) 10%, transparent);
    border-left: 3px solid var(--ink-teal);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 0.84rem;
    line-height: 1.55;
    color: var(--site-fg);
  }

  @media (max-width: 520px) {
    .controls {
      flex-direction: column;
      align-items: flex-start;
    }
    .title {
      font-size: 0.86rem;
    }
    .title em {
      font-size: 0.78rem;
    }
    .steps {
      font-size: 0.72rem;
    }
    .given {
      font-size: 0.78rem;
    }
  }
</style>
