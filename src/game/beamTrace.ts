// AXM-036 P12/P13 — the shared static beam trace (R-12.0).
//
// A pure, static mirror of `executeMachine`'s traversal in engine.ts: same
// BFS order (visited-on-dequeue), same directional routing
// (`getDirectionalNeighbors`, which already applies straight-through
// enforcement for Config Node / Scanner / Transmitter via
// `getEmittingSides`), and the same first-arrival entry-side computation
// (engine.ts, the neighbor-enqueue block below the `runLockPhase`/executeMachine
// main loop). Tape and trail values are ignored: a gate counts as passing, and
// a Latch or Counter as passing, exactly as the ruling requires.
//
// This module reads only `pieces`, and MUST NOT re-implement any piece
// type's port or exit rules itself — every routing decision comes from
// `getDirectionalNeighbors`, which is the engine's own function. In
// particular this file never special-cases a Gear: on today's engine a Gear
// also exits straight ahead (FND-1), and when AXM-038 changes that, this
// trace (and everything derived from it) follows automatically.
//
// The one deliberate addition beyond a plain "visited" BFS is the Merger
// exception: a Merger takes every inbound path (engine.ts's deferred-Merger
// hold, G3), so an edge into an already-visited Merger is still recorded —
// only the FIRST arrival sets its `entry` side and enqueues it for further
// traversal.

import type { PlacedPiece, PortSide } from './types';
import { getDirectionalNeighbors } from './engine';

export interface BeamTraceEdge {
  from: string;
  to: string;
}

export interface BeamTraceResult {
  /** Each visited piece's first-arrival entry side. A Source has no entry (undefined). */
  entry: Map<string, PortSide | undefined>;
  /** Every edge the static trace crosses, including repeat arrivals into a Merger. */
  edges: BeamTraceEdge[];
}

/**
 * Statically traces the beam from every Source, ignoring tape/trail values
 * (a gate always "passes"). See file header for the rules this reproduces.
 */
export function traceBeam(pieces: PlacedPiece[]): BeamTraceResult {
  const entry = new Map<string, PortSide | undefined>();
  const edges: BeamTraceEdge[] = [];
  const visited = new Set<string>();

  const queue: { id: string; entrySide?: PortSide }[] = [];
  for (const piece of pieces) {
    if (piece.type === 'source') {
      queue.push({ id: piece.id, entrySide: undefined });
    }
  }

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const { id: currentId, entrySide } = next;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    entry.set(currentId, entrySide);

    const piece = pieces.find(p => p.id === currentId);
    if (!piece) continue;

    const neighbors = getDirectionalNeighbors(piece, pieces, entrySide);
    for (const neighbor of neighbors) {
      const neighborAlreadyVisited = visited.has(neighbor.id);
      if (!neighborAlreadyVisited || neighbor.type === 'merger') {
        edges.push({ from: piece.id, to: neighbor.id });
      }
      if (!neighborAlreadyVisited) {
        const dx = neighbor.gridX - piece.gridX;
        const dy = neighbor.gridY - piece.gridY;
        let neighborEntrySide: PortSide;
        if (dx === 1) neighborEntrySide = 'left';
        else if (dx === -1) neighborEntrySide = 'right';
        else if (dy === 1) neighborEntrySide = 'top';
        else neighborEntrySide = 'bottom';
        queue.push({ id: neighbor.id, entrySide: neighborEntrySide });
      }
    }
  }

  return { entry, edges };
}
