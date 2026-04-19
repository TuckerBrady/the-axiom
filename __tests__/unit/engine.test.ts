import type { PlacedPiece, MachineState } from '../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  calculateStars,
  getDefaultPorts,
  getOutputPorts,
  getInputPorts,
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

// ─── executeMachine ──────────────────────────────────────────────────────────

describe('executeMachine', () => {
  it('signal reaches output on simple linear path', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('c1', 'conveyor', 1, 0),
      makePiece('c2', 'conveyor', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('signal changes direction through Gear', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('c', 'conveyor', 1, 1, { rotation: 90 }),
      makePiece('o', 'terminal', 1, 2, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('Config Node passes when trail value matches configValue', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    // Trail has 1 at head position, configValue=1 → passes
    const steps = executeMachine(makeState(pieces, {
      dataTrail: { cells: [1, 0, 0, 0], headPosition: 0 },
    }));
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('Config Node blocks when trail value mismatches configValue', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    // Trail has 0 at head position, configValue=1 → blocks
    const steps = executeMachine(makeState(pieces, {
      dataTrail: { cells: [0, 0, 0, 0], headPosition: 0 },
    }));
    const cnStep = steps.find(s => s.type === 'configNode');
    expect(cnStep?.success).toBe(false);
  });

  it('Config Node: configValue=1, tapeValue=1 → passes', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [1], outputTape: [-1] }), 0);
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('Config Node: configValue=0, tapeValue=0 → passes', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 0 }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [0], outputTape: [-1] }), 0);
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('Config Node: configValue=1, Scanner writes 0 to trail → blocks', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('sc', 'scanner', 1, 0),
      makePiece('cn', 'configNode', 2, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [0], outputTape: [-1], dataTrail: { cells: [0], headPosition: 0 } }), 0);
    const cnStep = steps.find(s => s.type === 'configNode');
    expect(cnStep?.success).toBe(false);
  });

  it('Config Node: configValue=0, Scanner writes 1 to trail → blocks', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('sc', 'scanner', 1, 0),
      makePiece('cn', 'configNode', 2, 0, { configValue: 0 }),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [1], outputTape: [-1], dataTrail: { cells: [0], headPosition: 0 } }), 0);
    const cnStep = steps.find(s => s.type === 'configNode');
    expect(cnStep?.success).toBe(false);
  });

  it('Config Node passes by default with empty trail and no tape', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    // No tape, empty trail → fallback matches nodeValue → passes
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('Splitter with 2 magnets forks to both outputs', () => {
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('sp', 'splitter', 1, 1, { connectedMagnetSides: ['right', 'bottom'] }),
      makePiece('o1', 'terminal', 2, 1, { isPrePlaced: true }),
      makePiece('c2', 'conveyor', 1, 2, { rotation: 90 }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
    expect(steps.some(s => s.type === 'splitter')).toBe(true);
  });

  it('Splitter with <2 magnets blocks', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('sp', 'splitter', 1, 0, { connectedMagnetSides: ['right'] }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    // Splitter has no outputs → signal never reaches terminal
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(false);
  });

  it('incomplete path results in void', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('c', 'conveyor', 1, 0),
      // No output port — signal lost
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'void')).toBe(true);
  });
});

// ─── autoConnectPhysicsPieces ────────────────────────────────────────────────

describe('autoConnectPhysicsPieces', () => {
  it('connects adjacent pieces with compatible ports', () => {
    const pieces = [
      makePiece('a', 'source', 0, 0),
      makePiece('b', 'conveyor', 1, 0),
    ];
    const wires = autoConnectPhysicsPieces(pieces);
    expect(wires.length).toBeGreaterThan(0);
    expect(wires[0].fromPieceId).toBeDefined();
    expect(wires[0].toPieceId).toBeDefined();
  });

  it('wire direction follows port flow (output→input)', () => {
    // source outputs to the right, conveyor inputs from the left.
    // Wire should flow source → conveyor.
    const pieces = [
      makePiece('conv', 'conveyor', 1, 0),
      makePiece('src', 'source', 0, 0),
    ];
    const wires = autoConnectPhysicsPieces(pieces);
    expect(wires.length).toBe(1);
    expect(wires[0].fromPieceId).toBe('src');
    expect(wires[0].toPieceId).toBe('conv');
  });

  it('does not connect non-adjacent pieces', () => {
    const pieces = [
      makePiece('a', 'source', 0, 0),
      makePiece('b', 'conveyor', 3, 0),
    ];
    const wires = autoConnectPhysicsPieces(pieces);
    expect(wires.length).toBe(0);
  });
});

// ─── canSendTo / canConnect ──────────────────────────────────────────────────

describe('canSendTo', () => {
  const { canSendTo } = require('../../src/game/engine');

  it('returns true for adjacent compatible pieces', () => {
    const a = makePiece('a', 'source', 0, 0);
    const b = makePiece('b', 'conveyor', 1, 0);
    expect(canSendTo(a, b)).toBe(true);
  });

  it('returns false for non-adjacent pieces', () => {
    const a = makePiece('a', 'source', 0, 0);
    const b = makePiece('b', 'conveyor', 3, 0);
    expect(canSendTo(a, b)).toBe(false);
  });
});

// ─── getActivePorts ─────────────────────────────────────────────────────────

describe('getActivePorts', () => {
  const { getActivePorts } = require('../../src/game/engine');

  it('returns union of input and output ports', () => {
    const p = makePiece('c', 'conveyor', 0, 0);
    const ports = getActivePorts(p);
    expect(ports.length).toBeGreaterThan(0);
  });
});

// ─── executeMachine advanced ────────────────────────────────────────────────

describe('executeMachine advanced', () => {
  it('Scanner reads tape value', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('sc', 'scanner', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1, 0], outputTape: [-1, -1] });
    const steps = executeMachine(state, 0);
    const scanStep = steps.find(s => s.type === 'scanner');
    expect(scanStep?.success).toBe(true);
  });

  it('Transmitter writes to output tape', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    expect(state.outputTape![0]).toBe(1);
  });

  it('Counter blocks below threshold', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('ct', 'counter', 1, 0, { threshold: 2, count: 0 }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    const ctStep = steps.find(s => s.type === 'counter');
    expect(ctStep?.success).toBe(false);
  });

  it('Latch write mode stores value', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'write' }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: [-1] });
    executeMachine(state, 0);
    const latch = state.pieces.find(p => p.type === 'latch');
    expect(latch?.storedValue).toBe(1);
  });

  it('Latch read mode blocks when no stored value', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'read', storedValue: null }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    const ltStep = steps.find(s => s.type === 'latch');
    expect(ltStep?.success).toBe(false);
  });

  it('Inverter inverts tape value', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('inv', 'inverter', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [1], outputTape: [-1] }), 0);
    const invStep = steps.find(s => s.type === 'inverter');
    expect(invStep?.success).toBe(true);
    expect(invStep?.message).toContain('Inverted');
  });

  it('Merger accepts signal', () => {
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('m', 'merger', 1, 1),
      makePiece('o', 'terminal', 2, 1, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'merger')).toBe(true);
  });

  it('Bridge passes signal through', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('br', 'bridge', 1, 0),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'bridge')).toBe(true);
  });

  it('returns error when no source', () => {
    const pieces = [makePiece('o', 'terminal', 0, 0)];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'error')).toBe(true);
  });
});

// ─── Latch, Merger, Bridge (Kepler pieces) ──────────────────────────────────

describe('Kepler piece engine behavior', () => {
  it('Latch write mode stores tape value across pulses', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'write' }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, { inputTape: [1, 0], outputTape: [-1, -1] });
    executeMachine(state, 0);
    const latch = state.pieces.find(p => p.type === 'latch');
    expect(latch?.storedValue).toBe(1);
    // Pulse 1
    executeMachine(state, 1);
    expect(latch?.storedValue).toBe(0);
  });

  it('Latch read mode outputs stored value', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'read', storedValue: 1 }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    const ltStep = steps.find(s => s.type === 'latch');
    expect(ltStep?.success).toBe(true);
    expect(ltStep?.message).toContain('READ');
  });

  it('Latch read mode with null stored value blocks', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('lt', 'latch', 1, 0, { latchMode: 'read', storedValue: null }),
      makePiece('o', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    const ltStep = steps.find(s => s.type === 'latch');
    expect(ltStep?.success).toBe(false);
  });

  it('Merger passes signal from left input', () => {
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('c', 'conveyor', 1, 1),
      makePiece('m', 'merger', 2, 1),
      makePiece('o', 'terminal', 3, 1, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'merger')).toBe(true);
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });

  it('Bridge passes signal through horizontal path', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('c1', 'conveyor', 1, 0),
      makePiece('br', 'bridge', 2, 0),
      makePiece('c2', 'conveyor', 3, 0),
      makePiece('o', 'terminal', 4, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'bridge')).toBe(true);
    expect(steps.some(s => s.type === 'terminal' && s.success)).toBe(true);
  });
});

// ─── calculateStars ──────────────────────────────────────────────────────────

describe('calculateStars', () => {
  const success = [{ pieceId: 'o', type: 'terminal', timestamp: 0, success: true }];
  const fail = [{ pieceId: 'x', type: 'void', timestamp: 0, success: false }];

  it('returns 1 on failure (void display)', () => {
    expect(calculateStars(fail, 4, 4, 8)).toBe(1);
  });

  it('returns 3 stars when using 75%+ of tray', () => {
    // 6 of 8 tray pieces = 75%
    expect(calculateStars(success, 6, 4, 8)).toBe(3);
  });

  it('returns 2 stars when using 50-74% of tray', () => {
    // 4 of 8 tray pieces = 50%
    expect(calculateStars(success, 4, 4, 8)).toBe(2);
  });

  it('returns 1 star when using < 50% of tray', () => {
    // 2 of 8 tray pieces = 25%
    expect(calculateStars(success, 2, 4, 8)).toBe(1);
  });

  it('returns 3 stars when all tray pieces used', () => {
    expect(calculateStars(success, 8, 4, 8)).toBe(3);
  });
});
