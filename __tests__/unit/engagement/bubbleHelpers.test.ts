import {
  flashPiece,
  applyFlashBatch,
  makeFlashBatch,
} from '../../../src/game/engagement/bubbleHelpers';
import type { EngagementContext, PieceAnimState } from '../../../src/game/engagement/types';
import { PIECE_ANIM_INITIAL } from '../../../src/game/engagement/types';

function buildCtx(): {
  ctx: EngagementContext;
  setPieceAnimState: jest.Mock;
  pieceAnimRef: { value: PieceAnimState };
  flashTimersRef: { current: ReturnType<typeof setTimeout>[] };
} {
  const pieceAnimRef = { value: { ...PIECE_ANIM_INITIAL } };
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
    flashTimersRef,
  } as unknown as EngagementContext;
  return { ctx, setPieceAnimState, pieceAnimRef, flashTimersRef };
}

describe('flashPiece', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('writes the pieceId/color pair into flashing', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.flashing.get('piece-1')).toBe('#FF0000');
  });

  // Prompt 99C, Fix 1 (option b): the flash-off setTimeout is gone.
  // The flashing entry persists until the per-pulse sweep clears it,
  // and the visible flash fades back to opacity 0 via the native
  // Animated.Value sequence in BoardPiece (not a setState).
  it('does NOT auto-clear the flash entry after 180ms (native fade)', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.flashing.has('piece-1')).toBe(true);
    jest.advanceTimersByTime(180);
    expect(pieceAnimRef.value.flashing.has('piece-1')).toBe(true);
  });

  it('does NOT track a clear timer in flashTimersRef', () => {
    const { ctx, flashTimersRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(flashTimersRef.current).toHaveLength(0);
  });

  it('increments flashCounter for the piece on each call', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.flashCounter.get('piece-1')).toBe(1);
    flashPiece(ctx, 'piece-1', '#00FF00');
    expect(pieceAnimRef.value.flashCounter.get('piece-1')).toBe(2);
  });

  it('preserves other entries when a new flash arrives', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    pieceAnimRef.value = {
      ...pieceAnimRef.value,
      flashing: new Map([['piece-0', '#00FF00']]),
      flashCounter: new Map([['piece-0', 5]]),
    };
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.flashing.get('piece-0')).toBe('#00FF00');
    expect(pieceAnimRef.value.flashing.get('piece-1')).toBe('#FF0000');
    expect(pieceAnimRef.value.flashCounter.get('piece-0')).toBe(5);
    expect(pieceAnimRef.value.flashCounter.get('piece-1')).toBe(1);
  });

  it('preserves sibling fields (animations, gates, failColors, locked)', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    pieceAnimRef.value = {
      flashing: new Map(),
      flashCounter: new Map(),
      animations: new Map([['a', 'rolling']]),
      gates: new Map([['g', 'pass']]),
      failColors: new Map([['f', '#FF0000']]),
      locked: new Set(['l']),
    };
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.animations.get('a')).toBe('rolling');
    expect(pieceAnimRef.value.gates.get('g')).toBe('pass');
    expect(pieceAnimRef.value.failColors.get('f')).toBe('#FF0000');
    expect(pieceAnimRef.value.locked.has('l')).toBe(true);
  });
});

describe('applyFlashBatch', () => {
  it('flushes a multi-piece flash batch in one setPieceAnimState call', () => {
    const { ctx, setPieceAnimState, pieceAnimRef } = buildCtx();
    const batch = makeFlashBatch();
    batch.flashes.push({ pieceId: 'a', color: '#FF0000' });
    batch.flashes.push({ pieceId: 'b', color: '#00FF00' });
    batch.flashes.push({ pieceId: 'c', color: '#0000FF' });
    applyFlashBatch(ctx, batch);
    expect(setPieceAnimState).toHaveBeenCalledTimes(1);
    expect(pieceAnimRef.value.flashing.get('a')).toBe('#FF0000');
    expect(pieceAnimRef.value.flashing.get('b')).toBe('#00FF00');
    expect(pieceAnimRef.value.flashing.get('c')).toBe('#0000FF');
    expect(pieceAnimRef.value.flashCounter.get('a')).toBe(1);
    expect(pieceAnimRef.value.flashCounter.get('b')).toBe(1);
    expect(pieceAnimRef.value.flashCounter.get('c')).toBe(1);
  });

  it('also batches animation tags + gate results in the same setter', () => {
    const { ctx, setPieceAnimState, pieceAnimRef } = buildCtx();
    const batch = makeFlashBatch();
    batch.flashes.push({ pieceId: 'p1', color: '#F0B429' });
    batch.animations.push({ pieceId: 'p1', tag: 'rolling', duration: 180 });
    batch.gates.push({ pieceId: 'p2', result: 'pass' });
    applyFlashBatch(ctx, batch);
    expect(setPieceAnimState).toHaveBeenCalledTimes(1);
    expect(pieceAnimRef.value.flashing.get('p1')).toBe('#F0B429');
    expect(pieceAnimRef.value.animations.get('p1')).toBe('rolling');
    expect(pieceAnimRef.value.gates.get('p2')).toBe('pass');
  });

  it('is a no-op when the batch is empty', () => {
    const { ctx, setPieceAnimState } = buildCtx();
    applyFlashBatch(ctx, makeFlashBatch());
    expect(setPieceAnimState).not.toHaveBeenCalled();
  });
});
