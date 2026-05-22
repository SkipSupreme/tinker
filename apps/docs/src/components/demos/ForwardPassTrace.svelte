<script lang="ts">
  /**
   * ForwardPassTrace — M11.5. Drag the input; watch a real 2-3-1 MLP run
   * from input to output as a sequence of vectors. Every stage is a
   * matmul + bias or an elementwise nonlinearity — nothing else. This is
   * the worked example 2.4 from the M11 research brief.
   */
  import { Mafs, Coordinates, MovablePoint } from 'svelte-mafs';

  // Fixed weights — the brief's canonical 2-3-1 net.
  const W1 = [
    [0.5, -0.2],
    [0.1, 0.4],
    [-0.3, 0.6],
  ];
  const b1 = [0, 0.1, -0.2];
  const W2 = [1.0, -1.0, 0.5];
  const b2 = 0;

  let x1 = $state(1);
  let x2 = $state(1);

  const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

  const z1 = $derived([0, 1, 2].map((i) => W1[i][0] * x1 + W1[i][1] * x2 + b1[i]));
  const h1 = $derived(z1.map(sigmoid));
  const z2 = $derived(W2[0] * h1[0] + W2[1] * h1[1] + W2[2] * h1[2] + b2);
  const yhat = $derived(z2);

  type Stage = { label: string; kind: string; values: number[] };
  const stages = $derived<Stage[]>([
    { label: 'input  x', kind: 'the two numbers you feed in', values: [x1, x2] },
    { label: 'z⁽¹⁾ = W⁽¹⁾x + b⁽¹⁾', kind: 'hidden pre-activation — one matmul plus a bias', values: z1 },
    { label: 'h⁽¹⁾ = σ(z⁽¹⁾)', kind: 'hidden activation — sigmoid, applied to each entry', values: h1 },
    { label: 'ŷ = W⁽²⁾h⁽¹⁾ + b⁽²⁾', kind: 'output — a second matmul, no activation (regression)', values: [yhat] },
  ]);

  let stage = $state(0);

  // map a value to a fill: coral for negative, sea for positive, opacity ~ |v|
  function cell(v: number): string {
    const mag = Math.min(1, Math.abs(v) / 1.5);
    const base = v >= 0 ? '--ink-sea' : '--ink-coral';
    return `color-mix(in srgb, var(${base}) ${15 + mag * 70}%, transparent)`;
  }
  const fmt = (n: number) => (Object.is(n, -0) ? '0.000' : n.toFixed(3));
</script>

<div class="widget">
  <div class="top">
    <div class="input-stage">
      <p class="cap">drag the input</p>
      <div class="stage-box">
        <Mafs width={240} height={220} viewBox={{ x: [-2.2, 2.2], y: [-2.2, 2.2] }}>
          <Coordinates.Cartesian />
          <MovablePoint bind:x={x1} bind:y={x2} color="var(--ink-red)" />
        </Mafs>
      </div>
      <code class="xread">x = ({fmt(x1)}, {fmt(x2)})</code>
    </div>

    <div class="flow">
      {#each stages as s, i (i)}
        <div class="chip" class:active={i === stage} class:done={i < stage}>
          <code class="chip-label">{s.label}</code>
          <div class="cells">
            {#each s.values as v, vi (vi)}
              <span class="num" style="background:{cell(v)}">{fmt(v)}</span>
            {/each}
          </div>
        </div>
        {#if i < stages.length - 1}<span class="arrow">→</span>{/if}
      {/each}
    </div>
  </div>

  <div class="explain">
    <div class="walk">
      <button onclick={() => (stage = Math.max(0, stage - 1))} disabled={stage === 0}>‹ back</button>
      <span class="step-of">stage {stage + 1} / {stages.length}</span>
      <button onclick={() => (stage = Math.min(stages.length - 1, stage + 1))} disabled={stage === stages.length - 1}>next ›</button>
    </div>
    <p class="desc">{stages[stage].kind}</p>
    {#if stage === stages.length - 1}
      <p class="punch">A forward pass is two matmuls and one sigmoid. There is no
      magic here — it is arithmetic in a loop.</p>
    {/if}
  </div>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border, var(--site-border));
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }
  .top { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
  .input-stage { display: flex; flex-direction: column; gap: 0.35rem; }
  .cap {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .stage-box {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .stage-box :global(svg) { display: block; width: 100%; height: auto; }
  .xread { font-family: var(--font-mono); font-size: 0.82rem; color: var(--site-fg); }

  .flow {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    flex: 1 1 16rem;
  }
  .chip {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.55rem 0.6rem;
    border-radius: 10px;
    border: 1.5px solid var(--site-border);
    background: var(--demo-stage, var(--site-surface));
    opacity: 0.5;
    transition: opacity 160ms ease, border-color 160ms ease;
  }
  .chip.active { opacity: 1; border-color: var(--ink-red); }
  .chip.done { opacity: 0.82; }
  .chip-label { font-family: var(--font-mono); font-size: 0.72rem; color: var(--site-fg); }
  .cells { display: flex; flex-direction: column; gap: 0.22rem; }
  .num {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    padding: 0.16rem 0.4rem;
    border-radius: 5px;
    text-align: right;
    color: var(--site-fg);
    min-width: 4.2rem;
  }
  .arrow { color: var(--site-fg-muted); font-size: 1.1rem; }

  .explain {
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .walk { display: flex; align-items: center; gap: 0.6rem; }
  .walk button {
    font-family: var(--font-body);
    font-size: 0.8rem;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    cursor: pointer;
  }
  .walk button:disabled { opacity: 0.35; cursor: not-allowed; }
  .step-of { font-family: var(--font-mono); font-size: 0.78rem; color: var(--site-fg-muted); }
  .desc { margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--site-fg); }
  .punch {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--site-fg);
    font-style: italic;
  }
</style>
