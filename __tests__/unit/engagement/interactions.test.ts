jest.mock('../../../src/game/engagement/bubbleHelpers', () => {
  const actual = jest.requireActual('../../../src/game/engagement/bubbleHelpers');
  return {
    ...actual,
    animateBubbleTo: jest.fn(() => Promise.resolve()),
    startBubbleTrail: jest.fn(),
    stopBubbleTrail: jest.fn(),
    hideBubble: jest.fn(),
    wait: jest.fn(() => Promise.resolve()),
  };
});

import { triggerPieceAnim, runScannerInteraction } from '../../../src/game/engagement/interactions';
import * as bubbleHelpers from '../../../src/game/engagement/bubbleHelpers';
import type {
  EngagementContext,
  ExecutionStep,
  PieceAnimState,
  BubbleAnimState,
} from '../../../src/game/engagement/types';
import { PIECE_ANIM_INITIAL, BUBBLE_INITIAL } from '../../../src/game/engagement/types';

function buildCtx(): {
  ctx: EngagementContext;
  pieceAnimRef: { value: PieceAnimState };
  bubbleAnimRef: { value: BubbleAnimState };
  flashTimersRef: { current: ReturnType<typeof setTimeout>[] };
} {
  const pieceAnimRef = { value: { ...PIECE_ANIM_INITIAL, flashing: new Map(), animations: new Map(), gates: new Map(), failColors: new Map(), locked: new Set<string>() } };
  const bubbleAnimRef = { value: { ...BUBBLE_INITIAL } };

  const setPieceAnimState = jest.fn(arg => {
    if (typeof arg === 'function') {
      pieceAnimRef.value = arg(pieceAnimRef.value);
    } else {
      pieceAnimRef.value = arg;
    }
  });
  const setBubbleAnimState = jest.fn(arg => {
    if (typeof arg === 'function') {
      bubbleAnimRef.value = arg(bubbleAnimRef.value);
    } else {
      bubbleAnimRef.value = arg;
    }
  });

  const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = { current: [] };

  const ctx = {
    setPieceAnimState,
    setBubbleAnimState,
    flashTimersRef,
    currentPulseRef: { current: 0 },
    getPieceCenter: jest.fn(() => null),
    setTapeCellHighlights: jest.fn(),
    setVisualTrailOverride: jest.fn(),
    setVisualOutputOverride: jest.fn(),
    valueBubblePosRef: { current: null },
    bubbleHistoryRef: { current: [] },
    bubbleTrailRAFRef: { current: null },
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

  return { ctx, pieceAnimRef, bubbleAnimRef, flashTimersRef };
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
    (bubbleHelpers.animateBubbleTo as jest.Mock).mockClear();
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
    ctx.bubbleAnimRAFRef = { current: null };
    return ctx;
  }

  it('does not animate the bubble to the data trail cell after reading input', async () => {
    const ctx = buildScannerCtx();
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    const animateCalls = (bubbleHelpers.animateBubbleTo as jest.Mock).mock.calls;
    // Scanner -> Input tape, then Input tape -> Scanner. Never a third
    // animation to the trail cell (y = 300).
    expect(animateCalls).toHaveLength(2);
    for (const args of animateCalls) {
      const toY = args[4];
      expect(toY).not.toBe(300 + 30 / 2);
    }
  });

  it('writes the read value into the visual trail override silently', async () => {
    const ctx = buildScannerCtx();
    const setVisualTrailOverride = ctx.setVisualTrailOverride as jest.Mock;
    ctx.currentPulseRef.current = 2;
    await runScannerInteraction(ctx, step('scanner', 'p-s'));
    // Functional update applied — simulate with a starting array of nulls.
    const updater = setVisualTrailOverride.mock.calls.at(-1)?.[0] as
      | ((prev: (0 | 1 | null)[] | null) => (0 | 1 | null)[] | null)
      | undefined;
    expect(typeof updater).toBe('function');
    const result = updater?.([null, null, null]);
    expect(result).toEqual([null, null, 1]);
  });
});
