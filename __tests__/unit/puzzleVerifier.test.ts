import { verifyPuzzle, verifyPieceAvailability } from '../../src/game/puzzleVerifier';
import { getDefaultPorts, getPieceCategory } from '../../src/game/engine';
import type { PlacedPiece, LevelDefinition } from '../../src/game/types';

function mp(id: string, type: PlacedPiece['type'], x: number, y: number, pre = false): PlacedPiece {
  return {
    id, type, category: getPieceCategory(type), gridX: x, gridY: y,
    ports: getDefaultPorts(type), rotation: 0, isPrePlaced: pre,
  };
}

const BASE_LEVEL: LevelDefinition = {
  id: 'test', name: 'Test', sector: 'test', description: '', cogsLine: '',
  gridWidth: 8, gridHeight: 7,
  prePlacedPieces: [mp('s', 'inputPort', 1, 3, true), mp('o', 'outputPort', 5, 3, true)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 3,
};

describe('verifyPuzzle', () => {
  it('solvable with correct path', () => {
    const solution = [mp('c1', 'conveyor', 2, 3), mp('c2', 'conveyor', 3, 3), mp('c3', 'conveyor', 4, 3)];
    const result = verifyPuzzle(BASE_LEVEL, solution);
    expect(result.solvable).toBe(true);
    expect(result.actualOptimalCount).toBe(3);
  });

  it('fails with no path to output', () => {
    const solution = [mp('c1', 'conveyor', 2, 3)]; // too short
    const result = verifyPuzzle(BASE_LEVEL, solution);
    expect(result.solvable).toBe(false);
    expect(result.failReason).toBeDefined();
  });

  it('fails with overlapping pieces', () => {
    const solution = [mp('c1', 'conveyor', 1, 3), mp('c2', 'conveyor', 1, 3)]; // overlap with each other AND prePlaced
    const result = verifyPuzzle(BASE_LEVEL, solution);
    expect(result.solvable).toBe(false);
    expect(result.failReason).toContain('Overlapping');
  });

  it('fails with out-of-bounds piece', () => {
    const solution = [mp('c1', 'conveyor', -1, 3)];
    const result = verifyPuzzle(BASE_LEVEL, solution);
    expect(result.solvable).toBe(false);
    expect(result.failReason).toContain('outside grid');
  });
});

describe('verifyPieceAvailability', () => {
  it('returns true when solution pieces are available', () => {
    const solution = [mp('c1', 'conveyor', 2, 3), mp('c2', 'conveyor', 3, 3)];
    expect(verifyPieceAvailability(BASE_LEVEL, solution)).toBe(true);
  });

  it('returns false when solution needs more pieces than available', () => {
    const solution = [
      mp('c1', 'conveyor', 2, 3), mp('c2', 'conveyor', 3, 3),
      mp('c3', 'conveyor', 4, 3), mp('c4', 'conveyor', 4, 4),
    ];
    expect(verifyPieceAvailability(BASE_LEVEL, solution)).toBe(false);
  });
});
