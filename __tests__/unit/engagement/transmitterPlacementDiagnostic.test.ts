// SE-TM-011 [PROPOSED] — Transmitter-before-gate placement diagnostic.
//
// Detection only. The diagnostic is non-blocking and does not affect pass/fail
// (SE-TM-012). These tests pin the fire / does-not-fire condition.

import type { ExecutionStep } from '../../../src/game/engagement/types';
import {
  detectTransmitterBeforeGateBlock,
  splitStepsByPulse,
} from '../../../src/game/engagement/transmitterPlacementDiagnostic';

function step(type: string, success: boolean, pieceId = type): ExecutionStep {
  return { pieceId, type, success } as unknown as ExecutionStep;
}

describe('splitStepsByPulse', () => {
  it('splits a flat step list on each source boundary', () => {
    const steps = [
      step('source', true, 's'),
      step('conveyor', true),
      step('source', true, 's'),
      step('terminal', true),
    ];
    const pulses = splitStepsByPulse(steps);
    expect(pulses).toHaveLength(2);
    expect(pulses[0].map(s => s.type)).toEqual(['source', 'conveyor']);
    expect(pulses[1].map(s => s.type)).toEqual(['source', 'terminal']);
  });
});

describe('detectTransmitterBeforeGateBlock (SE-TM-011)', () => {
  it('fires when a Transmitter writes and a downstream Config Node then blocks on the same pulse', () => {
    const steps = [
      step('source', true, 's'),
      step('transmitter', true, 'tx'),
      step('configNode', false, 'cn'), // gate blocks after the write
    ];
    expect(detectTransmitterBeforeGateBlock(steps)).toBe(true);
  });

  it('fires for a downstream Counter that blocks after the write', () => {
    const steps = [
      step('source', true, 's'),
      step('transmitter', true, 'tx'),
      step('counter', false, 'ct'),
    ];
    expect(detectTransmitterBeforeGateBlock(steps)).toBe(true);
  });

  it('does NOT fire when the gate is upstream of the Transmitter (correct order)', () => {
    const steps = [
      step('source', true, 's'),
      step('configNode', true, 'cn'), // gate resolves first, passes
      step('transmitter', true, 'tx'),
      step('terminal', true, 't'),
    ];
    expect(detectTransmitterBeforeGateBlock(steps)).toBe(false);
  });

  it('does NOT fire when the downstream gate passes (no block)', () => {
    const steps = [
      step('source', true, 's'),
      step('transmitter', true, 'tx'),
      step('configNode', true, 'cn'),
      step('terminal', true, 't'),
    ];
    expect(detectTransmitterBeforeGateBlock(steps)).toBe(false);
  });

  it('does NOT fire when there is no Transmitter on the pulse', () => {
    const steps = [
      step('source', true, 's'),
      step('configNode', false, 'cn'),
    ];
    expect(detectTransmitterBeforeGateBlock(steps)).toBe(false);
  });

  it('isolates the check per pulse — a block on a different pulse does not count', () => {
    const steps = [
      // pulse 0: transmitter writes, reaches terminal (no block)
      step('source', true, 's'),
      step('transmitter', true, 'tx'),
      step('terminal', true, 't'),
      // pulse 1: a gate blocks, but there is no transmitter before it
      step('source', true, 's'),
      step('configNode', false, 'cn'),
    ];
    expect(detectTransmitterBeforeGateBlock(steps)).toBe(false);
  });
});
