import {
  getCell,
  interpPath,
  computePhase,
  cumulativeDistances,
  posAlongChain,
  SIM_W,
  SIM_H,
} from '../../src/components/pieceSimulationMath';

describe('getCell', () => {
  it('returns positive coordinates within canvas bounds', () => {
    const c = getCell(2, 1, 5, 3);
    expect(c.x).toBeGreaterThan(0);
    expect(c.x).toBeLessThan(SIM_W);
    expect(c.y).toBeGreaterThan(0);
    expect(c.y).toBeLessThan(SIM_H);
    expect(c.r).toBeGreaterThan(0);
  });

  it('centers symmetric grids on the canvas', () => {
    // For a 3-wide grid, col=1 should sit on the horizontal centerline.
    const center = getCell(1, 1, 3, 3);
    expect(Math.abs(center.x - SIM_W / 2)).toBeLessThan(2);
  });

  it('assigns equal radii within the same grid', () => {
    const a = getCell(0, 0, 5, 3);
    const b = getCell(4, 2, 5, 3);
    expect(a.r).toBe(b.r);
  });

  it('chooses a smaller radius for taller/wider grids', () => {
    const dense = getCell(0, 0, 7, 4);
    const sparse = getCell(0, 0, 3, 2);
    expect(dense.r).toBeLessThan(sparse.r);
  });
});

describe('interpPath', () => {
  const waypoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('returns the start point at t=0', () => {
    expect(interpPath(waypoints, 0, 1)).toEqual({ x: 0, y: 0 });
  });

  it('returns the junction point at t=0.5 for a 3-waypoint path', () => {
    // Two equal segments, t=0.5 → end of first segment
    expect(interpPath(waypoints, 0.5, 1)).toEqual({ x: 100, y: 0 });
  });

  it('returns a midpoint of the second segment at t=0.75', () => {
    expect(interpPath(waypoints, 0.75, 1)).toEqual({ x: 100, y: 50 });
  });

  it('clamps tVal > tEnd to the endpoint', () => {
    expect(interpPath(waypoints, 2, 1)).toEqual({ x: 100, y: 100 });
  });
});

describe('computePhase', () => {
  it('returns charge near t=0', () => {
    const res = computePhase(0);
    expect(res.phase).toBe('charge');
    expect(res.progress).toBe(0);
  });

  it('returns beam mid-cycle', () => {
    const res = computePhase(0.3);
    expect(res.phase).toBe('beam');
    expect(res.progress).toBeGreaterThan(0);
    expect(res.progress).toBeLessThan(1);
  });

  it('returns lock in the lock window', () => {
    const res = computePhase(0.67);
    expect(res.phase).toBe('lock');
  });

  it('returns pause near t=1', () => {
    const res = computePhase(0.9);
    expect(res.phase).toBe('pause');
  });

  it('progress always falls within [0, 1]', () => {
    for (let i = 0; i < 100; i++) {
      const t = i / 100;
      const { progress } = computePhase(t);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});

describe('cumulativeDistances + posAlongChain', () => {
  const waypoints = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('cumulativeDistances accumulates Euclidean lengths', () => {
    expect(cumulativeDistances(waypoints)).toEqual([0, 100, 200]);
  });

  it('posAlongChain at progress=0 returns the start', () => {
    const pos = posAlongChain(waypoints, 0);
    expect(pos).toEqual({ x: 0, y: 0, reachedIndex: 0 });
  });

  it('posAlongChain at progress=0.5 returns the mid-junction', () => {
    const pos = posAlongChain(waypoints, 0.5);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(0);
  });

  it('posAlongChain at progress=0.75 returns mid of second segment', () => {
    const pos = posAlongChain(waypoints, 0.75);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(50);
  });

  it('posAlongChain clamps progress > 1 to the endpoint', () => {
    const pos = posAlongChain(waypoints, 2);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(100);
  });

  it('posAlongChain reports the index of the last reached waypoint', () => {
    // Midway through segment 0 → reachedIndex = 0
    expect(posAlongChain(waypoints, 0.25).reachedIndex).toBe(0);
    // Midway through segment 1 → reachedIndex = 1
    expect(posAlongChain(waypoints, 0.75).reachedIndex).toBe(1);
  });
});
