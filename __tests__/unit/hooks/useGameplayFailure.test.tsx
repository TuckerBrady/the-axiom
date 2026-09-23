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
import { useGameplayFailure, seedBlownCells } from '../../../src/hooks/useGameplayFailure';
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

    // REQ-G-08 pt 1 (Handoff 003): voidQuoteIndex is held alongside
    // failCount so failureHandlers.handleVoidFailure can draw it once, on
    // entering the void state, instead of GameplayModals rerolling it in
    // its render path.
    it('starts with voidQuoteIndex 0', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.voidQuoteIndex).toBe(0);
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

  describe('seedBlownCells (pre-existing craters from level.damagedCells)', () => {
    it('returns an empty set when the level has no damagedCells', () => {
      expect(seedBlownCells(makeLevel('A1-1')).size).toBe(0);
      expect(seedBlownCells(null).size).toBe(0);
    });

    it('maps each damaged cell to a "gx,gy" key', () => {
      const level = { ...makeLevel('K1-5'), damagedCells: [{ gridX: 3, gridY: 2 }, { gridX: 5, gridY: 4 }] };
      const seeded = seedBlownCells(level);
      expect(seeded.has('3,2')).toBe(true);
      expect(seeded.has('5,4')).toBe(true);
      expect(seeded.size).toBe(2);
    });

    it('seeds blownCells on mount so pre-existing craters reject placement', () => {
      const level = { ...makeLevel('K1-6'), damagedCells: [{ gridX: 4, gridY: 1 }] };
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level, isAxiomLevel: false }),
        );
      });
      expect(captured!.blownCells.has('4,1')).toBe(true);
      expect(captured!.blownCellsRef.current.has('4,1')).toBe(true);
    });
  });

  describe('reset on level change', () => {
    it('re-seeds craters from the new level when level.id changes', () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      const damaged = { ...makeLevel('K1-7'), damagedCells: [{ gridX: 2, gridY: 2 }] };
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      expect(captured!.blownCells.size).toBe(0);

      TestRenderer.act(() => {
        renderer.update(React.createElement(Harness, { level: damaged, isAxiomLevel: false }));
      });
      expect(captured!.blownCells.has('2,2')).toBe(true);
      expect(captured!.failCount).toBe(0);
    });

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

  describe('voidQuoteIndex', () => {
    it('setVoidQuoteIndex updates the held index', () => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      TestRenderer.act(() => {
        captured!.setVoidQuoteIndex(2);
      });
      expect(captured!.voidQuoteIndex).toBe(2);
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

  // Damaged-cell treatment (Tucker approved 2026-09-20). Terrain damage and a
  // failure crater are drawn as the same missing deck plate; only a cell blown
  // during the CURRENT run carries an ember, and it settles on the next run.
  describe('liveBurnCells / settleLiveBurns', () => {
    const mount = (level: LevelDefinition | null) => {
      TestRenderer.act(() => {
        TestRenderer.create(
          React.createElement(Harness, { level, isAxiomLevel: true }),
        );
      });
    };

    it('treats level damagedCells as terrain, never as a live burn', () => {
      const level = { ...makeLevel('K1-9'), damagedCells: [{ gridX: 3, gridY: 3 }] };
      mount(level);
      expect(captured!.blownCells.has('3,3')).toBe(true);
      expect(captured!.liveBurnCells.size).toBe(0);
    });

    it('marks a cell blown this run as a live burn', () => {
      mount(makeLevel('A1-1'));
      TestRenderer.act(() => {
        captured!.setBlownCells(new Set(['2,4']));
      });
      expect(captured!.liveBurnCells.has('2,4')).toBe(true);
      expect(captured!.liveBurnCells.size).toBe(1);
    });

    it('settles the burn on the next run, keeping the cell blown', () => {
      mount(makeLevel('A1-1'));
      TestRenderer.act(() => {
        captured!.setBlownCells(new Set(['2,4']));
      });
      TestRenderer.act(() => {
        captured!.settleLiveBurns();
      });
      expect(captured!.liveBurnCells.size).toBe(0);
      expect(captured!.blownCells.has('2,4')).toBe(true);
    });

    it('only the newest crater burns when an older one has settled', () => {
      mount(makeLevel('A1-1'));
      TestRenderer.act(() => { captured!.setBlownCells(new Set(['1,1'])); });
      TestRenderer.act(() => { captured!.settleLiveBurns(); });
      TestRenderer.act(() => { captured!.setBlownCells(new Set(['1,1', '6,2'])); });
      expect(captured!.liveBurnCells.has('6,2')).toBe(true);
      expect(captured!.liveBurnCells.has('1,1')).toBe(false);
    });

    it('settleLiveBurns is idempotent — a second call changes nothing', () => {
      mount(makeLevel('A1-1'));
      TestRenderer.act(() => { captured!.setBlownCells(new Set(['1,1'])); });
      TestRenderer.act(() => { captured!.settleLiveBurns(); });
      const first = captured!.liveBurnCells;
      TestRenderer.act(() => { captured!.settleLiveBurns(); });
      expect(captured!.liveBurnCells).toBe(first);
    });

    it('a retry that clears the board lets the same cell burn again', () => {
      mount(makeLevel('A1-1'));
      TestRenderer.act(() => { captured!.setBlownCells(new Set(['4,4'])); });
      TestRenderer.act(() => { captured!.settleLiveBurns(); });
      TestRenderer.act(() => { captured!.setBlownCells(new Set()); });
      TestRenderer.act(() => { captured!.settleLiveBurns(); });
      TestRenderer.act(() => { captured!.setBlownCells(new Set(['4,4'])); });
      expect(captured!.liveBurnCells.has('4,4')).toBe(true);
    });

    it('re-seeds terrain (and no burns) when the level changes', () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          React.createElement(Harness, { level: makeLevel('A1-1'), isAxiomLevel: true }),
        );
      });
      TestRenderer.act(() => { captured!.setBlownCells(new Set(['0,0'])); });
      expect(captured!.liveBurnCells.size).toBe(1);

      const next = { ...makeLevel('K1-3'), damagedCells: [{ gridX: 7, gridY: 1 }] };
      TestRenderer.act(() => {
        renderer.update(React.createElement(Harness, { level: next, isAxiomLevel: false }));
      });
      expect(captured!.blownCells.has('7,1')).toBe(true);
      expect(captured!.liveBurnCells.size).toBe(0);
    });

    it('liveBurnCells is always a subset of blownCells', () => {
      mount(makeLevel('A1-1'));
      TestRenderer.act(() => { captured!.setBlownCells(new Set(['1,1', '2,2'])); });
      captured!.liveBurnCells.forEach(k => {
        expect(captured!.blownCells.has(k)).toBe(true);
      });
    });
  });
});
