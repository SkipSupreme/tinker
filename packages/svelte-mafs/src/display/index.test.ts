import { describe, expect, it } from "vitest";
import * as PublicAPI from "../index.js";

describe("Stream 4 public API surface", () => {
  it("Point is exported as a Svelte component", () => {
    expect(typeof PublicAPI.Point).toBe("function");
  });

  it("Line is a namespace with Segment and ThroughPoints", () => {
    expect(PublicAPI.Line).toBeTruthy();
    expect(typeof PublicAPI.Line.Segment).toBe("function");
    expect(typeof PublicAPI.Line.ThroughPoints).toBe("function");
  });

  it("Circle, Ellipse, Polygon, Vector are all exported", () => {
    expect(typeof PublicAPI.Circle).toBe("function");
    expect(typeof PublicAPI.Ellipse).toBe("function");
    expect(typeof PublicAPI.Polygon).toBe("function");
    expect(typeof PublicAPI.Vector).toBe("function");
  });
});
