<script lang="ts">
  /**
   * ActivationZoo — M11.4. The four activations worth knowing, each shown
   * with its derivative so the vanishing-gradient story is visible, not
   * asserted. ReLU is hands-on: drag its kink along the x-axis and watch
   * the bias follow (the kink sits at x = −b/w).
   */
  import { Mafs, Coordinates, Line, MovablePoint, Text } from 'svelte-mafs';

  type Kind = 'relu' | 'sigmoid' | 'tanh' | 'gelu';
  let kind = $state<Kind>('relu');

  // ReLU is draggable by its kink. Slope is fixed at 1 so the one thing
  // moving is the corner — and the bias is just minus the corner's x.
  let kinkX = $state(0);
  let kinkY = $state(0);
  // Keep the kink pinned to the x-axis however the learner drags it.
  $effect(() => {
    if (kinkY !== 0) kinkY = 0;
  });
  const reluB = $derived(-kinkX); // w = 1, so b = −kinkX

  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  function gelu(x: number): number {
    const c = Math.sqrt(2 / Math.PI);
    return 0.5 * x * (1 + Math.tanh(c * (x + 0.044715 * x * x * x)));
  }
  function fn(x: number): number {
    switch (kind) {
      case 'relu': return Math.max(0, x + reluB);
      case 'sigmoid': return sigmoid(x);
      case 'tanh': return Math.tanh(x);
      case 'gelu': return gelu(x);
    }
  }
  function deriv(x: number): number {
    switch (kind) {
      case 'relu': return x + reluB > 0 ? 1 : 0;
      case 'sigmoid': { const s = sigmoid(x); return s * (1 - s); }
      case 'tanh': { const t = Math.tanh(x); return 1 - t * t; }
      case 'gelu': { const h = 1e-4; return (gelu(x + h) - gelu(x - h)) / (2 * h); }
    }
  }

  const VBX: [number, number] = [-5, 5];
  const VBY: [number, number] = [-1.6, 3.4];
  const N = 121;
  const xs = Array.from({ length: N }, (_, i) => VBX[0] + ((VBX[1] - VBX[0]) * i) / (N - 1));
  const curve = $derived(xs.map((x) => [x, fn(x)] as [number, number]));
  const dcurve = $derived(xs.map((x) => [x, deriv(x)] as [number, number]));

  // The largest slope this activation ever has — the number that decides
  // whether gradients survive a deep stack.
  const maxSlope = $derived(Math.max(...xs.map((x) => deriv(x))));

  const FACTS: Record<Kind, { name: string; note: string }> = {
    relu: { name: 'ReLU(x) = max(0, x + b)', note: 'Slope is exactly 1 wherever it is active — gradients pass through undamped. The modern default for hidden layers.' },
    sigmoid: { name: 'σ(x) = 1 / (1 + e⁻ˣ)', note: 'Slope tops out at 0.25. Stack eight of them and the gradient is scaled by 0.25⁸ ≈ 0.000015. This is the vanishing gradient.' },
    tanh: { name: 'tanh(x)', note: 'A zero-centered sigmoid, slope up to 1 at the origin. Still saturates in the tails. micrograd uses this one.' },
    gelu: { name: 'GELU(x) = x · Φ(x)', note: 'A smooth ReLU that lets a sliver of gradient through the negative tail. The activation inside GPT-2 and BERT feed-forward blocks.' },
  };
  const fmt = (n: number) => n.toFixed(2);
</script>

<div class="widget">
  <div class="tabs" role="group" aria-label="Choose an activation">
    {#each (['relu', 'sigmoid', 'tanh', 'gelu'] as Kind[]) as k (k)}
      <button class:on={kind === k} onclick={() => (kind = k)}>{k}</button>
    {/each}
  </div>

  <div class="stage">
    <Mafs width={560} height={360} viewBox={{ x: VBX, y: VBY }}>
      <Coordinates.Cartesian />
      <!-- derivative, dashed and faint -->
      {#each dcurve.slice(0, -1) as p, i (i)}
        <Line.Segment
          point1={p}
          point2={dcurve[i + 1]}
          color="var(--ink-sea)"
          weight={1.5}
          opacity={0.55}
        />
      {/each}
      <!-- the activation itself -->
      {#each curve.slice(0, -1) as p, i (i)}
        <Line.Segment point1={p} point2={curve[i + 1]} color="var(--ink-red)" weight={3} />
      {/each}
      {#if kind === 'relu'}
        <MovablePoint bind:x={kinkX} bind:y={kinkY} color="var(--ink-red)" />
        <Text x={kinkX} y={-0.55} size={12} color="var(--site-fg-muted)" latex={`x=${fmt(kinkX)}`} />
      {/if}
    </Mafs>
  </div>

  <div class="legend">
    <span><span class="swatch red"></span>activation</span>
    <span><span class="swatch sea"></span>its derivative (slope)</span>
  </div>

  <div class="readout">
    <code class="title">{FACTS[kind].name}</code>
    <p class="note">{FACTS[kind].note}</p>
    <div class="slope-row" class:warn={maxSlope < 0.3}>
      steepest slope anywhere: <b>{fmt(maxSlope)}</b>
      {#if kind === 'relu'}<span class="muted">· bias b = {fmt(reluB)} · kink at x = −b</span>{/if}
    </div>
  </div>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border, var(--site-border));
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }
  .tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .tabs button {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 0.35rem 0.85rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg-muted);
    cursor: pointer;
  }
  .tabs button.on {
    background: color-mix(in srgb, var(--ink-red) 14%, transparent);
    border-color: color-mix(in srgb, var(--ink-red) 45%, transparent);
    color: var(--ink-red);
    font-weight: 700;
  }
  .stage {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .stage :global(svg) { display: block; width: 100%; height: auto; max-width: 100%; }

  .legend {
    display: flex;
    gap: 1.1rem;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--site-fg-muted);
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .swatch { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }
  .swatch.red { background: var(--ink-red); }
  .swatch.sea { background: var(--ink-sea); }

  .readout {
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.65rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .title {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--site-fg);
  }
  .note {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--site-fg);
  }
  .slope-row {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--site-fg-muted);
  }
  .slope-row b { color: var(--site-fg); font-size: 1rem; }
  .slope-row.warn b { color: var(--ink-coral); }
  .muted { color: var(--site-fg-muted); }
</style>
