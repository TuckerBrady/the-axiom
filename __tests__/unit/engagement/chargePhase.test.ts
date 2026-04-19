import { runChargePhase } from '../../../src/game/engagement/chargePhase';
import type {
  EngagementContext,
  Pt,
  ChargeState,
  BeamState,
} from '../../../src/game/engagement/types';
import { CHARGE_INITIAL, BEAM_INITIAL } from '../../../src/game/engagement/types';

function buildCtx(center: Pt | null): {
  ctx: EngagementContext;
  chargeRef: { value: ChargeState };
  beamRef: { value: BeamState };
  animFrameRef: { current: number | null };
} {
  const chargeRef = { value: { ...CHARGE_INITIAL } };
  const beamRef = { value: { ...BEAM_INITIAL, litWires: new Set<string>() } };
  const animFrameRef: { current: number | null } = { current: null };

  const setChargeState = jest.fn(arg => {
    if (typeof arg === 'function') chargeRef.value = arg(chargeRef.value);
    else chargeRef.value = arg;
  });
  const setBeamState = jest.fn(arg => {
    if (typeof arg === 'function') beamRef.value = arg(beamRef.value);
    else beamRef.value = arg;
  });

  const ctx = {
    getPieceCenter: jest.fn(() => center),
    setChargeState,
    setBeamState,
    animFrameRef,
  } as unknown as EngagementContext;

  return { ctx, chargeRef, beamRef, animFrameRef };
}

describe('runChargePhase', () => {
  let rafHandles: number;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nowValue: number;

  beforeEach(() => {
    rafHandles = 0;
    rafCallbacks = new Map();
    nowValue = 0;

    global.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
      rafHandles += 1;
      rafCallbacks.set(rafHandles, cb);
      return rafHandles;
    }) as typeof requestAnimationFrame;

    global.cancelAnimationFrame = ((handle: number): void => {
      rafCallbacks.delete(handle);
    }) as typeof cancelAnimationFrame;

    jest.spyOn(performance, 'now').mockImplementation(() => nowValue);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const runAllFrames = (timeStep: number, maxFrames = 50): void => {
    for (let i = 0; i < maxFrames; i++) {
      if (rafCallbacks.size === 0) break;
      nowValue += timeStep;
      const next = rafCallbacks.entries().next();
      if (next.done) break;
      const [id, cb] = next.value;
      rafCallbacks.delete(id);
      cb(nowValue);
    }
  };

  it('returns immediately when the source has no center', async () => {
    const { ctx, chargeRef } = buildCtx(null);
    await runChargePhase(ctx, 'missing');
    expect(chargeRef.value.pos).toBeNull();
  });

  it('sets chargePos and signalPhase when the source has a center', async () => {
    const { ctx, chargeRef, beamRef } = buildCtx({ x: 10, y: 20 });
    const done = runChargePhase(ctx, 'source-1');
    // First frame captures the initial pos before RAF resolves completion.
    runAllFrames(50);
    await done;
    // After completion the pos is cleared; but phase was set to 'charge'.
    expect(beamRef.value.phase).toBe('charge');
  });

  it('progresses from 0 to 1 over ~280ms', async () => {
    const { ctx, chargeRef } = buildCtx({ x: 0, y: 0 });
    const done = runChargePhase(ctx, 'source-1');
    runAllFrames(30);
    await done;
    expect(chargeRef.value.progress).toBe(1);
  });

  it('clears chargePos on completion', async () => {
    const { ctx, chargeRef } = buildCtx({ x: 10, y: 20 });
    const done = runChargePhase(ctx, 'source-1');
    runAllFrames(50);
    await done;
    expect(chargeRef.value.pos).toBeNull();
  });
});
