// SWEEP-B51 S2 (AXM-040): which failure modal a finished run shows.
//
// One pure classifier decides it, so the modal names what actually happened:
// - 'void': nothing was delivered and no gate chose that (the machine broke).
// - 'wrongOutput': the machine produced an answer and it was wrong.
// - 'undelivered': live-gate tape matched, but a non-blank pulse never reached
//   the Terminal (AXM-036 P14).
// - 'insufficientGated' / 'insufficientRoute': a documentary or stateless
//   level fell short of requiredTerminalCount, split by cause, because the
//   COGS line for a gate that held differs from the one for a broken route.
//
// Also the INSUFFICIENT PULSES chip layout: chips wrap to two rows past five,
// so eight chips fit the 280pt inner width of the card at 360dp.

import type { ExecutionStep } from '../types';

export type FailureOutcome =
  'none' | 'void' | 'wrongOutput' | 'undelivered' | 'insufficientGated' | 'insufficientRoute';

// Step types whose `success: false` means a gate held the signal on purpose.
export const GATE_STEP_TYPES: ReadonlySet<string> = new Set(['configNode', 'counter', 'latch']);

// True iff the pulse never reached a Terminal and a gate step failed on it.
export function pulseWasGated(pulse: ExecutionStep[]): boolean {
  if (pulse.some(s => s.type === 'terminal' && s.success)) return false;
  return pulse.some(s => s.success === false && GATE_STEP_TYPES.has(s.type));
}

export function classifyRunFailure(a: {
  liveGate: boolean; hasTape: boolean; tapeMatches: boolean;
  reachedPerPulse: boolean[]; gatedPerPulse: boolean[];
  requiredCount: number; undeliveredCount: number;
}): FailureOutcome {
  const n = a.reachedPerPulse.length;
  const reached = a.reachedPerPulse.filter(Boolean).length;

  // 1. Nothing delivered, and no gate chose that (or the level is live-gate).
  if (reached === 0 && (a.liveGate || !a.gatedPerPulse.some(Boolean))) return 'void';

  // 2. Live-gate levels.
  if (a.liveGate) {
    if (!a.tapeMatches) return 'wrongOutput';
    if (a.undeliveredCount > 0) return 'undelivered';
    return 'none';
  }

  // 3. Documentary rule, unchanged: every pulse delivered, tape wrong.
  if (a.hasTape && reached === n && !a.tapeMatches) return 'wrongOutput';

  // 4. Short of requiredTerminalCount: gated only if every lost pulse was gated.
  if (reached < a.requiredCount) {
    const everyLostPulseGated = a.reachedPerPulse.every(
      (r, i) => r || a.gatedPerPulse[i] === true,
    );
    return everyLostPulseGated ? 'insufficientGated' : 'insufficientRoute';
  }

  return 'none';
}

// ─── Pulse chip layout (S2-7) ────────────────────────────────────────────────

export const PULSE_CHIP_SIZE = 48;
export const PULSE_CHIP_GAP = 8;
export const PULSE_CHIP_BLOCK_PAD = 16;

// Row lengths for `count` chips: one row up to five, else two rows with the
// extra chip on top (8 -> [4,4], 7 -> [4,3], 6 -> [3,3]).
export function pulseChipRows(count: number): number[] {
  if (count <= 0) return [];
  if (count <= 5) return [count];
  return [Math.ceil(count / 2), Math.floor(count / 2)];
}
