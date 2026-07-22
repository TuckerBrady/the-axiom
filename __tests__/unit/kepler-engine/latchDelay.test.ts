// Pending tests — Latch DELAY mode (true D flip-flop).
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.1 (G1).
// Driving levels: K1-9 (shift register), K1-10 (temporal AND).
//
// ACTIVATED (Phase 3, G1): the executable suites below run and the engine
// implements Latch DELAY mode per SPEC_KEPLER_ENGINE.md Section 3.1. The two
// it.todo stubs (3.1.1 tap cycle, K1-10 capstone) remain todo — they are
// board-interaction and level-design concerns, not engine-execution concerns.
// Assertions are unchanged from the pending phase.
//
// TYPE NOTE: `latchMode: 'delay'` is now a member of PlacedPiece['latchMode']
// ('write' | 'read' | 'delay'), so the forward-compatible cast was removed.

import type { PlacedPiece, MachineState } from '../../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
  nextLatchMode,
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

// ── 3.1.1 REQ-LATCH-MODE-1 — three-state tap cycle ───────────────────────────
// The tap cycle is a board-interaction concern (GameplayScreen/BoardGrid), not the
// engine execution path, so it is encoded as a behavioral stub here.

describe('Latch mode cycle (3.1.1)', () => {
  it('[REQ-LATCH-MODE-1] nextLatchMode cycles write -> read -> delay -> write', () => {
    expect(nextLatchMode('write')).toBe('read');
    expect(nextLatchMode('read')).toBe('delay');
    expect(nextLatchMode('delay')).toBe('write');
  });

  it('[REQ-LATCH-MODE-1] an unset mode is treated as write, so the first tap yields read', () => {
    expect(nextLatchMode(undefined)).toBe('read');
  });

  it('[REQ-LATCH-MODE-1] three taps return to the starting mode', () => {
    expect(nextLatchMode(nextLatchMode(nextLatchMode('write')))).toBe('write');
  });
});

// ── 3.1.2 / 3.1.3 / 3.1.5 — DELAY emits the previous pulse value, shift register ─

describe('Latch DELAY — shift register (3.1.2, 3.1.3, 3.1.5)', () => {
  it('[REQ-LATCH-DELAY-1] emits input[N-1] each pulse; [REQ-LATCH-DELAY-2] emits 0 on pulse 0', () => {
    // Source -> Latch(delay) -> Transmitter -> Terminal. A DELAY Latch always passes
    // (REQ-LATCH-DELAY-4), so the Transmitter writes the delayed value every pulse.
    // This is exactly the K1-9 shift register: output[N] = input[N-1], output[0] = 0.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: DELAY, storedValue: null }),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const inputs = [0, 1, 1, 0, 1, 0];
    const state = makeState(pieces, {
      inputTape: inputs,
      outputTape: inputs.map(() => -1 as number),
      dataTrail: { cells: Array(inputs.length).fill(null), headPosition: 0 },
    });
    for (let pulse = 0; pulse < inputs.length; pulse++) {
      executeMachine(state, pulse);
    }
    // K1-9 canonical expectedOutput.
    expect(state.outputTape).toEqual([0, 0, 1, 1, 0, 1]);
  });

  it('[REQ-LATCH-DELAY-2] on the first activated pulse a DELAY Latch emits 0', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: DELAY, storedValue: null }),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    // Input is 1 on pulse 0, but nothing has been captured yet, so emit 0.
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(0);
  });

  it('[REQ-LATCH-DELAY-3] capture is read-before-write: pulse N emits prior input, then stores current', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: DELAY, storedValue: null }),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const inputs = [1, 0];
    const state = makeState(pieces, {
      inputTape: inputs,
      outputTape: inputs.map(() => -1 as number),
    });
    executeMachine(state, 0); // emit 0 (nothing stored), then store input[0]=1
    executeMachine(state, 1); // emit stored 1 (input[0]), then store input[1]=0
    expect(state.outputTape).toEqual([0, 1]);
  });
});

// ── 3.1.4 — DELAY always passes ──────────────────────────────────────────────

describe('Latch DELAY — flow (3.1.4)', () => {
  it('[REQ-LATCH-DELAY-4] a DELAY Latch never blocks, even with nothing stored', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: DELAY, storedValue: null }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [1], outputTape: [-1] }), 0);
    const ltStep = steps.find(s => s.type === 'latch');
    expect(ltStep?.success).toBe(true);
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });
});

// ── 3.1.6 — run independence ─────────────────────────────────────────────────

describe('Latch DELAY — run independence (3.1.6)', () => {
  it('[REQ-LATCH-RESET-1] stored state is cleared at run start so DELAY emits 0 on pulse 0 of every run', () => {
    // resetRunState (or the run-init path that precedes pulse 0) is expected by Phase
    // 3 to clear storedValue. After a prior run leaves a value stored, a fresh run
    // MUST still emit 0 on its first pulse.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resetRunState: ((state: MachineState) => void) | undefined =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (require('../../../src/game/engine') as any).resetRunState;

    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: DELAY, storedValue: 1 }),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    resetRunState!(state);
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(0);
  });
});

// ── 3.1.7 — pre-placed Latch default mode ────────────────────────────────────

describe('Latch pre-placement default (3.1.7)', () => {
  it('[REQ-LATCH-PREPLACE-1] a Latch with unset latchMode is treated as write (stores its input)', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      // latchMode intentionally omitted -> engine default must be 'write'.
      makePiece('lt', 'latch', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    const latch = state.pieces.find(p => p.type === 'latch');
    expect(latch?.storedValue).toBe(1);
  });
});

// ── K1-10 capstone (temporal AND) depends on DELAY — end-to-end deferred ──────

describe('Latch DELAY — K1-10 capstone dependency', () => {
  it.todo('[REQ-LATCH-DELAY-1] K1-10 temporal AND (output[N]=input[N] AND input[N-1]) is realized via DELAY Latch + Config gate (level-design phase)');
});
