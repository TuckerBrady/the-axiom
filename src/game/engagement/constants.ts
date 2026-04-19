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
