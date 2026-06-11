// Objective evaluation beyond plain reach_output (GAME-02).
//
// The completion gate in gameStore (reachedOutputEveryPulse / tape match)
// covers reach_output. Some levels add structural objectives that the
// executed signal path must also satisfy — A1-4 requires two Gear-driven
// direction changes ("we begin teaching the soul of the game"). These
// helpers evaluate those extra objectives against the executed path.

import type { ExecutionStep, LevelObjective } from './types';

/**
 * Count Gear-driven direction changes in an executed signal path.
 *
 * Gears are the only pieces that redirect the signal — Physics pieces
 * other than the Gear pass it straight through, and Protocol pieces are
 * straight-through by definition. Each Gear the signal actually passes
 * through (a successful gear step) is one direction change. Counted by
 * unique pieceId so a multi-pulse run that re-traverses the same Gear
 * counts it once.
 */
export function countDirectionChanges(steps: ExecutionStep[]): number {
  const gears = new Set<string>();
  for (const s of steps) {
    if (s.type === 'gear' && s.success) gears.add(s.pieceId);
  }
  return gears.size;
}

/**
 * Evaluate the structural (non-completion) objectives of a level against
 * an executed signal path. Returns true when every such objective is
 * satisfied. reach_output / reach_output_with_value are handled by the
 * caller's completion gate; this covers min_direction_changes.
 */
export function meetsDirectionObjectives(
  objectives: LevelObjective[],
  steps: ExecutionStep[],
): boolean {
  for (const o of objectives) {
    if (o.type === 'min_direction_changes') {
      const required = o.count ?? 0;
      if (countDirectionChanges(steps) < required) return false;
    }
  }
  return true;
}
