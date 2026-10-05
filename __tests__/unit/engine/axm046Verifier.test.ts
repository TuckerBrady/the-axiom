// AXM-046 PR 1, R1.7 — puzzleVerifier is the sim of record. It must model
// checkpoints, the READ/WRITE modules, the driven head and halt, so that
// floorSolves.test.ts can verify every A1 level in PR 3 (DR-12).
// Also R1.5 in the live run loop: gameStore.engage runs until halt.
// Written red first.

import type { LevelDefinition, PlacedPiece } from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import { runSolution, verifyPuzzle } from '../../../src/game/puzzleVerifier';
import { computeSplitterMagnets, useGameStore } from '../../../src/store/gameStore';
import {
  a17Level, a17Solve, a18Level, a18Solve, fixtureLevel, piece, pre, E,
} from '../../fixtures/axm046EngineFixtures';

// The live game recomputes Splitter magnets on every placement; verifyPuzzle
// does not, so (as floorSolves.test.ts does) the board is built first.
function boardFor(level: LevelDefinition, solve: PlacedPiece[]) {
  const all = computeSplitterMagnets([
    ...level.prePlacedPieces.map(p => ({ ...p, ports: p.ports.map(q => ({ ...q })) })),
    ...solve,
  ]);
  return {
    level: { ...level, prePlacedPieces: all.filter(p => p.isPrePlaced) },
    player: all.filter(p => !p.isPrePlaced),
  };
}

function verify(level: LevelDefinition, solve: PlacedPiece[]) {
  const b = boardFor(level, solve);
  return verifyPuzzle(b.level, b.player);
}

describe('R1.7 verifyPuzzle: driven head and expectedArrivals (A1-7 trace)', () => {
  it('the floor layout verifies', () => {
    expect(verify(a17Level(), a17Solve())).toMatchObject({ solvable: true });
  });

  it('each wrong tap setting fails, naming arrivals_mismatch', () => {
    for (const o of [{ upperGate: 1 as const }, { lowerGate: 0 as const }, { stepper: 'left' as const }]) {
      const r = verify(a17Level(), a17Solve(o));
      expect({ o, solvable: r.solvable, why: r.failReason?.includes('arrivals_mismatch') })
        .toEqual({ o, solvable: false, why: true });
    }
  });

  it('runSolution exposes the per-pulse head and the run', () => {
    const b = boardFor(a17Level(), a17Solve());
    const run = runSolution(b.level, b.player);
    expect(run.reachedPerPulse).toEqual([false, false, true, true, true, true]);
    expect(run.run.headPerPulse).toEqual([0, 1, 2, 2, 2, 2]);
  });
});

describe('R1.7 verifyPuzzle: halt and expectedTrail (A1-8 trace)', () => {
  it('the floor layout verifies', () => {
    expect(verify(a18Level(), a18Solve())).toMatchObject({ solvable: true });
  });

  it('a wrong STEPPER fails as non_halting', () => {
    const r = verify(a18Level(), a18Solve({ stepper: 'right' }));
    expect(r.solvable).toBe(false);
    expect(r.failReason).toContain('non_halting');
  });

  it('a wrong STAMP fails as trail_mismatch', () => {
    const r = verify(a18Level(), a18Solve({ upperStamp: 0 }));
    expect(r.solvable).toBe(false);
    expect(r.failReason).toContain('trail_mismatch');
  });

  it('every wrong Config, STEPPER and STAMP setting fails', () => {
    const variants = [
      { upperGate: 1 as const }, { lowerGate: 0 as const },
      { upperStamp: 0 as const }, { lowerStamp: 1 as const }, { stepper: 'right' as const },
    ];
    for (const o of variants) {
      expect({ o, solvable: verify(a18Level(), a18Solve(o)).solvable }).toEqual({ o, solvable: false });
    }
  });

  it('the dual-STAMP fault fails as stamp_conflict', () => {
    const r = verify(a18Level(), a18Solve({ upperGate: 1 }));
    expect(r.solvable).toBe(false);
    expect(r.failReason).toContain('stamp_conflict');
  });
});

describe('R1.7 verifyPuzzle: checkpoints', () => {
  const level = (checkpoints: { x: number; y: number }[]) => fixtureLevel({
    prePlacedPieces: [pre('source', 0, 0), pre('terminal', 3, 0)],
    checkpoints,
  });
  const route = () => [piece('conveyor', 1, 0, { rotation: E }), piece('conveyor', 2, 0, { rotation: E })];

  it('passes through every checkpoint: solvable', () => {
    expect(verify(level([{ x: 1, y: 0 }, { x: 2, y: 0 }]), route()).solvable).toBe(true);
  });

  it('misses one: checkpoint_missed', () => {
    const r = verify(level([{ x: 1, y: 1 }]), route());
    expect(r.solvable).toBe(false);
    expect(r.failReason).toContain('checkpoint_missed');
  });
});

describe('R1.7 verifyPuzzle: modules', () => {
  it('a seated READ feeds a trail-reading Config beside the Source', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0, { module: 'read' }), pre('terminal', 3, 0)],
      inputTape: [1, 0, 1],
      dataTrail: { cells: [null, null, null], headPosition: 0 },
      requiredTerminalCount: 2,
      expectedOutput: [1],
    });
    const r = runSolution(level, [
      piece('configNode', 1, 0, { configValue: 1 }),
      piece('conveyor', 2, 0, { rotation: E }),
    ]);
    expect(r.reachedPerPulse).toEqual([true, false, true]);
  });

  it('a seated WRITE on a live-gate tape level verifies', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 3, 0, { module: 'write' })],
      inputTape: [1, 0, 1],
      expectedOutput: [0, 1, 0],
    });
    const player = [piece('inverter', 1, 0), piece('conveyor', 2, 0, { rotation: E })];
    expect(verify(level, player).solvable).toBe(true);
    expect(runSolution(level, player).outputTape).toEqual([0, 1, 0]);
  });

  it('without WRITE the same board leaves OUT blank and fails', () => {
    const level = fixtureLevel({
      prePlacedPieces: [pre('source', 0, 0), pre('terminal', 3, 0)],
      inputTape: [1, 0, 1],
      expectedOutput: [0, 1, 0],
    });
    const player = [piece('inverter', 1, 0), piece('conveyor', 2, 0, { rotation: E })];
    expect(verify(level, player).solvable).toBe(false);
    expect(runSolution(level, player).outputTape).toEqual([BLANK, BLANK, BLANK]);
  });
});

describe('R1.5 the live run loop (gameStore.engage) runs until halt', () => {
  function engage(level: LevelDefinition, solve: PlacedPiece[]) {
    const b = boardFor(level, solve);
    useGameStore.getState().setLevel(b.level);
    const pieces = [...useGameStore.getState().machineState.pieces, ...b.player];
    useGameStore.setState({
      machineState: { ...useGameStore.getState().machineState, pieces },
    });
    const steps = useGameStore.getState().engage();
    return { steps, store: useGameStore.getState() };
  }

  it('A1-8 trace: three pulses, halted, succeeded, head recorded per pulse', () => {
    const { steps, store } = engage(a18Level(), a18Solve());
    expect(steps.filter(s => s.type === 'source')).toHaveLength(3);
    expect(store.lastRun?.halted).toBe(true);
    expect(store.lastRun?.headPerPulse).toEqual([3, 2, 1]);
    expect(store.runVerdict).toEqual({ passed: true });
    expect(store.machineState.status).toBe('idle');
    expect(store.machineState.dataTrail.cells).toEqual([1, 1, 0, 0]);
  });

  it('A1-8 with the STEPPER wrong: non_halting, status void', () => {
    const { store } = engage(a18Level(), a18Solve({ stepper: 'right' }));
    expect(store.runVerdict).toEqual({ passed: false, failure: { kind: 'non_halting', pulse: 2 } });
    expect(store.machineState.status).toBe('void');
  });

  it('A1-7 trace: six pulses from pulseCount, arrivals P3..P6', () => {
    const { steps, store } = engage(a17Level(), a17Solve());
    expect(steps.filter(s => s.type === 'source')).toHaveLength(6);
    expect(store.lastRun?.reachedPerPulse).toEqual([false, false, true, true, true, true]);
    expect(store.runVerdict).toEqual({ passed: true });
  });
});
