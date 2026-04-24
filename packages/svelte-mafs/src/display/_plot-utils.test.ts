import { describe, expect, it } from "vitest";
import type { Sample } from "../sampling.js";
import { buildPath, dashArrayFor, defaultTolerance } from "./_plot-utils.js";

describe("buildPath", () => {
  it("empty sample list → empty string", () => {
    expect(buildPath([])).toBe("");
  });

  it("single sample → one M command, no L", () => {
    expect(buildPath([[1, 2]])).toBe("M 1 2");
  });

  it("three samples → M + 2 L", () => {
    const s: Sample[] = [
      [0, 0],
      [1, 1],
      [2, 4],
    ];
    expect(buildPath(s)).toBe("M 0 0 L 1 1 L 2 4");
  });

  it("NaN y breaks the stroke into sub-paths with a fresh M", () => {
    const s: Sample[] = [
      [0, 0],
      [1, 1],
      [1.5, Number.NaN],
      [2, 4],
      [3, 9],
    ];
    expect(buildPath(s)).toBe("M 0 0 L 1 1 M 2 4 L 3 9");
  });

  it("leading NaN is skipped; first finite point is the M", () => {
    const s: Sample[] = [
      [0, Number.NaN],
      [1, 1],
      [2, 4],
    ];
    expect(buildPath(s)).toBe("M 1 1 L 2 4");
  });

  it("infinite y is treated identically to NaN (stroke break)", () => {
    const s: Sample[] = [
      [0, 0],
      [1, Number.POSITIVE_INFINITY],
      [2, 2],
    ];
    expect(buildPath(s)).toBe("M 0 0 M 2 2");
  });
});

describe("defaultTolerance", () => {
  it("scales with y-span", () => {
    expect(defaultTolerance(10)).toBe(10 / 500);
    expect(defaultTolerance(1000)).toBe(2);
  });
});

describe("dashArrayFor", () => {
  it('solid → null', () => {
    expect(dashArrayFor("solid")).toBeNull();
  });
  it("dashed → '6 6'", () => {
    expect(dashArrayFor("dashed")).toBe("6 6");
  });
  it("dotted → '2 4'", () => {
    expect(dashArrayFor("dotted")).toBe("2 4");
  });
});
