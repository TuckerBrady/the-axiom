import { computeWaypointDists } from '../../../src/game/bubbleMath';

describe('computeWaypointDists', () => {
  it('sets the first waypoint distance to 0', () => {
    const dists = computeWaypointDists([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(dists[0]).toBe(0);
  });

  it('matches segment endpoint for two points', () => {
    const dists = computeWaypointDists([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]);
    expect(dists).toEqual([0, 10]);
  });

  it('accumulates distances for three points on a right angle', () => {
    const dists = computeWaypointDists([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(dists).toEqual([0, 10, 20]);
  });

  it('uses Euclidean distance for diagonal segments', () => {
    const dists = computeWaypointDists([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 9 },
    ]);
    expect(dists).toEqual([0, 5, 10]);
  });

  it('returns single-element array for a single waypoint', () => {
    const dists = computeWaypointDists([{ x: 5, y: 5 }]);
    expect(dists).toEqual([0]);
  });
});
