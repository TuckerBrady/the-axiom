// SE-TM-035 — Board-topology validator (Spec Sheet data layer, Unit C Part 1).
//
// Evaluates board-topology predicates against PLACED pieces (static, pre-run
// geometry) — distinct from src/game/objectives.ts `countDirectionChanges`,
// which counts Gears in an EXECUTED signal path. The Spec Sheet is shown before
// and independent of a run, so it works from the placed pieces, not steps.
//
// Designed as a predicate registry, not a single hardcoded function: SE-TM-035
// anticipates more topology SHALL types (corruption/drift, Section 8 #1, Unit
// E). Adding a type means adding a key to TopologyRequirements (in types.ts), a
// branch in evaluateTopology, and — if it's a new measurement — an entry here.
// Consumers (specSheet.ts, future UI) do not need to change shape.

import type { PlacedPiece, TopologyRequirements } from '../types';

// ─── Measurements ─────────────────────────────────────────────────────────────

/**
 * Count direction-change pieces among placed pieces.
 *
 * The Gear is the only piece that redirects the signal — every other Physics
 * piece passes it straight through and Protocol pieces are straight-through by
 * definition (see engine.ts gear case and objectives.ts). So each placed Gear
 * is exactly one direction change. Static count over the placed set; it does
 * not require the machine to have been run.
 */
export function countDirectionChanges(placedPieces: PlacedPiece[]): number {
  return placedPieces.filter(p => p.type === 'gear').length;
}

/**
 * The minDirectionChanges predicate: the machine contains at least
 * `requiredBends` direction-change pieces.
 */
export function meetsTopologyShall(
  placedPieces: PlacedPiece[],
  requiredBends: number,
): boolean {
  return countDirectionChanges(placedPieces) >= requiredBends;
}

// ─── Predicate registry ───────────────────────────────────────────────────────

// The set of topology predicate types this validator understands. Mirrors the
// keys of TopologyRequirements. Extend the union (and TopologyRequirements, and
// evaluateTopology) to add a new predicate type.
export type TopologyPredicateType = 'minDirectionChanges';

// A single predicate's verdict for one level/board.
export type TopologyPredicateResult = {
  type: TopologyPredicateType;
  required: number;
  actual: number;
  met: boolean;
};

// Maps each predicate type to the measurement that produces its `actual` value.
// Keyed by type so adding a predicate is a registry entry, not a rewrite.
const TOPOLOGY_MEASUREMENTS: Record<
  TopologyPredicateType,
  (placedPieces: PlacedPiece[]) => number
> = {
  minDirectionChanges: countDirectionChanges,
};

/**
 * Evaluate every topology requirement a level declares against the placed
 * pieces. Returns one result per declared predicate (empty array when the
 * level declares no topology requirements). Independent of the
 * expectedOutput/tapeMatches comparator — callers combine the two as needed.
 */
export function evaluateTopology(
  placedPieces: PlacedPiece[],
  requirements: TopologyRequirements | undefined,
): TopologyPredicateResult[] {
  if (!requirements) return [];
  const results: TopologyPredicateResult[] = [];

  if (requirements.minDirectionChanges !== undefined) {
    const required = requirements.minDirectionChanges;
    const actual = TOPOLOGY_MEASUREMENTS.minDirectionChanges(placedPieces);
    results.push({
      type: 'minDirectionChanges',
      required,
      actual,
      met: actual >= required,
    });
  }

  return results;
}

/** True when every declared topology requirement is met (vacuously true when none). */
export function meetsAllTopologyRequirements(
  placedPieces: PlacedPiece[],
  requirements: TopologyRequirements | undefined,
): boolean {
  return evaluateTopology(placedPieces, requirements).every(r => r.met);
}
