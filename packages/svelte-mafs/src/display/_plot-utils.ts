import type { Sample } from "../sampling.js";

/**
 * Build an SVG `d` string from 2-D samples.
 *
 * Uses explicit `M x y L x y` form (no H/V shortcuts) so tests can count
 * segments by regex and so NaN-marker points break the stroke cleanly:
 * a non-finite coordinate flushes the current sub-path and forces the next
 * finite point to emit a fresh `M`.
 */
export const buildPath = (samples: readonly Sample[]): string => {
  const parts: string[] = [];
  let pendingMove = true;
  for (const [x, y] of samples) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      pendingMove = true;
      continue;
    }
    parts.push(`${pendingMove ? "M" : "L"} ${x} ${y}`);
    pendingMove = false;
  }
  return parts.join(" ");
};

/**
 * A tolerance that trades acceptable error (in user-y units) for fewer
 * samples. 500 subdivisions worth of resolution across the visible y-span
 * is imperceptible at any reasonable Mafs size.
 */
export const defaultTolerance = (ySpan: number): number => ySpan / 500;

export type StrokeStyle = "solid" | "dashed" | "dotted";

/** Map style token to an SVG stroke-dasharray. Null → no dasharray attr. */
export const dashArrayFor = (style: StrokeStyle): string | null => {
  if (style === "dashed") return "6 6";
  if (style === "dotted") return "2 4";
  return null;
};
