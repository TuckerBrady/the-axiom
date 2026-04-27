jest.mock('../../../src/game/engagement/beamAnimation', () => ({
  runPulse: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../src/game/engagement/chargePhase', () => ({
  runReplayChargePhase: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../src/game/engagement/lockPhase', () => ({
  runReplayLockPhase: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../src/game/engagement/bubbleHelpers', () => ({
  flashPiece: jest.fn(),
}));
jest.mock('../../../src/game/engagement/stateHelpers', () => ({
  setSignalPhase: jest.fn(),
}));

import { runReplayLoop } from '../../../src/game/engagement/replayLoop';
import type { ReplayLoopParams } from '../../../src/game/engagement/replayLoop';
import { runPulse } from '../../../src/game/engagement/beamAnimation';
import { runReplayChargePhase } from '../../../src/game/engagement/chargePhase';
import { runReplayLockPhase } from '../../../src/game/engagement/lockPhase';
import type { EngagementContext } from '../../../src/game/engagement/types';

jest.useFakeTimers();

// ─── Context factory ──────────────────────────────────────────────────────────

// State-invoking mock helper: calls the updater if given a function,
// stores direct value if given a value. This makes Istanbul see the
// updater lambdas as "called" so function coverage counts them.
function makeInvokingMock<T>(initial: T): jest.Mock {
  let state: T = initial;
  return jest.fn((arg: T | ((prev: T) => T)) => {
    if (typeof arg === 'function') {
      state = (arg as (prev: T) => T)(state);
    } else {
      state = arg;
    }
  });
}

function makeCtx(overrides: Partial<EngagementContext> = {}): EngagementContext {
  return {
    CELL_SIZE: 60,
    getPieceCenter: jest.fn().mockReturnValue(null),
    machineStatePieces: [],
    setBeamState: makeInvokingMock({
      heads: [], headColor: '#8B5CF6', trails: [], branchTrails: [],
      voidPulse: null, phase: 'idle' as const, litWires: new Set<string>(),
    }),
    setPieceAnimState: makeInvokingMock({
      flashing: new Map(), flashCounter: new Map(), animations: new Map(),
      gates: new Map(), failColors: new Map(), locked: new Set<string>(),
    }),
    setChargeState: jest.fn(),
    setLockRingCenter: jest.fn(),
    setVoidBurstCenter: jest.fn(),
    setTapeCellHighlights: makeInvokingMock(new Map() as Map<string, unknown>),
    setTapeBarState: jest.fn(),
    setGlowTravelerState: jest.fn(),
    valueTravelRefs: {} as EngagementContext['valueTravelRefs'],
    gateOutcomes: { current: { clear: jest.fn() } as unknown as EngagementContext['gateOutcomes']['current'] },
    setVisualTrailOverride: jest.fn(),
    setVisualOutputOverride: jest.fn(),
    setCurrentPulseIndex: jest.fn(),
    currentPulseRef: { current: 0 },
    animFrameRef: { current: new Map() },
    flashTimersRef: { current: [] },
    safetyTimersRef: { current: [] },
    beamOpacity: { setValue: jest.fn() } as unknown as EngagementContext['beamOpacity'],
    chargeProgressAnim: { setValue: jest.fn() } as unknown as EngagementContext['chargeProgressAnim'],
    chargeAnim: null,
    lockRingProgressAnim: { setValue: jest.fn() } as unknown as EngagementContext['lockRingProgressAnim'],
    lockAnim: null,
    voidPulseRingProgressAnim: { setValue: jest.fn() } as unknown as EngagementContext['voidPulseRingProgressAnim'],
    voidPulseAnim: null,
    boardGridRef: { current: null },
    inputTapeCellsRef: { current: null },
    dataTrailCellsRef: { current: null },
    outputTapeCellsRef: { current: null },
    loopingRef: { current: false },
    wires: [],
    cacheRef: { current: null as unknown as EngagementContext['cacheRef']['current'] },
    ...overrides,
  } as unknown as EngagementContext;
}

// ─── Params factory ───────────────────────────────────────────────────────────

function makeParams(
  ctx: EngagementContext,
  overrides: Partial<ReplayLoopParams> = {},
): ReplayLoopParams {
  return {
    ctx,
    pulses: [[]],
    sourcePieceId: 'source-1',
    terminalPieceId: 'terminal-1',
    dataTrailCellsLength: 0,
    inputTapeLength: 0,
    getBoardScreenPos: jest.fn().mockResolvedValue({ x: 0, y: 0 }),
    measureTapeContainer: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('runReplayLoop', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('resolves immediately when loopingRef.current is false from the start', async () => {
    const ctx = makeCtx({ loopingRef: { current: false } });
    const params = makeParams(ctx);
    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;
    expect(runPulse).not.toHaveBeenCalled();
    expect(runReplayChargePhase).not.toHaveBeenCalled();
  });

  it('runs one iteration when loopingRef is set to false after the initial 800ms wait', async () => {
    const loopingRef = { current: true };
    const ctx = makeCtx({ loopingRef });

    // After the 800ms timer fires, loopingRef is still true (loop body runs).
    // We set it to false before runReplayChargePhase resolves so the loop
    // exits after the charge phase attempt.
    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const params = makeParams(ctx, {
      sourcePieceId: 'source-1',
      terminalPieceId: 'terminal-1',
    });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(runReplayChargePhase).toHaveBeenCalledTimes(1);
    expect(runReplayChargePhase).toHaveBeenCalledWith(ctx, 'source-1');
  });

  it('does NOT call runReplayChargePhase when sourcePieceId is null', async () => {
    const loopingRef = { current: true };
    // Turn off looping after the 800ms to prevent infinite loop.
    const setBeamState = jest.fn().mockImplementation(() => {
      loopingRef.current = false;
    });
    const ctx = makeCtx({ loopingRef, setBeamState });
    const params = makeParams(ctx, { sourcePieceId: null });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(runReplayChargePhase).not.toHaveBeenCalled();
  });

  it('does NOT call runReplayLockPhase when terminalPieceId is null', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const ctx = makeCtx({ loopingRef });
    const params = makeParams(ctx, {
      terminalPieceId: null,
      sourcePieceId: 'source-1',
    });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(runReplayLockPhase).not.toHaveBeenCalled();
  });

  it('does NOT call runReplayLockPhase when getPieceCenter returns null for terminal', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const getPieceCenter = jest.fn().mockReturnValue(null);
    const ctx = makeCtx({ loopingRef, getPieceCenter });
    const params = makeParams(ctx, {
      terminalPieceId: 'terminal-1',
      sourcePieceId: 'source-1',
    });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(runReplayLockPhase).not.toHaveBeenCalled();
  });

  it('calls setBeamState at start of iteration to reset beam state', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const setBeamState = jest.fn();
    const ctx = makeCtx({ loopingRef, setBeamState });
    const params = makeParams(ctx);

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(setBeamState).toHaveBeenCalled();
    // First call should be the beam reset (with updater that clears heads/trails/branchTrails/litWires)
    const firstCallArg = (setBeamState as jest.Mock).mock.calls[0][0];
    const prevBeam = {
      heads: [{ x: 1, y: 1 }],
      trails: [{ points: [], color: '#abc' }],
      branchTrails: [[{ points: [], color: '#def' }]],
      litWires: new Set(['a']),
      headColor: '#FFFFFF',
      voidPulse: null,
      phase: 'beam' as const,
    };
    if (typeof firstCallArg === 'function') {
      const result = firstCallArg(prevBeam);
      expect(result.heads).toEqual([]);
      expect(result.trails).toEqual([]);
      expect(result.branchTrails).toEqual([]);
      expect(result.litWires.size).toBe(0);
    }
  });

  it('clears gateOutcomes at the start of each iteration', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const gateOutcomesClear = jest.fn();
    const ctx = makeCtx({
      loopingRef,
      gateOutcomes: { current: { clear: gateOutcomesClear } as unknown as EngagementContext['gateOutcomes']['current'] },
    });
    const params = makeParams(ctx);

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(gateOutcomesClear).toHaveBeenCalledTimes(1);
  });

  it('calls setVisualTrailOverride with null array when dataTrailCellsLength > 0', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const setVisualTrailOverride = jest.fn();
    const ctx = makeCtx({ loopingRef, setVisualTrailOverride });
    const params = makeParams(ctx, { dataTrailCellsLength: 3 });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(setVisualTrailOverride).toHaveBeenCalledWith([null, null, null]);
  });

  it('does NOT call setVisualTrailOverride with fill when dataTrailCellsLength is 0', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const setVisualTrailOverride = jest.fn();
    const ctx = makeCtx({ loopingRef, setVisualTrailOverride });
    const params = makeParams(ctx, { dataTrailCellsLength: 0 });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    // Called with the filled array only when length > 0
    const filledCall = (setVisualTrailOverride as jest.Mock).mock.calls.find(
      (c: [unknown]) => Array.isArray(c[0]),
    );
    expect(filledCall).toBeUndefined();
  });

  it('calls setTapeBarState and setGlowTravelerState to reset tape indicators', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const setTapeBarState = jest.fn();
    const setGlowTravelerState = jest.fn();
    const ctx = makeCtx({ loopingRef, setTapeBarState, setGlowTravelerState });
    const params = makeParams(ctx);

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(setTapeBarState).toHaveBeenCalledTimes(1);
    expect(setGlowTravelerState).toHaveBeenCalledTimes(1);
  });

  it('setTapeCellHighlights updater preserves out- prefixed keys', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    let capturedUpdater: ((prev: Map<string, unknown>) => Map<string, unknown>) | null = null;
    const setTapeCellHighlights = jest.fn((updater: unknown) => {
      if (typeof updater === 'function') capturedUpdater = updater as (prev: Map<string, unknown>) => Map<string, unknown>;
    });

    const ctx = makeCtx({ loopingRef, setTapeCellHighlights });
    const params = makeParams(ctx);

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(capturedUpdater).not.toBeNull();

    const prev = new Map<string, unknown>([
      ['out-0', 'write'],
      ['trail-1', 'read'],
      ['in-2', 'departing'],
      ['out-1', 'gate-pass'],
    ]);
    const result = capturedUpdater!(prev);
    expect(result.has('out-0')).toBe(true);
    expect(result.has('out-1')).toBe(true);
    expect(result.has('trail-1')).toBe(false);
    expect(result.has('in-2')).toBe(false);
  });

  it('full iteration: runPulse called and lock phase runs when looping stays true through charge phase', async () => {
    // loopingRef stays true for the entire first iteration.
    // The lock phase mock turns it off so the while loop exits cleanly
    // at the next 800ms wait check.
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockResolvedValue(undefined);
    (runPulse as jest.Mock).mockResolvedValue(undefined);
    (runReplayLockPhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const getPieceCenter = jest.fn().mockReturnValue({ x: 100, y: 200 });
    const ctx = makeCtx({ loopingRef, getPieceCenter });
    const params = makeParams(ctx, {
      sourcePieceId: 'source-1',
      terminalPieceId: 'terminal-1',
      pulses: [[]],
    });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(runPulse).toHaveBeenCalled();
    expect(runReplayLockPhase).toHaveBeenCalled();
  });

  it('full iteration: getBoardScreenPos called and cacheRef populated', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockResolvedValue(undefined);
    (runPulse as jest.Mock).mockResolvedValue(undefined);
    (runReplayLockPhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const getBoardScreenPos = jest.fn().mockResolvedValue({ x: 10, y: 20 });
    const measureTapeContainer = jest.fn().mockResolvedValue(null);
    const getPieceCenter = jest.fn().mockReturnValue({ x: 0, y: 0 });
    const ctx = makeCtx({ loopingRef, getPieceCenter });
    const params = makeParams(ctx, {
      getBoardScreenPos,
      measureTapeContainer,
      pulses: [[]],
    });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(getBoardScreenPos).toHaveBeenCalledTimes(1);
    expect(measureTapeContainer).toHaveBeenCalledTimes(3);
  });

  it('full iteration: setCurrentPulseIndex called with pulse index', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockResolvedValue(undefined);
    (runPulse as jest.Mock).mockResolvedValue(undefined);
    (runReplayLockPhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const setCurrentPulseIndex = jest.fn();
    const getPieceCenter = jest.fn().mockReturnValue({ x: 0, y: 0 });
    const ctx = makeCtx({ loopingRef, setCurrentPulseIndex, getPieceCenter });
    const params = makeParams(ctx, { pulses: [[]] });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(setCurrentPulseIndex).toHaveBeenCalledWith(0);
  });

  it('full iteration: setVisualTrailOverride(null) and setVisualOutputOverride(null) called after pulse loop', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockResolvedValue(undefined);
    (runPulse as jest.Mock).mockResolvedValue(undefined);
    (runReplayLockPhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const setVisualTrailOverride = jest.fn();
    const setVisualOutputOverride = jest.fn();
    const getPieceCenter = jest.fn().mockReturnValue({ x: 0, y: 0 });
    const ctx = makeCtx({ loopingRef, setVisualTrailOverride, setVisualOutputOverride, getPieceCenter });
    const params = makeParams(ctx, { pulses: [[]] });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    expect(setVisualTrailOverride).toHaveBeenCalledWith(null);
    expect(setVisualOutputOverride).toHaveBeenCalledWith(null);
  });

  it('multi-pulse: flashPiece called between pulses (inter-pulse flash path)', async () => {
    const loopingRef = { current: true };
    const { flashPiece: flashPieceMock } = jest.requireMock('../../../src/game/engagement/bubbleHelpers') as { flashPiece: jest.Mock };
    flashPieceMock.mockClear();

    (runReplayChargePhase as jest.Mock).mockResolvedValue(undefined);
    (runPulse as jest.Mock).mockResolvedValue(undefined);
    (runReplayLockPhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const getPieceCenter = jest.fn().mockReturnValue({ x: 0, y: 0 });
    const ctx = makeCtx({ loopingRef, getPieceCenter });
    // Two pulses so lp=0 triggers the inter-pulse flash (lp < pulses.length-1)
    const params = makeParams(ctx, {
      sourcePieceId: 'src-1',
      pulses: [[], []],
    });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    // flashPiece is called between pulse 0 and pulse 1
    expect(flashPieceMock).toHaveBeenCalledWith(ctx, 'src-1', '#F0B429');
  });

  it('loopingRef turns false mid-pulse-loop (at line 111 break): exits pulse loop early', async () => {
    const loopingRef = { current: true };

    (runReplayChargePhase as jest.Mock).mockResolvedValue(undefined);
    // First pulse: turn looping off so line 111 break fires
    (runPulse as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const setVisualTrailOverride = jest.fn();
    const ctx = makeCtx({ loopingRef, setVisualTrailOverride });
    const params = makeParams(ctx, { pulses: [[], []] });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    // After loopingRef goes false at line 111, the outer while break fires.
    // setVisualTrailOverride(null) at line 119 is NOT reached.
    expect(setVisualTrailOverride).not.toHaveBeenCalledWith(null);
  });

  it('loopingRef turns false at start of inner pulse loop (line 105 break): exits before runPulse', async () => {
    const loopingRef = { current: true };

    // Charge phase completes normally; turn looping off before runPulse
    (runReplayChargePhase as jest.Mock).mockImplementationOnce(() => {
      loopingRef.current = false;
      return Promise.resolve();
    });

    const ctx = makeCtx({ loopingRef });
    const params = makeParams(ctx, { pulses: [[], []] });

    const promise = runReplayLoop(params);
    await jest.runAllTimersAsync();
    await promise;

    // loopingRef is false by the time the inner loop check at line 87/105 fires
    expect(runPulse).not.toHaveBeenCalled();
  });
});
