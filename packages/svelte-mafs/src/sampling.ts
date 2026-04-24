export interface SampleOptions {
  readonly domain: readonly [number, number];
  /** Max allowed y-deviation (user units) from linear interpolation before subdividing further. */
  readonly tolerance: number;
  /** Recursion cap. Protects against pathological functions (1/x, sin(1/x)). */
  readonly maxDepth: number;
  /**
   * Force unconditional recursion to this depth before applying the flatness check.
   * Catches symmetric features (e.g. a full period of sin where both endpoints and the
   * midpoint all happen to sit at zero). Default 4 → 17 initial samples.
   */
  readonly minDepth?: number;
}

export type Sample = readonly [number, number];

// Treat values beyond this magnitude as asymptotic — emit a NaN gap instead.
// Useful for tan(x) near π/2 where Math.tan returns ~1.6e16 (finite but useless).
const DIVERGENCE_THRESHOLD = 1e10;

/**
 * Adaptive midpoint-subdivision sampler for y = f(x).
 *
 * For each interval [x0, x1], evaluates the midpoint xm. If f(xm) is within
 * `tolerance` of the chord through (x0, f(x0)) and (x1, f(x1)) the segment is
 * flat enough and we emit three points. Otherwise we recurse on both halves
 * until either flat or `maxDepth` is hit. The first `minDepth` levels are
 * subdivided unconditionally so the sampler can find features the chord check
 * would miss (e.g. symmetric bumps at the midpoint).
 *
 * Non-finite values, or values exceeding DIVERGENCE_THRESHOLD, produce a
 * `[x, NaN]` marker so downstream path builders break the stroke into segments.
 */
export const sample = (
  f: (x: number) => number,
  opts: SampleOptions,
): Sample[] => {
  let [x0, x1] = opts.domain;
  if (x0 > x1) [x0, x1] = [x1, x0];
  if (x0 === x1) return [[x0, f(x0)]];

  const { tolerance, maxDepth } = opts;
  const minDepth = opts.minDepth ?? 4;

  const gap = (xL: number, yL: number, xm: number, xR: number, yR: number): Sample[] => [
    [xL, yL],
    [xm, Number.NaN],
    [xR, yR],
  ];

  const subdivide = (
    xL: number,
    yL: number,
    xR: number,
    yR: number,
    depth: number,
  ): Sample[] => {
    const xm = (xL + xR) / 2;
    const ym = f(xm);

    if (!Number.isFinite(ym) || Math.abs(ym) > DIVERGENCE_THRESHOLD) {
      return gap(xL, yL, xm, xR, yR);
    }

    if (depth < minDepth) {
      const left = subdivide(xL, yL, xm, ym, depth + 1);
      const right = subdivide(xm, ym, xR, yR, depth + 1);
      return [...left, ...right.slice(1)];
    }

    const lerpY = (yL + yR) / 2;
    const flat =
      Number.isFinite(yL) &&
      Number.isFinite(yR) &&
      Math.abs(ym - lerpY) < tolerance;

    if (flat || depth >= maxDepth) {
      return [
        [xL, yL],
        [xm, ym],
        [xR, yR],
      ];
    }

    const left = subdivide(xL, yL, xm, ym, depth + 1);
    const right = subdivide(xm, ym, xR, yR, depth + 1);
    return [...left, ...right.slice(1)];
  };

  return subdivide(x0, f(x0), x1, f(x1), 0);
};
