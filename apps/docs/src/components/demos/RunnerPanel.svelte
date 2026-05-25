<script lang="ts">
  // M18 runnerPanel (slice 5 + slice 6 extensions).
  //
  // Centerpiece of 18.1 "Press start" and 18.2 "Watch it learn." Owns the
  // training loop: Start / Pause / Reset, seed input, lr + batch sliders,
  // explicit "Compiling shaders…" boot phase, dual loss curve, current LR.
  //
  // Slice-6 additions:
  //   • `showSamples` prop — when true, every SAMPLE_EVERY iters during training
  //     we run engine.forward() on a fixed prompt and append decoded chars to
  //     a scrolling pre, annotated with the expected qualitative phase so the
  //     gibberish-before-iter-200 stretch is framed, not feared (research trap 4).
  //   • currentLr metric tile — the cosine-decayed lr we just used.
  //   • Page Visibility wiring — when the tab goes hidden, the loop pauses
  //     cleanly via the cancel token and the badge says "paused (tab in
  //     background)". When visible again, training resumes from the exact iter.
  //
  // Still NOT here (slice 7+): Save / Load weights, dropout / n_layer sliders.

  import { onMount, onDestroy } from 'svelte';
  import {
    Engine, M18_CONFIG, seededInitWeights, cosineLR,
    loadTinyShakespeare, getBatch, seededRng,
    type CorpusBundle,
  } from '../../lib/m18/engine';

  interface Props {
    showSamples?: boolean;
  }

  const { showSamples = false }: Props = $props();

  const cfg = M18_CONFIG;
  const TOTAL_ITERS = 2000;
  const WARMUP = 100;
  const LR_MIN = 3e-5;
  const EVAL_EVERY = 50;
  const EVAL_BATCHES = 4;
  const SAMPLE_EVERY = 200;       // sample on iters 0, 200, 400, …
  const SAMPLE_CHARS = 80;
  const SAMPLE_TEMP = 0.8;
  const PROMPT_LEN = 32;          // chars of corpus context used as the prompt
  const HP = { beta1: 0.9, beta2: 0.95, eps: 1e-8, lambda: 0.1, clipNorm: 1.0 };

  type Phase = 'idle' | 'booting' | 'training' | 'paused' | 'done' | 'error';

  let seed: string = $state('hamlet');
  let lrMax: number = $state(3e-4);
  let batchSize: number = $state(32);

  let phase: Phase = $state('idle');
  let bootMsg: string = $state('');
  let pausedByVisibility: boolean = $state(false);

  let currentIter: number = $state(0);
  let currentLr: number = $state(0);
  let trainNll: number = $state(0);
  let valNll: number = $state(0);
  let itersPerSec: number = $state(0);
  let elapsedSec: number = $state(0);
  let errorMsg: string = $state('');

  const trainCurve: { iter: number; nll: number }[] = $state([]);
  const valCurve: { iter: number; nll: number }[] = $state([]);
  const samples: { iter: number; text: string; band: string }[] = $state([]);
  let canvas: HTMLCanvasElement | undefined = $state();
  let sampleLog: HTMLElement | undefined = $state();

  // Non-reactive refs. Engine and corpus survive Reset to avoid paying
  // shader-compile cost again.
  let engine: Engine | null = null;
  let corpus: CorpusBundle | null = null;
  let trainRng: (() => number) | null = null;
  let valRng: (() => number) | null = null;
  let sampleRng: (() => number) | null = null;
  let promptIds: Int32Array | null = null;
  let visHandler: (() => void) | null = null;
  let cancelToken: { cancelled: boolean } = { cancelled: false };
  let ewmaTrain: number | null = null;
  let lastEvalT = 0;
  let lastEvalIter = 0;
  let startedAt = 0;

  function ewma(prev: number | null, x: number, decay = 0.9): number {
    return prev == null ? x : decay * prev + (1 - decay) * x;
  }

  function bandFor(iter: number): string {
    if (iter < 50)    return 'random init · uniform across 65 chars (this is correct)';
    if (iter < 300)   return 'character-frequency phase';
    if (iter < 800)   return 'bigram and word-shape phase';
    if (iter < 1500)  return 'short-word phase';
    return 'Shakespeare-flavored';
  }

  function sampleFromLogits(logits: Float32Array, temp: number, rng: () => number): number {
    let m = -Infinity;
    for (let i = 0; i < logits.length; i++) if (logits[i] > m) m = logits[i];
    let sum = 0;
    const exps = new Float64Array(logits.length);
    for (let i = 0; i < logits.length; i++) {
      const e = Math.exp((logits[i] - m) / temp);
      exps[i] = e; sum += e;
    }
    const u = rng() * sum;
    let acc = 0;
    for (let i = 0; i < logits.length; i++) {
      acc += exps[i];
      if (u < acc) return i;
    }
    return logits.length - 1;
  }

  async function sampleOnce(): Promise<string> {
    if (!engine || !corpus || !promptIds || !sampleRng) return '';
    const T = cfg.contextLen;
    const ctx = new Int32Array(T);
    // Place prompt at the END of the context window (autoregressive convention).
    const startPad = T - promptIds.length;
    for (let i = 0; i < promptIds.length; i++) ctx[startPad + i] = promptIds[i];
    const generated: number[] = [];
    for (let n = 0; n < SAMPLE_CHARS; n++) {
      const logits = await engine.forward(ctx, 1);  // [T, V]
      const last = logits.subarray((T - 1) * cfg.vocabSize, T * cfg.vocabSize);
      const id = sampleFromLogits(last, SAMPLE_TEMP, sampleRng);
      generated.push(id);
      // slide window one to the left
      for (let i = 0; i < T - 1; i++) ctx[i] = ctx[i + 1];
      ctx[T - 1] = id;
    }
    return generated.map((id) => corpus!.vocab[id]).join('');
  }

  async function emitSampleFor(iter: number): Promise<void> {
    if (!showSamples) return;
    try {
      const text = await sampleOnce();
      samples.push({ iter, text, band: bandFor(iter) });
      // Auto-scroll the log to the bottom.
      queueMicrotask(() => { if (sampleLog) sampleLog.scrollTop = sampleLog.scrollHeight; });
    } catch (e) {
      console.warn('[runnerPanel] sample failed', e);
    }
  }

  async function boot(): Promise<void> {
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available. Try Chrome, Edge, or Firefox 141+ on desktop.');
    }
    bootMsg = 'loading corpus…';
    if (!corpus) corpus = await loadTinyShakespeare();
    bootMsg = 'requesting GPU adapter…';
    if (!engine) engine = await Engine.create(cfg);
    bootMsg = 'initializing weights…';
    engine.loadParameters(seededInitWeights(cfg, seed));
    engine.initTraining(batchSize);
    bootMsg = 'compiling shaders…';
    // First trainStep pays the WGSL pipeline compilation cost. Run one dummy
    // step on a throwaway batch so iter 0 on the live counter is "warm". The
    // step *does* update weights with lr=0 (no-op), but we re-init below for
    // safety to also zero the AdamW (m, v) state.
    const warmRng = seededRng(seed + ':warm');
    const w = getBatch(corpus.trainIds, batchSize, cfg.contextLen, warmRng);
    await engine.trainStep(w.x, w.y, 0, 1, HP);
    engine.loadParameters(seededInitWeights(cfg, seed));
    engine.initTraining(batchSize);
    trainRng = seededRng(seed);
    valRng = seededRng(seed + ':val');
    sampleRng = seededRng(seed + ':sample');
    // Fixed prompt: a slice of the val set so we never sample from data the
    // model was trained on. Same prompt every sample → improvement is visible.
    promptIds = corpus.valIds.slice(0, PROMPT_LEN);
    ewmaTrain = null;
    bootMsg = '';
  }

  async function start(): Promise<void> {
    if (phase === 'training') return;
    if (phase === 'paused') {
      pausedByVisibility = false;
      phase = 'training';
      cancelToken = { cancelled: false };
      lastEvalT = performance.now();
      lastEvalIter = currentIter;
      void runLoop();
      return;
    }
    errorMsg = '';
    trainCurve.length = 0; valCurve.length = 0; samples.length = 0;
    currentIter = 0; trainNll = 0; valNll = 0;
    itersPerSec = 0; elapsedSec = 0; currentLr = 0;
    drawCurve();
    phase = 'booting';
    try {
      await boot();
      phase = 'training';
      startedAt = performance.now();
      lastEvalT = startedAt;
      lastEvalIter = 0;
      cancelToken = { cancelled: false };
      // Iter 0 sample (the uniform-distribution baseline) before training starts.
      if (showSamples) await emitSampleFor(0);
      void runLoop();
    } catch (e) {
      phase = 'error';
      errorMsg = e instanceof Error ? e.message : String(e);
      bootMsg = '';
    }
  }

  function pause(): void {
    if (phase !== 'training') return;
    cancelToken.cancelled = true;
    phase = 'paused';
  }

  function reset(): void {
    cancelToken.cancelled = true;
    pausedByVisibility = false;
    phase = 'idle';
    trainCurve.length = 0; valCurve.length = 0; samples.length = 0;
    currentIter = 0; trainNll = 0; valNll = 0; currentLr = 0;
    itersPerSec = 0; elapsedSec = 0;
    errorMsg = ''; bootMsg = '';
    drawCurve();
  }

  async function runLoop(): Promise<void> {
    if (!engine || !corpus || !trainRng || !valRng) return;
    const localToken = cancelToken;
    while (currentIter < TOTAL_ITERS && !localToken.cancelled) {
      const lr = cosineLR(currentIter, WARMUP, TOTAL_ITERS, lrMax, LR_MIN);
      currentLr = lr;
      const { x, y } = getBatch(corpus.trainIds, batchSize, cfg.contextLen, trainRng);
      const loss = await engine.trainStep(x, y, lr, currentIter + 1, HP);
      if (localToken.cancelled) return;
      ewmaTrain = ewma(ewmaTrain, loss);
      trainNll = ewmaTrain!;

      const isCheckpoint = currentIter % EVAL_EVERY === 0 || currentIter === TOTAL_ITERS - 1;
      if (isCheckpoint) {
        let sum = 0;
        for (let b = 0; b < EVAL_BATCHES; b++) {
          const v = getBatch(corpus.valIds, batchSize, cfg.contextLen, valRng);
          sum += await engine.valLoss(v.x, v.y);
          if (localToken.cancelled) return;
        }
        valNll = sum / EVAL_BATCHES;
        trainCurve.push({ iter: currentIter, nll: trainNll });
        valCurve.push({ iter: currentIter, nll: valNll });
        const now = performance.now();
        const dt = (now - lastEvalT) / 1000;
        if (dt > 0 && currentIter > lastEvalIter) {
          itersPerSec = (currentIter - lastEvalIter) / dt;
        }
        lastEvalT = now; lastEvalIter = currentIter;
        elapsedSec = (now - startedAt) / 1000;
        drawCurve();
        await new Promise<void>((r) => setTimeout(r, 0));
      }

      // Live sample on iter SAMPLE_EVERY, 2·SAMPLE_EVERY, … (iter 0 done at start()).
      if (showSamples && currentIter > 0 && currentIter % SAMPLE_EVERY === 0) {
        await emitSampleFor(currentIter);
        if (localToken.cancelled) return;
      }

      currentIter++;
    }
    if (currentIter >= TOTAL_ITERS) {
      phase = 'done';
      // Final sample at the end so the closing log line is the trained-model output.
      if (showSamples) await emitSampleFor(TOTAL_ITERS);
    }
  }

  function drawCurve(): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 42, r: 14, t: 14, b: 28 };
    const x0 = pad.l, y0 = h - pad.b;
    const x1 = w - pad.r, y1 = pad.t;
    const yMin = 1.5, yMax = 4.4;
    const xMin = 0, xMax = TOTAL_ITERS;
    const xs = (it: number) => x0 + (it - xMin) / (xMax - xMin) * (x1 - x0);
    const ys = (n: number) => y0 - (n - yMin) / (yMax - yMin) * (y0 - y1);

    const axis = 'color-mix(in srgb, currentColor 22%, transparent)';
    const grid = 'color-mix(in srgb, currentColor 9%, transparent)';
    const tickLabel = 'color-mix(in srgb, currentColor 55%, transparent)';

    ctx.strokeStyle = axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();

    ctx.fillStyle = tickLabel;
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const yv of [2, 2.5, 3, 3.5, 4]) {
      const py = ys(yv);
      ctx.fillText(yv.toFixed(1), x0 - 6, py);
      ctx.strokeStyle = grid;
      ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
    }
    const lnV = Math.log(cfg.vocabSize);
    if (lnV < yMax && lnV > yMin) {
      ctx.strokeStyle = 'color-mix(in srgb, currentColor 18%, transparent)';
      ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      const py = ys(lnV);
      ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = tickLabel;
      ctx.fillText(`ln(${cfg.vocabSize}) ≈ ${lnV.toFixed(2)}`, x0 + 6, py - 8);
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = tickLabel;
    for (const xv of [0, 500, 1000, 1500, 2000]) {
      ctx.fillText(String(xv), xs(xv), y0 + 8);
    }

    const trainStroke = 'color-mix(in srgb, var(--ink-sea) 55%, transparent)';
    const valStroke = 'var(--ink-sea)';

    const plot = (rows: { iter: number; nll: number }[], stroke: string, width: number): void => {
      if (rows.length === 0) return;
      ctx.strokeStyle = stroke; ctx.lineWidth = width;
      ctx.beginPath();
      rows.forEach((r, i) => {
        const px = xs(r.iter); const py = ys(r.nll);
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.stroke();
    };

    plot(trainCurve, trainStroke, 1.5);
    plot(valCurve, valStroke, 2.2);
  }

  onMount(() => {
    visHandler = (): void => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        if (phase === 'training') {
          pausedByVisibility = true;
          cancelToken.cancelled = true;
          phase = 'paused';
        }
      } else {
        if (pausedByVisibility && phase === 'paused') {
          void start();
        }
      }
    };
    document.addEventListener('visibilitychange', visHandler);
    drawCurve();
  });

  onDestroy(() => {
    if (visHandler) document.removeEventListener('visibilitychange', visHandler);
    cancelToken.cancelled = true;
  });

  $effect(() => { drawCurve(); });

  const phaseLabel = $derived(({
    idle: 'ready',
    booting: bootMsg || 'starting…',
    training: 'training',
    paused: pausedByVisibility ? 'paused (tab in background)' : 'paused',
    done: 'done',
    error: 'error',
  } as const)[phase]);

  const controlsDisabled = $derived(phase === 'booting' || phase === 'training' || phase === 'paused');

  function fmt(x: number, p: number): string { return x.toFixed(p); }
  function sciSmall(x: number): string {
    if (x === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(x)));
    const m = x / Math.pow(10, e);
    return `${m.toFixed(2)}e${e}`;
  }
  function showChars(text: string): string {
    // Make whitespace visible in the sample log.
    return text.replace(/\n/g, '⏎\n');
  }
</script>

<section class="runner">
  <header class="head">
    <div class="kicker">
      <span class="dot dot-{phase}" class:dot-bg={pausedByVisibility} aria-hidden="true"></span>
      <span class="phase">{phaseLabel}</span>
    </div>
    <div class="actions">
      {#if phase === 'training'}
        <button type="button" class="btn btn-secondary" onclick={pause}>pause</button>
      {:else if phase === 'booting'}
        <button type="button" class="btn btn-primary" disabled>working…</button>
      {:else}
        <button type="button" class="btn btn-primary" onclick={start}>
          {phase === 'paused' ? 'resume' : (phase === 'idle' ? 'start' : 're-run')}
        </button>
      {/if}
      <button type="button" class="btn btn-ghost" onclick={reset} disabled={phase === 'booting'}>reset</button>
    </div>
  </header>

  <div class="controls">
    <label class="ctl">
      <span class="label">seed</span>
      <input
        type="text"
        bind:value={seed}
        disabled={controlsDisabled}
        spellcheck="false"
        autocomplete="off"
      />
      <span class="hint">requires reset to change</span>
    </label>
    <label class="ctl">
      <span class="label">batch <em>{batchSize}</em></span>
      <input
        type="range" min="8" max="64" step="8"
        bind:value={batchSize}
        disabled={controlsDisabled}
      />
      <span class="hint">requires reset to change</span>
    </label>
    <label class="ctl">
      <span class="label">max lr <em>{sciSmall(lrMax)}</em></span>
      <input
        type="range" min="0.00005" max="0.001" step="0.00005"
        bind:value={lrMax}
      />
      <span class="hint">live · cosine-decayed each iter</span>
    </label>
  </div>

  <dl class="metrics">
    <div><dt>iter</dt><dd class="num">{currentIter} / {TOTAL_ITERS}</dd></div>
    <div><dt>iters/sec</dt><dd class="num">{fmt(itersPerSec, 1)}</dd></div>
    <div><dt>elapsed</dt><dd class="num">{fmt(elapsedSec, 1)}s</dd></div>
    <div><dt>current lr</dt><dd class="num">{currentLr > 0 ? sciSmall(currentLr) : '—'}</dd></div>
    <div><dt>train NLL</dt><dd class="num">{fmt(trainNll, 4)}</dd></div>
    <div><dt>val NLL</dt><dd class="num val">{fmt(valNll, 4)}</dd></div>
  </dl>

  <div class="plotWrap">
    <canvas bind:this={canvas} width={720} height={280} aria-label="train and validation loss curve"></canvas>
    <div class="legend">
      <span><span class="swatch train"></span> train NLL</span>
      <span><span class="swatch val"></span> val NLL</span>
    </div>
  </div>

  {#if showSamples}
    <div class="sampleWrap">
      <div class="sampleHead">
        <span class="sampleTitle">live samples</span>
        <span class="sampleMeta">prompt: first {PROMPT_LEN} val chars · temp {SAMPLE_TEMP} · every {SAMPLE_EVERY} iters</span>
      </div>
      <div class="sampleLog" bind:this={sampleLog} role="log" aria-live="polite">
        {#if samples.length === 0}
          <p class="sampleEmpty">samples appear here once you press start.</p>
        {:else}
          {#each samples as s (s.iter)}
            <div class="sampleEntry">
              <div class="sampleBand">iter {s.iter} · {s.band}</div>
              <pre class="sampleText">{showChars(s.text)}</pre>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  {#if errorMsg}
    <p class="err">{errorMsg}</p>
  {/if}

  <p class="caption">
    Architecture: {cfg.nLayer}-layer, {cfg.nHead}-head, d_model={cfg.dModel}, T={cfg.contextLen}, vocab={cfg.vocabSize}.
    First iter pays a one-time WGSL shader compile (~1–3 s on desktop); the iters/sec readout starts after that warmup.
    Switching to another tab pauses training cleanly via the Page Visibility API; returning resumes from the exact iter.
  </p>
</section>

<style>
  .runner {
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
  .dot-booting { background: var(--ink-sun); animation: pulse 1.1s ease-in-out infinite; }
  .dot-training { background: var(--ink-sea); animation: pulse 1.1s ease-in-out infinite; }
  .dot-paused { background: var(--ink-sun); }
  .dot-paused.dot-bg { background: var(--ink-orange); animation: pulse 1.4s ease-in-out infinite; }
  .dot-done { background: var(--ink-teal); }
  .dot-error { background: var(--ink-red); }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  .phase {
    font-family: var(--font-mono); font-size: 0.78rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }

  .actions { display: inline-flex; gap: 0.4rem; }
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
  .btn-secondary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--site-fg) 14%, transparent);
  }
  .btn-ghost {
    background: transparent; color: var(--site-fg-muted);
    border-color: color-mix(in srgb, var(--site-fg) 14%, transparent);
  }
  .btn-ghost:hover:not(:disabled) {
    color: var(--site-fg);
    border-color: color-mix(in srgb, var(--site-fg) 28%, transparent);
  }

  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.8rem 1rem;
  }
  .ctl { display: flex; flex-direction: column; gap: 0.25rem; }
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
    padding: 0.42rem 0.6rem;
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

  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
    gap: 0.6rem 0.9rem;
    margin: 0;
    padding: 0.7rem 0.85rem;
    background: color-mix(in srgb, var(--site-fg) 3.5%, transparent);
    border-radius: 12px;
  }
  .metrics > div { display: flex; flex-direction: column; gap: 0.1rem; }
  .metrics dt {
    font-family: var(--font-mono); font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .metrics dd { margin: 0; }
  .num {
    font-family: var(--font-mono); font-size: 0.98rem;
    font-variant-numeric: tabular-nums;
    color: var(--site-fg);
  }
  .num.val { color: var(--ink-sea); font-weight: 700; }

  .plotWrap { display: flex; flex-direction: column; gap: 0.5rem; }
  canvas {
    display: block;
    width: 100%; height: auto;
    aspect-ratio: 720 / 280;
    background: color-mix(in srgb, var(--site-bg) 96%, var(--site-fg) 4%);
    border: 1px solid color-mix(in srgb, var(--site-fg) 10%, transparent);
    border-radius: 12px;
  }
  .legend {
    display: inline-flex; gap: 1.1rem;
    font-family: var(--font-mono); font-size: 0.76rem;
    color: var(--site-fg-muted);
  }
  .legend span { display: inline-flex; align-items: center; gap: 0.4rem; }
  .swatch { display: inline-block; width: 18px; height: 3px; border-radius: 2px; }
  .swatch.train { background: color-mix(in srgb, var(--ink-sea) 55%, transparent); }
  .swatch.val { background: var(--ink-sea); }

  .sampleWrap {
    display: flex; flex-direction: column; gap: 0.45rem;
    background: color-mix(in srgb, var(--site-fg) 3%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 9%, transparent);
    border-radius: 12px;
    padding: 0.7rem 0.85rem;
  }
  .sampleHead {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 0.75rem; flex-wrap: wrap;
  }
  .sampleTitle {
    font-family: var(--font-mono); font-size: 0.74rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .sampleMeta {
    font-family: var(--font-mono); font-size: 0.72rem;
    color: var(--site-fg-muted);
  }
  .sampleLog {
    max-height: 260px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 0.65rem;
    padding: 0.4rem 0.1rem;
  }
  .sampleEmpty {
    margin: 0; padding: 0.5rem 0.1rem;
    font-family: var(--font-mono); font-size: 0.82rem;
    color: var(--site-fg-muted);
  }
  .sampleEntry {
    display: flex; flex-direction: column; gap: 0.2rem;
    border-left: 2px solid color-mix(in srgb, var(--ink-sea) 35%, transparent);
    padding-left: 0.7rem;
  }
  .sampleBand {
    font-family: var(--font-mono); font-size: 0.72rem;
    color: var(--ink-sea); font-weight: 600;
    letter-spacing: 0.02em;
  }
  .sampleText {
    margin: 0;
    font-family: var(--font-mono); font-size: 0.86rem;
    line-height: 1.45; color: var(--site-fg);
    white-space: pre-wrap; word-break: break-word;
  }

  .err {
    margin: 0; padding: 0.65rem 0.85rem;
    border: 1px solid color-mix(in srgb, var(--ink-red) 35%, transparent);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    border-radius: 10px;
    color: var(--ink-red); font-size: 0.86rem;
  }

  .caption {
    margin: 0;
    font-size: 0.84rem; color: var(--site-fg-muted);
    line-height: 1.55;
  }
</style>
