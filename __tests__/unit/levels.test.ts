import { AXIOM_LEVELS, KEPLER_LEVELS, ALL_LEVELS, getLevelById } from '../../src/game/levels';
import type { LevelDefinition } from '../../src/game/types';
import type { PieceType } from '../../src/game/types';

const VALID_PIECE_TYPES: PieceType[] = [
  'source', 'terminal', 'conveyor', 'gear', 'splitter',
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

  it('every level has source and terminal prePlaced', () => {
    for (const level of ALL_LEVELS) {
      expect(level.prePlacedPieces.some(p => p.type === 'source')).toBe(true);
      expect(level.prePlacedPieces.some(p => p.type === 'terminal')).toBe(true);
    }
  });
});

// ─── Kepler Belt levels ──────────────────────────────────────────────────────

describe('Kepler Belt levels', () => {
  it('KEPLER_LEVELS has exactly 10 entries', () => {
    expect(KEPLER_LEVELS).toHaveLength(10);
  });

  it('every Kepler level has required fields', () => {
    for (const level of KEPLER_LEVELS) {
      expect(level.id).toMatch(/^K1-/);
      expect(level.sector).toBe('kepler');
      expect(level.cogsLine).toBeTruthy();
      expect(level.gridWidth).toBeGreaterThan(0);
      expect(level.gridHeight).toBeGreaterThan(0);
      expect(level.optimalPieces).toBeGreaterThan(0);
      expect(level.budget).toBeGreaterThan(0);
      expect(level.computationalGoal).toBeTruthy();
      expect(level.conceptTaught).toBeTruthy();
      expect(level.difficultyBand).toBeDefined();
      expect(level.narrativeFrame).toBeTruthy();
    }
  });

  it('every Kepler level with inputTape also has expectedOutput', () => {
    for (const level of KEPLER_LEVELS) {
      if (level.inputTape) {
        expect(level.expectedOutput).toBeDefined();
        expect(level.expectedOutput!.length).toBe(level.inputTape.length);
      }
    }
  });

  it('K1-1 has no inputTape (single pulse)', () => {
    const k1 = KEPLER_LEVELS.find(l => l.id === 'K1-1')!;
    expect(k1.inputTape).toBeUndefined();
  });

  it('consequence levels have consequence config', () => {
    const k4 = KEPLER_LEVELS.find(l => l.id === 'K1-4')!;
    const k8 = KEPLER_LEVELS.find(l => l.id === 'K1-8')!;
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k4.consequence).toBeDefined();
    expect(k8.consequence).toBeDefined();
    expect(k10.consequence).toBeDefined();
  });

  it('K1-10 has requireThreeStars', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.consequence?.requireThreeStars).toBe(true);
  });

  it('new piece tutorial levels follow 4-step pattern', () => {
    const k3 = KEPLER_LEVELS.find(l => l.id === 'K1-3')!;
    const k5 = KEPLER_LEVELS.find(l => l.id === 'K1-5')!;
    const k7 = KEPLER_LEVELS.find(l => l.id === 'K1-7')!;
    for (const level of [k3, k5, k7]) {
      expect(level.tutorialSteps).toBeDefined();
      expect(level.tutorialSteps!.length).toBe(3); // instructor, collector+codex, resume
      expect(level.tutorialSteps![0].eyeState).toBe('blue');
      expect(level.tutorialSteps![1].eyeState).toBe('amber');
      expect(level.tutorialSteps![1].codexEntryId).toBeTruthy();
      expect(level.tutorialSteps![2].eyeState).toBe('blue');
    }
  });

  it('level IDs are sequential K1-1 through K1-10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(KEPLER_LEVELS.find(l => l.id === `K1-${i}`)).toBeDefined();
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
