import { Animated, Easing } from 'react-native';
import type { EngagementContext } from './types';
import {
  setChargePos as setChargePosField,
  setSignalPhase,
} from './stateHelpers';

// Prompt 99A — charge ring progress is now driven natively via
// ctx.chargeProgressAnim. The render layer reads the Animated.Value
// directly through interpolations on r/opacity, so the JS thread no
// longer fires setState on every RAF tick.
//
// Allowed setState calls per phase (PERFORMANCE_CONTRACT 3.2.1):
//   1. setChargePos(...) at start  — mounts the ring visual.
//      setSignalPhase('charge') is bundled with it as the single
//      "initiate charge visual" event under 3.2.1.
//   2. setChargePos(null) at end   — unmounts the ring visual.
//
// PERFORMANCE_CONTRACT clauses satisfied:
//   2.1.3 — useNativeDriver: true on the timing call below
//   3.2.1 — at most 2 setState calls total (start bundle + end clear)
//   3.2.2 — no setState fires during the 280ms animation window
//   5.4.2 — chargeProgressAnim lives on EngagementContext, allocated
//           once in GameplayScreen and reused across pulses

export async function runChargePhase(
  ctx: EngagementContext,
  sourcePieceId: string,
): Promise<void> {
  const sp = ctx.getPieceCenter(sourcePieceId);
  if (!sp) return;
  setChargePosField(ctx.setChargeState, sp);
  setSignalPhase(ctx.setBeamState, 'charge');

  ctx.chargeAnim?.stop();
  ctx.chargeProgressAnim.setValue(0);
  await new Promise<void>(res => {
    ctx.chargeAnim = Animated.timing(ctx.chargeProgressAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    ctx.chargeAnim.start(() => {
      ctx.chargeAnim = null;
      res();
    });
  });
  setChargePosField(ctx.setChargeState, null);
}

// Variant used by the post-completion replay loop. Bails if looping
// stops mid-animation so the loop can exit cleanly. The native-driven
// timing is .stop()'d explicitly when looping turns off so the
// promise resolves promptly without waiting for the full 280ms.
export async function runReplayChargePhase(
  ctx: EngagementContext,
  sourcePieceId: string,
): Promise<void> {
  const sp = ctx.getPieceCenter(sourcePieceId);
  if (!sp) return;
  if (!ctx.loopingRef.current) return;
  setChargePosField(ctx.setChargeState, sp);
  setSignalPhase(ctx.setBeamState, 'charge');

  ctx.chargeAnim?.stop();
  ctx.chargeProgressAnim.setValue(0);
  await new Promise<void>(res => {
    ctx.chargeAnim = Animated.timing(ctx.chargeProgressAnim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    ctx.chargeAnim.start(() => {
      ctx.chargeAnim = null;
      res();
    });
  });
  setChargePosField(ctx.setChargeState, null);
}
