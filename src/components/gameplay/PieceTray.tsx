import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { PieceIcon } from '../PieceIcon';
import type { PieceType } from '../../game/types';
import { Colors, Fonts } from '../../theme/tokens';

const PIECE_LABELS: Record<PieceType, string> = {
  source: 'IN',
  terminal: 'OUT',
  conveyor: 'CONV',
  gear: 'GEAR',
  splitter: 'SPLIT',
  configNode: 'CFG',
  scanner: 'SCAN',
  transmitter: 'XMIT',
  merger: 'MERGE',
  bridge: 'BRIDGE',
  inverter: 'INV',
  counter: 'CNT',
  latch: 'LATCH',
  obstacle: '',
};

function getPieceColor(type: PieceType): string {
  switch (type) {
    case 'configNode':
    case 'scanner':
    case 'transmitter':
    case 'inverter':
    case 'counter':
    case 'latch':
      return '#8B5CF6';
    default:
      return Colors.blue;
  }
}

export interface TutorialTrayRefs {
  trayConveyor: React.Ref<View>;
  trayGear: React.Ref<View>;
  trayConfigNode: React.Ref<View>;
  traySplitter: React.Ref<View>;
  trayScanner: React.Ref<View>;
  trayTransmitter: React.Ref<View>;
}

interface Props {
  trayPieceTypes: PieceType[];
  availableCounts: Partial<Record<PieceType, number>>;
  selectedPieceFromTray: PieceType | null;
  costs: Partial<Record<PieceType, number>>;
  affordable: Partial<Record<PieceType, boolean>>;
  refs: TutorialTrayRefs;
  onPickup: (type: PieceType | null) => void;
  disabled?: boolean;
}

// React.memo with default shallow comparison. The `refs` prop must be
// memoized in the parent (useMemo) so reference identity is stable
// across renders. Tray is hidden during beam runs (its parent does
// not render it when isExecuting), so it does not re-render at all
// during a beam tick — clause 4.1.5.
function PieceTrayComponent({
  trayPieceTypes,
  availableCounts,
  selectedPieceFromTray,
  costs,
  affordable,
  refs,
  onPickup,
  disabled,
}: Props) {
  return (
    <View style={styles.partsTray}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.partsTrayInner}
      >
        {trayPieceTypes.map(pt => {
          const count = availableCounts[pt] || 0;
          const isActive = selectedPieceFromTray === pt;
          const color = getPieceColor(pt);
          const cost = costs[pt] ?? 0;
          const canAfford = affordable[pt] ?? true;
          const measureRef =
            pt === 'conveyor' ? refs.trayConveyor
            : pt === 'gear' ? refs.trayGear
            : pt === 'configNode' ? refs.trayConfigNode
            : pt === 'splitter' ? refs.traySplitter
            : pt === 'scanner' ? refs.trayScanner
            : pt === 'transmitter' ? refs.trayTransmitter
            : undefined;
          return (
            <View key={pt} ref={measureRef} collapsable={false}>
              <TouchableOpacity
                style={[
                  styles.trayItem,
                  isActive && { borderColor: color, backgroundColor: `${color}15` },
                ]}
                onPress={() => {
                  if (disabled) return;
                  onPickup(isActive ? null : pt);
                }}
                activeOpacity={0.7}
                disabled={disabled || count <= 0}
                accessibilityLabel={`${PIECE_LABELS[pt]}, ${count} available`}
              >
                <View style={{ opacity: count > 0 && canAfford ? 1 : 0.3 }}>
                  <PieceIcon type={pt} size={22} color={color} />
                </View>
                <View style={[styles.trayBadge, { backgroundColor: count > 0 ? color : Colors.dim }]}>
                  <Text style={styles.trayBadgeText}>{count}</Text>
                </View>
                {cost > 0 && (
                  <Text style={[styles.trayCost, { color: canAfford ? Colors.amber : 'rgba(224,85,85,0.7)' }]}>{cost} CR</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default React.memo(PieceTrayComponent);

const styles = StyleSheet.create({
  partsTray: {
    height: 72,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.12)',
    justifyContent: 'center',
  },
  partsTrayInner: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  trayItem: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,28,0.8)',
    gap: 2,
    position: 'relative',
  },
  trayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  trayBadgeText: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.void, fontWeight: 'bold',
  },
  trayCost: {
    fontFamily: Fonts.spaceMono, fontSize: 7, letterSpacing: 0.5,
  },
});
