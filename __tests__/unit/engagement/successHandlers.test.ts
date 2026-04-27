jest.mock('../../../src/game/scoring', () => ({
  calculateScore: jest.fn().mockReturnValue({
    total: 75,
    stars: 2,
    breakdown: {
      purchasedTouchedCount: 0,
      completionBonus: 25,
      machineComplexity: 20,
      protocolPrecision: 10,
      pathIntegrity: 10,
      speedBonus: 10,
      elaboration: 0,
      efficiency: 0,
      chainIntegrity: 0,
      disciplineBonus: 0,
    },
  }),
  getCOGSScoreComment: jest.fn().mockReturnValue('Acceptable.'),
  getTutorialCOGSComment: jest.fn().mockReturnValue('Tutorial comment.'),
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
  getCOGSScoreComment,
  getTutorialCOGSComment,
} from '../../../src/game/scoring';
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

function makeParams(overrides: Partial<SuccessParams> = {}): SuccessParams {
  return {
    steps: [],
    level: makeLevel(),
    pieces: [],
    discipline: 'field',
    engageDurationMs: 5000,
    lockedElapsed: 10,
    levelSpent: 20,
    setScoreResult: jest.fn(),
    setCogsScoreComment: jest.fn(),
    setFirstTimeBonus: jest.fn(),
    setElaborationMult: jest.fn(),
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
        engageDurationMs: params.engageDurationMs,
        elapsedSeconds: params.lockedElapsed,
      }),
    );
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
    // One call for first-time bonus
    expect(earnCredits).toHaveBeenCalledWith(25);
    expect(addLivesCredits).toHaveBeenCalledWith(25);
  });

  it('stars=3 (mock override): earnCredits called with a positive number for star bonus', async () => {
    (calculateScore as jest.Mock).mockReturnValueOnce({
      total: 90,
      stars: 3,
      breakdown: {
        purchasedTouchedCount: 0,
        completionBonus: 25,
        machineComplexity: 30,
        protocolPrecision: 20,
        pathIntegrity: 15,
        speedBonus: 10,
        elaboration: 0,
        efficiency: 0,
        chainIntegrity: 0,
        disciplineBonus: 0,
      },
    });
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const params = makeParams({
      completeLevel,
      earnCredits,
      levelSpent: 20,
    });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(earnCredits).toHaveBeenCalledWith(expect.any(Number));
    const amounts = (earnCredits as jest.Mock).mock.calls.map((c: [number]) => c[0]) as number[];
    expect(amounts.some((a: number) => a > 0)).toBe(true);
  });

  it('stars=2 (default mock): earnCredits called with a positive number for star bonus', async () => {
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const params = makeParams({
      completeLevel,
      earnCredits,
      levelSpent: 40,
    });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    const amounts = (earnCredits as jest.Mock).mock.calls.map((c: [number]) => c[0]) as number[];
    expect(amounts.some((a: number) => a > 0)).toBe(true);
  });

  it('stars=0: earnCredits not called for star-based bonus (only first-time if applicable)', async () => {
    (calculateScore as jest.Mock).mockReturnValueOnce({
      total: 10,
      stars: 0,
      breakdown: {
        purchasedTouchedCount: 0,
        completionBonus: 0,
        machineComplexity: 0,
        protocolPrecision: 0,
        pathIntegrity: 0,
        speedBonus: 10,
        elaboration: 0,
        efficiency: 0,
        chainIntegrity: 0,
        disciplineBonus: 0,
      },
    });
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const params = makeParams({ completeLevel, earnCredits });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(earnCredits).not.toHaveBeenCalled();
  });

  it('stars=1: earnCredits not called for star-based bonus', async () => {
    (calculateScore as jest.Mock).mockReturnValueOnce({
      total: 40,
      stars: 1,
      breakdown: {
        purchasedTouchedCount: 0,
        completionBonus: 25,
        machineComplexity: 0,
        protocolPrecision: 0,
        pathIntegrity: 0,
        speedBonus: 10,
        elaboration: 0,
        efficiency: 0,
        chainIntegrity: 0,
        disciplineBonus: 0,
      },
    });
    const completeLevel = jest.fn().mockReturnValue(false);
    const earnCredits = jest.fn();
    const params = makeParams({ completeLevel, earnCredits });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(earnCredits).not.toHaveBeenCalled();
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

  it('elaboration multiplier is capped at 1.5 when many purchased pieces touched', async () => {
    (calculateScore as jest.Mock).mockReturnValueOnce({
      total: 90,
      stars: 3,
      breakdown: {
        purchasedTouchedCount: 10,
        completionBonus: 25,
        machineComplexity: 30,
        protocolPrecision: 20,
        pathIntegrity: 15,
        speedBonus: 10,
        elaboration: 0,
        efficiency: 0,
        chainIntegrity: 0,
        disciplineBonus: 0,
      },
    });
    const setElaborationMult = jest.fn();
    const params = makeParams({ setElaborationMult });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    const mult = (setElaborationMult as jest.Mock).mock.calls[0][0] as number;
    expect(mult).toBeLessThanOrEqual(1.5);
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
});
