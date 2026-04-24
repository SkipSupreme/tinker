<script lang="ts">
  import Mafs from "../view/Mafs.svelte";
  import type { UserViewBox } from "../context/coordinate-context.js";
  import type { Vec2 } from "../vec.js";
  import LineSegment from "./line-segment.svelte";

  type Props = {
    point1: Vec2;
    point2: Vec2;
    color?: string;
    opacity?: number;
    weight?: number;
    width?: number;
    height?: number;
    viewBox?: UserViewBox;
  };

  const {
    point1,
    point2,
    color,
    opacity,
    weight,
    width = 400,
    height = 300,
    viewBox = { x: [-5, 5], y: [-5, 5] },
  }: Props = $props();
</script>

<Mafs {width} {height} {viewBox}>
  <LineSegment {point1} {point2} {color} {opacity} {weight} />
</Mafs>
