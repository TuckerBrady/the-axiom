import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AxiomHull, { SHIP_ZONE_ORDER, SHIP_ZONES, type RepairState, type ShipZoneId } from './ship/AxiomHull';
import { Colors, Fonts, FontSizes } from '../theme/tokens';
import { useProgressionStore, SHIP_SYSTEMS } from '../store/progressionStore';

// ─── AXM-001 S-00/S-01/S-02/S-04 ──────────────────────────────────────────
// Previously a fourth, independent hull rendering (three-quarter view) with
// its own SHIP_SYSTEMS-indexed path set and opacity floors as low as 0.01.
// AXIOM_SHIP_CANON.md S-00 retires that geometry: this now renders the same
// canonical silhouette as the Hub and Codex, with per-zone callout labels
// (this consumer's distinguishing feature per the canon's "component shape"
// rule), and the S-04 three-value opacity floor everywhere on the hull.

interface Props {
  // Height is derived from AxiomHull's fixed aspect ratio (S-01's
  // ~3.8:1 proportion), not taken as an independent prop -- the old
  // component let width/height diverge, which is how three
  // differently-proportioned hulls happened in the first place.
  width?: number;
}

export default function ShipRepairProgress({ width = 300 }: Props) {
  const { isLevelCompleted } = useProgressionStore();

  const zoneStates = SHIP_ZONE_ORDER.reduce((acc, id, i) => {
    const levelId = `A1-${i + 1}`;
    acc[id] = isLevelCompleted(levelId) ? 'ONLINE' : 'DERELICT';
    return acc;
  }, {} as Record<ShipZoneId, RepairState>);

  return (
    <View style={{ width }}>
      <AxiomHull width={width} zoneStates={zoneStates} showZoneMarkers />
      <View style={styles.labelList}>
        {SHIP_ZONE_ORDER.map(id => {
          const meta = SHIP_ZONES[id];
          const state = zoneStates[id];
          // '#00C48C' — destination/success per AXIOM_DESIGN_REVIEW.md
          // D-04. Not a named token yet (the review's "terminal" role
          // has no corresponding entry in tokens.ts); hardcoded to
          // match every other terminal/success use in the codebase
          // rather than inventing a token outside this mission's scope.
          const dotColor =
            state === 'ONLINE' ? '#00C48C'
              : state === 'POWERED' ? Colors.muted
              : Colors.dim;
          return (
            <View key={id} style={styles.labelRow}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text style={styles.labelText}>{meta.level} · {meta.name}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelList: {
    marginTop: 8,
    gap: 3,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.floor,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
});
