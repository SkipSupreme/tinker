# Alive Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Ship the coordinated alive-layer pass across five surfaces (mid-lesson microcelebrations, lesson/module complete sequences, mascot backlog, hero ambient life, XP/streak polish) without breaking existing brand decisions.

**Architecture:** Keep custom `lib/confetti.ts` (math symbols) and `lib/sound.ts` (sine palette) as brand-load-bearing primitives. Layer in Svelte 5 `Spring`/`Tween`/`prefersReducedMotion` runes from `svelte/motion`, plus six hand-rolled `@keyframes` in `global.css` for the ambient loops. Two new shared modules (`lib/celebrate.ts` orchestrator, `lib/easterEggs.svelte.ts` global state) and four new/promoted components handle the surface work. Full design at `docs/plans/2026-04-27-alive-layer-design.md`.

**Tech Stack:** Astro 6, Svelte 5.55+, TypeScript, hand-rolled CSS (no Tailwind in this project), Cloudflare Workers (deploy), pnpm workspace.

**Worktree:** `/Users/joshhd/Documents/tinker/.worktrees/feature-alive-layer` on branch `feature/alive-layer`. All work happens here.

**Verification gates (no test runner in this project):**
- After each task: `pnpm -F docs astro check` must pass with no new errors.
- Before deploy: `pnpm -F docs build` must succeed.
- After deploy: manual smoke on `learntinker.com` — never `astro dev`.

**Commit message style:** Match recent log (`docs(plan):`, `feat:`, `chore:`). Co-authored trailer per project convention.

---

## Task 0: Baseline check

**Goal:** Confirm worktree starts clean before changes.

**Files:** none.

**Step 1: Run typecheck.**

```bash
cd /Users/joshhd/Documents/tinker/.worktrees/feature-alive-layer
pnpm -F docs astro check
```

Expected: type-check passes (warnings allowed, errors not). If errors exist on `main` already, document them in this plan as pre-existing and only flag *new* errors as blockers in subsequent tasks.

**Step 2: Run build.**

```bash
pnpm -F docs build
```

Expected: build succeeds. Bail and investigate if it doesn't — implementing on a broken baseline wastes the whole plan.

**Step 3: No commit.** Baseline gate only.

---

## Phase 1 — Foundation

### ~~Task 1: Add `tw-animate-css` dependency~~ — **REMOVED**

**Why this was dropped:** Code-quality review caught that `tw-animate-css` is a Tailwind v4 plugin and this codebase has no Tailwind integration (no `tailwindcss` package, no `@astrojs/tailwind`, no `@tailwind`/`@apply` directives). The dependency would have been inert. The keyframes the alive-layer needs (`sparkle-flicker`, `tinker-z-rise`, `flame-flicker`, `sweep-green`, `halo-pulse`, `wrong-shake`) are all hand-rolled in Task 2 already, consistent with the existing `global.css` + CSS-variable token system in `DESIGN.md`. No replacement dependency needed.

**Net effect:** Skip this task. The plan now starts at Task 2.

---

### Task 2: Add six new keyframes to global.css

**Files:**
- Modify: `apps/docs/src/styles/global.css` (append section)

**Step 1: Append the keyframes block at end of `global.css`.**

```css
/* ─────────────────────────────────────────────────────────
   Alive layer — keyframes
   Each pairs with an animation declaration consumed by celebrate.ts or
   a Svelte component. There is no global reduced-motion gate here:
   ambient consumers (sparkle-flicker, drift-y/x, tinker-z-rise) gate
   themselves at use site via a scoped @media rule or the
   prefersReducedMotion rune. Deliberate user-response keyframes
   (halo-pulse, sweep-green, wrong-shake, flame-flicker) intentionally
   keep firing under reduced-motion per DESIGN.md §Mascot Interactivity.
   ───────────────────────────────────────────────────────── */

@keyframes sparkle-flicker {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}

@keyframes tinker-z-rise {
  0%   { transform: translateY(0)    scale(1);   opacity: 0; }
  20%  {                                          opacity: 1; }
  100% { transform: translateY(-28px) scale(0.9); opacity: 0; }
}

@keyframes flame-flicker {
  0%, 100% { filter: brightness(1)   ; transform: scale(1); }
  30%      { filter: brightness(1.35); transform: scale(1.08); }
  60%      { filter: brightness(1.1) ; transform: scale(1.02); }
}

@keyframes sweep-green {
  0%   { background-position: -100% 0; }
  100% { background-position:  200% 0; }
}

@keyframes halo-pulse {
  0%   { transform: scale(0.9); opacity: 0; }
  40%  { transform: scale(1.0); opacity: 0.85; }
  100% { transform: scale(1.4); opacity: 0; }
}

@keyframes wrong-shake {
  0%, 100%       { transform: translateX(0); }
  16%, 50%, 83%  { transform: translateX(-6px); }
  33%, 66%       { transform: translateX(6px); }
}
```

**Step 2: Verify CSS still parses.**

```bash
pnpm -F docs build
```

Expected: build succeeds. CSS errors fail the Astro build.

**Step 3: Commit.**

```bash
git add apps/docs/src/styles/global.css
git commit -m "$(cat <<'EOF'
feat(motion): add alive-layer keyframes to global.css

Six keyframes powering sparkle pulse, sleepy "z" rise, streak flame
flicker, lesson-complete green sweep, correct-answer halo pulse,
and wrong-answer localized shake. Reduced-motion handling is per
consumer at use site, not gated here — see leading comment block.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Create `lib/celebrate.ts` orchestrator with `wait` + `announce` helpers

**Files:**
- Create: `apps/docs/src/lib/celebrate.ts`

**Step 1: Create the file with shared helpers and orchestrator stubs.**

```ts
/**
 * lib/celebrate.ts — orchestrator for earned-state celebrations.
 *
 * One async function per moment. Tuning the feel of any celebration
 * is a one-line edit here, not a sweep across StepCheck.astro,
 * Lesson.astro, and inline event listeners.
 *
 * Spec: docs/plans/2026-04-27-alive-layer-design.md §3, §4.
 */

import { Spring, Tween, prefersReducedMotion } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';
import { play } from './sound';
import { burst } from './confetti';
import { award, vibrate, type XpEvent } from './xp';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function announce(message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('tinker:announce', { detail: { message } }),
  );
}

// Module-scoped Spring/Tween instances — one per surface so multiple
// concurrent celebrations don't fight each other.
export const progressSpring = new Spring(0, { stiffness: 0.12, damping: 0.4 });
export const scoreTween = new Tween(0, { duration: 900, easing: cubicOut });

export async function celebrateCorrect(checkBtn: HTMLElement) {
  play('ding');
  burst(checkBtn, { count: 6 });
  vibrate(20);
  award('correctFirstTry' satisfies XpEvent);
  // Halo: add class, wait for keyframe, remove. CSS does the work.
  checkBtn.classList.add('halo-pulse');
  await wait(320);
  checkBtn.classList.remove('halo-pulse');
  announce('Correct.');
}

export async function celebrateWrong(input: HTMLElement) {
  input.classList.add('wrong-shake');
  await wait(240);
  input.classList.remove('wrong-shake');
  announce('Try again. Read the hint.');
}

export async function celebrateLesson(card: HTMLElement) {
  if (prefersReducedMotion.current) {
    progressSpring.set(1, { instant: true });
  } else {
    progressSpring.set(1);
  }
  await wait(120);
  burst(card, { count: 14 });
  scoreTween.target = scoreTween.current + 20;
  window.dispatchEvent(
    new CustomEvent('tinker:celebrate', { detail: { level: 'lesson' } }),
  );
  play('chime');
  vibrate(50);
  card.classList.add('sweep-green');
  await wait(640);
  card.classList.remove('sweep-green');
  announce('Lesson complete. Plus 20 XP.');
}

export async function celebrateModule(
  card: HTMLElement,
  nodeId: string,
  nextModuleName?: string,
) {
  window.dispatchEvent(
    new CustomEvent('tinker:celebrate', { detail: { level: 'module' } }),
  );
  await wait(180);
  burst(card, { count: 28, spread: 1.6 });
  scoreTween.target = scoreTween.current + 100;
  play('anthem');
  vibrate([50, 100, 50]);
  // glowMasteredNode is a no-op until SkillTreeMap exposes the hook.
  // Defer wiring to a separate task.
  void nodeId;
  const tail = nextModuleName ? ` ${nextModuleName} unlocked.` : '';
  announce(`Module complete. Plus 100 XP.${tail}`);
}
```

**Step 2: Verify imports resolve.**

```bash
pnpm -F docs astro check
```

Expected: no new type errors. `award`, `vibrate`, `XpEvent` may need to match the actual exports of `lib/xp.ts` — if `astro check` reports a name mismatch, read `apps/docs/src/lib/xp.ts` and adjust the imports to match what's actually exported. The design doc lists awards as `awardXp('correctFirstTry')`; the actual export name may be `award`. Either is fine — match what's there.

**Step 3: Commit.**

```bash
git add apps/docs/src/lib/celebrate.ts
git commit -m "$(cat <<'EOF'
feat(celebrate): add lib/celebrate.ts orchestrator

One async function per earned-state moment (correct, wrong,
lesson, module). Wraps existing play/burst/vibrate/award into
single-source-of-truth choreography. Reduced-motion fork inline.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Create `SrAnnouncer.svelte` (aria-live mirror)

**Files:**
- Create: `apps/docs/src/components/lesson/SrAnnouncer.svelte`

**Step 1: Create the component.**

```svelte
<script lang="ts">
  /**
   * SrAnnouncer — single aria-live="polite" mirror for the alive layer.
   * Listens for `tinker:announce` window events. Dropped into Lesson.astro
   * once; every celebration calls announce(msg) from lib/celebrate.ts.
   */
  let message = $state('');

  $effect(() => {
    const onAnnounce = (e: CustomEvent<{ message: string }>) => {
      // Re-set even if same string — screen readers announce on change,
      // so toggle empty first.
      message = '';
      queueMicrotask(() => {
        message = e.detail.message;
      });
    };
    window.addEventListener('tinker:announce', onAnnounce as EventListener);
    return () =>
      window.removeEventListener('tinker:announce', onAnnounce as EventListener);
  });
</script>

<div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
  {message}
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

**Step 2: Typecheck.**

```bash
pnpm -F docs astro check
```

Expected: passes.

**Step 3: Commit.**

```bash
git add apps/docs/src/components/lesson/SrAnnouncer.svelte
git commit -m "$(cat <<'EOF'
feat(a11y): add SrAnnouncer aria-live mirror

Single screen-reader announce surface; every alive-layer celebration
fires `tinker:announce` and this component reads the message.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — XP + Streak polish

### Task 5: Create `XpCounter.svelte`

**Files:**
- Create: `apps/docs/src/components/nav/XpCounter.svelte`

**Step 1: Create the component (full file in design doc §7).**

Copy the implementation from `docs/plans/2026-04-27-alive-layer-design.md` §7. Key behaviors:
- `Tween(initial, { duration: 900, easing: cubicOut })` for the number
- `Math.round(display.current)` rendered in template
- `tinker:xp` listener pushes `+N` floaters
- `transition:fly` + `transition:fade` (combined) for floater outro
- Reduced-motion: `display.set(value, { instant: true })`, floater becomes pure fade
- Aria-live `<span class="sr-only">` for resting value only

**Step 2: Typecheck.**

```bash
pnpm -F docs astro check
```

Expected: passes. If `Tween` or `prefersReducedMotion` aren't in the installed `svelte/motion`, check `pnpm why svelte` — must be ≥5.8. The repo has `^5.55.5` per package.json which is fine.

**Step 3: Commit.**

```bash
git add apps/docs/src/components/nav/XpCounter.svelte
git commit -m "$(cat <<'EOF'
feat(nav): promote XpCounter to standalone component with Tween

Tween-driven number tick (Math.round(display.current) ~900ms) replaces
manual scale pulse. +N floaters via fly+fade. Reduced-motion: instant.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Create `StreakFlame.svelte`

**Files:**
- Create: `apps/docs/src/components/nav/StreakFlame.svelte`

**Step 1: Create the component.**

```svelte
<script lang="ts">
  let { streak = 0 }: { streak: number } = $props();
  let flicker = $state(false);

  $effect(() => {
    const onBump = (e: CustomEvent<{ streak: number }>) => {
      streak = e.detail.streak;
      flicker = true;
      setTimeout(() => (flicker = false), 800);
      window.dispatchEvent(
        new CustomEvent('tinker:announce', {
          detail: { message: `Streak now ${e.detail.streak} days.` },
        }),
      );
    };
    window.addEventListener('tinker:streak', onBump as EventListener);
    return () =>
      window.removeEventListener('tinker:streak', onBump as EventListener);
  });
</script>

{#if streak > 0}
  <span class="streak" class:flicker>
    <span class="num">{streak}</span>
    <span class="flame" aria-hidden="true">🔥</span>
    <span class="sr-only">{streak} day streak</span>
  </span>
{/if}

<style>
  .streak {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--ink-sun);
  }
  .flame {
    display: inline-block;
    transform-origin: center bottom;
  }
  .flicker .flame {
    animation: flame-flicker 800ms ease-out 1;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

**Step 2: Typecheck.**

```bash
pnpm -F docs astro check
```

Expected: passes.

**Step 3: Commit.**

```bash
git add apps/docs/src/components/nav/StreakFlame.svelte
git commit -m "$(cat <<'EOF'
feat(nav): promote StreakFlame with one-shot flicker on bump

Gated on streak > 0 per DESIGN.md §Streak (display gated until
30-day opt-in flow ships). Listens for tinker:streak, fires 800ms
flame-flicker keyframe, announces via aria-live.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Update `Nav.astro` to mount new components

**Files:**
- Modify: `apps/docs/src/components/Nav.astro`

**Step 1: Read current Nav.astro to find the inline XP + streak markup and the listener `<script>` tag.**

```bash
cat apps/docs/src/components/Nav.astro
```

**Step 2: Replace the inline markup with imports + component mounts.**

At top of frontmatter, add:
```astro
import XpCounter from './nav/XpCounter.svelte';
import StreakFlame from './nav/StreakFlame.svelte';
```

In template, replace the inline XP `<span>` and streak chip with:
```astro
<XpCounter client:load initial={Astro.locals.session?.xp ?? 0} />
<StreakFlame client:load streak={Astro.locals.session?.streak ?? 0} />
```

Delete the inline `<script>` tag that listens for `tinker:xp` / `tinker:streak`. The components own that now.

If `Astro.locals.session` doesn't exist yet on this project, fall back to `0`/`0` props — server-side hydration of session XP can land in a follow-up.

**Step 3: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

Expected: both pass.

**Step 4: Commit.**

```bash
git add apps/docs/src/components/Nav.astro
git commit -m "$(cat <<'EOF'
refactor(nav): mount XpCounter + StreakFlame, strip inline

Promotes XP/streak from Nav-inline to standalone components per
DESIGN.md §Components ("promote when it grows beyond what fits in Nav").
client:load matches §Hydration table for persistent chrome.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Mid-lesson microcelebrations

### Task 8: Wire `StepCheck.astro` to `celebrateCorrect` / `celebrateWrong`

**Files:**
- Modify: `apps/docs/src/components/lesson/StepCheck.astro`

**Step 1: Read current `StepCheck.astro` to find the inline correct-answer handler that calls `play('ding')` / `burst()` / XP award.**

```bash
cat apps/docs/src/components/lesson/StepCheck.astro
```

**Step 2: Replace inline calls with `celebrateCorrect(checkBtn)` and add a wrong-answer branch calling `celebrateWrong(inputEl)`.**

Inside the existing `<script>` that handles submit:
- On correct: replace the play+burst+award sequence with `await celebrateCorrect(checkBtn);`
- On wrong: add `await celebrateWrong(inputEl);`

Import at top of script:
```ts
import { celebrateCorrect, celebrateWrong } from '../../lib/celebrate';
```

**Step 3: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 4: Commit.**

```bash
git add apps/docs/src/components/lesson/StepCheck.astro
git commit -m "$(cat <<'EOF'
feat(lesson): route StepCheck through lib/celebrate orchestrator

Correct → celebrateCorrect (sound, burst, XP, halo, announce).
Wrong → celebrateWrong (localized shake, --ink-coral border, announce).
No haptic/sound on wrong by design. DESIGN.md §A11y compliance.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Add 30s stuck timer to `StepCheck.astro` dispatching `tinker:stuck`

**Files:**
- Modify: `apps/docs/src/components/lesson/StepCheck.astro`

**Step 1: Add timer logic to the inline script.**

```ts
const STUCK_MS = 30_000;
let stuckTimer: number | null = null;

function startStuckTimer(hint: string | undefined) {
  if (!hint) return; // soft-fail per design open Q2
  if (stuckTimer) clearTimeout(stuckTimer);
  stuckTimer = window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent('tinker:stuck', { detail: { hint } }),
    );
  }, STUCK_MS);
}

function clearStuckTimer() {
  if (stuckTimer) {
    clearTimeout(stuckTimer);
    stuckTimer = null;
  }
}
```

Wire `startStuckTimer(hint)` when StepCheck mounts (read `data-hint` attribute from the host element). Wire `clearStuckTimer()` on submit (correct or wrong) and when the component disconnects.

The component already accepts `hint` as a prop per existing schema — pass it through to the `data-hint` attribute on the root element if not already there.

**Step 2: Verify.**

```bash
pnpm -F docs astro check
```

**Step 3: Commit.**

```bash
git add apps/docs/src/components/lesson/StepCheck.astro
git commit -m "$(cat <<'EOF'
feat(lesson): emit tinker:stuck after 30s without submit

Cleared on submit or unmount. Soft-fails when hint prop empty
(open Q2 in design doc). Consumer is StuckHint.svelte (Task 19).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Lesson + module endgame

### Task 10: Wire `Lesson.astro` endgame to `celebrateLesson` / `celebrateModule`

**Files:**
- Modify: `apps/docs/src/layouts/Lesson.astro`

**Step 1: Read current Lesson.astro to locate the inline endgame handler.**

```bash
cat apps/docs/src/layouts/Lesson.astro
```

**Step 2: Replace inline play+burst+TinkerHop+XP calls with single calls to `celebrateLesson` / `celebrateModule`.**

In the `<script>` tag:
```ts
import { celebrateLesson, celebrateModule } from '../lib/celebrate';

// On lesson complete:
await celebrateLesson(lessonCardEl);

// On module complete (only fires on the last lesson of a module):
await celebrateModule(lessonCardEl, moduleNodeId, nextModuleName);
```

`lessonCardEl` is the lesson-complete card root element. `moduleNodeId` and `nextModuleName` come from frontmatter / content collection metadata. If `nextModuleName` isn't available, pass `undefined` — `celebrateModule` already drops the trailing sentence.

**Step 3: Mount `<SrAnnouncer client:idle />` in the layout template** (one location, anywhere inside the body).

**Step 4: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 5: Commit.**

```bash
git add apps/docs/src/layouts/Lesson.astro
git commit -m "$(cat <<'EOF'
feat(lesson): route endgame through celebrate orchestrator + mount SrAnnouncer

celebrateLesson handles spring fill, burst, XP tween, TinkerHop,
chime, vibrate, sweep-green, announce — in that order, with one
reduced-motion branch. celebrateModule similar but bigger.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5 — Hero ambient life

### Task 11: Create `FloatingMath.svelte`

**Files:**
- Create: `apps/docs/src/components/brand/FloatingMath.svelte`

**Step 1: Create the component.**

```svelte
<script lang="ts">
  /**
   * FloatingMath — five drifting math symbols in the hero band.
   * DESIGN.md §Decoration: max 5 per hero, teal/orange/pink only,
   * Fraunces italic, opacity 0.18–0.35, freeze under reduced-motion.
   */
  const symbols = [
    { ch: 'π', color: 'var(--ink-teal)',   top: '12%', left: '8%',  delay: '0s',   d: '6.2s' },
    { ch: '∫', color: 'var(--ink-orange)', top: '24%', left: '78%', delay: '1.4s', d: '7.0s' },
    { ch: '∂', color: 'var(--ink-pink)',   top: '62%', left: '18%', delay: '2.8s', d: '5.4s' },
    { ch: 'Δ', color: 'var(--ink-teal)',   top: '78%', left: '70%', delay: '0.6s', d: '6.8s' },
    { ch: '∑', color: 'var(--ink-orange)', top: '40%', left: '46%', delay: '3.2s', d: '5.8s' },
  ];
</script>

<div class="floating-math" aria-hidden="true">
  {#each symbols as s}
    <span
      class="sym"
      style="
        top: {s.top};
        left: {s.left};
        color: {s.color};
        animation-delay: {s.delay};
        animation-duration: {s.d};
      "
    >{s.ch}</span>
  {/each}
</div>

<style>
  .floating-math {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .sym {
    position: absolute;
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic;
    font-weight: 600;
    font-size: clamp(2rem, 4vw, 3.25rem);
    opacity: 0.26;
    animation: drift-y ease-in-out infinite;
  }
  @keyframes drift-y {
    0%, 100% { transform: translateY(0)     translateX(0); }
    25%      { transform: translateY(-14px) translateX(4px); }
    50%      { transform: translateY(0)     translateX(-6px); }
    75%      { transform: translateY(12px)  translateX(2px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sym { animation-play-state: paused; }
  }
</style>
```

**Step 2: Typecheck.**

```bash
pnpm -F docs astro check
```

**Step 3: Commit.**

```bash
git add apps/docs/src/components/brand/FloatingMath.svelte
git commit -m "$(cat <<'EOF'
feat(hero): add FloatingMath drifting symbol field

Five Fraunces-italic math symbols (π ∫ ∂ Δ ∑) in teal/orange/pink
per DESIGN.md §Decoration. SSR-positioned via inset rules. Frozen
under prefers-reduced-motion.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Mount `FloatingMath` in `index.astro`

**Files:**
- Modify: `apps/docs/src/pages/index.astro`

**Step 1: Add import + mount inside the dark hero band.**

In frontmatter:
```astro
import FloatingMath from '../components/brand/FloatingMath.svelte';
```

In the hero band (first `<section>` with `--band-onyx` background), set `position: relative` on the section if not already, then add as the first child:
```astro
<FloatingMath client:visible />
```

The `position: relative` on the section is what lets `FloatingMath`'s `position: absolute; inset: 0;` size correctly.

**Step 2: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 3: Commit.**

```bash
git add apps/docs/src/pages/index.astro
git commit -m "$(cat <<'EOF'
feat(hero): mount FloatingMath in landing dark band

client:visible defers JS until hero scrolls into view (SSR markup
renders identically, so no FOUC).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6 — Tinker mascot upgrades

### Task 13: Migrate `Tinker.svelte` to `prefersReducedMotion` rune

**Files:**
- Modify: `apps/docs/src/components/brand/Tinker.svelte`

**Step 1: Read current Tinker.svelte.**

Already reviewed in design phase. The matchMedia logic is at lines 52-59 (a `let reducedMotion = $state(false)` + `onMount` block).

**Step 2: Replace with the rune.**

Remove these lines:
```ts
let reducedMotion = $state(false);

onMount(() => {
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    /* ignore */
  }
  // ... petCount block stays!
});
```

Add at top of script:
```ts
import { prefersReducedMotion } from 'svelte/motion';
const reducedMotion = $derived(prefersReducedMotion.current);
```

Keep the petCount onMount block (or extract to its own `$effect`).

**Step 3: Verify.**

```bash
pnpm -F docs astro check
```

**Step 4: Commit.**

```bash
git add apps/docs/src/components/brand/Tinker.svelte
git commit -m "$(cat <<'EOF'
refactor(tinker): use prefersReducedMotion rune

Single source of truth for reduced motion across the app.
Reactive — flips live on OS toggle without reload. Removes
the local matchMedia + onMount block.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Add sparkle SVG overlay to `Tinker.svelte`

**Files:**
- Modify: `apps/docs/src/components/brand/Tinker.svelte`

**Step 1: Add a sparkle overlay SVG as a sibling to `<img class="tinker-img">`.**

In template, after the `<img>`:
```svelte
<svg class="tinker-sparkles" viewBox="0 0 432 477" aria-hidden="true">
  <!-- Three 8-point stars at offsets matching the baked-in PNG sparkles.
       Coordinates are guesses based on /logo-mark.png; tune visually after
       deploy. -->
  <g class="sp sp-1" style="--c: var(--ink-orange);">
    <path d="M0,-10 L2,-2 L10,0 L2,2 L0,10 L-2,2 L-10,0 L-2,-2 Z" transform="translate(110, 96)" />
  </g>
  <g class="sp sp-2" style="--c: var(--ink-teal);">
    <path d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" transform="translate(196, 70)" />
  </g>
  <g class="sp sp-3" style="--c: var(--ink-red);">
    <path d="M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z" transform="translate(286, 100)" />
  </g>
</svg>
```

In style block:
```css
.tinker-sparkles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}
.tinker-sparkles .sp {
  fill: var(--c);
  opacity: 0;
  animation: sparkle-flicker 4.6s ease-in-out infinite;
}
.tinker-sparkles .sp-1 { animation-delay: 0s; }
.tinker-sparkles .sp-2 { animation-delay: 1.5s; }
.tinker-sparkles .sp-3 { animation-delay: 3s; }
.tinker--reduced .tinker-sparkles .sp { animation: none; opacity: 0.6; }
```

The exact `translate()` offsets need visual tuning against the deployed apple — punt to the deploy task.

**Step 2: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 3: Commit.**

```bash
git add apps/docs/src/components/brand/Tinker.svelte
git commit -m "$(cat <<'EOF'
feat(tinker): add sparkle pulse overlay

Three SVG 8-point stars overlay the baked-in PNG sparkles, pulsing
opacity 0→1→0 over 4.6s with staggered delays. Coordinates tuned
visually post-deploy. Reduced-motion: static at 0.6 opacity floor.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Add sleeping state + "z" rise to `Tinker.svelte`

**Files:**
- Modify: `apps/docs/src/components/brand/Tinker.svelte`

**Step 1: Add `sleeping` state and the document-level idle listener.**

In script:
```ts
let sleeping = $state(false);
const SLEEP_MS = 60_000;
let sleepTimer: number | null = null;

function resetSleep() {
  sleeping = false;
  if (sleepTimer) clearTimeout(sleepTimer);
  sleepTimer = window.setTimeout(() => {
    sleeping = true;
  }, SLEEP_MS);
}

$effect(() => {
  resetSleep();
  const evts = ['pointermove', 'keydown', 'scroll'] as const;
  for (const ev of evts) document.addEventListener(ev, resetSleep, { passive: true });
  return () => {
    if (sleepTimer) clearTimeout(sleepTimer);
    for (const ev of evts) document.removeEventListener(ev, resetSleep);
  };
});
```

In template, after the sparkles SVG:
```svelte
{#if sleeping && !reducedMotion}
  <span class="tinker-z" aria-hidden="true">z</span>
{/if}
```

In style:
```css
.tinker-z {
  position: absolute;
  top: -8%;
  right: 14%;
  font-family: 'Fraunces', Georgia, serif;
  font-style: italic;
  font-weight: 600;
  font-size: 1.6rem;
  color: var(--site-fg-muted);
  animation: tinker-z-rise 2.4s ease-out infinite;
  z-index: 3;
}
.tinker--sleeping .tinker-img {
  animation-duration: 7s;
}
```

Add `.tinker--sleeping` class binding on root: `class:tinker--sleeping={sleeping && !reducedMotion}`.

**Step 2: Verify.**

```bash
pnpm -F docs astro check
```

**Step 3: Commit.**

```bash
git add apps/docs/src/components/brand/Tinker.svelte
git commit -m "$(cat <<'EOF'
feat(tinker): sleepy yawn after 60s of inactivity

Document-level pointermove/keydown/scroll listener resets a 60s
timer; on expiry, "z" appears above apple and bob slows to 7s.
Reduced-motion: no z, no slow-bob; sleeping is just a freeze.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Resolve mascot accessory sprite source (open Q1)

**Files:** depends on resolution.

**Step 1: Surface open Q1 to the user.**

Before continuing to Task 17, ask the user:

> "Open Q1 from the design: how should we source the three mascot accessory sprites (sunglasses, party-hat, grad-cap)?
>
> A. Hand-drawn SVG inline (cheapest, keeps DESIGN.md 'always the approved asset' rule honest since overlays don't replace the apple).
> B. Open-licensed PNG art (CC0 from a vetted source, sized 256×256).
> C. Hand-illustrated PNG (you draw or commission).
>
> No paid AI generation regardless."

**Step 2: Implement per resolution.**

For option A (default if user says "your call"):
- Author three small SVGs inline in `Tinker.svelte`'s template, gated behind `{#if sunglasses}` etc.
- Roughly 8–20 path points each.

For option B/C:
- Place files in `public/mascot/sunglasses.png`, `public/mascot/party-hat.png`, `public/mascot/grad-cap.png` and reference via `<img src>` in template.

**Step 3: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 4: Commit.** Match commit message to chosen option.

---

### Task 17: Add accessory layer to `Tinker.svelte`

**Files:**
- Modify: `apps/docs/src/components/brand/Tinker.svelte`

**Step 1: Add three optional props.**

```ts
interface Props {
  // ...existing props
  sunglasses?: boolean;
  birthday?: boolean;
  completedCourses?: number;
}
let {
  // existing destructure
  sunglasses = false,
  birthday = false,
  completedCourses = 0,
}: Props = $props();
```

**Step 2: Render accessories based on Task 16 resolution.**

For inline SVG (option A) example for sunglasses:
```svelte
{#if sunglasses}
  <svg class="acc acc-sunglasses" viewBox="0 0 432 477" aria-hidden="true">
    <g transform="translate(140, 200)">
      <rect x="0"    y="0" width="60" height="36" rx="14" fill="#1a1a1a" />
      <rect x="92"   y="0" width="60" height="36" rx="14" fill="#1a1a1a" />
      <rect x="58"   y="14" width="36" height="6"            fill="#1a1a1a" />
    </g>
  </svg>
{/if}

{#if birthday}
  <svg class="acc acc-hat" viewBox="0 0 432 477" aria-hidden="true">
    <!-- Triangle hat with a pom on top, tilted onto the apple's leaves. -->
    <polygon points="180,40 250,40 215,-30" fill="var(--ink-pink)" />
    <circle cx="215" cy="-30" r="8" fill="var(--ink-orange)" />
  </svg>
{/if}

{#each Array.from({ length: Math.min(completedCourses, 5) }) as _, i}
  <svg class="acc acc-grad" style="--i: {i}" viewBox="0 0 432 477" aria-hidden="true">
    <!-- Tiny grad cap tassel — i drives x offset along the apple bottom -->
    <g transform="translate({90 + i * 50}, 380)">
      <rect x="0"  y="6"  width="34" height="6"  fill="#1a1a1a" />
      <polygon points="-4,6 38,6 17,-4" fill="#1a1a1a" />
    </g>
  </svg>
{/each}
```

For PNG (option B/C), use `<img>` tags positioned absolutely.

**Step 3: Style.**

```css
.acc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 4;
}
```

**Step 4: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 5: Commit.**

```bash
git add apps/docs/src/components/brand/Tinker.svelte
git commit -m "$(cat <<'EOF'
feat(tinker): accessory layer (sunglasses, birthday hat, grad caps)

Three optional props gate three SVG/PNG accessory overlays.
sunglasses driven by easterEggs.svelte.ts (next task), birthday
+ completedCourses passed from server-side session.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7 — Easter eggs + stuck hint

### Task 18: Create `lib/easterEggs.svelte.ts`

**Files:**
- Create: `apps/docs/src/lib/easterEggs.svelte.ts`

**Step 1: Create the singleton.**

```ts
/**
 * easterEggs — global keyboard listener + state for mascot easter eggs.
 * DESIGN.md §Mascot easter eggs.
 */

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const TINKER = ['t','i','n','k','e','r'];

class Eggs {
  sunglasses = $state(false);
  bouncePulse = $state(0);

  #keys: string[] = [];

  init() {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      this.#keys.push(e.key.toLowerCase().startsWith('arrow') ? e.key : e.key.toLowerCase());
      if (this.#keys.length > 12) this.#keys.shift();

      // Konami: last 10 keys
      if (this.#match(KONAMI)) {
        this.sunglasses = true;
        setTimeout(() => (this.sunglasses = false), 10_000);
        this.#keys = [];
      }
      // "tinker": last 6 keys
      if (this.#match(TINKER)) {
        this.bouncePulse += 1;
        this.#keys = [];
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }

  #match(seq: string[]): boolean {
    if (this.#keys.length < seq.length) return false;
    const tail = this.#keys.slice(-seq.length);
    return tail.every((k, i) => k === seq[i]);
  }
}

export const eggs = new Eggs();
```

**Step 2: Verify.**

```bash
pnpm -F docs astro check
```

**Step 3: Commit.**

```bash
git add apps/docs/src/lib/easterEggs.svelte.ts
git commit -m "$(cat <<'EOF'
feat(eggs): konami + 'tinker' detection in easterEggs.svelte.ts

Singleton class with $state-backed sunglasses + bouncePulse.
Konami → 10s sunglasses window. Six-letter 'tinker' → bouncePulse++.
Skipped when focused on input/textarea/contenteditable.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Subscribe `Tinker.svelte` to `eggs`

**Files:**
- Modify: `apps/docs/src/components/brand/Tinker.svelte`

**Step 1: Wire imports.**

```ts
import { eggs } from '../../lib/easterEggs.svelte';
import { onMount } from 'svelte';

onMount(() => eggs.init());

const sunglasses = $derived(eggs.sunglasses);

$effect(() => {
  // Read pulse to subscribe; ignore initial value of 0.
  if (eggs.bouncePulse === 0) return;
  bouncing = true;
  setTimeout(() => (bouncing = false), 240);
  burst(root!, { count: 8, palette: ['teal'] });
});
```

The `$effect` reactively re-runs whenever `eggs.bouncePulse` changes. The `burst` call may or may not accept a `palette` option — if not, drop it (it's a polish, not load-bearing).

**Step 2: Pass `sunglasses` derived as the prop.**

The component accepts `sunglasses` as a prop in Task 17, but it can default-bind from `eggs` directly. Either:
- Default the prop to `eggs.sunglasses` if not passed.
- Or always read `$derived(eggs.sunglasses)` regardless of prop.

The cleanest is the second: ignore the prop, always read from `eggs`. Drop the `sunglasses` prop from Task 17's interface and update the template binding.

**Step 3: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 4: Commit.**

```bash
git add apps/docs/src/components/brand/Tinker.svelte
git commit -m "$(cat <<'EOF'
feat(tinker): subscribe to easter-egg state

Konami sunglasses + 'tinker' bounce pulse plumb through. Removes
the sunglasses prop in favor of always reading from the singleton.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: Create `StuckHint.svelte`

**Files:**
- Create: `apps/docs/src/components/lesson/StuckHint.svelte`

**Step 1: Create the component.**

```svelte
<script lang="ts">
  import { Spring, prefersReducedMotion } from 'svelte/motion';
  import { onMount } from 'svelte';

  const THROTTLE_MS = 120_000; // 2 min global
  const LS_KEY = 'tinker:stuck-last-shown';

  let visible = $state(false);
  let hint = $state('');
  const slide = new Spring(120, { stiffness: 0.14, damping: 0.6 });

  function show(h: string) {
    const last = Number(localStorage.getItem(LS_KEY) ?? '0');
    if (Date.now() - last < THROTTLE_MS) return;
    hint = h;
    visible = true;
    if (prefersReducedMotion.current) {
      slide.set(0, { instant: true });
    } else {
      slide.set(0);
    }
    localStorage.setItem(LS_KEY, String(Date.now()));
    window.dispatchEvent(
      new CustomEvent('tinker:announce', { detail: { message: `Hint: ${h}` } }),
    );
  }

  function hide() {
    if (prefersReducedMotion.current) {
      slide.set(120, { instant: true });
    } else {
      slide.set(120);
    }
    setTimeout(() => (visible = false), 280);
  }

  onMount(() => {
    const onStuck = (e: CustomEvent<{ hint: string }>) => show(e.detail.hint);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('tinker:stuck', onStuck as EventListener);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('tinker:stuck', onStuck as EventListener);
      window.removeEventListener('keydown', onKey);
    };
  });
</script>

{#if visible}
  <button
    class="stuck"
    style="transform: translateY({slide.current}%)"
    onclick={hide}
    aria-label="Dismiss hint"
  >
    <img src="/logo-mark.png" alt="" width="48" height="53" />
    <span class="bubble">{hint}</span>
  </button>
{/if}

<style>
  .stuck {
    position: fixed;
    right: 1.5rem;
    bottom: 1.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--band-cream);
    border: 1px solid color-mix(in srgb, var(--ink-red) 24%, transparent);
    border-radius: 999px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 18px 36px -20px color-mix(in srgb, var(--ink-red) 40%, transparent);
    cursor: pointer;
    z-index: 50;
  }
  .bubble {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 0.95rem;
    color: var(--site-fg);
    max-width: 28ch;
    text-align: left;
  }
</style>
```

**Step 2: Verify.**

```bash
pnpm -F docs astro check
```

**Step 3: Commit.**

```bash
git add apps/docs/src/components/lesson/StuckHint.svelte
git commit -m "$(cat <<'EOF'
feat(lesson): StuckHint with Spring slide-in + 2-min throttle

Listens for tinker:stuck (emitted by StepCheck after 30s without
submit). Throttle via localStorage timestamp. Dismiss via click or
Escape. Reduced-motion: instant fade.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Mount `StuckHint` in `Lesson.astro`

**Files:**
- Modify: `apps/docs/src/layouts/Lesson.astro`

**Step 1: Import + mount.**

In frontmatter:
```astro
import StuckHint from '../components/lesson/StuckHint.svelte';
```

In template (anywhere inside the body, near `<SrAnnouncer>` from Task 10):
```astro
<StuckHint client:idle />
```

**Step 2: Verify.**

```bash
pnpm -F docs astro check
pnpm -F docs build
```

**Step 3: Commit.**

```bash
git add apps/docs/src/layouts/Lesson.astro
git commit -m "$(cat <<'EOF'
feat(lesson): mount StuckHint in lesson layout

client:idle defers JS until after page is interactive; the 30s
stuck timer inside StepCheck ensures the hint never fires earlier.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 8 — Audits + deploy

### Task 22: Reduced-motion audit pass

**Goal:** Walk every surface, verify the reduced-motion fork behaves per design §9.

**Files:** none. Verification-only task. May produce small fixes per file as audit findings come up.

**Step 1: Enable reduced-motion locally.**

macOS: System Settings → Accessibility → Display → Reduce motion ON.

**Step 2: Audit checklist (each item runs `pnpm -F docs build` and visually inspects via deploy in Task 25, or manually reads the code path).**

- [ ] Mascot bob frozen, cursor-tilt frozen, sparkle-flicker frozen, sleepy "z" not rendered.
- [ ] FloatingMath frozen via `animation-play-state: paused`.
- [ ] Spring widget jiggle replaced with instant scale set.
- [ ] Halo overshoot still fires (it's a deliberate user-response, kept on per design §9).
- [ ] Sweep-green still runs (deliberate response).
- [ ] StuckHint slide replaced with instant fade.
- [ ] XpCounter Tween replaced with `display.set(value, { instant: true })`.
- [ ] Streak flame-flicker keyframe still fires (one-shot deliberate response).
- [ ] Confetti math-burst no-op (already gated in `lib/confetti.ts`).
- [ ] TinkerHop no-op (already gated).
- [ ] Sound + haptic still fire (deliberate, not ambient).

**Step 3: Fix any deviations found.** Each fix is its own commit, message format `fix(motion): <surface> respects reduced-motion`.

**Step 4: Final commit (or skip if no fixes needed):**

```bash
# only if fixes were made
git commit -m "$(cat <<'EOF'
fix(motion): close gaps from reduced-motion audit

Audit per design §9 reduced-motion table. Each surface verified
ambient-off + deliberate-on.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 23: Aria-live audit pass

**Goal:** Every visual celebration also fires through `<SrAnnouncer>`.

**Files:** none. Verification-only.

**Step 1: Enable VoiceOver (macOS: ⌘F5) or NVDA on Windows.**

**Step 2: Audit checklist (manual, against deploy in Task 25 or via grep).**

- [ ] StepCheck correct: hears "Correct."
- [ ] StepCheck wrong: hears "Try again. Read the hint."
- [ ] Lesson complete: hears "Lesson complete. Plus 20 XP."
- [ ] Module complete: hears "Module complete. Plus 100 XP. {next} unlocked." (or no tail when next is undefined).
- [ ] StuckHint appears: hears "Hint: {message}".
- [ ] XpCounter: hears resting value only, never every Math.round frame.
- [ ] Streak bump: hears "Streak now N days."

**Step 3: Fix any missing announcements.** Each fix is its own commit.

---

### Task 24: Build + deploy + visual verify

**Goal:** Ship to learntinker.com and verify the full alive-layer pass against the live site.

**Files:** none — this is the deploy step.

**Step 1: Confirm clean tree on the worktree branch.**

```bash
cd /Users/joshhd/Documents/tinker/.worktrees/feature-alive-layer
git status
git log --oneline main..feature/alive-layer
```

Expected: clean working tree, ~22+ commits ahead of main.

**Step 2: Final build.**

```bash
pnpm -F docs build
```

Expected: succeeds.

**Step 3: Decide merge path with user.**

Two paths — confirm with user before pushing:
- **Squash-merge to main** then deploy main.
- **Direct deploy from `feature/alive-layer`** for staging-style verification, then merge if it looks good.

The repo deploys from main per `CLAUDE.md` (`pnpm dlx wrangler@latest deploy` from `apps/docs/`). So the standard path is: merge to main, then deploy.

**Step 4: Deploy.**

After user-approved merge:
```bash
cd apps/docs
pnpm dlx wrangler@latest deploy
```

**Step 5: Visual verification on `learntinker.com`.** Per user's standing memory: do NOT use `astro dev`.

Walk through each of the five surfaces:
1. **Hero/landing** — FloatingMath drifts, Tinker bobs + cursor-tilts, sparkle pulse fires, click bounces with math-symbol burst, click 10x triggers milestone burst, idle 60s+ produces sleepy "z".
2. **Mid-lesson** — On a sample StepCheck: correct → ding + halo + math-burst + XP fly + announce; wrong → shake + coral border + announce.
3. **Lesson complete** — End of a sample lesson: progress bar overshoot + chime + math-burst + TinkerHop + sweep + XP tween + announce.
4. **Module complete** — Same surface, bigger.
5. **XP/Streak nav chip** — XP smoothly ticks; +N floater drifts up + fades; streak flame flickers on bump (if seeded > 0).

**Step 6: Validate easter eggs.**
- Konami on landing: `↑↑↓↓←→←→ba` → sunglasses for 10s.
- Type "tinker" anywhere not focused on input → bounce + teal burst.

**Step 7: Validate reduced-motion (System Setting toggle live, no reload).**
All ambient motion freezes, deliberate motion persists per Task 22.

**Step 8: Capture any visual tuning notes.**
The most likely tuning needs: sparkle SVG offsets in Tinker (Task 14 noted these were guesses), accessory positions if PNG sprites were chosen in Task 16.

**Step 9: Open follow-up tickets (no commit).** Surface any deferred work as new lines in `docs/plans/2026-04-27-alive-layer-design.md` §10 Open questions, or as a new doc.

---

## Done

When the remaining 23 tasks land cleanly (Task 1 was dropped — see top of plan) and the visual verification passes, the alive-layer pass is shipped. The five surfaces feel coordinated, the brand decisions are intact (math-symbol confetti, sine palette, no purple, no Tinker inside lessons), and the new primitives (`Spring`/`Tween`/`prefersReducedMotion` rune, hand-rolled `@keyframes`) are doing the work the inline CSS used to fake.

Future passes — port mascot to Rive (when lip-sync matters), add audio sprites (past 20 sounds), Motion / GSAP (when celebrations grow past five overlapping tweens) — remain in the back pocket per the design's upgrade triggers.
