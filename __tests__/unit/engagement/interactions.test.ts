jest.mock('../../../src/game/engagement/bubbleHelpers', () => {
  const actual = jest.requireActual('../../../src/game/engagement/bubbleHelpers');
  return {
    ...actual,
    wait: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../../../src/game/engagement/spotlightHelpers', () => ({
  showSpotlight: jest.fn(),
  updateSpotlightValue: jest.fn(),
  hideSpotlight: jest.fn(),
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
  triggerPieceAnim,
  runScannerInteraction,
  runConfigNodeInteraction,
  runTransmitterInteraction,
} from '../../../src/game/engagement/interactions';
import * as spotlightHelpers from '../../../src/game/engagement/spotlightHelpers';
import type {
  EngagementContext,
  ExecutionStep,
  PieceAnimState,
  TapeHighlight,
} from '../../../src/game/engagement/types';
import { PIECE_ANIM_INITIAL } from '../../../src/game/engagement/types';

function buildCtx(): {
  ctx: EngagementContext;
  pieceAnimRef: { value: PieceAnimState };
  flashTimersRef: { current: ReturnType<typeof setTimeout>[] };
} {
  const pieceAnimRef = {
    value: {
      ...PIECE_ANIM_INITIAL,
      flashing: new Map(),
      animations: new Map(),
      gates: new Map(),
      failColors: new Map(),
      locked: new Set<string>(),
    },
  };

  const setPieceAnimState = jest.fn(arg => {
    if (typeof arg === 'function') {
      pieceAnimRef.value = arg(pieceAnimRef.value);
    } else {
      pieceAnimRef.value = arg;
    }
  });

  const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = { current: [] };

  const ctx = {
    setPieceAnimState,
    setSpotlightState: jest.fn(),
    setTapeBarState: jest.fn(),
    flashTimersRef,
    currentPulseRef: { current: 0 },
    getPieceCenter: jest.fn(() => null),
    setTapeCellHighlights: jest.fn(),
    setVisualTrailOverride: jest.fn(),
    setVisualOutputOverride: jest.fn(),
    cacheRef: {
      current: {
        board: { x: 0, y: 0 },
        input: null,
        trail: null,
        output: null,
      },
    },
    inputTape: undefined,
  } as unknown as EngagementContext;

  return { ctx, pieceAnimRef, flashTimersRef };
}

function step(type: string, pieceId: string, success = true): ExecutionStep {
  return { pieceId, type, success } as ExecutionStep;
}

describe('triggerPieceAnim', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches the rolling tag for a conveyor', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    expect(pieceAnimRef.value.animations.get('p-1')).toBe('rolling');
  });

  it('dispatches the spinning tag for a gear', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    triggerPieceAnim(ctx, step('gear', 'p-g'));
    expect(pieceAnimRef.value.animations.get('p-g')).toBe('spinning');
  });

  it('dispatches the locking tag for a terminal', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    triggerPieceAnim(ctx, step('terminal', 'p-t'));
    expect(pieceAnimRef.value.animations.get('p-t')).toBe('locking');
  });

  it('records the gate result for a passing configNode', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    void triggerPieceAnim(ctx, step('configNode', 'p-c', true));
    expect(pieceAnimRef.value.gates.get('p-c')).toBe('pass');
  });

  it('records the gate result for a blocked configNode', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    void triggerPieceAnim(ctx, step('configNode', 'p-c', false));
    expect(pieceAnimRef.value.gates.get('p-c')).toBe('block');
  });

  it('clears the active animation after the piece duration elapses', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    expect(pieceAnimRef.value.animations.has('p-1')).toBe(true);
    jest.advanceTimersByTime(180);
    expect(pieceAnimRef.value.animations.has('p-1')).toBe(false);
  });

  it('returns a resolved promise for a non-tape piece', async () => {
    const { ctx } = buildCtx();
    const result = triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    await expect(result).resolves.toBeUndefined();
  });

  it('flashes the piece with its beam color', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    expect(pieceAnimRef.value.flashing.get('p-1')).toBe('#F0B429');
  });
});

describe('runScannerInteraction', () => {
  beforeEach(() => {
    jest.useRealTimers();
    (spotlightHelpers.showSpotlight as jest.Mock).mockClear();
    (spotlightHelpers.updateSpotlightValue as jest.Mock).mockClear();
    (spotlightHelpers.hideSpotlight as jest.Mock).mockClear();
  });

  function buildScannerCtx(): EngagementContext {
    const { ctx } = buildCtx();
    (ctx as unknown as { getPieceCenter: jest.Mock }).getPieceCenter = jest.fn(
      () => ({ x: 10, y: 20 }),
    );
    ctx.cacheRef.current = {
      board: { x: 0, y: 0 },
      input: { x: 100, y: 200, w: 20, h: 30 },
      trail: { x: 100, y: 300, w: 20, h: 30 },
      output: { x: 100, y: 400, w: 20, h: 30 },
    };
    (ctx as unknown as { inputTape: (0 | 1)[] }).inputTape = [1, 0, 1];
    return ctx;
  }

  it('projects the spotlight from the Scanner to the Input tape cell', async () => {
    const ctx = buildScannerCtx();
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    const calls = (spotlightHelpers.showSpotlight as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    const [, fromX, fromY, toX, toY] = calls[0];
    // Scanner center = board(0,0) + piece(10,20) = (10, 20)
    expect(fromX).toBe(10);
    expect(fromY).toBe(20);
    // Input cell center — first cell at cached.x + cached.w/2, cached.y + cached.h/2
    expect(toX).toBe(100 + 20 / 2);
    expect(toY).toBe(200 + 30 / 2);
  });

  it('calls updateSpotlightValue with the tape value after the read', async () => {
    const ctx = buildScannerCtx();
    ctx.currentPulseRef.current = 0;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    // inputTape[0] = 1 → display '1'
    expect(spotlightHelpers.updateSpotlightValue).toHaveBeenCalledWith(
      expect.anything(),
      '1',
    );
  });

  it('hides the spotlight before writing the trail value', async () => {
    const ctx = buildScannerCtx();
    const setVisualTrailOverride = ctx.setVisualTrailOverride as jest.Mock;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    const hideOrder = (spotlightHelpers.hideSpotlight as jest.Mock).mock
      .invocationCallOrder[0];
    const trailWriteOrder = setVisualTrailOverride.mock.invocationCallOrder[0];
    expect(hideOrder).toBeLessThan(trailWriteOrder);
  });

  it('writes the read value into the visual trail override silently', async () => {
    const ctx = buildScannerCtx();
    const setVisualTrailOverride = ctx.setVisualTrailOverride as jest.Mock;
    ctx.currentPulseRef.current = 2;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    const updater = setVisualTrailOverride.mock.calls.at(-1)?.[0] as
      | ((prev: (0 | 1 | null)[] | null) => (0 | 1 | null)[] | null)
      | undefined;
    expect(typeof updater).toBe('function');
    const result = updater?.([null, null, null]);
    expect(result).toEqual([null, null, 1]);
  });

  it('clears only the in-${pulse} highlight, preserving trail and prior-pulse entries', async () => {
    const ctx = buildScannerCtx();
    const setTapeCellHighlights = ctx.setTapeCellHighlights as jest.Mock;
    ctx.currentPulseRef.current = 1;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    const lastCall = setTapeCellHighlights.mock.calls.at(-1)?.[0];
    expect(typeof lastCall).toBe('function');
    const priorState = new Map<string, TapeHighlight>([
      ['in-1', 'read'],
      ['trail-0', 'gate-pass'],
      ['trail-1', 'write'],
      ['out-0', 'write'],
    ]);
    const result = (lastCall as (p: Map<string, TapeHighlight>) => Map<string, TapeHighlight>)(priorState);
    expect(result.has('in-1')).toBe(false);
    expect(result.get('trail-0')).toBe('gate-pass');
    expect(result.get('trail-1')).toBe('write');
    expect(result.get('out-0')).toBe('write');
  });
});

describe('runConfigNodeInteraction', () => {
  beforeEach(() => {
    jest.useRealTimers();
    (spotlightHelpers.showSpotlight as jest.Mock).mockClear();
    (spotlightHelpers.hideSpotlight as jest.Mock).mockClear();
  });

  function buildConfigCtx(): EngagementContext {
    const { ctx } = buildCtx();
    (ctx as unknown as { getPieceCenter: jest.Mock }).getPieceCenter = jest.fn(
      () => ({ x: 10, y: 20 }),
    );
    ctx.cacheRef.current = {
      board: { x: 0, y: 0 },
      input: { x: 100, y: 200, w: 20, h: 30 },
      trail: { x: 100, y: 300, w: 20, h: 30 },
      output: { x: 100, y: 400, w: 20, h: 30 },
    };
    return ctx;
  }

  it('projects the spotlight in green from Config Node to Trail cell on pass', async () => {
    const ctx = buildConfigCtx();
    ctx.currentPulseRef.current = 2;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', true));
    const calls = (spotlightHelpers.showSpotlight as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    const [, fromX, fromY, toX, toY, color] = calls[0];
    expect(fromX).toBe(10);
    expect(fromY).toBe(20);
    // Trail cell at pulse=2 (w=20, gap=3): x = 100 + 2*(20+3) + 10 = 156
    expect(toX).toBe(100 + 2 * (20 + 3) + 20 / 2);
    expect(toY).toBe(300 + 30 / 2);
    expect(color).toBe('#00FF87');
  });

  it('projects the spotlight in red on block', async () => {
    const ctx = buildConfigCtx();
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', false));
    const [, , , , , color] = (spotlightHelpers.showSpotlight as jest.Mock).mock.calls[0];
    expect(color).toBe('#FF3B3B');
  });

  it('sets trail-${pulse} to gate-pass for a passing gate and does not blanket-clear', async () => {
    const ctx = buildConfigCtx();
    const setTapeCellHighlights = ctx.setTapeCellHighlights as jest.Mock;
    ctx.currentPulseRef.current = 2;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', true));
    const calls = setTapeCellHighlights.mock.calls;
    for (const [arg] of calls) {
      expect(typeof arg).toBe('function');
    }
    let state = new Map<string, TapeHighlight>();
    for (const [arg] of calls) {
      state = (arg as (p: Map<string, TapeHighlight>) => Map<string, TapeHighlight>)(state);
    }
    expect(state.get('trail-2')).toBe('gate-pass');
  });

  it('sets trail-${pulse} to gate-block for a failing gate', async () => {
    const ctx = buildConfigCtx();
    const setTapeCellHighlights = ctx.setTapeCellHighlights as jest.Mock;
    ctx.currentPulseRef.current = 0;
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', false));
    let state = new Map<string, TapeHighlight>();
    for (const [arg] of setTapeCellHighlights.mock.calls) {
      state = (arg as (p: Map<string, TapeHighlight>) => Map<string, TapeHighlight>)(state);
    }
    expect(state.get('trail-0')).toBe('gate-block');
  });
});

describe('runTransmitterInteraction', () => {
  beforeEach(() => {
    jest.useRealTimers();
    (spotlightHelpers.showSpotlight as jest.Mock).mockClear();
    (spotlightHelpers.hideSpotlight as jest.Mock).mockClear();
  });

  function buildTransmitterCtx(): EngagementContext {
    const { ctx } = buildCtx();
    (ctx as unknown as { getPieceCenter: jest.Mock }).getPieceCenter = jest.fn(
      () => ({ x: 10, y: 20 }),
    );
    ctx.cacheRef.current = {
      board: { x: 0, y: 0 },
      input: { x: 100, y: 200, w: 20, h: 30 },
      trail: { x: 100, y: 300, w: 20, h: 30 },
      output: { x: 100, y: 400, w: 20, h: 30 },
    };
    return ctx;
  }

  it('projects the amber spotlight from Transmitter to Output cell with the written value', async () => {
    const ctx = buildTransmitterCtx();
    ctx.currentPulseRef.current = 1;
    await runTransmitterInteraction(ctx, step('transmitter', 'p-t'));
    const calls = (spotlightHelpers.showSpotlight as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    const [, fromX, fromY, toX, toY, color, value] = calls[0];
    expect(fromX).toBe(10);
    expect(fromY).toBe(20);
    // Output cell at pulse=1 (w=20, gap=3): x = 100 + 1*(20+3) + 10 = 133
    expect(toX).toBe(100 + 1 * (20 + 3) + 20 / 2);
    expect(toY).toBe(400 + 30 / 2);
    expect(color).toMatch(/^#/);
    // outputTape[1] is -1 per mock (nullish-coalesce only fires on undefined).
    expect(value).toBe('-1');
  });

  it('sets an out-${pulse} write highlight so the output cell lights up', async () => {
    const ctx = buildTransmitterCtx();
    const setTapeCellHighlights = ctx.setTapeCellHighlights as jest.Mock;
    ctx.currentPulseRef.current = 1;
    await runTransmitterInteraction(ctx, step('transmitter', 'p-t'));
    let state = new Map<string, TapeHighlight>();
    for (const [arg] of setTapeCellHighlights.mock.calls) {
      state = (arg as (p: Map<string, TapeHighlight>) => Map<string, TapeHighlight>)(state);
    }
    expect(state.get('out-1')).toBe('write');
  });
});

describe('highlight persistence across pulses', () => {
  beforeEach(() => {
    jest.useRealTimers();
    (spotlightHelpers.showSpotlight as jest.Mock).mockClear();
    (spotlightHelpers.hideSpotlight as jest.Mock).mockClear();
  });

  function buildMultiPulseCtx(): {
    ctx: EngagementContext;
    highlights: Map<string, TapeHighlight>;
  } {
    const { ctx } = buildCtx();
    (ctx as unknown as { getPieceCenter: jest.Mock }).getPieceCenter = jest.fn(
      () => ({ x: 10, y: 20 }),
    );
    ctx.cacheRef.current = {
      board: { x: 0, y: 0 },
      input: { x: 100, y: 200, w: 20, h: 30 },
      trail: { x: 100, y: 300, w: 20, h: 30 },
      output: { x: 100, y: 400, w: 20, h: 30 },
    };
    (ctx as unknown as { inputTape: (0 | 1)[] }).inputTape = [1, 0];

    const highlights = new Map<string, TapeHighlight>();
    (ctx as unknown as { setTapeCellHighlights: jest.Mock }).setTapeCellHighlights =
      jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          const next = (arg as (
            prev: Map<string, TapeHighlight>,
          ) => Map<string, TapeHighlight>)(highlights);
          highlights.clear();
          for (const [k, v] of next) highlights.set(k, v);
        } else {
          highlights.clear();
          for (const [k, v] of arg as Map<string, TapeHighlight>) {
            highlights.set(k, v);
          }
        }
      });
    return { ctx, highlights };
  }

  it('accumulates trail and out highlights across Scanner + ConfigNode + Transmitter over two pulses', async () => {
    const { ctx, highlights } = buildMultiPulseCtx();

    ctx.currentPulseRef.current = 0;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', true));
    await runTransmitterInteraction(ctx, step('transmitter', 'p-t'));

    ctx.currentPulseRef.current = 1;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    await runConfigNodeInteraction(ctx, step('configNode', 'p-c', false));

    expect(highlights.get('trail-0')).toBe('gate-pass');
    expect(highlights.get('out-0')).toBe('write');
    expect(highlights.get('trail-1')).toBe('gate-block');
    expect(highlights.has('in-0')).toBe(false);
    expect(highlights.has('in-1')).toBe(false);
  });
});

describe('OUT cell persistence across pulses', () => {
  // Simulates GameplayScreen's OUT cell styling rule so we can assert
  // the final red/green decision for each cell after a 4-pulse run.
  type Styling = 'red' | 'green' | 'none';
  function classifyOutCell(args: {
    visualOutputOverride: number[] | null;
    machineOutputTape: number[] | undefined;
    expectedOutput: number[] | undefined;
    i: number;
  }): Styling {
    const { visualOutputOverride, machineOutputTape, expectedOutput, i } = args;
    const rawWritten = visualOutputOverride
      ? visualOutputOverride[i]
      : machineOutputTape?.[i];
    const written = rawWritten;
    const expected = expectedOutput?.[i];
    const hasValue = written !== undefined && written !== -1;
    const inRange = expected !== undefined;
    const correct = hasValue && inRange && written === expected;
    const wrong = hasValue && inRange && written !== expected;
    const beyondRangeWrite = hasValue && !inRange;
    if (wrong) return 'red';
    if (correct || beyondRangeWrite) return 'green';
    return 'none';
  }

  beforeEach(() => {
    jest.useRealTimers();
    (spotlightHelpers.showSpotlight as jest.Mock).mockClear();
    (spotlightHelpers.hideSpotlight as jest.Mock).mockClear();
  });

  function build4PulseCtx(): {
    ctx: EngagementContext;
    visualOutputOverride: { value: number[] | null };
    outputTapeMock: number[];
  } {
    const { ctx } = buildCtx();
    (ctx as unknown as { getPieceCenter: jest.Mock }).getPieceCenter = jest.fn(
      () => ({ x: 10, y: 20 }),
    );
    ctx.cacheRef.current = {
      board: { x: 0, y: 0 },
      input: { x: 100, y: 200, w: 20, h: 30 },
      trail: { x: 100, y: 300, w: 20, h: 30 },
      output: { x: 100, y: 400, w: 20, h: 30 },
    };
    (ctx as unknown as { inputTape: (0 | 1)[] }).inputTape = [1, 0, 1, 0];

    // 4-pulse scenario: player's machine writes input-parity to OUT.
    // expectedOutput = [0, 0, 0, 0]. Pulses 0 and 2 (input=1) mismatch;
    // pulses 1 and 3 (input=0) match.
    const outputTapeMock = [1, 0, 1, 0];

    // Override the useGameStore mock for this test block to return our
    // specific outputTape values so runTransmitterInteraction picks them up.
    const gameStoreMock = jest.requireMock(
      '../../../src/store/gameStore',
    ) as { useGameStore: { getState: jest.Mock } };
    gameStoreMock.useGameStore.getState.mockReturnValue({
      machineState: {
        dataTrail: { cells: [0, 0, 0, 0], headPosition: 0 },
        outputTape: outputTapeMock,
      },
    });

    // Stateful visualOutputOverride starting as [-1]*4.
    const visualOutputOverride: { value: number[] | null } = {
      value: [-1, -1, -1, -1],
    };
    (ctx as unknown as { setVisualOutputOverride: jest.Mock }).setVisualOutputOverride =
      jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          visualOutputOverride.value = (arg as (
            prev: number[] | null,
          ) => number[] | null)(visualOutputOverride.value);
        } else {
          visualOutputOverride.value = arg as number[] | null;
        }
      });

    return { ctx, visualOutputOverride, outputTapeMock };
  }

  it('keeps red on cells whose written value mismatches expectedOutput across 4 pulses', async () => {
    const { ctx, visualOutputOverride } = build4PulseCtx();
    const expectedOutput = [0, 0, 0, 0];

    for (let p = 0; p < 4; p++) {
      ctx.currentPulseRef.current = p;
      await runTransmitterInteraction(ctx, step('transmitter', `p-t${p}`));
    }

    // All four cells received Transmitter writes.
    expect(visualOutputOverride.value).toEqual([1, 0, 1, 0]);

    // Pulse 0 and 2 wrote 1 into an expected-0 slot → red.
    // Pulse 1 and 3 wrote 0 into an expected-0 slot → green.
    expect(
      classifyOutCell({
        visualOutputOverride: visualOutputOverride.value,
        machineOutputTape: [1, 0, 1, 0],
        expectedOutput,
        i: 0,
      }),
    ).toBe('red');
    expect(
      classifyOutCell({
        visualOutputOverride: visualOutputOverride.value,
        machineOutputTape: [1, 0, 1, 0],
        expectedOutput,
        i: 1,
      }),
    ).toBe('green');
    expect(
      classifyOutCell({
        visualOutputOverride: visualOutputOverride.value,
        machineOutputTape: [1, 0, 1, 0],
        expectedOutput,
        i: 2,
      }),
    ).toBe('red');
    expect(
      classifyOutCell({
        visualOutputOverride: visualOutputOverride.value,
        machineOutputTape: [1, 0, 1, 0],
        expectedOutput,
        i: 3,
      }),
    ).toBe('green');
  });

  it('keeps red on mismatched cells after visualOutputOverride is cleared (completion screen fallback to machineState.outputTape)', async () => {
    const { ctx, visualOutputOverride } = build4PulseCtx();
    const expectedOutput = [0, 0, 0, 0];

    for (let p = 0; p < 4; p++) {
      ctx.currentPulseRef.current = p;
      await runTransmitterInteraction(ctx, step('transmitter', `p-t${p}`));
    }

    // Simulate the post-run state where visualOutputOverride is null
    // and styling falls through to machineState.outputTape.
    visualOutputOverride.value = null;

    expect(
      classifyOutCell({
        visualOutputOverride: visualOutputOverride.value,
        machineOutputTape: [1, 0, 1, 0],
        expectedOutput,
        i: 0,
      }),
    ).toBe('red');
    expect(
      classifyOutCell({
        visualOutputOverride: visualOutputOverride.value,
        machineOutputTape: [1, 0, 1, 0],
        expectedOutput,
        i: 2,
      }),
    ).toBe('red');
  });

  it('cells beyond expectedOutput.length that received a write render green, not red', () => {
    const shortExpected = [0, 0, 0]; // length 3
    const outputTape = [1, 0, 1, 1, 0, 1, 0, 1]; // length 8
    // Cells 3, 5, 7 hold 1 but expectedOutput[3..7] is undefined.
    expect(
      classifyOutCell({
        visualOutputOverride: outputTape,
        machineOutputTape: outputTape,
        expectedOutput: shortExpected,
        i: 3,
      }),
    ).toBe('green');
    expect(
      classifyOutCell({
        visualOutputOverride: outputTape,
        machineOutputTape: outputTape,
        expectedOutput: shortExpected,
        i: 5,
      }),
    ).toBe('green');
    expect(
      classifyOutCell({
        visualOutputOverride: outputTape,
        machineOutputTape: outputTape,
        expectedOutput: shortExpected,
        i: 7,
      }),
    ).toBe('green');
  });
});
