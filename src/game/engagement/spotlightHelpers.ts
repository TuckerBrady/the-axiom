import type { EngagementContext } from './types';

export function showSpotlight(
  ctx: EngagementContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  value: string,
): void {
  ctx.setSpotlightState({
    beam: { fromX, fromY, toX, toY, color, value, opacity: 0.85 },
  });
}

export function updateSpotlightValue(
  ctx: EngagementContext,
  value: string,
): void {
  ctx.setSpotlightState(prev => {
    if (!prev.beam) return prev;
    return { beam: { ...prev.beam, value } };
  });
}

export function hideSpotlight(ctx: EngagementContext): void {
  ctx.setSpotlightState({ beam: null });
}
