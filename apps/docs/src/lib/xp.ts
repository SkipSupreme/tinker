/**
 * XP and haptic helpers. Spec in DESIGN.md §Progress Loops.
 *
 * XP awards (per DESIGN.md):
 *   step advance              =   1 XP
 *   correct first try         =   5 XP
 *   correct after 1-2 retries =   2 XP
 *   lesson complete           =  20 XP
 *   module complete           = 100 XP
 *
 * Event: `tinker:xp` (detail: { amount, total, reason }) fires on window so
 * listeners can update live without polling localStorage. The visible XP
 * counter was retired in Phase G (mastery framing), so this currently has no
 * UI listener, but awards still persist to localStorage.
 */

import { TINKER_EVENT } from './events';
import { LS_KEY } from './storage-keys';

export const XP_AWARD = {
  stepAdvance: 1,
  correctFirstTry: 5,
  correctRetry: 2,
  lessonComplete: 20,
  moduleComplete: 100,
} as const;

function readInt(key: string, fallback = 0): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    const n = raw == null ? NaN : parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

let xpWriteWarned = false;
function writeInt(key: string, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, String(value));
  } catch (e) {
    // Quota / private mode is the legitimate case, but silently dropping
    // a +5 XP write also means a "+5 XP" animation that rolls back on
    // reload. Log once so the loss-of-XP path is at least observable.
    if (!xpWriteWarned) {
      xpWriteWarned = true;
      console.warn('[xp] localStorage write failed (XP will not persist):', e);
    }
  }
}

function emit<T>(detail: T): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TINKER_EVENT.xp, { detail }));
}

function getXp(): number {
  return readInt(LS_KEY.xp);
}

export interface XpEventDetail {
  amount: number;
  total: number;
  reason: string;
}

export function awardXp(amount: number, reason: string): number {
  if (!Number.isFinite(amount) || amount === 0) return getXp();
  const total = Math.max(0, getXp() + amount);
  writeInt(LS_KEY.xp, total);
  emit<XpEventDetail>({ amount, total, reason });
  return total;
}

/**
 * Mobile haptic feedback. No-op when reduced motion is preferred or when
 * the platform doesn't support vibrate. Patterns from DESIGN.md §Haptics.
 */
export function vibrate(pattern: number | number[]): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch {
    /* ignore */
  }
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
