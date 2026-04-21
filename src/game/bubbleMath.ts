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
// measurement of the FIRST cell in the tape row. All cells in a row
// share the same y (cells are laid out horizontally); x advances by
// cell width + gap.
//
// Prior versions measured the enclosing container and tried to compute
// the cell center from the container height. That was fragile — React
// Native's view flattening on Android made the container measurement
// ambiguous (could measure the full wrap with the head indicator, or
// just the cell row, or a flattened parent). Measuring the cell itself
// sidesteps the issue entirely.
const TAPE_CELL_GAP = 3;

export const getTapeCellPosFromCache = (
  cached: TapeCellContainerMeasure | null,
  cellIndex: number,
): { x: number; y: number } => {
  if (!cached) return { x: 0, y: 0 };
  const cellCenterX = cached.x + cellIndex * (cached.w + TAPE_CELL_GAP) + cached.w / 2;
  const cellCenterY = cached.y + cached.h / 2;
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
