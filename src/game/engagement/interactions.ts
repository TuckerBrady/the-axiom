import type { EngagementContext, ExecutionStep } from './types';
import { useGameStore } from '../../store/gameStore';
import { getPulseSpeed, getTapeCellPosFromCache } from '../bubbleMath';
import { animMap, TAPE_PIECE_COLORS, getBeamColor } from './constants';
import {
  flashPiece,
  startBubbleTrail,
  animateBubbleTo,
  showBubbleAt,
  hideBubble,
  setHighlight,
  clearAllHighlights,
  wait,
} from './bubbleHelpers';
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

  flashPiece(ctx, stp.pieceId, color);
  await wait(120 * speed);
  setHighlight(ctx, `in-${pulse}`, 'read');

  showBubbleAt(ctx, scannerX, scannerY, color, display);
  startBubbleTrail(ctx);
  await wait(180 * speed);

  const inputCell = getTapeCellPosFromCache(cachedInputCells, pulse);
  await animateBubbleTo(ctx, scannerX, scannerY, inputCell.x, inputCell.y, color, display, 300 * speed);
  await wait(180 * speed);
  await animateBubbleTo(ctx, inputCell.x, inputCell.y, scannerX, scannerY, color, display, 240 * speed);
  await wait(120 * speed);

  const trailCell = getTapeCellPosFromCache(cachedTrailCells, pulse);
  await animateBubbleTo(ctx, scannerX, scannerY, trailCell.x, trailCell.y, color, display, 300 * speed);
  setHighlight(ctx, `trail-${pulse}`, 'write');
  if (tapeValue !== undefined) {
    ctx.setVisualTrailOverride(prev => {
      if (!prev) return prev;
      const next = [...prev];
      next[pulse] = tapeValue;
      return next;
    });
  }

  await wait(250 * speed);
  hideBubble(ctx);
  clearAllHighlights(ctx);
}

export async function runConfigNodeInteraction(
  ctx: EngagementContext,
  stp: ExecutionStep,
): Promise<void> {
  const pulse = ctx.currentPulseRef.current;
  const speed = getPulseSpeed(pulse);
  const pass = !!stp.success;
  const color = pass ? '#00FF87' : '#FF3B3B';
  const pc = ctx.getPieceCenter(stp.pieceId);
  if (!pc) {
    if (__DEV__) console.warn(`getPieceCenter returned null for ${stp.pieceId} on pulse ${pulse}`);
    return;
  }
  const cachedBoardPos = ctx.cacheRef.current.board;
  const cachedTrailCells = ctx.cacheRef.current.trail;
  const nodeX = cachedBoardPos.x + pc.x;
  const nodeY = cachedBoardPos.y + pc.y;

  // Direct store access: needs current-frame data trail values that
  // cannot be pre-cached (trail mutates during engine execution).
  const trailCells = useGameStore.getState().machineState.dataTrail.cells;
  const trailValue = trailCells.length > 0 && pulse < trailCells.length
    ? trailCells[pulse]
    : null;
  const display = trailValue === null ? '?' : String(trailValue);

  setHighlight(ctx, `trail-${pulse}`, pass ? 'gate-pass' : 'gate-block');
  await wait(150 * speed);

  const trailCell = getTapeCellPosFromCache(cachedTrailCells, pulse);
  showBubbleAt(ctx, trailCell.x, trailCell.y, color, display);
  startBubbleTrail(ctx);
  await wait(100 * speed);

  await animateBubbleTo(ctx, trailCell.x, trailCell.y, nodeX, nodeY, color, display, 300 * speed);
  flashPiece(ctx, stp.pieceId, color);
  await wait((pass ? 350 : 450) * speed);

  hideBubble(ctx);
  clearAllHighlights(ctx);
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
  // Direct store access: needs current-frame output tape value (mutates
  // as the engine writes).
  const written = useGameStore.getState().machineState.outputTape?.[pulse] ?? 0;
  const display = String(written);

  flashPiece(ctx, stp.pieceId, color);
  showBubbleAt(ctx, transmitterX, transmitterY, color, display);

  const outputCell = getTapeCellPosFromCache(cachedOutputCells, pulse);
  await animateBubbleTo(
    ctx,
    transmitterX, transmitterY,
    outputCell.x, outputCell.y,
    color, display, 250 * speed,
  );
  ctx.setVisualOutputOverride(prev => {
    if (!prev) return prev;
    const next = [...prev];
    next[pulse] = written;
    return next;
  });

  await wait(150 * speed);
  hideBubble(ctx);
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
