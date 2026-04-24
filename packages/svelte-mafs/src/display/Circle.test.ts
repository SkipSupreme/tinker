import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "./Circle.harness.svelte";

const getCircle = (props: Parameters<typeof render<typeof Harness>>[1]["props"]) => {
  const { container } = render(Harness, { props });
  const circle = container.querySelector("circle");
  if (!circle) throw new Error("no <circle> rendered");
  return circle;
};

describe("<Circle>", () => {
  it("renders a <circle> at center with radius in user units", () => {
    const el = getCircle({ center: [1, 2], radius: 0.5 });
    expect(el.getAttribute("cx")).toBe("1");
    expect(el.getAttribute("cy")).toBe("2");
    expect(el.getAttribute("r")).toBe("0.5");
  });

  it("default has stroke but no fill (transparent fill)", () => {
    const el = getCircle({ center: [0, 0], radius: 1 });
    expect(el.getAttribute("stroke")).toBeTruthy();
    expect(el.getAttribute("fill")).toBe("none");
  });

  it("accepts a custom stroke color via `color`", () => {
    const el = getCircle({ center: [0, 0], radius: 1, color: "purple" });
    expect(el.getAttribute("stroke")).toBe("purple");
  });

  it("uses non-scaling-stroke so weight stays pixel-fixed under zoom", () => {
    const el = getCircle({ center: [0, 0], radius: 1 });
    expect(el.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });

  it("accepts a custom stroke weight in pixels", () => {
    const el = getCircle({ center: [0, 0], radius: 1, weight: 4 });
    expect(el.getAttribute("stroke-width")).toBe("4");
  });

  it("applies stroke opacity from `opacity` prop", () => {
    const el = getCircle({ center: [0, 0], radius: 1, opacity: 0.3 });
    expect(el.getAttribute("stroke-opacity")).toBe("0.3");
  });

  it("applies fill when fillColor is provided", () => {
    const el = getCircle({
      center: [0, 0],
      radius: 1,
      fillColor: "blue",
    });
    expect(el.getAttribute("fill")).toBe("blue");
  });

  it("applies fill opacity (defaults to a translucent value when fillColor is set)", () => {
    const el = getCircle({
      center: [0, 0],
      radius: 1,
      fillColor: "blue",
    });
    const fo = Number(el.getAttribute("fill-opacity"));
    expect(fo).toBeGreaterThan(0);
    expect(fo).toBeLessThanOrEqual(1);
  });

  it("respects explicit fillOpacity override", () => {
    const el = getCircle({
      center: [0, 0],
      radius: 1,
      fillColor: "blue",
      fillOpacity: 0.8,
    });
    expect(el.getAttribute("fill-opacity")).toBe("0.8");
  });
});
