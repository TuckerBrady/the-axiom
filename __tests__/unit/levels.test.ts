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

  it('K1-10 boss level has 2 tutorial steps (board-intro amber, board-resume blue)', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.tutorialSteps).toBeDefined();
    expect(k10.tutorialSteps!.length).toBe(2);
    const boardIntro = k10.tutorialSteps!.find(s => s.id === 'board-intro');
    expect(boardIntro).toBeDefined();
    // v3: board-intro is amber (the level's source eye state), resume is blue.
    expect(boardIntro!.eyeState).toBe('amber');
    expect(boardIntro!.message).toBeTruthy();
    const boardResume = k10.tutorialSteps!.find(s => s.id === 'board-resume');
    expect(boardResume).toBeDefined();
    expect(boardResume!.eyeState).toBe('blue');
  });

  it('K1-10 shows the four real scoring categories, not the always-zero speedBonus', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.scoringCategoriesVisible).toContain('efficiency');
    expect(k10.scoringCategoriesVisible).toContain('chainIntegrity');
    expect(k10.scoringCategoriesVisible).toContain('protocolPrecision');
    expect(k10.scoringCategoriesVisible).toContain('disciplineBonus');
    // v3 Q2: speedBonus dropped sector-wide (Speed scores 0 in the live engine).
    expect(k10.scoringCategoriesVisible).not.toContain('speedBonus');
  });

  it('no Kepler level lists the always-zero speedBonus category', () => {
    for (const level of KEPLER_LEVELS) {
      expect(level.scoringCategoriesVisible ?? []).not.toContain('speedBonus');
    }
  });

  it('K1-10 tape is the temporal-OR capstone (out[N] = in[N] OR in[N-1])', () => {
    // Fun-pass: the old temporal-AND tape ([0,1,0,0,1,1,0,0,0,1]) was UNSOLVABLE with
    // the Kepler piece set (no AND combinator, no NOT; blocked pulse = BLANK not 0),
    // which silently blocked the whole sector (requireThreeStars). Re-scoped to the
    // computable temporal-OR. Solvability is proven in keplerK110TemporalOr.test.ts.
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.inputTape).toEqual([0, 1, 0, 0, 1, 0, 0, 0, 1, 1]);
    expect(k10.expectedOutput).toEqual([0, 1, 1, 0, 1, 1, 0, 0, 1, 1]);
    expect(k10.inputTape!.length).toBe(k10.expectedOutput!.length);
    // The boss forces the full temporal-OR architecture.
    const required = (k10.requiredPieces ?? []).map(r => r.type);
    expect(required).toEqual(expect.arrayContaining(['splitter', 'latch', 'merger']));
  });

  it('K1-4 has the masking-gate requiredPieces and a minPieces floor of 5', () => {
    const k4 = KEPLER_LEVELS.find(l => l.id === 'K1-4')!;
    expect(k4.minPieces).toBe(5);
    const required = (k4.requiredPieces ?? []).map(r => r.type);
    expect(required).toEqual(expect.arrayContaining(['latch', 'configNode']));
  });

  it('K1-10 has a minPieces floor of 8 for the full temporal-OR machine', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.minPieces).toBe(8);
  });

  it('K1-10 is 12x9 grid with correct piece count', () => {
    const k10 = KEPLER_LEVELS.find(l => l.id === 'K1-10')!;
    expect(k10.gridWidth).toBe(12);
    expect(k10.gridHeight).toBe(9);
    // SPEC_KEPLER_REBUILD_v3 K1-10: optimalPieces 8 (was 13; V2 canonical).
    expect(k10.optimalPieces).toBe(8);
    expect(k10.availablePieces).toHaveLength(22);
  });

  it('single-new-piece tutorial levels follow the 3-step pattern (K1-3, K1-7)', () => {
    const k3 = KEPLER_LEVELS.find(l => l.id === 'K1-3')!;
    const k7 = KEPLER_LEVELS.find(l => l.id === 'K1-7')!;
    for (const level of [k3, k7]) {
      expect(level.tutorialSteps).toBeDefined();
      expect(level.tutorialSteps!.length).toBe(3); // instructor, collector+codex, resume
      expect(level.tutorialSteps![0].eyeState).toBe('blue');
      expect(level.tutorialSteps![1].eyeState).toBe('amber');
      expect(level.tutorialSteps![1].codexEntryId).toBeTruthy();
      expect(level.tutorialSteps![2].eyeState).toBe('blue');
    }
  });

  it('K1-5 collects both the Splitter and the Merger (V2 REQ-5): 4 steps, two codex collectors', () => {
    const k5 = KEPLER_LEVELS.find(l => l.id === 'K1-5')!;
    expect(k5.tutorialSteps!.length).toBe(4);
    expect(k5.tutorialSteps![0].eyeState).toBe('blue'); // board-intro
    const codexIds = k5.tutorialSteps!.map(s => s.codexEntryId).filter(Boolean);
    expect(codexIds).toEqual(expect.arrayContaining(['splitter', 'merger']));
    expect(k5.tutorialSteps![k5.tutorialSteps!.length - 1].eyeState).toBe('blue'); // board-resume
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

  it('tray is the 6-piece Z-solution: 4 conveyors and 2 gears', () => {
    const level = k1();
    const conveyors = level.availablePieces.filter(p => p === 'conveyor');
    const gears = level.availablePieces.filter(p => p === 'gear');
    expect(conveyors).toHaveLength(4);
    expect(gears).toHaveLength(2);
    expect(level.availablePieces).toHaveLength(6);
  });

  it('optimalPieces is 6', () => {
    expect(k1().optimalPieces).toBe(6);
  });

  it('pre-places two obstacle cells that force routing around', () => {
    const obstacles = k1().prePlacedPieces.filter(p => p.type === 'obstacle');
    expect(obstacles).toHaveLength(2);
    // Obstacles must not sit on the Source or Terminal cells.
    for (const o of obstacles) {
      expect(`${o.gridX},${o.gridY}`).not.toBe('1,2');
      expect(`${o.gridX},${o.gridY}`).not.toBe('6,4');
    }
  });

  it('requires two direction changes (objective + topology)', () => {
    const level = k1();
    const dirObj = level.objectives.find(o => o.type === 'min_direction_changes');
    expect(dirObj?.count).toBe(2);
    expect(level.topologyRequirements?.minDirectionChanges).toBe(2);
  });

  it('does not show protocolPrecision (no Protocol pieces present)', () => {
    expect(k1().scoringCategoriesVisible).not.toContain('protocolPrecision');
    expect(k1().scoringCategoriesVisible).toContain('efficiency');
    expect(k1().scoringCategoriesVisible).toContain('chainIntegrity');
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

  it('has 6 tutorial steps (4 Arc Wheel onboarding + 2 board)', () => {
    const level = k1();
    expect(level.tutorialSteps).toHaveLength(6);
  });

  it('the first four steps onboard the Arc Wheel, the last two teach the board', () => {
    const level = k1();
    const steps = level.tutorialSteps!;
    for (const s of steps.slice(0, 4)) {
      expect(s.targetRef).toBe('arcWheelMain');
    }
    expect(steps[4].targetRef).toBe('boardGrid');
    expect(steps[5].targetRef).toBe('boardGrid');
  });

  it('no tutorial step targets the retired tray ref', () => {
    const level = k1();
    for (const s of level.tutorialSteps!) {
      expect(s.targetRef).not.toBe('tray');
    }
  });

  it('onboarding covers the wheel and forfeiture', () => {
    const ids = k1().tutorialSteps!.map(s => s.id);
    expect(ids).toEqual(expect.arrayContaining(['wheel-intro', 'wheel-place', 'wheel-forfeit']));
  });

  it('tutorial step IDs are unique', () => {
    const level = k1();
    const ids = level.tutorialSteps!.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── K1-9 canonical shift-register (SPEC_KEPLER_REBUILD_v3) ───────────────────

describe('K1-9 The Narrows — canonical one-pulse shift register', () => {
  const k9 = () => KEPLER_LEVELS.find(l => l.id === 'K1-9')!;

  it('expectedOutput is the 1-pulse delay of the input (output[N]=input[N-1], output[0]=0)', () => {
    const level = k9();
    expect(level.inputTape).toEqual([0, 1, 1, 0, 1, 0]);
    // Shift register, NOT the rejected XOR ([0,1,0,1,1,1]).
    expect(level.expectedOutput).toEqual([0, 0, 1, 1, 0, 1]);
    // Validate the relationship directly so a future tape edit stays consistent.
    const input = level.inputTape!;
    const expected = level.expectedOutput!;
    expect(expected[0]).toBe(0);
    for (let n = 1; n < input.length; n++) {
      expect(expected[n]).toBe(input[n - 1]);
    }
  });

  it('optimalPieces is 7 and budget is 50 (V2 canonical, not the XOR-era 11/70)', () => {
    expect(k9().optimalPieces).toBe(7);
    expect(k9().budget).toBe(50);
  });

  it('describes a delay, not XOR', () => {
    const level = k9();
    expect(level.description.toLowerCase()).not.toContain('xor');
    expect(level.computationalGoal!.toLowerCase()).not.toContain('xor');
    expect(level.computationalGoal!.toLowerCase()).toContain('input[n-1]');
  });
});

// ─── Sector-wide v3 economy coverage ─────────────────────────────────────────

describe('Kepler v3 economy fields are defined on every level', () => {
  it('every Kepler level carries creditBudget, depthCeiling, baseReward, and tape fields', () => {
    for (const level of KEPLER_LEVELS) {
      expect(typeof level.creditBudget).toBe('number');
      expect(typeof level.depthCeiling).toBe('number');
      expect(typeof level.baseReward).toBe('number');
      expect(Array.isArray(level.freeTapes)).toBe(true);
      expect(Array.isArray(level.purchasableTapes)).toBe(true);
      expect(level.freeTapes!).toContain('IN');
    }
  });

  it('K1-2..K1-10 make all three tapes free (tape requisition only at K1-1)', () => {
    for (const level of KEPLER_LEVELS.filter(l => l.id !== 'K1-1')) {
      expect(level.freeTapes).toEqual(expect.arrayContaining(['IN', 'TRAIL', 'OUT']));
      expect(level.purchasableTapes).toEqual([]);
    }
  });

  it('K1-3 pre-places the Latch in write mode', () => {
    const k3 = KEPLER_LEVELS.find(l => l.id === 'K1-3')!;
    const latch = k3.prePlacedPieces.find(p => p.type === 'latch');
    expect(latch).toBeDefined();
    expect(latch!.latchMode).toBe('write');
  });

  it('canonical budgets match v3 for reconciled levels', () => {
    const budgets: Record<string, number> = {
      'K1-2': 80, 'K1-3': 100, 'K1-4': 130, 'K1-5': 155, 'K1-9': 50,
    };
    for (const [id, budget] of Object.entries(budgets)) {
      expect(KEPLER_LEVELS.find(l => l.id === id)!.budget).toBe(budget);
    }
  });
});

// ─── Pre-existing blown cells (damagedCells) + solvability guard ──────────────

describe('Kepler pre-existing blown cells', () => {
  const key = (x: number, y: number) => `${x},${y}`;

  it('K1-5 through K1-10 ship with pre-existing blown cells', () => {
    for (const id of ['K1-5', 'K1-6', 'K1-7', 'K1-8', 'K1-9', 'K1-10']) {
      const level = KEPLER_LEVELS.find(l => l.id === id)!;
      expect((level.damagedCells ?? []).length).toBeGreaterThan(0);
    }
  });

  it('no damaged cell overlaps a pre-placed piece', () => {
    for (const level of KEPLER_LEVELS) {
      const pieceCells = new Set(level.prePlacedPieces.map(p => key(p.gridX, p.gridY)));
      for (const c of level.damagedCells ?? []) {
        expect(pieceCells.has(key(c.gridX, c.gridY))).toBe(false);
      }
    }
  });

  it('every damaged cell is within the grid', () => {
    for (const level of KEPLER_LEVELS) {
      for (const c of level.damagedCells ?? []) {
        expect(c.gridX).toBeGreaterThanOrEqual(0);
        expect(c.gridY).toBeGreaterThanOrEqual(0);
        expect(c.gridX).toBeLessThan(level.gridWidth);
        expect(c.gridY).toBeLessThan(level.gridHeight);
      }
    }
  });

  // Geometric softlock guard: damaged cells + obstacles must never wall the
  // Terminal off from the Source. (BFS over open cells; pre-placed functional
  // pieces are passable — signal travels through them.)
  it('Source can always reach Terminal around obstacles and blown cells', () => {
    for (const level of KEPLER_LEVELS) {
      const source = level.prePlacedPieces.find(p => p.type === 'source');
      const terminal = level.prePlacedPieces.find(p => p.type === 'terminal');
      if (!source || !terminal) continue;

      const blocked = new Set<string>();
      for (const c of level.damagedCells ?? []) blocked.add(key(c.gridX, c.gridY));
      for (const p of level.prePlacedPieces) {
        if (p.type === 'obstacle') blocked.add(key(p.gridX, p.gridY));
      }

      const goal = key(terminal.gridX, terminal.gridY);
      const seen = new Set<string>([key(source.gridX, source.gridY)]);
      const queue: Array<[number, number]> = [[source.gridX, source.gridY]];
      let reached = false;
      while (queue.length) {
        const [x, y] = queue.shift()!;
        if (key(x, y) === goal) { reached = true; break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= level.gridWidth || ny >= level.gridHeight) continue;
          const k = key(nx, ny);
          if (seen.has(k) || blocked.has(k)) continue;
          seen.add(k);
          queue.push([nx, ny]);
        }
      }
      expect(reached).toBe(true);
    }
  });
});
