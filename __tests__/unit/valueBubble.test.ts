import {
  hexToRgba,
  getPulseSpeed,
  getTapeCellPosFromCache,
  computeWaypointDists,
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

describe('computeWaypointDists', () => {
  it('returns [0] for a single waypoint (no path)', () => {
    expect(computeWaypointDists([{ x: 10, y: 10 }])).toEqual([0]);
  });

  it('returns [0] for an empty list', () => {
    expect(computeWaypointDists([])).toEqual([0]);
  });

  it('accumulates distance along horizontal segments', () => {
    const wps = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(computeWaypointDists(wps)).toEqual([0, 40, 100]);
  });

  it('accumulates distance along vertical segments', () => {
    const wps = [
      { x: 50, y: 50 },
      { x: 50, y: 110 },
      { x: 50, y: 150 },
    ];
    expect(computeWaypointDists(wps)).toEqual([0, 60, 100]);
  });

  it('uses Euclidean distance for diagonal segments', () => {
    // 3-4-5 triangle → segment length 5
    const wps = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 10 }, // +6 vertical
    ];
    expect(computeWaypointDists(wps)).toEqual([0, 5, 11]);
  });

  it('produces dists whose last entry equals the signal path total length', () => {
    // Confirms the distance array endpoints align with buildSignalPath's
    // per-segment `e` field — the property runLinearPath relies on.
    const wps = [
      { x: 0, y: 0 },
      { x: 0, y: 80 },
      { x: 60, y: 80 },
      { x: 60, y: 140 },
    ];
    const dists = computeWaypointDists(wps);
    expect(dists.length).toBe(wps.length);
    expect(dists[0]).toBe(0);
    expect(dists[dists.length - 1]).toBe(80 + 60 + 60);
  });
});
