/**
 * Wrong-output RETRY soft-lock (reproduced 2026-09-21, K1-2, Android).
 *
 * A run that ends in OUTPUT MISMATCH leaves the store's isExecuting at
 * true. The void, insufficient-pulses, spec-not-met and
 * configuration-rejected paths all recover through handleReset →
 * reset() → setLevel, which clears it. RETRY on the wrong-output modal
 * deliberately keeps the board, so it never called reset(), and every
 * control gated on !isExecuting (ENGAGE row, piece tray, placement
 * guards) stayed hidden until the player left the level.
 *
 * RETRY must end the run without reloading the level: isExecuting and
 * machineState.isRunning go false, the run's output is cleared, and the
 * player's pieces stay exactly where they were.
 */

import * as fs from 'fs';
import * as path from 'path';
import { useGameStore } from '../../src/store/gameStore';
import { getDefaultPorts } from '../../src/game/engine';
import { BLANK } from '../../src/game/types';
import type { PlacedPiece, LevelDefinition } from '../../src/game/types';

function makePiece(
  id: string, type: PlacedPiece['type'], gridX: number, gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  return {
    id, type, category: type === 'transmitter' ? 'protocol' : 'physics', gridX, gridY,
    ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false,
    ...overrides,
  };
}

// A tape level whose expected output the pass-through board cannot
// produce, so ENGAGE ends in OUTPUT MISMATCH.
const TAPE_LEVEL: LevelDefinition = {
  id: 'retry-test',
  name: 'Retry Test',
  sector: 'kepler',
  description: 'Test',
  cogsLine: 'Test',
  gridWidth: 8,
  gridHeight: 7,
  prePlacedPieces: [
    makePiece('pre-in', 'source', 1, 3, { isPrePlaced: true }),
    makePiece('pre-out', 'terminal', 6, 3, { isPrePlaced: true }),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  inputTape: [1, 0, 1],
  expectedOutput: [0, 1, 0],
};

function buildBoard() {
  const s = useGameStore.getState();
  s.placePiece('conveyor', 2, 3);
  s.placePiece('conveyor', 3, 3);
  s.placePiece('conveyor', 4, 3);
  s.placePiece('conveyor', 5, 3);
}

function boardSnapshot() {
  return useGameStore.getState().machineState.pieces
    .map(p => `${p.id}:${p.type}@${p.gridX},${p.gridY}r${p.rotation}`)
    .sort();
}

beforeEach(() => {
  useGameStore.getState().setLevel(TAPE_LEVEL);
});

describe('endRun — wrong-output RETRY recovery', () => {
  it('reproduces the precondition: engage leaves isExecuting true', () => {
    buildBoard();
    useGameStore.getState().engage();
    expect(useGameStore.getState().isExecuting).toBe(true);
    expect(useGameStore.getState().machineState.isRunning).toBe(true);
  });

  it('clears isExecuting and isRunning after a run', () => {
    buildBoard();
    useGameStore.getState().engage();
    useGameStore.getState().endRun();
    const s = useGameStore.getState();
    expect(s.isExecuting).toBe(false);
    expect(s.machineState.isRunning).toBe(false);
    expect(s.machineState.status).toBe('idle');
  });

  it('keeps the board configuration intact', () => {
    buildBoard();
    const before = boardSnapshot();
    const wiresBefore = useGameStore.getState().machineState.wires.length;
    useGameStore.getState().engage();
    useGameStore.getState().endRun();
    expect(boardSnapshot()).toEqual(before);
    expect(useGameStore.getState().machineState.wires.length).toBe(wiresBefore);
    expect(useGameStore.getState().machineState.pieces.filter(p => !p.isPrePlaced)).toHaveLength(4);
  });

  it('clears the previous run output so the next ENGAGE starts clean', () => {
    buildBoard();
    useGameStore.getState().engage();
    useGameStore.getState().endRun();
    const s = useGameStore.getState();
    expect(s.executionSteps).toEqual([]);
    expect(s.stars).toBe(0);
    expect(s.machineState.signalPath).toEqual([]);
    expect(s.machineState.currentSignalStep).toBe(0);
    expect(s.machineState.inputTape).toEqual([1, 0, 1]);
    expect(s.machineState.outputTape).toEqual([BLANK, BLANK, BLANK]);
  });

  it('lets the player edit the board and engage again', () => {
    buildBoard();
    useGameStore.getState().engage();
    useGameStore.getState().endRun();
    const moved = useGameStore.getState().machineState.pieces.find(p => !p.isPrePlaced)!;
    useGameStore.getState().rotatePiece(moved.id);
    expect(
      useGameStore.getState().machineState.pieces.find(p => p.id === moved.id)!.rotation,
    ).toBe(90);
    const steps = useGameStore.getState().engage();
    expect(steps.length).toBeGreaterThan(0);
    expect(useGameStore.getState().isExecuting).toBe(true);
  });
});

describe('GameplayScreen wrong-output RETRY handler', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../src/screens/GameplayScreen.tsx'),
    'utf-8',
  );
  const start = source.indexOf('const handleWrongOutputRetry = useCallback(');
  const body = source.slice(start, source.indexOf('}, [', start));

  it('exists', () => {
    expect(start).toBeGreaterThan(-1);
  });

  it('ends the run in the store so !isExecuting controls come back', () => {
    expect(body).toMatch(/\bendRun\(\)/);
  });

  it('restarts the elapsed timer the ENGAGE press locked', () => {
    expect(body).toMatch(/\bresumeTimer\(\)/);
  });

  it('does not reload the level (board must survive RETRY)', () => {
    expect(body).not.toMatch(/\breset\(\)/);
    expect(body).not.toMatch(/\bhandleReset\(\)/);
  });
});

// T-Bot review of #53: executeMachine writes the data trail and Counter
// counts in place, and endRun (unlike reset → setLevel) did not restore
// them, so the run after a RETRY inherited the previous run's memory.
describe('endRun — the next run starts from a clean slate', () => {
  const STATEFUL_LEVEL: LevelDefinition = {
    ...TAPE_LEVEL,
    id: 'retry-stateful',
    dataTrail: { cells: [0, 0, 0], headPosition: 0 },
  };

  function buildStatefulBoard() {
    const s = useGameStore.getState();
    s.placePiece('conveyor', 2, 3);
    s.placePiece('scanner', 3, 3);
    s.placePiece('counter', 4, 3);
    s.placePiece('conveyor', 5, 3);
  }

  const stepTrace = (steps: { pieceId: string; success: boolean; message?: string }[]) =>
    steps.map(st => `${st.pieceId}|${st.success}|${st.message ?? ''}`);

  it('restores the level data trail and zeroes every Counter', () => {
    useGameStore.getState().setLevel(STATEFUL_LEVEL);
    buildStatefulBoard();
    useGameStore.getState().engage();
    useGameStore.getState().endRun();
    const s = useGameStore.getState();
    expect(s.machineState.dataTrail).toEqual(STATEFUL_LEVEL.dataTrail);
    expect(s.machineState.dataTrail.cells).not.toBe(STATEFUL_LEVEL.dataTrail.cells);
    for (const p of s.machineState.pieces.filter(pc => pc.type === 'counter')) {
      expect(p.count ?? 0).toBe(0);
    }
  });

  it('a run after RETRY produces exactly the steps of a fresh run', () => {
    useGameStore.getState().setLevel(STATEFUL_LEVEL);
    buildStatefulBoard();
    const fresh = stepTrace(useGameStore.getState().engage());
    useGameStore.getState().endRun();
    const afterRetry = stepTrace(useGameStore.getState().engage());
    expect(afterRetry).toEqual(fresh);
  });
});
