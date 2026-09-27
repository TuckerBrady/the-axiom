// AXM-036 P9 (F9) — no stall on level failure (Build 49, screenshot 13).
//
// Reproduced on origin/master: three mechanisms leave isExecuting stuck
// true with the tray and ENGAGE row hidden and no modal shown.
//   [P9-1] cancelAllFrames cancels RAF ids and safety timers but never
//     settles a pending runLinearPath promise (it only resolves from
//     its own final RAF tick) — red because EngagementContext has no
//     pendingResolversRef on master, so this file fails to compile.
//   [P9-3] the void burst and the wrong-output ring burst each await a
//     native Animated completion callback directly, with no timeout —
//     red because master's `await new Promise<void>(res => { ...
//     .start(() => res()) })` never settles if the mocked callback is
//     made to never fire.
//   [P9-2] handleEngage is one long async function with no try/catch
//     on master — red because `runEngage` / `withRunGuard` do not
//     exist there.
//
// [P9-4] is a compound check: a pulse that ends at a blocking Config
// Node (which the engine terminates with a trailing 'void' step,
// engine.ts:~705) must resolve within the documented bound and never
// need its 8s tape-pause safety timer.

import * as fs from 'fs';
import * as path from 'path';
import { Animated } from 'react-native';
import { runLinearPath } from '../../../src/game/engagement/beamAnimation';
import { runWrongOutputRings } from '../../../src/game/engagement/lockPhase';
import { withRunGuard } from '../../../src/game/engagement/runGuard';
import type { EngagementContext, ExecutionStep } from '../../../src/game/engagement/types';
import { installFakeClock, makeHarnessCtx } from './helpers/beamHarness';
import { useBeamEngine } from '../../../src/hooks/useBeamEngine';
import type { PlacedPiece } from '../../../src/game/types';

// React 18+ requires this flag before any act() call (same pattern as
// __tests__/unit/hooks/useBeamEngine.test.ts).
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  (globalThis as { cancelAnimationFrame?: (id: number) => void }).cancelAnimationFrame =
    (id: number) => clearTimeout(id);
}

import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void | Promise<void>) => Promise<void> | void;
  create: (el: React.ReactElement) => { unmount: () => void };
} = require('react-test-renderer');

// Same additive shim as P4b.bitTravel.test.ts: runLinearPath's
// crossfade cleanup calls crossfadeAnim.stopAnimation(), which the
// shared react-native mock's Animated.Value has never needed before
// (its timing().start() resolves synchronously, leaving nothing to
// stop). A no-op matches what the real Animated.Value.stopAnimation
// does here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedValueProto = (Animated.Value as any).prototype;
if (typeof AnimatedValueProto.stopAnimation !== 'function') {
  AnimatedValueProto.stopAnimation = function stopAnimation(
    cb?: (value: number) => void,
  ): void {
    cb?.(this.__getValue?.() ?? 0);
  };
}

function step(type: string, pieceId: string, success = true): ExecutionStep {
  return { pieceId, type, success } as ExecutionStep;
}

describe('[P9-1] cancelAllFrames settles an in-flight runLinearPath', () => {
  it('resolves a pending run when cancelAllFrames runs mid-flight', async () => {
    let hookResult: ReturnType<typeof useBeamEngine> | null = null;
    function Harness(props: { pieces: PlacedPiece[] }) {
      hookResult = useBeamEngine(props.pieces);
      return null;
    }
    TestRenderer.act(() => {
      TestRenderer.create(React.createElement(Harness, { pieces: [] }));
    });

    const clock = installFakeClock();
    try {
      const harness = makeHarnessCtx({
        clockNow: clock.now,
        cellSize: 60,
        pieceCenters: { src: { x: 0, y: 0 }, term: { x: 600, y: 0 } },
      });
      // Route the harness ctx through the real hook's refs so the real
      // cancelAllFrames (which cancels animFrameRef entries and flushes
      // pendingResolversRef) is exercising the exact object runLinearPath
      // registered itself into.
      harness.ctx.animFrameRef = hookResult!.animFrameRef;
      harness.ctx.pendingResolversRef = hookResult!.pendingResolversRef;

      // 600px at CELL_SIZE 60 is 10 cells; at speed 1 that's 750ms of
      // travel (BEAM_MS_PER_CELL 75) — comfortably longer than the 20ms
      // this test advances before cancelling.
      const steps = [step('source', 'src'), step('terminal', 'term')];
      let resolved = false;
      const p = runLinearPath(harness.ctx, steps, null, 1).then(() => {
        resolved = true;
      });

      await clock.advance(20);
      expect(resolved).toBe(false);
      expect(hookResult!.animFrameRef.current.size).toBeGreaterThan(0);

      TestRenderer.act(() => {
        hookResult!.cancelAllFrames();
      });
      await Promise.resolve();
      await Promise.resolve();
      await p;

      expect(resolved).toBe(true);
      expect(hookResult!.animFrameRef.current.size).toBe(0);
      expect(hookResult!.pendingResolversRef.current.size).toBe(0);
    } finally {
      clock.restore();
    }
  });
});

describe('[P9-3] void burst resolves when the native callback never fires', () => {
  it('settles runLinearPath even when Animated.timing().start() never calls back', async () => {
    const clock = installFakeClock();
    const timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      // Simulates the native bridge callback that never fires.
      start: () => undefined,
      stop: () => undefined,
      reset: () => undefined,
    }));
    try {
      const harness = makeHarnessCtx({
        clockNow: clock.now,
        cellSize: 60,
        pieceCenters: { src: { x: 0, y: 0 }, blocker: { x: 60, y: 0 } },
      });
      const steps = [
        step('source', 'src'),
        { pieceId: 'blocker', type: 'void', success: false } as ExecutionStep,
      ];
      let resolved = false;
      const p = runLinearPath(harness.ctx, steps, null, 1).then(() => {
        resolved = true;
      });

      // Travel is one cell (75ms at speed 1) then the void burst fires
      // — with the mocked callback never firing, only raceWithTimeout's
      // own timeout (320 + 500ms) can unblock it.
      await clock.advance(200);
      expect(resolved).toBe(false);
      await clock.advance(900);

      expect(resolved).toBe(true);
    } finally {
      timingSpy.mockRestore();
      clock.restore();
    }
  });
});

describe('[P9-3] runWrongOutputRings resolves when the native callback never fires', () => {
  it('settles even when Animated.timing().start() never calls back', async () => {
    jest.useFakeTimers();
    const timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: () => undefined,
      stop: () => undefined,
      reset: () => undefined,
    }));
    try {
      const setVoidBurstCenter = jest.fn();
      const ctx = {
        setVoidBurstCenter,
        voidPulseAnim: null,
        voidPulseRingProgressAnim: new Animated.Value(0),
      } as unknown as EngagementContext;

      let resolved = false;
      const p = runWrongOutputRings(ctx, { x: 1, y: 1 }).then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(900);
      await Promise.resolve();
      await Promise.resolve();
      await p;

      expect(resolved).toBe(true);
      expect(setVoidBurstCenter).toHaveBeenCalledTimes(2);
    } finally {
      timingSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});

describe('[P9-4] path ending at a blocking config node resolves in bound; the safety timer does not fire', () => {
  it('resolves well inside the documented bound with no lingering safety timer', async () => {
    const clock = installFakeClock();
    try {
      const harness = makeHarnessCtx({
        clockNow: clock.now,
        cellSize: 60,
        pieceCenters: { src: { x: 0, y: 0 }, cfg: { x: 60, y: 0 } },
      });
      // pulse 0 -> getPulseSpeed = 2.0 (currentPulseRef defaults to 0
      // in the harness), matching the contract's `* speed` terms.
      const speed = 2.0;
      const steps = [
        step('source', 'src'),
        step('configNode', 'cfg', false),
        { pieceId: 'none', type: 'void', success: false } as ExecutionStep,
      ];
      let resolved = false;
      const p = runLinearPath(harness.ctx, steps, null, speed).then(() => {
        resolved = true;
      });

      // Contract bound: totalMs + (150 + 450) * speed + 320 + 250.
      // totalMs for a 1-cell path (CELL_SIZE 60) at speed 2.0 is 150ms.
      const bound = 150 + 600 * speed + 320 + 250;
      await clock.advance(bound);

      expect(resolved).toBe(true);
      // The 8s tape-pause safety timer for the Config Node interaction
      // must have been cleared by the normal settle path, not left
      // pending (and never fired — it would need 8000ms of advance).
      expect(harness.ctx.safetyTimersRef.current).toEqual([]);
    } finally {
      clock.restore();
    }
  });
});

describe('[P9-2] handleEngage wrapper ends the run on throw and on cancel', () => {
  const gameplaySrc = fs.readFileSync(
    path.resolve(__dirname, '../../../src/screens/GameplayScreen.tsx'),
    'utf-8',
  ).replace(/\r\n/g, '\n');

  it('renames the original handleEngage body to runEngage, unchanged', () => {
    // Red on master: master has no `runEngage`, only `handleEngage`
    // directly wrapping the level guard.
    expect(gameplaySrc).toMatch(/const runEngage = useCallback\(async \(\) => \{\n\s*if \(isExecuting \|\| !level\) return;/);
  });

  it('wraps runEngage with withRunGuard in an outer handleEngage', () => {
    const start = gameplaySrc.indexOf('const handleEngage = useCallback(async () => {');
    expect(start).toBeGreaterThan(-1);
    const end = gameplaySrc.indexOf('\n  // ── Reset ──', start);
    const block = gameplaySrc.slice(start, end === -1 ? undefined : end);
    expect(block).toMatch(/withRunGuard\(/);
    expect(block).toMatch(/endRun,/);
    expect(block).toMatch(/cancelAllFrames: beam\.cancelAllFrames,/);
    expect(block).toMatch(/isCurrentRun: \(\) => beam\.runIdRef\.current === capturedRunId/);
  });

  it('does not re-indent the original runEngage body (no wrapping block around it)', () => {
    // The line immediately after the renamed declaration is still the
    // original guard at its original one-tab indentation — proof the
    // body was not wrapped in an additional block.
    const idx = gameplaySrc.indexOf('const runEngage = useCallback(async () => {');
    const nextLine = gameplaySrc.slice(idx, gameplaySrc.indexOf('\n', idx) + 40);
    expect(nextLine).toMatch(/\n {4}if \(isExecuting \|\| !level\) return;/);
  });
});

describe('[P9-2] withRunGuard (extracted guard helper)', () => {
  it('ends the run on throw, without re-throwing', async () => {
    const endRun = jest.fn();
    const cancelAllFrames = jest.fn();
    const onError = jest.fn();
    await expect(
      withRunGuard(
        async () => {
          throw new Error('boom');
        },
        { endRun, cancelAllFrames, isCurrentRun: () => true, onError },
      ),
    ).resolves.toBeUndefined();
    expect(endRun).toHaveBeenCalledTimes(1);
    expect(cancelAllFrames).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('ends the run when the run was superseded, even though the run function did not throw', async () => {
    const endRun = jest.fn();
    const cancelAllFrames = jest.fn();
    await withRunGuard(async () => undefined, {
      endRun,
      cancelAllFrames,
      isCurrentRun: () => false,
    });
    expect(endRun).toHaveBeenCalledTimes(1);
    expect(cancelAllFrames).toHaveBeenCalledTimes(1);
  });

  it('does nothing extra when the run completes normally and is still current', async () => {
    const endRun = jest.fn();
    const cancelAllFrames = jest.fn();
    await withRunGuard(async () => undefined, {
      endRun,
      cancelAllFrames,
      isCurrentRun: () => true,
    });
    expect(endRun).not.toHaveBeenCalled();
    expect(cancelAllFrames).not.toHaveBeenCalled();
  });
});
