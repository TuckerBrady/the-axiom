// Animated.Value reuse tests for charge + lock phases.
// Validates PERFORMANCE_CONTRACT.md clause 5.4.2:
//   "Animated.Value instances created for beam animations MUST be
//    reused across pulses within a run. New Animated.Value instances
//    MUST NOT be created per-pulse."
//
// Strategy: invoke runChargePhase / runLockPhase 8 times with the
// SAME Animated.Value on the context, and assert that the production
// code never replaces the value with a freshly allocated one. The
// AnimatedValue identity is checked across invocations, and the
// internal value must be reset (via setValue(0)) at the start of each
// run, not via a new allocation.

import { Animated } from 'react-native';

interface AnyCtx {
  getPieceCenter: () => { x: number; y: number };
  setChargeState: jest.Mock;
  setBeamState: jest.Mock;
  setPieceAnimState: jest.Mock;
  setLockRingCenter: jest.Mock;
  setVoidBurstCenter: jest.Mock;
  chargeProgressAnim: any;
  chargeAnim: unknown;
  lockRingProgressAnim: any;
  lockAnim: unknown;
  voidPulseRingProgressAnim: any;
  voidPulseAnim: unknown;
  loopingRef: { current: boolean };
  machineStatePieces: never[];
  wires: never[];
}

function buildCtx(): AnyCtx {
  return {
    getPieceCenter: () => ({ x: 100, y: 100 }),
    setChargeState: jest.fn(),
    setBeamState: jest.fn(),
    setPieceAnimState: jest.fn(),
    setLockRingCenter: jest.fn(),
    setVoidBurstCenter: jest.fn(),
    chargeProgressAnim: new Animated.Value(0),
    chargeAnim: null,
    lockRingProgressAnim: new Animated.Value(0),
    lockAnim: null,
    voidPulseRingProgressAnim: new Animated.Value(0),
    voidPulseAnim: null,
    loopingRef: { current: true },
    machineStatePieces: [],
    wires: [],
  };
}

describe('Prompt 99A — Animated.Value reuse across pulses (PERFORMANCE_CONTRACT 5.4.2)', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('runChargePhase reuses ctx.chargeProgressAnim across 8 pulses', async () => {
    const { runChargePhase } = require('../../../src/game/engagement/chargePhase');
    const ctx = buildCtx();
    const initialAnim = ctx.chargeProgressAnim;
    for (let pulse = 0; pulse < 8; pulse++) {
      await runChargePhase(ctx, 'src');
    }
    // Identity check: ctx still holds the SAME Animated.Value instance.
    // If runChargePhase replaced it (e.g., `ctx.chargeProgressAnim =
    // new Animated.Value(0)`), this assertion would fail.
    expect(ctx.chargeProgressAnim).toBe(initialAnim);
  });

  it('runLockPhase reuses ctx.lockRingProgressAnim across 8 pulses', async () => {
    const { runLockPhase } = require('../../../src/game/engagement/lockPhase');
    const ctx = buildCtx();
    const initialAnim = ctx.lockRingProgressAnim;
    for (let pulse = 0; pulse < 8; pulse++) {
      await runLockPhase(ctx, { x: 100, y: 100 });
    }
    expect(ctx.lockRingProgressAnim).toBe(initialAnim);
  });

  it('runWrongOutputRings reuses ctx.voidPulseRingProgressAnim across 8 invocations', async () => {
    const { runWrongOutputRings } = require('../../../src/game/engagement/lockPhase');
    const ctx = buildCtx();
    const initialAnim = ctx.voidPulseRingProgressAnim;
    for (let invocation = 0; invocation < 8; invocation++) {
      await runWrongOutputRings(ctx, { x: 100, y: 100 });
    }
    expect(ctx.voidPulseRingProgressAnim).toBe(initialAnim);
  });

  it('runChargePhase resets the Animated.Value to 0 at the start of each pulse', async () => {
    const { runChargePhase } = require('../../../src/game/engagement/chargePhase');
    const ctx = buildCtx();
    const setValueSpy = jest.spyOn(ctx.chargeProgressAnim, 'setValue');
    for (let pulse = 0; pulse < 3; pulse++) {
      await runChargePhase(ctx, 'src');
    }
    // setValue(0) is called once at the start of each pulse to reset
    // progress before the timing animation runs. (The mock's timing
    // implementation also calls setValue(toValue=1) when the
    // animation completes — so the spy sees both, alternating.)
    // We assert only on the production reset calls, by counting the
    // setValue(0) invocations.
    const resetCalls = setValueSpy.mock.calls.filter(call => call[0] === 0);
    expect(resetCalls.length).toBeGreaterThanOrEqual(3);
  });

  it('runLockPhase stops a previous in-flight animation before starting a new one', async () => {
    const { runLockPhase } = require('../../../src/game/engagement/lockPhase');
    const ctx = buildCtx();
    // Stub a fake "in-flight" animation handle that records when
    // .stop() is invoked. This mirrors the beamOpacityAnim
    // cancellation pattern from Prompt 94, Fix 3.
    const stopSpy = jest.fn();
    ctx.lockAnim = { stop: stopSpy } as unknown;
    await runLockPhase(ctx, { x: 100, y: 100 });
    expect(stopSpy).toHaveBeenCalled();
  });
});
