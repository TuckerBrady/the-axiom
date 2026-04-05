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
    id: 'output', name: 'Output', type: 'Physics', status: 'unlocked',
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
    id: 'config_node', name: 'Config Node', type: 'Protocol', status: 'unlocked',
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

// PieceIcon imported from shared component

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
          <PieceIcon type={entry.id} size={36} />
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
        <PieceIcon type={entry.id} size={38} />
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

// Simulation captions per piece type
const SIM_CAPTIONS: Record<string, string> = {
  source: 'Signal originates here. The circuit begins.',
  output: 'Signal must arrive here. The circuit ends.',
  conveyor: 'Signal travels straight. Direction is set before placement.',
  gear: 'The only piece that changes signal direction.',
  splitter: 'Signal enters once. Two full-strength paths exit simultaneously.',
  config_node: 'Signal passes only when the trail condition is satisfied.',
  scanner: 'Reads the Data Trail. Stores the value. Changes nothing.',
  transmitter: 'Writes a value to the Data Trail as signal passes through.',
};

// ─── Piece Simulation ─────────────────────────────────────────────────────────

const SIM_W = 326;
const SIM_H = 140;

function getCell(col: number, row: number, cols: number, rows: number) {
  const CELL = Math.min(Math.floor((SIM_W - 32) / cols), Math.floor((SIM_H - 24) / rows));
  const ox = (SIM_W - cols * CELL) / 2;
  const oy = (SIM_H - rows * CELL) / 2;
  return { x: ox + col * CELL + CELL / 2, y: oy + row * CELL + CELL / 2, r: CELL };
}

// SVG helpers (connectors + data trail stay in SVG layer)
function DrawDataTrail({ cx, cy, r, val, highlight }: { cx: number; cy: number; r: number; val: string; highlight?: boolean }) {
  const s = r * 0.32;
  return (<><SvgRect x={cx - s} y={cy - s} width={s * 2} height={s * 2} rx="3" fill={highlight ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.04)'} stroke={highlight ? '#00D4FF' : 'rgba(0,212,255,0.2)'} strokeWidth="1" /><SvgText x={cx} y={cy + 4} fill={highlight ? '#00D4FF' : 'rgba(0,212,255,0.4)'} fontSize="10" fontFamily="monospace" textAnchor="middle">{val}</SvgText></>);
}
function DrawConn({ x1, y1, x2, y2, lit }: { x1: number; y1: number; x2: number; y2: number; lit?: boolean }) {
  return <SvgLine x1={x1} y1={y1} x2={x2} y2={y2} stroke={lit ? '#00D4FF' : 'rgba(0,212,255,0.1)'} strokeWidth={lit ? 2 : 1} />;
}

// PieceIcon overlay — renders canonical icons as absolutely positioned Views on top of SVG
function SimPiece({ cell, type, color }: { cell: { x: number; y: number; r: number }; type: string; color: string }) {
  const sz = cell.r * 0.8;
  return (
    <View style={{ position: 'absolute', left: cell.x - sz / 2, top: cell.y - sz / 2, width: sz, height: sz, alignItems: 'center', justifyContent: 'center' }}>
      <PieceIcon type={type} size={sz} color={color} />
    </View>
  );
}

function PieceSimulation({ pieceType }: { pieceType: string }) {
  const animVal = useRef(new RNAnimated.Value(0)).current;
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = animVal.addListener(({ value }) => setT(value));
    const loop = RNAnimated.loop(
      RNAnimated.timing(animVal, { toValue: 1, duration: 3600, easing: RNEasing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => { loop.stop(); animVal.removeListener(id); };
  }, [pieceType]);

  const caption = SIM_CAPTIONS[pieceType] ?? SIM_CAPTIONS[pieceType === 'config_node' ? 'config_node' : pieceType] ?? 'Field simulation.';
  const type = pieceType === 'config_node' ? 'configNode' : pieceType;

  // Interpolate ball position along a path defined by waypoints
  function interpPath(waypoints: { x: number; y: number }[], tVal: number, tEnd: number): { x: number; y: number } {
    const p = Math.min(tVal / tEnd, 1);
    const seg = p * (waypoints.length - 1);
    const i = Math.min(Math.floor(seg), waypoints.length - 2);
    const frac = seg - i;
    return {
      x: waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * frac,
      y: waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * frac,
    };
  }

  // Build simulation data: SVG elements (connectors, ball, effects) + piece overlays
  type CellData = { x: number; y: number; r: number };
  type PieceDef = { cell: CellData; type: string; color: string };

  function getSimData(): { svgContent: React.ReactNode; pieces: PieceDef[] } {
    switch (type) {
      case 'conveyor': {
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3), C2 = getCell(2, 1, 5, 3), C3 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, C2, C3, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={C2.x} y2={C2.y} lit={t > 0.25} />
          <DrawConn x1={C2.x} y1={C2.y} x2={C3.x} y2={C3.y} lit={t > 0.48} />
          <DrawConn x1={C3.x} y1={C3.y} x2={O.x} y2={O.y} lit={t > 0.68} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' }, { cell: C2, type: 'conveyor', color: '#00D4FF' }, { cell: C3, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'output', color: '#00C48C' },
        ] };
      }
      case 'gear': {
        const S = getCell(0, 1, 5, 4), C1 = getCell(1, 1, 5, 4), G = getCell(2, 1, 5, 4), C2 = getCell(2, 2, 5, 4), O = getCell(2, 3, 5, 4);
        const ball = t < 0.85 ? interpPath([S, C1, G, C2, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={G.x} y2={G.y} lit={t > 0.25} />
          <DrawConn x1={G.x} y1={G.y} x2={C2.x} y2={C2.y} lit={t > 0.5} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.68} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'source', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: G, type: 'gear', color: '#00D4FF' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'output', color: '#00C48C' },
        ] };
      }
      case 'splitter': {
        const S = getCell(1, 1, 7, 4), C1 = getCell(2, 1, 7, 4), SP = getCell(3, 1, 7, 4);
        const C2 = getCell(4, 1, 7, 4), O1 = getCell(5, 1, 7, 4), C3 = getCell(3, 2, 7, 4), O2 = getCell(3, 3, 7, 4);
        const SPLIT_T = 0.38;
        const preBall = t < SPLIT_T ? interpPath([S, C1, SP], t, SPLIT_T) : null;
        const postT = Math.min((t - SPLIT_T) / (0.9 - SPLIT_T), 1);
        const ballR = t >= SPLIT_T && t < 0.9 ? interpPath([SP, C2, O1], postT * 0.85, 0.85) : null;
        const ballD = t >= SPLIT_T && t < 0.9 ? interpPath([SP, C3, O2], postT * 0.85, 0.85) : null;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={SP.x} y2={SP.y} lit={t > 0.2} />
          <DrawConn x1={SP.x} y1={SP.y} x2={C2.x} y2={C2.y} lit={t > SPLIT_T} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O1.x} y2={O1.y} lit={t > 0.6} />
          <DrawConn x1={SP.x} y1={SP.y} x2={C3.x} y2={C3.y} lit={t > SPLIT_T} />
          <DrawConn x1={C3.x} y1={C3.y} x2={O2.x} y2={O2.y} lit={t > 0.6} />
          {preBall && <SvgCircle cx={preBall.x} cy={preBall.y} r="5" fill="#00D4FF" />}
          {ballR && <SvgCircle cx={ballR.x} cy={ballR.y} r="5" fill="#00D4FF" />}
          {ballD && <SvgCircle cx={ballD.x} cy={ballD.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'source', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: SP, type: 'splitter', color: '#00D4FF' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O1, type: 'output', color: '#00C48C' }, { cell: C3, type: 'conveyor', color: '#00D4FF' },
          { cell: O2, type: 'output', color: '#00C48C' },
        ] };
      }
      case 'source': {
        const S = getCell(1, 1, 3, 3);
        const r1 = S.r * 0.25 + (t * S.r * 0.6), r2 = S.r * 0.25 + (((t + 0.33) % 1) * S.r * 0.6), r3 = S.r * 0.25 + (((t + 0.66) % 1) * S.r * 0.6);
        const a1 = Math.max(0, 0.35 - t * 0.35), a2 = Math.max(0, 0.35 - ((t + 0.33) % 1) * 0.35), a3 = Math.max(0, 0.35 - ((t + 0.66) % 1) * 0.35);
        return { svgContent: (<>
          <SvgCircle cx={S.x} cy={S.y} r={r1} fill="none" stroke="#F0B429" strokeWidth="1" opacity={a1} />
          <SvgCircle cx={S.x} cy={S.y} r={r2} fill="none" stroke="#F0B429" strokeWidth="1" opacity={a2} />
          <SvgCircle cx={S.x} cy={S.y} r={r3} fill="none" stroke="#F0B429" strokeWidth="1" opacity={a3} />
        </>), pieces: [{ cell: S, type: 'source', color: '#F0B429' }] };
      }
      case 'output': {
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3), C2 = getCell(2, 1, 5, 3), C3 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, C2, C3, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={C2.x} y2={C2.y} lit={t > 0.25} />
          <DrawConn x1={C2.x} y1={C2.y} x2={C3.x} y2={C3.y} lit={t > 0.48} />
          <DrawConn x1={C3.x} y1={C3.y} x2={O.x} y2={O.y} lit={t > 0.68} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' }, { cell: C2, type: 'conveyor', color: '#00D4FF' }, { cell: C3, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'output', color: '#00C48C' },
        ] };
      }
      case 'configNode': {
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3), CN = getCell(2, 1, 5, 3), C2 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const CHECK_T = 0.45, PASS_T = 0.58;
        const isPaused = t >= CHECK_T && t < PASS_T, passed = t >= PASS_T;
        let ball: { x: number; y: number };
        if (t < CHECK_T) ball = interpPath([S, C1, CN], t, CHECK_T);
        else if (isPaused) ball = CN;
        else if (t < 0.9) ball = interpPath([CN, C2, O], (t - PASS_T) / (0.9 - PASS_T) * 0.85, 0.85);
        else ball = O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={CN.x} y2={CN.y} lit={t > 0.25} />
          <DrawConn x1={CN.x} y1={CN.y} x2={C2.x} y2={C2.y} lit={passed} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.75} />
          {isPaused && <SvgText x={CN.x} y={CN.y - CN.r * 0.55} fill="#A78BFA" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity={0.8}>CHECKING</SvgText>}
          {passed && t < PASS_T + 0.08 && <SvgText x={CN.x} y={CN.y - CN.r * 0.55} fill="#00C48C" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">PASS</SvgText>}
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill={isPaused || passed ? '#A78BFA' : '#00D4FF'} />}
        </>), pieces: [
          { cell: S, type: 'source', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: CN, type: 'configNode', color: '#A78BFA' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'output', color: '#00C48C' },
        ] };
      }
      case 'scanner': {
        const S = getCell(0, 1, 5, 4), C1 = getCell(1, 1, 5, 4), SC = getCell(2, 1, 5, 4), C2 = getCell(3, 1, 5, 4), O = getCell(4, 1, 5, 4), DT = getCell(2, 2, 5, 4);
        const SCAN_T = 0.45, DONE_T = 0.6;
        const isReading = t >= SCAN_T && t < DONE_T, done = t >= DONE_T;
        let ball: { x: number; y: number };
        if (t < SCAN_T) ball = interpPath([S, C1, SC], t, SCAN_T);
        else if (isReading) ball = SC;
        else if (t < 0.9) ball = interpPath([SC, C2, O], (t - DONE_T) / (0.9 - DONE_T) * 0.85, 0.85);
        else ball = O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={SC.x} y2={SC.y} lit={t > 0.25} />
          <DrawConn x1={SC.x} y1={SC.y} x2={C2.x} y2={C2.y} lit={done} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.75} />
          {isReading && <SvgLine x1={SC.x} y1={SC.y + SC.r * 0.4} x2={DT.x} y2={DT.y - DT.r * 0.35} stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="3,3" opacity={0.7} />}
          <DrawDataTrail cx={DT.x} cy={DT.y} r={DT.r} val="1" highlight={isReading || done} />
          {done && t < DONE_T + 0.1 && <SvgText x={SC.x + SC.r * 0.5} y={SC.y - SC.r * 0.45} fill="#A78BFA" fontSize="7" fontFamily="monospace" opacity={0.8}>STORED</SvgText>}
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill={isReading || done ? '#A78BFA' : '#00D4FF'} />}
        </>), pieces: [
          { cell: S, type: 'source', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: SC, type: 'scanner', color: '#A78BFA' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'output', color: '#00C48C' },
        ] };
      }
      case 'transmitter': {
        const S = getCell(0, 1, 5, 4), C1 = getCell(1, 1, 5, 4), TX = getCell(2, 1, 5, 4), C2 = getCell(3, 1, 5, 4), O = getCell(4, 1, 5, 4), DT = getCell(2, 2, 5, 4);
        const WRITE_T = 0.45, DONE_T = 0.58;
        const isWriting = t >= WRITE_T && t < DONE_T, done = t >= DONE_T;
        let ball: { x: number; y: number };
        if (t < WRITE_T) ball = interpPath([S, C1, TX], t, WRITE_T);
        else if (isWriting) ball = TX;
        else if (t < 0.9) ball = interpPath([TX, C2, O], (t - DONE_T) / (0.9 - DONE_T) * 0.85, 0.85);
        else ball = O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={TX.x} y2={TX.y} lit={t > 0.25} />
          <DrawConn x1={TX.x} y1={TX.y} x2={C2.x} y2={C2.y} lit={done} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.75} />
          {isWriting && <SvgLine x1={TX.x} y1={TX.y + TX.r * 0.4} x2={DT.x} y2={DT.y - DT.r * 0.35} stroke="#A78BFA" strokeWidth="2" opacity={0.9} />}
          <DrawDataTrail cx={DT.x} cy={DT.y} r={DT.r} val={done ? '1' : '0'} highlight={isWriting || done} />
          {isWriting && <SvgText x={TX.x + TX.r * 0.5} y={TX.y - TX.r * 0.45} fill="#A78BFA" fontSize="7" fontFamily="monospace" opacity={0.8}>WRITING</SvgText>}
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill={isWriting || done ? '#A78BFA' : '#00D4FF'} />}
        </>), pieces: [
          { cell: S, type: 'source', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: TX, type: 'transmitter', color: '#A78BFA' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'output', color: '#00C48C' },
        ] };
      }
      default: {
        const S = getCell(0, 1, 5, 3), O = getCell(4, 1, 5, 3);
        return { svgContent: null, pieces: [
          { cell: S, type: 'source', color: '#F0B429' }, { cell: O, type: 'output', color: '#00C48C' },
        ] };
      }
    }
  }

  const { svgContent, pieces: simPieces } = getSimData();

  return (
    <View style={simStyles.container}>
      <Text style={simStyles.label}>FIELD SIMULATION</Text>
      <View style={[simStyles.canvas, { position: 'relative' }]}>
        <Svg width={SIM_W} height={SIM_H}>{svgContent}</Svg>
        {/* PieceIcon overlays — canonical icons on top of SVG connectors */}
        {simPieces.map((p, i) => (
          <SimPiece key={i} cell={p.cell} type={p.type} color={p.color} />
        ))}
      </View>
      <Text style={simStyles.caption}>{caption}</Text>
    </View>
  );
}

const simStyles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: '#0a1628',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.amber,
    letterSpacing: 2,
  },
  canvas: {
    width: SIM_W,
    height: SIM_H,
    alignSelf: 'center',
  },
  caption: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    textAlign: 'center',
  },
});

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
            <PieceIcon type={entry.id} size={32} />
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
