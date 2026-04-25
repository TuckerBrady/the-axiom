import type { View } from 'react-native';
import type { RefObject } from 'react';
import type { EngagementContext, ExecutionStep, MeasurementCache, TapeHighlight } from './types';
import { TAPE_BAR_INITIAL, GLOW_TRAVELER_INITIAL } from './types';
import type { TapeCellContainerMeasure } from '../bubbleMath';
import { runPulse } from './beamAnimation';
import { runReplayChargePhase } from './chargePhase';
import { runReplayLockPhase } from './lockPhase';
import { flashPiece } from './bubbleHelpers';
import { setSignalPhase } from './stateHelpers';

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

    // Reset beam / piece-anim state in single setState calls per
    // compound group, instead of one per field.
    ctx.setBeamState(prev => ({
      ...prev,
      heads: [],
      trails: [],
      branchTrails: [],
    }));
    ctx.setPieceAnimState(prev => ({
      ...prev,
      flashing: new Map(),
      animations: new Map(),
      gates: new Map(),
    }));
    ctx.setChargeState({ pos: null, progress: 0 });
    ctx.setLockRings([]);
    ctx.setTapeBarState(TAPE_BAR_INITIAL);
    ctx.setGlowTravelerState(GLOW_TRAVELER_INITIAL);
    ctx.gateOutcomes.current.clear();
    // Trail highlights wipe per-iteration so each cycle restarts the
    // in/trail/gate sequence. OUT write highlights are preserved below
    // so OUT red/green persists across replay cycles (Prompt 78).
    ctx.setTapeCellHighlights(prev => {
      const next = new Map<string, TapeHighlight>();
      for (const [k, v] of prev) {
        if (k.startsWith('out-')) next.set(k, v);
      }
      return next;
    });
    if (dataTrailCellsLength > 0) {
      ctx.setVisualTrailOverride(new Array(dataTrailCellsLength).fill(null));
    }
    // visualOutputOverride is intentionally NOT reset here — OUT cells
    // keep their last-written values across replay cycles so green/red
    // mismatch styling persists on the completion screen (Prompt 78).

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

    setSignalPhase(ctx.setBeamState, 'beam');
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
    // tapeCellHighlights intentionally NOT cleared here — highlights
    // from the final pulse loop persist into the post-run state so
    // the player sees which cells were touched during execution.
    // They reset at the top of the next loop iteration (line 59).

    if (terminalPieceId) {
      const opc = ctx.getPieceCenter(terminalPieceId);
      if (opc) {
        await runReplayLockPhase(ctx, opc);
      }
    }
  }
}
