import { describe, expect, it } from "vitest";
import {
  add,
  sub,
  scale,
  dot,
  mag,
  normalize,
  rotate,
  lerp,
  type Vec2,
} from "./vec.js";

describe("vec", () => {
  describe("add", () => {
    it("adds componentwise", () => {
      expect(add([1, 2], [3, 4])).toEqual([4, 6]);
    });
    it("handles negatives", () => {
      expect(add([-1, -2], [3, 4])).toEqual([2, 2]);
    });
    it("zero vector is identity", () => {
      expect(add([5, 7], [0, 0])).toEqual([5, 7]);
    });
  });

  describe("sub", () => {
    it("subtracts componentwise", () => {
      expect(sub([5, 7], [2, 3])).toEqual([3, 4]);
    });
    it("self-subtraction is zero", () => {
      expect(sub([9, -3], [9, -3])).toEqual([0, 0]);
    });
  });

  describe("scale", () => {
    it("multiplies both components by scalar", () => {
      expect(scale([1, 2], 3)).toEqual([3, 6]);
    });
    it("zero scalar yields zero", () => {
      expect(scale([4, 5], 0)).toEqual([0, 0]);
    });
    it("negative scalar flips direction", () => {
      expect(scale([1, 2], -1)).toEqual([-1, -2]);
    });
  });

  describe("dot", () => {
    it("Euclidean dot product", () => {
      expect(dot([1, 2], [3, 4])).toBe(11);
    });
    it("perpendicular vectors dot to 0", () => {
      expect(dot([1, 0], [0, 1])).toBe(0);
    });
    it("parallel unit vectors dot to 1", () => {
      expect(dot([1, 0], [1, 0])).toBe(1);
    });
  });

  describe("mag", () => {
    it("Euclidean magnitude of 3-4-5 triangle", () => {
      expect(mag([3, 4])).toBe(5);
    });
    it("zero vector has magnitude 0", () => {
      expect(mag([0, 0])).toBe(0);
    });
    it("uses hypot so large values don't overflow", () => {
      // Math.sqrt(a*a + b*b) would overflow for 1e200 components.
      expect(mag([1e200, 1e200])).toBeLessThan(Infinity);
    });
  });

  describe("normalize", () => {
    it("returns unit vector", () => {
      const [x, y] = normalize([3, 4]);
      expect(x).toBeCloseTo(0.6);
      expect(y).toBeCloseTo(0.8);
    });
    it("zero vector returns zero (no NaN)", () => {
      expect(normalize([0, 0])).toEqual([0, 0]);
    });
    it("normalized vector has magnitude 1", () => {
      expect(mag(normalize([7, -11]))).toBeCloseTo(1);
    });
  });

  describe("rotate", () => {
    it("rotates +x-axis by π/2 ccw → +y-axis", () => {
      const [x, y] = rotate([1, 0], Math.PI / 2);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(1);
    });
    it("rotates by π flips direction", () => {
      const [x, y] = rotate([1, 0], Math.PI);
      expect(x).toBeCloseTo(-1);
      expect(y).toBeCloseTo(0);
    });
    it("rotating by 0 is identity", () => {
      const [x, y] = rotate([3, 4], 0);
      expect(x).toBeCloseTo(3);
      expect(y).toBeCloseTo(4);
    });
    it("rotation preserves magnitude", () => {
      const v: Vec2 = [3, 4];
      expect(mag(rotate(v, 1.23))).toBeCloseTo(mag(v));
    });
  });

  describe("lerp", () => {
    it("t=0 returns a", () => {
      expect(lerp([1, 2], [10, 20], 0)).toEqual([1, 2]);
    });
    it("t=1 returns b", () => {
      expect(lerp([1, 2], [10, 20], 1)).toEqual([10, 20]);
    });
    it("t=0.5 returns midpoint", () => {
      expect(lerp([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
    });
    it("t>1 extrapolates", () => {
      expect(lerp([0, 0], [10, 20], 2)).toEqual([20, 40]);
    });
    it("t<0 extrapolates backwards", () => {
      expect(lerp([0, 0], [10, 20], -0.5)).toEqual([-5, -10]);
    });
  });
});
