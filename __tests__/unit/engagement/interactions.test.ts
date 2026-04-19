import { triggerPieceAnim } from '../../../src/game/engagement/interactions';
import type { EngagementContext, ExecutionStep } from '../../../src/game/engagement/types';

type MockSetter<T> = jest.Mock<void, [T | ((prev: T) => T)]>;

function buildCtx(): {
  ctx: EngagementContext;
  flashingState: { value: Map<string, string> };
  activeAnimsState: { value: Map<string, string> };
  gateResultsState: { value: Map<string, 'pass' | 'block'> };
  flashTimersRef: { current: ReturnType<typeof setTimeout>[] };
} {
  const flashingState = { value: new Map<string, string>() };
  const activeAnimsState = { value: new Map<string, string>() };
  const gateResultsState = { value: new Map<string, 'pass' | 'block'>() };
  const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = { current: [] };

  const makeMapSetter = <V>(state: { value: Map<string, V> }): MockSetter<Map<string, V>> =>
    jest.fn(arg => {
      if (typeof arg === 'function') {
        state.value = (arg as (prev: Map<string, V>) => Map<string, V>)(state.value);
      } else {
        state.value = arg;
      }
    });

  // Stub refs / setters that async interaction code may touch after
  // we've finished our synchronous assertions. The tests do not await
  // the interaction promise; these fields keep the chained code from
  // throwing when it continues on the microtask queue.
  const ctx = {
    setFlashingPieces: makeMapSetter(flashingState),
    setActiveAnimations: makeMapSetter(activeAnimsState),
    setGateResults: makeMapSetter(gateResultsState),
    flashTimersRef,
    currentPulseRef: { current: 0 },
    getPieceCenter: jest.fn(() => null),
    setTapeCellHighlights: jest.fn(),
    setValueBubble: jest.fn(),
    setBubbleTrail: jest.fn(),
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

  return { ctx, flashingState, activeAnimsState, gateResultsState, flashTimersRef };
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

  it('dispatches the correct animation tag for a conveyor', () => {
    const { ctx, activeAnimsState } = buildCtx();
    triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    expect(activeAnimsState.value.get('p-1')).toBe('rolling');
  });

  it('dispatches the spinning tag for a gear', () => {
    const { ctx, activeAnimsState } = buildCtx();
    triggerPieceAnim(ctx, step('gear', 'p-g'));
    expect(activeAnimsState.value.get('p-g')).toBe('spinning');
  });

  it('dispatches the locking tag for a terminal', () => {
    const { ctx, activeAnimsState } = buildCtx();
    triggerPieceAnim(ctx, step('terminal', 'p-t'));
    expect(activeAnimsState.value.get('p-t')).toBe('locking');
  });

  it('records the gate result for a passing configNode', () => {
    const { ctx, gateResultsState } = buildCtx();
    // configNode triggers an interaction promise — it still sets the
    // gate result synchronously before awaiting.
    void triggerPieceAnim(ctx, step('configNode', 'p-c', true));
    expect(gateResultsState.value.get('p-c')).toBe('pass');
  });

  it('records the gate result for a blocked configNode', () => {
    const { ctx, gateResultsState } = buildCtx();
    void triggerPieceAnim(ctx, step('configNode', 'p-c', false));
    expect(gateResultsState.value.get('p-c')).toBe('block');
  });

  it('clears the active animation after the piece duration elapses', () => {
    const { ctx, activeAnimsState } = buildCtx();
    triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    expect(activeAnimsState.value.has('p-1')).toBe(true);
    jest.advanceTimersByTime(180);
    expect(activeAnimsState.value.has('p-1')).toBe(false);
  });

  it('returns a resolved promise for a non-tape piece', async () => {
    const { ctx } = buildCtx();
    const result = triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    await expect(result).resolves.toBeUndefined();
  });

  it('flashes the piece with its beam color', () => {
    const { ctx, flashingState } = buildCtx();
    triggerPieceAnim(ctx, step('conveyor', 'p-1'));
    expect(flashingState.value.get('p-1')).toBe('#F0B429');
  });
});
