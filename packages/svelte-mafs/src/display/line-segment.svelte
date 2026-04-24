<script lang="ts">
  import type { Vec2 } from "../vec.js";

  interface Props {
    point1: Vec2;
    point2: Vec2;
    color?: string;
    opacity?: number;
    /** Stroke width in pixels, kept visually constant via vector-effect. */
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
</script>

<line
  x1={point1[0]}
  y1={point1[1]}
  x2={point2[0]}
  y2={point2[1]}
  stroke={color}
  stroke-opacity={opacity}
  stroke-width={weight}
  vector-effect="non-scaling-stroke"
  {...svg}
/>
