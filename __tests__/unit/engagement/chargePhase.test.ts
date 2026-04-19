import { runChargePhase } from '../../../src/game/engagement/chargePhase';
import type { EngagementContext, Pt } from '../../../src/game/engagement/types';

function buildCtx(center: Pt | null): {
  ctx: EngagementContext;
  chargePosHistory: (Pt | null)[];
  chargeProgressHistory: number[];
  signalPhaseHistory: string[];
  animFrameRef: { current: number | null };
} {
  const chargePosHistory: (Pt | null)[] = [];
  const chargeProgressHistory: number[] = [];
  const signalPhaseHistory: string[] = [];
  const animFrameRef: { current: number | null } = { current: null };

  const ctx = {
    getPieceCenter: jest.fn(() => center),
    setChargePos: jest.fn((p: Pt | null) => chargePosHistory.push(p)),
    setChargeProgress: jest.fn((n: number) => chargeProgressHistory.push(n)),
    setSignalPhase: jest.fn((p: string) => signalPhaseHistory.push(p)),
    animFrameRef,
  } as unknown as EngagementContext;

  return { ctx, chargePosHistory, chargeProgressHistory, signalPhaseHistory, animFrameRef };
}

describe('runChargePhase', () => {
  let rafHandles: number;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nowValue: number;

  beforeEach(() => {
    rafHandles = 0;
    rafCallbacks = new Map();
    nowValue = 0;

    // Drive requestAnimationFrame deterministically.
    global.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
      rafHandles += 1;
      rafCallbacks.set(rafHandles, cb);
      return rafHandles;
    }) as typeof requestAnimationFrame;

    global.cancelAnimationFrame = ((handle: number): void => {
      rafCallbacks.delete(handle);
    }) as typeof cancelAnimationFrame;

    // Deterministic clock.
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
    const { ctx, chargePosHistory } = buildCtx(null);
    await runChargePhase(ctx, 'missing');
    expect(chargePosHistory).toHaveLength(0);
  });

  it('sets chargePos and signalPhase when the source has a center', async () => {
    const { ctx, chargePosHistory, signalPhaseHistory } = buildCtx({ x: 10, y: 20 });
    const done = runChargePhase(ctx, 'source-1');
    runAllFrames(50);
    await done;
    expect(chargePosHistory[0]).toEqual({ x: 10, y: 20 });
    expect(signalPhaseHistory).toContain('charge');
  });

  it('progresses from 0 to 1 over ~280ms', async () => {
    const { ctx, chargeProgressHistory } = buildCtx({ x: 0, y: 0 });
    const done = runChargePhase(ctx, 'source-1');
    runAllFrames(30);
    await done;
    expect(chargeProgressHistory[0]).toBeGreaterThanOrEqual(0);
    expect(chargeProgressHistory[chargeProgressHistory.length - 1]).toBe(1);
  });

  it('clears chargePos on completion', async () => {
    const { ctx, chargePosHistory } = buildCtx({ x: 10, y: 20 });
    const done = runChargePhase(ctx, 'source-1');
    runAllFrames(50);
    await done;
    expect(chargePosHistory[chargePosHistory.length - 1]).toBeNull();
  });
});
