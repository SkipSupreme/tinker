<script lang="ts">
  /**
   * LinearCollapse — M11.3. Stack linear layers and watch the grid stay
   * a grid: no matter the depth, the output is still a single linear
   * warp. Flip on the ReLU between layers and the grid folds — depth
   * starts buying something. The composed single-layer matrix is shown
   * in linear mode so the collapse is literal, not just visual.
   */
  import { Mafs, Coordinates, Line } from 'svelte-mafs';

  type Mat = [[number, number], [number, number]];
  type Vec = [number, number];

  // Five fixed layers (weight matrix + bias). Mild rotations and scales so
  // the composition is visible without flying off-screen.
  const W: Mat[] = [
    [[0.92, -0.48], [0.52, 0.88]],
    [[1.00, 0.42], [-0.34, 0.94]],
    [[0.84, 0.30], [0.28, 1.06]],
    [[1.04, -0.24], [0.40, 0.74]],
    [[0.74, 0.40], [-0.46, 0.90]],
  ];
  const B: Vec[] = [
    [0.10, -0.18], [-0.14, 0.12], [0.08, 0.16], [-0.10, -0.12], [0.14, 0.06],
  ];

  let depth = $state(3);
  let useRelu = $state(false);

  const relu = (z: number): number => Math.max(0, z);

  function step(v: Vec, layer: number): Vec {
    return [
      W[layer][0][0] * v[0] + W[layer][0][1] * v[1] + B[layer][0],
      W[layer][1][0] * v[0] + W[layer][1][1] * v[1] + B[layer][1],
    ];
  }
  function forward(p: Vec): Vec {
    let v = p;
    for (let l = 0; l < depth; l += 1) {
      v = step(v, l);
      // ReLU sits *between* layers — applied after every layer but the last.
      if (useRelu && l < depth - 1) v = [relu(v[0]), relu(v[1])];
    }
    return v;
  }

  // Composed single linear map (valid only in linear mode): W_total and
  // b_total such that forward(p) = W_total · p + b_total.
  const collapsed = $derived.by(() => {
    let M: Mat = [[1, 0], [0, 1]];
    let bb: Vec = [0, 0];
    for (let l = 0; l < depth; l += 1) {
      const Wl = W[l];
      const Bl = B[l];
      M = [
        [Wl[0][0] * M[0][0] + Wl[0][1] * M[1][0], Wl[0][0] * M[0][1] + Wl[0][1] * M[1][1]],
        [Wl[1][0] * M[0][0] + Wl[1][1] * M[1][0], Wl[1][0] * M[0][1] + Wl[1][1] * M[1][1]],
      ];
      bb = [
        Wl[0][0] * bb[0] + Wl[0][1] * bb[1] + Bl[0],
        Wl[1][0] * bb[0] + Wl[1][1] * bb[1] + Bl[1],
      ];
    }
    return { M, b: bb };
  });

  // A square grid of lines + one highlighted diagonal "decision boundary".
  const SPAN = 1.4;
  const STEPS = 5;
  const SAMPLES = 13;

  type Poly = { pts: Vec[]; kind: 'grid' | 'boundary' };

  const inputLines = $derived.by((): Poly[] => {
    const out: Poly[] = [];
    for (let i = 0; i < STEPS; i += 1) {
      const t = -SPAN + (2 * SPAN * i) / (STEPS - 1);
      const hRow: Vec[] = [];
      const vRow: Vec[] = [];
      for (let s = 0; s < SAMPLES; s += 1) {
        const u = -SPAN + (2 * SPAN * s) / (SAMPLES - 1);
        hRow.push([u, t]);
        vRow.push([t, u]);
      }
      out.push({ pts: hRow, kind: 'grid' });
      out.push({ pts: vRow, kind: 'grid' });
    }
    // the straight "boundary" line y = x
    const diag: Vec[] = [];
    for (let s = 0; s < SAMPLES; s += 1) {
      const u = -SPAN + (2 * SPAN * s) / (SAMPLES - 1);
      diag.push([u, u]);
    }
    out.push({ pts: diag, kind: 'boundary' });
    return out;
  });

  const outputLines = $derived(
    inputLines.map((line) => ({
      kind: line.kind,
      pts: line.pts.map((p) => forward(p)),
    })),
  );

  const fmt = (n: number) => (Object.is(n, -0) ? '0.00' : n.toFixed(2));
  const IVB = { x: [-2, 2] as Vec, y: [-2, 2] as Vec };
  const OVB = { x: [-3.4, 3.4] as Vec, y: [-3.4, 3.4] as Vec };
</script>

<div class="widget">
  <div class="panels">
    <div class="panel">
      <p class="cap">input</p>
      <div class="stage">
        <Mafs width={320} height={300} viewBox={IVB}>
          <Coordinates.Cartesian />
          {#each inputLines as line, li (li)}
            {#each line.pts.slice(0, -1) as pt, si (si)}
              <Line.Segment
                point1={pt}
                point2={line.pts[si + 1]}
                color={line.kind === 'boundary' ? 'var(--ink-red)' : 'var(--site-fg-muted)'}
                weight={line.kind === 'boundary' ? 3 : 1}
                opacity={line.kind === 'boundary' ? 1 : 0.4}
              />
            {/each}
          {/each}
        </Mafs>
      </div>
    </div>
    <div class="panel">
      <p class="cap">after {depth} layer{depth > 1 ? 's' : ''}</p>
      <div class="stage">
        <Mafs width={320} height={300} viewBox={OVB}>
          <Coordinates.Cartesian />
          {#each outputLines as line, li (li)}
            {#each line.pts.slice(0, -1) as pt, si (si)}
              <Line.Segment
                point1={pt}
                point2={line.pts[si + 1]}
                color={line.kind === 'boundary' ? 'var(--ink-red)' : 'var(--ink-sea)'}
                weight={line.kind === 'boundary' ? 3 : 1}
                opacity={line.kind === 'boundary' ? 1 : 0.4}
              />
            {/each}
          {/each}
        </Mafs>
      </div>
    </div>
  </div>

  <div class="controls">
    <div class="depth">
      <span class="lbl">layers</span>
      <button onclick={() => (depth = Math.max(1, depth - 1))} disabled={depth <= 1}>−</button>
      <b>{depth}</b>
      <button onclick={() => (depth = Math.min(5, depth + 1))} disabled={depth >= 5}>+</button>
    </div>
    <label class="relu">
      <input type="checkbox" bind:checked={useRelu} />
      ReLU between layers
    </label>
  </div>

  <div class="verdict" class:bent={useRelu}>
    {#if useRelu}
      <p><b>The grid folds.</b> ReLU is not linear, so the composition isn't
      either. Depth now buys you genuinely new shapes — the red boundary
      bends. This is why a nonlinearity has to sit between layers.</p>
    {:else}
      <p><b>The grid stays a grid.</b> Stack as many linear layers as you
      like; the output is still one linear warp. The red boundary stays
      dead straight. Those {depth} layers collapse into a single matrix:</p>
      <code class="matrix">
        W = [ {fmt(collapsed.M[0][0])}  {fmt(collapsed.M[0][1])} ;
        {fmt(collapsed.M[1][0])}  {fmt(collapsed.M[1][1])} ]
      </code>
    {/if}
  </div>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border, var(--site-border));
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }
  .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
  .panel { display: flex; flex-direction: column; gap: 0.4rem; }
  .cap {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .stage {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    overflow: hidden;
  }
  .stage :global(svg) { display: block; width: 100%; height: auto; max-width: 100%; }

  .controls {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    flex-wrap: wrap;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.7rem;
    font-family: var(--font-mono);
    color: var(--site-fg);
  }
  .depth { display: flex; align-items: center; gap: 0.5rem; }
  .lbl {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
  }
  .depth button {
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 8px;
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    font-size: 1rem;
    cursor: pointer;
  }
  .depth button:disabled { opacity: 0.35; cursor: not-allowed; }
  .depth b { font-size: 1.05rem; min-width: 1ch; text-align: center; }
  .relu { display: flex; align-items: center; gap: 0.45rem; font-size: 0.9rem; cursor: pointer; }
  .relu input { width: 1rem; height: 1rem; accent-color: var(--ink-sea); }

  .verdict {
    border-radius: 12px;
    padding: 0.8rem 1rem;
    background: color-mix(in srgb, var(--ink-sea) 12%, transparent);
    border-left: 3px solid var(--ink-sea);
  }
  .verdict.bent {
    background: color-mix(in srgb, var(--ink-red) 12%, transparent);
    border-left-color: var(--ink-red);
  }
  .verdict p { margin: 0; font-size: 0.92rem; line-height: 1.5; color: var(--site-fg); }
  .matrix {
    display: inline-block;
    margin-top: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.86rem;
    color: var(--site-fg);
    background: var(--demo-stage, var(--site-surface));
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
  }
  @media (max-width: 560px) {
    .panels { grid-template-columns: 1fr; }
  }
</style>
