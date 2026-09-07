import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';
import { InfoIcon } from '../icons';

interface Props {
  // D-07 — sectorTag was deleted from the gameplay HUD (Mission Dossier
  // and Sector Map already establish the sector; repeating it at 7pt
  // on a 2.4:1 fail served nobody). The sector-badge prop that fed it
  // is gone from this interface.
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
        {/* AXM-001 D-07 — levelTag and levelName stay two separate
            strings, unmerged. The review proposes collapsing them into
            one combined "id, then name" line joined by a middot; that
            join is a copy change and needs Tucker's sign-off (Design
            Principle 2) before it lands. Only the objectively non-copy
            fixes are applied here: levelTag raised to the 11pt floor
            (was 8pt, unreadable) and the two live values promoted below. */}
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
  // D-07 — touch targets raised 36x36 -> 44x44 (the glyph inside stays
  // its current visual size; only the pressable area grows).
  pauseBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 4,
  },
  pauseBar: {
    width: 3, height: 10, backgroundColor: '#00D4FF', opacity: 0.7, borderRadius: 1,
  },
  specSheetBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
  },
  topBarCenter: { flex: 1, alignItems: 'center' },
  // D-07 — raised to the 11pt floor (was 8pt / 2.4:1-adjacent on this
  // background at that size). Copper already passes contrast at 5.9:1.
  levelTag: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.copper,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  levelName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.starWhite,
  },
  // D-07 — promoted: the timer is a live value the player reads at a
  // glance, not reference chrome. 15pt, full-contrast starWhite.
  timerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 15,
    color: Colors.starWhite,
    letterSpacing: 1,
    marginTop: 2,
  },
  // D-07 — was 9pt at the HUD's old 1.5:1 pulse color, effectively
  // invisible. Promoted to 13pt Colors.muted (7.4:1); the old fail
  // color is deleted from the HUD entirely, not just dimmed further.
  pulseCounterText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
    letterSpacing: 1,
  },
});
