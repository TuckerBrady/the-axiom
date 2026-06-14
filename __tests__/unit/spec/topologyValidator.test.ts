// SE-TM-035 — Board-topology validator (Spec Sheet data layer).

import type { PieceType, PlacedPiece } from '../../../src/game/types';
import {
  countDirectionChanges,
  meetsTopologyShall,
  evaluateTopology,
  meetsAllTopologyRequirements,
} from '../../../src/game/spec/topologyValidator';

// Minimal placed-piece fixture. The validator only reads `type`, so the rest is
// filler to satisfy the shape.
function piece(type: PieceType, gridX = 0, gridY = 0): PlacedPiece {
  return {
    id: `${type}-${gridX}-${gridY}`,
    type,
    category: type === 'gear' ? 'physics' : 'physics',
    gridX,
    gridY,
    ports: [],
    rotation: 0,
  };
}

describe('countDirectionChanges (static, placed pieces)', () => {
  it('is 0 for a straight Conveyor path (no Gears)', () => {
    const pieces = [piece('conveyor', 0, 0), piece('conveyor', 1, 0), piece('conveyor', 2, 0)];
    expect(countDirectionChanges(pieces)).toBe(0);
  });

  it('is 1 for a single-bend path (one Gear) — A1-2 shape', () => {
    const pieces = [piece('conveyor', 0, 0), piece('gear', 1, 0), piece('conveyor', 1, 1)];
    expect(countDirectionChanges(pieces)).toBe(1);
  });

  it('is 2 for a Z-shaped path (two Gears) — A1-4 shape', () => {
    const pieces = [
      piece('conveyor', 0, 0),
      piece('gear', 1, 0),
      piece('conveyor', 1, 1),
      piece('gear', 1, 2),
      piece('conveyor', 2, 2),
    ];
    expect(countDirectionChanges(pieces)).toBe(2);
  });

  it('counts only Gears, ignoring Protocol and other Physics pieces', () => {
    const pieces = [
      piece('gear', 0, 0),
      piece('configNode', 1, 0),
      piece('scanner', 2, 0),
      piece('splitter', 3, 0),
      piece('gear', 4, 0),
    ];
    expect(countDirectionChanges(pieces)).toBe(2);
  });

  it('is 0 for an empty board', () => {
    expect(countDirectionChanges([])).toBe(0);
  });
});

describe('meetsTopologyShall', () => {
  const zShape = [piece('gear', 0, 0), piece('gear', 1, 0)];

  it('passes when direction changes meet the threshold exactly', () => {
    expect(meetsTopologyShall(zShape, 2)).toBe(true);
  });

  it('passes when direction changes exceed the threshold', () => {
    expect(meetsTopologyShall(zShape, 1)).toBe(true);
  });

  it('fails when direction changes fall short of the threshold', () => {
    expect(meetsTopologyShall(zShape, 3)).toBe(false);
  });

  it('passes a 0 threshold vacuously', () => {
    expect(meetsTopologyShall([], 0)).toBe(true);
  });
});

describe('evaluateTopology (predicate registry)', () => {
  it('returns [] when the level declares no topology requirements', () => {
    expect(evaluateTopology([piece('gear')], undefined)).toEqual([]);
    expect(evaluateTopology([piece('gear')], {})).toEqual([]);
  });

  it('reports a met minDirectionChanges predicate', () => {
    const pieces = [piece('gear', 0, 0), piece('gear', 1, 0)];
    expect(evaluateTopology(pieces, { minDirectionChanges: 2 })).toEqual([
      { type: 'minDirectionChanges', required: 2, actual: 2, met: true },
    ]);
  });

  it('reports an unmet minDirectionChanges predicate with the actual count', () => {
    const pieces = [piece('gear', 0, 0)];
    expect(evaluateTopology(pieces, { minDirectionChanges: 2 })).toEqual([
      { type: 'minDirectionChanges', required: 2, actual: 1, met: false },
    ]);
  });
});

describe('meetsAllTopologyRequirements', () => {
  it('is vacuously true with no requirements', () => {
    expect(meetsAllTopologyRequirements([], undefined)).toBe(true);
  });

  it('is true when the single requirement is met', () => {
    expect(meetsAllTopologyRequirements([piece('gear'), piece('gear')], { minDirectionChanges: 2 })).toBe(true);
  });

  it('is false when the requirement is unmet', () => {
    expect(meetsAllTopologyRequirements([piece('gear')], { minDirectionChanges: 2 })).toBe(false);
  });
});
