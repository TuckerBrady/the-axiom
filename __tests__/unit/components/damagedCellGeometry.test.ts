// Damaged-cell "missing plate" geometry (Tucker approved 2026-09-20).
//
// The treatment has to survive a dense board with NO label, so the whole
// contract is: every number scales with the cell, nothing is a fixed constant
// that only works at one size, and the range the board actually uses
// (~29pt .. ~88pt) stays drawable.

import {
  damagedCellGeometry,
  HOLE_INSET,
  MIN_STROKE,
  EMBER_PULSE_MS,
  EMBER_MIN_OPACITY,
  EMBER_MAX_OPACITY,
} from '../../../src/components/gameplay/damagedCellGeometry';

/** The board's real cell-size range, plus the midpoint. */
const SIZES = [29, 40, 58, 88];

const numbersIn = (d: string): number[] =>
  (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('damagedCellGeometry — the hole', () => {
  it('insets the hole by HOLE_INSET on every side', () => {
    const g = damagedCellGeometry(100);
    expect(g.hole.x).toBeCloseTo(100 * HOLE_INSET, 3);
    expect(g.hole.y).toBeCloseTo(100 * HOLE_INSET, 3);
    expect(g.hole.width).toBeCloseTo(100 * (1 - HOLE_INSET * 2), 3);
  });

  it('is square at every size', () => {
    for (const s of SIZES) {
      const g = damagedCellGeometry(s);
      expect(g.hole.width).toBeCloseTo(g.hole.height, 3);
    }
  });

  it('keeps the recess strictly inside the hole', () => {
    for (const s of SIZES) {
      const { hole, recess } = damagedCellGeometry(s);
      expect(recess.x).toBeGreaterThan(hole.x);
      expect(recess.y).toBeGreaterThan(hole.y);
      expect(recess.x + recess.width).toBeLessThan(hole.x + hole.width);
      expect(recess.y + recess.height).toBeLessThan(hole.y + hole.height);
    }
  });
});

describe('damagedCellGeometry — scaling', () => {
  it('scales every coordinate linearly with the cell size', () => {
    const a = damagedCellGeometry(30);
    const b = damagedCellGeometry(60);
    expect(b.hole.x).toBeCloseTo(a.hole.x * 2, 2);
    expect(b.hole.width).toBeCloseTo(a.hole.width * 2, 2);
    expect(b.recess.width).toBeCloseTo(a.recess.width * 2, 2);
    for (let i = 0; i < a.fractures.length; i++) {
      expect(b.fractures[i].x1).toBeCloseTo(a.fractures[i].x1 * 2, 2);
      expect(b.fractures[i].y2).toBeCloseTo(a.fractures[i].y2 * 2, 2);
    }
  });

  it('keeps every drawn coordinate inside the cell at every size', () => {
    for (const s of SIZES) {
      const g = damagedCellGeometry(s);
      const coords = [
        ...numbersIn(g.rimLight),
        ...numbersIn(g.wallShadow),
        ...numbersIn(g.wallLight),
        ...numbersIn(g.ember),
        ...g.brackets.flatMap(numbersIn),
        ...g.fractures.flatMap(f => [f.x1, f.y1, f.x2, f.y2]),
      ];
      for (const c of coords) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(s);
      }
    }
  });

  it('never emits a stroke thinner than its floor, so a 29pt cell still draws', () => {
    const g = damagedCellGeometry(29);
    expect(g.strokes.hairline).toBeGreaterThanOrEqual(MIN_STROKE.hairline);
    expect(g.strokes.rim).toBeGreaterThanOrEqual(MIN_STROKE.rim);
    expect(g.strokes.wall).toBeGreaterThanOrEqual(MIN_STROKE.wall);
    expect(g.strokes.bracket).toBeGreaterThanOrEqual(MIN_STROKE.bracket);
    expect(g.strokes.ember).toBeGreaterThanOrEqual(MIN_STROKE.ember);
  });

  it('grows strokes with the cell rather than pinning them to the floor', () => {
    const small = damagedCellGeometry(29);
    const large = damagedCellGeometry(88);
    expect(large.strokes.bracket).toBeGreaterThan(small.strokes.bracket);
    expect(large.strokes.ember).toBeGreaterThan(small.strokes.ember);
    expect(large.strokes.hairline).toBeGreaterThan(small.strokes.hairline);
  });

  it('keeps strokes a small fraction of the cell so the hole never fills in', () => {
    for (const s of SIZES) {
      const g = damagedCellGeometry(s);
      expect(g.strokes.bracket).toBeLessThan(s * 0.1);
      expect(g.strokes.ember).toBeLessThan(s * 0.1);
    }
  });

  it('degrades safely at size 0 rather than emitting NaN or negatives', () => {
    const g = damagedCellGeometry(0);
    expect(g.hole.width).toBe(0);
    expect(Number.isNaN(g.hole.x)).toBe(false);
    expect(g.strokes.hairline).toBe(MIN_STROKE.hairline);
    const g2 = damagedCellGeometry(-10);
    expect(g2.hole.width).toBe(0);
  });
});

describe('damagedCellGeometry — the plate was bolted down', () => {
  it('emits exactly two bracket stubs', () => {
    expect(damagedCellGeometry(50).brackets).toHaveLength(2);
  });

  it('places them at OPPOSITE corners of the hole', () => {
    const g = damagedCellGeometry(100);
    const [tl, br] = g.brackets.map(numbersIn);
    const holeCx = g.hole.x + g.hole.width / 2;
    const holeCy = g.hole.y + g.hole.height / 2;
    // First stub's corner point is the 3rd/4th number (the path's elbow).
    const tlElbowX = tl[2];
    const tlElbowY = tl[3];
    const brElbowX = br[2];
    const brElbowY = br[3];
    expect(tlElbowX).toBeLessThan(holeCx);
    expect(tlElbowY).toBeLessThan(holeCy);
    expect(brElbowX).toBeGreaterThan(holeCx);
    expect(brElbowY).toBeGreaterThan(holeCy);
  });

  it('draws a few hairline fractures, not a shattered cell', () => {
    const g = damagedCellGeometry(50);
    expect(g.fractures.length).toBeGreaterThanOrEqual(3);
    expect(g.fractures.length).toBeLessThanOrEqual(5);
  });

  it('runs every fracture OUT of the hole into the surrounding surface', () => {
    const g = damagedCellGeometry(100);
    const { x, y, width, height } = g.hole;
    const inHole = (px: number, py: number) =>
      px >= x && px <= x + width && py >= y && py <= y + height;
    for (const f of g.fractures) {
      // Starts on the hole boundary, ends outside it.
      expect(inHole(f.x1, f.y1)).toBe(true);
      expect(inHole(f.x2, f.y2)).toBe(false);
    }
  });
});

describe('damagedCellGeometry — the live-burn crack', () => {
  it('keeps the ember crack inside the hole, not on the surrounding deck', () => {
    for (const s of SIZES) {
      const g = damagedCellGeometry(s);
      const n = numbersIn(g.ember);
      for (let i = 0; i < n.length; i += 2) {
        expect(n[i]).toBeGreaterThanOrEqual(g.hole.x);
        expect(n[i]).toBeLessThanOrEqual(g.hole.x + g.hole.width);
        expect(n[i + 1]).toBeGreaterThanOrEqual(g.hole.y);
        expect(n[i + 1]).toBeLessThanOrEqual(g.hole.y + g.hole.height);
      }
    }
  });

  it('is a jagged multi-segment crack, not a straight line', () => {
    const n = numbersIn(damagedCellGeometry(60).ember);
    expect(n.length / 2).toBeGreaterThanOrEqual(4);
  });

  it('pulses slowly between a dim and a bright ember', () => {
    expect(EMBER_MIN_OPACITY).toBeGreaterThan(0);
    expect(EMBER_MAX_OPACITY).toBeGreaterThan(EMBER_MIN_OPACITY);
    expect(EMBER_MAX_OPACITY).toBeLessThanOrEqual(1);
    // Slow enough to read as smouldering rather than as an alarm blink.
    expect(EMBER_PULSE_MS).toBeGreaterThanOrEqual(600);
  });
});
