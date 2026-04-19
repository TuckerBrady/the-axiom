import type { EngagementContext } from './types';

export async function runChargePhase(
  ctx: EngagementContext,
  sourcePieceId: string,
): Promise<void> {
  const sp = ctx.getPieceCenter(sourcePieceId);
  if (!sp) return;
  ctx.setChargePos(sp);
  ctx.setSignalPhase('charge');
  const chargeStart = performance.now();
  await new Promise<void>(res => {
    const tick = (): void => {
      const ct = Math.min(1, (performance.now() - chargeStart) / 280);
      ctx.setChargeProgress(ct);
      if (ct < 1) {
        ctx.animFrameRef.current = requestAnimationFrame(tick);
      } else {
        res();
      }
    };
    ctx.animFrameRef.current = requestAnimationFrame(tick);
  });
  ctx.setChargePos(null);
}

// Variant used by the post-completion replay loop. Bails if looping
// stops mid-animation so the loop can exit cleanly.
export async function runReplayChargePhase(
  ctx: EngagementContext,
  sourcePieceId: string,
): Promise<void> {
  const sp = ctx.getPieceCenter(sourcePieceId);
  if (!sp) return;
  ctx.setChargePos(sp);
  ctx.setSignalPhase('charge');
  const cs = performance.now();
  await new Promise<void>(res => {
    const tick = (): void => {
      if (!ctx.loopingRef.current) { res(); return; }
      const ct = Math.min(1, (performance.now() - cs) / 280);
      ctx.setChargeProgress(ct);
      if (ct < 1) { ctx.animFrameRef.current = requestAnimationFrame(tick); }
      else { res(); }
    };
    ctx.animFrameRef.current = requestAnimationFrame(tick);
  });
  ctx.setChargePos(null);
}
