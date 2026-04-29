# svelte-mafs docs site

Astro 6 + `@astrojs/svelte` + MDX. Deploys to Cloudflare Pages.

## Run locally

From the monorepo root:

```bash
pnpm install
pnpm -F docs dev          # http://localhost:4321
pnpm -F docs build        # astro build
pnpm -F docs preview      # wrangler preview against the built bundle
```

Node `>=22.12` required (matches Astro 6 and the Cloudflare adapter).

## Project layout

```
apps/docs/
├── src/
│   ├── layouts/Base.astro         # <html> shell + Nav + footer
│   ├── components/                # nav, brand, lesson, demos, course, …
│   ├── pages/                     # index, courses/, signin, signup, me, …
│   └── styles/global.css          # design tokens + resets
└── astro.config.mjs               # svelte + mdx + cloudflare
```

## Deploying to Cloudflare Pages

The site builds to **`apps/docs/dist/client/`** — that's the publish
directory to point Pages at. The `@astrojs/cloudflare` adapter also
emits a server bundle at `dist/server/` for any page that opts into
SSR with `export const prerender = false`, but the current chassis
is 100 % prerendered.

### Pages (Git integration)

1. Create a Cloudflare Pages project tied to this repo.
2. **Build command**: `pnpm -F docs build`
3. **Build output directory**: `apps/docs/dist/client`
4. **Root directory**: *(leave blank — the monorepo root)*
5. Environment variables:
   - `NODE_VERSION=22`

### Workers / Pages with functions (if SSR is ever enabled)

The `apps/docs/wrangler.jsonc` file configures the Cloudflare Worker.
From `apps/docs/`:

```bash
pnpm -F docs build
pnpm -F docs wrangler deploy
```

If you enable SSR routes, set the `nodejs_compat` compatibility flag
on the Worker — Svelte's server renderer imports `node:async_hooks`,
which needs it. Pure static deploys (the current state) don't need
the flag.

## Commands

| Command                     | What it does                                     |
| :-------------------------- | :----------------------------------------------- |
| `pnpm -F docs dev`          | Dev server on `localhost:4321`                   |
| `pnpm -F docs build`        | `astro build`                                    |
| `pnpm -F docs preview`      | Preview the built site via Wrangler              |
| `pnpm -F docs astro check`  | Type-check `.astro` / `.svelte` / `.ts`          |

## Contributing pages

- **Astro pages** (`src/pages/*.astro`) use the `Base` layout via
  `<Base title="..." prose>…</Base>`.
- **MDX pages** (`src/pages/*.mdx`) set the layout in front-matter:
  `layout: ../layouts/Base.astro`, with `title`, `description`, and
  optional `prose: true` for the reading-width column.
- **Svelte islands** should default to `client:visible` unless a
  component needs to be interactive above the fold (then `client:load`).
- **A11Y**: every interactive page must satisfy `A11Y.md` before
  merging.
