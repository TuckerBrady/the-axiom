import { Animated } from 'react-native';
import type { EngagementContext, Pt } from './types';
import {
  setSignalPhase,
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
// Prompt 99C, Fix 2 — runWrongOutputRings now drives the
// red-ring burst through voidBurstCenter + voidPulseRingProgressAnim
// (the same native pattern as the in-pulse void burst in
// beamAnimation.ts). The pre-99C codepath wrote the ring's static r
// + opacity into beamState.voidPulse at start and cleared it at end,
// which left the render layer pinned to the start values for the
// full 320ms — the intended expansion never animated. Reading
// voidPulseRingProgressAnim from BeamOverlay brings the wrong-output
// burst in line with the void-blocker burst.
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

// Wrong-output ring expansion at the Output Port. Native-driven via
// voidBurstCenter + voidPulseRingProgressAnim (Prompt 99C, Fix 2) —
// matches the in-pulse void burst in beamAnimation.ts so both red
// rings expand the same way through BeamOverlay's AnimatedCircle.
// Two setState calls total (mount + unmount), no per-RAF stream.
export async function runWrongOutputRings(
  ctx: EngagementContext,
  outputCenter: Pt,
): Promise<void> {
  ctx.setVoidBurstCenter({ x: outputCenter.x, y: outputCenter.y });

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

  ctx.setVoidBurstCenter(null);
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
