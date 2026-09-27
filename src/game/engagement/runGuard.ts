// AXM-036 P9 (F9) — shared helpers that keep a run from stalling the UI.
//
// Build 49's reported stall (screenshot 13, "no stall on level
// failure") traces to three mechanisms, all on master:
//   1. cancelAllFrames cancels RAF ids and safety timers but never
//      settles a pending runLinearPath promise — it only resolves from
//      its own final RAF tick (beamAnimation.ts).
//   2. Two failure-only awaits hang on a native Animated callback that
//      may never fire: the void burst (beamAnimation.ts) and the
//      wrong-output ring burst (lockPhase.ts's runWrongOutputRings).
//   3. handleEngage is one long async function with no try/finally, so
//      a thrown error anywhere in it leaves isExecuting stuck true —
//      the tray and ENGAGE row hidden, no modal, no recovery.
//
// raceWithTimeout closes mechanism 2. withRunGuard closes mechanism 3
// (mechanism 1 is closed by the pendingResolversRef registry in
// types.ts / useBeamEngine.ts / beamAnimation.ts).

/**
 * Races a native-callback-driven promise against a timeout. If the
 * underlying promise settles first, its value passes through
 * untouched. If the timeout fires first, `onTimeout` supplies a
 * fallback value so the await unblocks instead of hanging forever on
 * a callback (an `Animated.CompositeAnimation#start` completion
 * callback, most often) that never fires (P9-3).
 */
export function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => T,
): Promise<T> {
  return new Promise<T>(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(onTimeout());
    }, timeoutMs);
    promise.then(value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    });
  });
}

export interface RunGuardDeps {
  // Clears the store's isExecuting flag and per-run piece memory
  // (gameStore.endRun). Idempotent — safe to call on a run that has
  // already ended cleanly through its own success/failure path.
  endRun: () => void;
  // Stops any still-ticking RAF loop and force-settles pending run
  // promises via pendingResolversRef (useBeamEngine.cancelAllFrames).
  cancelAllFrames: () => void;
  // True while the run this guard is wrapping is still the current
  // one (no newer ENGAGE or RESET has bumped runIdRef past it).
  isCurrentRun: () => boolean;
  // __DEV__-only diagnostic. Never thrown further — a stalled UI is
  // strictly worse than a swallowed, logged error (P9-2).
  onError?: (error: unknown) => void;
}

/**
 * Wraps a run function (the renamed handleEngage body) so it can never
 * leave the screen stalled (P9-2):
 *   - a throw anywhere in the run ends the run instead of leaving
 *     isExecuting stuck true with no modal and no visible recovery;
 *   - a run superseded while it was in flight (cancelAllFrames or a
 *     fresh ENGAGE ran before this one's promise chain unwound) also
 *     ends cleanly, so no success/failure modal from an abandoned run
 *     applies to the run the player is now looking at.
 *
 * The wrapped `run` function's body is untouched — this only adds an
 * outer try/catch plus a post-await staleness check, so the P7 hunks
 * inside the original handleEngage body stay disjoint from this
 * change.
 */
export async function withRunGuard(
  run: () => Promise<void>,
  deps: RunGuardDeps,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (deps.onError) {
      deps.onError(error);
    } else if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[handleEngage] run failed; ending run to avoid a stall', error);
    }
    deps.cancelAllFrames();
    deps.endRun();
    return;
  }
  if (!deps.isCurrentRun()) {
    // A newer run started while this one was still resolving (a RESET
    // or a fresh ENGAGE bumped runIdRef past the id this call carried).
    // Whatever this run's tail set belongs to a run the player already
    // left — end it so isExecuting reflects only the current run.
    deps.cancelAllFrames();
    deps.endRun();
  }
}
