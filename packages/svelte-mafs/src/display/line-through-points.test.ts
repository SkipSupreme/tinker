import { render } from "@testing-library/svelte";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Harness from "./line-through-points.harness.svelte";

const readLine = (props: ComponentProps<typeof Harness>) => {
  const { container } = render(Harness, { props });
  const line = container.querySelector("line");
  return line;
};

const ep = (line: Element) => ({
  x1: Number(line.getAttribute("x1")),
  y1: Number(line.getAttribute("y1")),
  x2: Number(line.getAttribute("x2")),
  y2: Number(line.getAttribute("y2")),
});

describe("<Line.ThroughPoints>", () => {
  it("extends a horizontal line to the full x-range of the viewBox", () => {
    const line = readLine({
      point1: [0, 0],
      point2: [1, 0],
      viewBox: { x: [-5, 5], y: [-5, 5] },
    });
    const p = ep(line!);
    expect(p.x1).toBeCloseTo(-5);
    expect(p.x2).toBeCloseTo(5);
    expect(p.y1).toBeCloseTo(0);
    expect(p.y2).toBeCloseTo(0);
  });

  it("extends a vertical line to the full y-range of the viewBox", () => {
    const line = readLine({
      point1: [2, 0],
      point2: [2, 1],
      viewBox: { x: [-5, 5], y: [-5, 5] },
    });
    const p = ep(line!);
    expect(p.x1).toBeCloseTo(2);
    expect(p.x2).toBeCloseTo(2);
    const ys = [p.y1, p.y2].sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(-5);
    expect(ys[1]).toBeCloseTo(5);
  });

  it("extends y=x to the diagonal of a symmetric square viewBox", () => {
    const line = readLine({
      point1: [0, 0],
      point2: [1, 1],
      viewBox: { x: [-5, 5], y: [-5, 5] },
    });
    const p = ep(line!);
    // The line hits x=-5 at y=-5 and x=5 at y=5.
    const pts = [
      [p.x1, p.y1],
      [p.x2, p.y2],
    ].sort((a, b) => a[0]! - b[0]!);
    expect(pts[0]![0]).toBeCloseTo(-5);
    expect(pts[0]![1]).toBeCloseTo(-5);
    expect(pts[1]![0]).toBeCloseTo(5);
    expect(pts[1]![1]).toBeCloseTo(5);
  });

  it("clips a steep line to the top/bottom edges (not left/right)", () => {
    // Line through (0,0) with slope 10. Over x:[-5,5], y would span [-50,50] —
    // but y is clipped to [-5,5]. So the line should hit y=-5 at x=-0.5 and
    // y=5 at x=0.5.
    const line = readLine({
      point1: [0, 0],
      point2: [1, 10],
      viewBox: { x: [-5, 5], y: [-5, 5] },
    });
    const p = ep(line!);
    const pts = [
      [p.x1, p.y1],
      [p.x2, p.y2],
    ].sort((a, b) => a[1]! - b[1]!);
    expect(pts[0]![0]).toBeCloseTo(-0.5);
    expect(pts[0]![1]).toBeCloseTo(-5);
    expect(pts[1]![0]).toBeCloseTo(0.5);
    expect(pts[1]![1]).toBeCloseTo(5);
  });

  it("does not render when both points coincide (degenerate)", () => {
    const line = readLine({ point1: [1, 1], point2: [1, 1] });
    // Either the <line> isn't rendered at all, or it renders at the point.
    // Our contract: skip rendering to avoid a 0-length line.
    expect(line).toBeNull();
  });

  it("passes through stroke styling props", () => {
    const line = readLine({
      point1: [0, 0],
      point2: [1, 0],
      color: "blue",
      opacity: 0.7,
      weight: 3,
    });
    expect(line!.getAttribute("stroke")).toBe("blue");
    expect(line!.getAttribute("stroke-opacity")).toBe("0.7");
    expect(line!.getAttribute("stroke-width")).toBe("3");
    expect(line!.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });
});
