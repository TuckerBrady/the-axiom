// Pending tests — Config Node gates on an upstream Latch's emitted value.
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.2 (G2).
// Driving levels: K1-3 (Junction 7), K1-4 (Mining Platform Alpha).
//
// PENDING STATUS: `describe.skip` — nothing executes-and-fails. Phase 3 activates.
//
// DISCRIMINATING DESIGN: the test uses a Latch in READ mode whose stored value
// DIFFERS from the input-tape value. The current Config Node gates on the trail/tape
// value; the contract requires it to gate on the Latch's EMITTED value instead.
// A Latch reading stored 1 while the tape carries 0 separates the two behaviors.

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

describe('Config Node reads upstream Latch value (3.2.1)', () => {
  it('[REQ-CONFIG-LATCH-1] passes when the Latch emits a value equal to configValue', () => {
    // Latch READ emits stored 1; tape carries 0; configValue=1.
    // Gate on the Latch value (1 == 1) -> pass. If it gated on the tape (0), it would block.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'read', storedValue: 1 }),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(
      makeState(pieces, {
        inputTape: [0],
        outputTape: [-1],
        dataTrail: { cells: [0], headPosition: 0 },
      }),
      0,
    );
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('[REQ-CONFIG-LATCH-1] blocks when the Latch emits a value not equal to configValue', () => {
    // Latch READ emits stored 0; configValue=1; gate on Latch value (0 != 1) -> block.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'read', storedValue: 0 }),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(
      makeState(pieces, {
        inputTape: [1],
        outputTape: [-1],
        dataTrail: { cells: [1], headPosition: 0 },
      }),
      0,
    );
    const cnStep = steps.find(s => s.type === 'configNode');
    expect(cnStep?.success).toBe(false);
  });
});

describe('Config Node does not default-pass when a Latch value is available (3.2.2)', () => {
  it('[REQ-CONFIG-LATCH-2] with a carried Latch value present, the empty-trail default pass MUST NOT apply', () => {
    // Empty trail (would normally trigger default-pass), but an upstream Latch emits 0
    // and configValue=1. The node MUST evaluate the carried 0 (block), not default-pass.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'read', storedValue: 0 }),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(
      makeState(pieces, { dataTrail: { cells: [], headPosition: 0 } }),
      0,
    );
    const cnStep = steps.find(s => s.type === 'configNode');
    expect(cnStep?.success).toBe(false);
  });
});
