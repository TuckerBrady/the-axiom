import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Rect, Path, G, Text as SvgText } from 'react-native-svg';
import { Colors } from '../theme/tokens';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Normalize underscore IDs (Codex data) to camelCase (engine)
function normalizeType(type: string): string {
  if (type === 'config_node') return 'configNode';
  return type;
}

interface Props {
  type: string;
  size?: number;
  color?: string;
  spinning?: boolean;
  scanning?: boolean;
  transmitting?: boolean;
  rolling?: boolean;
  splitting?: boolean;
  gating?: boolean;
  gateResult?: 'pass' | 'block' | null;
  locking?: boolean;
  charging?: boolean;
  failColor?: string | null;
  merging?: boolean;
  bridging?: boolean;
  inverting?: boolean;
  counting?: boolean;
  latching?: boolean;
  latchMode?: 'write' | 'read';
  storedValue?: number | null;
  count?: number;
  configValue?: number;
  threshold?: number;
}

/**
 * Canonical piece icon SVGs — each piece type has a distinctive secondary
 * accent treatment that is independent of the `color` prop. The `color` prop
 * still drives the primary stroke for board-level uniformity.
 */
export function PieceIcon({
  type: rawType,
  size = 24,
  color,
  spinning = false,
  scanning = false,
  transmitting = false,
  rolling = false,
  splitting = false,
  gating = false,
  gateResult = null,
  locking = false,
  charging = false,
  failColor = null,
  merging = false,
  bridging = false,
  inverting = false,
  counting = false,
  latching = false,
  latchMode = 'write',
  storedValue = null,
  count = 0,
  threshold = 2,
  configValue,
}: Props) {
  const type = normalizeType(rawType);
  const s = size;

  // ── Per-piece special animation values ──
  const gearRot = useRef(new Animated.Value(0)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const txWave = useRef(new Animated.Value(0)).current;
  const rollDash = useRef(new Animated.Value(0)).current;
  const splitPulse = useRef(new Animated.Value(0)).current;
  const gatePulse = useRef(new Animated.Value(0)).current;
  const lockProgress = useRef(new Animated.Value(0)).current;
  const chargeProgress = useRef(new Animated.Value(0)).current;
  const failFade = useRef(new Animated.Value(0)).current;
  const mergePulse = useRef(new Animated.Value(0)).current;
  const bridgeGlow = useRef(new Animated.Value(0)).current;
  const invertFlash = useRef(new Animated.Value(0)).current;
  const counterPulse = useRef(new Animated.Value(0)).current;
  const latchPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (spinning) {
      gearRot.setValue(0);
      Animated.timing(gearRot, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [spinning, gearRot]);

  useEffect(() => {
    if (scanning) {
      scanY.setValue(0);
      Animated.timing(scanY, {
        toValue: 1,
        duration: 200,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [scanning, scanY]);

  useEffect(() => {
    if (transmitting) {
      txWave.setValue(0);
      Animated.sequence([
        Animated.timing(txWave, { toValue: 1, duration: 75, useNativeDriver: false }),
        Animated.timing(txWave, { toValue: 0, duration: 75, useNativeDriver: false }),
      ]).start();
    }
  }, [transmitting, txWave]);

  // Conveyor rolling: drive dash offset via setInterval while rolling=true.
  useEffect(() => {
    if (!rolling) return;
    let v = 0;
    const id = setInterval(() => {
      v = (v + 1.5) % 30;
      rollDash.setValue(v);
    }, 25);
    return () => clearInterval(id);
  }, [rolling, rollDash]);

  // Splitter junction pulse: scale 1→1.4→1, repeat twice.
  useEffect(() => {
    if (!splitting) return;
    splitPulse.setValue(0);
    Animated.sequence([
      Animated.timing(splitPulse, { toValue: 1, duration: 40, useNativeDriver: false }),
      Animated.timing(splitPulse, { toValue: 0, duration: 40, useNativeDriver: false }),
      Animated.timing(splitPulse, { toValue: 1, duration: 40, useNativeDriver: false }),
      Animated.timing(splitPulse, { toValue: 0, duration: 40, useNativeDriver: false }),
    ]).start();
  }, [splitting, splitPulse]);

  // Config node gate evaluation flash (3 pulses, 80ms each).
  useEffect(() => {
    if (!gating) return;
    gatePulse.setValue(0);
    Animated.sequence([
      Animated.timing(gatePulse, { toValue: 1, duration: 40, useNativeDriver: false }),
      Animated.timing(gatePulse, { toValue: 0, duration: 40, useNativeDriver: false }),
      Animated.timing(gatePulse, { toValue: 1, duration: 40, useNativeDriver: false }),
      Animated.timing(gatePulse, { toValue: 0, duration: 40, useNativeDriver: false }),
      Animated.timing(gatePulse, { toValue: 1, duration: 40, useNativeDriver: false }),
      Animated.timing(gatePulse, { toValue: 0, duration: 40, useNativeDriver: false }),
    ]).start();
  }, [gating, gatePulse]);

  // Output port lock sequence — drives 3 expanding rings over 400ms.
  useEffect(() => {
    if (!locking) return;
    lockProgress.setValue(0);
    Animated.timing(lockProgress, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [locking, lockProgress]);

  // Input port charge sequence — drives 2 expanding rings over 280ms.
  useEffect(() => {
    if (!charging) return;
    chargeProgress.setValue(0);
    Animated.timing(chargeProgress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [charging, chargeProgress]);

  // Failure overlay fade: on failColor set, X appears then fades over 800ms.
  useEffect(() => {
    if (failColor) {
      failFade.setValue(1);
      Animated.timing(failFade, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }).start();
    } else {
      failFade.setValue(0);
    }
  }, [failColor, failFade]);

  useEffect(() => {
    if (!merging) return;
    mergePulse.setValue(0);
    Animated.timing(mergePulse, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }, [merging, mergePulse]);

  useEffect(() => {
    if (!bridging) return;
    bridgeGlow.setValue(0);
    Animated.timing(bridgeGlow, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }, [bridging, bridgeGlow]);

  useEffect(() => {
    if (!inverting) return;
    invertFlash.setValue(0);
    Animated.sequence([
      Animated.timing(invertFlash, { toValue: 1, duration: 100, useNativeDriver: false }),
      Animated.timing(invertFlash, { toValue: 0, duration: 100, useNativeDriver: false }),
    ]).start();
  }, [inverting, invertFlash]);

  useEffect(() => {
    if (!counting) return;
    counterPulse.setValue(0);
    Animated.timing(counterPulse, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  }, [counting, counterPulse]);

  useEffect(() => {
    if (!latching) return;
    latchPulse.setValue(0);
    Animated.timing(latchPulse, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  }, [latching, latchPulse]);

  switch (type) {
    case 'conveyor':
      return (
        <Svg width={s} height={s * 0.6} viewBox="0 0 60 36">
          <Rect x="5" y="10" width="50" height="16" rx="8" fill="#0e1f36" stroke={color ?? Colors.copper} strokeWidth="1.5" />
          <AnimatedLine
            x1="10" y1="14" x2="50" y2="14"
            stroke={Colors.copper} strokeWidth="0.8" strokeOpacity="0.4"
            strokeDasharray="4,2"
            strokeDashoffset={rolling ? (rollDash as unknown as number) : 0}
          />
          <AnimatedLine
            x1="10" y1="22" x2="50" y2="22"
            stroke={Colors.copper} strokeWidth="0.8" strokeOpacity="0.4"
            strokeDasharray="4,2"
            strokeDashoffset={rolling ? (rollDash as unknown as number) : 0}
          />
          <Circle cx="13" cy="18" r="8" fill="#0a1628" stroke="#F0B429" strokeWidth="1.5" />
          <Circle cx="13" cy="18" r="3.5" fill="#F0B429" />
          <Circle cx="47" cy="18" r="8" fill="#0a1628" stroke="#00C48C" strokeWidth="1.5" />
          <Circle cx="47" cy="18" r="3.5" fill="#00C48C" />
          <Path d="M 23 14 L 29 18 L 23 22" stroke="#F0B429" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M 30 14 L 36 18 L 30 22" stroke="#F0B429" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        </Svg>
      );

    case 'inputPort': {
      const chargeR1 = chargeProgress.interpolate({ inputRange: [0, 1], outputRange: [4, 28] });
      const chargeR2 = chargeProgress.interpolate({ inputRange: [0, 1], outputRange: [4, 22] });
      const chargeOp = chargeProgress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="18" fill="none" stroke={color ?? Colors.amber} strokeWidth="0.8" strokeOpacity="0.2" />
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={color ?? Colors.amber} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="10" fill="#060e1a" stroke={color ?? Colors.amber} strokeWidth="1" strokeOpacity="0.5" />
          <Path d="M 17 13 L 17 27 L 27 20 Z" fill={color ?? Colors.amber} />
          {charging && (
            <>
              <AnimatedCircle cx="20" cy="20" r={chargeR1 as unknown as number} fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity={chargeOp as unknown as number} />
              <AnimatedCircle cx="20" cy="20" r={chargeR2 as unknown as number} fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity={chargeOp as unknown as number} />
            </>
          )}
        </Svg>
      );
    }

    case 'outputPort': {
      const lockR1 = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 42] });
      const lockR2 = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 34] });
      const lockR3 = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 28] });
      const lockOp = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={color ?? Colors.green} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="9" fill="#060e1a" stroke={color ?? Colors.green} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="4" fill={color ?? Colors.green} />
          {/* Corner accent L-marks */}
          <Path d="M 6 6 L 9 6 M 6 6 L 6 9" stroke={Colors.green} strokeWidth="1" opacity="0.5" strokeLinecap="round" />
          <Path d="M 34 6 L 31 6 M 34 6 L 34 9" stroke={Colors.green} strokeWidth="1" opacity="0.5" strokeLinecap="round" />
          <Path d="M 6 34 L 9 34 M 6 34 L 6 31" stroke={Colors.green} strokeWidth="1" opacity="0.5" strokeLinecap="round" />
          <Path d="M 34 34 L 31 34 M 34 34 L 34 31" stroke={Colors.green} strokeWidth="1" opacity="0.5" strokeLinecap="round" />
          {locking && (
            <>
              <AnimatedCircle cx="20" cy="20" r={lockR1 as unknown as number} fill="none" stroke="#00C48C" strokeWidth="2" strokeOpacity={lockOp as unknown as number} />
              <AnimatedCircle cx="20" cy="20" r={lockR2 as unknown as number} fill="none" stroke="#00C48C" strokeWidth="2" strokeOpacity={lockOp as unknown as number} />
              <AnimatedCircle cx="20" cy="20" r={lockR3 as unknown as number} fill="none" stroke="#00C48C" strokeWidth="2" strokeOpacity={lockOp as unknown as number} />
            </>
          )}
        </Svg>
      );
    }

    case 'gear': {
      const rotate = gearRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
      return (
        <Animated.View style={{ width: s, height: s, transform: [{ rotate }] }}>
          <Svg width={s} height={s} viewBox="0 0 40 40">
            <Path
              d="M 20 6 L 22 10 L 26 10 L 28 14 L 34 16 L 34 20 L 34 24 L 28 26 L 26 30 L 22 30 L 20 34 L 18 30 L 14 30 L 12 26 L 6 24 L 6 20 L 6 16 L 12 14 L 14 10 L 18 10 Z"
              fill="#0e1f36" stroke={color ?? Colors.copper} strokeWidth="1.5" strokeLinejoin="round"
            />
            {/* N/S/E/W tooth nubs */}
            <Rect x="18.5" y="2" width="3" height="4" rx="1" fill={Colors.copper} opacity="0.85" />
            <Rect x="18.5" y="34" width="3" height="4" rx="1" fill={Colors.copper} opacity="0.85" />
            <Rect x="2" y="18.5" width="4" height="3" rx="1" fill={Colors.copper} opacity="0.85" />
            <Rect x="34" y="18.5" width="4" height="3" rx="1" fill={Colors.copper} opacity="0.85" />
            {/* Inner ring + center pivot */}
            <Circle cx="20" cy="20" r="6" fill="#060e1a" stroke={Colors.copper} strokeWidth="1" strokeOpacity="0.4" />
            <Circle cx="20" cy="20" r="2.5" fill="#F0B429" />
          </Svg>
        </Animated.View>
      );
    }

    case 'splitter': {
      const juncR = splitPulse.interpolate({ inputRange: [0, 1], outputRange: [3, 4.2] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Main input path */}
          <Rect x="6" y="17" width="16" height="6" rx="3" fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="1.5" />
          {/* Junction node */}
          <AnimatedCircle cx="22" cy="20" r={juncR as unknown as number} fill="rgba(0,212,255,0.12)" stroke={Colors.blue} strokeWidth="1" />
          {/* Upper output (bright blue) */}
          <Rect x="24" y="8" width="12" height="6" rx="3" fill="#0e1f36" stroke="#00D4FF" strokeWidth="1.5" />
          <Path d="M 22 20 L 28 11" stroke="#00D4FF" strokeWidth="1.5" strokeOpacity="0.7" />
          {/* Lower output (green) */}
          <Rect x="24" y="26" width="12" height="6" rx="3" fill="#0e1f36" stroke="#00C48C" strokeWidth="1.5" />
          <Path d="M 22 20 L 28 29" stroke="#00C48C" strokeWidth="1.5" strokeOpacity="0.7" />
        </Svg>
      );
    }

    case 'configNode': {
      const gateFill = gating
        ? (gateResult === 'block' ? '#FF3B3B' : '#00C48C')
        : '#8B5CF6';
      const gateOp = gatePulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
      const dotFill = gating
        ? (gateResult === 'block' ? '#FF3B3B' : '#00C48C')
        : '#8B5CF6';
      const valStr = (configValue ?? 1).toString();
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="5" fill="#0e1f36" stroke={color ?? '#8B5CF6'} strokeWidth="1.5" />
          {/* Gate indicator strip top-right */}
          <AnimatedRect x="28" y="8" width="4" height="24" fill={gateFill} opacity={gating ? (gateOp as unknown as number) : 0.6} />
          {/* Data rows */}
          <Line x1="14" y1="16" x2="26" y2="16" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.35" />
          <Line x1="14" y1="20" x2="22" y2="20" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.35" />
          <Line x1="14" y1="24" x2="24" y2="24" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.35" />
          <Circle cx="26" cy="20" r="2" fill={dotFill} />
          {/* Corner accents */}
          <Path d="M 8 8 L 11 8 M 8 8 L 8 11" stroke="#8B5CF6" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
          <Path d="M 32 32 L 29 32 M 32 32 L 32 29" stroke="#8B5CF6" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
          {/* Value badge bottom-right */}
          <Rect x="27" y="27" width="12" height="12" rx="4" fill="rgba(139,92,246,0.2)" stroke="#8B5CF6" strokeWidth="0.8" />
          <SvgText x="33" y="36" fill="#8B5CF6" fontSize="8" fontFamily="monospace" textAnchor="middle">{valStr}</SvgText>
        </Svg>
      );
    }

    case 'scanner': {
      const sweepY = scanY.interpolate({ inputRange: [0, 1], outputRange: [6, 34] });
      const sweepOpacity = scanY.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.9, 0.9, 0] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="15" fill="#0e1f36" stroke={color ?? Colors.amber} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="10" fill="none" stroke="#F0B429" strokeWidth="1" strokeOpacity="0.5" />
          <Circle cx="20" cy="20" r="5" fill="none" stroke={Colors.amber} strokeWidth="1" strokeOpacity="0.45" />
          <Line x1="20" y1="5" x2="20" y2="35" stroke={Colors.amber} strokeWidth="1" strokeOpacity="0.45" />
          <Line x1="5" y1="20" x2="35" y2="20" stroke={Colors.amber} strokeWidth="1" strokeOpacity="0.45" />
          <Circle cx="20" cy="20" r="2" fill="#F0B429" />
          {/* Readout panel */}
          <Rect x="12" y="35" width="16" height="3" fill="#F0B429" opacity="0.5" />
          {/* Active scan sweep */}
          <AnimatedLine
            x1="6" y1={sweepY as unknown as number}
            x2="34" y2={sweepY as unknown as number}
            stroke="#F0B429" strokeWidth="1.5"
            strokeOpacity={sweepOpacity as unknown as number}
          />
        </Svg>
      );
    }

    case 'transmitter': {
      const baseOuter = 0.3;
      const baseMid = 0.55;
      const baseInner = 0.8;
      const outerOp = txWave.interpolate({ inputRange: [0, 1], outputRange: [baseOuter, 0.7] });
      const midOp = txWave.interpolate({ inputRange: [0, 1], outputRange: [baseMid, 0.85] });
      const innerOp = txWave.interpolate({ inputRange: [0, 1], outputRange: [baseInner, 1] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Base circle */}
          <Circle cx="20" cy="32" r="5" fill="rgba(0,212,255,0.15)" stroke="#00D4FF" strokeOpacity="0.7" strokeWidth="1.2" />
          {/* Antenna mast */}
          <Path d="M 20 28 L 20 12" stroke={color ?? Colors.blue} strokeWidth="2" strokeLinecap="round" />
          {/* Wave arcs (innermost / mid / outer) */}
          <AnimatedPath d="M 14 22 Q 10 16 14 10" stroke={Colors.blue} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity={innerOp as unknown as number} />
          <AnimatedPath d="M 26 22 Q 30 16 26 10" stroke={Colors.blue} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity={innerOp as unknown as number} />
          <AnimatedPath d="M 11 25 Q 6 17 11 7" stroke={Colors.blue} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity={midOp as unknown as number} />
          <AnimatedPath d="M 29 25 Q 34 17 29 7" stroke={Colors.blue} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity={midOp as unknown as number} />
          <AnimatedPath d="M 8 27 Q 2 17 8 5" stroke={Colors.blue} strokeWidth="1" fill="none" strokeLinecap="round" strokeOpacity={outerOp as unknown as number} />
          <AnimatedPath d="M 32 27 Q 38 17 32 5" stroke={Colors.blue} strokeWidth="1" fill="none" strokeLinecap="round" strokeOpacity={outerOp as unknown as number} />
          {/* Antenna tip pulse dot */}
          <Circle cx="20" cy="12" r="2" fill="#00D4FF" opacity="0.9" />
        </Svg>
      );
    }

    case 'merger': {
      const juncR = mergePulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [3.5, 5.2, 3.5] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path d="M 6 12 L 20 20" stroke={color ?? Colors.blue} strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M 20 6 L 20 20" stroke="#00C48C" strokeWidth="1.8" strokeLinecap="round" />
          <AnimatedCircle cx="20" cy="20" r={juncR as unknown as number} fill="rgba(0,212,255,0.12)" stroke={Colors.blue} strokeWidth="1.5" />
          <Path d="M 22 20 L 34 20" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 30 17 L 34 20 L 30 23" stroke="#00D4FF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </Svg>
      );
    }

    case 'bridge': {
      const hOp = bridging ? 1 : 0.55;
      const vOp = bridging ? 1 : 0.55;
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Horizontal line (with gap at center) */}
          <Line x1="4" y1="20" x2="17" y2="20" stroke={color ?? Colors.copper} strokeWidth="2.2" strokeLinecap="round" opacity={hOp} />
          <Line x1="23" y1="20" x2="36" y2="20" stroke={Colors.copper} strokeWidth="2.2" strokeLinecap="round" opacity={hOp} />
          {/* Vertical line (continuous, in front) */}
          <Line x1="20" y1="4" x2="20" y2="36" stroke={Colors.blue} strokeWidth="2.2" strokeLinecap="round" opacity={vOp} />
          {/* Endcap accents */}
          <Circle cx="4" cy="20" r="1.6" fill={Colors.copper} />
          <Circle cx="36" cy="20" r="1.6" fill={Colors.copper} />
          <Circle cx="20" cy="4" r="1.6" fill={Colors.blue} />
          <Circle cx="20" cy="36" r="1.6" fill={Colors.blue} />
        </Svg>
      );
    }

    case 'inverter': {
      const flashOp = invertFlash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="6" y="10" width="28" height="20" rx="3" fill="#0e1f36" stroke={color ?? '#8B5CF6'} strokeWidth="1.5" />
          <AnimatedRect x="6" y="10" width="28" height="20" rx="3" fill="#8B5CF6" opacity={flashOp as unknown as number} />
          {/* NOT gate triangle */}
          <Path d="M 12 14 L 12 26 L 24 20 Z" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round" />
          <Circle cx="26" cy="20" r="2" fill="#8B5CF6" />
          {/* Data row marks */}
          <Line x1="10" y1="32" x2="30" y2="32" stroke="#8B5CF6" strokeWidth="0.8" strokeOpacity="0.3" />
        </Svg>
      );
    }

    case 'counter': {
      const arcOp = counterPulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
      const display = `${count}/${threshold}`;
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="6" y="8" width="28" height="24" rx="3" fill="#0e1f36" stroke={color ?? '#8B5CF6'} strokeWidth="1.5" strokeOpacity="0.6" />
          <Rect x="11" y="13" width="18" height="14" rx="2" fill="#060e1a" stroke="#8B5CF6" strokeWidth="1" />
          <SvgText x="20" y="24" fill="#8B5CF6" fontSize="9" fontFamily="monospace" textAnchor="middle">{display}</SvgText>
          <AnimatedCircle cx="20" cy="20" r="13" fill="none" stroke="#8B5CF6" strokeWidth="1" strokeOpacity={arcOp as unknown as number} strokeDasharray="3,2" />
        </Svg>
      );
    }

    case 'latch': {
      const isWrite = latchMode === 'write';
      const writeOp = latching && isWrite ? 1 : 0.6;
      const readOp = latching && !isWrite ? 1 : 0.6;
      const valStr = storedValue == null ? '?' : String(storedValue);
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Left half (write) */}
          <Rect x="6" y="10" width="14" height="20" rx="2" fill="#0e1f36" stroke={Colors.amber} strokeWidth="1.5" opacity={writeOp} />
          <Path d="M 13 14 L 13 22 M 10 19 L 13 22 L 16 19" stroke={Colors.amber} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* Right half (read) */}
          <Rect x="20" y="10" width="14" height="20" rx="2" fill="#0e1f36" stroke={Colors.blue} strokeWidth="1.5" opacity={readOp} />
          <Path d="M 23 20 L 31 20 M 28 17 L 31 20 L 28 23" stroke={Colors.blue} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* Center divider */}
          <Line x1="20" y1="10" x2="20" y2="30" stroke="#8B5CF6" strokeWidth="1" strokeOpacity="0.5" />
          {/* Stored value badge */}
          <Circle cx="20" cy="34" r="4" fill="#060e1a" stroke="#8B5CF6" strokeWidth="1" />
          <SvgText x="20" y="36.5" fill="#8B5CF6" fontSize="6" fontFamily="monospace" textAnchor="middle">{valStr}</SvgText>
          {/* Mode badge */}
          <SvgText x="20" y="8" fill={isWrite ? Colors.amber : Colors.blue} fontSize="5" fontFamily="monospace" textAnchor="middle">{isWrite ? 'WRITE' : 'READ'}</SvgText>
        </Svg>
      );
    }

    default:
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="4" fill="#0e1f36" stroke={color ?? Colors.dim} strokeWidth="1.5" />
        </Svg>
      );
  }
}

// Avoid unused warnings for AnimatedG (not currently used but kept for future).
void AnimatedG;
