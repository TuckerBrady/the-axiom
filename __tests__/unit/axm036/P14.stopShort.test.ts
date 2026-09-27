// AXM-036 P14 — live-gate levels must deliver every non-blank pulse to the
// Terminal (contract section 12c). The A1-7 "stop-short" board is the
// Architect's probe: the floor solve with the Transmitter moved from (9,4) to
// (9,3), leaving (9,4) empty. The correct value still lands on the output
// tape, but the signal never continues on to the physical Terminal at (9,5).
// On master this is (incorrectly) solvable and (incorrectly) a win.

import * as fs from 'fs';
import * as path from 'path';
import { ALL_LEVELS } from '../../../src/game/levels';
import type { LevelDefinition, PlacedPiece } from '../../../src/game/types';
import { runSolution, verifyPuzzle } from '../../../src/game/puzzleVerifier';
import { computeSplitterMagnets, useGameStore } from '../../../src/store/gameStore';
import { FLOOR_SOLVES, solvePieces, type SolvePiece } from '../../fixtures/floorSolves';

// Fresh copies of a level's pre-placed pieces (executeMachine mutates piece
// state — Latch storedValue, firedDuringRun), mirroring floorSolves.test.ts.
function freshPrePlaced(level: LevelDefinition): PlacedPiece[] {
  return level.prePlacedPieces.map(p => ({
    ...p,
    ports: p.ports.map(port => ({ ...port })),
    storedValue: p.type === 'latch' ? null : p.storedValue,
    firedDuringRun: false,
  }));
}

// The board as the live game holds it after the solve is placed (magnets
// recomputed the way GameplayScreen does on every placement).
function boardFor(level: LevelDefinition, solve: SolvePiece[]) {
  const all = computeSplitterMagnets([...freshPrePlaced(level), ...solvePieces(solve)]);
  return {
    level: { ...level, prePlacedPieces: all.filter(p => p.isPrePlaced) },
    player: all.filter(p => !p.isPrePlaced),
  };
}

const A1_7 = ALL_LEVELS.find(l => l.id === 'A1-7')!;

// A1-7's floor solve (__tests__/fixtures/floorSolves.ts) with the Transmitter
// moved from (9,4) to (9,3); (9,4) is left empty.
const STOP_SHORT_SOLVE: SolvePiece[] = FLOOR_SOLVES['A1-7'].floor
  .filter(p => !(p.x === 9 && (p.y === 3 || p.y === 4)))
  .concat([{ type: 'transmitter', x: 9, y: 3 }]);

describe('P14 stop-short', () => {
  test('[P14-6] A1-7 stop-short is not solvable', () => {
    const { level, player } = boardFor(A1_7, STOP_SHORT_SOLVE);
    const run = runSolution(level, player);

    // Precondition: the value written to the output tape is correct, but no
    // pulse reached the Terminal.
    expect(run.outputTape).toEqual(level.expectedOutput);
    expect(run.reachedCount).toBe(0);

    const result = verifyPuzzle(level, player);
    expect(result.solvable).toBe(false);
  });

  test('[P14-6] GUARD: every live-gate level\'s floor and alternate solve stays solvable', () => {
    const liveGateLevels = ALL_LEVELS.filter(
      l => !!l.expectedOutput && !!l.inputTape && l.expectedOutput.length === l.inputTape.length,
    );
    expect(liveGateLevels.length).toBeGreaterThan(0);

    for (const level of liveGateLevels) {
      const solves = FLOOR_SOLVES[level.id];
      if (!solves) continue;
      const cases: Array<['floor' | 'alternate', SolvePiece[]]> = [
        ['floor', solves.floor],
        ['alternate', solves.alternate],
      ];
      for (const [name, solve] of cases) {
        const { level: builtLevel, player } = boardFor(level, solve);
        const result = verifyPuzzle(builtLevel, player);
        expect({ id: level.id, name, solvable: result.solvable, why: result.failReason })
          .toEqual({ id: level.id, name, solvable: true, why: undefined });
      }
    }
  });

  test('[P14-6] runSolution reports reachedPerPulse', () => {
    const { level, player } = boardFor(A1_7, FLOOR_SOLVES['A1-7'].floor);
    const run = runSolution(level, player);

    expect(run.reachedPerPulse).toEqual([true, true, false, true, false, false, true, true]);
  });

  test('[P14-5] store: executeAndScore on the stop-short board does not succeed', () => {
    const { level, player } = boardFor(A1_7, STOP_SHORT_SOLVE);
    useGameStore.getState().setLevel(level);
    for (const p of player) {
      useGameStore.getState().placePiece(p.type, p.gridX, p.gridY, p.rotation);
    }
    useGameStore.getState().engage();

    expect(useGameStore.getState().machineState.status).toBe('void');
  });

  test('[P14-2] GameplayScreen live-gate metPulseRequirement uses evaluateLiveGate', () => {
    const screenSrc = fs.readFileSync(
      path.join(__dirname, '../../../src/screens/GameplayScreen.tsx'),
      'utf8',
    );
    expect(screenSrc).toMatch(/evaluateLiveGate/);
    // SpecSheetPanel.test.tsx:106 pins this exact success expression; P14 must
    // not change it.
    expect(screenSrc).toMatch(/!wrongOutput && metPulseRequirement && topoGate\.met/);
  });

  test('[P14-4] modal line for reason undelivered', () => {
    const line = 'The output tape is correct. The signal never reached the Terminal. A result that is not delivered has not been produced.';

    const modalsSrc = fs.readFileSync(
      path.join(__dirname, '../../../src/components/gameplay/GameplayModals.tsx'),
      'utf8',
    );
    expect(modalsSrc).toContain(line);

    const dialogueDoc = fs.readFileSync(
      path.join(__dirname, '../../../docs/DIALOGUE_SYSTEM.md'),
      'utf8',
    );
    expect(dialogueDoc).toContain(line);
  });
});
