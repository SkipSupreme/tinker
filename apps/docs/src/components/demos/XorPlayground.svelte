<script lang="ts">
  /**
   * XorPlayground — the pedagogical payload of M11.2.
   *
   * Left: XOR's four points in input space, with two draggable hidden-ReLU
   * neuron lines. Right: where those same four points land in the
   * (h₁, h₂) hidden space the two neurons define. XOR is not linearly
   * separable on the left; with the right two lines it becomes separable
   * on the right. Both panels are live.
   *
   * Prior art: Olah's "Neural Networks, Manifolds, and Topology" (static
   * warps) and ConvNetJS classify2d (fixed-grid hidden view). Tinker M11.
   */
  import { Mafs, Coordinates, MovablePoint, Line, Point } from 'svelte-mafs';

  type Pt = { x: number; y: number; label: 0 | 1 };

  // XOR: opposite corners share a class. The dataset that broke the
  // perceptron in 1969.
  const POINTS: Pt[] = [
    { x: 0, y: 0, label: 0 },
    { x: 0, y: 1, label: 1 },
    { x: 1, y: 0, label: 1 },
    { x: 1, y: 1, label: 0 },
  ];

  // Each hidden neuron is a draggable line (two on-line anchors) plus a
  // flip toggle choosing which side counts as "firing".
  type Neuron = { ax: number; ay: number; bx: number; by: number; flip: boolean };

  const SOLUTION: [Neuron, Neuron] = [
    // h₁ fires past x₁+x₂ = 0.5
    { ax: 0.5, ay: 0, bx: 0, by: 0.5, flip: false },
    // h₂ fires past x₁+x₂ = 1.5
    { ax: 1.5, ay: 0, bx: 0, by: 1.5, flip: false },
  ];

  let n1 = $state<Neuron>({ ax: 1.2, ay: -0.4, bx: -0.4, by: 1.2, flip: false });
  let n2 = $state<Neuron>({ ax: 1.6, ay: 0.4, bx: 0.4, by: 1.6, flip: false });

  // signed distance from (x,y) to a neuron's line, oriented by `flip`.
  function signedDist(n: Neuron, x: number, y: number): number {
    const dx = n.bx - n.ax;
    const dy = n.by - n.ay;
    const len = Math.hypot(dx, dy) || 1;
    // unit normal (−dy, dx) / len
    const nx = -dy / len;
    const ny = dx / len;
    const d = nx * (x - n.ax) + ny * (y - n.ay);
    return n.flip ? -d : d;
  }
  // hidden activation: ReLU of the signed distance.
  const relu = (z: number) => Math.max(0, z);
  function hidden(p: Pt): { h1: number; h2: number } {
    return { h1: relu(signedDist(n1, p.x, p.y)), h2: relu(signedDist(n2, p.x, p.y)) };
  }

  const embedded = $derived(
    POINTS.map((p) => ({ ...p, ...hidden(p) })),
  );

  // 2-vs-2 linear separability in hidden space: the class-0 segment and
  // the class-1 segment must not intersect.
  function cross(ox: number, oy: number, ax: number, ay: number, bx: number, by: number) {
    return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
  }
  function segHit(
    a: [number, number], b: [number, number],
    c: [number, number], d: [number, number],
  ): boolean {
    const d1 = cross(c[0], c[1], d[0], d[1], a[0], a[1]);
    const d2 = cross(c[0], c[1], d[0], d[1], b[0], b[1]);
    const d3 = cross(a[0], a[1], b[0], b[1], c[0], c[1]);
    const d4 = cross(a[0], a[1], b[0], b[1], d[0], d[1]);
    if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return true;
    // treat any touching / collinear overlap as "intersecting" (not separable)
    const onSeg = (
      p: [number, number], q: [number, number], r: [number, number],
    ) =>
      Math.min(p[0], r[0]) - 1e-9 <= q[0] && q[0] <= Math.max(p[0], r[0]) + 1e-9 &&
      Math.min(p[1], r[1]) - 1e-9 <= q[1] && q[1] <= Math.max(p[1], r[1]) + 1e-9;
    if (Math.abs(d1) < 1e-9 && onSeg(c, a, d)) return true;
    if (Math.abs(d2) < 1e-9 && onSeg(c, b, d)) return true;
    if (Math.abs(d3) < 1e-9 && onSeg(a, c, b)) return true;
    if (Math.abs(d4) < 1e-9 && onSeg(a, d, b)) return true;
    return false;
  }

  const separable = $derived.by(() => {
    const c0 = embedded.filter((p) => p.label === 0).map((p) => [p.h1, p.h2] as [number, number]);
    const c1 = embedded.filter((p) => p.label === 1).map((p) => [p.h1, p.h2] as [number, number]);
    return !segHit(c0[0], c0[1], c1[0], c1[1]);
  });

  const C1 = 'var(--ink-sea)';
  const C0 = 'var(--ink-sun)';
  const L1 = 'var(--ink-red)';
  const L2 = 'var(--ink-teal)';

  const IVB = { x: [-0.7, 1.9] as [number, number], y: [-0.7, 1.9] as [number, number] };
  const HVB = { x: [-0.35, 2.3] as [number, number], y: [-0.35, 2.3] as [number, number] };

  function loadSolution() {
    n1 = { ...SOLUTION[0] };
    n2 = { ...SOLUTION[1] };
  }
  function reset() {
    n1 = { ax: 1.2, ay: -0.4, bx: -0.4, by: 1.2, flip: false };
    n2 = { ax: 1.6, ay: 0.4, bx: 0.4, by: 1.6, flip: false };
  }

  // jitter coincident hidden points apart a hair so both are visible.
  function shown(i: number): { hx: number; hy: number } {
    const p = embedded[i];
    let hx = p.h1;
    let hy = p.h2;
    for (let j = 0; j < i; j += 1) {
      if (Math.abs(embedded[j].h1 - hx) < 0.04 && Math.abs(embedded[j].h2 - hy) < 0.04) {
        hx += 0.06;
        hy += 0.06;
      }
    }
    return { hx, hy };
  }
</script>

<div class="widget">
  <div class="panels">
    <div class="panel">
      <p class="cap">input space — <em>x</em></p>
      <div class="stage">
        <Mafs width={340} height={300} viewBox={IVB}>
          <Coordinates.Cartesian />
          <Line.ThroughPoints point1={[n1.ax, n1.ay]} point2={[n1.bx, n1.by]} color={L1} weight={2.5} />
          <Line.ThroughPoints point1={[n2.ax, n2.ay]} point2={[n2.bx, n2.by]} color={L2} weight={2.5} />
          {#each POINTS as p (p.x + ',' + p.y)}
            <Point x={p.x} y={p.y} color={p.label === 1 ? C1 : C0} />
          {/each}
          <MovablePoint bind:x={n1.ax} bind:y={n1.ay} color={L1} />
          <MovablePoint bind:x={n1.bx} bind:y={n1.by} color={L1} />
          <MovablePoint bind:x={n2.ax} bind:y={n2.ay} color={L2} />
          <MovablePoint bind:x={n2.bx} bind:y={n2.by} color={L2} />
        </Mafs>
      </div>
      <div class="neuron-row">
        <span class="dot" style="background:{L1}"></span>
        <span>h₁</span>
        <button onclick={() => (n1.flip = !n1.flip)}>flip side</button>
        <span class="sp"></span>
        <span class="dot" style="background:{L2}"></span>
        <span>h₂</span>
        <button onclick={() => (n2.flip = !n2.flip)}>flip side</button>
      </div>
    </div>

    <div class="panel">
      <p class="cap">hidden space — <em>(h₁, h₂)</em></p>
      <div class="stage">
        <Mafs width={340} height={300} viewBox={HVB}>
          <Coordinates.Cartesian />
          {#each embedded as p, i (p.x + ',' + p.y)}
            {@const s = shown(i)}
            <Point x={s.hx} y={s.hy} color={p.label === 1 ? C1 : C0} />
          {/each}
        </Mafs>
      </div>
      <div class="status" class:ok={separable}>
        {#if separable}
          ✓ a straight line separates them here
        {:else}
          ✗ still tangled — no straight line works yet
        {/if}
      </div>
    </div>
  </div>

  <div class="footer">
    <button class="primary" onclick={loadSolution}>load a solution</button>
    <button class="ghost" onclick={reset}>reset</button>
    <p class="hint">
      Drag the two colored lines on the left. Each is one ReLU neuron;
      it measures how far a point sits past it. The right panel plots the
      four points by those two measurements. Get them untangled.
    </p>
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
  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }
  .panel { display: flex; flex-direction: column; gap: 0.45rem; }
  .cap {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .cap em { font-style: italic; color: var(--site-fg); }
  .stage {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .stage :global(svg) { display: block; width: 100%; height: auto; max-width: 100%; }

  .neuron-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
    flex-wrap: wrap;
  }
  .neuron-row .sp { width: 0.6rem; }
  .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
  .neuron-row button,
  .footer button {
    font-family: var(--font-body);
    font-size: 0.76rem;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    cursor: pointer;
  }
  .neuron-row button:hover, .footer button:hover {
    border-color: color-mix(in srgb, var(--site-fg) 40%, transparent);
  }

  .status {
    font-family: var(--font-mono);
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--ink-coral);
  }
  .status.ok { color: var(--cta-hover); }

  .footer {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.7rem;
  }
  .footer .primary {
    border-color: color-mix(in srgb, var(--ink-red) 50%, transparent);
    background: color-mix(in srgb, var(--ink-red) 10%, transparent);
    color: var(--ink-red);
    font-weight: 700;
  }
  .hint {
    margin: 0;
    flex: 1 1 14rem;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.4;
  }
  @media (max-width: 560px) {
    .panels { grid-template-columns: 1fr; }
  }
</style>
