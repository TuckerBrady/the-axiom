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
// Cell layout is fixed: 24px wide with a 3px gap.
export const getTapeCellPosFromCache = (
  cached: TapeCellContainerMeasure | null,
  cellIndex: number,
): { x: number; y: number } => {
  if (!cached) return { x: 0, y: 0 };
  const cellW = 24;
  const cellGap = 3;
  const cellCenterX = cached.x + cellIndex * (cellW + cellGap) + cellW / 2;
  const cellCenterY = cached.y + cached.h / 2;
  return { x: cellCenterX, y: cellCenterY };
};
