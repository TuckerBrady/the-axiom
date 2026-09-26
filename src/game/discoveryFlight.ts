// AXM-031 — COGS discovery flight. When COGS meets something he doesn't
// recognise he zips over to it, peers at it, and then the '???' shows.
// Behaviour: SPEC_COGS_DISCOVERY_FLIGHT v1.1 (Pierce). Look and motion:
// DESIGN/AXM-031-cogs-discovery-flight DESIGN_SPEC (Tucker-approved).
// Everything here is pure: no Dimensions, refs or state.

import type { PieceType, TutorialStep } from './types';

// ── Constants (spec 3.1, 3.2) ──────────────────────────────────────────────
export const PERCH_ORB_SIZE = 24;
export const PERCH_GAP = 8;
export const PERCH_CLEARANCE = 4;
export const PERCH_EDGE = 8;
export const PERCH_NAV_HEIGHT = 64;
export const DISCOVERY_FLIGHT_MS = 600;
export const DISCOVERY_FLIGHT_BEZIER = [0.4, 0, 0.2, 1] as const;

// Design DR-1, DR-2: arc plus zip. One 600ms timeline, split 480 / 120.
export const FLIGHT_ARC_BOW = 0.35;
export const FLIGHT_STRAIGHT_UNDER = 48;
export const FLIGHT_OVERSHOOT = 6;
export const FLIGHT_ZIP_MS = 480;
export const FLIGHT_SETTLE_MS = DISCOVERY_FLIGHT_MS - FLIGHT_ZIP_MS;
export const FLIGHT_ZIP_BEZIER = [0.2, 0, 0, 1] as const;

// Design DR-6, DR-7: the arrival look.
export const LOOK_OFFSET = 3;
export const LOOK_IN_MS = 150;
export const LOOK_HOLD_MS = 250;
export const LOOK_OUT_MS = 150;
export const CAPTION_AFTER_LANDING_MS = LOOK_IN_MS + LOOK_HOLD_MS;

// Design DR-9: the Codex dock, from the panel's top-right corner.
export const CODEX_DOCK_INSET = 28;
// Design DR-11, spec 11.1: the Codex slide and the filing crossfade.
export const CODEX_SLIDE_MS = 600;
export const COLLECT_CROSSFADE_MS = 600;
// Spec 10.2: the reduced-motion fade, each way.
export const REDUCED_MOTION_FADE_MS = 150;

export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; width: number; height: number };
export type PerchSide = 'toward' | 'away' | 'right' | 'left' | 'center';
export type Perch = { cx: number; cy: number; side: PerchSide };

// ── Step predicates (spec 1.1 to 1.3) ─────────────────────────────────────
export function isDiscoveryStep(step: TutorialStep | undefined): boolean {
  if (!step) return false;
  if (step.captionLabel !== '???' || !step.codexEntryId || step.allowPieceTap) return false;
  if (step.targetPiece) return true;
  return step.targetRef !== 'center' && step.targetRef !== 'boardGrid';
}

export function isRevealStep(steps: ReadonlyArray<TutorialStep>, i: number): boolean {
  if (i <= 0) return false;
  const prev = steps[i - 1];
  const s = steps[i];
  if (!s || !isDiscoveryStep(prev)) return false;
  return s.targetRef === prev.targetRef &&
    s.targetPiece === prev.targetPiece &&
    !!s.captionLabel && s.captionLabel !== '???';
}

export function isPerchStep(steps: ReadonlyArray<TutorialStep>, i: number): boolean {
  return isDiscoveryStep(steps[i]) || isRevealStep(steps, i);
}

// ── Perch (spec 3.2) ──────────────────────────────────────────────────────
const HALF = PERCH_ORB_SIZE / 2;

function orbRect(cx: number, cy: number): Rect {
  return { left: cx - HALF, top: cy - HALF, width: PERCH_ORB_SIZE, height: PERCH_ORB_SIZE };
}

function inflate(r: Rect, by: number): Rect {
  return { left: r.left - by, top: r.top - by, width: r.width + by * 2, height: r.height + by * 2 };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.left + b.width && b.left < a.left + a.width &&
    a.top < b.top + b.height && b.top < a.top + a.height;
}

export function computeDiscoveryPerch(args: {
  target: Rect;
  caption: Rect | null;
  callout: Rect;
  screenW: number;
  screenH: number;
}): Perch {
  const { target, caption, callout, screenW, screenH } = args;
  const tcx = target.left + target.width / 2;
  const tcy = target.top + target.height / 2;
  const clampX = (x: number) => Math.max(PERCH_EDGE + HALF, Math.min(x, screenW - PERCH_EDGE - HALF));

  const above = { cx: clampX(tcx), cy: (caption ? caption.top : target.top) - PERCH_GAP - HALF };
  const below = { cx: clampX(tcx), cy: target.top + target.height + PERCH_GAP + HALF };
  const calloutAbove = callout.top + callout.height / 2 < tcy;
  const candidates: Perch[] = [
    { ...(calloutAbove ? above : below), side: 'toward' },
    { ...(calloutAbove ? below : above), side: 'away' },
    { cx: target.left + target.width + PERCH_GAP + HALF, cy: tcy, side: 'right' },
    { cx: target.left - PERCH_GAP - HALF, cy: tcy, side: 'left' },
  ];

  const obstacles = [target, caption, callout]
    .filter((r): r is Rect => r !== null)
    .map(r => inflate(r, PERCH_CLEARANCE));

  for (const c of candidates) {
    const o = orbRect(c.cx, c.cy);
    const safe = o.left >= PERCH_EDGE && o.top >= PERCH_EDGE &&
      o.left + PERCH_ORB_SIZE <= screenW - PERCH_EDGE &&
      o.top + PERCH_ORB_SIZE <= screenH - PERCH_NAV_HEIGHT - PERCH_EDGE;
    if (safe && !obstacles.some(r => overlaps(o, r))) return c;
  }
  return { cx: screenW / 2, cy: screenH / 2, side: 'center' };
}

// ── Target resolution (spec 7.1, 7.3) ─────────────────────────────────────
export type BoardPieceLike = { type: PieceType; gridX: number; gridY: number; isPrePlaced?: boolean };
export type PieceResolution =
  | { where: 'board'; gridX: number; gridY: number }
  | { where: 'tray'; refKey: string }
  | null;

function rowMajorFirst<T extends BoardPieceLike>(pieces: T[]): T | undefined {
  return [...pieces].sort((a, b) => a.gridY - b.gridY || a.gridX - b.gridX)[0];
}

export function resolveTargetPiece(
  type: PieceType,
  boardPieces: ReadonlyArray<BoardPieceLike>,
  trayTypes: ReadonlyArray<PieceType>,
): PieceResolution {
  const ofType = boardPieces.filter(p => p.type === type);
  const hit = rowMajorFirst(ofType.filter(p => p.isPrePlaced === true)) ??
    rowMajorFirst(ofType.filter(p => p.isPrePlaced !== true));
  if (hit) return { where: 'board', gridX: hit.gridX, gridY: hit.gridY };
  if (trayTypes.includes(type)) {
    return { where: 'tray', refKey: `tray${type.charAt(0).toUpperCase()}${type.slice(1)}` };
  }
  return null;
}

export function boardCellLayout(
  board: { x: number; y: number; width: number; height: number },
  cellSize: number, gridX: number, gridY: number,
): { x: number; y: number; width: number; height: number } {
  return { x: board.x + gridX * cellSize, y: board.y + gridY * cellSize, width: cellSize, height: cellSize };
}

// ── Flight path (design DR-1, DR-2) ───────────────────────────────────────
export type FlightBounds = { screenW: number; screenH: number };

// Cubic-bezier easing, as CSS defines it: solve x(u) = t, return y(u).
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let u = t;
    for (let i = 0; i < 8; i++) {
      const err = sx(u) - t;
      const d = dx(u);
      if (Math.abs(err) < 1e-6 || Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    // Bisection fallback keeps u in range if Newton wandered off.
    if (u < 0 || u > 1 || Math.abs(sx(u) - t) > 1e-4) {
      let lo = 0, hi = 1;
      u = t;
      for (let i = 0; i < 30; i++) {
        if (sx(u) < t) lo = u; else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return sy(u);
  };
}

const zipEase = cubicBezier(...FLIGHT_ZIP_BEZIER);
const settleEase = cubicBezier(...DISCOVERY_FLIGHT_BEZIER);

function room(p: Point, b: FlightBounds): number {
  return Math.min(p.x, b.screenW - p.x, p.y, b.screenH - p.y);
}

// DR-1: the arc's control point, on the perpendicular bisector at 0.35 x the
// distance, bowing to the side with more room to the screen edge (tie: left).
// Null under 48dp: fly straight.
export function arcControlPoint(from: Point, to: Point, bounds: FlightBounds): Point | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < FLIGHT_STRAIGHT_UNDER) return null;
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const nx = -dy / d;
  const ny = dx / d;
  const off = FLIGHT_ARC_BOW * d;
  const a = { x: mid.x + nx * off, y: mid.y + ny * off };
  const b = { x: mid.x - nx * off, y: mid.y - ny * off };
  const ra = room(a, bounds);
  const rb = room(b, bounds);
  if (ra !== rb) return ra > rb ? a : b;
  return a.x <= b.x ? a : b;
}

// DR-2: 6dp past the perch along the arrival direction, clamped inside the
// perch margins.
export function overshootPoint(from: Point, control: Point | null, to: Point, bounds: FlightBounds): Point {
  const src = control ?? from;
  const dx = to.x - src.x;
  const dy = to.y - src.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { ...to };
  const x = to.x + (dx / d) * FLIGHT_OVERSHOOT;
  const y = to.y + (dy / d) * FLIGHT_OVERSHOOT;
  return {
    x: Math.max(PERCH_EDGE + HALF, Math.min(x, bounds.screenW - PERCH_EDGE - HALF)),
    y: Math.max(PERCH_EDGE + HALF, Math.min(y, bounds.screenH - PERCH_NAV_HEIGHT - PERCH_EDGE - HALF)),
  };
}

export type FlightPath = { from: Point; control: Point | null; overshoot: Point; to: Point };

export function planFlight(from: Point, to: Point, bounds: FlightBounds): FlightPath {
  const control = arcControlPoint(from, to, bounds);
  return { from, control, overshoot: overshootPoint(from, control, to, bounds), to };
}

// Where the orb is at linear progress t in [0, 1] of the 600ms timeline:
// 0-480ms zips along the arc to the overshoot point, 480-600ms settles back.
export function flightPointAt(path: FlightPath, t: number): Point {
  const split = FLIGHT_ZIP_MS / DISCOVERY_FLIGHT_MS;
  if (t < split) {
    const u = zipEase(Math.max(0, t) / split);
    const { from, overshoot } = path;
    const c = path.control ?? { x: (from.x + overshoot.x) / 2, y: (from.y + overshoot.y) / 2 };
    const m = 1 - u;
    return {
      x: m * m * from.x + 2 * m * u * c.x + u * u * overshoot.x,
      y: m * m * from.y + 2 * m * u * c.y + u * u * overshoot.y,
    };
  }
  const v = settleEase(Math.min(1, (t - split) / (1 - split)));
  return {
    x: path.overshoot.x + (path.to.x - path.overshoot.x) * v,
    y: path.overshoot.y + (path.to.y - path.overshoot.y) * v,
  };
}

// DR-6: the core's 3dp look toward the target centre.
export function lookOffset(orb: Point, target: Point): Point {
  const dx = target.x - orb.x;
  const dy = target.y - orb.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { x: 0, y: 0 };
  return { x: (dx / d) * LOOK_OFFSET, y: (dy / d) * LOOK_OFFSET };
}

// DR-7: when the '???' starts after landing. Immediately under reduced motion.
export function captionDelayMs(reduceMotion: boolean): number {
  return reduceMotion ? 0 : CAPTION_AFTER_LANDING_MS;
}

// DR-9: the docked orb centre, from the Codex panel's rect.
export function codexDockPoint(panel: Rect): Point {
  return { x: panel.left + panel.width - CODEX_DOCK_INSET, y: panel.top + CODEX_DOCK_INSET };
}
