// Pure math helpers for the Codex field simulation. Kept in a separate
// module (no JSX, no React Native imports) so unit tests can import
// them without pulling in react-native-svg or other native peers.

export const SIM_W = 326;
export const SIM_H = 140;

export function getCell(col: number, row: number, cols: number, rows: number) {
  const CELL = Math.min(Math.floor((SIM_W - 32) / cols), Math.floor((SIM_H - 24) / rows));
  const ox = (SIM_W - cols * CELL) / 2;
  const oy = (SIM_H - rows * CELL) / 2;
  return { x: ox + col * CELL + CELL / 2, y: oy + row * CELL + CELL / 2, r: CELL };
}

export function interpPath(
  waypoints: { x: number; y: number }[],
  tVal: number,
  tEnd: number,
) {
  const p = Math.min(tVal / tEnd, 1);
  const seg = p * (waypoints.length - 1);
  const i = Math.min(Math.floor(seg), waypoints.length - 2);
  const frac = seg - i;
  return {
    x: waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * frac,
    y: waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * frac,
  };
}

export function cumulativeDistances(waypoints: { x: number; y: number }[]): number[] {
  const out = [0];
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
    out.push(total);
  }
  return out;
}

export function posAlongChain(
  waypoints: { x: number; y: number }[],
  progress: number,
): { x: number; y: number; reachedIndex: number } {
  if (waypoints.length === 0) return { x: 0, y: 0, reachedIndex: -1 };
  if (waypoints.length === 1) return { ...waypoints[0], reachedIndex: 0 };
  const dists = cumulativeDistances(waypoints);
  const total = dists[dists.length - 1];
  const target = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 1; i < waypoints.length; i++) {
    if (target <= dists[i]) {
      const segLen = dists[i] - dists[i - 1];
      const frac = segLen > 0 ? (target - dists[i - 1]) / segLen : 0;
      return {
        x: waypoints[i - 1].x + (waypoints[i].x - waypoints[i - 1].x) * frac,
        y: waypoints[i - 1].y + (waypoints[i].y - waypoints[i - 1].y) * frac,
        reachedIndex: i - 1,
      };
    }
  }
  const last = waypoints[waypoints.length - 1];
  return { x: last.x, y: last.y, reachedIndex: waypoints.length - 1 };
}

export type Phase = 'charge' | 'beam' | 'lock' | 'pause';

export const PHYSICS_CYCLE_MS = 1700;

export const CHARGE_END = 200 / PHYSICS_CYCLE_MS;
export const BEAM_END = 1000 / PHYSICS_CYCLE_MS;
export const LOCK_END = 1300 / PHYSICS_CYCLE_MS;

export function computePhase(t: number): { phase: Phase; progress: number } {
  if (t < CHARGE_END) return { phase: 'charge', progress: t / CHARGE_END };
  if (t < BEAM_END) return { phase: 'beam', progress: (t - CHARGE_END) / (BEAM_END - CHARGE_END) };
  if (t < LOCK_END) return { phase: 'lock', progress: (t - BEAM_END) / (LOCK_END - BEAM_END) };
  return { phase: 'pause', progress: (t - LOCK_END) / (1 - LOCK_END) };
}
