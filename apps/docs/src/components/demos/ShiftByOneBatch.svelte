<script lang="ts">
  // ShiftByOneBatch — visualize Karpathy's `get_batch`.
  //
  // A 1-D stream of token ids (rendered as character labels for clarity); a few
  // random offsets sampled, each carving an `x = data[i:i+T]` row and a
  // shifted-by-one `y = data[i+1:i+T+1]` row. The widget exposes:
  //  • the batch size B
  //  • the context length T
  //  • a "resample" button (new random offsets)
  //  • a "B·T predictions" readout — the answer to Step 17.3.7.

  // Public-domain Shakespeare opening, character-level: the token stream we
  // pretend is data[]. The actual ids do not matter for pedagogy.
  const STREAM = `First Citizen: Before we proceed any further, hear me speak. Speak. You are all resolved rather to die than to famish? Resolved.`;

  interface Props {
    initialB?: number;
    initialT?: number;
  }
  let { initialB = 4, initialT = 8 }: Props = $props();

  let B: number = $state(initialB);
  let T: number = $state(initialT);
  let seed: number = $state(0);

  function rng(seed: number): () => number {
    let s = seed | 0 || 1;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  const offsets: number[] = $derived.by(() => {
    const r = rng(seed * 17 + B * 31 + T * 13 + 1);
    const N = STREAM.length;
    const arr: number[] = [];
    for (let i = 0; i < B; i++) {
      arr.push(Math.floor(r() * (N - T - 1)));
    }
    return arr;
  });

  function display(c: string): string {
    if (c === ' ') return '·';
    if (c === '\n') return '↵';
    return c;
  }

  function resample() {
    seed = (seed + 1) | 0;
  }

  const preds = $derived(B * T);
</script>

<div class="widget">
  <header class="head">
    <div class="meta">
      <span class="meta-key">B</span>
      <span class="meta-val">{B}</span>
    </div>
    <div class="meta">
      <span class="meta-key">T</span>
      <span class="meta-val">{T}</span>
    </div>
    <div class="meta">
      <span class="meta-key">B · T = predictions / step</span>
      <span class="meta-val">{preds}</span>
    </div>
  </header>

  <div class="stream-wrap">
    <span class="stream-label">data[ ] :</span>
    <div class="stream">
      {#each [...STREAM] as ch, i (i)}
        {@const inAny = offsets.some((o) => i >= o && i < o + T + 1)}
        <span class="stream-cell" class:dim={!inAny}>{display(ch)}</span>
      {/each}
    </div>
  </div>

  <div class="batches">
    {#each offsets as off, b}
      <div class="batch-row">
        <div class="batch-label">batch row {b}</div>
        <div class="row x-row">
          <span class="row-tag">x</span>
          {#each Array(T) as _, t (t)}
            <span class="cell x-cell">{display(STREAM[off + t])}</span>
          {/each}
        </div>
        <div class="row y-row">
          <span class="row-tag">y</span>
          {#each Array(T) as _, t (t)}
            <span class="cell y-cell">{display(STREAM[off + t + 1])}</span>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="controls">
    <label class="slider">
      <span class="slider-label">batch size B = <strong>{B}</strong></span>
      <input type="range" min="1" max="6" step="1" bind:value={B} aria-label="Batch size" />
    </label>
    <label class="slider">
      <span class="slider-label">context T = <strong>{T}</strong></span>
      <input type="range" min="3" max="16" step="1" bind:value={T} aria-label="Context length" />
    </label>
    <button type="button" class="btn-primary" onclick={resample}>↺ resample offsets</button>
  </div>

  <p class="caption">
    Each row is one (<code>x</code>, <code>y</code>) training example pair. Position
    <em>t</em> in <code>x</code> is supervised by position <em>t</em> in
    <code>y</code> — and because the causal mask only lets the transformer see
    <code>x[:t+1]</code> when predicting <code>y[t]</code>, each row gives <code>T</code>
    honest next-token predictions in one forward pass. One step of training =
    <code>B · T</code> = {preds} supervised examples.
  </p>
</div>

<style>
  .widget {
    display: flex; flex-direction: column; gap: 0.85rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 20px;
    padding: clamp(0.85rem, 2vw, 1.4rem);
    color: var(--site-fg);
    box-shadow:
      0 1px 0 rgba(0,0,0,0.04),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sun) 45%, transparent);
  }
  .head {
    display: flex; flex-wrap: wrap; gap: 0.5rem 1.1rem;
    font-family: var(--font-mono); font-size: 0.78rem; color: var(--site-fg-muted);
  }
  .meta { display: inline-flex; gap: 0.4rem; align-items: baseline; }
  .meta-key { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.7rem; }
  .meta-val { color: var(--site-fg); font-variant-numeric: tabular-nums; font-weight: 700; }

  .stream-wrap {
    display: flex; align-items: flex-start; gap: 0.4rem;
    background: var(--demo-stage); border-radius: 10px; padding: 0.5rem 0.6rem;
  }
  .stream-label {
    font-family: var(--font-mono); font-size: 0.78rem; color: var(--site-fg-muted);
    padding-top: 0.1rem;
  }
  .stream {
    display: flex; flex-wrap: wrap; gap: 1px;
    font-family: var(--font-mono); font-size: 0.82rem;
    line-height: 1.45;
    flex: 1;
  }
  .stream-cell {
    min-width: 0.7rem; text-align: center;
    color: var(--site-fg);
  }
  .stream-cell.dim {
    color: color-mix(in srgb, var(--site-fg-muted) 45%, transparent);
  }

  .batches {
    display: flex; flex-direction: column; gap: 0.5rem;
  }
  .batch-row {
    display: flex; flex-direction: column; gap: 0.1rem;
    padding: 0.4rem 0.55rem;
    background: var(--demo-stage); border-radius: 10px;
  }
  .batch-label {
    font-family: var(--font-mono); font-size: 0.72rem; color: var(--site-fg-muted);
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 0.15rem;
  }
  .row {
    display: flex; align-items: center; gap: 2px;
    font-family: var(--font-mono); font-size: 0.85rem;
  }
  .row-tag {
    width: 1rem; color: var(--site-fg-muted);
    font-size: 0.78rem;
  }
  .cell {
    min-width: 1.3rem; padding: 0.12rem 0.3rem;
    text-align: center;
    border-radius: 3px;
    font-variant-numeric: tabular-nums;
  }
  .x-cell {
    background: color-mix(in srgb, var(--ink-sea) 22%, transparent);
    border-bottom: 2px solid var(--ink-sea);
  }
  .y-cell {
    background: color-mix(in srgb, var(--ink-coral) 22%, transparent);
    border-bottom: 2px solid var(--ink-coral);
  }

  .controls { display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: flex-end; }
  .slider { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 8rem; }
  .slider-label { font-family: var(--font-mono); font-size: 0.78rem; color: var(--site-fg-muted); }
  .slider-label strong { color: var(--site-fg); font-variant-numeric: tabular-nums; }
  .slider input { width: 100%; accent-color: var(--ink-sun); }

  .btn-primary {
    border-radius: 999px; padding: 0.32rem 0.95rem;
    font-size: 0.85rem; font-weight: 600; cursor: pointer;
    background: var(--ink-sun); color: var(--cta-fg); border: 1px solid var(--ink-sun);
    transition: transform 120ms ease;
  }
  .btn-primary:hover { transform: translateY(-1px); }

  .caption { margin: 0; font-size: 0.85rem; color: var(--site-fg-muted); line-height: 1.55; }
  .caption code {
    background: var(--demo-stage); padding: 0 0.3rem; border-radius: 3px;
    font-family: var(--font-mono); font-size: 0.85rem;
  }
</style>
