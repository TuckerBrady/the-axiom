import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, {
  Path, Rect, Ellipse, Line, G, Circle, Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../theme/tokens';
import { useProgressionStore, SHIP_SYSTEMS } from '../store/progressionStore';

interface Props {
  width?: number;
  height?: number;
}

// ─── Animated pulse wrapper ──────────────────────────────────────────────────

function usePulse(active: boolean) {
  const opacity = useSharedValue(active ? 0.3 : 0.3);
  useEffect(() => {
    if (active) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
  }, [active]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function useRunningLight(delay: number) {
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// ─── Zone visibility helper ──────────────────────────────────────────────────

function zo(repaired: boolean, litVal: number, darkVal: number): number {
  return repaired ? litVal : darkVal;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ShipRepairProgress({ width = 280, height = 140 }: Props) {
  const { isLevelCompleted } = useProgressionStore();

  const r = SHIP_SYSTEMS.map((_, i) => isLevelCompleted(`A1-${i + 1}`));
  const allDone = r.every(Boolean);

  const B = '#4a9eff';   // blue
  const D = '#0a1828';   // dark fill
  const H = '#0c1e36';   // hull fill
  const S = '#1e3a5c';   // stroke
  const DS = '#152235';   // divider stroke
  const HS = '#1a3050';   // hull secondary stroke
  const C = '#c87941';   // copper

  const enginePulse = usePulse(r[0]);
  const sensorPulse = usePulse(r[4]);
  const portLight = useRunningLight(0);
  const starboardLight = useRunningLight(500);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 320 160" fill="none">

        {/* ── Engine wash trails ── */}
        <Line x1="28" y1="95" x2="8" y2="118" stroke={B} strokeWidth="1" opacity={zo(r[0], 0.18, 0.03)} />
        <Line x1="36" y1="98" x2="18" y2="124" stroke={B} strokeWidth="1" opacity={zo(r[0], 0.12, 0.02)} />
        <Line x1="44" y1="95" x2="28" y2="118" stroke={B} strokeWidth="1" opacity={zo(r[0], 0.08, 0.01)} />
        <Line x1="52" y1="85" x2="36" y2="106" stroke={B} strokeWidth="1" opacity={zo(r[0], 0.14, 0.02)} />
        <Line x1="60" y1="88" x2="44" y2="112" stroke={B} strokeWidth="1" opacity={zo(r[0], 0.09, 0.01)} />

        {/* ── Zone 0: Engine cluster — 3 pods ── */}
        <Rect x="18" y="82" width="20" height="14" rx="4" fill={D} stroke={B} strokeWidth="1.5" strokeOpacity={zo(r[0], 0.8, 0.15)} />
        <Rect x="40" y="78" width="22" height="18" rx="4" fill={D} stroke={B} strokeWidth="1.5" strokeOpacity={zo(r[0], 0.8, 0.15)} />
        <Rect x="64" y="80" width="18" height="16" rx="4" fill={D} stroke={B} strokeWidth="1.5" strokeOpacity={zo(r[0], 0.8, 0.15)} />
        {/* Engine glow bars */}
        <Rect x="18" y="91" width="20" height="4" rx="2" fill={B} opacity={zo(r[0], 0.3, 0.04)} />
        <Rect x="40" y="91" width="22" height="4" rx="2" fill={B} opacity={zo(r[0], 0.4, 0.05)} />
        <Rect x="64" y="91" width="18" height="4" rx="2" fill={B} opacity={zo(r[0], 0.3, 0.04)} />

        {/* ── Zone 1: Ventral cargo pod (Life Support) ── */}
        <Rect x="80" y="108" width="160" height="28" rx="6" fill="#081420" stroke={HS} strokeWidth="1" strokeOpacity={zo(r[1], 0.7, 0.15)} />
        <Line x1="120" y1="108" x2="120" y2="136" stroke="#0f2240" strokeWidth="1" opacity={zo(r[1], 0.5, 0.1)} />
        <Line x1="160" y1="108" x2="160" y2="136" stroke="#0f2240" strokeWidth="1" opacity={zo(r[1], 0.5, 0.1)} />
        <Line x1="200" y1="108" x2="200" y2="136" stroke="#0f2240" strokeWidth="1" opacity={zo(r[1], 0.5, 0.1)} />
        <Rect x="88" y="114" width="24" height="14" rx="2" fill={D} stroke={HS} strokeWidth="0.8" strokeOpacity={zo(r[1], 0.6, 0.1)} />
        <Rect x="128" y="114" width="24" height="14" rx="2" fill={D} stroke={HS} strokeWidth="0.8" strokeOpacity={zo(r[1], 0.6, 0.1)} />
        <Rect x="168" y="114" width="24" height="14" rx="2" fill={D} stroke={HS} strokeWidth="0.8" strokeOpacity={zo(r[1], 0.6, 0.1)} />
        <Rect x="208" y="114" width="24" height="14" rx="2" fill={D} stroke={HS} strokeWidth="0.8" strokeOpacity={zo(r[1], 0.6, 0.1)} />

        {/* ── Main hull ── */}
        <Path
          d="M82,40 L240,36 L278,52 L278,102 L240,108 L82,108 L60,96 L60,52 Z"
          fill={H}
          stroke={S}
          strokeWidth="1.5"
          strokeOpacity={allDone ? 0.9 : 0.4}
        />

        {/* Hull section dividers */}
        <Line x1="110" y1="40" x2="108" y2="108" stroke={DS} strokeWidth="1.2" opacity={0.5} />
        <Line x1="160" y1="38" x2="158" y2="108" stroke={DS} strokeWidth="1.2" opacity={0.5} />
        <Line x1="214" y1="37" x2="212" y2="108" stroke={DS} strokeWidth="1.2" opacity={0.5} />
        <Line x1="60" y1="76" x2="278" y2="74" stroke={DS} strokeWidth="0.8" opacity={0.4} />

        {/* ── Zone 5: Sensor Grid — upper hull panels ── */}
        <Rect x="112" y="42" width="46" height="30" rx="2" fill={B} fillOpacity={zo(r[5], 0.06, 0)} stroke={B} strokeWidth="0.5" strokeOpacity={zo(r[5], 0.3, 0.05)} />
        <Rect x="162" y="40" width="48" height="32" rx="2" fill={B} fillOpacity={zo(r[5], 0.06, 0)} stroke={B} strokeWidth="0.5" strokeOpacity={zo(r[5], 0.3, 0.05)} />

        {/* ── Zone 3: Propulsion Core — center hull ── */}
        <Rect x="84" y="76" width="126" height="30" rx="2" fill={B} fillOpacity={zo(r[3], 0.05, 0)} stroke={B} strokeWidth="0.5" strokeOpacity={zo(r[3], 0.25, 0.04)} />

        {/* ── Crew portholes ── */}
        <Circle cx="132" cy="60" r="4" fill="#061428" stroke={S} strokeWidth="1" />
        <Circle cx="132" cy="60" r="2" fill={B} opacity={zo(r[5], 0.3, 0.05)} />
        <Circle cx="148" cy="60" r="4" fill="#061428" stroke={S} strokeWidth="1" />
        <Circle cx="148" cy="60" r="2" fill={B} opacity={zo(r[5], 0.25, 0.04)} />
        <Circle cx="132" cy="88" r="3" fill="#061428" stroke={HS} strokeWidth="0.8" />
        <Circle cx="148" cy="88" r="3" fill="#061428" stroke={HS} strokeWidth="0.8" />

        {/* ── Zone 2: Forward command bridge (Navigation Array) ── */}
        <Path
          d="M214,16 L268,20 L278,36 L278,52 L240,52 L210,52 L206,36 Z"
          fill={D}
          stroke={B}
          strokeWidth="1.5"
          strokeOpacity={zo(r[2], 0.8, 0.15)}
        />
        {/* Bridge windows */}
        <Rect x="218" y="22" width="14" height="8" rx="2" fill={B} opacity={zo(r[2], 0.5, 0.05)} />
        <Rect x="236" y="20" width="18" height="9" rx="2" fill={B} opacity={zo(r[2], 0.5, 0.06)} />
        <Rect x="258" y="22" width="14" height="8" rx="2" fill={B} opacity={zo(r[2], 0.35, 0.04)} />
        {/* Bridge panel line */}
        <Line x1="214" y1="38" x2="278" y2="38" stroke={S} strokeWidth="0.8" opacity={zo(r[2], 0.6, 0.1)} />

        {/* ── Zone 4: Port sensor/comms array (Communication Array) ── */}
        <Rect x="60" y="56" width="8" height="20" rx="2" fill={D} stroke={B} strokeWidth="1" strokeOpacity={zo(r[4], 0.7, 0.12)} />
        <Circle cx="64" cy="52" r="3" fill={D} stroke={B} strokeWidth="1" strokeOpacity={zo(r[4], 0.7, 0.12)} />
        <Line x1="64" y1="49" x2="64" y2="44" stroke={allDone ? Colors.green : B} strokeWidth="1" opacity={zo(r[4], 0.7, 0.1)} />
        <Line x1="64" y1="44" x2="58" y2="40" stroke={allDone ? Colors.green : B} strokeWidth="0.8" opacity={zo(r[4], 0.5, 0.06)} />
        <Line x1="64" y1="44" x2="70" y2="40" stroke={allDone ? Colors.green : B} strokeWidth="0.8" opacity={zo(r[4], 0.5, 0.06)} />
        {/* Pulse dot */}
        <Circle cx="64" cy="52" r="1.5" fill={B} opacity={zo(r[4], 0.6, 0.05)} />

        {/* ── Zone 6: Weapons Lock — dorsal turret ── */}
        <Rect x="155" y="30" width="16" height="10" rx="3" fill={D} stroke={S} strokeWidth="1" strokeOpacity={zo(r[6], 0.6, 0.1)} />
        <Rect x="159" y="22" width="8" height="10" rx="2" fill={D} stroke={S} strokeWidth="1" strokeOpacity={zo(r[6], 0.6, 0.1)} />
        <Line x1="163" y1="18" x2="163" y2="22" stroke={S} strokeWidth="1.5" opacity={zo(r[6], 0.5, 0.08)} />

        {/* ── Zone 7: Bridge Systems — AX-MOD docking port ── */}
        <Rect x="268" y="72" width="14" height="20" rx="3" fill={D} stroke={C} strokeWidth="1.2" strokeOpacity={zo(r[7], 0.8, 0.15)} />
        <Circle cx="275" cy="82" r="4" fill={D} stroke={C} strokeWidth="1" strokeOpacity={zo(r[7], 0.7, 0.12)} />
        <SvgText x="275" y="97" fill={C} opacity={zo(r[7], 0.5, 0.08)} fontSize="4" fontFamily="monospace" textAnchor="middle">AX-MOD</SvgText>

        {/* ── Battle damage ── */}
        <Line x1="88" y1="48" x2="94" y2="58" stroke={C} strokeWidth="0.8" opacity={0.4} />
        <Line x1="90" y1="50" x2="84" y2="56" stroke={C} strokeWidth="0.5" opacity={0.25} />
        <Line x1="220" y1="80" x2="226" y2="88" stroke={C} strokeWidth="0.8" opacity={0.3} />

        {/* ── Hull designation ── */}
        <SvgText x="178" y="94" fill={B} opacity={0.18} fontSize="7" fontFamily="monospace" textAnchor="middle">THE AXIOM</SvgText>

        {/* ── Running lights ── */}
        <Circle cx="82" cy="76" r="2" fill={Colors.green} opacity={0.7} />
        <Circle cx="278" cy="76" r="2" fill={Colors.red} opacity={0.7} />

      </Svg>
    </View>
  );
}
