// AXM-036 P4a (F4) — constant-speed beam travel.
//
// Master drives the beam head with easeOut3() over a per-path duration
// clamped to [300, 1200]ms (beamAnimation.ts, pre-fix). That means:
//   - the head decelerates into every waypoint and the Terminal
//   - a long path and a short blocked path can share the same speed,
//     because the clamp squashes both into the same window
//
// Tucker sanctioned linear beam travel as an exception to the cinematic
// cubic-bezier default (CLAUDE.md Design Principle 4), for beam travel
// only. This file pins the pure helpers (beamTravelMs, beamHeadDistance)
// plus a source-contract check that beamAnimation.ts actually uses them
// instead of easeOut3 / the old clamp.

import * as fs from 'fs';
import * as path from 'path';
import { beamTravelMs, beamHeadDistance } from '../../../src/game/engagement/beamData';

describe('[P4a-2] beamTravelMs is 75 ms per cell, unclamped', () => {
  it('4 cells (pathTotal = 4 * cellSize) = 300ms at speed 1.0', () => {
    expect(beamTravelMs(4 * 64, 64, 1.0)).toBeCloseTo(300);
  });

  it('20 cells = 1500ms at speed 1.0', () => {
    expect(beamTravelMs(20 * 64, 64, 1.0)).toBeCloseTo(1500);
  });

  it('2 cells = 150ms at speed 1.0', () => {
    expect(beamTravelMs(2 * 64, 64, 1.0)).toBeCloseTo(150);
  });

  it('speed 2.0 doubles the duration', () => {
    expect(beamTravelMs(4 * 64, 64, 2.0)).toBeCloseTo(600);
    expect(beamTravelMs(20 * 64, 64, 2.0)).toBeCloseTo(3000);
  });

  it('has no upper or lower clamp — a 40-cell path is not squashed to 1200ms', () => {
    expect(beamTravelMs(40 * 64, 64, 1.0)).toBeCloseTo(3000);
  });

  it('a sub-cell path is not floored to 300ms', () => {
    expect(beamTravelMs(0.5 * 64, 64, 1.0)).toBeCloseTo(37.5);
  });
});

describe('[P4a-2] velocity is identical for different path lengths', () => {
  it('ms-per-cell (totalMs / (pathTotal / cellSize)) is constant across lengths', () => {
    const cellSize = 48;
    const lengths = [2, 4, 9, 20, 40];
    const perCell = lengths.map(cells => beamTravelMs(cells * cellSize, cellSize, 1.0) / cells);
    perCell.forEach(v => expect(v).toBeCloseTo(75));
  });

  it('holds at speed 2.0 too', () => {
    const cellSize = 48;
    const lengths = [3, 6, 15];
    const perCell = lengths.map(cells => beamTravelMs(cells * cellSize, cellSize, 2.0) / cells);
    perCell.forEach(v => expect(v).toBeCloseTo(150));
  });
});

describe('[P4a-1] beamHeadDistance is linear', () => {
  const totalMs = 1000;
  const pathTotal = 500;

  it('25 / 50 / 75 / 100 percent of elapsed time covers the matching percent of distance', () => {
    expect(beamHeadDistance(250, totalMs, pathTotal)).toBeCloseTo(125);
    expect(beamHeadDistance(500, totalMs, pathTotal)).toBeCloseTo(250);
    expect(beamHeadDistance(750, totalMs, pathTotal)).toBeCloseTo(375);
    expect(beamHeadDistance(1000, totalMs, pathTotal)).toBeCloseTo(500);
  });

  it('the last 10 percent of time covers 10 percent of distance (no deceleration)', () => {
    const at90 = beamHeadDistance(900, totalMs, pathTotal);
    const at100 = beamHeadDistance(1000, totalMs, pathTotal);
    expect(at100 - at90).toBeCloseTo(pathTotal * 0.1);
  });

  it('clamps to pathTotal past the end, never overshoots', () => {
    expect(beamHeadDistance(1500, totalMs, pathTotal)).toBe(pathTotal);
  });

  it('totalMs <= 0 returns pathTotal immediately (guards a degenerate path)', () => {
    expect(beamHeadDistance(0, 0, pathTotal)).toBe(pathTotal);
  });
});

describe('[P4a-1/3] beamAnimation.ts does not call easeOut3 and uses beamTravelMs and beamHeadDistance', () => {
  const beamSrc = fs.readFileSync(
    path.resolve(__dirname, '../../../src/game/engagement/beamAnimation.ts'),
    'utf8',
  );

  it('never calls easeOut3(...)', () => {
    expect(beamSrc).not.toMatch(/easeOut3\(/);
  });

  it('does not re-introduce the old 300/1200 clamp', () => {
    expect(beamSrc).not.toMatch(/Math\.min\(1200/);
    expect(beamSrc).not.toMatch(/Math\.max\(300/);
  });

  it('calls beamTravelMs to compute totalMs', () => {
    expect(beamSrc).toMatch(/totalMs = beamTravelMs\(/);
  });

  it('calls beamHeadDistance to compute the head position each tick', () => {
    expect(beamSrc).toMatch(/beamHeadDistance\(/);
  });

  it('still exports easeOut3 from constants.ts (P4a-1: the export MAY remain)', () => {
    const constantsSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/game/engagement/constants.ts'),
      'utf8',
    );
    expect(constantsSrc).toMatch(/export const easeOut3/);
  });
});
