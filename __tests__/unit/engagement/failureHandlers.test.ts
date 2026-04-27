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
  return {
    completionBonus: 25,
    machineComplexity: 20,
    protocolPrecision: 8,
    pathIntegrity: 10,
    speedBonus: 7,
    elaboration: 0,
    purchasedTouchedCount: 0,
    efficiency: 25,
    chainIntegrity: 15,
    disciplineBonus: 20,
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
  it('returns full-machine line when stars=3 and machineComplexity >= 25', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ machineComplexity: 25, elaboration: 0, completionBonus: 25, protocolPrecision: 10, pathIntegrity: 10, speedBonus: 8 }),
      'systems', 3, 4, 4,
    );
    expect(comment).toContain('Full machine');
  });

  it('returns protocol-avoided line when protocolPrecision is 0 and machineComplexity >= 15', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ protocolPrecision: 0, machineComplexity: 20, pathIntegrity: 10, speedBonus: 7 }),
      'drive', 2, 4, 4,
    );
    expect(comment).toContain('Protocol catalogue');
  });

  it('returns path-integrity line when pathIntegrity < 8 and machineComplexity >= 15', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ pathIntegrity: 5, protocolPrecision: 8, machineComplexity: 20, speedBonus: 7 }),
      'field', 2, 4, 4,
    );
    expect(comment).toContain('never saw the signal');
  });

  it('returns slow-execution line when speedBonus is 0', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ speedBonus: 0, protocolPrecision: 8, machineComplexity: 20, pathIntegrity: 10 }),
      'systems', 2, 4, 4,
    );
    expect(comment).toContain('considerable length');
  });

  it('returns stars-3 fallback when stars=3 but machineComplexity < 25', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ machineComplexity: 20, elaboration: 0, completionBonus: 25, protocolPrecision: 10, pathIntegrity: 10, speedBonus: 7 }),
      'systems', 3, 4, 4,
    );
    expect(comment).toContain('Optimal');
  });

  it('returns stars-2 fallback for stars=2', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ machineComplexity: 20, elaboration: 0, completionBonus: 25, protocolPrecision: 10, pathIntegrity: 10, speedBonus: 7 }),
      'systems', 2, 4, 4,
    );
    expect(comment).toContain('Functional');
  });

  it('returns stars-1 fallback for stars=1', () => {
    const comment = getCOGSScoreComment(
      makeBreakdown({ machineComplexity: 20, elaboration: 0, completionBonus: 25, protocolPrecision: 10, pathIntegrity: 10, speedBonus: 7 }),
      'systems', 1, 4, 4,
    );
    expect(comment).toContain('barely worked');
  });
});

describe('calculateScore starsFromTotal branches', () => {
  it('returns stars=1 when total is 30 (completionBonus=0, machineComplexity=30 for empty tray)', () => {
    // totalTrayPieces=0 yields machineComplexity=30 (full marks for no tray).
    // succeeded=false → completionBonus=0. elapsedSeconds=100 → speedBonus=0.
    // total = 30 + 0 + 0 + 0 + 0 = 30 → stars=1.
    const result = calculateScore({
      executionSteps: [],
      placedPieces: [],
      optimalPieces: 0,
      totalTrayPieces: 0,
      discipline: 'field',
      engageDurationMs: 100000,
      elapsedSeconds: 100,
      succeeded: false,
    });
    expect(result.stars).toBe(1);
  });

  it('returns stars=0 when total is below 30', () => {
    // With one tray piece, machineComplexity = 0 (no piece placed/touched).
    // succeeded=false, speedBonus=0, other categories=0.
    const result = calculateScore({
      executionSteps: [],
      placedPieces: [],
      optimalPieces: 1,
      totalTrayPieces: 1,
      discipline: 'field',
      engageDurationMs: 100000,
      elapsedSeconds: 100,
      succeeded: false,
    });
    expect(result.stars).toBe(0);
  });

  it('returns stars=2 for a mid-range score (55-79)', () => {
    const result = calculateScore({
      executionSteps: [
        { pieceId: 'src', type: 'source', timestamp: 0, success: true },
        { pieceId: 'out', type: 'terminal', timestamp: 0, success: true },
      ],
      placedPieces: [],
      optimalPieces: 0,
      totalTrayPieces: 0,
      discipline: 'systems',
      engageDurationMs: 15000,
      elapsedSeconds: 15,
      succeeded: true,
    });
    // completionBonus=25, machineComplexity=30 (0/0 tray), speedBonus=7 → total 62
    expect(result.stars).toBe(2);
  });
});
