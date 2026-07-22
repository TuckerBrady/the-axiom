// K1-4 BLANK-masking — permanent regression guard for the redesigned level.
// Contract: docs/COMPUTATIONAL_MODEL.md (three-layer) + SPEC_KEPLER_ENGINE.md
// Sections 3.1/3.2 (Latch WRITE carries its value; Config Node gates on the
// carried value rather than falling back to the empty-trail default pass).
//
// GOAL: out[N] = 1 when in[N] == 1, else BLANK. A "transmit active pulses, drop
// idle ones" gate that USES A LATCH in a load-bearing way: the Latch WRITE sets
// carriesLatchValue, which is exactly what forces the downstream Config Node to
// gate on the carried pulse value instead of the (empty) Data Trail. Without the
// Latch, the Config Node would hit the empty-trail default-pass and let 0-pulses
// through, breaking the mask.
//
// VERIFIED LAYOUT (left to right, single row):
//   Source(0,0) -> Latch WRITE(1,0) -> ConfigNode configValue=1(2,0)
//     -> Transmitter(3,0) -> Terminal(4,0)
//
// Per-pulse trace (carriesLatchValue path in engine.ts):
//   Latch WRITE: stores in[N], emits in[N], sets carriesLatchValue=true.
//   ConfigNode: passes iff carried value (in[N]) === 1; else `continue` (blocked).
//   Transmitter: on a passing pulse writes the carried 1 to outputTape[N];
//                a blocked pulse never reaches it, leaving the cell BLANK.

import type { PlacedPiece, MachineState, OutputTapeValue } from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
} from '../../../src/game/engine';

const WRITE: PlacedPiece['latchMode'] = 'write';

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

describe('K1-4 BLANK-masking (Latch WRITE + Config gate)', () => {
  it('out[N] = 1 when in[N]==1, else BLANK — over the full K1-4 tape', () => {
    const inputTape = [1, 0, 0, 1, 1, 0];
    const expectedOutput = [1, BLANK, BLANK, 1, 1, BLANK];

    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: WRITE, storedValue: null }),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('tx', 'transmitter', 3, 0),
      makePiece('o', 'terminal', 4, 0, { isPrePlaced: true }),
    ];

    const state = makeState(pieces, {
      inputTape,
      // Output cells start BLANK (SE-TM-003): a blocked pulse never writes,
      // so the cell stays BLANK and matches an expected BLANK.
      outputTape: inputTape.map(() => BLANK) as OutputTapeValue[],
      dataTrail: { cells: Array(inputTape.length).fill(null), headPosition: 0 },
    });

    for (let pulse = 0; pulse < inputTape.length; pulse++) {
      executeMachine(state, pulse);
    }

    expect(state.outputTape).toEqual(expectedOutput);
  });

  it('the Latch is load-bearing: it sets carriesLatchValue so the 0-pulse is gated, not default-passed', () => {
    // A single 0-pulse with NO latch would hit the empty-trail default-pass on the
    // Config Node and write 0. With the Latch WRITE in front, carriesLatchValue is
    // set, so the Config Node evaluates the carried 0 against gate 1 and BLOCKS.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: WRITE, storedValue: null }),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('tx', 'transmitter', 3, 0),
      makePiece('o', 'terminal', 4, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: [0],
      outputTape: [BLANK],
      dataTrail: { cells: [null], headPosition: 0 },
    });
    const steps = executeMachine(state, 0);
    const cn = steps.find(s => s.type === 'configNode');
    expect(cn?.success).toBe(false);
    expect(state.outputTape![0]).toBe(BLANK);
  });
});
