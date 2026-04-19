import type { View } from 'react-native';
import type { RefObject } from 'react';
import type { EngagementContext, ExecutionStep, MeasurementCache } from './types';
import type { TapeCellContainerMeasure } from '../bubbleMath';
import { runPulse } from './beamAnimation';
import { runReplayChargePhase, } from './chargePhase';
import { runReplayLockPhase } from './lockPhase';
import { flashPiece } from './bubbleHelpers';

type GetBoardScreenPos = () => Promise<{ x: number; y: number }>;
type MeasureTapeContainer = (
  ref: RefObject<View | null>,
) => Promise<TapeCellContainerMeasure | null>;

export interface ReplayLoopParams {
  ctx: EngagementContext;
  pulses: ExecutionStep[][];
  sourcePieceId: string | null;
  terminalPieceId: string | null;
  dataTrailCellsLength: number;
  inputTapeLength: number;
  getBoardScreenPos: GetBoardScreenPos;
  measureTapeContainer: MeasureTapeContainer;
}

export async function runReplayLoop(params: ReplayLoopParams): Promise<void> {
  const {
    ctx,
    pulses,
    sourcePieceId,
    terminalPieceId,
    dataTrailCellsLength,
    inputTapeLength,
    getBoardScreenPos,
    measureTapeContainer,
  } = params;

  while (ctx.loopingRef.current) {
    await new Promise(r => setTimeout(r, 800));
    if (!ctx.loopingRef.current) break;

    ctx.setBeamHeads([]);
    ctx.setTrailSegments([]);
    ctx.setBranchTrails([]);
    ctx.setFlashingPieces(new Map());
    ctx.setActiveAnimations(new Map());
    ctx.setGateResults(new Map());
    ctx.setChargePos(null);
    ctx.setChargeProgress(0);
    ctx.setLockRings([]);
    ctx.setTapeCellHighlights(new Map());
    if (dataTrailCellsLength > 0) {
      ctx.setVisualTrailOverride(new Array(dataTrailCellsLength).fill(null));
    }
    if (inputTapeLength > 0) {
      ctx.setVisualOutputOverride(new Array(inputTapeLength).fill(-1));
    }

    if (sourcePieceId) {
      await runReplayChargePhase(ctx, sourcePieceId);
    }
    if (!ctx.loopingRef.current) break;

    const board = await getBoardScreenPos();
    const [inputCells, trailCells, outputCells] = await Promise.all([
      measureTapeContainer(ctx.inputTapeCellsRef),
      measureTapeContainer(ctx.dataTrailCellsRef),
      measureTapeContainer(ctx.outputTapeCellsRef),
    ]);
    const freshCache: MeasurementCache = {
      board,
      input: inputCells,
      trail: trailCells,
      output: outputCells,
    };
    ctx.cacheRef.current = freshCache;

    ctx.setSignalPhase('beam');
    for (let lp = 0; lp < pulses.length; lp++) {
      if (!ctx.loopingRef.current) break;
      ctx.currentPulseRef.current = lp;
      ctx.setCurrentPulseIndex(lp);
      await runPulse(ctx, pulses[lp]);
      if (!ctx.loopingRef.current) break;
      if (lp < pulses.length - 1) {
        if (sourcePieceId) flashPiece(ctx, sourcePieceId, '#F0B429');
        await new Promise(r => setTimeout(r, 80));
      }
    }
    if (!ctx.loopingRef.current) break;

    ctx.setVisualTrailOverride(null);
    ctx.setVisualOutputOverride(null);
    ctx.setTapeCellHighlights(new Map());

    if (terminalPieceId) {
      const opc = ctx.getPieceCenter(terminalPieceId);
      if (opc) {
        await runReplayLockPhase(ctx, opc);
      }
    }
  }
}
