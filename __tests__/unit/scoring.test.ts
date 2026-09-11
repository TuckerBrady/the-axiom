// Scoring Algorithm v2 (ENG-001 / AXM-010) test matrix.
//
// Implements project-docs/SPECS/scoring-algorithm-v2.md Part 12's required
// test derivation: 5 scenarios (min/floor/moderate/full/waste) per category,
// >=3 floor-solve-ceiling integration tests, >=2 investment-reward
// integration tests, >=1 purchased-but-unused test, exact star boundaries
// (REQ-67), the investment-gate transition (REQ-68), and per-discipline
// tests (REQ-69). Part 11's five worked examples are reproduced exactly —
// per the spec's own instruction, if the implementation doesn't match those
// numbers exactly, something is wrong.

import {
  calculateScore,
  calculatePayout,
  defaultBaseReward,
  TUTORIAL_FLAT_PAYOUT,
  doesConsequenceTrigger,
  getConsequenceFailureLine,
  getCOGSScoreComment,
  getTutorialCOGSComment,
} from '../../src/game/scoring';
import type { ExecutionStep, PlacedPiece } from '../../src/game/types';
import { getDefaultPorts } from '../../src/game/engine';

let stepId = 0;
function makeStep(type: string, success = true, pieceId?: string): ExecutionStep {
  return { pieceId: pieceId ?? `p-${type}-${stepId++}`, type, timestamp: 0, success };
}

const PROTOCOL_TYPES: PlacedPiece['type'][] = ['configNode', 'scanner', 'transmitter', 'latch', 'inverter', 'counter'];

function makePlayerPiece(id: string, type: PlacedPiece['type']): PlacedPiece {
  const cat = PROTOCOL_TYPES.includes(type) ? 'protocol' as const : 'physics' as const;
  return { id, type, category: cat, gridX: 0, gridY: 0, ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false };
}

// ─── Scenario builder ────────────────────────────────────────────────────────
// trayTypes: the level's free/pre-assigned tray (the floor-solve set).
// purchasedTypes: additional pieces bought beyond the tray.
// inactiveIds: piece ids (by index, prefixed 'tray'/'buy') that should NOT
// see signal — everything else in the machine is active.
interface ScenarioOpts {
  trayTypes?: PlacedPiece['type'][];
  purchasedTypes?: PlacedPiece['type'][];
  inactiveIndices?: { tray?: number[]; buy?: number[] };
  discipline: 'systems' | 'drive' | 'field';
  succeeded?: boolean;
  depthCeiling?: number;
  purchasedTapeTypes?: ('TRAIL' | 'OUT')[];
  trailUtilized?: boolean;
  outUtilized?: boolean;
  forfeitedPurchasedCount?: number;
}

function scenario(opts: ScenarioOpts) {
  const trayTypes = opts.trayTypes ?? [];
  const purchasedTypes = opts.purchasedTypes ?? [];
  const inactiveTray = new Set(opts.inactiveIndices?.tray ?? []);
  const inactiveBuy = new Set(opts.inactiveIndices?.buy ?? []);

  const trayPieces = trayTypes.map((t, i) => makePlayerPiece(`tray${i}`, t));
  const boughtPieces = purchasedTypes.map((t, i) => makePlayerPiece(`buy${i}`, t));
  const allPieces = [...trayPieces, ...boughtPieces];

  const steps: ExecutionStep[] = [makeStep('source', true, 'src')];
  trayPieces.forEach((p, i) => steps.push(makeStep(p.type, !inactiveTray.has(i), p.id)));
  boughtPieces.forEach((p, i) => steps.push(makeStep(p.type, !inactiveBuy.has(i), p.id)));
  if (opts.trailUtilized) steps.push(makeStep('scanner', true, 'trail-write'));
  if (opts.outUtilized) steps.push(makeStep('transmitter', true, 'out-write'));
  steps.push(makeStep('terminal', true, 'out'));

  return calculateScore({
    executionSteps: steps,
    placedPieces: allPieces,
    optimalPieces: trayTypes.length,
    trayPieceTypes: trayTypes,
    purchasedTapeTypes: opts.purchasedTapeTypes,
    depthCeiling: opts.depthCeiling,
    forfeitedPurchasedCount: opts.forfeitedPurchasedCount,
    discipline: opts.discipline,
    succeeded: opts.succeeded ?? true,
  });
}

// ─── Category 1: Completion (max 25) — REQ-8/9/10 ────────────────────────────

describe('Completion category', () => {
  it('min input: no pieces, failed -> 0', () => {
    expect(scenario({ discipline: 'field', succeeded: false }).breakdown.completion).toBe(0);
  });

  it('floor solve, locked -> 25', () => {
    expect(scenario({ trayTypes: ['conveyor'], discipline: 'field' }).breakdown.completion).toBe(25);
  });

  it('moderate investment, locked -> 25 (completion is pass/fail, not scaled by investment)', () => {
    const r = scenario({ trayTypes: ['conveyor'], purchasedTypes: ['gear'], discipline: 'field' });
    expect(r.breakdown.completion).toBe(25);
  });

  it('full elaboration, locked -> 25', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor'],
      purchasedTypes: ['gear', 'scanner', 'configNode', 'transmitter'],
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
  });

  it('waste case: purchased-but-inactive pieces present, still succeeded -> 25', () => {
    const r = scenario({
      trayTypes: ['conveyor'],
      purchasedTypes: ['gear'],
      inactiveIndices: { buy: [0] },
      discipline: 'field',
    });
    expect(r.breakdown.completion).toBe(25);
  });

  it('derives succeeded from a successful terminal step when not passed explicitly', () => {
    const r = calculateScore({
      executionSteps: [makeStep('source', true, 'src'), makeStep('terminal', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
    });
    expect(r.breakdown.completion).toBe(25);
  });

  it('completes but wrong output (explicit succeeded: false) -> 0', () => {
    const r = calculateScore({
      executionSteps: [makeStep('source', true, 'src'), makeStep('terminal', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      succeeded: false,
    });
    expect(r.breakdown.completion).toBe(0);
  });
});

// ─── Category 2: Path Integrity (max 15) — REQ-11/12/13 ──────────────────────

describe('Path Integrity category', () => {
  it('min input: 0 player pieces -> 15 (vacuously true)', () => {
    expect(scenario({ discipline: 'field' }).breakdown.pathIntegrity).toBe(15);
  });

  it('floor solve, all active -> 15', () => {
    const r = scenario({ trayTypes: ['conveyor', 'conveyor', 'gear'], discipline: 'field' });
    expect(r.breakdown.pathIntegrity).toBe(15);
  });

  it('moderate: 6 placed, 4 active -> round(4/6*15) = 10', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      inactiveIndices: { tray: [4, 5] },
      discipline: 'field',
    });
    expect(r.breakdown.pathIntegrity).toBe(10);
  });

  it('full elaboration: many placed, all active -> 15', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor'],
      purchasedTypes: ['gear', 'scanner', 'configNode', 'transmitter'],
      discipline: 'field',
    });
    expect(r.breakdown.pathIntegrity).toBe(15);
  });

  it('waste case: 6 placed, 1 active -> round(1/6*15) = 3', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      inactiveIndices: { tray: [1, 2, 3, 4, 5] },
      discipline: 'field',
    });
    expect(r.breakdown.pathIntegrity).toBe(3);
  });
});

// ─── Category 3: Signal Depth (max 14) — REQ-14/15/16/17 ─────────────────────

describe('Signal Depth category', () => {
  it('min input: 0 pieces -> 0', () => {
    expect(scenario({ discipline: 'field' }).breakdown.signalDepth).toBe(0);
  });

  it('floor solve (0 purchased active) -> 0, regardless of active count', () => {
    const r = scenario({ trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'], discipline: 'field', depthCeiling: 10 });
    expect(r.breakdown.signalDepth).toBe(0);
  });

  it('moderate: 7 active, 2 purchased active, depthCeiling 10 -> round(7/10*14) = 10', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      purchasedTypes: ['gear', 'scanner'],
      depthCeiling: 10,
      discipline: 'field',
    });
    expect(r.breakdown.signalDepth).toBe(10);
  });

  it('full elaboration: 10 active, depthCeiling 10 -> 14 (capped)', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      purchasedTypes: ['gear', 'gear', 'gear', 'scanner', 'configNode'],
      depthCeiling: 10,
      discipline: 'field',
    });
    expect(r.breakdown.signalDepth).toBe(14);
  });

  it('waste case: purchased pieces present but all inactive -> gate stays 0', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      purchasedTypes: ['gear', 'scanner'],
      inactiveIndices: { buy: [0, 1] },
      depthCeiling: 10,
      discipline: 'field',
    });
    expect(r.breakdown.signalDepth).toBe(0);
  });

  it('12 active, 4 purchased active, depthCeiling 10 -> 14 (capped, spec test case)', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      purchasedTypes: ['gear', 'gear', 'scanner', 'configNode'],
      depthCeiling: 10,
      discipline: 'field',
    });
    expect(r.breakdown.signalDepth).toBe(14);
  });
});

// ─── Category 4: Investment (max 25) — REQ-18/19/20/21 ───────────────────────

describe('Investment category', () => {
  it('min input: 0 purchased, no tape purchases -> 0', () => {
    expect(scenario({ discipline: 'field' }).breakdown.investment).toBe(0);
  });

  it('floor solve: 0 purchased active -> 0', () => {
    const r = scenario({ trayTypes: ['conveyor', 'conveyor'], discipline: 'field' });
    expect(r.breakdown.investment).toBe(0);
  });

  it('moderate: 3 purchased active, no tape -> 9', () => {
    const r = scenario({ purchasedTypes: ['gear', 'scanner', 'configNode'], discipline: 'field' });
    expect(r.breakdown.investment).toBe(9);
  });

  it('full elaboration: 6 purchased active, both tapes purchased and utilized -> min(17+8,25) = 25', () => {
    const r = scenario({
      purchasedTypes: ['gear', 'gear', 'gear', 'scanner', 'configNode', 'transmitter'],
      purchasedTapeTypes: ['TRAIL', 'OUT'],
      trailUtilized: true,
      outUtilized: true,
      discipline: 'field',
    });
    expect(r.breakdown.investment).toBe(25);
  });

  it('waste case: 4 purchased placed, 2 inactive -> only the 2 active count (2*3=6)', () => {
    const r = scenario({
      purchasedTypes: ['gear', 'gear', 'scanner', 'configNode'],
      inactiveIndices: { buy: [2, 3] },
      discipline: 'field',
    });
    expect(r.breakdown.investment).toBe(6);
  });

  it('5 purchased active, purchased TRAIL used -> min(15+4,25) = 19 (spec test case)', () => {
    const r = scenario({
      purchasedTypes: ['gear', 'gear', 'gear', 'gear', 'scanner'],
      purchasedTapeTypes: ['TRAIL'],
      trailUtilized: true,
      discipline: 'field',
    });
    expect(r.breakdown.investment).toBe(19);
  });

  it('purchased TRAIL tape but no Scanner/Latch used it this run -> 0 tape points (REQ-40)', () => {
    const r = scenario({
      purchasedTypes: ['gear'],
      purchasedTapeTypes: ['TRAIL'],
      trailUtilized: false,
      discipline: 'field',
    });
    expect(r.breakdown.investment).toBe(3); // just the 1 piece; no tape bonus
  });

  it('6+ purchased active pieces caps the piece component at 17', () => {
    const r = scenario({
      purchasedTypes: ['gear', 'gear', 'gear', 'gear', 'gear', 'gear', 'gear'],
      discipline: 'field',
    });
    expect(r.breakdown.investment).toBe(17);
  });
});

// ─── Category 5: Diversity (max 11) — REQ-22/23/24 ───────────────────────────

describe('Diversity category', () => {
  it('min input: 0 pieces -> 0', () => {
    expect(scenario({ discipline: 'field' }).breakdown.diversity).toBe(0);
  });

  it('floor solve (0 purchased active) -> 0 regardless of type variety', () => {
    const r = scenario({ trayTypes: ['conveyor', 'gear', 'scanner'], discipline: 'field' });
    expect(r.breakdown.diversity).toBe(0);
  });

  it('moderate: 4 distinct active types, 2 purchased active -> round(4/6*11) = 7', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'gear'],
      purchasedTypes: ['scanner', 'configNode'],
      discipline: 'field',
    });
    expect(r.breakdown.diversity).toBe(7);
  });

  it('full elaboration: 6 distinct active types, 1 purchased active -> 11', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'gear', 'splitter', 'configNode', 'inverter'],
      purchasedTypes: ['scanner'],
      discipline: 'field',
    });
    expect(r.breakdown.diversity).toBe(11);
  });

  it('waste case: 1 distinct type (all Conveyors), 1 purchased active -> round(1/6*11) = 2', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor'],
      purchasedTypes: ['conveyor'],
      discipline: 'field',
    });
    expect(r.breakdown.diversity).toBe(2);
  });
});

// ─── Category 6: Discipline (max 10) — REQ-25/26/27, per-discipline (REQ-69) ─

describe('Discipline category — Systems Architect (Protocol depth)', () => {
  it('full: 4 active Protocol, purchased active -> 10', () => {
    const r = scenario({
      purchasedTypes: ['configNode', 'scanner', 'transmitter', 'configNode'],
      discipline: 'systems',
    });
    expect(r.breakdown.discipline).toBe(10);
  });

  it('partial: 2 active Protocol, 1 purchased active -> round(2/4*10) = 5', () => {
    const r = scenario({
      purchasedTypes: ['configNode', 'scanner'],
      discipline: 'systems',
    });
    expect(r.breakdown.discipline).toBe(5);
  });

  it('zero: 0 active Protocol (Physics only) -> 0', () => {
    const r = scenario({ purchasedTypes: ['gear', 'gear'], discipline: 'systems' });
    expect(r.breakdown.discipline).toBe(0);
  });

  it('floor-solve gate: 3 active Protocol, 0 purchased -> round(3/4*10*0.5) = 4', () => {
    const r = scenario({ trayTypes: ['configNode', 'scanner', 'transmitter'], discipline: 'systems' });
    expect(r.breakdown.discipline).toBe(4);
  });
});

describe('Discipline category — Drive Engineer (Physics depth)', () => {
  it('full: 5 active Physics, purchased active -> 10', () => {
    const r = scenario({
      purchasedTypes: ['conveyor', 'gear', 'conveyor', 'gear', 'conveyor'],
      discipline: 'drive',
    });
    expect(r.breakdown.discipline).toBe(10);
  });

  it('partial: 2 active Physics, 1 purchased active -> round(2/5*10) = 4', () => {
    const r = scenario({
      purchasedTypes: ['conveyor', 'gear'],
      discipline: 'drive',
    });
    expect(r.breakdown.discipline).toBe(4);
  });

  it('zero: 0 active Physics (Protocol only) -> 0', () => {
    const r = scenario({ purchasedTypes: ['scanner', 'configNode'], discipline: 'drive' });
    expect(r.breakdown.discipline).toBe(0);
  });

  it('floor-solve gate: 3 active Physics, 0 purchased -> round(3/5*10*0.5) = 3', () => {
    const r = scenario({ trayTypes: ['conveyor', 'gear', 'conveyor'], discipline: 'drive' });
    expect(r.breakdown.discipline).toBe(3);
  });
});

describe('Discipline category — Field Operative (balanced elaboration)', () => {
  it('full: 3 Protocol + 4 Physics active, purchased active -> 10', () => {
    const r = scenario({
      purchasedTypes: ['configNode', 'scanner', 'transmitter', 'conveyor', 'gear', 'conveyor', 'gear'],
      discipline: 'field',
    });
    expect(r.breakdown.discipline).toBe(10);
  });

  it('partial: 2 Protocol + 5 Physics active, 1 purchased active -> round(2/3*10) = 7', () => {
    const r = scenario({
      purchasedTypes: ['configNode', 'scanner', 'conveyor', 'gear', 'conveyor', 'gear', 'conveyor'],
      discipline: 'field',
    });
    expect(r.breakdown.discipline).toBe(7);
  });

  it('zero: 0 of one category (Physics only) -> 0', () => {
    const r = scenario({ purchasedTypes: ['conveyor', 'gear', 'conveyor'], discipline: 'field' });
    expect(r.breakdown.discipline).toBe(0);
  });

  it('floor-solve gate: 1 Protocol + 2 Physics, 0 purchased -> round(1/3*10*0.5) = 2', () => {
    const r = scenario({ trayTypes: ['configNode', 'conveyor', 'gear'], discipline: 'field' });
    expect(r.breakdown.discipline).toBe(2);
  });
});

// ─── Score composition, clamping, star derivation (REQ-28/29/30) ────────────

describe('score composition and clamping', () => {
  it('total is the sum of all six categories', () => {
    const r = scenario({ trayTypes: ['conveyor', 'conveyor'], discipline: 'field' });
    const b = r.breakdown;
    expect(r.total).toBe(b.completion + b.pathIntegrity + b.signalDepth + b.investment + b.diversity + b.discipline);
  });

  it('total is clamped to [0, 100]', () => {
    const r = scenario({ trayTypes: ['conveyor'], discipline: 'field' });
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });
});

// ─── Exact star boundaries — REQ-67 ───────────────────────────────────────────
// Constructed to hit each exact total; see AXM-010 PR notes for the by-hand
// derivation. Each scenario is independently checked against the six
// category formulas, not just asserted by star.

describe('star boundaries (REQ-67)', () => {
  it('total 29 -> void (0 stars)', () => {
    const r = scenario({
      trayTypes: ['configNode', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      inactiveIndices: { tray: [1, 2, 3, 4] },
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(3); // round(1/5*15)
    expect(r.breakdown.discipline).toBe(1); // round(1/4*10*0.5)
    expect(r.total).toBe(29);
    expect(r.stars).toBe(0);
  });

  it('total 30 -> 1 star', () => {
    const r = scenario({
      trayTypes: ['configNode', 'conveyor', 'conveyor', 'conveyor'],
      inactiveIndices: { tray: [1, 2, 3] },
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(4); // round(1/4*15)
    expect(r.breakdown.discipline).toBe(1); // round(1/4*10*0.5)
    expect(r.total).toBe(30);
    expect(r.stars).toBe(1);
  });

  it('total 54 -> 1 star (top of the 1-star band)', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      purchasedTypes: ['configNode'],
      depthCeiling: 20,
      discipline: 'field',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(15);
    expect(r.breakdown.signalDepth).toBe(4); // round(6/20*14)
    expect(r.breakdown.investment).toBe(3);
    expect(r.breakdown.diversity).toBe(4); // round(2/6*11)
    expect(r.breakdown.discipline).toBe(3); // round(min(1,5)/3*10)
    expect(r.total).toBe(54);
    expect(r.stars).toBe(1);
  });

  it('total 55 -> 2 stars', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor'],
      purchasedTypes: ['configNode'],
      depthCeiling: 18,
      discipline: 'field',
    });
    expect(r.breakdown.signalDepth).toBe(5); // round(6/18*14)
    expect(r.total).toBe(55);
    expect(r.stars).toBe(2);
  });

  it('total 79 -> 2 stars (top of the 2-star band)', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'configNode'],
      purchasedTypes: ['configNode', 'scanner', 'configNode'],
      depthCeiling: 8,
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(15);
    expect(r.breakdown.signalDepth).toBe(14);
    expect(r.breakdown.investment).toBe(9);
    expect(r.breakdown.diversity).toBe(6); // round(3/6*11) -- conveyor/configNode/scanner
    expect(r.breakdown.discipline).toBe(10); // 4 active Protocol (1 tray + 3 purchased)
    expect(r.total).toBe(79);
    expect(r.stars).toBe(2);
  });

  it('total 80 -> 3 stars', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'configNode'],
      purchasedTypes: ['configNode', 'scanner', 'transmitter'],
      depthCeiling: 8,
      discipline: 'systems',
    });
    expect(r.breakdown.diversity).toBe(7); // round(4/6*11)
    expect(r.total).toBe(80);
    expect(r.stars).toBe(3);
  });
});

// ─── Investment gate transition — REQ-68 ─────────────────────────────────────

describe('investment gate transition (REQ-68)', () => {
  it('0 purchased active -> Signal Depth and Diversity both return 0', () => {
    const r = scenario({ trayTypes: ['conveyor', 'gear', 'scanner'], depthCeiling: 5, discipline: 'field' });
    expect(r.breakdown.signalDepth).toBe(0);
    expect(r.breakdown.diversity).toBe(0);
  });

  it('exactly 1 purchased active -> full calculation unlocks (not a partial gradient)', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'gear'],
      purchasedTypes: ['scanner'],
      depthCeiling: 3,
      discipline: 'field',
    });
    expect(r.breakdown.signalDepth).toBeGreaterThan(0);
    expect(r.breakdown.diversity).toBeGreaterThan(0);
  });
});

// ─── Floor-solve ceiling integration — REQ-64 (>=3 tests) ────────────────────

describe('floor-solve ceiling integration (REQ-64)', () => {
  it('an early, small floor solve scores <= 54', () => {
    const r = scenario({ trayTypes: ['conveyor', 'gear'], discipline: 'field' });
    expect(r.total).toBeLessThanOrEqual(54);
  });

  it('a late, large floor solve scores <= 54', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'gear', 'gear', 'splitter', 'configNode', 'scanner', 'transmitter', 'inverter'],
      discipline: 'field',
    });
    expect(r.total).toBeLessThanOrEqual(54);
  });

  it('a perfect-execution floor solve (every category maxed for a floor solve) scores <= 54', () => {
    // Best possible floor solve per the spec's own proof: completion 25 +
    // pathIntegrity 15 + discipline floor-gated at its max (5) = 45.
    const r = scenario({
      trayTypes: ['configNode', 'configNode', 'configNode', 'configNode'],
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(15);
    expect(r.breakdown.signalDepth).toBe(0);
    expect(r.breakdown.investment).toBe(0);
    expect(r.breakdown.diversity).toBe(0);
    expect(r.breakdown.discipline).toBe(5); // round(4/4*10*0.5)
    expect(r.total).toBe(45);
    expect(r.total).toBeLessThanOrEqual(54);
  });
});

// ─── Investment reward integration — REQ-65 (>=2 tests) ──────────────────────

describe('investment reward integration (REQ-65)', () => {
  it('a well-invested machine scores higher than an equivalent floor solve', () => {
    const floor = scenario({ trayTypes: ['conveyor', 'conveyor', 'conveyor', 'configNode'], discipline: 'systems' });
    const invested = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'configNode'],
      purchasedTypes: ['configNode', 'scanner', 'transmitter'],
      depthCeiling: 7,
      discipline: 'systems',
    });
    expect(invested.total).toBeGreaterThan(floor.total);
  });

  it('a fully elaborated machine scores 80+', () => {
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor'],
      purchasedTypes: ['gear', 'gear', 'gear', 'scanner', 'configNode', 'transmitter'],
      depthCeiling: 8,
      purchasedTapeTypes: ['TRAIL'],
      trailUtilized: true,
      discipline: 'systems',
    });
    expect(r.total).toBeGreaterThanOrEqual(80);
  });
});

// ─── Purchased-but-unused reduces Path Integrity, not Investment — REQ-66 ────

describe('purchased-but-unused pieces (REQ-66)', () => {
  it('reduce Path Integrity without increasing Investment', () => {
    const clean = scenario({ trayTypes: ['conveyor'], purchasedTypes: ['gear'], discipline: 'field' });
    const wasted = scenario({
      trayTypes: ['conveyor'],
      purchasedTypes: ['gear', 'scanner', 'configNode'],
      inactiveIndices: { buy: [1, 2] }, // bought 3, only 1 (gear) active
      discipline: 'field',
    });
    expect(wasted.breakdown.pathIntegrity).toBeLessThan(clean.breakdown.pathIntegrity);
    expect(wasted.breakdown.investment).toBe(clean.breakdown.investment); // still just 1 active purchased piece
  });

  it('pieces purchased but never placed do not affect any category (REQ-43)', () => {
    const withoutForfeited = scenario({ trayTypes: ['conveyor'], purchasedTypes: ['gear'], discipline: 'field' });
    const withForfeited = scenario({
      trayTypes: ['conveyor'], purchasedTypes: ['gear'], discipline: 'field', forfeitedPurchasedCount: 5,
    });
    expect(withForfeited.breakdown.completion).toBe(withoutForfeited.breakdown.completion);
    expect(withForfeited.breakdown.pathIntegrity).toBe(withoutForfeited.breakdown.pathIntegrity);
    expect(withForfeited.breakdown.investment).toBe(withoutForfeited.breakdown.investment);
    expect(withForfeited.breakdown.forfeitedPurchasedCount).toBe(5); // informational only
  });
});

// ─── Pre-placed pieces never score — REQ-45/46 ───────────────────────────────

describe('pre-placed pieces (REQ-45/46)', () => {
  it('Source/Terminal and other pre-placed pieces never enter any category', () => {
    const prePlaced: PlacedPiece = {
      id: 'resonator', type: 'counter', category: 'protocol',
      gridX: 0, gridY: 0, ports: getDefaultPorts('counter'), rotation: 0, isPrePlaced: true,
    };
    const player = makePlayerPiece('p0', 'conveyor');
    const r = calculateScore({
      executionSteps: [
        makeStep('source', true, 'src'),
        makeStep('counter', true, 'resonator'),
        makeStep('conveyor', true, 'p0'),
        makeStep('terminal', true, 'out'),
      ],
      placedPieces: [prePlaced, player],
      optimalPieces: 1,
      trayPieceTypes: ['conveyor'],
      discipline: 'systems', // pre-placed counter is 'protocol' but must not count toward discipline
      succeeded: true,
    });
    expect(r.breakdown.pathIntegrity).toBe(15); // 1/1 player pieces active, resonator excluded
    expect(r.breakdown.discipline).toBe(0); // the only Protocol piece (resonator) is pre-placed, doesn't count
  });
});

// ─── Worked examples (Part 11) — reproduced exactly ──────────────────────────

describe('Part 11 worked examples — exact reproduction', () => {
  it('Example A: floor solve only -> 43, 1 star', () => {
    const r = scenario({
      trayTypes: ['configNode', 'configNode', 'conveyor', 'conveyor', 'conveyor'],
      depthCeiling: 10,
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(15);
    expect(r.breakdown.signalDepth).toBe(0);
    expect(r.breakdown.investment).toBe(0);
    expect(r.breakdown.diversity).toBe(0);
    expect(r.breakdown.discipline).toBe(3); // round(2/4*10*0.5)
    expect(r.total).toBe(43);
    expect(r.stars).toBe(1);
  });

  it('Example B: moderate investment -> 74, 2 stars', () => {
    // Spec text: "5 pre-assigned + 3 purchased. 7 placed, 7 active" — read
    // as 4 of the tray's 5 available types actually placed (the pre-assigned
    // count describes the tray, not a literal placed count); the concrete
    // numbers that drive every category (7 active, 3 purchased active, 4
    // distinct types, 3 active Protocol) are what's reproduced here exactly.
    const r = scenario({
      trayTypes: ['configNode', 'conveyor', 'conveyor', 'conveyor'],
      purchasedTypes: ['scanner', 'transmitter', 'conveyor'],
      depthCeiling: 10,
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(15);
    expect(r.breakdown.signalDepth).toBe(10);
    expect(r.breakdown.investment).toBe(9);
    expect(r.breakdown.diversity).toBe(7);
    expect(r.breakdown.discipline).toBe(8);
    expect(r.total).toBe(74);
    expect(r.stars).toBe(2);
  });

  // NOTE (AXM-010, flagged for Tucker): Part 11's own arithmetic for this
  // example computes investment as min(6*3 + 4, 25) = 22, skipping REQ-21's
  // intermediate piece-cap ("pieceInvestment = min(purchasedActivePieces*3,
  // 17)" applied BEFORE adding tape). Applying REQ-21 exactly as written —
  // the normative MUST-formula — gives min(min(18,17)+4,25) = 21, not 22,
  // so the correct total is 96, not 97 (still comfortably 3-star). This is
  // a spec documentation slip, not an implementation bug: REQ-21's formula
  // is unambiguous and this is what's implemented. Flagged, not silently
  // resolved either way — see AXM-010's PR notes.
  it('Example C: full elaboration -> 96 per REQ-21 exactly (spec prose says 97 — see note above)', () => {
    // 4 active Protocol comes entirely from the tray here (4 configNode);
    // the 6 purchased pieces are Physics, contributing to Investment/
    // Diversity without changing an already-maxed Discipline.
    const r = scenario({
      trayTypes: ['configNode', 'configNode', 'configNode', 'configNode'],
      purchasedTypes: ['conveyor', 'gear', 'splitter', 'merger', 'bridge', 'conveyor'],
      depthCeiling: 10,
      purchasedTapeTypes: ['TRAIL'],
      trailUtilized: true,
      discipline: 'systems',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(15);
    expect(r.breakdown.signalDepth).toBe(14);
    // REQ-21: pieceInvestment = min(6*3, 17) = 17, + tapeInvestment 4 = 21.
    expect(r.breakdown.investment).toBe(21);
    expect(r.breakdown.diversity).toBe(11);
    expect(r.breakdown.discipline).toBe(10);
    expect(r.total).toBe(96);
    expect(r.stars).toBe(3);
  });

  it('Example D: bought but did not use well -> 60, 2 stars', () => {
    // 4 active Physics (the 4 tray Conveyors) + 1 active Protocol (the one
    // purchased piece that actually fired) = 3 distinct active types
    // (conveyor, scanner, configNode) per the spec text.
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner'],
      purchasedTypes: ['configNode', 'gear', 'splitter', 'inverter'],
      inactiveIndices: { buy: [1, 2, 3] }, // only 1 of 4 purchased (configNode) is active
      depthCeiling: 10,
      discipline: 'drive',
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.pathIntegrity).toBe(10); // round(6/9*15)
    expect(r.breakdown.signalDepth).toBe(8); // round(6/10*14)
    expect(r.breakdown.investment).toBe(3);
    expect(r.breakdown.diversity).toBe(6); // round(3/6*11) -- 3 distinct active types
    expect(r.breakdown.discipline).toBe(8); // round(4/5*10) -- physicsActive
    expect(r.total).toBe(60);
    expect(r.stars).toBe(2);
  });

  it('Example E: failed machine -> 30, 1 star', () => {
    // 4 active: 2 tray Physics (conveyor, gear) + 2 purchased (scanner
    // Protocol, conveyor Physics) -> protocolActive=1, physicsActive=3,
    // min=1 (Field Operative's binding constraint), 3 distinct active
    // types (conveyor, gear, scanner), matching the spec text exactly.
    const r = scenario({
      trayTypes: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear'],
      purchasedTypes: ['scanner', 'conveyor'],
      inactiveIndices: { tray: [1, 2, 3] },
      depthCeiling: 10,
      discipline: 'field',
      succeeded: false,
    });
    expect(r.breakdown.completion).toBe(0);
    expect(r.breakdown.pathIntegrity).toBe(9); // round(4/7*15)
    expect(r.breakdown.signalDepth).toBe(6); // round(4/10*14)
    expect(r.breakdown.investment).toBe(6);
    expect(r.breakdown.diversity).toBe(6); // round(3/6*11)
    expect(r.breakdown.discipline).toBe(3); // round(min(1,3)/3*10) -- Field Operative
    expect(r.total).toBe(30);
    expect(r.stars).toBe(1);
  });
});

// ─── Credit economy — REQ-34/35/37 ────────────────────────────────────────────

describe('calculatePayout (REQ-34)', () => {
  it('a void score (~15) pays roughly the 0.3x floor', () => {
    expect(calculatePayout(15, 100)).toBe(Math.round(100 * (0.3 + 0.7 * 0.15)));
  });

  it('a perfect score (100) pays the full baseReward', () => {
    expect(calculatePayout(100, 100)).toBe(100);
  });

  it('a 0 score still pays the 0.3x floor, never 0', () => {
    expect(calculatePayout(0, 100)).toBe(30);
  });

  it('scales linearly with score between the floor and the base', () => {
    const at40 = calculatePayout(40, 100);
    const at80 = calculatePayout(80, 100);
    expect(at80).toBeGreaterThan(at40);
  });

  it('clamps total outside [0, 100] before computing', () => {
    expect(calculatePayout(150, 100)).toBe(100);
    expect(calculatePayout(-10, 100)).toBe(30);
  });
});

describe('defaultBaseReward and TUTORIAL_FLAT_PAYOUT (REQ-37)', () => {
  it('tutorial (axiom sector) levels get the flat tutorial payout', () => {
    expect(defaultBaseReward({ sector: 'axiom', optimalPieces: 5 })).toBe(TUTORIAL_FLAT_PAYOUT);
  });

  it('non-tutorial levels scale with optimalPieces', () => {
    const small = defaultBaseReward({ sector: 'kepler', optimalPieces: 3 });
    const large = defaultBaseReward({ sector: 'kepler', optimalPieces: 10 });
    expect(large).toBeGreaterThan(small);
  });
});

// ─── doesConsequenceTrigger ───────────────────────────────────────────────────

describe('doesConsequenceTrigger', () => {
  it('returns false when no consequence', () => {
    expect(doesConsequenceTrigger(undefined, true, 3)).toBe(false);
  });

  it('returns true on failure', () => {
    expect(doesConsequenceTrigger({ cogsWarning: 'w', failureEffect: 'f' }, false, 0)).toBe(true);
  });

  it('returns true when requireThreeStars and stars < 3', () => {
    expect(doesConsequenceTrigger({ cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true }, true, 2)).toBe(true);
  });

  it('returns false when requireThreeStars and stars === 3', () => {
    expect(doesConsequenceTrigger({ cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true }, true, 3)).toBe(false);
  });
});

describe('getConsequenceFailureLine', () => {
  it('returns failureEffect when not succeeded', () => {
    expect(getConsequenceFailureLine({ cogsWarning: 'w', failureEffect: 'System offline.' }, false, 0)).toBe('System offline.');
  });

  it('returns the consequence-stands line when requireThreeStars and stars < 3', () => {
    expect(getConsequenceFailureLine({ cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true }, true, 2))
      .toContain('consequence stands');
  });

  it('returns empty string when succeeded and stars satisfied', () => {
    expect(getConsequenceFailureLine({ cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true }, true, 3)).toBe('');
  });
});

// ─── getCOGSScoreComment ─────────────────────────────────────────────────────

function makeBreakdownV2(overrides: Partial<Parameters<typeof getCOGSScoreComment>[0]> = {}) {
  return {
    completion: 25, pathIntegrity: 15, signalDepth: 0,
    investment: 0, diversity: 0, discipline: 5,
    forfeitedPurchasedCount: 0,
    ...overrides,
  };
}

describe('getCOGSScoreComment', () => {
  it('returns perfect score line at 100', () => {
    const bd = makeBreakdownV2({ signalDepth: 14, investment: 25, diversity: 11, discipline: 10 });
    expect(getCOGSScoreComment(bd, 'systems', 3, 7, 5)).toContain('One hundred');
  });

  it('returns complexity line when investment >= 17', () => {
    const bd = makeBreakdownV2({ investment: 17, discipline: 10, signalDepth: 5 });
    expect(getCOGSScoreComment(bd, 'systems', 3, 7, 5)).toContain('Unnecessary complexity');
  });

  it('returns full-machine line when stars=3 and investment >= 12', () => {
    const bd = makeBreakdownV2({ investment: 12, discipline: 10, signalDepth: 5 });
    expect(getCOGSScoreComment(bd, 'systems', 3, 7, 5)).toContain('Full machine');
  });

  it('returns low-investment line when investment < 6', () => {
    const bd = makeBreakdownV2({ investment: 3, discipline: 5 });
    expect(getCOGSScoreComment(bd, 'drive', 1, 1, 5)).toContain('available pieces');
  });

  it('returns protocol-catalogue line when diversity === 0 and investment >= 6', () => {
    const bd = makeBreakdownV2({ investment: 8, diversity: 0, discipline: 10, signalDepth: 4 });
    expect(getCOGSScoreComment(bd, 'drive', 2, 4, 4)).toContain('Protocol catalogue');
  });

  it('returns signal-integrity line when pathIntegrity < 8 and investment >= 6 and diversity > 0', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 5, discipline: 10, signalDepth: 5 });
    expect(getCOGSScoreComment(bd, 'field', 2, 4, 4)).toContain('never saw the signal');
  });

  it('returns stars-3 fallback when no special condition is met', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    expect(getCOGSScoreComment(bd, 'systems', 3, 4, 4)).toContain('Optimal');
  });

  it('returns stars-2 fallback', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    expect(getCOGSScoreComment(bd, 'systems', 2, 4, 4)).toContain('Functional');
  });

  it('returns stars-1 fallback', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    expect(getCOGSScoreComment(bd, 'systems', 1, 4, 4)).toContain('barely worked');
  });

  it('returns void fallback for 0 stars', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    expect(getCOGSScoreComment(bd, 'systems', 0, 4, 4)).toContain('did not lock');
  });
});

// ─── getTutorialCOGSComment ───────────────────────────────────────────────────

describe('getTutorialCOGSComment', () => {
  it('returns a comment for all disciplines at 80+', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(90, d)).toBeTruthy();
    }
  });

  it('returns a comment for all disciplines at 55-79', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(60, d)).toBeTruthy();
    }
  });

  it('returns a comment for all disciplines below 55', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(20, d)).toBeTruthy();
    }
  });
});
