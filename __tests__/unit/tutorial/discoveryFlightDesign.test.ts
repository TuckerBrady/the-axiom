// AXM-031 design spec (DESIGN/AXM-031-cogs-discovery-flight, Tucker-approved
// 2026-09-26): the look and motion of the discovery flight. Pierce's
// behaviour tests live in discoveryFlight.test.ts and
// TutorialHUDOverlayDiscoveryFlight.test.ts.

import * as fs from 'fs';
import * as path from 'path';
import {
  arcControlPoint, overshootPoint, planFlight, flightPointAt, lookOffset, captionDelayMs,
  codexDockPoint, cubicBezier,
  FLIGHT_ZIP_MS, FLIGHT_SETTLE_MS, DISCOVERY_FLIGHT_MS, CODEX_SLIDE_MS, COLLECT_CROSSFADE_MS,
  PERCH_EDGE, PERCH_NAV_HEIGHT,
} from '../../../src/game/discoveryFlight';

const B = { screenW: 360, screenH: 640 };
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('[DR-1] arc control point', () => {
  it('sits on the perpendicular bisector at 0.35 x the distance', () => {
    const from = { x: 180, y: 320 };
    const to = { x: 180, y: 520 };
    const c = arcControlPoint(from, to, B)!;
    expect(c.y).toBeCloseTo(420);
    expect(Math.abs(c.x - 180)).toBeCloseTo(0.35 * 200);
  });

  it('bows toward the side with more room to the screen edge', () => {
    // A vertical flight near the left edge: the right side has more room.
    const c = arcControlPoint({ x: 60, y: 200 }, { x: 60, y: 400 }, B)!;
    expect(c.x).toBeGreaterThan(60);
    // Near the right edge: bows left.
    const d = arcControlPoint({ x: 300, y: 200 }, { x: 300, y: 400 }, B)!;
    expect(d.x).toBeLessThan(300);
  });

  it('ties go left', () => {
    const c = arcControlPoint({ x: 180, y: 200 }, { x: 180, y: 440 }, B)!;
    expect(c.x).toBeLessThan(180);
  });

  it('flies straight under 48dp', () => {
    expect(arcControlPoint({ x: 100, y: 100 }, { x: 130, y: 130 }, B)).toBeNull();
  });
});

describe('[DR-2] overshoot and timing', () => {
  it('overshoots 6dp past the perch along the arrival direction', () => {
    const from = { x: 180, y: 100 };
    const to = { x: 180, y: 300 };
    const o = overshootPoint(from, null, to, B);
    expect(o).toEqual({ x: 180, y: 306 });
  });

  it('clamps the overshoot inside the perch margins', () => {
    const o = overshootPoint({ x: 180, y: 300 }, null, { x: 355, y: 300 }, B);
    expect(o.x).toBe(B.screenW - PERCH_EDGE - 12);
    const p = overshootPoint({ x: 180, y: 300 }, null, { x: 180, y: 640 }, B);
    expect(p.y).toBe(B.screenH - PERCH_NAV_HEIGHT - PERCH_EDGE - 12);
  });

  it('the two segments sum to 600ms, 480 then 120', () => {
    expect(FLIGHT_ZIP_MS).toBe(480);
    expect(FLIGHT_SETTLE_MS).toBe(120);
    expect(FLIGHT_ZIP_MS + FLIGHT_SETTLE_MS).toBe(DISCOVERY_FLIGHT_MS);
  });

  it('starts at the start, reaches the overshoot at 480ms, and lands on the perch', () => {
    const path = planFlight({ x: 180, y: 320 }, { x: 180, y: 520 }, B);
    expect(dist(flightPointAt(path, 0), path.from)).toBeLessThan(0.01);
    expect(dist(flightPointAt(path, FLIGHT_ZIP_MS / DISCOVERY_FLIGHT_MS), path.overshoot)).toBeLessThan(0.01);
    expect(dist(flightPointAt(path, 1), path.to)).toBeLessThan(0.01);
    expect(dist(path.overshoot, path.to)).toBeCloseTo(6);
  });

  it('never strays more than 6dp past the perch during the settle', () => {
    const path = planFlight({ x: 180, y: 320 }, { x: 60, y: 520 }, B);
    for (let t = 0.8; t <= 1; t += 0.02) {
      expect(dist(flightPointAt(path, t), path.to)).toBeLessThanOrEqual(6.0001);
    }
  });

  it('the zip easing starts fast (cubic-bezier(0.2, 0, 0, 1))', () => {
    const zip = cubicBezier(0.2, 0, 0, 1);
    expect(zip(0.25)).toBeGreaterThan(0.5);
    expect(zip(1)).toBe(1);
  });
});

describe('[DR-6, DR-7] the look', () => {
  it('leans 3dp toward the target centre', () => {
    const o = lookOffset({ x: 100, y: 100 }, { x: 100, y: 200 });
    expect(o.x).toBeCloseTo(0);
    expect(o.y).toBeCloseTo(3);
    const d = lookOffset({ x: 0, y: 0 }, { x: 30, y: 40 });
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(3);
  });

  it("the '???' starts 400ms after landing, at once under reduced motion", () => {
    expect(captionDelayMs(false)).toBe(400);
    expect(captionDelayMs(true)).toBe(0);
  });
});

describe('[DR-9] Codex dock', () => {
  it('docks 28dp in from the panel top-right', () => {
    expect(codexDockPoint({ left: 0, top: 0, width: 360, height: 640 })).toEqual({ x: 332, y: 28 });
  });
  it('rides the 600ms slide', () => { expect(CODEX_SLIDE_MS).toBe(600); });
});

describe('overlay source contracts (DR-9 to DR-11)', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../../src/components/TutorialHUDOverlay.tsx'), 'utf8');

  it('[DR-9, DR-10] one orb host, raised above the Codex (250) while docked', () => {
    expect((src.match(/left:\s*orbX\b/g) ?? []).length).toBe(1);
    expect(src).toMatch(/zIndex: orbDocked \? 260 : 200/);
    expect(src).toMatch(/elevation: orbDocked \? 260 : 0/);
  });

  it('[DR-11] every orbCollectAnim crossfade is 600ms', () => {
    expect(COLLECT_CROSSFADE_MS).toBe(600);
    const calls = src.match(/Animated\.timing\(orbCollectAnim,[^}]*\}/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) expect(c).toMatch(/duration:\s*COLLECT_CROSSFADE_MS/);
  });

  it('[DR-11] filing happens on UNDERSTOOD, not on the tap that opens the Codex', () => {
    const primary = src.slice(src.indexOf('const handlePrimary = useCallback'), src.indexOf('const handleSkip = useCallback'));
    expect(primary).not.toMatch(/orbCollectAnim/);
    const understood = src.slice(src.indexOf('const handleCodexUnderstood = useCallback'), src.indexOf('// Advance when the matching piece type is placed'));
    expect(understood).toMatch(/toValue: 1,\s*duration: COLLECT_CROSSFADE_MS/);
  });
});
