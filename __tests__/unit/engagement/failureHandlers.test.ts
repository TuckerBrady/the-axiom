import type { Dispatch, SetStateAction } from 'react';
import {
  handleWrongOutput,
  handleVoidFailure,
} from '../../../src/game/engagement/failureHandlers';
import type { WrongOutputParams, VoidFailureParams } from '../../../src/game/engagement/failureHandlers';
import type { ExecutionStep, PlacedPiece } from '../../../src/game/engagement/types';
import {
  getConsequenceFailureLine,
  getCOGSScoreComment,
  calculateScore,
} from '../../../src/game/scoring';
import type { ScoreBreakdown } from '../../../src/game/scoring';

jest.useFakeTimers();

// ─── Shared piece fixture ─────────────────────────────────────────────────────

function makePlacedPiece(overrides: Partial<PlacedPiece> = {}): PlacedPiece {
  return {
    id: 'piece-1',
    type: 'conveyor',
    category: 'physics',
    gridX: 1,
    gridY: 2,
    ports: [],
    rotation: 0,
    ...overrides,
  };
}

function makeStep(pieceId = 'piece-1'): ExecutionStep {
  return { pieceId, type: 'conveyor', timestamp: 0, success: true };
}

// ─── WrongOutput param factory ────────────────────────────────────────────────

function makeWrongOutputParams(
  overrides: Partial<WrongOutputParams> = {},
): WrongOutputParams {
  return {
    steps: [makeStep()],
    expected: [1, 0],
    produced: [0, 1],
    isAxiomLevel: false,
    findBlownPiece: jest.fn().mockReturnValue(null),
    deletePiece: jest.fn(),
    setBlownCells: jest.fn() as unknown as Dispatch<SetStateAction<Set<string>>>,
    setWrongOutputData: jest.fn(),
    setShowWrongOutput: jest.fn(),
    loseLife: jest.fn(),
    ...overrides,
  };
}

// ─── VoidFailure param factory ────────────────────────────────────────────────

function makeVoidParams(
  overrides: Partial<VoidFailureParams> = {},
): VoidFailureParams {
  return {
    steps: [makeStep()],
    levelId: 'A1-1',
    isAxiomLevel: false,
    failCount: 0,
    findBlownPiece: jest.fn().mockReturnValue(null),
    deletePiece: jest.fn(),
    setBlownCells: jest.fn() as unknown as Dispatch<SetStateAction<Set<string>>>,
    setFailCount: jest.fn(),
    setFlashColor: jest.fn(),
    setShowTeachCard: jest.fn(),
    setShowVoid: jest.fn(),
    triggerHints: jest.fn(),
    redColor: '#FF3B3B',
    ...overrides,
  };
}

// ─── handleWrongOutput ────────────────────────────────────────────────────────

describe('handleWrongOutput', () => {
  it('calls setWrongOutputData with copies of expected and produced arrays', () => {
    const params = makeWrongOutputParams();
    handleWrongOutput(params);
    expect(params.setWrongOutputData).toHaveBeenCalledWith({
      expected: [1, 0],
      produced: [0, 1],
    });
  });

  it('passes independent copies — mutating originals does not affect the stored value', () => {
    const expected = [1, 0];
    const produced = [0, 1];
    const params = makeWrongOutputParams({ expected, produced });
    handleWrongOutput(params);
    expected.push(99);
    produced.push(99);
    const stored = (params.setWrongOutputData as jest.Mock).mock.calls[0][0] as {
      expected: number[];
      produced: number[];
    };
    expect(stored.expected).toEqual([1, 0]);
    expect(stored.produced).toEqual([0, 1]);
  });

  it('calls setShowWrongOutput(true)', () => {
    const params = makeWrongOutputParams();
    handleWrongOutput(params);
    expect(params.setShowWrongOutput).toHaveBeenCalledWith(true);
  });

  it('calls loseLife()', () => {
    const params = makeWrongOutputParams();
    handleWrongOutput(params);
    expect(params.loseLife).toHaveBeenCalledTimes(1);
  });

  it('non-Axiom with blown piece: calls findBlownPiece, deletePiece, and setBlownCells', () => {
    const blown = makePlacedPiece({ id: 'piece-blown', gridX: 1, gridY: 2 });
    const findBlownPiece = jest.fn().mockReturnValue(blown);
    const deletePiece = jest.fn();
    const setBlownCells = jest.fn();
    const params = makeWrongOutputParams({
      isAxiomLevel: false,
      findBlownPiece,
      deletePiece,
      setBlownCells,
    });
    handleWrongOutput(params);
    expect(findBlownPiece).toHaveBeenCalledWith('wrongOutput', params.steps);
    expect(deletePiece).toHaveBeenCalledWith('piece-blown');
    expect(setBlownCells).toHaveBeenCalledTimes(1);
  });

  it('non-Axiom with blown piece: setBlownCells updater adds the correct cell key', () => {
    const blown = makePlacedPiece({ id: 'piece-blown', gridX: 1, gridY: 2 });
    const findBlownPiece = jest.fn().mockReturnValue(blown);
    let capturedUpdater: ((prev: Set<string>) => Set<string>) | null = null;
    const setBlownCellsMock = jest.fn((updater: SetStateAction<Set<string>>) => {
      if (typeof updater === 'function') capturedUpdater = updater;
    });
    const setBlownCells = setBlownCellsMock as unknown as Dispatch<SetStateAction<Set<string>>>;
    const params = makeWrongOutputParams({
      isAxiomLevel: false,
      findBlownPiece,
      setBlownCells,
    });
    handleWrongOutput(params);
    expect(capturedUpdater).not.toBeNull();
    const result = capturedUpdater!(new Set<string>());
    expect(result.has('1,2')).toBe(true);
  });

  it('non-Axiom with no blown piece: deletePiece is NOT called', () => {
    const findBlownPiece = jest.fn().mockReturnValue(null);
    const deletePiece = jest.fn();
    const params = makeWrongOutputParams({
      isAxiomLevel: false,
      findBlownPiece,
      deletePiece,
    });
    handleWrongOutput(params);
    expect(deletePiece).not.toHaveBeenCalled();
  });

  it('isAxiomLevel: findBlownPiece and deletePiece are NOT called', () => {
    const findBlownPiece = jest.fn().mockReturnValue(makePlacedPiece());
    const deletePiece = jest.fn();
    const params = makeWrongOutputParams({
      isAxiomLevel: true,
      findBlownPiece,
      deletePiece,
    });
    handleWrongOutput(params);
    expect(findBlownPiece).not.toHaveBeenCalled();
    expect(deletePiece).not.toHaveBeenCalled();
  });
});

// ─── handleVoidFailure ────────────────────────────────────────────────────────

describe('handleVoidFailure', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('standard level A1-1 failCount=0: increments failCount to 1, shows void, triggers hints, returns false', async () => {
    const params = makeVoidParams({ levelId: 'A1-1', failCount: 0 });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(params.setFailCount).toHaveBeenCalledWith(1);
    expect(params.setShowVoid).toHaveBeenCalledWith(true);
    expect(params.triggerHints).toHaveBeenCalledWith('onVoid');
    expect(result).toBe(false);
  });

  it('A1-3 failCount=0: shows first teach card and returns true', async () => {
    const params = makeVoidParams({ levelId: 'A1-3', failCount: 0 });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(true);
    expect(params.setShowTeachCard).toHaveBeenCalledTimes(1);
    const lines = (params.setShowTeachCard as jest.Mock).mock.calls[0][0] as string[];
    expect(lines[0]).toBe('The Config Node blocked the signal.');
    expect(lines).toHaveLength(4);
    expect(params.setShowVoid).not.toHaveBeenCalled();
  });

  it('A1-3 failCount=1: shows second teach card and returns true', async () => {
    const params = makeVoidParams({ levelId: 'A1-3', failCount: 1 });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(true);
    expect(params.setShowTeachCard).toHaveBeenCalledTimes(1);
    const lines = (params.setShowTeachCard as jest.Mock).mock.calls[0][0] as string[];
    expect(lines[0]).toBe('Still blocked. Let me be more direct.');
    expect(lines).toHaveLength(5);
    expect(params.setShowVoid).not.toHaveBeenCalled();
  });

  it('A1-3 failCount=2: falls through to void path, no teach card, returns false', async () => {
    const params = makeVoidParams({ levelId: 'A1-3', failCount: 2 });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(false);
    expect(params.setShowTeachCard).not.toHaveBeenCalled();
    expect(params.setShowVoid).toHaveBeenCalledWith(true);
  });

  it('non-Axiom with blown piece: calls findBlownPiece, deletePiece, setBlownCells', async () => {
    const blown = makePlacedPiece({ id: 'blown-2', gridX: 3, gridY: 4 });
    const findBlownPiece = jest.fn().mockReturnValue(blown);
    const deletePiece = jest.fn();
    const setBlownCells = jest.fn();
    const params = makeVoidParams({
      levelId: 'A1-1',
      isAxiomLevel: false,
      findBlownPiece,
      deletePiece,
      setBlownCells,
    });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(findBlownPiece).toHaveBeenCalledWith('void', params.steps);
    expect(deletePiece).toHaveBeenCalledWith('blown-2');
    expect(setBlownCells).toHaveBeenCalledTimes(1);
  });

  it('non-Axiom with blown piece: setBlownCells updater adds correct cell key', async () => {
    const blown = makePlacedPiece({ id: 'blown-3', gridX: 3, gridY: 4 });
    const findBlownPiece = jest.fn().mockReturnValue(blown);
    let capturedUpdater: ((prev: Set<string>) => Set<string>) | null = null;
    const setBlownCellsMock = jest.fn((updater: SetStateAction<Set<string>>) => {
      if (typeof updater === 'function') capturedUpdater = updater;
    });
    const setBlownCells = setBlownCellsMock as unknown as Dispatch<SetStateAction<Set<string>>>;
    const params = makeVoidParams({
      levelId: 'A1-1',
      isAxiomLevel: false,
      findBlownPiece,
      setBlownCells,
    });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(capturedUpdater).not.toBeNull();
    const result = capturedUpdater!(new Set<string>());
    expect(result.has('3,4')).toBe(true);
  });

  it('isAxiomLevel: findBlownPiece is NOT called', async () => {
    const findBlownPiece = jest.fn().mockReturnValue(makePlacedPiece());
    const params = makeVoidParams({
      levelId: 'A1-1',
      isAxiomLevel: true,
      findBlownPiece,
    });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(findBlownPiece).not.toHaveBeenCalled();
  });

  it('flash sequence: setFlashColor called red 3 times then null 3 times (alternating)', async () => {
    const setFlashColor = jest.fn();
    const params = makeVoidParams({ setFlashColor, levelId: 'A1-1' });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    await promise;
    const calls = (setFlashColor as jest.Mock).mock.calls.map((c: [string | null]) => c[0]);
    // Alternating pattern: red, null, red, null, red, null
    expect(calls[0]).toBe('#FF3B3B');
    expect(calls[1]).toBeNull();
    expect(calls[2]).toBe('#FF3B3B');
    expect(calls[3]).toBeNull();
    expect(calls[4]).toBe('#FF3B3B');
    expect(calls[5]).toBeNull();
    const redCalls = calls.filter((c: string | null) => c === '#FF3B3B').length;
    const nullCalls = calls.filter((c: string | null) => c === null).length;
    expect(redCalls).toBe(3);
    expect(nullCalls).toBe(3);
  });

  it('flash uses the redColor provided in params', async () => {
    const setFlashColor = jest.fn();
    const params = makeVoidParams({ setFlashColor, redColor: '#DEADBE', levelId: 'A1-1' });
    const promise = handleVoidFailure(params);
    await jest.runAllTimersAsync();
    await promise;
    const calls = (setFlashColor as jest.Mock).mock.calls.map((c: [string | null]) => c[0]);
    const redCalls = calls.filter((c: string | null) => c === '#DEADBE');
    expect(redCalls.length).toBe(3);
  });
});

// ─── scoring supplemental coverage ───────────────────────────────────────────
// These tests cover branches in scoring.ts that are not reached by
// scoring.test.ts alone.

function makeBreakdown(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  // v2 defaults: 3 purchased-active pieces → investment=9, diversity>0, discipline=10
  return {
    // v2 canonical
    completion: 25,
    pathIntegrity: 10,
    signalDepth: 4,
    investment: 9,
    diversity: 5,
    discipline: 10,
    // v1 compat aliases
    completionBonus: 25,
    machineComplexity: 9,
    protocolPrecision: 5,
    speedBonus: 0,
    elaboration: 4,
    purchasedTouchedCount: 3,
    efficiency: 25,
    chainIntegrity: 10,
    disciplineBonus: 10,
    ...overrides,
  };
}

describe('getConsequenceFailureLine', () => {
  it('returns failureEffect when not succeeded', () => {
    const line = getConsequenceFailureLine(
      { cogsWarning: 'w', failureEffect: 'System offline.' },
      false,
      0,
    );
    expect(line).toBe('System offline.');
  });

  it('returns consequence-stands line when requireThreeStars and stars < 3', () => {
    const line = getConsequenceFailureLine(
      { cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true },
      true,
      2,
    );
    expect(line).toContain('consequence stands');
  });

  it('returns empty string when succeeded and stars satisfied', () => {
    const line = getConsequenceFailureLine(
      { cogsWarning: 'w', failureEffect: 'f', requireThreeStars: true },
      true,
      3,
    );
    expect(line).toBe('');
  });

  it('returns empty string when no requireThreeStars and succeeded', () => {
    const line = getConsequenceFailureLine(
      { cogsWarning: 'w', failureEffect: 'f' },
      true,
      1,
    );
    expect(line).toBe('');
  });
});

describe('getCOGSScoreComment additional branches', () => {
  it('returns full-machine line when stars=3 and investment >= 12', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ investment: 12, machineComplexity: 12 }),
      'systems', 3, 4, 4,
    );
    expect(comment).toContain('Full machine');
  });

  it('returns protocol-avoided line when diversity is 0 and investment >= 6', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ diversity: 0, protocolPrecision: 0, investment: 8, machineComplexity: 8 }),
      'drive', 2, 4, 4,
    );
    expect(comment).toContain('Protocol catalogue');
  });

  it('returns path-integrity line when pathIntegrity < 8 and investment >= 6 and diversity > 0', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ pathIntegrity: 5, chainIntegrity: 5 }),
      'field', 2, 4, 4,
    );
    expect(comment).toContain('never saw the signal');
  });

  it('returns void-fallback line for stars=0', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown(),
      'systems', 0, 4, 4,
    );
    expect(comment).toContain('did not lock');
  });

  it('returns stars-3 fallback when stars=3 but investment < 12', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ investment: 9, machineComplexity: 9 }),
      'systems', 3, 4, 4,
    );
    expect(comment).toContain('Optimal');
  });

  it('returns stars-2 fallback for stars=2', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ investment: 9, machineComplexity: 9 }),
      'systems', 2, 4, 4,
    );
    expect(comment).toContain('Functional');
  });

  it('returns stars-1 fallback for stars=1', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ investment: 9, machineComplexity: 9 }),
      'systems', 1, 4, 4,
    );
    expect(comment).toContain('barely worked');
  });
});

describe('calculateScore starsFromTotal branches', () => {
  it('returns stars=1 when total is exactly 30', () => {
    // v2: succeeded=true, 1 player piece NOT in signal path.
    // completion=25, pathIntegrity=0 (piece untouched), signalDepth=0,
    // investment=0, diversity=0, discipline=5 → total=30 → stars=1.
    const piece = {
      id: 'c1', type: 'conveyor' as const, category: 'physics' as const,
      gridX: 0, gridY: 0, ports: [], rotation: 0, isPrePlaced: false,
    };
    const result = calculateScore({
      executionSteps: [
        { pieceId: 'src', type: 'source', timestamp: 0, success: true },
        { pieceId: 'out', type: 'terminal', timestamp: 0, success: true },
      ],
      placedPieces: [piece],
      optimalPieces: 1,
      discipline: 'field',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(result.total).toBe(30);
    expect(result.stars).toBe(1);
  });

  it('returns stars=0 when total is below 30 (failed, no pieces)', () => {
    // v2: succeeded=false, no player pieces.
    // completion=0, pathIntegrity=15 (no pieces), signalDepth=0,
    // investment=0, diversity=0, discipline=5 → total=20 → stars=0.
    const result = calculateScore({
      executionSteps: [],
      placedPieces: [],
      optimalPieces: 1,
      discipline: 'field',
      engageDurationMs: 100000,
      elapsedSeconds: 100,
      succeeded: false,
    });
    expect(result.total).toBe(20);
    expect(result.stars).toBe(0);
  });

  it('returns stars=2 for a mid-range score (55-79) with purchased pieces', () => {
    // v2: floor solve (45) + 2 purchased pieces active push into 2-star range.
    const trayPieces = [
      { id: 't0', type: 'conveyor' as const, category: 'physics' as const, gridX: 0, gridY: 0, ports: [], rotation: 0, isPrePlaced: false },
      { id: 't1', type: 'gear' as const, category: 'physics' as const, gridX: 1, gridY: 0, ports: [], rotation: 0, isPrePlaced: false },
    ];
    const bought = [
      { id: 'b0', type: 'scanner' as const, category: 'protocol' as const, gridX: 2, gridY: 0, ports: [], rotation: 0, isPrePlaced: false },
      { id: 'b1', type: 'configNode' as const, category: 'protocol' as const, gridX: 3, gridY: 0, ports: [], rotation: 0, isPrePlaced: false },
      { id: 'b2', type: 'transmitter' as const, category: 'protocol' as const, gridX: 4, gridY: 0, ports: [], rotation: 0, isPrePlaced: false },
    ];
    const allPieces = [...trayPieces, ...bought];
    const result = calculateScore({
      executionSteps: [
        { pieceId: 'src', type: 'source', timestamp: 0, success: true },
        ...allPieces.map(p => ({ pieceId: p.id, type: p.type, timestamp: 0, success: true })),
        { pieceId: 'out', type: 'terminal', timestamp: 0, success: true },
      ],
      placedPieces: allPieces,
      optimalPieces: 2,
      trayPieceTypes: ['conveyor', 'gear'],
      depthCeiling: 8,
      discipline: 'systems',
      engageDurationMs: 1000,
      succeeded: true,
    });
    expect(result.total).toBeGreaterThanOrEqual(55);
    expect(result.total).toBeLessThan(80);
    expect(result.stars).toBe(2);
  });
});
