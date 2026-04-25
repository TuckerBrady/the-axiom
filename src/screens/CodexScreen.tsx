import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated as RNAnimated,
  Easing as RNEasing,
} from 'react-native';
import Svg, { Circle as SvgCircle, Rect as SvgRect, Line as SvgLine, Path as SvgPath, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import CogsAvatar from '../components/CogsAvatar';
import { BackButton } from '../components/BackButton';
import { PieceIcon } from '../components/PieceIcon';
import PieceSimulation from '../components/PieceSimulation';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useCodexStore } from '../store/codexStore';
import { SHOW_DEV_TOOLS } from '../utils/devFlags';

const { width: W } = Dimensions.get('window');

// Map each piece id to the color the player sees during gameplay so
// the Codex hero/grid icons line up with the in-game pieces instead
// of falling through to PieceIcon's copper default.
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
    default:
      return '#4a9eff'; // Physics blue
  }
}

// ─── Data ──────────────────────────────────────────────────────────────────────

type PieceType = 'Physics' | 'Protocol';
type EntryStatus = 'unlocked' | 'redacted';

export type PieceEntry = {
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
    cogsNote: 'The Conveyor carries signal in a straight line. Input enters from the rear, output exits the front. It cannot bend, branch, or redirect \u2014 that is not what it is for. Direction is set before you place it, not after. A Conveyor facing away from the signal source is not a Conveyor. It is a dead end. Rotate first.',
    timesUsed: 14, levelsPlayed: 4, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-1 Emergency Power',
    seenIn: ['Boot Sequence T-1', 'First Contact', 'Signal Drift', 'Relay Breach'],
  },
  {
    id: 'source', name: 'Source', type: 'Physics', status: 'unlocked',
    description: 'Primary input node. The origin of all signal flow aboard the vessel.',
    function: 'Emits a continuous signal from its output port. Always active. Cannot be switched off.',
    importance: 'Every circuit begins here. The Source is the heartbeat.',
    cogsNote: 'The Source is not a piece you place. It is fixed infrastructure \u2014 part of the ship itself. Signal begins here and nowhere else. It cannot be moved, repositioned, or removed. Your job is to build from it. That is the only direction available to you.',
    timesUsed: 18, levelsPlayed: 4, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-1 Emergency Power',
    seenIn: ['First Contact', 'Signal Drift', 'Relay Breach', 'Ion Cascade'],
  },
  {
    id: 'terminal', name: 'Terminal', type: 'Physics', status: 'unlocked',
    description: 'Terminal destination node. Accepts the final signal and confirms circuit completion.',
    function: 'Receives a signal at its input port and marks the circuit as complete.',
    importance: 'Without a destination, the signal is noise. The Output gives the circuit its purpose.',
    cogsNote: 'The Output is also fixed \u2014 you route to it, not with it. When signal arrives here, the system activates. If it does not arrive, the machine has not run. It does not matter how complete the path looks. Signal either reaches the Output or it does not. Build accordingly.',
    timesUsed: 18, levelsPlayed: 4, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-1 Emergency Power',
    seenIn: ['First Contact', 'Signal Drift', 'Relay Breach', 'Ion Cascade'],
  },
  {
    id: 'gear', name: 'Gear', type: 'Physics', status: 'unlocked',
    description: 'A rotational transmission component. Accepts signal from one direction and redirects it ninety degrees.',
    function: 'Changes the direction of signal flow by 90 degrees. Can be placed in four orientations.',
    importance: 'Circuits are rarely straight. The Gear is what makes corners possible.',
    cogsNote: 'The Gear is the only piece that redirects signal. Where a Conveyor carries straight, the Gear turns \u2014 90 degrees, to any perpendicular exit. It accepts input from any direction. Every non-linear circuit requires at least one. Plan the bend before you need it. The signal will not wait while you reconsider.',
    timesUsed: 9, levelsPlayed: 3, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-2 Life Support',
    seenIn: ['Relay Breach', 'Ion Cascade', 'Flux Resonance'],
  },
  {
    id: 'splitter', name: 'Splitter', type: 'Physics', status: 'unlocked',
    description: 'Divides a single signal path into two parallel streams without amplification loss.',
    function: 'Takes one input and produces two outputs. Both carry the full signal.',
    importance: 'When a circuit must reach two destinations simultaneously, the Splitter is the only option.',
    cogsNote: 'The Splitter divides a single signal into two parallel paths. Both carry the complete signal \u2014 nothing is lost, nothing is reduced. One input, two outputs. The piece itself is straightforward. What is not straightforward is committing to two complete routes simultaneously before either one is finished. Plan both before you place either.',
    timesUsed: 5, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-4 Propulsion Core',
    seenIn: ['Ion Cascade', 'Flux Resonance'],
  },
  // ── Unlocked Protocol ──
  {
    id: 'configNode', name: 'Config Node', type: 'Protocol', status: 'unlocked',
    description: 'A programmable routing node that modifies the behaviour of adjacent components based on set parameters.',
    function: 'Applies a configuration to downstream pieces. Changes can include delay, inversion, or conditional routing.',
    importance: 'Static circuits have limits. The Config Node is what makes circuits intelligent.',
    cogsNote: 'The Config Node is a conditional gate. Signal passes through only when the current Data Trail value satisfies the Node\u2019s configured condition. If the condition is not met, the signal halts here \u2014 the circuit does not fail, the signal simply does not continue. Set the condition before engaging the machine. It will not configure itself.',
    timesUsed: 7, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-3 Navigation Array',
    seenIn: ['Signal Drift', 'Ion Cascade'],
  },
  {
    id: 'scanner', name: 'Scanner', type: 'Protocol', status: 'unlocked',
    description: 'Reads the state of a connected piece and broadcasts its status to any listening nodes on the circuit.',
    function: 'Monitors an adjacent piece and reports ACTIVE, IDLE, or ERROR via its output port.',
    importance: 'You cannot fix what you cannot see. The Scanner makes the invisible visible.',
    cogsNote: 'The Scanner reads the Data Trail at the moment signal passes through it. That value is captured and stored \u2014 available to any Config Node that follows it in the circuit. The Scanner changes nothing: not the signal, not the trail. It only observes. Place it before the nodes that depend on what it reads. Sequence is not optional.',
    timesUsed: 6, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-5 Communication Array',
    seenIn: ['Signal Drift', 'Relay Breach'],
  },
  {
    id: 'transmitter', name: 'Transmitter', type: 'Protocol', status: 'unlocked',
    description: 'Broadcasts a signal wirelessly across non-adjacent grid positions to a designated receiver.',
    function: 'Sends a signal from its location to any Receiver piece on the same grid, regardless of distance or obstacles.',
    importance: 'Some gaps cannot be bridged with physical pieces. The Transmitter ignores those constraints.',
    cogsNote: 'The Transmitter writes a configured value to the Data Trail at the moment signal passes through it \u2014 overwriting whatever was there. Anything reading the trail after this point sees the new value. The write happens once, at the moment of signal contact. The write must precede the read. This is not a suggestion. It is how the machine runs.',
    timesUsed: 4, levelsPlayed: 2, sectorsSeen: 1,
    firstEncountered: 'THE AXIOM \u2014 A1-7 Weapons Lock',
    seenIn: ['Relay Breach', 'Ion Cascade'],
  },
  // ── Unlocked Kepler Belt pieces (no levels yet — tray/tutorial deferred) ──
  {
    id: 'merger', name: 'Merger', type: 'Physics', status: 'unlocked',
    description: 'Accepts signal from two input paths and combines them into a single output. Either input is sufficient to trigger output. Both inputs are accepted independently.',
    function: 'OR-gate behavior. Two inputs (left and top by default), one output (right). Either input alone triggers the output.',
    importance: 'When two independent paths must converge into one, the Merger is the only piece that allows it without losing either signal.',
    cogsNote: 'Two paths returning to one. The machine remembers where it started even when the signal forgot.',
    timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0,
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt',
    seenIn: [],
  },
  {
    id: 'bridge', name: 'Bridge', type: 'Physics', status: 'unlocked',
    description: 'Allows two signal paths to cross the same cell without interacting. Horizontal signal passes through horizontally. Vertical signal passes through vertically. The paths do not merge.',
    function: 'Two independent paths share one cell. Horizontal: left in, right out. Vertical: top in, bottom out. Neither path affects the other.',
    importance: 'Solves crossing problems on dense grids without forcing detours.',
    cogsNote: 'Two signals occupy the same cell. Neither is aware of this. Both are correct.',
    timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0,
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt',
    seenIn: [],
  },
  {
    id: 'inverter', name: 'Inverter', type: 'Protocol', status: 'unlocked',
    description: 'Reads the current pulse bit value and inverts it. Zero becomes one. One becomes zero. The signal continues through the machine carrying the inverted value.',
    function: 'Reads inputTape at current pulse index. Outputs 1 - value. Signal continues unchanged if no tape is present.',
    importance: 'The first piece that lets a circuit react to its own data instead of merely transporting it.',
    cogsNote: 'It does not decide what the correct value is. It only knows what the current value is not.',
    timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0,
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt',
    seenIn: [],
  },
  {
    id: 'counter', name: 'Counter', type: 'Protocol', status: 'unlocked',
    description: 'Counts incoming pulses. When the count reaches the configured threshold, the signal passes through and the count resets. Before the threshold is reached, the signal is blocked.',
    function: 'Maintains a count across pulses within a run. Threshold configurable (default 2). On threshold hit: passes signal, resets count. Otherwise: blocks.',
    importance: 'Time-based gating. Forces the machine to wait before reacting.',
    cogsNote: 'Patience encoded as hardware. It waits. Then it does not.',
    timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0,
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt',
    seenIn: [],
  },
  {
    id: 'latch', name: 'Latch', type: 'Protocol', status: 'unlocked',
    description: 'Stores a single bit value. In WRITE mode, the next signal that passes through stores its bit value. In READ mode, the stored value is output regardless of the incoming signal.',
    function: 'Two modes. WRITE: stores current pulse bit. READ: outputs stored value, ignoring incoming bit. State persists across pulses within one run, resets on machine reset.',
    importance: 'Single-bit memory. The first piece capable of remembering anything between pulses.',
    cogsNote: 'Memory is the ability to be wrong later about what was true earlier. This piece has that ability.',
    timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0,
    firstEncountered: 'THE AXIOM \u2014 Kepler Belt',
    seenIn: [],
  },
  // ── Redacted ──
  { id: 'amplifier', name: 'Amplifier', type: 'Physics', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'relay', name: 'Relay', type: 'Physics', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'junction', name: 'Junction', type: 'Protocol', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'buffer', name: 'Buffer', type: 'Physics', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
  { id: 'converter', name: 'Converter', type: 'Protocol', status: 'redacted', description: '', function: '', importance: '', cogsNote: '', timesUsed: 0, levelsPlayed: 0, sectorsSeen: 0, firstEncountered: '', seenIn: [] },
];

// Status the player actually sees for an entry. Truth is the
// `status` field on the PIECES catalog (`'unlocked'` = published
// piece, `'redacted'` = not-yet-introduced design slot) AND the
// player's discovery progress. A published piece the player has
// not yet found displays as redacted ('CLASSIFIED') so the codex
// is empty on a fresh install (Prompt 92, Fix 8). SHOW_DEV_TOOLS
// short-circuits the gating for testflight / dev builds so testers
// see the full inventory regardless.
function getEffectiveStatus(
  entry: PieceEntry,
  discovered: Set<string>,
): EntryStatus {
  if (entry.status === 'redacted') return 'redacted';
  if (SHOW_DEV_TOOLS) return 'unlocked';
  return discovered.has(entry.id) ? 'unlocked' : 'redacted';
}

function buildSectionsMeta(discovered: Set<string>): {
  id: string;
  name: string;
  description: string;
  total: number;
  unlocked: number;
}[] {
  return [
    {
      id: 'pieces',
      name: 'Pieces',
      description: 'Circuit components and mechanical parts aboard the Axiom.',
      total: PIECES.length,
      unlocked: PIECES.filter(
        p => getEffectiveStatus(p, discovered) === 'unlocked',
      ).length,
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
}

// Codex home greeting. Tucker (Prompt 92, Fix 9) wanted COGS to
// sound like he's noticing his own collecting compulsion with mild
// surprise — a subtle Pokemon easter egg. The entry counts stay
// dynamic so the line still serves its informational purpose.
function buildCogsHomeComment(discovered: Set<string>): string {
  const unlocked = PIECES.filter(
    p => getEffectiveStatus(p, discovered) === 'unlocked',
  ).length;
  const remaining = PIECES.length - unlocked;
  return `${unlocked} entries logged. ${remaining} still to be encountered. I find myself... eager to fill every entry. The compulsion to catalog is its own reward. I suspect this is what humans call collecting.`;
}

// PieceIcon imported from shared component

// ─── View types ───────────────────────────────────────────────────────────────

type CodexView =
  | { type: 'home' }
  | { type: 'section'; sectionId: string }
  | { type: 'detail'; entry: PieceEntry };

// ─── Home view ────────────────────────────────────────────────────────────────

type SectionMeta = ReturnType<typeof buildSectionsMeta>[number];

function SectionCard({
  section,
  onPress,
  index,
}: {
  section: SectionMeta;
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
  const discoveredIds = useCodexStore(s => s.discoveredIds);
  const discovered = new Set(discoveredIds);
  const sections = buildSectionsMeta(discovered);
  const cogsComment = buildCogsHomeComment(discovered);
  return (
    <ScrollView contentContainerStyle={cs.homeScroll} showsVerticalScrollIndicator={false}>
      {/* COGS strip */}
      <View style={cs.cogsStrip}>
        <CogsAvatar size="small" state="online" />
        <View style={cs.cogsStripBubble}>
          <Text style={cs.cogsStripText}>{cogsComment}</Text>
        </View>
      </View>

      {/* Section cards */}
      <View style={cs.sectionCards}>
        {sections.map((sec, i) => (
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
          <PieceIcon type={entry.id} size={36} color={getCodexPieceColor(entry.id)} />
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
        <PieceIcon type={entry.id} size={38} color={getCodexPieceColor(entry.id)} />
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
  const discoveredIds = useCodexStore(s => s.discoveredIds);
  const discovered = new Set(discoveredIds);

  // Project each piece through the discovery gate so the grid sees
  // CLASSIFIED for unfound pieces (Prompt 92, Fix 8). The original
  // PIECES array is never mutated.
  const projected = PIECES.map(p => ({
    ...p,
    status: getEffectiveStatus(p, discovered),
  }));
  const filtered = projected.filter(p => filter === 'All' || p.type === filter);

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

// ─── Detail view ──────────────────────────────────────────────────────────────

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
            <PieceIcon type={entry.id} size={32} color={getCodexPieceColor(entry.id)} />
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

        {/* First encountered */}
        <View style={cs.firstEncountered}>
          <Text style={cs.firstEncLabel}>FIRST ENCOUNTERED</Text>
          <Text style={cs.firstEncValue}>{entry.firstEncountered}</Text>
        </View>

        {/* Field simulation */}
        <PieceSimulation pieceType={entry.id} />

        {/* C.O.G.S NOTES — teaching mode */}
        <View style={cs.dossierSections}>
          <View style={[cs.dossierCard, cs.cogsTeachCard]}>
            <View style={cs.cogsTeachHeader}>
              <View style={cs.cogsEyeIcon}>
                <View style={cs.cogsEyeDot} />
              </View>
              <Text style={cs.cogsTeachLabel}>C.O.G.S NOTES</Text>
              <View style={cs.teachBadge}>
                <Text style={cs.teachBadgeText}>TEACHING</Text>
              </View>
            </View>
            <Text style={cs.cogsTeachText}>{entry.cogsNote}</Text>
          </View>
        </View>
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

  // COGS teaching card
  cogsTeachCard: {
    backgroundColor: 'rgba(10,22,40,0.7)',
    borderColor: 'rgba(240,180,41,0.2)',
  },
  cogsTeachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cogsEyeIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00C48C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cogsEyeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00C48C',
  },
  cogsTeachLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.amber,
    letterSpacing: 2,
    flex: 1,
  },
  teachBadge: {
    borderWidth: 1,
    borderColor: '#00C48C',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  teachBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: '#00C48C',
    letterSpacing: 1,
  },
  cogsTeachText: {
    fontFamily: Fonts.exo2,
    fontSize: 13.5,
    fontStyle: 'italic',
    color: 'rgba(232,240,255,0.8)',
    lineHeight: 13.5 * 1.65,
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
});
