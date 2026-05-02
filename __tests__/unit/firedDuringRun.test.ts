// Unit tests for firedDuringRun tracking and evaluateRequiredPieces.
// Spec: kepler-belt-levels-v2-part2.md §CANONICAL REQUIREDPIECES ENFORCEMENT.
// Dev implementation prompt: Kepler v2 Engagement Check (2026-05-01).

import type { PlacedPiece, MachineState, LevelDefinition } from '../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
  resetRunState,
  evaluateRequiredPieces,
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

function makeLevel(requiredPieces?: LevelDefinition['requiredPieces']): LevelDefinition {
  return {
    id: 'TEST-1',
    name: 'Test Level',
    sector: 'kepler',
    description: '',
    cogsLine: '',
    gridWidth: 5,
    gridHeight: 5,
    prePlacedPieces: [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [{ type: 'reach_output' }],
    optimalPieces: 1,
    requiredPieces,
  };
}

// ── resetRunState ─────────────────────────────────────────────────────────────

describe('resetRunState', () => {
  it('sets firedDuringRun to false on all pieces', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { firedDuringRun: true }),
      makePiece('cv', 'conveyor', 1, 0, { firedDuringRun: true }),
      makePiece('o', 'terminal', 2, 0, { firedDuringRun: true }),
    ];
    resetRunState(pieces);
    expect(pieces.every(p => p.firedDuringRun === false)).toBe(true);
  });

  it('handles pieces with no prior firedDuringRun (undefined → false)', () => {
    const piece = makePiece('s', 'source', 0, 0);
    expect(piece.firedDuringRun).toBeUndefined();
    resetRunState([piece]);
    expect(piece.firedDuringRun).toBe(false);
  });

  it('is idempotent — calling twice leaves all false', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { firedDuringRun: true }),
    ];
    resetRunState(pieces);
    resetRunState(pieces);
    expect(pieces[0].firedDuringRun).toBe(false);
  });
});

// ── firedDuringRun flag set by executeMachine ─────────────────────────────────

describe('firedDuringRun set during execution', () => {
  it('becomes true on pieces activated by signal', () => {
    const source = makePiece('s', 'source', 0, 0, { isPrePlaced: true });
    const conveyor = makePiece('cv', 'conveyor', 1, 0);
    const terminal = makePiece('o', 'terminal', 2, 0, { isPrePlaced: true });
    const pieces = [source, conveyor, terminal];
    const state = makeState(pieces);
    resetRunState(pieces);
    executeMachine(state, 0);
    expect(source.firedDuringRun).toBe(true);
    expect(conveyor.firedDuringRun).toBe(true);
    expect(terminal.firedDuringRun).toBe(true);
  });

  it('stays false for pieces not reached by signal', () => {
    const source = makePiece('s', 'source', 0, 0, { isPrePlaced: true });
    const reachable = makePiece('cv', 'conveyor', 1, 0);
    const unreachable = makePiece('cv2', 'conveyor', 0, 4);
    const terminal = makePiece('o', 'terminal', 2, 0, { isPrePlaced: true });
    const pieces = [source, reachable, unreachable, terminal];
    const state = makeState(pieces);
    resetRunState(pieces);
    executeMachine(state, 0);
    expect(unreachable.firedDuringRun).toBe(false);
  });

  it('resets between runs via resetRunState', () => {
    const source = makePiece('s', 'source', 0, 0, { isPrePlaced: true });
    const conveyor = makePiece('cv', 'conveyor', 1, 0);
    const terminal = makePiece('o', 'terminal', 2, 0, { isPrePlaced: true });
    const pieces = [source, conveyor, terminal];
    const state = makeState(pieces);

    // Run 1
    resetRunState(pieces);
    executeMachine(state, 0);
    expect(conveyor.firedDuringRun).toBe(true);

    // Simulate retry: reset before next run
    resetRunState(pieces);
    expect(conveyor.firedDuringRun).toBe(false);

    // Run 2
    executeMachine(state, 0);
    expect(conveyor.firedDuringRun).toBe(true);
  });
});

// ── evaluateRequiredPieces ────────────────────────────────────────────────────

describe('evaluateRequiredPieces', () => {
  it('returns satisfied when requiredPieces is undefined', () => {
    const level = makeLevel(undefined);
    const result = evaluateRequiredPieces(level, []);
    expect(result.result).toBe('satisfied');
  });

  it('returns satisfied when requiredPieces is empty array', () => {
    const level = makeLevel([]);
    const result = evaluateRequiredPieces(level, []);
    expect(result.result).toBe('satisfied');
  });

  it('returns satisfied when all required pieces are engaged', () => {
    const level = makeLevel([{ type: 'splitter', count: 1 }, { type: 'merger', count: 1 }]);
    const runStates = [
      { pieceId: 'splitter', firedDuringRun: true },
      { pieceId: 'merger', firedDuringRun: true },
    ];
    const result = evaluateRequiredPieces(level, runStates);
    expect(result.result).toBe('satisfied');
  });

  it('returns requiredPiecesNotEngaged when a required piece was not fired', () => {
    const level = makeLevel([{ type: 'splitter', count: 1 }]);
    const runStates = [
      { pieceId: 'splitter', firedDuringRun: false },
    ];
    const result = evaluateRequiredPieces(level, runStates);
    expect(result.result).toBe('requiredPiecesNotEngaged');
    if (result.result === 'requiredPiecesNotEngaged') {
      expect(result.missing[0].type).toBe('splitter');
      expect(result.missing[0].required).toBe(1);
      expect(result.missing[0].engaged).toBe(0);
    }
  });

  it('returns requiredPiecesNotEngaged when no run states exist for required piece', () => {
    const level = makeLevel([{ type: 'merger', count: 1 }]);
    const result = evaluateRequiredPieces(level, []);
    expect(result.result).toBe('requiredPiecesNotEngaged');
    if (result.result === 'requiredPiecesNotEngaged') {
      expect(result.missing[0].type).toBe('merger');
    }
  });

  it('uses pieceId === type matching (real game call site passes p.type as pieceId)', () => {
    const level = makeLevel([{ type: 'splitter', count: 1 }]);
    // Matching: pieceId 'splitter' === required type 'splitter'
    const matched = evaluateRequiredPieces(level, [{ pieceId: 'splitter', firedDuringRun: true }]);
    expect(matched.result).toBe('satisfied');
    // Non-matching: pieceId 'piece-123' !== 'splitter'
    const notMatched = evaluateRequiredPieces(level, [{ pieceId: 'piece-123', firedDuringRun: true }]);
    expect(notMatched.result).toBe('requiredPiecesNotEngaged');
  });

  it('partial engagement counts correctly', () => {
    const level = makeLevel([
      { type: 'splitter', count: 1 },
      { type: 'merger', count: 1 },
    ]);
    const runStates = [
      { pieceId: 'splitter', firedDuringRun: true },
      { pieceId: 'merger', firedDuringRun: false },
    ];
    const result = evaluateRequiredPieces(level, runStates);
    expect(result.result).toBe('requiredPiecesNotEngaged');
    if (result.result === 'requiredPiecesNotEngaged') {
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].type).toBe('merger');
    }
  });

  it('placed-but-not-fired pieces do not satisfy requirement', () => {
    const level = makeLevel([{ type: 'bridge', count: 1 }]);
    // Piece exists in run states but never received signal
    const runStates = [{ pieceId: 'bridge', firedDuringRun: false }];
    const result = evaluateRequiredPieces(level, runStates);
    expect(result.result).toBe('requiredPiecesNotEngaged');
  });
});
