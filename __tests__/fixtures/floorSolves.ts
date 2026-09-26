// AXM-026 floor-solve and alternate-solve fixtures
// (SPEC_SOURCE_TERMINAL_PLACEMENT v1.1, clause 7.1).
//
// One entry per in-scope level: the floor solve (fewest player pieces, tray
// pieces only) and a distinct alternate solve with at least as many pieces.
// Every piece is (type, cell, rotation, config). Board frame: x is the column
// from the left, y is the row from the top.
//
// Rotation matters only for directional pieces. A Conveyor at 0 carries the
// signal east, 90 south, 180 west, 270 north (the Engineer taps a Conveyor to
// turn it). Every other player piece is placed at rotation 0, which is what the
// live game does (GameplayScreen.getAutoRotation), except a piece dropped
// directly beside the Source, which faces away from it. Gears, Scanners, Config
// Nodes and Transmitters accept signal from any side, so rotation is moot for
// them. Latch, Inverter, Merger and Bridge at 0: Latch and Inverter take the
// signal in from the west and send it east; Merger takes west and north, sends
// east; Bridge takes west and north, sends east and south.
//
// `terminalEntrySide` (K1-7, K1-8, K1-10) is the side of the Terminal both
// solves deliver through. It is the side SPEC_DIRECTIONAL_TERMINAL PR-3 will
// set as `entrySide` (clause 7.4); levels.ts names the same side beside each
// of those Terminals.

import type { PieceType, PlacedPiece, PortSide } from '../../src/game/types';
import { getDefaultPorts, getPieceCategory } from '../../src/game/engine';

export type SolvePiece = {
  type: PieceType;
  x: number;
  y: number;
  rotation?: number;
  configValue?: number;
  latchMode?: 'write' | 'read' | 'delay';
};

export type LevelSolves = {
  floor: SolvePiece[];
  alternate: SolvePiece[];
  terminalEntrySide?: PortSide;
  // 7.10.1 (v1.2): the floor or alternate solve plus requisitioned pieces, built
  // to reach three stars within the level's creditBudget.
  threeStar?: SolvePiece[];
};

const E = 0;
const S = 90;
const N = 270;

// Compact constructors. `c` is a Conveyor with its heading.
const c = (x: number, y: number, rotation: number): SolvePiece => ({ type: 'conveyor', x, y, rotation });
const g = (x: number, y: number): SolvePiece => ({ type: 'gear', x, y });
const scan = (x: number, y: number): SolvePiece => ({ type: 'scanner', x, y });
const cfg = (x: number, y: number, configValue = 1): SolvePiece => ({ type: 'configNode', x, y, configValue });
const tx = (x: number, y: number): SolvePiece => ({ type: 'transmitter', x, y });
const latch = (x: number, y: number, latchMode: SolvePiece['latchMode'] = 'write'): SolvePiece =>
  ({ type: 'latch', x, y, latchMode });
const split = (x: number, y: number): SolvePiece => ({ type: 'splitter', x, y });
const merge = (x: number, y: number): SolvePiece => ({ type: 'merger', x, y });
const bridge = (x: number, y: number): SolvePiece => ({ type: 'bridge', x, y });
const inv = (x: number, y: number): SolvePiece => ({ type: 'inverter', x, y });

// A straight run of Conveyors from (x0,y0) to (x1,y1) inclusive, all heading
// the same way. Only ever horizontal or vertical.
function run(x0: number, y0: number, x1: number, y1: number, rotation: number): SolvePiece[] {
  const out: SolvePiece[] = [];
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  for (let x = x0, y = y0; ; x += dx, y += dy) {
    out.push(c(x, y, rotation));
    if (x === x1 && y === y1) break;
  }
  return out;
}

export const FLOOR_SOLVES: Record<string, LevelSolves> = {
  // ── The Axiom ───────────────────────────────────────────────────────────────
  // Source (0,1), Terminal (7,6). Opposite corners always need one turn, so a
  // Gear joins the A1-1 tray (see the AXM-026 PR open questions).
  'A1-1': {
    floor: [...run(1, 1, 6, 1, E), g(7, 1), ...run(7, 2, 7, 5, S)],
    alternate: [...run(0, 2, 0, 5, S), g(0, 6), ...run(1, 6, 6, 6, E)],
  },
  // Source (0,1), Terminal (7,5). One direction change.
  'A1-2': {
    floor: [...run(1, 1, 6, 1, E), g(7, 1), ...run(7, 2, 7, 4, S)],
    alternate: [...run(0, 2, 0, 4, S), g(0, 5), ...run(1, 5, 6, 5, E)],
  },
  // Source (0,1), Terminal (8,6). Trail holds 0, so the gate is set to 0.
  'A1-3': {
    floor: [cfg(1, 1, 0), ...run(2, 1, 7, 1, E), g(8, 1), ...run(8, 2, 8, 5, S)],
    alternate: [cfg(0, 2, 0), ...run(0, 3, 0, 5, S), g(0, 6), ...run(1, 6, 7, 6, E)],
  },
  // Source (0,1), Terminal (8,5). Two Gear-driven bends (min_direction_changes 2).
  'A1-4': {
    floor: [...run(1, 1, 3, 1, E), g(4, 1), ...run(4, 2, 4, 4, S), g(4, 5), ...run(5, 5, 7, 5, E)],
    alternate: [...run(1, 1, 5, 1, E), g(6, 1), ...run(6, 2, 6, 4, S), g(6, 5), c(7, 5, E)],
  },
  // Source (0,1), Terminal (8,5). Scanner then gate; three 1-pulses land.
  'A1-5': {
    floor: [scan(1, 1), cfg(2, 1), ...run(3, 1, 7, 1, E), g(8, 1), ...run(8, 2, 8, 4, S)],
    alternate: [scan(0, 2), cfg(0, 3), c(0, 4, S), g(0, 5), ...run(1, 5, 7, 5, E)],
  },
  // Source (0,1), Terminal (9,5). One Scanner, two gates set to 0.
  'A1-6': {
    floor: [scan(1, 1), cfg(2, 1, 0), cfg(3, 1, 0), ...run(4, 1, 8, 1, E), g(9, 1), ...run(9, 2, 9, 4, S)],
    alternate: [scan(0, 2), cfg(0, 3, 0), cfg(0, 4, 0), g(0, 5), ...run(1, 5, 8, 5, E)],
  },
  // Source (0,1), Terminal (9,5). Scanner, gate, Transmitter.
  'A1-7': {
    floor: [scan(1, 1), cfg(2, 1), ...run(3, 1, 8, 1, E), g(9, 1), ...run(9, 2, 9, 3, S), tx(9, 4)],
    alternate: [scan(0, 2), cfg(0, 3), c(0, 4, S), g(0, 5), ...run(1, 5, 7, 5, E), tx(8, 5)],
  },
  // Source (0,1), Terminal (10,7). Gate set to 0 passes the 0-pulses.
  'A1-8': {
    floor: [scan(1, 1), cfg(2, 1, 0), ...run(3, 1, 9, 1, E), g(10, 1), ...run(10, 2, 10, 5, S), tx(10, 6)],
    alternate: [scan(0, 2), cfg(0, 3, 0), ...run(0, 4, 0, 6, S), g(0, 7), ...run(1, 7, 8, 7, E), tx(9, 7)],
  },

  // ── Kepler Belt ─────────────────────────────────────────────────────────────
  // Source (0,1), Terminal (7,4); debris at (6,1) and (1,4). Z-path, two Gears.
  'K1-1': {
    floor: [...run(1, 1, 2, 1, E), g(3, 1), ...run(3, 2, 3, 3, S), g(3, 4), ...run(4, 4, 6, 4, E)],
    alternate: [...run(1, 1, 3, 1, E), g(4, 1), ...run(4, 2, 4, 3, S), g(4, 4), ...run(5, 4, 6, 4, E)],
  },
  // Source (0,1), Terminal (8,4); debris at (6,1) and (2,4).
  'K1-2': {
    floor: [scan(1, 1), c(2, 1, E), g(3, 1), ...run(3, 2, 3, 3, S), g(3, 4), ...run(4, 4, 6, 4, E), tx(7, 4)],
    alternate: [scan(1, 1), ...run(2, 1, 4, 1, E), g(5, 1), ...run(5, 2, 5, 3, S), g(5, 4), c(6, 4, E), tx(7, 4)],
  },
  // Source (0,1), Terminal (9,5); pre-placed Latch (write) at (4,1); debris (2,5).
  'K1-3': {
    floor: [scan(1, 1), ...run(2, 1, 3, 1, E), c(5, 1, E), g(6, 1), ...run(6, 2, 6, 4, S), g(6, 5), c(7, 5, E), tx(8, 5)],
    alternate: [scan(1, 1), ...run(2, 1, 3, 1, E), tx(5, 1), ...run(6, 1, 7, 1, E), g(8, 1), ...run(8, 2, 8, 4, S), g(8, 5)],
  },
  // Source (0,1), Terminal (9,5); debris (7,1) and (3,5). Latch -> gate -> Transmitter.
  'K1-4': {
    floor: [latch(1, 1), cfg(2, 1), ...run(3, 1, 4, 1, E), g(5, 1), ...run(5, 2, 5, 4, S), g(5, 5), ...run(6, 5, 7, 5, E), tx(8, 5)],
    alternate: [latch(1, 1), cfg(2, 1), c(3, 1, E), g(4, 1), ...run(4, 2, 4, 4, S), g(4, 5), ...run(5, 5, 7, 5, E), tx(8, 5)],
  },
  // Source (0,1), Terminal (9,6); pre-placed Splitter at (5,4); blown (7,1), (2,6).
  // Splitter forks south (bypass) and east (Config gate); the Merger at (7,6)
  // takes the gate path from the north and the bypass from the west.
  'K1-5': {
    floor: [
      scan(1, 1), ...run(2, 1, 4, 1, E), g(5, 1), ...run(5, 2, 5, 3, S),
      cfg(6, 4), g(7, 4), c(7, 5, S),
      c(5, 5, S), g(5, 6), c(6, 6, E),
      merge(7, 6), tx(8, 6),
    ],
    alternate: [
      g(0, 2), scan(1, 2), ...run(2, 2, 4, 2, E), g(5, 2), c(5, 3, S),
      cfg(6, 4), g(7, 4), c(7, 5, S),
      c(5, 5, S), g(5, 6), c(6, 6, E),
      merge(7, 6), tx(8, 6),
    ],
  },
  // Source (0,1), Terminal (10,6); blown (8,1), (0,4). Latch, Splitter, gate, Merger.
  'K1-6': {
    floor: [
      latch(1, 1), scan(2, 1), ...run(3, 1, 5, 1, E), g(6, 1), ...run(6, 2, 6, 3, S),
      split(6, 4), cfg(7, 4), g(8, 4), c(8, 5, S),
      c(6, 5, S), g(6, 6), c(7, 6, E),
      merge(8, 6), tx(9, 6),
    ],
    alternate: [
      g(0, 2), latch(1, 2), scan(2, 2), ...run(3, 2, 5, 2, E), g(6, 2), c(6, 3, S),
      split(6, 4), cfg(7, 4), g(8, 4), c(8, 5, S),
      c(6, 5, S), g(6, 6), c(7, 6, E),
      merge(8, 6), tx(9, 6),
    ],
  },
  // Source (0,1), Terminal (9,6); pre-placed Splitter (3,1) and Bridge (5,6);
  // blown (4,5), (7,2). Floor: the Splitter's east magnet is a one-piece spur and
  // the south path crosses the Bridge west to east. Alternate: the east branch
  // becomes the second path, dropping into the Bridge from the north.
  'K1-7': {
    terminalEntrySide: 'left',
    floor: [
      scan(1, 1), c(2, 1, E), c(4, 1, E),
      ...run(3, 2, 3, 5, S), g(3, 6), c(4, 6, E),
      ...run(6, 6, 7, 6, E), tx(8, 6),
    ],
    alternate: [
      scan(1, 1), c(2, 1, E), c(4, 1, E), g(5, 1), ...run(5, 2, 5, 5, S),
      ...run(3, 2, 3, 5, S), g(3, 6), c(4, 6, E),
      ...run(6, 6, 7, 6, E), tx(8, 6),
    ],
  },
  // Source (0,1), Terminal (10,6); blown (10,3), (1,6). Latch, Splitter, Bridge, Merger.
  'K1-8': {
    terminalEntrySide: 'left',
    floor: [
      latch(1, 1), scan(2, 1), ...run(3, 1, 5, 1, E), g(6, 1), ...run(6, 2, 6, 3, S),
      split(6, 4), bridge(7, 4), c(7, 5, S),
      c(6, 5, S), g(6, 6),
      merge(7, 6), c(8, 6, E), tx(9, 6),
    ],
    alternate: [
      g(0, 2), latch(1, 2), scan(2, 2), ...run(3, 2, 5, 2, E), g(6, 2), c(6, 3, S),
      split(6, 4), bridge(7, 4), c(7, 5, S),
      c(6, 5, S), g(6, 6),
      merge(7, 6), c(8, 6, E), tx(9, 6),
    ],
  },
  // Source (0,1), Terminal (10,7); blown (5,7), (9,1). One DELAY Latch.
  'K1-9': {
    floor: [latch(1, 1, 'delay'), ...run(2, 1, 5, 1, E), g(6, 1), ...run(6, 2, 6, 6, S), g(6, 7), ...run(7, 7, 8, 7, E), tx(9, 7)],
    alternate: [latch(1, 1, 'delay'), ...run(2, 1, 7, 1, E), g(8, 1), ...run(8, 2, 8, 6, S), g(8, 7), tx(9, 7)],
  },
  // Source (0,1), Terminal (11,7); blown (5,2), (2,7), (11,3). Splitter at (7,7)
  // forks east into a DELAY Latch (previous pulse) and north over the top into
  // the Merger's north input (this pulse). Merger ORs them into the Transmitter.
  'K1-10': {
    terminalEntrySide: 'left',
    floor: [
      ...run(1, 1, 3, 1, E), g(4, 1), ...run(4, 2, 4, 6, S), g(4, 7), ...run(5, 7, 6, 7, E),
      split(7, 7), latch(8, 7, 'delay'),
      c(7, 6, N), g(7, 5), c(8, 5, E), g(9, 5), c(9, 6, S),
      merge(9, 7), tx(10, 7),
    ],
    alternate: [
      ...run(1, 1, 2, 1, E), g(3, 1), ...run(3, 2, 3, 6, S), g(3, 7), ...run(4, 7, 6, 7, E),
      split(7, 7), latch(8, 7, 'delay'),
      c(7, 6, N), g(7, 5), c(8, 5, E), g(9, 5), c(9, 6, S),
      merge(9, 7), tx(10, 7),
    ],
  },

  // ── Repair puzzles ──────────────────────────────────────────────────────────
  // Source (0,1), Terminal (8,4); pre-placed Config (4,3) and Scanner (6,3)
  // stay put; debris (5,1), (4,4).
  'REPAIR-PROP-SURGE': {
    floor: [c(0, 2, S), g(0, 3), ...run(1, 3, 3, 3, E), c(5, 3, E), c(7, 3, E), g(8, 3)],
    alternate: [...run(1, 1, 2, 1, E), g(3, 1), c(3, 2, S), g(3, 3), c(5, 3, E), tx(7, 3), g(8, 3)],
  },
  // Source (0,1), Terminal (8,5); pre-placed Scanners (3,3) and (6,4) stay put;
  // debris (6,1), (2,5). The route passes through both Scanners.
  'REPAIR-HYPERDRIVE': {
    floor: [...run(1, 1, 2, 1, E), g(3, 1), c(3, 2, S), g(3, 4), cfg(4, 4), c(5, 4, E), tx(7, 4), g(8, 4)],
    alternate: [c(0, 2, S), g(0, 3), ...run(1, 3, 2, 3, E), cfg(4, 3), g(5, 3), g(5, 4), tx(7, 4), g(8, 4)],
  },

  // ── Nova Fringe ─────────────────────────────────────────────────────────────
  // Source (0,1), Terminal (8,5); debris (7,1), (1,5). Inverter then Transmitter.
  'NF-1': {
    floor: [inv(1, 1), ...run(2, 1, 3, 1, E), g(4, 1), ...run(4, 2, 4, 4, S), g(4, 5), ...run(5, 5, 6, 5, E), tx(7, 5)],
    alternate: [inv(1, 1), ...run(2, 1, 4, 1, E), g(5, 1), ...run(5, 2, 5, 4, S), g(5, 5), c(6, 5, E), tx(7, 5)],
  },
};

let fixtureCounter = 0;

/** Build fresh PlacedPiece objects for a solve (never shared between runs). */
export function solvePieces(solve: SolvePiece[]): PlacedPiece[] {
  return solve.map(p => ({
    id: `fixture-${p.type}-${p.x}-${p.y}-${++fixtureCounter}`,
    type: p.type,
    category: getPieceCategory(p.type),
    gridX: p.x,
    gridY: p.y,
    ports: getDefaultPorts(p.type),
    rotation: p.rotation ?? 0,
    isPrePlaced: false,
    ...(p.configValue !== undefined ? { configValue: p.configValue } : {}),
    ...(p.type === 'latch' ? { latchMode: p.latchMode ?? 'write', storedValue: null } : {}),
  }));
}
