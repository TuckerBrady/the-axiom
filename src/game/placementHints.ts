// AXM-036 P8 — Honest placement highlights (F8).
//
// A pure, static trace from every Source that answers "which empty cells
// will the beam actually enter?" Tape and trail values are ignored (a gate
// is treated as passing, since at placement time the value is unknown).
// See drafts/MORPH/AXM-036/SWEEP_PIECE_DIRECTION.md section 3 for the rule
// this codifies, and CONTRACT.md section 9b (P8) for the normative clauses.

import type { PlacedPiece, PortSide } from './types';
import { getInputPorts, getOutputPorts } from './engine';

export interface GetPlacementHintCellsArgs {
  pieces: PlacedPiece[];
  gridWidth: number;
  gridHeight: number;
  blownCells?: ReadonlySet<string>;
}

export interface HintCell {
  x: number;
  y: number;
}

const ALL_SIDES: PortSide[] = ['top', 'bottom', 'left', 'right'];

const OPPOSITE_SIDE: Record<PortSide, PortSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

function sideOffset(side: PortSide): { dx: number; dy: number } {
  switch (side) {
    case 'top':
      return { dx: 0, dy: -1 };
    case 'bottom':
      return { dx: 0, dy: 1 };
    case 'left':
      return { dx: -1, dy: 0 };
    case 'right':
      return { dx: 1, dy: 0 };
  }
}

// The two sides at right angles to the side signal entered from.
function perpendicularSides(entrySide: PortSide): PortSide[] {
  return entrySide === 'left' || entrySide === 'right' ? ['top', 'bottom'] : ['left', 'right'];
}

// The sides a piece emits toward, for the purpose of a placement hint —
// NOT the same as the engine's getOutputPorts, which returns every port a
// piece could ever use. This answers "given the beam entered here, which
// side will it actually leave from" per SWEEP_PIECE_DIRECTION.md section 3:
//   - Source: all four sides (it has no entry).
//   - Conveyor: its output side (its rotation-derived exit).
//   - Gear: the two sides perpendicular to its entry — never straight
//     ahead (that contradiction is FND-1, out of scope for P8) and never
//     back out the way it came in.
//   - Config Node / Scanner / Transmitter: straight through, opposite the
//     entry side only.
//   - Everything else (not present on A1-1..A1-8): contributes nothing.
function emittingSidesForHint(piece: PlacedPiece, entrySide: PortSide | undefined): PortSide[] {
  switch (piece.type) {
    case 'source':
      return ALL_SIDES;
    case 'conveyor':
      return getOutputPorts(piece);
    case 'gear':
      return entrySide ? perpendicularSides(entrySide) : [];
    case 'configNode':
    case 'scanner':
    case 'transmitter':
      return entrySide ? [OPPOSITE_SIDE[entrySide]] : [];
    default:
      return [];
  }
}

/**
 * Static trace, ignoring tape/trail values, of every cell an empty
 * neighbour could be honestly highlighted for at placement time.
 *
 * BFS from every Source. A reached piece contributes the hint cells on its
 * emitting sides (see emittingSidesForHint); an unreached piece contributes
 * nothing. The Terminal is the one exception (P8-3): every empty neighbour
 * on a side in getInputPorts(terminal) is a hint, whether or not the trace
 * reaches it, because a piece placed there can still feed it.
 */
export function getPlacementHintCells(args: GetPlacementHintCellsArgs): HintCell[] {
  const { pieces, gridWidth, gridHeight, blownCells } = args;

  const hints = new Map<string, HintCell>();
  const visited = new Set<string>();
  const queue: Array<{ piece: PlacedPiece; entrySide?: PortSide }> = [];

  const inBounds = (x: number, y: number): boolean =>
    x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
  const isBlown = (x: number, y: number): boolean => blownCells?.has(`${x},${y}`) ?? false;
  const pieceAt = (x: number, y: number): PlacedPiece | undefined =>
    pieces.find(p => p.gridX === x && p.gridY === y);

  const addHint = (x: number, y: number): void => {
    if (!inBounds(x, y) || isBlown(x, y) || pieceAt(x, y)) return;
    hints.set(`${x},${y}`, { x, y });
  };

  for (const piece of pieces) {
    if (piece.type === 'source') {
      visited.add(piece.id);
      queue.push({ piece, entrySide: undefined });
    }
  }

  while (queue.length > 0) {
    const { piece, entrySide } = queue.shift()!;

    for (const side of emittingSidesForHint(piece, entrySide)) {
      const { dx, dy } = sideOffset(side);
      const nx = piece.gridX + dx;
      const ny = piece.gridY + dy;
      const neighbor = pieceAt(nx, ny);

      if (!neighbor) {
        addHint(nx, ny);
        continue;
      }
      if (visited.has(neighbor.id)) continue;

      const neighborEntrySide = OPPOSITE_SIDE[side];
      if (!getInputPorts(neighbor).includes(neighborEntrySide)) continue;

      visited.add(neighbor.id);
      queue.push({ piece: neighbor, entrySide: neighborEntrySide });
    }
  }

  for (const piece of pieces) {
    if (piece.type !== 'terminal') continue;
    for (const side of getInputPorts(piece)) {
      const { dx, dy } = sideOffset(side);
      addHint(piece.gridX + dx, piece.gridY + dy);
    }
  }

  return Array.from(hints.values());
}
