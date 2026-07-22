import { resolveDropCell } from '../../../src/utils/dropTarget';

const base = {
  boardX: 100,
  boardY: 200,
  cellSize: 50,
  numColumns: 8,
  numRows: 7,
  isOccupied: () => false,
  isBlown: () => false,
};

describe('resolveDropCell', () => {
  it('maps a window point to the correct grid cell relative to the board', () => {
    // 25px into the second column, 75px into the second row.
    const cell = resolveDropCell({ ...base, x: 100 + 75, y: 200 + 75 });
    expect(cell.gridX).toBe(1);
    expect(cell.gridY).toBe(1);
    expect(cell.inBounds).toBe(true);
    expect(cell.valid).toBe(true);
  });

  it('snaps the board top-left corner to cell (0,0)', () => {
    const cell = resolveDropCell({ ...base, x: 100, y: 200 });
    expect(cell.gridX).toBe(0);
    expect(cell.gridY).toBe(0);
    expect(cell.valid).toBe(true);
  });

  it('marks points left/above the board as out of bounds', () => {
    const cell = resolveDropCell({ ...base, x: 90, y: 190 });
    expect(cell.inBounds).toBe(false);
    expect(cell.valid).toBe(false);
  });

  it('marks points past the last column/row as out of bounds', () => {
    // Column index 8 is out of an 8-wide grid (valid indices 0..7).
    const cell = resolveDropCell({ ...base, x: 100 + 8 * 50, y: 200 });
    expect(cell.gridX).toBe(8);
    expect(cell.inBounds).toBe(false);
    expect(cell.valid).toBe(false);
  });

  it('is in bounds but invalid when the cell is occupied', () => {
    const cell = resolveDropCell({
      ...base,
      x: 100 + 75,
      y: 200 + 75,
      isOccupied: (gx, gy) => gx === 1 && gy === 1,
    });
    expect(cell.inBounds).toBe(true);
    expect(cell.valid).toBe(false);
  });

  it('is in bounds but invalid when the cell is blown', () => {
    const cell = resolveDropCell({
      ...base,
      x: 100 + 75,
      y: 200 + 75,
      isBlown: (gx, gy) => gx === 1 && gy === 1,
    });
    expect(cell.inBounds).toBe(true);
    expect(cell.valid).toBe(false);
  });
});
