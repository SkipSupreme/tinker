export type Vec2 = readonly [number, number];

export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];

export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];

export const scale = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];

export const dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];

export const mag = (a: Vec2): number => Math.hypot(a[0], a[1]);

export const normalize = (a: Vec2): Vec2 => {
  const m = mag(a);
  return m === 0 ? [0, 0] : [a[0] / m, a[1] / m];
};

export const rotate = (a: Vec2, rad: number): Vec2 => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};

export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
