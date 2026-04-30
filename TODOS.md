# TODOS

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
