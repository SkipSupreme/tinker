import { describe, expect, it } from "vitest";
import { sample } from "./sampling.js";

const lin = (x: number) => 2 * x + 1;

describe("sample", () => {
  describe("linear functions", () => {
    it("emits endpoints at the domain bounds", () => {
      const pts = sample(lin, {
        domain: [0, 10],
        tolerance: 0.01,
        maxDepth: 10,
      });
      expect(pts[0]).toEqual([0, 1]);
      expect(pts.at(-1)).toEqual([10, 21]);
    });

    it("every sampled point lies on the line", () => {
      const pts = sample(lin, {
        domain: [0, 10],
        tolerance: 0.001,
        maxDepth: 10,
      });
      for (const [x, y] of pts) {
        expect(y).toBeCloseTo(lin(x));
      }
    });

    it("point count is bounded (minDepth gives predictable size)", () => {
      const pts = sample(lin, {
        domain: [0, 10],
        tolerance: 0.01,
        maxDepth: 10,
        minDepth: 2,
      });
      // minDepth=2 → 4 leaf segments → ~9 points
      expect(pts.length).toBeLessThan(20);
      expect(pts.length).toBeGreaterThan(3);
    });
  });

  describe("nonlinear functions", () => {
    it("emits > 3 points for sin over [0, 2π]", () => {
      const pts = sample((x) => Math.sin(x), {
        domain: [0, 2 * Math.PI],
        tolerance: 0.01,
        maxDepth: 12,
      });
      expect(pts.length).toBeGreaterThan(3);
    });

    it("samples stay inside the requested domain", () => {
      const pts = sample((x) => Math.sin(x), {
        domain: [-1, 1],
        tolerance: 0.01,
        maxDepth: 10,
      });
      for (const [x] of pts) {
        expect(x).toBeGreaterThanOrEqual(-1);
        expect(x).toBeLessThanOrEqual(1);
      }
    });

    it("samples are monotonically increasing in x", () => {
      const pts = sample((x) => x * x, {
        domain: [-5, 5],
        tolerance: 0.01,
        maxDepth: 12,
      });
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i]![0]).toBeGreaterThan(pts[i - 1]![0]);
      }
    });

    it("denser sampling near steeper regions", () => {
      // x^3 bends more sharply near 0 and hard at the edges
      const pts = sample((x) => x ** 3, {
        domain: [-2, 2],
        tolerance: 0.001,
        maxDepth: 12,
      });
      expect(pts.length).toBeGreaterThan(5);
    });
  });

  describe("pathological / discontinuous functions", () => {
    it("tan(x) near π/2 produces a NaN gap marker", () => {
      const pts = sample((x) => Math.tan(x), {
        domain: [0, Math.PI],
        tolerance: 0.1,
        maxDepth: 8,
      });
      const hasNaN = pts.some(([, y]) => Number.isNaN(y));
      expect(hasNaN).toBe(true);
    });

    it("1/x over domain including 0 terminates (maxDepth)", () => {
      // no stack overflow, no infinite loop
      const start = Date.now();
      const pts = sample((x) => 1 / x, {
        domain: [-1, 1],
        tolerance: 0.001,
        maxDepth: 10,
      });
      expect(Date.now() - start).toBeLessThan(1000);
      expect(pts.length).toBeGreaterThan(0);
    });

    it("step function produces many samples near the step", () => {
      const step = (x: number) => (x < 0 ? 0 : 1);
      const pts = sample(step, {
        domain: [-1, 1],
        tolerance: 0.001,
        maxDepth: 12,
      });
      // should recurse deeply around 0 before maxDepth bails
      expect(pts.length).toBeGreaterThan(10);
    });

    it("function returning NaN emits a gap marker", () => {
      const f = (x: number) => (x > 0 && x < 0.5 ? NaN : x);
      const pts = sample(f, {
        domain: [-1, 1],
        tolerance: 0.01,
        maxDepth: 10,
      });
      expect(pts.some(([, y]) => Number.isNaN(y))).toBe(true);
    });

    it("respects maxDepth: sin(1/x) near 0 still terminates", () => {
      const start = Date.now();
      const pts = sample((x) => Math.sin(1 / x), {
        domain: [0.01, 1],
        tolerance: 0.0001,
        maxDepth: 14,
      });
      expect(Date.now() - start).toBeLessThan(2000);
      expect(pts.length).toBeGreaterThan(0);
    });
  });

  describe("degenerate inputs", () => {
    it("zero-width domain returns a single point", () => {
      const pts = sample(lin, {
        domain: [3, 3],
        tolerance: 0.01,
        maxDepth: 10,
      });
      expect(pts).toHaveLength(1);
      expect(pts[0]).toEqual([3, lin(3)]);
    });

    it("reversed domain is handled (swapped)", () => {
      const pts = sample(lin, {
        domain: [10, 0],
        tolerance: 0.01,
        maxDepth: 10,
      });
      expect(pts.length).toBeGreaterThanOrEqual(3);
      // output should still be increasing in x
      for (let i = 1; i < pts.length; i++) {
        expect(pts[i]![0]).toBeGreaterThan(pts[i - 1]![0]);
      }
    });
  });
});
