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
  // AXM-022 (Tucker, 2026-09-23): no timer prop. Elapsed time is tracked
  // silently in useGameplayTimer and never drawn; a visible clock told the
  // Engineer to hurry, the opposite of building an elaborate machine.
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
// be useCallback-stabilized in the parent. pulseCounterText is passed
// as a primitive — null draws the empty row. The HUD itself contains no
// beam-state references; the parent re-renders us only when the string
// changes identity, once per pulse at most. PERFORMANCE_CONTRACT 4.1.3,
// 4.1.4.
function HUDChromeComponent({
  levelId,
  levelTitle,
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
        {/* AXM-001 D-07 — the review's one-line merge landed in
            AXM-002 (Tucker signed it off 2026-09-23): "K1-1 · CORRIDOR
            ENTRY", id in copper, name in starWhite, one line. The tail
            truncates, so a long title ellipsizes and never wraps. */}
        <Text style={styles.levelLine} numberOfLines={1} ellipsizeMode="tail">
          <Text style={styles.levelTag}>{levelId}</Text>
          {' · '}
          <Text style={styles.levelName}>{levelTitle}</Text>
        </Text>
        {/* REQ-G-02 (Handoff 003): present and empty when idle, not
            conditionally mounted — mounting it only during 'beam' phase
            added ~19pt to the HUD in the same frame the run begins, and
            left-aligning (was center, like its siblings) keeps that edge
            still as the string grows ("PULSE 1 / 6" -> "PULSE 1 / 6 —
            REACHED: 0 / 3") instead of the whole line re-centering. */}
        <Text style={styles.pulseCounterText} numberOfLines={1}>
          {pulseCounterText ?? ''}
        </Text>
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
  // AXM-002 — the parent run of the merged header. Its size and colour
  // style the middot between the two runs; alignSelf stretch gives the
  // line a width to truncate against instead of growing past the icons.
  levelLine: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted,
    alignSelf: 'stretch', textAlign: 'center',
  },
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
  // D-07 — was 9pt at the HUD's old 1.5:1 pulse color, effectively
  // invisible. Promoted to 13pt Colors.muted (7.4:1); the old fail
  // color is deleted from the HUD entirely, not just dimmed further.
  // REQ-G-02 — fixed height (present and empty when idle, so mounting
  // never adds/removes vertical space) and left-aligned, stretched to
  // the row's full width so per-pulse string growth extends rightward
  // from a still left edge instead of re-centering the line.
  pulseCounterText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
    letterSpacing: 1,
    height: 16,
    alignSelf: 'stretch',
    textAlign: 'left',
  },
});
