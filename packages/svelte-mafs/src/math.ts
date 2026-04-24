export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const round = (v: number, precision = 0): number => {
  const factor = 10 ** precision;
  return Math.round(v * factor) / factor;
};

export const mapRange = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
): number => {
  if (fromMin === fromMax) return toMin;
  return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
};

export const nearestPowerOfTen = (v: number): number => {
  const abs = Math.abs(v);
  if (abs === 0) return 1;
  return 10 ** Math.floor(Math.log10(abs));
};

export const snapAngleToDegrees = (rad: number, degrees: number): number => {
  const step = (degrees * Math.PI) / 180;
  return Math.round(rad / step) * step;
};

/**
 * Pick "nice" tick positions inside [min, max] aiming for roughly `target` ticks.
 * Uses 1× / 2× / 5× multiples of the nearest power of ten so labels read cleanly.
 */
export const inferLabels = (
  min: number,
  max: number,
  target = 5,
): number[] => {
  if (min === max) return [min];
  if (min > max) [min, max] = [max, min];

  const rawStep = (max - min) / target;
  const power = nearestPowerOfTen(rawStep);
  const ratio = rawStep / power;

  let step: number;
  if (ratio < 1.5) step = power;
  else if (ratio < 3.5) step = 2 * power;
  else if (ratio < 7.5) step = 5 * power;
  else step = 10 * power;

  // Precision for rounding: enough decimal places to represent `step` exactly.
  const precision = Math.max(0, -Math.floor(Math.log10(step)));

  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  // Small epsilon so float arithmetic doesn't exclude the endpoint.
  for (let x = start; x <= max + step * 1e-9; x += step) {
    out.push(round(x, precision));
  }
  return out;
};
