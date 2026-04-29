<script lang="ts">
  // Click-to-ablate a sub-layer. NLL on a held-out passage updates from a
  // pre-recorded table of (ablation_set → ΔNLL) values. Scripted: faithful
  // to the qualitative claim "FFNs matter more than individual heads, the
  // final LN matters most" without running a real model.

  const N_BLOCKS = 4;
  const TOKENS = ['T', 'h', 'e', ' ', 'c', 'a', 't']; // a tiny held-out string

  type SubLayerKey = `b${number}-${'attn' | 'ffn'}` | 'final-ln';

  // Pre-recorded ΔNLL when ONLY this sub-layer is ablated.
  // Pattern: early blocks small, late blocks big, FFN > attn on average,
  // final LN catastrophic.
  const SOLO_DELTA: Record<SubLayerKey, number> = {
    'b1-attn': 0.04,
    'b1-ffn': 0.05,
    'b2-attn': 0.08,
    'b2-ffn': 0.12,
    'b3-attn': 0.10,
    'b3-ffn': 0.22,
    'b4-attn': 0.18,
    'b4-ffn': 0.27,
    'final-ln': 1.2,
  };

  // Per-token deltas for each ablation (indexed [pos]).
  const SOLO_TOKEN_DELTAS: Record<SubLayerKey, number[]> = {
    'b1-attn': [0.02, 0.05, 0.04, 0.06, 0.04, 0.03, 0.04],
    'b1-ffn': [0.04, 0.05, 0.04, 0.07, 0.05, 0.04, 0.06],
    'b2-attn': [0.05, 0.07, 0.10, 0.12, 0.08, 0.07, 0.08],
    'b2-ffn': [0.07, 0.10, 0.13, 0.15, 0.13, 0.12, 0.14],
    'b3-attn': [0.06, 0.10, 0.10, 0.13, 0.10, 0.10, 0.11],
    'b3-ffn': [0.12, 0.18, 0.22, 0.28, 0.22, 0.21, 0.27],
    'b4-attn': [0.10, 0.16, 0.18, 0.22, 0.18, 0.18, 0.22],
    'b4-ffn': [0.15, 0.22, 0.28, 0.35, 0.28, 0.27, 0.33],
    'final-ln': [0.9, 1.1, 1.2, 1.4, 1.2, 1.2, 1.4],
  };

  const BASELINE_PER_TOKEN = [1.6, 1.3, 1.4, 1.5, 1.6, 1.5, 1.7];
  const BASELINE_NLL = BASELINE_PER_TOKEN.reduce((a, b) => a + b, 0) / BASELINE_PER_TOKEN.length;

  let ablated = $state(new Set<SubLayerKey>());

  function toggle(key: SubLayerKey) {
    const next = new Set(ablated);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    ablated = next;
  }
  function reset() {
    ablated = new Set();
  }
  function isOff(key: SubLayerKey) {
    return ablated.has(key);
  }

  const totalDelta = $derived.by(() => {
    let s = 0;
    for (const k of ablated) s += SOLO_DELTA[k];
    return s;
  });
  const currentNLL = $derived(BASELINE_NLL + totalDelta);
  const perTokenLoss = $derived.by(() => {
    const result = [...BASELINE_PER_TOKEN];
    for (const k of ablated) {
      const tokDelta = SOLO_TOKEN_DELTAS[k];
      for (let i = 0; i < result.length; i++) result[i] += tokDelta[i];
    }
    return result;
  });
  const maxLoss = $derived(Math.max(...perTokenLoss, ...BASELINE_PER_TOKEN));
</script>

<div class="widget">
  <div class="header">
    <div class="passage">
      <span class="label">held-out passage</span>
      <div class="tokens">
        {#each TOKENS as t}
          <span class="token">{t === ' ' ? '·' : t}</span>
        {/each}
      </div>
    </div>
    <button type="button" class="ghost" onclick={reset} disabled={ablated.size === 0}>reset</button>
  </div>

  <div class="stack">
    <span class="stack-label">click any sub-layer to ablate</span>
    {#each Array(N_BLOCKS) as _, idx}
      {@const blockIdx = N_BLOCKS - idx}
      <div class="block">
        <div class="block-tag">block {blockIdx}</div>
        <button
          type="button"
          class="layer attn"
          class:off={isOff(`b${blockIdx}-attn`)}
          onclick={() => toggle(`b${blockIdx}-attn`)}
        >
          attention
          {#if isOff(`b${blockIdx}-attn`)}<span class="strike">ablated</span>{/if}
        </button>
        <button
          type="button"
          class="layer ffn"
          class:off={isOff(`b${blockIdx}-ffn`)}
          onclick={() => toggle(`b${blockIdx}-ffn`)}
        >
          FFN
          {#if isOff(`b${blockIdx}-ffn`)}<span class="strike">ablated</span>{/if}
        </button>
      </div>
    {/each}

    <button
      type="button"
      class="layer final-ln"
      class:off={isOff('final-ln')}
      onclick={() => toggle('final-ln')}
    >
      final LayerNorm
      {#if isOff('final-ln')}<span class="strike">ablated</span>{/if}
    </button>
    <div class="head-tag">→ unembed → softmax</div>
  </div>

  <div class="metrics">
    <div class="metric">
      <span class="metric-label">baseline NLL</span>
      <span class="metric-val">{BASELINE_NLL.toFixed(3)}</span>
    </div>
    <div class="metric current" data-state={ablated.size === 0 ? 'ok' : totalDelta > 0.5 ? 'bad' : 'warn'}>
      <span class="metric-label">current NLL</span>
      <span class="metric-val">{currentNLL.toFixed(3)}</span>
    </div>
    <div class="metric delta" data-state={ablated.size === 0 ? 'ok' : totalDelta > 0.5 ? 'bad' : 'warn'}>
      <span class="metric-label">Δ from baseline</span>
      <span class="metric-val">+{totalDelta.toFixed(3)}</span>
    </div>
  </div>

  <div class="loss-row">
    <span class="loss-label">per-token loss</span>
    <div class="loss-bars">
      {#each TOKENS as tok, i}
        <div class="lossbar">
          <span class="losstok">{tok === ' ' ? '·' : tok}</span>
          <div class="losstrack">
            <div class="lossfill base" style="width:{(BASELINE_PER_TOKEN[i] / maxLoss) * 100}%"></div>
            <div class="lossfill bump" style="width:{((perTokenLoss[i] - BASELINE_PER_TOKEN[i]) / maxLoss) * 100}%; left:{(BASELINE_PER_TOKEN[i] / maxLoss) * 100}%;"></div>
          </div>
          <span class="lossval">{perTokenLoss[i].toFixed(2)}</span>
        </div>
      {/each}
    </div>
  </div>

  <p class="footnote">
    pre-recorded NLL deltas; faithful to "<em>FFN ablations hurt more than attention ablations on average; ablating the final LN is catastrophic.</em>" qualitative claim.
  </p>
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

  .header {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    justify-content: space-between;
  }
  .passage {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    font-weight: 700;
  }
  .tokens {
    display: flex;
    gap: 0.25rem;
  }
  .token {
    padding: 0.25rem 0.5rem;
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }
  .ghost {
    appearance: none;
    border: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    background: transparent;
    color: var(--site-fg-muted);
    padding: 0.4rem 0.8rem;
    border-radius: 10px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    cursor: pointer;
  }
  .ghost:disabled { opacity: 0.4; cursor: not-allowed; }
  .ghost:not(:disabled):hover { background: color-mix(in srgb, var(--site-fg) 5%, transparent); }

  .stack {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.6rem 0.7rem;
    background: color-mix(in srgb, var(--site-fg) 3%, transparent);
    border-radius: 12px;
  }
  .stack-label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    text-align: center;
    font-weight: 700;
    margin-bottom: 0.15rem;
  }
  .block {
    display: grid;
    grid-template-columns: 4rem 1fr 1fr;
    gap: 0.3rem;
    align-items: stretch;
  }
  .block-tag {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--site-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .layer {
    appearance: none;
    border: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    color: var(--site-fg);
    padding: 0.45rem 0.65rem;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 220ms ease, border-color 220ms ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .layer:hover:not(.off) {
    background: color-mix(in srgb, var(--ink-sea) 12%, transparent);
    border-color: var(--ink-sea);
  }
  .layer.attn { border-left: 3px solid var(--ink-sea); }
  .layer.ffn { border-left: 3px solid var(--ink-coral); }
  .layer.final-ln {
    border-left: 3px solid var(--ink-sun);
    margin-top: 0.4rem;
  }
  .layer.off {
    background: color-mix(in srgb, var(--ink-coral) 14%, transparent);
    color: var(--site-fg-muted);
    border-color: var(--ink-coral);
    text-decoration: line-through;
  }
  .strike {
    font-size: 0.7rem;
    background: var(--ink-coral);
    color: white;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    text-decoration: none;
  }
  .head-tag {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-align: center;
    color: var(--site-fg-muted);
    margin-top: 0.2rem;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }
  .metric {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border-left: 3px solid var(--site-fg-muted);
  }
  .metric.current[data-state='ok'],
  .metric.delta[data-state='ok'] {
    border-left-color: var(--cta-hover);
    background: color-mix(in srgb, var(--cta-hover) 10%, transparent);
  }
  .metric.current[data-state='warn'],
  .metric.delta[data-state='warn'] {
    border-left-color: var(--ink-sun);
    background: color-mix(in srgb, var(--ink-sun) 12%, transparent);
  }
  .metric.current[data-state='bad'],
  .metric.delta[data-state='bad'] {
    border-left-color: var(--ink-coral);
    background: color-mix(in srgb, var(--ink-coral) 12%, transparent);
  }
  .metric-label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .metric-val {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--site-fg);
  }

  .loss-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .loss-label {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--site-fg-muted);
    font-weight: 700;
  }
  .loss-bars {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .lossbar {
    display: grid;
    grid-template-columns: 1.5rem 1fr 3rem;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  .losstok {
    color: var(--site-fg-muted);
    text-align: center;
  }
  .losstrack {
    height: 12px;
    background: color-mix(in srgb, var(--site-fg) 6%, transparent);
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }
  .lossfill {
    position: absolute;
    top: 0;
    height: 100%;
    transition: width 220ms ease;
  }
  .lossfill.base { background: var(--ink-sea); border-radius: 6px 0 0 6px; }
  .lossfill.bump { background: var(--ink-coral); }
  .lossval {
    text-align: right;
    color: var(--site-fg);
    font-variant-numeric: tabular-nums;
  }

  .footnote {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.82rem;
    color: var(--site-fg-muted);
  }
  .footnote em {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 600;
    color: var(--site-fg);
  }
</style>
