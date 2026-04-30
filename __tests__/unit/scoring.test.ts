import { calculateScore, doesConsequenceTrigger, getCOGSScoreComment, getTutorialCOGSComment } from '../../src/game/scoring';
import type { ExecutionStep, PlacedPiece } from '../../src/game/types';
import { getDefaultPorts } from '../../src/game/engine';

let stepId = 0;
function makeStep(type: string, success = true, pieceId?: string): ExecutionStep {
  return { pieceId: pieceId ?? `p-${type}-${stepId++}`, type, timestamp: 0, success };
}

function makePlayerPiece(id: string, type: PlacedPiece['type']): PlacedPiece {
  const cat = ['configNode', 'scanner', 'transmitter', 'latch', 'inverter', 'counter'].includes(type)
    ? 'protocol' as const : 'physics' as const;
  return { id, type, category: cat, gridX: 0, gridY: 0, ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false };
}

// ─── Standard call helpers ────────────────────────────────────────────────────

// Floor solve: only tray pieces, all active, succeeded
function floorSolve(trayTypes: PlacedPiece['type'][] = ['conveyor', 'conveyor', 'conveyor', 'gear', 'gear']) {
  const pieces = trayTypes.map((t, i) => makePlayerPiece(`t${i}`, t));
  const steps = [
    makeStep('source', true, 'src'),
    ...pieces.map(p => makeStep(p.type, true, p.id)),
    makeStep('terminal', true, 'out'),
  ];
  return calculateScore({
    executionSteps: steps,
    placedPieces: pieces,
    optimalPieces: trayTypes.length,
    trayPieceTypes: trayTypes,
    depthCeiling: 10,
    discipline: 'field',
    engageDurationMs: 5000,
    elapsedSeconds: 5,
    succeeded: true,
  });
}

// ─── Category 1: Completion ──────────────────────────���────────────────────────

describe('Completion category', () => {
  it('returns 25 when succeeded', () => {
    const r = calculateScore({
      executionSteps: [makeStep('source', true, 'src'), makeStep('terminal', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.breakdown.completion).toBe(25);
    expect(r.breakdown.completionBonus).toBe(25); // compat alias
  });

  it('returns 0 when failed', () => {
    const r = calculateScore({
      executionSteps: [makeStep('void', false)],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: false,
    });
    expect(r.breakdown.completion).toBe(0);
  });

  it('infers success from terminal step when succeeded not passed', () => {
    const r = calculateScore({
      executionSteps: [makeStep('source', true, 'src'), makeStep('terminal', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      engageDurationMs: 1000,
    });
    expect(r.breakdown.completion).toBe(25);
  });

  it('infers failure when no terminal step', () => {
    const r = calculateScore({
      executionSteps: [makeStep('source', true, 'src')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      engageDurationMs: 1000,
    });
    expect(r.breakdown.completion).toBe(0);
  });
});

// ─── Category 2: Path Integrity ────────────────���──────────────────────────────

describe('Path Integrity category', () => {
  it('returns 15 when all player pieces are active', () => {
    const pieces = [makePlayerPiece('c1', 'conveyor'), makePlayerPiece('c2', 'conveyor')];
    const r = calculateScore({
      executionSteps: [
        makeStep('source', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('conveyor', true, 'c2'),
        makeStep('terminal', true, 'out'),
      ],
      placedPieces: pieces,
      optimalPieces: 2,
      discipline: 'drive',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.breakdown.pathIntegrity).toBe(15);
    expect(r.breakdown.chainIntegrity).toBe(15); // compat alias
  });

  it('returns partial when some pieces missed the signal', () => {
    const pieces = [makePlayerPiece('c1', 'conveyor'), makePlayerPiece('c2', 'conveyor'), makePlayerPiece('c3', 'conveyor')];
    const r = calculateScore({
      executionSteps: [
        makeStep('source', true, 'src'),
        makeStep('conveyor', true, 'c1'),
        makeStep('terminal', true, 'out'),
      ],
      placedPieces: pieces, // c2 and c3 not in steps
      optimalPieces: 3,
      discipline: 'drive',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 1 of 3 active → round(1/3 * 15) = round(5) = 5
    expect(r.breakdown.pathIntegrity).toBe(5);
  });

  it('returns 15 when no player pieces placed (degenerate)', () => {
    const r = calculateScore({
      executionSteps: [makeStep('source', true, 'src'), makeStep('terminal', true, 'out')],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.breakdown.pathIntegrity).toBe(15);
  });
});

// ─── Investment gate ──────────────────────────────────────────────────────────

describe('Investment gate (Signal Depth and Diversity)', () => {
  it('signalDepth is 0 when no purchased active pieces', () => {
    const r = floorSolve();
    expect(r.breakdown.signalDepth).toBe(0);
    expect(r.breakdown.elaboration).toBe(0); // compat alias
  });

  it('diversity is 0 when no purchased active pieces', () => {
    const r = floorSolve();
    expect(r.breakdown.diversity).toBe(0);
  });
});

// ─── Category 3: Signal Depth ─────────────────────���─────────────────────────��─

describe('Signal Depth category', () => {
  it('is proportional to activePieces / depthCeiling', () => {
    // 5 tray pieces + 1 purchased active = 6 total active, depthCeiling=10
    const trayTypes: PlacedPiece['type'][] = ['conveyor', 'conveyor', 'conveyor', 'gear', 'gear'];
    const trayPieces = trayTypes.map((t, i) => makePlayerPiece(`t${i}`, t));
    const bought = makePlayerPiece('b0', 'conveyor');
    const allPieces = [...trayPieces, bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 5,
      trayPieceTypes: trayTypes,
      depthCeiling: 10,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 6 active / 10 ceiling * 14 = round(8.4) = 8
    expect(r.breakdown.signalDepth).toBe(8);
  });

  it('caps at 14 when active pieces exceed depthCeiling', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPieces = trayTypes.map((t, i) => makePlayerPiece(`t${i}`, t));
    // Buy 12 more → 13 total, depthCeiling=5
    const bought = Array.from({ length: 12 }, (_, i) => makePlayerPiece(`b${i}`, 'conveyor'));
    const allPieces = [...trayPieces, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      depthCeiling: 5,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.breakdown.signalDepth).toBe(14);
  });

  it('defaults depthCeiling to optimalPieces * 2 when not provided', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = makePlayerPiece('b0', 'conveyor');
    const allPieces = [trayPiece, bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 4, // depthCeiling defaults to 8
      trayPieceTypes: trayTypes,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 2 active / 8 ceiling * 14 = round(3.5) = 4
    expect(r.breakdown.signalDepth).toBe(4);
  });
});

// ─── Category 4: Investment ───────────────────────────────────────────────────

describe('Investment category', () => {
  it('awards 3 points per purchased active piece', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = [makePlayerPiece('b0', 'conveyor'), makePlayerPiece('b1', 'gear')];
    const allPieces = [trayPiece, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 2 purchased active * 3 = 6, no tape
    expect(r.breakdown.investment).toBe(6);
    expect(r.breakdown.machineComplexity).toBe(6); // compat alias
  });

  it('caps piece points at 17', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = Array.from({ length: 7 }, (_, i) => makePlayerPiece(`b${i}`, 'conveyor'));
    const allPieces = [trayPiece, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 7 purchased active * 3 = 21, capped at 17
    expect(r.breakdown.investment).toBe(17);
  });

  it('adds 4 tape points per purchased tape type', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = makePlayerPiece('b0', 'conveyor');
    const allPieces = [trayPiece, bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      purchasedTapeTypes: ['TRAIL'],
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 1 purchased piece * 3 = 3, + 1 tape * 4 = 4, total 7
    expect(r.breakdown.investment).toBe(7);
  });

  it('caps tape points at 8 (max 2 tape types)', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = makePlayerPiece('b0', 'conveyor');
    const allPieces = [trayPiece, bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      purchasedTapeTypes: ['TRAIL', 'OUT', 'EXTRA'],
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 1 piece * 3 = 3, + min(3*4, 8) = 8, total 11
    expect(r.breakdown.investment).toBe(11);
  });
});

// ─── Category 5: Diversity ────────────────────────────────────────────────────

describe('Diversity category', () => {
  it('is proportional to distinct active piece types', () => {
    // 2 purchased pieces of 2 different types
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = [makePlayerPiece('b0', 'gear'), makePlayerPiece('b1', 'scanner')];
    const allPieces = [trayPiece, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 2 distinct types (conveyor, gear, scanner = 3 → wait, tray conveyor + bought gear + bought scanner = 3 distinct)
    // 3/6 * 11 = round(5.5) = 6
    expect(r.breakdown.diversity).toBe(6);
  });

  it('caps at 11 with 6+ distinct types', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = [
      makePlayerPiece('b0', 'gear'),
      makePlayerPiece('b1', 'scanner'),
      makePlayerPiece('b2', 'configNode'),
      makePlayerPiece('b3', 'transmitter'),
      makePlayerPiece('b4', 'splitter'),
      makePlayerPiece('b5', 'latch'),
    ];
    const allPieces = [trayPiece, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // 7 distinct types, min(round(7/6 * 11), 11) = 11
    expect(r.breakdown.diversity).toBe(11);
    expect(r.breakdown.protocolPrecision).toBe(11); // compat alias
  });
});

// ─── Category 6: Discipline ───────────────────────────────────────────────────

describe('Discipline category', () => {
  it('returns 5 (half credit) when no purchased active pieces', () => {
    const r = floorSolve();
    expect(r.breakdown.discipline).toBe(5);
    expect(r.breakdown.disciplineBonus).toBe(5); // compat alias
  });

  it('returns 10 when purchased active pieces present', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = makePlayerPiece('b0', 'gear');
    const allPieces = [trayPiece, bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    for (const d of ['systems', 'drive', 'field'] as const) {
      const r = calculateScore({
        executionSteps: steps,
        placedPieces: allPieces,
        optimalPieces: 1,
        trayPieceTypes: trayTypes,
        discipline: d,
        engageDurationMs: 1000,
        succeeded: true,
      });
      expect(r.breakdown.discipline).toBe(10);
    }
  });
});

// ─── Floor-solve ceiling ──────────────────────���──────────────────────��────────

describe('Floor-solve ceiling (max 45, 1 star)', () => {
  it('floor solve totals exactly 45 with K1-1 tray', () => {
    // 3 conveyors + 2 gears, all active, no purchases
    const r = floorSolve(['conveyor', 'conveyor', 'conveyor', 'gear', 'gear']);
    // completion=25 + pathIntegrity=15 + signalDepth=0 + investment=0 + diversity=0 + discipline=5 = 45
    expect(r.total).toBe(45);
  });

  it('floor solve is 1 star max', () => {
    const r = floorSolve(['conveyor', 'conveyor', 'conveyor', 'gear', 'gear']);
    expect(r.stars).toBe(1);
  });

  it('floor solve with all active: signalDepth and diversity are both 0', () => {
    const r = floorSolve();
    expect(r.breakdown.signalDepth).toBe(0);
    expect(r.breakdown.diversity).toBe(0);
    expect(r.breakdown.investment).toBe(0);
  });

  it('adding one purchased piece breaks through floor-solve ceiling', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor', 'conveyor', 'conveyor', 'gear', 'gear'];
    const trayPieces = trayTypes.map((t, i) => makePlayerPiece(`t${i}`, t));
    const bought = makePlayerPiece('b0', 'conveyor');
    const allPieces = [...trayPieces, bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 5,
      trayPieceTypes: trayTypes,
      depthCeiling: 10,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.total).toBeGreaterThan(45);
    expect(r.breakdown.signalDepth).toBeGreaterThan(0);
    expect(r.breakdown.diversity).toBeGreaterThan(0);
    expect(r.breakdown.discipline).toBe(10);
  });
});

// ─── Star thresholds ─────────────────────��────────────────────────────────────

describe('Star thresholds', () => {
  it('3 stars at >= 80', () => {
    // Build a high-investment scenario
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = [
      makePlayerPiece('b0', 'gear'),
      makePlayerPiece('b1', 'scanner'),
      makePlayerPiece('b2', 'configNode'),
      makePlayerPiece('b3', 'transmitter'),
      makePlayerPiece('b4', 'splitter'),
    ];
    const allPieces = [trayPiece, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 5,
      trayPieceTypes: trayTypes,
      depthCeiling: 10,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.total).toBeGreaterThanOrEqual(80);
    expect(r.stars).toBe(3);
  });

  it('2 stars in 55-79 range', () => {
    // Floor solve = 45 (1 star). Add 2 purchased pieces to push into 2-star range.
    const trayTypes: PlacedPiece['type'][] = ['conveyor', 'conveyor', 'conveyor', 'gear', 'gear'];
    const trayPieces = trayTypes.map((t, i) => makePlayerPiece(`t${i}`, t));
    const bought = [makePlayerPiece('b0', 'scanner'), makePlayerPiece('b1', 'configNode')];
    const allPieces = [...trayPieces, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 5,
      trayPieceTypes: trayTypes,
      depthCeiling: 10,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // completion=25, pathIntegrity=15, signalDepth=round(7/10*14)=10,
    // investment=6, diversity=round(3/6*11)=6 (conveyor,gear,scanner+configNode=3 types wait...)
    // tray active: conveyor,gear; purchased: scanner,configNode → distinct = {conveyor,gear,scanner,configNode}=4 types
    // diversity=round(4/6*11)=round(7.3)=7; discipline=10
    // total = 25+15+10+6+7+10 = 73 → 2 stars
    expect(r.stars).toBe(2);
  });

  it('0 stars when total < 30', () => {
    const r = calculateScore({
      executionSteps: [makeStep('void', false)],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: false,
    });
    // completion=0, pathIntegrity=15 (no pieces), others=0, discipline=5 → total=20
    expect(r.total).toBe(20);
    expect(r.stars).toBe(0);
  });

  it('1 star at exactly 30', () => {
    // Total of 30: need to engineer a scenario
    // completion=25, pathIntegrity=0(some pieces but none active), discipline=5 → 30
    const pieces = [makePlayerPiece('c1', 'conveyor')];
    const r = calculateScore({
      executionSteps: [makeStep('source', true, 'src'), makeStep('terminal', true, 'out')],
      placedPieces: pieces,
      optimalPieces: 1,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    // completion=25, pathIntegrity=0 (c1 not in steps), signalDepth=0, investment=0, diversity=0, discipline=5 → 30
    expect(r.total).toBe(30);
    expect(r.stars).toBe(1);
  });
});

// ─── Backward-compat aliases ──────────────────────────────────────────────────

describe('Backward-compat aliases in ScoreBreakdown', () => {
  it('efficiency = completion', () => {
    const r = floorSolve();
    expect(r.breakdown.efficiency).toBe(r.breakdown.completion);
  });

  it('chainIntegrity = pathIntegrity', () => {
    const r = floorSolve();
    expect(r.breakdown.chainIntegrity).toBe(r.breakdown.pathIntegrity);
  });

  it('disciplineBonus = discipline', () => {
    const r = floorSolve();
    expect(r.breakdown.disciplineBonus).toBe(r.breakdown.discipline);
  });

  it('speedBonus is always 0', () => {
    const r = floorSolve();
    expect(r.breakdown.speedBonus).toBe(0);
  });

  it('elaboration = signalDepth', () => {
    // With purchased pieces, signalDepth > 0
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = makePlayerPiece('b0', 'gear');
    const allPieces = [trayPiece, bought];
    const steps = [
      makeStep('source', true, 'src'),
      ...allPieces.map(p => makeStep(p.type, true, p.id)),
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      depthCeiling: 10,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.breakdown.elaboration).toBe(r.breakdown.signalDepth);
  });

  it('forfeitedPurchasedCount passes through from param (default 0)', () => {
    const r = floorSolve();
    expect(r.breakdown.forfeitedPurchasedCount).toBe(0);
  });

  it('forfeitedPurchasedCount reflects param value when provided', () => {
    const r = calculateScore({
      executionSteps: [],
      placedPieces: [],
      optimalPieces: 0,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: false,
      forfeitedPurchasedCount: 3,
    });
    expect(r.breakdown.forfeitedPurchasedCount).toBe(3);
  });

  it('purchasedTouchedCount = count of purchased pieces in signal path', () => {
    const trayTypes: PlacedPiece['type'][] = ['conveyor'];
    const trayPiece = makePlayerPiece('t0', 'conveyor');
    const bought = [makePlayerPiece('b0', 'gear'), makePlayerPiece('b1', 'scanner')];
    const boughtActive = bought[0]; // only b0 in signal path
    const allPieces = [trayPiece, ...bought];
    const steps = [
      makeStep('source', true, 'src'),
      makeStep('conveyor', true, 't0'),
      makeStep('gear', true, boughtActive.id),
      // b1 (scanner) not in steps
      makeStep('terminal', true, 'out'),
    ];
    const r = calculateScore({
      executionSteps: steps,
      placedPieces: allPieces,
      optimalPieces: 1,
      trayPieceTypes: trayTypes,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(r.breakdown.purchasedTouchedCount).toBe(1);
  });
});

// ─── doesConsequenceTrigger ───────────────────────────────────────────────────

describe('doesConsequenceTrigger', () => {
  it('returns false when no consequence', () => {
    expect(doesConsequenceTrigger(undefined, true, 3)).toBe(false);
  });

  it('returns true on failure', () => {
    expect(doesConsequenceTrigger(
      { cogsWarning: 'w', failureEffect: 'f' },
      false, 0,
    )).toBe(true);
  });

  it('returns true when requireThreeStars and stars < 3', () => {
    expect(doesConsequenceTrigger(
      { cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true },
      true, 2,
    )).toBe(true);
  });

  it('returns false when requireThreeStars and stars === 3', () => {
    expect(doesConsequenceTrigger(
      { cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true },
      true, 3,
    )).toBe(false);
  });
});

// ─── getCOGSScoreComment ─────────────────────���────────────────────────────────

function makeBreakdownV2(overrides: Partial<Parameters<typeof getCOGSScoreComment>[0]> = {}) {
  // Build a plausible v2 breakdown (no purchased pieces → floor solve)
  return {
    completion: 25, pathIntegrity: 15, signalDepth: 0,
    investment: 0, diversity: 0, discipline: 5,
    completionBonus: 25, machineComplexity: 0, protocolPrecision: 0,
    speedBonus: 0, elaboration: 0, purchasedTouchedCount: 0,
    forfeitedPurchasedCount: 0,
    efficiency: 25, chainIntegrity: 15, disciplineBonus: 5,
    ...overrides,
  };
}

describe('getCOGSScoreComment', () => {
  it('returns perfect score line at 100', () => {
    const bd = makeBreakdownV2({
      completion: 25, pathIntegrity: 15, signalDepth: 14,
      investment: 25, diversity: 11, discipline: 10,
    });
    const comment = getCOGSScoreComment(bd, 'systems', 3, 7, 5);
    expect(comment).toContain('One hundred');
  });

  it('returns complexity line when investment >= 17', () => {
    const bd = makeBreakdownV2({ investment: 17, discipline: 10, signalDepth: 5 });
    const comment = getCOGSScoreComment(bd, 'systems', 3, 7, 5);
    expect(comment).toContain('Unnecessary complexity');
  });

  it('returns full-machine line when stars=3 and investment >= 12', () => {
    const bd = makeBreakdownV2({ investment: 12, discipline: 10, signalDepth: 5 });
    const comment = getCOGSScoreComment(bd, 'systems', 3, 7, 5);
    expect(comment).toContain('Full machine');
  });

  it('returns low-investment line when investment < 6', () => {
    const bd = makeBreakdownV2({ investment: 3, discipline: 5 });
    const comment = getCOGSScoreComment(bd, 'drive', 1, 1, 5);
    expect(comment).toContain('available pieces');
  });

  it('returns protocol-catalogue line when diversity === 0 and investment >= 6', () => {
    const bd = makeBreakdownV2({ investment: 8, diversity: 0, discipline: 10, signalDepth: 4 });
    const comment = getCOGSScoreComment(bd, 'drive', 2, 4, 4);
    expect(comment).toContain('Protocol catalogue');
  });

  it('returns signal-integrity line when pathIntegrity < 8 and investment >= 6 and diversity > 0', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 5, discipline: 10, signalDepth: 5 });
    const comment = getCOGSScoreComment(bd, 'field', 2, 4, 4);
    expect(comment).toContain('never saw the signal');
  });

  it('returns stars-3 fallback when no special condition met', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    const comment = getCOGSScoreComment(bd, 'systems', 3, 4, 4);
    expect(comment).toContain('Optimal');
  });

  it('returns stars-2 fallback', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    const comment = getCOGSScoreComment(bd, 'systems', 2, 4, 4);
    expect(comment).toContain('Functional');
  });

  it('returns stars-1 fallback', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    const comment = getCOGSScoreComment(bd, 'systems', 1, 4, 4);
    expect(comment).toContain('barely worked');
  });

  it('returns void fallback for 0 stars', () => {
    const bd = makeBreakdownV2({ investment: 9, diversity: 5, pathIntegrity: 10, discipline: 10, signalDepth: 5 });
    const comment = getCOGSScoreComment(bd, 'systems', 0, 4, 4);
    expect(comment).toContain('did not lock');
  });
});

// ─── getTutorialCOGSComment ────────────────────────────────────────────��──────

describe('getTutorialCOGSComment', () => {
  it('returns comment for all disciplines at 80+', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(90, d)).toBeTruthy();
    }
  });

  it('returns comment for all disciplines at 55-79', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(60, d)).toBeTruthy();
    }
  });

  it('returns comment for all disciplines below 55', () => {
    for (const d of ['systems', 'drive', 'field'] as const) {
      expect(getTutorialCOGSComment(20, d)).toBeTruthy();
    }
  });
});
