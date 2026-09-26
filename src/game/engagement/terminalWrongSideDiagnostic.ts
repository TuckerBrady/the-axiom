// SPEC_DIRECTIONAL_TERMINAL section 5 — Terminal wrong-side diagnostic.
//
// A directional Terminal (PlacedPiece.entrySide) accepts the signal from one
// side only. When the signal meets it from any other side the engine records a
// `terminalRejected` step and ends that branch (clauses 3.4-3.5). This module
// DETECTS a run that failed that way so the post-run COGS failure dialogue can
// name the fault instead of the generic void line (clause 5.4). It does not
// change pass/fail, lives, or score.
//
// Status: detection only. The COGS line (`terminal_wrong_side`) is TBD under
// clause 5.5 and ships with PR 3; the dialogue selection is wired then.

import type { ExecutionStep } from '../types';
import { splitStepsByPulse } from './transmitterPlacementDiagnostic';

// True if a pulse recorded a wrong-side arrival and never reached a Terminal.
// Pulses are judged independently (clause 3.7): a rejection on a pulse that
// also delivered through the entry side is a redundant branch, not an error
// (clause 5.3). For a single-pulse run this is exactly "the run did not
// succeed and at least one terminalRejected step is present" (clause 5.2).
export function detectTerminalWrongSide(steps: ExecutionStep[]): boolean {
  return splitStepsByPulse(steps).some(
    pulse =>
      pulse.some(s => s.type === 'terminalRejected') &&
      !pulse.some(s => s.type === 'terminal' && s.success),
  );
}
