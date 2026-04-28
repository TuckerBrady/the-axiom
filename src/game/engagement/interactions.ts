import type { EngagementContext, ExecutionStep } from './types';
import { useGameStore } from '../../store/gameStore';
import { getPulseSpeed, getTapeCellPosFromCache } from '../bubbleMath';
import { animMap, TAPE_PIECE_COLORS, getBeamColor } from './constants';
import {
  flashPiece,
  setHighlight,
  wait,
  type FlashBatch,
} from './bubbleHelpers';
import { runValueTravel } from './valueTravelAnimation';
import {
  updateActiveAnimations,
} from './stateHelpers';

export async function runScannerInteraction(
  ctx: EngagementContext,
  stp: ExecutionStep,
): Promise<void> {
  const pulse = ctx.currentPulseRef.current;
  const color = TAPE_PIECE_COLORS.scanner;
  const speed = getPulseSpeed(pulse);
  const pc = ctx.getPieceCenter(stp.pieceId);
  if (!pc) {
    if (__DEV__) console.warn(`getPieceCenter returned null for ${stp.pieceId} on pulse ${pulse}`);
    return;
  }
  const cachedInputCells = ctx.cacheRef.current.input;
  const cachedTrailCells = ctx.cacheRef.current.trail;

  const tapeValue = ctx.inputTape?.[pulse];
  const display = tapeValue === undefined ? '?' : String(tapeValue);

  const inputCell = getTapeCellPosFromCache(cachedInputCells, pulse);

  flashPiece(ctx, stp.pieceId, color);
  await wait(120 * speed);

  await wait(250 * speed);

  setHighlight(ctx, `in-${pulse}`, 'read');
  ctx.setTapeBarState(prev => ({ ...prev, inIndex: pulse }));
  await wait(300 * speed);

  await wait(80 * speed);

  // Mark IN cell as 'departing' for the lift-off; cleared at end of
  // the function alongside the existing read-highlight clear.
  setHighlight(ctx, `in-${pulse}`, 'departing');

  // Three-phase value travel: lift-off → arc → impact (~1.15s total
  // after Prompt 91, Fix 6 — was ~1.6s). Glow traveler is positioned
  // by its top-left corner; cell positions from the cache are
  // centers, so subtract half-width/height (12).
  // The TRAIL "accept" highlight + visual override fire via the
  // onArrive callback so the handoff is synchronous with the
  // landing, not gapped behind the impact fade-out.
  const trailCellPos = getTapeCellPosFromCache(cachedTrailCells, pulse);

  // onArrive fires either as the glow animation landing callback or
  // synchronously when tape container positions are unavailable (null
  // cache). Tape state always updates; only the visual glow is skipped.
  const onArrive = () => {
    setHighlight(ctx, `trail-${pulse}`, 'write');
    ctx.setTapeBarState(prev => ({ ...prev, trailIndex: pulse }));
    if (tapeValue !== undefined) {
      ctx.setVisualTrailOverride(prev => {
        if (!prev) return prev;
        const next = [...prev];
        next[pulse] = tapeValue;
        return next;
      });
    }
  };

  if (inputCell && trailCellPos) {
    await runValueTravel(
      ctx,
      ctx.valueTravelRefs,
      inputCell.x - 12,
      inputCell.y - 12,
      trailCellPos.x - 12,
      trailCellPos.y - 12,
      display,
      onArrive,
    );
  } else {
    onArrive();
  }

  await wait(250 * speed);
  // Clear the IN highlight (currently 'departing'). Trail-write stays
  // so accumulated state persists across pulses (Prompt 76).
  ctx.setTapeCellHighlights(prev => {
    const m = new Map(prev);
    m.delete(`in-${pulse}`);
    return m;
  });
}

export async function runConfigNodeInteraction(
  ctx: EngagementContext,
  stp: ExecutionStep,
): Promise<void> {
  const pulse = ctx.currentPulseRef.current;
  const speed = getPulseSpeed(pulse);
  const pass = !!stp.success;
  const color = pass ? '#00FF87' : '#FF3B3B';

  // Record gate outcome for OUT tape coloring (84C).
  ctx.gateOutcomes.current.set(pulse, pass ? 'passed' : 'blocked');

  const pc = ctx.getPieceCenter(stp.pieceId);
  if (!pc) {
    if (__DEV__) console.warn(`getPieceCenter returned null for ${stp.pieceId} on pulse ${pulse}`);
    return;
  }

  setHighlight(ctx, `trail-${pulse}`, pass ? 'gate-pass' : 'gate-block');
  ctx.setTapeBarState(prev => ({ ...prev, trailIndex: pulse }));
  await wait(150 * speed);

  flashPiece(ctx, stp.pieceId, color);
  await wait((pass ? 350 : 450) * speed);

  // On block: slide the OUT bar to this pulse index, flag the OUT
  // cell, and write the -2 sentinel so rendering shows the middle-dot
  // blocked placeholder. (Transmitter never fires on a blocked pulse.)
  if (!pass) {
    ctx.setTapeBarState(prev => ({ ...prev, outIndex: pulse }));
    setHighlight(ctx, `out-${pulse}`, 'gate-block');
    ctx.setVisualOutputOverride(prev => {
      if (!prev) return prev;
      if (ctx.runId !== ctx.currentRunIdRef.current) return prev;
      const next = [...prev];
      next[pulse] = -2;
      return next;
    });
  }
  // Trail gate highlight persists across pulses (Prompt 76).
}

export async function runTransmitterInteraction(
  ctx: EngagementContext,
  stp: ExecutionStep,
): Promise<void> {
  const pulse = ctx.currentPulseRef.current;
  const color = TAPE_PIECE_COLORS.transmitter;
  const speed = getPulseSpeed(pulse);
  const pc = ctx.getPieceCenter(stp.pieceId);
  if (!pc) {
    if (__DEV__) console.warn(`getPieceCenter returned null for ${stp.pieceId} on pulse ${pulse}`);
    return;
  }
  const written = useGameStore.getState().machineState.outputTape?.[pulse] ?? 0;

  flashPiece(ctx, stp.pieceId, color);
  setHighlight(ctx, `out-${pulse}`, 'write');
  ctx.setTapeBarState(prev => ({ ...prev, outIndex: pulse }));
  await wait(300 * speed);

  ctx.setVisualOutputOverride(prev => {
    if (!prev) return prev;
    if (ctx.runId !== ctx.currentRunIdRef.current) return prev;
    const next = [...prev];
    next[pulse] = written;
    return next;
  });

  await wait(150 * speed);
}

// triggerPieceAnim runs the piece's flash + interaction. When called
// from inside a beam-tick (Prompt 99C, Fix 1), pass a `batch` so the
// flash + animation registration accumulate into the tick's single
// setPieceAnimState dispatch (clause 3.1.3). When called outside a
// tick (e.g., from runReplayLoop's per-iteration source flash), omit
// the batch and the helpers fire their own setter as before.
export function triggerPieceAnim(
  ctx: EngagementContext,
  stp: ExecutionStep,
  batch?: FlashBatch,
): Promise<void> {
  const flashColor = getBeamColor(stp.type);
  if (batch) {
    batch.flashes.push({ pieceId: stp.pieceId, color: flashColor });
  } else {
    flashPiece(ctx, stp.pieceId, flashColor);
  }
  const anim = animMap[stp.type];
  if (anim) {
    const pieceId = stp.pieceId;
    if (batch) {
      batch.animations.push({ pieceId, tag: anim.tag, duration: anim.duration });
      if (stp.type === 'configNode') {
        const result: 'pass' | 'block' = stp.success ? 'pass' : 'block';
        batch.gates.push({ pieceId, result });
      }
    } else {
      updateActiveAnimations(ctx.setPieceAnimState, prev => { const n = new Map(prev); n.set(pieceId, anim.tag); return n; });
      if (stp.type === 'configNode') {
        const result: 'pass' | 'block' = stp.success ? 'pass' : 'block';
        ctx.setPieceAnimState(p => ({
          ...p,
          gates: new Map(p.gates).set(pieceId, result),
        }));
      }
    }
    // Animation-clear setTimeout still runs as a deferred (next-tick)
    // setter; it never lands in the same tick as the start, so it
    // doesn't compete with the in-tick batch budget.
    const t = setTimeout(() => {
      updateActiveAnimations(ctx.setPieceAnimState, prev => { const n = new Map(prev); n.delete(pieceId); return n; });
    }, anim.duration);
    ctx.flashTimersRef.current.push(t);
  }
  if (stp.type === 'scanner') return runScannerInteraction(ctx, stp);
  if (stp.type === 'configNode') return runConfigNodeInteraction(ctx, stp);
  if (stp.type === 'transmitter') return runTransmitterInteraction(ctx, stp);
  return Promise.resolve();
}
