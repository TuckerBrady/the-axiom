// AXM-036 P12 — Source/Terminal socket geometry (normative, CONTRACT.md
// section 12a). Pure math, no JSX and no react-native-svg import, same
// pattern as damagedCellGeometry.ts, so the numbers are directly
// unit-testable without rendering.
//
// All values are fractions of `c` (the board's CELL_SIZE), computed with the
// side drawn on the LEFT, then mapped onto the requested side. The maps are
// exactly CONTRACT.md's:
//   top:    (x, y) -> (y, x)
//   right:  (x, y) -> (c - x, y)
//   bottom: (x, y) -> (y, c - x)
//   left:   (x, y) -> (x, y)          (identity — this is the reference side)

import type { PortSide } from '../../game/types';

export interface GeometryRect {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
}

export type Point = [number, number];

export interface EndpointSocketGeometry {
  socket: GeometryRect;
  channel: GeometryRect;
  /** Present only for `kind: 'outlet'`. */
  notch: [Point, Point, Point] | null;
}

function mapPoint(pt: Point, side: PortSide, c: number): Point {
  const [x, y] = pt;
  switch (side) {
    case 'left':
      return [x, y];
    case 'top':
      return [y, x];
    case 'right':
      return [c - x, y];
    case 'bottom':
      return [y, c - x];
  }
}

function mapRect(rect: GeometryRect, side: PortSide, c: number): GeometryRect {
  const p1 = mapPoint([rect.x, rect.y], side, c);
  const p2 = mapPoint([rect.x + rect.w, rect.y + rect.h], side, c);
  const x = Math.min(p1[0], p2[0]);
  const y = Math.min(p1[1], p2[1]);
  const w = Math.abs(p2[0] - p1[0]);
  const h = Math.abs(p2[1] - p1[1]);
  return rect.r !== undefined ? { x, y, w, h, r: rect.r } : { x, y, w, h };
}

/**
 * `s` — px per icon unit (PieceIcon's 40-unit viewBox), matching
 * BoardPiece's `iconSize = (cellSize - 4) * 0.60`: s = iconSize / 40.
 */
export function iconPxPerUnit(cellSize: number): number {
  return (0.6 * (cellSize - 4)) / 40;
}

/** Outer ring radius in px (PieceIcon's `r=16` in its 40-unit viewBox). */
export function outerRingRadius(cellSize: number): number {
  return 16 * iconPxPerUnit(cellSize);
}

export function endpointSocketGeometry(
  cellSize: number,
  side: PortSide,
  kind: 'outlet' | 'socket',
): EndpointSocketGeometry {
  const c = cellSize;
  const s = iconPxPerUnit(c);
  const R = 16 * s;

  const x0 = 0.02 * c;
  const xi = c / 2 - R + 2 * s;
  const yTop = c / 2 - 0.075 * c;
  const yBot = c / 2 + 0.075 * c;

  const socketLeft: GeometryRect = {
    x: x0,
    y: yTop,
    w: xi - x0,
    h: yBot - yTop,
    r: 0.015 * c,
  };

  const chTop = c / 2 - 0.025 * c;
  const chBot = c / 2 + 0.025 * c;

  let channelLeft: GeometryRect;
  let notchLeft: [Point, Point, Point] | null = null;

  if (kind === 'socket') {
    channelLeft = { x: x0, y: chTop, w: xi - 0.02 * c - x0, h: chBot - chTop };
  } else {
    const chX = x0 + 0.035 * c;
    channelLeft = { x: chX, y: chTop, w: xi - 0.02 * c - chX, h: chBot - chTop };
    notchLeft = [
      [x0, yTop],
      [x0, yBot],
      [x0 + 0.045 * c, c / 2],
    ];
  }

  return {
    socket: mapRect(socketLeft, side, c),
    channel: mapRect(channelLeft, side, c),
    notch: notchLeft ? (notchLeft.map(pt => mapPoint(pt, side, c)) as [Point, Point, Point]) : null,
  };
}

/**
 * Ring gap half-angle in degrees, either side of the connected side's axis.
 *
 * At very small cell sizes (`c <= 4`, or just above it) `iconPxPerUnit`
 * collapses toward zero and the asin argument blows past +-1 or divides by
 * zero, which would otherwise hand `NaN` down into an SVG arc path
 * (AXM-036 hotfix3: Android IllegalArgumentException in react-native-svg's
 * PathParser). There is no room to draw a ring gap at that size regardless,
 * so this returns 0 (no gap) whenever the geometry isn't representable.
 */
export function ringGapHalfAngleDeg(cellSize: number): number {
  const c = cellSize;
  if (c <= 4) {
    return 0;
  }
  const s = iconPxPerUnit(c);
  const asinInput = (0.075 * c) / s / 16;
  const clamped = Math.max(-1, Math.min(1, asinInput));
  const rad = Math.asin(clamped);
  const deg = (rad * 180) / Math.PI;
  return Number.isFinite(deg) ? deg : 0;
}
