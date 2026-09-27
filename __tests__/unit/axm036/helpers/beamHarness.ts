// AXM-036 shared test harness (P4b introduces it; P9 reuses it).
//
// Two independent clocks drive this codebase's beam animation: the main
// beam tick (beamAnimation.ts's runLinearPath) is driven by
// requestAnimationFrame + performance.now(), while tape-piece
// interactions (interactions.ts) are driven by `wait()` (setTimeout).
// A test that needs to prove an ordering guarantee ACROSS the two — e.g.
// "the Transmitter's interaction never starts before the beam head
// reaches it" (P4b-5) — needs both clocks advancing together on one
// controllable timeline. `installFakeClock` provides that: it fakes
// setTimeout (via Jest's fake timers) AND stubs a controllable
// requestAnimationFrame / performance.now pair, then `advance(ms)` steps
// both in lockstep, flushing microtasks between steps so promise chains
// (interactions.ts's async functions) progress correctly.
//
// `makeHarnessCtx` builds a minimal EngagementContext whose setters both
// apply the update (so callers can read the resulting state back) and
// record `{ key, value, t }` into a shared log, timestamped against the
// installed clock — the record a test needs to assert ordering and
// timing across multiple setters.

import type {
  EngagementContext,
  BeamState,
  PieceAnimState,
  ChargeState,
  TapeHighlight,
  TapeIndicatorBarState,
  OutputTapeValue,
  Pt,
} from '../../../../src/game/engagement/types';
import {
  BEAM_INITIAL,
  PIECE_ANIM_INITIAL,
  CHARGE_INITIAL,
  TAPE_BAR_INITIAL,
} from '../../../../src/game/engagement/types';

export interface HarnessLogEntry {
  key: string;
  value: unknown;
  t: number;
}

export interface FakeClock {
  now: () => number;
  // Steps the virtual clock forward by `ms`, in `stepMs`-sized
  // increments (default 16 — one frame). Each increment: fires any
  // requestAnimationFrame callbacks queued at or before the new virtual
  // time, advances Jest's fake timers by the same amount (so `wait()`'s
  // setTimeout resolves), then flushes microtasks so any promise chains
  // kicked off by either can progress before the next increment.
  advance: (ms: number, stepMs?: number) => Promise<void>;
  restore: () => void;
}

export function installFakeClock(): FakeClock {
  jest.useFakeTimers();

  let virtualNow = 0;
  let nextId = 0;
  let pending = new Map<number, FrameRequestCallback>();

  const g = globalThis as unknown as {
    requestAnimationFrame: (cb: FrameRequestCallback) => number;
    cancelAnimationFrame: (id: number) => void;
    performance: { now: () => number };
  };
  const originalRAF = g.requestAnimationFrame;
  const originalCAF = g.cancelAnimationFrame;
  const originalPerformance = g.performance;

  const now = (): number => virtualNow;

  g.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    nextId += 1;
    pending.set(nextId, cb);
    return nextId;
  };
  g.cancelAnimationFrame = (id: number): void => {
    pending.delete(id);
  };
  g.performance = { ...(originalPerformance ?? {}), now };

  async function advance(ms: number, stepMs = 16): Promise<void> {
    let remaining = ms;
    while (remaining > 0) {
      const step = Math.min(stepMs, remaining);
      remaining -= step;
      virtualNow += step;
      const due = Array.from(pending.values());
      pending = new Map();
      for (const cb of due) cb(virtualNow);
      await jest.advanceTimersByTimeAsync(step);
      // Let any microtasks queued by the RAF callbacks or the timers
      // just fired (interactions.ts's async chains) settle before the
      // next increment.
      await Promise.resolve();
      await Promise.resolve();
    }
  }

  function restore(): void {
    jest.useRealTimers();
    g.requestAnimationFrame = originalRAF;
    g.cancelAnimationFrame = originalCAF;
    g.performance = originalPerformance;
  }

  return { now, advance, restore };
}

export interface HarnessCtx {
  ctx: EngagementContext;
  log: HarnessLogEntry[];
  getBeamState: () => BeamState;
  getPieceAnimState: () => PieceAnimState;
  getTapeCellHighlights: () => Map<string, TapeHighlight>;
  getTapeBarState: () => TapeIndicatorBarState;
  getVisualTrailOverride: () => (number | null)[] | null;
  getVisualOutputOverride: () => OutputTapeValue[] | null;
}

export interface HarnessCacheMeasure {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MakeHarnessCtxOptions {
  clockNow: () => number;
  cellSize?: number;
  pieceCenters?: Record<string, Pt | null>;
  inputTape?: number[];
  board?: Pt;
  input?: HarnessCacheMeasure | null;
  trail?: HarnessCacheMeasure | null;
  output?: HarnessCacheMeasure | null;
  outputTapeValues?: OutputTapeValue[];
}

// Minimal EngagementContext whose setters record every call into `log`
// (with the harness clock's current time) AND apply the update so the
// state can be read back via the `get*` accessors. Fields a given
// package's tests don't exercise (charge/lock/void refs, wires, and so
// on) are stubbed to inert no-ops — they exist only so the object
// satisfies the EngagementContext shape.
export function makeHarnessCtx(options: MakeHarnessCtxOptions): HarnessCtx {
  const { clockNow } = options;
  const log: HarnessLogEntry[] = [];

  let beamState: BeamState = BEAM_INITIAL;
  let pieceAnimState: PieceAnimState = PIECE_ANIM_INITIAL;
  let chargeState: ChargeState = CHARGE_INITIAL;
  let tapeCellHighlights = new Map<string, TapeHighlight>();
  let tapeBarState: TapeIndicatorBarState = TAPE_BAR_INITIAL;
  let visualTrailOverride: (number | null)[] | null = null;
  let visualOutputOverride: OutputTapeValue[] | null =
    options.outputTapeValues ?? null;

  function record(key: string, value: unknown): void {
    log.push({ key, value, t: clockNow() });
  }

  function makeSetter<T>(
    key: string,
    get: () => T,
    set: (v: T) => void,
  ): (arg: T | ((prev: T) => T)) => void {
    return (arg: T | ((prev: T) => T)): void => {
      const next =
        typeof arg === 'function' ? (arg as (prev: T) => T)(get()) : arg;
      set(next);
      record(key, next);
    };
  }

  const inertAnimated = { setValue: () => undefined } as unknown;

  const ctx: EngagementContext = {
    CELL_SIZE: options.cellSize ?? 60,
    getPieceCenter: (pieceId: string) => options.pieceCenters?.[pieceId] ?? null,
    machineStatePieces: [],

    setBeamState: makeSetter('setBeamState', () => beamState, v => { beamState = v; }),
    setPieceAnimState: makeSetter('setPieceAnimState', () => pieceAnimState, v => { pieceAnimState = v; }),
    setChargeState: makeSetter('setChargeState', () => chargeState, v => { chargeState = v; }),

    setLockRingCenter: () => undefined,
    setVoidBurstCenter: () => undefined,
    setTapeCellHighlights: makeSetter(
      'setTapeCellHighlights',
      () => tapeCellHighlights,
      v => { tapeCellHighlights = v; },
    ),
    setTapeBarState: makeSetter('setTapeBarState', () => tapeBarState, v => { tapeBarState = v; }),
    setGlowTravelerState: () => undefined,
    valueTravelRefs: {
      x: inertAnimated,
      y: inertAnimated,
      scale: inertAnimated,
      opacity: inertAnimated,
    } as unknown as EngagementContext['valueTravelRefs'],
    gateOutcomes: { current: new Map() },
    setVisualTrailOverride: makeSetter(
      'setVisualTrailOverride',
      () => visualTrailOverride,
      v => { visualTrailOverride = v; },
    ),
    setVisualOutputOverride: makeSetter(
      'setVisualOutputOverride',
      () => visualOutputOverride,
      v => { visualOutputOverride = v; },
    ),
    setCurrentPulseIndex: () => undefined,
    currentPulseRef: { current: 0 },

    animFrameRef: { current: new Map() },
    flashTimersRef: { current: [] },
    safetyTimersRef: { current: [] },

    beamOpacity: inertAnimated as EngagementContext['beamOpacity'],
    chargeProgressAnim: inertAnimated as EngagementContext['chargeProgressAnim'],
    chargeAnim: null,
    lockRingProgressAnim: inertAnimated as EngagementContext['lockRingProgressAnim'],
    lockAnim: null,
    voidPulseRingProgressAnim: inertAnimated as EngagementContext['voidPulseRingProgressAnim'],
    voidPulseAnim: null,

    boardGridRef: { current: null },
    inputTapeCellsRef: { current: null },
    dataTrailCellsRef: { current: null },
    outputTapeCellsRef: { current: null },

    loopingRef: { current: false },
    wires: [],

    inputTape: options.inputTape,

    cacheRef: {
      current: {
        board: options.board ?? { x: 0, y: 0 },
        input: options.input ?? null,
        trail: options.trail ?? null,
        output: options.output ?? null,
      },
    },

    runId: 1,
    currentRunIdRef: { current: 1 },
    // AXM-036 P9-1 (F9): addition only, per the contract's authorized
    // edit for existing EngagementContext literals/factories.
    pendingResolversRef: { current: new Set() },
  };

  return {
    ctx,
    log,
    getBeamState: () => beamState,
    getPieceAnimState: () => pieceAnimState,
    getTapeCellHighlights: () => tapeCellHighlights,
    getTapeBarState: () => tapeBarState,
    getVisualTrailOverride: () => visualTrailOverride,
    getVisualOutputOverride: () => visualOutputOverride,
  };
}
