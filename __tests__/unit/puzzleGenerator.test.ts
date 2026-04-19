import { generatePuzzleFromTemplate } from '../../src/game/puzzleGenerator';
import { ALL_TEMPLATES } from '../../src/game/challengeTemplates';
import { SeededRandom } from '../../src/game/seededRandom';

describe('generatePuzzleFromTemplate', () => {
  const template = ALL_TEMPLATES[0]; // A01 — easy

  it('generates a level with required fields', () => {
    const rng = new SeededRandom(12345);
    const { level, solutionPieces } = generatePuzzleFromTemplate(template, rng, '2026-04-10');
    expect(level.id).toContain('daily_');
    expect(level.gridWidth).toBe(template.gridWidth);
    expect(level.gridHeight).toBe(template.gridHeight);
    expect(level.prePlacedPieces.length).toBe(2); // source + terminal
    expect(level.availablePieces.length).toBeGreaterThan(0);
    expect(solutionPieces.length).toBeGreaterThan(0);
  });

  it('same seed produces same puzzle', () => {
    const r1 = new SeededRandom(999);
    const r2 = new SeededRandom(999);
    const a = generatePuzzleFromTemplate(template, r1, '2026-04-10');
    const b = generatePuzzleFromTemplate(template, r2, '2026-04-10');
    expect(a.level.prePlacedPieces[0].gridX).toBe(b.level.prePlacedPieces[0].gridX);
    expect(a.solutionPieces.length).toBe(b.solutionPieces.length);
  });

  it('solution pieces are within grid bounds', () => {
    const rng = new SeededRandom(777);
    const { level, solutionPieces } = generatePuzzleFromTemplate(template, rng, '2026-04-10');
    for (const p of solutionPieces) {
      expect(p.gridX).toBeGreaterThanOrEqual(0);
      expect(p.gridX).toBeLessThan(level.gridWidth);
      expect(p.gridY).toBeGreaterThanOrEqual(0);
      expect(p.gridY).toBeLessThan(level.gridHeight);
    }
  });

  it('available pieces cover solution pieces', () => {
    const rng = new SeededRandom(555);
    const { level, solutionPieces } = generatePuzzleFromTemplate(template, rng, '2026-04-10');
    const needed: Record<string, number> = {};
    for (const p of solutionPieces) needed[p.type] = (needed[p.type] ?? 0) + 1;
    const available: Record<string, number> = {};
    for (const pt of level.availablePieces) available[pt] = (available[pt] ?? 0) + 1;
    for (const [type, count] of Object.entries(needed)) {
      expect((available[type] ?? 0)).toBeGreaterThanOrEqual(count);
    }
  });

  it('works for all templates', () => {
    for (const tmpl of ALL_TEMPLATES) {
      const rng = new SeededRandom(42);
      const { level } = generatePuzzleFromTemplate(tmpl, rng, '2026-04-10');
      expect(level.id).toBeTruthy();
      expect(level.prePlacedPieces.length).toBe(2);
    }
  });
});
