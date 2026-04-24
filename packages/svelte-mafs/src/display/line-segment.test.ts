import { render } from "@testing-library/svelte";
import type { ComponentProps } from "svelte";
import { describe, expect, it } from "vitest";
import Harness from "./line-segment.harness.svelte";

const getLine = (props: ComponentProps<typeof Harness>) => {
  const { container } = render(Harness, { props });
  const line = container.querySelector("line");
  if (!line) throw new Error("no <line> rendered");
  return line;
};

describe("<Line.Segment>", () => {
  it("writes user-space endpoints directly to x1/y1/x2/y2", () => {
    const line = getLine({ point1: [0, 0], point2: [3, 4] });
    expect(line.getAttribute("x1")).toBe("0");
    expect(line.getAttribute("y1")).toBe("0");
    expect(line.getAttribute("x2")).toBe("3");
    expect(line.getAttribute("y2")).toBe("4");
  });

  it("accepts a custom color", () => {
    const line = getLine({ point1: [0, 0], point2: [1, 1], color: "crimson" });
    expect(line.getAttribute("stroke")).toBe("crimson");
  });

  it("has a non-empty default stroke color", () => {
    const line = getLine({ point1: [0, 0], point2: [1, 1] });
    expect(line.getAttribute("stroke")).toBeTruthy();
  });

  it("accepts a custom opacity", () => {
    const line = getLine({ point1: [0, 0], point2: [1, 1], opacity: 0.4 });
    expect(line.getAttribute("stroke-opacity")).toBe("0.4");
  });

  it("accepts a custom stroke weight (in px, kept visually constant)", () => {
    const line = getLine({ point1: [0, 0], point2: [1, 1], weight: 3 });
    expect(line.getAttribute("stroke-width")).toBe("3");
  });

  it("uses non-scaling-stroke so the weight stays visually constant under zoom", () => {
    const line = getLine({ point1: [0, 0], point2: [1, 1] });
    expect(line.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });

  it("handles negative coordinates", () => {
    const line = getLine({ point1: [-2, -3], point2: [-4, 1] });
    expect(line.getAttribute("x1")).toBe("-2");
    expect(line.getAttribute("y1")).toBe("-3");
    expect(line.getAttribute("x2")).toBe("-4");
    expect(line.getAttribute("y2")).toBe("1");
  });
});
