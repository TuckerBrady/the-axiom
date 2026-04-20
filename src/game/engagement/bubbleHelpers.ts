import type { EngagementContext, TapeHighlight } from './types';
import {
  updateFlashingPieces,
  setValueBubble as setValueBubbleField,
  setBubbleTrail as setBubbleTrailField,
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

export function startBubbleTrail(ctx: EngagementContext): void {
  ctx.bubbleHistoryRef.current = [];
  const tick = (): void => {
    const pos = ctx.valueBubblePosRef.current;
    if (!pos) {
      setBubbleTrailField(ctx.setBubbleAnimState, []);
      return;
    }
    ctx.bubbleHistoryRef.current.unshift({ x: pos.x, y: pos.y });
    if (ctx.bubbleHistoryRef.current.length > 40) {
      ctx.bubbleHistoryRef.current.length = 40;
    }

    const spacings = [2, 4, 6, 9, 12, 16, 21, 27];
    const opacities = [0.65, 0.55, 0.45, 0.35, 0.25, 0.18, 0.1, 0.05];
    const scales = [0.9, 0.82, 0.74, 0.65, 0.55, 0.44, 0.33, 0.22];

    const trail: Array<{ x: number; y: number; opacity: number; size: number }> = [];
    spacings.forEach((sp, i) => {
      if (ctx.bubbleHistoryRef.current.length > sp) {
        const p = ctx.bubbleHistoryRef.current[sp];
        trail.push({ x: p.x, y: p.y, opacity: opacities[i], size: 20 * scales[i] });
      }
    });
    setBubbleTrailField(ctx.setBubbleAnimState, trail);
    ctx.bubbleTrailRAFRef.current = requestAnimationFrame(tick);
  };
  ctx.bubbleTrailRAFRef.current = requestAnimationFrame(tick);
}

export function stopBubbleTrail(ctx: EngagementContext): void {
  if (ctx.bubbleTrailRAFRef.current) {
    cancelAnimationFrame(ctx.bubbleTrailRAFRef.current);
    ctx.bubbleTrailRAFRef.current = null;
  }
  // Track the clear-trail timeout in flashTimersRef so handleReset
  // cancels it; otherwise it would keep firing into stale state
  // after navigation or level reset.
  const t = setTimeout(() => setBubbleTrailField(ctx.setBubbleAnimState, []), 300);
  ctx.flashTimersRef.current.push(t);
  ctx.bubbleHistoryRef.current = [];
}

export function animateBubbleTo(
  ctx: EngagementContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  value: string,
  duration: number,
): Promise<void> {
  return new Promise<void>(resolve => {
    const startTime = performance.now();
    const tick = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const x = fromX + (toX - fromX) * ease;
      const y = fromY + (toY - fromY) * ease;
      setValueBubbleField(ctx.setBubbleAnimState, { screenX: x, screenY: y, color, value });
      ctx.valueBubblePosRef.current = { x, y };
      if (t < 1) {
        ctx.bubbleAnimRAFRef.current = requestAnimationFrame(tick);
      } else {
        ctx.bubbleAnimRAFRef.current = null;
        resolve();
      }
    };
    ctx.bubbleAnimRAFRef.current = requestAnimationFrame(tick);
  });
}

export function showBubbleAt(
  ctx: EngagementContext,
  x: number,
  y: number,
  color: string,
  value: string,
): void {
  setValueBubbleField(ctx.setBubbleAnimState, { screenX: x, screenY: y, color, value });
  ctx.valueBubblePosRef.current = { x, y };
}

export function hideBubble(ctx: EngagementContext): void {
  // Cancel any in-flight bubble animation RAF so it can't keep
  // writing into stale state after hide.
  if (ctx.bubbleAnimRAFRef.current) {
    cancelAnimationFrame(ctx.bubbleAnimRAFRef.current);
    ctx.bubbleAnimRAFRef.current = null;
  }
  setValueBubbleField(ctx.setBubbleAnimState, null);
  ctx.valueBubblePosRef.current = null;
  stopBubbleTrail(ctx);
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
