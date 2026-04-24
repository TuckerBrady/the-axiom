import type { EngagementContext, TapeHighlight } from './types';
import {
  updateFlashingPieces,
} from './stateHelpers';

export function flashPiece(
  ctx: EngagementContext,
  pieceId: string,
  color: string,
): void {
  updateFlashingPieces(ctx.setPieceAnimState, prev => {
    const m = new Map(prev);
    m.set(pieceId, color);
    return m;
  });
  const t = setTimeout(() => {
    updateFlashingPieces(ctx.setPieceAnimState, prev => {
      const m = new Map(prev);
      m.delete(pieceId);
      return m;
    });
  }, 180);
  ctx.flashTimersRef.current.push(t);
}

export function setHighlight(
  ctx: EngagementContext,
  key: string,
  kind: TapeHighlight,
): void {
  ctx.setTapeCellHighlights(prev => {
    const m = new Map(prev);
    m.set(key, kind);
    return m;
  });
}

export function clearAllHighlights(ctx: EngagementContext): void {
  ctx.setTapeCellHighlights(new Map());
}

export const wait = (ms: number): Promise<void> =>
  new Promise<void>(r => setTimeout(r, ms));
