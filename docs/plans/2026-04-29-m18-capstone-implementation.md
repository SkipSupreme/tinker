# M18 — Capstone: Implementation Plan

Source of truth: `docs/research/m18-capstone.md` (Deep Research, 2026-04-29).
Module manifest: `apps/docs/src/content/modules/m18-capstone.md` (status: planned → shipped at end of slice 6).

## 0. The architectural calls (locked)

The research surfaced three decisions; user signed off on all three.

- **Architecture:** `n_layer=4, n_head=4, d_model=64, d_ff=256, T=64, vocab=65, tied unembedding, no biases, dropout=0.0` → **196{,}608 trainable parameters** by the M16 12d² rule (`12 · 64² · 4 = 196{,}608`). Plus `8{,}320` for the embedding (tied with unembed) and `4{,}096` for learned positional → **~209k total**, the honest "200k-parameter" number.
- **Runtime:** **Hand-written WGSL kernels.** ~26 kernels (13 forward, 13 backward+optimizer). The "you wrote it" pedagogical claim only lands if we actually wrote it. Reference: `0hq/WebGPT` (MIT) for kernel shapes.
- **Sequencing:** Engine-first. Three internal-only slices land working WGSL training before any lesson page goes public; three public slices ship the three lessons.

Trade accepted: the engine is bigger than any prior module's widget set. The pedagogy demands it.

## 1. Lessons (final, 5)

| # | Title | Slug | ~Min | Widgets |
|---|---|---|---|---|
| 18.1 | Press Start | `press-start` | 15 | runnerPanel (boot + first iter focus) |
| 18.2 | Watch it learn | `watch-it-learn` | 25 | runnerPanel (long-run focus), liveSampleStream, lossCurvePathologyZoo |
| 18.3 | Your checkpoint | `your-checkpoint` | 15 | seedScrubber, runnerPanel (save/load affordances) |
| 18.4 | Now make it talk | `now-make-it-talk` | 30 | samplerKnobsPlayground |
| 18.5 | The credits roll | `the-credits-roll` | 18 | creditsRollPanel, liveSampleStream (frozen variant) |

Total: ~103 minutes. Five lessons matches the M14/M15/M17 cadence. The original "Push the button" splits at natural seams: *boot* (18.1) / *long training run* (18.2) / *artifact* (18.3). Each of the three is independently runnable — each fires its own training run rather than relying on cross-lesson state — so a learner who lands on 18.2 cold still gets the experience.

Step distribution against research §6's 13-step Lesson 18.1: steps 1–4 + 6–7 → 18.1; steps 8–11 → 18.2; steps 5 + 12–13 → 18.3.

## 2. Engine — WGSL kernel inventory

13 forward kernels, 13 backward + optimizer kernels. All `f32`, all portable, no `shader-f16`. Workgroup size 64 default; 16×16 for tiled matmul.

**Forward (10 ops × 4 blocks + 3 boundary = 43 dispatches/step):**
1. `embeddingGather` — token-id + position-id → `[B·T, d]` row
2. `layerNorm` — one workgroup per row, 2-pass reduce, `[B·T, d]`
3. `qkvMatmul` — fused `[B·T, d] × [d, 3d]`, tile 16×16
4. `causalSdpa` — `softmax((QK^T + mask)/√d_k) V`, one workgroup per `(b, head, t)`
5. `attnOutMatmul` — `[B·T, d] × [d, d]`
6. `residualAdd` — elementwise
7. `ffnMatmul1` — `[B·T, d] × [d, 4d]`
8. `gelu` — elementwise on `[B·T, 4d]`
9. `ffnMatmul2` — `[B·T, 4d] × [4d, d]`
10. `unembedding` — `[B·T, d] × [d, V]` (tied with embed; same buffer)

**Backward (every forward op needs one) + optimizer:**
11. `softmaxCrossEntropyBwd` — `dlogits[i] = (p[i] − onehot(y)[i]) / (B·T)` (the line the credits roll calls out)
12. `matmulBwd` — generic, used 4× in attention + 2× in FFN + once in unembedding (`dA = dC·B^T`, `dB = A^T·dC`)
13. `causalSdpaBwd` — softmax-Jacobian-via-`p ⊙ (dy − Σ p·dy)` then through the V and (Q,K) paths
14. `lnBwd` — 3-term in-shader form (research §5)
15. `geluBwd` — elementwise (use the smooth `0.5(1+tanh(...))` derivative, not the GELU-approx hack)
16. `residualAddBwd` — copy of gradient (collapsed into the next op's read)
17. `embeddingBwd` — scatter-add into the tied `wte` buffer (atomicAdd for the float32-emulated case, or per-token serial accumulate)
18. `gradClipReduce` + `gradClipScale` — global `‖g‖₂` reduction + elementwise rescale
19. `adamwStep` — one elementwise pass: read `(θ, g, m, v, t, lr, β₁, β₂, ε, λ)`, write `(θ', m', v')`

Engine TS layer (~250 lines): `Tensor` = `{buffer: GPUBuffer, shape, dtype:'f32'}`; `Parameter` registry; `Optimizer` holds `(m, v, t)` per param; `forward(model, x) → logits`; `backward(logits, y) → param.grad`; `step(optimizer)` runs grad-clip then adamw.

## 3. Widgets (5 unique, all custom for M18)

| Widget | Lessons | Implementation note |
|---|---|---|
| `runnerPanel` | 18.1 | Centerpiece. Start / Pause / Reset; seed input; 4 hyperparameter sliders (lr, batch, dropout, n_layer). Live: dual loss curve (Canvas, circular buffer), iters/sec via `performance.now()`, current iter, current LR, "Compiling shaders…" boot state, "Paused (tab in background)" badge wired to `Page Visibility API`. |
| `liveSampleStream` | 18.1, 18.3 | Scrolling `<pre>` log: `iter 0: …`, every K iters appends a fresh sample from the current weights. Annotates the iter-band with the expected qualitative phase (research §10 trap 4). 18.3 variant runs against frozen weights, no append timer. |
| `seedScrubber` | 18.1 | Twin runs side-by-side. Type a seed string → both panes start identical. Edit one character → curves diverge after iter ~3. The "byte-identical" claim made tangible. |
| `lossCurvePathologyZoo` | 18.1 | Six preset buttons that re-train under known pathologies (lr=10, no warmup, dropout=0.9, no zero_grad, overfit on 1k chars, NaN-injection at iter 5). Lays your live curve next to the labelled gallery from M13. |
| `samplerKnobsPlayground` | 18.2 | Frozen checkpoint loaded once. Sliders (τ, top-k, top-p), prompt textbox, regenerate button. Live next-token bar histogram for the cursor position with bars greying out under each truncation pass. |

`creditsRollPanel` is a one-shot Astro page rather than a widget — see slice 6.

The M16 `ParamBudgetPie` and M17 `LossCurveDoctor` are NOT reused: M18 wants live curves on a real running engine, not pre-recorded traces. Different widget contract.

## 4. Build order — eight slices

Each slice = one or more commits, build + deploy + smoke-verify, push. Engine slices (2–4) ship `/dev/m18-…/` routes — not linked from nav, but real, deployed, and navigable for verification.

- **Slice 1 (done)** — Plan committed. Research already saved.
- **Slice 2 — Engine forward + reference oracle.** All 10 forward kernels + Engine TS layer + per-kernel CPU twin (5–10 lines of TS each, used for unit-equivalence assertions to ~1e-5). Train the same `n=4, d=64, T=64, vocab=65` config in nanoGPT (CPU is fine — small model) for 2{,}000 iters and commit the resulting loss-trajectory CSV as `docs/research/m18-nanogpt-reference.csv`. This is the oracle Slice 3 must match. Ship `/dev/m18-forward/` running one forward pass on a hand-crafted batch with logit shape + softmax-sum readouts.
- **Slice 3 — Engine backward + training loop.** All 13 backward+optimizer kernels. Smoke test: train the model headless (Node + `@webgpu/dawn` or Bun's WebGPU) for 2{,}000 iters and assert the loss trajectory matches the Slice 2 nanoGPT reference within ±0.1 nats at every 100-iter checkpoint. This is the gate. If it fails despite reference-run + per-kernel CPU twin, fall back to wrapping `webgpu-torch` (research §9 source 10) for the engine and continue with Slice 4+ unchanged — pedagogical claim weakens from "you wrote it" to "you can read it," lessons still ship. Ship `/dev/m18-train/` running 200 iters live with a curve.
- **Slice 4 — Determinism + save/load.** sfc32 + cyrb128 threaded through (data-loader, dropout-mask, weight-init, sampler). `.bin` format with 512-byte JSON header + Float32Array tail. Twin-run test: two CLI runs with the same seed string produce byte-identical `.bin` files. Ship `/dev/m18-twin-seed/` running the twin-runs determinism check live in browser.
- **Slice 5 — Lesson 18.1 (Press Start).** Build `runnerPanel` (boot + first-iter focus). Wire to engine. Ship `/lessons/press-start/`. First publicly visible M18 lesson.
- **Slice 6 — Lesson 18.2 (Watch it learn).** Build `liveSampleStream` + `lossCurvePathologyZoo`. Extend `runnerPanel` with the long-run affordances (cosine LR readout, tab-throttle badge wired to Page Visibility API). Ship `/lessons/watch-it-learn/`.
- **Slice 7 — Lesson 18.3 (Your checkpoint).** Build `seedScrubber`. Extend `runnerPanel` with Save Weights + Load Weights buttons + optional share-URL affordance. Ship `/lessons/your-checkpoint/`.
- **Slice 8 — Lessons 18.4 + 18.5 + module shipped.** Train the reference checkpoint once on the slowest dev machine, ship the `.bin` as a static asset (~840 KB). Build `samplerKnobsPlayground`, ship `/lessons/now-make-it-talk/`. Build `creditsRollPanel` reading `apps/docs/src/lib/m18/engine/*` directly so the credits roll is the actual code. Ship `/lessons/the-credits-roll/`. Flip module manifest `status: planned → shipped`. Update m18 manifest's summary to reflect the locked architecture (n_layer=4, d_model=64, ~200k true).

Per memory rule: every slice deploys to learntinker.com and verifies before commit.

### 4.5 Convergence-gate hedges (Slice 3)

Three layered de-risks so Slice 3's gate is a high-information checkpoint, not a high-risk cliff:

1. **Reference oracle (Slice 2 task).** nanoGPT loss trajectory committed before any backward kernel is written; Slice 3's success criterion is curve-matching, not just "loss goes down."
2. **Per-kernel CPU twin (Slice 2 task).** Every WGSL forward and backward kernel has a 5–10 line CPU implementation. Smoke tests assert WGSL output matches CPU output to ~1e-5 on random inputs. A failing kernel surfaces immediately, not as a downstream training mystery.
3. **Explicit fallback (Slice 3 contingency).** If reference-matching fails, switch the engine to `webgpu-torch` and continue. This keeps the lessons shippable and avoids the panic-pivot that would otherwise blow up the schedule.

## 5. Pedagogical decisions (locked)

- **Endgame callback:** research candidate A — *"This is the entire course. You started in M5… There is no module after this one. There is the model, the artifact, and the next thing you decide to learn."* In all five lesson MDX files; in the module manifest.
- **5 lessons, no further splits.** The 18.1 → 18.1/2/3 split is final; the boot/long-run/artifact seam is real and each piece runs standalone.
- **Reference checkpoint shipped with the page.** Lesson 18.4 must work even if the learner skipped 18.1–18.3 — the playground loads the canonical `.bin` if no local checkpoint exists. The "use your own checkpoint" affordance is additive.
- **No fp16 path.** `f32` only. Mention `shader-f16` in research-trap prose; do not implement.
- **No mobile path in v1.** WebGPU on iOS Safari is shipping but spotty (April 2026); detect, message gracefully, link to a desktop browser. Never silently fall back to CPU.
- **No service-worker corpus caching in v1.** The 1 MB tiny-shakespeare loads each visit; caching is an optimization for after the lessons ship.

## 6. Voice & cut rules (applied)

- "Capstone celebration" is a *register*, not a slop license. No emojis in lesson prose. The mascot stays in the chrome (per `DESIGN.md`).
- Lesson 18.1 step 1 frames the model honestly as 200k params vs ChatGPT's 1.7T — research trap 6, applied verbatim.
- The runtime decision is one sentence in step 1 of 18.1 ("we wrote ~400 lines of WGSL ourselves"), not a lesson step.
- Live samples annotated with their expected band ("iter 0 — uniform across 65 chars (this is correct)") so the gibberish-before-iter-200 phase is framed, not feared.
- The credits roll lists every module by number and one-word concept; resists the urge to editorialize.

## 7. What this plan does NOT do

- Does not ship a multi-checkpoint system (only one save slot, plus the reference checkpoint).
- Does not implement KV-caching for the in-tab sampler — inference is fast enough at this scale that a fresh forward pass per token is fine, and re-implementing KV-cache correctness in WGSL costs more than the inference time it saves at d=64.
- Does not include mech-interp tooling. The "where to next?" callout in 18.3 *links to* a future track but doesn't seed any of it.
- Does not stub MDX files. Lesson files land when their engine slice and widgets land.

## 8. Done definition

All five lessons live on `learntinker.com`, all five widgets implemented as Svelte components, the engine compiles 26 WGSL kernels and trains the reference model to val NLL < 1.7 in under 5 minutes on an M-series Mac (matching the Slice 2 nanoGPT reference within ±0.1 nats throughout the run), twin-seed determinism passes byte-identically, the m18 manifest is `status: shipped` with the corrected `n_layer=4, d_model=64` summary, CI green, the three `/dev/m18-…/` routes still serve and pass their smoke tests, the course's final lesson endpoint matches the endgame callback to the character.
