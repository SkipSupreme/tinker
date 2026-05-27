<script lang="ts">
  /**
   * PeelInversesGame: solving a·x + b = c by choosing inverse operations
   * outside-in on an AST, watching the equation peel down step-by-step.
   */

  import { onDestroy } from 'svelte';

  interface Props {
    a?: number;
    b?: number;
    c?: number;
  }

  let { a = 3, b = 7, c = 19 }: Props = $props();

  // ── AST node types ─────────────────────────────────────────────
  type NodeKind = 'add' | 'mul' | 'leaf';

  interface AstNode {
    kind: NodeKind;
    operand: number; // b for add, a for mul; ignored for leaf
  }

  // The equation starts as: add(b, mul(a, x))
  // We peel add first, then mul, leaving x.
  // layers[0] = outermost. layers goes from outermost → leaf.
  const initialLayers: AstNode[] = [
    { kind: 'add', operand: b },
    { kind: 'mul', operand: a },
  ];

  // ── Game state ─────────────────────────────────────────────────
  let layers = $state<AstNode[]>([...initialLayers]);
  let peeled = $state(0);          // how many layers have been peeled
  let rhs = $state(c);             // current right-hand side value
  let feedback = $state<string>('');
  let feedbackKind = $state<'ok' | 'bad' | ''>('');
  let feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  // Reduced-motion preference
  let prefersReducedMotion = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = mq.matches;
    const handler = (e: MediaQueryListEvent) => { prefersReducedMotion = e.matches; };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  // ── Derived display values ─────────────────────────────────────
  const currentOuter = $derived(layers[peeled] as AstNode | undefined);
  const solved = $derived(peeled >= layers.length);

  // x candidate: once fully peeled rhs IS x; before that, partial
  // Track the running rhs as we peel
  const xValue = $derived(solved ? rhs : null);

  // Verification: always substitute into a·x + b vs c
  const verifyX = $derived.by(() => {
    const xv = solved ? rhs : null;
    if (xv === null) return null;
    return { lhs: a * xv + b, residual: a * xv + b - c };
  });

  // Human-readable equation at each step
  const equationDisplay = $derived.by(() => {
    if (solved) return `x = ${fmt(rhs)}`;
    const remaining = layers.slice(peeled);
    // Build left-hand expression string, innermost first
    let inner = 'x';
    for (let i = remaining.length - 1; i >= 0; i--) {
      const node = remaining[i];
      if (node.kind === 'mul') {
        inner = `${fmt(node.operand)}·${inner}`;
      } else {
        inner = `${inner} + ${fmt(node.operand)}`;
      }
    }
    return `${inner} = ${fmt(rhs)}`;
  });

  // Choices for the current outer node
  interface Choice {
    label: string;
    isCorrect: boolean;
    applyRhs: (r: number) => number;
  }

  const choices = $derived.by((): Choice[] => {
    if (!currentOuter) return [];
    const { kind, operand } = currentOuter;
    if (kind === 'add') {
      return [
        { label: `− ${fmt(operand)}`, isCorrect: true,  applyRhs: r => r - operand },
        { label: `+ ${fmt(operand)}`, isCorrect: false, applyRhs: r => r + operand },
        { label: `× ${fmt(operand)}`, isCorrect: false, applyRhs: r => r * operand },
        { label: `÷ ${fmt(operand)}`, isCorrect: false, applyRhs: r => r / operand },
      ];
    } else {
      // mul
      return [
        { label: `÷ ${fmt(operand)}`, isCorrect: true,  applyRhs: r => r / operand },
        { label: `× ${fmt(operand)}`, isCorrect: false, applyRhs: r => r * operand },
        { label: `+ ${fmt(operand)}`, isCorrect: false, applyRhs: r => r + operand },
        { label: `− ${fmt(operand)}`, isCorrect: false, applyRhs: r => r - operand },
      ];
    }
  });

  // ── Helpers ────────────────────────────────────────────────────
  function fmt(n: number): string {
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2).replace(/\.?0+$/, '');
  }

  function showFeedback(msg: string, kind: 'ok' | 'bad') {
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedback = msg;
    feedbackKind = kind;
    feedbackTimer = setTimeout(() => {
      feedback = '';
      feedbackKind = '';
    }, kind === 'ok' ? 1600 : 3200);
  }

  onDestroy(() => {
    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
  });

  function choose(choice: Choice) {
    if (solved) return;
    if (choice.isCorrect) {
      rhs = choice.applyRhs(rhs);
      peeled += 1;
      if (peeled >= layers.length) {
        showFeedback('x isolated; check the verification below!', 'ok');
      } else {
        showFeedback('', 'ok');
      }
    } else {
      const wrongRhs = choice.applyRhs(rhs);
      const outer = currentOuter!;
      const opName = outer.kind === 'add' ? 'adding' : 'multiplying by';
      showFeedback(
        `That applies ${opName} ${fmt(outer.operand)} again instead of undoing it; the equation became ${wrongRhs % 1 === 0 ? wrongRhs : wrongRhs.toFixed(2)}. Try the operation that reverses it.`,
        'bad'
      );
    }
  }

  function reset() {
    layers = [...initialLayers];
    peeled = 0;
    rhs = c;
    feedback = '';
    feedbackKind = '';
    if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null; }
  }

  // ── SVG AST layout ─────────────────────────────────────────────
  // Nodes: leaf=x at bottom, mul above, add at top.
  // We hide peeled nodes. Active (outermost) is highlighted.
  const SVG_W = 280;
  const SVG_H = 200;

  interface SvgNode {
    id: string;
    label: string;
    x: number;
    y: number;
    active: boolean;   // outermost un-peeled
    peeled: boolean;
  }

  const svgNodes = $derived.by((): SvgNode[] => {
    // positions: leaf at bottom-center, mul in middle, add at top
    const positions: Record<string, { x: number; y: number }> = {
      add: { x: SVG_W / 2, y: 44 },
      mul: { x: SVG_W / 2, y: 108 },
      leaf: { x: SVG_W / 2, y: 172 },
    };
    const result: SvgNode[] = [];
    const isPeeled = (index: number) => index < peeled;
    // add is layers[0], mul is layers[1], leaf is always present
    result.push({
      id: 'add',
      label: `+ ${fmt(b)}`,
      x: positions.add.x,
      y: positions.add.y,
      active: peeled === 0,
      peeled: isPeeled(0),
    });
    result.push({
      id: 'mul',
      label: `× ${fmt(a)}`,
      x: positions.mul.x,
      y: positions.mul.y,
      active: peeled === 1,
      peeled: isPeeled(1),
    });
    result.push({
      id: 'leaf',
      label: 'x',
      x: positions.leaf.x,
      y: positions.leaf.y,
      active: solved,
      peeled: false,
    });
    return result;
  });

  // Edges: add→mul, mul→leaf
  const SVG_EDGES: [string, string][] = [['add', 'mul'], ['mul', 'leaf']];
</script>

<div class="widget">
  <!-- Header row -->
  <div class="header">
    <span class="title">Peel the Equation</span>
    <button type="button" class="reset-btn" onclick={reset} aria-label="Reset puzzle">
      Reset
    </button>
  </div>

  <!-- Equation display -->
  <div class="equation-bar" aria-live="polite">
    <span class="equation-text" class:solved>{equationDisplay}</span>
  </div>

  <!-- Main body: AST + controls side by side on desktop -->
  <div class="body">

    <!-- AST SVG -->
    <div class="ast-wrap" aria-hidden="true">
      <svg
        viewBox="0 0 {SVG_W} {SVG_H}"
        width={SVG_W}
        height={SVG_H}
        class="ast-svg"
        role="img"
        aria-label="AST showing equation structure"
      >
        <!-- Edges -->
        {#each SVG_EDGES as [fromId, toId]}
          {@const fromNode = svgNodes.find(n => n.id === fromId)!}
          {@const toNode   = svgNodes.find(n => n.id === toId)!}
          {@const edgePeeled = fromNode.peeled}
          <line
            x1={fromNode.x}
            y1={fromNode.y + 22}
            x2={toNode.x}
            y2={toNode.y - 22}
            class="ast-edge"
            class:edge-peeled={edgePeeled}
          />
        {/each}

        <!-- Nodes -->
        {#each svgNodes as node}
          <g class="ast-node-group" class:node-peeled={node.peeled}>
            <circle
              cx={node.x}
              cy={node.y}
              r={22}
              class="ast-circle"
              class:node-active={node.active}
              class:node-solved={solved && node.id === 'leaf'}
            />
            <text
              x={node.x}
              y={node.y}
              text-anchor="middle"
              dominant-baseline="central"
              class="ast-label"
              class:label-active={node.active}
              class:label-solved={solved && node.id === 'leaf'}
            >{node.label}</text>
          </g>
        {/each}
      </svg>
    </div>

    <!-- Right panel: choices + feedback -->
    <div class="right-panel">
      {#if !solved}
        <div class="prompt">
          <span class="prompt-label">
            Apply to both sides:
          </span>
          <span class="prompt-node">
            undo the <strong>{currentOuter?.kind === 'add' ? `+ ${fmt(b)}` : `× ${fmt(a)}`}</strong> layer
          </span>
        </div>
        <div class="choices" role="group" aria-label="Inverse operation choices">
          {#each choices as choice}
            <button
              type="button"
              class="choice-btn"
              onclick={() => choose(choice)}
              aria-label="Apply {choice.label} to both sides"
            >
              {choice.label}
            </button>
          {/each}
        </div>
      {:else}
        <div class="solved-banner" aria-live="polite">
          <span class="solved-label">x =</span>
          <span class="solved-value">{fmt(rhs)}</span>
          <span class="solved-check">✓</span>
        </div>
      {/if}

      {#if feedback}
        <div class="feedback" class:feedback-bad={feedbackKind === 'bad'} aria-live="polite">
          {feedback}
        </div>
      {/if}
    </div>
  </div>

  <!-- Verification panel -->
  <div class="verify-panel" aria-live="polite">
    <span class="verify-label">Verification</span>
    <div class="verify-row">
      <span class="verify-expr">{a}·x + {b}</span>
      <span class="verify-eq">=</span>
      {#if xValue !== null && verifyX !== null}
        <span class="verify-val">{fmt(verifyX.lhs)}</span>
        <span class="verify-sep">·</span>
        <span class="verify-expr">residual =</span>
        <span class="verify-residual" class:residual-zero={verifyX.residual === 0}>
          {fmt(verifyX.residual)}{verifyX.residual === 0 ? ' ✓' : ''}
        </span>
      {:else}
        <span class="verify-val verify-pending">solve to see</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .widget {
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: 16px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 32px -24px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-family: var(--font-body);
  }

  /* ── Header ─────────────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .title {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    color: var(--site-fg);
    letter-spacing: -0.01em;
  }
  .reset-btn {
    font-family: var(--font-mono);
    font-size: 12px;
    padding: 5px 12px;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    background: var(--demo-stage);
    color: var(--site-fg);
    cursor: pointer;
    min-height: 32px;
    transition: transform 120ms ease-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .reset-btn { transition: none; }
  }
  .reset-btn:hover { transform: translateY(-1px); }
  .reset-btn:focus-visible {
    outline: 2px solid var(--ink-sea);
    outline-offset: 2px;
  }

  /* ── Equation bar ────────────────────────────────────────────── */
  .equation-bar {
    background: var(--demo-stage);
    border-radius: 12px;
    padding: 12px 16px;
    text-align: center;
  }
  .equation-text {
    font-family: var(--font-display);
    font-size: clamp(1.2rem, 4vw, 1.7rem);
    font-style: italic;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
    transition: color 200ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .equation-text { transition: none; }
  }
  .equation-text.solved {
    color: var(--cta);
  }

  /* ── Body: AST + right panel ─────────────────────────────────── */
  .body {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  /* ── AST SVG ─────────────────────────────────────────────────── */
  .ast-wrap {
    background: var(--demo-stage);
    border-radius: 12px;
    flex: 0 0 auto;
    width: 100%;
    max-width: 280px;
    overflow: hidden;
  }
  .ast-svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .ast-edge {
    stroke: color-mix(in srgb, var(--site-fg) 30%, transparent);
    stroke-width: 2;
    transition: stroke 250ms ease, opacity 250ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .ast-edge { transition: none; }
  }
  .ast-edge.edge-peeled {
    stroke: color-mix(in srgb, var(--site-fg) 10%, transparent);
    opacity: 0.4;
  }

  .ast-node-group {
    transition: opacity 250ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .ast-node-group { transition: none; }
  }
  .ast-node-group.node-peeled {
    opacity: 0.2;
  }

  .ast-circle {
    fill: color-mix(in srgb, var(--site-fg) 8%, transparent);
    stroke: color-mix(in srgb, var(--site-fg) 22%, transparent);
    stroke-width: 1.5;
    transition: fill 250ms ease, stroke 250ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .ast-circle { transition: none; }
  }
  .ast-circle.node-active {
    fill: color-mix(in srgb, var(--ink-sun) 18%, transparent);
    stroke: var(--ink-sun);
    stroke-width: 2.5;
  }
  .ast-circle.node-solved {
    fill: color-mix(in srgb, var(--cta) 18%, transparent);
    stroke: var(--cta);
    stroke-width: 2.5;
  }

  .ast-label {
    font-family: var(--font-mono);
    font-size: 13px;
    fill: var(--site-fg);
    pointer-events: none;
    transition: fill 250ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .ast-label { transition: none; }
  }
  .ast-label.label-active {
    fill: color-mix(in srgb, var(--ink-sun) 80%, var(--site-fg));
    font-weight: 700;
  }
  .ast-label.label-solved {
    fill: var(--cta);
    font-weight: 700;
  }

  /* ── Right panel ─────────────────────────────────────────────── */
  .right-panel {
    flex: 1 1 180px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .prompt {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .prompt-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .prompt-node {
    font-size: 0.9rem;
    color: var(--site-fg);
  }
  .prompt-node strong {
    font-family: var(--font-mono);
    color: var(--ink-sun);
  }

  .choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .choice-btn {
    font-family: var(--font-mono);
    font-size: 1rem;
    font-weight: 600;
    padding: 10px 8px;
    border-radius: 10px;
    border: 1.5px solid color-mix(in srgb, var(--ink-coral) 40%, transparent);
    background: color-mix(in srgb, var(--ink-coral) 6%, var(--demo-stage));
    color: var(--site-fg);
    cursor: pointer;
    min-height: 48px;
    transition: transform 120ms ease-out, background 120ms ease, border-color 120ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .choice-btn { transition: none; }
  }
  .choice-btn:hover {
    background: color-mix(in srgb, var(--ink-coral) 14%, var(--demo-stage));
    border-color: var(--ink-coral);
    transform: translateY(-1px);
  }
  .choice-btn:focus-visible {
    outline: 2px solid var(--ink-sea);
    outline-offset: 2px;
  }
  .choice-btn:active {
    transform: translateY(0);
  }

  /* Solved banner */
  .solved-banner {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 12px 16px;
    background: color-mix(in srgb, var(--cta) 10%, var(--demo-stage));
    border: 1.5px solid color-mix(in srgb, var(--cta) 50%, transparent);
    border-radius: 12px;
  }
  .solved-label {
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-style: italic;
    color: var(--site-fg);
  }
  .solved-value {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--cta);
    line-height: 1;
  }
  .solved-check {
    font-size: 1.3rem;
    color: var(--cta);
  }

  /* Feedback */
  .feedback {
    font-size: 0.82rem;
    color: var(--site-fg-muted);
    padding: 8px 10px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--site-fg) 5%, transparent);
    border-left: 3px solid var(--ink-sea);
    line-height: 1.45;
  }
  .feedback.feedback-bad {
    border-left-color: var(--ink-coral);
    background: color-mix(in srgb, var(--ink-coral) 6%, transparent);
    color: var(--site-fg);
  }

  /* ── Verification panel ──────────────────────────────────────── */
  .verify-panel {
    background: var(--demo-stage);
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .verify-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .verify-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }
  .verify-expr {
    color: var(--site-fg-muted);
  }
  .verify-eq {
    color: var(--site-fg-muted);
  }
  .verify-val {
    color: var(--site-fg);
    font-weight: 600;
  }
  .verify-pending {
    color: color-mix(in srgb, var(--site-fg-muted) 60%, transparent);
    font-style: italic;
  }
  .verify-sep {
    color: color-mix(in srgb, var(--site-fg) 30%, transparent);
    font-size: 0.7rem;
  }
  .verify-residual {
    font-weight: 700;
    color: var(--ink-coral);
    transition: color 300ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    .verify-residual { transition: none; }
  }
  .verify-residual.residual-zero {
    color: var(--cta);
  }

  /* ── Mobile ──────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    .ast-wrap {
      max-width: 100%;
    }
    .body {
      flex-direction: column;
    }
    .choices {
      grid-template-columns: 1fr 1fr;
    }
    .choice-btn {
      min-height: 52px;
      font-size: 1.05rem;
    }
  }
</style>
