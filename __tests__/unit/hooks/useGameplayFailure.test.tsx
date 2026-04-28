// React 18+ requires this flag set before any act() calls so the
// concurrent renderer treats this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
// react-test-renderer ships without bundled types; declare the slice we
// use to keep the unit-tier ts-jest project compiling without adding
// @types/react-test-renderer to the build.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void) => void;
  create: (
    el: React.ReactElement,
  ) => { update: (el: React.ReactElement) => void; unmount: () => void };
} = require('react-test-renderer');
import { useGameplayFailure } from '../../../src/hooks/useGameplayFailure';
import { useGameStore } from '../../../src/store/gameStore';
import type { LevelDefinition, PlacedPiece, ExecutionStep } from '../../../src/game/types';

type HookResult = ReturnType<typeof useGameplayFailure>;

let captured: HookResult | null = null;

function Harness(props: { level: LevelDefinition | null; isAxiomLevel: boolean }) {
  captured = useGameplayFailure(props.level, props.isAxiomLevel);
  return null;
}

function makeLevel(id: string): LevelDefinition {
  return {
    id,
    name: `Level ${id}`,
    sector: 'axiom',
    description: '',
    cogsLine: '',
    gridWidth: 8,
    gridHeight: 7,
    prePlacedPieces: [],
    availablePieces: [],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [],
    optimalPieces: 1,
  };
}

function makePiece(overrides: Partial<PlacedPiece>): PlacedPiece {
  return {
    id: overrides.id ?? 'piece-1',
    type: overrides.type ?? 'conveyor',
    gridX: overrides.gridX ?? 0,
    gridY: overrides.gridY ?? 0,
    rotation: overrides.rotation ?? 0,
    isPrePlaced: overrides.isPrePlaced ?? false,
    ...overrides,
  } as PlacedPiece;
}

afterEach(() => {
  captured = null;
});

describe('useGameplayFailure', () => {
  describe('initial state', () => {
    it('starts with an empty blownCells Set and failCount 0', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.blownCells).toBeInstanceOf(Set);
      expect(captured!.blownCells.size).toBe(0);
      expect(captured!.failCount).toBe(0);
    });

    it('exposes a blownCellsRef that mirrors the initial Set', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.blownCellsRef.current).toBeInstanceOf(Set);
      expect(captured!.blownCellsRef.current.size).toBe(0);
    });
  });

  describe('reset on level change', () => {
    it('clears blownCells and failCount when level.id changes', () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });

      TestRenderer.act(() => {
        captured!.setBlownCells(new Set(['1,2', '3,4']));
        captured!.setFailCount(2);
      });
      expect(captured!.blownCells.size).toBe(2);
      expect(captured!.failCount).toBe(2);

      TestRenderer.act(() => {
        renderer.update(
          React.createElement(Harness, { level: makeLevel('A1-2'), isAxiomLevel: true }),
        );
      });
      expect(captured!.blownCells.size).toBe(0);
      expect(captured!.failCount).toBe(0);
    });
  });

  describe('blownCellsRef sync', () => {
    it('updates blownCellsRef.current after blownCells changes', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      const next = new Set(['5,5']);
      TestRenderer.act(() => {
        captured!.setBlownCells(next);
      });
      expect(captured!.blownCellsRef.current).toBe(next);
    });
  });

  describe('findBlownPiece', () => {
    it('returns the wrongOutput Transmitter as the candidate', () => {
      const transmitter = makePiece({ id: 't1', type: 'transmitter', gridX: 4, gridY: 3 });
      const conveyor = makePiece({ id: 'c1', type: 'conveyor', gridX: 1, gridY: 1 });
      useGameStore.setState({
        machineState: {
          pieces: [transmitter, conveyor],
          wires: [],
          dataTrail: { cells: [], headPosition: 0 },
          outputTape: undefined,
        },
      } as unknown as Partial<ReturnType<typeof useGameStore.getState>>);

      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('B-1'), isAxiomLevel: false }),
        );
      });

      const steps: ExecutionStep[] = [
        { type: 'source', pieceId: 'src', success: true, timestamp: 0 } as ExecutionStep,
      ];
      const got = captured!.findBlownPiece('wrongOutput', steps);
      expect(got?.id).toBe('t1');
    });

    it('returns the last visited piece for void failures', () => {
      const a = makePiece({ id: 'a', gridX: 0, gridY: 0 });
      const b = makePiece({ id: 'b', gridX: 1, gridY: 0 });
      useGameStore.setState({
        machineState: {
          pieces: [a, b],
          wires: [],
          dataTrail: { cells: [], headPosition: 0 },
          outputTape: undefined,
        },
      } as unknown as Partial<ReturnType<typeof useGameStore.getState>>);

      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('B-2'), isAxiomLevel: false }),
        );
      });

      const steps: ExecutionStep[] = [
        { type: 'conveyor', pieceId: 'a', success: true, timestamp: 0 } as ExecutionStep,
        { type: 'conveyor', pieceId: 'b', success: false, timestamp: 1 } as ExecutionStep,
      ];
      const got = captured!.findBlownPiece('void', steps);
      expect(got?.id).toBe('b');
    });

    it('returns null when the candidate cell is already blown', () => {
      const piece = makePiece({ id: 'p', gridX: 2, gridY: 2 });
      useGameStore.setState({
        machineState: {
          pieces: [piece],
          wires: [],
          dataTrail: { cells: [], headPosition: 0 },
          outputTape: undefined,
        },
      } as unknown as Partial<ReturnType<typeof useGameStore.getState>>);

      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('B-3'), isAxiomLevel: false }),
        );
      });
      TestRenderer.act(() => {
        captured!.setBlownCells(new Set(['2,2']));
      });

      const steps: ExecutionStep[] = [
        { type: 'conveyor', pieceId: 'p', success: false, timestamp: 0 } as ExecutionStep,
      ];
      const got = captured!.findBlownPiece('void', steps);
      expect(got).toBeNull();
    });
  });

  describe('getBlownCellCOGSLine', () => {
    it('returns null for 0 blown cells', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.getBlownCellCOGSLine(0)).toBeNull();
    });

    it('returns the first-incident line for 1 blown cell', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.getBlownCellCOGSLine(1)).toMatch(/board took damage/);
    });

    it('returns the constrained-board line for 2 blown cells', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.getBlownCellCOGSLine(2)).toMatch(/becoming\.\.\. constrained/);
    });

    it('returns the dry-recommendation line for 3+ blown cells', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.getBlownCellCOGSLine(3)).toMatch(/fewer failed attempts/);
      expect(captured!.getBlownCellCOGSLine(7)).toMatch(/fewer failed attempts/);
    });
  });
});
