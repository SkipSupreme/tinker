<script lang="ts">
  // M18 Slice 7 — seedScrubber for lesson 18.3 "Your checkpoint."
  //
  // Two side-by-side training runs, ~40 iters each. Same seed string in both
  // panes → byte-identical .bin SHA-256s and overlapping curves. Change one
  // character in either seed → the two curves diverge from iter 0 and the
  // SHAs no longer match.
  //
  // Reference implementation: M18TwinSeedSmoke.svelte at /dev/m18-twin-seed/.
  // Differences for the lesson-facing widget:
  //   • DESIGN.md tokens via getComputedStyle (no hex literals).
  //   • A vertical marker on the curve at the first-divergence iter.
  //   • A plain-language verdict block above the SHA dump.
  //   • Surface chrome matches RunnerPanel (--demo-card / --demo-card-border).

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
  const HP = { beta1: 0.9, beta2: 0.95, eps: 1e-8, lambda: 0.1, clipNorm: 1.0 };

  // Fixed createdAt so two same-seed runs produce byte-identical .bin files.
  // Without this the wall-clock timestamp would differ and the whole "byte-
  // identical" pedagogical claim would silently fail.
  const FROZEN_CREATED_AT = '2026-05-25T00:00:00.000Z';

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
  let currentIter: number = $state(0);
  let elapsedSec: number = $state(0);
  let errorMsg: string = $state('');
  let runA: Trajectory | null = $state(null);
  let runB: Trajectory | null = $state(null);
  let firstDiffIter: number | null = $state(null);
  let canvas: HTMLCanvasElement | undefined = $state();
  let host: HTMLElement | undefined = $state();

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
    const weights = seededInitWeights(cfg, seed);
    engine.loadParameters(weights);
    engine.initTraining(BATCH);

    const trainRng = seededRng(seed);
    const losses: number[] = [];
    for (let step = 0; step < SHORT_ITERS; step++) {
      const lr = cosineLR(step, WARMUP, SHORT_ITERS, LR_MAX, LR_MIN);
      currentIter = step;
      const { x, y } = getBatch(corpus.trainIds, BATCH, T, trainRng);
      const loss = await engine.trainStep(x, y, lr, step + 1, HP);
      losses.push(loss);
      if (step % 4 === 0) {
        drawCurve();
        await new Promise((r) => setTimeout(r, 0));
      }
    }

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
      createdAt: FROZEN_CREATED_AT,
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
      const EPS = 1e-6;
      for (let i = 0; i < Math.min(runA.losses.length, runB.losses.length); i++) {
        if (Math.abs(runA.losses[i] - runB.losses[i]) > EPS) { firstDiffIter = i; break; }
      }
      phase = runA.binSha === runB.binSha ? 'done' : 'fail';
      elapsedSec = (performance.now() - t0) / 1000;
      drawCurve();
    } catch (e) {
      phase = 'error';
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  function tokenColor(name: string, fallback: string): string {
    if (typeof window === 'undefined' || !host) return fallback;
    const v = getComputedStyle(host).getPropertyValue(name).trim();
    return v || fallback;
  }

  function drawCurve(): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const inkSea    = tokenColor('--ink-sea',    '#2a9fd6');
    const inkOrange = tokenColor('--ink-orange', '#ff9f43');
    const inkRed    = tokenColor('--ink-red',    '#e6396a');
    const fg        = tokenColor('--site-fg',    '#1d1e22');

    const pad = { l: 42, r: 14, t: 14, b: 28 };
    const x0 = pad.l, y0 = h - pad.b;
    const x1 = w - pad.r, y1 = pad.t;
    const yMin = 1.8, yMax = 4.4;
    const xMin = 0, xMax = SHORT_ITERS;
    const xs = (it: number) => x0 + (it - xMin) / (xMax - xMin) * (x1 - x0);
    const ys = (n: number) => y0 - (n - yMin) / (yMax - yMin) * (y0 - y1);

    const axis = `color-mix(in srgb, ${fg} 22%, transparent)`;
    const grid = `color-mix(in srgb, ${fg} 9%, transparent)`;
    const tickLabel = `color-mix(in srgb, ${fg} 55%, transparent)`;

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
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const xv of [0, 10, 20, 30, 40]) ctx.fillText(String(xv), xs(xv), y0 + 8);

    if (firstDiffIter !== null && firstDiffIter > 0) {
      const mx = xs(firstDiffIter);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = `color-mix(in srgb, ${inkRed} 70%, transparent)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(mx, y1); ctx.lineTo(mx, y0); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = inkRed;
      ctx.font = '10.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`diverge @ iter ${firstDiffIter}`, mx + 4, y1 + 2);
    }

    const plot = (losses: number[], stroke: string, width: number, dash: number[] = []): void => {
      if (!losses.length) return;
      ctx.setLineDash(dash);
      ctx.strokeStyle = stroke; ctx.lineWidth = width;
      ctx.beginPath();
      losses.forEach((l, i) => {
        const px = xs(i); const py = ys(l);
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (runA) plot(runA.losses, inkSea, 2);
    if (runB) plot(runB.losses, inkOrange, 2, [5, 3]);
  }

  onMount(() => { drawCurve(); });
  // Free the GPUDevice on unmount instead of waiting for GC.
  onDestroy(() => { engine?.destroy(); engine = null; });
  $effect(() => { drawCurve(); });

  const phaseLabel = $derived(({
    idle: 'ready',
    loading: 'loading corpus + GPU adapter',
    'running-a': `run A (seed "${seedA}") · iter ${currentIter} / ${SHORT_ITERS}`,
    'running-b': `run B (seed "${seedB}") · iter ${currentIter} / ${SHORT_ITERS}`,
    comparing: 'comparing .bin SHA-256',
    done: 'byte-identical',
    fail: 'diverged',
    error: 'error',
  } as const)[phase]);

  const controlsDisabled = $derived(
    phase === 'loading' || phase === 'running-a' || phase === 'running-b' || phase === 'comparing'
  );

  const verdict = $derived(() => {
    if (phase !== 'done' && phase !== 'fail') return null;
    if (!runA || !runB) return null;
    const same = runA.binSha === runB.binSha;
    // Compare the seeds the runs actually used, not the live input fields —
    // otherwise editing a seed after a run mis-labels the previous result.
    const seedsSame = runA.seed === runB.seed;
    if (same && seedsSame) {
      return {
        kind: 'identical' as const,
        head: 'Byte-identical.',
        body: 'Same seed in both panes ran the same training run. Every weight, every gradient step, every optimizer update — identical. The two .bin files are byte-for-byte the same file.',
      };
    }
    if (!same && !seedsSame) {
      return {
        kind: 'diverged-expected' as const,
        head: 'Diverged from iter 0.',
        body: `Different seeds drew different initial weights, different mini-batches, and different dropout masks (we use 0.0 here, but the principle holds). The curves split immediately${firstDiffIter !== null ? ` (first measurable difference at iter ${firstDiffIter})` : ''}. Two valid training runs of the same architecture; two completely different models.`,
      };
    }
    return {
      kind: 'unexpected' as const,
      head: 'Unexpected divergence.',
      body: 'Seeds match but the runs do not. This means non-determinism leaked in somewhere (a Math.random call, a Date.now seed, a kernel race). Worth filing.',
    };
  });

  function fmt(x: number, p: number): string { return x.toFixed(p); }
</script>

<section class="twin" bind:this={host}>
  <header class="head">
    <div class="kicker">
      <span class="dot dot-{phase}" aria-hidden="true"></span>
      <span class="phase">{phaseLabel}</span>
    </div>
    <button
      type="button"
      class="btn btn-primary"
      onclick={run}
      disabled={controlsDisabled}
    >
      {phase === 'idle' ? 'run twin' : (phase === 'done' || phase === 'fail' || phase === 'error') ? 're-run' : 'running…'}
    </button>
  </header>

  <div class="controls">
    <label class="ctl">
      <span class="label">seed A</span>
      <input
        type="text"
        bind:value={seedA}
        disabled={controlsDisabled}
        spellcheck="false"
        autocomplete="off"
      />
    </label>
    <label class="ctl">
      <span class="label">seed B</span>
      <input
        type="text"
        bind:value={seedB}
        disabled={controlsDisabled}
        spellcheck="false"
        autocomplete="off"
      />
    </label>
  </div>

  <p class="hint">
    Both default to <code>hamlet</code>. Press <strong>run twin</strong> and watch the curves overlap. Then change one character in either seed and re-run.
  </p>

  <div class="plotWrap">
    <canvas bind:this={canvas} width={720} height={260} aria-label="twin loss curves"></canvas>
    <div class="legend">
      <span><span class="swatch a"></span> run A</span>
      <span><span class="swatch b"></span> run B (dashed)</span>
    </div>
  </div>

  {#if verdict()}
    <div class="verdict verdict-{verdict()!.kind}">
      <strong class="verdictHead">{verdict()!.head}</strong>
      <span class="verdictBody">{verdict()!.body}</span>
    </div>
  {/if}

  {#if runA && runB}
    <div class="results">
      <div class="result">
        <div class="rk">seed A</div><div class="rv mono">{runA.seed}</div>
        <div class="rk">final loss</div><div class="rv mono">{fmt(runA.losses[runA.losses.length - 1], 4)}</div>
        <div class="rk">.bin size</div><div class="rv mono">{runA.binSize.toLocaleString()} bytes</div>
        <div class="rk">sha-256</div><div class="rv mono sha">{runA.binSha}</div>
      </div>
      <div class="result">
        <div class="rk">seed B</div><div class="rv mono">{runB.seed}</div>
        <div class="rk">final loss</div><div class="rv mono">{fmt(runB.losses[runB.losses.length - 1], 4)}</div>
        <div class="rk">.bin size</div><div class="rv mono">{runB.binSize.toLocaleString()} bytes</div>
        <div class="rk">sha-256</div><div class="rv mono sha">{runB.binSha}</div>
      </div>
    </div>
  {/if}

  {#if (phase === 'done' || phase === 'fail') && elapsedSec > 0}
    <p class="meta">
      Two runs of {SHORT_ITERS} iters · {fmt(elapsedSec, 1)} s total · {fmt(SHORT_ITERS * 2 / elapsedSec, 1)} it/s
    </p>
  {/if}

  {#if errorMsg}
    <p class="err">{errorMsg}</p>
  {/if}
</section>

<style>
  .twin {
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
  .dot-loading { background: var(--ink-sun); animation: pulse 1.1s ease-in-out infinite; }
  .dot-running-a { background: var(--ink-sea); animation: pulse 1.1s ease-in-out infinite; }
  .dot-running-b { background: var(--ink-orange); animation: pulse 1.1s ease-in-out infinite; }
  .dot-comparing { background: var(--ink-sun); animation: pulse 1.1s ease-in-out infinite; }
  .dot-done { background: var(--ink-teal); }
  .dot-fail { background: var(--ink-red); }
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

  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.7rem 1rem;
  }
  .ctl { display: flex; flex-direction: column; gap: 0.3rem; }
  .label {
    font-family: var(--font-mono); font-size: 0.74rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--site-fg-muted);
  }
  .ctl input[type="text"] {
    padding: 0.46rem 0.65rem;
    font-family: var(--font-mono); font-size: 0.95rem;
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

  .hint {
    margin: 0;
    font-size: 0.85rem; color: var(--site-fg-muted);
    line-height: 1.5;
  }
  .hint code {
    font-family: var(--font-mono); font-size: 0.85em;
    padding: 0.05rem 0.32rem; border-radius: 4px;
    background: color-mix(in srgb, var(--site-fg) 7%, transparent);
  }
  .hint strong { color: var(--site-fg); font-weight: 600; }

  .plotWrap { display: flex; flex-direction: column; gap: 0.5rem; }
  canvas {
    display: block;
    width: 100%; height: auto;
    aspect-ratio: 720 / 260;
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
  .swatch.a { background: var(--ink-sea); }
  .swatch.b { background: var(--ink-orange); }

  .verdict {
    display: flex; flex-direction: column; gap: 0.3rem;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    border: 1px solid transparent;
    font-size: 0.92rem; line-height: 1.5;
  }
  .verdict-identical {
    background: color-mix(in srgb, var(--ink-teal) 14%, transparent);
    border-color: color-mix(in srgb, var(--ink-teal) 35%, transparent);
  }
  .verdict-diverged-expected {
    background: color-mix(in srgb, var(--ink-sea) 10%, transparent);
    border-color: color-mix(in srgb, var(--ink-sea) 30%, transparent);
  }
  .verdict-unexpected {
    background: color-mix(in srgb, var(--ink-red) 12%, transparent);
    border-color: color-mix(in srgb, var(--ink-red) 35%, transparent);
  }
  .verdictHead {
    font-family: var(--font-display); font-weight: 600;
    color: var(--site-fg);
  }
  .verdictBody { color: var(--site-fg); }

  .results { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  @media (max-width: 560px) { .results { grid-template-columns: 1fr; } }
  .result {
    display: grid; grid-template-columns: 6rem 1fr; gap: 0.3rem 0.65rem;
    padding: 0.75rem 0.9rem; border-radius: 10px;
    background: color-mix(in srgb, var(--site-fg) 3.5%, transparent);
    font-size: 0.88rem;
  }
  .rk {
    color: var(--site-fg-muted); font-family: var(--font-mono);
    font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.07em;
    align-self: center;
  }
  .rv { word-break: break-all; }
  .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .sha { font-size: 0.72rem; line-height: 1.4; color: var(--site-fg); }

  .meta {
    margin: 0;
    font-family: var(--font-mono); font-size: 0.78rem;
    color: var(--site-fg-muted);
  }

  .err {
    margin: 0; padding: 0.65rem 0.85rem;
    border: 1px solid color-mix(in srgb, var(--ink-red) 35%, transparent);
    background: color-mix(in srgb, var(--ink-red) 8%, transparent);
    border-radius: 10px;
    color: var(--ink-red); font-size: 0.86rem;
  }
</style>
