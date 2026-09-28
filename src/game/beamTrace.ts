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
// particular this file never special-cases a Gear: AXM-038 (SWEEP-B51 S3)
// made a Gear leave through exactly one perpendicular side, and this trace
// follows it by passing its `visited` set, exactly as executeMachine does.
//
// The one deliberate addition beyond a plain "visited" BFS is the Merger,
// which mirrors engine.ts's deferred-Merger hold (G3) exactly (SWEEP-B51
// R-3.2). A Merger is added to `visited`, and emits, only when its arrival
// count reaches `countMergerInboundEdges` (the engine's own count, imported,
// never re-derived), or, once the queue drains, by a flush of every held
// Merger with at least one arrival, repeated until no work remains, as
// executeMachine's outer loop does. So the `visited` set a Gear sees here
// equals the one it sees in the engine at every Gear evaluation: a Merger
// still waiting for a further inbound path stays a Gear exit candidate. A
// Merger's `entry` is its FIRST arrival's side. An edge into a not-yet-visited
// piece, or into a Merger, is recorded, so every inbound path into a Merger
// keeps its edge. No other piece type is special-cased.

import type { PlacedPiece, PortSide } from './types';
import { countMergerInboundEdges, getDirectionalNeighbors } from './engine';

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

  const queue: { id: string; entrySide?: PortSide; flushMerger?: boolean }[] = [];
  for (const piece of pieces) {
    if (piece.type === 'source') {
      queue.push({ id: piece.id, entrySide: undefined });
    }
  }
  // G3 mirror: each held Merger's arrival count and inbound-path target.
  const pendingMergers = new Map<string, { arrivals: number; expectedPaths: number }>();

  // Outer loop: drain the queue, then flush every held Merger that received at
  // least one arrival, and repeat until no work remains (executeMachine's loop).
  let didWork = true;
  while (didWork) {
    didWork = false;

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      const { id: currentId, entrySide, flushMerger } = next;
      if (visited.has(currentId)) continue;

      const piece = pieces.find(p => p.id === currentId);
      if (!piece) continue;

      if (piece.type === 'merger') {
        let pending = pendingMergers.get(currentId);
        if (!pending) {
          pending = { arrivals: 0, expectedPaths: countMergerInboundEdges(piece, pieces) };
          pendingMergers.set(currentId, pending);
        }
        if (!flushMerger) {
          pending.arrivals += 1;
          // The first arrival's side is the Merger's entry.
          if (!entry.has(currentId)) entry.set(currentId, entrySide);
        }
        if (!flushMerger && pending.arrivals < pending.expectedPaths) {
          continue; // hold for the remaining inbound path(s)
        }
      }

      visited.add(currentId);
      if (!entry.has(currentId)) entry.set(currentId, entrySide);

      const neighbors = getDirectionalNeighbors(piece, pieces, entrySide, visited);
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

    // G3 drain-fallback mirror: release every held Merger with an arrival.
    for (const [mergerId, pending] of pendingMergers) {
      if (!visited.has(mergerId) && pending.arrivals >= 1) {
        queue.push({ id: mergerId, entrySide: entry.get(mergerId), flushMerger: true });
        didWork = true;
      }
    }
  }

  return { entry, edges };
}
