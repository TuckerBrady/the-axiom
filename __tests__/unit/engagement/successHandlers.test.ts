// REQ-62/34/37 (scoring-algorithm-v2.md, AXM-010): calculateScore and the
// two COGS-comment functions are mocked (their own behavior is scoring.ts's
// job, covered in scoring.test.ts); calculatePayout/defaultBaseReward/
// TUTORIAL_FLAT_PAYOUT are left REAL via requireActual — they're pure,
// dependency-free functions, and this file's job is verifying
// successHandlers.ts wires the new credit-payout formula (REQ-34/37)
// correctly, which requires exercising the real formula, not a mock of it.
jest.mock('../../../src/game/scoring', () => {
  const actual = jest.requireActual('../../../src/game/scoring');
  return {
    ...actual,
    calculateScore: jest.fn().mockReturnValue({
      total: 75,
      stars: 2,
      breakdown: {
        completion: 25, pathIntegrity: 15, signalDepth: 10, investment: 9,
        diversity: 8, discipline: 8, forfeitedPurchasedCount: 0,
      },
    }),
    getCOGSScoreComment: jest.fn().mockReturnValue('Acceptable.'),
    getTutorialCOGSComment: jest.fn().mockReturnValue('Tutorial comment.'),
  };
});

jest.mock('../../../src/store/requisitionStore', () => ({
  useRequisitionStore: {
    getState: jest.fn().mockReturnValue({
      getUnplacedPieces: jest.fn().mockReturnValue([]),
    }),
  },
}));

jest.mock('../../../src/store/progressionStore', () => ({
  useProgressionStore: {
    getState: jest.fn().mockReturnValue({
      getSectorCompletedCount: jest.fn().mockReturnValue(0),
      setActiveSector: jest.fn(),
    }),
  },
}));

import { handleSuccess } from '../../../src/game/engagement/successHandlers';
import type { SuccessParams } from '../../../src/game/engagement/successHandlers';
import {
  calculateScore,
  calculatePayout,
  defaultBaseReward,
  getCOGSScoreComment,
  getTutorialCOGSComment,
  TUTORIAL_FLAT_PAYOUT,
} from '../../../src/game/scoring';
import type { ScoreBreakdown } from '../../../src/game/scoring';
import type { LevelDefinition } from '../../../src/game/types';

jest.useFakeTimers();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'K1-1',
    name: 'Test Level',
    sector: 'kepler',
    description: '',
    cogsLine: '',
    gridWidth: 5,
    gridHeight: 5,
    prePlacedPieces: [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [],
    optimalPieces: 3,
    systemRepaired: undefined,
    ...overrides,
  };
}

function makeBreakdown(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    completion: 25, pathIntegrity: 15, signalDepth: 10, investment: 9,
    diversity: 8, discipline: 8, forfeitedPurchasedCount: 0,
    ...overrides,
  };
}

function makeParams(overrides: Partial<SuccessParams> = {}): SuccessParams {
  return {
    steps: [],
    level: makeLevel(),
    pieces: [],
    discipline: 'field',
    lockedElapsed: 10,
    levelSpent: 20,
    setScoreResult: jest.fn(),
    setCogsScoreComment: jest.fn(),
    setFirstTimeBonus: jest.fn(),
    setElaborationMult: jest.fn(),
    setMayBonus: jest.fn(),
    setFlashColor: jest.fn(),
    setShowSystemRestored: jest.fn(),
    setShowCompletionScene: jest.fn(),
    setCompletionText: jest.fn(),
    setShowCompletionCard: jest.fn(),
    completeLevel: jest.fn().mockReturnValue(false),
    earnCredits: jest.fn(),
    addLivesCredits: jest.fn(),
    triggerHints: jest.fn(),
    navigation: { navigate: jest.fn() } as unknown as SuccessParams['navigation'],
    greenColor: '#00FF00',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('handleSuccess', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('calls calculateScore with expected shape', async () => {
    const params = makeParams();
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(calculateScore).toHaveBeenCalledWith(
      expect.objectContaining({
        executionSteps: params.steps,
        placedPieces: params.pieces,
        optimalPieces: params.level.optimalPieces,
        discipline: params.discipline,
      }),
    );
    // REQ-60: engageDurationMs/elapsedSeconds are gone — Speed Bonus no
    // longer exists, so calculateScore no longer takes timing params.
    const call = (calculateScore as jest.Mock).mock.calls[0][0];
    expect(call).not.toHaveProperty('engageDurationMs');
    expect(call).not.toHaveProperty('elapsedSeconds');
  });

  it('non-tutorial: setScoreResult called with calculateScore stars (not forced 3)', async () => {
    const params = makeParams({ level: makeLevel({ sector: 'kepler' }) });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(params.setScoreResult).toHaveBeenCalledTimes(1);
    const arg = (params.setScoreResult as jest.Mock).mock.calls[0][0] as { stars: number };
    expect(arg.stars).toBe(2);
  });

  it('tutorial level (sector=axiom): setScoreResult called with stars: 3 always', async () => {
    const params = makeParams({ level: makeLevel({ sector: 'axiom', id: 'A1-1' }) });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(params.setScoreResult).toHaveBeenCalledTimes(1);
    const arg = (params.setScoreResult as jest.Mock).mock.calls[0][0] as { stars: number };
    expect(arg.stars).toBe(3);
  });

  it('tutorial level uses getTutorialCOGSComment instead of getCOGSScoreComment', async () => {
    const params = makeParams({ level: makeLevel({ sector: 'axiom', id: 'A1-1' }) });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(getTutorialCOGSComment).toHaveBeenCalled();
    expect(getCOGSScoreComment).not.toHaveBeenCalled();
  });

  it('non-tutorial level uses getCOGSScoreComment instead of getTutorialCOGSComment', async () => {
    const params = makeParams({ level: makeLevel({ sector: 'kepler' }) });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(getCOGSScoreComment).toHaveBeenCalled();
    expect(getTutorialCOGSComment).not.toHaveBeenCalled();
  });

  it('calls completeLevel(levelId, stars) and setFirstTimeBonus', async () => {
    const completeLevel = jest.fn().mockReturnValue(false);
    const setFirstTimeBonus = jest.fn();
    const params = makeParams({
      level: makeLevel({ id: 'K1-2' }),
      completeLevel,
      setFirstTimeBonus,
    });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(completeLevel).toHaveBeenCalledWith('K1-2', expect.any(Number));
    expect(setFirstTimeBonus).toHaveBeenCalledWith(false);
  });

  it('first completion: calls earnCredits(25) and addLivesCredits(25)', async () => {
    const completeLevel = jest.fn().mockReturnValue(true);
    const earnCredits = jest.fn();
    const addLivesCredits = jest.fn();
    const params = makeParams({ completeLevel, earnCredits, addLivesCredits });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    // The first-time bonus (25 CR + 25 lives) is separate from the
    // REQ-34 score-based payout — both fire on a first completion.
    expect(earnCredits).toHaveBeenCalledWith(25);
    expect(addLivesCredits).toHaveBeenCalledWith(25);
  });

  // ─── REQ-34/37: credit payout is now a function of score against
  // level.baseReward (or defaultBaseReward when omitted), not a fraction
  // of levelSpent gated on hitting exactly 2 or 3 stars.

  it('non-tutorial: earnCredits called with calculatePayout(total, baseReward) exactly', async () => {
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const level = makeLevel({ sector: 'kepler', optimalPieces: 3 });
    const params = makeParams({ level, completeLevel, earnCredits });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    // Default mock: total=75. level has no explicit baseReward -> defaultBaseReward.
    const expectedPayout = calculatePayout(75, defaultBaseReward(level));
    expect(earnCredits).toHaveBeenCalledWith(expectedPayout);
  });

  it('an explicit level.baseReward is used instead of defaultBaseReward', async () => {
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const level = makeLevel({ sector: 'kepler', baseReward: 200 });
    const params = makeParams({ level, completeLevel, earnCredits });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(earnCredits).toHaveBeenCalledWith(calculatePayout(75, 200));
    expect(earnCredits).not.toHaveBeenCalledWith(calculatePayout(75, defaultBaseReward(level)));
  });

  it('a low score (stars=0) still pays out something — REQ-34 has no zero-below-2-stars gate', async () => {
    (calculateScore as jest.Mock).mockReturnValueOnce({
      total: 10,
      stars: 0,
      breakdown: makeBreakdown({ completion: 0, pathIntegrity: 10 }),
    });
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const level = makeLevel();
    const params = makeParams({ level, completeLevel, earnCredits });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(earnCredits).toHaveBeenCalledWith(calculatePayout(10, defaultBaseReward(level)));
    expect((earnCredits as jest.Mock).mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('a perfect score (total=100) pays the full baseReward', async () => {
    (calculateScore as jest.Mock).mockReturnValueOnce({
      total: 100,
      stars: 3,
      breakdown: makeBreakdown(),
    });
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const level = makeLevel({ baseReward: 100 });
    const params = makeParams({ level, completeLevel, earnCredits });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(earnCredits).toHaveBeenCalledWith(100);
  });

  it('tutorial (axiom): earnCredits called with the flat TUTORIAL_FLAT_PAYOUT, ignoring score', async () => {
    (calculateScore as jest.Mock).mockReturnValueOnce({
      total: 15, // a low raw score — tutorial payout must not scale with it
      stars: 0,
      breakdown: makeBreakdown({ completion: 0 }),
    });
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const params = makeParams({
      level: makeLevel({ sector: 'axiom', id: 'A1-1' }),
      completeLevel,
      earnCredits,
    });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(earnCredits).toHaveBeenCalledWith(TUTORIAL_FLAT_PAYOUT);
  });

  it('elaborationMult reflects total/100 on a non-tutorial level (no >1 "bonus multiplier" concept remains)', async () => {
    const setElaborationMult = jest.fn();
    const params = makeParams({ setElaborationMult });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    // Default mock total=75.
    expect(setElaborationMult).toHaveBeenCalledWith(0.75);
  });

  it('elaborationMult is 1 on a tutorial level', async () => {
    const setElaborationMult = jest.fn();
    const params = makeParams({
      level: makeLevel({ sector: 'axiom', id: 'A1-1' }),
      setElaborationMult,
    });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(setElaborationMult).toHaveBeenCalledWith(1);
  });

  it('calls triggerHints("onSuccess")', async () => {
    const params = makeParams();
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(params.triggerHints).toHaveBeenCalledWith('onSuccess');
  });

  it('calls setFlashColor(greenColor) then setFlashColor(null)', async () => {
    const setFlashColor = jest.fn();
    const params = makeParams({ setFlashColor, greenColor: '#00FF00' });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    const calls = (setFlashColor as jest.Mock).mock.calls.map((c: [string | null]) => c[0]);
    expect(calls[0]).toBe('#00FF00');
    expect(calls[1]).toBeNull();
  });

  it('level.systemRepaired set: calls setShowSystemRestored with value then null', async () => {
    const setShowSystemRestored = jest.fn();
    const params = makeParams({
      level: makeLevel({ systemRepaired: 'Navigation Array restored.' }),
      setShowSystemRestored,
    });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    const calls = (setShowSystemRestored as jest.Mock).mock.calls.map((c: [string | null]) => c[0]);
    expect(calls[0]).toBe('Navigation Array restored.');
    expect(calls[1]).toBeNull();
  });

  it('level.systemRepaired null: setShowSystemRestored NOT called', async () => {
    const setShowSystemRestored = jest.fn();
    const params = makeParams({
      level: makeLevel({ systemRepaired: undefined }),
      setShowSystemRestored,
    });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(setShowSystemRestored).not.toHaveBeenCalled();
  });

  it('returns false on a normal non-A1-8 level', async () => {
    const params = makeParams({ level: makeLevel({ id: 'K1-3', sector: 'kepler' }) });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe(false);
  });

  it('calls setShowCompletionCard(true) when returning false', async () => {
    const setShowCompletionCard = jest.fn();
    const params = makeParams({ setShowCompletionCard });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(setShowCompletionCard).toHaveBeenCalledWith(true);
  });

  it('A1-8 first completion with sector count >= 8: shows completion scene, navigates to Tabs, returns true', async () => {
    const { useProgressionStore } = jest.requireMock('../../../src/store/progressionStore') as {
      useProgressionStore: { getState: jest.Mock };
    };
    const setActiveSector = jest.fn();
    useProgressionStore.getState.mockReturnValue({
      getSectorCompletedCount: jest.fn().mockReturnValue(8),
      setActiveSector,
    });

    const completeLevel = jest.fn().mockReturnValue(true);
    const setShowCompletionScene = jest.fn();
    const setCompletionText = jest.fn();
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as SuccessParams['navigation'];

    const params = makeParams({
      level: makeLevel({ id: 'A1-8', sector: 'axiom' }),
      completeLevel,
      setShowCompletionScene,
      setCompletionText,
      navigation,
    });

    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(true);
    expect(setShowCompletionScene).toHaveBeenCalledWith(true);
    expect(setCompletionText).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('Tabs');
    expect(setActiveSector).toHaveBeenCalledWith('2');
  });

  it('A1-8 first completion with sector count < 8: does NOT show completion scene, returns false', async () => {
    const { useProgressionStore } = jest.requireMock('../../../src/store/progressionStore') as {
      useProgressionStore: { getState: jest.Mock };
    };
    useProgressionStore.getState.mockReturnValue({
      getSectorCompletedCount: jest.fn().mockReturnValue(7),
      setActiveSector: jest.fn(),
    });

    const completeLevel = jest.fn().mockReturnValue(true);
    const setShowCompletionScene = jest.fn();
    const params = makeParams({
      level: makeLevel({ id: 'A1-8', sector: 'axiom' }),
      completeLevel,
      setShowCompletionScene,
    });

    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
    expect(setShowCompletionScene).not.toHaveBeenCalledWith(true);
  });

  it('A1-8 not first completion: does NOT show completion scene, returns false', async () => {
    const completeLevel = jest.fn().mockReturnValue(false);
    const setShowCompletionScene = jest.fn();
    const params = makeParams({
      level: makeLevel({ id: 'A1-8', sector: 'axiom' }),
      completeLevel,
      setShowCompletionScene,
    });

    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe(false);
    expect(setShowCompletionScene).not.toHaveBeenCalledWith(true);
  });

  it('discipline null: falls back to "field" discipline for calculateScore', async () => {
    const params = makeParams({ discipline: null });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(calculateScore).toHaveBeenCalledWith(
      expect.objectContaining({ discipline: 'field' }),
    );
  });

  it('level.availablePieces undefined: calculateScore called with empty trayPieceTypes', async () => {
    const level = makeLevel({ availablePieces: undefined as unknown as [] });
    const params = makeParams({ level });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(calculateScore).toHaveBeenCalledWith(
      expect.objectContaining({ trayPieceTypes: [] }),
    );
  });

  it('pieces array with isPrePlaced items: filter lambda p => !p.isPrePlaced is invoked', async () => {
    const pieces = [
      { id: 'pre-1', type: 'source' as const, category: 'physics' as const, gridX: 0, gridY: 0, ports: [], rotation: 0, isPrePlaced: true },
      { id: 'player-1', type: 'conveyor' as const, category: 'physics' as const, gridX: 1, gridY: 1, ports: [], rotation: 0, isPrePlaced: false },
    ];
    const params = makeParams({ pieces });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    // calculateScore should have been called with the full pieces array
    expect(calculateScore).toHaveBeenCalledWith(
      expect.objectContaining({ placedPieces: pieces }),
    );
    // setCogsScoreComment should have been called (getCOGSScoreComment path)
    expect(params.setCogsScoreComment).toHaveBeenCalled();
  });

  it('non-tutorial: forfeitedPurchasedCount from requisitionStore passed to calculateScore', async () => {
    const { useRequisitionStore } = jest.requireMock('../../../src/store/requisitionStore') as {
      useRequisitionStore: { getState: jest.Mock };
    };
    useRequisitionStore.getState.mockReturnValueOnce({
      getUnplacedPieces: jest.fn().mockReturnValue([
        { id: 'r1', type: 'conveyor', source: 'requisitioned', placed: false },
        { id: 'r2', type: 'gear', source: 'requisitioned', placed: false },
        { id: 'p1', type: 'conveyor', source: 'preAssigned', placed: false },
      ]),
    });
    const params = makeParams({ level: makeLevel({ sector: 'kepler' }) });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(calculateScore).toHaveBeenCalledWith(
      expect.objectContaining({ forfeitedPurchasedCount: 2 }),
    );
  });

  it('tutorial (axiom): forfeitedPurchasedCount is always 0 regardless of inventory', async () => {
    const { useRequisitionStore } = jest.requireMock('../../../src/store/requisitionStore') as {
      useRequisitionStore: { getState: jest.Mock };
    };
    useRequisitionStore.getState.mockReturnValueOnce({
      getUnplacedPieces: jest.fn().mockReturnValue([
        { id: 'r1', type: 'conveyor', source: 'requisitioned', placed: false },
      ]),
    });
    const params = makeParams({ level: makeLevel({ sector: 'axiom', id: 'A1-1' }) });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(calculateScore).toHaveBeenCalledWith(
      expect.objectContaining({ forfeitedPurchasedCount: 0 }),
    );
  });
});
