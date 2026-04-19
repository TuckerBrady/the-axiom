import { hexToRgba, getPulseSpeed } from '../../src/game/bubbleMath';

describe('hexToRgba', () => {
  it('converts neon cyan with quarter alpha', () => {
    expect(hexToRgba('#00E5FF', 0.25)).toBe('rgba(0,229,255,0.25)');
  });

  it('converts pure white to full-alpha rgba', () => {
    expect(hexToRgba('#FFFFFF', 1)).toBe('rgba(255,255,255,1)');
  });

  it('converts pure black to zero-alpha rgba', () => {
    expect(hexToRgba('#000000', 0)).toBe('rgba(0,0,0,0)');
  });

  it('converts the protocol-pass green at 0.18 alpha', () => {
    expect(hexToRgba('#00FF87', 0.18)).toBe('rgba(0,255,135,0.18)');
  });
});

describe('getPulseSpeed', () => {
  it('returns 2.0 for the first pulse (slow-mo tutorial)', () => {
    expect(getPulseSpeed(0)).toBe(2.0);
  });

  it('returns 1.0 for the second pulse onwards', () => {
    expect(getPulseSpeed(1)).toBe(1.0);
    expect(getPulseSpeed(2)).toBe(1.0);
    expect(getPulseSpeed(5)).toBe(1.0);
  });
});
