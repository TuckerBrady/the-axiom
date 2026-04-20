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

// ── Protocol sim phase machine ───────────────────────────────────────────
// Protocol pieces (Config Node, Scanner, Transmitter) interact with tapes
// mid-pulse, so their sim cycle pauses at the piece between beam-pre and
// beam-post. Total 2100ms.

export type ProtocolPhase =
  | 'charge'
  | 'beam-pre'
  | 'interact'
  | 'beam-post'
  | 'lock'
  | 'pause';

export const PROTOCOL_CYCLE_MS = 2100;

// Phase boundaries as fractions of the total cycle.
export const P_CHARGE_END = 200 / PROTOCOL_CYCLE_MS;      // ~0.0952
export const P_BEAM_PRE_END = 600 / PROTOCOL_CYCLE_MS;    // ~0.2857
export const P_INTERACT_END = 1000 / PROTOCOL_CYCLE_MS;   // ~0.4762
export const P_BEAM_POST_END = 1400 / PROTOCOL_CYCLE_MS;  // ~0.6667
export const P_LOCK_END = 1700 / PROTOCOL_CYCLE_MS;       // ~0.8095

export function computeProtocolPhase(
  t: number,
): { phase: ProtocolPhase; progress: number } {
  if (t < P_CHARGE_END) {
    return { phase: 'charge', progress: t / P_CHARGE_END };
  }
  if (t < P_BEAM_PRE_END) {
    return {
      phase: 'beam-pre',
      progress: (t - P_CHARGE_END) / (P_BEAM_PRE_END - P_CHARGE_END),
    };
  }
  if (t < P_INTERACT_END) {
    return {
      phase: 'interact',
      progress: (t - P_BEAM_PRE_END) / (P_INTERACT_END - P_BEAM_PRE_END),
    };
  }
  if (t < P_BEAM_POST_END) {
    return {
      phase: 'beam-post',
      progress: (t - P_INTERACT_END) / (P_BEAM_POST_END - P_INTERACT_END),
    };
  }
  if (t < P_LOCK_END) {
    return {
      phase: 'lock',
      progress: (t - P_BEAM_POST_END) / (P_LOCK_END - P_BEAM_POST_END),
    };
  }
  return { phase: 'pause', progress: (t - P_LOCK_END) / (1 - P_LOCK_END) };
}

// Config Node alternates PASS / BLOCK on each loop to teach both
// outcomes. Shared here so tests can assert on the predicate.
export function configNodeMode(loopCount: number): 'pass' | 'block' {
  return loopCount % 2 === 0 ? 'pass' : 'block';
}

