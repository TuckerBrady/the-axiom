import { Easing } from 'react-native';
import type { EngagementContext, ExecutionStep, Pt } from './types';
import { BIT_TRAVELER_INITIAL } from './types';
import { useGameStore } from '../../store/gameStore';
import { getPulseSpeed, getTapeCellPosFromCache } from '../bubbleMath';
import { animMap, TAPE_PIECE_COLORS, getBeamColor, BIT_TRAVEL_MS } from './constants';
import { bitTravelPoint } from './beamData';
import {
  flashPiece,
  setHighlight,
  wait,
  type FlashBatch,
} from './bubbleHelpers';
import {
  updateActiveAnimations,
} from './stateHelpers';
import { hapticLight, hapticMedium } from '../../utils/haptics';

// AXM-036 P4b-2 (F13 a, c) — the cinematic ease used for every bit-travel
// leg (IN→Scanner, Scanner→TRAIL, Transmitter→OUT). Mirrors the curve
// valueTravelAnimation.ts used, but this module MUST NOT import that file
// (P4b-1): it is native-driver and superseded by the single tape-to-tape
// arrival fill (Tucker 2026-06-13).
const BIT_TRAVEL_EASING = Easing.bezier(0.4, 0, 0.2, 1);

// Writes the traveler's board-local position for the current leg. Radius
// is 0.18 * CELL_SIZE (P4b-1), computed here (where EngagementContext.CELL_SIZE
// is in scope) so BeamOverlay stays a pure renderer of BeamState.
function setTraveler(ctx: EngagementContext, pt: Pt, value: number): void {
  const r = 0.18 * ctx.CELL_SIZE;
  ctx.setBeamState(prev => ({ ...prev, traveler: { visible: true, x: pt.x, y: pt.y, value, r } }));
}

function clearTraveler(ctx: EngagementContext): void {
  ctx.setBeamState(prev => ({ ...prev, traveler: BIT_TRAVELER_INITIAL }));
}

// AXM-036 P4b-2/P4b-6 (F13 a, c) — carries the traveler from `from` to
// `to` over `durationMs` (already speed-scaled by the caller), landing on
// `to` exactly at `durationMs`. Three keyframes (start / eased midpoint /
// end) driven by the same `wait()` helper the rest of this module uses —
// deliberately NOT requestAnimationFrame: interactions.ts runs inside the
// existing tape-piece pause window (beamAnimation.ts's inFlightTapePauses),
// which is timed by promise resolution, not by the beam's own RAF tick,
// and `wait()` is what the test tier already knows how to fake/mock.
async function runBitTravel(
  ctx: EngagementContext,
  from: Pt,
  to: Pt,
  value: number,
  durationMs: number,
): Promise<void> {
  setTraveler(ctx, from, value);
  if (durationMs <= 0) {
    setTraveler(ctx, to, value);
    return;
  }
  const half = durationMs / 2;
  await wait(half);
  setTraveler(ctx, bitTravelPoint(from, to, BIT_TRAVEL_EASING(0.5)), value);
  await wait(half);
  setTraveler(ctx, to, value);
}

// Converts a tape cell's cached, screen-absolute measurement (from
// measureInWindow — see bubbleMath.ts / MeasurementCache) into the
// board-local coordinate space BeamOverlay's Svg already draws in (the
// same space getPieceCenter returns), by subtracting the cached board
// origin. Returns null when the cell hasn't been measured yet.
function tapeCellBoardLocal(
  ctx: EngagementContext,
  cache: Parameters<typeof getTapeCellPosFromCache>[0],
  index: number,
): Pt | null {
  const abs = getTapeCellPosFromCache(cache, index);
  if (!abs) return null;
  const board = ctx.cacheRef.current.board;
  return { x: abs.x - board.x, y: abs.y - board.y };
}

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

  // (i) Flash the Scanner, settle.
  flashPiece(ctx, stp.pieceId, color);
  await wait(120 * speed);

  // (ii) Read the IN cell.
  setHighlight(ctx, `in-${pulse}`, 'read');
  ctx.setTapeBarState(prev => ({ ...prev, inIndex: pulse }));

  // AXM-036 P4b-3 (F13 a, c): a pulse with no input value skips both
  // travels, as on master. When a value IS present but a travel's
  // endpoint hasn't been measured yet, the travel isn't drawn, but its
  // duration is still waited (P4b-3) so the overall pacing is unchanged.
  if (tapeValue !== undefined) {
    const legMs = BIT_TRAVEL_MS * speed;
    const inLocal = tapeCellBoardLocal(ctx, ctx.cacheRef.current.input, pulse);
    const trailLocal = tapeCellBoardLocal(ctx, ctx.cacheRef.current.trail, pulse);

    // (iii) Travel IN cell N → Scanner.
    if (inLocal) {
      await runBitTravel(ctx, inLocal, pc, tapeValue, legMs);
    } else {
      await wait(legMs);
    }

    // (iv) Travel Scanner → TRAIL cell N.
    if (trailLocal) {
      await runBitTravel(ctx, pc, trailLocal, tapeValue, legMs);
    } else {
      await wait(legMs);
    }
  }

  // (v) Land in the TRAIL cell (Tucker 2026-06-13 arrival-fill design —
  // the value lands with a pulse in the TRAIL tape's own color, the same
  // animation the OUT cell uses on Transmitter arrival).
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
  clearTraveler(ctx);

  // (vi) Clear the IN read highlight. The trail fill persists across
  // pulses (Prompt 76) until the Config Node overwrites it with the gate
  // result.
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
  // (i) Flash the Transmitter.
  flashPiece(ctx, stp.pieceId, color);

  // AXM-036 P4b-4 (F13 a, c): the OUT cell fills only AFTER the traveler
  // lands (Tucker 2026-06-16's Transmitter-arrival fill still applies —
  // this only adds the travel in front of it, it does not move the
  // write back to the Terminal). A blocked pulse never reaches the
  // Transmitter (stp.success is always true here in practice); the guard
  // is defensive.
  if (stp.success) {
    const outputTape = useGameStore.getState().machineState.outputTape;
    const written = outputTape?.[pulse];
    if (written !== undefined && typeof written === 'number') {
      const legMs = BIT_TRAVEL_MS * speed;
      const outLocal = tapeCellBoardLocal(ctx, ctx.cacheRef.current.output, pulse);

      // (ii) Travel Transmitter → OUT cell N, carrying the value the
      // engine wrote. Endpoint unmeasured: no travel drawn, but the
      // same duration is still waited (P4b-3's rule, reused here).
      if (outLocal) {
        await runBitTravel(ctx, pc, outLocal, written, legMs);
      } else {
        await wait(legMs);
      }
    }
    // (iii) Land — not before. revealOutputCell is the piece that
    // actually writes the output (Tucker 2026-06-16; supersedes the
    // 2026-06-13 Terminal-arrival fill). Mirrors the Scanner → trail
    // write.
    revealOutputCell(ctx, pulse);
    clearTraveler(ctx);
  }
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
  // REQ-G-16 (Handoff 003) — machine heartbeat. One light tap per piece the
  // beam touches; medium on Terminal arrival (the payoff); no tap for
  // Source itself, so the beam launch (CHARGE, handled elsewhere with no
  // haptic) is the first thing felt, not a tap before it's even left.
  if (stp.type === 'terminal') {
    hapticMedium();
  } else if (stp.type !== 'source') {
    hapticLight();
  }
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
