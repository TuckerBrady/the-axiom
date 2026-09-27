// AXM-036 hotfix3 — [HF3-n] guard `ringGapHalfAngleDeg` against NaN at tiny
// cell sizes. Root cause: at c=4 the geometry's `iconPxPerUnit` divisor is
// zero, and just above it (c=5) the asin input exceeds 1, so
// `Math.asin(...)` returns NaN and that NaN flows into an SVG ring-arc path
// (Android IllegalArgumentException in react-native-svg's PathParser,
// crash-buffer-1.txt). This must never happen again: the angle is finite at
// every cell size, and normal sizes (26/32/42) are unchanged from the P12
// worked geometry table in P12.socketGeometry.test.ts.

import { ringGapHalfAngleDeg } from '../../../src/components/gameplay/endpointSocketGeometry';

describe('[HF3-1] ringGapHalfAngleDeg is always finite, even at tiny cell sizes', () => {
  const sizes = [4, 5, 6, 26, 42];
  for (const c of sizes) {
    it(`c=${c} is finite`, () => {
      expect(Number.isFinite(ringGapHalfAngleDeg(c))).toBe(true);
    });
  }
});

describe('[HF3-2] c=4 has no room for a gap (division-by-zero case) and returns 0', () => {
  it('c=4', () => {
    expect(ringGapHalfAngleDeg(4)).toBe(0);
  });
});

describe('[HF3-3] c=5 and c=6 (asin argument out of [-1,1] before clamping) stay finite and non-negative', () => {
  it('c=5', () => {
    const deg = ringGapHalfAngleDeg(5);
    expect(Number.isFinite(deg)).toBe(true);
    expect(deg).toBeGreaterThanOrEqual(0);
  });

  it('c=6', () => {
    const deg = ringGapHalfAngleDeg(6);
    expect(Number.isFinite(deg)).toBe(true);
    expect(deg).toBeGreaterThanOrEqual(0);
  });
});

describe('[HF3-4] normal sizes (26, 32, 42) unchanged against the P12 worked geometry table', () => {
  // Same worked values as P12.socketGeometry.test.ts's
  // "[P12-2] ringGapHalfAngleDeg at c=42, 32, 26 (0.1 degree)" — this hotfix
  // must not touch that codepath's output at real-world cell sizes.
  const ANGLE_CLOSE = 0.1;
  const cases = [
    { c: 42, deg: 20.2 },
    { c: 32, deg: 20.9 },
    { c: 26, deg: 21.7 },
  ];
  for (const { c, deg } of cases) {
    it(`c=${c}`, () => {
      expect(Math.abs(ringGapHalfAngleDeg(c) - deg)).toBeLessThanOrEqual(ANGLE_CLOSE);
    });
  }
});
