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

  it('K1-10 boss level has tutorialSteps with board-intro', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.tutorialSteps).toBeDefined();
    expect(k10.tutorialSteps!.length).toBeGreaterThanOrEqual(1);
    const boardIntro = k10.tutorialSteps!.find(s => s.id === 'board-intro');
    expect(boardIntro).toBeDefined();
    expect(boardIntro!.eyeState).toBe('blue');
    expect(boardIntro!.message).toBeTruthy();
  });

  it('K1-10 has all scoring categories visible', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.scoringCategoriesVisible).toContain('efficiency');
    expect(k10.scoringCategoriesVisible).toContain('chainIntegrity');
    expect(k10.scoringCategoriesVisible).toContain('protocolPrecision');
    expect(k10.scoringCategoriesVisible).toContain('disciplineBonus');
    expect(k10.scoringCategoriesVisible).toContain('speedBonus');
  });

  it('K1-10 tape matches consecutive-1 detector spec', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.inputTape).toEqual([1, 1, 0, 1, 1, 1, 0, 0, 1, 1]);
    expect(k10.expectedOutput).toEqual([0, 1, 0, 0, 1, 1, 0, 0, 0, 1]);
    expect(k10.inputTape!.length).toBe(k10.expectedOutput!.length);
  });

  it('K1-10 is 12x9 grid with correct piece count', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.gridWidth).toBe(12);
    expect(k10.gridHeight).toBe(9);
    expect(k10.optimalPieces).toBe(13);
    expect(k10.availablePieces).toHaveLength(22);
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

// ─── K1-1 v3 economy fields ──────────────────────────────────────────────────

describe('K1-1 v3 economy fields', () => {
  const k1 = () => KEPLER_LEVELS.find(l => l.id === 'K1-1')!;

  it('tray is floor-solve minimum: 3 conveyors and 2 gears', () => {
    const level = k1();
    const conveyors = level.availablePieces.filter(p => p === 'conveyor');
    const gears = level.availablePieces.filter(p => p === 'gear');
    expect(conveyors).toHaveLength(3);
    expect(gears).toHaveLength(2);
    expect(level.availablePieces).toHaveLength(5);
  });

  it('optimalPieces is 5', () => {
    expect(k1().optimalPieces).toBe(5);
  });

  it('freeTapes includes IN', () => {
    expect(k1().freeTapes).toContain('IN');
  });

  it('purchasableTapes includes TRAIL and OUT', () => {
    const level = k1();
    expect(level.purchasableTapes).toContain('TRAIL');
    expect(level.purchasableTapes).toContain('OUT');
  });

  it('creditBudget is 75', () => {
    expect(k1().creditBudget).toBe(75);
  });

  it('depthCeiling is 10', () => {
    expect(k1().depthCeiling).toBe(10);
  });

  it('baseReward is 100', () => {
    expect(k1().baseReward).toBe(100);
  });

  it('has 6 tutorial steps (2 routing + 4 REQUISITION)', () => {
    const level = k1();
    expect(level.tutorialSteps).toHaveLength(6);
  });

  it('first two tutorial steps are routing instructions (blue eye)', () => {
    const level = k1();
    expect(level.tutorialSteps![0].eyeState).toBe('blue');
    expect(level.tutorialSteps![1].eyeState).toBe('blue');
  });

  it('last four tutorial steps are REQUISITION store (amber eye)', () => {
    const level = k1();
    const storeSteps = level.tutorialSteps!.slice(2);
    expect(storeSteps).toHaveLength(4);
    for (const step of storeSteps) {
      expect(step.eyeState).toBe('amber');
      expect(step.label).toBe('REQUISITION');
    }
  });

  it('REQUISITION step IDs are unique', () => {
    const level = k1();
    const ids = level.tutorialSteps!.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
