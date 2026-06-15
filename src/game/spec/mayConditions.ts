// SE-TM-031a — MAY condition evaluation (Unit C Part 3, economy layer).
//
// Pure functions that decide which of a level's optional MAY conditions a
// completed run satisfied, and what bonus that earns. Kept free of store/UI
// imports so it can be unit tested in isolation and called from the success
// handler without side effects.
//
// Guardrails (CLAUDE.md Design Principle 10): MAY bonuses are ADDITIVE and
// optional. The caller only awards them on a 3-star clear (SE-TM-031a); this
// module reports what was met regardless of stars, leaving the star gate to
// the caller so the rule stays in one place.

import type { LevelDefinition, MayCondition, MayPredicate } from '../types';

// The post-run facts a MAY predicate can test. Assembled by the caller from
// the completed machine state — deliberately a flat value object, not the live
// stores, so evaluation is deterministic and testable.
export interface MayEvalContext {
  // Player-placed pieces only (pre-placed/fixed infrastructure excluded).
  placedPieceCount: number;
  // True if the player placed at least one Protocol-category piece.
  usedProtocolPiece: boolean;
  // Seconds from engage to lock.
  elapsedSeconds: number;
}

export function meetsMayPredicate(
  predicate: MayPredicate,
  ctx: MayEvalContext,
): boolean {
  switch (predicate.type) {
    case 'underPieceCount':
      return ctx.placedPieceCount <= predicate.max;
    case 'noProtocolPieces':
      return !ctx.usedProtocolPiece;
    case 'underSeconds':
      return ctx.elapsedSeconds <= predicate.max;
  }
}

export interface MayConditionResult {
  condition: MayCondition;
  met: boolean;
}

// Evaluate every MAY condition the level declares. Returns [] when the level
// has none (the Axiom-sector case).
export function evaluateMayConditions(
  level: LevelDefinition,
  ctx: MayEvalContext,
): MayConditionResult[] {
  const conditions = level.mayConditions ?? [];
  return conditions.map(condition => ({
    condition,
    met: meetsMayPredicate(condition.predicate, ctx),
  }));
}

// Total bonus CREDITS earned from met conditions. Power-up rewards are recorded
// elsewhere (stub — no power-up system yet) and contribute 0 credits here.
export function totalMayCreditBonus(results: MayConditionResult[]): number {
  return results.reduce((sum, r) => {
    if (r.met && r.condition.reward.type === 'credits') {
      return sum + r.condition.reward.amount;
    }
    return sum;
  }, 0);
}
