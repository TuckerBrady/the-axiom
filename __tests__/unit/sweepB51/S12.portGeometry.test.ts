// SWEEP-B51 S12 (AXM-044 + AXM-043): energy port geometry.
//
// Locked design: project-docs/DESIGN_HANDOFFS/009-energy-port-sockets/DESIGN_SPEC.md
// (S3 "Energy port"), contract CONTRACT.md section 13, clauses S12-1, S12-2,
// S12-3 and S12-7. Pure math, no rendering.

import * as fs from 'fs';
import * as path from 'path';
import {
  endpointPortGeometry,
  PORT_APERTURE_R,
  PORT_APERTURE_STROKE,
  PORT_CORE_R,
  PORT_CORE_STROKE,
  PORT_ARC_R,
  PORT_ARC_STROKE,
  PORT_ARC_OPACITY,
  PIECE_CORE,
} from '../../../src/components/gameplay/endpointSocketGeometry';
import { portSideToward } from '../../../src/components/pieceSimulationMath';
import type { PortSide } from '../../../src/game/types';

const CLOSE = 0.5;
const SIDES: PortSide[] = ['top', 'right', 'bottom', 'left'];
const KINDS = ['outlet', 'socket'] as const;

// Parses an SVG path made of absolute M, L, A and Z commands into the points
// it draws through: every endpoint, plus each semicircular arc's bulge point,
// computed from the arc's sweep flag (SVG y grows down, so sweep 1 turns
// clockwise on screen). A wrong sweep flag puts the bulge outside the cell
// and fails the bounds check.
type Pt = [number, number];
function pathPoints(d: string): Pt[] {
  const tokens = d.match(/[MLAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const pts: Pt[] = [];
  let i = 0;
  let cur: Pt = [0, 0];
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd === 'M' || cmd === 'L') {
      cur = [Number(tokens[i++]), Number(tokens[i++])];
      pts.push(cur);
    } else if (cmd === 'A') {
      const rx = Number(tokens[i++]);
      i += 3; // ry, x-axis-rotation, large-arc flag
      const sweep = Number(tokens[i++]);
      const end: Pt = [Number(tokens[i++]), Number(tokens[i++])];
      const mx = (cur[0] + end[0]) / 2;
      const my = (cur[1] + end[1]) / 2;
      const len = Math.hypot(end[0] - cur[0], end[1] - cur[1]) || 1;
      const ux = (end[0] - cur[0]) / len;
      const uy = (end[1] - cur[1]) / len;
      const k = sweep === 1 ? 1 : -1;
      pts.push(end, [mx + k * uy * rx, my - k * ux * rx]);
      cur = end;
    } else if (cmd.toUpperCase() !== 'Z') {
      throw new Error(`unexpected path token ${cmd}`);
    }
  }
  return pts;
}

describe('S12 port geometry', () => {
  test('[S12-1] worked values at c=72, 42, 26 within 0.5px', () => {
    expect(PORT_APERTURE_R).toBe(0.153);
    expect(PORT_APERTURE_STROKE).toBe(0.028);
    expect(PORT_CORE_R).toBe(0.0625);
    expect(PORT_CORE_STROKE).toBe(0.022);
    expect(PORT_ARC_R).toBe(0.111);
    expect(PORT_ARC_STROKE).toBe(0.017);
    expect(PORT_ARC_OPACITY).toBe(0.6);

    const rows = [
      { c: 72, apertureR: 11.02, apertureStroke: 2.02, coreR: 4.5, coreStroke: 1.58, arcR: 7.99, arcStroke: 1.22 },
      { c: 42, apertureR: 6.43, apertureStroke: 1.18, coreR: 2.63, coreStroke: 1.0, arcR: 4.66, arcStroke: 1.0 },
      { c: 26, apertureR: 3.98, apertureStroke: 1.0, coreR: 2.5, coreStroke: 1.0, arcR: 2.89, arcStroke: 1.0 },
    ];
    for (const row of rows) {
      for (const side of SIDES) {
        const socket = endpointPortGeometry(row.c, side, 'socket');
        const outlet = endpointPortGeometry(row.c, side, 'outlet');
        for (const g of [socket, outlet]) {
          expect(Math.abs(g.apertureR - row.apertureR)).toBeLessThanOrEqual(CLOSE);
          expect(Math.abs(g.apertureStrokeWidth - row.apertureStroke)).toBeLessThanOrEqual(CLOSE);
          expect(Math.abs(g.coreR - row.coreR)).toBeLessThanOrEqual(CLOSE);
          expect(Math.abs(g.arcR - row.arcR)).toBeLessThanOrEqual(CLOSE);
          expect(Math.abs(g.arcStrokeWidth - row.arcStroke)).toBeLessThanOrEqual(CLOSE);
          expect(g.arcOpacity).toBe(0.6);
        }
        expect(socket.coreStrokeWidth).not.toBeNull();
        expect(Math.abs((socket.coreStrokeWidth as number) - row.coreStroke)).toBeLessThanOrEqual(CLOSE);
      }
    }

    // The port centre is the midpoint of the named edge.
    const c = 42;
    expect([endpointPortGeometry(c, 'left', 'outlet').cx, endpointPortGeometry(c, 'left', 'outlet').cy]).toEqual([0, 21]);
    expect([endpointPortGeometry(c, 'right', 'outlet').cx, endpointPortGeometry(c, 'right', 'outlet').cy]).toEqual([42, 21]);
    expect([endpointPortGeometry(c, 'top', 'outlet').cx, endpointPortGeometry(c, 'top', 'outlet').cy]).toEqual([21, 0]);
    expect([endpointPortGeometry(c, 'bottom', 'outlet').cx, endpointPortGeometry(c, 'bottom', 'outlet').cy]).toEqual([21, 42]);
  });

  test('[S12-1] Source core is filled; Terminal core is hollow with a pieceCore interior', () => {
    expect(PIECE_CORE).toBe('#060e1a');
    for (const c of [26, 42, 72]) {
      for (const side of SIDES) {
        const outlet = endpointPortGeometry(c, side, 'outlet');
        expect(outlet.coreFilled).toBe(true);
        expect(outlet.coreStrokeWidth).toBeNull();
        const socket = endpointPortGeometry(c, side, 'socket');
        expect(socket.coreFilled).toBe(false);
        expect(socket.coreStrokeWidth).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('[S12-1] at c=26 the Terminal core keeps a hollow interior', () => {
    for (const side of SIDES) {
      const g = endpointPortGeometry(26, side, 'socket');
      expect(g.coreR).toBeGreaterThanOrEqual(2.5);
      expect(g.coreR - (g.coreStrokeWidth as number) / 2).toBeGreaterThanOrEqual(1);
    }
  });

  test('[S12-2] every port path coordinate lies within the cell', () => {
    for (const c of [26, 42, 72]) {
      for (const side of SIDES) {
        for (const kind of KINDS) {
          const g = endpointPortGeometry(c, side, kind);
          for (const d of [g.aperturePath, g.arcPath, g.corePath]) {
            const pts = pathPoints(d);
            expect(pts.length).toBeGreaterThan(0);
            for (const [x, y] of pts) {
              expect(x).toBeGreaterThanOrEqual(-1e-9);
              expect(y).toBeGreaterThanOrEqual(-1e-9);
              expect(x).toBeLessThanOrEqual(c + 1e-9);
              expect(y).toBeLessThanOrEqual(c + 1e-9);
            }
            expect(d).not.toMatch(/NaN|Infinity/);
          }
          // Closed half-discs for aperture and core; an open semicircle for
          // the arc.
          expect(g.aperturePath.trim().endsWith('Z')).toBe(true);
          expect(g.corePath.trim().endsWith('Z')).toBe(true);
          expect(g.arcPath).not.toMatch(/Z/);
        }
      }
    }
  });

  test('[S12-3] no second port drawing exists in src', () => {
    const root = path.resolve(__dirname, '../../../src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name)) files.push(full);
      }
    };
    walk(root);
    const geometryFile = path.join(root, 'components', 'gameplay', 'endpointSocketGeometry.ts');
    const renderFile = path.join(root, 'components', 'gameplay', 'EndpointSockets.tsx');
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf-8');
      expect({ f, hit: /EndpointSocketShape/.test(text) }).toEqual({ f, hit: false });
      expect({ f, hit: /endpointSocketGeometry\(/.test(text) }).toEqual({ f, hit: false });
      if (f !== geometryFile && f !== renderFile) {
        // The port geometry is consumed by the one renderer only.
        expect({ f, hit: /endpointPortGeometry/.test(text) }).toEqual({ f, hit: false });
      }
    }
    // PieceIcon draws its Codex ports through the shared renderer.
    const pieceIcon = fs.readFileSync(path.join(root, 'components', 'PieceIcon.tsx'), 'utf-8');
    expect(pieceIcon).toMatch(/import \{ EndpointPortShape \} from '\.\/gameplay\/EndpointSockets'/);
  });

  test('[S12-7] portSideToward maps the four neighbours', () => {
    const from = { col: 2, row: 1 };
    expect(portSideToward(from, { col: 3, row: 1 })).toBe('right');
    expect(portSideToward(from, { col: 1, row: 1 })).toBe('left');
    expect(portSideToward(from, { col: 2, row: 0 })).toBe('top');
    expect(portSideToward(from, { col: 2, row: 2 })).toBe('bottom');
  });
});
