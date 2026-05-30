---
title: Homepage Course Atlas
status: building
date: 2026-05-29
---

# Homepage redo: the Course Atlas

## Problem

The homepage (`apps/docs/src/pages/index.astro`) is a marketing landing page that
teases only 3 modules (proof cards) and summarizes the course as 4 arc blurbs. It
never shows the actual shape of the work. The real catalog (all 92 lessons across
19 modules) lives only on `/lessons`. User ask: "the homepage is lame and doesn't
have all the lessons, make it more awesome." User chose "all three" of: keep hero +
proof cards, add a full course map, and polish.

## Shape of the data

- Course `ml-math` owns 5 arcs (`arc-0-foundations` ... `arc-4-capstone`).
- 19 modules (m0..m18). Status: m0 planned, m1..m13 drafting, m14..m18 shipped.
- 92 lessons. Only m0-diagnostic has zero lessons (planned placement test).
- `/api/me/state?course=ml-math` returns per-lesson `{ completedAt, viewCount,
  lastSeenAt }` keyed by slug, 401 for anon. Lets the map light up for logged-in
  learners (DESIGN.md "mastery glow", which is sanctioned, vs. streaks/badges which
  are not).

## Design: "The Climb"

A new centerpiece section between the proof band and the closing CTA, replacing the
thin 4-arc curriculum block.

1. **Stat strip.** `5 arcs / 19 modules / 92 lessons / ~Nh interactive math`,
   computed at build time, count-up animated on scroll into view. Space Grotesk,
   tabular-nums. Reduced motion shows final values immediately.

2. **`CourseAtlas.svelte`** (client:visible). Vertical journey spine, top = arc 0,
   bottom = capstone (scroll-as-progress matches the "from f(x)=x squared to a
   transformer" framing in the closing band).
   - Arc segments, each a colored rail: sea, teal, red (keystone arc), orange, pink.
     No purple. Sun stays in XP territory.
   - Module nodes on the spine: number, title, summary, status chip, lesson count,
     minutes. Keystone (m12) emphasized. Each node id is its short anchor (`m12`) so
     proof cards and deep links land on it.
   - Click a module to expand inline (grid-rows 0fr to 1fr, reduced-motion safe) and
     reveal every lesson, each a real link to `/lessons/{slug}`.
   - Sticky arc rail (offset by `--nav-height`) to jump between arcs; active arc
     tracked with IntersectionObserver.
   - Progress (authed only): completed lessons glow green with a check, per-module
     progress bar, and a "Jump back in" deep-link to the most recent lesson.

3. **Keep + lightly polish** the hero, the 3 proof cards (links repointed to on-page
   atlas anchors), and the closing CTA.

## Constraints honored

- DESIGN.md is the source of truth. All color via `var(--token)`, zero hex in
  component CSS. No purple. One green CTA. Sun reserved for XP.
- No streaks/badges/leagues. Progress shown as mastery glow only.
- No placeholders: a planned module with no lessons renders as a real planned node,
  the same treatment `/lessons` already uses.
- Astro prerender stays on; data comes from content collections at build time.

## Follow-up (separate task)

User is reworking DESIGN.md and wants to redo it after this ships.
