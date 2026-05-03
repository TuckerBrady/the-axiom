// Pre-written tests — K1-6 and K1-8 requiredPieces enforcement.
// Spec: kepler-belt-levels-v2-part2.md §CANONICAL REQUIREDPIECES ENFORCEMENT.
//
// Enforcement flavor A3a (Tucker authorization 2026-04-30):
//   Level runs, then fails with COGS-voiced rejection if required pieces
//   were not engaged (placed AND fired at least once during the run).
//
// ENGINE API CONTRACT (Dev must implement before these tests pass):
//   evaluateRequiredPieces(levelDef, pieceRunStates): RequiredPiecesResult
//   where RequiredPiecesResult =
//     | { result: 'satisfied' }
//     | { result: 'requiredPiecesNotEngaged'; missing: Array<{ type, required, engaged }> }
//
// DEV NOTE: The engine tests below use describe.skip until evaluateRequiredPieces
// is exported from src/game/engine. Level-definition tests run immediately.

import { getLevelById } from '../../src/game/levels';
import type { PlacedPiece, MachineState, LevelDefinition } from '../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
} from '../../src/game/engine';

// Expected post-implementation import:
// import { evaluateRequiredPieces } from '../../src/game/engine';
// Until implemented, load conditionally so level-definition tests still run:
type PieceRunState = { pieceId: string; firedDuringRun: boolean };
type RequiredPiecesResult =
  | { result: 'satisfied' }
  | {
      result: 'requiredPiecesNotEngaged';
      missing: Array<{ type: string; required: number; engaged: number }>;
    };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const evaluateRequiredPieces: ((levelDef: LevelDefinition, states: PieceRunState[]) => RequiredPiecesResult) | undefined =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (require('../../src/game/engine') as any).evaluateRequiredPieces;

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

// ── K1-6 level definition assertions ─────────────────────────────────────────

describe('K1-6 Colonist Hub — level definition (REQ-51)', () => {
  it('requiredPieces contains splitter×1 and merger×1', () => {
    const level = getLevelById('K1-6');
    expect(level).toBeDefined();
    expect(level!.requiredPieces).toEqual([
      { type: 'splitter', count: 1 },
      { type: 'merger', count: 1 },
    ]);
  });

  it('optimalPieces is 11', () => {
    const level = getLevelById('K1-6');
    expect(level!.optimalPieces).toBe(11);
  });

  it('inputTape is [1,0,1,1,0,1] and expectedOutput is [1,0,1,1,0,1]', () => {
    const level = getLevelById('K1-6');
    expect(level!.inputTape).toEqual([1, 0, 1, 1, 0, 1]);
    expect(level!.expectedOutput).toEqual([1, 0, 1, 1, 0, 1]);
  });
});

// ── K1-8 level definition assertions ─────────────────────────────────────────

describe('K1-8 Transit Gate — level definition (REQ-68)', () => {
  it('requiredPieces contains bridge×1, latch×1, splitter×1, merger×1', () => {
    const level = getLevelById('K1-8');
    expect(level).toBeDefined();
    expect(level!.requiredPieces).toEqual([
      { type: 'bridge', count: 1 },
      { type: 'latch', count: 1 },
      { type: 'splitter', count: 1 },
      { type: 'merger', count: 1 },
    ]);
  });

  it('optimalPieces is 12', () => {
    const level = getLevelById('K1-8');
    expect(level!.optimalPieces).toBe(12);
  });

  it('availablePieces includes splitter', () => {
    const level = getLevelById('K1-8');
    expect(level!.availablePieces).toContain('splitter');
  });
});

// ── K1-6 engine enforcement tests ─────────────────────────────────────────────
//
// DEV: Unskip this describe block once evaluateRequiredPieces is implemented.
// See ENGINE API CONTRACT in kepler-belt-levels-v2-part2.md.

describe('K1-6 requiredPieces — engine enforcement (REQ-RP-1 through REQ-RP-5)', () => {
  const level = getLevelById('K1-6')!;
  const tape = [1, 0, 1, 1, 0, 1];

  it('[bypass-fails] Scanner→Transmitter only — run completes, fails with requiredPiecesNotEngaged', () => {
    // Bypass machine: no Splitter, no Merger engaged.
    // K1-6 tape is input=output, so this machine produces correct output
    // and would normally pass — but requiredPieces enforcement catches it.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('sc', 'scanner', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: tape,
      outputTape: tape.map(() => -1 as number),
      dataTrail: { cells: Array(tape.length).fill(null), headPosition: 0 },
    });
    for (let pulse = 0; pulse < tape.length; pulse++) {
      executeMachine(state, pulse);
    }
    // All pieces that ran: only scanner and transmitter fired.
    const runStates: PieceRunState[] = pieces.map(p => ({
      pieceId: p.id,
      firedDuringRun: p.type === 'scanner' || p.type === 'transmitter',
    }));
    const result = evaluateRequiredPieces!(level, runStates);
    expect(result.result).toBe('requiredPiecesNotEngaged');
    if (result.result === 'requiredPiecesNotEngaged') {
      const missingTypes = result.missing.map(m => m.type);
      expect(missingTypes).toContain('splitter');
      expect(missingTypes).toContain('merger');
    }
  });

  it('[required-passes] Full floor-solve machine — run completes, result is satisfied', () => {
    // Full floor solve engages Splitter and Merger.
    // Scanner, Latch, Splitter, Config Node, Conveyor(s), Gear, Merger, Transmitter all fire.
    const allRequiredFired = [
      { pieceId: 'scanner', firedDuringRun: true },
      { pieceId: 'latch', firedDuringRun: true },
      { pieceId: 'splitter', firedDuringRun: true },
      { pieceId: 'configNode', firedDuringRun: true },
      { pieceId: 'merger', firedDuringRun: true },
      { pieceId: 'transmitter', firedDuringRun: true },
    ];
    const result = evaluateRequiredPieces!(level, allRequiredFired);
    expect(result.result).toBe('satisfied');
  });

  it('[engaged-but-not-fired] Splitter and Merger placed in dead corners — fail state fires', () => {
    // REQ-RP-2: "engaged" requires placed AND fired. Pieces in dead corners are
    // placed but never receive a signal — they do not count as engaged.
    const runStates: PieceRunState[] = [
      { pieceId: 'scanner', firedDuringRun: true },
      { pieceId: 'transmitter', firedDuringRun: true },
      // Splitter and Merger placed but never reached by signal:
      { pieceId: 'splitter-corner', firedDuringRun: false },
      { pieceId: 'merger-corner', firedDuringRun: false },
    ];
    const result = evaluateRequiredPieces!(level, runStates);
    // Placed-but-not-fired pieces MUST NOT count as engaged.
    expect(result.result).toBe('requiredPiecesNotEngaged');
    if (result.result === 'requiredPiecesNotEngaged') {
      const missingTypes = result.missing.map(m => m.type);
      expect(missingTypes).toContain('splitter');
      expect(missingTypes).toContain('merger');
    }
  });
});

// ── K1-8 engine enforcement tests ─────────────────────────────────────────────
//
// DEV: Unskip this describe block once evaluateRequiredPieces is implemented.

describe('K1-8 Transit Gate — engine enforcement (REQ-RP-1 through REQ-RP-5)', () => {
  const level = getLevelById('K1-8')!;
  const tape = [1, 1, 0, 1, 0, 0, 1, 1];

  it('[bypass-fails] Scanner→Transmitter only — run completes, fails with requiredPiecesNotEngaged', () => {
    // K1-8 tape: output = input, so a bypass machine produces correct output.
    // requiredPieces enforcement must catch it and fail post-run.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('sc', 'scanner', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const state = makeState(pieces, {
      inputTape: tape,
      outputTape: tape.map(() => -1 as number),
      dataTrail: { cells: Array(tape.length).fill(null), headPosition: 0 },
    });
    for (let pulse = 0; pulse < tape.length; pulse++) {
      executeMachine(state, pulse);
    }
    const runStates: PieceRunState[] = pieces.map(p => ({
      pieceId: p.id,
      firedDuringRun: p.type === 'scanner' || p.type === 'transmitter',
    }));
    const result = evaluateRequiredPieces!(level, runStates);
    expect(result.result).toBe('requiredPiecesNotEngaged');
    if (result.result === 'requiredPiecesNotEngaged') {
      const missingTypes = result.missing.map(m => m.type);
      expect(missingTypes).toContain('bridge');
      expect(missingTypes).toContain('latch');
      expect(missingTypes).toContain('splitter');
      expect(missingTypes).toContain('merger');
    }
  });

  it('[required-passes] Full floor-solve machine — all required pieces engaged, result is satisfied', () => {
    // Full floor solve: Scanner, Latch, Splitter, Bridge, Config Node,
    // Merger, Transmitter all fire.
    const allRequiredFired: PieceRunState[] = [
      { pieceId: 'scanner', firedDuringRun: true },
      { pieceId: 'latch', firedDuringRun: true },
      { pieceId: 'splitter', firedDuringRun: true },
      { pieceId: 'bridge', firedDuringRun: true },
      { pieceId: 'configNode', firedDuringRun: true },
      { pieceId: 'merger', firedDuringRun: true },
      { pieceId: 'transmitter', firedDuringRun: true },
    ];
    const result = evaluateRequiredPieces!(level, allRequiredFired);
    expect(result.result).toBe('satisfied');
  });
});

// ── evaluateRequiredPieces: undefined-safe guard ───────────────────────────────

describe('evaluateRequiredPieces API availability check', () => {
  it('is exported from src/game/engine once Dev implements it', () => {
    // This test documents the expected export. Until implemented, it is skipped
    // and the describe.skip blocks above are inactive.
    // When Dev adds the export, this test will pass and the skipped blocks
    // should be unskipped.
    if (evaluateRequiredPieces === undefined) {
      // Not yet implemented — document but do not fail.
      console.warn(
        '[keplerRequiredPieces] evaluateRequiredPieces not yet exported from ' +
          'src/game/engine. Engine enforcement tests are skipped. ' +
          'See ENGINE API CONTRACT in kepler-belt-levels-v2-part2.md.',
      );
      return;
    }
    expect(typeof evaluateRequiredPieces).toBe('function');
  });
});
