import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path, Rect, Ellipse, Line, G, Defs, RadialGradient, Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../theme/tokens';
import { useProgressionStore, SHIP_SYSTEMS } from '../store/progressionStore';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface Props {
  width?: number;
  height?: number;
}

// ─── Zone opacity hook ───────────────────────────────────────────────────────

function useZoneOpacity(repaired: boolean, index: number) {
  const opacity = useSharedValue(repaired ? 0.8 : 0.08);
  const strokeOpacity = useSharedValue(repaired ? 0.9 : 0.15);

  useEffect(() => {
    if (repaired) {
      // Flicker on effect — like flicking a switch
      opacity.value = withDelay(
        index * 80,
        withSequence(
          withTiming(0.9, { duration: 60 }),
          withTiming(0.2, { duration: 80 }),
          withTiming(0.85, { duration: 100 }),
          withTiming(0.5, { duration: 60 }),
          withTiming(0.8, { duration: 150 }),
          // Subtle pulse once lit
          withRepeat(
            withSequence(
              withTiming(0.65, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
              withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            false,
          ),
        ),
      );
      strokeOpacity.value = withDelay(
        index * 80,
        withTiming(0.9, { duration: 400 }),
      );
    } else {
      opacity.value = withTiming(0.08, { duration: 300 });
      strokeOpacity.value = withTiming(0.15, { duration: 300 });
    }
  }, [repaired]);

  return { opacity, strokeOpacity };
}

// ─── Ship SVG with repair zones ──────────────────────────────────────────────

export default function ShipRepairProgress({ width = 140, height = 96 }: Props) {
  const { isLevelCompleted } = useProgressionStore();

  const repaired = SHIP_SYSTEMS.map((_, i) => isLevelCompleted(`A1-${i + 1}`));
  const allRepaired = repaired.every(Boolean);

  // Zone hooks
  const z0 = useZoneOpacity(repaired[0], 0); // Emergency Power → engine pods
  const z1 = useZoneOpacity(repaired[1], 1); // Life Support → lower hull mid
  const z2 = useZoneOpacity(repaired[2], 2); // Navigation Array → command tower
  const z3 = useZoneOpacity(repaired[3], 3); // Propulsion Core → thruster housing
  const z4 = useZoneOpacity(repaired[4], 4); // Communication Array → antenna
  const z5 = useZoneOpacity(repaired[5], 5); // Sensor Grid → upper hull panels
  const z6 = useZoneOpacity(repaired[6], 6); // Weapons Lock → forward hull
  const z7 = useZoneOpacity(repaired[7], 7); // Bridge Systems → full ship glow

  // Full ship glow when all complete
  const fullGlow = useSharedValue(0);
  useEffect(() => {
    if (allRepaired) {
      fullGlow.value = withDelay(
        700,
        withRepeat(
          withSequence(
            withTiming(0.35, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.15, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
    }
  }, [allRepaired]);

  const R = Colors.blue; // repair color
  const D = '#0a1628';   // dark base

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 140 96" fill="none">
        <Defs>
          <RadialGradient id="repairGlow" cx="50%" cy="100%" r="60%">
            <Stop offset="0%" stopColor={R} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={R} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="fullShipGlow" cx="50%" cy="50%" r="80%">
            <Stop offset="0%" stopColor={R} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={R} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Full ship glow when all repaired */}
        {allRepaired && (
          <Ellipse cx="70" cy="48" rx="65" ry="45" fill="url(#fullShipGlow)" />
        )}

        {/* Engine glow underneath */}
        <Ellipse cx="70" cy="86" rx="45" ry="14" fill="url(#repairGlow)" />

        {/* ── Zone 0: Emergency Power — engine pods ── */}
        {/* Left engine */}
        <Path
          d="M26 60 L22 62 L22 78 L32 78 L32 62 L28 60"
          stroke={R}
          strokeWidth="1"
          fill={repaired[0] ? R : D}
          fillOpacity={repaired[0] ? 0.25 : 1}
          strokeOpacity={repaired[0] ? 0.8 : 0.15}
        />
        <Rect x="23" y="74" width="8" height="5" rx="1" fill={R} opacity={repaired[0] ? 0.4 : 0.06} />
        {/* Right engine */}
        <Path
          d="M108 60 L104 62 L104 78 L114 78 L114 62 L112 60"
          stroke={R}
          strokeWidth="1"
          fill={repaired[0] ? R : D}
          fillOpacity={repaired[0] ? 0.25 : 1}
          strokeOpacity={repaired[0] ? 0.8 : 0.15}
        />
        <Rect x="105" y="74" width="8" height="5" rx="1" fill={R} opacity={repaired[0] ? 0.4 : 0.06} />

        {/* Engine exhaust lines */}
        <Line x1="25" y1="79" x2="25" y2="88" stroke={R} strokeWidth="1.5" opacity={repaired[0] ? 0.3 : 0.04} />
        <Line x1="29" y1="79" x2="29" y2="90" stroke={R} strokeWidth="1" opacity={repaired[0] ? 0.2 : 0.03} />
        <Line x1="107" y1="79" x2="107" y2="88" stroke={R} strokeWidth="1.5" opacity={repaired[0] ? 0.3 : 0.04} />
        <Line x1="111" y1="79" x2="111" y2="90" stroke={R} strokeWidth="1" opacity={repaired[0] ? 0.2 : 0.03} />

        {/* ── Zone 1: Life Support — lower hull mid-section ── */}
        <Path
          d="M35 58 L105 58 L108 60 L32 60 Z"
          fill={repaired[1] ? R : D}
          fillOpacity={repaired[1] ? 0.2 : 0.8}
          stroke={R}
          strokeWidth="0.8"
          strokeOpacity={repaired[1] ? 0.7 : 0.1}
        />

        {/* ── Zone 5: Sensor Grid — upper hull panels ── */}
        <Line x1="38" y1="46" x2="58" y2="46" stroke={R} strokeWidth="0.8" opacity={repaired[5] ? 0.6 : 0.1} />
        <Line x1="82" y1="46" x2="102" y2="46" stroke={R} strokeWidth="0.8" opacity={repaired[5] ? 0.6 : 0.1} />
        <Rect x="40" y="42" width="14" height="3" rx="1" fill={R} opacity={repaired[5] ? 0.2 : 0.03} />
        <Rect x="86" y="42" width="14" height="3" rx="1" fill={R} opacity={repaired[5] ? 0.2 : 0.03} />

        {/* ── Main hull (always visible, dims based on overall state) ── */}
        <Path
          d="M70 10 L118 42 L112 60 L28 60 L22 42 Z"
          stroke={R}
          strokeWidth="1.5"
          fill={D}
          strokeOpacity={allRepaired ? 0.9 : 0.25}
        />

        {/* ── Zone 6: Weapons Lock — forward hull ── */}
        <Path
          d="M70 10 L85 24 L55 24 Z"
          fill={repaired[6] ? R : 'transparent'}
          fillOpacity={repaired[6] ? 0.18 : 0}
          stroke={R}
          strokeWidth="0.8"
          strokeOpacity={repaired[6] ? 0.7 : 0.08}
        />

        {/* ── Zone 2: Navigation Array — command tower ── */}
        <Path
          d="M60 18 L80 18 L77 36 L63 36 Z"
          stroke={R}
          strokeWidth="1"
          fill={repaired[2] ? R : '#0e1f36'}
          fillOpacity={repaired[2] ? 0.3 : 1}
          strokeOpacity={repaired[2] ? 0.8 : 0.2}
        />
        {/* Tower window */}
        <Rect x="66" y="22" width="8" height="4" rx="1" fill={R} opacity={repaired[2] ? 0.5 : 0.08} />

        {/* ── Zone 4: Communication Array — antenna/sensor on hull ── */}
        <Line x1="70" y1="6" x2="70" y2="10" stroke={R} strokeWidth="1" opacity={repaired[4] ? 0.7 : 0.1} />
        <Line x1="60" y1="8" x2="80" y2="8" stroke={R} strokeWidth="0.8" opacity={repaired[4] ? 0.6 : 0.08} />
        <Rect x="65" y="4" width="10" height="3" rx="1" fill={R} opacity={repaired[4] ? 0.3 : 0.04} />

        {/* ── Zone 3: Propulsion Core — main thruster housing ── */}
        <Rect x="30" y="56" width="80" height="5" rx="1" fill={repaired[3] ? R : D} fillOpacity={repaired[3] ? 0.15 : 0.6} stroke={R} strokeWidth="0.5" strokeOpacity={repaired[3] ? 0.5 : 0.08} />

        {/* ── Hull detail lines ── */}
        <Line x1="40" y1="50" x2="60" y2="50" stroke={Colors.dim} strokeWidth="0.5" opacity={0.3} />
        <Line x1="80" y1="50" x2="100" y2="50" stroke={Colors.dim} strokeWidth="0.5" opacity={0.3} />

        {/* Copper accent stripe */}
        <Line x1="30" y1="57" x2="110" y2="57" stroke={Colors.copper} strokeWidth="1" opacity={0.5} />

        {/* Battle damage scratches */}
        <Line x1="48" y1="34" x2="54" y2="42" stroke={Colors.dim} strokeWidth="0.5" opacity={0.2} />
        <Line x1="92" y1="38" x2="96" y2="46" stroke={Colors.dim} strokeWidth="0.5" opacity={0.18} />
      </Svg>
    </View>
  );
}
