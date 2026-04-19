import { flashPiece } from '../../../src/game/engagement/bubbleHelpers';
import type { EngagementContext } from '../../../src/game/engagement/types';

type MockSetter<T> = jest.Mock<void, [T | ((prev: T) => T)]>;

function buildCtx(): {
  ctx: EngagementContext;
  setFlashingPieces: MockSetter<Map<string, string>>;
  flashTimersRef: { current: ReturnType<typeof setTimeout>[] };
  flashingState: { value: Map<string, string> };
} {
  const flashingState = { value: new Map<string, string>() };
  const setFlashingPieces: MockSetter<Map<string, string>> = jest.fn(arg => {
    if (typeof arg === 'function') {
      flashingState.value = (arg as (prev: Map<string, string>) => Map<string, string>)(
        flashingState.value,
      );
    } else {
      flashingState.value = arg;
    }
  });
  const flashTimersRef: { current: ReturnType<typeof setTimeout>[] } = { current: [] };
  // Minimal ctx — only the fields flashPiece touches need real values.
  const ctx = {
    setFlashingPieces,
    flashTimersRef,
  } as unknown as EngagementContext;
  return { ctx, setFlashingPieces, flashTimersRef, flashingState };
}

describe('flashPiece', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('adds the pieceId/color pair to flashingPieces', () => {
    const { ctx, flashingState } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(flashingState.value.get('piece-1')).toBe('#FF0000');
  });

  it('clears the flash after 180ms', () => {
    const { ctx, flashingState } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(flashingState.value.has('piece-1')).toBe(true);
    jest.advanceTimersByTime(180);
    expect(flashingState.value.has('piece-1')).toBe(false);
  });

  it('preserves other entries when one piece clears', () => {
    const { ctx, flashingState } = buildCtx();
    flashingState.value = new Map([['piece-0', '#00FF00']]);
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(flashingState.value.get('piece-0')).toBe('#00FF00');
    expect(flashingState.value.get('piece-1')).toBe('#FF0000');
    jest.advanceTimersByTime(180);
    expect(flashingState.value.get('piece-0')).toBe('#00FF00');
    expect(flashingState.value.has('piece-1')).toBe(false);
  });

  it('tracks the clear timer in flashTimersRef for cleanup', () => {
    const { ctx, flashTimersRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(flashTimersRef.current).toHaveLength(1);
  });
});
