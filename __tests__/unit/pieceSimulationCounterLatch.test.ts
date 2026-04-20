import {
  computeCounterPhase,
  latchMode,
  CT_P1_CHARGE_END,
  CT_P1_BEAM_PRE_END,
  CT_P1_INTERACT_END,
  CT_P1_PAUSE_END,
  CT_P2_CHARGE_END,
  CT_P2_BEAM_PRE_END,
  CT_P2_INTERACT_END,
  CT_P2_BEAM_POST_END,
  CT_P2_LOCK_END,
} from '../../src/components/pieceSimulationMath';

describe('computeCounterPhase — pulse 1', () => {
  it('returns p1-charge at t=0', () => {
    expect(computeCounterPhase(0).phase).toBe('p1-charge');
  });

  it('returns p1-beam-pre at the start of its window', () => {
    expect(computeCounterPhase(CT_P1_CHARGE_END).phase).toBe('p1-beam-pre');
  });

  it('returns p1-interact at the start of its window', () => {
    expect(computeCounterPhase(CT_P1_BEAM_PRE_END).phase).toBe('p1-interact');
  });

  it('returns p1-pause at the start of its window', () => {
    expect(computeCounterPhase(CT_P1_INTERACT_END).phase).toBe('p1-pause');
  });

  it('progress is 0 at the start of each p1 phase', () => {
    expect(computeCounterPhase(0).progress).toBe(0);
    expect(computeCounterPhase(CT_P1_CHARGE_END).progress).toBe(0);
    expect(computeCounterPhase(CT_P1_BEAM_PRE_END).progress).toBe(0);
    expect(computeCounterPhase(CT_P1_INTERACT_END).progress).toBe(0);
  });
});

describe('computeCounterPhase — pulse 2', () => {
  it('returns p2-charge at the start of its window', () => {
    expect(computeCounterPhase(CT_P1_PAUSE_END).phase).toBe('p2-charge');
  });

  it('returns p2-beam-pre at the start of its window', () => {
    expect(computeCounterPhase(CT_P2_CHARGE_END).phase).toBe('p2-beam-pre');
  });

  it('returns p2-interact at the start of its window', () => {
    expect(computeCounterPhase(CT_P2_BEAM_PRE_END).phase).toBe('p2-interact');
  });

  it('returns p2-beam-post at the start of its window', () => {
    expect(computeCounterPhase(CT_P2_INTERACT_END).phase).toBe('p2-beam-post');
  });

  it('returns p2-lock at the start of its window', () => {
    expect(computeCounterPhase(CT_P2_BEAM_POST_END).phase).toBe('p2-lock');
  });

  it('returns p2-pause at the start of its window', () => {
    expect(computeCounterPhase(CT_P2_LOCK_END).phase).toBe('p2-pause');
  });

  it('phase boundaries are strictly increasing across the cycle', () => {
    const boundaries = [
      CT_P1_CHARGE_END,
      CT_P1_BEAM_PRE_END,
      CT_P1_INTERACT_END,
      CT_P1_PAUSE_END,
      CT_P2_CHARGE_END,
      CT_P2_BEAM_PRE_END,
      CT_P2_INTERACT_END,
      CT_P2_BEAM_POST_END,
      CT_P2_LOCK_END,
    ];
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1]);
    }
    expect(CT_P2_LOCK_END).toBeLessThan(1);
  });

  it('progress remains in [0, 1] across the full cycle', () => {
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      const { progress } = computeCounterPhase(t);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});

describe('latchMode', () => {
  it('returns write on even loops', () => {
    expect(latchMode(0)).toBe('write');
    expect(latchMode(2)).toBe('write');
    expect(latchMode(4)).toBe('write');
    expect(latchMode(100)).toBe('write');
  });

  it('returns read on odd loops', () => {
    expect(latchMode(1)).toBe('read');
    expect(latchMode(3)).toBe('read');
    expect(latchMode(99)).toBe('read');
  });

  it('alternates write/read across consecutive loops', () => {
    const sequence = [0, 1, 2, 3, 4].map(latchMode);
    expect(sequence).toEqual(['write', 'read', 'write', 'read', 'write']);
  });
});
