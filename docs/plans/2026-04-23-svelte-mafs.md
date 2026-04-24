# Svelte Mafs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a production-quality, tree-shakeable **Svelte 5** library for interactive math visualization — a faithful port of [Mafs](https://mafs.dev) (React) with native Svelte 5 runes, SVG rendering, KaTeX labels, adaptive function sampling, draggable points, and keyboard/a11y support. First public release in ~4 weeks of focused solo work.

**Architecture:** SVG-based declarative components. A root `<Mafs>` component establishes an `<svg viewBox>` and publishes a coordinate-system context. Child components read context via `getContext()`, convert user-space coordinates to SVG space through pure math helpers, and render SVG primitives. Pan/zoom/drag are Svelte actions using Pointer Events with pointer capture. All reactivity via runes (`$state`, `$derived`, `$effect`) — no stores in the public API. Pure functions (vector/scalar math, sampling, intervals) live in `math.ts` / `vec.ts` and are 100% unit-tested before any component code is written.

**Tech Stack:**
- **Svelte 5** (runes mode) + **TypeScript strict**
- **Vite** (library mode for package build, app mode for demo site)
- **Vitest** (unit + component), **@testing-library/svelte** (DOM queries), **Playwright** (visual regression + drag e2e)
- **KaTeX 0.16** (build-time rendering for static labels, runtime for dynamic)
- **pnpm workspaces** — monorepo: `packages/svelte-mafs` (lib) + `apps/docs` (SvelteKit demo site)
- **Changesets** for versioned releases, **ESLint + Prettier** + **tsc --noEmit** in CI

**Naming note (decide before Task 1):** `svelte-mafs` is used throughout this plan. Check npm + trademark before locking in. Alternatives if Mafs author objects or the name is taken: `locus`, `axiom`, `chalkboard`, `plotfield`, `@<your-scope>/mafs`. The Mafs project is MIT, so a port is legally fine; courtesy: open a GitHub issue on mafs naming the port and linking back.

**Scope (in / out):**
- **IN:** `<Mafs>` root, Cartesian coordinates + grid, `<Plot.OfX/OfY/Parametric/Inequality/VectorField>`, `<Point>`, `<MovablePoint>`, `<Line.Segment/ThroughPoints/Parallel/etc>`, `<Vector>`, `<Circle>`, `<Ellipse>`, `<Polygon>`, `<Text>` (KaTeX), `<Transform>`, theme, pan/zoom, adaptive sampling, SSR-safe mount, a11y for movable points.
- **OUT of v1:** Polar coordinates, 3D, animation hooks (`useAnimatedValue`), `<Polar.OfR>`, heavy debug overlays. These are v1.1+.
- **OUT entirely:** AI/LLM/SymPy integration. This is a pure visualization library. Consumers (Brilliant-style apps) compose it with their own grading/AI layers.

**Success criteria (measurable):**
1. `pnpm test` passes: ≥95% line coverage on `math.ts`/`vec.ts`, ≥80% on components.
2. Playwright visual-regression suite: all Mafs homepage examples reproduced pixel-close (±2%) using Svelte equivalents.
3. Tree-shaken bundle: importing only `<Mafs>` + `<Plot.OfX>` ships <20 KB gzipped (excluding KaTeX).
4. Demo site deploys to Cloudflare Pages; all examples interactive offline (no network after first load).
5. Types: `pnpm typecheck` green with `strict: true`, `noUncheckedIndexedAccess: true`.

---

## Directory Layout (after Task 1)

```
svelte-mafs/
├── package.json                # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .github/workflows/ci.yml
├── packages/
│   └── svelte-mafs/
│       ├── package.json        # "name": "svelte-mafs", sideEffects: false
│       ├── src/
│       │   ├── index.ts        # re-exports
│       │   ├── math.ts         # pure: clamp, lerp, intervals, round-to-precision
│       │   ├── math.test.ts
│       │   ├── vec.ts          # pure: 2D vector ops
│       │   ├── vec.test.ts
│       │   ├── sampling.ts     # pure: adaptive curve sampling
│       │   ├── sampling.test.ts
│       │   ├── context/
│       │   │   ├── coordinate-context.ts   # setContext/getContext + types
│       │   │   └── pane-context.ts
│       │   ├── view/
│       │   │   ├── Mafs.svelte             # root <svg>, installs context
│       │   │   └── Viewport.svelte
│       │   ├── display/
│       │   │   ├── Point.svelte
│       │   │   ├── Line.svelte
│       │   │   ├── Vector.svelte
│       │   │   ├── Circle.svelte
│       │   │   ├── Ellipse.svelte
│       │   │   ├── Polygon.svelte
│       │   │   ├── Text.svelte
│       │   │   ├── Plot.svelte             # <Plot.OfX> etc. via namespace
│       │   │   ├── Coordinates.svelte      # Cartesian axes + grid
│       │   │   └── Transform.svelte
│       │   ├── interaction/
│       │   │   └── MovablePoint.svelte
│       │   ├── gestures/
│       │   │   ├── drag.ts                 # use:drag action
│       │   │   └── pan-zoom.ts             # use:panZoom action
│       │   ├── theme.ts                    # CSS custom properties
│       │   └── styles/
│       │       ├── core.css
│       │       └── font.css
│       ├── tests/
│       │   └── e2e/                        # Playwright specs
│       ├── vite.config.ts
│       └── vitest.config.ts
└── apps/
    └── docs/                               # SvelteKit demo site
```

---

## Phase 0 — Scaffolding (Day 1, ~4 hours)

### Task 0.1: Initialize repo + pnpm workspace

**Files:**
- Create: `/Users/joshhd/Documents/tinker/package.json`
- Create: `/Users/joshhd/Documents/tinker/pnpm-workspace.yaml`
- Create: `/Users/joshhd/Documents/tinker/.gitignore`
- Create: `/Users/joshhd/Documents/tinker/tsconfig.base.json`

**Step 1: git init + baseline**
```bash
cd /Users/joshhd/Documents/tinker
git init -b main
```

**Step 2: Write root `package.json`**
```json
{
  "name": "svelte-mafs-monorepo",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@changesets/cli": "^2.27.0"
  },
  "engines": { "node": ">=20.11" }
}
```

**Step 3: Write `pnpm-workspace.yaml`**
```yaml
packages:
  - "packages/*"
  - "apps/*"
```

**Step 4: Write `.gitignore`**
```
node_modules/
.DS_Store
dist/
build/
.svelte-kit/
coverage/
playwright-report/
test-results/
*.log
.env*
!.env.example
```

**Step 5: Write `tsconfig.base.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

**Step 6: Commit**
```bash
git add .
git commit -m "chore: initialize pnpm workspace with strict tsconfig"
```

---

### Task 0.2: Scaffold `packages/svelte-mafs`

**Files:**
- Create: `packages/svelte-mafs/package.json`
- Create: `packages/svelte-mafs/vite.config.ts`
- Create: `packages/svelte-mafs/vitest.config.ts`
- Create: `packages/svelte-mafs/tsconfig.json`
- Create: `packages/svelte-mafs/src/index.ts` (placeholder)

**Step 1: `packages/svelte-mafs/package.json`**
```json
{
  "name": "svelte-mafs",
  "version": "0.0.0",
  "description": "Svelte 5 components for interactive math visualization.",
  "license": "MIT",
  "type": "module",
  "sideEffects": ["**/*.css"],
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./core.css": "./dist/styles/core.css",
    "./font.css": "./dist/styles/font.css"
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build && svelte-package -o dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit && svelte-check --tsconfig ./tsconfig.json",
    "lint": "eslint src"
  },
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "svelte": "^5.0.0",
    "@sveltejs/package": "^2.3.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte-check": "^4.0.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "@testing-library/svelte": "^5.2.0",
    "@testing-library/jest-dom": "^6.5.0",
    "jsdom": "^25.0.0",
    "@playwright/test": "^1.48.0",
    "typescript": "^5.6.0"
  },
  "dependencies": {
    "katex": "^0.16.11"
  }
}
```

**Step 2: `vite.config.ts`** — lib mode
```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [svelte()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["svelte", "katex"],
    },
    sourcemap: true,
  },
});
```

**Step 3: `vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,svelte}"],
      exclude: ["src/**/*.test.ts", "src/test-setup.ts"],
    },
  },
});
```

**Step 4: `tsconfig.json`**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"]
}
```

**Step 5: `src/index.ts`** (placeholder)
```ts
export const VERSION = "0.0.0";
```

**Step 6: `src/test-setup.ts`**
```ts
import "@testing-library/jest-dom/vitest";
```

**Step 7: Install + verify**
```bash
cd /Users/joshhd/Documents/tinker
pnpm install
pnpm -F svelte-mafs typecheck
```
Expected: green.

**Step 8: Commit**
```bash
git add .
git commit -m "chore(svelte-mafs): scaffold lib with vite + vitest + playwright"
```

---

### Task 0.3: Scaffold `apps/docs` (SvelteKit demo site) — defer details

Placeholder SvelteKit app. We fully populate it in Phase 8; Phase 0 just gets a running app that imports the lib so we can `pnpm dev` and eyeball components as we build.

```bash
cd apps && pnpm create svelte@latest docs
# skeleton project, TypeScript yes, no ESLint/Prettier (we'll add monorepo-level)
```

Wire `"svelte-mafs": "workspace:*"` into `apps/docs/package.json`. Commit:
```bash
git add apps/docs
git commit -m "chore(docs): scaffold SvelteKit demo app"
```

---

## Phase 1 — Pure Math Core (Days 2–3)

Everything in this phase is pure functions: no Svelte, no DOM. TDD is cheap here — write the test, write the function, done. These become the bedrock that every component depends on, so bugs caught here never surface later.

`★ Insight ─────────────────────────────────────`
- Why pure functions first: component tests are slow (jsdom mount, Svelte lifecycle). Unit tests on pure math run at ~10,000/sec. If coordinate transforms have a bug, we want a test named `mapsUserSpaceToScreenSpace_flipsYAxis` to fail — not a visual regression diff of `<Plot>` that leaves you guessing what broke.
- We deliberately copy Mafs' `math.ts` and `vec.ts` APIs nearly verbatim. Staying source-compatible at the math layer means anyone porting a Mafs example to Svelte can paste their math helpers unchanged, and when Mafs adds a new sampling trick we can crib it in an afternoon.
`─────────────────────────────────────────────────`

### Task 1.1: `vec.ts` — 2D vector utilities

**Files:**
- Create: `packages/svelte-mafs/src/vec.ts`
- Create: `packages/svelte-mafs/src/vec.test.ts`

**Step 1: Write failing tests first** — `vec.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { add, sub, scale, dot, mag, normalize, rotate, lerp, type Vec2 } from "./vec";

describe("vec", () => {
  it("add: adds componentwise", () => {
    expect(add([1, 2], [3, 4])).toEqual([4, 6]);
  });
  it("sub: subtracts componentwise", () => {
    expect(sub([5, 7], [2, 3])).toEqual([3, 4]);
  });
  it("scale: multiplies both components by scalar", () => {
    expect(scale([1, 2], 3)).toEqual([3, 6]);
  });
  it("dot: Euclidean dot product", () => {
    expect(dot([1, 2], [3, 4])).toBe(11);
  });
  it("mag: Euclidean magnitude", () => {
    expect(mag([3, 4])).toBe(5);
  });
  it("normalize: returns unit vector", () => {
    const [x, y] = normalize([3, 4]);
    expect(x).toBeCloseTo(0.6);
    expect(y).toBeCloseTo(0.8);
  });
  it("normalize: zero vector returns zero", () => {
    expect(normalize([0, 0])).toEqual([0, 0]);
  });
  it("rotate: rotates by radians ccw", () => {
    const [x, y] = rotate([1, 0], Math.PI / 2);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
  });
  it("lerp: linear interpolation t=0.5", () => {
    expect(lerp([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
  });
});
```

**Step 2: Run — expect FAIL**
```bash
pnpm -F svelte-mafs test vec
```
Expected: module-not-found errors.

**Step 3: Implement** — `vec.ts`
```ts
export type Vec2 = readonly [number, number];

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];
export const dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];
export const mag = (a: Vec2): number => Math.hypot(a[0], a[1]);

export const normalize = (a: Vec2): Vec2 => {
  const m = mag(a);
  return m === 0 ? [0, 0] : [a[0] / m, a[1] / m];
};

export const rotate = (a: Vec2, rad: number): Vec2 => {
  const c = Math.cos(rad), s = Math.sin(rad);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};

export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
```

**Step 4: Run — expect PASS**

**Step 5: Commit**
```bash
git add packages/svelte-mafs/src/vec.*
git commit -m "feat(svelte-mafs): vec.ts — 2D vector primitives with tests"
```

---

### Task 1.2: `math.ts` — scalar + interval helpers

**Files:**
- Create: `packages/svelte-mafs/src/math.ts`
- Create: `packages/svelte-mafs/src/math.test.ts`

Mirror Mafs' `math.ts`: `clamp`, `nearestPowerOfTen`, `snapAngleToDegrees`, `round`, `mapRange`, `inferLabels` (tick generation). TDD each: write test, implement, commit. Roughly 8 small functions, ~2 hours total. One commit per function for clean history.

Key one to get right: `mapRange(value, fromMin, fromMax, toMin, toMax)` — this is the guts of the coordinate transform. Test both the forward and inverse case, plus edge cases (zero-width range should return `toMin`).

---

### Task 1.3: `sampling.ts` — adaptive curve sampling

**Files:**
- Create: `packages/svelte-mafs/src/sampling.ts`
- Create: `packages/svelte-mafs/src/sampling.test.ts`

This is the non-obvious one. Naive uniform sampling of `y = f(x)` at e.g. 200 points aliases hard on functions like `sin(1/x)` near 0, and wastes points on flat regions. Mafs uses **recursive midpoint subdivision with a curvature-based threshold**: sample endpoints + midpoint, if the midpoint's y-value deviates from the linear interpolation of the endpoints by more than `tolerance * viewportHeight`, recurse on both halves; else stop.

**Tests to write first:**
- `samples a linear function at exactly 3 points (endpoints + midpoint, midpoint lies on line, no recursion)`
- `samples sin(x) over [0, 2π] with more density near crests`
- `handles discontinuities (f returns NaN) by producing gaps, not interpolating through`
- `respects maxDepth so pathological functions (1/x near 0) terminate`

```ts
export interface SampleOptions {
  readonly domain: readonly [number, number];
  readonly tolerance: number;   // in user-space y units
  readonly maxDepth: number;    // recursion cap
}
export function sample(f: (x: number) => number, opts: SampleOptions): Array<readonly [number, number]> {
  /* recursive subdivision */
}
```

Commit per-function. Budget: 2–3 hours (this is the algorithmic heart, worth slowing down for).

---

## Phase 2 — Root + Coordinate Context (Days 4–5)

### Task 2.1: Define coordinate-context types

**File:** `packages/svelte-mafs/src/context/coordinate-context.ts`

```ts
import type { Vec2 } from "../vec.js";
import { getContext, setContext } from "svelte";

const KEY = Symbol("mafs.coord");

export interface CoordContext {
  readonly userToPx: (user: Vec2) => Vec2;   // math space -> SVG px
  readonly pxToUser: (px: Vec2) => Vec2;     // inverse (for drag)
  readonly viewBox: { xMin: number; xMax: number; yMin: number; yMax: number };
  readonly widthPx: number;
  readonly heightPx: number;
}

export const setCoordContext = (ctx: CoordContext) => setContext(KEY, ctx);
export const getCoordContext = (): CoordContext => {
  const ctx = getContext<CoordContext | undefined>(KEY);
  if (!ctx) throw new Error("<Mafs> context missing. Wrap your component in <Mafs>.");
  return ctx;
};
```

**Test:** unit-test `userToPx` / `pxToUser` round-trip with specific view boxes. Commit.

---

### Task 2.2: `<Mafs>` root component

**File:** `packages/svelte-mafs/src/view/Mafs.svelte`

Props: `width` (number | "auto"), `height`, `viewBox: { x: [min,max], y: [min,max] }`, `preserveAspectRatio: boolean`, `pan: boolean`, `zoom: boolean | { min, max }`.

Behavior:
1. `$state` for the current viewBox (pan/zoom mutate this).
2. `$derived` for `userToPx` / `pxToUser` functions (recompute when viewBox or dims change).
3. Wrap children in `<svg viewBox="..." style="aspect-ratio: w/h">` with an inner `<g transform="scale(1, -1)">` so children can use y-up math coordinates.
4. Publish context via `setCoordContext`.

**Test plan (component):** mount `<Mafs width={400} height={300} viewBox={{x:[-5,5], y:[-5,5]}}/>` with a child that prints `userToPx([0,0])` — assert it's `[200, 150]`. Assert `pxToUser([200, 150])` is `[0, 0]`. Commit.

`★ Insight ─────────────────────────────────────`
- **Why the `<g transform="scale(1,-1)">` wrapper**: SVG's native y-axis points down (screen convention), math convention is y-up. Flipping once at the root means every child component can write SVG as if positive y goes up, which matches what users think when they read `<Point x={0} y={3}>`. Without this flip, every single component needs to negate its y coord — and someone will forget.
- **Trade-off**: the flip also mirrors text. So `<Text>` will apply a `scale(1,-1)` back to itself before rendering. We isolate that one awkwardness into the `Text` component rather than spraying sign-flips across every other component.
`─────────────────────────────────────────────────`

---

### Task 2.3: Pan + zoom gesture action

**File:** `packages/svelte-mafs/src/gestures/pan-zoom.ts`

```ts
export interface PanZoomOptions {
  onPan: (delta: Vec2 /* in user space */) => void;
  onZoom: (factor: number, centerPx: Vec2) => void;
  enabled: { pan: boolean; zoom: boolean };
}
export function panZoom(node: SVGSVGElement, opts: PanZoomOptions) {
  /* pointerdown/move/up, wheel, pointer capture */
  return { update(newOpts: PanZoomOptions) { /* ... */ }, destroy() { /* ... */ } };
}
```

**Tests:** use Playwright, not jsdom — pointer events with capture are flaky in jsdom. Spec: open `/test/pan-zoom-fixture` page in docs app, drag with pointer, assert viewBox in DOM attribute changed. Commit.

---

## Phase 3 — Display Primitives (Days 6–8)

One commit per component. For each: prop contract → snapshot test → implementation → visual-regression screenshot.

**Component order (easiest to hardest):**
1. `<Point>` — single `<circle>` at transformed coords
2. `<Line.Segment>` — two endpoints, one `<line>`
3. `<Line.ThroughPoints>` — extends to viewBox edges (needs `math.ts` clip-to-rect)
4. `<Circle>` — center + radius
5. `<Ellipse>`
6. `<Polygon>` — array of points, one `<polygon>`
7. `<Vector>` — line + arrowhead (SVG marker)
8. `<Text>` — KaTeX via `katex.renderToString`, injected as `<foreignObject>`

**Shared pattern for each:**
```svelte
<!-- Point.svelte -->
<script lang="ts">
  import { getCoordContext } from "../context/coordinate-context.js";
  import type { Vec2 } from "../vec.js";

  interface Props {
    x: number;
    y: number;
    color?: string;
    opacity?: number;
    svg?: Partial<SVGCircleElement>;
  }
  let { x, y, color = "var(--mafs-fg)", opacity = 1 }: Props = $props();

  const ctx = getCoordContext();
  let px = $derived(ctx.userToPx([x, y]));
</script>

<circle cx={px[0]} cy={px[1]} r="4" fill={color} fill-opacity={opacity} />
```

**Test for each (component test, vitest + @testing-library/svelte):**
```ts
it("renders at correct pixel position", async () => {
  const { container } = render(Mafs, {
    props: { width: 400, height: 300, viewBox: { x: [-5,5], y: [-5,5] } },
    children: () => [Point, { x: 1, y: 2 }],
  });
  const circle = container.querySelector("circle")!;
  expect(circle.getAttribute("cx")).toBe("240");
  expect(circle.getAttribute("cy")).toBe("90");
});
```

(Note: `children` / snippet syntax in Svelte 5 tests is still evolving — may need Playwright fallback if vitest-svelte snippet rendering hits issues. Reassess at Task 2.2.)

Commit after each component. Visual-regression screenshot (Playwright) added per-component on the demo site once `<Coordinates>` exists (Task 3.9).

---

### Task 3.9: `<Coordinates>` + grid

**File:** `packages/svelte-mafs/src/display/Coordinates.svelte`

Props: `xAxis: boolean | AxisConfig`, `yAxis: boolean | AxisConfig`, `grid: boolean`, `subdivisions: number`.
Uses `math.ts` tick-label inference to pick nice multiples. Renders axes + labels (via `<Text>`) + grid lines.

Once this lands, enable visual-regression screenshots for all prior primitives on the docs site.

---

## Phase 4 — Plot Components (Days 9–11)

`<Plot>` is a namespace object, not a single component. In Svelte 5 we export it as an object of components:

```ts
// display/Plot.svelte.ts (note: .svelte.ts for runes)
export { default as OfX } from "./plot-of-x.svelte";
export { default as OfY } from "./plot-of-y.svelte";
export { default as Parametric } from "./plot-parametric.svelte";
export { default as Inequality } from "./plot-inequality.svelte";
export { default as VectorField } from "./plot-vector-field.svelte";
```

Consumer API:
```svelte
<script>
  import { Mafs, Coordinates, Plot } from "svelte-mafs";
</script>
<Mafs>
  <Coordinates.Cartesian />
  <Plot.OfX y={(x) => Math.sin(x)} color="blue" />
</Mafs>
```

**Each Plot variant is one task:**
- 4.1 `Plot.OfX` — sample via `sampling.sample`, render `<path>` with `d` string built from `userToPx` mapped samples
- 4.2 `Plot.OfY` — rotate axes conceptually; reuse `OfX` with swapped args
- 4.3 `Plot.Parametric` — `(t) => [x, y]`, sample on `t`
- 4.4 `Plot.Inequality` — fill region; harder, defer if time tight
- 4.5 `Plot.VectorField` — grid of arrows; reuse `<Vector>`

Each: test first (assert path `d` attribute has expected number of segments for a known function), then implement, then Playwright screenshot.

---

## Phase 5 — MovablePoint (Days 12–13)

**File:** `packages/svelte-mafs/src/interaction/MovablePoint.svelte`

Props:
- `x`, `y` (bindable: `bind:x={pointX}`)
- `constrain?: (p: Vec2) => Vec2` (snap to grid, to line, etc.)
- `color?`

Uses `use:drag` action (Phase 5 also ships the action).

**Accessibility (non-negotiable):**
- `role="slider"`, `aria-valuenow-x/y`, `tabindex="0"`
- Arrow keys move point by 1 unit (shift = 10)
- Focus ring via CSS
- Announce value changes via `aria-live="polite"` region at root

### Task 5.1: `use:drag` action

```ts
// gestures/drag.ts
export interface DragOptions {
  onDragStart?: (userPos: Vec2) => void;
  onDrag: (userPos: Vec2) => void;
  onDragEnd?: () => void;
  pxToUser: (px: Vec2) => Vec2;
}
export function drag(node: SVGElement, opts: DragOptions) { /* ... */ }
```

Tests: Playwright — click-drag over a fixture, assert `onDrag` callback received correct user-space coords.

### Task 5.2: `<MovablePoint>` component
TDD: start with a test "dragging updates bound value". Component is ~80 lines. Keyboard handling is a separate test case.

`★ Insight ─────────────────────────────────────`
- **Why make `x,y` bindable instead of managed internally**: Svelte 5's `$bindable()` lets consumers write `<MovablePoint bind:x={pointX} bind:y={pointY}>` and reactively reflect the position anywhere. This is cleaner than Mafs' React approach of returning a hook (`const point = useMovablePoint(...)`), and it's the idiomatic Svelte way — the component becomes a form control, essentially.
- **Constraint functions are the real pedagogy tool**: `constrain={(p) => [Math.round(p[0]), Math.round(p[1])]}` snaps to grid. `constrain={(p) => [p[0], f(p[0])]}` snaps to a curve. This is what turns a draggable dot into an educational interaction (e.g. "drag the point along the curve"). We ship 4 prebuilt constraints: `snapToGrid`, `snapToLine`, `snapToCurve`, `clamp`.
`─────────────────────────────────────────────────`

---

## Phase 6 — Transform, Theme, Polish (Days 14–15)

### Task 6.1: `<Transform>` — matrix group
Wraps children in `<g transform="matrix(...)">`. Props take an affine matrix; shortcut helpers `Transform.translate`, `Transform.rotate`, `Transform.scale` as named-export object (same pattern as `Plot`). Children are transformed in user-space, with the transform applied before the Mafs y-flip so rotations work the intuitive way.

### Task 6.2: Theme tokens (`theme.ts` + `core.css`)
CSS custom properties: `--mafs-fg`, `--mafs-bg`, `--mafs-line-color`, `--mafs-grid-color`, `--mafs-blue`, `--mafs-red`, etc. Light + dark variants via `:where([data-theme="dark"]) .mafs-root { ... }`. No JS theme switcher — consumers toggle `data-theme` on an ancestor.

### Task 6.3: `<Text>` with KaTeX
`<Text x={1} y={1} latex="\int_0^1 x^2\,dx" />`. Builds on KaTeX's `renderToString` at component-mount, injects into `<foreignObject>` so SVG can contain HTML. Counter-flip y with inner `<div style="transform: scale(1, -1)">`.

---

## Phase 7 — E2E + Visual Regression Harness (Day 16)

### Task 7.1: Playwright config
```ts
// playwright.config.ts
export default {
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:5173" },
  webServer: { command: "pnpm -F docs dev", port: 5173 },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-14", use: { ...devices["iPhone 14"] } },
  ],
};
```

### Task 7.2: Port Mafs' 12 homepage examples
One fixture page per example in `apps/docs/src/routes/examples/<slug>/+page.svelte`. Playwright spec takes a screenshot, compares against committed baseline. Threshold: 2% pixel diff (fonts, antialiasing).

### Task 7.3: Drag e2e tests
Real pointer drag over `MovablePoint` fixtures — assert final position, keyboard nav, constrained drag stays on curve.

---

## Phase 8 — Docs Site (Days 17–20)

SvelteKit app at `apps/docs`:
- **Home**: hero with 3 live examples from Phase 7 fixtures
- **Getting Started**: install, first component, pitfalls
- **API**: one page per component, auto-generated from JSDoc via `@svelte-docgen/cli`
- **Examples**: every Phase 7 fixture, with "copy code" button
- **Theme playground**: CSS custom property editor with live preview

Deploy to **Cloudflare Pages** (fits your stack). Add GitHub Action for preview deployments per PR.

---

## Phase 9 — Release Prep (Day 21)

### Task 9.1: Changesets
```bash
pnpm -w add -D @changesets/cli
pnpm changeset init
```
Configure `baseBranch: main`, `access: public`.

### Task 9.2: CI workflow — `.github/workflows/ci.yml`
Matrix: Node 20 + 22. Jobs: `lint`, `typecheck`, `test:unit`, `test:e2e`, `build`. Release job on `main` via `changesets/action@v1` publishing to npm.

### Task 9.3: README + CONTRIBUTING + LICENSE
- README: hero example (copy-pasteable), install, links to docs, credit Mafs (MIT) prominently
- CONTRIBUTING: TDD expectation, commit-per-component, how to run visual regressions, how to update baselines
- LICENSE: MIT
- NOTICE: credit Steven Petryk / Mafs for API inspiration

### Task 9.4: npm publish dry-run
```bash
pnpm -F svelte-mafs build
pnpm -F svelte-mafs publish --dry-run --access=public
```
Verify `dist/` contents, exports map resolves, types ship, no source maps leak credentials.

### Task 9.5: v0.1.0 tag + announce
- `pnpm changeset version && pnpm changeset publish`
- Post on X, r/sveltejs, r/math, HN ("Show HN: Svelte-native port of Mafs")
- File a courtesy GitHub issue on `stevenpetryk/mafs` linking the port

---

## Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Svelte 5 runes + snippet APIs still churning in stable | Low-med | Pin exact Svelte version in peerDeps; re-audit weekly |
| `@testing-library/svelte` lags Svelte 5 snippet support | Med | Fall back to Playwright for component tests that need snippets |
| Adaptive sampling has edge cases (discontinuities, vertical asymptotes) | Med | Dedicated test suite with pathological fns (tan, 1/x, step); borrow Mafs' algorithm verbatim |
| Bundle size blows past 20 KB | Low | `sideEffects: false`, named exports only, no barrel-re-export of KaTeX |
| KaTeX as dep adds 280 KB | Known | Keep as peerDep, document in README, consider build-time static rendering for docs site |
| Mafs author dislikes "svelte-mafs" name | Low | Have fallback (`locus` / `axiom`) ready; open courtesy issue early in Phase 0 |
| You run out of steam at Phase 4 (Plot) | Med | Phases 1–3 alone ship a useful lib (points, lines, polygons, circles, axes) — that's already past MVP for many Brilliant-style problems |

---

## Estimate Summary

| Phase | Days | What ships |
|-------|------|-----------|
| 0. Scaffold | 1 | Monorepo, lib package, docs shell |
| 1. Pure math core | 2 | vec, math, sampling — all tested |
| 2. Root + context | 2 | `<Mafs>`, coord context, pan/zoom |
| 3. Primitives | 3 | Point, Line, Circle, Ellipse, Polygon, Vector, Text, Coordinates |
| 4. Plots | 3 | Plot.OfX/OfY/Parametric/Inequality/VectorField |
| 5. MovablePoint | 2 | Drag action, keyboard, a11y |
| 6. Transform + theme | 2 | Matrix, CSS tokens, KaTeX text |
| 7. E2E harness | 1 | Playwright + visual regression baselines |
| 8. Docs site | 4 | Deployed to Cloudflare Pages |
| 9. Release | 1 | v0.1.0 on npm |
| **Total** | **21 days** | **Production v0.1.0** |

Realistic solo calendar time: **4–6 weeks** accounting for context switches, Svelte 5 API surprises, and content site polish.

---

## Execution Handoff

**Which approach do you want?**

1. **Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good for Phase 0–1 where every decision compounds.
2. **Parallel Session (separate)** — You open a new Claude Code session in this directory with `/executing-plans`, batch execution with checkpoints. Good if you want to start now and check in later.
