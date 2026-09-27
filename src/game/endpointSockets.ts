// AXM-036 P12 — Source/Terminal socket sides (R-12.0, replacing S-DR-1).
//
// A socket or outlet appears only where the beam actually enters a Terminal
// or leaves a Source, derived from the shared static trace in beamTrace.ts —
// never from the auto-connect adjacency set (a Config Node, Scanner or
// Transmitter auto-connects to every side neighbor, whether or not the beam
// actually takes that side; a socket built from that adjacency set would
// repeat the lie F8 removed from the placement highlights).
//
// This module does no traversal of its own beyond the single `traceBeam`
// call, and reads only `pieces`.

import type { PlacedPiece, PortSide } from './types';
import { traceBeam } from './beamTrace';

export type EndpointSocketKind = 'outlet' | 'socket' | 'entry';

export interface EndpointSocketEntry {
  kind: EndpointSocketKind;
  sides: PortSide[];
}

// Canonical order (top, right, bottom, left).
const SIDE_ORDER: PortSide[] = ['top', 'right', 'bottom', 'left'];

function inCanonicalOrder(sides: Iterable<PortSide>): PortSide[] {
  const set = new Set(sides);
  return SIDE_ORDER.filter(side => set.has(side));
}

function sideFacing(from: PlacedPiece, to: PlacedPiece): PortSide {
  const dx = to.gridX - from.gridX;
  const dy = to.gridY - from.gridY;
  if (dx === 1) return 'right';
  if (dx === -1) return 'left';
  if (dy === 1) return 'bottom';
  return 'top';
}

/**
 * One entry per Source and per Terminal in `pieces`; no other piece is keyed.
 */
export function getEndpointSocketSides(
  pieces: PlacedPiece[],
): Map<string, EndpointSocketEntry> {
  const result = new Map<string, EndpointSocketEntry>();
  const trace = traceBeam(pieces);
  const byId = new Map(pieces.map(p => [p.id, p] as const));

  for (const piece of pieces) {
    if (piece.type === 'source') {
      const sides = new Set<PortSide>();
      for (const edge of trace.edges) {
        if (edge.from !== piece.id) continue;
        const target = byId.get(edge.to);
        if (target) sides.add(sideFacing(piece, target));
      }
      result.set(piece.id, { kind: 'outlet', sides: inCanonicalOrder(sides) });
    } else if (piece.type === 'terminal') {
      if (piece.entrySide) {
        result.set(piece.id, { kind: 'entry', sides: [piece.entrySide] });
      } else {
        const side = trace.entry.get(piece.id);
        result.set(piece.id, { kind: 'socket', sides: side ? [side] : [] });
      }
    }
  }

  return result;
}
