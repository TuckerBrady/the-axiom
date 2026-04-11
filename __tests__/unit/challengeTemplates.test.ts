import { ALL_TEMPLATES, getTemplatesByDifficulty } from '../../src/game/challengeTemplates';
import type { PieceType } from '../../src/game/types';

const VALID_PIECE_TYPES: PieceType[] = [
  'inputPort', 'outputPort', 'conveyor', 'gear', 'splitter',
  'configNode', 'scanner', 'transmitter',
  'merger', 'bridge', 'inverter', 'counter', 'latch',
];

describe('Challenge templates', () => {
  it('ALL_TEMPLATES is non-empty', () => {
    expect(ALL_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('every template has required fields', () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(['easy', 'medium', 'hard', 'expert']).toContain(t.difficulty);
      expect(t.gridWidth).toBeGreaterThan(0);
      expect(t.gridHeight).toBeGreaterThan(0);
      expect(t.piecePool.length).toBeGreaterThan(0);
      expect(t.pattern).toBeDefined();
      expect(t.pattern.requiredPieceTypes.length).toBeGreaterThan(0);
    }
  });

  it('every template piecePool uses valid PieceType values', () => {
    for (const t of ALL_TEMPLATES) {
      for (const entry of t.piecePool) {
        expect(VALID_PIECE_TYPES).toContain(entry.type);
      }
    }
  });

  it('every template has non-empty requiredPieceTypes with valid types', () => {
    for (const t of ALL_TEMPLATES) {
      expect(t.pattern.requiredPieceTypes.length).toBeGreaterThan(0);
      for (const pt of t.pattern.requiredPieceTypes) {
        expect(VALID_PIECE_TYPES).toContain(pt);
      }
    }
  });
});

describe('getTemplatesByDifficulty', () => {
  it('returns only easy templates for "easy"', () => {
    const easy = getTemplatesByDifficulty('easy');
    expect(easy.length).toBeGreaterThan(0);
    expect(easy.every(t => t.difficulty === 'easy')).toBe(true);
  });

  it('returns only hard templates for "hard"', () => {
    const hard = getTemplatesByDifficulty('hard');
    expect(hard.length).toBeGreaterThan(0);
    expect(hard.every(t => t.difficulty === 'hard')).toBe(true);
  });

  it('returns empty for non-existent difficulty', () => {
    const result = getTemplatesByDifficulty('legendary' as never);
    expect(result.length).toBe(0);
  });
});
