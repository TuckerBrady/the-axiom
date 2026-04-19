import { buildSignalPath, posAlongPath } from '../../../src/game/engagement/constants';

describe('buildSignalPath', () => {
  it('builds zero-length path from single point', () => {
    const path = buildSignalPath([{ x: 0, y: 0 }]);
    expect(path.segs).toEqual([]);
    expect(path.total).toBe(0);
  });

  it('builds one segment between two points', () => {
    const path = buildSignalPath([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ]);
    expect(path.segs).toHaveLength(1);
    expect(path.segs[0].s).toBe(0);
    expect(path.segs[0].e).toBe(5);
    expect(path.segs[0].l).toBe(5);
    expect(path.total).toBe(5);
  });

  it('accumulates segment start/end distances across three points', () => {
    const path = buildSignalPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(path.segs).toHaveLength(2);
    expect(path.segs[0].s).toBe(0);
    expect(path.segs[0].e).toBe(10);
    expect(path.segs[1].s).toBe(10);
    expect(path.segs[1].e).toBe(20);
    expect(path.total).toBe(20);
  });

  it('carries per-segment dx/dy/x0/y0 matching the source points', () => {
    const path = buildSignalPath([
      { x: 5, y: 7 },
      { x: 15, y: 7 },
    ]);
    expect(path.segs[0].x0).toBe(5);
    expect(path.segs[0].y0).toBe(7);
    expect(path.segs[0].dx).toBe(10);
    expect(path.segs[0].dy).toBe(0);
  });
});

describe('posAlongPath', () => {
  const path = buildSignalPath([
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ]);

  it('returns the start point at distance 0', () => {
    expect(posAlongPath(path, 0)).toEqual({ x: 0, y: 0 });
  });

  it('returns the midpoint of the first segment', () => {
    expect(posAlongPath(path, 5)).toEqual({ x: 5, y: 0 });
  });

  it('returns the junction point at the end of the first segment', () => {
    expect(posAlongPath(path, 10)).toEqual({ x: 10, y: 0 });
  });

  it('returns an intermediate point on the second segment', () => {
    expect(posAlongPath(path, 15)).toEqual({ x: 10, y: 5 });
  });

  it('clamps distance beyond total to the endpoint', () => {
    expect(posAlongPath(path, 100)).toEqual({ x: 10, y: 10 });
  });

  it('clamps negative distance to the start', () => {
    expect(posAlongPath(path, -5)).toEqual({ x: 0, y: 0 });
  });
});
