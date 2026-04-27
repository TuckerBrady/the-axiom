import type { EngagementContext, TapeHighlight } from './types';

// Per-piece flash. Pre-Prompt 99C this fired two setPieceAnimState
// calls — one to set the color in `flashing`, one queued via
// setTimeout(..., 180) to delete it again. The flash itself was an
// instant snap (no opacity animation).
//
// Post-99C (Fix 1, option b): a single setPieceAnimState call that
// writes the color AND increments `flashCounter`. BoardPiece watches
// its slice of flashCounter and runs a native-driven opacity
// sequence (useNativeDriver: true, 90ms fade-in + 90ms fade-out) on
// counter change. The flash-off setTimeout is gone; the entry stays
// in `flashing` until the per-pulse sweep clears it (no growth across
// pulses).
//
// PERFORMANCE_CONTRACT 2.1.2 (native-driven opacity), 3.1.3 (≤1
// setPieceAnimState per beam tick — the per-tick batching for
// multiple flashes lives in beamAnimation.ts via FlashBatch /
// applyFlashBatch below), 7.1.1 (batched flash calls in one tick).
export function flashPiece(
  ctx: EngagementContext,
  pieceId: string,
  color: string,
): void {
  ctx.setPieceAnimState(prev => {
    const flashing = new Map(prev.flashing);
    flashing.set(pieceId, color);
    const flashCounter = new Map(prev.flashCounter);
    flashCounter.set(pieceId, (prev.flashCounter.get(pieceId) ?? 0) + 1);
    return { ...prev, flashing, flashCounter };
  });
}

export interface PieceAnimEntry {
  pieceId: string;
  tag: string;
  duration: number;
}

export interface GateResultEntry {
  pieceId: string;
  result: 'pass' | 'block';
}

// In-tick buffer for batched piece-anim updates (Prompt 99C, Fix 1
// option b). The beam tick collects every flash + animation start +
// gate result that crosses its threshold this frame, then dispatches
// ONE setPieceAnimState call covering them all. Pre-99C each
// waypoint that flashed dispatched its own setter, blowing the
// PERFORMANCE_CONTRACT 3.1.3 budget on ticks with multiple
// concurrent waypoints (Splitter pre-fork paths, easeOut3 packing,
// etc.).
export interface FlashBatch {
  flashes: { pieceId: string; color: string }[];
  animations: PieceAnimEntry[];
  gates: GateResultEntry[];
}

export function makeFlashBatch(): FlashBatch {
  return { flashes: [], animations: [], gates: [] };
}

export function applyFlashBatch(
  ctx: EngagementContext,
  batch: FlashBatch,
): void {
  if (
    batch.flashes.length === 0 &&
    batch.animations.length === 0 &&
    batch.gates.length === 0
  ) {
    return;
  }
  ctx.setPieceAnimState(prev => {
    let flashing = prev.flashing;
    let flashCounter = prev.flashCounter;
    if (batch.flashes.length > 0) {
      flashing = new Map(prev.flashing);
      flashCounter = new Map(prev.flashCounter);
      for (const f of batch.flashes) {
        flashing.set(f.pieceId, f.color);
        flashCounter.set(f.pieceId, (flashCounter.get(f.pieceId) ?? 0) + 1);
      }
    }
    let animations = prev.animations;
    if (batch.animations.length > 0) {
      animations = new Map(prev.animations);
      for (const a of batch.animations) {
        animations.set(a.pieceId, a.tag);
      }
    }
    let gates = prev.gates;
    if (batch.gates.length > 0) {
      gates = new Map(prev.gates);
      for (const g of batch.gates) {
        gates.set(g.pieceId, g.result);
      }
    }
    return { ...prev, flashing, flashCounter, animations, gates };
  });
}

export function setHighlight(
  ctx: EngagementContext,
  key: string,
  kind: TapeHighlight,
): void {
  ctx.setTapeCellHighlights(prev => {
    const m = new Map(prev);
    m.set(key, kind);
    return m;
  });
}

export function clearAllHighlights(ctx: EngagementContext): void {
  ctx.setTapeCellHighlights(new Map());
}

export const wait = (ms: number): Promise<void> =>
  new Promise<void>(r => setTimeout(r, ms));
