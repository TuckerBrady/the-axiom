import {
  hexToRgba,
  getPulseSpeed,
  getTapeCellPosFromCache,
} from '../../src/game/bubbleMath';

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

describe('getTapeCellPosFromCache', () => {
  // Layout constants (24px cell, 3px gap) are baked into the helper.
  const container = { x: 100, y: 50, w: 200, h: 40 };

  it('returns (0, 0) when the cached measurement is null', () => {
    expect(getTapeCellPosFromCache(null, 0)).toEqual({ x: 0, y: 0 });
    expect(getTapeCellPosFromCache(null, 5)).toEqual({ x: 0, y: 0 });
  });

  it('centers the first cell at container x + 12 and vertical midpoint', () => {
    // x = 100 + 0 * (24 + 3) + 24/2 = 112
    // y = 50 + 40/2 = 70
    expect(getTapeCellPosFromCache(container, 0)).toEqual({ x: 112, y: 70 });
  });

  it('advances each subsequent cell by 27px (cell + gap)', () => {
    expect(getTapeCellPosFromCache(container, 1)).toEqual({ x: 139, y: 70 });
    expect(getTapeCellPosFromCache(container, 2)).toEqual({ x: 166, y: 70 });
    expect(getTapeCellPosFromCache(container, 4)).toEqual({ x: 220, y: 70 });
  });

  it('uses the container height for the vertical center regardless of cell index', () => {
    const tall = { x: 0, y: 0, w: 100, h: 80 };
    expect(getTapeCellPosFromCache(tall, 0).y).toBe(40);
    expect(getTapeCellPosFromCache(tall, 3).y).toBe(40);
  });
});
