// Pre-written tests — Canonical Transmitter behavior (Model β).
// Spec: kepler-belt-levels-v2-part1.md §CANONICAL TRANSMITTER BEHAVIOR.
//
// REQ-T-1: Transmitter writes the value carried by the activating signal.
// REQ-T-2: Transmitter MUST NOT write 1 to indicate "signal arrived" when value is 0.
// REQ-T-3: Transmitter activated by signal value 0 MUST write 0.
// REQ-T-4: Unactivated Transmitter leaves tape cell unchanged (initial: null).
//
// K1-5 regression: expectedOutput MUST be [1,0,1,0] under canonical Model β.
// The proposed correction to [1,1,1,1] (REQ-2) was rejected 2026-04-30.

import { getLevelById } from '../../src/game/levels';
import type { PlacedPiece, MachineState } from '../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
} from '../../src/game/engine';

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

// ── K1-5 level definition: expectedOutput field ───────────────────────────────

describe('K1-5 expectedOutput — canonical Model β (REQ-T-1)', () => {
  it('expectedOutput is [1,0,1,0] — Model β canonical value', () => {
    const level = getLevelById('K1-5');
    expect(level).toBeDefined();
    expect(level!.expectedOutput).toEqual([1, 0, 1, 0]);
  });

  it('expectedOutput is NOT [1,1,1,1] — rejected Model α correction (REQ-2)', () => {
    const level = getLevelById('K1-5');
    expect(level!.expectedOutput).not.toEqual([1, 1, 1, 1]);
  });
});

// ── REQ-T-3: Transmitter activated by value-0 signal writes 0 ────────────────

describe('REQ-T-3 — Transmitter writes 0 when signal carries value 0', () => {
  it('Source → Transmitter → Terminal with input 0 produces outputTape[0] = 0', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [0], outputTape: [-1] });
    executeMachine(state, 0);
    // Model β: writes carried value (0). NOT "signal arrived" (1).
    expect(state.outputTape![0]).toBe(0);
  });

  it('Conveyor chain with input 0: Transmitter writes 0', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cv', 'conveyor', 1, 0),
      makePiece('cv2', 'conveyor', 2, 0),
      makePiece('tx', 'transmitter', 3, 0),
      makePiece('o', 'terminal', 4, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [0], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(0);
  });
});

// ── REQ-T-2: Transmitter MUST NOT write 1 as a presence indicator ─────────────

describe('REQ-T-2 — Transmitter does not write 1 when signal value is 0', () => {
  it('input 0 through passthrough chain: outputTape[0] is 0, not 1', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [0], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).not.toBe(1);
  });
});

// ── REQ-T-4: Unactivated Transmitter does not write ──────────────────────────

describe('REQ-T-4 — Unactivated Transmitter leaves tape cell unchanged', () => {
  it('Config Node blocks → downstream Transmitter not activated → outputTape sentinel unchanged', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: [0],
      outputTape: [-1],
      // trail=0 ≠ configValue=1 → Config Node blocks
      dataTrail: { cells: [0], headPosition: 0 },
    });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(-1);
  });
});

// ── K1-5 four-pulse alternating tape: Model β vs Model α distinction ──────────
//
// The alternating tape [1,0,1,0] distinguishes the two models:
//   Model α (rejected): Path B always delivers "signal arrived" = 1 → output [1,1,1,1].
//   Model β (canonical): Path B delivers signal value; on input=0, value=0 → output [1,0,1,0].
//
// This simplified passthrough test verifies Model β on the Transmitter in isolation.
// The full K1-5 Splitter/Merger topology test requires engine support for those pieces.

describe('K1-5 Model β — alternating [1,0,1,0] tape: Transmitter writes carried value', () => {
  it('Source → Conveyor → Transmitter → Terminal: output tracks input on every pulse', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cv', 'conveyor', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const inputs = [1, 0, 1, 0];
    const state = makeState(pieces, {
      inputTape: inputs,
      outputTape: inputs.map(() => -1 as number),
    });
    for (let pulse = 0; pulse < inputs.length; pulse++) {
      executeMachine(state, pulse);
    }
    // Model β: Transmitter writes 0 on pulses 1 and 3 (input=0).
    expect(state.outputTape).toEqual([1, 0, 1, 0]);
    // Confirm this is NOT the rejected Model α result.
    expect(state.outputTape).not.toEqual([1, 1, 1, 1]);
  });
});
