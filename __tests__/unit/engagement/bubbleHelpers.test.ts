import { flashPiece } from '../../../src/game/engagement/bubbleHelpers';
import type { EngagementContext, PieceAnimState } from '../../../src/game/engagement/types';
import { PIECE_ANIM_INITIAL } from '../../../src/game/engagement/types';

function buildCtx(): {
  ctx: EngagementContext;
  setPieceAnimState: jest.Mock;
  pieceAnimRef: { value: PieceAnimState };
  flashTimersRef: { current: ReturnType<typeof setTimeout>[] };
} {
  const pieceAnimRef = { value: { ...PIECE_ANIM_INITIAL, flashing: new Map() } };
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

  it('adds the pieceId/color pair to flashing', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.flashing.get('piece-1')).toBe('#FF0000');
  });

  it('clears the flash after 180ms', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.flashing.has('piece-1')).toBe(true);
    jest.advanceTimersByTime(180);
    expect(pieceAnimRef.value.flashing.has('piece-1')).toBe(false);
  });

  it('preserves other entries when one piece clears', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    pieceAnimRef.value = {
      ...pieceAnimRef.value,
      flashing: new Map([['piece-0', '#00FF00']]),
    };
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(pieceAnimRef.value.flashing.get('piece-0')).toBe('#00FF00');
    expect(pieceAnimRef.value.flashing.get('piece-1')).toBe('#FF0000');
    jest.advanceTimersByTime(180);
    expect(pieceAnimRef.value.flashing.get('piece-0')).toBe('#00FF00');
    expect(pieceAnimRef.value.flashing.has('piece-1')).toBe(false);
  });

  it('tracks the clear timer in flashTimersRef for cleanup', () => {
    const { ctx, flashTimersRef } = buildCtx();
    flashPiece(ctx, 'piece-1', '#FF0000');
    expect(flashTimersRef.current).toHaveLength(1);
  });

  it('preserves sibling fields (animations, gates, failColors, locked)', () => {
    const { ctx, pieceAnimRef } = buildCtx();
    pieceAnimRef.value = {
      flashing: new Map(),
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
