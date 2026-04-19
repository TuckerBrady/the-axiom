import type { EngagementContext } from './types';
import {
  setChargePos as setChargePosField,
  setChargeProgress as setChargeProgressField,
  setSignalPhase,
} from './stateHelpers';

export async function runChargePhase(
  ctx: EngagementContext,
  sourcePieceId: string,
): Promise<void> {
  const sp = ctx.getPieceCenter(sourcePieceId);
  if (!sp) return;
  setChargePosField(ctx.setChargeState, sp);
  setSignalPhase(ctx.setBeamState, 'charge');
  const chargeStart = performance.now();
  await new Promise<void>(res => {
    const tick = (): void => {
      const ct = Math.min(1, (performance.now() - chargeStart) / 280);
      setChargeProgressField(ctx.setChargeState, ct);
      if (ct < 1) {
        ctx.animFrameRef.current = requestAnimationFrame(tick);
      } else {
        res();
      }
    };
    ctx.animFrameRef.current = requestAnimationFrame(tick);
  });
  setChargePosField(ctx.setChargeState, null);
}

// Variant used by the post-completion replay loop. Bails if looping
// stops mid-animation so the loop can exit cleanly.
export async function runReplayChargePhase(
  ctx: EngagementContext,
  sourcePieceId: string,
): Promise<void> {
  const sp = ctx.getPieceCenter(sourcePieceId);
  if (!sp) return;
  setChargePosField(ctx.setChargeState, sp);
  setSignalPhase(ctx.setBeamState, 'charge');
  const cs = performance.now();
  await new Promise<void>(res => {
    const tick = (): void => {
      if (!ctx.loopingRef.current) { res(); return; }
      const ct = Math.min(1, (performance.now() - cs) / 280);
      setChargeProgressField(ctx.setChargeState, ct);
      if (ct < 1) { ctx.animFrameRef.current = requestAnimationFrame(tick); }
      else { res(); }
    };
    ctx.animFrameRef.current = requestAnimationFrame(tick);
  });
  setChargePosField(ctx.setChargeState, null);
}
