---
title: M0 Diagnostic & Placement
status: building
date: 2026-05-29
---

# M0: the adaptive placement diagnostic

## What this is

M0 is the only unbuilt unit in `ml-math`, and by design it is **not a lesson
sequence** — the module file says it "teaches nothing." Its job is to route a
new learner to the right entry module so an engineer who factors quadratics in
their sleep does not sit through fraction arithmetic. This doc specifies the
interactive adaptive diagnostic that does that routing, plus how the result
persists and surfaces.

It is a feature, not authored prose, so there is no Deep-Research brief (the
build-status table marks M0 `n/a` for that column). The pedagogy below is
grounded in a verified research pass (see "Why this design").

## Decisions locked with the user

- **Placement granularity:** a single recommended **entry module** (not an arc),
  with a one-line reason and a per-strand readout.
- **Persistence:** results persist to the account (new `placement` table +
  migration) and an anonymous learner's result merges into their account on
  sign-up, mirroring `api/progress/merge.ts`.
- **Entry points:** primary CTA on `/welcome` ("Find your starting point") and
  the M0 node on the homepage Course Atlas. The marketing hero is untouched.

## Why this design (research summary)

A verified research pass (peer-reviewed psychometrics + ALEKS / Math Academy
primary docs) settled the method:

- **Not a fixed 20-item scored test.** Fixed-form tests measure the *tails* —
  strong and very-rusty learners — with the largest error, because test
  information peaks in the middle. Our audience *is* the tails.
- **Not single-trait IRT.** The curriculum is a prerequisite chain across
  strands, not one ability dimension. The right frame is **Knowledge-Space
  Theory**: locate the learner's *knowledge frontier* (the boundary between what
  they know and don't). ALEKS and Math Academy do this in production.
- **The skip-ahead mechanic is prerequisite propagation:** a correct hard item
  credits *all its prerequisites*; a wrong item debits its postrequisites. One
  answer resolves many untested topics — that is how a strong learner finishes
  in a handful of questions.
- **Start at the population mean, pick each next item to split the remaining
  uncertainty ~50/50 (max information), stop on a precision target + a hard cap
  + a small floor.**
- **Err *low*, deliberately.** Anything still ambiguous at the cap is treated as
  not-yet-known; place slightly low and let early material be a fast skim. Cheap
  to skim known material; expensive to strand someone above their level.
- **Reality check:** ~20 items gives ~0.79 classification accuracy. That is fine
  **only because** this is a *nudge, not a gate* — the learner can start anywhere
  on the Atlas; placement only sets the default. Cold-start: ALEKS calibrated on
  millions of responses, we have none, so item difficulties are expert-authored
  and refined later.

Full KST (ALEKS models ~350 concepts → millions of states, worst case 77
questions) is over-engineering here. Tinker's prereq graph is essentially a
**linear spine** (m1 → m10), so the honest right-sized realization is a **1-D
adaptive difficulty ladder over that spine** — mathematically the same
max-information climb, collapsed onto a chain.

## The five levels (the ladder)

The diagnostic measures five ordered competency levels, drawn from M0's
`conceptsCovered`. Each level, if *not* demonstrated, points at the module that
teaches it:

| Level | Competency | Probes | Entry module if this is the lowest gap |
|---|---|---|---|
| 1 | Arithmetic & number sense | fractions, signed arithmetic, order of ops, percents | `m1-pre-algebra` |
| 2 | Algebra | linear/quadratic solving, exponent & log laws, manipulation | `m2-algebra` |
| 3 | Functions & precalc | function notation, composition, inverses, graph-reading, radians/sin-cos | `m3-trigonometry` |
| 4 | Calculus intuition | slope-at-a-point, informal limits, local linearity, rate of change | `m5-calculus` |
| 5 | Probability & basic stats | probability as proportion, expected value, independence, reading a distribution | `m8-probability` |
| — | (all five demonstrated) | — | `m10-optimization` (start of the ML arc) |

Entry module = **the module teaching the lowest level the learner did not
demonstrate**. The learner then proceeds linearly from there; everything before
it is deemed review and skipped. A perfect run routes to the ML arc: "the math
is review for you — start where the ML begins."

Level 4 deliberately tests calculus *intuition* (the m4 informal-limit material),
not formal derivatives — passing it means *ready to start m5*, not *already knows
calculus*. This is why passing level 3 routes to `m5` (functions/precalc are
review) rather than `m4`.

## The algorithm

A binary search for the frontier over the five levels, with prerequisite
propagation:

1. **Start** at level 3 (the median "did calc in college, forgot it" engineer).
2. **Mini-probe** the target level: ask up to 2 items. 2/2 → level PASS; 0/2 →
   level FAIL; 1/2 → ask a 3rd, then 2/3 → PASS else FAIL.
3. **Propagate + bisect.** Track `lo` (highest confirmed pass, 0 = none) and `hi`
   (lowest confirmed fail, 6 = none). PASS at L → `lo = L`, new target =
   midpoint of `[L+1, hi-1]`. FAIL at L → `hi = L`, new target = midpoint of
   `[lo+1, L-1]`. Passing a level credits all lower levels (never re-tested);
   failing one debits all higher levels.
4. **Stop** when `hi - lo === 1` (frontier pinned), or items asked reaches the
   **20 cap**, or no items remain at the needed level. A 6-item floor prevents a
   1-question placement.
5. **Place** at `entryModule(hi)` (err low: residual ambiguity resolves to the
   lower module).

Typical lengths: strong learner pins out in ~4–6 items (L3 pass → L5 pass →
done → m10); modal engineer ~6–8 (L3 pass → L5 fail → L4 fail → m5).

## Item bank (`lib/diagnostic/items.ts`)

~30 items, ~6 per level. Each: `{ id, level, difficulty, prompt, choices (one
correct), misconception tags on distractors }`. Items use Unicode math (x², √,
½, π, ≈) — no KaTeX runtime in the engine component, since diagnostic items are
short. Distractors are **misconception-diagnostic**, not random: false
distributivity `(a+b)² = a²+b²`, `log(a+b) = log a + log b`, fraction-vs-decimal
confusion, treating `f(x+h)` as `f(x)+h`, sign errors. Engineer-toned, one screen
each, no time pressure. Items at a level are shuffled per run for exposure
control and retake variety; the 3rd tiebreaker item is drawn from the unused
pool.

## Architecture

- `lib/diagnostic/items.ts` — item bank (pure data).
- `lib/diagnostic/engine.ts` — pure adaptive state machine: `createSession`,
  `nextItem`, `answer`, `isDone`, `result`. No DOM, no fetch — unit-tested.
- `components/diagnostic/DiagnosticEngine.svelte` — drives the engine, renders
  one question at a time (markup/styling mirrored from `Choice.astro`), shows a
  variable-length progress hint ("Question 7 · homing in", no denominator —
  a "7 of 20" would contradict early-stop).
- `components/diagnostic/DiagnosticResult.svelte` — entry-module recommendation,
  per-strand readout (✓ / ◐ / —), primary deep-link to the first lesson of the
  entry module, and a quiet "start from the beginning instead" escape hatch.
  No score, no "you failed", no gamification.
- `pages/diagnostic.astro` — route shell (`/diagnostic`), `prerender = false` not
  required (the engine is client-side); uses the Base layout.

## Persistence

- `placement` table (migration `0006`): `userId` PK, `courseSlug`, `entryModule`,
  `strandScores` (JSON), `itemsAnswered`, `takenAt`. One row per user; retake
  upserts (latest wins).
- `server/placement.ts` — `upsertPlacement`, `getPlacement` (Drizzle, mirrors
  `server/notes.ts`).
- `pages/api/placement.ts` — `POST` (authed, CSRF, rate-limited, zod-validated)
  upserts; `GET` returns the current placement. Mirrors `api/notes/[lesson].ts`.
- **Anonymous flow:** logged-out result is written to `localStorage`
  (`tinker:placement`, registered in `storage-keys.ts`). `AuthForm.svelte` POSTs
  it to `/api/placement` on first sign-in/up alongside the existing progress
  merge, then clears the key. Non-fatal: never blocks login.

## Entry-point surfacing

- `/welcome` — the onboarding form's primary submit becomes "Find your starting
  point" → redirects to `/diagnostic`; a secondary "Browse the full map instead"
  → `/courses/ml-math`. Both still set `onboardedAt` + opt-in.
- Course Atlas — the M0 node (currently a static "Optional · placement" card)
  becomes a link to `/diagnostic`.
- After placement, the recommended entry module is the natural deep-link target;
  the Atlas already lights up progress for authed learners.

## Out of scope (deliberate)

- No item-difficulty calibration from response data (cold-start: expert-authored;
  refine later once there is traffic).
- No per-module independent measurement of trig / multivariable / linear algebra
  — those are folded into the linear spine; the diagnostic routes to where the
  *journey starts*, not a multi-entry plan.
- No timed mode, no score display, no gamification (consistent with the
  adult-engineer audience).
