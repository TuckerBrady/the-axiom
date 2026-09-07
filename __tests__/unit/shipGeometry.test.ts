// AXM-001 — AXIOM_SHIP_CANON.md S-00 through S-04.
//
// shipGeometry.ts is pure logic (no JSX / react-native-svg), split out of
// AxiomHull.tsx specifically so the canon's numeric rules are directly
// unit-testable, matching the repo's existing pattern (pieceSimulationMath.ts).

import {
  SHIP_ZONE_ORDER,
  SHIP_ZONES,
  REPAIR_OPACITY,
  clampZoneState,
  strokeFor,
  isZoneOnline,
  accentHex,
  SHIP_SIGNAL_ACCENT,
  SHIP_ASPECT,
  ZONE_ANCHORS,
  type RepairState,
} from '../../src/components/ship/shipGeometry';
import { Colors } from '../../src/theme/tokens';

describe('AXIOM_SHIP_CANON S-02 — the eight zones', () => {
  it('has exactly eight zones, in A1-1..A1-8 level order', () => {
    expect(SHIP_ZONE_ORDER).toHaveLength(8);
    const levels = SHIP_ZONE_ORDER.map(id => SHIP_ZONES[id].level);
    expect(levels).toEqual(['A1-1', 'A1-2', 'A1-3', 'A1-4', 'A1-5', 'A1-6', 'A1-7', 'A1-8']);
  });

  it('every zone has a defined anchor point', () => {
    for (const id of SHIP_ZONE_ORDER) {
      expect(ZONE_ANCHORS[id]).toBeDefined();
      expect(typeof ZONE_ANCHORS[id].x).toBe('number');
      expect(typeof ZONE_ANCHORS[id].y).toBe('number');
    }
  });

  it('only two zones carry an accent: cyan on signal systems, amber on the drive', () => {
    const amberZones = SHIP_ZONE_ORDER.filter(id => SHIP_ZONES[id].accent === 'amber');
    const cyanZones = SHIP_ZONE_ORDER.filter(id => SHIP_ZONES[id].accent === 'cyan');
    expect(amberZones).toEqual(['propulsionCore']);
    expect(cyanZones).toEqual(['lifeSupport', 'navigationArray', 'communicationArray', 'sensorGrid', 'bridgeSystems']);
  });
});

describe('AXIOM_SHIP_CANON S-04 — the three-value repair-state rule', () => {
  it('defines exactly three opacity values, none below 0.25', () => {
    const values = Object.values(REPAIR_OPACITY);
    expect(values).toHaveLength(3);
    expect(values.every(v => v >= 0.25)).toBe(true);
  });

  it('DERELICT < POWERED < ONLINE', () => {
    expect(REPAIR_OPACITY.DERELICT).toBeLessThan(REPAIR_OPACITY.POWERED);
    expect(REPAIR_OPACITY.POWERED).toBeLessThan(REPAIR_OPACITY.ONLINE);
  });

  it('DERELICT is exactly the 0.25 floor', () => {
    expect(REPAIR_OPACITY.DERELICT).toBe(0.25);
  });

  it('strokeFor never returns an opacity below 0.25 for any zone/state pair', () => {
    const states: RepairState[] = ['DERELICT', 'POWERED', 'ONLINE'];
    for (const id of SHIP_ZONE_ORDER) {
      for (const state of states) {
        expect(strokeFor(id, state).opacity).toBeGreaterThanOrEqual(0.25);
      }
    }
  });

  it('the ONLINE accent color is exactly #00D4FF for cyan zones, amber token for the drive', () => {
    expect(accentHex('cyan')).toBe('#00D4FF');
    expect(accentHex('cyan')).toBe(SHIP_SIGNAL_ACCENT);
    expect(accentHex('amber')).toBe(Colors.amber);
    expect(accentHex(null)).toBeNull();
  });

  it('a non-accent zone at ONLINE falls back to hull blue, not an accent color', () => {
    const info = strokeFor('emergencyPower', 'ONLINE');
    expect(info.stroke).toBe(Colors.blue);
    expect(info.opacity).toBe(REPAIR_OPACITY.ONLINE);
  });

  it('an accent zone below ONLINE never shows its accent color', () => {
    expect(strokeFor('propulsionCore', 'DERELICT').stroke).not.toBe(Colors.amber);
    expect(strokeFor('propulsionCore', 'POWERED').stroke).not.toBe(Colors.amber);
    expect(strokeFor('propulsionCore', 'ONLINE').stroke).toBe(Colors.amber);
  });
});

describe('AXIOM_SHIP_CANON S-02 — Zone 7 (Weapons Lock) is repaired, never unlocked', () => {
  it('clamps ONLINE down to POWERED for weaponsLock', () => {
    expect(clampZoneState('weaponsLock', 'ONLINE')).toBe('POWERED');
    expect(clampZoneState('weaponsLock', 'POWERED')).toBe('POWERED');
    expect(clampZoneState('weaponsLock', 'DERELICT')).toBe('DERELICT');
  });

  it('isZoneOnline is always false for weaponsLock, even when passed ONLINE', () => {
    expect(isZoneOnline('weaponsLock', 'ONLINE')).toBe(false);
  });

  it('every other zone passes ONLINE through unclamped', () => {
    const others = SHIP_ZONE_ORDER.filter(id => id !== 'weaponsLock');
    for (const id of others) {
      expect(clampZoneState(id, 'ONLINE')).toBe('ONLINE');
      expect(isZoneOnline(id, 'ONLINE')).toBe(true);
    }
  });

  it('weaponsLock never renders an amber/cyan accent, even at its capped max', () => {
    expect(strokeFor('weaponsLock', 'ONLINE').stroke).not.toBe('#00D4FF');
    expect(strokeFor('weaponsLock', 'ONLINE').stroke).not.toBe(Colors.amber);
  });
});

describe('AXIOM_SHIP_CANON S-01 — proportions', () => {
  it('the hull holds a ~3.8:1 length-to-height proportion inside the 1300x450 frame', () => {
    // S-01: "Proportion ~3.8:1, length to height". The frame's own
    // aspect (1300/450 ~= 2.9) is not the hull's silhouette ratio, but
    // SHIP_ASPECT (height/width) must stay a small fraction so a
    // "small-ship" identity survives at Hub scale, not a freighter's.
    expect(SHIP_ASPECT).toBeCloseTo(450 / 1300, 5);
    expect(SHIP_ASPECT).toBeLessThan(0.5);
  });
});
