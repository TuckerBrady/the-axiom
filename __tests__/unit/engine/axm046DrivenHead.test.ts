// AXM-046 PR 1, R1.3 + R1.4 — driven head, STEPPER, STAMP.
// Clauses: AXM-046 DESIGN_SPEC DR-7 (driven head), DR-8 (STEPPER), DR-9
// (STAMP), DR-10 (pulse order); twin semantics DH-2..DH-5 and DH-9 in
// Pierce - System Engineer/AXM-046_TURING_ENGINE_SCOPE.md b.1.
// Written red first.

import type { ExecutionStep, PlacedPiece } from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import {
  executeMachine,
  getDefaultPorts,
  getDirectionalNeighbors,
  getPieceCategory,
  nextStampValue,
  nextStepperDirection,
} from '../../../src/game/engine';
import { runMachine, evaluateRunRequirements } from '../../../src/game/runLoop';
import {
  a17Level, a17Solve, a18Level, a18Solve, fixtureLevel, line, piece, pre, stateFor, stateForLevel, E,
} from '../../fixtures/axm046EngineFixtures';

const DRIVEN = { headMode: 'driven' as const };
const cfg = (v: 0 | 1) => piece('configNode', 0, 0, { configValue: v });
const step = (dir: 'left' | 'right') => piece('stepper', 0, 0, { direction: dir });
const stamp = (v: 0 | 1) => piece('stamp', 0, 0, { value: v });
const reached = (steps: ExecutionStep[]) => steps.some(s => s.type === 'terminal' && s.success);
const gateOf = (steps: ExecutionStep[]) => steps.find(s => s.type === 'configNode');

describe('R1.4 piece surface', () => {
  it('stepper and stamp are Protocol pieces', () => {
    expect(getPieceCategory('stepper')).toBe('protocol');
    expect(getPieceCategory('stamp')).toBe('protocol');
  });

  it('stepper and stamp are straight-through', () => {
    for (const type of ['stepper', 'stamp'] as const) {
      const p = piece(type, 1, 1);
      const around: PlacedPiece[] = [
        piece('gear', 1, 0), piece('gear', 1, 2), piece('gear', 0, 1), piece('gear', 2, 1),
      ];
      const out = getDirectionalNeighbors(p, [p, ...around], 'left');
      expect(out.map(n => `${n.gridX},${n.gridY}`)).toEqual(['2,1']);
    }
  });

  it('DR-8 tap cycles STEPPER direction RIGHT <-> LEFT; unset reads as RIGHT', () => {
    expect(nextStepperDirection('right')).toBe('left');
    expect(nextStepperDirection('left')).toBe('right');
    expect(nextStepperDirection(undefined)).toBe('left');
  });

  it('DR-9 tap cycles STAMP value 1 <-> 0; unset reads as 1', () => {
    expect(nextStampValue(1)).toBe(0);
    expect(nextStampValue(0)).toBe(1);
    expect(nextStampValue(undefined)).toBe(0);
  });

  it('getDefaultPorts gives the new types four ports', () => {
    expect(getDefaultPorts('stepper')).toHaveLength(4);
    expect(getDefaultPorts('stamp')).toHaveLength(4);
  });
});

describe('DR-7 driven head: Config reads TRAIL[head] from the pulse-start snapshot', () => {
  it('reads the head cell, not the pulse-index cell', () => {
    // pulse 0, head 2: TRAIL[0] = 0, TRAIL[2] = 1. Gate 1 passes only on the head read.
    const pieces = line([cfg(1), 'conveyor']);
    const driven = executeMachine(stateFor(pieces, [0, 0, 1], 2), 0, DRIVEN);
    const pulse = executeMachine(stateFor(line([cfg(1), 'conveyor']), [0, 0, 1], 2), 0);
    expect(gateOf(driven)?.success).toBe(true);
    expect(gateOf(pulse)?.success).toBe(false);
  });

  it('T-DH-2a: an empty trail blocks gate 1 in driven mode; pulse mode default-passes', () => {
    const driven = executeMachine(stateFor(line([cfg(1), 'conveyor']), [], 0), 0, DRIVEN);
    const pulse = executeMachine(stateFor(line([cfg(1), 'conveyor']), [], 0), 0);
    expect(gateOf(driven)?.success).toBe(false);
    expect(gateOf(pulse)?.success).toBe(true);
  });

  it('T-DH-2b: a head off the tape reads blank and fails both gate values', () => {
    for (const head of [-1, 4]) {
      for (const v of [0, 1] as const) {
        const steps = executeMachine(stateFor(line([cfg(v), 'conveyor']), [0, 1, 0, 1], head), 0, DRIVEN);
        expect({ head, v, pass: gateOf(steps)?.success }).toEqual({ head, v, pass: false });
      }
    }
  });

  it('a blank cell under the head fails both gate values', () => {
    for (const v of [0, 1] as const) {
      const steps = executeMachine(stateFor(line([cfg(v), 'conveyor']), [null, 1], 0), 0, DRIVEN);
      expect(gateOf(steps)?.success).toBe(false);
    }
  });
});

describe('DR-8 STEPPER: queues a one-cell head move, applied after the pulse', () => {
  it('RIGHT moves +1 and LEFT moves -1 after the pulse', () => {
    const r = stateFor(line([step('right'), 'conveyor']), [0, 0, 0], 1);
    executeMachine(r, 0, DRIVEN);
    expect(r.dataTrail.headPosition).toBe(2);
    const l = stateFor(line([step('left'), 'conveyor']), [0, 0, 0], 1);
    executeMachine(l, 0, DRIVEN);
    expect(l.dataTrail.headPosition).toBe(0);
  });

  it('a Config after a STEPPER on the same path still reads the snapshot head', () => {
    // head 0 holds 1, head 1 holds 0. STEPPER RIGHT then gate 1: reads TRAIL[0] = 1.
    const steps = executeMachine(stateFor(line([step('right'), cfg(1), 'conveyor']), [1, 0], 0), 0, DRIVEN);
    expect(gateOf(steps)?.success).toBe(true);
  });

  it('A7: several STEPPERs in one pulse sum their moves', () => {
    const s = stateFor(line([step('right'), step('right'), 'conveyor']), [0, 0, 0, 0], 0);
    executeMachine(s, 0, DRIVEN);
    expect(s.dataTrail.headPosition).toBe(2);
  });

  it('DH-9: the STEPPER step carries headBefore', () => {
    const steps = executeMachine(stateFor(line([step('right'), 'conveyor']), [0, 0], 1), 0, DRIVEN);
    expect(steps.find(s => s.type === 'stepper')).toMatchObject({ success: true, headBefore: 1 });
  });
});

describe('DR-9 STAMP: queues a write to TRAIL[head], applied after the pulse', () => {
  it('writes its value at the head after the pulse', () => {
    const s = stateFor(line([stamp(1), 'conveyor']), [0, 0, 0], 1);
    executeMachine(s, 0, DRIVEN);
    expect(s.dataTrail.cells).toEqual([0, 1, 0]);
  });

  it('a Config after a STAMP in the same pulse reads the old value', () => {
    const steps = executeMachine(stateFor(line([stamp(1), cfg(0), 'conveyor']), [0], 0), 0, DRIVEN);
    expect(gateOf(steps)?.success).toBe(true);
  });

  it('T-DH-3: STAMP then STEPPER and STEPPER then STAMP give the identical trail (write at h0, then move)', () => {
    const a = stateFor(line([stamp(0), step('left'), 'conveyor']), [1, 1, 1, 1], 3);
    const b = stateFor(line([step('left'), stamp(0), 'conveyor']), [1, 1, 1, 1], 3);
    executeMachine(a, 0, DRIVEN);
    executeMachine(b, 0, DRIVEN);
    expect(a.dataTrail).toEqual({ cells: [1, 1, 1, 0], headPosition: 2 });
    expect(b.dataTrail).toEqual(a.dataTrail);
  });

  it('identical STAMP values in one pulse are legal', () => {
    const s = stateFor(line([stamp(1), stamp(1), 'conveyor']), [0], 0);
    const steps = executeMachine(s, 0, DRIVEN);
    expect(steps.some(x => x.type === 'stampConflict')).toBe(false);
    expect(s.dataTrail.cells).toEqual([1]);
  });

  it('DH-9: the STAMP step carries headBefore', () => {
    const steps = executeMachine(stateFor(line([stamp(0), 'conveyor']), [1, 1], 1), 0, DRIVEN);
    expect(steps.find(s => s.type === 'stamp')).toMatchObject({ success: true, headBefore: 1 });
  });

  it('a STAMP with the head off the tape writes nothing', () => {
    const s = stateFor(line([stamp(1), 'conveyor']), [0, 0], 2);
    executeMachine(s, 0, DRIVEN);
    expect(s.dataTrail.cells).toEqual([0, 0]);
  });
});

describe('DR-9 dual-STAMP fault: stamp_conflict', () => {
  it('two STAMPs queuing different values in one pulse fault, and nothing commits', () => {
    const s = stateFor(line([stamp(0), step('right'), stamp(1), 'conveyor']), [1, 1], 0);
    const steps = executeMachine(s, 0, DRIVEN);
    expect(steps.filter(x => x.type === 'stampConflict')).toHaveLength(1);
    expect(steps.find(x => x.type === 'stampConflict')!.success).toBe(false);
    expect(s.dataTrail).toEqual({ cells: [1, 1], headPosition: 0 });
  });

  it('the run stops on the faulting pulse with failure kind stamp_conflict', () => {
    // Both branches of the A1-8 board stamp: upper gate set to pass on 1 and
    // stamp 1, lower stamps 0, both reading TRAIL[3] = 1.
    const level = a18Level();
    const run = runMachine(level, stateForLevel(level, a18Solve({ upperGate: 1 })), 1);
    expect(run.fault).toEqual({ kind: 'stamp_conflict', pulse: 1 });
    expect(run.pulses).toHaveLength(1);
    expect(evaluateRunRequirements(level, run).failure).toEqual({ kind: 'stamp_conflict', pulse: 1 });
  });
});

describe('DR-10 pulse order in driven mode', () => {
  it('T-DH-5: the pulse runs to completion after a Terminal accepts; a STEPPER on a longer branch still commits', () => {
    // Splitter at (1,0). East: straight to the Terminal at (2,0).
    // South: (1,1) conveyor, (1,2) conveyor, (1,3) STEPPER RIGHT, dead end.
    const pieces = [
      pre('source', 0, 0),
      piece('splitter', 1, 0),
      pre('terminal', 2, 0),
      piece('conveyor', 1, 1, { rotation: 90 }),
      piece('conveyor', 1, 2, { rotation: 90 }),
      piece('stepper', 1, 3, { direction: 'right' }),
    ];
    const s = stateFor(pieces, [0, 0], 0);
    const steps = executeMachine(s, 0, DRIVEN);
    expect(reached(steps)).toBe(true);
    const t = steps.findIndex(x => x.type === 'terminal' && x.success);
    const st = steps.findIndex(x => x.type === 'stepper');
    expect(st).toBeGreaterThan(t);
    expect(s.dataTrail.headPosition).toBe(1);
  });

  it('a branch that ends without a Terminal is not a failure: no void step in driven mode', () => {
    const pieces = [pre('source', 0, 0), piece('conveyor', 1, 0, { rotation: E }), piece('stepper', 2, 0)];
    const steps = executeMachine(stateFor(pieces, [0], 0), 0, DRIVEN);
    expect(steps.some(x => x.type === 'void')).toBe(false);
    const pulse = executeMachine(stateFor([pre('source', 0, 0), piece('conveyor', 1, 0, { rotation: E })], [0], 0), 0);
    expect(pulse.some(x => x.type === 'void')).toBe(true);
  });

  it('the beam carries 0 with no IN tape', () => {
    const latch = piece('latch', 0, 0, { latchMode: 'write', storedValue: null });
    const s = stateFor(line([latch, 'conveyor']), [], 0);
    executeMachine(s, 0, DRIVEN);
    expect(s.pieces.find(p => p.type === 'latch')!.storedValue).toBe(0);
  });

  it('DH-9: the Source step carries headAtPulseStart in driven mode only', () => {
    const d = executeMachine(stateFor(line(['conveyor']), [0, 0], 1), 0, DRIVEN);
    const p = executeMachine(stateFor(line(['conveyor']), [0, 0], 1), 0);
    expect(d[0]).toMatchObject({ type: 'source', headAtPulseStart: 1 });
    expect(p[0].headAtPulseStart).toBeUndefined();
  });
});

describe('flags off: STEPPER and STAMP outside driven mode', () => {
  it('pass the beam straight through and leave the trail and head alone', () => {
    const s = stateFor(line([stamp(1), step('right'), 'conveyor']), [0, 0], 0);
    const steps = executeMachine(s, 0);
    expect(reached(steps)).toBe(true);
    expect(s.dataTrail).toEqual({ cells: [0, 0], headPosition: 0 });
  });
});

describe('hand trace A1-7 on the engine (driven, 6 pulses)', () => {
  it('arrivals P3..P6, head holds at 2', () => {
    const level = a17Level();
    const run = runMachine(level, stateForLevel(level, a17Solve()), 1);
    expect(run.reachedPerPulse).toEqual([false, false, true, true, true, true]);
    expect(run.headPerPulse).toEqual([0, 1, 2, 2, 2, 2]);
    expect(run.finalHead).toBe(2);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });

  it('dead-end pulses P1 and P2 carry no void step', () => {
    const level = a17Level();
    const run = runMachine(level, stateForLevel(level, a17Solve()), 1);
    expect(run.pulses[0].some(s => s.type === 'void')).toBe(false);
    expect(run.pulses[1].some(s => s.type === 'void')).toBe(false);
  });

  it('every wrong tap setting fails the exact arrival set', () => {
    for (const o of [{ upperGate: 1 as const }, { lowerGate: 0 as const }, { stepper: 'left' as const }]) {
      const level = a17Level();
      const run = runMachine(level, stateForLevel(level, a17Solve(o)), 1);
      expect({ o, passed: evaluateRunRequirements(level, run).passed }).toEqual({ o, passed: false });
    }
  });
});

describe('driven level with no driven pieces still uses fixtureLevel defaults', () => {
  it('a driven level without STEPPER reads a constant head', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 3, 0)],
      dataTrail: { cells: [1, 0, 0], headPosition: 0 },
      headMode: 'driven',
      pulseCount: 3,
    });
    const run = runMachine(level, stateForLevel(level, [cfg(1), piece('conveyor', 2, 0)].map((p, i) => ({ ...p, gridX: i + 1 }))), 1);
    expect(run.reachedPerPulse).toEqual([true, true, true]);
    expect(run.headPerPulse).toEqual([0, 0, 0]);
  });
});

describe('#100 review: what still commits on a stamp_conflict pulse', () => {
  it('READ and WRITE module writes land; STAMP writes and head moves do not; the run stops and fails', () => {
    // READ on the Source, two conflicting STAMPs and a STEPPER, WRITE on the
    // Terminal. Trail [null, 0], head 1, IN [1].
    const pieces = line([stamp(0), step('right'), stamp(1), 'conveyor'], {
      source: { module: 'read' }, terminal: { module: 'write' },
    });
    const level = fixtureLevel({ headMode: 'driven', inputTape: [1], pulseCount: 3 });
    const state = stateFor(pieces, [null, 0], 1, { inputTape: [1], outputTape: [BLANK] });
    const run = runMachine(level, state, 1);
    expect(run.fault).toEqual({ kind: 'stamp_conflict', pulse: 1 });
    expect(run.pulses).toHaveLength(1);
    // READ wrote TRAIL[0]; no STAMP landed at head 1 and the head did not move.
    expect(state.dataTrail).toEqual({ cells: [1, 0], headPosition: 1 });
    // WRITE committed OUT[0].
    expect(state.outputTape).toEqual([1]);
    expect(evaluateRunRequirements(level, run).passed).toBe(false);
  });
});
