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
  // `cached` is the first cell's own measurement — a 24x24 tape cell
  // with 3px gap between cells.
  const firstCell = { x: 100, y: 50, w: 24, h: 24 };

  it('returns (0, 0) when the cached measurement is null', () => {
    expect(getTapeCellPosFromCache(null, 0)).toEqual({ x: 0, y: 0 });
    expect(getTapeCellPosFromCache(null, 5)).toEqual({ x: 0, y: 0 });
  });

  it('centers the first cell at cell x + w/2, y + h/2', () => {
    // x = 100 + 0 * (24 + 3) + 24/2 = 112
    // y = 50 + 24/2 = 62
    expect(getTapeCellPosFromCache(firstCell, 0)).toEqual({ x: 112, y: 62 });
  });

  it('advances each subsequent cell by w + gap (27px for a 24px cell)', () => {
    expect(getTapeCellPosFromCache(firstCell, 1)).toEqual({ x: 139, y: 62 });
    expect(getTapeCellPosFromCache(firstCell, 2)).toEqual({ x: 166, y: 62 });
    expect(getTapeCellPosFromCache(firstCell, 4)).toEqual({ x: 220, y: 62 });
  });

  it('scales with cached cell width — advances by cached.w + gap', () => {
    const bigCell = { x: 0, y: 0, w: 40, h: 30 };
    // x at i=1: 0 + 1 * (40 + 3) + 40/2 = 63
    expect(getTapeCellPosFromCache(bigCell, 1).x).toBe(63);
    // y = 0 + 30/2 = 15 for any index
    expect(getTapeCellPosFromCache(bigCell, 0).y).toBe(15);
    expect(getTapeCellPosFromCache(bigCell, 5).y).toBe(15);
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
