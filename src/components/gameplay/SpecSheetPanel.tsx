// SE-TM-030 — Spec Sheet panel (Unit C Part 2).
//
// A per-level, read-only reference surface. COGS states what the machine needs
// to do in the formal RFC-2119 register (WILL / SHALL / SHOULD / MAY). It is a
// SECOND framing of the same problem — it never touches scoring, win condition,
// or game state. Opened from the dormant-now-revived top-right info icon.
//
// All sentence copy is COGS dialogue, approved by Tucker 2026-06-14 (CLAUDE.md
// Design Principle 2), and comes from the pure derive + copy layers
// (src/game/spec/*). This component only lays the statements out; it computes
// nothing about the puzzle itself.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import CogsAvatar from '../CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';
import type { LevelDefinition, OutputTapeValue } from '../../game/types';
import { BLANK } from '../../game/types';
import {
  deriveWillStatements,
  deriveShallStatements,
  deriveShouldStatements,
  expectedOutputIsLiveGate,
} from '../../game/spec/specSheet';
import {
  willStatementToCopy,
  shallStatementToCopy,
  shouldStatementToCopy,
} from '../../game/spec/specSheetCopy';

const { width: screenWidth } = Dimensions.get('window');

// REQ-W-1: module-scope entering= builder. Declared here, never constructed in
// a render-path .map() callback (Build 25 HadesGC crash guard).
const PANEL_ENTER = FadeIn.duration(250);

interface Props {
  level: LevelDefinition;
  visible: boolean;
  onClose: () => void;
}

// Each section keys off the RFC-2119 term it heads. The accent colour
// distinguishes the obligation strength at a glance: SHALL (mandatory) reads
// amber/load-bearing, WILL (the given) reads neutral cyan, SHOULD (guidance)
// reads dim, MAY (optional/bonus) reads green like a reward.
const SECTION_ACCENT = {
  WILL: '#00D4FF',
  SHALL: Colors.amber,
  SHOULD: Colors.muted,
  MAY: '#4ecb8d',
} as const;

type SectionLabel = keyof typeof SECTION_ACCENT;

function Section({ label, lines }: { label: SectionLabel; lines: string[] }) {
  if (lines.length === 0) return null;
  const accent = SECTION_ACCENT[label];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionTick, { backgroundColor: accent }]} />
        <Text style={[styles.sectionHeader, { color: accent }]}>{label}</Text>
      </View>
      {lines.map((line, i) => (
        <View key={`${label}-${i}`} style={styles.lineRow}>
          <Text style={[styles.lineBullet, { color: accent }]}>›</Text>
          <Text style={styles.lineText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

// One labeled tape row of cells. BLANK renders as the dash glyph, matching the
// in-game tape bar.
function TapeStrip({ label, values, color }: { label: string; values: OutputTapeValue[]; color: string }) {
  return (
    <View style={styles.tapeStripRow}>
      <Text style={[styles.tapeStripLabel, { color }]}>{label}</Text>
      <View style={styles.tapeStripCells}>
        {values.map((v, i) => (
          <View key={i} style={[styles.tapeStripCell, { borderColor: `${color}55` }]}>
            <Text style={[styles.tapeStripCellText, { color: Colors.starWhite }]}>
              {v === BLANK ? '_' : v}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SpecSheetPanelImpl({ level, visible, onClose }: Props) {
  if (!visible) return null;

  const will = deriveWillStatements(level).map(willStatementToCopy);
  const shall = deriveShallStatements(level).map(shallStatementToCopy);
  const should = deriveShouldStatements(level).map(shouldStatementToCopy);
  // MAY copy is authored per-condition on the level (SE-TM-031a), not derived.
  const may = (level.mayConditions ?? []).map(c => c.description);

  // For a live output-tape gate (A1-7/A1-8), the SHALL says "match the expected
  // result" but the player needs to SEE what that result is — so show the
  // required IN → OUT mapping (Tucker 2026-06-16). The input is a given (also
  // visible on the board); the expected output is the target, shown plainly.
  const showExpectedOutput =
    expectedOutputIsLiveGate(level) && !!level.inputTape && !!level.expectedOutput;

  return (
    <Animated.View style={styles.overlay} entering={PANEL_ENTER}>
      <LinearGradient
        colors={['rgba(6,9,15,0.96)', 'rgba(10,22,40,0.98)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.card}>
        {/* HUD corner brackets — tactical/operational surface (Design Principle 6) */}
        <View style={[styles.corner, { top: 6, left: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 3 }]} />
        <View style={[styles.corner, { top: 6, right: 6, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 3 }]} />
        <View style={[styles.corner, { bottom: 6, left: 6, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 3 }]} />
        <View style={[styles.corner, { bottom: 6, right: 6, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 3 }]} />

        <View style={styles.chromeBar}>
          <View style={styles.chromeLeft}>
            <View style={styles.chromeDot} />
            <Text style={styles.chromeLabel}>C.O.G.S</Text>
          </View>
          <Text style={styles.chromeRight}>SPEC SHEET</Text>
        </View>

        <Text style={styles.levelLine}>
          {level.id} · {(level.systemRepaired ?? level.name).toUpperCase()}
        </Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Section label="WILL" lines={will} />
          <Section label="SHALL" lines={shall} />

          {showExpectedOutput && (
            <View style={styles.expectedBlock}>
              <Text style={styles.expectedLabel}>REQUIRED OUTPUT</Text>
              <TapeStrip label="IN" values={level.inputTape as OutputTapeValue[]} color="#BFFF3F" />
              <TapeStrip label="OUT" values={level.expectedOutput as OutputTapeValue[]} color="#FF7D3F" />
            </View>
          )}

          <Section label="SHOULD" lines={should} />
          <Section label="MAY" lines={may} />

          <View style={styles.cogsRow}>
            <CogsAvatar size="small" state="online" />
            <Text style={styles.cogsNote}>
              {'"These are the specifications. Meeting them is the job. Exceeding them is your business."'}
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close Spec Sheet"
        >
          <Text style={styles.closeText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const SpecSheetPanel = React.memo(SpecSheetPanelImpl);
export default SpecSheetPanel;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 220,
    paddingHorizontal: 20,
  },
  card: {
    width: screenWidth - 40,
    maxWidth: 520,
    maxHeight: '82%',
    backgroundColor: 'rgba(4,8,20,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: 'rgba(0,212,255,0.35)',
  },
  chromeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.12)',
  },
  chromeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chromeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D4FF' },
  chromeLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 10, color: '#00D4FF', letterSpacing: 2,
  },
  chromeRight: {
    fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.muted, letterSpacing: 2,
  },
  levelLine: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
    letterSpacing: 1.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingVertical: Spacing.sm },
  section: { marginBottom: Spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTick: { width: 10, height: 2, borderRadius: 1 },
  sectionHeader: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    letterSpacing: 3,
  },
  lineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  lineBullet: {
    fontFamily: Fonts.spaceMono,
    fontSize: 13,
    lineHeight: 20,
  },
  lineText: {
    flex: 1,
    fontFamily: Fonts.exo2,
    fontSize: 13.5,
    color: Colors.starWhite,
    lineHeight: 20,
  },
  // Expected IN -> OUT tape spec (live-gate tape levels)
  expectedBlock: {
    marginBottom: Spacing.lg,
    marginLeft: Spacing.lg,
    gap: 6,
  },
  expectedLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.dim,
    letterSpacing: 2,
    marginBottom: 2,
  },
  tapeStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tapeStripLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
    width: 28,
  },
  tapeStripCells: {
    flexDirection: 'row',
    gap: 3,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  tapeStripCell: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,28,0.8)',
  },
  tapeStripCellText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    fontWeight: '700',
  },
  cogsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.1)',
  },
  cogsNote: {
    flex: 1,
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.4)',
    borderRadius: 6,
  },
  closeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#00D4FF',
    letterSpacing: 3,
  },
});
