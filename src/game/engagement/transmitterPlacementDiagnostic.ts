// SE-TM-011 [PROPOSED] — Transmitter-before-gate placement diagnostic.
//
// When a Transmitter writes on a pulse and a downstream gating piece then
// blocks (void-terminates) that SAME pulse, the write still commits to the
// output tape (SE-TM-012 — this is correct, not a bug). The placement is
// nonetheless a likely Engineer mistake: the value they recorded reflects a
// decision the gate later reverses. This module DETECTS that shape so COGS can
// surface a descriptive, NON-BLOCKING diagnostic. It does not change pass/fail,
// scoring, or the write itself.
//
// Status: detection logic + candidate copy land here. The UI surface (where the
// line is shown — post-run dialogue panel, toast, etc.) is DEFERRED. See the
// LAST_REPORT for what remains to wire it into the live post-run flow.

import type { ExecutionStep } from '../types';

// Pieces that can gate (void-terminate) a pulse after a Transmitter has
// already written. Config Node (condition fails), Counter (threshold gate).
// Divergence Gate is a future Kepler piece type and is included by name so the
// detector keeps working once it exists in the PieceType union.
export const GATING_PIECE_TYPES: readonly string[] = [
  'configNode',
  'counter',
  'divergenceGate',
];

// Candidate COGS lines (dry, no exclamation, Engineer framing). [PROPOSED] —
// NOT final. Tucker sign-off required before any of these ship as displayed
// copy (Design Principle 2: tone is load-bearing).
export const TRANSMITTER_BEFORE_GATE_COGS_LINES: readonly string[] = [
  'That write landed before the gate resolved, Engineer. If the gate blocks this pulse, the output tape still keeps what the Transmitter recorded — it will not reflect the block.',
  'The Transmitter fired upstream of the gate. The value is on the tape regardless of what the gate decides downstream. Order the pipeline so the gate rules before the Transmitter commits.',
];

// Splits a flat execution-step list into per-pulse slices. The engine emits one
// `source` step at the start of every pulse (gameStore concatenates pulses),
// so a `source` step marks a pulse boundary. A leading non-source step (should
// not occur in practice) is attached to the first pulse.
export function splitStepsByPulse(steps: ExecutionStep[]): ExecutionStep[][] {
  const pulses: ExecutionStep[][] = [];
  for (const step of steps) {
    if (step.type === 'source' || pulses.length === 0) {
      pulses.push([step]);
    } else {
      pulses[pulses.length - 1].push(step);
    }
  }
  return pulses;
}

// True if any single pulse has a successful Transmitter step followed (later in
// the same pulse's step order) by a gating piece that blocks (success === false).
// This is the [1.5]/[2.1]/[2.3]/[5.1]-[5.3] "Transmitter writes, then gate
// blocks" shape from transmitterContract.test.ts.
export function detectTransmitterBeforeGateBlock(steps: ExecutionStep[]): boolean {
  for (const pulse of splitStepsByPulse(steps)) {
    const txIdx = pulse.findIndex(s => s.type === 'transmitter' && s.success);
    if (txIdx === -1) continue;
    const blockedDownstream = pulse
      .slice(txIdx + 1)
      .some(s => GATING_PIECE_TYPES.includes(s.type) && s.success === false);
    if (blockedDownstream) return true;
  }
  return false;
}
