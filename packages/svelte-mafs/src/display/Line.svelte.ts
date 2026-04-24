// Namespace module for the `<Line.*>` family. Consumers import it as
// `import { Line } from "svelte-mafs"` and write `<Line.Segment ...>` /
// `<Line.ThroughPoints ...>`; the re-export chain in display/index.ts uses
// `export * as Line` so named exports here become properties on the
// imported `Line` namespace.
//
// Parallel / Perpendicular variants are marked optional-v1 in the master
// plan and will land in a follow-up stream.

export { default as Segment } from "./line-segment.svelte";
export { default as ThroughPoints } from "./line-through-points.svelte";
