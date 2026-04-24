<script lang="ts">
  import { getCoordContext } from "../context/coordinate-context.js";
  import type { Vec2 } from "../vec.js";

  interface Props {
    point1: Vec2;
    point2: Vec2;
    color?: string;
    opacity?: number;
    weight?: number;
    svg?: Record<string, string | number>;
  }

  const {
    point1,
    point2,
    color = "var(--mafs-fg, #333)",
    opacity = 1,
    weight = 2,
    svg,
  }: Props = $props();

  const ctx = getCoordContext();

  type Clipped = { readonly a: Vec2; readonly b: Vec2 } | null;

  // Liang-Barsky parametric clip of the infinite line through p1,p2 against
  // the viewBox rectangle. Returns the two boundary-intersection points, or
  // null if the line misses the box (only possible for the degenerate p1==p2
  // case; a non-degenerate line through any two finite points always hits
  // any non-empty axis-aligned rectangle extended to infinity in both
  // directions — but we still return null defensively).
  const clip = (p1: Vec2, p2: Vec2): Clipped => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    if (dx === 0 && dy === 0) return null;

    const { xMin, xMax, yMin, yMax } = ctx.viewBox;
    const p = [-dx, dx, -dy, dy];
    const q = [p1[0] - xMin, xMax - p1[0], p1[1] - yMin, yMax - p1[1]];

    let t0 = -Infinity;
    let t1 = Infinity;
    for (let i = 0; i < 4; i++) {
      const pi = p[i]!;
      const qi = q[i]!;
      if (pi === 0) {
        if (qi < 0) return null;
        continue;
      }
      const r = qi / pi;
      if (pi < 0) {
        if (r > t0) t0 = r;
      } else {
        if (r < t1) t1 = r;
      }
    }
    if (t0 > t1) return null;

    const a: Vec2 = [p1[0] + t0 * dx, p1[1] + t0 * dy];
    const b: Vec2 = [p1[0] + t1 * dx, p1[1] + t1 * dy];
    return { a, b };
  };

  const clipped = $derived(clip(point1, point2));
</script>

{#if clipped}
  <line
    x1={clipped.a[0]}
    y1={clipped.a[1]}
    x2={clipped.b[0]}
    y2={clipped.b[1]}
    stroke={color}
    stroke-opacity={opacity}
    stroke-width={weight}
    vector-effect="non-scaling-stroke"
    {...svg}
  />
{/if}
