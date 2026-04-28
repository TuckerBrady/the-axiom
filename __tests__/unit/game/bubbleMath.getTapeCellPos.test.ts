import {
  getTapeCellPosFromCache,
} from '../../../src/game/bubbleMath';

describe('getTapeCellPosFromCache — null-safe behavior', () => {
  const TAPE_CELL_GAP = 3;
  const firstCell = { x: 100, y: 50, w: 24, h: 24 };

  it('returns null when cached measurement is null', () => {
    expect(getTapeCellPosFromCache(null, 0)).toBeNull();
    expect(getTapeCellPosFromCache(null, 3)).toBeNull();
    expect(getTapeCellPosFromCache(null, 7)).toBeNull();
  });

  it('returns correct center position for cell index 0', () => {
    // x = 100 + 0 * (24 + 3) + 24/2 = 112
    // y = 50 + 24/2 = 62
    expect(getTapeCellPosFromCache(firstCell, 0)).toEqual({ x: 112, y: 62 });
  });

  it('returns correct center position for cell index N', () => {
    // x at i=1: 100 + 1 * 27 + 12 = 139
    // x at i=4: 100 + 4 * 27 + 12 = 220
    expect(getTapeCellPosFromCache(firstCell, 1)).toEqual({ x: 139, y: 62 });
    expect(getTapeCellPosFromCache(firstCell, 4)).toEqual({ x: 220, y: 62 });
  });

  it('accounts for TAPE_CELL_GAP in position calculation', () => {
    const cell = { x: 0, y: 0, w: 20, h: 20 };
    // x at i=1: 0 + 1 * (20 + TAPE_CELL_GAP) + 10 = 33
    const result = getTapeCellPosFromCache(cell, 1);
    expect(result).not.toBeNull();
    expect(result!.x).toBe(20 + TAPE_CELL_GAP + 10);
  });

  it('y position is always cell center regardless of index', () => {
    const cell = { x: 0, y: 40, w: 30, h: 30 };
    const expected_y = 40 + 15;
    expect(getTapeCellPosFromCache(cell, 0)!.y).toBe(expected_y);
    expect(getTapeCellPosFromCache(cell, 5)!.y).toBe(expected_y);
    expect(getTapeCellPosFromCache(cell, 10)!.y).toBe(expected_y);
  });
});
