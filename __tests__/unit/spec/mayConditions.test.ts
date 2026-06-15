// SE-TM-031a — MAY condition evaluation. Predicate logic, the level evaluator,
// and the credit-bonus tally. Power-up rewards are stubs and contribute 0 CR.

import {
  meetsMayPredicate,
  evaluateMayConditions,
  totalMayCreditBonus,
  type MayEvalContext,
} from '../../../src/game/spec/mayConditions';
import type { LevelDefinition, MayCondition } from '../../../src/game/types';

const ctx = (over: Partial<MayEvalContext> = {}): MayEvalContext => ({
  placedPieceCount: 5,
  usedProtocolPiece: false,
  elapsedSeconds: 30,
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
  it('underPieceCount: inclusive of the max', () => {
    expect(meetsMayPredicate({ type: 'underPieceCount', max: 5 }, ctx({ placedPieceCount: 5 }))).toBe(true);
    expect(meetsMayPredicate({ type: 'underPieceCount', max: 5 }, ctx({ placedPieceCount: 6 }))).toBe(false);
  });

  it('noProtocolPieces: met only when no protocol piece was placed', () => {
    expect(meetsMayPredicate({ type: 'noProtocolPieces' }, ctx({ usedProtocolPiece: false }))).toBe(true);
    expect(meetsMayPredicate({ type: 'noProtocolPieces' }, ctx({ usedProtocolPiece: true }))).toBe(false);
  });

  it('underSeconds: inclusive of the max', () => {
    expect(meetsMayPredicate({ type: 'underSeconds', max: 30 }, ctx({ elapsedSeconds: 30 }))).toBe(true);
    expect(meetsMayPredicate({ type: 'underSeconds', max: 30 }, ctx({ elapsedSeconds: 31 }))).toBe(false);
  });
});

describe('evaluateMayConditions', () => {
  it('returns [] for a level with no MAY conditions (Axiom case)', () => {
    expect(evaluateMayConditions(makeLevel(undefined), ctx())).toEqual([]);
  });

  it('marks each condition met/unmet against the context', () => {
    const conditions: MayCondition[] = [
      { id: 'lean', description: 'Solve it lean.', predicate: { type: 'underPieceCount', max: 4 }, reward: { type: 'credits', amount: 50 } },
      { id: 'physics', description: 'No protocol.', predicate: { type: 'noProtocolPieces' }, reward: { type: 'credits', amount: 25 } },
    ];
    const results = evaluateMayConditions(makeLevel(conditions), ctx({ placedPieceCount: 6, usedProtocolPiece: false }));
    expect(results.map(r => r.met)).toEqual([false, true]);
  });
});

describe('totalMayCreditBonus', () => {
  it('sums credit rewards only for met conditions', () => {
    const conditions: MayCondition[] = [
      { id: 'a', description: '', predicate: { type: 'underPieceCount', max: 10 }, reward: { type: 'credits', amount: 50 } },
      { id: 'b', description: '', predicate: { type: 'underSeconds', max: 1 }, reward: { type: 'credits', amount: 30 } },
    ];
    const results = evaluateMayConditions(makeLevel(conditions), ctx({ placedPieceCount: 3, elapsedSeconds: 99 }));
    expect(totalMayCreditBonus(results)).toBe(50); // only the first is met
  });

  it('power-up rewards contribute 0 CR (stub reward type)', () => {
    const conditions: MayCondition[] = [
      { id: 'pu', description: '', predicate: { type: 'underPieceCount', max: 10 }, reward: { type: 'powerup', powerupId: 'overclock' } },
    ];
    const results = evaluateMayConditions(makeLevel(conditions), ctx({ placedPieceCount: 3 }));
    expect(results[0].met).toBe(true);
    expect(totalMayCreditBonus(results)).toBe(0);
  });
});
