<script lang="ts">
  // M18 Slice 8 — creditsRollPanel for lesson 18.5 "The credits roll."
  //
  // Two panes, stacked vertically.
  //
  // Top: a single rolling line of text from the reference checkpoint, the
  // trained model is sampling one character every ~350 ms (slow, contemplative)
  // while the credits scroll. Proof that the code below is the code that's
  // running.
  //
  // Bottom: an auto-scrolling code column containing six pedagogically
  // load-bearing source files from the engine, imported via ?raw so what the
  // learner sees is literally what shipped. A module-callout chip on the left
  // margin updates as each section enters the viewport, threading every block
  // back to the module that taught it.
  //
  // The pacing target is ~4-5 minutes for the full scroll. Play/pause and
  // skip-to-end controls let the learner go at their own pace.

  import { onMount, onDestroy } from 'svelte';
  import {
    Engine, M18_CONFIG, readCheckpoint, loadTinyShakespeare, seededRng,
    type CorpusBundle,
  } from '../../lib/m18/engine';

  // ?raw imports — these are the literal contents of the source files at
  // bundle time. Vite drops them into the bundle as plain strings.
  import rngSrc from '../../lib/m18/engine/rng.ts?raw';
  import layerNormSrc from '../../lib/m18/engine/kernels/layerNorm.wgsl?raw';
  import causalSdpaSrc from '../../lib/m18/engine/kernels/causalSdpa.wgsl?raw';
  import matmulRhsTSrc from '../../lib/m18/engine/kernels/matmulRhsT.wgsl?raw';
  import softmaxCEBwdSrc from '../../lib/m18/engine/kernels/softmaxCrossEntropyBwd.wgsl?raw';
  import adamwSrc from '../../lib/m18/engine/kernels/adamwStep.wgsl?raw';

  interface Props {
    referenceUrl?: string;
  }
  const { referenceUrl = '/m18/reference.bin' }: Props = $props();

  const cfg = M18_CONFIG;
  const SCROLL_PX_PER_SEC = 28;
  const SAMPLE_INTERVAL_MS = 350;
  const SAMPLE_TEMP = 0.8;
  const SAMPLE_TOPP = 0.95;
  const SAMPLE_TOPK = 40;
  const SAMPLE_LINE_LEN = 80;        // visible width of the rolling sample line
  const SAMPLE_PROMPT = 'ROMEO:';

  interface CreditSection {
    moduleTag: string;
    title: string;
    fileLabel: string;
    src: string;
    note?: string;
  }

  // Ordered for narrative: low-level support → architecture → gradient → optimizer.
  const sections: CreditSection[] = [
    {
      moduleTag: 'M14',
      title: 'seeded determinism',
      fileLabel: 'engine/rng.ts',
      src: rngSrc,
      note: 'cyrb128 hashes a string into four 32-bit seeds; sfc32 turns those seeds into a deterministic stream of floats. This is the entire reason the .bin you saved is byte-identical across runs.',
    },
    {
      moduleTag: 'M13',
      title: 'LayerNorm forward',
      fileLabel: 'engine/kernels/layerNorm.wgsl',
      src: layerNormSrc,
      note: 'one workgroup per row, two-pass reduce (mean, then variance), gamma-scale and beta-shift. Pre-LN, applied twice per block. The "what exactly to normalize" question from M13, in WGSL.',
    },
    {
      moduleTag: 'M15',
      title: 'causal scaled dot-product attention',
      fileLabel: 'engine/kernels/causalSdpa.wgsl',
      src: causalSdpaSrc,
      note: 'softmax((Q·K^T + mask) / sqrt(d_k)) · V. One workgroup per (batch, head, query-position) triple. The causal mask is upper-triangular -infinity. M15 in 71 lines.',
    },
    {
      moduleTag: 'M12',
      title: 'the chain rule, in WGSL',
      fileLabel: 'engine/kernels/matmulRhsT.wgsl',
      src: matmulRhsTSrc,
      note: 'C = A · B^T. Used four times in the backward pass to compute dA = dC · B^T from any forward matmul C = A · B. The chain rule made manifest as one tiled matmul against the transpose of the right-hand side.',
    },
    {
      moduleTag: 'M9 + M12',
      title: 'backward of the loss',
      fileLabel: 'engine/kernels/softmaxCrossEntropyBwd.wgsl',
      src: softmaxCEBwdSrc,
      note: 'this is the line: dlogits[i] = (probs[i] - target_onehot[i]) / (B*T). The composite gradient of softmax + cross-entropy. The "magic" of loss.backward(), made of arithmetic. M9 + M12. You wrote it.',
    },
    {
      moduleTag: 'M10',
      title: 'AdamW — one elementwise pass',
      fileLabel: 'engine/kernels/adamwStep.wgsl',
      src: adamwSrc,
      note: 'every weight reads (theta, grad, m, v) and writes (theta_new, m_new, v_new). No autograd, no graph. Each call updates 206,016 floats in parallel, then the loss curve takes another step down.',
    },
  ];

  // Phase + interaction state.
  type Phase = 'loading' | 'playing' | 'paused' | 'ended' | 'error';
  let phase: Phase = $state('loading');
  let loadingMsg: string = $state('booting engine + reference checkpoint…');
  let errorMsg: string = $state('');
  let sampleLine: string = $state('');
  let activeIdx: number = $state(0);   // which section's chip to highlight

  let scroller: HTMLElement | undefined = $state();
  let column: HTMLElement | undefined = $state();
  const sectionRefs: HTMLElement[] = [];

  // Refs that don't need reactivity.
  let engine: Engine | null = null;
  let corpus: CorpusBundle | null = null;
  let rng: (() => number) | null = null;
  let ctx: Int32Array | null = null;
  let frontier: number = 0;
  let sampleTimer: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let lastFrameT = 0;
  let cancelled = false;
  let userScrolled = false;
  let userScrollResetTimer: ReturnType<typeof setTimeout> | null = null;

  function encodePrompt(text: string, vocab: string): Int32Array {
    const charToId = new Map<string, number>();
    for (let i = 0; i < vocab.length; i++) charToId.set(vocab[i], i);
    const fallback = charToId.get(' ') ?? 0;
    const out = new Int32Array(text.length);
    for (let i = 0; i < text.length; i++) out[i] = charToId.get(text[i]) ?? fallback;
    return out;
  }

  // Same sampling chain as SamplerKnobsPlayground (temperature → top-k → top-p).
  function sampleNext(
    logits: Float32Array, tau: number, k: number, p: number, rngFn: () => number,
  ): number {
    const V = logits.length;
    let m = -Infinity;
    for (let i = 0; i < V; i++) if (logits[i] > m) m = logits[i];
    const probs = new Float32Array(V);
    let sum = 0;
    for (let i = 0; i < V; i++) { const e = Math.exp((logits[i] - m) / Math.max(tau, 1e-6)); probs[i] = e; sum += e; }
    for (let i = 0; i < V; i++) probs[i] /= sum;
    const ids = Array.from({ length: V }, (_, i) => i);
    ids.sort((a, b) => probs[b] - probs[a]);
    const kEnd = Math.min(Math.max(1, Math.floor(k)), V);
    let cum = 0, nucEnd = kEnd;
    for (let i = 0; i < kEnd; i++) { cum += probs[ids[i]]; if (cum >= p) { nucEnd = i + 1; break; } }
    nucEnd = Math.min(nucEnd, kEnd);
    let nucSum = 0;
    for (let i = 0; i < nucEnd; i++) nucSum += probs[ids[i]];
    const u = rngFn() * nucSum;
    let acc = 0;
    for (let i = 0; i < nucEnd; i++) { acc += probs[ids[i]]; if (u < acc) return ids[i]; }
    return ids[nucEnd - 1];
  }

  async function bootAndLoad(): Promise<void> {
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available. Try Chrome, Edge, or Firefox 141+ on desktop.');
    }
    loadingMsg = 'loading corpus…';
    corpus = await loadTinyShakespeare();
    loadingMsg = 'requesting GPU adapter…';
    engine = await Engine.create(cfg);
    loadingMsg = 'fetching reference checkpoint…';
    const res = await fetch(referenceUrl);
    if (!res.ok) throw new Error(`Failed to fetch ${referenceUrl}: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const { params } = readCheckpoint(buf, cfg);
    engine.loadParameters(params);
    rng = seededRng('credits-roll');
    const T = cfg.contextLen;
    ctx = new Int32Array(T);
    const promptIds = encodePrompt(SAMPLE_PROMPT, corpus.vocab);
    // Left-align the prompt; frontier tracks the last token actually present
    // so we never sample from logits computed over a long run of pad tokens.
    if (promptIds.length >= T) {
      ctx.set(promptIds.subarray(promptIds.length - T));
      frontier = T - 1;
    } else {
      ctx.set(promptIds, 0);
      frontier = Math.max(0, promptIds.length - 1);
    }
    sampleLine = SAMPLE_PROMPT;
    loadingMsg = '';
  }

  async function sampleTick(): Promise<void> {
    if (cancelled) return;
    if (!engine || !corpus || !rng || !ctx) return;
    if (phase !== 'playing' && phase !== 'paused') return;
    try {
      const T = cfg.contextLen;
      const logits = await engine.forward(ctx, 1);
      const last = new Float32Array(cfg.vocabSize);
      last.set(logits.subarray(frontier * cfg.vocabSize, (frontier + 1) * cfg.vocabSize));
      const id = sampleNext(last, SAMPLE_TEMP, SAMPLE_TOPK, SAMPLE_TOPP, rng);
      const ch = corpus.vocab[id] || '?';
      sampleLine = (sampleLine + ch).slice(-SAMPLE_LINE_LEN);
      if (frontier < T - 1) {
        frontier++;
        ctx[frontier] = id;
      } else {
        for (let i = 0; i < T - 1; i++) ctx[i] = ctx[i + 1];
        ctx[T - 1] = id;
      }
    } catch (e) {
      // Don't blow up the panel on a single bad forward — just stop sampling.
      console.warn('[creditsRoll] sample failed', e);
      return;
    }
    if (!cancelled) {
      sampleTimer = setTimeout(() => { void sampleTick(); }, SAMPLE_INTERVAL_MS);
    }
  }

  function scrollFrame(now: number): void {
    if (cancelled) return;
    if (!scroller || !column) { rafId = requestAnimationFrame(scrollFrame); return; }
    const dt = lastFrameT === 0 ? 0 : (now - lastFrameT) / 1000;
    lastFrameT = now;
    if (phase === 'playing' && !userScrolled) {
      const maxScroll = column.scrollHeight - scroller.clientHeight;
      const next = Math.min(maxScroll, scroller.scrollTop + dt * SCROLL_PX_PER_SEC);
      scroller.scrollTop = next;
      if (next >= maxScroll - 0.5) {
        phase = 'ended';
      } else {
        updateActiveSection();
      }
    }
    rafId = requestAnimationFrame(scrollFrame);
  }

  function updateActiveSection(): void {
    if (!scroller) return;
    const viewTop = scroller.scrollTop;
    // Find the last section whose top is at or above the current viewTop + a small offset.
    const offset = scroller.clientHeight * 0.3;
    let idx = 0;
    for (let i = 0; i < sectionRefs.length; i++) {
      if (sectionRefs[i] && sectionRefs[i].offsetTop <= viewTop + offset) idx = i;
    }
    if (idx !== activeIdx) activeIdx = idx;
  }

  function play(): void {
    if (phase === 'ended') {
      restart();
      return;
    }
    phase = 'playing';
    userScrolled = false;
  }

  function pause(): void {
    if (phase === 'playing') phase = 'paused';
  }

  function restart(): void {
    if (scroller) scroller.scrollTop = 0;
    activeIdx = 0;
    userScrolled = false;
    phase = 'playing';
  }

  function skipToEnd(): void {
    if (!scroller || !column) return;
    scroller.scrollTop = column.scrollHeight - scroller.clientHeight;
    activeIdx = sections.length - 1;
    phase = 'ended';
  }

  function onUserScroll(): void {
    userScrolled = true;
    if (userScrollResetTimer) clearTimeout(userScrollResetTimer);
    // After 3 seconds of no manual interaction, resume auto-scroll from the
    // user's current position (no jump). Stays paused if the user paused the
    // playback explicitly.
    userScrollResetTimer = setTimeout(() => { userScrolled = false; }, 3000);
    updateActiveSection();
  }

  onMount(() => {
    void (async () => {
      try {
        await bootAndLoad();
        if (cancelled) return;
        phase = 'playing';
        // Kick off the rAF scroll loop.
        lastFrameT = 0;
        rafId = requestAnimationFrame(scrollFrame);
        // Kick off the sample stream.
        void sampleTick();
      } catch (e) {
        phase = 'error';
        errorMsg = e instanceof Error ? e.message : String(e);
      }
    })();
  });

  onDestroy(() => {
    cancelled = true;
    if (sampleTimer) clearTimeout(sampleTimer);
    if (userScrollResetTimer) clearTimeout(userScrollResetTimer);
    if (rafId !== null) cancelAnimationFrame(rafId);
    engine?.destroy();
    engine = null;
  });

  const phaseLabel = $derived(({
    loading: loadingMsg || 'loading…',
    playing: 'rolling',
    paused: 'paused',
    ended: 'end',
    error: 'error',
  } as const)[phase]);
</script>

<section class="credits">
  <div class="sampleBar">
    <span class="sampleTitle">live · reference checkpoint sampling</span>
    <pre class="sampleLine" aria-live="polite">{sampleLine || ' '}</pre>
  </div>

  <header class="head">
    <div class="kicker">
      <span class="dot dot-{phase}" aria-hidden="true"></span>
      <span class="phase">{phaseLabel}</span>
    </div>
    <div class="controls">
      {#if phase === 'playing'}
        <button type="button" class="btn btn-secondary" onclick={pause}>pause</button>
      {:else if phase === 'paused'}
        <button type="button" class="btn btn-primary" onclick={play}>resume</button>
      {:else if phase === 'ended'}
        <button type="button" class="btn btn-ghost" onclick={restart}>replay</button>
      {:else if phase === 'loading'}
        <button type="button" class="btn btn-primary" disabled>working…</button>
      {/if}
      {#if phase !== 'loading' && phase !== 'ended'}
        <button type="button" class="btn btn-ghost" onclick={skipToEnd}>skip to end</button>
      {/if}
    </div>
  </header>

  <div class="rollWrap">
    <div class="moduleRail" aria-hidden="true">
      <div class="moduleRailInner">
        {#each sections as s, i (i)}
          <span class="moduleChip" class:active={i === activeIdx}>{s.moduleTag}</span>
        {/each}
      </div>
    </div>
    <div
      class="scroller"
      bind:this={scroller}
      onscroll={onUserScroll}
      role="region"
      aria-label="auto-scrolling source code"
    >
      <div class="column" bind:this={column}>
        <div class="opening">
          <p class="openingTag">M18 · the credits roll</p>
          <p class="openingHead">Every line below shipped in the engine you just trained.</p>
          <p class="openingBody">
            Six files. About four hundred lines of WGSL and TypeScript. Imported into
            this page via Vite's <code>?raw</code> loader, so what you see is what ran.
            The model above is sampling from the same reference checkpoint right now.
          </p>
        </div>
        {#each sections as s, i (i)}
          <section
            class="section"
            data-section-idx={i}
            bind:this={sectionRefs[i]}
          >
            <header class="sectionHead">
              <span class="sectionTag">{s.moduleTag}</span>
              <span class="sectionTitle">{s.title}</span>
              <span class="sectionFile">{s.fileLabel}</span>
            </header>
            {#if s.note}
              <p class="sectionNote">{s.note}</p>
            {/if}
            <pre class="code"><code>{s.src}</code></pre>
          </section>
        {/each}
        <div class="closing">
          <p class="closingHead">That is the whole engine.</p>
          <p class="closingBody">
            Plus the boring scaffolding: a Tensor type, a few matmul kernels, a corpus
            loader, a checkpoint writer. None of it is hidden. Read the rest at
            <code>apps/docs/src/lib/m18/engine/</code>.
          </p>
        </div>
      </div>
    </div>
  </div>

  {#if errorMsg}
    <p class="err">{errorMsg}</p>
  {/if}
</section>

<style>
  .credits {
    display: flex; flex-direction: column; gap: 0.85rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 18px;
    padding: clamp(0.95rem, 2vw, 1.45rem);
    color: var(--site-fg);
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--site-fg) 4%, transparent),
      0 24px 48px -28px color-mix(in srgb, var(--ink-sea) 30%, transparent);
  }

  .sampleBar {
    display: flex; flex-direction: column; gap: 0.35rem;
    padding: 0.7rem 0.85rem;
    background: color-mix(in srgb, var(--ink-sea) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-sea) 22%, transparent);
    border-radius: 12px;
  }
  .sampleTitle {
    font-family: var(--font-mono); font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-sea); font-weight: 600;
  }
  .sampleLine {
    margin: 0; min-height: 1.4em;
    font-family: var(--font-mono); font-size: 0.92rem;
    line-height: 1.4; color: var(--site-fg);
    white-space: pre; overflow: hidden;
    text-overflow: clip;
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
  .dot-loading { background: var(--ink-sun);  animation: pulse 1.1s ease-in-out infinite; }
  .dot-playing { background: var(--ink-sea);  animation: pulse 1.1s ease-in-out infinite; }
  .dot-paused  { background: var(--ink-sun); }
  .dot-ended   { background: var(--ink-teal); }
  .dot-error   { background: var(--ink-red); }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  .phase {
    font-family: var(--font-mono); font-size: 0.78rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }

  .controls { display: inline-flex; gap: 0.4rem; align-items: center; }
  .btn {
    cursor: pointer;
    font-family: var(--font-body); font-size: 0.86rem; font-weight: 600;
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

  .rollWrap {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0;
    border: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    border-radius: 12px;
    background: color-mix(in srgb, var(--site-bg) 96%, var(--site-fg) 4%);
    overflow: hidden;
  }
  .moduleRail {
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    border-right: 1px solid color-mix(in srgb, var(--site-fg) 8%, transparent);
    min-width: 4.2rem;
    display: flex;
    align-items: stretch;
  }
  .moduleRailInner {
    position: sticky; top: 0;
    align-self: flex-start;
    padding: 1.1rem 0.55rem;
    display: flex; flex-direction: column; gap: 0.45rem;
  }
  .moduleChip {
    font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700;
    padding: 0.28rem 0.5rem;
    border-radius: 999px;
    background: transparent;
    color: var(--site-fg-muted);
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    text-align: center;
    transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
  }
  .moduleChip.active {
    background: var(--ink-sea);
    color: var(--site-bg);
    border-color: var(--ink-sea);
  }

  .scroller {
    height: clamp(420px, 60vh, 720px);
    overflow-y: auto;
    scroll-behavior: auto;
    overscroll-behavior: contain;
  }
  .scroller::-webkit-scrollbar { width: 8px; }
  .scroller::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--site-fg) 22%, transparent);
    border-radius: 4px;
  }
  .scroller::-webkit-scrollbar-track {
    background: transparent;
  }

  .column { padding: 1.1rem 1.25rem 50vh 1.25rem; }

  .opening, .closing {
    padding: 1.2rem 0;
  }
  .openingTag {
    margin: 0 0 0.35rem 0;
    font-family: var(--font-mono); font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--ink-sea); font-weight: 700;
  }
  .openingHead {
    margin: 0 0 0.45rem 0;
    font-family: var(--font-display); font-size: 1.35rem;
    color: var(--site-fg);
  }
  .openingBody, .closingBody {
    margin: 0;
    font-size: 0.95rem; line-height: 1.55;
    color: var(--site-fg);
  }
  .openingBody code, .closingBody code {
    font-family: var(--font-mono); font-size: 0.86em;
    padding: 0.05rem 0.32rem; border-radius: 4px;
    background: color-mix(in srgb, var(--site-fg) 7%, transparent);
  }
  .closingHead {
    margin: 0 0 0.45rem 0;
    font-family: var(--font-display); font-size: 1.2rem;
    color: var(--site-fg);
  }

  .section {
    padding: 1.4rem 0 0.4rem 0;
    border-top: 1px solid color-mix(in srgb, var(--site-fg) 8%, transparent);
    margin-top: 1rem;
  }
  .sectionHead {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.55rem 0.85rem;
    margin-bottom: 0.55rem;
  }
  .sectionTag {
    font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700;
    padding: 0.16rem 0.45rem; border-radius: 999px;
    background: color-mix(in srgb, var(--ink-sea) 14%, transparent);
    color: var(--ink-sea);
    letter-spacing: 0.05em;
  }
  .sectionTitle {
    font-family: var(--font-display); font-size: 1.05rem;
    color: var(--site-fg); font-weight: 600;
  }
  .sectionFile {
    font-family: var(--font-mono); font-size: 0.78rem;
    color: var(--site-fg-muted);
  }
  .sectionNote {
    margin: 0 0 0.6rem 0;
    font-size: 0.88rem; line-height: 1.5;
    color: var(--site-fg-muted);
    max-width: 62ch;
  }
  .code {
    margin: 0;
    padding: 0.85rem 0.95rem;
    font-family: var(--font-mono); font-size: 0.82rem;
    line-height: 1.55;
    color: var(--site-fg);
    background: color-mix(in srgb, var(--site-fg) 3.5%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 7%, transparent);
    border-radius: 8px;
    overflow-x: auto;
    white-space: pre;
    tab-size: 2;
  }
  .code code { font-family: inherit; }

  .err {
    margin: 0; padding: 0.65rem 0.85rem;
    border: 1px solid color-mix(in srgb, var(--ink-red) 35%, transparent);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    border-radius: 10px;
    color: var(--ink-red); font-size: 0.86rem;
  }
</style>
