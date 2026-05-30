# CLAUDE instructions for Tinker

## Design System

**Read `DESIGN.md` before making any visual or UI decision.**

All typography, color, spacing, motion, sound, haptic, and progress-loop tokens are locked in that file. Do not deviate without explicit user approval.

Specifics:
- CSS variables are defined in `apps/docs/src/styles/global.css`. Use `var(--token)`, never hex.
- Any new token: add to `DESIGN.md` first, then `global.css`, then use it.
- Any deviation from `DESIGN.md` is a bug. Flag it in code review.
- If a widget needs a color or font that isn't in `DESIGN.md`, stop and propose the addition.

## Project Layout

- `apps/docs/` — Astro 6 + Svelte 5 site deployed to learntinker.com via Cloudflare Workers
- `packages/svelte-mafs/` — interactive math-viz widget engine inside Tinker (not a separate library)
- `docs/plans/` — strategy docs and research prompt packs
- `docs/research/` — Deep Research output for each module before conversion to MDX lessons

## Deployment

- Build: `pnpm -F docs build` from repo root
- Deploy: `pnpm dlx wrangler@latest deploy` from `apps/docs/`
- Production: https://learntinker.com

## Gotchas

### Dark mode and the Safari browser chrome (toolbar/address bar)

Safari 26+ (iOS 26 / macOS Tahoe) **ignores the `theme-color` meta tag**. It tints the browser chrome from CSS instead: the `background-color` of the topmost fixed/sticky element near the viewport edge, falling back to the `<body>` background. So the toolbar color is driven by our CSS, not a meta tag. Three rules keep it working (all already in place; don't undo them):

1. **Keep `.site-header` (the nav) transparent with no `backdrop-filter`.** The frosted glass lives on `.site-header::before` (an absolutely-positioned child, which Safari's tint sampler ignores). A translucent background on the nav itself makes Safari sample a see-through color and the toolbar goes light. See `apps/docs/src/components/Nav.astro`.
2. **Keep an opaque, theme-aware `background-color: var(--site-bg)` on `<body>`** (in `global.css`). That is Safari's fallback target, and it must flip with `[data-theme]`.
3. **Never "fix" the chrome via `theme-color` JS or a hidden sampler element behind the nav.** Both were tried and both fail. The `theme-color` meta + observer in `Base.astro` are only for Chrome/Edge/Firefox-Android/Safari <26.

Known limitation, not a bug: iOS 26 Safari samples the toolbar **at initial render** and does **not** re-sample on a JS theme toggle (Apple by design). So the in-page toggle won't repaint the toolbar instantly; a reload/navigation (which re-runs initial render with the persisted theme) shows the correct color. `Base.astro` has a best-effort nudge for the live toggle. Real toolbar behavior can only be verified on a device (Chromium/Playwright confirms the CSS, not the chrome).

## Skill routing

When the user's request matches an available gstack skill, invoke it using the Skill tool as your FIRST action. Do not answer directly, do not use other tools first.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke `office-hours`
- Bugs, errors, "why is this broken" → invoke `investigate`
- Ship, deploy, push, create PR → invoke `ship`
- QA, test the site, find bugs → invoke `qa`
- Code review, check my diff → invoke `review`
- Update docs after shipping → invoke `document-release`
- Design system, brand, mood → invoke `design-consultation`
- Visual audit, mobile polish, design bugs → invoke `design-review`
- Architecture review → invoke `plan-eng-review`
- Save progress, checkpoint, resume → invoke `checkpoint`
- Code quality, health check → invoke `health`
