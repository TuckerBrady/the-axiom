import type { ExecutionStep } from '../../../src/game/engagement/types';
import { levelA1_5, levelA1_7, levelA1_8 } from '../../../src/game/levels';
import { BLANK } from '../../../src/game/types';

function terminalStep(success: boolean, pieceId = 'term', pulseIndex = 0): ExecutionStep {
  return {
    pieceId,
    type: 'terminal',
    success,
    pulseIndex,
  } as unknown as ExecutionStep;
}

function sourceStep(pieceId = 'src', pulseIndex = 0): ExecutionStep {
  return {
    pieceId,
    type: 'source',
    success: true,
    pulseIndex,
  } as unknown as ExecutionStep;
}

// Replicates the success-condition predicate used in handleEngage:
//   metPulseRequirement = terminalSuccessCount >= requiredCount
// where terminalSuccessCount = steps.filter(s => s.type === 'terminal' && s.success).length
// and requiredCount = level.requiredTerminalCount ?? 1.
function computeMetPulseRequirement(
  steps: ExecutionStep[],
  requiredTerminalCount: number | undefined,
): boolean {
  const terminalSuccessCount = steps.filter(
    s => s.type === 'terminal' && s.success,
  ).length;
  const requiredCount = requiredTerminalCount ?? 1;
  return terminalSuccessCount >= requiredCount;
}

// Replicates the per-pulse results builder used for the INSUFFICIENT
// PULSES modal. `pulses[i]` is the execution slice for pulse i.
function buildPulseResults(pulses: ExecutionStep[][]): boolean[] {
  return pulses.map(p =>
    p.some(s => s.type === 'terminal' && s.success),
  );
}

describe('success condition with requiredTerminalCount', () => {
  it('fails when 2 of 5 pulses reach Terminal and 3 are required', () => {
    const steps: ExecutionStep[] = [
      sourceStep('src', 0),
      terminalStep(true, 't', 0),
      sourceStep('src', 1),
      terminalStep(false, 't', 1),
      sourceStep('src', 2),
      terminalStep(true, 't', 2),
      sourceStep('src', 3),
      terminalStep(false, 't', 3),
      sourceStep('src', 4),
      terminalStep(false, 't', 4),
    ];
    expect(computeMetPulseRequirement(steps, 3)).toBe(false);
  });

  it('passes when 3 of 5 pulses reach Terminal and 3 are required', () => {
    const steps: ExecutionStep[] = [
      terminalStep(true, 't', 0),
      terminalStep(false, 't', 1),
      terminalStep(true, 't', 2),
      terminalStep(true, 't', 3),
      terminalStep(false, 't', 4),
    ];
    expect(computeMetPulseRequirement(steps, 3)).toBe(true);
  });

  it('passes when 5 of 5 pulses reach Terminal and 3 are required', () => {
    const steps: ExecutionStep[] = Array.from({ length: 5 }, (_, i) =>
      terminalStep(true, 't', i),
    );
    expect(computeMetPulseRequirement(steps, 3)).toBe(true);
  });

  it('defaults to 1 when requiredTerminalCount is undefined', () => {
    const stepsAny: ExecutionStep[] = [terminalStep(true, 't', 0)];
    expect(computeMetPulseRequirement(stepsAny, undefined)).toBe(true);

    const stepsNone: ExecutionStep[] = [terminalStep(false, 't', 0)];
    expect(computeMetPulseRequirement(stepsNone, undefined)).toBe(false);
  });

  it('rejects when no pulse reaches Terminal regardless of requirement', () => {
    const steps: ExecutionStep[] = [
      terminalStep(false, 't', 0),
      terminalStep(false, 't', 1),
    ];
    expect(computeMetPulseRequirement(steps, 1)).toBe(false);
    expect(computeMetPulseRequirement(steps, 2)).toBe(false);
  });
});

describe('pulse results builder', () => {
  it('returns a boolean for each pulse based on terminal arrival', () => {
    const pulses: ExecutionStep[][] = [
      [sourceStep('s', 0), terminalStep(true, 't', 0)],
      [sourceStep('s', 1), terminalStep(false, 't', 1)],
      [sourceStep('s', 2), terminalStep(true, 't', 2)],
      [sourceStep('s', 3), terminalStep(true, 't', 3)],
      [sourceStep('s', 4), terminalStep(false, 't', 4)],
    ];
    expect(buildPulseResults(pulses)).toEqual([true, false, true, true, false]);
  });

  it('returns false when a pulse has no terminal step', () => {
    const pulses: ExecutionStep[][] = [
      [sourceStep('s', 0)],
      [sourceStep('s', 1), terminalStep(true, 't', 1)],
    ];
    expect(buildPulseResults(pulses)).toEqual([false, true]);
  });

  it('returns false when the terminal step is not success', () => {
    const pulses: ExecutionStep[][] = [
      [terminalStep(false, 't', 0)],
    ];
    expect(buildPulseResults(pulses)).toEqual([false]);
  });

  it('returns an empty array for no pulses', () => {
    expect(buildPulseResults([])).toEqual([]);
  });
});

describe('A1-5 level definition', () => {
  it('declares requiredTerminalCount = 3', () => {
    expect(levelA1_5.requiredTerminalCount).toBe(3);
  });

  it('has a 5-value input tape', () => {
    expect(levelA1_5.inputTape).toEqual([1, 0, 1, 1, 0]);
  });

  // Prompt 67 restored expectedOutput as a documentary field: Config
  // Node gating with configValue=1 passes the three 1-valued input
  // pulses. No Transmitter on this level, so requiredTerminalCount
  // is the live success gate; expectedOutput is for design clarity.
  it('documents expectedOutput as the three 1-valued pulses', () => {
    expect(levelA1_5.expectedOutput).toEqual([1, 1, 1]);
  });
});

// SE-TM-002 — the A1-5/A1-6 vs A1-7+ split (live-gate switch applied,
// Prompt 149, Tucker-approved 2026-06-14).
//
// For A1-7 onward (post-Transmitter levels), expectedOutput is now the LIVE
// gate and requiredTerminalCount is documentary-only. The discriminator is
// data-driven, not ID-based: expectedOutput is the live gate iff it is
// full-length (expectedOutput.length === inputTape.length). A1-5/A1-6 keep
// requiredTerminalCount as their live gate because their expectedOutput is
// short/documentary. See project-docs/REPORTS/se-tm-blank-gate-semantics.md.
describe('requiredTerminalCount is documentary-only for A1-7+ (SE-TM-002)', () => {
  it('A1-7 declares a full-length, BLANK-aware expectedOutput (the live gate)', () => {
    expect(levelA1_7.inputTape).toHaveLength(8);
    // Full-length tape: passing pulses carry their digit, blocked pulses are
    // BLANK. Matches the confirmed OUT screenshot (1 1 _ 1 _ _ 1 1).
    expect(levelA1_7.expectedOutput).toEqual([1, 1, BLANK, 1, BLANK, BLANK, 1, 1]);
  });

  it('A1-7 is gated by expectedOutput, not requiredTerminalCount (full-length discriminator)', () => {
    // The discriminator that flips the live gate: length parity with inputTape.
    expect(levelA1_7.expectedOutput).toHaveLength(levelA1_7.inputTape!.length);
    // requiredTerminalCount remains declared but is documentary only.
    expect(levelA1_7.requiredTerminalCount).toBe(5);
  });

  it('A1-8 declares a full-length, BLANK-aware expectedOutput (the live gate)', () => {
    expect(levelA1_8.inputTape).toHaveLength(8);
    // The five blocked 1-valued pulses produce BLANK (and match BLANK under
    // SE-TM-003, rendering as a neutral dash rather than red); the three
    // passing 0-valued pulses are written.
    expect(levelA1_8.expectedOutput).toEqual([BLANK, 0, BLANK, BLANK, 0, BLANK, 0, BLANK]);
  });

  it('A1-8 is gated by expectedOutput, not requiredTerminalCount (full-length discriminator)', () => {
    expect(levelA1_8.expectedOutput).toHaveLength(levelA1_8.inputTape!.length);
    expect(levelA1_8.requiredTerminalCount).toBe(3);
  });

  it('A1-5 keeps requiredTerminalCount as its live gate (short/documentary expectedOutput)', () => {
    // Discriminator says NOT a live gate: expectedOutput is shorter than the
    // input tape, so A1-5 stays on requiredTerminalCount — unchanged.
    expect(levelA1_5.expectedOutput!.length).toBeLessThan(levelA1_5.inputTape!.length);
    expect(levelA1_5.requiredTerminalCount).toBe(3);
  });
});
