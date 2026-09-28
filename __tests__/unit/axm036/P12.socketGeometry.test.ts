// AXM-036 P12 — [P12-2] / [P12-9] socket geometry (contract "Geometry
// (normative)" table, section 12a).

import {
  endpointPortGeometry,
  ringGapHalfAngleDeg,
} from '../../../src/components/gameplay/endpointSocketGeometry';

const CLOSE = 0.5; // px tolerance
const ANGLE_CLOSE = 0.1; // degree tolerance

describe('[P12-2] ringGapHalfAngleDeg at c=42, 32, 26 (0.1 degree)', () => {
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

describe('[P12-9] all geometry within [0, c]', () => {
  const sizes = [26, 32, 42, 60];
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  const kinds = ['outlet', 'socket'] as const;

  for (const c of sizes) {
    for (const side of sides) {
      for (const kind of kinds) {
        it(`c=${c} side=${side} kind=${kind}`, () => {
          // SWEEP-B51 S12 (AXM-044): re-pointed at the energy port geometry.
          // Every point a port path draws through (its endpoints and each
          // semicircle's bulge on the cell side of the edge) lies in [0, c].
          const geo = endpointPortGeometry(c, side, kind);
          for (const d of [geo.aperturePath, geo.arcPath, geo.corePath]) {
            const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
            // M x0 y0 A r r 0 0 1 x1 y1: endpoints at [0,1] and [7,8].
            const [x0, y0, r, , , , , x1, y1] = nums;
            const mx = (x0 + x1) / 2;
            const my = (y0 + y1) / 2;
            const ux = (x1 - x0) / (2 * r);
            const uy = (y1 - y0) / (2 * r);
            const bulge: [number, number] = [mx + uy * r, my - ux * r];
            for (const [x, y] of [[x0, y0], [x1, y1], bulge]) {
              expect(x).toBeGreaterThanOrEqual(-1e-9);
              expect(y).toBeGreaterThanOrEqual(-1e-9);
              expect(x).toBeLessThanOrEqual(c + 1e-9);
              expect(y).toBeLessThanOrEqual(c + 1e-9);
            }
          }
        });
      }
    }
  }
});
