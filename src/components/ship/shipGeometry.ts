import { Colors } from '../../theme/tokens';

// ─── AXM-001 S-00/S-01/S-02/S-04 — The Axiom, canonical geometry data ────────
//
// Pure logic and constants only (no JSX, no react-native-svg import) so this
// module can be unit-tested directly, matching the repo's existing pattern
// of splitting math/data out of SVG-rendering components (see
// pieceSimulationMath.ts). AxiomHull.tsx is the only consumer of the JSX
// rendering side; every zone-state rule lives here so Hub, Repair Progress,
// and Codex all evaluate it identically.

export const SHIP_VIEWBOX_W = 1300;
export const SHIP_VIEWBOX_H = 450;
export const SHIP_VIEWBOX = `0 0 ${SHIP_VIEWBOX_W} ${SHIP_VIEWBOX_H}`;
export const SHIP_ASPECT = SHIP_VIEWBOX_H / SHIP_VIEWBOX_W;

// ─── S-04 — the three-value repair-state rule ────────────────────────────────

export type RepairState = 'DERELICT' | 'POWERED' | 'ONLINE';

// Never render any hull stroke below 0.25. Three fixed values, no
// per-zone tuning.
export const REPAIR_OPACITY: Record<RepairState, number> = {
  DERELICT: 0.25,
  POWERED: 0.55,
  ONLINE: 0.90,
};

// ─── S-02 — the eight zones, in level order (A1-1 .. A1-8) ──────────────────

export type ShipZoneId =
  | 'emergencyPower'
  | 'lifeSupport'
  | 'navigationArray'
  | 'propulsionCore'
  | 'communicationArray'
  | 'sensorGrid'
  | 'weaponsLock'
  | 'bridgeSystems';

export const SHIP_ZONE_ORDER: ShipZoneId[] = [
  'emergencyPower',
  'lifeSupport',
  'navigationArray',
  'propulsionCore',
  'communicationArray',
  'sensorGrid',
  'weaponsLock',
  'bridgeSystems',
];

export interface ShipZoneMeta {
  level: string;
  name: string;
  // Only two accents ever light on the hull: cyan on signal systems,
  // amber on the drive. Everything else never accents at ONLINE.
  accent: 'cyan' | 'amber' | null;
  // Zone 7 (Weapons Lock) reaches POWERED and never ONLINE — repaired,
  // never unlocked (AXIOM_SHIP_CANON.md S-02).
  maxState: RepairState;
}

export const SHIP_ZONES: Record<ShipZoneId, ShipZoneMeta> = {
  emergencyPower: { level: 'A1-1', name: 'Emergency Power', accent: null, maxState: 'ONLINE' },
  lifeSupport: { level: 'A1-2', name: 'Life Support', accent: 'cyan', maxState: 'ONLINE' },
  navigationArray: { level: 'A1-3', name: 'Navigation Array', accent: 'cyan', maxState: 'ONLINE' },
  propulsionCore: { level: 'A1-4', name: 'Propulsion Core', accent: 'amber', maxState: 'ONLINE' },
  communicationArray: { level: 'A1-5', name: 'Communication Array', accent: 'cyan', maxState: 'ONLINE' },
  sensorGrid: { level: 'A1-6', name: 'Sensor Grid', accent: 'cyan', maxState: 'ONLINE' },
  weaponsLock: { level: 'A1-7', name: 'Weapons Lock', accent: null, maxState: 'POWERED' },
  bridgeSystems: { level: 'A1-8', name: 'Bridge Systems', accent: 'cyan', maxState: 'ONLINE' },
};

// Zone 7 never reaches ONLINE — clamp defensively so a caller passing
// live save data (which has no concept of "capped") can't light it.
export function clampZoneState(id: ShipZoneId, state: RepairState): RepairState {
  const meta = SHIP_ZONES[id];
  if (meta.maxState === 'POWERED' && state === 'ONLINE') return 'POWERED';
  return state;
}

// AXIOM_SHIP_CANON.md S-04 pins the signal-system accent to the exact
// hex #00D4FF (the same "protocol beam" cyan reserved in
// AXIOM_DESIGN_REVIEW.md D-03/D-04). Not `Colors.neonCyan` -- that
// token holds a different value (#00E5FF) used elsewhere in the app;
// changing it is outside this mission's scope (see the AXM-001
// process note), so the ship's accent is pinned directly.
export const SHIP_SIGNAL_ACCENT = '#00D4FF';

export function accentHex(accent: 'cyan' | 'amber' | null): string | null {
  if (accent === 'cyan') return SHIP_SIGNAL_ACCENT;
  if (accent === 'amber') return Colors.amber;
  return null;
}

export function strokeFor(id: ShipZoneId, state: RepairState): { stroke: string; opacity: number } {
  const meta = SHIP_ZONES[id];
  const clamped = clampZoneState(id, state);
  const opacity = REPAIR_OPACITY[clamped];
  const accent = clamped === 'ONLINE' ? accentHex(meta.accent) : null;
  return { stroke: accent ?? Colors.blue, opacity };
}

export function isZoneOnline(id: ShipZoneId, state: RepairState): boolean {
  return clampZoneState(id, state) === 'ONLINE';
}

// Anchor points used for Repair Progress callout labels (showZoneMarkers).
export const ZONE_ANCHORS: Record<ShipZoneId, { x: number; y: number }> = {
  emergencyPower: { x: 321, y: 328 },
  lifeSupport: { x: 480, y: 340 },
  navigationArray: { x: 960, y: 195 },
  propulsionCore: { x: 136, y: 250 },
  communicationArray: { x: 509, y: 190 },
  sensorGrid: { x: 1073, y: 250 },
  weaponsLock: { x: 850, y: 303 },
  bridgeSystems: { x: 837, y: 192 },
};
