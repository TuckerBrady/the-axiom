import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/RootNavigator';
import StarField from '../components/StarField';
import CogsAvatar from '../components/CogsAvatar';
import { BackButton } from '../components/BackButton';
import PadlockIcon from '../components/icons/PadlockIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import { getLevelById, AXIOM_LEVELS } from '../game/levels';
import { useProgressionStore } from '../store/progressionStore';

const { width: W, height: H } = Dimensions.get('window');

// ─── Map geometry ──────────────────────────────────────────────────────────────

const NODE_R = 22;
const COL_GAP = 88;
const ROW_GAP = 80;
const COLS = [NODE_R, NODE_R + COL_GAP, NODE_R + 2 * COL_GAP]; // [22, 110, 198]
const ROWS = [NODE_R, NODE_R + ROW_GAP, NODE_R + 2 * ROW_GAP, NODE_R + 3 * ROW_GAP]; // [22,102,182,262]
const MAP_W = COLS[2] + NODE_R; // 220
const MAP_H = ROWS[3] + NODE_R; // 284

// Snake: [col, row] for each node id 1-12
const NODE_CR: [number, number][] = [
  [0,0],[1,0],[2,0],
  [2,1],[1,1],[0,1],
  [0,2],[1,2],[2,2],
  [2,3],[1,3],[0,3],
];

function nxy(id: number) {
  const [c, r] = NODE_CR[id - 1];
  return { x: COLS[c], y: ROWS[r] };
}

const SEGMENTS: [number, number][] = [
  [1,2],[2,3],[3,4],[4,5],[5,6],
  [6,7],[7,8],[8,9],[9,10],[10,11],[11,12],
];

// ─── Mission data ──────────────────────────────────────────────────────────────

type MissionIconType = 'bolt' | 'signal' | 'plug' | 'atom' | 'vortex' | 'fire' | 'moon' | 'void' | 'radio' | 'magnet' | 'sparkle' | 'rocket';

type Mission = {
  id: number;
  name: string;
  iconType: MissionIconType;
  stars: number;
  bestTime: string;
  piecesUsed: number;
  cogsQuote: string;
};

function MissionIcon({ type, size = 24, color = Colors.blue }: { type: MissionIconType; size?: number; color?: string }) {
  switch (type) {
    case 'bolt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M13 2 L5 14 L11 14 L10 22 L19 10 L13 10 Z" fill={color} opacity={0.85} />
        </Svg>
      );
    case 'signal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="18" r="2" fill={color} />
          <Path d="M8.5 14.5 A5 5 0 0 1 15.5 14.5" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M5.5 11.5 A9 9 0 0 1 18.5 11.5" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Line x1="12" y1="4" x2="12" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'plug':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="9" y1="3" x2="9" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="15" y1="3" x2="15" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Rect x="6" y="8" width="12" height="6" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}22`} />
          <Line x1="12" y1="14" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'atom':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="2.5" fill={color} />
          <Path d="M12 4 Q18 8 18 12 Q18 16 12 20 Q6 16 6 12 Q6 8 12 4 Z" stroke={color} strokeWidth="1.2" fill="none" />
          <Path d="M5 7 Q9 12 12 12 Q15 12 19 7" stroke={color} strokeWidth="1.2" fill="none" />
          <Path d="M5 17 Q9 12 12 12 Q15 12 19 17" stroke={color} strokeWidth="1.2" fill="none" />
        </Svg>
      );
    case 'vortex':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 4 A8 8 0 0 1 20 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M20 12 A8 8 0 0 1 12 20" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M12 20 A8 8 0 0 1 4 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M4 12 A8 8 0 0 1 12 4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.2" fill={`${color}33`} />
        </Svg>
      );
    case 'fire':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2 C12 2 16 7 17 11 C18 15 15 20 12 21 C9 20 6 15 7 11 C8 7 12 2 12 2 Z" fill={color} opacity={0.8} />
          <Path d="M12 10 C12 10 14 13 14 15 C14 17 13 18 12 18 C11 18 10 17 10 15 C10 13 12 10 12 10 Z" fill={Colors.void} opacity={0.6} />
        </Svg>
      );
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M20 12 A8 8 0 1 1 10 4 A6 6 0 0 0 20 12 Z" fill={color} opacity={0.8} />
        </Svg>
      );
    case 'void':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill={`${color}11`} />
          <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1" fill={`${color}22`} />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
        </Svg>
      );
    case 'radio':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="8" width="16" height="12" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}15`} />
          <Circle cx="15" cy="14" r="3" stroke={color} strokeWidth="1.2" fill="none" />
          <Line x1="7" y1="12" x2="11" y2="12" stroke={color} strokeWidth="1" strokeLinecap="round" />
          <Line x1="7" y1="14" x2="10" y2="14" stroke={color} strokeWidth="1" strokeLinecap="round" />
          <Line x1="7" y1="16" x2="11" y2="16" stroke={color} strokeWidth="1" strokeLinecap="round" />
          <Line x1="8" y1="4" x2="12" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'magnet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M7 4 L7 13 A5 5 0 0 0 17 13 L17 4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
          <Line x1="5" y1="4" x2="9" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <Line x1="15" y1="4" x2="19" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
      );
    case 'sparkle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2 L13.5 9 L20 8 L14.5 12 L18 19 L12 14 L6 19 L9.5 12 L4 8 L10.5 9 Z" fill={color} opacity={0.85} />
        </Svg>
      );
    case 'rocket':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3 C12 3 8 8 8 14 L10 16 L14 16 L16 14 C16 8 12 3 12 3 Z" stroke={color} strokeWidth="1.5" fill={`${color}22`} />
          <Circle cx="12" cy="11" r="1.5" fill={color} />
          <Path d="M8 14 L5 17 L8 16 Z" fill={color} opacity={0.7} />
          <Path d="M16 14 L19 17 L16 16 Z" fill={color} opacity={0.7} />
          <Path d="M10 16 L10 19 L12 18 L14 19 L14 16" stroke={color} strokeWidth="1" fill={`${color}44`} />
        </Svg>
      );
  }
}

const MISSIONS: Mission[] = [
  { id:1, name:'First Contact', iconType:'bolt', stars:3, bestTime:'2:14', piecesUsed:8,
    cogsQuote:'Your first run through Kepler. You were sloppy but effective. Three stars. I have logged this as a miracle.' },
  { id:2, name:'Signal Drift', iconType:'signal', stars:2, bestTime:'3:41', piecesUsed:11,
    cogsQuote:'The relay was drifting and you caught it. Two stars. The third one watched you leave without it.' },
  { id:3, name:'Relay Breach', iconType:'plug', stars:3, bestTime:'1:58', piecesUsed:7,
    cogsQuote:'Breach sealed. Three stars. I am recalibrating my expectations upward. Briefly.' },
  { id:4, name:'Ion Cascade', iconType:'atom', stars:3, bestTime:'2:33', piecesUsed:9,
    cogsQuote:'Ion flow stabilised. The belt respects you now. That is more than I can say for most.' },
  { id:5, name:'Flux Resonance', iconType:'vortex', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'Resonance patterns are unstable here. You will need to be quick and exact. I believe in you. Statistically.' },
  { id:6, name:'Core Overload', iconType:'fire', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'The core is running hot. You have not been here yet. I recommend caution and a secondary plan.' },
  { id:7, name:'Null Space', iconType:'moon', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'Nothing broadcasts from here. That is not reassuring. Complete earlier missions to access.' },
  { id:8, name:'Void Walker', iconType:'void', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'Deepest void corridor in the belt. I do not have clearance to brief you on this one yet.' },
  { id:9, name:'Static Bloom', iconType:'radio', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'A static bloom event. Rare. Dangerous. Locked behind earlier protocols. Keep working.' },
  { id:10, name:'Dark Matter', iconType:'magnet', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'Dark matter confluence. My sensors do not reach here. Classified until you earn it.' },
  { id:11, name:'Singularity', iconType:'sparkle', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'Second-to-last. The gravity here is literal. Do not rush the approach.' },
  { id:12, name:'The Final Gate', iconType:'rocket', stars:0, bestTime:'--:--', piecesUsed:0,
    cogsQuote:'The last protocol piece. The end of the belt. If you reach this, I will admit I was wrong to doubt you. Almost.' },
];

type NodeState = 'completed' | 'active' | 'unplayed' | 'locked';

function getState(id: number): NodeState {
  if (id <= 4) return 'completed';
  if (id === 5) return 'active';
  if (id === 6) return 'unplayed';
  return 'locked';
}

function lockedOpacity(id: number): number {
  if (id < 7) return 1;
  return Math.max(0.22, 1 - (id - 7) * 0.13);
}

// ─── HUD corner brackets ───────────────────────────────────────────────────────

const BS = 14;
const BT = 1.5;
const BC = 'rgba(74,158,255,0.4)';

function Brackets({ style }: { style?: object }) {
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {/* TL */}
      <View style={[s.brTL]}>
        <View style={[s.brH, { backgroundColor: BC }]} />
        <View style={[s.brV, { backgroundColor: BC }]} />
      </View>
      {/* TR */}
      <View style={[s.brTR]}>
        <View style={[s.brH, { backgroundColor: BC }]} />
        <View style={[s.brV, { backgroundColor: BC, alignSelf: 'flex-end' }]} />
      </View>
      {/* BL */}
      <View style={[s.brBL]}>
        <View style={[s.brV, { backgroundColor: BC }]} />
        <View style={[s.brH, { backgroundColor: BC }]} />
      </View>
      {/* BR */}
      <View style={[s.brBR]}>
        <View style={[s.brV, { backgroundColor: BC, alignSelf: 'flex-end' }]} />
        <View style={[s.brH, { backgroundColor: BC }]} />
      </View>
    </View>
  );
}

// ─── Arc decoration ────────────────────────────────────────────────────────────

const ARC_D = 360;
const ARC_R = ARC_D / 2;
const ARC_H = 58;
const arcTop = -(ARC_D - ARC_H);       // -302
const arcCenterY = arcTop + ARC_R;      // -302+180 = -122 (relative to container)

const TICK_ANGLES = [-0.65, -0.3, 0, 0.3, 0.65]; // radians from straight-down

function ArcDecoration() {
  return (
    <View style={s.arcContainer}>
      <View style={[s.arcCircle, { top: arcTop, left: (W - ARC_D) / 2 }]} />
      {TICK_ANGLES.map((angle, i) => {
        const tx = W / 2 + ARC_R * Math.sin(angle);
        const ty = arcCenterY + ARC_R * Math.cos(angle); // relative to container top
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: tx - 0.75,
              top: ty - 4,
              width: 1.5,
              height: 8,
              backgroundColor: 'rgba(74,158,255,0.45)',
              transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
            }}
          />
        );
      })}
      <View style={s.arcLabels}>
        <Text style={s.arcLabel}>SECTOR 02</Text>
        <Text style={[s.arcLabel, { color: Colors.green }]}>SYS.OK</Text>
        <Text style={s.arcLabel}>12 MSN</Text>
      </View>
    </View>
  );
}

// ─── Cogs pulse badge ──────────────────────────────────────────────────────────

function CogsPulseBadge() {
  const glow = useSharedValue(0.4);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <View style={s.cogsBadge}>
      <Animated.View style={[s.cogsGlowDot, dotStyle]} />
      <Text style={s.cogsBadgeText}>COGS ONLINE</Text>
    </View>
  );
}

// ─── Crosshairs (active node) ─────────────────────────────────────────────────

function Crosshairs() {
  const GAP = 3;
  const ARM = 8;
  const T = 1.5;
  const C = 'rgba(74,158,255,0.7)';
  const D = NODE_R * 2; // 44
  return (
    <>
      {/* Left arm */}
      <View style={{ position:'absolute', left: -(GAP + ARM), top: NODE_R - T / 2, width: ARM, height: T, backgroundColor: C }} />
      {/* Right arm */}
      <View style={{ position:'absolute', left: D + GAP, top: NODE_R - T / 2, width: ARM, height: T, backgroundColor: C }} />
      {/* Top arm */}
      <View style={{ position:'absolute', top: -(GAP + ARM), left: NODE_R - T / 2, width: T, height: ARM, backgroundColor: C }} />
      {/* Bottom arm */}
      <View style={{ position:'absolute', top: D + GAP, left: NODE_R - T / 2, width: T, height: ARM, backgroundColor: C }} />
    </>
  );
}

// ─── Signal dot ────────────────────────────────────────────────────────────────

// Waypoints: node centers for path 1→2→3→4→5
const SIGNAL_WP_X = [COLS[0], COLS[1], COLS[2], COLS[2], COLS[1]]; // [22,110,198,198,110]
const SIGNAL_WP_Y = [ROWS[0], ROWS[0], ROWS[0], ROWS[1], ROWS[1]]; // [22,22,22,102,102]
const SIGNAL_T = [0, 1, 2, 3, 4];

function SignalDot() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(4, { duration: 3600, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const x = interpolate(p, SIGNAL_T, SIGNAL_WP_X, Extrapolation.CLAMP);
    const y = interpolate(p, SIGNAL_T, SIGNAL_WP_Y, Extrapolation.CLAMP);
    return {
      transform: [{ translateX: x - 5 }, { translateY: y - 5 }],
    };
  });

  return <Animated.View style={[s.signalDot, dotStyle]} />;
}

// ─── Path segment ──────────────────────────────────────────────────────────────

function PathSegment({ from, to }: { from: number; to: number }) {
  const fc = nxy(from);
  const tc = nxy(to);
  const isH = fc.y === tc.y;
  const fromState = getState(from);
  const toState = getState(to);

  const isCompleted = fromState === 'completed' && toState === 'completed';
  const isActive = (fromState === 'completed' || fromState === 'active') &&
                   (toState === 'active' || toState === 'unplayed');
  const color = isCompleted ? Colors.amber : isActive ? Colors.blue : Colors.dim;
  const opacity = isCompleted ? 0.65 : isActive ? 0.45 : 0.2;

  if (isH) {
    const leftX = Math.min(fc.x, tc.x) + NODE_R;
    const rightX = Math.max(fc.x, tc.x) - NODE_R;
    return (
      <View style={{
        position: 'absolute',
        left: leftX, top: fc.y - 1,
        width: rightX - leftX, height: 2,
        backgroundColor: color, opacity,
      }} />
    );
  } else {
    const topY = Math.min(fc.y, tc.y) + NODE_R;
    const botY = Math.max(fc.y, tc.y) - NODE_R;
    return (
      <View style={{
        position: 'absolute',
        left: fc.x - 1, top: topY,
        width: 2, height: botY - topY,
        backgroundColor: color, opacity,
      }} />
    );
  }
}

// ─── Mission node ──────────────────────────────────────────────────────────────

type NodeProps = {
  mission: Mission;
  onPress: (m: Mission) => void;
  getStateOverride?: (id: number) => NodeState;
};

function MissionNode({ mission, onPress, getStateOverride }: NodeProps) {
  const state = getStateOverride ? getStateOverride(mission.id) : getState(mission.id);
  const { x, y } = nxy(mission.id);
  const opacity = lockedOpacity(mission.id);

  const isCompleted = state === 'completed';
  const isActive = state === 'active';
  const isUnplayed = state === 'unplayed';
  const isLocked = state === 'locked';

  const borderColor = isCompleted
    ? 'rgba(200,121,65,0.9)'
    : isActive
    ? Colors.blue
    : isUnplayed
    ? 'rgba(74,158,255,0.55)'
    : 'rgba(58,80,112,0.3)';

  const bgColor = isCompleted
    ? `${Colors.amber}22`
    : isActive
    ? `${Colors.blue}18`
    : isUnplayed
    ? 'rgba(10,22,40,0.7)'
    : 'rgba(8,14,24,0.85)';

  return (
    <View
      style={{
        position: 'absolute',
        left: x - NODE_R,
        top: y - NODE_R,
        width: NODE_R * 2,
        height: NODE_R * 2,
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Node circle */}
      <TouchableOpacity
        activeOpacity={isLocked ? 0.6 : 0.75}
        onPress={() => onPress(mission)}
        style={[
          s.nodeCircle,
          {
            backgroundColor: bgColor,
            borderColor: borderColor,
            borderWidth: isActive ? 2 : 1.5,
            borderStyle: (isUnplayed || isLocked) ? 'dashed' : 'solid',
          },
        ]}
      >
        {isCompleted && <Text style={s.nodeCheck}>✓</Text>}
        {isActive && <Text style={[s.nodeLabel, { color: Colors.blue, fontSize: 8 }]}>ACTIVE</Text>}
        {isUnplayed && <Text style={[s.nodeNum, { color: Colors.muted }]}>{mission.id}</Text>}
        {isLocked && <PadlockIcon size={14} />}
      </TouchableOpacity>

      {/* Crosshairs overlaid on active node */}
      {isActive && <Crosshairs />}

      {/* Stars below completed nodes */}
      {isCompleted && (
        <View style={s.nodeStars}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={[s.nodeStar, { opacity: mission.stars > i ? 1 : 0.2 }]}>★</Text>
          ))}
        </View>
      )}

      {/* Copper glow border behind completed */}
      {isCompleted && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: NODE_R,
              borderWidth: 1,
              borderColor: Colors.copperLight,
              opacity: 0.25,
              transform: [{ scale: 1.12 }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* ID label below active */}
      {isActive && (
        <Text style={[s.nodeNum, { position: 'absolute', top: NODE_R * 2 + 2, color: Colors.blue, fontSize: 8 }]}>
          {mission.id}
        </Text>
      )}
    </View>
  );
}

// ─── Bottom sheet ──────────────────────────────────────────────────────────────

type SheetProps = {
  mission: Mission;
  onClose: () => void;
  onLaunch: () => void;
  sheetStyle: object;
  getStateOverride?: (id: number) => NodeState;
};

function BottomSheet({ mission, onClose, onLaunch, sheetStyle, getStateOverride }: SheetProps) {
  const state = getStateOverride ? getStateOverride(mission.id) : getState(mission.id);
  const isCompleted = state === 'completed';
  const isLocked = state === 'locked';

  return (
    <Animated.View style={[s.sheet, sheetStyle]}>
      <LinearGradient
        colors={[Colors.void, Colors.navy]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      {/* Full-bleed machine preview */}
      <View style={s.previewArea} pointerEvents="none">
        <MissionIcon type={mission.iconType} size={72} color={Colors.blue} />
        <LinearGradient
          colors={['transparent', Colors.navy]}
          style={[StyleSheet.absoluteFill, { top: '40%' }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      <ScrollView
        contentContainerStyle={s.sheetScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header row */}
        <View style={s.sheetHeader}>
          <Text style={s.sheetMissionLabel}>MISSION {mission.id}</Text>
          <TouchableOpacity onPress={onClose} style={s.sheetCloseBtn}>
            <Text style={s.sheetCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sheetTitle}>{mission.name}</Text>

        {/* Star rating */}
        <View style={s.sheetStars}>
          {[0, 1, 2].map(i => (
            <Text key={i} style={[s.sheetStar, { opacity: mission.stars > i ? 1 : 0.18 }]}>★</Text>
          ))}
        </View>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          <View style={s.statCell}>
            <Text style={s.statValue}>{isCompleted ? mission.bestTime : '—'}</Text>
            <Text style={s.statKey}>BEST TIME</Text>
          </View>
          <View style={[s.statCell, s.statBorder]}>
            <Text style={s.statValue}>{isCompleted ? String(mission.piecesUsed) : '—'}</Text>
            <Text style={s.statKey}>PIECES USED</Text>
          </View>
          <View style={[s.statCell, s.statBorder]}>
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {[0, 1, 2].map(i => (
                <Text key={i} style={[s.statStar, { opacity: mission.stars > i ? 1 : 0.2 }]}>★</Text>
              ))}
            </View>
            <Text style={s.statKey}>STAR RATING</Text>
          </View>
        </View>

        {/* Cogs analysis */}
        <View style={s.cogsCard}>
          <View style={s.cogsCardHeader}>
            <CogsAvatar size="small" state="online" />
            <Text style={s.cogsCardTitle}>COGS ANALYSIS</Text>
          </View>
          <Text style={s.cogsCardQuote}>"{mission.cogsQuote}"</Text>
        </View>

        {/* Launch / Replay button */}
        <TouchableOpacity
          style={[s.launchBtn, isLocked && s.launchBtnDim]}
          onPress={isLocked ? undefined : onLaunch}
          activeOpacity={isLocked ? 1 : 0.8}
        >
          <LinearGradient
            colors={isCompleted
              ? [Colors.steel, Colors.navy]
              : isLocked
              ? ['rgba(58,80,112,0.4)', 'rgba(10,22,40,0.6)']
              : [Colors.blue, '#2a7ee0']}
            style={s.launchBtnGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLocked ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <PadlockIcon size={14} color={Colors.dim} />
                <Text style={[s.launchBtnText, { color: Colors.dim }]}>LOCKED</Text>
              </View>
            ) : isCompleted ? (
              <Text style={s.launchBtnText}>⟳  REPLAY MISSION</Text>
            ) : (
              <Text style={s.launchBtnText}>▶  LAUNCH MISSION</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LevelSelect'>;
};

// Map mission IDs to game level IDs (Kepler)
const MISSION_LEVEL_MAP: Record<number, string> = {
  5: '2-1',   // Flux Resonance → Power Grid Alpha
  6: '2-2',   // Core Overload → Relay Junction
  7: '2-3',   // Null Space → Config Breach
};

// ─── Axiom mission data (generated from levels) ──────────────────────────────

const AXIOM_MISSIONS: Mission[] = AXIOM_LEVELS.map((level, i) => ({
  id: i + 1,
  name: level.name,
  iconType: (['bolt', 'signal', 'plug', 'atom', 'vortex', 'fire', 'moon', 'rocket'] as MissionIconType[])[i],
  stars: 0,
  bestTime: '--:--',
  piecesUsed: 0,
  cogsQuote: level.cogsLine,
}));

const AXIOM_LEVEL_MAP: Record<number, string> = {
  1: 'A1-1', 2: 'A1-2', 3: 'A1-3', 4: 'A1-4',
  5: 'A1-5', 6: 'A1-6', 7: 'A1-7', 8: 'A1-8',
};

export default function LevelSelectScreen({ navigation }: Props) {
  const setLevel = useGameStore(s => s.setLevel);
  const { activeSector, isLevelCompleted, getLevelStars } = useProgressionStore();
  const isAxiom = activeSector === 'A1';

  // Sector-specific data
  const sectorTitle = isAxiom ? 'THE AXIOM' : 'KEPLER BELT';
  const sectorDisplayName = isAxiom ? 'The Axiom' : 'Kepler Belt';
  const missions = isAxiom ? AXIOM_MISSIONS : MISSIONS;
  const levelMap = isAxiom ? AXIOM_LEVEL_MAP : MISSION_LEVEL_MAP;

  // Dynamic state for Axiom missions based on progression
  const dynamicMissions = isAxiom
    ? missions.map((m, i) => {
        const lid = `A1-${i + 1}`;
        const completed = isLevelCompleted(lid);
        const stars = getLevelStars(lid);
        return { ...m, stars };
      })
    : missions;

  const cogsBrief = isAxiom
    ? 'The Axiom. Ship systems are offline. Eight repairs required. Tap a system node to see the mission brief.'
    : 'Kepler Belt. Twelve missions. Protocol pieces are active here. Tap a mission node to pull the dossier.';

  // Determine node states for Axiom
  const getAxiomState = (id: number): NodeState => {
    const lid = `A1-${id}`;
    if (isLevelCompleted(lid)) return 'completed';
    // First incomplete level is active, next is unplayed, rest locked
    const firstIncomplete = dynamicMissions.findIndex((m, i) => !isLevelCompleted(`A1-${i + 1}`)) + 1;
    if (id === firstIncomplete) return 'active';
    if (id === firstIncomplete + 1) return 'unplayed';
    return 'locked';
  };

  const [displayedMission, setDisplayedMission] = useState<Mission>(isAxiom ? dynamicMissions[0] : MISSIONS[4]);
  const [sheetOpen, setSheetOpen] = useState(false);

  const screenOpacity = useSharedValue(0);
  const contentReveal = useSharedValue(0);
  const sheetY = useSharedValue(H);
  const backdropOpacity = useSharedValue(0);
  const mapReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    contentReveal.value = withTiming(1, { duration: 600 });
    mapReveal.value = withDelay(300, withTiming(1, { duration: 700 }));
  }, []);

  const openSheet = useCallback((mission: Mission) => {
    setDisplayedMission(mission);
    setSheetOpen(true);
    sheetY.value = withTiming(H * 0.34, { duration: 370, easing: Easing.out(Easing.cubic) });
    backdropOpacity.value = withTiming(0.7, { duration: 300 });
  }, []);

  const closeSheet = useCallback(() => {
    sheetY.value = withTiming(H, { duration: 320, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(setSheetOpen)(false);
    });
    backdropOpacity.value = withTiming(0, { duration: 260 });
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentReveal.value }));
  const mapStyle = useAnimatedStyle(() => ({
    opacity: mapReveal.value,
    transform: [{ translateY: (1 - mapReveal.value) * 20 }],
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Animated.View style={[s.root, screenStyle]}>
      <StarField seed={3} />

      <SafeAreaView style={s.safeArea} edges={['top']}>
        {/* ── Header ── */}
        <Animated.View style={[s.header, contentStyle]}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>{sectorTitle}</Text>
          </View>
          <View style={s.backBtn} />
          <Brackets />
        </Animated.View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Arc decoration ── */}
          <Animated.View style={contentStyle}>
            <ArcDecoration />
          </Animated.View>

          {/* ── Sector identity ── */}
          <Animated.View style={[s.sectorSection, contentStyle]}>
            <Text style={s.activeSectorLabel}>ACTIVE SECTOR</Text>
            <Text style={s.sectorName}>{sectorDisplayName}</Text>
            <CogsPulseBadge />
          </Animated.View>

          {/* ── Stats bar ── */}
          <Animated.View style={[s.statsBar, contentStyle]}>
            <LinearGradient
              colors={['rgba(26,58,92,0.5)', 'rgba(10,18,30,0.8)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <View style={s.statItem}>
              <Text style={s.statItemVal}>4</Text>
              <Text style={s.statItemKey}>COMPLETE</Text>
            </View>
            <View style={[s.statItem, s.statItemBorder]}>
              <Text style={s.statItemVal}>8</Text>
              <Text style={s.statItemKey}>REMAINING</Text>
            </View>
            <View style={[s.statItem, s.statItemBorder]}>
              <Text style={[s.statItemVal, { color: Colors.amber }]}>11</Text>
              <Text style={s.statItemKey}>STARS</Text>
            </View>
            <View style={[s.statItem, s.statItemBorder]}>
              <Text style={[s.statItemVal, { color: Colors.blue }]}>33%</Text>
              <Text style={s.statItemKey}>PROGRESS</Text>
            </View>
          </Animated.View>

          {/* ── Progress bar ── */}
          <Animated.View style={[s.progressBarWrap, contentStyle]}>
            <View style={s.progressBarTrack}>
              <View style={s.progressBarFill}>
                <View style={s.progressBarGlow} />
              </View>
            </View>
            <Text style={s.progressBarLabel}>33% COMPLETE</Text>
          </Animated.View>

          {/* ── Cogs brief bubble ── */}
          <Animated.View style={[s.cogsBrief, contentStyle]}>
            <View style={s.cogsBriefHeader}>
              <CogsAvatar size="small" state="online" />
              <Text style={s.cogsBriefName}>COGS · AI UNIT</Text>
            </View>
            <Text style={s.cogsBriefText}>
              {cogsBrief}
            </Text>
          </Animated.View>

          {/* ── Winding path map ── */}
          <Animated.View style={[s.mapWrapper, mapStyle]}>
            <View style={{ width: MAP_W, height: MAP_H }}>
              {/* Path segments */}
              {SEGMENTS.map(([f, t]) => (
                <PathSegment key={`${f}-${t}`} from={f} to={t} />
              ))}

              {/* Signal dot */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <SignalDot />
              </View>

              {/* Nodes */}
              {dynamicMissions.slice(0, 12).map(m => (
                <MissionNode key={m.id} mission={m} onPress={openSheet} getStateOverride={isAxiom ? getAxiomState : undefined} />
              ))}
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Backdrop ── */}
      {sheetOpen && (
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, backdropStyle]} pointerEvents="auto">
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSheet} activeOpacity={1} />
        </Animated.View>
      )}

      {/* ── Bottom sheet ── */}
      <BottomSheet
        mission={displayedMission}
        onClose={closeSheet}
        onLaunch={() => {
          closeSheet();
          const levelId = levelMap[displayedMission.id];
          const levelDef = levelId ? getLevelById(levelId) : undefined;
          if (levelDef) {
            setLevel(levelDef);
          }
          navigation.navigate('Gameplay');
        }}
        sheetStyle={sheetStyle}
        getStateOverride={isAxiom ? getAxiomState : undefined}
      />
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontFamily: Fonts.orbitron, fontSize: 18, color: Colors.muted },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 3,
  },

  // HUD brackets
  brTL: { position: 'absolute', top: 0, left: 0, width: BS, height: BS },
  brTR: { position: 'absolute', top: 0, right: 0, width: BS, height: BS },
  brBL: { position: 'absolute', bottom: 0, left: 0, width: BS, height: BS, justifyContent: 'flex-end' },
  brBR: { position: 'absolute', bottom: 0, right: 0, width: BS, height: BS, justifyContent: 'flex-end' },
  brH: { width: BS, height: BT },
  brV: { width: BT, height: BS, position: 'absolute', top: 0 },

  // Scroll
  scroll: { flexGrow: 1, paddingBottom: Spacing.xxl },

  // Arc
  arcContainer: {
    height: ARC_H,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  arcCircle: {
    position: 'absolute',
    width: ARC_D,
    height: ARC_D,
    borderRadius: ARC_R,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
  },
  arcLabels: {
    position: 'absolute',
    bottom: 4,
    left: Spacing.xxl,
    right: Spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  arcLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
  },

  // Sector section
  sectorSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  activeSectorLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.copper,
    letterSpacing: 3,
  },
  sectorName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.display,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 1,
  },

  // Cogs pulse badge
  cogsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(78,203,141,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(78,203,141,0.25)',
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: 4,
  },
  cogsGlowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.green,
  },
  cogsBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 1,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: 4,
    gap: 3,
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(74,158,255,0.12)',
  },
  statItemVal: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.starWhite,
  },
  statItemKey: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    color: Colors.muted,
    letterSpacing: 1,
  },

  // Progress bar
  progressBarWrap: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: 6,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(74,158,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '33%',
    height: '100%',
    backgroundColor: Colors.blue,
    borderRadius: 3,
    ...Platform.select({
      ios: {
        shadowColor: Colors.blue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
      },
    }),
  },
  progressBarGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(74,158,255,0.4)',
    borderRadius: 3,
  },
  progressBarLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.blue,
    letterSpacing: 2,
    textAlign: 'right',
  },

  // Cogs brief bubble
  cogsBrief: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(10,18,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 14,
    padding: Spacing.md,
  },
  cogsBriefHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cogsBriefName: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1,
  },
  cogsBriefText: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: Colors.starWhite,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Map
  mapWrapper: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.xl,
  },

  // Node
  nodeCircle: {
    width: NODE_R * 2,
    height: NODE_R * 2,
    borderRadius: NODE_R,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCheck: {
    fontFamily: Fonts.orbitron,
    fontSize: 14,
    color: Colors.amber,
    fontWeight: 'bold',
  },
  nodeNum: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.muted,
  },
  nodeLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    letterSpacing: 1.5,
    color: Colors.blue,
  },
  nodeStars: {
    position: 'absolute',
    top: NODE_R * 2 + 2,
    flexDirection: 'row',
    gap: 1,
  },
  nodeStar: {
    fontSize: 8,
    color: Colors.amber,
  },

  // Signal dot
  signalDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.blue,
    ...Platform.select({
      ios: {
        shadowColor: Colors.blue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
    }),
  },

  // Backdrop
  backdrop: {
    backgroundColor: Colors.void,
  },

  // Bottom sheet
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: H * 0.66,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: 'rgba(74,158,255,0.25)',
  },
  previewArea: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheetScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sheetMissionLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
    letterSpacing: 2,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseText: {
    fontFamily: Fonts.orbitron,
    fontSize: 11,
    color: Colors.muted,
  },
  sheetTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 1,
  },
  sheetStars: { flexDirection: 'row', gap: 4 },
  sheetStar: { fontSize: 20, color: Colors.amber },

  // Stats grid in sheet
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26,58,92,0.3)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(74,158,255,0.12)',
  },
  statValue: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
  },
  statKey: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    color: Colors.muted,
    letterSpacing: 1,
  },
  statStar: { fontSize: 14, color: Colors.amber },

  // Cogs card in sheet
  cogsCard: {
    backgroundColor: 'rgba(10,18,30,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cogsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cogsCardTitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1.5,
  },
  cogsCardQuote: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: Colors.cream,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Launch button
  launchBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  launchBtnDim: { opacity: 0.5 },
  launchBtnGrad: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  launchBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 2,
  },
});
