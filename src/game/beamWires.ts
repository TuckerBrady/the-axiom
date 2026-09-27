// AXM-036 P13 — honest wires (R-13.1..R-13.4).
//
// A pure filter: given the pieces on the board and the full auto-connect
// wire set, returns only the wires whose two pieces are joined by an edge
// of the shared static beam trace (`traceBeam`, beamTrace.ts, P12). Direction
// is ignored, since a wire's stored fromPieceId/toPieceId comes from piece
// order in autoConnectPhysicsPieces, not the beam direction (e.g. a
// Gear-Gear pair can be stored against the beam).
//
// R-13.4 (v1.5): this lives in its OWN module, not in beamTrace.ts. P12's
// merged guard test asserts beamTrace.ts contains zero case-insensitive
// occurrences of the filter word this module is named after (see
// `[P12-1] endpointSockets.ts and beamTrace.ts do not reference wires`).
// Adding this module's export to that file would break that
// already-merged, unauthorized-to-edit test the moment the two names sit
// in the same file. So beamTrace.ts stays byte-identical, and this module
// imports the shared trace function from it rather than re-implementing
// any part of it. It performs no board traversal of its own beyond that
// one call, and never special-cases a piece type by name.

import type { PlacedPiece, Wire } from './types';
import { traceBeam } from './beamTrace';

function edgeKey(a: string, b: string): string {
  return `${a}::${b}`;
}

/**
 * Returns, in input order, exactly the wires whose endpoint pair is an edge
 * of `traceBeam(pieces)`, in either direction (P13-1).
 */
export function beamWires(pieces: PlacedPiece[], wires: Wire[]): Wire[] {
  const { edges } = traceBeam(pieces);
  const edgeKeys = new Set<string>();
  for (const edge of edges) {
    edgeKeys.add(edgeKey(edge.from, edge.to));
  }

  return wires.filter(wire => {
    const forward = edgeKey(wire.fromPieceId, wire.toPieceId);
    const backward = edgeKey(wire.toPieceId, wire.fromPieceId);
    return edgeKeys.has(forward) || edgeKeys.has(backward);
  });
}
