import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PieceIcon } from './PieceIcon';
import PieceSimulation from './PieceSimulation';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

// Map each piece id to the color the player sees during gameplay so
// the Codex hero icon lines up with the in-game piece instead of
// falling through to PieceIcon's copper default. Mirrors the helper
// in CodexScreen.tsx.
function getCodexPieceColor(pieceId: string): string {
  switch (pieceId) {
    case 'source':
      return '#F0B429'; // amber
    case 'terminal':
      return '#00C48C'; // green
    case 'configNode':
    case 'scanner':
    case 'transmitter':
    case 'inverter':
    case 'counter':
    case 'latch':
      return '#8B5CF6'; // Protocol purple
    // Tape entries (DATA STREAM) — match the in-game tape bar colors.
    case 'inputTape':
      return '#BFFF3F'; // IN — neon green
    case 'dataTrail':
      return '#A97FDB'; // TRAIL — atomic purple
    case 'outputTape':
      return '#FF7D3F'; // OUT — fire orange
    default:
      return '#4a9eff'; // Physics blue
  }
}

// Tape ids render as DATA STREAM entries (not Physics/Protocol pieces) — they
// use a dedicated hero glyph + field strip instead of PieceIcon/PieceSimulation.
const TAPE_IDS = new Set(['inputTape', 'dataTrail', 'outputTape']);

// ─── Local PieceEntry type (mirrors CodexScreen) ───────────────────────────

export type CodexPieceType = 'Physics' | 'Protocol' | 'Stream';

export type PieceEntry = {
  id: string;
  name: string;
  type: CodexPieceType;
  description: string;
  cogsNote: string;
  firstEncountered: string;
};

// Minimal local Codex data covering the 8 unlocked pieces. Source of truth
// is CodexScreen — kept in sync manually.
export const CODEX_PIECES: PieceEntry[] = [
  { id: 'conveyor', name: 'Conveyor', type: 'Physics',
    description: 'A mechanical belt that accepts an item on one end and delivers it to the other. No branching. No memory.',
    cogsNote: 'The Conveyor carries signal in a straight line. Input enters from the rear, output exits the front. It cannot bend, branch, or redirect \u2014 that is not what it is for. Direction is set before you place it, not after. A Conveyor facing away from the signal source is not a Conveyor. It is a dead end. Rotate first.',
    firstEncountered: 'THE AXIOM \u2014 A1-1 Emergency Power' },
  { id: 'source', name: 'Source', type: 'Physics',
    description: 'Primary input node. The origin of all signal flow aboard the vessel.',
    cogsNote: 'The Source is not a piece you place. It is fixed infrastructure \u2014 part of the ship itself. Signal begins here and nowhere else.',
    firstEncountered: 'THE AXIOM \u2014 A1-1 Emergency Power' },
  { id: 'terminal', name: 'Terminal', type: 'Physics',
    description: 'Terminal destination node. Accepts the final signal and confirms circuit completion.',
    cogsNote: 'The Terminal is also fixed \u2014 you route to it, not with it. When signal arrives here, the system activates.',
    firstEncountered: 'THE AXIOM \u2014 A1-1 Emergency Power' },
  { id: 'gear', name: 'Gear', type: 'Physics',
    description: 'A rotational transmission component. Accepts signal from one direction and redirects it ninety degrees.',
    cogsNote: 'The Gear is the only piece that redirects signal. Where a Conveyor carries straight, the Gear turns \u2014 90 degrees, to any perpendicular exit.',
    firstEncountered: 'THE AXIOM \u2014 A1-2 Life Support' },
  { id: 'splitter', name: 'Splitter', type: 'Physics',
    description: 'Divides a single signal path into two parallel streams without amplification loss.',
    cogsNote: 'The Splitter divides a single signal into two parallel paths. Both carry the complete signal \u2014 nothing is lost, nothing is reduced.',
    firstEncountered: 'THE AXIOM \u2014 A1-4 Propulsion Core' },
  { id: 'configNode', name: 'Config Node', type: 'Protocol',
    description: 'A programmable routing node that modifies the behaviour of adjacent components based on set parameters.',
    cogsNote: 'The Config Node is a conditional gate. Signal passes through only when the current Data Trail value satisfies the Node\u2019s configured condition.',
    firstEncountered: 'THE AXIOM \u2014 A1-3 Navigation Array' },
  // \u2500\u2500 Tape system (DATA STREAM) \u2014 copy approved by Tucker 2026-06-12 \u2500\u2500
  { id: 'inputTape', name: 'Input Tape', type: 'Stream',
    description: 'A read-only sequence of bit values fed into the machine \u2014 one cell per pulse, left to right. The machine fires once per cell.',
    cogsNote: 'The input tape is the question. One bit at a time, in order, no second readings. The machine does not choose what it is asked. Only what it does about it.',
    firstEncountered: 'THE AXIOM \u2014 A1-5 Communication Array' },
  { id: 'dataTrail', name: 'Data Trail', type: 'Stream',
    description: 'The machine\u2019s working memory. Pieces write values here; pieces read them back. It persists across pulses within a single run.',
    cogsNote: 'The Data Trail is what the machine remembers. Without it, every pulse is a stranger. With it, the machine carries a thought from one moment to the next. Unreasonably close to thinking.',
    firstEncountered: 'THE AXIOM \u2014 A1-5 Communication Array' },
  { id: 'outputTape', name: 'Output Tape', type: 'Stream',
    description: 'Where results are recorded \u2014 one cell per pulse. A value appears the moment a signal completes the circuit at the Terminal.',
    cogsNote: 'The output tape is the answer. Everything upstream is opinion until a value lands here. Then it is fact. And it is yours.',
    firstEncountered: 'THE AXIOM \u2014 A1-7 Weapons Lock' },
  { id: 'scanner', name: 'Scanner', type: 'Protocol',
    description: 'Reads the state of a connected piece and broadcasts its status to any listening nodes on the circuit.',
    cogsNote: 'The Scanner reads the Data Trail at the moment signal passes through it. That value is captured and stored \u2014 available to any Config Node that follows it.',
    firstEncountered: 'THE AXIOM \u2014 A1-5 Communication Array' },
  { id: 'transmitter', name: 'Transmitter', type: 'Protocol',
    description: 'Broadcasts a signal wirelessly across non-adjacent grid positions to a designated receiver.',
    cogsNote: 'The Transmitter writes a configured value to the Data Trail at the moment signal passes through it \u2014 overwriting whatever was there.',
    firstEncountered: 'THE AXIOM \u2014 A1-7 Weapons Lock' },
  { id: 'merger', name: 'Merger', type: 'Physics',
    description: 'Accepts signal from two input paths and combines them into a single output. Either input is sufficient to trigger output. Both inputs are accepted independently.',
    cogsNote: 'Two paths returning to one. The machine remembers where it started even when the signal forgot.',
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt' },
  { id: 'bridge', name: 'Bridge', type: 'Physics',
    description: 'Allows two signal paths to cross the same cell without interacting. Horizontal signal passes through horizontally. Vertical signal passes through vertically. The paths do not merge.',
    cogsNote: 'Two signals occupy the same cell. Neither is aware of this. Both are correct.',
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt' },
  { id: 'inverter', name: 'Inverter', type: 'Protocol',
    description: 'Reads the current pulse bit value and inverts it. Zero becomes one. One becomes zero. The signal continues through the machine carrying the inverted value.',
    cogsNote: 'It does not decide what the correct value is. It only knows what the current value is not.',
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt' },
  { id: 'counter', name: 'Counter', type: 'Protocol',
    description: 'Counts incoming pulses. When the count reaches the configured threshold, the signal passes through and the count resets. Before the threshold is reached, the signal is blocked.',
    cogsNote: 'Patience encoded as hardware. It waits. Then it does not.',
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt' },
  { id: 'latch', name: 'Latch', type: 'Protocol',
    description: 'Stores a single bit value. In WRITE mode, the next signal that passes through stores its bit value. In READ mode, the stored value is output regardless of the incoming signal.',
    cogsNote: 'Memory is the ability to be wrong later about what was true earlier. This piece has that ability.',
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt' },
];

export function getCodexEntry(id: string): PieceEntry | null {
  return CODEX_PIECES.find(p => p.id === id) ?? null;
}

// Canonical Codex numbering (COPY-01, Scheme A). Defined in a dependency-free
// module so it can be unit tested without importing this component. Re-exported
// here for the existing call sites that import from CodexDetailView.
export { CODEX_DISCOVERY_ORDER, getCodexEntryNumber } from '../game/codexOrder';

// ─── Tape (DATA STREAM) rendering helpers ──────────────────────────────────

// #RRGGBB -> rgba() with the given alpha. Tape entries derive their accent
// from the tape bar color, which is stored as hex.
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Sample cell values shown in each tape's hero glyph + field strip. These are
// illustrative, not live — they convey the shape of each tape:
//  - Input: a fixed read-only bit sequence
//  - Data Trail: a couple of written cells, the rest pending
//  - Output: the first results landed, the rest still blank
const TAPE_SAMPLE: Record<string, (string | null)[]> = {
  inputTape: ['1', '0', '1', '1', '0'],
  dataTrail: ['1', '0', null, null, null],
  outputTape: ['1', '1', null, null, null],
};

// Tape ids that render as DATA STREAM entries. Exported so CodexScreen's
// library grid/detail can share the same tape rendering as the reveal.
export function isStreamEntry(id: string): boolean {
  return TAPE_IDS.has(id);
}

// Small multi-cell glyph used as the hero icon for tape entries.
export function TapeGlyph({ color }: { color: string }) {
  return (
    <View style={tg.row}>
      {['1', '0', '1'].map((v, i) => (
        <View key={i} style={[tg.cell, { borderColor: color }]}>
          <Text style={[tg.cellText, { color }]}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

// Field-simulation replacement for tape entries: a labeled strip of cells in
// the tape's own color, filling the same slot PieceSimulation would occupy.
export function TapeFieldStrip({ id, color }: { id: string; color: string }) {
  const cells = TAPE_SAMPLE[id] ?? ['_', '_', '_', '_', '_'];
  const label = id === 'inputTape' ? 'IN' : id === 'dataTrail' ? 'TRAIL' : 'OUT';
  return (
    <View style={tg.stripWrap}>
      <View style={tg.strip}>
        <Text style={[tg.stripLabel, { color }]}>{label}</Text>
        {cells.map((v, i) => {
          const filled = v !== null;
          return (
            <View
              key={i}
              style={[
                tg.stripCell,
                filled
                  ? { borderColor: color, backgroundColor: hexToRgba(color, 0.18) }
                  : { borderColor: 'rgba(124,138,165,0.3)' },
              ]}
            >
              <Text style={[tg.stripCellText, { color: filled ? '#fff' : Colors.muted }]}>
                {v ?? '_'}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={tg.stripCaption}>One cell per pulse. Read left to right.</Text>
    </View>
  );
}

const tg = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  cell: {
    width: 14, height: 18, borderRadius: 3, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cellText: { fontFamily: Fonts.spaceMono, fontSize: 10, fontWeight: '700' },
  stripWrap: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(124,138,165,0.18)',
    backgroundColor: 'rgba(10,22,40,0.5)', paddingVertical: Spacing.md, alignItems: 'center',
    gap: Spacing.sm,
  },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stripLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 10, letterSpacing: 1, width: 40, textAlign: 'right',
    marginRight: 4,
  },
  stripCell: {
    width: 30, height: 30, borderRadius: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stripCellText: { fontFamily: Fonts.spaceMono, fontSize: 14, fontWeight: '700' },
  stripCaption: { fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted, letterSpacing: 0.5 },
});

// ─── CodexDetailView component ─────────────────────────────────────────────

interface Props {
  entry: PieceEntry;
  onUnderstood: () => void;
  entryNumber?: number;
  alsoCollected?: PieceEntry[];
}

export default function CodexDetailView({ entry, onUnderstood, entryNumber = 1, alsoCollected }: Props) {
  const reveal = useSharedValue(0);
  const loggedSlide = useSharedValue(-40);

  const isPhysics = entry.type === 'Physics';
  const isStream = entry.type === 'Stream';
  // Stream (tape) entries take their accent from the tape's own bar color so
  // the entry screen reads as the same object the player sees in gameplay.
  const streamColor = getCodexPieceColor(entry.id);
  const accent = isStream
    ? { bg: hexToRgba(streamColor, 0.08), border: hexToRgba(streamColor, 0.4), text: streamColor }
    : isPhysics
      ? { bg: 'rgba(240,180,41,0.08)', border: 'rgba(240,180,41,0.28)', text: Colors.amber }
      : { bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.28)', text: '#00D4FF' };
  const atmosphereColor = isStream
    ? hexToRgba(streamColor, 0.06)
    : isPhysics ? 'rgba(240,180,41,0.06)' : 'rgba(0,212,255,0.06)';
  const typeBadgeLabel = isStream ? 'DATA STREAM' : isPhysics ? 'PHYSICS PIECE' : 'PROTOCOL PIECE';

  useEffect(() => {
    reveal.value = withTiming(1, { duration: 200 });
    loggedSlide.value = withTiming(0, { duration: 300 });
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const loggedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: loggedSlide.value }],
    opacity: reveal.value,
  }));

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: Colors.void }, screenStyle]}>
      {/* HUD corner brackets */}
      <View pointerEvents="none" style={[st.hudBracket, { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 3 }]} />
      <View pointerEvents="none" style={[st.hudBracket, { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 3 }]} />
      <View pointerEvents="none" style={[st.hudBracket, { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 3 }]} />
      <View pointerEvents="none" style={[st.hudBracket, { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 3 }]} />

      {/* Atmosphere gradient */}
      <LinearGradient
        colors={[atmosphereColor, 'transparent']}
        style={st.atmosphereGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* COGS chrome bar */}
      <View style={st.chromeBar}>
        <View style={st.chromeLeft}>
          <View style={st.chromeDot} />
          <Text style={st.chromeLabel}>C.O.G.S</Text>
        </View>
        <Text style={st.chromeRight}>ENTRY {String(entryNumber).padStart(3, '0')}</Text>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={st.hero}>
          <View style={[st.iconBox, { backgroundColor: accent.bg, borderColor: accent.border }]}>
            {isStream
              ? <TapeGlyph color={streamColor} />
              : <PieceIcon type={entry.id} size={32} color={getCodexPieceColor(entry.id)} />}
          </View>
          <Text style={st.heroName}>{entry.name.toUpperCase()}</Text>
          <View style={[st.typeBadge, { backgroundColor: accent.bg, borderColor: accent.border }]}>
            <Text style={[st.typeBadgeText, { color: accent.text }]}>
              {typeBadgeLabel}
            </Text>
          </View>
          <Animated.View style={[st.loggedBadge, loggedStyle]}>
            <Text style={st.loggedBadgeText}>LOGGED TO CODEX</Text>
          </Animated.View>
        </View>

        {/* First encountered */}
        <View style={st.firstEnc}>
          <Text style={st.firstEncLabel}>FIRST ENCOUNTERED</Text>
          <Text style={st.firstEncValue}>{entry.firstEncountered}</Text>
        </View>

        {/* Also catalogued (batch collection — A1-1 only) */}
        {alsoCollected && alsoCollected.length > 0 && (
          <View style={st.alsoSection}>
            <Text style={st.alsoLabel}>ALSO CATALOGUED</Text>
            <View style={st.alsoRow}>
              {alsoCollected.map(e => (
                <View key={e.id} style={st.alsoChip}>
                  <PieceIcon type={e.id} size={16} color={getCodexPieceColor(e.id)} />
                  <Text style={st.alsoChipText}>{e.name.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Field simulation */}
        {isStream
          ? <TapeFieldStrip id={entry.id} color={streamColor} />
          : <PieceSimulation pieceType={entry.id} />}

        {/* C.O.G.S NOTES */}
        <View style={st.cogsCardWrap}>
          <View style={st.cogsCard}>
            <View style={st.cogsHeader}>
              <View style={st.cogsAIOrbIcon}>
                <View style={st.cogsAIOrbDot} />
              </View>
              <Text style={st.cogsLabel}>C.O.G.S NOTES</Text>
              <View style={st.teachBadge}>
                <Text style={st.teachBadgeText}>TEACHING</Text>
              </View>
            </View>
            <Text style={st.cogsDescription}>{entry.description}</Text>
            <Text style={st.cogsText}>{entry.cogsNote}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={st.actionBar}>
        <Text style={st.actionLabel}>ENTRY LOGGED</Text>
        <TouchableOpacity style={st.understoodBtn} onPress={onUnderstood} activeOpacity={0.8}>
          <Text style={st.understoodText}>UNDERSTOOD</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────


const st = StyleSheet.create({
  hudBracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: 'rgba(0,212,255,0.28)',
    zIndex: 20,
  },
  atmosphereGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  chromeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg + 24,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.12)',
  },
  chromeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chromeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4FF',
  },
  chromeLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    letterSpacing: 2,
  },
  chromeRight: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.muted,
    letterSpacing: 2,
  },
  scroll: {
    paddingBottom: 100,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 4,
    marginTop: Spacing.sm,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  typeBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    letterSpacing: 2,
  },
  loggedBadge: {
    borderWidth: 1,
    borderColor: Colors.copper,
    backgroundColor: 'rgba(200,121,65,0.10)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: Spacing.sm,
  },
  loggedBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
    letterSpacing: 2,
  },
  firstEnc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(78,203,141,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(78,203,141,0.2)',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  firstEncLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 1,
  },
  firstEncValue: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.starWhite,
  },
  alsoSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(240,180,41,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.18)',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  alsoLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.amber,
    letterSpacing: 1.5,
  },
  alsoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  alsoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alsoChipText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
  },
  cogsCardWrap: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  cogsCard: {
    backgroundColor: 'rgba(10,22,40,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.2)',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cogsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cogsAIOrbIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cogsAIOrbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D4FF',
  },
  cogsLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.amber,
    letterSpacing: 2,
    flex: 1,
  },
  teachBadge: {
    borderWidth: 1,
    borderColor: '#00D4FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  teachBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: '#00D4FF',
    letterSpacing: 1,
  },
  cogsDescription: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: Colors.muted,
    lineHeight: 13 * 1.6,
  },
  cogsText: {
    fontFamily: Fonts.exo2,
    fontSize: 13.5,
    fontStyle: 'italic',
    color: 'rgba(232,240,255,0.8)',
    lineHeight: 13.5 * 1.65,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: 'rgba(2,5,14,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,212,255,0.16)',
  },
  actionLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  understoodBtn: {
    borderWidth: 1,
    borderColor: Colors.amber,
    backgroundColor: 'rgba(240,180,41,0.12)',
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  understoodText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: Colors.amber,
    letterSpacing: 2,
  },
});
