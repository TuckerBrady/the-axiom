import type { Pt, SignalPath, Segment, AnimMapEntry } from './types';

export function buildSignalPath(points: Pt[]): SignalPath {
  const segs: Segment[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const l = Math.sqrt(dx * dx + dy * dy);
    segs.push({ s: total, e: total + l, l, dx, dy, x0: points[i - 1].x, y0: points[i - 1].y });
    total += l;
  }
  return { segs, total };
}

export function posAlongPath(path: SignalPath, d: number): Pt {
  d = Math.max(0, Math.min(d, path.total));
  for (const seg of path.segs) {
    if (d <= seg.e) {
      const t = seg.l > 0 ? (d - seg.s) / seg.l : 0;
      return { x: seg.x0 + seg.dx * t, y: seg.y0 + seg.dy * t };
    }
  }
  const last = path.segs[path.segs.length - 1];
  return last ? { x: last.x0 + last.dx, y: last.y0 + last.dy } : { x: 0, y: 0 };
}

export const easeOut3 = (t: number): number => 1 - Math.pow(1 - t, 3);

export function getBeamColor(pieceType: string): string {
  switch (pieceType) {
    case 'source':
    case 'terminal':
      return '#8B5CF6';
    case 'conveyor':
    case 'gear':
    case 'splitter':
      return '#F0B429';
    case 'scanner':
    case 'configNode':
    case 'config_node':
    case 'transmitter':
      return '#00D4FF';
    default:
      return '#F0B429';
  }
}

export const animMap: Record<string, AnimMapEntry> = {
  source: { tag: 'charging', duration: 280 },
  terminal: { tag: 'locking', duration: 400 },
  conveyor: { tag: 'rolling', duration: 180 },
  gear: { tag: 'spinning', duration: 400 },
  splitter: { tag: 'splitting', duration: 180 },
  scanner: { tag: 'scanning', duration: 200 },
  configNode: { tag: 'gating', duration: 300 },
  transmitter: { tag: 'transmitting', duration: 180 },
};

export const TAPE_PIECE_COLORS: Record<string, string> = {
  scanner: '#00E5FF',
  configNode: '#00FF87',
  transmitter: '#FFE000',
};

// AXM-036 P4a (F4) — constant-speed beam travel. Replaces the old
// per-path clamp (Math.max(300, Math.min(1200, 480 * (path.total /
// refLen)))): every cell of travel now costs the same time, at any
// path length. See beamData.ts (beamTravelMs) and
// docs/ANIMATION_RULES.md "Updates".
export const BEAM_MS_PER_CELL = 75;

// AXM-036 P4a (F13b) — data-carrying beam shimmer. No new colour
// values: a data segment renders in the same amber/blue/violet
// palette as getBeamColor() always has, with an added underlay glow
// and a subtle opacity pulse layered on top.
export const SHIMMER_PERIOD_MS = 600;
export const DATA_GLOW_WIDTH_MULT = 2.5;
export const DATA_GLOW_OPACITY_MAX = 0.30;
export const DATA_TRAIL_OPACITY_MIN_FACTOR = 0.70;

// shimmer(tMs) in [0, 1], period SHIMMER_PERIOD_MS. Driven off the
// existing RAF tick clock (performance.now() inside runLinearPath) —
// no new Animated.Value, so REQ-A holds trivially (P4a-9).
export function shimmer(tMs: number): number {
  return 0.5 + 0.5 * Math.sin((2 * Math.PI * tMs) / SHIMMER_PERIOD_MS);
}

// AXM-036 P4b (F13 a, c) — bit-travel duration for a single leg (IN to
// Scanner, Scanner to TRAIL, Transmitter to OUT), before the per-pulse
// speed multiplier (getPulseSpeed). 600ms is Design Principle 4's
// cinematic-animation minimum.
export const BIT_TRAVEL_MS = 600;
