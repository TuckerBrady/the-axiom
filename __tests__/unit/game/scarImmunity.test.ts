// AXM-026 — scar immunity (SPEC_SOURCE_TERMINAL_PLACEMENT v1.1, section 6).
// Pre-written test cases from section 11; bodies written here, assertions
// fixed by the spec.

import type { Dispatch, SetStateAction } from 'react';
import { isScarImmune } from '../../../src/game/scarImmunity';
import {
  handleWrongOutput,
  handleVoidFailure,
} from '../../../src/game/engagement/failureHandlers';
import type {
  WrongOutputParams,
  VoidFailureParams,
} from '../../../src/game/engagement/failureHandlers';
import { getDefaultPorts } from '../../../src/game/engine';
import type { LevelDefinition, PlacedPiece, PortSide } from '../../../src/game/types';

jest.useFakeTimers();

function piece(
  type: PlacedPiece['type'],
  x: number,
  y: number,
  extra: Partial<PlacedPiece> & { entrySide?: PortSide } = {},
): PlacedPiece {
  return {
    id: `${type}-${x}-${y}`,
    type,
    category: 'physics',
    gridX: x,
    gridY: y,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: true,
    ...extra,
  } as PlacedPiece;
}

function level(pieces: PlacedPiece[], w = 8, h = 6): LevelDefinition {
  return {
    id: 'SCAR-TEST',
    name: 'scar test',
    sector: 'kepler',
    description: '',
    cogsLine: '',
    gridWidth: w,
    gridHeight: h,
    prePlacedPieces: pieces,
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [{ type: 'reach_output' }],
    optimalPieces: 1,
  };
}

describe('[6] isScarImmune', () => {
  it('[6.2] Source on corner (0,0): true at (1,0) and (0,1)', () => {
    const l = level([piece('source', 0, 0), piece('terminal', 6, 5)]);
    expect(isScarImmune(l, 1, 0)).toBe(true);
    expect(isScarImmune(l, 0, 1)).toBe(true);
  });

  it('[6.2] Terminal on corner (W-1,H-1): true at its two neighbours', () => {
    const l = level([piece('source', 1, 0), piece('terminal', 7, 5)]);
    expect(isScarImmune(l, 6, 5)).toBe(true);
    expect(isScarImmune(l, 7, 4)).toBe(true);
  });

  it('[6.3] directional Terminal entry cell: true', () => {
    // SPEC_DIRECTIONAL_TERMINAL PR-1 adds `entrySide` to PlacedPiece. Until it
    // lands the field is carried structurally, which is all the predicate reads.
    const l = level([piece('source', 1, 0), piece('terminal', 6, 5, { entrySide: 'left' })]);
    expect(isScarImmune(l, 5, 5)).toBe(true);
    const top = level([piece('source', 1, 0), piece('terminal', 6, 5, { entrySide: 'top' })]);
    expect(isScarImmune(top, 6, 4)).toBe(true);
  });

  it('[6.4] edge-placed (non-corner) Source neighbours: false. Arbitrary interior cell: false', () => {
    const l = level([piece('source', 0, 1), piece('terminal', 7, 4)]);
    expect(isScarImmune(l, 0, 0)).toBe(false);
    expect(isScarImmune(l, 1, 1)).toBe(false);
    expect(isScarImmune(l, 0, 2)).toBe(false);
    expect(isScarImmune(l, 3, 3)).toBe(false);
    // Edge-placed Terminal neighbours are ordinary cells too.
    expect(isScarImmune(l, 7, 3)).toBe(false);
    expect(isScarImmune(l, 6, 4)).toBe(false);
    expect(isScarImmune(l, 7, 5)).toBe(false);
  });

  it('[6.4] a corner fixture neighbour that is not open (damaged or obstacle) is not immune', () => {
    const l = {
      ...level([piece('source', 0, 0), piece('terminal', 7, 5), piece('obstacle', 1, 0)]),
      damagedCells: [{ gridX: 0, gridY: 1 }],
    };
    expect(isScarImmune(l, 1, 0)).toBe(false);
    expect(isScarImmune(l, 0, 1)).toBe(false);
  });
});

// ─── [6.5] blown-piece handling ───────────────────────────────────────────────

const cornerLevel = level([piece('source', 0, 0), piece('terminal', 7, 5)]);
const immuneCheck = (x: number, y: number) => isScarImmune(cornerLevel, x, y);

function blowable(x: number, y: number): PlacedPiece {
  return piece('conveyor', x, y, { id: 'player-1', isPrePlaced: false });
}

// Runs the setBlownCells updater against a real Set so the test sees the
// resulting blown-cell set, not just whether the setter was called.
function blownSetHarness(initial: string[]) {
  let current = new Set(initial);
  const setBlownCells = jest.fn((update: SetStateAction<Set<string>>) => {
    current = typeof update === 'function' ? update(current) : update;
  }) as unknown as Dispatch<SetStateAction<Set<string>>>;
  return { setBlownCells, read: () => current };
}

function wrongOutputParams(p: PlacedPiece, overrides: Partial<WrongOutputParams>): WrongOutputParams {
  return {
    steps: [{ pieceId: p.id, type: p.type, timestamp: 0, success: true }],
    expected: [1],
    produced: [0],
    isAxiomLevel: false,
    findBlownPiece: jest.fn().mockReturnValue(p),
    deletePiece: jest.fn(),
    setBlownCells: jest.fn() as unknown as Dispatch<SetStateAction<Set<string>>>,
    setWrongOutputData: jest.fn(),
    setShowWrongOutput: jest.fn(),
    loseLife: jest.fn(),
    isScarImmune: immuneCheck,
    ...overrides,
  };
}

function voidParams(p: PlacedPiece, overrides: Partial<VoidFailureParams>): VoidFailureParams {
  return {
    steps: [{ pieceId: p.id, type: p.type, timestamp: 0, success: true }],
    levelId: 'SCAR-TEST',
    isAxiomLevel: false,
    failCount: 0,
    findBlownPiece: jest.fn().mockReturnValue(p),
    deletePiece: jest.fn(),
    setBlownCells: jest.fn() as unknown as Dispatch<SetStateAction<Set<string>>>,
    setFailCount: jest.fn(),
    setFlashColor: jest.fn(),
    setShowTeachCard: jest.fn(),
    setShowVoid: jest.fn(),
    triggerHints: jest.fn(),
    redColor: '#f00',
    isScarImmune: immuneCheck,
    ...overrides,
  };
}

async function runVoid(params: VoidFailureParams): Promise<void> {
  const pending = handleVoidFailure(params);
  await jest.runAllTimersAsync();
  await pending;
}

describe('[6.5] blown-piece handler and scar-immune cells', () => {
  it('[6.5] wrong output blamed on an immune cell: piece removed, life consumed, blown-cell set unchanged', () => {
    const p = blowable(1, 0);
    const harness = blownSetHarness(['4,4']);
    const params = wrongOutputParams(p, { setBlownCells: harness.setBlownCells });
    handleWrongOutput(params);
    expect(params.deletePiece).toHaveBeenCalledWith(p.id);
    expect(params.loseLife).toHaveBeenCalledTimes(1);
    expect(Array.from(harness.read()).sort()).toEqual(['4,4']);
  });

  it('[6.5] void blamed on an immune cell: piece removed, blown-cell set unchanged', async () => {
    const p = blowable(0, 1);
    const harness = blownSetHarness(['4,4']);
    const params = voidParams(p, { setBlownCells: harness.setBlownCells });
    await runVoid(params);
    expect(params.deletePiece).toHaveBeenCalledWith(p.id);
    expect(params.setFailCount).toHaveBeenCalledWith(1);
    expect(params.setShowVoid).toHaveBeenCalledWith(true);
    expect(Array.from(harness.read()).sort()).toEqual(['4,4']);
  });

  it('[6.5] GUARD: wrong output on a non-immune cell still scars (existing behavior)', () => {
    const p = blowable(3, 3);
    const harness = blownSetHarness([]);
    const params = wrongOutputParams(p, { setBlownCells: harness.setBlownCells });
    handleWrongOutput(params);
    expect(params.deletePiece).toHaveBeenCalledWith(p.id);
    expect(params.loseLife).toHaveBeenCalledTimes(1);
    expect(harness.read().has('3,3')).toBe(true);
  });

  it('[6.5] GUARD: void on a non-immune cell still scars (existing behavior)', async () => {
    const p = blowable(3, 3);
    const harness = blownSetHarness([]);
    const params = voidParams(p, { setBlownCells: harness.setBlownCells });
    await runVoid(params);
    expect(params.deletePiece).toHaveBeenCalledWith(p.id);
    expect(harness.read().has('3,3')).toBe(true);
  });

  it('[6.5] GUARD: without an immunity check the handlers scar as before', () => {
    const p = blowable(1, 0);
    const harness = blownSetHarness([]);
    const params = wrongOutputParams(p, { setBlownCells: harness.setBlownCells, isScarImmune: undefined });
    handleWrongOutput(params);
    expect(harness.read().has('1,0')).toBe(true);
  });
});
