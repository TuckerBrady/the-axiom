import {
  stopBubbleTrail,
  animateBubbleTo,
  hideBubble,
} from '../../../src/game/engagement/bubbleHelpers';
import type { EngagementContext } from '../../../src/game/engagement/types';
import { BUBBLE_INITIAL } from '../../../src/game/engagement/types';

function buildCtx(): {
  ctx: EngagementContext;
  flashTimersRef: { current: ReturnType<typeof setTimeout>[] };
  bubbleTrailRAFRef: { current: number | null };
  bubbleAnimRAFRef: { current: number | null };
  bubbleHistoryRef: { current: Array<{ x: number; y: number }> };
  valueBubblePosRef: { current: { x: number; y: number } | null };
} {
  const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = { current: [] };
  const bubbleTrailRAFRef: { current: number | null } = { current: null };
  const bubbleAnimRAFRef: { current: number | null } = { current: null };
  const bubbleHistoryRef: { current: Array<{ x: number; y: number }> } = { current: [] };
  const valueBubblePosRef: { current: { x: number; y: number } | null } = { current: null };
  const bubbleState: { value: typeof BUBBLE_INITIAL } = { value: { ...BUBBLE_INITIAL } };

  const setBubbleAnimState = jest.fn((arg: unknown) => {
    if (typeof arg === 'function') {
      bubbleState.value = (arg as (p: typeof BUBBLE_INITIAL) => typeof BUBBLE_INITIAL)(bubbleState.value);
    } else {
      bubbleState.value = arg as typeof BUBBLE_INITIAL;
    }
  });

  const ctx = {
    setBubbleAnimState,
    flashTimersRef,
    bubbleTrailRAFRef,
    bubbleAnimRAFRef,
    bubbleHistoryRef,
    valueBubblePosRef,
  } as unknown as EngagementContext;

  return {
    ctx,
    flashTimersRef,
    bubbleTrailRAFRef,
    bubbleAnimRAFRef,
    bubbleHistoryRef,
    valueBubblePosRef,
  };
}

describe('stopBubbleTrail timer tracking (Fix 1)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.cancelAnimationFrame = jest.fn() as unknown as typeof cancelAnimationFrame;
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('pushes the clear-trail setTimeout id to flashTimersRef', () => {
    const { ctx, flashTimersRef } = buildCtx();
    expect(flashTimersRef.current).toHaveLength(0);
    stopBubbleTrail(ctx);
    expect(flashTimersRef.current).toHaveLength(1);
  });

  it('clears bubbleTrailRAFRef when a trail RAF is active', () => {
    const { ctx, bubbleTrailRAFRef } = buildCtx();
    bubbleTrailRAFRef.current = 42;
    stopBubbleTrail(ctx);
    expect(bubbleTrailRAFRef.current).toBeNull();
  });

  it('resets bubbleHistoryRef', () => {
    const { ctx, bubbleHistoryRef } = buildCtx();
    bubbleHistoryRef.current = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    stopBubbleTrail(ctx);
    expect(bubbleHistoryRef.current).toEqual([]);
  });
});

describe('animateBubbleTo RAF tracking (Fix 2)', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafHandles: number;
  let nowValue: number;

  beforeEach(() => {
    rafHandles = 0;
    rafCallbacks = new Map();
    nowValue = 0;
    global.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
      rafHandles += 1;
      rafCallbacks.set(rafHandles, cb);
      return rafHandles;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = ((handle: number): void => {
      rafCallbacks.delete(handle);
    }) as typeof cancelAnimationFrame;
    jest.spyOn(performance, 'now').mockImplementation(() => nowValue);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores the RAF id in bubbleAnimRAFRef at the start', () => {
    const { ctx, bubbleAnimRAFRef } = buildCtx();
    void animateBubbleTo(ctx, 0, 0, 10, 10, '#fff', '1', 100);
    expect(bubbleAnimRAFRef.current).not.toBeNull();
  });

  it('updates bubbleAnimRAFRef on every tick and clears to null on completion', async () => {
    const { ctx, bubbleAnimRAFRef } = buildCtx();
    const done = animateBubbleTo(ctx, 0, 0, 10, 10, '#fff', '1', 100);

    // Drive frames until duration elapses.
    for (let i = 0; i < 20; i++) {
      if (rafCallbacks.size === 0) break;
      nowValue += 20;
      const next = rafCallbacks.entries().next();
      if (next.done) break;
      const [id, cb] = next.value;
      rafCallbacks.delete(id);
      cb(nowValue);
    }

    await done;
    expect(bubbleAnimRAFRef.current).toBeNull();
  });
});

describe('hideBubble cancels both RAFs (Fix 2)', () => {
  it('cancels bubbleAnimRAFRef when set', () => {
    const cancel = jest.fn();
    global.cancelAnimationFrame = cancel as unknown as typeof cancelAnimationFrame;
    const { ctx, bubbleAnimRAFRef } = buildCtx();
    bubbleAnimRAFRef.current = 55;
    hideBubble(ctx);
    expect(cancel).toHaveBeenCalledWith(55);
    expect(bubbleAnimRAFRef.current).toBeNull();
  });

  it('also triggers stopBubbleTrail (which cancels bubbleTrailRAFRef)', () => {
    const cancel = jest.fn();
    global.cancelAnimationFrame = cancel as unknown as typeof cancelAnimationFrame;
    const { ctx, bubbleTrailRAFRef } = buildCtx();
    bubbleTrailRAFRef.current = 77;
    hideBubble(ctx);
    expect(cancel).toHaveBeenCalledWith(77);
    expect(bubbleTrailRAFRef.current).toBeNull();
  });
});
