<script lang="ts">
  // ─── AST Types ───────────────────────────────────────────────────────────────

  type Expr =
    | { kind: 'num'; value: number }
    | { kind: 'term'; coef: number; varName: string }  // e.g. 3x, -x
    | { kind: 'op'; op: '+' | '-' | '*'; left: Expr; right: Expr };

  // ─── Presets ─────────────────────────────────────────────────────────────────

  interface Preset {
    label: string;
    expr: Expr;
    xVal: number;
  }

  function makePresets(): Preset[] {
    // 3·(2x + 5) − (x − 4)  →  evaluates at x=2 as 3*(4+5)-(2-4) = 27+2 = 29
    const p1: Expr = {
      kind: 'op', op: '-',
      left: {
        kind: 'op', op: '*',
        left: { kind: 'num', value: 3 },
        right: {
          kind: 'op', op: '+',
          left: { kind: 'term', coef: 2, varName: 'x' },
          right: { kind: 'num', value: 5 }
        }
      },
      right: {
        kind: 'op', op: '-',
        left: { kind: 'term', coef: 1, varName: 'x' },
        right: { kind: 'num', value: 4 }
      }
    };

    // 2·(3x − 1) − 4  →  at x=2: 2*(6-1)-4 = 10-4 = 6
    const p2: Expr = {
      kind: 'op', op: '-',
      left: {
        kind: 'op', op: '*',
        left: { kind: 'num', value: 2 },
        right: {
          kind: 'op', op: '-',
          left: { kind: 'term', coef: 3, varName: 'x' },
          right: { kind: 'num', value: 1 }
        }
      },
      right: { kind: 'num', value: 4 }
    };

    // 4a + 7 − 2a + 3  →  at a=2: 8+7-4+3 = 14
    const p3: Expr = {
      kind: 'op', op: '+',
      left: {
        kind: 'op', op: '-',
        left: {
          kind: 'op', op: '+',
          left: { kind: 'term', coef: 4, varName: 'a' },
          right: { kind: 'num', value: 7 }
        },
        right: { kind: 'term', coef: 2, varName: 'a' }
      },
      right: { kind: 'num', value: 3 }
    };

    return [
      { label: '3(2x+5) − (x−4)', expr: p1, xVal: 2 },
      { label: '2(3x−1) − 4',     expr: p2, xVal: 2 },
      { label: '4a+7 − 2a+3',     expr: p3, xVal: 2 },
    ];
  }

  const PRESETS = makePresets();

  // ─── Evaluator ───────────────────────────────────────────────────────────────

  function evaluate(e: Expr, varVal: number, varName: string): number {
    if (e.kind === 'num') return e.value;
    if (e.kind === 'term') return e.coef * varVal;
    const l = evaluate(e.left, varVal, varName);
    const r = evaluate(e.right, varVal, varName);
    if (e.op === '+') return l + r;
    if (e.op === '-') return l - r;
    return l * r;
  }

  // ─── Pretty-printer ──────────────────────────────────────────────────────────

  function pretty(e: Expr, parentOp?: string, side?: 'left' | 'right'): string {
    if (e.kind === 'num') return String(e.value);
    if (e.kind === 'term') {
      if (e.coef === 1) return e.varName;
      if (e.coef === -1) return '-' + e.varName;
      return String(e.coef) + e.varName;
    }
    const lStr = pretty(e.left, e.op, 'left');
    const rStr = pretty(e.right, e.op, 'right');
    let inner = '';
    if (e.op === '*') {
      inner = lStr + '·' + rStr;
    } else {
      inner = lStr + ' ' + e.op + ' ' + rStr;
    }
    // Parenthesise when needed for unambiguous display
    const needParens =
      (parentOp === '*' && (e.op === '+' || e.op === '-')) ||
      (parentOp === '-' && side === 'right' && (e.op === '+' || e.op === '-'));
    return needParens ? '(' + inner + ')' : inner;
  }

  // ─── Deep-clone ──────────────────────────────────────────────────────────────

  function clone(e: Expr): Expr {
    if (e.kind === 'num') return { ...e };
    if (e.kind === 'term') return { ...e };
    return { kind: 'op', op: e.op, left: clone(e.left), right: clone(e.right) };
  }

  // ─── Rewrite Rules ───────────────────────────────────────────────────────────

  // Returns null if the rule doesn't apply; otherwise the new subtree
  function tryDistribute(e: Expr): Expr | null {
    if (e.kind !== 'op' || e.op !== '*') return null;
    const { left, right } = e;
    // a * (b ± c)
    if (right.kind === 'op' && (right.op === '+' || right.op === '-')) {
      const a = clone(left);
      return {
        kind: 'op', op: right.op,
        left:  { kind: 'op', op: '*', left: a, right: clone(right.left) },
        right: { kind: 'op', op: '*', left: clone(left), right: clone(right.right) }
      };
    }
    // (b ± c) * a  — less common but valid
    if (left.kind === 'op' && (left.op === '+' || left.op === '-')) {
      const a = clone(right);
      return {
        kind: 'op', op: left.op,
        left:  { kind: 'op', op: '*', left: clone(left.left), right: a },
        right: { kind: 'op', op: '*', left: clone(left.right), right: clone(right) }
      };
    }
    return null;
  }

  // Fold a * b where both are constants (num nodes) into a single num
  function tryFoldMul(e: Expr): Expr | null {
    if (e.kind !== 'op' || e.op !== '*') return null;
    // num * term -> term with updated coef
    if (e.left.kind === 'num' && e.right.kind === 'term') {
      return { kind: 'term', coef: e.left.value * e.right.coef, varName: e.right.varName };
    }
    if (e.right.kind === 'num' && e.left.kind === 'term') {
      return { kind: 'term', coef: e.right.value * e.left.coef, varName: e.left.varName };
    }
    if (e.left.kind === 'num' && e.right.kind === 'num') {
      return { kind: 'num', value: e.left.value * e.right.value };
    }
    return null;
  }

  // Check if two exprs are "like terms" (can be combined under + or -)
  function likeTermInfo(
    a: Expr, b: Expr, op: '+' | '-'
  ): Expr | null {
    // num + num
    if (a.kind === 'num' && b.kind === 'num') {
      const val = op === '+' ? a.value + b.value : a.value - b.value;
      return { kind: 'num', value: val };
    }
    // term + term (same varName)
    if (a.kind === 'term' && b.kind === 'term' && a.varName === b.varName) {
      const coef = op === '+' ? a.coef + b.coef : a.coef - b.coef;
      if (coef === 0) return { kind: 'num', value: 0 };
      return { kind: 'term', coef, varName: a.varName };
    }
    return null;
  }

  function tryCombine(e: Expr): Expr | null {
    if (e.kind !== 'op' || (e.op !== '+' && e.op !== '-')) return null;
    const combined = likeTermInfo(e.left, e.right, e.op);
    if (combined !== null) return combined;
    return null;
  }

  // Factor: a*b + a*c → a*(b+c)  or  num*x + num2*x → (num+num2)*x (handled by combine)
  function tryFactor(e: Expr): Expr | null {
    if (e.kind !== 'op' || (e.op !== '+' && e.op !== '-')) return null;
    const { left, right, op } = e;
    if (left.kind !== 'op' || left.op !== '*') return null;
    if (right.kind !== 'op' || right.op !== '*') return null;
    // Check if left.left == right.left (same num factor)
    const la = left.left; const lb = left.right;
    const ra = right.left; const rb = right.right;
    if (la.kind === 'num' && ra.kind === 'num' && la.value === ra.value) {
      return {
        kind: 'op', op: '*',
        left: clone(la),
        right: { kind: 'op', op, left: clone(lb), right: clone(rb) }
      };
    }
    return null;
  }

  // ─── Apply rule to node identified by path ────────────────────────────────────

  type Path = ('left' | 'right')[];

  function getAt(e: Expr, path: Path): Expr {
    let cur: Expr = e;
    for (const step of path) {
      if (cur.kind !== 'op') throw new Error('bad path');
      cur = cur[step];
    }
    return cur;
  }

  type RuleId = 'distribute' | 'combine' | 'foldMul' | 'factor';

  function applyAt(root: Expr, path: Path, rule: RuleId): Expr {
    if (path.length === 0) {
      const node = getAt(root, []);
      let result: Expr | null = null;
      if (rule === 'distribute') result = tryDistribute(node);
      if (rule === 'combine')   result = tryCombine(node);
      if (rule === 'foldMul')   result = tryFoldMul(node);
      if (rule === 'factor')    result = tryFactor(node);
      return result ?? root;
    }
    const [step, ...rest] = path;
    if (root.kind !== 'op') return root;
    if (step === 'left') {
      return { ...clone(root), left: applyAt(root.left, rest, rule) };
    } else {
      return { ...clone(root), right: applyAt(root.right, rest, rule) };
    }
  }

  // ─── Available rules for a node ──────────────────────────────────────────────

  interface AvailableRule {
    id: RuleId;
    label: string;
    desc: string;
  }

  function rulesForNode(e: Expr): AvailableRule[] {
    const rules: AvailableRule[] = [];
    if (tryDistribute(e)) rules.push({
      id: 'distribute',
      label: 'Distribute',
      desc: 'Expand: a·(b±c) → a·b ± a·c'
    });
    if (tryCombine(e)) rules.push({
      id: 'combine',
      label: 'Combine like terms',
      desc: 'Merge matching terms into one'
    });
    if (tryFoldMul(e)) rules.push({
      id: 'foldMul',
      label: 'Simplify product',
      desc: 'Multiply the constants together'
    });
    if (tryFactor(e)) rules.push({
      id: 'factor',
      label: 'Factor out',
      desc: 'Reverse distribute: a·b ± a·c → a·(b±c)'
    });
    return rules;
  }

  // Check if any rule is applicable anywhere in tree
  function anyRuleApplies(e: Expr): boolean {
    const local = rulesForNode(e);
    if (local.length > 0) return true;
    if (e.kind === 'op') {
      return anyRuleApplies(e.left) || anyRuleApplies(e.right);
    }
    return false;
  }

  // ─── SVG Tree Layout ─────────────────────────────────────────────────────────

  const NODE_R = 22;     // node circle radius
  const V_GAP  = 64;     // vertical spacing between levels
  const H_GAP  = 14;     // horizontal gap between leaf slots

  interface LayoutNode {
    id: string;
    expr: Expr;
    path: Path;
    x: number;
    y: number;
    label: string;
    parentId: string | null;
    rules: AvailableRule[];
  }

  let idSeq = 0;
  function buildLayout(e: Expr, path: Path, depth: number, parentId: string | null): LayoutNode[] {
    const myId = 'n' + idSeq++;
    const nodes: LayoutNode[] = [];
    const label = nodeLabel(e);
    const rules = rulesForNode(e);

    if (e.kind === 'op') {
      idSeq; // already incremented
      const leftNodes  = buildLayout(e.left,  [...path, 'left'],  depth + 1, myId);
      const rightNodes = buildLayout(e.right, [...path, 'right'], depth + 1, myId);
      nodes.push(...leftNodes, ...rightNodes);
      const leftRoot  = leftNodes[leftNodes.length - 1];   // last pushed = the root of left subtree
      const rightRoot = rightNodes[rightNodes.length - 1];
      const mx = (leftRoot.x + rightRoot.x) / 2;
      nodes.push({ id: myId, expr: e, path, x: mx, y: depth * V_GAP, label, parentId, rules });
    } else {
      // Leaf: assign x later during final pass
      nodes.push({ id: myId, expr: e, path, x: 0, y: depth * V_GAP, label, parentId, rules });
    }
    return nodes;
  }

  function nodeLabel(e: Expr): string {
    if (e.kind === 'num') return String(e.value);
    if (e.kind === 'term') {
      if (e.coef === 1) return e.varName;
      if (e.coef === -1) return '-' + e.varName;
      return e.coef + e.varName;
    }
    return e.op === '*' ? '×' : e.op;
  }

  function layout(root: Expr): { nodes: LayoutNode[]; width: number; height: number } {
    idSeq = 0;
    const raw = buildLayout(root, [], 0, null);

    // Assign x to leaves in order
    const leaves = raw.filter(n => n.expr.kind !== 'op');
    const leafW = NODE_R * 2 + H_GAP;
    leaves.forEach((leaf, i) => { leaf.x = i * leafW + NODE_R + H_GAP; });

    // Bottom-up: fix x of internal nodes to be midpoint of children
    const byId = new Map(raw.map(n => [n.id, n]));
    // Process nodes from deepest to shallowest
    const sorted = [...raw].sort((a, b) => b.y - a.y);
    for (const n of sorted) {
      if (n.expr.kind === 'op') {
        // find children (nodes whose parentId === n.id)
        const children = raw.filter(c => c.parentId === n.id);
        if (children.length > 0) {
          n.x = children.reduce((sum, c) => sum + c.x, 0) / children.length;
        }
      }
    }

    const maxX = Math.max(...raw.map(n => n.x)) + NODE_R + H_GAP;
    const maxY = Math.max(...raw.map(n => n.y)) + NODE_R * 2 + 16;
    return { nodes: raw, width: maxX, height: maxY };
  }

  // ─── State ───────────────────────────────────────────────────────────────────

  let presetIdx = $state(0);
  let expr = $state<Expr>(clone(PRESETS[0].expr));
  let selectedPath = $state<Path | null>(null);
  let history = $state<Expr[]>([]);
  let animKey = $state(0); // bump to trigger CSS transition

  const preset = $derived(PRESETS[presetIdx]);
  const xVal = $derived(preset.xVal);
  const varName = $derived(inferVar(expr));

  function inferVar(e: Expr): string {
    if (e.kind === 'term') return e.varName;
    if (e.kind === 'op') {
      return inferVar(e.left) || inferVar(e.right);
    }
    return 'x';
  }

  const currentValue = $derived(evaluate(expr, xVal, varName));
  const canonicalValue = $derived(evaluate(PRESETS[presetIdx].expr, xVal, varName));

  const linearForm = $derived(pretty(expr));
  const simplified = $derived(!anyRuleApplies(expr));

  const treeLayout = $derived(layout(expr));

  const selectedNode = $derived(
    selectedPath !== null
      ? treeLayout.nodes.find(n => pathEq(n.path, selectedPath!)) ?? null
      : null
  );

  const availableRules = $derived(selectedNode ? rulesForNode(selectedNode.expr) : []);

  function pathEq(a: Path, b: Path): boolean {
    if (a.length !== b.length) return false;
    return a.every((s, i) => s === b[i]);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  function selectNode(path: Path) {
    if (selectedPath && pathEq(selectedPath, path)) {
      selectedPath = null;
    } else {
      selectedPath = path;
    }
  }

  function applyRule(rule: RuleId) {
    if (selectedPath === null) return;
    history = [...history, clone(expr)];
    expr = applyAt(expr, selectedPath, rule);
    selectedPath = null;
    animKey++;
  }

  function undo() {
    if (history.length === 0) return;
    expr = history[history.length - 1];
    history = history.slice(0, -1);
    selectedPath = null;
    animKey++;
  }

  function reset() {
    expr = clone(PRESETS[presetIdx].expr);
    history = [];
    selectedPath = null;
    animKey++;
  }

  function switchPreset(idx: number) {
    presetIdx = idx;
    expr = clone(PRESETS[idx].expr);
    history = [];
    selectedPath = null;
    animKey++;
  }

  // ─── SVG sizing ──────────────────────────────────────────────────────────────

  const SVG_PAD = 16;
  const svgWidth  = $derived(Math.max(treeLayout.width  + SVG_PAD * 2, 280));
  const svgHeight = $derived(Math.max(treeLayout.height + SVG_PAD,     120));

  // Clickable = has at least one rule OR its parent does (we let user click any node)
  // Actually: click any node; the panel shows only applicable rules.
  // Highlight clickable = nodes where rules apply
  function isClickable(n: LayoutNode): boolean {
    return n.rules.length > 0;
  }

  function nodeColor(n: LayoutNode): string {
    if (selectedNode && pathEq(n.path, selectedNode.path)) return 'var(--ink-red)';
    if (n.expr.kind === 'op') return 'var(--ink-sea)';
    if (n.expr.kind === 'term') return 'var(--ink-coral)';
    return 'var(--ink-sun)';
  }

  function nodeFg(n: LayoutNode): string {
    // Always white-ish on saturated bg
    return 'var(--on-color-fg)';
  }
</script>

<div class="widget">
  <!-- Preset picker -->
  <div class="toolbar" role="group" aria-label="Choose expression">
    {#each PRESETS as p, i}
      <button
        class="preset-btn"
        class:active={presetIdx === i}
        onclick={() => switchPreset(i)}
        aria-pressed={presetIdx === i}
      >{p.label}</button>
    {/each}
  </div>

  <!-- SVG Tree -->
  <div class="stage" aria-label="Expression tree diagram">
    {#key animKey}
      <svg
        class="tree-svg"
        viewBox="{-SVG_PAD} {-SVG_PAD} {svgWidth} {svgHeight}"
        width={svgWidth}
        height={svgHeight}
        aria-hidden="true"
      >
        <!-- Edges -->
        {#each treeLayout.nodes as n}
          {#if n.parentId !== null}
            {@const parent = treeLayout.nodes.find(p => p.id === n.parentId)}
            {#if parent}
              <line
                x1={parent.x} y1={parent.y}
                x2={n.x}      y2={n.y}
                stroke="color-mix(in srgb, var(--site-fg) 22%, transparent)"
                stroke-width="2"
              />
            {/if}
          {/if}
        {/each}

        <!-- Nodes -->
        {#each treeLayout.nodes as n}
          {@const clickable = isClickable(n)}
          {@const isSelected = selectedNode !== null && pathEq(n.path, selectedNode.path)}
          <g
            class="tree-node"
            class:clickable
            class:selected={isSelected}
            onclick={() => selectNode(n.path)}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(n.path); }}}
            role="button"
            tabindex={clickable ? 0 : -1}
            aria-label="{n.label} node{clickable ? ', click to apply rewrite' : ''}"
            aria-pressed={isSelected}
          >
            <!-- Hover ring for clickable nodes -->
            {#if clickable && !isSelected}
              <circle
                cx={n.x} cy={n.y}
                r={NODE_R + 4}
                fill="none"
                stroke="color-mix(in srgb, var(--ink-sea) 35%, transparent)"
                stroke-width="2"
                stroke-dasharray="4 3"
                class="pulse-ring"
              />
            {/if}
            <circle
              cx={n.x} cy={n.y}
              r={NODE_R}
              fill={nodeColor(n)}
              stroke={isSelected ? 'var(--on-color-fg)' : 'none'}
              stroke-width={isSelected ? 2 : 0}
              style="filter: drop-shadow(0 2px 6px color-mix(in srgb, {nodeColor(n)} 50%, transparent))"
            />
            <text
              x={n.x} y={n.y}
              text-anchor="middle"
              dominant-baseline="central"
              font-family="var(--font-mono)"
              font-size={n.label.length > 3 ? '10' : '13'}
              font-weight="600"
              fill={nodeFg(n)}
              pointer-events="none"
            >{n.label}</text>
          </g>
        {/each}
      </svg>
    {/key}
  </div>

  <!-- Readout -->
  <div class="readout" aria-live="polite">
    <!-- Invariant value -->
    <div class="invariant">
      <span class="invariant-label">Invariant</span>
      <span class="invariant-eq">value at {varName} = {xVal}</span>
      <span class="invariant-val">{currentValue}</span>
      {#if Math.abs(currentValue - canonicalValue) > 0.001}
        <span class="invariant-warn" role="alert">Changed! (expected {canonicalValue})</span>
      {/if}
    </div>

    <!-- Linear expression -->
    <div class="linear-expr">
      <span class="expr-label">Expression:</span>
      <span class="expr-text">{linearForm}</span>
    </div>

    <!-- Simplified badge -->
    {#if simplified}
      <div class="simplified-badge" role="status" aria-live="polite">
        Fully simplified &#10003;
      </div>
    {/if}
  </div>

  <!-- Rule panel -->
  <div class="rule-panel">
    {#if selectedNode === null}
      <p class="hint">
        {#if simplified}
          No more rewrites available. The expression is fully simplified.
        {:else}
          Click a node to see available rewrite rules.
          Dashed-ring nodes have rules ready to apply.
        {/if}
      </p>
    {:else if availableRules.length === 0}
      <p class="hint">No rewrite rules apply to this node. Try a parent or sibling.</p>
    {:else}
      <div class="rules-list" role="group" aria-label="Available rewrite rules">
        {#each availableRules as rule}
          <button class="rule-btn" onclick={() => applyRule(rule.id)}>
            <span class="rule-name">{rule.label}</span>
            <span class="rule-desc">{rule.desc}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="action-row">
      <button class="action-btn" onclick={undo} disabled={history.length === 0} aria-label="Undo last rewrite">
        &larr; Undo
      </button>
      <button class="action-btn" onclick={reset} aria-label="Reset to original expression">
        Reset
      </button>
    </div>
  </div>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.9rem, 2vw, 1.25rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 50%, transparent);
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .preset-btn {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    padding: 0.3rem 0.65rem;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--site-border);
    background: transparent;
    color: var(--site-fg-muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    line-height: 1.3;
  }

  .preset-btn:hover {
    border-color: var(--ink-sea);
    color: var(--site-fg);
  }

  .preset-btn.active {
    background: var(--ink-sea);
    border-color: var(--ink-sea);
    color: var(--on-color-fg);
    font-weight: 600;
  }

  /* ── Stage ── */
  .stage {
    width: 100%;
    background: var(--demo-stage);
    border-radius: var(--radius-lg);
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    padding: 0.5rem 0;
  }

  .tree-svg {
    display: block;
    max-width: 100%;
    overflow: visible;
  }

  /* Node hover/click */
  .tree-node {
    cursor: default;
    outline: none;
  }

  .tree-node.clickable {
    cursor: pointer;
  }

  .tree-node.clickable circle:last-of-type {
    transition: r 0.15s ease;
  }

  .tree-node.clickable:hover circle:last-of-type,
  .tree-node.clickable:focus circle:last-of-type {
    r: 25;
  }

  .pulse-ring {
    animation: pulse-dash 2s linear infinite;
  }

  @keyframes pulse-dash {
    to { stroke-dashoffset: -14; }
  }

  /* ── Readout ── */
  .readout {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.6rem;
  }

  .invariant {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    background: color-mix(in srgb, var(--ink-teal) 12%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--ink-teal) 40%, transparent);
    border-radius: var(--radius-md);
    padding: 0.4rem 0.75rem;
  }

  .invariant-label {
    font-family: var(--font-body);
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-teal);
    background: color-mix(in srgb, var(--ink-teal) 18%, transparent);
    border-radius: var(--radius-pill);
    padding: 0.1rem 0.45rem;
  }

  .invariant-eq {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--site-fg-muted);
    flex: 1;
  }

  .invariant-val {
    font-family: var(--font-mono);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--ink-teal);
    line-height: 1;
  }

  .invariant-warn {
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: var(--site-error);
    font-weight: 600;
  }

  .linear-expr {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .expr-label {
    font-family: var(--font-body);
    font-size: 0.75rem;
    color: var(--site-fg-muted);
    white-space: nowrap;
  }

  .expr-text {
    font-family: var(--font-mono);
    font-size: 0.92rem;
    color: var(--site-fg);
    font-weight: 500;
  }

  .simplified-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--ink-teal);
    background: color-mix(in srgb, var(--ink-teal) 12%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--ink-teal) 35%, transparent);
    border-radius: var(--radius-pill);
    padding: 0.25rem 0.75rem;
    align-self: flex-start;
  }

  /* ── Rule panel ── */
  .rule-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.78rem;
    color: var(--site-fg-muted);
    line-height: 1.5;
  }

  .rules-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .rule-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    padding: 0.5rem 0.85rem;
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--ink-red) 25%, transparent);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }

  .rule-btn:hover {
    background: color-mix(in srgb, var(--ink-red) 16%, transparent);
    border-color: var(--ink-red);
  }

  .rule-name {
    font-family: var(--font-body);
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-red);
  }

  .rule-desc {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--site-fg-muted);
  }

  /* ── Action row ── */
  .action-row {
    display: flex;
    gap: 0.4rem;
  }

  .action-btn {
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.3rem 0.8rem;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--site-border);
    background: transparent;
    color: var(--site-fg-muted);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .action-btn:hover:not(:disabled) {
    border-color: var(--site-fg);
    color: var(--site-fg);
  }

  .action-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* ── Mobile ── */
  @media (max-width: 520px) {
    .preset-btn {
      font-size: 0.66rem;
      padding: 0.25rem 0.5rem;
    }

    .invariant-val {
      font-size: 1.05rem;
    }

    .expr-text {
      font-size: 0.82rem;
    }

    .rule-btn {
      padding: 0.4rem 0.65rem;
    }

    .rule-desc {
      font-size: 0.66rem;
    }
  }
</style>
