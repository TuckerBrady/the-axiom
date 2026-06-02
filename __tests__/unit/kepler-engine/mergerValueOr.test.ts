// Merger value-level OR (no silent BFS path drop).
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.3 (G3).
// Driving levels: K1-5 (Resupply Chain), K1-6 (Colonist Hub), K1-8 (Transit Gate).
//
// ACTIVATED (Phase 3, G3): the single-path value-fidelity suite is un-skipped and
// the two-path divergent-value suite is realized against a Splitter -> (Path A,
// Path B) -> Merger board built here, per the file's standing note that "Phase 3
// builds the board geometry". The engine now uses deferred Merger evaluation
// (SPEC_KEPLER_ENGINE.md Section 3.3): a Merger holds out of the BFS visited-set
// until its inbound paths arrive, then emits their OR. Assertions are unchanged
// from the pending phase. The remaining it.todo (K1-5 end-to-end) stays a todo —
// it depends on the actual K1-5 level machine (a Scanner/tape-gated Path A), a
// level-design concern rather than an engine-execution one.

import type { PlacedPiece, MachineState } from '../../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
} from '../../../src/game/engine';

function makePiece(
  id: string,
  type: PlacedPiece['type'],
  gridX: number,
  gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  const category =
    ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'].includes(type)
      ? ('protocol' as const)
      : ('physics' as const);
  return {
    id,
    type,
    category,
    gridX,
    gridY,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: false,
    ...overrides,
  };
}

function makeState(pieces: PlacedPiece[], overrides?: Partial<MachineState>): MachineState {
  return {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { cells: [], headPosition: 0 },
    configuration: 0,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    ...overrides,
  };
}

// ── 3.3.1 — Merger emits the carried value (OR baseline, single delivering path) ─

describe('Merger value fidelity (3.3.1, 3.3.3)', () => {
  it('[REQ-MERGER-OR-1] a single delivering path carrying 1 makes the Merger emit 1', () => {
    // Source -> Conveyor -> Merger(left input) -> Transmitter -> Terminal.
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('c', 'conveyor', 1, 1),
      makePiece('m', 'merger', 2, 1),
      makePiece('tx', 'transmitter', 3, 1),
      makePiece('o', 'terminal', 4, 1, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);
  });

  it('[REQ-MERGER-OR-3] a single delivering path carrying 0 makes the Merger emit 0 (not a presence 1)', () => {
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('c', 'conveyor', 1, 1),
      makePiece('m', 'merger', 2, 1),
      makePiece('tx', 'transmitter', 3, 1),
      makePiece('o', 'terminal', 4, 1, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [0], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(0);
  });
});

// ── 3.3.2 / 3.3.3 — two paths converge; second path MUST NOT be dropped ───────
// Board geometry (built here per the file note). A Splitter forks the seeded
// Source signal into two paths that reconverge at a Merger's two perpendicular
// inputs. Path A runs straight into the Merger's LEFT input via the piece at
// (2,1); Path B turns up and over (gear corners) into the Merger's TOP input.
//
//        (1,0)gb1 -> (2,0)cb -> (3,0)gb2
//          ^                       |
//   s -> sp --(Path A piece @2,1)-> m -> tx -> o
//
// Path A's piece is swapped per test to control the two path values:
//   - inverter: Path A carries 1 - source, Path B carries source (divergent).
//   - latch(read, empty): Path A blocks upstream (delivers nothing).
//   - conveyor: Path A carries source verbatim.
function buildForkBoard(
  pathAPiece: PlacedPiece,
  overrides: Partial<MachineState>,
): MachineState {
  const pieces = [
    makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
    makePiece('sp', 'splitter', 1, 1, { connectedMagnetSides: ['top', 'right'] }),
    pathAPiece, // (2,1) -> Merger LEFT input
    makePiece('gb1', 'gear', 1, 0), // Path B corner: up from Splitter
    makePiece('cb', 'conveyor', 2, 0), // Path B straight
    makePiece('gb2', 'gear', 3, 0), // Path B corner: down into Merger TOP
    makePiece('m', 'merger', 3, 1),
    makePiece('tx', 'transmitter', 4, 1),
    makePiece('o', 'terminal', 5, 1, { isPrePlaced: true }),
  ];
  return makeState(pieces, overrides);
}

describe('Merger two-path OR (3.3.2, 3.3.3)', () => {
  it('[REQ-MERGER-OR-2] Splitter forks two paths into a Merger; the first-visited path is blocked ' +
    'upstream (delivers nothing) and the second carries 1 — the Merger MUST emit 1 ' +
    '(the second path is NOT dropped by the BFS visited-set)', () => {
    // Path A is a READ Latch with nothing stored: it blocks, delivering nothing.
    // Path B (bypass) carries source value 1. The lone delivering path makes the
    // Merger emit 1; the blocked path contributes no operand and never forces 0.
    const pathA = makePiece('la', 'latch', 2, 1, { latchMode: 'read', storedValue: null });
    const state = buildForkBoard(pathA, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);
  });

  it('[REQ-MERGER-OR-1] both inbound Merger paths deliver 0 — the Merger MUST emit 0', () => {
    // Source seeds 0; Path A (plain conveyor) and Path B both deliver 0. OR = 0.
    const pathA = makePiece('ca', 'conveyor', 2, 1);
    const state = buildForkBoard(pathA, { inputTape: [0], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(0);
  });

  it('[REQ-MERGER-OR-1] one inbound path delivers 1 and the other delivers 0 — the Merger MUST emit 1 (OR)', () => {
    // Source seeds 1. Path A inverts to 0 and — being the shorter path — reaches
    // the Merger FIRST, the exact ordering that made the buggy visited-set emit 0
    // and drop Path B's 1. With deferred evaluation the Merger ORs both: 0 | 1 = 1.
    const pathA = makePiece('ia', 'inverter', 2, 1);
    const state = buildForkBoard(pathA, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);
  });
});

// ── K1-5 end-to-end regression (Model beta identity over the OR topology) ─────

describe('Merger OR — K1-5 Resupply Chain end-to-end', () => {
  it.todo(
    '[REQ-MERGER-OR-1] K1-5 (Splitter -> gated Path A + bypass Path B -> Merger) produces ' +
      'expectedOutput [1,0,1,0] for inputTape [1,0,1,0] under Transmitter Model beta',
  );
});
