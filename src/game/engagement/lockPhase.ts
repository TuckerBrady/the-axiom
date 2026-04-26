import { Animated } from 'react-native';
import type { EngagementContext, Pt } from './types';
import {
  setSignalPhase,
  setVoidPulse,
  setLockedPieces,
  updateLitWires,
} from './stateHelpers';

// Lock / wrong-output / replay-lock all run on the main beam slot
// (`null`) — these phases never branch.
//
// Prompt 99A — lock ring expansion is now driven natively via
// ctx.lockRingProgressAnim. The render layer reads the Animated.Value
// directly through interpolations on r/opacity (with a 100ms offset
// for the second ring expressed via interpolate inputRange), so the
// JS thread no longer fires setState on every RAF tick.
//
// Allowed setState calls per phase (PERFORMANCE_CONTRACT 3.3.1):
//   1. setLockRingCenter(...) at start  — mounts ring visual.
//      setSignalPhase('lock') is bundled with it as the single
//      "initiate lock visual" event.
//   2. setLockedPieces(...) at end      — marks pieces as locked.
//   3. updateLitWires(...) at end       — finalize wire fill.
// setLockRingCenter(null) collapses with the post-lock writes — the
// renderer guards on `lockRingCenter !== null`, and the parent re-
// render triggered by setLockedPieces/updateLitWires picks it up.
//
// PERFORMANCE_CONTRACT clauses satisfied:
//   2.1.4 — useNativeDriver: true on the timing call below
//   3.3.1 — at most 3 setState calls total (start bundle + 2 end)
//   3.3.2 — no setState fires during the 320ms animation window
//   5.4.2 — lockRingProgressAnim lives on EngagementContext, allocated
//           once in GameplayScreen and reused across pulses

const LOCK_DURATION_MS = 320;

export async function runLockPhase(
  ctx: EngagementContext,
  outputCenter: Pt,
): Promise<void> {
  ctx.setLockRingCenter({ x: outputCenter.x, y: outputCenter.y });
  setSignalPhase(ctx.setBeamState, 'lock');

  ctx.lockAnim?.stop();
  ctx.lockRingProgressAnim.setValue(0);
  await new Promise<void>(res => {
    ctx.lockAnim = Animated.timing(ctx.lockRingProgressAnim, {
      toValue: 1,
      duration: LOCK_DURATION_MS,
      useNativeDriver: true,
    });
    ctx.lockAnim.start(() => {
      ctx.lockAnim = null;
      res();
    });
  });

  setLockedPieces(ctx.setPieceAnimState, new Set(ctx.machineStatePieces.map(p => p.id)));
  updateLitWires(ctx.setBeamState, prev => {
    const next = new Set(prev);
    for (const w of ctx.wires) {
      next.add(`${w.fromPieceId}_${w.toPieceId}`);
      next.add(`${w.toPieceId}_${w.fromPieceId}`);
    }
    return next;
  });
  ctx.setLockRingCenter(null);
  await new Promise(r => setTimeout(r, 160));
}

// Wrong-output ring expansion at the Output Port. Uses the same
// native-driven progress pattern as runLockPhase. The existing
// renderer reads beamState.voidPulse for color/position; we set it
// once at start (with full r/opacity sentinels) and clear it once at
// the end. The actual r/opacity interpolation will move into the
// renderer in 99C — for 99A the migration just removes the per-tick
// setState stream so no FPS is burned during the burst.
export async function runWrongOutputRings(
  ctx: EngagementContext,
  outputCenter: Pt,
): Promise<void> {
  setVoidPulse(ctx.setBeamState, {
    x: outputCenter.x,
    y: outputCenter.y,
    r: 6,
    opacity: 0.95,
  });

  ctx.voidPulseAnim?.stop();
  ctx.voidPulseRingProgressAnim.setValue(0);
  await new Promise<void>(res => {
    ctx.voidPulseAnim = Animated.timing(ctx.voidPulseRingProgressAnim, {
      toValue: 1,
      duration: LOCK_DURATION_MS,
      useNativeDriver: true,
    });
    ctx.voidPulseAnim.start(() => {
      ctx.voidPulseAnim = null;
      res();
    });
  });

  setVoidPulse(ctx.setBeamState, null);
}

// Replay-loop variant — bails if looping stops mid-animation. The
// native-driven timing is .stop()'d explicitly when looping turns off
// so the promise resolves promptly without waiting for the full 320ms.
export async function runReplayLockPhase(
  ctx: EngagementContext,
  outputCenter: Pt,
): Promise<void> {
  if (!ctx.loopingRef.current) return;
  ctx.setLockRingCenter({ x: outputCenter.x, y: outputCenter.y });
  setSignalPhase(ctx.setBeamState, 'lock');

  ctx.lockAnim?.stop();
  ctx.lockRingProgressAnim.setValue(0);
  await new Promise<void>(res => {
    ctx.lockAnim = Animated.timing(ctx.lockRingProgressAnim, {
      toValue: 1,
      duration: LOCK_DURATION_MS,
      useNativeDriver: true,
    });
    ctx.lockAnim.start(() => {
      ctx.lockAnim = null;
      res();
    });
  });
  ctx.setLockRingCenter(null);
}
