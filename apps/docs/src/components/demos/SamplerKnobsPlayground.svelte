<script lang="ts">
  // M18 Slice 8 — samplerKnobsPlayground for lesson 18.4 "Now make it talk."
  //
  // Loads a frozen checkpoint (default: the reference .bin shipped at /m18/
  // reference.bin), exposes a prompt + three sampler knobs (temperature,
  // top-k, top-p) + a sampler-RNG seed. Generates ~200 characters from the
  // trained model and displays them in a rolling text panel.
  //
  // The pedagogical centerpiece is the histogram: 65 vertical bars showing the
  // post-temperature softmax distribution at the cursor, sorted descending.
  // As the user slides top-k or top-p, bars outside the cutoff grey out and
  // bars beyond the nucleus boundary fade. Updates in real time when the
  // sliders move (no regenerate required) using the cached last-step logits.

  import { onMount, onDestroy } from 'svelte';
  import {
    Engine, M18_CONFIG, readCheckpoint, loadTinyShakespeare, seededRng,
    vocabHash as computeVocabHash,
    type CorpusBundle,
  } from '../../lib/m18/engine';

  interface Props {
    referenceUrl?: string;
    showFileLoad?: boolean;
  }

  const {
    referenceUrl = '/m18/reference.bin',
    showFileLoad = true,
  }: Props = $props();

  const cfg = M18_CONFIG;
  const GENERATE_CHARS = 220;
  const HIST_TOP_LABELS = 10;  // label only the most-probable chars

  type Phase = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

  let phase: Phase = $state('idle');
  let loadingMsg: string = $state('');
  let errorMsg: string = $state('');

  let prompt: string = $state('ROMEO:');
  let temperature: number = $state(0.8);
  let topK: number = $state(40);
  let topP: number = $state(0.95);
  let samplerSeed: string = $state('go');

  let generated: string = $state('');
  let charsEmitted: number = $state(0);
  let elapsedSec: number = $state(0);
  let loadedFromName: string = $state('');

  let histCanvas: HTMLCanvasElement | undefined = $state();
  let host: HTMLElement | undefined = $state();
  let fileInput: HTMLInputElement | undefined = $state();

  // Non-reactive engine + corpus refs (created once per mount).
  let engine: Engine | null = null;
  let corpus: CorpusBundle | null = null;
  let vocabHashCache: string = '';
  let cancelToken: { cancelled: boolean } = { cancelled: false };
  // Cached final-step logits — used by the histogram so slider drags re-render
  // the distribution without re-running the model.
  let lastLogits: Float32Array | null = $state(null);
  let lastContext: Int32Array | null = null;

  function tokenColor(name: string, fallback: string): string {
    if (typeof window === 'undefined' || !host) return fallback;
    const v = getComputedStyle(host).getPropertyValue(name).trim();
    return v || fallback;
  }

  // Sampling chain: temperature → top-k → top-p → categorical draw.
  // Returns { sampledId, sortedProbs, sortedIds, nucleusEnd, topKEnd }.
  function sampleAndScore(
    logits: Float32Array,
    tau: number,
    k: number,
    p: number,
    rng: () => number,
  ): { sampledId: number; sortedIds: Int32Array; sortedProbs: Float32Array; nucleusEnd: number; topKEnd: number } {
    const V = logits.length;
    // (1) temperature softmax with max-subtraction
    let m = -Infinity;
    for (let i = 0; i < V; i++) if (logits[i] > m) m = logits[i];
    const probs = new Float32Array(V);
    let sum = 0;
    for (let i = 0; i < V; i++) {
      const e = Math.exp((logits[i] - m) / Math.max(tau, 1e-6));
      probs[i] = e; sum += e;
    }
    for (let i = 0; i < V; i++) probs[i] /= sum;

    // (2) sort by prob descending — Int32Array of ids in sorted order.
    const ids = Array.from({ length: V }, (_, i) => i);
    ids.sort((a, b) => probs[b] - probs[a]);
    const sortedIds = new Int32Array(ids);
    const sortedProbs = new Float32Array(V);
    for (let i = 0; i < V; i++) sortedProbs[i] = probs[sortedIds[i]];

    // (3) top-k mask: keep first k entries (in sorted order). topKEnd is the
    // exclusive upper bound in sorted-index space.
    const topKEnd = Math.min(Math.max(1, Math.floor(k)), V);

    // (4) top-p mask: smallest prefix where cumulative ≥ p (in sorted order).
    // nucleusEnd is exclusive. If the FIRST token already exceeds p, the
    // nucleus is still the first token alone.
    let cum = 0;
    let nucleusEnd = topKEnd;
    for (let i = 0; i < topKEnd; i++) {
      cum += sortedProbs[i];
      if (cum >= p) { nucleusEnd = i + 1; break; }
    }
    nucleusEnd = Math.min(nucleusEnd, topKEnd);

    // (5) renormalize within the nucleus and sample.
    let nucSum = 0;
    for (let i = 0; i < nucleusEnd; i++) nucSum += sortedProbs[i];
    const u = rng() * nucSum;
    let acc = 0;
    let sampledSortedIdx = nucleusEnd - 1;
    for (let i = 0; i < nucleusEnd; i++) {
      acc += sortedProbs[i];
      if (u < acc) { sampledSortedIdx = i; break; }
    }
    return {
      sampledId: sortedIds[sampledSortedIdx],
      sortedIds,
      sortedProbs,
      nucleusEnd,
      topKEnd,
    };
  }

  function showableChar(c: string): string {
    if (c === '\n') return '↵';
    if (c === ' ') return '·';
    return c;
  }

  function drawHistogram(): void {
    if (!histCanvas) return;
    const ctx = histCanvas.getContext('2d');
    if (!ctx) return;
    const w = histCanvas.width, h = histCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const fg = tokenColor('--site-fg', '#17181a');
    const muted = `color-mix(in srgb, ${fg} 55%, transparent)`;
    const axis = `color-mix(in srgb, ${fg} 20%, transparent)`;

    const pad = { l: 38, r: 12, t: 14, b: 32 };
    const x0 = pad.l, y0 = h - pad.b;
    const x1 = w - pad.r, y1 = pad.t;

    if (!lastLogits) {
      ctx.fillStyle = muted;
      ctx.font = '13px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('press regenerate to see the next-token distribution', (x0 + x1) / 2, (y0 + y1) / 2);
      return;
    }

    const inkSea    = tokenColor('--ink-sea',    '#2a9fd6');
    const inkOrange = tokenColor('--ink-orange', '#ff9f43');
    const inkTeal   = tokenColor('--ink-teal',   '#4ecdc4');

    const { sortedIds, sortedProbs, nucleusEnd, topKEnd } = sampleAndScore(
      lastLogits, temperature, topK, topP, () => 0  // dummy rng — we only want the masks
    );
    const V = sortedProbs.length;
    const barW = (x1 - x0) / V;
    const maxProb = sortedProbs[0];
    const yScale = (p: number) => y0 - (p / maxProb) * (y0 - y1);

    // Axes
    ctx.strokeStyle = axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();

    // Probability axis labels
    ctx.fillStyle = muted;
    ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const frac of [0.25, 0.5, 0.75, 1.0]) {
      const py = y0 - frac * (y0 - y1);
      ctx.fillText((frac * maxProb).toFixed(2), x0 - 4, py);
      ctx.strokeStyle = `color-mix(in srgb, ${fg} 8%, transparent)`;
      ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
    }

    // Three bar states:
    //  - i < nucleusEnd: in the nucleus, full color (inkSea).
    //  - nucleusEnd ≤ i < topKEnd: in top-k but outside nucleus (inkOrange, dim).
    //  - i ≥ topKEnd: outside top-k, grey.
    const grey = `color-mix(in srgb, ${fg} 14%, transparent)`;
    for (let i = 0; i < V; i++) {
      const px = x0 + i * barW;
      const py = yScale(sortedProbs[i]);
      let fill: string;
      if (i < nucleusEnd) fill = inkSea;
      else if (i < topKEnd) fill = `color-mix(in srgb, ${inkOrange} 55%, transparent)`;
      else fill = grey;
      ctx.fillStyle = fill;
      ctx.fillRect(px + 0.5, py, Math.max(1, barW - 1), y0 - py);
    }

    // Char labels under the top-N bars
    ctx.fillStyle = fg;
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const labelCount = Math.min(HIST_TOP_LABELS, V);
    if (corpus) {
      for (let i = 0; i < labelCount; i++) {
        const px = x0 + (i + 0.5) * barW;
        const id = sortedIds[i];
        const c = corpus.vocab[id] || '?';
        ctx.fillText(showableChar(c), px, y0 + 6);
      }
    }

    // Nucleus boundary marker
    if (nucleusEnd < V) {
      const mx = x0 + nucleusEnd * barW;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = inkTeal; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(mx, y1); ctx.lineTo(mx, y0); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = inkTeal;
      ctx.font = '10.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`nucleus (top-p ${topP.toFixed(2)})`, mx + 4, y1 + 2);
    }

    // Top-k boundary marker (only if different from V)
    if (topKEnd < V) {
      const mx = x0 + topKEnd * barW;
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = `color-mix(in srgb, ${fg} 45%, transparent)`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mx, y1); ctx.lineTo(mx, y0); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `color-mix(in srgb, ${fg} 55%, transparent)`;
      ctx.font = '10px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(`top-k ${topKEnd}`, mx - 4, y1 + 2);
    }
  }

  // Encode prompt characters → token ids. Unknown characters become space.
  function encodePrompt(text: string, vocab: string): Int32Array {
    const charToId = new Map<string, number>();
    for (let i = 0; i < vocab.length; i++) charToId.set(vocab[i], i);
    const fallback = charToId.get(' ') ?? 0;
    const ids = new Int32Array(text.length);
    for (let i = 0; i < text.length; i++) {
      ids[i] = charToId.get(text[i]) ?? fallback;
    }
    return ids;
  }

  async function loadFromUrl(url: string): Promise<void> {
    loadingMsg = 'fetching checkpoint…';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    await loadFromBuffer(buf, url.split('/').pop() || 'reference.bin');
  }

  async function loadFromBuffer(buf: ArrayBuffer, displayName: string): Promise<void> {
    if (!engine) throw new Error('engine not initialized');
    if (!corpus) throw new Error('corpus not initialized');
    const { meta, params } = readCheckpoint(buf, cfg);
    // Reject same-shape checkpoints trained against a different tokenizer.
    // Without this, a swapped vocab silently maps the model's argmax onto
    // the wrong characters and the histogram + samples become nonsense.
    if (!vocabHashCache) vocabHashCache = await computeVocabHash(corpus.vocab);
    if (meta.vocabHash !== vocabHashCache) {
      throw new Error('Checkpoint was trained on a different vocabulary. Refusing to load.');
    }
    engine.loadParameters(params);
    // The sampler does not run training; we still need the GPU adapter pipeline
    // for forward() to work. initTraining is not needed for forward-only.
    loadedFromName = displayName;
    loadingMsg = `loaded ${displayName} · trained for ${meta.iter.toLocaleString()} iters, val NLL ${meta.valLoss.toFixed(3)}`;
  }

  async function ensureBoot(): Promise<void> {
    if (engine && corpus) return;
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available. Try Chrome, Edge, or Firefox 141+ on desktop.');
    }
    if (!corpus) {
      loadingMsg = 'loading corpus…';
      corpus = await loadTinyShakespeare();
    }
    if (!engine) {
      loadingMsg = 'requesting GPU adapter…';
      engine = await Engine.create(cfg);
    }
  }

  async function bootAndLoadDefault(): Promise<void> {
    if (phase !== 'idle' && phase !== 'error') return;
    phase = 'loading'; errorMsg = '';
    try {
      await ensureBoot();
      await loadFromUrl(referenceUrl);
      phase = 'ready';
      loadingMsg = `loaded ${loadedFromName} · ready to sample`;
    } catch (e) {
      phase = 'error';
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  function triggerLoadFile(): void {
    if (phase === 'generating') return;
    fileInput?.click();
  }

  async function onFileSelected(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    errorMsg = '';
    const prev = phase;
    phase = 'loading';
    try {
      await ensureBoot();
      const buf = await file.arrayBuffer();
      await loadFromBuffer(buf, file.name);
      phase = 'ready';
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      phase = prev === 'idle' ? 'error' : prev;
    } finally {
      if (input) input.value = '';
    }
  }

  async function regenerate(): Promise<void> {
    if (phase !== 'ready' && phase !== 'idle' && phase !== 'error') return;
    if (phase === 'idle' || phase === 'error') {
      await bootAndLoadDefault();
      if (phase !== 'ready') return;
    }
    if (!engine || !corpus) return;
    cancelToken = { cancelled: false };
    const localToken = cancelToken;
    phase = 'generating';
    generated = '';
    charsEmitted = 0;
    elapsedSec = 0;
    lastLogits = null;
    errorMsg = '';
    const t0 = performance.now();

    const T = cfg.contextLen;
    const rng = seededRng(samplerSeed);
    const promptIds = encodePrompt(prompt, corpus.vocab);

    // Left-align the prompt and track a frontier position. Sampling reads
    // logits at the frontier (the last token actually present). The window
    // only starts sliding once the frontier reaches T-1 — that way we never
    // feed the model long runs of pad characters it has never seen.
    const ctx = new Int32Array(T);
    let frontier: number;
    if (promptIds.length >= T) {
      ctx.set(promptIds.subarray(promptIds.length - T));
      frontier = T - 1;
    } else {
      ctx.set(promptIds, 0);
      frontier = Math.max(0, promptIds.length - 1);
    }

    generated = prompt;
    try {
      for (let n = 0; n < GENERATE_CHARS; n++) {
        if (localToken.cancelled) return;
        const logits = await engine.forward(ctx, 1);  // [T*V]
        const last = new Float32Array(cfg.vocabSize);
        last.set(logits.subarray(frontier * cfg.vocabSize, (frontier + 1) * cfg.vocabSize));
        lastLogits = last;
        lastContext = ctx.slice();
        const { sampledId } = sampleAndScore(last, temperature, topK, topP, rng);
        generated += corpus.vocab[sampledId];
        charsEmitted = n + 1;
        if (frontier < T - 1) {
          // Window still has headroom — just advance the frontier.
          frontier++;
          ctx[frontier] = sampledId;
        } else {
          // Window full — slide left by one and append the new id at T-1.
          for (let i = 0; i < T - 1; i++) ctx[i] = ctx[i + 1];
          ctx[T - 1] = sampledId;
        }
        // Every 8 chars yield to the browser so the UI redraws live.
        if (n % 8 === 7) {
          drawHistogram();
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      elapsedSec = (performance.now() - t0) / 1000;
      drawHistogram();
      phase = 'ready';
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e);
      phase = 'error';
    }
  }

  function stop(): void {
    cancelToken.cancelled = true;
    if (phase === 'generating') phase = 'ready';
  }

  onMount(() => {
    void bootAndLoadDefault();
    drawHistogram();
  });

  onDestroy(() => {
    cancelToken.cancelled = true;
    engine?.destroy();
    engine = null;
  });

  // Redraw the histogram whenever the sliders change (and we have cached logits).
  $effect(() => {
    void temperature; void topK; void topP;
    drawHistogram();
  });

  const controlsDisabled = $derived(phase === 'loading' || phase === 'generating');
  const phaseLabel = $derived(({
    idle: 'idle',
    loading: loadingMsg || 'loading…',
    ready: 'ready',
    generating: `generating · ${charsEmitted} / ${GENERATE_CHARS}`,
    error: 'error',
  } as const)[phase]);

  function fmt(x: number, p: number): string { return x.toFixed(p); }
</script>

<section class="playground" bind:this={host}>
  <header class="head">
    <div class="kicker">
      <span class="dot dot-{phase}" aria-hidden="true"></span>
      <span class="phase">{phaseLabel}</span>
    </div>
    <div class="actions">
      {#if phase === 'generating'}
        <button type="button" class="btn btn-secondary" onclick={stop}>stop</button>
      {:else}
        <button type="button" class="btn btn-primary" onclick={regenerate} disabled={controlsDisabled}>
          regenerate
        </button>
      {/if}
      {#if showFileLoad}
        <button
          type="button"
          class="btn btn-ghost"
          onclick={triggerLoadFile}
          disabled={controlsDisabled}
          title="Load a different .bin checkpoint (e.g. one you saved from your-checkpoint)"
        >
          load your own
        </button>
        <input
          bind:this={fileInput}
          type="file"
          accept=".bin,application/octet-stream"
          onchange={onFileSelected}
          style="display:none"
          aria-hidden="true"
          tabindex="-1"
        />
      {/if}
    </div>
  </header>

  {#if loadedFromName}
    <p class="loadedFrom" aria-live="polite">
      <span class="loadedFromLabel">checkpoint</span>
      <span class="loadedFromName">{loadedFromName}</span>
    </p>
  {/if}

  <div class="prompt">
    <label class="ctl ctl-prompt">
      <span class="label">prompt</span>
      <input
        type="text"
        bind:value={prompt}
        disabled={controlsDisabled}
        spellcheck="false"
        autocomplete="off"
        maxlength="64"
      />
    </label>
  </div>

  <div class="knobs">
    <label class="ctl">
      <span class="label">temperature <em>{fmt(temperature, 2)}</em></span>
      <input type="range" min="0.1" max="2.0" step="0.05" bind:value={temperature} disabled={phase === 'loading'} />
      <span class="hint">0.1 = greedy-ish · 2.0 = entropy explosion</span>
    </label>
    <label class="ctl">
      <span class="label">top-k <em>{topK}</em></span>
      <input type="range" min="1" max="65" step="1" bind:value={topK} disabled={phase === 'loading'} />
      <span class="hint">1 = argmax · 65 = no truncation</span>
    </label>
    <label class="ctl">
      <span class="label">top-p <em>{fmt(topP, 2)}</em></span>
      <input type="range" min="0.1" max="1.0" step="0.01" bind:value={topP} disabled={phase === 'loading'} />
      <span class="hint">nucleus mass · 1.0 = no truncation</span>
    </label>
    <label class="ctl">
      <span class="label">sampler seed</span>
      <input type="text" bind:value={samplerSeed} disabled={controlsDisabled} spellcheck="false" autocomplete="off" />
      <span class="hint">same seed + same knobs = identical sample</span>
    </label>
  </div>

  <div class="histWrap">
    <canvas bind:this={histCanvas} width={720} height={220} aria-label="next-token probability distribution"></canvas>
    <p class="legend">
      <span><span class="swatch nucleus"></span> nucleus (sampled)</span>
      <span><span class="swatch topk"></span> top-k but outside nucleus</span>
      <span><span class="swatch out"></span> outside top-k</span>
    </p>
  </div>

  <div class="outputWrap">
    <div class="outputHead">
      <span class="outputTitle">generated</span>
      {#if elapsedSec > 0}
        <span class="outputMeta">{charsEmitted} chars in {fmt(elapsedSec, 1)} s</span>
      {/if}
    </div>
    <pre class="output" aria-live="polite">{generated || 'press regenerate to begin sampling.'}</pre>
  </div>

  {#if errorMsg}
    <p class="err">{errorMsg}</p>
  {/if}
</section>

<style>
  .playground {
    display: flex; flex-direction: column; gap: 0.95rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 18px;
    padding: clamp(0.95rem, 2vw, 1.45rem);
    color: var(--site-fg);
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--site-fg) 4%, transparent),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sea) 30%, transparent);
  }

  .head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem; flex-wrap: wrap;
  }
  .kicker { display: inline-flex; align-items: center; gap: 0.5rem; }
  .dot {
    width: 0.55rem; height: 0.55rem; border-radius: 50%;
    background: color-mix(in srgb, var(--site-fg) 30%, transparent);
  }
  .dot-loading    { background: var(--ink-sun);    animation: pulse 1.1s ease-in-out infinite; }
  .dot-ready      { background: var(--ink-teal); }
  .dot-generating { background: var(--ink-sea);    animation: pulse 1.1s ease-in-out infinite; }
  .dot-error      { background: var(--ink-red); }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .phase {
    font-family: var(--font-mono); font-size: 0.78rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }

  .actions { display: inline-flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
  .btn {
    cursor: pointer;
    font-family: var(--font-body); font-size: 0.88rem; font-weight: 600;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    border: 1px solid transparent;
    transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
  }
  .btn:disabled { cursor: default; opacity: 0.55; }
  .btn-primary { background: var(--site-fg); color: var(--site-bg); }
  .btn-primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--site-fg) 88%, var(--ink-sea) 12%);
  }
  .btn-secondary {
    background: color-mix(in srgb, var(--site-fg) 8%, transparent);
    color: var(--site-fg);
  }
  .btn-ghost {
    background: transparent; color: var(--site-fg-muted);
    border-color: color-mix(in srgb, var(--site-fg) 14%, transparent);
  }
  .btn-ghost:hover:not(:disabled) {
    color: var(--site-fg);
    border-color: color-mix(in srgb, var(--site-fg) 28%, transparent);
  }

  .loadedFrom {
    margin: 0;
    display: inline-flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;
    padding: 0.4rem 0.7rem;
    background: color-mix(in srgb, var(--ink-sea) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-sea) 25%, transparent);
    border-radius: 10px;
    font-size: 0.82rem;
    align-self: flex-start;
  }
  .loadedFromLabel {
    font-family: var(--font-mono); font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-sea); font-weight: 600;
  }
  .loadedFromName {
    font-family: var(--font-mono); font-size: 0.82rem;
    color: var(--site-fg);
    word-break: break-all;
  }

  .prompt { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
  .ctl-prompt input { font-size: 1rem; }

  .knobs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.8rem 1rem;
  }
  .ctl { display: flex; flex-direction: column; gap: 0.3rem; }
  .label {
    font-family: var(--font-mono); font-size: 0.74rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .label em {
    font-style: normal; font-weight: 700;
    color: var(--site-fg); margin-left: 0.35rem;
    font-variant-numeric: tabular-nums;
  }
  .ctl input[type="text"] {
    padding: 0.46rem 0.65rem;
    font-family: var(--font-mono); font-size: 0.92rem;
    color: var(--site-fg);
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    border-radius: 8px;
  }
  .ctl input[type="text"]:focus {
    outline: none;
    border-color: var(--ink-sea);
    background: var(--site-bg);
  }
  .ctl input[type="text"]:disabled { opacity: 0.55; }
  .ctl input[type="range"] { width: 100%; accent-color: var(--ink-sea); }
  .ctl input[type="range"]:disabled { opacity: 0.5; }
  .hint {
    font-family: var(--font-mono); font-size: 0.7rem;
    color: var(--site-fg-muted);
  }

  .histWrap { display: flex; flex-direction: column; gap: 0.45rem; }
  canvas {
    display: block;
    width: 100%; height: auto;
    aspect-ratio: 720 / 220;
    background: color-mix(in srgb, var(--site-bg) 96%, var(--site-fg) 4%);
    border: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    border-radius: 12px;
  }
  .legend {
    margin: 0;
    display: flex; flex-wrap: wrap; gap: 0.9rem;
    font-family: var(--font-mono); font-size: 0.74rem;
    color: var(--site-fg-muted);
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
  .swatch { display: inline-block; width: 14px; height: 10px; border-radius: 2px; }
  .swatch.nucleus { background: var(--ink-sea); }
  .swatch.topk    { background: color-mix(in srgb, var(--ink-orange) 55%, transparent); }
  .swatch.out     { background: color-mix(in srgb, var(--site-fg) 14%, transparent); }

  .outputWrap {
    display: flex; flex-direction: column; gap: 0.4rem;
    background: color-mix(in srgb, var(--site-fg) 3%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 9%, transparent);
    border-radius: 12px;
    padding: 0.7rem 0.85rem;
  }
  .outputHead {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 0.75rem; flex-wrap: wrap;
  }
  .outputTitle {
    font-family: var(--font-mono); font-size: 0.74rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .outputMeta {
    font-family: var(--font-mono); font-size: 0.72rem;
    color: var(--site-fg-muted);
  }
  .output {
    margin: 0;
    font-family: var(--font-mono); font-size: 0.92rem;
    line-height: 1.55; color: var(--site-fg);
    white-space: pre-wrap; word-break: break-word;
    min-height: 5em;
  }

  .err {
    margin: 0; padding: 0.65rem 0.85rem;
    border: 1px solid color-mix(in srgb, var(--ink-red) 35%, transparent);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    border-radius: 10px;
    color: var(--ink-red); font-size: 0.86rem;
  }
  /* Ambient status pulses pause under reduced motion (DESIGN.md: idle/ambient
     loops stop; one-shot user feedback stays). */
  @media (prefers-reduced-motion: reduce) {
    .dot-loading, .dot-generating { animation: none; }
  }
</style>
