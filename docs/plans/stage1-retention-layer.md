# Stage 1: Retention Layer (ts-fsrs over StepChecks)

Source: 2026-05-27 pedagogy + design-space audit. This plan translates the audit's Stage 1 recommendations into Tinker-specific work, sequenced by the codebase audit conducted alongside it.

## Why this and not something else

Tinker's gated StepChecks are de facto retrieval practice within a lesson. The gap is *across* lessons: nothing forces a learner doing M7 to retrieve the chain rule from M5, so by M14 the chain rule has decayed (Bjork "storage strength vs retrieval strength"). Spaced retrieval is the only Dunlosky 2013 "high utility" intervention Tinker doesn't have. Everything else in Stage 2+ (problem bank, worked-example fading, debugging problems) is more valuable once retention is solved, because they amplify what learners can hold onto.

## The blocker the codebase audit surfaced

`StepCheck.astro` does not have a stable per-step ID. Step position is assigned at render time via `data-index` (Lesson.astro:516) based on DOM order. Any FSRS card keyed to a step would corrupt when the lesson is edited and steps are reordered. **Adding stable IDs is the prerequisite for everything below.**

Precedent already exists: `exerciseAnswer` uses a stable `exerciseId` string (schema.ts:71-80). Mirror that pattern for StepCheck.

## Phase A: Stable step IDs (foundation)

1. Add a required `id` prop to `StepCheck.astro` and `StepChoice.astro`.
   - Convention: `{lessonSlug}#{shortname}`, e.g. `m3-trig#sine-at-pi-over-6`.
   - At build time, run an Astro integration that validates every StepCheck/StepChoice in `src/content/lessons/*.mdx` has an id, and that ids are unique across the corpus. Fail the build on collision.
2. Backfill existing lessons. Roughly 30 lessons; one pass through MDX adding ids.
3. Update `Lesson.astro:516` to read the id from the rendered StepCheck rather than computing `data-index`.
4. Preserve `data-index` only for ordering UI (progress bar fills, "next step" jumps).
5. Update `POST /api/exercises/answer` to also accept and store a `stepId` (for stepCheck/stepChoice answers, distinct from exerciseId for free-form exercises).

Risk: an author who later renames a step id orphans its FSRS history. Mitigate with a `stepIdAlias` table that maps old → new ids, populated when a lesson PR changes a step id.

## Phase B: Schema

Add three Drizzle migrations after the existing `0002_align_rate_limit_to_better_auth.sql`:

**`0003_step_check_history`** (per-attempt log, analogous to `exerciseAnswer`):
```
stepCheck (
  user_id TEXT NOT NULL,
  lesson_slug TEXT NOT NULL,
  step_id TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  rating TEXT,                  -- "again" | "hard" | "good" | "easy" (nullable on first auto-rated submit)
  attempt_no INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, step_id, attempt_no)
)
```

**`0004_fsrs_card`** (one row per (user, step_id), holds scheduler state):
```
fsrsCard (
  user_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  lesson_slug TEXT NOT NULL,    -- denormalized for "previously" recap queries
  module_slug TEXT NOT NULL,    -- denormalized for module-grouped queue views
  knowledge_type TEXT,          -- "factual" | "procedural" | "conceptual"
  due INTEGER NOT NULL,         -- epoch ms
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  elapsed_days REAL NOT NULL,
  scheduled_days REAL NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  state INTEGER NOT NULL,       -- 0=new, 1=learning, 2=review, 3=relearning
  last_review INTEGER,
  PRIMARY KEY (user_id, step_id)
)
```

**`0005_key_idea`** (per-module "what do you want to remember in 6 months?" self-authored prompt):
```
keyIdea (
  user_id TEXT NOT NULL,
  module_slug TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, module_slug)
)
```

Index considerations:
- `fsrsCard(user_id, due)` for "due now" queue lookup.
- `fsrsCard(user_id, module_slug, due)` for "previously" recap (pull due cards from prior modules).
- `stepCheck(user_id, lesson_slug)` for lesson-level retrospective views.

## Phase C: Server endpoints

Add under `src/pages/api/`:

1. `POST /api/steps/answer` (parallels existing `/api/exercises/answer`)
   - Body: `{ stepId, lessonSlug, moduleSlug, answer, isCorrect, rating? }`
   - If `rating` is present (user clicked Again/Hard/Good/Easy), call `ts-fsrs` `next()` with the current card state to produce the new card; upsert into `fsrsCard`.
   - If `rating` is absent (first auto-rated submit on a fresh step), seed a new card with `state=0`, schedule due in 24h.
   - Insert a row into `stepCheck` for the attempt log.
   - Anon fallback: write to localStorage with the same shape; merge on sign-in via the existing `/api/progress/merge` pattern.

2. `GET /api/review/queue`
   - Returns up to N due cards for the current user, sorted by `due ASC`.
   - Each card includes enough metadata to render the prompt: `stepId`, `lessonSlug`, prompt text (resolved by re-rendering the MDX step in a server context, or by pre-extracting prompts into a build-time JSON manifest — prefer the manifest for performance).

3. `POST /api/review/grade`
   - Body: `{ stepId, rating }`. Updates the `fsrsCard` row; logs to `stepCheck`.

4. `GET /api/modules/:moduleSlug/recap`
   - Returns 3 due cards from *prior* modules for the "previously" recap at module start.

5. `POST /api/modules/:moduleSlug/key-idea` / `GET ...`
   - Upserts/reads the user's per-module "remember in 6 months" prompt.

## Phase D: FSRS integration

- Package: `ts-fsrs` (the audit's recommendation; benchmarked ~20-30% fewer reviews than SM-2 at equal retention per Expertium's open-spaced-repetition benchmark, ~350M reviews).
- Wrap it in `src/server/fsrs.ts` exporting `scheduleNext(card, rating, now)` → `{ card, log }`. Keep ts-fsrs imports confined to that one module so a future swap (e.g., FSRS-5 → FSRS-6) is a single-file change.
- Use defaults; do not tune yet. Tuning needs months of real reviews and is premature.

## Phase E: `/review` route

New Astro page at `apps/docs/src/pages/review/index.astro`. Structure modeled on `/dev/widget-lab/` (per memory note `project_widget_lab_qa_route.md`):

- Server-side fetch of the queue via `getSession` + a direct DB call (faster than the API roundtrip).
- Render one card at a time using the existing StepCheck / StepChoice components in a "review mode" (no localStorage gating; submit posts to `/api/review/grade`).
- After answer reveal, show four buttons: Again / Hard / Good / Easy. The button choice maps to the FSRS rating; submit advances to the next card.
- "Done for today" state when the queue is empty.
- Show a small queue counter ("4 of 12 due") for momentum, but no streaks, no leagues, no badges. See `feedback_no_streaks_badges_leagues.md`.

Performance: prompt text resolution should not require running MDX at request time. Add a build step that emits `src/generated/step-prompts.json` mapping `stepId → { promptHTML, hintHTML, answerType, lessonSlug, moduleSlug }`. Regenerated on each lesson change.

## Phase F: "Previously" recap at module start

In `Lesson.astro`, when `frontmatter.order === 1` (first lesson of a module) and the user is signed in and has completed any prior modules, fetch `GET /api/modules/:moduleSlug/recap` and render a small "Previously" panel above the lesson title. Three cards, click-to-reveal. Each card has a "Review" link that adds it to the `/review` queue.

For module slug → arc order, add an `arc` field to lesson frontmatter (e.g., `arc: foundations`) or derive from a separate `src/content/modules.ts` registry. The latter is cleaner because module-level metadata (display name, arc, color) is currently nowhere centralized.

## Phase G: Mastery framing

Replace the existing `N / M steps` progress bar (Lesson.astro:47-53) with a dual-signal display:

- Inside a lesson: keep `N / M steps` (it's about *this lesson's* gate progress, not retention).
- On `/me`, `/lessons`, and the new `/review` hub: show "N skills retained" derived from `count(fsrsCard) where retrievability >= 0.9`. Per the audit, this maps the Khan mastery framing onto FSRS rather than onto a points economy. **Do not add an "energy points" or "XP economy" surface.** The hardcoded `+20 XP` in Lesson.astro:63-72 should be quietly removed; the `tinker:xp` window event listener can stay as a no-op so other code doesn't break, but the user-visible XP signal goes away.

Retrievability target: 0.9 is the FSRS default "desired retention." Show "retained" rather than "mastered" to avoid Khan-style points framing while keeping the Bloom-inspired language the audit endorsed.

## Phase H: Confidence ratings on first submit (lesson context, not review)

When a learner answers a StepCheck correctly *in lesson context* (not in `/review`), show the same Again/Hard/Good/Easy buttons before advancing to the next step. The rating seeds the initial FSRS card (Phase B/C above). If the learner does not click, default to "Good" after a short delay so the lesson flow isn't blocked. This is necessary because if the first interaction with a step is the next-day review with no prior data, the scheduler has no signal to work with.

## Phase I: Module-end "remember in 6 months" prompt

After the last StepCheck of a module's last lesson, surface a single textarea: "In one sentence, what do you want to remember in 6 months?" Save to `keyIdea`. On future visits to any lesson in that module, display the saved key idea at the top as a per-user mantra. Optionally, push it into the FSRS queue as a cloze-style self-authored prompt — but only after Phase A-G ships and stabilizes; this is a Stage-1.5 polish.

## Acceptance criteria

Stage 1 is done when, for a signed-in user who completes a sample lesson:
1. Every StepCheck/StepChoice answer is persisted to `stepCheck` with a stable `stepId`.
2. A corresponding row exists in `fsrsCard` with a scheduled `due` timestamp.
3. The `/review` route shows due cards and grades them via `ts-fsrs`.
4. The "previously" recap appears on the next module's first lesson.
5. The `/me` surface shows "N skills retained" instead of "N% complete."
6. Anonymous users get equivalent localStorage state that merges into the DB on sign-in.

## What goes to memory vs in-repo doc

Already saved to `~/.claude/memory/`: the five load-bearing principles (reference class, no-streaks, stage priorities, Matuschak taxonomy, authoring constraints).

This file (`docs/plans/stage1-retention-layer.md`) is the project-scoped, in-repo plan. The full audit text lives in conversation history; if it should also be checked in, save to `docs/research/pedagogy-design-space-audit.md` (note: the em-dash-to-colon hook will lightly mangle prose; consider saving as `.txt` if fidelity matters).

## Open questions before writing code

1. **Stable id authoring discipline.** Should ids be hand-written (`m3-trig#sine-at-pi-over-6`) or auto-derived from prompt text hashes? Hand-written is more robust to prompt edits; auto-derived removes authoring burden but breaks history when the prompt changes. Recommend hand-written with a lint rule.
2. **Prompt extraction for `/review`.** Do we build a static JSON manifest at build time, or render MDX on demand at request time? Manifest is faster and works offline; on-demand keeps prompts always-fresh. Recommend manifest with a `data-step-id` selector so QA in `/dev/widget-lab/` can show "the prompt the FSRS queue would render" inline.
3. **Anon learners.** The audit's >50% D14 review-return threshold can only be measured for signed-in users. Should the `/review` route require sign-in, or work for anon via localStorage? Recommend requiring sign-in for `/review` (forces account creation, which Tinker's pricing model assumes) while still accumulating localStorage state for signed-out lesson use that merges on sign-in.
4. **Knowledge-type tagging.** Phase B includes `knowledge_type` on `fsrsCard`. Who assigns it? Author hand-tags via a new `<StepCheck type="procedural" ...>` prop, or an LLM classifier at build time? Recommend hand-tag with an LLM-suggested default at lint time. Per Matuschak's taxonomy, this discipline is what makes prompts good.

## What this plan deliberately leaves out

- Stage 2 items (problem bank, worked-example fading, Stuck? intervention).
- Streaks, badges, leagues, certificates - permanently skipped per audit and memory.
- Free-form notes, highlighting - audit rates as low-utility / engagement-noise.
- AI tutor chatbot - audit rates as overrated for this audience.
- Native mobile lesson UI - Capacitor is on the table for `/review` only in a later phase.
- Adaptive difficulty - explicitly an ML problem we don't want layered on top of an ML course.
