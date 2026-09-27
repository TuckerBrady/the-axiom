// AXM-036 P12 — [P12-2] / [P12-9] socket geometry (contract "Geometry
// (normative)" table, section 12a).

import {
  endpointSocketGeometry,
  ringGapHalfAngleDeg,
} from '../../../src/components/gameplay/endpointSocketGeometry';

const CLOSE = 0.5; // px tolerance
const ANGLE_CLOSE = 0.1; // degree tolerance

describe('[P12-2] worked values at c=42, 32, 26 (0.5 px)', () => {
  const cases = [
    { c: 42, xi: 13.02, socketH: 6.3, channelH: 2.1, terminalChannelEnd: 12.18, outletChannelStart: 2.31, notchApexX: 2.73 },
    { c: 32, xi: 10.12, socketH: 4.8, channelH: 1.6, terminalChannelEnd: 9.48, outletChannelStart: 1.76, notchApexX: 2.08 },
    { c: 26, xi: 8.38, socketH: 3.9, channelH: 1.3, terminalChannelEnd: 7.86, outletChannelStart: 1.43, notchApexX: 1.69 },
  ];

  for (const { c, xi, socketH, channelH, terminalChannelEnd, outletChannelStart, notchApexX } of cases) {
    it(`c=${c}`, () => {
      const socketGeo = endpointSocketGeometry(c, 'left', 'socket');
      const outletGeo = endpointSocketGeometry(c, 'left', 'outlet');

      // Socket rect: x [x0, xi], height 0.15c.
      expect(socketGeo.socket.x + socketGeo.socket.w).toBeCloseTo(xi, 0);
      expect(Math.abs(socketGeo.socket.x + socketGeo.socket.w - xi)).toBeLessThanOrEqual(CLOSE);
      expect(socketGeo.socket.h).toBeCloseTo(socketH, 1);
      expect(Math.abs(socketGeo.socket.h - socketH)).toBeLessThanOrEqual(CLOSE);

      // Channel height 0.05c for both kinds.
      expect(Math.abs(socketGeo.channel.h - channelH)).toBeLessThanOrEqual(CLOSE);
      expect(Math.abs(outletGeo.channel.h - channelH)).toBeLessThanOrEqual(CLOSE);

      // Terminal-socket channel x-end.
      expect(Math.abs(socketGeo.channel.x + socketGeo.channel.w - terminalChannelEnd)).toBeLessThanOrEqual(CLOSE);

      // Outlet channel x-start.
      expect(Math.abs(outletGeo.channel.x - outletChannelStart)).toBeLessThanOrEqual(CLOSE);

      // Outlet notch apex x (the third point, third element).
      expect(outletGeo.notch).not.toBeNull();
      const apexX = outletGeo.notch![2][0];
      expect(Math.abs(apexX - notchApexX)).toBeLessThanOrEqual(CLOSE);
    });
  }
});

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

describe('[P12-2] side maps', () => {
  it('the top, right and bottom rects are the mapped left rect', () => {
    const c = 42;
    const left = endpointSocketGeometry(c, 'left', 'socket');
    const right = endpointSocketGeometry(c, 'right', 'socket');
    const top = endpointSocketGeometry(c, 'top', 'socket');
    const bottom = endpointSocketGeometry(c, 'bottom', 'socket');

    // right: (x,y) -> (c-x,y). The socket rect's x-span mirrors.
    expect(right.socket.x + right.socket.w).toBeCloseTo(c - left.socket.x, 5);
    expect(right.socket.y).toBeCloseTo(left.socket.y, 5);
    expect(right.socket.h).toBeCloseTo(left.socket.h, 5);

    // top: (x,y) -> (y,x). Width/height swap.
    expect(top.socket.w).toBeCloseTo(left.socket.h, 5);
    expect(top.socket.h).toBeCloseTo(left.socket.w, 5);

    // bottom: (x,y) -> (y, c-x).
    expect(bottom.socket.w).toBeCloseTo(left.socket.h, 5);
    expect(bottom.socket.h).toBeCloseTo(left.socket.w, 5);
  });
});

describe('[P12-2] outlet has a notch and an inset channel; socket has neither', () => {
  it('kind discriminates notch presence', () => {
    const socketGeo = endpointSocketGeometry(42, 'left', 'socket');
    const outletGeo = endpointSocketGeometry(42, 'left', 'outlet');
    expect(socketGeo.notch).toBeNull();
    expect(outletGeo.notch).not.toBeNull();
    // Outlet channel starts further in from the edge than the socket's.
    expect(outletGeo.channel.x).toBeGreaterThan(socketGeo.channel.x);
  });
});

describe('[P12-9] all geometry within [0, c]', () => {
  const sizes = [26, 32, 42, 60];
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  const kinds = ['outlet', 'socket'] as const;

  for (const c of sizes) {
    for (const side of sides) {
      for (const kind of kinds) {
        it(`c=${c} side=${side} kind=${kind}`, () => {
          const geo = endpointSocketGeometry(c, side, kind);
          for (const rect of [geo.socket, geo.channel]) {
            expect(rect.x).toBeGreaterThanOrEqual(0);
            expect(rect.y).toBeGreaterThanOrEqual(0);
            expect(rect.x + rect.w).toBeLessThanOrEqual(c);
            expect(rect.y + rect.h).toBeLessThanOrEqual(c);
          }
          if (geo.notch) {
            for (const [x, y] of geo.notch) {
              expect(x).toBeGreaterThanOrEqual(0);
              expect(y).toBeGreaterThanOrEqual(0);
              expect(x).toBeLessThanOrEqual(c);
              expect(y).toBeLessThanOrEqual(c);
            }
          }
        });
      }
    }
  }
});
