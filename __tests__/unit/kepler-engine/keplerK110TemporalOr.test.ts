// K1-10 temporal-OR boss — permanent regression guard for the redesigned level.
// Contract: SPEC_KEPLER_ENGINE.md Sections 3.1 (Latch DELAY = D flip-flop) and
// 3.3 (Merger deferred-evaluation OR over converging paths).
//
// GOAL: out[N] = in[N] OR in[N-1], with out[0] = in[0] OR 0 = in[0]. Real 0/1
// output (no BLANK).
//
// VERIFIED LAYOUT (the proven fork-board geometry from mergerValueOr.test.ts,
// with a DELAY Latch on Path A):
//
//        (1,0)gb1 -> (2,0)cb -> (3,0)gb2
//          ^                       |
//   s -> sp --(2,1)Latch DELAY---> m -> tx -> o
//        (1,1)                   (3,1) (4,1) (5,1)
//
//   Source(0,1) seeds in[N].
//   Splitter(1,1) connectedMagnetSides ['top','right']: forks into Path A (right,
//     row 1) and Path B (top, row 0).
//   Path A: Latch DELAY(2,1) emits in[N-1] (0 on pulse 0), stores in[N]. Outputs
//     right into the Merger's LEFT input.
//   Path B: gear(1,0) up, conveyor(2,0), gear(3,0) down into the Merger's TOP
//     input — carries in[N] verbatim.
//   Merger(3,1) ORs the two arrivals: in[N] OR in[N-1].
//   Transmitter(4,1) writes the merged value; Terminal(5,1).
//
// NOTE: executeMachine is called once per pulse WITHOUT resetRunState between
// pulses, so the DELAY Latch's storedValue persists across pulses (the cross-pulse
// memory). Initial storedValue is null so pulse 0 emits 0.

import type { PlacedPiece, MachineState, OutputTapeValue } from '../../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
} from '../../../src/game/engine';

const DELAY: PlacedPiece['latchMode'] = 'delay';

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

describe('K1-10 temporal-OR (Splitter -> DELAY Latch + bypass -> Merger)', () => {
  it('out[N] = in[N] OR in[N-1] over the full K1-10 tape', () => {
    const inputTape = [0, 1, 0, 0, 1, 0, 0, 0, 1, 1];
    const expectedOutput = [0, 1, 1, 0, 1, 1, 0, 0, 1, 1];

    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('sp', 'splitter', 1, 1, { connectedMagnetSides: ['top', 'right'] }),
      // Path A: DELAY Latch carries in[N-1] into the Merger LEFT input.
      makePiece('la', 'latch', 2, 1, { latchMode: DELAY, storedValue: null }),
      // Path B: up-and-over, carries in[N] into the Merger TOP input.
      makePiece('gb1', 'gear', 1, 0),
      makePiece('cb', 'conveyor', 2, 0),
      makePiece('gb2', 'gear', 3, 0),
      makePiece('m', 'merger', 3, 1),
      makePiece('tx', 'transmitter', 4, 1),
      makePiece('o', 'terminal', 5, 1, { isPrePlaced: true }),
    ];

    const state = makeState(pieces, {
      inputTape,
      // Seed cells to -1 (neither 0 nor 1). The Transmitter overwrites every cell
      // on this real 0/1 run, so a missed write would surface as -1, not a false
      // 0/1 match.
      outputTape: inputTape.map(() => -1) as OutputTapeValue[],
    });

    for (let pulse = 0; pulse < inputTape.length; pulse++) {
      executeMachine(state, pulse);
    }

    expect(state.outputTape).toEqual(expectedOutput);
  });
});
