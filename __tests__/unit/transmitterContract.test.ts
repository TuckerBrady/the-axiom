// Behavioral tests for TRANSMITTER_WRITE_CONTRACT.md.
// Each test is tagged with the contract clause it verifies.
//
// The headline regression test is [3.3] — pre-Prompt-100, the engine
// wrote `tapeValue ?? 0` (the raw input tape value) regardless of any
// upstream Inverter transformation. After Prompt 100, the engine
// carries a `signalValue` through the BFS traversal and the
// Transmitter writes the carried (post-transformation) value.

import type { PlacedPiece, MachineState } from '../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
} from '../../src/game/engine';

function makePiece(
  id: string, type: PlacedPiece['type'], gridX: number, gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  const category =
    ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'].includes(type)
      ? 'protocol' as const : 'physics' as const;
  return {
    id, type, category, gridX, gridY,
    ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false,
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

describe('TRANSMITTER_WRITE_CONTRACT — Section 1: Write Timing', () => {
  it('[1.1] Transmitter writes at beam arrival (between Conveyor and Terminal in step order)', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cv', 'conveyor', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    const steps = executeMachine(state, 0);
    const conveyorIdx = steps.findIndex(s => s.type === 'conveyor');
    const txIdx = steps.findIndex(s => s.type === 'transmitter');
    const terminalIdx = steps.findIndex(s => s.type === 'terminal');
    expect(conveyorIdx).toBeGreaterThanOrEqual(0);
    expect(txIdx).toBeGreaterThan(conveyorIdx);
    expect(terminalIdx).toBeGreaterThan(txIdx);
  });

  it('[1.5] write is not retracted by subsequent void termination', () => {
    // Transmitter sits before a Config Node that blocks. Even though
    // the pulse void-terminates (no terminal hit), the write persists.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
    ];
    const state = makeState(pieces, {
      inputTape: [1],
      outputTape: [-1],
      // trail[0] = 0, configValue = 1 → Config Node blocks.
      dataTrail: { cells: [0], headPosition: 0 },
    });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);
  });
});

describe('TRANSMITTER_WRITE_CONTRACT — Section 2: Placement-Order Semantics', () => {
  it('[2.1] Transmitter upstream of failing Config Node still writes', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: [1],
      outputTape: [-1],
      dataTrail: { cells: [0], headPosition: 0 }, // trail mismatches gate
    });
    const steps = executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);
    // And the Config Node should have failed (sanity check the setup).
    expect(steps.find(s => s.type === 'configNode')?.success).toBe(false);
  });

  it('[2.2] Transmitter downstream of failing Config Node does NOT write', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: [1],
      outputTape: [-1],
      dataTrail: { cells: [0], headPosition: 0 }, // trail mismatches gate
    });
    executeMachine(state, 0);
    // Config Node blocks → BFS never enqueues neighbors → Transmitter
    // is never visited → outputTape stays at the initial sentinel.
    expect(state.outputTape![0]).toBe(-1);
  });
});

describe('TRANSMITTER_WRITE_CONTRACT — Section 3: Written Value', () => {
  it('[3.1] [3.2] passthrough chain: Transmitter writes the input tape value', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cv', 'conveyor', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    {
      const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
      executeMachine(state, 0);
      expect(state.outputTape![0]).toBe(1);
    }
    {
      const state = makeState(pieces, { inputTape: [0], outputTape: [-1] });
      executeMachine(state, 0);
      expect(state.outputTape![0]).toBe(0);
    }
  });

  it('[3.3] HEADLINE: upstream Inverter flips the written value', () => {
    // This is the regression test for the Prompt-100 bug fix.
    // Pre-fix: outputTape[0] === 1 (raw tapeValue, ignoring Inverter).
    // Post-fix: outputTape[0] === 0 (carried signal value, post-flip).
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('inv', 'inverter', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    {
      const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
      executeMachine(state, 0);
      expect(state.outputTape![0]).toBe(0);
    }
    {
      const state = makeState(pieces, { inputTape: [0], outputTape: [-1] });
      executeMachine(state, 0);
      expect(state.outputTape![0]).toBe(1);
    }
  });

  it('[3.3] two Inverters in series compose: 1 → 0 → 1', () => {
    // Non-trivial check that signalValue propagates through multiple
    // transformers, not just one. If signalValue were re-derived from
    // tapeValue at each piece, this would write 0 (one flip).
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('inv1', 'inverter', 1, 0),
      makePiece('inv2', 'inverter', 2, 0),
      makePiece('tx', 'transmitter', 3, 0),
      makePiece('o', 'terminal', 4, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);
  });

  it('[3.4] Transmitter does NOT read from Data Trail (signal vs. trail divergence)', () => {
    // Setup: input 1, Inverter flips to 0, trail[0] is 1. If the
    // Transmitter read from trail, it would write 1; if from signal,
    // it writes 0. The contract says signal.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('inv', 'inverter', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: [1],
      outputTape: [-1],
      dataTrail: { cells: [1], headPosition: 0 }, // intentionally mismatches signal
    });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(0); // signal, not trail
  });
});

describe('TRANSMITTER_WRITE_CONTRACT — Section 4: Output Tape Indexing', () => {
  it('[4.1] writes to outputTape[pulseIndex] (pulse 3 writes index 3)', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: [9, 9, 9, 1],         // sentinels except at index 3
      outputTape: [-1, -1, -1, -1],
    });
    executeMachine(state, 3);
    expect(state.outputTape![3]).toBe(1);
    // Other positions untouched.
    expect(state.outputTape![0]).toBe(-1);
    expect(state.outputTape![1]).toBe(-1);
    expect(state.outputTape![2]).toBe(-1);
  });

  it('[4.2] multiple Transmitters: last write wins at the same tape position', () => {
    // Chain: Source -> Tx_A -> Inverter -> Tx_B -> Terminal.
    // Input 1. Tx_A writes 1 (signal at that point). Inverter flips
    // signal to 0. Tx_B writes 0, overwriting Tx_A's earlier write.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('txA', 'transmitter', 1, 0),
      makePiece('inv', 'inverter', 2, 0),
      makePiece('txB', 'transmitter', 3, 0),
      makePiece('o', 'terminal', 4, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(0);
  });

  it('[4.4] write past expectedOutput.length still occurs (Output Tape grows or accommodates)', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    // expectedOutput length 1 but pulse 5; outputTape pre-sized.
    const state = makeState(pieces, {
      inputTape: [9, 9, 9, 9, 9, 1],
      outputTape: [-1, -1, -1, -1, -1, -1],
    });
    executeMachine(state, 5);
    expect(state.outputTape![5]).toBe(1);
  });
});

describe('TRANSMITTER_WRITE_CONTRACT — Section 5: Void Path Interaction', () => {
  it('[5.1] [5.3] Transmitter upstream of a void blocker still writes; void step appears', () => {
    // Counter at threshold 2 with count 0 → blocks first call. The
    // pulse never reaches a Terminal, so the BFS exits with a void
    // step. The Transmitter ran first and its write persists.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('ct', 'counter', 2, 0, { threshold: 2, count: 0 }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    const steps = executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);            // [5.1] write persisted
    expect(steps.some(s => s.type === 'void')).toBe(true); // [5.3] void step pushed
  });

  it('[5.2] Transmitter downstream of a void blocker does NOT write', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('ct', 'counter', 1, 0, { threshold: 2, count: 0 }),
      makePiece('tx', 'transmitter', 2, 0),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(-1);
  });
});

describe('TRANSMITTER_WRITE_CONTRACT — Section 2 (extended): multi-pulse upstream semantics', () => {
  it('[2.3] multi-pulse: Transmitter upstream of Config Node writes on every pulse regardless of gate outcome', () => {
    // 4-pulse tape. Config Node gate value = 1. Trail pre-populated so
    // pulses 0 and 1 block (trail=0 ≠ gate=1) and pulses 2 and 3 pass
    // (trail=1 = gate=1). Transmitter is upstream of the gate, so it
    // writes its signal value on every pulse regardless of whether the
    // gate blocks or passes downstream.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const inputs = [1, 0, 1, 0];
    const state = makeState(pieces, {
      inputTape: inputs,
      outputTape: inputs.map(() => -1),
      // trail[0]=0, trail[1]=0 → gate blocks pulses 0 and 1
      // trail[2]=1, trail[3]=1 → gate passes pulses 2 and 3
      dataTrail: { cells: [0, 0, 1, 1], headPosition: 0 },
    });
    for (let pulse = 0; pulse < inputs.length; pulse++) {
      executeMachine(state, pulse);
    }
    // Transmitter always writes its carried signal value. Gate blocking
    // downstream does NOT retroactively prevent the write.
    expect(state.outputTape).toEqual([1, 0, 1, 0]);
  });
});

describe('TRANSMITTER_WRITE_CONTRACT — Section 6: 8-pulse sequence end-to-end', () => {
  it('[3.3 + 4.1] [Source → Inverter → Transmitter → Terminal] across 8 pulses', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('inv', 'inverter', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const inputs = [1, 0, 1, 1, 0, 0, 1, 0];
    const expected = [0, 1, 0, 0, 1, 1, 0, 1];
    const state = makeState(pieces, {
      inputTape: inputs,
      outputTape: inputs.map(() => -1),
    });
    for (let pulse = 0; pulse < inputs.length; pulse++) {
      executeMachine(state, pulse);
    }
    expect(state.outputTape).toEqual(expected);
  });
});
