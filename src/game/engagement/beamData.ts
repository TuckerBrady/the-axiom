// AXM-036 P4a — pure helpers for constant-speed beam travel (F4) and
// data-carrying segment detection (F13b). Kept free of react-native /
// Animated imports (unlike beamAnimation.ts) so this module can be
// covered directly by the unit-tier jest project, which cannot parse
// react-native's Animated internals without the react-native mock.

import { BEAM_MS_PER_CELL } from './constants';

// F4-P4a-2 — constant velocity. No min/max clamp: a long path takes
// proportionally longer than a short one, at the same BEAM_MS_PER_CELL
// pace, in cells rather than a fixed reference length. speedMultiplier
// (getPulseSpeed) scales the whole run exactly as master's per-path
// duration did.
export function beamTravelMs(
  pathTotal: number,
  cellSize: number,
  speedMultiplier: number,
): number {
  if (cellSize <= 0) return 0;
  return (pathTotal / cellSize) * BEAM_MS_PER_CELL * speedMultiplier;
}

// F4-P4a-1 — linear head travel. `elapsedMs` is pause time excluded
// (the caller passes now - t0 - pauseAccum, exactly as master did
// before wrapping the fraction in easeOut3). No deceleration into any
// waypoint or the Terminal.
export function beamHeadDistance(
  elapsedMs: number,
  totalMs: number,
  pathTotal: number,
): number {
  if (totalMs <= 0) return pathTotal;
  const frac = Math.min(1, elapsedMs / totalMs);
  return pathTotal * frac;
}

// F13(b) — "the shimmer starts at the Scanner, not at the Source"
// (Tucker). A Config Node gates without attaching anything to the
// beam's story; only a Scanner, Inverter or Latch READ marks a
// segment — and every segment after it — as carrying data.
export const DATA_ONSET_TYPES: ReadonlySet<string> = new Set([
  'scanner',
  'inverter',
  'latch',
]);

export interface DataFlagStep {
  type: string;
  success?: boolean;
}

// flags[k] describes the segment leaving steps[k] toward steps[k+1]:
// carryIn OR some j <= k with DATA_ONSET_TYPES.has(steps[j].type) &&
// steps[j].success !== false. A Splitter branch's pre-fork path passes
// its own last flag (or carryIn, if the pre-fork produced no segments)
// as this function's carryIn for each branch.
export function deriveSegmentDataFlags(
  steps: DataFlagStep[],
  carryIn = false,
): boolean[] {
  const segmentCount = Math.max(0, steps.length - 1);
  const flags: boolean[] = [];
  let onset = carryIn;
  for (let k = 0; k < segmentCount; k++) {
    const step = steps[k];
    if (DATA_ONSET_TYPES.has(step.type) && step.success !== false) {
      onset = true;
    }
    flags.push(onset);
  }
  return flags;
}
