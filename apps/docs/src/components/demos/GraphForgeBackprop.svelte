<script lang="ts">
  /**
   * GraphForgeBackprop — M12.1/12.2. Three canonical Karpathy graphs.
   * Edit leaf values. Step forward (leaves → root, .data flows along edges).
   * Step backward (root → leaves, .grad flows along edges; reused nodes
   * accumulate with += and visibly pulse twice). Click an edge for the
   * local derivative panel — that is the `edgeInspector` mode folded in.
   */

  type Op = 'leaf' | 'add' | 'mul' | 'pow' | 'tanh' | 'exp';

  interface NodeDef {
    id: string;
    op: Op;
    label: string;       // pretty name shown on the node
    initial?: number;    // for leaves
    pow?: number;        // exponent for `pow`
    editable?: boolean;  // leaf values can be edited
    x: number;
    y: number;
  }

  interface EdgeDef {
    from: string;
    to: string;
    port: 'a' | 'b';     // which input slot of `to` this edge feeds
  }

  interface Graph {
    id: string;
    label: string;
    nodes: NodeDef[];
    edges: EdgeDef[];
    root: string;
    width: number;
    height: number;
  }

  const GRAPHS: Graph[] = [
    {
      id: 'product',
      label: '(a + b) · c',
      width: 540,
      height: 260,
      root: 'f',
      nodes: [
        { id: 'a', op: 'leaf', label: 'a', initial: 2, editable: true, x: 60, y: 50 },
        { id: 'b', op: 'leaf', label: 'b', initial: -3, editable: true, x: 60, y: 130 },
        { id: 'c', op: 'leaf', label: 'c', initial: 10, editable: true, x: 60, y: 200 },
        { id: 'e', op: 'add', label: 'e = a + b', x: 230, y: 90, initial: 0 },
        { id: 'f', op: 'mul', label: 'f = e · c', x: 400, y: 140, initial: 0 },
      ],
      edges: [
        { from: 'a', to: 'e', port: 'a' },
        { from: 'b', to: 'e', port: 'b' },
        { from: 'e', to: 'f', port: 'a' },
        { from: 'c', to: 'f', port: 'b' },
      ],
    },
    {
      id: 'neuron',
      label: 'tanh(w₁x₁ + w₂x₂ + b)',
      width: 700,
      height: 320,
      root: 'o',
      nodes: [
        { id: 'x1', op: 'leaf', label: 'x₁', initial: 2, editable: true, x: 50, y: 40 },
        { id: 'w1', op: 'leaf', label: 'w₁', initial: -3, editable: true, x: 50, y: 90 },
        { id: 'x2', op: 'leaf', label: 'x₂', initial: 0, editable: true, x: 50, y: 150 },
        { id: 'w2', op: 'leaf', label: 'w₂', initial: 1, editable: true, x: 50, y: 200 },
        { id: 'b', op: 'leaf', label: 'b', initial: 6.8813735870195432, editable: true, x: 50, y: 260 },
        { id: 'xw1', op: 'mul', label: 'x₁·w₁', x: 200, y: 65 },
        { id: 'xw2', op: 'mul', label: 'x₂·w₂', x: 200, y: 175 },
        { id: 'sum', op: 'add', label: '(x₁w₁) + (x₂w₂)', x: 350, y: 120 },
        { id: 'n', op: 'add', label: 'n = sum + b', x: 470, y: 175 },
        { id: 'o', op: 'tanh', label: 'o = tanh(n)', x: 560, y: 130 },
      ],
      edges: [
        { from: 'x1', to: 'xw1', port: 'a' },
        { from: 'w1', to: 'xw1', port: 'b' },
        { from: 'x2', to: 'xw2', port: 'a' },
        { from: 'w2', to: 'xw2', port: 'b' },
        { from: 'xw1', to: 'sum', port: 'a' },
        { from: 'xw2', to: 'sum', port: 'b' },
        { from: 'sum', to: 'n', port: 'a' },
        { from: 'b', to: 'n', port: 'b' },
        { from: 'n', to: 'o', port: 'a' },
      ],
    },
    {
      id: 'diamond',
      label: 'f = a · a   (used twice)',
      width: 430,
      height: 160,
      root: 'f',
      nodes: [
        { id: 'a', op: 'leaf', label: 'a', initial: 3, editable: true, x: 70, y: 90 },
        { id: 'f', op: 'mul', label: 'f = a · a', x: 290, y: 90 },
      ],
      edges: [
        { from: 'a', to: 'f', port: 'a' },
        { from: 'a', to: 'f', port: 'b' },
      ],
    },
  ];

  let graphId = $state(GRAPHS[0].id);
  const graph = $derived(GRAPHS.find((g) => g.id === graphId)!);

  // Leaf-value overrides, keyed by `${graph.id}:${node.id}`
  let leafValues = $state<Record<string, number>>({});

  function leafKey(g: Graph, id: string) {
    return `${g.id}:${id}`;
  }

  function leafValue(g: Graph, n: NodeDef): number {
    const k = leafKey(g, n.id);
    return leafValues[k] ?? (n.initial ?? 0);
  }

  function setLeaf(g: Graph, id: string, v: number) {
    leafValues = { ...leafValues, [leafKey(g, id)]: v };
    reset();
  }

  // Topo sort: parents-first order for forward; reverse for backward.
  function topoForward(g: Graph): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const childToParents = new Map<string, EdgeDef[]>();
    for (const e of g.edges) {
      if (!childToParents.has(e.to)) childToParents.set(e.to, []);
      childToParents.get(e.to)!.push(e);
    }
    function visit(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      for (const e of childToParents.get(id) ?? []) visit(e.from);
      order.push(id);
    }
    for (const n of g.nodes) visit(n.id);
    return order;
  }

  // Per-node state: { data, grad, parentVals: [data, data] }
  interface Trace {
    data: Record<string, number>;
    grad: Record<string, number>;
    parents: Record<string, { a?: number; b?: number }>;
  }

  function fullCompute(g: Graph): Trace {
    const order = topoForward(g);
    const data: Record<string, number> = {};
    const grad: Record<string, number> = {};
    const parents: Record<string, { a?: number; b?: number }> = {};
    const incoming = new Map<string, EdgeDef[]>();
    for (const e of g.edges) {
      if (!incoming.has(e.to)) incoming.set(e.to, []);
      incoming.get(e.to)!.push(e);
    }

    for (const id of order) {
      const n = g.nodes.find((x) => x.id === id)!;
      const ins = incoming.get(id) ?? [];
      const aEdge = ins.find((e) => e.port === 'a');
      const bEdge = ins.find((e) => e.port === 'b');
      const a = aEdge ? data[aEdge.from] : undefined;
      const b = bEdge ? data[bEdge.from] : undefined;
      parents[id] = { a, b };
      switch (n.op) {
        case 'leaf':
          data[id] = leafValue(g, n);
          break;
        case 'add':
          data[id] = (a ?? 0) + (b ?? 0);
          break;
        case 'mul':
          data[id] = (a ?? 0) * (b ?? 0);
          break;
        case 'pow':
          data[id] = Math.pow(a ?? 0, n.pow ?? 1);
          break;
        case 'tanh':
          data[id] = Math.tanh(a ?? 0);
          break;
        case 'exp':
          data[id] = Math.exp(a ?? 0);
          break;
      }
      grad[id] = 0;
    }

    grad[g.root] = 1;
    // backward in reverse topo
    for (let i = order.length - 1; i >= 0; i--) {
      const id = order[i];
      const n = g.nodes.find((x) => x.id === id)!;
      const ins = incoming.get(id) ?? [];
      const aEdge = ins.find((e) => e.port === 'a');
      const bEdge = ins.find((e) => e.port === 'b');
      const aVal = parents[id].a ?? 0;
      const bVal = parents[id].b ?? 0;
      const g_ = grad[id];

      function pushTo(edge: EdgeDef | undefined, contrib: number) {
        if (!edge) return;
        grad[edge.from] = (grad[edge.from] ?? 0) + contrib;
      }

      switch (n.op) {
        case 'leaf':
          break;
        case 'add':
          pushTo(aEdge, g_);
          pushTo(bEdge, g_);
          break;
        case 'mul':
          pushTo(aEdge, g_ * bVal);
          pushTo(bEdge, g_ * aVal);
          break;
        case 'pow': {
          const p = n.pow ?? 1;
          pushTo(aEdge, g_ * p * Math.pow(aVal, p - 1));
          break;
        }
        case 'tanh':
          pushTo(aEdge, g_ * (1 - data[id] * data[id]));
          break;
        case 'exp':
          pushTo(aEdge, g_ * data[id]);
          break;
      }
    }

    return { data, grad, parents };
  }

  // Phase state machine
  type Phase = 'idle' | 'forward' | 'fwd-done' | 'backward' | 'bwd-done';
  let phase = $state<Phase>('idle');
  let stepIndex = $state(0);

  const order = $derived(topoForward(graph));
  const full = $derived(fullCompute(graph));

  // What's visible at the current phase/step:
  // - idle: no data, no grad
  // - forward step i: data filled for first (i+1) nodes in topo, no grads
  // - fwd-done: all data, no grad
  // - backward step i: full data, grads for last (i+1) nodes in reverse topo
  // - bwd-done: full data, full grads
  const visibleData = $derived.by(() => {
    if (phase === 'idle') return {} as Record<string, number>;
    if (phase === 'forward') {
      const out: Record<string, number> = {};
      for (let i = 0; i <= stepIndex && i < order.length; i++) {
        out[order[i]] = full.data[order[i]];
      }
      return out;
    }
    return { ...full.data };
  });

  const visibleGrad = $derived.by(() => {
    if (phase !== 'backward' && phase !== 'bwd-done') return {} as Record<string, number>;
    const out: Record<string, number> = {};
    const rev = [...order].reverse();
    const upto = phase === 'bwd-done' ? rev.length - 1 : stepIndex;
    for (let i = 0; i <= upto && i < rev.length; i++) {
      out[rev[i]] = full.grad[rev[i]];
    }
    return out;
  });

  const activeId = $derived.by(() => {
    if (phase === 'forward') return order[stepIndex];
    if (phase === 'backward') return [...order].reverse()[stepIndex];
    return null;
  });

  function reset() {
    phase = 'idle';
    stepIndex = 0;
    selectedEdge = null;
  }

  function stepForward() {
    if (phase === 'idle') {
      phase = 'forward';
      stepIndex = 0;
      return;
    }
    if (phase === 'forward') {
      if (stepIndex < order.length - 1) stepIndex += 1;
      else phase = 'fwd-done';
      return;
    }
    if (phase === 'fwd-done') {
      phase = 'backward';
      stepIndex = 0;
      return;
    }
    if (phase === 'backward') {
      if (stepIndex < order.length - 1) stepIndex += 1;
      else phase = 'bwd-done';
    }
  }

  function runAll() {
    phase = 'bwd-done';
    stepIndex = order.length - 1;
  }

  function pickGraph(id: string) {
    graphId = id;
    reset();
  }

  // edge inspector
  let selectedEdge = $state<EdgeDef | null>(null);

  function edgeLocalDeriv(e: EdgeDef): { formula: string; value: number } | null {
    const to = graph.nodes.find((n) => n.id === e.to)!;
    const aData = full.parents[e.to].a ?? 0;
    const bData = full.parents[e.to].b ?? 0;
    switch (to.op) {
      case 'add':
        return { formula: '∂out/∂' + edgeLabel(e) + ' = 1', value: 1 };
      case 'mul': {
        const other = e.port === 'a' ? bData : aData;
        return {
          formula:
            '∂out/∂' + edgeLabel(e) + ' = ' + (e.port === 'a' ? 'b' : 'a') + ' = ' + other.toFixed(3),
          value: other,
        };
      }
      case 'pow': {
        const p = to.pow ?? 1;
        const v = p * Math.pow(aData, p - 1);
        return { formula: `∂out/∂a = ${p}·a^${p - 1} = ${v.toFixed(3)}`, value: v };
      }
      case 'tanh': {
        const out = full.data[e.to];
        const v = 1 - out * out;
        return { formula: `∂out/∂a = 1 − tanh²(a) = ${v.toFixed(3)}`, value: v };
      }
      case 'exp': {
        const v = full.data[e.to];
        return { formula: `∂out/∂a = e^a = ${v.toFixed(3)}`, value: v };
      }
      default:
        return null;
    }
  }

  function edgeLabel(e: EdgeDef): string {
    const from = graph.nodes.find((n) => n.id === e.from)!;
    return from.label.split(' ')[0];
  }

  // SVG geometry helpers
  function edgePath(e: EdgeDef): string {
    const from = graph.nodes.find((n) => n.id === e.from)!;
    const to = graph.nodes.find((n) => n.id === e.to)!;
    const fx = from.x + 60;
    const fy = from.y + 22;
    const tx = to.x;
    const ty = to.y + 22 + (e.port === 'a' ? -8 : 8);
    const dx = (tx - fx) * 0.45;
    return `M ${fx} ${fy} C ${fx + dx} ${fy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  }

  function isEdgeActive(e: EdgeDef): boolean {
    if (phase === 'forward' && order[stepIndex] === e.to) return true;
    if (phase === 'backward' && [...order].reverse()[stepIndex] === e.to) return true;
    return false;
  }

  function isEdgeSelected(e: EdgeDef): boolean {
    return selectedEdge?.from === e.from && selectedEdge?.to === e.to && selectedEdge?.port === e.port;
  }

  function fmt(n: number | undefined): string {
    if (n === undefined) return '·';
    if (Math.abs(n) < 0.005) return '0.00';
    return n.toFixed(2);
  }
</script>

<div class="widget">
  <div class="picker" role="tablist">
    {#each GRAPHS as g (g.id)}
      <button
        type="button"
        role="tab"
        class="pill"
        class:active={graphId === g.id}
        aria-selected={graphId === g.id}
        onclick={() => pickGraph(g.id)}
      >
        {g.label}
      </button>
    {/each}
  </div>

  <div class="stage">
    <svg
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      class:idle={phase === 'idle'}
      role="img"
      aria-label={`computational graph for ${graph.label}`}
    >
      <!-- edges -->
      {#each graph.edges as e (e.from + '-' + e.to + '-' + e.port)}
        <path
          d={edgePath(e)}
          fill="none"
          stroke={isEdgeActive(e) ? 'var(--ink-sea)' : isEdgeSelected(e) ? 'var(--ink-sun)' : 'var(--site-fg-muted)'}
          stroke-width={isEdgeActive(e) || isEdgeSelected(e) ? 2.4 : 1.2}
          opacity={isEdgeActive(e) || isEdgeSelected(e) ? 1 : 0.45}
          style="cursor: pointer"
          onclick={() => (selectedEdge = e)}
        />
      {/each}

      <!-- nodes -->
      {#each graph.nodes as n (n.id)}
        {@const isActive = activeId === n.id}
        {@const dataV = visibleData[n.id]}
        {@const gradV = visibleGrad[n.id]}
        <g transform={`translate(${n.x}, ${n.y})`}>
          <rect
            width="120"
            height="44"
            rx="8"
            ry="8"
            fill={n.op === 'leaf'
              ? 'color-mix(in srgb, var(--ink-red) 14%, var(--demo-stage))'
              : 'color-mix(in srgb, var(--ink-sea) 12%, var(--demo-stage))'}
            stroke={isActive
              ? 'var(--cta)'
              : n.op === 'leaf'
              ? 'var(--ink-red)'
              : 'var(--ink-sea)'}
            stroke-width={isActive ? 2.4 : 1.4}
          />
          <text
            x="60"
            y="14"
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="9.5"
            fill="var(--site-fg-muted)"
          >{n.label}</text>
          <text
            x="30"
            y="32"
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="11.5"
            font-weight="600"
            fill="var(--ink-red)"
          >{fmt(dataV)}</text>
          <text
            x="30"
            y="42"
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="6.5"
            fill="var(--site-fg-muted)"
          >data</text>
          <text
            x="90"
            y="32"
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="11.5"
            font-weight="600"
            fill="var(--ink-sea)"
          >{fmt(gradV)}</text>
          <text
            x="90"
            y="42"
            text-anchor="middle"
            font-family="var(--font-mono)"
            font-size="6.5"
            fill="var(--site-fg-muted)"
          >grad</text>
        </g>
      {/each}
    </svg>
  </div>

  <div class="controls">
    <button type="button" onclick={stepForward} disabled={phase === 'bwd-done'}>
      {#if phase === 'idle'}
        ▶ start forward
      {:else if phase === 'forward'}
        ▶ step forward
      {:else if phase === 'fwd-done'}
        ◀ start backward
      {:else if phase === 'backward'}
        ◀ step backward
      {:else}
        done
      {/if}
    </button>
    <button type="button" class="ghost" onclick={runAll}>run all</button>
    <button type="button" class="ghost" onclick={reset}>reset</button>
    <span class="phase">phase: <code>{phase}</code></span>
  </div>

  <details class="leaves">
    <summary>edit leaf values</summary>
    <div class="leaf-grid">
      {#each graph.nodes.filter((n) => n.op === 'leaf' && n.editable) as n (n.id)}
        <label class="leaf-field">
          <span>{n.label}</span>
          <input
            type="number"
            step="0.1"
            value={leafValue(graph, n)}
            oninput={(e) => setLeaf(graph, n.id, Number((e.target as HTMLInputElement).value))}
          />
        </label>
      {/each}
    </div>
  </details>

  {#if selectedEdge}
    {@const info = edgeLocalDeriv(selectedEdge)}
    {#if info}
      <div class="inspector" role="region" aria-label="edge inspector">
        <span class="ikey">edge</span>
        <code class="iedge">
          {graph.nodes.find((n) => n.id === selectedEdge!.from)!.label}
          →
          {graph.nodes.find((n) => n.id === selectedEdge!.to)!.label}
        </code>
        <code class="iformula">{info.formula}</code>
        <button type="button" class="iclose" onclick={() => (selectedEdge = null)}>×</button>
      </div>
    {/if}
  {/if}

  <p class="hint">
    Click <strong>step forward</strong> to fill <code>.data</code> at each node from
    leaves to root. Then <strong>step backward</strong> to fill <code>.grad</code>
    from root to leaves. Click any edge to read its local derivative.
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
    gap: 0.7rem;
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .pill {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 0.3rem 0.7rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    cursor: pointer;
  }

  .pill.active {
    background: color-mix(in srgb, var(--ink-red) 14%, transparent);
    border-color: var(--ink-red);
  }

  .stage {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    padding: 0.3rem;
    overflow: hidden;
  }

  .stage svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .controls button {
    font-family: var(--font-body);
    font-size: 0.85rem;
    padding: 0.35rem 0.85rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--ink-red);
    background: color-mix(in srgb, var(--ink-red) 12%, transparent);
    color: var(--site-fg);
    cursor: pointer;
  }

  .controls button.ghost {
    border-color: var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg-muted);
  }

  .controls button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .phase {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    margin-left: auto;
  }

  .leaves summary {
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
    cursor: pointer;
    padding: 0.3rem 0;
  }

  .leaf-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 0.4rem;
    padding-top: 0.4rem;
  }

  .leaf-field {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .leaf-field input {
    font-family: var(--font-mono);
    font-size: 0.92rem;
    padding: 0.3rem 0.4rem;
    border-radius: 6px;
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
  }

  .inspector {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0.8rem;
    border-radius: 10px;
    background: color-mix(in srgb, var(--ink-sun) 14%, transparent);
    border-left: 3px solid var(--ink-sun);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    flex-wrap: wrap;
  }

  .ikey {
    text-transform: uppercase;
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    color: var(--site-fg-muted);
  }

  .iedge {
    color: var(--ink-red);
    font-weight: 600;
  }

  .iformula {
    color: var(--site-fg);
    font-weight: 600;
  }

  .iclose {
    margin-left: auto;
    border: none;
    background: none;
    color: var(--site-fg-muted);
    font-size: 1.1rem;
    cursor: pointer;
    line-height: 1;
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.5;
  }

  .hint code {
    font-family: var(--font-mono);
    font-size: 0.86em;
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    padding: 0.05em 0.3em;
    border-radius: 4px;
  }
</style>
