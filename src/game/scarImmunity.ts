import type { LevelDefinition, PlacedPiece, PortSide } from './types';
import { canSendTo } from './engine';

// ─── Scar immunity (AXM-026, SPEC_SOURCE_TERMINAL_PLACEMENT section 6) ───────
//
// A Source or Terminal sitting on a corner cell has only two neighbours, and a
// directional Terminal has exactly one entry cell. One blown cell there can
// softlock the board. Those cells are "scar immune": a failure blamed on a
// piece standing on one still removes the piece and still costs the life, but
// the cell is never added to the blown-cell set.

const SIDE_OFFSET: Record<PortSide, { dx: number; dy: number }> = {
  top: { dx: 0, dy: -1 },
  bottom: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const ALL_SIDES: PortSide[] = ['top', 'bottom', 'left', 'right'];

// SPEC_DIRECTIONAL_TERMINAL PR-1 adds `entrySide` to PlacedPiece. Read it
// structurally so this predicate already honours a directional Terminal the
// day that field lands, without this PR adding it.
type MaybeDirectional = PlacedPiece & { entrySide?: PortSide };

function inGrid(level: LevelDefinition, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < level.gridWidth && y < level.gridHeight;
}

function isCornerCell(level: LevelDefinition, x: number, y: number): boolean {
  return (x === 0 || x === level.gridWidth - 1) && (y === 0 || y === level.gridHeight - 1);
}

/**
 * Clause 1.6: an orthogonal neighbour is open when it is inside the grid, not a
 * damaged cell, not an obstacle, and holds no pre-placed piece unless that
 * piece can exchange signal with the fixture in the direction the fixture
 * needs (a Source sends out, a Terminal takes in).
 */
function isOpenNeighbour(
  level: LevelDefinition,
  fixture: PlacedPiece,
  x: number,
  y: number,
): boolean {
  if (!inGrid(level, x, y)) return false;
  if ((level.damagedCells ?? []).some(c => c.gridX === x && c.gridY === y)) return false;
  const occupant = level.prePlacedPieces.find(
    p => p.id !== fixture.id && p.gridX === x && p.gridY === y,
  );
  if (!occupant) return true;
  if (occupant.type === 'obstacle') return false;
  return fixture.type === 'source'
    ? canSendTo(fixture, occupant)
    : canSendTo(occupant, fixture);
}

/**
 * True for (6.2) each open neighbour of a Source or Terminal placed on a corner
 * cell, and (6.3) the entry cell of a directional Terminal. False for every
 * other cell (6.4). Pure: reads only the level definition.
 */
export function isScarImmune(level: LevelDefinition, x: number, y: number): boolean {
  for (const raw of level.prePlacedPieces) {
    const fixture = raw as MaybeDirectional;
    if (fixture.type !== 'source' && fixture.type !== 'terminal') continue;

    if (fixture.type === 'terminal' && fixture.entrySide) {
      const { dx, dy } = SIDE_OFFSET[fixture.entrySide];
      if (fixture.gridX + dx === x && fixture.gridY + dy === y && inGrid(level, x, y)) {
        return true;
      }
    }

    if (!isCornerCell(level, fixture.gridX, fixture.gridY)) continue;
    for (const side of ALL_SIDES) {
      const { dx, dy } = SIDE_OFFSET[side];
      const nx = fixture.gridX + dx;
      const ny = fixture.gridY + dy;
      if (nx === x && ny === y && isOpenNeighbour(level, fixture, nx, ny)) return true;
    }
  }
  return false;
}
