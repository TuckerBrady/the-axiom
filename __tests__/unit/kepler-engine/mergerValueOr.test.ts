// Pending tests — Merger value-level OR (no silent BFS path drop).
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.3 (G3).
// Driving levels: K1-5 (Resupply Chain), K1-6 (Colonist Hub), K1-8 (Transit Gate).
//
// PENDING STATUS: `describe.skip` for the realizable single-path value-fidelity
// cases; `it.todo` for the two-path divergent-value cases whose board topology
// Phase 3 builds against the stated assertion. Nothing executes-and-fails.

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

describe.skip('Merger value fidelity (3.3.1, 3.3.3)', () => {
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
// These require a Splitter -> (gated Path A, bypass Path B) -> Merger topology.
// Phase 3 builds the board geometry; the assertions below are the contract.

describe('Merger two-path OR (3.3.2, 3.3.3)', () => {
  it.todo(
    '[REQ-MERGER-OR-2] Splitter forks two paths into a Merger; the first-visited path is blocked ' +
      'upstream (delivers nothing) and the second carries 1 — the Merger MUST emit 1 ' +
      '(the second path is NOT dropped by the BFS visited-set)',
  );
  it.todo(
    '[REQ-MERGER-OR-1] both inbound Merger paths deliver 0 — the Merger MUST emit 0',
  );
  it.todo(
    '[REQ-MERGER-OR-1] one inbound path delivers 1 and the other delivers 0 — the Merger MUST emit 1 (OR)',
  );
});

// ── K1-5 end-to-end regression (Model beta identity over the OR topology) ─────

describe('Merger OR — K1-5 Resupply Chain end-to-end', () => {
  it.todo(
    '[REQ-MERGER-OR-1] K1-5 (Splitter -> gated Path A + bypass Path B -> Merger) produces ' +
      'expectedOutput [1,0,1,0] for inputTape [1,0,1,0] under Transmitter Model beta',
  );
});
