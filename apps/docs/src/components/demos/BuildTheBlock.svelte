<script lang="ts">
  type LnPos = 'pre' | 'post' | 'off';
  type On = 'on' | 'off';

  let ln1 = $state<LnPos>('pre');
  let ln2 = $state<LnPos>('pre');
  let res1 = $state<On>('on');
  let res2 = $state<On>('on');

  function subLayerCode(name: 'MHA' | 'FFN', ln: LnPos, res: On): string {
    const inputArg = ln === 'pre' ? 'LN(x)' : 'x';
    const sublayer = `${name}(${inputArg})`;
    const wrapped = ln === 'post' ? `LN(x + ${sublayer})` : `x + ${sublayer}`;
    if (res === 'off') {
      // Residual missing: trunk is replaced, not added to.
      return ln === 'post'
        ? `x = LN(${name}(x))   # no residual`
        : ln === 'pre'
          ? `x = ${name}(LN(x))   # no residual`
          : `x = ${name}(x)   # no residual, no LN`;
    }
    return ln === 'off'
      ? `x = x + ${name}(x)   # no LN`
      : `x = ${wrapped}`;
  }

  const code1 = $derived(subLayerCode('MHA', ln1, res1));
  const code2 = $derived(subLayerCode('FFN', ln2, res2));

  type Verdict = {
    state: 'pre' | 'post' | 'inconsistent' | 'no-residual' | 'no-ln';
    label: string;
    explain: string;
  };

  const verdict = $derived.by<Verdict>(() => {
    if (res1 === 'off' || res2 === 'off') {
      return {
        state: 'no-residual',
        label: 'broken — missing residual',
        explain:
          'A sub-layer without a residual replaces the stream rather than writing into it. Gradients no longer route around the sub-layer; deep stacks become untrainable. Restore both residual adds.',
      };
    }
    if (ln1 === 'off' || ln2 === 'off') {
      return {
        state: 'no-ln',
        label: 'broken — missing LayerNorm',
        explain:
          'Without LayerNorm, the magnitude of the residual stream grows as more deltas are added. Gradients to early layers either explode or vanish depending on initialization. Add LN to both sub-layers.',
      };
    }
    if (ln1 === 'pre' && ln2 === 'pre') {
      return {
        state: 'pre',
        label: '✓ pre-LN block',
        explain:
          'Modern default. Each sub-layer normalizes its input, computes a delta, and adds the unnormalized delta to the residual trunk. Gradient norm stays O(1/√L) at depth — no warmup needed. You will need a final LN at the top of the stack.',
      };
    }
    if (ln1 === 'post' && ln2 === 'post') {
      return {
        state: 'post',
        label: '✓ post-LN block',
        explain:
          'The original 2017 wiring. LN sits on the trunk after each residual add. Gradient norm at the output grows with depth — requires a learning-rate warmup of ~4–10k steps to train stably above L = 12 or so. No final LN needed.',
      };
    }
    return {
      state: 'inconsistent',
      label: '✗ inconsistent — mixing pre and post',
      explain:
        'Real transformers pick one convention per block. Mixing pre-LN on one sub-layer and post-LN on the other produces an architecture that nobody trains, with the worst of both: needs warmup and still has no normalized output.',
    };
  });
</script>

<div class="widget">
  <div class="grid">
    <div class="config-card">
      <h4>sub-layer 1 (attention)</h4>
      <label class="row">
        <span class="row-label">LayerNorm</span>
        <div class="seg">
          <button class="seg-btn" class:active={ln1 === 'pre'} onclick={() => (ln1 = 'pre')}>pre</button>
          <button class="seg-btn" class:active={ln1 === 'post'} onclick={() => (ln1 = 'post')}>post</button>
          <button class="seg-btn" class:active={ln1 === 'off'} onclick={() => (ln1 = 'off')}>off</button>
        </div>
      </label>
      <label class="row">
        <span class="row-label">residual</span>
        <div class="seg">
          <button class="seg-btn" class:active={res1 === 'on'} onclick={() => (res1 = 'on')}>on</button>
          <button class="seg-btn" class:active={res1 === 'off'} onclick={() => (res1 = 'off')}>off</button>
        </div>
      </label>
    </div>

    <div class="config-card">
      <h4>sub-layer 2 (FFN)</h4>
      <label class="row">
        <span class="row-label">LayerNorm</span>
        <div class="seg">
          <button class="seg-btn" class:active={ln2 === 'pre'} onclick={() => (ln2 = 'pre')}>pre</button>
          <button class="seg-btn" class:active={ln2 === 'post'} onclick={() => (ln2 = 'post')}>post</button>
          <button class="seg-btn" class:active={ln2 === 'off'} onclick={() => (ln2 = 'off')}>off</button>
        </div>
      </label>
      <label class="row">
        <span class="row-label">residual</span>
        <div class="seg">
          <button class="seg-btn" class:active={res2 === 'on'} onclick={() => (res2 = 'on')}>on</button>
          <button class="seg-btn" class:active={res2 === 'off'} onclick={() => (res2 = 'off')}>off</button>
        </div>
      </label>
    </div>
  </div>

  <pre class="code"><code>{code1}
{code2}</code></pre>

  <div class="verdict" data-state={verdict.state}>
    <div class="verdict-label">{verdict.label}</div>
    <div class="verdict-explain">{verdict.explain}</div>
  </div>
</div>

<style>
  .widget {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(1rem, 2vw, 1.5rem);
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sea) 55%, transparent);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 0.6rem;
  }
  .config-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    background: color-mix(in srgb, var(--site-fg) 3%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 8%, transparent);
    border-radius: 12px;
  }
  .config-card h4 {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    font-weight: 700;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .row-label {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--site-fg);
  }
  .seg {
    display: inline-flex;
    border: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    border-radius: 8px;
    overflow: hidden;
  }
  .seg-btn {
    appearance: none;
    border: 0;
    padding: 0.3rem 0.65rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: transparent;
    color: var(--site-fg-muted);
    cursor: pointer;
    transition: background 160ms ease;
  }
  .seg-btn + .seg-btn {
    border-left: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
  }
  .seg-btn.active {
    background: color-mix(in srgb, var(--ink-sea) 18%, transparent);
    color: var(--site-fg);
    font-weight: 600;
  }

  .code {
    margin: 0;
    padding: 0.85rem 1rem;
    background: color-mix(in srgb, var(--site-fg) 95%, var(--site-bg));
    color: var(--site-bg);
    border-radius: 12px;
    overflow-x: auto;
  }
  .code code {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    line-height: 1.55;
    white-space: pre;
  }

  .verdict {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.7rem 0.95rem;
    border-radius: 12px;
    border-left: 4px solid var(--site-fg-muted);
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
  }
  .verdict-label {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--site-fg);
  }
  .verdict-explain {
    font-family: var(--font-body);
    font-size: 0.85rem;
    color: var(--site-fg);
    line-height: 1.55;
  }
  .verdict[data-state='pre'] {
    border-left-color: var(--cta-hover);
    background: color-mix(in srgb, var(--cta-hover) 10%, transparent);
  }
  .verdict[data-state='post'] {
    border-left-color: var(--ink-sun);
    background: color-mix(in srgb, var(--ink-sun) 12%, transparent);
  }
  .verdict[data-state='inconsistent'] {
    border-left-color: var(--ink-orange);
    background: color-mix(in srgb, var(--ink-orange) 12%, transparent);
  }
  .verdict[data-state='no-residual'],
  .verdict[data-state='no-ln'] {
    border-left-color: var(--ink-coral);
    background: color-mix(in srgb, var(--ink-coral) 12%, transparent);
  }
</style>
