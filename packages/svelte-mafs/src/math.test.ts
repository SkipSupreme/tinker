import { describe, expect, it } from "vitest";
import {
  clamp,
  round,
  mapRange,
  nearestPowerOfTen,
  snapAngleToDegrees,
  inferLabels,
} from "./math.js";

describe("clamp", () => {
  it("returns value when in range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below min", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it("clamps above max", () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });
  it("handles equal min and max", () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });
  it("handles negative range", () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-20, -10, -1)).toBe(-10);
  });
});

describe("round", () => {
  it("rounds to integer by default", () => {
    expect(round(1.7)).toBe(2);
    expect(round(1.4)).toBe(1);
  });
  it("rounds to given decimal places", () => {
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(1.23556, 2)).toBe(1.24);
  });
  it("handles negatives", () => {
    expect(round(-1.5, 0)).toBe(-1); // banker's? JS Math.round rounds -1.5 to -1
    expect(round(-1.23456, 2)).toBe(-1.23);
  });
  it("precision=0 same as default", () => {
    expect(round(3.7, 0)).toBe(4);
  });
});

describe("mapRange", () => {
  it("maps linearly between ranges", () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
  });
  it("midpoint maps to midpoint", () => {
    expect(mapRange(0, -5, 5, 0, 200)).toBe(100);
  });
  it("inverse mapping (flip)", () => {
    expect(mapRange(0, 0, 10, 100, 0)).toBe(100);
    expect(mapRange(10, 0, 10, 100, 0)).toBe(0);
  });
  it("zero-width source range returns target min", () => {
    expect(mapRange(5, 5, 5, 0, 100)).toBe(0);
  });
  it("extrapolates outside source range", () => {
    expect(mapRange(15, 0, 10, 0, 100)).toBe(150);
    expect(mapRange(-5, 0, 10, 0, 100)).toBe(-50);
  });
  it("forward and inverse round-trip", () => {
    const forward = (x: number) => mapRange(x, -5, 5, 0, 400);
    const inverse = (px: number) => mapRange(px, 0, 400, -5, 5);
    expect(inverse(forward(2.3))).toBeCloseTo(2.3);
  });
});

describe("nearestPowerOfTen", () => {
  it("1-9 → 1", () => {
    expect(nearestPowerOfTen(1)).toBe(1);
    expect(nearestPowerOfTen(5)).toBe(1);
    expect(nearestPowerOfTen(9.9)).toBe(1);
  });
  it("10-99 → 10", () => {
    expect(nearestPowerOfTen(10)).toBe(10);
    expect(nearestPowerOfTen(50)).toBe(10);
  });
  it("100-999 → 100", () => {
    expect(nearestPowerOfTen(500)).toBe(100);
  });
  it("fractions: 0.1-0.99 → 0.1", () => {
    expect(nearestPowerOfTen(0.5)).toBeCloseTo(0.1);
  });
  it("tiny values", () => {
    expect(nearestPowerOfTen(0.05)).toBeCloseTo(0.01);
  });
  it("handles zero gracefully (returns 1)", () => {
    expect(nearestPowerOfTen(0)).toBe(1);
  });
  it("handles negatives using magnitude", () => {
    expect(nearestPowerOfTen(-50)).toBe(10);
  });
});

describe("snapAngleToDegrees", () => {
  it("snaps π/2 radians to 90°-multiple", () => {
    expect(snapAngleToDegrees(Math.PI / 2, 90)).toBeCloseTo(Math.PI / 2);
  });
  it("snaps near 45° to 45° when snap=45", () => {
    expect(snapAngleToDegrees((44 * Math.PI) / 180, 45)).toBeCloseTo(
      (45 * Math.PI) / 180
    );
  });
  it("snaps near 0 to 0", () => {
    expect(snapAngleToDegrees(0.01, 90)).toBeCloseTo(0);
  });
  it("snaps negative angles", () => {
    expect(
      snapAngleToDegrees((-46 * Math.PI) / 180, 45)
    ).toBeCloseTo((-45 * Math.PI) / 180);
  });
});

describe("inferLabels", () => {
  it("picks nice integer ticks for [0, 10]", () => {
    const labels = inferLabels(0, 10, 5);
    expect(labels).toContain(0);
    expect(labels).toContain(10);
    expect(labels.length).toBeGreaterThanOrEqual(3);
    expect(labels.length).toBeLessThanOrEqual(11);
  });
  it("picks 2-spaced ticks for [0, 10] with target 5", () => {
    const labels = inferLabels(0, 10, 5);
    // expect step of 2: [0,2,4,6,8,10]
    expect(labels).toEqual([0, 2, 4, 6, 8, 10]);
  });
  it("picks nice ticks for [-5, 5]", () => {
    const labels = inferLabels(-5, 5, 5);
    expect(labels).toContain(0);
    // every tick is inside the range
    for (const t of labels) {
      expect(t).toBeGreaterThanOrEqual(-5);
      expect(t).toBeLessThanOrEqual(5);
    }
  });
  it("picks ticks for fractional range", () => {
    const labels = inferLabels(0, 1, 5);
    expect(labels[0]).toBe(0);
    expect(labels.at(-1)).toBe(1);
    // every step should be the same
    const step = (labels[1] ?? 0) - (labels[0] ?? 0);
    expect(step).toBeGreaterThan(0);
    for (let i = 1; i < labels.length; i++) {
      expect((labels[i] ?? 0) - (labels[i - 1] ?? 0)).toBeCloseTo(step);
    }
  });
  it("picks ticks for large range [0, 1000]", () => {
    const labels = inferLabels(0, 1000, 5);
    expect(labels).toContain(0);
    expect(labels).toContain(1000);
  });
  it("handles reversed min/max by swapping", () => {
    const labels = inferLabels(10, 0, 5);
    expect(labels[0]).toBe(0);
    expect(labels.at(-1)).toBe(10);
  });
  it("empty range returns single label", () => {
    expect(inferLabels(5, 5, 5)).toEqual([5]);
  });
});
