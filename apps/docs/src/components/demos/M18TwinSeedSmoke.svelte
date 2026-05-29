<script lang="ts">
  // M18 Slice 4 twin-seed determinism smoke.
  //
  // Runs the engine twice, sequentially, with a user-supplied seed string.
  // Same seed → byte-identical .bin checkpoints (the determinism story made
  // concrete). Change one character → curves diverge after a handful of iters
  // and the .bin SHA-256s no longer match.
  //
  // Trains for SHORT_ITERS rather than the full 2000 so the demo finishes in
  // under half a minute, the determinism property doesn't need a converged
  // model to demonstrate.

  import { onMount, onDestroy } from 'svelte';
  import {
    Engine, M18_CONFIG, seededInitWeights, cosineLR,
    loadTinyShakespeare, getBatch, seededRng,
    writeCheckpoint, vocabHash as computeVocabHash,
    type CorpusBundle, type CheckpointMeta,
  } from '../../lib/m18/engine';

  const cfg = M18_CONFIG;
  const BATCH = 32;
  const T = cfg.contextLen;
  const SHORT_ITERS = 40;
  const WARMUP = 10;
  const LR_MAX = 3e-4;
  const LR_MIN = 3e-5;
  const WEIGHT_DECAY = 0.1;
  const GRAD_CLIP = 1.0;

  type Phase = 'idle' | 'loading' | 'running-a' | 'running-b' | 'comparing' | 'done' | 'fail' | 'error';

  interface Trajectory {
    seed: string;
    losses: number[];
    binSha: string;
    binSize: number;
  }

  let seedA: string = $state('hamlet');
  let seedB: string = $state('hamlet');
  let phase: Phase = $state('idle');
  let progress: number = $state(0);
  let currentIter: number = $state(0);
  let elapsedSec: number = $state(0);
  let errorMsg: string = $state('');
  let runA: Trajectory | null = $state(null);
  let runB: Trajectory | null = $state(null);
  let firstDiffIter: number | null = $state(null);
  let canvas: HTMLCanvasElement | undefined = $state();
  let host: HTMLElement | undefined = $state();

  function tokenColor(name: string, fallback: string): string {
    if (typeof window === 'undefined' || !host) return fallback;
    const v = getComputedStyle(host).getPropertyValue(name).trim();
    return v || fallback;
  }

  let corpus: CorpusBundle | null = null;
  let engine: Engine | null = null;
  let vocabHashCache: string = '';

  async function sha256Hex(buf: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function doOneRun(seed: string): Promise<Trajectory> {
    if (!engine || !corpus) throw new Error('engine/corpus not ready');
    // Reset weights + training state for a fresh run.
    const weights = seededInitWeights(cfg, seed);
    engine.loadParameters(weights);
    engine.initTraining(BATCH);

    const trainRng = seededRng(seed);
    const losses: number[] = [];
    for (let step = 0; step < SHORT_ITERS; step++) {
      const lr = cosineLR(step, WARMUP, SHORT_ITERS, LR_MAX, LR_MIN);
      currentIter = step;
      const { x, y } = getBatch(corpus.trainIds, BATCH, T, trainRng);
      const loss = await engine.trainStep(x, y, lr, step + 1, {
        beta1: 0.9, beta2: 0.95, eps: 1e-8, lambda: WEIGHT_DECAY, clipNorm: GRAD_CLIP,
      });
      losses.push(loss);
      if (step % 5 === 0) {
        progress = (step + 1) / SHORT_ITERS;
        drawCurve();
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // Read every param back to CPU and serialize as a .bin.
    const p = engine.params;
    const block = async (i: number) => ({
      ln1Gamma: await engine.readTensor(p.blocks[i].ln1Gamma),
      ln1Beta:  await engine.readTensor(p.blocks[i].ln1Beta),
      wQKV:     await engine.readTensor(p.blocks[i].wQKV),
      wAttnOut: await engine.readTensor(p.blocks[i].wAttnOut),
      ln2Gamma: await engine.readTensor(p.blocks[i].ln2Gamma),
      ln2Beta:  await engine.readTensor(p.blocks[i].ln2Beta),
      wFFN1:    await engine.readTensor(p.blocks[i].wFFN1),
      wFFN2:    await engine.readTensor(p.blocks[i].wFFN2),
    });
    const params = {
      wte: await engine.readTensor(p.wte),
      wpe: await engine.readTensor(p.wpe),
      blocks: await Promise.all(Array.from({ length: cfg.nLayer }, (_, i) => block(i))),
      lnFGamma: await engine.readTensor(p.lnFGamma),
      lnFBeta:  await engine.readTensor(p.lnFBeta),
    };
    const meta: CheckpointMeta = {
      format: 'tinker-m18-v1',
      config: cfg,
      seed,
      vocabHash: vocabHashCache,
      iter: SHORT_ITERS,
      valLoss: losses[losses.length - 1],
      // createdAt is omitted from the byte-equality envelope by overwriting
      // with a fixed value in both runs (otherwise the wall-clock differs).
      createdAt: '2026-05-25T00:00:00.000Z',
    };
    const blob = writeCheckpoint(params, meta);
    const buf = await blob.arrayBuffer();
    return { seed, losses, binSha: await sha256Hex(buf), binSize: blob.size };
  }

  async function run(): Promise<void> {
    errorMsg = ''; firstDiffIter = null; runA = null; runB = null;
    if (!('gpu' in navigator)) {
      phase = 'error';
      errorMsg = 'WebGPU is not available. Try Chrome, Edge, or Firefox 141+ on desktop.';
      return;
    }
    phase = 'loading';
    const t0 = performance.now();
    try {
      if (!corpus) corpus = await loadTinyShakespeare();
      if (!vocabHashCache) vocabHashCache = await computeVocabHash(corpus.vocab);
      if (!engine) engine = await Engine.create(cfg);

      phase = 'running-a';
      runA = await doOneRun(seedA);

      phase = 'running-b';
      runB = await doOneRun(seedB);

      phase = 'comparing';
      // Find first iter where the per-iter loss diverges by more than f32 noise.
      const EPS = 1e-6;
      for (let i = 0; i < Math.min(runA.losses.length, runB.losses.length); i++) {
        if (Math.abs(runA.losses[i] - runB.losses[i]) > EPS) { firstDiffIter = i; break; }
      }
      const matchedBins = runA.binSha === runB.binSha;
      phase = matchedBins ? 'done' : 'fail';
      elapsedSec = (performance.now() - t0) / 1000;
      drawCurve();
    } catch (e) {
      phase = 'error';
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  function drawCurve(): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 38, r: 14, t: 14, b: 26 };
    const x0 = pad.l, y0 = h - pad.b;
    const x1 = w - pad.r, y1 = pad.t;
    const yMin = 1.8, yMax = 4.4;
    const xMin = 0, xMax = SHORT_ITERS;
    const xs = (it: number) => x0 + (it - xMin) / (xMax - xMin) * (x1 - x0);
    const ys = (n: number) => y0 - (n - yMin) / (yMax - yMin) * (y0 - y1);

    ctx.strokeStyle = 'rgba(60, 65, 80, 0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    ctx.fillStyle = 'rgba(60, 65, 80, 0.55)';
    ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const yv of [2, 2.5, 3, 3.5, 4]) {
      const py = ys(yv);
      ctx.fillText(yv.toFixed(1), x0 - 4, py);
      ctx.strokeStyle = 'rgba(60, 65, 80, 0.08)';
      ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const xv of [0, 10, 20, 30, 40]) ctx.fillText(String(xv), xs(xv), y0 + 6);

    const plot = (losses: number[], stroke: string, dash: number[] = []): void => {
      if (!losses.length) return;
      ctx.setLineDash(dash);
      ctx.strokeStyle = stroke; ctx.lineWidth = 2;
      ctx.beginPath();
      losses.forEach((l, i) => { const px = xs(i); const py = ys(l); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    const seriesA = tokenColor('--ink-sea', '#2a9fd6');
    const seriesB = tokenColor('--ink-coral', '#ff6a4d');
    if (runA) plot(runA.losses, seriesA);
    if (runB) plot(runB.losses, seriesB, [4, 3]);
  }

  onMount(() => { drawCurve(); });
  // Free the GPUDevice on unmount instead of waiting for GC.
  onDestroy(() => { engine?.destroy(); engine = null; });
  $effect(() => { drawCurve(); });

  const phaseLabel = $derived(({
    idle: '…',
    loading: 'loading corpus + GPU adapter',
    'running-a': `run A (seed "${seedA}")`,
    'running-b': `run B (seed "${seedB}")`,
    comparing: 'comparing .bin SHA-256',
    done: 'twin determinism verified',
    fail: 'twin .bin SHAs differ',
    error: 'error',
  } as const)[phase]);

  const verdict = $derived(() => {
    if (phase !== 'done' && phase !== 'fail') return '';
    if (!runA || !runB) return '';
    if (runA.binSha === runB.binSha) return 'BYTE-IDENTICAL';
    if (seedA !== seedB) return `DIVERGED (expected: seeds differ)`;
    return 'DIVERGED (UNEXPECTED)';
  });
</script>

<section class="twin" bind:this={host}>
  <header class="head">
    <div>
      <div class="kicker">M18 Slice 4 · twin-seed determinism</div>
      <div class="phase">phase: <strong>{phaseLabel}</strong>{#if phase === 'running-a' || phase === 'running-b'} · iter {currentIter} / {SHORT_ITERS}{/if}</div>
    </div>
    <button class="start" onclick={run} disabled={phase !== 'idle' && phase !== 'done' && phase !== 'fail' && phase !== 'error'}>
      {phase === 'idle' ? 'run twin' : (phase === 'done' || phase === 'fail' || phase === 'error') ? 're-run' : 'running…'}
    </button>
  </header>

  <div class="grid">
    <label class="field">
      <span>seed A</span>
      <input type="text" bind:value={seedA} disabled={phase === 'running-a' || phase === 'running-b' || phase === 'comparing' || phase === 'loading'} />
    </label>
    <label class="field">
      <span>seed B</span>
      <input type="text" bind:value={seedB} disabled={phase === 'running-a' || phase === 'running-b' || phase === 'comparing' || phase === 'loading'} />
    </label>
  </div>

  <div class="hint">
    Try the defaults (both <code>hamlet</code>), then change a single character in one of them.
  </div>

  <canvas bind:this={canvas} width={640} height={260} class="curve" aria-label="loss curve"></canvas>

  <div class="legend">
    <span class="dot a"></span> run A
    <span class="dot b"></span> run B (dashed)
  </div>

  {#if runA && runB}
    <div class="results">
      <div class="result">
        <div class="rk">seed A</div><div class="rv">{runA.seed}</div>
        <div class="rk">final loss</div><div class="rv mono">{runA.losses[runA.losses.length - 1].toFixed(4)}</div>
        <div class="rk">.bin size</div><div class="rv mono">{runA.binSize} bytes</div>
        <div class="rk">sha-256</div><div class="rv mono sha">{runA.binSha}</div>
      </div>
      <div class="result">
        <div class="rk">seed B</div><div class="rv">{runB.seed}</div>
        <div class="rk">final loss</div><div class="rv mono">{runB.losses[runB.losses.length - 1].toFixed(4)}</div>
        <div class="rk">.bin size</div><div class="rv mono">{runB.binSize} bytes</div>
        <div class="rk">sha-256</div><div class="rv mono sha">{runB.binSha}</div>
      </div>
    </div>

    <div class="verdict {phase}">
      {verdict()}
      {#if firstDiffIter !== null}
        <span class="diff-iter">first per-iter loss divergence at iter {firstDiffIter}</span>
      {/if}
      {#if phase === 'done'}
        <span class="diff-iter">elapsed {elapsedSec.toFixed(1)} s · {(SHORT_ITERS * 2 / elapsedSec).toFixed(1)} it/s</span>
      {/if}
    </div>
  {/if}

  {#if errorMsg}
    <pre class="err">{errorMsg}</pre>
  {/if}
</section>

<style>
  .twin {
    display: flex; flex-direction: column; gap: 0.85rem;
    padding: 1.1rem 1.25rem;
    background: var(--surface-1, color-mix(in srgb, var(--site-fg) 3%, transparent));
    border: 1px solid color-mix(in srgb, var(--site-fg) 12%, transparent);
    border-radius: 10px;
  }
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .kicker {
    font-family: var(--font-mono); font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--site-fg-muted);
  }
  .phase { font-family: var(--font-mono); font-size: 0.85rem; margin-top: 0.2rem; }
  .start {
    padding: 0.55rem 1.05rem;
    font-family: var(--font-display); font-weight: 600; font-size: 0.95rem;
    background: var(--site-fg); color: var(--site-bg);
    border: none; border-radius: 8px; cursor: pointer;
  }
  .start:disabled { opacity: 0.45; cursor: not-allowed; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .field { display: flex; flex-direction: column; gap: 0.25rem; font-family: var(--font-mono); font-size: 0.85rem; }
  .field span { color: var(--site-fg-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .field input {
    padding: 0.45rem 0.65rem;
    font-family: var(--font-mono); font-size: 0.95rem;
    border: 1px solid color-mix(in srgb, var(--site-fg) 18%, transparent);
    border-radius: 6px; background: var(--site-bg); color: var(--site-fg);
  }
  .field input:disabled { opacity: 0.5; }

  .hint { font-size: 0.85rem; color: var(--site-fg-muted); }
  .hint code {
    font-family: var(--font-mono); font-size: 0.85em;
    padding: 0.05rem 0.3rem; border-radius: 4px;
    background: color-mix(in srgb, var(--site-fg) 7%, transparent);
  }

  .curve {
    width: 100%; height: auto; max-height: 260px;
    background: var(--site-bg);
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--site-fg) 8%, transparent);
  }

  .legend { display: flex; gap: 1.2rem; font-family: var(--font-mono); font-size: 0.78rem; color: var(--site-fg-muted); }
  .dot { display: inline-block; width: 14px; height: 4px; vertical-align: middle; margin-right: 0.4rem; border-radius: 2px; }
  .dot.a { background: var(--ink-sea); }
  .dot.b { background: var(--ink-coral); }

  .results { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .result {
    display: grid; grid-template-columns: 5rem 1fr; gap: 0.25rem 0.6rem;
    padding: 0.7rem; border-radius: 6px;
    background: color-mix(in srgb, var(--site-fg) 4%, transparent);
    font-size: 0.85rem;
  }
  .rk { color: var(--site-fg-muted); font-family: var(--font-mono); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; align-self: center; }
  .rv { word-break: break-all; }
  .mono { font-family: var(--font-mono); }
  .sha { font-size: 0.72rem; line-height: 1.35; }

  .verdict {
    padding: 0.7rem 0.9rem; border-radius: 6px;
    font-family: var(--font-mono); font-weight: 600; font-size: 0.95rem;
    display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem;
  }
  .verdict.done { background: color-mix(in srgb, var(--cta) 18%, transparent); color: var(--cta); }
  .verdict.fail { background: color-mix(in srgb, var(--ink-coral) 18%, transparent); color: var(--site-error); }
  .diff-iter { font-weight: 400; font-size: 0.8rem; color: var(--site-fg-muted); }

  .err {
    font-family: var(--font-mono); font-size: 0.8rem; color: var(--site-error);
    background: color-mix(in srgb, var(--ink-coral) 12%, transparent);
    padding: 0.6rem; border-radius: 6px;
    white-space: pre-wrap; overflow-wrap: anywhere; margin: 0;
  }
</style>
