<script lang="ts">
  /**
   * TopoSortWalkthrough — M12.2. The diamond graph:
   *   a = 2; b = a + 1; c = a · 3; d = b · c.
   * Learner clicks node ids to fill the backward-visit order. "Run" steps
   * through the order, accumulating grads with += (so wrong orders give
   * 6 or 9 instead of 15, exactly the mechanism Karpathy fixes on camera).
   */

  type NodeId = 'a' | 'b' | 'c' | 'd';

  const NODES = ['a', 'b', 'c', 'd'] as const;
  const A_VALUE = 2;
  const B = A_VALUE + 1; // 3
  const C = A_VALUE * 3; // 6
  const D = B * C;       // 18
  const CORRECT_GRAD_A = 15;

  // For each node, who feeds it and the local derivative on that edge
  // given current data values. Mirrors the bug Karpathy fixes on camera.
  const incoming: Record<NodeId, Array<{ parent: NodeId; local: number }>> = {
    a: [],
    b: [{ parent: 'a', local: 1 }],   // ∂b/∂a = 1
    c: [{ parent: 'a', local: 3 }],   // ∂c/∂a = 3
    d: [{ parent: 'b', local: C },    // ∂d/∂b = c = 6
        { parent: 'c', local: B }],   // ∂d/∂c = b = 3
  };

  // Visit order slots — initially empty. Learner fills with NODES.
  let slots = $state<(NodeId | null)[]>([null, null, null, null]);

  // Step-through state during "Run"
  let running = $state(false);
  let cursor = $state(0);
  let grads = $state<Record<NodeId, number>>({ a: 0, b: 0, c: 0, d: 0 });
  let log = $state<string[]>([]);

  function place(n: NodeId) {
    const placed = slots.indexOf(n);
    if (placed !== -1) return; // already placed
    const idx = slots.indexOf(null);
    if (idx === -1) return;
    const next = [...slots];
    next[idx] = n;
    slots = next;
    reset();
  }

  function unplace(i: number) {
    const next = [...slots];
    next[i] = null;
    slots = next;
    reset();
  }

  function clearOrder() {
    slots = [null, null, null, null];
    reset();
  }

  function reset() {
    running = false;
    cursor = 0;
    grads = { a: 0, b: 0, c: 0, d: 0 };
    log = [];
  }

  function run() {
    if (slots.some((s) => s === null)) return;
    reset();
    running = true;
    grads = { a: 0, b: 0, c: 0, d: 1 }; // seed dL/dL = 1
    log = ['seed grad[d] = 1'];
    cursor = 0;
  }

  function step() {
    if (!running || cursor >= slots.length) return;
    const id = slots[cursor]!;
    const inc = incoming[id];
    const before: Record<NodeId, number> = { ...grads };
    const newGrads = { ...grads };
    const contribs: string[] = [];
    for (const { parent, local } of inc) {
      const contrib = newGrads[id] * local;
      newGrads[parent] = (newGrads[parent] ?? 0) + contrib;
      contribs.push(
        `grad[${parent}] += grad[${id}] · ${local} = ${before[id].toFixed(2)} · ${local} = ${contrib.toFixed(2)} → grad[${parent}] = ${newGrads[parent].toFixed(2)}`,
      );
    }
    grads = newGrads;
    log = [
      ...log,
      `visit ${id} (current grad ${before[id].toFixed(2)})${
        contribs.length === 0 ? ' — leaf, nothing to push' : ''
      }`,
      ...contribs,
    ];
    cursor += 1;
  }

  function runAll() {
    if (slots.some((s) => s === null)) return;
    run();
    for (let i = 0; i < slots.length; i++) step();
  }

  const isComplete = $derived(slots.every((s) => s !== null));
  const finalGradA = $derived(grads.a);
  const verdict = $derived.by(() => {
    if (cursor !== slots.length || !running) return null;
    if (Math.abs(finalGradA - CORRECT_GRAD_A) < 0.01) {
      return { tone: 'good' as const, text: `grad[a] = 15 ✓` };
    }
    if (Math.abs(finalGradA - 6) < 0.01) {
      return {
        tone: 'bad' as const,
        text: `grad[a] = 6 — the c-path contribution was lost. (c was visited before grad[c] had been computed.)`,
      };
    }
    if (Math.abs(finalGradA - 9) < 0.01) {
      return {
        tone: 'bad' as const,
        text: `grad[a] = 9 — the b-path contribution was lost. (b was visited before grad[b] had been computed.)`,
      };
    }
    return {
      tone: 'bad' as const,
      text: `grad[a] = ${finalGradA.toFixed(2)} — wrong. Expected 15. Some parent was visited before its child had pushed its contribution upstream.`,
    };
  });
</script>

<div class="widget">
  <div class="graph">
    <svg viewBox="0 0 360 200" aria-label="diamond graph">
      <!-- edges -->
      <path d="M 80 50 C 130 50 130 100 180 100" stroke="var(--site-fg-muted)" stroke-width="1.4" fill="none" opacity="0.55" />
      <path d="M 80 50 C 130 50 130 150 180 150" stroke="var(--site-fg-muted)" stroke-width="1.4" fill="none" opacity="0.55" />
      <path d="M 220 100 C 270 100 270 100 310 75" stroke="var(--site-fg-muted)" stroke-width="1.4" fill="none" opacity="0.55" />
      <path d="M 220 150 C 270 150 270 100 310 95" stroke="var(--site-fg-muted)" stroke-width="1.4" fill="none" opacity="0.55" />

      <!-- a -->
      <g transform="translate(20, 30)">
        <rect width="60" height="40" rx="6" fill="color-mix(in srgb, var(--ink-red) 14%, var(--demo-stage))" stroke="var(--ink-red)" stroke-width="1.4" />
        <text x="30" y="15" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--site-fg-muted)">a = 2</text>
        <text x="30" y="32" text-anchor="middle" font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--ink-sea)">grad {grads.a.toFixed(2)}</text>
      </g>

      <!-- b -->
      <g transform="translate(180, 80)">
        <rect width="40" height="40" rx="6" fill="color-mix(in srgb, var(--ink-sea) 14%, var(--demo-stage))" stroke="var(--ink-sea)" stroke-width="1.4" />
        <text x="20" y="15" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--site-fg-muted)">b=a+1</text>
        <text x="20" y="32" text-anchor="middle" font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--ink-sea)">{grads.b.toFixed(2)}</text>
      </g>

      <!-- c -->
      <g transform="translate(180, 130)">
        <rect width="40" height="40" rx="6" fill="color-mix(in srgb, var(--ink-sea) 14%, var(--demo-stage))" stroke="var(--ink-sea)" stroke-width="1.4" />
        <text x="20" y="15" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--site-fg-muted)">c=a·3</text>
        <text x="20" y="32" text-anchor="middle" font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--ink-sea)">{grads.c.toFixed(2)}</text>
      </g>

      <!-- d -->
      <g transform="translate(310, 55)">
        <rect width="40" height="40" rx="6" fill="color-mix(in srgb, var(--ink-sea) 14%, var(--demo-stage))" stroke="var(--ink-sea)" stroke-width="1.4" />
        <text x="20" y="15" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--site-fg-muted)">d=b·c</text>
        <text x="20" y="32" text-anchor="middle" font-family="var(--font-mono)" font-size="11" font-weight="600" fill="var(--ink-sea)">{grads.d.toFixed(2)}</text>
      </g>
    </svg>
  </div>

  <div class="ordering">
    <span class="lbl">visit order (first → last):</span>
    <div class="slots">
      {#each slots as s, i (i)}
        <button
          type="button"
          class="slot"
          class:filled={s !== null}
          class:active={running && cursor === i}
          onclick={() => s !== null && unplace(i)}
          aria-label={s ? `slot ${i + 1}: ${s} (click to clear)` : `slot ${i + 1}: empty`}
        >
          <span class="slotNum">{i + 1}</span>
          <span class="slotVal">{s ?? '—'}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="palette">
    <span class="lbl">click to place:</span>
    {#each NODES as n (n)}
      <button
        type="button"
        class="ntag"
        class:placed={slots.includes(n)}
        onclick={() => place(n)}
        disabled={slots.includes(n)}
      >{n}</button>
    {/each}
    <button type="button" class="ghost" onclick={clearOrder}>clear</button>
  </div>

  <div class="controls">
    <button type="button" onclick={runAll} disabled={!isComplete}>run all</button>
    <button type="button" class="ghost" onclick={step} disabled={!isComplete || !running || cursor >= slots.length}>step</button>
    <button type="button" class="ghost" onclick={run} disabled={!isComplete}>restart</button>
  </div>

  {#if log.length > 0}
    <pre class="log" aria-live="polite">{log.join('\n')}</pre>
  {/if}

  {#if verdict}
    <div class="verdict tone-{verdict.tone}" aria-live="polite">{verdict.text}</div>
  {/if}

  <p class="hint">
    The graph: <code>a=2, b=a+1, c=a·3, d=b·c</code>. We seed
    <code>grad[d]=1</code> and walk the order you place, calling
    <code>grad[parent] += grad[child] · local</code> at each visit. To get the
    right answer <strong>15</strong> for <code>grad[a]</code>, each parent must
    be visited <em>after</em> its children — that is reverse-topological order.
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

  .graph {
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    padding: 0.3rem;
  }

  .graph svg {
    width: 100%;
    max-width: 460px;
    height: auto;
    display: block;
    margin: 0 auto;
  }

  .ordering {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .lbl {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
  }

  .slots {
    display: flex;
    gap: 0.5rem;
  }

  .slot {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.55rem 0.4rem;
    border-radius: 10px;
    border: 1.5px dashed var(--site-border);
    background: var(--site-surface);
    cursor: pointer;
    font-family: var(--font-mono);
  }

  .slot.filled {
    border-style: solid;
    border-color: var(--ink-red);
    background: color-mix(in srgb, var(--ink-red) 12%, transparent);
  }

  .slot.active {
    border-color: var(--cta);
    background: color-mix(in srgb, var(--cta) 18%, transparent);
  }

  .slotNum {
    font-size: 0.66rem;
    color: var(--site-fg-muted);
  }

  .slotVal {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--site-fg);
  }

  .palette {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .ntag {
    font-family: var(--font-mono);
    font-size: 0.92rem;
    font-weight: 600;
    padding: 0.35rem 0.7rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--ink-sea);
    background: color-mix(in srgb, var(--ink-sea) 14%, transparent);
    color: var(--site-fg);
    cursor: pointer;
  }

  .ntag:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .controls {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    padding-top: 0.3rem;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
  }

  .controls button,
  .palette .ghost {
    font-family: var(--font-body);
    font-size: 0.84rem;
    padding: 0.35rem 0.85rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--ink-red);
    background: color-mix(in srgb, var(--ink-red) 12%, transparent);
    color: var(--site-fg);
    cursor: pointer;
  }

  .controls button.ghost,
  .palette .ghost {
    border-color: var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg-muted);
  }

  .controls button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .log {
    margin: 0;
    padding: 0.6rem 0.85rem;
    border-radius: 10px;
    background: color-mix(in srgb, var(--ink-sea) 8%, transparent);
    border-left: 3px solid var(--ink-sea);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    line-height: 1.55;
    color: var(--site-fg);
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .verdict {
    padding: 0.55rem 0.85rem;
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .verdict.tone-good {
    background: color-mix(in srgb, var(--cta) 18%, transparent);
    border-left: 3px solid var(--cta);
    color: var(--site-fg);
  }

  .verdict.tone-bad {
    background: color-mix(in srgb, var(--ink-coral) 15%, transparent);
    border-left: 3px solid var(--ink-coral);
    color: var(--site-fg);
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
