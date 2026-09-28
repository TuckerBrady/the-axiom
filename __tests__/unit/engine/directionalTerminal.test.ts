// Pre-written tests — SPEC_DIRECTIONAL_TERMINAL v1.0 section 11 (AXM-029 PR 1).
// Bodies landed verbatim from the spec. Where the spec left a body as a
// comment ("Author against the real ..."), the body below implements that
// comment against the real engine without weakening its stated assertion.
import type { PlacedPiece, MachineState } from '../../../src/game/types';
import {
  executeMachine, autoConnectPhysicsPieces, calculateStars,
  getDefaultPorts, getInputPorts, canSendTo,
} from '../../../src/game/engine';
import { computeSplitterMagnets } from '../../../src/store/gameStore';

// makePiece / makeState: copy from __tests__/unit/engine.test.ts

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

const reached = (steps: { type: string; success: boolean }[]) =>
  steps.some(s => s.type === 'terminal' && s.success);
const rejected = (steps: { type: string; success: boolean }[]) =>
  steps.filter(s => s.type === 'terminalRejected');

describe('Directional Terminal — ports', () => {
  it('[3.1] GUARD: terminal without entrySide accepts all four sides', () => {
    const t = makePiece('t', 'terminal', 3, 3, { isPrePlaced: true });
    expect(new Set(getInputPorts(t))).toEqual(new Set(['top', 'bottom', 'left', 'right']));
  });

  it('[3.2] terminal with entrySide accepts only that side', () => {
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      const t = makePiece('t', 'terminal', 3, 3, { isPrePlaced: true, entrySide: side });
      expect(getInputPorts(t)).toEqual([side]);
    }
  });

  it('[3.3] rotation does not affect a directional terminal', () => {
    const t = makePiece('t', 'terminal', 3, 3, { isPrePlaced: true, entrySide: 'left', rotation: 90 });
    expect(getInputPorts(t)).toEqual(['left']);
  });

  it('[3.3] GUARD: rotation does not affect an omnidirectional terminal', () => {
    const t = makePiece('t', 'terminal', 3, 3, { isPrePlaced: true, rotation: 270 });
    expect(getInputPorts(t)).toHaveLength(4);
  });

  it('[3.9] canSendTo is true only across the entry side', () => {
    const t = makePiece('t', 'terminal', 3, 3, { isPrePlaced: true, entrySide: 'left' });
    const fromLeft = makePiece('c1', 'conveyor', 2, 3);                    // outputs right
    const fromTop = makePiece('c2', 'conveyor', 3, 2, { rotation: 90 });   // outputs bottom
    expect(canSendTo(fromLeft, t)).toBe(true);
    expect(canSendTo(fromTop, t)).toBe(false);
  });

  it('[3.9] no wire is drawn into a wrong side', () => {
    const t = makePiece('t', 'terminal', 3, 3, { isPrePlaced: true, entrySide: 'left' });
    const fromTop = makePiece('c2', 'conveyor', 3, 2, { rotation: 90 });
    const wires = autoConnectPhysicsPieces([t, fromTop]);
    expect(wires.some(w => w.toPieceId === 't' || w.fromPieceId === 't')).toBe(false);
  });
});

describe('Directional Terminal — execution', () => {
  it('[3.2][4.1] conveyor feeding the entry side succeeds', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('c1', 'conveyor', 1, 0),
      makePiece('t', 'terminal', 2, 0, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(reached(steps)).toBe(true);
    expect(rejected(steps)).toHaveLength(0);
  });

  it('[3.4][3.5] wrong-side arrival records exactly one rejection and does not succeed', () => {
    // Source (0,0) -> Gear (1,0) -> conveyor down (1,1) -> terminal (1,2) entered from top,
    // but entrySide is 'left'.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('c', 'conveyor', 1, 1, { rotation: 90 }),
      makePiece('t', 'terminal', 1, 2, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(reached(steps)).toBe(false);
    const r = rejected(steps);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ pieceId: 't', success: false, side: 'top' });
    expect(steps[steps.length - 1].type).toBe('terminalRejected');
  });

  it('[3.8] calculateStars treats a rejection-only run as failed', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('c', 'conveyor', 1, 1, { rotation: 90 }),
      makePiece('t', 'terminal', 1, 2, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const steps = executeMachine(makeState(pieces));
    const failed = calculateStars([], 2, 2);          // reference value for a failed run
    expect(calculateStars(steps, 2, 2)).toBe(failed);
  });

  it('[4.2] gear adjacent on the entry side delivers', () => {
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 1),
      makePiece('t', 'terminal', 1, 2, { isPrePlaced: true, entrySide: 'top' }),
    ];
    expect(reached(executeMachine(makeState(pieces)))).toBe(true);
  });

  it('[4.2] gear adjacent only on a wrong side is rejected', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('t', 'terminal', 1, 1, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(reached(steps)).toBe(false);
    expect(rejected(steps).length).toBeGreaterThanOrEqual(1);
  });

  it('[3.7][4.5] splitter: one wrong-side branch, one entry-side branch -> pulse succeeds', () => {
    // Author against the real Splitter magnet mechanic: branch A reaches the terminal's top
    // (rejected), branch B routes around and enters from the left (accepted).
    // Assert: reached(steps) === true AND rejected(steps).length >= 1.
    //
    // Source (1,0) feeds Splitter (1,1) from the top. Its magnets bind to the
    // two Gears: branch A Gear (2,1) sits above the terminal and emits into its
    // top (rejected); branch B Gear (1,2) sits left of it and enters from the
    // left (accepted).
    const pieces = computeSplitterMagnets([
      makePiece('s', 'source', 1, 0, { isPrePlaced: true }),
      makePiece('sp', 'splitter', 1, 1),
      makePiece('gA', 'gear', 2, 1),
      makePiece('gB', 'gear', 1, 2),
      makePiece('t', 'terminal', 2, 2, { isPrePlaced: true, entrySide: 'left' }),
    ]);
    const splitter = pieces.find(p => p.id === 'sp')!;
    expect(new Set(splitter.connectedMagnetSides)).toEqual(new Set(['right', 'bottom']));
    const steps = executeMachine(makeState(pieces));
    expect(reached(steps)).toBe(true);
    expect(rejected(steps).length).toBeGreaterThanOrEqual(1);
  });

  it('[4.3] bridge bottom output into entrySide top delivers; right lane unaffected', () => {
    // Bridge at (2,1) rotation 0 outputs right and bottom. Terminal at (2,2) entrySide 'top'.
    // Feed the bridge's top input. Assert reached === true.
    //
    // Source (2,0) feeds the bridge's top input. A conveyor on the right lane
    // (3,1) shows the other output still carries the signal.
    const pieces = [
      makePiece('s', 'source', 2, 0, { isPrePlaced: true }),
      makePiece('b', 'bridge', 2, 1),
      makePiece('cR', 'conveyor', 3, 1),
      makePiece('t', 'terminal', 2, 2, { isPrePlaced: true, entrySide: 'top' }),
    ];
    const steps = executeMachine(makeState(pieces));
    expect(reached(steps)).toBe(true);
    expect(rejected(steps)).toHaveLength(0);
    expect(steps.some(s => s.pieceId === 'cR' && s.success)).toBe(true);
  });

  it('[4.4] merger output into entry side delivers; into wrong side is rejected', () => {
    // Two cases, same board, merger rotated 0 vs 90. Assert reached true / rejected >= 1.
    //
    // Adaptation: a Merger's single output points right at rotation 0 and
    // down at rotation 90, so one fixed cell cannot face the same terminal in
    // both rotations. The terminal (2,2, entrySide 'left') is identical in
    // both cases; the Merger sits on the cell its output faces, fed from its
    // top input by a Source above it.
    // Case A: rotation 0 at (1,2) -> output right -> enters terminal from the left.
    const entry = [
      makePiece('s', 'source', 1, 1, { isPrePlaced: true }),
      makePiece('m', 'merger', 1, 2, { rotation: 0 }),
      makePiece('t', 'terminal', 2, 2, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const entrySteps = executeMachine(makeState(entry));
    expect(reached(entrySteps)).toBe(true);
    expect(rejected(entrySteps)).toHaveLength(0);

    // Case B: rotation 90 at (2,1) -> output down -> meets the terminal's top.
    const wrong = [
      makePiece('s', 'source', 2, 0, { isPrePlaced: true }),
      makePiece('m', 'merger', 2, 1, { rotation: 90 }),
      makePiece('t', 'terminal', 2, 2, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const wrongSteps = executeMachine(makeState(wrong));
    expect(reached(wrongSteps)).toBe(false);
    expect(rejected(wrongSteps).length).toBeGreaterThanOrEqual(1);
  });

  it('[4.6] transmitter exits straight-through into the entry side and delivers', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0, { category: 'protocol' }),
      makePiece('t', 'terminal', 2, 0, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [1], outputTape: ['__BLANK__'] }));
    expect(reached(steps)).toBe(true);
  });

  it('[4.6] negative: a transmitter does not turn toward the entry side', () => {
    // T-Bot gate on PR #66. The Transmitter is entered from the left, so it
    // exits straight through to the right only. Its bottom faces the
    // Terminal's entry side, but straight-through forbids that exit: the
    // signal neither reaches the Terminal nor records a rejection.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0, { category: 'protocol' }),
      makePiece('t', 'terminal', 1, 1, { isPrePlaced: true, entrySide: 'top' }),
    ];
    const steps = executeMachine(makeState(pieces, { inputTape: [1], outputTape: ['__BLANK__'] }));
    expect(reached(steps)).toBe(false);
    expect(rejected(steps)).toHaveLength(0);
  });

  it('[3.6][4.7] a transmitter write before a wrong-side arrival is kept', () => {
    // Transmitter writes, path continues into the terminal's wrong side.
    // Assert outputTape[0] holds the written value AND reached === false.
    //
    // The Transmitter is entered from the left, exits straight through to the
    // right, and meets the terminal's left side while its entry side is 'top'.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('tx', 'transmitter', 1, 0, { category: 'protocol' }),
      makePiece('t', 'terminal', 2, 0, { isPrePlaced: true, entrySide: 'top' }),
    ];
    const state = makeState(pieces, { inputTape: [1], outputTape: ['__BLANK__'] });
    const steps = executeMachine(state);
    expect(state.outputTape![0]).toBe(1);
    expect(reached(steps)).toBe(false);
    expect(rejected(steps)).toHaveLength(1);
  });
});
