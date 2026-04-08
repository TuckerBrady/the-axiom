import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Rect, Path, G } from 'react-native-svg';
import { Colors } from '../theme/tokens';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);

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
}: Props) {
  const type = normalizeType(rawType);
  const s = size;

  // ── Per-piece special animation values ──
  const gearRot = useRef(new Animated.Value(0)).current;
  const scanY = useRef(new Animated.Value(0)).current;
  const txWave = useRef(new Animated.Value(0)).current;

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

  switch (type) {
    case 'conveyor':
      return (
        <Svg width={s} height={s * 0.6} viewBox="0 0 60 36">
          <Rect x="5" y="10" width="50" height="16" rx="8" fill="#0e1f36" stroke={color ?? Colors.copper} strokeWidth="1.5" />
          <Line x1="10" y1="14" x2="50" y2="14" stroke={Colors.copper} strokeWidth="0.8" strokeOpacity="0.4" />
          <Line x1="10" y1="22" x2="50" y2="22" stroke={Colors.copper} strokeWidth="0.8" strokeOpacity="0.4" />
          <Circle cx="13" cy="18" r="8" fill="#0a1628" stroke="#F0B429" strokeWidth="1.5" />
          <Circle cx="13" cy="18" r="3.5" fill="#F0B429" />
          <Circle cx="47" cy="18" r="8" fill="#0a1628" stroke="#00C48C" strokeWidth="1.5" />
          <Circle cx="47" cy="18" r="3.5" fill="#00C48C" />
          <Path d="M 23 14 L 29 18 L 23 22" stroke="#F0B429" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M 30 14 L 36 18 L 30 22" stroke="#F0B429" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        </Svg>
      );

    case 'source':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="18" fill="none" stroke={color ?? Colors.amber} strokeWidth="0.8" strokeOpacity="0.2" />
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={color ?? Colors.amber} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="10" fill="#060e1a" stroke={color ?? Colors.amber} strokeWidth="1" strokeOpacity="0.5" />
          <Path d="M 17 13 L 17 27 L 27 20 Z" fill={color ?? Colors.amber} />
        </Svg>
      );

    case 'output':
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
        </Svg>
      );

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

    case 'splitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Main input path */}
          <Rect x="6" y="17" width="16" height="6" rx="3" fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="1.5" />
          {/* Junction node */}
          <Circle cx="22" cy="20" r="3" fill="rgba(0,212,255,0.12)" stroke={Colors.blue} strokeWidth="1" />
          {/* Upper output (bright blue) */}
          <Rect x="24" y="8" width="12" height="6" rx="3" fill="#0e1f36" stroke="#00D4FF" strokeWidth="1.5" />
          <Path d="M 22 20 L 28 11" stroke="#00D4FF" strokeWidth="1.5" strokeOpacity="0.7" />
          {/* Lower output (green) */}
          <Rect x="24" y="26" width="12" height="6" rx="3" fill="#0e1f36" stroke="#00C48C" strokeWidth="1.5" />
          <Path d="M 22 20 L 28 29" stroke="#00C48C" strokeWidth="1.5" strokeOpacity="0.7" />
        </Svg>
      );

    case 'configNode':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="5" fill="#0e1f36" stroke={color ?? Colors.amber} strokeWidth="1.5" />
          {/* Gate indicator strip top-right */}
          <Rect x="28" y="8" width="4" height="24" fill={Colors.amber} opacity="0.6" />
          {/* Data rows */}
          <Line x1="14" y1="16" x2="26" y2="16" stroke={Colors.amber} strokeWidth="1.5" strokeOpacity="0.35" />
          <Line x1="14" y1="20" x2="22" y2="20" stroke={Colors.amber} strokeWidth="1.5" strokeOpacity="0.35" />
          <Line x1="14" y1="24" x2="24" y2="24" stroke={Colors.amber} strokeWidth="1.5" strokeOpacity="0.35" />
          <Circle cx="26" cy="20" r="2" fill="#F0B429" />
          {/* Corner accents */}
          <Path d="M 8 8 L 11 8 M 8 8 L 8 11" stroke="#F0B429" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
          <Path d="M 32 32 L 29 32 M 32 32 L 32 29" stroke="#F0B429" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
        </Svg>
      );

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
