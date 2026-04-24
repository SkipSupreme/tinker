<script lang="ts">
  import type { Vec2 } from "../vec.js";

  interface Props {
    center: Vec2;
    /** Radius in user-space units (radius=1 means 1 user unit). */
    radius: number;
    color?: string;
    opacity?: number;
    weight?: number;
    /** Fill color. When unset, the circle is an outline only. */
    fillColor?: string;
    /** Fill opacity. Defaults to 0.15 when fillColor is set. */
    fillOpacity?: number;
    svg?: Record<string, string | number>;
  }

  const {
    center,
    radius,
    color = "var(--mafs-fg, #333)",
    opacity = 1,
    weight = 2,
    fillColor,
    fillOpacity,
    svg,
  }: Props = $props();

  const fill = $derived(fillColor ?? "none");
  const fOp = $derived(fillOpacity ?? (fillColor ? 0.15 : 1));
</script>

<circle
  cx={center[0]}
  cy={center[1]}
  r={radius}
  stroke={color}
  stroke-opacity={opacity}
  stroke-width={weight}
  {fill}
  fill-opacity={fOp}
  vector-effect="non-scaling-stroke"
  {...svg}
/>
