import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated as RNAnimated,
  Easing as RNEasing,
} from 'react-native';
import Svg, { Circle as SvgCircle, Rect as SvgRect, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PieceIcon } from './PieceIcon';
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
  { id: 'inputPort', name: 'Input Port', type: 'Physics',
    description: 'Primary input node. The origin of all signal flow aboard the vessel.',
    cogsNote: 'The Input Port is not a piece you place. It is fixed infrastructure \u2014 part of the ship itself. Signal begins here and nowhere else.',
    firstEncountered: 'THE AXIOM \u2014 A1-1 Emergency Power' },
  { id: 'outputPort', name: 'Output Port', type: 'Physics',
    description: 'Terminal destination node. Accepts the final signal and confirms circuit completion.',
    cogsNote: 'The Output Port is also fixed \u2014 you route to it, not with it. When signal arrives here, the system activates.',
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

// ─── Local PieceSimulation (compact port) ──────────────────────────────────

const SIM_W = 326;
const SIM_H = 140;

function getCell(col: number, row: number, cols: number, rows: number) {
  const CELL = Math.min(Math.floor((SIM_W - 32) / cols), Math.floor((SIM_H - 24) / rows));
  const ox = (SIM_W - cols * CELL) / 2;
  const oy = (SIM_H - rows * CELL) / 2;
  return { x: ox + col * CELL + CELL / 2, y: oy + row * CELL + CELL / 2, r: CELL };
}

function DrawConn({ x1, y1, x2, y2, lit }: { x1: number; y1: number; x2: number; y2: number; lit?: boolean }) {
  return <SvgLine x1={x1} y1={y1} x2={x2} y2={y2} stroke={lit ? '#00D4FF' : 'rgba(0,212,255,0.1)'} strokeWidth={lit ? 2 : 1} />;
}

function DrawDataTrail({ cx, cy, r, val, highlight }: { cx: number; cy: number; r: number; val: string; highlight?: boolean }) {
  const sz = r * 0.32;
  return (
    <>
      <SvgRect x={cx - sz} y={cy - sz} width={sz * 2} height={sz * 2} rx="3" fill={highlight ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.04)'} stroke={highlight ? '#00D4FF' : 'rgba(0,212,255,0.2)'} strokeWidth="1" />
      <SvgText x={cx} y={cy + 4} fill={highlight ? '#00D4FF' : 'rgba(0,212,255,0.4)'} fontSize="10" fontFamily="monospace" textAnchor="middle">{val}</SvgText>
    </>
  );
}

function SimPiece({ cell, type, color, rotation = 0 }: { cell: { x: number; y: number; r: number }; type: string; color: string; rotation?: number }) {
  const sz = cell.r * 0.8;
  return (
    <View style={{ position: 'absolute', left: cell.x - sz / 2, top: cell.y - sz / 2, width: sz, height: sz, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
        <PieceIcon type={type} size={sz} color={color} />
      </View>
    </View>
  );
}

function interpPath(waypoints: { x: number; y: number }[], tVal: number, tEnd: number) {
  const p = Math.min(tVal / tEnd, 1);
  const seg = p * (waypoints.length - 1);
  const i = Math.min(Math.floor(seg), waypoints.length - 2);
  const frac = seg - i;
  return {
    x: waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * frac,
    y: waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * frac,
  };
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

  const type = pieceType === 'config_node' ? 'configNode' : pieceType;

  type CellData = { x: number; y: number; r: number };
  type PieceDef = { cell: CellData; type: string; color: string; rotation?: number };

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
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' }, { cell: C2, type: 'conveyor', color: '#00D4FF' }, { cell: C3, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
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
          // Bug 9 fix: C1 flows horizontally (left->right into Gear),
          // C2 flows vertically (top->bottom out of Gear toward Output).
          { cell: S, type: 'inputPort', color: '#F0B429', rotation: 0 },
          { cell: C1, type: 'conveyor', color: '#00D4FF', rotation: 0 },
          { cell: G, type: 'gear', color: '#00D4FF', rotation: 0 },
          { cell: C2, type: 'conveyor', color: '#00D4FF', rotation: 90 },
          { cell: O, type: 'outputPort', color: '#00C48C', rotation: 0 },
        ] };
      }
      case 'splitter': {
        // 4-wide, 2-tall grid: S → C1 → SP → {O1 right, O2 down}
        const S = getCell(0, 0, 4, 2), C1 = getCell(1, 0, 4, 2), SP = getCell(2, 0, 4, 2);
        const O1 = getCell(3, 0, 4, 2), O2 = getCell(2, 1, 4, 2);
        const SPLIT_T = 0.45;
        const preBall = t < SPLIT_T ? interpPath([S, C1, SP], t, SPLIT_T) : null;
        const ballR = t >= SPLIT_T && t < 0.9 ? interpPath([SP, O1], t - SPLIT_T, 0.9 - SPLIT_T) : null;
        const ballD = t >= SPLIT_T && t < 0.9 ? interpPath([SP, O2], t - SPLIT_T, 0.9 - SPLIT_T) : null;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={SP.x} y2={SP.y} lit={t > 0.25} />
          <DrawConn x1={SP.x} y1={SP.y} x2={O1.x} y2={O1.y} lit={t > SPLIT_T} />
          <DrawConn x1={SP.x} y1={SP.y} x2={O2.x} y2={O2.y} lit={t > SPLIT_T} />
          {preBall && <SvgCircle cx={preBall.x} cy={preBall.y} r="5" fill="#00D4FF" />}
          {ballR && <SvgCircle cx={ballR.x} cy={ballR.y} r="5" fill="#00D4FF" />}
          {ballD && <SvgCircle cx={ballD.x} cy={ballD.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: SP, type: 'splitter', color: '#00D4FF' },
          { cell: O1, type: 'outputPort', color: '#00C48C' },
          { cell: O2, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      case 'inputPort': {
        const S = getCell(1, 1, 3, 3);
        const r1 = S.r * 0.25 + (t * S.r * 0.6), r2 = S.r * 0.25 + (((t + 0.33) % 1) * S.r * 0.6), r3 = S.r * 0.25 + (((t + 0.66) % 1) * S.r * 0.6);
        const a1 = Math.max(0, 0.35 - t * 0.35), a2 = Math.max(0, 0.35 - ((t + 0.33) % 1) * 0.35), a3 = Math.max(0, 0.35 - ((t + 0.66) % 1) * 0.35);
        return { svgContent: (<>
          <SvgCircle cx={S.x} cy={S.y} r={r1} fill="none" stroke="#F0B429" strokeWidth="1" opacity={a1} />
          <SvgCircle cx={S.x} cy={S.y} r={r2} fill="none" stroke="#F0B429" strokeWidth="1" opacity={a2} />
          <SvgCircle cx={S.x} cy={S.y} r={r3} fill="none" stroke="#F0B429" strokeWidth="1" opacity={a3} />
        </>), pieces: [{ cell: S, type: 'inputPort', color: '#F0B429' }] };
      }
      case 'outputPort': {
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3), C2 = getCell(2, 1, 5, 3), C3 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, C2, C3, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={C2.x} y2={C2.y} lit={t > 0.25} />
          <DrawConn x1={C2.x} y1={C2.y} x2={C3.x} y2={C3.y} lit={t > 0.48} />
          <DrawConn x1={C3.x} y1={C3.y} x2={O.x} y2={O.y} lit={t > 0.68} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' }, { cell: C2, type: 'conveyor', color: '#00D4FF' }, { cell: C3, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
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
          { cell: S, type: 'inputPort', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: CN, type: 'configNode', color: '#A78BFA' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      case 'scanner': {
        const S = getCell(0, 1, 5, 4), C1 = getCell(1, 1, 5, 4), SC = getCell(2, 1, 5, 4), C2 = getCell(3, 1, 5, 4), O = getCell(4, 1, 5, 4), DT = getCell(2, 2, 5, 4);
        const SCAN_T = 0.45, DONE_T = 0.6;
        const isReading = t >= SCAN_T && t < DONE_T, done = t >= DONE_T;
        let ball: { x: number; y: number };
        if (t < SCAN_T) ball = interpPath([S, C1, SC], t, SCAN_T);
        else if (isReading) ball = SC;
        else if (t < 0.9) ball = interpPath([SC, C2, O], t - DONE_T, 0.9 - DONE_T);
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
          { cell: S, type: 'inputPort', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: SC, type: 'scanner', color: '#A78BFA' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
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
          { cell: S, type: 'inputPort', color: '#F0B429' }, { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: TX, type: 'transmitter', color: '#A78BFA' }, { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      case 'merger': {
        // Two inputs converge into one output
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3);
        const S2 = getCell(1, 0, 5, 3), M = getCell(2, 1, 5, 3), O = getCell(3, 1, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, M, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={S2.x} y1={S2.y} x2={M.x} y2={M.y} lit={t > 0.1} />
          <DrawConn x1={C1.x} y1={C1.y} x2={M.x} y2={M.y} lit={t > 0.3} />
          <DrawConn x1={M.x} y1={M.y} x2={O.x} y2={O.y} lit={t > 0.55} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: S2, type: 'conveyor', color: '#00D4FF', rotation: 90 },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: M, type: 'merger', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      case 'bridge': {
        // Horizontal path crosses a vertical conveyor
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3);
        const B = getCell(2, 1, 5, 3), C2 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const VTop = getCell(2, 0, 5, 3), VBot = getCell(2, 2, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, B, C2, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={B.x} y2={B.y} lit={t > 0.25} />
          <DrawConn x1={B.x} y1={B.y} x2={C2.x} y2={C2.y} lit={t > 0.5} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} />
          <DrawConn x1={VTop.x} y1={VTop.y} x2={B.x} y2={B.y} />
          <DrawConn x1={B.x} y1={B.y} x2={VBot.x} y2={VBot.y} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: B, type: 'bridge', color: '#00D4FF' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      case 'inverter': {
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3), I = getCell(2, 1, 5, 3), C2 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, I, C2, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={I.x} y2={I.y} lit={t > 0.25} />
          <DrawConn x1={I.x} y1={I.y} x2={C2.x} y2={C2.y} lit={t > 0.5} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: I, type: 'inverter', color: '#8B5CF6' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      case 'counter': {
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3), CT = getCell(2, 1, 5, 3), C2 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, CT, C2, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={CT.x} y2={CT.y} lit={t > 0.25} />
          <DrawConn x1={CT.x} y1={CT.y} x2={C2.x} y2={C2.y} lit={t > 0.5} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: CT, type: 'counter', color: '#8B5CF6' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      case 'latch': {
        const S = getCell(0, 1, 5, 3), C1 = getCell(1, 1, 5, 3), L = getCell(2, 1, 5, 3), C2 = getCell(3, 1, 5, 3), O = getCell(4, 1, 5, 3);
        const ball = t < 0.85 ? interpPath([S, C1, L, C2, O], t, 0.85) : O;
        return { svgContent: (<>
          <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} />
          <DrawConn x1={C1.x} y1={C1.y} x2={L.x} y2={L.y} lit={t > 0.25} />
          <DrawConn x1={L.x} y1={L.y} x2={C2.x} y2={C2.y} lit={t > 0.5} />
          <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} />
          {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
        </>), pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: L, type: 'latch', color: '#8B5CF6' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'outputPort', color: '#00C48C' },
        ] };
      }
      default: {
        const S = getCell(0, 1, 5, 3), O = getCell(4, 1, 5, 3);
        return { svgContent: null, pieces: [
          { cell: S, type: 'inputPort', color: '#F0B429' }, { cell: O, type: 'outputPort', color: '#00C48C' },
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
        {simPieces.map((p, i) => (
          <SimPiece key={i} cell={p.cell} type={p.type} color={p.color} rotation={(p as { rotation?: number }).rotation ?? 0} />
        ))}
      </View>
    </View>
  );
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
});

const st = StyleSheet.create({
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
  cogsLabel: {
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
