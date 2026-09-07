import React from 'react';
import { View } from 'react-native';
import AxiomHull, { SHIP_ZONE_ORDER, type RepairState, type ShipZoneId } from '../ship/AxiomHull';

// ─── AXM-001 S-00/S-09 ────────────────────────────────────────────────────
// AxiomShip previously drew its own independent top-down hull with three
// hardcoded colors that had no entry in src/theme/tokens.ts.
// AXIOM_SHIP_CANON.md S-00 retires that geometry: the Hub now renders the
// same canonical silhouette as Repair Progress and Codex, at Hub scale,
// deriving its own on/off/dmg readout into the shared three-value
// repair-state rule.
//
// The public contract (systemStates, width) is unchanged so HubScreen.tsx
// needs no changes beyond this file.

export type SystemLightState = 'on' | 'off' | 'dmg';

interface Props {
  systemStates: [
    SystemLightState, SystemLightState, SystemLightState, SystemLightState,
    SystemLightState, SystemLightState, SystemLightState, SystemLightState,
  ];
  width?: number;
}

// Hub's existing on/off/dmg readout maps onto the ship canon's
// DERELICT/POWERED/ONLINE states: not yet repaired -> DERELICT;
// repaired and clean -> ONLINE; repaired but currently damaged ->
// POWERED (structure fully legible, no glow -- consistent with S-04's
// "repaired, idle" meaning).
function toRepairState(state: SystemLightState): RepairState {
  switch (state) {
    case 'on': return 'ONLINE';
    case 'dmg': return 'POWERED';
    case 'off':
    default:
      return 'DERELICT';
  }
}

/**
 * The Axiom — Hub captain's dashboard rendering. Same canonical hull as
 * ShipRepairProgress and the Codex; only the scale and the live
 * zone states differ, per AXIOM_SHIP_CANON.md's "component shape" rule.
 */
export default function AxiomShip({ systemStates, width = 270 }: Props) {
  const zoneStates = SHIP_ZONE_ORDER.reduce((acc, id, i) => {
    acc[id] = toRepairState(systemStates[i]);
    return acc;
  }, {} as Record<ShipZoneId, RepairState>);

  return (
    <View>
      <AxiomHull width={width} zoneStates={zoneStates} />
    </View>
  );
}
