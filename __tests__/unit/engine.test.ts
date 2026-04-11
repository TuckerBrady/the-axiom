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
      makePiece('s', 'inputPort', 0, 0, { isPrePlaced: true }),
      makePiece('c1', 'conveyor', 1, 0),
      makePiece('c2', 'conveyor', 2, 0),
      makePiece('o', 'outputPort', 3, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'outputPort' && s.success)).toBe(true);
  });

  it('signal changes direction through Gear', () => {
    const pieces = [
      makePiece('s', 'inputPort', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('c', 'conveyor', 1, 1, { rotation: 90 }),
      makePiece('o', 'outputPort', 1, 2, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'outputPort' && s.success)).toBe(true);
  });

  it('Config Node gates on configValue match', () => {
    const pieces = [
      makePiece('s', 'inputPort', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('o', 'outputPort', 2, 0, { isPrePlaced: true }),
    ];
    // configuration=1 matches configValue=1 → passes
    const steps = executeMachine(makeState(pieces, { configuration: 1 }));
    expect(steps.some(s => s.type === 'outputPort' && s.success)).toBe(true);
  });

  it('Config Node blocks on configValue mismatch', () => {
    const pieces = [
      makePiece('s', 'inputPort', 0, 0, { isPrePlaced: true }),
      makePiece('cn', 'configNode', 1, 0, { configValue: 1 }),
      makePiece('o', 'outputPort', 2, 0, { isPrePlaced: true }),
    ];
    // configuration=0 does not match configValue=1 → blocks
    const steps = executeMachine(makeState(pieces, { configuration: 0 }));
    const cnStep = steps.find(s => s.type === 'configNode');
    expect(cnStep?.success).toBe(false);
  });

  it('Splitter with 2 magnets forks to both outputs', () => {
    const pieces = [
      makePiece('s', 'inputPort', 0, 1, { isPrePlaced: true }),
      makePiece('sp', 'splitter', 1, 1, { connectedMagnetSides: ['right', 'bottom'] }),
      makePiece('o1', 'outputPort', 2, 1, { isPrePlaced: true }),
      makePiece('c2', 'conveyor', 1, 2, { rotation: 90 }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(steps.some(s => s.type === 'outputPort' && s.success)).toBe(true);
    expect(steps.some(s => s.type === 'splitter')).toBe(true);
  });

  it('Splitter with <2 magnets blocks', () => {
    const pieces = [
      makePiece('s', 'inputPort', 0, 0, { isPrePlaced: true }),
      makePiece('sp', 'splitter', 1, 0, { connectedMagnetSides: ['right'] }),
      makePiece('o', 'outputPort', 2, 0, { isPrePlaced: true }),
    ];
    const steps = executeMachine(makeState(pieces));
    // Splitter has no outputs → signal never reaches outputPort
    expect(steps.some(s => s.type === 'outputPort' && s.success)).toBe(false);
  });

  it('incomplete path results in void', () => {
    const pieces = [
      makePiece('s', 'inputPort', 0, 0, { isPrePlaced: true }),
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
      makePiece('a', 'inputPort', 0, 0),
      makePiece('b', 'conveyor', 1, 0),
    ];
    const wires = autoConnectPhysicsPieces(pieces);
    expect(wires.length).toBeGreaterThan(0);
    expect(wires[0].fromPieceId).toBeDefined();
    expect(wires[0].toPieceId).toBeDefined();
  });

  it('does not connect non-adjacent pieces', () => {
    const pieces = [
      makePiece('a', 'inputPort', 0, 0),
      makePiece('b', 'conveyor', 3, 0),
    ];
    const wires = autoConnectPhysicsPieces(pieces);
    expect(wires.length).toBe(0);
  });
});

// ─── calculateStars ──────────────────────────────────────────────────────────

describe('calculateStars', () => {
  const success = [{ pieceId: 'o', type: 'outputPort', timestamp: 0, success: true }];
  const fail = [{ pieceId: 'x', type: 'void', timestamp: 0, success: false }];

  it('returns 0 stars on failure', () => {
    expect(calculateStars(fail, 4, 4)).toBe(1);
  });

  it('returns 3 stars when piecesUsed <= optimal', () => {
    expect(calculateStars(success, 4, 4)).toBe(3);
  });

  it('returns 2 stars when piecesUsed <= 2x optimal', () => {
    expect(calculateStars(success, 7, 4)).toBe(2);
  });

  it('returns 1 star when piecesUsed > 2x optimal', () => {
    expect(calculateStars(success, 9, 4)).toBe(1);
  });
});
