<script lang="ts">
  /**
   * ParamCounter — M11.5. Resize the layers of an MLP and watch the
   * learnable-parameter count move. Each layer-to-layer gap costs
   * (in · out + out) parameters; the total is what bounds a model's
   * memory and compute.
   */
  let layers = $state<number[]>([4, 7, 5, 3]);

  const MAX_DOTS = 12;

  // params for the weight matrix + bias between layer i and i+1.
  function gapParams(inDim: number, outDim: number): number {
    return inDim * outDim + outDim;
  }
  const gaps = $derived(
    layers.slice(0, -1).map((d, i) => gapParams(d, layers[i + 1])),
  );
  const total = $derived(gaps.reduce((a, b) => a + b, 0));
  const maxGap = $derived(Math.max(1, ...gaps));
  // fp32: 4 bytes per parameter.
  const bytes = $derived(total * 4);

  function fmtInt(n: number): string {
    return n.toLocaleString('en-US');
  }
  function fmtBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function bump(i: number, delta: number) {
    const next = [...layers];
    next[i] = Math.min(2048, Math.max(1, next[i] + delta));
    layers = next;
  }
  function addLayer() {
    if (layers.length >= 6) return;
    const next = [...layers];
    next.splice(next.length - 1, 0, 5);
    layers = next;
  }
  function removeLayer() {
    if (layers.length <= 2) return;
    const next = [...layers];
    next.splice(next.length - 2, 1);
    layers = next;
  }
  function loadMnist() {
    layers = [784, 128, 64, 10];
  }
  function reset() {
    layers = [4, 7, 5, 3];
  }
</script>

<div class="widget">
  <div class="stage">
    {#each layers as w, i (i)}
      <div class="layer">
        <div class="dots">
          {#each Array.from({ length: Math.min(w, MAX_DOTS) }) as _, d (d)}
            <span class="dot"></span>
          {/each}
          {#if w > MAX_DOTS}<span class="more">⋮</span>{/if}
        </div>
        <div class="width-ctl">
          <button onclick={() => bump(i, -1)} aria-label="narrower">−</button>
          <b>{w}</b>
          <button onclick={() => bump(i, 1)} aria-label="wider">+</button>
        </div>
        <span class="role">{i === 0 ? 'input' : i === layers.length - 1 ? 'output' : 'hidden'}</span>
      </div>
      {#if i < layers.length - 1}
        <div class="gap">
          <span class="gap-label">{layers[i]}→{layers[i + 1]}</span>
          <span class="gap-count">{fmtInt(gaps[i])}</span>
          <div class="bar"><span style="width:{(gaps[i] / maxGap) * 100}%"></span></div>
        </div>
      {/if}
    {/each}
  </div>

  <div class="controls">
    <button onclick={addLayer} disabled={layers.length >= 6}>+ hidden layer</button>
    <button onclick={removeLayer} disabled={layers.length <= 2}>− hidden layer</button>
    <button onclick={loadMnist}>MNIST net</button>
    <button class="ghost" onclick={reset}>reset</button>
  </div>

  <div class="totals">
    <div class="big">
      <span class="big-num">{fmtInt(total)}</span>
      <span class="big-lbl">learnable parameters</span>
    </div>
    <div class="mem">
      <span class="mem-num">{fmtBytes(bytes)}</span>
      <span class="mem-lbl">at fp32</span>
    </div>
  </div>
  <p class="hint">
    Each gap costs <code>in · out + out</code> — the <code>+ out</code> is the
    bias. Widen the first hidden layer and watch where the parameters pile up:
    the count is dominated by the widest matmul.
  </p>
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
  .stage {
    display: flex;
    align-items: flex-start;
    gap: 0.2rem;
    flex-wrap: wrap;
    background: var(--demo-stage, var(--site-surface));
    border-radius: 12px;
    padding: 1rem 0.75rem;
    overflow-x: auto;
  }
  .layer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    min-width: 3.4rem;
  }
  .dots {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    align-items: center;
    min-height: 4rem;
    justify-content: center;
  }
  .dot {
    width: 0.62rem;
    height: 0.62rem;
    border-radius: 999px;
    background: var(--ink-sea);
  }
  .more { color: var(--site-fg-muted); line-height: 0.5; font-size: 0.9rem; }
  .width-ctl {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-family: var(--font-mono);
  }
  .width-ctl button {
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 6px;
    border: 1px solid var(--site-border);
    background: var(--demo-card);
    color: var(--site-fg);
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1;
  }
  .width-ctl b { font-size: 0.8rem; min-width: 2.2ch; text-align: center; }
  .role {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--site-fg-muted);
  }
  .gap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    min-width: 3.6rem;
    padding-top: 1.4rem;
  }
  .gap-label { font-family: var(--font-mono); font-size: 0.66rem; color: var(--site-fg-muted); }
  .gap-count {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--site-fg);
  }
  .bar {
    width: 3rem;
    height: 5px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--site-fg) 12%, transparent);
    overflow: hidden;
  }
  .bar span { display: block; height: 100%; background: var(--ink-red); }

  .controls { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .controls button {
    font-family: var(--font-body);
    font-size: 0.78rem;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius-pill, 999px);
    border: 1px solid var(--site-border);
    background: var(--site-surface);
    color: var(--site-fg);
    cursor: pointer;
  }
  .controls button:disabled { opacity: 0.35; cursor: not-allowed; }
  .controls button:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--site-fg) 40%, transparent);
  }

  .totals {
    display: flex;
    gap: 1.5rem;
    align-items: baseline;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 14%, transparent);
    padding-top: 0.7rem;
    flex-wrap: wrap;
  }
  .big { display: flex; flex-direction: column; }
  .big-num {
    font-family: var(--font-mono);
    font-size: 1.7rem;
    font-weight: 700;
    color: var(--ink-red);
    font-variant-numeric: tabular-nums;
  }
  .big-lbl, .mem-lbl {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .mem { display: flex; flex-direction: column; }
  .mem-num {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--site-fg);
  }
  .hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--site-fg-muted);
  }
  .hint code {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: var(--demo-stage, var(--site-surface));
    padding: 0.05rem 0.3rem;
    border-radius: 4px;
  }
</style>
