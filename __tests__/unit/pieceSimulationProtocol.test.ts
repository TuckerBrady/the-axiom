import {
  computeProtocolPhase,
  configNodeMode,
  P_CHARGE_END,
  P_BEAM_PRE_END,
  P_INTERACT_END,
  P_BEAM_POST_END,
  P_LOCK_END,
} from '../../src/components/pieceSimulationMath';

describe('computeProtocolPhase', () => {
  it('returns charge at t=0 with progress 0', () => {
    const r = computeProtocolPhase(0);
    expect(r.phase).toBe('charge');
    expect(r.progress).toBe(0);
  });

  it('returns beam-pre at start of the beam-pre window', () => {
    const r = computeProtocolPhase(P_CHARGE_END);
    expect(r.phase).toBe('beam-pre');
    expect(r.progress).toBe(0);
  });

  it('returns interact at start of the interact window', () => {
    const r = computeProtocolPhase(P_BEAM_PRE_END);
    expect(r.phase).toBe('interact');
    expect(r.progress).toBe(0);
  });

  it('returns beam-post at start of the beam-post window', () => {
    const r = computeProtocolPhase(P_INTERACT_END);
    expect(r.phase).toBe('beam-post');
    expect(r.progress).toBe(0);
  });

  it('returns lock at start of the lock window', () => {
    const r = computeProtocolPhase(P_BEAM_POST_END);
    expect(r.phase).toBe('lock');
    expect(r.progress).toBe(0);
  });

  it('returns pause at start of the pause window', () => {
    const r = computeProtocolPhase(P_LOCK_END);
    expect(r.phase).toBe('pause');
    expect(r.progress).toBe(0);
  });

  it('progress always lands in [0, 1] across the cycle', () => {
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const { progress } = computeProtocolPhase(t);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  it('progresses monotonically within a phase', () => {
    // Mid-beam-pre and later in beam-pre: progress should increase.
    const mid = computeProtocolPhase((P_CHARGE_END + P_BEAM_PRE_END) / 2);
    const late = computeProtocolPhase(P_BEAM_PRE_END - 0.001);
    expect(mid.phase).toBe('beam-pre');
    expect(late.phase).toBe('beam-pre');
    expect(late.progress).toBeGreaterThan(mid.progress);
  });

  it('phase boundaries line up with the declared constants', () => {
    // All boundaries should be strictly increasing.
    expect(P_CHARGE_END).toBeGreaterThan(0);
    expect(P_BEAM_PRE_END).toBeGreaterThan(P_CHARGE_END);
    expect(P_INTERACT_END).toBeGreaterThan(P_BEAM_PRE_END);
    expect(P_BEAM_POST_END).toBeGreaterThan(P_INTERACT_END);
    expect(P_LOCK_END).toBeGreaterThan(P_BEAM_POST_END);
    expect(P_LOCK_END).toBeLessThan(1);
  });
});

describe('configNodeMode', () => {
  it('returns pass on even loop counts', () => {
    expect(configNodeMode(0)).toBe('pass');
    expect(configNodeMode(2)).toBe('pass');
    expect(configNodeMode(4)).toBe('pass');
    expect(configNodeMode(100)).toBe('pass');
  });

  it('returns block on odd loop counts', () => {
    expect(configNodeMode(1)).toBe('block');
    expect(configNodeMode(3)).toBe('block');
    expect(configNodeMode(5)).toBe('block');
    expect(configNodeMode(99)).toBe('block');
  });

  it('alternates pass/block across consecutive loops', () => {
    const sequence = [0, 1, 2, 3, 4].map(configNodeMode);
    expect(sequence).toEqual(['pass', 'block', 'pass', 'block', 'pass']);
  });
});
