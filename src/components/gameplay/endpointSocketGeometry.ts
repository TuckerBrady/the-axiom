// Source/Terminal endpoint port geometry. Pure math, no JSX and no
// react-native-svg import, same pattern as damagedCellGeometry.ts, so the
// numbers are directly unit-testable without rendering.
//
// SWEEP-B51 S12 (AXM-044, locked design "S3: Energy port",
// project-docs/DESIGN_HANDOFFS/009-energy-port-sockets/DESIGN_SPEC.md):
// the AXM-036 P12 socket bar, channel and notch are retired. A port is a
// half-disc aperture on the cell edge, an inner arc, and a core: filled for a
// Source (it emits), hollow for a Terminal (it receives). All values are
// fractions of `c`, the cell size.
//
// Clip by construction (DR-5, contract R-12.3): every shape is emitted as the
// half on the cell's side of the edge (closed half-discs for the aperture
// and the core, an open semicircle for the arc), so all geometry lies in
// [0, c] without an SVG ClipPath.

import type { PortSide } from '../../game/types';

export const PORT_APERTURE_R = 0.153;
export const PORT_APERTURE_STROKE = 0.028;
export const PORT_CORE_R = 0.0625;
export const PORT_CORE_STROKE = 0.022;
export const PORT_ARC_R = 0.111;
export const PORT_ARC_STROKE = 0.017;
export const PORT_ARC_OPACITY = 0.6;
/** pieceCore: the aperture fill and a Terminal core's hollow interior. */
export const PIECE_CORE = '#060e1a';

// Minimum px values (DR-2..DR-4, DR-8): at c = 26 the filled Source core and
// the hollow Terminal core must still read as different at 100%.
const MIN_STROKE_PX = 1;
const MIN_CORE_R_PX = 2.5;

export interface EndpointPortGeometry {
  /** Midpoint of the `side` edge of the c x c cell. */
  cx: number;
  cy: number;
  apertureR: number;
  apertureStrokeWidth: number;
  aperturePath: string;
  arcR: number;
  arcStrokeWidth: number;
  arcOpacity: number;
  arcPath: string;
  coreR: number;
  corePath: string;
  coreFilled: boolean;
  coreStrokeWidth: number | null;
}

type Vec = [number, number];

// Unit normal pointing from the edge into the cell.
const INWARD: Record<PortSide, Vec> = {
  left: [1, 0],
  right: [-1, 0],
  top: [0, 1],
  bottom: [0, -1],
};

function edgeMidpoint(c: number, side: PortSide): Vec {
  switch (side) {
    case 'left':
      return [0, c / 2];
    case 'right':
      return [c, c / 2];
    case 'top':
      return [c / 2, 0];
    case 'bottom':
      return [c / 2, c];
  }
}

// The semicircle of radius r about (cx, cy) on the inner side of the edge.
// It runs from the inward normal rotated -90 degrees to the normal rotated
// +90 degrees; SVG's y grows down, so sweep-flag 1 (clockwise on screen)
// passes through the inward normal, i.e. into the cell.
function innerSemicircle(cx: number, cy: number, r: number, side: PortSide, closed: boolean): string {
  const [nx, ny] = INWARD[side];
  const x0 = cx + r * ny;
  const y0 = cy - r * nx;
  const x1 = cx - r * ny;
  const y1 = cy + r * nx;
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}${closed ? ' Z' : ''}`;
}

export function endpointPortGeometry(
  c: number,
  side: PortSide,
  kind: 'outlet' | 'socket',
): EndpointPortGeometry {
  const [cx, cy] = edgeMidpoint(c, side);
  const apertureR = PORT_APERTURE_R * c;
  const arcR = PORT_ARC_R * c;
  const coreR = Math.max(PORT_CORE_R * c, MIN_CORE_R_PX);
  const coreFilled = kind === 'outlet';
  return {
    cx,
    cy,
    apertureR,
    apertureStrokeWidth: Math.max(PORT_APERTURE_STROKE * c, MIN_STROKE_PX),
    aperturePath: innerSemicircle(cx, cy, apertureR, side, true),
    arcR,
    arcStrokeWidth: Math.max(PORT_ARC_STROKE * c, MIN_STROKE_PX),
    arcOpacity: PORT_ARC_OPACITY,
    arcPath: innerSemicircle(cx, cy, arcR, side, false),
    coreR,
    corePath: innerSemicircle(cx, cy, coreR, side, true),
    coreFilled,
    coreStrokeWidth: coreFilled ? null : Math.max(PORT_CORE_STROKE * c, MIN_STROKE_PX),
  };
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
