// Tests — evaluateMinPieces hard-floor gate.
//
// Contract: a completing run must engage at least level.minPieces player-placed
// pieces (pre-placed pieces excluded, non-fired pieces excluded), pushing the
// Engineer toward elaborate machines rather than minimal wires. A level with no
// minPieces (undefined or <= 0) always reports met: true.

import type { LevelDefinition, PlacedPiece } from '../../../src/game/types';
import { evaluateMinPieces, getDefaultPorts, getPieceCategory } from '../../../src/game/engine';

function makePiece(
  id: string,
  type: PlacedPiece['type'],
  opts: { prePlaced?: boolean; fired?: boolean } = {},
): PlacedPiece {
  return {
    id,
    type,
    category: getPieceCategory(type),
    gridX: 0,
    gridY: 0,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: opts.prePlaced ?? false,
    firedDuringRun: opts.fired ?? false,
  };
}

// Minimal level stub — only minPieces matters for this gate.
function levelWithMin(minPieces?: number): LevelDefinition {
  return { minPieces } as unknown as LevelDefinition;
}

describe('evaluateMinPieces', () => {
  it('returns met true when minPieces is undefined', () => {
    const pieces = [makePiece('a', 'conveyor', { fired: true })];
    const result = evaluateMinPieces(levelWithMin(undefined), pieces);
    expect(result.met).toBe(true);
    expect(result.required).toBe(0);
    expect(result.active).toBe(1);
  });

  it('returns met true when minPieces is 0 or negative', () => {
    const pieces = [makePiece('a', 'conveyor', { fired: true })];
    expect(evaluateMinPieces(levelWithMin(0), pieces).met).toBe(true);
    expect(evaluateMinPieces(levelWithMin(-3), pieces).met).toBe(true);
  });

  it('counts only player-placed pieces that fired (active)', () => {
    const pieces = [
      makePiece('src', 'source', { prePlaced: true, fired: true }), // excluded: pre-placed
      makePiece('term', 'terminal', { prePlaced: true, fired: true }), // excluded: pre-placed
      makePiece('c1', 'conveyor', { fired: true }),
      makePiece('c2', 'conveyor', { fired: true }),
      makePiece('c3', 'conveyor', { fired: false }), // excluded: did not fire
    ];
    const result = evaluateMinPieces(levelWithMin(2), pieces);
    expect(result.active).toBe(2);
    expect(result.required).toBe(2);
    expect(result.met).toBe(true);
  });

  it('returns met false when active count is below the floor', () => {
    const pieces = [
      makePiece('c1', 'conveyor', { fired: true }),
      makePiece('c2', 'conveyor', { fired: true }),
    ];
    const result = evaluateMinPieces(levelWithMin(5), pieces);
    expect(result.active).toBe(2);
    expect(result.required).toBe(5);
    expect(result.met).toBe(false);
  });

  it('excludes pre-placed pieces from the active count even when fired', () => {
    const pieces = [
      makePiece('src', 'source', { prePlaced: true, fired: true }),
      makePiece('term', 'terminal', { prePlaced: true, fired: true }),
      makePiece('c1', 'conveyor', { fired: true }),
    ];
    const result = evaluateMinPieces(levelWithMin(2), pieces);
    expect(result.active).toBe(1);
    expect(result.met).toBe(false);
  });

  it('treats met as exactly-at-floor inclusive (active === required)', () => {
    const pieces = [
      makePiece('c1', 'conveyor', { fired: true }),
      makePiece('c2', 'conveyor', { fired: true }),
      makePiece('c3', 'conveyor', { fired: true }),
    ];
    const result = evaluateMinPieces(levelWithMin(3), pieces);
    expect(result.met).toBe(true);
  });
});
