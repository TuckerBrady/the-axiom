// Pure helpers shared by the value-bubble interaction layer.
// Kept in a separate module so unit tests can import them without the
// React Native / Reanimated transform chain.

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Slow-motion on pulse 0 so new players see each protocol read/write;
// subsequent pulses run at full speed.
export const getPulseSpeed = (pulseIndex: number): number =>
  pulseIndex === 0 ? 2.0 : 1.0;

// Screen-space bounds of a tape cell container captured via
// measureInWindow. Cached once per execution so re-renders during the
// pulse loop cannot return stale (0, 0) measurements mid-animation.
export type TapeCellContainerMeasure = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// Resolve the screen-space center of a single tape cell from a cached
// container measurement and the cell's index within the container.
// Cell layout is fixed: 24px square with a 3px gap between cells.
// The container also encloses a 4px tape-head indicator + 2px spacer
// above each cell — we target the cell itself, not the container's
// geometric center, so the bubble lands on the value's midpoint
// instead of drifting upward into the head row.
const TAPE_CELL_SIZE = 24;
const TAPE_CELL_GAP = 3;

export const getTapeCellPosFromCache = (
  cached: TapeCellContainerMeasure | null,
  cellIndex: number,
): { x: number; y: number } => {
  if (!cached) return { x: 0, y: 0 };
  const cellCenterX =
    cached.x + cellIndex * (TAPE_CELL_SIZE + TAPE_CELL_GAP) + TAPE_CELL_SIZE / 2;
  // Cells are anchored to the bottom of the container (head row sits
  // above the cells). Bottom minus half-height = cell center.
  const cellCenterY = cached.y + cached.h - TAPE_CELL_SIZE / 2;
  return { x: cellCenterX, y: cellCenterY };
};

// Cumulative distance along the signal path at which each waypoint
// sits. waypoint[0] = 0 (start); waypoint[i] = end of segment i-1.
// Used for distance-based waypoint detection so a beam head cannot
// skip a tape-piece interaction on frames where it jumps far along
// the path in a single RAF tick.
export const computeWaypointDists = (
  waypoints: { x: number; y: number }[],
): number[] => {
  const dists: number[] = [0];
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
    dists.push(total);
  }
  return dists;
};
