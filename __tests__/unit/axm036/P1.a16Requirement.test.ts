// AXM-036 P1 (F1 + F12) — [P1-5] / [P1-6]. Tucker ruling R-2: A1-6's old tape
// made the Config Node setting irrelevant (both configs pass the "at least 3"
// gate). New data makes 0 the only correct filter: five 0s / three 1s,
// requiredTerminalCount 4.

import { levelA1_6 } from '../../../src/game/levels';
import { verifyPuzzle, runSolution } from '../../../src/game/puzzleVerifier';
import { deriveShallStatements } from '../../../src/game/spec/specSheet';
import { shallStatementToCopy } from '../../../src/game/spec/specSheetCopy';
import { FLOOR_SOLVES, solvePieces, type SolvePiece } from '../../fixtures/floorSolves';

describe('[P1-5] A1-6 tape, output and count', () => {
  it('matches the contract data exactly', () => {
    expect(levelA1_6.inputTape).toEqual([0, 1, 0, 0, 1, 0, 1, 0]);
    expect(levelA1_6.expectedOutput).toEqual([0, 0, 0, 0, 0]);
    expect(levelA1_6.requiredTerminalCount).toBe(4);
    // WILL lines unchanged: still 8 values in {0,1}.
    expect(levelA1_6.inputTape).toHaveLength(8);
    expect(levelA1_6.inputTape!.every(v => v === 0 || v === 1)).toBe(true);
  });
});

describe('[P1-5] A1-6 SHALL copy reads At least 4', () => {
  it('derives "At least 4 pulses SHALL reach the Terminal."', () => {
    const shall = deriveShallStatements(levelA1_6).map(shallStatementToCopy);
    expect(shall).toContain('At least 4 pulses SHALL reach the Terminal.');
  });
});

// The A1-6 floor solve (both Config Nodes at 0): scan(1,1), cfg(2,1,0),
// cfg(3,1,0), run(4,1..8,1,E), g(9,1), run(9,2..9,4,S). Source (0,1),
// Terminal (9,5). __tests__/fixtures/floorSolves.ts.
const floorAtZero = FLOOR_SOLVES['A1-6'].floor;

function withConfigValues(solve: SolvePiece[], values: number[]): SolvePiece[] {
  let i = 0;
  return solve.map(p => (p.type === 'configNode' ? { ...p, configValue: values[i++] } : p));
}

function withBypass(solve: SolvePiece[]): SolvePiece[] {
  return solve.map(p => (p.type === 'configNode' ? { type: 'conveyor', x: p.x, y: p.y, rotation: 0 } : p));
}

describe('[P1-6] floor solve with gates at 0 passes, reaching 5', () => {
  it('verifyPuzzle: solvable true', () => {
    const result = verifyPuzzle(levelA1_6, solvePieces(floorAtZero));
    expect(result.solvable).toBe(true);
  });

  it('runSolution: reachedCount is 5', () => {
    const run = runSolution(levelA1_6, solvePieces(floorAtZero));
    expect(run.reachedCount).toBe(5);
  });
});

describe('[P1-6] gates at 1 fail, reaching 3', () => {
  const bothOne = withConfigValues(floorAtZero, [1, 1]);

  it('verifyPuzzle: solvable false', () => {
    const result = verifyPuzzle(levelA1_6, solvePieces(bothOne));
    expect(result.solvable).toBe(false);
  });

  it('runSolution: reachedCount is 3', () => {
    const run = runSolution(levelA1_6, solvePieces(bothOne));
    expect(run.reachedCount).toBe(3);
  });
});

describe('[P1-6] mixed gates fail', () => {
  it('verifyPuzzle: solvable false for one 0, one 1', () => {
    const mixed = withConfigValues(floorAtZero, [0, 1]);
    expect(verifyPuzzle(levelA1_6, solvePieces(mixed)).solvable).toBe(false);
  });
});

describe('[P1-6] bypass without Config Nodes fails', () => {
  it('verifyPuzzle: solvable false when both Config Node cells are rotation:0 conveyors', () => {
    const bypass = withBypass(floorAtZero);
    expect(verifyPuzzle(levelA1_6, solvePieces(bypass)).solvable).toBe(false);
  });
});
