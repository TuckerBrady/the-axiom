import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';
import { InfoIcon } from '../icons';

interface Props {
  sectorBadge: string;
  levelId: string;
  levelTitle: string;
  timerText: string | null;
  pulseCounterText: string | null;
  onPause: () => void;
  // SE-TM-030 — opens the Spec Sheet panel. The right-hand info icon was
  // dormant (removed because it did nothing); it now routes the per-level
  // specification feed. Must be useCallback-stabilized in the parent so the
  // React.memo below holds.
  onOpenSpecSheet: () => void;
  // SE-TM-033 — ref on the Spec Sheet button so the A1-1 activation hook can
  // measure and anchor its highlight + dialog to the live icon position.
  specSheetBtnRef?: React.RefObject<View | null>;
}

// React.memo with default shallow comparison. The pause callback must
// be useCallback-stabilized in the parent. timerText and
// pulseCounterText are passed as primitives — null suppresses
// rendering. The HUD itself contains no beam-state references; the
// parent re-renders us only when the strings change identity, which
// is once per second at most for the timer and once per pulse at most
// for the pulse counter. PERFORMANCE_CONTRACT 4.1.3, 4.1.4.
function HUDChromeComponent({
  sectorBadge,
  levelId,
  levelTitle,
  timerText,
  pulseCounterText,
  onPause,
  onOpenSpecSheet,
  specSheetBtnRef,
}: Props) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        style={styles.pauseBtn}
        activeOpacity={0.7}
        onPress={onPause}
      >
        <View style={styles.pauseBar} />
        <View style={styles.pauseBar} />
      </TouchableOpacity>
      <View style={styles.topBarCenter}>
        <Text style={styles.sectorTag}>{sectorBadge}</Text>
        <Text style={styles.levelTag}>{levelId}</Text>
        <Text style={styles.levelName}>{levelTitle}</Text>
        {timerText !== null && (
          <Text style={styles.timerText}>{timerText}</Text>
        )}
        {pulseCounterText !== null && (
          <Text style={styles.pulseCounterText}>{pulseCounterText}</Text>
        )}
      </View>
      <TouchableOpacity
        ref={specSheetBtnRef}
        style={styles.specSheetBtn}
        activeOpacity={0.7}
        onPress={onOpenSpecSheet}
        accessibilityRole="button"
        accessibilityLabel="Open Spec Sheet"
      >
        <InfoIcon size={20} color="#00D4FF" />
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(HUDChromeComponent);

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  pauseBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 4,
  },
  pauseBar: {
    width: 3, height: 10, backgroundColor: '#00D4FF', opacity: 0.7, borderRadius: 1,
  },
  specSheetBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  topBarCenter: { flex: 1, alignItems: 'center' },
  sectorTag: {
    fontFamily: Fonts.spaceMono, fontSize: 7, color: Colors.dim,
    letterSpacing: 2, marginBottom: 1,
  },
  levelTag: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.copper,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  levelName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.starWhite,
  },
  timerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 13,
    color: '#00D4FF',
    opacity: 0.7,
    letterSpacing: 1,
    marginTop: 2,
  },
  pulseCounterText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#1A3050',
    marginTop: 2,
    letterSpacing: 1,
  },
});
