// SE-TM-035 — executed-path topology grading. Covers the direction-change
// counter, the legacy objective check, and the Spec-Sheet-aligned topology gate
// (evaluateTopologyGate) that GameplayScreen now enforces at win time.

import {
  countDirectionChanges,
  meetsDirectionObjectives,
  evaluateTopologyGate,
} from '../../src/game/objectives';
import type { ExecutionStep, LevelDefinition } from '../../src/game/types';

function step(pieceId: string, type: string, success = true): ExecutionStep {
  return { pieceId, type, timestamp: 0, success };
}

function levelWith(minDirectionChanges?: number): Pick<LevelDefinition, 'topologyRequirements'> {
  return minDirectionChanges === undefined
    ? {}
    : { topologyRequirements: { minDirectionChanges } };
}

describe('countDirectionChanges', () => {
  it('counts unique successful gear steps', () => {
    const steps = [
      step('g1', 'gear'),
      step('c1', 'conveyor'),
      step('g2', 'gear'),
      step('g1', 'gear'), // re-traversed same gear — counts once
    ];
    expect(countDirectionChanges(steps)).toBe(2);
  });

  it('ignores failed gear steps and non-gear pieces', () => {
    const steps = [step('g1', 'gear', false), step('c1', 'conveyor'), step('t', 'terminal')];
    expect(countDirectionChanges(steps)).toBe(0);
  });
});

describe('meetsDirectionObjectives', () => {
  it('fails when executed bends are below the objective count', () => {
    const objectives = [{ type: 'min_direction_changes' as const, count: 2 }];
    expect(meetsDirectionObjectives(objectives, [step('g1', 'gear')])).toBe(false);
    expect(meetsDirectionObjectives(objectives, [step('g1', 'gear'), step('g2', 'gear')])).toBe(true);
  });

  it('is vacuously true with no structural objectives', () => {
    expect(meetsDirectionObjectives([{ type: 'reach_output' }], [])).toBe(true);
  });
});

describe('evaluateTopologyGate (SE-TM-035)', () => {
  it('A1-4-like: a single direction change FAILS a two-bend requirement', () => {
    const gate = evaluateTopologyGate(levelWith(2), [step('g1', 'gear'), step('c1', 'conveyor')]);
    expect(gate).toEqual({ required: 2, actual: 1, met: false });
  });

  it('two direction changes MEET the requirement', () => {
    const gate = evaluateTopologyGate(levelWith(2), [step('g1', 'gear'), step('g2', 'gear')]);
    expect(gate.met).toBe(true);
    expect(gate.actual).toBe(2);
  });

  it('a level without a topology requirement always passes (required 0)', () => {
    const gate = evaluateTopologyGate(levelWith(undefined), []);
    expect(gate).toEqual({ required: 0, actual: 0, met: true });
  });
});
