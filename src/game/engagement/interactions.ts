import type { EngagementContext, ExecutionStep } from './types';
import { useGameStore } from '../../store/gameStore';
import { getPulseSpeed, getTapeCellPosFromCache } from '../bubbleMath';
import { animMap, TAPE_PIECE_COLORS, getBeamColor } from './constants';
import { flashPiece, setHighlight, wait } from './bubbleHelpers';
import { showSpotlight, updateSpotlightValue, hideSpotlight } from './spotlightHelpers';
import { runValueTravel } from './valueTravelAnimation';
import {
  updateActiveAnimations,
  updateGateResults,
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
  const cachedBoardPos = ctx.cacheRef.current.board;
  const cachedInputCells = ctx.cacheRef.current.input;
  const cachedTrailCells = ctx.cacheRef.current.trail;

  const scannerX = cachedBoardPos.x + pc.x;
  const scannerY = cachedBoardPos.y + pc.y;
  const tapeValue = ctx.inputTape?.[pulse];
  const display = tapeValue === undefined ? '?' : String(tapeValue);

  const inputCell = getTapeCellPosFromCache(cachedInputCells, pulse);

  flashPiece(ctx, stp.pieceId, color);
  await wait(120 * speed);

  showSpotlight(ctx, scannerX, scannerY, inputCell.x, inputCell.y, color, '');
  await wait(250 * speed);

  setHighlight(ctx, `in-${pulse}`, 'read');
  ctx.setTapeBarState(prev => ({ ...prev, inIndex: pulse }));
  updateSpotlightValue(ctx, display);
  await wait(300 * speed);

  hideSpotlight(ctx);
  await wait(80 * speed);

  // Mark IN cell as 'departing' for the lift-off; cleared at end of
  // the function alongside the existing read-highlight clear.
  setHighlight(ctx, `in-${pulse}`, 'departing');

  // Three-phase value travel: lift-off → arc → impact (~1.6s total).
  // Glow traveler is positioned by its top-left corner; cell positions
  // from the cache are centers, so subtract half-width/height (12).
  const trailCellPos = getTapeCellPosFromCache(cachedTrailCells, pulse);
  await runValueTravel(
    ctx,
    ctx.valueTravelRefs,
    inputCell.x - 12,
    inputCell.y - 12,
    trailCellPos.x - 12,
    trailCellPos.y - 12,
    display,
  );

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
  const cachedBoardPos = ctx.cacheRef.current.board;
  const cachedTrailCells = ctx.cacheRef.current.trail;
  const nodeX = cachedBoardPos.x + pc.x;
  const nodeY = cachedBoardPos.y + pc.y;

  const trailCells = useGameStore.getState().machineState.dataTrail.cells;
  const trailValue = trailCells.length > 0 && pulse < trailCells.length
    ? trailCells[pulse]
    : null;
  const display = trailValue === null ? '?' : String(trailValue);

  const trailCell = getTapeCellPosFromCache(cachedTrailCells, pulse);

  setHighlight(ctx, `trail-${pulse}`, pass ? 'gate-pass' : 'gate-block');
  ctx.setTapeBarState(prev => ({ ...prev, trailIndex: pulse }));
  await wait(150 * speed);

  showSpotlight(ctx, nodeX, nodeY, trailCell.x, trailCell.y, color, display);
  flashPiece(ctx, stp.pieceId, color);
  await wait((pass ? 350 : 450) * speed);

  hideSpotlight(ctx);

  // On block: slide the OUT bar to this pulse index, flag the OUT
  // cell, and write the -2 sentinel so rendering shows the middle-dot
  // blocked placeholder. (Transmitter never fires on a blocked pulse.)
  if (!pass) {
    ctx.setTapeBarState(prev => ({ ...prev, outIndex: pulse }));
    setHighlight(ctx, `out-${pulse}`, 'gate-block');
    ctx.setVisualOutputOverride(prev => {
      if (!prev) return prev;
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
  const cachedBoardPos = ctx.cacheRef.current.board;
  const cachedOutputCells = ctx.cacheRef.current.output;
  const transmitterX = cachedBoardPos.x + pc.x;
  const transmitterY = cachedBoardPos.y + pc.y;
  const written = useGameStore.getState().machineState.outputTape?.[pulse] ?? 0;
  const display = String(written);

  const outputCell = getTapeCellPosFromCache(cachedOutputCells, pulse);

  flashPiece(ctx, stp.pieceId, color);
  setHighlight(ctx, `out-${pulse}`, 'write');
  ctx.setTapeBarState(prev => ({ ...prev, outIndex: pulse }));
  showSpotlight(ctx, transmitterX, transmitterY, outputCell.x, outputCell.y, color, display);
  await wait(300 * speed);

  ctx.setVisualOutputOverride(prev => {
    if (!prev) return prev;
    const next = [...prev];
    next[pulse] = written;
    return next;
  });

  await wait(150 * speed);
  hideSpotlight(ctx);
}

export function triggerPieceAnim(
  ctx: EngagementContext,
  stp: ExecutionStep,
): Promise<void> {
  flashPiece(ctx, stp.pieceId, getBeamColor(stp.type));
  const anim = animMap[stp.type];
  if (anim) {
    const pieceId = stp.pieceId;
    updateActiveAnimations(ctx.setPieceAnimState, prev => { const n = new Map(prev); n.set(pieceId, anim.tag); return n; });
    if (stp.type === 'configNode') {
      const result: 'pass' | 'block' = stp.success ? 'pass' : 'block';
      updateGateResults(ctx.setPieceAnimState, prev => { const n = new Map(prev); n.set(pieceId, result); return n; });
    }
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
