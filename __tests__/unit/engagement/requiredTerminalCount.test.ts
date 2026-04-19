import type { ExecutionStep } from '../../../src/game/engagement/types';
import { levelA1_5 } from '../../../src/game/levels';

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

  it('no longer carries expectedOutput (Transmitter-based validation)', () => {
    expect(levelA1_5.expectedOutput).toBeUndefined();
  });
});
