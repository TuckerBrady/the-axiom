// Drop-target resolution shared by the drag hover highlight and the actual
// drop handler in GameplayScreen, so the cell previewed during a drag is
// always the cell the piece lands in on release.

export interface DropCell {
  gridX: number;
  gridY: number;
  /** Within the board grid bounds. */
  inBounds: boolean;
  /** In bounds and the cell is free (not occupied, not blown). */
  valid: boolean;
}

export interface ResolveDropCellParams {
  /** Drag point in window coordinates. */
  x: number;
  y: number;
  /** Board grid top-left in window coordinates. */
  boardX: number;
  boardY: number;
  cellSize: number;
  numColumns: number;
  numRows: number;
  isOccupied: (gridX: number, gridY: number) => boolean;
  isBlown: (gridX: number, gridY: number) => boolean;
}

export function resolveDropCell({
  x,
  y,
  boardX,
  boardY,
  cellSize,
  numColumns,
  numRows,
  isOccupied,
  isBlown,
}: ResolveDropCellParams): DropCell {
  const gridX = Math.floor((x - boardX) / cellSize);
  const gridY = Math.floor((y - boardY) / cellSize);
  const inBounds =
    gridX >= 0 && gridX < numColumns && gridY >= 0 && gridY < numRows;
  const valid = inBounds && !isOccupied(gridX, gridY) && !isBlown(gridX, gridY);
  return { gridX, gridY, inBounds, valid };
}
