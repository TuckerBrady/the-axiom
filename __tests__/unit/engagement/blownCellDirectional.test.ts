// Pre-written tests — SPEC_DIRECTIONAL_TERMINAL v1.0 section 11,
// blownCellDirectional.test.ts (AXM-029 PR 1). Clause [3.10]: on a void run
// whose failing branch ends in terminalRejected, the blown piece is the piece
// that emitted into the Terminal (the step immediately before the rejection).
//
// React 18+ requires this flag set before any act() calls so the
// concurrent renderer treats this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
// react-test-renderer ships without bundled types; declare the slice we use.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void) => void;
  create: (el: React.ReactElement) => { unmount: () => void };
} = require('react-test-renderer');
import { useGameplayFailure } from '../../../src/hooks/useGameplayFailure';
import { useGameStore } from '../../../src/store/gameStore';
import type { LevelDefinition, PlacedPiece, ExecutionStep } from '../../../src/game/types';
import { getDefaultPorts } from '../../../src/game/engine';

type HookResult = ReturnType<typeof useGameplayFailure>;

let captured: HookResult | null = null;

function Harness(props: { level: LevelDefinition }) {
  captured = useGameplayFailure(props.level, false);
  return null;
}

function makeLevel(): LevelDefinition {
  return {
    id: 'K1-TEST',
    name: 'Blown-cell fixture',
    sector: 'kepler',
    description: '',
    cogsLine: '',
    gridWidth: 6,
    gridHeight: 6,
    prePlacedPieces: [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [],
    optimalPieces: 1,
  };
}

function makePiece(
  id: string, type: PlacedPiece['type'], gridX: number, gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  return {
    id, type, category: 'physics', gridX, gridY,
    ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false,
    ...overrides,
  };
}

function mountWith(pieces: PlacedPiece[]) {
  useGameStore.setState({
    machineState: {
      pieces,
      wires: [],
      dataTrail: { cells: [], headPosition: 0 },
      outputTape: undefined,
    },
  } as unknown as Partial<ReturnType<typeof useGameStore.getState>>);
  TestRenderer.act(() => {
    TestRenderer.create(React.createElement(Harness, { level: makeLevel() }));
  });
}

const step = (pieceId: string, type: string, timestamp: number, success = true): ExecutionStep =>
  ({ pieceId, type, timestamp, success }) as ExecutionStep;

afterEach(() => {
  captured = null;
});

describe('findBlownPiece — directional Terminal', () => {
  it('[3.10] void run ending in terminalRejected blames the feeding piece', () => {
    // 'other' is listed first and is exactly as close to the Terminal as the
    // feeder, so the pre-placed-Terminal nearest-piece fallback would pick it.
    mountWith([
      makePiece('s', 'source', 2, 0, { isPrePlaced: true }),
      makePiece('t', 'terminal', 2, 2, { isPrePlaced: true, entrySide: 'left' }),
      makePiece('other', 'conveyor', 3, 2),
      makePiece('c', 'conveyor', 2, 1, { rotation: 90 }),
    ]);
    const steps: ExecutionStep[] = [
      step('s', 'source', 0),
      step('c', 'conveyor', 1),
      { ...step('t', 'terminalRejected', 2, false), side: 'top' },
    ];
    expect(captured!.findBlownPiece('void', steps)?.id).toBe('c');
  });

  it('[3.10] with a pre-placed feeder, the nearest player-placed piece to the feeder is blown', () => {
    // Feeder f is pre-placed at (1,2), left of the Terminal. p1 is nearest to
    // f; p2 is nearest to the Terminal. The existing rule measures from the
    // attributed (feeding) piece, so p1 is blown.
    mountWith([
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('t', 'terminal', 2, 2, { isPrePlaced: true, entrySide: 'top' }),
      makePiece('p2', 'conveyor', 3, 2),
      makePiece('f', 'conveyor', 1, 2, { isPrePlaced: true }),
      makePiece('p1', 'conveyor', 0, 2),
    ]);
    const steps: ExecutionStep[] = [
      step('s', 'source', 0),
      step('f', 'conveyor', 1),
      { ...step('t', 'terminalRejected', 2, false), side: 'left' },
    ];
    expect(captured!.findBlownPiece('void', steps)?.id).toBe('p1');
  });

  // [3.11] depends on the shared isScarImmune predicate from
  // SPEC_SOURCE_TERMINAL_PLACEMENT clause 6 (AXM-026), which is sequenced
  // after this PR (spec 9.1) and does not exist on master yet.
  it.todo('[3.11] attributed blown piece in the entry cell: piece removed, life consumed, cell NOT added to blown cells');
});
