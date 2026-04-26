import type { EngagementContext, Pt, LockRing } from './types';
import {
  setSignalPhase,
  setVoidPulse,
  setLockedPieces,
  updateLitWires,
} from './stateHelpers';

// Lock / wrong-output / replay-lock all run on the main beam slot
// (`null`) — these phases never branch. Routed through the
// per-slot RAF Map (Prompt 94, Fix 2) so the cleanup walk doesn't
// miss in-flight frames if a Splitter run is interleaved.

export async function runLockPhase(
  ctx: EngagementContext,
  outputCenter: Pt,
): Promise<void> {
  setSignalPhase(ctx.setBeamState, 'lock');
  const ringStart = performance.now();
  await new Promise<void>(res => {
    const tick = (): void => {
      const elapsed = performance.now() - ringStart;
      const ringsState: LockRing[] = [];
      for (let ri = 0; ri < 2; ri++) {
        const ringElapsed = elapsed - ri * 100;
        if (ringElapsed >= 0 && ringElapsed <= 200) {
          const rt = ringElapsed / 200;
          ringsState.push({ x: outputCenter.x, y: outputCenter.y, r: 6 + rt * 36, opacity: 0.95 * (1 - rt) });
        }
      }
      ctx.setLockRings(ringsState);
      if (elapsed < 320) {
        ctx.animFrameRef.current.set(null, requestAnimationFrame(tick));
      } else {
        ctx.animFrameRef.current.delete(null);
        ctx.setLockRings([]);
        res();
      }
    };
    ctx.animFrameRef.current.set(null, requestAnimationFrame(tick));
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
  await new Promise(r => setTimeout(r, 160));
}

export async function runWrongOutputRings(
  ctx: EngagementContext,
  outputCenter: Pt,
): Promise<void> {
  const ringStart = performance.now();
  await new Promise<void>(res => {
    const tick = (): void => {
      const elapsed = performance.now() - ringStart;
      const ringsState: LockRing[] = [];
      for (let ri = 0; ri < 2; ri++) {
        const ringElapsed = elapsed - ri * 100;
        if (ringElapsed >= 0 && ringElapsed <= 200) {
          const rt = ringElapsed / 200;
          ringsState.push({ x: outputCenter.x, y: outputCenter.y, r: 6 + rt * 36, opacity: 0.95 * (1 - rt) });
        }
      }
      if (ringsState[0]) setVoidPulse(ctx.setBeamState, { x: ringsState[0].x, y: ringsState[0].y, r: ringsState[0].r, opacity: ringsState[0].opacity });
      if (elapsed < 320) {
        ctx.animFrameRef.current.set(null, requestAnimationFrame(tick));
      } else {
        ctx.animFrameRef.current.delete(null);
        setVoidPulse(ctx.setBeamState, null);
        res();
      }
    };
    ctx.animFrameRef.current.set(null, requestAnimationFrame(tick));
  });
}

// Replay-loop variant — bails if looping stops mid-animation.
export async function runReplayLockPhase(
  ctx: EngagementContext,
  outputCenter: Pt,
): Promise<void> {
  setSignalPhase(ctx.setBeamState, 'lock');
  const rs = performance.now();
  await new Promise<void>(res => {
    const tick = (): void => {
      if (!ctx.loopingRef.current) {
        ctx.animFrameRef.current.delete(null);
        ctx.setLockRings([]);
        res();
        return;
      }
      const el = performance.now() - rs;
      const rings: LockRing[] = [];
      for (let ri = 0; ri < 2; ri++) {
        const re = el - ri * 100;
        if (re >= 0 && re <= 200) {
          const rt = re / 200;
          rings.push({ x: outputCenter.x, y: outputCenter.y, r: 6 + rt * 36, opacity: 0.95 * (1 - rt) });
        }
      }
      ctx.setLockRings(rings);
      if (el < 320) {
        ctx.animFrameRef.current.set(null, requestAnimationFrame(tick));
      } else {
        ctx.animFrameRef.current.delete(null);
        ctx.setLockRings([]);
        res();
      }
    };
    ctx.animFrameRef.current.set(null, requestAnimationFrame(tick));
  });
}
