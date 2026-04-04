import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, Path, G, Line } from 'react-native-svg';
import CogsAvatar from '../components/CogsAvatar';
import { BackButton } from '../components/BackButton';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

const { width: W } = Dimensions.get('window');

// ─── Data ──────────────────────────────────────────────────────────────────────

type PieceType = 'Physics' | 'Protocol';
type EntryStatus = 'unlocked' | 'redacted';

type PieceEntry = {
  id: string;
  name: string;
  type: PieceType;
  status: EntryStatus;
  description: string;
  function: string;
  importance: string;
  cogsNote: string;
  timesUsed: number;
  levelsPlayed: number;
  sectorsSeen: number;
  firstEncountered: string;
  seenIn: string[];
};

const PIECES: PieceEntry[] = [
  // ── Unlocked Physics ──
  {
    id: 'conveyor', name: 'Conveyor', type: 'Physics', status: 'unlocked',
    description: 'A mechanical belt that accepts an item on one end and delivers it to the other. No branching. No memory.',
    function: 'Moves a signal exactly one position forward along a defined axis. Output occurs at the far end.',
    importance: 'Without the Conveyor, isolated components cannot communicate. It is the connective tissue of every working circuit.',
    cogsNote: '"It moves things forward. A quality I find underrated."',
    timesUsed: 14, levelsPlayed: 4, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 01',
    seenIn: ['Boot Sequence T-1', 'First Contact', 'Signal Drift', 'Relay Breach'],
  },
  {
    id: 'source', name: 'Source', type: 'Physics', status: 'unlocked',
    description: 'Primary input node. The origin of all signal flow aboard the vessel. It does not ask where the signal is going.',
    function: 'Emits a continuous signal from its output port. Always active. Cannot be switched off.',
    importance: 'Every circuit begins here. The Source is the heartbeat. Without it, nothing moves.',
    cogsNote: '"Every machine starts somewhere. The Source is that somewhere. Simple. Important. Often forgotten."',
    timesUsed: 18, levelsPlayed: 4, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 01',
    seenIn: ['First Contact', 'Signal Drift', 'Relay Breach', 'Ion Cascade'],
  },
  {
    id: 'output', name: 'Output', type: 'Physics', status: 'unlocked',
    description: 'Terminal destination node. Accepts the final signal and confirms circuit completion. Lights up on receipt.',
    function: 'Receives a signal at its input port and marks the circuit as complete. One-way. Final.',
    importance: 'Without a destination, the signal is noise. The Output gives the circuit its purpose.',
    cogsNote: '"Reach the Output. The path between Source and Output is where the actual engineering happens."',
    timesUsed: 18, levelsPlayed: 4, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 01',
    seenIn: ['First Contact', 'Signal Drift', 'Relay Breach', 'Ion Cascade'],
  },
  {
    id: 'gear', name: 'Gear', type: 'Physics', status: 'unlocked',
    description: 'A rotational transmission component. Accepts signal from one direction and redirects it ninety degrees.',
    function: 'Changes the direction of signal flow by 90°. Can be placed in four orientations.',
    importance: 'Circuits are rarely straight. The Gear is what makes corners possible.',
    cogsNote: '"The Conveyor moves things forward. The Gear decides where forward is. There is a meaningful difference."',
    timesUsed: 9, levelsPlayed: 3, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 03',
    seenIn: ['Relay Breach', 'Ion Cascade', 'Flux Resonance'],
  },
  {
    id: 'splitter', name: 'Splitter', type: 'Physics', status: 'unlocked',
    description: 'Divides a single signal path into two parallel streams without amplification loss.',
    function: 'Takes one input and produces two outputs. Both carry the full signal. Neither is diminished.',
    importance: 'When a circuit must reach two destinations simultaneously, the Splitter is the only option.',
    cogsNote: '"One becomes two. Straightforward conceptually. Less straightforward when you have to plan both paths simultaneously."',
    timesUsed: 5, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 04',
    seenIn: ['Ion Cascade', 'Flux Resonance'],
  },
  // ── Unlocked Protocol ──
  {
    id: 'config_node', name: 'Config Node', type: 'Protocol', status: 'unlocked',
    description: 'A programmable routing node that modifies the behaviour of adjacent components based on set parameters.',
    function: 'Applies a configuration to downstream pieces. Changes can include delay, inversion, or conditional routing.',
    importance: 'Static circuits have limits. The Config Node is what makes circuits intelligent.',
    cogsNote: '"This is the piece most engineers underestimate on first encounter. I do not underestimate things. You should not either."',
    timesUsed: 7, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 02',
    seenIn: ['Signal Drift', 'Ion Cascade'],
  },
  {
    id: 'scanner', name: 'Scanner', type: 'Protocol', status: 'unlocked',
    description: 'Reads the state of a connected piece and broadcasts its status to any listening nodes on the circuit.',
    function: 'Monitors an adjacent piece and reports ACTIVE, IDLE, or ERROR via its output port.',
    importance: 'You cannot fix what you cannot see. The Scanner makes the invisible visible.',
    cogsNote: '"Think of it as paying attention. Something I recommend highly."',
    timesUsed: 6, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 02',
    seenIn: ['Signal Drift', 'Relay Breach'],
  },
  {
    id: 'transmitter', name: 'Transmitter', type: 'Protocol', status: 'unlocked',
    description: 'Broadcasts a signal wirelessly across non-adjacent grid positions to a designated receiver.',
    function: 'Sends a signal from its location to any Receiver piece on the same grid, regardless of distance or obstacles.',
    importance: 'Some gaps cannot be bridged with physical pieces. The Transmitter ignores those constraints.',
    cogsNote: '"The Scanner reads. The Transmitter writes. Between those two things, a machine can think. I find that remarkable."',
    timesUsed: 4, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'KEPLER BELT — Mission 03',
    seenIn: ['Relay Breach', 'Ion Cascade'],
  },
  // ── Redacted ──
  { id: 'inverter', name: 'Inverter', type: 'Protocol', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'amplifier', name: 'Amplifier', type: 'Physics', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'relay', name: 'Relay', type: 'Physics', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'junction', name: 'Junction', type: 'Protocol', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'buffer', name: 'Buffer', type: 'Physics', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'converter', name: 'Converter', type: 'Protocol', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
];

const SECTIONS_META = [
  {
    id: 'pieces',
    name: 'Pieces',
    description: 'Circuit components and mechanical parts aboard the Axiom.',
    total: PIECES.length,
    unlocked: PIECES.filter(p => p.status === 'unlocked').length,
  },
  {
    id: 'locations',
    name: 'Locations',
    description: 'Sectors, stations, and anomalies encountered on the voyage.',
    total: 12,
    unlocked: 1,
  },
  {
    id: 'entities',
    name: 'Entities',
    description: 'Persons, units, and intelligences with operational significance.',
    total: 8,
    unlocked: 2,
  },
  {
    id: 'axiom',
    name: 'The Axiom',
    description: 'Vessel schematics, history, and operational logs.',
    total: 6,
    unlocked: 1,
  },
];

const COGS_HOME_COMMENT = `${PIECES.filter(p => p.status === 'unlocked').length} entries logged. ${PIECES.filter(p => p.status === 'redacted').length} remain classified. You are making adequate progress.`;

// ─── Piece SVG icons (simplified per type) ────────────────────────────────────

function PieceIcon({ id, size = 40 }: { id: string; size?: number }) {
  const s = size;
  switch (id) {
    case 'conveyor':
      return (
        <Svg width={s} height={s * 0.6} viewBox="0 0 60 36">
          <Rect x="5" y="10" width="50" height="16" rx="8" fill="#0e1f36" stroke={Colors.copper} strokeWidth="1.5" />
          <Circle cx="13" cy="18" r="8" fill="#0a1628" stroke={Colors.copper} strokeWidth="1.5" />
          <Circle cx="13" cy="18" r="3.5" fill={Colors.copper} />
          <Circle cx="47" cy="18" r="8" fill="#0a1628" stroke={Colors.copper} strokeWidth="1.5" />
          <Circle cx="47" cy="18" r="3.5" fill={Colors.copper} />
          <Path d="M 23 14 L 29 18 L 23 22" stroke={Colors.amber} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M 30 14 L 36 18 L 30 22" stroke={Colors.amber} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        </Svg>
      );
    case 'source':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={Colors.amber} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="10" fill="#060e1a" stroke={Colors.amber} strokeWidth="1" strokeOpacity="0.5" />
          <Path d="M 17 13 L 17 27 L 27 20 Z" fill={Colors.amber} />
        </Svg>
      );
    case 'output':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={Colors.green} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="9" fill="#060e1a" stroke={Colors.green} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="4" fill={Colors.green} />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path
            d="M 20 6 L 22 10 L 26 10 L 28 14 L 34 16 L 34 20 L 34 24 L 28 26 L 26 30 L 22 30 L 20 34 L 18 30 L 14 30 L 12 26 L 6 24 L 6 20 L 6 16 L 12 14 L 14 10 L 18 10 Z"
            fill="#0e1f36" stroke={Colors.copper} strokeWidth="1.5" strokeLinejoin="round"
          />
          <Circle cx="20" cy="20" r="6" fill="#060e1a" stroke={Colors.copper} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="2.5" fill={Colors.copper} />
        </Svg>
      );
    case 'splitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="6" y="17" width="16" height="6" rx="3" fill="#0e1f36" stroke={Colors.blue} strokeWidth="1.5" />
          <Rect x="24" y="8" width="12" height="6" rx="3" fill="#0e1f36" stroke={Colors.blue} strokeWidth="1.5" />
          <Rect x="24" y="26" width="12" height="6" rx="3" fill="#0e1f36" stroke={Colors.blue} strokeWidth="1.5" />
          <Path d="M 22 20 L 28 11" stroke={Colors.blue} strokeWidth="1.5" strokeOpacity="0.7" />
          <Path d="M 22 20 L 28 29" stroke={Colors.blue} strokeWidth="1.5" strokeOpacity="0.7" />
        </Svg>
      );
    case 'config_node':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="5" fill="#0e1f36" stroke={Colors.circuit} strokeWidth="1.5" />
          <Line x1="14" y1="16" x2="26" y2="16" stroke={Colors.circuit} strokeWidth="1.5" strokeOpacity="0.8" />
          <Line x1="14" y1="20" x2="22" y2="20" stroke={Colors.circuit} strokeWidth="1.5" strokeOpacity="0.5" />
          <Line x1="14" y1="24" x2="24" y2="24" stroke={Colors.circuit} strokeWidth="1.5" strokeOpacity="0.6" />
          <Circle cx="26" cy="20" r="2.5" fill={Colors.circuit} />
        </Svg>
      );
    case 'scanner':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="15" fill="#0e1f36" stroke={Colors.circuit} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="10" fill="none" stroke={Colors.circuit} strokeWidth="1" strokeOpacity="0.4" />
          <Circle cx="20" cy="20" r="5" fill="none" stroke={Colors.circuit} strokeWidth="1" strokeOpacity="0.7" />
          <Line x1="20" y1="5" x2="20" y2="35" stroke={Colors.circuit} strokeWidth="1" strokeOpacity="0.3" />
          <Line x1="5" y1="20" x2="35" y2="20" stroke={Colors.circuit} strokeWidth="1" strokeOpacity="0.3" />
          <Circle cx="20" cy="20" r="2" fill={Colors.circuit} />
        </Svg>
      );
    case 'transmitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path d="M 20 28 L 20 12" stroke={Colors.blue} strokeWidth="2" strokeLinecap="round" />
          <Path d="M 14 22 Q 10 16 14 10" stroke={Colors.blue} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.7" />
          <Path d="M 26 22 Q 30 16 26 10" stroke={Colors.blue} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.7" />
          <Path d="M 10 26 Q 4 18 10 8" stroke={Colors.blue} strokeWidth="1" fill="none" strokeLinecap="round" strokeOpacity="0.4" />
          <Path d="M 30 26 Q 36 18 30 8" stroke={Colors.blue} strokeWidth="1" fill="none" strokeLinecap="round" strokeOpacity="0.4" />
          <Circle cx="20" cy="30" r="3" fill={Colors.blue} />
          <Rect x="16" y="30" width="8" height="5" rx="2" fill="#0e1f36" stroke={Colors.blue} strokeWidth="1" />
        </Svg>
      );
    default:
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="4" fill="#0e1f36" stroke={Colors.dim} strokeWidth="1.5" />
        </Svg>
      );
  }
}

// ─── View types ───────────────────────────────────────────────────────────────

type CodexView =
  | { type: 'home' }
  | { type: 'section'; sectionId: string }
  | { type: 'detail'; entry: PieceEntry };

// ─── Home view ────────────────────────────────────────────────────────────────

function SectionCard({
  section,
  onPress,
  index,
}: {
  section: typeof SECTIONS_META[0];
  onPress: () => void;
  index: number;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(index * 100 + 200, withTiming(1, { duration: 450 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 12 }],
  }));
  const pct = Math.round((section.unlocked / section.total) * 100);
  return (
    <Animated.View style={style}>
      <TouchableOpacity style={cs.sectionCard} onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={['rgba(26,58,92,0.5)', 'rgba(10,18,30,0.7)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={cs.sectionCardInner}>
          <View style={cs.sectionCardTop}>
            <Text style={cs.sectionName}>{section.name}</Text>
            <Text style={cs.sectionCount}>{section.unlocked}/{section.total}</Text>
          </View>
          <Text style={cs.sectionDesc}>{section.description}</Text>
          <View style={cs.sectionProgress}>
            <View style={cs.sectionProgressTrack}>
              <View style={[cs.sectionProgressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={cs.sectionPct}>{pct}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function HomeView({ onSection }: { onSection: (id: string) => void }) {
  return (
    <ScrollView contentContainerStyle={cs.homeScroll} showsVerticalScrollIndicator={false}>
      {/* COGS strip */}
      <View style={cs.cogsStrip}>
        <CogsAvatar size="small" state="online" />
        <View style={cs.cogsStripBubble}>
          <Text style={cs.cogsStripText}>{COGS_HOME_COMMENT}</Text>
        </View>
      </View>

      {/* Section cards */}
      <View style={cs.sectionCards}>
        {SECTIONS_META.map((sec, i) => (
          <SectionCard
            key={sec.id}
            section={sec}
            index={i}
            onPress={() => sec.id === 'pieces' ? onSection(sec.id) : undefined}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Section view (Pieces) ───────────────────────────────────────────────────

type Filter = 'All' | 'Physics' | 'Protocol';

function EntryGridCard({
  entry,
  onPress,
}: {
  entry: PieceEntry;
  onPress: () => void;
}) {
  if (entry.status === 'redacted') {
    return (
      <View style={cs.gridCard}>
        <View style={cs.gridCardRedacted}>
          <PieceIcon id={entry.id} size={36} />
          <Text style={cs.gridCardClassified}>CLASSIFIED</Text>
        </View>
      </View>
    );
  }
  return (
    <TouchableOpacity style={cs.gridCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['rgba(26,58,92,0.6)', 'rgba(10,18,30,0.9)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={cs.gridCardInner}>
        <PieceIcon id={entry.id} size={38} />
        <Text style={cs.gridCardName}>{entry.name}</Text>
        <View
          style={[
            cs.gridCardTypeBadge,
            {
              backgroundColor: entry.type === 'Physics'
                ? 'rgba(200,121,65,0.15)'
                : 'rgba(167,139,250,0.15)',
              borderColor: entry.type === 'Physics'
                ? 'rgba(200,121,65,0.4)'
                : 'rgba(167,139,250,0.4)',
            },
          ]}
        >
          <Text
            style={[
              cs.gridCardTypeText,
              { color: entry.type === 'Physics' ? Colors.copper : Colors.circuit },
            ]}
          >
            {entry.type.toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SectionView({
  onBack,
  onDetail,
}: {
  onBack: () => void;
  onDetail: (entry: PieceEntry) => void;
}) {
  const [filter, setFilter] = useState<Filter>('All');
  const filters: Filter[] = ['All', 'Physics', 'Protocol'];

  const filtered = PIECES.filter(p => filter === 'All' || p.type === filter);

  return (
    <View style={{ flex: 1 }}>
      {/* Sub-header */}
      <View style={cs.subHeader}>
        <BackButton onPress={onBack} />
        <Text style={cs.subHeaderTitle}>PIECES</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter tabs */}
      <View style={cs.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[cs.filterTab, filter === f && cs.filterTabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[cs.filterTabText, filter === f && cs.filterTabTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={cs.grid}
        columnWrapperStyle={cs.gridRow}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <EntryGridCard
            entry={item}
            onPress={() => item.status === 'unlocked' ? onDetail(item) : undefined}
          />
        )}
      />
    </View>
  );
}

// ─── Detail view ─────────────────────────────────────────────────────────────

const DETAIL_SECTIONS = (entry: PieceEntry) => [
  { title: 'WHAT IT IS', text: entry.description },
  { title: 'WHAT IT DOES', text: entry.function },
  { title: 'WHY IT MATTERS', text: entry.importance },
  { title: 'C.O.G.S NOTES', text: entry.cogsNote, isCogs: true },
];

function DetailView({
  entry,
  onBack,
}: {
  entry: PieceEntry;
  onBack: () => void;
}) {
  const reveal = useSharedValue(0);

  const isPhysics = entry.type === 'Physics';
  const accent = isPhysics
    ? { bg: 'rgba(74,158,255,0.08)', border: 'rgba(74,158,255,0.28)', text: Colors.blue }
    : { bg: 'rgba(200,121,65,0.08)', border: 'rgba(200,121,65,0.28)', text: Colors.copper };
  const atmosphereColor = isPhysics ? 'rgba(74,158,255,0.06)' : 'rgba(200,121,65,0.06)';

  useEffect(() => {
    reveal.value = withTiming(1, { duration: 400 });
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  return (
    <Animated.View style={[{ flex: 1 }, screenStyle]}>
      {/* Subtle top atmosphere gradient */}
      <LinearGradient
        colors={[atmosphereColor, 'transparent']}
        style={cs.atmosphereGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      <ScrollView contentContainerStyle={cs.detailScroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <View style={cs.detailBackBtn}>
          <BackButton onPress={onBack} />
          <Text style={cs.detailBackText}>PIECES</Text>
        </View>

        {/* Hero */}
        <View style={cs.detailHero}>
          <View
            style={[
              cs.detailIconBox,
              { backgroundColor: accent.bg, borderColor: accent.border },
            ]}
          >
            <PieceIcon id={entry.id} size={32} />
          </View>
          <Text style={cs.detailName}>{entry.name.toUpperCase()}</Text>
          <View
            style={[
              cs.detailTypeBadge,
              { backgroundColor: accent.bg, borderColor: accent.border },
            ]}
          >
            <Text style={[cs.detailTypeBadgeText, { color: accent.text }]}>
              {isPhysics ? 'PHYSICS PIECE' : 'PROTOCOL PIECE'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={cs.statsRow}>
          <View style={cs.statCell}>
            <Text style={cs.statVal}>{entry.timesUsed}</Text>
            <Text style={cs.statKey}>TIMES USED</Text>
          </View>
          <View style={[cs.statCell, cs.statBorder]}>
            <Text style={cs.statVal}>{entry.levelsPlayed}</Text>
            <Text style={cs.statKey}>LEVELS PLAYED</Text>
          </View>
          <View style={[cs.statCell, cs.statBorder]}>
            <Text style={cs.statVal}>{entry.sectorsSeen}</Text>
            <Text style={cs.statKey}>SECTORS SEEN</Text>
          </View>
        </View>

        {/* First encountered */}
        <View style={cs.firstEncountered}>
          <Text style={cs.firstEncLabel}>FIRST ENCOUNTERED</Text>
          <Text style={cs.firstEncValue}>{entry.firstEncountered}</Text>
        </View>

        {/* Dossier sections */}
        <View style={cs.dossierSections}>
          {DETAIL_SECTIONS(entry).map((sec, i) => (
            <View key={i} style={[cs.dossierCard, sec.isCogs && cs.dossierCardCogs]}>
              <Text style={[cs.dossierTitle, sec.isCogs && { color: Colors.blue }]}>
                {sec.title}
              </Text>
              <Text style={[cs.dossierText, sec.isCogs && cs.dossierTextCogs]}>
                {sec.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Seen in */}
        {entry.seenIn.length > 0 && (
          <View style={cs.seenIn}>
            <Text style={cs.seenInLabel}>SEEN IN MISSIONS</Text>
            <View style={cs.seenInTags}>
              {entry.seenIn.map((m, i) => (
                <View key={i} style={cs.seenInTag}>
                  <Text style={cs.seenInTagText}>{m}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Main CodexScreen ─────────────────────────────────────────────────────────

export default function CodexScreen() {
  const [view, setView] = useState<CodexView>({ type: 'home' });

  const screenOpacity = useSharedValue(0);
  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
  }, []);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  return (
    <Animated.View style={[cs.root, screenStyle]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Top header */}
        {view.type === 'home' && (
          <View style={cs.header}>
            <Text style={cs.headerLabel}>THE AXIOM</Text>
            <Text style={cs.headerTitle}>CODEX</Text>
          </View>
        )}

        {/* Content */}
        {view.type === 'home' && (
          <HomeView onSection={id => setView({ type: 'section', sectionId: id })} />
        )}
        {view.type === 'section' && (
          <SectionView
            onBack={() => setView({ type: 'home' })}
            onDetail={entry => setView({ type: 'detail', entry })}
          />
        )}
        {view.type === 'detail' && (
          <DetailView
            entry={view.entry}
            onBack={() => setView({ type: 'section', sectionId: 'pieces' })}
          />
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },

  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  headerTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 4,
  },

  // Home
  homeScroll: { flexGrow: 1, paddingBottom: Spacing.xxl },
  cogsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.08)',
  },
  cogsStripBubble: {
    flex: 1,
    backgroundColor: 'rgba(74,158,255,0.05)',
    borderRadius: 10,
    padding: Spacing.sm,
  },
  cogsStripText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  sectionCards: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
  },
  sectionCardInner: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
  },
  sectionCount: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.sm,
    color: Colors.muted,
  },
  sectionDesc: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    lineHeight: 18,
  },
  sectionProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  sectionProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(74,158,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sectionProgressFill: {
    height: '100%',
    backgroundColor: Colors.blue,
    borderRadius: 2,
  },
  sectionPct: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    width: 32,
    textAlign: 'right',
  },

  // Section / sub-header
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: Fonts.orbitron,
    fontSize: 18,
    color: Colors.muted,
  },
  subHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 3,
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.08)',
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
  },
  filterTabActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  filterTabText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 1,
  },
  filterTabTextActive: { color: Colors.starWhite },

  // Grid
  grid: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  gridRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
  gridCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
  },
  gridCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  gridCardName: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.starWhite,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  gridCardTypeBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  gridCardTypeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    letterSpacing: 0.5,
  },
  gridCardRedacted: {
    flex: 1,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    opacity: 0.25,
    padding: Spacing.sm,
  },
  gridCardClassified: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    color: Colors.dim,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Detail
  detailScroll: { paddingBottom: 60 },
  detailBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  detailBackText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 1,
  },
  atmosphereGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  detailHero: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  detailIconBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 4,
    marginTop: Spacing.sm,
  },
  detailTypeBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  detailTypeBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    letterSpacing: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(26,58,92,0.3)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 3,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(74,158,255,0.12)',
  },
  statVal: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.starWhite,
  },
  statKey: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    color: Colors.muted,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // First encountered
  firstEncountered: {
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

  // Dossier
  dossierSections: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  dossierCard: {
    backgroundColor: 'rgba(10,22,40,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  dossierCardCogs: {
    backgroundColor: 'rgba(74,158,255,0.04)',
    borderColor: 'rgba(74,158,255,0.2)',
  },
  dossierTitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
    letterSpacing: 2,
  },
  dossierText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    lineHeight: 22,
  },
  dossierTextCogs: {
    fontStyle: 'italic',
  },

  // Seen in
  seenIn: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  seenInLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  seenInTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  seenInTag: {
    backgroundColor: 'rgba(26,58,92,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  seenInTagText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
  },
});
