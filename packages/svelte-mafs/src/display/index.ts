// Shared barrel for display/ components. Append-only — each stream adds
// its own re-exports below, captain serializes merges.

// Stream 6 — text + affine transforms
export { default as Text } from "./Text.svelte";
export { default as Transform } from "./Transform.svelte";
// Matrix helpers as a namespace so `Matrix.rotate(...)` can coexist with
// vec.ts's `rotate`, `scale`, `translate` at the top-level entrypoint.
// Sourced from matrix.ts rather than Transform.svelte.ts to avoid the
// TypeScript bundler-resolution conflict on `./Transform.svelte`.
export * as Matrix from "./matrix.js";
