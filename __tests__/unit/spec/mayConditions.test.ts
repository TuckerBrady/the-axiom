// SE-TM-031a — MAY condition evaluation. Predicate logic, the level evaluator,
// and the credit-bonus tally. Power-up rewards are stubs and contribute 0 CR.

import {
  meetsMayPredicate,
  evaluateMayConditions,
  totalMayCreditBonus,
  type MayEvalContext,
} from '../../../src/game/spec/mayConditions';
import type { LevelDefinition, MayCondition, MayPredicate } from '../../../src/game/types';

const ctx = (over: Partial<MayEvalContext> = {}): MayEvalContext => ({
  usedProtocolPiece: false,
  ...over,
});

function makeLevel(mayConditions?: MayCondition[]): LevelDefinition {
  return {
    id: 'K1-1',
    name: 'Test',
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
    mayConditions,
  };
}

describe('meetsMayPredicate', () => {
  it('noProtocolPieces: met only when no protocol piece was placed', () => {
    expect(meetsMayPredicate({ type: 'noProtocolPieces' }, ctx({ usedProtocolPiece: false }))).toBe(true);
    expect(meetsMayPredicate({ type: 'noProtocolPieces' }, ctx({ usedProtocolPiece: true }))).toBe(false);
  });

  // AXM-022 (Tucker, 2026-09-23): the minimum-piece and beat-the-clock goals
  // are gone. Both rewarded the smallest, fastest build, the opposite of the
  // game's soul. The compiler is the test: neither type is a MayPredicate.
  it('no longer accepts underPieceCount or underSeconds', () => {
    // @ts-expect-error underPieceCount was removed from MayPredicate
    const lean: MayPredicate = { type: 'underPieceCount', max: 5 };
    // @ts-expect-error underSeconds was removed from MayPredicate
    const fast: MayPredicate = { type: 'underSeconds', max: 30 };
    expect([lean, fast]).toHaveLength(2);
  });
});

describe('evaluateMayConditions', () => {
  it('returns [] for a level with no MAY conditions (Axiom case)', () => {
    expect(evaluateMayConditions(makeLevel(undefined), ctx())).toEqual([]);
  });

  it('marks each condition met/unmet against the context', () => {
    const conditions: MayCondition[] = [
      { id: 'physics', description: 'No protocol.', predicate: { type: 'noProtocolPieces' }, reward: { type: 'credits', amount: 25 } },
    ];
    expect(evaluateMayConditions(makeLevel(conditions), ctx({ usedProtocolPiece: false })).map(r => r.met)).toEqual([true]);
    expect(evaluateMayConditions(makeLevel(conditions), ctx({ usedProtocolPiece: true })).map(r => r.met)).toEqual([false]);
  });
});

describe('totalMayCreditBonus', () => {
  it('sums credit rewards only for met conditions', () => {
    const conditions: MayCondition[] = [
      { id: 'a', description: '', predicate: { type: 'noProtocolPieces' }, reward: { type: 'credits', amount: 50 } },
      { id: 'b', description: '', predicate: { type: 'noProtocolPieces' }, reward: { type: 'credits', amount: 30 } },
    ];
    const met = evaluateMayConditions(makeLevel(conditions), ctx({ usedProtocolPiece: false }));
    expect(totalMayCreditBonus(met)).toBe(80);
    const unmet = evaluateMayConditions(makeLevel(conditions), ctx({ usedProtocolPiece: true }));
    expect(totalMayCreditBonus(unmet)).toBe(0);
  });

  it('power-up rewards contribute 0 CR (stub reward type)', () => {
    const conditions: MayCondition[] = [
      { id: 'pu', description: '', predicate: { type: 'noProtocolPieces' }, reward: { type: 'powerup', powerupId: 'overclock' } },
    ];
    const results = evaluateMayConditions(makeLevel(conditions), ctx());
    expect(results[0].met).toBe(true);
    expect(totalMayCreditBonus(results)).toBe(0);
  });
});
