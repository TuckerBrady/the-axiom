import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated, Easing as RNEasing } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  Rect as SvgRect,
  Line as SvgLine,
  Text as SvgText,
} from 'react-native-svg';
import { PieceIcon } from './PieceIcon';
import { Colors, Fonts, Spacing } from '../theme/tokens';
import {
  SIM_W,
  SIM_H,
  getCell,
  interpPath,
  cumulativeDistances,
  posAlongChain,
  computePhase,
  PHYSICS_CYCLE_MS,
  type Phase,
} from './pieceSimulationMath';

export { SIM_W, SIM_H, getCell, interpPath, cumulativeDistances, posAlongChain, computePhase };

const PHYSICS_TYPES = new Set([
  'conveyor',
  'gear',
  'splitter',
  'source',
  'terminal',
  'output',
]);

const AMBER = '#F0B429';
const GREEN = '#22C55E';
const TERM_GREEN = '#00C48C';

// ─── SVG primitives ────────────────────────────────────────────────────────

function DrawConn({
  x1, y1, x2, y2, lit, litColor = 'rgba(240,180,41,0.6)',
}: {
  x1: number; y1: number; x2: number; y2: number;
  lit?: boolean; litColor?: string;
}) {
  return (
    <SvgLine
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={lit ? litColor : 'rgba(0,212,255,0.12)'}
      strokeWidth={lit ? 1.5 : 1}
      strokeDasharray="4,4"
    />
  );
}

function DrawDataTrail({
  cx, cy, r, val, highlight,
}: {
  cx: number; cy: number; r: number; val: string; highlight?: boolean;
}) {
  const sz = r * 0.32;
  return (
    <>
      <SvgRect
        x={cx - sz} y={cy - sz} width={sz * 2} height={sz * 2} rx="3"
        fill={highlight ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.04)'}
        stroke={highlight ? '#00D4FF' : 'rgba(0,212,255,0.2)'}
        strokeWidth="1"
      />
      <SvgText
        x={cx} y={cy + 4}
        fill={highlight ? '#00D4FF' : 'rgba(0,212,255,0.4)'}
        fontSize="10" fontFamily="monospace" textAnchor="middle"
      >
        {val}
      </SvgText>
    </>
  );
}

// ─── SimPiece ──────────────────────────────────────────────────────────────

type SimPieceProps = {
  cell: { x: number; y: number; r: number };
  type: string;
  color: string;
  rotation?: number;
  charging?: boolean;
  rolling?: boolean;
  spinning?: boolean;
  splitting?: boolean;
  locking?: boolean;
};

function SimPiece({
  cell, type, color, rotation = 0,
  charging, rolling, spinning, splitting, locking,
}: SimPieceProps) {
  const sz = cell.r * 0.8;
  return (
    <View style={{
      position: 'absolute',
      left: cell.x - sz / 2,
      top: cell.y - sz / 2,
      width: sz, height: sz,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
        <PieceIcon
          type={type as Parameters<typeof PieceIcon>[0]['type']}
          size={sz}
          color={color}
          charging={charging}
          rolling={rolling}
          spinning={spinning}
          splitting={splitting}
          locking={locking}
        />
      </View>
    </View>
  );
}

// ─── Simulation captions ───────────────────────────────────────────────────

const SIM_CAPTIONS: Record<string, string> = {
  source: 'Signal originates here. The circuit begins.',
  output: 'Signal must arrive here. The circuit ends.',
  terminal: 'Signal must arrive here. The circuit ends.',
  conveyor: 'Signal travels straight. Direction is set before placement.',
  gear: 'The only piece that changes signal direction.',
  splitter: 'Signal enters once. Two full-strength paths exit simultaneously.',
  config_node: 'Signal passes only when the trail condition is satisfied.',
  configNode: 'Signal passes only when the trail condition is satisfied.',
  scanner: 'Reads the Data Trail. Stores the value. Changes nothing.',
  transmitter: 'Writes a value to the Data Trail as signal passes through.',
  merger: 'Two input paths converge into one output.',
  bridge: 'Two paths cross without interfering.',
  inverter: 'Flips the signal value: 0 becomes 1, 1 becomes 0.',
  counter: 'Tracks how many signals have passed through.',
  latch: 'Holds a value; reads or writes depending on mode.',
};

// ─── PieceSimulation ──────────────────────────────────────────────────────

export interface PieceSimulationProps {
  pieceType: string;
}

export default function PieceSimulation({ pieceType }: PieceSimulationProps) {
  const animVal = useRef(new RNAnimated.Value(0)).current;
  const [t, setT] = useState(0);

  // Physics pieces loop on the 1700ms charge/beam/lock/pause cycle.
  // Protocol pieces keep the original 3600ms linear cycle (sliding dot).
  const type = pieceType === 'config_node' ? 'configNode' : pieceType;
  const isPhysics = PHYSICS_TYPES.has(type);
  const cycleMs = isPhysics ? PHYSICS_CYCLE_MS : 3600;

  useEffect(() => {
    const id = animVal.addListener(({ value }) => setT(value));
    const loop = RNAnimated.loop(
      RNAnimated.timing(animVal, {
        toValue: 1,
        duration: cycleMs,
        easing: RNEasing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => { loop.stop(); animVal.removeListener(id); };
  }, [pieceType, cycleMs, animVal]);

  const caption = SIM_CAPTIONS[pieceType] ?? SIM_CAPTIONS[type] ?? 'Field simulation.';

  const { svgContent, pieces: simPieces } = isPhysics
    ? renderPhysicsSim(type, t)
    : renderProtocolSim(type, t);

  return (
    <View style={simStyles.container}>
      <Text style={simStyles.label}>FIELD SIMULATION</Text>
      <View style={[simStyles.canvas, { position: 'relative' }]}>
        <Svg width={SIM_W} height={SIM_H}>{svgContent}</Svg>
        {simPieces.map((p, i) => (
          <SimPiece
            key={i}
            cell={p.cell}
            type={p.type}
            color={p.color}
            rotation={p.rotation ?? 0}
            charging={p.charging}
            rolling={p.rolling}
            spinning={p.spinning}
            splitting={p.splitting}
            locking={p.locking}
          />
        ))}
      </View>
      <Text style={simStyles.caption}>{caption}</Text>
    </View>
  );
}

// ─── Physics renderer ─────────────────────────────────────────────────────

type Cell = { x: number; y: number; r: number };
type PieceDef = {
  cell: Cell;
  type: string;
  color: string;
  rotation?: number;
  charging?: boolean;
  rolling?: boolean;
  spinning?: boolean;
  splitting?: boolean;
  locking?: boolean;
};

type SimData = { svgContent: React.ReactNode; pieces: PieceDef[] };

function renderPhysicsSim(type: string, t: number): SimData {
  const { phase, progress } = computePhase(t);

  switch (type) {
    case 'conveyor': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const C2 = getCell(2, 1, 5, 3);
      const C3 = getCell(3, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      const waypoints = [S, C1, C2, C3, O];
      return renderLinearPhysics({
        phase, progress, waypoints, S, O,
        pieces: [
          { cell: S, type: 'source', color: AMBER },
          { cell: C1, type: 'conveyor', color: AMBER },
          { cell: C2, type: 'conveyor', color: AMBER },
          { cell: C3, type: 'conveyor', color: AMBER },
          { cell: O, type: 'terminal', color: TERM_GREEN },
        ],
      });
    }
    case 'gear': {
      const S = getCell(0, 1, 5, 4);
      const C1 = getCell(1, 1, 5, 4);
      const G = getCell(2, 1, 5, 4);
      const C2 = getCell(2, 2, 5, 4);
      const O = getCell(2, 3, 5, 4);
      const waypoints = [S, C1, G, C2, O];
      return renderLinearPhysics({
        phase, progress, waypoints, S, O,
        pieces: [
          { cell: S, type: 'source', color: AMBER, rotation: 0 },
          { cell: C1, type: 'conveyor', color: AMBER, rotation: 0 },
          { cell: G, type: 'gear', color: AMBER, rotation: 0 },
          { cell: C2, type: 'conveyor', color: AMBER, rotation: 90 },
          { cell: O, type: 'terminal', color: TERM_GREEN, rotation: 0 },
        ],
      });
    }
    case 'source': {
      const S = getCell(1, 1, 3, 3);
      // Amber charge rings loop steadily; Source piece always charging.
      const r1 = S.r * 0.25 + (t * S.r * 0.6);
      const r2 = S.r * 0.25 + (((t + 0.33) % 1) * S.r * 0.6);
      const r3 = S.r * 0.25 + (((t + 0.66) % 1) * S.r * 0.6);
      const a1 = Math.max(0, 0.35 - t * 0.35);
      const a2 = Math.max(0, 0.35 - ((t + 0.33) % 1) * 0.35);
      const a3 = Math.max(0, 0.35 - ((t + 0.66) % 1) * 0.35);
      return {
        svgContent: (
          <>
            <SvgCircle cx={S.x} cy={S.y} r={r1} fill="none" stroke={AMBER} strokeWidth="1" opacity={a1} />
            <SvgCircle cx={S.x} cy={S.y} r={r2} fill="none" stroke={AMBER} strokeWidth="1" opacity={a2} />
            <SvgCircle cx={S.x} cy={S.y} r={r3} fill="none" stroke={AMBER} strokeWidth="1" opacity={a3} />
          </>
        ),
        pieces: [{ cell: S, type: 'source', color: AMBER, charging: true }],
      };
    }
    case 'terminal':
    case 'output': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const C2 = getCell(2, 1, 5, 3);
      const C3 = getCell(3, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      const waypoints = [S, C1, C2, C3, O];
      return renderLinearPhysics({
        phase, progress, waypoints, S, O,
        pieces: [
          { cell: S, type: 'source', color: AMBER },
          { cell: C1, type: 'conveyor', color: AMBER },
          { cell: C2, type: 'conveyor', color: AMBER },
          { cell: C3, type: 'conveyor', color: AMBER },
          { cell: O, type: 'terminal', color: TERM_GREEN },
        ],
      });
    }
    case 'splitter': {
      const S = getCell(0, 0, 4, 2);
      const C1 = getCell(1, 0, 4, 2);
      const SP = getCell(2, 0, 4, 2);
      const O1 = getCell(3, 0, 4, 2);
      const O2 = getCell(2, 1, 4, 2);
      return renderSplitterPhysics({
        phase, progress, S, C1, SP, O1, O2,
      });
    }
    default: {
      const S = getCell(0, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      return {
        svgContent: null,
        pieces: [
          { cell: S, type: 'source', color: AMBER },
          { cell: O, type: 'terminal', color: TERM_GREEN },
        ],
      };
    }
  }
}

// Shared linear-path renderer for conveyor / gear / terminal sims.
function renderLinearPhysics(args: {
  phase: Phase;
  progress: number;
  waypoints: Cell[];
  S: Cell;
  O: Cell;
  pieces: PieceDef[];
}): SimData {
  const { phase, progress, waypoints, S, O, pieces } = args;

  // Beam state — only during 'beam' phase.
  const beamProgress = phase === 'beam' ? progress : phase === 'lock' || phase === 'pause' ? 1 : 0;
  const head = posAlongChain(waypoints, beamProgress);

  // Which waypoint index the beam has reached (inclusive).
  const reachedIdx = beamProgress >= 1
    ? waypoints.length - 1
    : head.reachedIndex;

  // Trail polyline = all waypoints up to reachedIdx plus current head position.
  const trailPoints: { x: number; y: number }[] = [];
  if (phase !== 'charge') {
    for (let i = 0; i <= reachedIdx; i++) trailPoints.push(waypoints[i]);
    if (beamProgress > 0 && beamProgress < 1) trailPoints.push({ x: head.x, y: head.y });
    if (beamProgress >= 1) trailPoints.push(waypoints[waypoints.length - 1]);
  }

  const trailOpacity = phase === 'pause' ? Math.max(0, 0.6 - progress * 0.6) : 0.6;

  const pieceDefs: PieceDef[] = pieces.map((p, i) => {
    // Source charges only during charge phase.
    const isSource = i === 0;
    const isTerminal = i === pieces.length - 1;
    const reached = phase !== 'charge' && reachedIdx >= i && phase !== 'pause';
    return {
      ...p,
      charging: isSource && phase === 'charge',
      rolling: !isSource && !isTerminal && reached && p.type === 'conveyor',
      spinning: reached && p.type === 'gear',
      splitting: reached && p.type === 'splitter',
      locking: isTerminal && (phase === 'lock'),
    };
  });

  // Charge rings at Source during charge phase.
  const chargeRing = phase === 'charge' ? renderChargeRings(S, progress) : null;

  // Lock green pulse at Terminal during lock phase.
  const lockPulse = phase === 'lock' ? renderLockPulse(O, progress) : null;

  return {
    svgContent: (
      <>
        {/* Connectors — dashed wires. Light up once the head has passed. */}
        {waypoints.slice(0, -1).map((w, i) => {
          const next = waypoints[i + 1];
          const lit = phase !== 'charge' && reachedIdx > i && phase !== 'pause';
          return (
            <DrawConn
              key={`c-${i}`}
              x1={w.x} y1={w.y} x2={next.x} y2={next.y}
              lit={lit}
            />
          );
        })}
        {/* Beam trail + head + glow */}
        {phase !== 'charge' && trailPoints.length >= 2 && (
          <>
            {trailPoints.slice(0, -1).map((p, i) => (
              <SvgLine
                key={`trail-${i}`}
                x1={p.x} y1={p.y}
                x2={trailPoints[i + 1].x} y2={trailPoints[i + 1].y}
                stroke={AMBER}
                strokeWidth={2}
                opacity={trailOpacity}
              />
            ))}
          </>
        )}
        {phase === 'beam' && (
          <>
            <SvgCircle cx={head.x} cy={head.y} r={8} fill={AMBER} opacity={0.2} />
            <SvgCircle cx={head.x} cy={head.y} r={4} fill={AMBER} />
          </>
        )}
        {chargeRing}
        {lockPulse}
      </>
    ),
    pieces: pieceDefs,
  };
}

function renderSplitterPhysics(args: {
  phase: Phase;
  progress: number;
  S: Cell;
  C1: Cell;
  SP: Cell;
  O1: Cell;
  O2: Cell;
}): SimData {
  const { phase, progress, S, C1, SP, O1, O2 } = args;

  // Pre-fork waypoints + each branch after the split.
  const preFork = [S, C1, SP];
  const branchA = [SP, O1];
  const branchB = [SP, O2];

  // Split the beam progress: first 50% = preFork, last 50% = both branches.
  const SPLIT_POINT = 0.5;
  const beamPhaseProgress = phase === 'beam'
    ? progress
    : phase === 'lock' || phase === 'pause' ? 1 : 0;

  const preForkP = phase === 'charge' ? 0 : Math.min(1, beamPhaseProgress / SPLIT_POINT);
  const branchP = phase === 'charge' ? 0 : Math.max(0, (beamPhaseProgress - SPLIT_POINT) / (1 - SPLIT_POINT));
  const branchPClamped = Math.min(1, branchP);

  const preHead = posAlongChain(preFork, preForkP);
  const headA = posAlongChain(branchA, branchPClamped);
  const headB = posAlongChain(branchB, branchPClamped);

  const reachedPre = preForkP >= 1 ? preFork.length - 1 : preHead.reachedIndex;
  const splitterReached = reachedPre >= 2; // SP index in preFork
  const branchActive = phase === 'beam' && branchP > 0;
  const trailOpacity = phase === 'pause' ? Math.max(0, 0.6 - progress * 0.6) : 0.6;

  const pieces: PieceDef[] = [
    {
      cell: S, type: 'source', color: AMBER,
      charging: phase === 'charge',
    },
    {
      cell: C1, type: 'conveyor', color: AMBER,
      rolling: phase !== 'charge' && reachedPre >= 1 && phase !== 'pause',
    },
    {
      cell: SP, type: 'splitter', color: AMBER,
      splitting: phase !== 'charge' && splitterReached && phase !== 'pause',
    },
    {
      cell: O1, type: 'terminal', color: TERM_GREEN,
      locking: phase === 'lock',
    },
    {
      cell: O2, type: 'terminal', color: TERM_GREEN,
      locking: phase === 'lock',
    },
  ];

  // Pre-fork trail.
  const preTrail: { x: number; y: number }[] = [];
  if (phase !== 'charge') {
    for (let i = 0; i <= reachedPre; i++) preTrail.push(preFork[i]);
    if (preForkP > 0 && preForkP < 1) preTrail.push({ x: preHead.x, y: preHead.y });
    if (preForkP >= 1) preTrail.push(preFork[preFork.length - 1]);
  }

  // Branch trails — only when branches have started.
  const trailA: { x: number; y: number }[] = branchActive
    ? [SP, { x: headA.x, y: headA.y }]
    : phase === 'lock' || phase === 'pause'
      ? [SP, O1]
      : [];
  const trailB: { x: number; y: number }[] = branchActive
    ? [SP, { x: headB.x, y: headB.y }]
    : phase === 'lock' || phase === 'pause'
      ? [SP, O2]
      : [];

  const chargeRing = phase === 'charge' ? renderChargeRings(S, progress) : null;
  const lockPulseA = phase === 'lock' ? renderLockPulse(O1, progress) : null;
  const lockPulseB = phase === 'lock' ? renderLockPulse(O2, progress) : null;

  return {
    svgContent: (
      <>
        <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y}
          lit={phase !== 'charge' && reachedPre >= 1 && phase !== 'pause'} />
        <DrawConn x1={C1.x} y1={C1.y} x2={SP.x} y2={SP.y}
          lit={phase !== 'charge' && reachedPre >= 2 && phase !== 'pause'} />
        <DrawConn x1={SP.x} y1={SP.y} x2={O1.x} y2={O1.y}
          lit={phase !== 'charge' && branchP > 0 && phase !== 'pause'} />
        <DrawConn x1={SP.x} y1={SP.y} x2={O2.x} y2={O2.y}
          lit={phase !== 'charge' && branchP > 0 && phase !== 'pause'} />

        {/* Pre-fork trail */}
        {preTrail.length >= 2 && preTrail.slice(0, -1).map((p, i) => (
          <SvgLine
            key={`pre-${i}`}
            x1={p.x} y1={p.y}
            x2={preTrail[i + 1].x} y2={preTrail[i + 1].y}
            stroke={AMBER}
            strokeWidth={2}
            opacity={trailOpacity}
          />
        ))}
        {/* Branch A trail */}
        {trailA.length >= 2 && (
          <SvgLine
            x1={trailA[0].x} y1={trailA[0].y}
            x2={trailA[1].x} y2={trailA[1].y}
            stroke={AMBER}
            strokeWidth={2}
            opacity={trailOpacity}
          />
        )}
        {/* Branch B trail */}
        {trailB.length >= 2 && (
          <SvgLine
            x1={trailB[0].x} y1={trailB[0].y}
            x2={trailB[1].x} y2={trailB[1].y}
            stroke={AMBER}
            strokeWidth={2}
            opacity={trailOpacity}
          />
        )}

        {/* Pre-fork head (only while preForkP < 1) */}
        {phase === 'beam' && preForkP < 1 && (
          <>
            <SvgCircle cx={preHead.x} cy={preHead.y} r={8} fill={AMBER} opacity={0.2} />
            <SvgCircle cx={preHead.x} cy={preHead.y} r={4} fill={AMBER} />
          </>
        )}
        {/* Two branch heads after the split */}
        {branchActive && branchP < 1 && (
          <>
            <SvgCircle cx={headA.x} cy={headA.y} r={8} fill={AMBER} opacity={0.2} />
            <SvgCircle cx={headA.x} cy={headA.y} r={4} fill={AMBER} />
            <SvgCircle cx={headB.x} cy={headB.y} r={8} fill={AMBER} opacity={0.2} />
            <SvgCircle cx={headB.x} cy={headB.y} r={4} fill={AMBER} />
          </>
        )}

        {chargeRing}
        {lockPulseA}
        {lockPulseB}
      </>
    ),
    pieces,
  };
}

function renderChargeRings(S: Cell, progress: number) {
  // Two expanding amber rings during the charge phase.
  const r1 = S.r * 0.3 + progress * S.r * 0.7;
  const r2 = S.r * 0.3 + ((progress + 0.4) % 1) * S.r * 0.7;
  const a1 = Math.max(0, 0.4 * (1 - progress));
  const a2 = Math.max(0, 0.4 * (1 - ((progress + 0.4) % 1)));
  return (
    <>
      <SvgCircle cx={S.x} cy={S.y} r={r1} fill="none" stroke={AMBER} strokeWidth="1" opacity={a1} />
      <SvgCircle cx={S.x} cy={S.y} r={r2} fill="none" stroke={AMBER} strokeWidth="1" opacity={a2} />
    </>
  );
}

function renderLockPulse(O: Cell, progress: number) {
  // Green glow pulse at Terminal during the lock phase.
  const r = 4 + progress * 12;
  const opacity = Math.max(0, 0.5 * (1 - progress));
  return (
    <SvgCircle cx={O.x} cy={O.y} r={r} fill={GREEN} opacity={opacity} />
  );
}

// ─── Protocol renderer (unchanged from previous CodexDetailView) ──────────

function renderProtocolSim(type: string, t: number): SimData {
  switch (type) {
    case 'configNode': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const CN = getCell(2, 1, 5, 3);
      const C2 = getCell(3, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      const CHECK_T = 0.45;
      const PASS_T = 0.58;
      const isPaused = t >= CHECK_T && t < PASS_T;
      const passed = t >= PASS_T;
      let ball: { x: number; y: number };
      if (t < CHECK_T) ball = interpPath([S, C1, CN], t, CHECK_T);
      else if (isPaused) ball = CN;
      else if (t < 0.9) ball = interpPath([CN, C2, O], (t - PASS_T) / (0.9 - PASS_T) * 0.85, 0.85);
      else ball = O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={CN.x} y2={CN.y} lit={t > 0.25} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={CN.x} y1={CN.y} x2={C2.x} y2={C2.y} lit={passed} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.75} litColor="rgba(0,212,255,0.6)" />
            {isPaused && <SvgText x={CN.x} y={CN.y - CN.r * 0.55} fill="#A78BFA" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity={0.8}>CHECKING</SvgText>}
            {passed && t < PASS_T + 0.08 && <SvgText x={CN.x} y={CN.y - CN.r * 0.55} fill="#00C48C" fontSize="9" fontFamily="monospace" textAnchor="middle" fontWeight="bold">PASS</SvgText>}
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill={isPaused || passed ? '#A78BFA' : '#00D4FF'} />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: CN, type: 'configNode', color: '#A78BFA' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    case 'scanner': {
      const S = getCell(0, 1, 5, 4);
      const C1 = getCell(1, 1, 5, 4);
      const SC = getCell(2, 1, 5, 4);
      const C2 = getCell(3, 1, 5, 4);
      const O = getCell(4, 1, 5, 4);
      const DT = getCell(2, 2, 5, 4);
      const SCAN_T = 0.45;
      const DONE_T = 0.6;
      const isReading = t >= SCAN_T && t < DONE_T;
      const done = t >= DONE_T;
      let ball: { x: number; y: number };
      if (t < SCAN_T) ball = interpPath([S, C1, SC], t, SCAN_T);
      else if (isReading) ball = SC;
      else if (t < 0.9) ball = interpPath([SC, C2, O], t - DONE_T, 0.9 - DONE_T);
      else ball = O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={SC.x} y2={SC.y} lit={t > 0.25} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={SC.x} y1={SC.y} x2={C2.x} y2={C2.y} lit={done} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.75} litColor="rgba(0,212,255,0.6)" />
            {isReading && <SvgLine x1={SC.x} y1={SC.y + SC.r * 0.4} x2={DT.x} y2={DT.y - DT.r * 0.35} stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="3,3" opacity={0.7} />}
            <DrawDataTrail cx={DT.x} cy={DT.y} r={DT.r} val="1" highlight={isReading || done} />
            {done && t < DONE_T + 0.1 && <SvgText x={SC.x + SC.r * 0.5} y={SC.y - SC.r * 0.45} fill="#A78BFA" fontSize="7" fontFamily="monospace" opacity={0.8}>STORED</SvgText>}
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill={isReading || done ? '#A78BFA' : '#00D4FF'} />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: SC, type: 'scanner', color: '#A78BFA' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    case 'transmitter': {
      const S = getCell(0, 1, 5, 4);
      const C1 = getCell(1, 1, 5, 4);
      const TX = getCell(2, 1, 5, 4);
      const C2 = getCell(3, 1, 5, 4);
      const O = getCell(4, 1, 5, 4);
      const DT = getCell(2, 2, 5, 4);
      const WRITE_T = 0.45;
      const DONE_T = 0.58;
      const isWriting = t >= WRITE_T && t < DONE_T;
      const done = t >= DONE_T;
      let ball: { x: number; y: number };
      if (t < WRITE_T) ball = interpPath([S, C1, TX], t, WRITE_T);
      else if (isWriting) ball = TX;
      else if (t < 0.9) ball = interpPath([TX, C2, O], (t - DONE_T) / (0.9 - DONE_T) * 0.85, 0.85);
      else ball = O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={TX.x} y2={TX.y} lit={t > 0.25} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={TX.x} y1={TX.y} x2={C2.x} y2={C2.y} lit={done} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.75} litColor="rgba(0,212,255,0.6)" />
            {isWriting && <SvgLine x1={TX.x} y1={TX.y + TX.r * 0.4} x2={DT.x} y2={DT.y - DT.r * 0.35} stroke="#A78BFA" strokeWidth="2" opacity={0.9} />}
            <DrawDataTrail cx={DT.x} cy={DT.y} r={DT.r} val={done ? '1' : '0'} highlight={isWriting || done} />
            {isWriting && <SvgText x={TX.x + TX.r * 0.5} y={TX.y - TX.r * 0.45} fill="#A78BFA" fontSize="7" fontFamily="monospace" opacity={0.8}>WRITING</SvgText>}
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill={isWriting || done ? '#A78BFA' : '#00D4FF'} />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: TX, type: 'transmitter', color: '#A78BFA' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    case 'merger': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const S2 = getCell(1, 0, 5, 3);
      const M = getCell(2, 1, 5, 3);
      const O = getCell(3, 1, 5, 3);
      const ball = t < 0.85 ? interpPath([S, C1, M, O], t, 0.85) : O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={S2.x} y1={S2.y} x2={M.x} y2={M.y} lit={t > 0.1} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={M.x} y2={M.y} lit={t > 0.3} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={M.x} y1={M.y} x2={O.x} y2={O.y} lit={t > 0.55} litColor="rgba(0,212,255,0.6)" />
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: S2, type: 'conveyor', color: '#00D4FF', rotation: 90 },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: M, type: 'merger', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    case 'bridge': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const B = getCell(2, 1, 5, 3);
      const C2 = getCell(3, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      const VTop = getCell(2, 0, 5, 3);
      const VBot = getCell(2, 2, 5, 3);
      const ball = t < 0.85 ? interpPath([S, C1, B, C2, O], t, 0.85) : O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={B.x} y2={B.y} lit={t > 0.25} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={B.x} y1={B.y} x2={C2.x} y2={C2.y} lit={t > 0.5} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={VTop.x} y1={VTop.y} x2={B.x} y2={B.y} />
            <DrawConn x1={B.x} y1={B.y} x2={VBot.x} y2={VBot.y} />
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: B, type: 'bridge', color: '#00D4FF' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    case 'inverter': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const I = getCell(2, 1, 5, 3);
      const C2 = getCell(3, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      const ball = t < 0.85 ? interpPath([S, C1, I, C2, O], t, 0.85) : O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={I.x} y2={I.y} lit={t > 0.25} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={I.x} y1={I.y} x2={C2.x} y2={C2.y} lit={t > 0.5} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} litColor="rgba(0,212,255,0.6)" />
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: I, type: 'inverter', color: '#8B5CF6' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    case 'counter': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const CT = getCell(2, 1, 5, 3);
      const C2 = getCell(3, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      const ball = t < 0.85 ? interpPath([S, C1, CT, C2, O], t, 0.85) : O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={CT.x} y2={CT.y} lit={t > 0.25} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={CT.x} y1={CT.y} x2={C2.x} y2={C2.y} lit={t > 0.5} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} litColor="rgba(0,212,255,0.6)" />
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: CT, type: 'counter', color: '#8B5CF6' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    case 'latch': {
      const S = getCell(0, 1, 5, 3);
      const C1 = getCell(1, 1, 5, 3);
      const L = getCell(2, 1, 5, 3);
      const C2 = getCell(3, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      const ball = t < 0.85 ? interpPath([S, C1, L, C2, O], t, 0.85) : O;
      return {
        svgContent: (
          <>
            <DrawConn x1={S.x} y1={S.y} x2={C1.x} y2={C1.y} lit={t > 0.05} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C1.x} y1={C1.y} x2={L.x} y2={L.y} lit={t > 0.25} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={L.x} y1={L.y} x2={C2.x} y2={C2.y} lit={t > 0.5} litColor="rgba(0,212,255,0.6)" />
            <DrawConn x1={C2.x} y1={C2.y} x2={O.x} y2={O.y} lit={t > 0.7} litColor="rgba(0,212,255,0.6)" />
            {t < 0.95 && <SvgCircle cx={ball.x} cy={ball.y} r="5" fill="#00D4FF" />}
          </>
        ),
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: C1, type: 'conveyor', color: '#00D4FF' },
          { cell: L, type: 'latch', color: '#8B5CF6' },
          { cell: C2, type: 'conveyor', color: '#00D4FF' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
    default: {
      const S = getCell(0, 1, 5, 3);
      const O = getCell(4, 1, 5, 3);
      return {
        svgContent: null,
        pieces: [
          { cell: S, type: 'source', color: '#F0B429' },
          { cell: O, type: 'terminal', color: '#00C48C' },
        ],
      };
    }
  }
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
  caption: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    textAlign: 'center',
  },
});

