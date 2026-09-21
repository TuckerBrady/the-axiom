// Damaged-cell geometry — "missing plate" treatment (Tucker, 2026-09-20).
//
// Pure math, no JSX and no react-native-svg import, split out of
// DamagedCell.tsx specifically so the scaling rules are directly
// unit-testable. Same pattern as shipGeometry.ts / pieceSimulationMath.ts.
//
// THE DESIGN
// ----------
// A damaged cell is a deck plate that is GONE: a hole into the void. It is
// drawn dark and recessed (rim light on the surrounding deck, shadow down the
// near inner wall, a faint lit far wall), with a few hairline fractures in the
// surrounding surface and two bracket stubs at opposite corners where the
// plate was bolted down.
//
// It carries NO colour, NO text and NO dashed border, so it never competes
// with the beam, the tape bars or a piece, and it stays legible with no label
// from roughly 29pt to 88pt cells. That is why every number below is a
// fraction of `size` — there is not one constant here that only works at one
// cell size.
//
// A cell blown during the CURRENT run additionally shows an ember still
// crawling in `ember` (see EMBER_*). On the next run it settles to the plain
// missing plate, so the board remembers the failure without a badge sitting
// on it forever.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DamagedCellGeometry {
  /** The hole itself — where the deck plate used to be. */
  hole: Rect;
  /** Inset ring just inside the hole; darkens the recess floor's edge. */
  recess: Rect;
  /** Cut edge on the SURROUNDING deck, top/left — catches the light. */
  rimLight: string;
  /** Near inner wall, top/left — in shadow. This is what reads as "below". */
  wallShadow: string;
  /** Far inner wall, bottom/right — faintly lit. */
  wallLight: string;
  /** Hairline fractures radiating out into the surrounding surface. */
  fractures: Segment[];
  /** Bracket stubs at two OPPOSITE corners (top-left, bottom-right). */
  brackets: string[];
  /** The crack an ember crawls along on a live burn. */
  ember: string;
  strokes: {
    hairline: number;
    rim: number;
    wall: number;
    bracket: number;
    ember: number;
  };
}

/** Fraction of the cell the hole is inset by on every side. */
export const HOLE_INSET = 0.14;

/** Ember pulse — slow, so it reads as "still burning", not as an alarm. */
export const EMBER_PULSE_MS = 1100;
export const EMBER_MIN_OPACITY = 0.2;
export const EMBER_MAX_OPACITY = 0.95;

/**
 * Minimum stroke widths in points. Below roughly a third of a point a
 * hairline disappears entirely on device, which is what would make the
 * 29pt end of the range illegible.
 */
export const MIN_STROKE = {
  hairline: 0.5,
  rim: 0.6,
  wall: 0.75,
  bracket: 0.75,
  ember: 0.75,
} as const;

const round = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Build every path and rect for one damaged cell, in CELL-LOCAL coordinates:
 * (0, 0) is the cell's top-left corner and the cell is `size` x `size`. The
 * component translates the group into board space.
 */
export function damagedCellGeometry(size: number): DamagedCellGeometry {
  const s = Math.max(0, size);
  const x = s * HOLE_INSET;
  const y = s * HOLE_INSET;
  const w = s * (1 - HOLE_INSET * 2);
  const h = w;
  const rx = s * 0.06;

  // Corners of the hole, named so the paths below read as geometry.
  const left = x;
  const top = y;
  const right = x + w;
  const bottom = y + h;

  const recessInset = w * 0.08;

  const px = (fx: number): number => round(left + w * fx);
  const py = (fy: number): number => round(top + h * fy);

  return {
    hole: {
      x: round(left),
      y: round(top),
      width: round(w),
      height: round(h),
      rx: round(rx),
    },
    recess: {
      x: round(left + recessInset),
      y: round(top + recessInset),
      width: round(w - recessInset * 2),
      height: round(h - recessInset * 2),
      rx: round(rx * 0.7),
    },
    // Runs along the outside of the top and left edges: the lit cut edge of
    // the deck that is still there.
    rimLight: `M ${round(left)} ${round(bottom)} L ${round(left)} ${round(top)} L ${round(right)} ${round(top)}`,
    // Same two edges, drawn a hair inside: the wall falling away into the hole.
    wallShadow: `M ${px(0.02)} ${py(0.98)} L ${px(0.02)} ${py(0.02)} L ${px(0.98)} ${py(0.02)}`,
    // The far wall, catching what light makes it into the recess.
    wallLight: `M ${px(0.98)} ${py(0.06)} L ${px(0.98)} ${py(0.98)} L ${px(0.06)} ${py(0.98)}`,
    fractures: [
      // Out of the top-left corner, up and left.
      { x1: round(left), y1: round(top + h * 0.28), x2: round(s * 0.02), y2: round(s * 0.06) },
      // Out of the top edge, up and right.
      { x1: round(left + w * 0.62), y1: round(top), x2: round(s * 0.86), y2: round(s * 0.015) },
      // Out of the right edge, down and right.
      { x1: round(right), y1: round(top + h * 0.6), x2: round(s * 0.985), y2: round(s * 0.84) },
      // Out of the bottom edge, down and left.
      { x1: round(left + w * 0.3), y1: round(bottom), x2: round(s * 0.12), y2: round(s * 0.985) },
    ],
    brackets: [
      // Top-left stub.
      `M ${px(0.06)} ${py(0.3)} L ${px(0.06)} ${py(0.06)} L ${px(0.3)} ${py(0.06)}`,
      // Bottom-right stub — the OPPOSITE corner.
      `M ${px(0.94)} ${py(0.7)} L ${px(0.94)} ${py(0.94)} L ${px(0.7)} ${py(0.94)}`,
    ],
    ember: `M ${px(0.16)} ${py(0.7)} L ${px(0.38)} ${py(0.52)} L ${px(0.58)} ${py(0.66)} L ${px(0.82)} ${py(0.42)}`,
    strokes: {
      hairline: round(Math.max(MIN_STROKE.hairline, s * 0.018)),
      rim: round(Math.max(MIN_STROKE.rim, s * 0.022)),
      wall: round(Math.max(MIN_STROKE.wall, s * 0.03)),
      bracket: round(Math.max(MIN_STROKE.bracket, s * 0.038)),
      ember: round(Math.max(MIN_STROKE.ember, s * 0.042)),
    },
  };
}
