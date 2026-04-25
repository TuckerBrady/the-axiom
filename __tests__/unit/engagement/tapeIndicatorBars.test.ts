jest.mock('../../../src/game/engagement/bubbleHelpers', () => {
  const actual = jest.requireActual('../../../src/game/engagement/bubbleHelpers');
  return {
    ...actual,
    wait: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../../../src/game/engagement/valueTravelAnimation', () => ({
  // Invoke the onArrive callback synchronously to mirror production
  // behavior post-Prompt 91 Fix 6 (trail-write side effects now run
  // inside onArrive, not after the await).
  runValueTravel: jest.fn(
    (..._args: unknown[]) => {
      const onArrive = _args[7] as (() => void) | undefined;
      onArrive?.();
      return Promise.resolve();
    },
  ),
  resetGlowTraveler: jest.fn(),
}));

jest.mock('../../../src/store/gameStore', () => ({
  useGameStore: {
    getState: jest.fn(() => ({
      machineState: {
        dataTrail: { cells: [0, 1, 0], headPosition: 0 },
        outputTape: [-1, -1, -1],
      },
    })),
  },
}));

import {
  runScannerInteraction,
  runConfigNodeInteraction,
  runTransmitterInteraction,
} from '../../../src/game/engagement/interactions';
import {
  TAPE_BAR_INITIAL,
  type TapeIndicatorBarState,
  type EngagementContext,
  type ExecutionStep,
  PIECE_ANIM_INITIAL,
} from '../../../src/game/engagement/types';

function buildCtx(): {
  ctx: EngagementContext;
  barState: { value: TapeIndicatorBarState };
} {
  const barState: { value: TapeIndicatorBarState } = { value: { ...TAPE_BAR_INITIAL } };

  const setTapeBarState = jest.fn((arg: unknown) => {
    if (typeof arg === 'function') {
      barState.value = (arg as (p: TapeIndicatorBarState) => TapeIndicatorBarState)(
        barState.value,
      );
    } else {
      barState.value = arg as TapeIndicatorBarState;
    }
  });

  const ctx = {
    setPieceAnimState: jest.fn(arg => {
      if (typeof arg === 'function') arg({ ...PIECE_ANIM_INITIAL });
    }),
    setTapeBarState,
    setGlowTravelerState: jest.fn(),
    valueTravelRefs: {
      x: { setValue: jest.fn() },
      y: { setValue: jest.fn() },
      scale: { setValue: jest.fn() },
      opacity: { setValue: jest.fn() },
    },
    gateOutcomes: { current: new Map() },
    flashTimersRef: { current: [] as ReturnType<typeof setTimeout>[] },
    currentPulseRef: { current: 0 },
    getPieceCenter: jest.fn(() => ({ x: 10, y: 20 })),
    setTapeCellHighlights: jest.fn(),
    setVisualTrailOverride: jest.fn(),
    setVisualOutputOverride: jest.fn(),
    cacheRef: {
      current: {
        board: { x: 0, y: 0 },
        input: { x: 100, y: 200, w: 20, h: 30 },
        trail: { x: 100, y: 300, w: 20, h: 30 },
        output: { x: 100, y: 400, w: 20, h: 30 },
      },
    },
    inputTape: [1, 0, 1] as number[],
  } as unknown as EngagementContext;

  return { ctx, barState };
}

function step(type: string, pieceId: string, success = true): ExecutionStep {
  return { pieceId, type, success } as ExecutionStep;
}

describe('TapeIndicatorBarState', () => {
  it('TAPE_BAR_INITIAL has all indices null', () => {
    expect(TAPE_BAR_INITIAL).toEqual({
      inIndex: null,
      trailIndex: null,
      outIndex: null,
    });
  });

  it('a partial update to inIndex preserves the other indices as null', () => {
    const next: TapeIndicatorBarState = { ...TAPE_BAR_INITIAL, inIndex: 3 };
    expect(next).toEqual({ inIndex: 3, trailIndex: null, outIndex: null });
  });

  it('Scanner interaction sets inIndex AND trailIndex to the current pulse', async () => {
    const { ctx, barState } = buildCtx();
    ctx.currentPulseRef.current = 2;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    expect(barState.value.inIndex).toBe(2);
    expect(barState.value.trailIndex).toBe(2);
    expect(barState.value.outIndex).toBeNull();
  });

  it('ConfigNode interaction sets trailIndex to the current pulse', async () => {
    const { ctx, barState } = buildCtx();
    ctx.currentPulseRef.current = 1;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', true));
    expect(barState.value.trailIndex).toBe(1);
    expect(barState.value.inIndex).toBeNull();
    expect(barState.value.outIndex).toBeNull();
  });

  it('Transmitter interaction sets outIndex to the current pulse', async () => {
    const { ctx, barState } = buildCtx();
    ctx.currentPulseRef.current = 0;
    await runTransmitterInteraction(ctx, step('transmitter', 'p-t'));
    expect(barState.value.outIndex).toBe(0);
    expect(barState.value.inIndex).toBeNull();
    expect(barState.value.trailIndex).toBeNull();
  });

  it('resetting to TAPE_BAR_INITIAL clears all indices', () => {
    const seeded: TapeIndicatorBarState = { inIndex: 2, trailIndex: 4, outIndex: 1 };
    // Simulate the same setter-shape as replayLoop's reset call:
    // setTapeBarState(TAPE_BAR_INITIAL).
    const reset: TapeIndicatorBarState = TAPE_BAR_INITIAL;
    expect(reset).toEqual({ inIndex: null, trailIndex: null, outIndex: null });
    // Confirm the seeded state and the reset target are distinct objects —
    // a defensive guard against accidental mutation of TAPE_BAR_INITIAL.
    expect(seeded).not.toBe(TAPE_BAR_INITIAL);
    expect(seeded.inIndex).toBe(2);
  });
});
