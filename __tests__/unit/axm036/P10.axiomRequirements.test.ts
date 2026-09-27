// AXM-036 P10 (F10) — A1 results derive only the requirements Axiom levels
// actually offer, and the tutorial COGS line is judged against them.
//
// Axiom has no requisition: purchasedActiveCount is always 0, which zeroes
// Signal Depth and Diversity (scoring.ts), and Discipline needs pieces a
// fixed A1 tray may not offer. deriveShouldStatements previously returned
// pathIntegrity/signalDepth/discipline for every level, so an Axiom results
// checklist always showed two SHOULD items the level could never satisfy.
// This package scopes the SHOULD derivation to pathIntegrity alone on the
// Axiom sector, and re-grades the tutorial COGS line against only the
// categories that still apply there (completion + pathIntegrity), instead
// of result.total, which is dragged down by categories that were never
// obtainable in the first place.

jest.mock('../../../src/game/scoring', () => {
  const actual = jest.requireActual('../../../src/game/scoring');
  return {
    ...actual,
    // Full completion + full path integrity, but every other category at
    // (or near) zero — result.total is well under 80 even though the two
    // categories an Axiom level can actually earn are maxed. If the
    // tutorial line were still chosen from result.total, this would select
    // a low-score line for every discipline.
    calculateScore: jest.fn().mockReturnValue({
      total: 45,
      stars: 1,
      breakdown: {
        completion: 25, pathIntegrity: 15, signalDepth: 0, investment: 0,
        diversity: 0, discipline: 5, forfeitedPurchasedCount: 0,
      },
    }),
    // Wrapped (not replaced) so its real text still comes back, but the
    // call is inspectable — this proves what value it was judged against.
    getTutorialCOGSComment: jest.fn(actual.getTutorialCOGSComment),
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

import {
  levelA1_1,
  levelA1_2,
  levelA1_3,
  levelA1_4,
  levelA1_5,
  levelA1_6,
  levelA1_7,
  levelA1_8,
  levelK1_1,
} from '../../../src/game/levels';
import { deriveShouldStatements } from '../../../src/game/spec/specSheet';
import { buildSpecChecklist } from '../../../src/game/spec/specChecklist';
import { axiomApplicableScore, getTutorialCOGSComment } from '../../../src/game/scoring';
import type { ScoreBreakdown } from '../../../src/game/scoring';
import type { LevelDefinition } from '../../../src/game/types';
import { handleSuccess } from '../../../src/game/engagement/successHandlers';
import type { SuccessParams } from '../../../src/game/engagement/successHandlers';

function breakdown(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    completion: 0, pathIntegrity: 0, signalDepth: 0, investment: 0, diversity: 0, discipline: 0,
    forfeitedPurchasedCount: 0,
    ...overrides,
  };
}

function makeParams(overrides: Partial<SuccessParams> = {}): SuccessParams {
  return {
    steps: [],
    level: levelA1_1,
    pieces: [],
    discipline: 'field',
    lockedElapsed: 10,
    levelSpent: 0,
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

jest.useFakeTimers();

describe('P10-1: deriveShouldStatements scopes to Axiom', () => {
  it('[P10-1] every A1 level derives only pathIntegrity', () => {
    const a1Levels: LevelDefinition[] = [
      levelA1_1, levelA1_2, levelA1_3, levelA1_4, levelA1_5, levelA1_6, levelA1_7, levelA1_8,
    ];
    for (const level of a1Levels) {
      expect(deriveShouldStatements(level)).toEqual([
        { type: 'scoringCategory', category: 'pathIntegrity' },
      ]);
    }
  });

  it('[P10-1] K1-1 derives three', () => {
    expect(deriveShouldStatements(levelK1_1)).toEqual([
      { type: 'scoringCategory', category: 'pathIntegrity' },
      { type: 'scoringCategory', category: 'signalDepth' },
      { type: 'scoringCategory', category: 'discipline' },
    ]);
  });

  it('[P10-1] A1-1 checklist has no signalDepth or discipline item', () => {
    const items = buildSpecChecklist(
      levelA1_1,
      breakdown({ pathIntegrity: 15, signalDepth: 0, discipline: 0 }),
    );
    const should = items.filter(i => i.section === 'SHOULD');
    expect(should).toHaveLength(1);
    expect(should[0].text).toBe('Every placed piece SHOULD participate in the signal chain.');
  });
});

describe('P10-3: the Axiom tutorial line is judged on applicable categories only', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('[P10-3] axiomApplicableScore of full completion and path is 100', () => {
    expect(axiomApplicableScore(breakdown({ completion: 25, pathIntegrity: 15 }))).toBe(100);
  });

  it('[P10-3] A1-1 full run selects the >= 80 tutorial line for every discipline', async () => {
    const expectedByDiscipline = {
      systems: 'Optimal routing. Protocol instinct is correct.',
      drive: 'Clean chain. Every piece fired. Well done.',
      field: 'Efficient and adaptable. I have no notes.',
    } as const;

    for (const discipline of Object.keys(expectedByDiscipline) as (keyof typeof expectedByDiscipline)[]) {
      const params = makeParams({ level: levelA1_1, discipline });
      const promise = handleSuccess(params);
      await jest.runAllTimersAsync();
      await promise;
      // The mocked calculateScore returns total: 45 (well under 80) but
      // completion: 25, pathIntegrity: 15 (a perfect 100 on axiomApplicableScore).
      // getTutorialCOGSComment must have been called with the applicable
      // score, not result.total, and the resulting line reflects it.
      expect(params.setCogsScoreComment).toHaveBeenCalledWith(expectedByDiscipline[discipline]);
    }
  });

  it('[P10-3] getTutorialCOGSComment receives axiomApplicableScore(breakdown), not result.total', async () => {
    const params = makeParams({ level: levelA1_1, discipline: 'field' });
    const promise = handleSuccess(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(getTutorialCOGSComment).toHaveBeenCalledWith(100, 'field');
  });
});
