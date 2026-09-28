/**
 * SWEEP-B51 S4 (AXM-040): Kepler results. The COGS comment counts the whole
 * tray (free plus requisitioned), and the Spec Sheet SHOULD lines are UI
 * chrome, so they never address the Engineer as "you".
 */
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

const TRAY_PIECES = Array.from({ length: 11 }, (_, i) => ({
  id: `inv-${i}`,
  type: 'conveyor',
  source: i < 9 ? 'preAssigned' : 'requisitioned',
}));

jest.mock('../../../src/store/requisitionStore', () => ({
  useRequisitionStore: {
    getState: jest.fn(() => ({
      getUnplacedPieces: jest.fn().mockReturnValue([]),
      inventory: { pieces: TRAY_PIECES, tapes: { in: false, trail: false, out: false } },
    })),
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
import { getCOGSScoreComment, getTutorialCOGSComment } from '../../../src/game/scoring';
import { shouldStatementToCopy } from '../../../src/game/spec/specSheetCopy';
import type { LevelDefinition } from '../../../src/game/types';

function makeLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'K1-1', name: 'Test Level', sector: 'kepler', description: '', cogsLine: '',
    gridWidth: 5, gridHeight: 5, prePlacedPieces: [], availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 }, objectives: [], optimalPieces: 9,
    systemRepaired: undefined,
    ...overrides,
  };
}

function makeParams(level: LevelDefinition): SuccessParams {
  return {
    steps: [], level, pieces: [], discipline: 'field', lockedElapsed: 10, levelSpent: 20,
    setScoreResult: jest.fn(), setCogsScoreComment: jest.fn(), setFirstTimeBonus: jest.fn(),
    setElaborationMult: jest.fn(), setMayBonus: jest.fn(), setFlashColor: jest.fn(),
    setShowSystemRestored: jest.fn(), setShowCompletionScene: jest.fn(), setCompletionText: jest.fn(),
    setShowCompletionCard: jest.fn(), completeLevel: jest.fn().mockReturnValue(false),
    earnCredits: jest.fn(), addLivesCredits: jest.fn(), triggerHints: jest.fn(),
    navigation: { navigate: jest.fn() } as unknown as SuccessParams['navigation'],
    greenColor: '#00FF00',
  };
}

async function succeed(level: LevelDefinition) {
  jest.useFakeTimers();
  try {
    const promise = handleSuccess(makeParams(level));
    await jest.runAllTimersAsync();
    await promise;
  } finally {
    jest.useRealTimers();
  }
}

describe('SWEEP-B51 S4 Kepler results', () => {
  afterEach(() => jest.clearAllMocks());

  test('[S4-1] Kepler success passes the tray inventory length as totalTrayPieces', async () => {
    await succeed(makeLevel({ sector: 'kepler', optimalPieces: 9 }));
    expect(getCOGSScoreComment).toHaveBeenCalledTimes(1);
    const args = (getCOGSScoreComment as jest.Mock).mock.calls[0];
    expect(args[4]).toBe(11);
  });

  test('[S4-1] Axiom success still uses the tutorial comment', async () => {
    await succeed(makeLevel({ sector: 'axiom', id: 'A1-1' }));
    expect(getTutorialCOGSComment).toHaveBeenCalledTimes(1);
    expect(getCOGSScoreComment).not.toHaveBeenCalled();
  });

  test('[S4-2] SHOULD copy is exact and contains no second-person word', () => {
    const copy = (category: 'discipline' | 'signalDepth' | 'pathIntegrity') =>
      shouldStatementToCopy({ type: 'scoringCategory', category });
    expect(copy('discipline')).toBe("The solution SHOULD reflect the Engineer's trained discipline.");
    expect(copy('signalDepth')).toBe('The machine SHOULD make full use of the requisitioned pieces.');
    expect(copy('pathIntegrity')).toBe('Every placed piece SHOULD participate in the signal chain.');
    for (const category of ['discipline', 'signalDepth', 'pathIntegrity'] as const) {
      expect(copy(category)).not.toMatch(/\b(you|your|yours|yourself)\b/i);
    }
  });
});
