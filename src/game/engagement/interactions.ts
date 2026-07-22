import type { EngagementContext, ExecutionStep } from './types';
import { useGameStore } from '../../store/gameStore';
import { getPulseSpeed } from '../bubbleMath';
import { animMap, TAPE_PIECE_COLORS, getBeamColor } from './constants';
import {
  flashPiece,
  setHighlight,
  wait,
  type FlashBatch,
} from './bubbleHelpers';
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
  const tapeValue = ctx.inputTape?.[pulse];

  flashPiece(ctx, stp.pieceId, color);
  await wait(120 * speed);
  await wait(250 * speed);

  // Read the IN cell.
  setHighlight(ctx, `in-${pulse}`, 'read');
  ctx.setTapeBarState(prev => ({ ...prev, inIndex: pulse }));
  await wait(300 * speed);

  // Fill the TRAIL cell in place (Tucker 2026-06-13). This replaces the old
  // lift-off → arc → impact glow travel from IN to TRAIL with the single
  // tape-to-tape "arrival fill": the value lands in the destination cell with a
  // pulse in that tape's own color — the same animation the OUT cell uses on
  // Terminal arrival.
  setHighlight(ctx, `trail-${pulse}`, 'arrived');
  ctx.setTapeBarState(prev => ({ ...prev, trailIndex: pulse }));
  if (tapeValue !== undefined) {
    ctx.setVisualTrailOverride(prev => {
      if (!prev) return prev;
      const next = [...prev];
      next[pulse] = tapeValue;
      return next;
    });
  }
  await wait(300 * speed);

  // Clear the IN read highlight. The trail fill persists across pulses
  // (Prompt 76) until the Config Node overwrites it with the gate result.
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
  flashPiece(ctx, stp.pieceId, color);
  // The OUT cell fills HERE — the moment the signal hits the Transmitter, the
  // piece that actually writes the output (Tucker 2026-06-16; supersedes the
  // 2026-06-13 Terminal-arrival fill). Mirrors the Scanner → trail write.
  if (stp.success) revealOutputCell(ctx, pulse);
  await wait(300 * speed);
}

// Reveal a pulse's OUT cell with the value the engine already wrote
// (machineState.outputTape) and pulse its highlight — for ANY value (0 or 1).
// Called from the Transmitter interaction. Blocked pulses never reach a
// Transmitter, so they keep the gate-block middle-dot set by
// runConfigNodeInteraction. Levels without an OUT tape have no
// visualOutputOverride and are skipped.
function revealOutputCell(ctx: EngagementContext, pulse: number): void {
  const outputTape = useGameStore.getState().machineState.outputTape;
  if (!outputTape || outputTape[pulse] === undefined) return;
  const written = outputTape[pulse];

  ctx.setVisualOutputOverride(prev => {
    if (!prev) return prev;
    if (ctx.runId !== ctx.currentRunIdRef.current) return prev;
    const next = [...prev];
    next[pulse] = written;
    return next;
  });
  ctx.setTapeBarState(prev => ({ ...prev, outIndex: pulse }));
  setHighlight(ctx, `out-${pulse}`, 'arrived');
}

// OUT tape now fills at the Transmitter (revealOutputCell). The Terminal no
// longer populates it; retained as a no-op hook for any future terminal-arrival
// visual and so existing call sites/tests keep a stable import.
export function runTerminalInteraction(
  _ctx: EngagementContext,
  _stp: ExecutionStep,
): void {
  /* no-op — OUT fill moved to the Transmitter (Tucker 2026-06-16) */
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
  if (stp.type === 'terminal') { runTerminalInteraction(ctx, stp); return Promise.resolve(); }
  return Promise.resolve();
}
