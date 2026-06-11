# TODOS

## QA deep-dive backlog (2026-06-11 /qa run)

Full machine-readable findings: `.gstack/qa-reports/all-finder-findings.json` (102 raw findings from the code-review fan-out) and `.gstack/qa-reports/qa-report-learntinker-com-2026-06-11.md`. The fan-out's adversarial-verification stage was killed by the session usage limit, so everything below except the P0 is **unverified finder output** — one critical claim (BpeMergeStepper "no separator deadlock") was already refuted live (invisible `\x01` separator; widget is healthy). Verify each item before fixing.

### P0 — svelte-mafs drag mapping ignores CSS scale and letterboxing (VERIFIED mechanism)

**What:** `packages/svelte-mafs/src/gestures/drag.ts` `toUser()` measures pointer offsets in rendered CSS pixels (`getBoundingClientRect`), but `coordinate-context.ts` `pxToUser()` divides by the **attribute** `widthPx`/`heightPx`. Any widget whose CSS rescales the Mafs `<svg>` (e.g. `width: 100%`, mobile max-width) gets drag motion scaled wrong; `preserveAspectRatio` letterboxing adds an offset error.

**Evidence:** Mechanism confirmed by reading both files; five independent finder reports describe the symptom (GradientCompass, ForwardPassTrace, LossLandscapeNavigator, LogScope, MleClimber-adjacent). Engine unit tests pass because jsdom reports zero-sized rects — they can't catch this.

**Fix direction:** Map client coords through `svg.getScreenCTM().inverse()` (or compute the viewBox transform incl. letterbox) instead of raw rect offsets. Then re-test every MovablePoint widget at desktop + 375px widths.

### P1 — unverified critical finder claims (verify live first)

- `BnTrainEvalToggle.svelte:59` — batch-size-1 "collapse to zero" demo allegedly computes x̂ → ±800 instead of 0; warning never fires.
- `ExpressionRewriter.svelte:386` — all three presets allegedly dead-end while declaring "Fully simplified"; preset 3 unplayable from load.
- `DerivativeTracer.svelte:101` — swept f′(x) trace allegedly almost never renders (NaN-window masking defeats the adaptive sampler).

### P2 — unverified high/medium finder claims (22 high, 43 medium)

See `all-finder-findings.json`. Recurring themes worth batch-fixing after verification: (1) MovablePoints draggable off-canvas with no constrain/reset (BasisTranslator, ActivationZoo, CriticalPointHunt, ForwardPassTrace); (2) `role="slider"` + `tabindex=0` with no keyboard handler (BayesGrid, GaussianForge, CrossEntropyDuel, PerplexityDial); (3) react-mafs prop names passed to svelte-mafs components and silently dropped (`strokeOpacity`, `strokeStyle` — AngleAdditionProof, PriorPenaltyEquivalence, PolarSketcher); (4) M18 canvas charts hardcode light-mode colors (dark-mode token violation).

### Observations (no action required)

- `/api/auth/get-session` returns 429 under bot-speed navigation; client degrades gracefully to anonymous (auth-state.ts handles non-OK). Only symptom: console noise + signed-in UI briefly reading signed-out under absurdly fast paging.
- M18/CreditsRoll WebGPU widgets fail loud and clean ("No WebGPU adapter.", error status + re-run) in browsers without WebGPU — by design.

## Tinker Premium Polish Plan — Phase-1-conditional follow-ups

### Bounding-box label-collision detection in Playwright

**What:** Add bounding-box label-collision detection to the visual regression suite as a stronger enforcement of the "no covered numbers" Quality Bar invariant.

**Why:** Visual regression catches "pixels changed" but may miss subtle 3-px label overlaps that fall under the snapshot fuzz threshold. If Phase 1 baselines surface this gap, this is the fix.

**Pros:**
- Stronger guarantee that `no covered numbers` actually holds across all 86+ widgets.
- Independent of pixel-diff sensitivity — works at the DOM level.

**Cons:**
- Real implementation cost (bounding-box logic for SVG + DOM, exception handling for legitimate adjacency).
- May be unnecessary if Phase 1's plain visual regression turns out to catch enough.

**Context:** Surfaced during /plan-eng-review on 2026-04-30 (TODO-1). The Quality Bar invariant: numbers never overlap data marks, gridlines, or other labels. Phase 1 enforces via Playwright snapshots; this TODO is the belt-and-suspenders version that gets evaluated AFTER Phase 1 produces real evidence.

**Depends on / blocked by:** Phase 1 baselines complete. Cannot be evaluated until we see what plain visual regression actually catches in the wild.

**Decision criterion:** Re-open after Phase 1 ships. If audit found ≥3 subtle overlap bugs that visual regression missed, build this. If 0-1, close with note "regression suite caught everything."

### ✅ DONE — Stylelint Phase 3 hex cleanup

All `color-no-hex` violations resolved (2026-04-30):
- 22 components: `#fdfdfc` → `var(--on-color-fg)` (bulk sweep)
- `index.astro`: `#fff` → `var(--on-color-fg)`, `#e8e8e3` → `var(--site-border)`
- `me.astro`: `#b91c1c` → `var(--site-error)`
- `ShiftByOneBatch.svelte`: `#1a1402` → `var(--cta-fg)`
- `TestFixture.astro`: `stylelint-disable color-no-hex` with rationale (Playwright fixtures need theme-stable colors)

`pnpm lint:css` now exits 0. New token added to global.css: `--on-color-fg: #fdfdfc;` (theme-stable foreground for white text on saturated backgrounds).
