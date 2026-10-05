// AXM-046 PR 1, R1.5 + R1.6 — run until halt, expectedArrivals, expectedTrail.
// Clauses: AXM-046 DESIGN_SPEC DR-11 (run until halt), DR-13 (new success
// fields); twin semantics DH-6..DH-9 and traces b.2/b.3 in
// Pierce - System Engineer/AXM-046_TURING_ENGINE_SCOPE.md.
// Written red first.

import { BLANK } from '../../../src/game/types';
import { HALT_CAP, evaluateRunRequirements, resolvePulseCount, runMachine } from '../../../src/game/runLoop';
import {
  a17Level, a17Solve, a18Level, a18Solve, fixtureLevel, piece, pre, stateForLevel, E,
} from '../../fixtures/axm046EngineFixtures';

describe('DR-11 run until halt', () => {
  it('the halt cap is 16', () => {
    expect(HALT_CAP).toBe(16);
  });

  it('A1-8 hand trace: trail 1010, 1000, 1100 and halt on P3', () => {
    const level = a18Level();
    const run = runMachine(level, stateForLevel(level, a18Solve()), 1);
    expect(run.halted).toBe(true);
    expect(run.pulses).toHaveLength(3);
    expect(run.trailPerPulse).toEqual([[1, 0, 1, 0], [1, 0, 0, 0], [1, 1, 0, 0]]);
    expect(run.finalTrail).toEqual([1, 1, 0, 0]);
    expect(run.reachedPerPulse).toEqual([false, false, true]);
    expect(run.fault).toBeUndefined();
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });

  it('DH-9: the head is recorded per pulse (3, 2, 1) and at the end', () => {
    const level = a18Level();
    const run = runMachine(level, stateForLevel(level, a18Solve()), 1);
    expect(run.headPerPulse).toEqual([3, 2, 1]);
    expect(run.finalHead).toBe(1);
  });

  it('halts on the first accepted pulse even when that is P1', () => {
    const level = a18Level([1, 0, 1, 0], 3, { expectedTrail: [1, 0, 1, 1] });
    const run = runMachine(level, stateForLevel(level, a18Solve()), 1);
    expect(run.pulses).toHaveLength(1);
    expect(run.halted).toBe(true);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });

  it('T-DH-7/8: overflow 1111 walks off the tape and fails non_halting at P5, not at the cap', () => {
    const level = a18Level([1, 1, 1, 1], 3);
    const run = runMachine(level, stateForLevel(level, a18Solve()), 1);
    expect(run.halted).toBe(false);
    expect(run.fault).toEqual({ kind: 'non_halting', pulse: 5 });
    expect(run.pulses).toHaveLength(5);
    expect(evaluateRunRequirements(level, run).failure).toEqual({ kind: 'non_halting', pulse: 5 });
  });

  it('STEPPER set wrong on A1-8: the machine loops and fails non_halting immediately', () => {
    const level = a18Level();
    const run = runMachine(level, stateForLevel(level, a18Solve({ stepper: 'right' })), 1);
    // P1 head 3 -> 4 (trail 1010), P2 off-tape reads blank: state repeats.
    expect(run.fault).toEqual({ kind: 'non_halting', pulse: 2 });
    expect(run.pulses).toHaveLength(2);
  });

  it('fails halt_cap when 16 pulses pass with no halt and no repeated state', () => {
    // A STEPPER RIGHT on a dead end: the head walks right forever, so no
    // state repeats; the halt Terminal is never reached.
    const level = fixtureLevel({
      gridWidth: 10,
      gridHeight: 8,
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 9, 7, { halt: true })],
      dataTrail: { cells: [0], headPosition: 0 },
      headMode: 'driven',
    });
    const run = runMachine(level, stateForLevel(level, [
      piece('conveyor', 1, 0, { rotation: E }),
      piece('stepper', 2, 0, { direction: 'right' }),
    ]), 1);
    expect(run.fault).toEqual({ kind: 'halt_cap', pulse: 16 });
    expect(run.pulses).toHaveLength(HALT_CAP);
    expect(run.headPerPulse).toEqual(Array.from({ length: 16 }, (_, i) => i));
    expect(evaluateRunRequirements(level, run).failure).toEqual({ kind: 'halt_cap', pulse: 16 });
  });

  it('a halt run ignores pulseCount', () => {
    const level = a18Level([1, 0, 1, 1], 3, { pulseCount: 1 });
    const run = runMachine(level, stateForLevel(level, a18Solve()), 1);
    expect(run.pulses).toHaveLength(3);
  });

  it('non_halting includes Latch state: the run fails only once the Latch value repeats', () => {
    // Driven mode, no IN tape: the beam carries 0, so after P1 a DELAY Latch
    // holds 0 forever. The halt Terminal sits off the path. State after P1
    // repeats at P2 (latch 0 both times), so non_halting fires on P2.
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 9, 7, { halt: true })],
      headMode: 'driven',
    });
    const run = runMachine(level, stateForLevel(level, [
      piece('latch', 1, 0, { latchMode: 'delay', storedValue: null }),
    ]), 1);
    expect(run.fault).toEqual({ kind: 'non_halting', pulse: 2 });
  });
});

describe('DR-13 expectedArrivals (exact 1-based pulse set)', () => {
  it('A1-7 passes with arrivals exactly P3..P6', () => {
    const level = a17Level();
    const run = runMachine(level, stateForLevel(level, a17Solve()), 1);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });

  it('a superset of the expected pulses fails as arrivals_mismatch', () => {
    const level = a17Level({ expectedArrivals: [3, 4, 5] });
    const run = runMachine(level, stateForLevel(level, a17Solve()), 1);
    expect(evaluateRunRequirements(level, run).failure).toEqual({
      kind: 'arrivals_mismatch', expected: [3, 4, 5], actual: [3, 4, 5, 6],
    });
  });

  it('a subset fails too', () => {
    const level = a17Level({ expectedArrivals: [2, 3, 4, 5, 6] });
    const run = runMachine(level, stateForLevel(level, a17Solve()), 1);
    expect(evaluateRunRequirements(level, run).passed).toBe(false);
  });
});

describe('DR-13 expectedTrail (the final trail)', () => {
  it('A1-8 with STAMP set wrong halts on a wrong trail: trail_mismatch', () => {
    const level = a18Level();
    const run = runMachine(level, stateForLevel(level, a18Solve({ upperStamp: 0 })), 1);
    expect(run.halted).toBe(true);
    expect(evaluateRunRequirements(level, run).failure).toEqual({
      kind: 'trail_mismatch', expected: [1, 1, 0, 0], actual: [1, 0, 0, 0],
    });
  });

  it('length matters', () => {
    const level = a18Level([1, 0, 1, 1], 3, { expectedTrail: [1, 1, 0] });
    const run = runMachine(level, stateForLevel(level, a18Solve()), 1);
    expect(evaluateRunRequirements(level, run).failure?.kind).toBe('trail_mismatch');
  });
});

describe('pulse count resolution', () => {
  it('pulseCount wins when set; otherwise the caller fallback (IN tape length or 1)', () => {
    expect(resolvePulseCount(fixtureLevel({ pulseCount: 6 }), 1)).toBe(6);
    expect(resolvePulseCount(fixtureLevel({}), 5)).toBe(5);
    expect(resolvePulseCount(fixtureLevel({ inputTape: [1, 0] }), 2)).toBe(2);
  });
});

describe('flags off', () => {
  it('a level with no new flags runs exactly the fallback pulse count, never halts, never faults', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 2, 0)],
      inputTape: [1, 0, 1],
    });
    const state = stateForLevel(level, [piece('conveyor', 1, 0, { rotation: E })]);
    const run = runMachine(level, state, 3);
    expect(run.pulses).toHaveLength(3);
    expect(run.halted).toBe(false);
    expect(run.fault).toBeUndefined();
    expect(run.steps).toEqual(run.pulses.flat());
    expect(state.outputTape).toEqual([BLANK, BLANK, BLANK]);
    expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });
  });
});

describe('#100 review: the pulse index is part of the machine state only while IN is still being read', () => {
  // A driven halt board whose halt Terminal is never reached and whose
  // machine never changes: Source -> Conveyor -> dead end.
  const board = (inputTape: number[]) => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 9, 7, { halt: true })],
      headMode: 'driven',
      inputTape,
    });
    return { level, state: stateForLevel(level, [piece('conveyor', 1, 0, { rotation: E })]) };
  };

  it('an empty IN tape: the unchanged state repeats at once (non_halting P1, not halt_cap)', () => {
    const { level, state } = board([]);
    const run = runMachine(level, state, 1);
    expect(run.fault).toEqual({ kind: 'non_halting', pulse: 1 });
  });

  it('a run past the end of the IN tape fails non_halting one pulse after the tape ends', () => {
    const { level, state } = board([1, 0]);
    const run = runMachine(level, state, 2);
    // P1 and P2 read IN[0] and IN[1]. From P3 on the state no longer depends
    // on the pulse, and it repeats after P3.
    expect(run.fault).toEqual({ kind: 'non_halting', pulse: 3 });
  });
});
