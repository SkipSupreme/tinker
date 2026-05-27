<script lang="ts">
  import { onDestroy } from 'svelte';

  // ─── Types ──────────────────────────────────────────────────────────────────

  interface Props {
    initial?: string;
  }

  type ASTNode =
    | { kind: 'num'; value: number }
    | { kind: 'op'; op: string; left: ASTNode; right: ASTNode }
    | { kind: 'unary'; op: string; child: ASTNode };

  interface LayoutNode {
    id: number;
    node: ASTNode;
    depth: number;
    slot: number;    // x-position (leaf ordering)
    x: number;
    y: number;
    value: number | null;
    parentId: number | null;
  }

  // ─── Props ───────────────────────────────────────────────────────────────────

  let { initial = '3 + 4 * 2^2' }: Props = $props();

  // ─── Parser ──────────────────────────────────────────────────────────────────

  function parse(src: string): ASTNode {
    const tokens = tokenize(src);
    let pos = 0;

    function peek(): string { return tokens[pos] ?? ''; }
    function consume(): string { return tokens[pos++] ?? ''; }
    function expect(t: string) {
      if (tokens[pos] !== t) throw new Error(`expected '${t}' got '${tokens[pos]}'`);
      pos++;
    }

    function parseExpr(): ASTNode {
      let left = parseTerm();
      while (peek() === '+' || peek() === '-') {
        const op = consume();
        const right = parseTerm();
        left = { kind: 'op', op, left, right };
      }
      return left;
    }

    function parseTerm(): ASTNode {
      let left = parsePower();
      while (peek() === '*' || peek() === '/') {
        const op = consume();
        const right = parsePower();
        left = { kind: 'op', op, left, right };
      }
      return left;
    }

    function parsePower(): ASTNode {
      const base = parseUnary();
      if (peek() === '^') {
        consume();
        const exp = parsePower(); // right-associative
        return { kind: 'op', op: '^', left: base, right: exp };
      }
      return base;
    }

    function parseUnary(): ASTNode {
      if (peek() === '-') {
        consume();
        const child = parseUnary();
        return { kind: 'unary', op: '-', child };
      }
      return parsePrimary();
    }

    function parsePrimary(): ASTNode {
      const t = peek();
      if (t === '(') {
        consume();
        const inner = parseExpr();
        expect(')');
        return inner;
      }
      if (/^-?\d/.test(t) || /^\d/.test(t)) {
        consume();
        return { kind: 'num', value: parseFloat(t) };
      }
      throw new Error(`unexpected token '${t}'`);
    }

    const root = parseExpr();
    if (pos !== tokens.length) throw new Error(`unexpected token '${tokens[pos]}'`);
    return root;
  }

  function tokenize(src: string): string[] {
    const toks: string[] = [];
    let i = 0;
    while (i < src.length) {
      if (/\s/.test(src[i])) { i++; continue; }
      if (/\d/.test(src[i]) || (src[i] === '.' && /\d/.test(src[i+1] ?? ''))) {
        let num = '';
        while (i < src.length && /[\d.]/.test(src[i])) num += src[i++];
        toks.push(num);
        continue;
      }
      if ('+-*/^()'.includes(src[i])) { toks.push(src[i++]); continue; }
      throw new Error(`unknown char '${src[i]}'`);
    }
    return toks;
  }

  function evalNode(node: ASTNode): number {
    if (node.kind === 'num') return node.value;
    if (node.kind === 'unary') {
      const v = evalNode(node.child);
      return node.op === '-' ? -v : v;
    }
    const l = evalNode(node.left);
    const r = evalNode(node.right);
    if (node.op === '+') return l + r;
    if (node.op === '-') return l - r;
    if (node.op === '*') return l * r;
    if (node.op === '/') return l / r;
    if (node.op === '^') return Math.pow(l, r);
    throw new Error(`unknown op ${node.op}`);
  }

  // ─── Layout ──────────────────────────────────────────────────────────────────

  const NODE_W = 44;
  const NODE_H = 30;
  const H_GAP = 14;    // horizontal space between slots
  const V_GAP = 52;    // vertical row height

  function buildLayout(root: ASTNode): LayoutNode[] {
    const nodes: LayoutNode[] = [];
    let idCounter = 0;
    let slotCounter = 0;

    function walk(node: ASTNode, depth: number, parentId: number | null): number {
      const id = idCounter++;
      const idx = nodes.length;
      nodes.push({ id, node, depth, slot: -1, x: 0, y: 0, value: null, parentId });

      if (node.kind === 'num') {
        nodes[idx].slot = slotCounter++;
      } else if (node.kind === 'unary') {
        const childSlot = walk(node.child, depth + 1, id);
        nodes[idx].slot = childSlot;
      } else {
        const leftSlot = walk(node.left, depth + 1, id);
        const rightSlot = walk(node.right, depth + 1, id);
        nodes[idx].slot = (leftSlot + rightSlot) / 2;
      }

      return nodes[idx].slot;
    }

    walk(root, 0, null);

    // Assign pixel coords
    for (const n of nodes) {
      n.x = n.slot * (NODE_W + H_GAP) + NODE_W / 2;
      n.y = n.depth * V_GAP + NODE_H / 2;
    }

    return nodes;
  }

  function postOrder(nodes: LayoutNode[]): number[] {
    // returns ids in post-order
    const result: number[] = [];
    const byId = new Map(nodes.map(n => [n.id, n]));

    function walk(id: number) {
      const n = byId.get(id)!;
      if (n.node.kind === 'num') {
        result.push(id);
        return;
      }
      if (n.node.kind === 'unary') {
        walk(nodes.find(c => c.parentId === id)!.id);
        result.push(id);
        return;
      }
      // op: find left and right children
      const children = nodes.filter(c => c.parentId === id);
      // left child is the one corresponding to node.left; we need to identify
      // them by slot: left child has smaller slot
      children.sort((a, b) => a.slot - b.slot);
      walk(children[0].id);
      walk(children[1].id);
      result.push(id);
    }

    const root = nodes.find(n => n.parentId === null)!;
    if (root) walk(root.id);
    return result;
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  let expr = $state(initial);
  let parseError = $state<string | null>(null);

  let layoutNodes = $state<LayoutNode[]>([]);
  let postOrderIds = $state<number[]>([]);
  let stepIdx = $state(-1);         // -1 = not started
  let evaluatedMap = $state<Map<number, number>>(new Map());
  let isRunning = $state(false);
  let runTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  // Compute SVG dimensions
  const svgWidth = $derived.by(() => {
    if (layoutNodes.length === 0) return 300;
    const maxX = Math.max(...layoutNodes.map(n => n.x)) + NODE_W / 2 + 12;
    return Math.max(maxX, 120);
  });

  const svgHeight = $derived.by(() => {
    if (layoutNodes.length === 0) return 120;
    const maxY = Math.max(...layoutNodes.map(n => n.y)) + NODE_H / 2 + 12;
    return Math.max(maxY, 80);
  });

  const activeId = $derived(stepIdx >= 0 && stepIdx < postOrderIds.length
    ? postOrderIds[stepIdx]
    : null);

  const finalValue = $derived.by(() => {
    if (stepIdx < postOrderIds.length - 1) return null;
    if (postOrderIds.length === 0) return null;
    const rootId = postOrderIds[postOrderIds.length - 1];
    return evaluatedMap.get(rootId) ?? null;
  });

  // ─── Reactive parse on expression change ────────────────────────────────────

  $effect(() => {
    const raw = expr;
    resetWalk();
    try {
      const ast = parse(raw.trim());
      const nodes = buildLayout(ast);
      layoutNodes = nodes;
      postOrderIds = postOrder(nodes);
      parseError = null;
    } catch (e: unknown) {
      layoutNodes = [];
      postOrderIds = [];
      parseError = e instanceof Error ? e.message : String(e);
    }
  });

  // ─── Walk controls ───────────────────────────────────────────────────────────

  function resetWalk() {
    stopRun();
    stepIdx = -1;
    evaluatedMap = new Map();
  }

  function step() {
    if (stepIdx >= postOrderIds.length - 1) return;
    const nextIdx = stepIdx + 1;
    const id = postOrderIds[nextIdx];
    const node = layoutNodes.find(n => n.id === id)!;

    // Compute value using already-evaluated children or leaf value
    let val: number;
    if (node.node.kind === 'num') {
      val = node.node.value;
    } else if (node.node.kind === 'unary') {
      const child = layoutNodes.find(n => n.parentId === id)!;
      val = node.node.op === '-' ? -(evaluatedMap.get(child.id) ?? 0) : (evaluatedMap.get(child.id) ?? 0);
    } else {
      const children = layoutNodes.filter(n => n.parentId === id).sort((a, b) => a.slot - b.slot);
      const lv = evaluatedMap.get(children[0].id) ?? 0;
      const rv = evaluatedMap.get(children[1].id) ?? 0;
      if (node.node.op === '+') val = lv + rv;
      else if (node.node.op === '-') val = lv - rv;
      else if (node.node.op === '*') val = lv * rv;
      else if (node.node.op === '/') val = lv / rv;
      else val = Math.pow(lv, rv);
    }

    const newMap = new Map(evaluatedMap);
    newMap.set(id, val);
    evaluatedMap = newMap;
    stepIdx = nextIdx;
  }

  function startRun() {
    if (isRunning) return;
    if (stepIdx >= postOrderIds.length - 1) resetWalk();
    isRunning = true;
    tick();
  }

  function tick() {
    if (stepIdx >= postOrderIds.length - 1) {
      isRunning = false;
      return;
    }
    step();
    runTimer = setTimeout(tick, 700);
  }

  function stopRun() {
    if (runTimer !== null) { clearTimeout(runTimer); runTimer = null; }
    isRunning = false;
  }

  onDestroy(stopRun);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function nodeLabel(node: ASTNode): string {
    if (node.kind === 'num') return String(node.value);
    if (node.kind === 'unary') return node.op;
    return node.op;
  }

  function fmt(v: number): string {
    if (!isFinite(v)) return '?';
    if (Number.isInteger(v) && Math.abs(v) < 1e9) return String(v);
    return parseFloat(v.toPrecision(5)).toString();
  }

  function edgesFor(): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    return layoutNodes
      .filter(n => n.parentId !== null)
      .map(n => {
        const parent = layoutNodes.find(p => p.id === n.parentId)!;
        return { x1: parent.x, y1: parent.y + NODE_H / 2, x2: n.x, y2: n.y - NODE_H / 2 };
      });
  }

  // Prefers-reduced-motion
  let prefersReduced = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced = mq.matches;
    const handler = (e: MediaQueryListEvent) => { prefersReduced = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });
</script>

<div class="widget">
  <!-- Input row -->
  <div class="input-row">
    <label class="field" for="expr-input">
      <span class="lbl">expression</span>
      <input
        id="expr-input"
        type="text"
        class="expr-input"
        bind:value={expr}
        spellcheck="false"
        autocomplete="off"
        aria-label="arithmetic expression"
        aria-invalid={parseError !== null}
      />
    </label>
  </div>

  {#if parseError}
    <p class="error" role="alert">couldn't parse; check your parentheses ({parseError})</p>
  {/if}

  <!-- SVG stage -->
  {#if layoutNodes.length > 0}
    <div class="stage" aria-hidden="true">
      <svg
        viewBox="0 0 {svgWidth} {svgHeight}"
        width={svgWidth}
        height={svgHeight}
        style="width:100%;height:auto;display:block;"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- edges -->
        {#each edgesFor() as e}
          <line
            x1={e.x1} y1={e.y1}
            x2={e.x2} y2={e.y2}
            stroke="var(--site-fg-muted)"
            stroke-width="1.5"
            opacity="0.45"
          />
        {/each}

        <!-- nodes -->
        {#each layoutNodes as n (n.id)}
          {@const isActive = n.id === activeId}
          {@const isDone = evaluatedMap.has(n.id)}
          {@const isRoot = n.parentId === null}
          {@const val = evaluatedMap.get(n.id)}
          {@const label = nodeLabel(n.node)}
          {@const rx = n.x - NODE_W / 2}
          {@const ry = n.y - NODE_H / 2}

          <!-- background rect -->
          <rect
            x={rx} y={ry}
            width={NODE_W} height={NODE_H}
            rx="7"
            fill={isActive
              ? 'color-mix(in srgb, var(--ink-sun) 22%, var(--demo-stage))'
              : isDone
              ? 'color-mix(in srgb, var(--cta) 12%, var(--demo-stage))'
              : 'var(--demo-stage)'}
            stroke={isActive
              ? 'var(--ink-sun)'
              : isDone
              ? 'var(--cta)'
              : 'color-mix(in srgb, var(--site-fg) 18%, transparent)'}
            stroke-width={isActive ? 2 : 1.25}
            style={!prefersReduced ? 'transition: fill 220ms ease, stroke 220ms ease' : ''}
          />

          <!-- main label -->
          <text
            x={n.x} y={n.y + 1}
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="var(--font-mono)"
            font-size={n.node.kind === 'num' ? 13 : 15}
            font-weight={n.node.kind === 'op' || n.node.kind === 'unary' ? 700 : 500}
            fill={isActive
              ? 'var(--ink-sun)'
              : isDone
              ? 'var(--cta)'
              : 'var(--site-fg)'}
            style={!prefersReduced ? 'transition: fill 220ms ease' : ''}
          >{label}</text>

          <!-- value badge (shown once evaluated) -->
          {#if isDone && val !== undefined}
            <text
              x={n.x} y={ry - 5}
              text-anchor="middle"
              dominant-baseline="auto"
              font-family="var(--font-mono)"
              font-size="10"
              fill={isActive ? 'var(--ink-sun)' : 'color-mix(in srgb, var(--cta) 80%, var(--site-fg))'}
            >={fmt(val)}</text>
          {/if}

          <!-- root crown when fully done -->
          {#if isRoot && finalValue !== null}
            <rect
              x={rx - 2} y={ry - 2}
              width={NODE_W + 4} height={NODE_H + 4}
              rx="9"
              fill="none"
              stroke="var(--cta)"
              stroke-width="2.5"
              opacity="0.55"
            />
          {/if}
        {/each}
      </svg>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button
        type="button"
        class="ctrl-btn"
        onclick={step}
        disabled={isRunning || stepIdx >= postOrderIds.length - 1}
        aria-label="advance one step"
      >Step →</button>

      {#if !isRunning}
        <button
          type="button"
          class="ctrl-btn run"
          onclick={startRun}
          disabled={stepIdx >= postOrderIds.length - 1 && finalValue !== null}
          aria-label="auto-run traversal"
        >▶ Run</button>
      {:else}
        <button
          type="button"
          class="ctrl-btn run"
          onclick={stopRun}
          aria-label="pause traversal"
        >⏸ Pause</button>
      {/if}

      <button
        type="button"
        class="ctrl-btn reset"
        onclick={resetWalk}
        aria-label="reset traversal"
      >↺ Reset</button>
    </div>

    <!-- Readout -->
    <div class="readout" aria-live="polite">
      {#if finalValue !== null}
        <span class="final-value">= {fmt(finalValue)}</span>
      {:else if activeId !== null}
        {@const active = layoutNodes.find(n => n.id === activeId)!}
        {@const val = evaluatedMap.get(activeId)}
        <span class="step-hint">
          {#if active.node.kind === 'num'}
            leaf <code>{nodeLabel(active.node)}</code> → {fmt(active.node.value)}
          {:else}
            <code>{nodeLabel(active.node)}</code>
            {val !== undefined ? `→ ${fmt(val)}` : ''}
          {/if}
        </span>
      {:else}
        <span class="idle-hint">press Step or Run to walk the tree in post-order</span>
      {/if}
    </div>
  {/if}

  <!-- Caption -->
  <p class="caption">
    Post-order traversal = the forward pass: leaves first, root last, every node resolved before its parent.
  </p>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* ── Input ── */
  .input-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 180px;
  }
  .lbl {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .expr-input {
    font-family: var(--font-mono);
    font-size: 16px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    width: 100%;
    box-sizing: border-box;
  }
  .expr-input[aria-invalid="true"] {
    border-color: var(--ink-red);
  }

  /* ── Error ── */
  .error {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--ink-red);
    background: color-mix(in srgb, var(--ink-red) 8%, var(--demo-card));
    border-radius: 6px;
    padding: 6px 10px;
  }

  /* ── Stage ── */
  .stage {
    background: var(--demo-stage);
    border-radius: 12px;
    overflow: auto;
    padding: 12px;
    min-height: 80px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  /* ── Controls ── */
  .controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ctrl-btn {
    font-family: var(--font-mono);
    font-size: 13px;
    padding: 6px 14px;
    border-radius: 7px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    transition: transform 120ms ease-out, opacity 120ms ease-out;
  }
  .ctrl-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .ctrl-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .ctrl-btn.run {
    background: color-mix(in srgb, var(--ink-coral) 14%, var(--demo-stage));
    border-color: var(--ink-coral);
    color: var(--ink-coral);
    font-weight: 600;
  }
  .ctrl-btn.reset {
    color: var(--site-fg-muted);
  }

  /* ── Readout ── */
  .readout {
    font-family: var(--font-mono);
    font-size: 14px;
    min-height: 24px;
  }
  .final-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--cta);
    font-family: var(--font-mono);
  }
  .step-hint {
    color: var(--site-fg);
  }
  .step-hint code {
    background: color-mix(in srgb, var(--ink-sun) 16%, transparent);
    color: var(--ink-sun);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: var(--font-mono);
  }
  .idle-hint {
    color: var(--site-fg-muted);
    font-size: 12px;
  }

  /* ── Caption ── */
  .caption {
    margin: 0;
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--site-fg-muted);
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    padding-top: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .ctrl-btn { transition: none; }
  }
</style>
