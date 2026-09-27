// AXM-036 P14 — live-gate Terminal delivery (contract clause P14-1).
//
// Defect (R-14.1): live-gate levels (A1-7, A1-8, K1-2..K1-10, NF-1 — any level
// whose expectedOutput is full-length, one cell per input pulse) gated success
// on an exact output-tape match alone. A machine that wrote the correct value
// to the output tape but never routed the signal on to the physical Terminal
// still won. The Codex and CLAUDE.md both describe the Terminal as the place
// an output value is confirmed ("appears the moment a signal completes the
// circuit at the Terminal"); skipping it for non-blank pulses was a side
// effect of the blank-gate fix (se-tm-blank-gate-semantics.md step 4), never a
// decision anyone made.
//
// The fix: a pulse whose expected cell is not BLANK MUST also reach the
// Terminal. A pulse whose expected cell is BLANK is exempt (a legitimately
// blocked pulse produces no output and never fires the Terminal — SE-TM-002
// stays intact). This is the single predicate used by GameplayScreen, the
// store and the verifier so all three agree.

import type { OutputTapeValue } from '../types';
import { BLANK } from '../types';

export type LiveGateResult = {
  // BLANK-aware exact match between the produced output tape and expected
  // (today's SE-TM-001/SE-TM-003 comparator, unchanged by this package).
  tapeMatches: boolean;
  // Ascending indices of non-blank expected cells whose pulse never reached
  // the Terminal.
  undelivered: number[];
  // The live-gate verdict: tape matches AND every non-blank pulse delivered.
  passed: boolean;
};

export function evaluateLiveGate(
  expected: OutputTapeValue[],
  output: OutputTapeValue[] | undefined,
  reachedPerPulse: boolean[],
): LiveGateResult {
  const tapeMatches =
    !!output &&
    output.length === expected.length &&
    output.every((v, i) => v === expected[i]);

  const undelivered: number[] = [];
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== BLANK && !reachedPerPulse[i]) {
      undelivered.push(i);
    }
  }

  return {
    tapeMatches,
    undelivered,
    passed: tapeMatches && undelivered.length === 0,
  };
}
