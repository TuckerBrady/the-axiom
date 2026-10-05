// AXM-046 PR 1, R1.8 — regression with the flags off.
// Every existing K1, NF and REPAIR floor and alternate fixture (and the A1
// fixtures, which ride along at no cost) runs through the new run loop with
// no new flag set. The steps, the output tape and the trail must equal the
// master pulse loop exactly, the new requirements must pass vacuously, and
// verifyPuzzle must still solve every fixture.
// Written red first.

import type { LevelDefinition, MachineState, OutputTapeValue, PlacedPiece } from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import { ALL_LEVELS } from '../../../src/game/levels';
import { autoConnectPhysicsPieces, executeMachine } from '../../../src/game/engine';
import { evaluateRunRequirements, runMachine } from '../../../src/game/runLoop';
import { verifyPuzzle } from '../../../src/game/puzzleVerifier';
import { computeSplitterMagnets } from '../../../src/store/gameStore';
import { FLOOR_SOLVES, solvePieces, type SolvePiece } from '../../fixtures/floorSolves';

const NEW_LEVEL_FLAGS = ['checkpoints', 'headMode', 'pulseCount', 'expectedArrivals', 'expectedTrail'] as const;

function freshBoard(level: LevelDefinition, solve: SolvePiece[]) {
  const all = computeSplitterMagnets([
    ...level.prePlacedPieces.map(p => ({
      ...p,
      ports: p.ports.map(q => ({ ...q })),
      storedValue: p.type === 'latch' ? null : p.storedValue,
      firedDuringRun: false,
    })),
    ...solvePieces(solve),
  ]);
  return all;
}

function stateOf(level: LevelDefinition, pieces: PlacedPiece[]): MachineState {
  const hasTape = !!level.inputTape && level.inputTape.length > 0;
  return {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
    configuration: 1,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    inputTape: hasTape ? [...level.inputTape!] : undefined,
    outputTape: hasTape ? (new Array(level.inputTape!.length).fill(BLANK) as OutputTapeValue[]) : undefined,
  };
}

// The master pulse loop (puzzleVerifier.runSolution on e0d2369).
function masterRun(level: LevelDefinition, solve: SolvePiece[]) {
  const state = stateOf(level, freshBoard(level, solve));
  const n = level.inputTape && level.inputTape.length > 0 ? level.inputTape.length : 1;
  const pulses = Array.from({ length: n }, (_, i) => executeMachine(state, i));
  return { pulses, outputTape: state.outputTape, trail: state.dataTrail };
}

const inScope = ALL_LEVELS.filter(l => /^(K1-|NF-|REPAIR-|A1-)/.test(l.id) && FLOOR_SOLVES[l.id]);

describe('R1.8 flags off: every existing fixture runs identically through the new run loop', () => {
  it('covers every K1, NF and REPAIR level', () => {
    const ids = inScope.map(l => l.id);
    for (const prefix of ['K1-', 'NF-', 'REPAIR-']) {
      expect({ prefix, any: ids.some(id => id.startsWith(prefix)) }).toEqual({ prefix, any: true });
    }
  });

  it('no existing level sets a new flag, and no pre-placed piece carries a module, a halt or a new type', () => {
    for (const l of ALL_LEVELS) {
      for (const f of NEW_LEVEL_FLAGS) {
        expect({ id: l.id, f, set: (l as Record<string, unknown>)[f] !== undefined })
          .toEqual({ id: l.id, f, set: false });
      }
      for (const p of l.prePlacedPieces) {
        expect({ id: l.id, p: p.type, extra: !!(p.module || p.halt) || p.type === 'stepper' || p.type === 'stamp' })
          .toEqual({ id: l.id, p: p.type, extra: false });
      }
    }
  });

  for (const level of inScope) {
    for (const which of ['floor', 'alternate'] as const) {
      it(`${level.id} ${which}: steps, tapes and trail equal the master loop; requirements pass; verifies`, () => {
        const solve = FLOOR_SOLVES[level.id][which];
        const master = masterRun(level, solve);

        const state = stateOf(level, freshBoard(level, solve));
        const fallback = level.inputTape && level.inputTape.length > 0 ? level.inputTape.length : 1;
        const run = runMachine(level, state, fallback);

        expect(run.pulses).toEqual(master.pulses);
        expect(run.steps).toEqual(master.pulses.flat());
        expect(state.outputTape).toEqual(master.outputTape);
        expect(state.dataTrail).toEqual(master.trail);
        expect(run.halted).toBe(false);
        expect(run.fault).toBeUndefined();
        expect(evaluateRunRequirements(level, run)).toEqual({ passed: true });

        const all = freshBoard(level, solve);
        const result = verifyPuzzle(
          { ...level, prePlacedPieces: all.filter(p => p.isPrePlaced) },
          all.filter(p => !p.isPrePlaced),
        );
        expect({ id: level.id, which, solvable: result.solvable, why: result.failReason })
          .toEqual({ id: level.id, which, solvable: true, why: undefined });
      });
    }
  }
});
