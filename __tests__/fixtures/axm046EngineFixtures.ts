// AXM-046 PR 1 — engine fixtures for the driven head, STEPPER, STAMP, halt,
// checkpoints and the READ/WRITE modules.
//
// These are ENGINE fixtures, not level data. The two hand traces come from
// Pierce - System Engineer/AXM-046_TURING_ENGINE_SCOPE.md b.2 (A1-7) and b.3
// (A1-8), laid out on the boards the AXM-046 DESIGN_SPEC appendix gives for
// those levels. The A1 levels themselves land in PR 3.
//
// Board frame: x is the column from the left, y the row from the top.
// Conveyor rotation: 0 east, 90 south, 180 west, 270 north.

import type {
  LevelDefinition,
  MachineState,
  OutputTapeValue,
  PieceType,
  PlacedPiece,
} from '../../src/game/types';
import { BLANK } from '../../src/game/types';
import {
  autoConnectPhysicsPieces,
  getDefaultPorts,
  getPieceCategory,
} from '../../src/game/engine';
import { computeSplitterMagnets } from '../../src/store/gameStore';

export const E = 0;
export const S = 90;
export const W = 180;
export const N = 270;

let counter = 0;

/** A fresh PlacedPiece. Ids are unique per call so runs never share state. */
export function piece(
  type: PieceType,
  x: number,
  y: number,
  extra: Partial<PlacedPiece> = {},
): PlacedPiece {
  return {
    id: `axm046-${type}-${x}-${y}-${++counter}`,
    type,
    category: getPieceCategory(type),
    gridX: x,
    gridY: y,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: false,
    ...extra,
  };
}

export const pre = (type: PieceType, x: number, y: number, extra: Partial<PlacedPiece> = {}) =>
  piece(type, x, y, { ...extra, isPrePlaced: true });

/** A minimal, complete LevelDefinition for fixture boards. */
export function fixtureLevel(over: Partial<LevelDefinition>): LevelDefinition {
  return {
    id: 'AXM046-FIXTURE',
    name: 'Fixture',
    sector: 'axiom',
    description: '',
    cogsLine: '',
    gridWidth: 10,
    gridHeight: 8,
    prePlacedPieces: [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [{ type: 'reach_output' }],
    optimalPieces: 1,
    ...over,
  };
}

/** A MachineState over `pieces` (Splitter magnets computed as the live game does). */
export function stateFor(
  pieces: PlacedPiece[],
  trail: (0 | 1 | null)[] = [],
  head = 0,
  over: Partial<MachineState> = {},
): MachineState {
  const withMagnets = computeSplitterMagnets(pieces);
  return {
    pieces: withMagnets,
    wires: autoConnectPhysicsPieces(withMagnets),
    dataTrail: { cells: [...trail], headPosition: head },
    configuration: 1,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    ...over,
  };
}

export function stateForLevel(level: LevelDefinition, player: PlacedPiece[]): MachineState {
  return stateFor(
    [...level.prePlacedPieces.map(p => ({ ...p, ports: p.ports.map(q => ({ ...q })) })), ...player],
    level.dataTrail.cells,
    level.dataTrail.headPosition,
    {
      inputTape: level.inputTape ? [...level.inputTape] : undefined,
      outputTape: level.inputTape
        ? (new Array(level.inputTape.length).fill(BLANK) as OutputTapeValue[])
        : undefined,
    },
  );
}

const obstacles = (cells: [number, number][]) => cells.map(([x, y]) => pre('obstacle', x, y));

// ─── A1-7 Weapons board: the head moves ────────────────────────────────────
//
// TRAIL [0,0,1,0,0,1,0,0], head 0, 6 pulses, driven. Splitter at (2,3).
// Upper branch: Config (sweep, gate 0) -> STEPPER RIGHT -> dead end at the
// debris column. Lower branch: Config (lock, gate 1) -> route -> Terminal.
// Hand trace: Terminal on P3..P6, head 0,1,2,2,2,2.

export type A17Options = { upperGate?: 0 | 1; lowerGate?: 0 | 1; stepper?: 'left' | 'right' };

export function a17Level(over: Partial<LevelDefinition> = {}): LevelDefinition {
  return fixtureLevel({
    id: 'AXM046-A1-7-TRACE',
    gridWidth: 9,
    gridHeight: 7,
    prePlacedPieces: [
      pre('source', 0, 3),
      pre('terminal', 8, 3, { entrySide: 'left' }),
      ...obstacles([[3, 3], [4, 3], [5, 3], [6, 0], [6, 1], [6, 2]]),
    ],
    dataTrail: { cells: [0, 0, 1, 0, 0, 1, 0, 0], headPosition: 0 },
    headMode: 'driven',
    pulseCount: 6,
    expectedArrivals: [3, 4, 5, 6],
    ...over,
  });
}

export function a17Solve(o: A17Options = {}): PlacedPiece[] {
  return [
    piece('conveyor', 1, 3, { rotation: E }),
    piece('splitter', 2, 3),
    piece('conveyor', 2, 2, { rotation: N }),
    piece('gear', 2, 1),
    piece('configNode', 3, 1, { configValue: o.upperGate ?? 0 }),
    piece('stepper', 4, 1, { direction: o.stepper ?? 'right' }),
    piece('conveyor', 5, 1, { rotation: E }),
    piece('conveyor', 2, 4, { rotation: S }),
    piece('gear', 2, 5),
    piece('configNode', 3, 5, { configValue: o.lowerGate ?? 1 }),
    piece('conveyor', 4, 5, { rotation: E }),
    piece('conveyor', 5, 5, { rotation: E }),
    piece('gear', 6, 5),
    piece('conveyor', 6, 4, { rotation: N }),
    piece('gear', 6, 3),
    piece('conveyor', 7, 3, { rotation: E }),
  ];
}

// ─── A1-8 Bridge board: add one, then halt ─────────────────────────────────
//
// TRAIL [1,0,1,1], head 3, driven, run until halt. Splitter at (2,4).
// Upper branch: Config gate 0 -> STAMP 1 -> HALT Terminal at (9,1).
// Lower branch: Config gate 1 -> STAMP 0 -> STEPPER LEFT -> dead end.
// Hand trace: trail 1010, 1000, 1100; halt on P3.

export type A18Options = {
  upperGate?: 0 | 1;
  lowerGate?: 0 | 1;
  upperStamp?: 0 | 1;
  lowerStamp?: 0 | 1;
  stepper?: 'left' | 'right';
};

export function a18Level(
  trail: (0 | 1 | null)[] = [1, 0, 1, 1],
  head = 3,
  over: Partial<LevelDefinition> = {},
): LevelDefinition {
  return fixtureLevel({
    id: 'AXM046-A1-8-TRACE',
    gridWidth: 10,
    gridHeight: 8,
    prePlacedPieces: [
      pre('source', 0, 4),
      pre('terminal', 9, 1, { entrySide: 'left', halt: true }),
      ...obstacles([
        [4, 3], [4, 4], [4, 5], [5, 3], [5, 4], [5, 5], [6, 3], [6, 4], [6, 5],
        [7, 3], [7, 4], [7, 5], [7, 7], [8, 7], [9, 7],
      ]),
    ],
    dataTrail: { cells: [...trail], headPosition: head },
    headMode: 'driven',
    expectedTrail: [1, 1, 0, 0],
    ...over,
  });
}

export function a18Solve(o: A18Options = {}): PlacedPiece[] {
  return [
    piece('conveyor', 1, 4, { rotation: E }),
    piece('splitter', 2, 4),
    piece('conveyor', 2, 3, { rotation: N }),
    piece('conveyor', 2, 2, { rotation: N }),
    piece('gear', 2, 1),
    piece('configNode', 3, 1, { configValue: o.upperGate ?? 0 }),
    piece('stamp', 4, 1, { value: o.upperStamp ?? 1 }),
    piece('conveyor', 5, 1, { rotation: E }),
    piece('conveyor', 6, 1, { rotation: E }),
    piece('conveyor', 7, 1, { rotation: E }),
    piece('conveyor', 8, 1, { rotation: E }),
    piece('conveyor', 2, 5, { rotation: S }),
    piece('conveyor', 2, 6, { rotation: S }),
    piece('gear', 2, 7),
    piece('configNode', 3, 7, { configValue: o.lowerGate ?? 1 }),
    piece('stamp', 4, 7, { value: o.lowerStamp ?? 0 }),
    piece('stepper', 5, 7, { direction: o.stepper ?? 'left' }),
    piece('conveyor', 6, 7, { rotation: E }),
  ];
}

// ─── A straight line, Source at (0,0) east to a Terminal ───────────────────
//
// `middle` lists the piece types for cells x = 1..n, all on row 0; a
// Conveyor is laid at rotation 0 (east). The Terminal sits at x = n + 1.
export function line(
  middle: (PieceType | PlacedPiece)[],
  opts: { source?: Partial<PlacedPiece>; terminal?: Partial<PlacedPiece> | null } = {},
): PlacedPiece[] {
  const out: PlacedPiece[] = [pre('source', 0, 0, opts.source ?? {})];
  middle.forEach((m, i) => {
    out.push(typeof m === 'string' ? piece(m, i + 1, 0, { rotation: E }) : { ...m, gridX: i + 1, gridY: 0 });
  });
  if (opts.terminal !== null) out.push(pre('terminal', middle.length + 1, 0, opts.terminal ?? {}));
  return out;
}
