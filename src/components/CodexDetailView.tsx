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

// ─── Local PieceEntry type (mirrors CodexScreen) ───────────────────────────

export type CodexPieceType = 'Physics' | 'Protocol';

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

// ─── CodexDetailView component ─────────────────────────────────────────────

interface Props {
  entry: PieceEntry;
  onUnderstood: () => void;
  entryNumber?: number;
}

export default function CodexDetailView({ entry, onUnderstood, entryNumber = 1 }: Props) {
  const reveal = useSharedValue(0);
  const loggedSlide = useSharedValue(-40);

  const isPhysics = entry.type === 'Physics';
  const accent = isPhysics
    ? { bg: 'rgba(74,158,255,0.08)', border: 'rgba(74,158,255,0.28)', text: Colors.blue }
    : { bg: 'rgba(200,121,65,0.08)', border: 'rgba(200,121,65,0.28)', text: Colors.copper };
  const atmosphereColor = isPhysics ? 'rgba(74,158,255,0.06)' : 'rgba(200,121,65,0.06)';

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
            <PieceIcon type={entry.id} size={32} />
          </View>
          <Text style={st.heroName}>{entry.name.toUpperCase()}</Text>
          <View style={[st.typeBadge, { backgroundColor: accent.bg, borderColor: accent.border }]}>
            <Text style={[st.typeBadgeText, { color: accent.text }]}>
              {isPhysics ? 'PHYSICS PIECE' : 'PROTOCOL PIECE'}
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

        {/* Field simulation */}
        <PieceSimulation pieceType={entry.id} />

        {/* C.O.G.S NOTES */}
        <View style={st.cogsCardWrap}>
          <View style={st.cogsCard}>
            <View style={st.cogsHeader}>
              <View style={st.cogsEyeIcon}>
                <View style={st.cogsEyeDot} />
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
  cogsEyeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cogsEyeDot: {
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
