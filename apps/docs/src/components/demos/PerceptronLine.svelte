<script lang="ts">
  /**
   * PerceptronLine — drag the decision boundary of a single perceptron.
   *
   * The learner grabs the *line itself* (two anchors that both sit on it);
   * w₁, w₂, b are read off the line, never set by a slider. The shaded
   * half-plane is {x : w·x + b ≥ 0}. Counts of correct classifications
   * update live, and misclassified points wear a red ring.
   *
   * Prior art: TensorFlow Playground (Apache 2.0) and ConvNetJS classify2d
   * (MIT) both render a boundary but neither lets you grab it. Tinker M11.
   */
  import { Mafs, Coordinates, MovablePoint, Line, Polygon, Point, Circle, Text } from 'svelte-mafs';

  type Pt = { x: number; y: number; label: 0 | 1 };

  // The classic 2-input logic gates. AND is the worked example in M11.1;
  // OR confirms the line trick generalizes; XOR is the one no line can do.
  type Task = 'AND' | 'OR' | 'XOR';
  const DATASETS: Record<Task, Pt[]> = {
    AND: [
      { x: 0, y: 0, label: 0 },
      { x: 0, y: 1, label: 0 },
      { x: 1, y: 0, label: 0 },
      { x: 1, y: 1, label: 1 },
    ],
    OR: [
      { x: 0, y: 0, label: 0 },
      { x: 0, y: 1, label: 1 },
      { x: 1, y: 0, label: 1 },
      { x: 1, y: 1, label: 1 },
    ],
    XOR: [
      { x: 0, y: 0, label: 0 },
      { x: 0, y: 1, label: 1 },
      { x: 1, y: 0, label: 1 },
      { x: 1, y: 1, label: 0 },
    ],
  };

  let task = $state<Task>('AND');
  const points = $derived(DATASETS[task]);

  // Two anchors that both lie on the boundary. Dragging either one moves
  // the line — and moving the line *is* what training a perceptron does.
  let ax = $state(1.5);
  let ay = $state(0);
  let bx = $state(0);
  let by = $state(1.5);

  const VBX: [number, number] = [-1.35, 2.6];
  const VBY: [number, number] = [-1.35, 2.6];

  // Unit normal to the line. perp((dx,dy)) = (−dy, dx).
  const normal = $derived.by(() => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    return { x: -dy / len, y: dx / len };
  });
  // Offset so the raw line normal·p + b0 = 0 passes through anchor A.
  const b0 = $derived(-(normal.x * ax + normal.y * ay));

  // Auto-orient: pick whichever side is "class 1" so the learner only has
  // to think about *placing* the line, not about sign conventions.
  function correctFor(s: 1 | -1): number {
    let c = 0;
    for (const p of points) {
      const fired = s * (normal.x * p.x + normal.y * p.y + b0) >= 0;
      if (fired === (p.label === 1)) c += 1;
    }
    return c;
  }
  const sign = $derived<1 | -1>(correctFor(1) >= correctFor(-1) ? 1 : -1);

  const w1 = $derived(sign * normal.x);
  const w2 = $derived(sign * normal.y);
  const b = $derived(sign * b0);

  const pre = (p: Pt) => w1 * p.x + w2 * p.y + b;
  const correct = (p: Pt) => (pre(p) >= 0) === (p.label === 1);
  const numCorrect = $derived(points.filter(correct).length);
  const solved = $derived(numCorrect === points.length);

  // The positive half-plane {w·x + b ≥ 0}, clipped to the viewBox by
  // Sutherland–Hodgman against the boundary line.
  const shade = $derived.by((): [number, number][] => {
    const rect: [number, number][] = [
      [VBX[0], VBY[0]], [VBX[1], VBY[0]],
      [VBX[1], VBY[1]], [VBX[0], VBY[1]],
    ];
    const f = (p: [number, number]) => w1 * p[0] + w2 * p[1] + b;
    const out: [number, number][] = [];
    for (let i = 0; i < rect.length; i += 1) {
      const A = rect[i];
      const B = rect[(i + 1) % rect.length];
      const fA = f(A);
      const fB = f(B);
      if (fA >= 0) out.push(A);
      if ((fA >= 0) !== (fB >= 0)) {
        const t = fA / (fA - fB);
        out.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]);
      }
    }
    return out;
  });

  const C1 = 'var(--ink-sea)';
  const C0 = 'var(--ink-sun)';
  const fmt = (n: number) => (Object.is(n, -0) ? 0 : n).toFixed(2);

  function reset() {
    ax = 1.5; ay = 0; bx = 0; by = 1.5;
    task = 'AND';
  }
</script>

<div class="widget">
  <div class="stage">
    <Mafs width={560} height={400} viewBox={{ x: VBX, y: VBY }}>
      <Coordinates.Cartesian />

      <!-- positive half-plane: where the perceptron outputs class 1 -->
      <Polygon points={shade} color="transparent" fillColor={C1} fillOpacity={0.14} />

      <!-- the boundary line, extended across the frame -->
      <Line.ThroughPoints
        point1={[ax, ay]}
        point2={[bx, by]}
        color="var(--ink-red)"
        weight={2.5}
      />

      <!-- data points: filled by class, red-ringed when misclassified -->
      {#each points as p (p.x + ',' + p.y)}
        {#if !correct(p)}
          <Circle center={[p.x, p.y]} radius={0.16} color="var(--ink-red)" weight={2.5} />
        {/if}
        <Point x={p.x} y={p.y} color={p.label === 1 ? C1 : C0} />
        <Text
          x={p.x + 0.17}
          y={p.y + 0.22}
          size={12}
          color="var(--site-fg-muted)"
          latex={`(${p.x},${p.y})`}
        />
      {/each}

      <!-- the two draggable grab-handles on the boundary -->
      <MovablePoint bind:x={ax} bind:y={ay} color="var(--ink-red)" />
      <MovablePoint bind:x={bx} bind:y={by} color="var(--ink-red)" />
    </Mafs>
  </div>

  <div class="readout" aria-live="polite">
    <div class="row top">
      <div class="task-toggle" role="group" aria-label="Choose the gate to fit">
        <button class:on={task === 'AND'} onclick={() => (task = 'AND')}>AND</button>
        <button class:on={task === 'OR'} onclick={() => (task = 'OR')}>OR</button>
        <button class:on={task === 'XOR'} onclick={() => (task = 'XOR')}>XOR</button>
      </div>
      <div class="score" class:solved>
        {numCorrect} / {points.length} correct
        {#if solved}<span class="badge">✓ separated</span>{/if}
      </div>
    </div>

    <div class="params">
      <span class="param">w₁ = <b>{fmt(w1)}</b></span>
      <span class="param">w₂ = <b>{fmt(w2)}</b></span>
      <span class="param">b = <b>{fmt(b)}</b></span>
      <span class="formula">decision: w·x + b ≥ 0</span>
    </div>

    <div class="footer">
      <button class="reset" onclick={reset}>reset</button>
      <p class="hint">
        Drag either red handle. You're moving the line <em>w·x + b = 0</em> —
        the weights are just where it ends up.
      </p>
    </div>
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
  .stage {
    width: 100%;
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .stage :global(svg) { display: block; width: 100%; height: auto; max-width: 100%; }

  .readout {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.7rem;
    font-family: var(--font-mono);
    color: var(--site-fg);
  }
  .row.top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .task-toggle {
    display: inline-flex;
    border: 1px solid var(--site-border);
    border-radius: var(--radius-pill, 999px);
    overflow: hidden;
  }
  .task-toggle button {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 0.3rem 0.85rem;
    border: 0;
    background: transparent;
    color: var(--site-fg-muted);
    cursor: pointer;
  }
  .task-toggle button.on {
    background: color-mix(in srgb, var(--ink-red) 16%, transparent);
    color: var(--ink-red);
    font-weight: 700;
  }
  .score {
    font-size: 0.95rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .score.solved { color: var(--cta-hover); }
  .badge {
    margin-left: 0.4rem;
    font-size: 0.78rem;
  }
  .params {
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
    align-items: baseline;
  }
  .param {
    font-size: 0.92rem;
    font-variant-numeric: tabular-nums;
    color: var(--site-fg-muted);
  }
  .param b { color: var(--site-fg); }
  .formula {
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    margin-left: auto;
  }
  .footer {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex-wrap: wrap;
  }
  .reset {
    font-family: var(--font-body);
    font-size: 0.78rem;
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid color-mix(in srgb, var(--ink-red) 50%, transparent);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    color: var(--ink-red);
    cursor: pointer;
    white-space: nowrap;
  }
  .reset:hover { background: color-mix(in srgb, var(--ink-red) 16%, transparent); }
  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.4;
  }
  @media (max-width: 520px) {
    .formula { margin-left: 0; width: 100%; }
  }
</style>
