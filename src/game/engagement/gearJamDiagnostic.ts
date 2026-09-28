// SWEEP-B51 S3 (AXM-038) — Gear jam diagnostic.
//
// A Gear leaves through exactly one perpendicular side. When none would take
// the signal, or both would, the engine records the Gear's step with
// `gearJam` and the run ends at the Gear. This module finds that on a failed
// pulse so the VOID modal can name the fault instead of a random quote. It
// does not change pass/fail, lives, or score.

import type { ExecutionStep } from '../types';
import { splitStepsByPulse } from './transmitterPlacementDiagnostic';

export type GearJamReason = 'noExit' | 'twoExits';

// Per pulse, the first jam reason on a pulse that never reached a Terminal.
// A jam on a pulse that also delivered (another branch got through) is
// ignored.
export function detectGearJam(steps: ExecutionStep[]): GearJamReason | null {
  for (const pulse of splitStepsByPulse(steps)) {
    if (pulse.some(s => s.type === 'terminal' && s.success)) continue;
    const jammed = pulse.find(s => s.gearJam);
    if (jammed?.gearJam) return jammed.gearJam;
  }
  return null;
}

const GEAR_JAM_LINES: Record<GearJamReason, string> = {
  noExit:
    'The Gear had nowhere to turn. It bends the signal ninety degrees, left or right of where it entered. Neither side was listening.',
  twoExits:
    'The Gear was offered two exits. It takes one, and it will not guess which. Close one side.',
};

// COGS line for the VOID modal (NARRATIVE.md "Failure diagnostics").
export function gearJamLine(reason: GearJamReason): string {
  return GEAR_JAM_LINES[reason];
}
