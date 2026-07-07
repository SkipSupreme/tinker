<script lang="ts">
  // M18 slice 6: lossCurvePathologyZoo.
  //
  // Six preset buttons, each re-trains the M18 transformer under a known
  // pathology for a short burst, then plots the live loss curve on top of a
  // faint M13-canonical reference shape so the learner sees "this is what
  // diverge looks like in YOUR engine, vs the synthetic example from M13."
  //
  // Independent of RunnerPanel: owns its own Engine instance (created lazily
  // on first preset click). Single seed for repeatability across clicks.

  import { onMount, onDestroy } from 'svelte';
  import {
    Engine, M18_CONFIG, seededInitWeights, cosineLR,
    loadTinyShakespeare, getBatch, seededRng,
    type CorpusBundle,
  } from '../../lib/m18/engine';

  const cfg = M18_CONFIG;
  const BATCH = 32;
  const HP_BASE = { beta1: 0.9, beta2: 0.95, eps: 1e-8, lambda: 0.1, clipNorm: 1.0 };
  const SEED = 'pathology';

  type PathologyKey = 'clean' | 'divergeSlow' | 'divergeFast' | 'dead' | 'overfit' | 'noWarmup';

  interface Preset {
    key: PathologyKey;
    label: string;
    m13: 'clean' | 'diverge' | 'dead' | 'overfit' | 'plateau' | 'spike';
    summary: string;
    iters: number;
    warmup: number;
    lrMax: number;
    tinyCorpus?: number;          // train on first N tokens only
    diagnosis: string;
  }

  const PRESETS: Preset[] = [
    {
      key: 'clean',
      label: 'clean run',
      m13: 'clean',
      summary: 'lr 3e-4, warmup 30, full corpus. The healthy baseline.',
      iters: 150,
      warmup: 30,
      lrMax: 3e-4,
      diagnosis: 'Both curves decay together; val sits a hair above train. Ship it.',
    },
    {
      key: 'divergeSlow',
      label: 'lr too high',
      m13: 'diverge',
      summary: 'lr 1e-2, warmup 30. Loss looks fine for ~20 iters, then unwinds.',
      iters: 150,
      warmup: 30,
      lrMax: 1e-2,
      diagnosis: 'The learning rate is past the stability cliff for this model. Each AdamW step overshoots; once it does, the gradients explode and nothing recovers.',
    },
    {
      key: 'divergeFast',
      label: 'lr=10 (catastrophe)',
      m13: 'diverge',
      summary: 'lr 10 from iter 1. Loss goes to NaN almost immediately.',
      iters: 30,
      warmup: 1,
      lrMax: 10,
      diagnosis: 'Past a certain lr, the first update is already a numerical overflow. The whole network becomes NaN within a few iters.',
    },
    {
      key: 'dead',
      label: 'lr too low',
      m13: 'dead',
      summary: 'lr 1e-9. The optimizer technically runs; the model never learns.',
      iters: 150,
      warmup: 30,
      lrMax: 1e-9,
      diagnosis: 'Loss stays glued to ln(65) ≈ 4.17 — the entropy of a uniform distribution over 65 chars. The model is "fitting" but the steps are so small the weights barely move.',
    },
    {
      key: 'overfit',
      label: 'overfit a tiny corpus',
      m13: 'overfit',
      summary: 'lr 3e-4, but only the first 80 chars of the training set.',
      iters: 150,
      warmup: 30,
      lrMax: 3e-4,
      tinyCorpus: 80,
      diagnosis: 'Train loss plummets toward zero because the model is memorizing 80 characters. Val loss does not follow — it has nothing to do with what was memorized.',
    },
    {
      key: 'noWarmup',
      label: 'no warmup, large lr',
      m13: 'spike',
      summary: 'lr 3e-3 from iter 1, warmup 0. Cold-start instability.',
      iters: 150,
      warmup: 0,
      lrMax: 3e-3,
      diagnosis: 'Warmup exists because AdamW\'s bias-corrected second moment is noisy in the first few iters. Skip warmup at a moderate lr and the early steps swing wildly — sometimes the model recovers, sometimes it doesn\'t.',
    },
  ];

  type Phase = 'idle' | 'booting' | 'running' | 'done' | 'error';

  let phase: Phase = $state('idle');
  let activePreset: PathologyKey | null = $state(null);
  let bootMsg: string = $state('');
  let errorMsg: string = $state('');
  let iter: number = $state(0);
  let lastLoss: number = $state(0);

  const liveCurve: { iter: number; nll: number }[] = $state([]);
  let referenceShape: { iter: number; nll: number }[] = $state([]);
  let canvas: HTMLCanvasElement | undefined = $state();

  let engine: Engine | null = null;
  let corpus: CorpusBundle | null = null;
  let cancelToken: { cancelled: boolean } = { cancelled: false };

  // M13 canonical reference shape generators. STEPS is the preset's iter count.
  // Loss range is normalized to roughly [0, 4.4] so the visual shape matches
  // what M13 taught regardless of the absolute scale of the live engine run.
  function referenceFor(p: Preset): { iter: number; nll: number }[] {
    const N = p.iters;
    const out: { iter: number; nll: number }[] = [];
    const noise = (t: number) => 0.04 * Math.sin(t * 1.7) + 0.02 * Math.cos(t * 3.1);
    for (let t = 0; t < N; t++) {
      let v: number;
      switch (p.m13) {
        case 'clean':
          v = 4.17 - 2.2 * (1 - Math.exp(-t / 35)) + noise(t);
          break;
        case 'diverge': {
          const elbow = N < 60 ? Math.floor(N * 0.15) : 40;
          if (t < elbow) v = 4.17 - 1.2 * (1 - Math.exp(-t / 18)) + noise(t);
          else v = (4.17 - 1.2 * (1 - Math.exp(-elbow / 18))) + 0.35 * (t - elbow);
          if (v > 12) v = 12;
          break;
        }
        case 'dead':
          v = 4.17 + 0.015 * Math.sin(t * 0.4);
          break;
        case 'overfit':
          // Train-shaped reference: drops fast to floor (we only plot one curve
          // visually; val divergence is described in the diagnosis text).
          v = 4.17 * Math.exp(-t / 14) + 0.15 + noise(t) * 0.3;
          break;
        case 'plateau':
          v = 4.17 - 0.6 * (1 - Math.exp(-t / 25)) + noise(t);
          break;
        case 'spike':
          // Big early spike then partial recovery.
          if (t < 8) v = 4.17 + 1.8 * (t / 8);
          else if (t < 24) v = 4.17 + 1.8 - 1.6 * ((t - 8) / 16);
          else v = 4.17 - 0.8 * (1 - Math.exp(-(t - 24) / 40)) + noise(t);
          break;
      }
      out.push({ iter: t, nll: v });
    }
    return out;
  }

  async function boot(): Promise<void> {
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available. Try Chrome, Edge, or Firefox 141+ on desktop.');
    }
    bootMsg = 'loading corpus…';
    if (!corpus) corpus = await loadTinyShakespeare();
    bootMsg = 'requesting GPU adapter…';
    if (!engine) engine = await Engine.create(cfg);
    bootMsg = 'compiling shaders…';
    engine.loadParameters(seededInitWeights(cfg, SEED));
    engine.initTraining(BATCH);
    // Warm pass to pay the shader-compile cost so the first preset's iter 0 is
    // already steady-state.
    const warmRng = seededRng(SEED + ':warm');
    const w = getBatch(corpus.trainIds, BATCH, cfg.contextLen, warmRng);
    await engine.trainStep(w.x, w.y, 0, 1, HP_BASE);
    bootMsg = '';
  }

  async function runPreset(preset: Preset): Promise<void> {
    if (phase === 'running' || phase === 'booting') return;
    errorMsg = '';
    activePreset = preset.key;
    liveCurve.length = 0;
    referenceShape = referenceFor(preset);
    iter = 0; lastLoss = 0;
    drawCurve();
    cancelToken.cancelled = true;          // cancel anything in flight
    cancelToken = { cancelled: false };
    const localToken = cancelToken;

    if (!engine) {
      phase = 'booting';
      try { await boot(); } catch (e) {
        phase = 'error';
        errorMsg = e instanceof Error ? e.message : String(e);
        return;
      }
    }
    if (!engine || !corpus) return;

    phase = 'running';
    // Fresh weights + fresh optimizer state for this preset.
    engine.loadParameters(seededInitWeights(cfg, SEED));
    engine.initTraining(BATCH);

    const rng = seededRng(SEED + ':' + preset.key);
    const data = preset.tinyCorpus
      ? corpus.trainIds.subarray(0, preset.tinyCorpus + cfg.contextLen + 1)
      : corpus.trainIds;

    try {
      for (let step = 0; step < preset.iters; step++) {
        if (localToken.cancelled) return;
        const lr = cosineLR(step, preset.warmup, preset.iters, preset.lrMax, preset.lrMax * 0.1);
        const { x, y } = getBatch(data, BATCH, cfg.contextLen, rng);
        const loss = await engine.trainStep(x, y, lr, step + 1, HP_BASE);
        iter = step + 1;
        lastLoss = loss;
        // Push every step so the curve animates smoothly for the short runs.
        liveCurve.push({ iter: step, nll: Number.isFinite(loss) ? loss : 12 });
        if (step % 4 === 0 || step === preset.iters - 1) {
          drawCurve();
          await new Promise<void>((r) => setTimeout(r, 0));
        }
        // Early-exit on NaN cascade — no point burning iters on dead gradients.
        if (!Number.isFinite(loss) && step > 5) {
          for (let pad = step + 1; pad < preset.iters; pad++) {
            liveCurve.push({ iter: pad, nll: 12 });
          }
          break;
        }
      }
      phase = 'done';
      drawCurve();
    } catch (e) {
      phase = 'error';
      errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  function drawCurve(): void {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width; const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const preset = activePreset ? PRESETS.find((p) => p.key === activePreset) : null;
    const totalIters = preset?.iters ?? 150;

    const pad = { l: 42, r: 14, t: 14, b: 28 };
    const x0 = pad.l, y0 = h - pad.b;
    const x1 = w - pad.r, y1 = pad.t;
    const yMin = 0, yMax = 12;
    const xs = (it: number) => x0 + it / totalIters * (x1 - x0);
    const ys = (n: number) => {
      const v = Math.max(yMin, Math.min(yMax, n));
      return y0 - (v - yMin) / (yMax - yMin) * (y0 - y1);
    };

    const axis = 'color-mix(in srgb, currentColor 22%, transparent)';
    const grid = 'color-mix(in srgb, currentColor 9%, transparent)';
    const tickLabel = 'color-mix(in srgb, currentColor 55%, transparent)';
    // Canvas 2D does not resolve `var(--token)`; an invalid strokeStyle leaves
    // the previous value (here, the faint grid grey) in effect, which is why
    // the live curve was rendering grey despite the legend swatch being red.
    // Resolve the CSS variable to its computed colour before handing it off.
    const inkRed =
      getComputedStyle(canvas).getPropertyValue('--ink-red').trim() ||
      'crimson';

    ctx.strokeStyle = axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();

    ctx.fillStyle = tickLabel;
    ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const yv of [0, 2, 4, 6, 8, 10]) {
      const py = ys(yv);
      ctx.fillText(yv.toFixed(0), x0 - 6, py);
      ctx.strokeStyle = grid;
      ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x1, py); ctx.stroke();
    }
    // ln(65) ≈ 4.17 baseline.
    const lnV = Math.log(cfg.vocabSize);
    ctx.strokeStyle = 'color-mix(in srgb, currentColor 18%, transparent)';
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    const lyp = ys(lnV);
    ctx.beginPath(); ctx.moveTo(x0, lyp); ctx.lineTo(x1, lyp); ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = tickLabel;
    ctx.fillText(`ln(${cfg.vocabSize}) ≈ ${lnV.toFixed(2)}`, x0 + 6, lyp - 9);

    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const ticks = [0, Math.floor(totalIters / 4), Math.floor(totalIters / 2), Math.floor(3 * totalIters / 4), totalIters];
    for (const xv of ticks) ctx.fillText(String(xv), xs(xv), y0 + 8);

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

    // M13 canonical reference: faint, dashed.
    if (referenceShape.length) {
      ctx.strokeStyle = 'color-mix(in srgb, currentColor 35%, transparent)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      referenceShape.forEach((r, i) => {
        const px = xs(r.iter); const py = ys(r.nll);
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Live engine run: solid, brand color.
    plot(liveCurve, inkRed, 2.2);
  }

  onMount(() => { drawCurve(); });
  onDestroy(() => {
    cancelToken.cancelled = true;
    engine?.destroy();
    engine = null;
  });
  $effect(() => { drawCurve(); });

  const activeDescriptor = $derived(activePreset ? PRESETS.find((p) => p.key === activePreset) : null);
  const statusText = $derived(({
    idle: 'pick a pathology and play it',
    booting: bootMsg || 'starting…',
    running: activeDescriptor ? `running "${activeDescriptor.label}" · iter ${iter} / ${activeDescriptor.iters}` : 'running…',
    done: activeDescriptor ? `done · "${activeDescriptor.label}" · final loss ${Number.isFinite(lastLoss) ? lastLoss.toFixed(3) : 'NaN'}` : 'done',
    error: 'error',
  } as const)[phase]);

  function fmt(x: number, p: number): string { return Number.isFinite(x) ? x.toFixed(p) : 'NaN'; }
</script>

<section class="zoo">
  <header class="head">
    <div class="kicker">
      <span class="dot dot-{phase}" aria-hidden="true"></span>
      <span class="phase">{statusText}</span>
    </div>
  </header>

  <div class="grid" role="group" aria-label="pathology presets">
    {#each PRESETS as p}
      <button
        type="button"
        class="card"
        class:active={activePreset === p.key}
        disabled={phase === 'booting' || phase === 'running'}
        onclick={() => runPreset(p)}
      >
        <div class="cardTitle">{p.label}</div>
        <div class="cardTag">M13 diagnosis: <em>{p.m13}</em></div>
        <div class="cardSummary">{p.summary}</div>
      </button>
    {/each}
  </div>

  <div class="plotWrap">
    <canvas bind:this={canvas} width={720} height={300} aria-label="pathology loss curve"></canvas>
    <div class="legend">
      <span><span class="swatch ref"></span> M13 canonical shape</span>
      <span><span class="swatch live"></span> live engine run</span>
    </div>
  </div>

  {#if activeDescriptor}
    <div class="diagnosis">
      <div class="diagLabel">diagnosis</div>
      <p class="diagBody">{activeDescriptor.diagnosis}</p>
    </div>
  {/if}

  {#if errorMsg}
    <p class="err">{errorMsg}</p>
  {/if}

  <p class="caption">
    Each preset re-trains the same {cfg.nLayer}-layer model from a fresh seed
    on the same engine you've been pressing start on, just with one
    deliberately bad hyperparameter. The faint dashed curve is the canonical
    shape you saw in M13's "Loss Curve Doctor." The solid red curve is what
    your engine actually does under that configuration. Total wall time:
    around {fmt(0.04 * 150, 0)}–{fmt(0.04 * 30, 0)} seconds per preset.
  </p>
</section>

<style>
  .zoo {
    display: flex; flex-direction: column; gap: 0.95rem;
    background: var(--demo-card);
    border: 1px solid var(--demo-card-border);
    border-radius: 18px;
    padding: clamp(0.95rem, 2vw, 1.45rem);
    color: var(--site-fg);
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--site-fg) 4%, transparent),
      0 24px 48px -28px color-mix(in srgb, var(--ink-red) 30%, transparent);
  }

  .head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 0.75rem;
  }
  .kicker { display: inline-flex; align-items: center; gap: 0.5rem; }
  .dot {
    width: 0.55rem; height: 0.55rem; border-radius: 50%;
    background: color-mix(in srgb, var(--site-fg) 30%, transparent);
  }
  .dot-booting { background: var(--ink-sun); animation: pulse 1.1s ease-in-out infinite; }
  .dot-running { background: var(--ink-red); animation: pulse 1.1s ease-in-out infinite; }
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

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.65rem;
  }
  .card {
    display: flex; flex-direction: column; gap: 0.3rem;
    text-align: left;
    padding: 0.7rem 0.85rem;
    background: color-mix(in srgb, var(--site-fg) 3%, transparent);
    border: 1px solid color-mix(in srgb, var(--site-fg) 11%, transparent);
    border-radius: 10px;
    cursor: pointer;
    color: var(--site-fg);
    font-family: var(--font-body);
    transition: background 140ms ease, border-color 140ms ease, transform 80ms ease;
  }
  .card:hover:not(:disabled) {
    background: color-mix(in srgb, var(--site-fg) 6%, transparent);
    border-color: color-mix(in srgb, var(--site-fg) 25%, transparent);
  }
  .card:active:not(:disabled) { transform: translateY(1px); }
  .card:disabled { opacity: 0.55; cursor: not-allowed; }
  .card.active {
    border-color: var(--ink-red);
    background: color-mix(in srgb, var(--ink-red) 7%, transparent);
  }
  .cardTitle {
    font-weight: 700; font-size: 0.95rem;
    color: var(--site-fg);
  }
  .cardTag {
    font-family: var(--font-mono); font-size: 0.72rem;
    color: var(--site-fg-muted);
    letter-spacing: 0.04em;
  }
  .cardTag em {
    font-style: normal; font-weight: 700;
    color: var(--ink-red);
    margin-left: 0.2rem;
  }
  .cardSummary {
    font-size: 0.82rem;
    color: var(--site-fg-muted);
    line-height: 1.45;
  }

  .plotWrap { display: flex; flex-direction: column; gap: 0.5rem; }
  canvas {
    display: block;
    width: 100%; height: auto;
    aspect-ratio: 720 / 300;
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
  .swatch.ref {
    background: repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--site-fg) 38%, transparent) 0 3px,
      transparent 3px 7px
    );
    height: 2px;
  }
  .swatch.live { background: var(--ink-red); }

  .diagnosis {
    padding: 0.7rem 0.85rem;
    border-radius: 12px;
    background: color-mix(in srgb, var(--ink-red) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink-red) 22%, transparent);
  }
  .diagLabel {
    font-family: var(--font-mono); font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--ink-red); font-weight: 700;
    margin-bottom: 0.3rem;
  }
  .diagBody {
    margin: 0; font-size: 0.92rem; line-height: 1.5;
    color: var(--site-fg);
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
  /* Ambient status pulses pause under reduced motion (DESIGN.md: idle/ambient
     loops stop; one-shot user feedback stays). */
  @media (prefers-reduced-motion: reduce) {
    .dot-booting, .dot-running { animation: none; }
  }
</style>
