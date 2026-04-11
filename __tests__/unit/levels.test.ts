import { AXIOM_LEVELS, KEPLER_LEVELS, ALL_LEVELS, getLevelById } from '../../src/game/levels';
import type { PieceType } from '../../src/game/types';

const VALID_PIECE_TYPES: PieceType[] = [
  'inputPort', 'outputPort', 'conveyor', 'gear', 'splitter',
  'configNode', 'scanner', 'transmitter',
  'merger', 'bridge', 'inverter', 'counter', 'latch',
];

describe('Level definitions', () => {
  it('AXIOM_LEVELS has exactly 8 levels', () => {
    expect(AXIOM_LEVELS).toHaveLength(8);
  });

  it('level IDs are unique', () => {
    const ids = ALL_LEVELS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every level has required fields', () => {
    for (const level of ALL_LEVELS) {
      expect(level.id).toBeTruthy();
      expect(level.name).toBeTruthy();
      expect(level.sector).toBeTruthy();
      expect(level.gridWidth).toBeGreaterThan(0);
      expect(level.gridHeight).toBeGreaterThan(0);
      expect(level.prePlacedPieces.length).toBeGreaterThan(0);
      expect(level.objectives.length).toBeGreaterThan(0);
    }
  });

  it('optimalPieces is a positive integer for each level', () => {
    for (const level of ALL_LEVELS) {
      expect(level.optimalPieces).toBeDefined();
      expect(level.optimalPieces).toBeGreaterThan(0);
      expect(Number.isInteger(level.optimalPieces)).toBe(true);
    }
  });

  it('all piece types in availablePieces are valid', () => {
    for (const level of ALL_LEVELS) {
      for (const pt of level.availablePieces) {
        expect(VALID_PIECE_TYPES).toContain(pt);
      }
    }
  });

  it('every level has inputPort and outputPort prePlaced', () => {
    for (const level of ALL_LEVELS) {
      expect(level.prePlacedPieces.some(p => p.type === 'inputPort')).toBe(true);
      expect(level.prePlacedPieces.some(p => p.type === 'outputPort')).toBe(true);
    }
  });
});

describe('getLevelById', () => {
  it('returns correct level for known ID', () => {
    const l = getLevelById('A1-1');
    expect(l?.name).toBe('Emergency Power');
  });

  it('returns undefined for unknown ID', () => {
    expect(getLevelById('NONEXISTENT')).toBeUndefined();
  });
});
