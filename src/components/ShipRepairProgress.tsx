import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, {
  Polygon, Path, Rect, Ellipse, Line, Circle, Text as SvgText,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../theme/tokens';
import { useProgressionStore, SHIP_SYSTEMS } from '../store/progressionStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  width?: number;
  height?: number;
}

// ─── Beacon pulse hook ──────────────────────────────────────────────────────

function useBeaconPulse() {
  const opacity = useSharedValue(0.7);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// ─── Zone visibility helper ──────────────────────────────────────────────────

function zo(repaired: boolean, litVal: number, darkVal: number): number {
  return repaired ? litVal : darkVal;
}

// ─── Military Scout Ship ─────────────────────────────────────────────────────

export default function ShipRepairProgress({ width = 300, height = 160 }: Props) {
  const { isLevelCompleted } = useProgressionStore();

  const r = SHIP_SYSTEMS.map((_, i) => isLevelCompleted(`A1-${i + 1}`));
  const allDone = r.every(Boolean);

  const wingPulse = useBeaconPulse();
  const sensorPulse = useBeaconPulse();

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="180 195 415 165" fill="none">

        {/* ═══ ENGINE WASH ═══ */}
        <Ellipse cx="195" cy="320" rx="32" ry="10" fill="#4a9eff" opacity={zo(r[0], 0.05, 0.01)} />
        <Line x1="178" y1="326" x2="104" y2="362" stroke="#4a9eff" strokeWidth="1.2" opacity={zo(r[0], 0.09, 0.015)} />
        <Line x1="188" y1="329" x2="116" y2="366" stroke="#4a9eff" strokeWidth="1.2" opacity={zo(r[0], 0.07, 0.012)} />
        <Line x1="200" y1="330" x2="128" y2="368" stroke="#4a9eff" strokeWidth="1.2" opacity={zo(r[0], 0.06, 0.01)} />
        <Line x1="212" y1="328" x2="140" y2="365" stroke="#4a9eff" strokeWidth="1.2" opacity={zo(r[0], 0.07, 0.012)} />

        {/* ═══ MAIN HULL (Zone 1: Life Support — lower hull) ═══ */}
        <Polygon
          points="245,345 540,345 574,318 574,286 245,286"
          fill="#08121e"
          stroke="#1a2e48"
          strokeWidth="1"
          strokeOpacity={zo(r[1], 0.8, 0.3)}
        />

        {/* ═══ MAIN HULL upper (Zone 5: Sensor Grid — upper hull panels) ═══ */}
        <Polygon
          points="245,286 268,232 540,232 574,286"
          fill="#0c1e36"
          stroke="#1e3a5c"
          strokeWidth="1.5"
          strokeOpacity={zo(r[5], 0.9, 0.35)}
        />

        {/* ═══ MAIN HULL starboard face (Zone 3: Propulsion Core) ═══ */}
        <Polygon
          points="540,232 574,286 574,318 540,345 582,312 582,260"
          fill="#0f2438"
          stroke="#243a5a"
          strokeWidth="1"
          strokeOpacity={zo(r[3], 0.8, 0.3)}
        />
        <Line x1="540" y1="232" x2="582" y2="260" stroke="#2a4a6a" strokeWidth="2" opacity={zo(r[3], 0.6, 0.2)} />

        {/* ═══ HULL PANEL SEAMS ═══ */}
        <Line x1="318" y1="232" x2="324" y2="345" stroke="#1a3050" strokeWidth="0.7" opacity={0.6} />
        <Line x1="392" y1="232" x2="400" y2="345" stroke="#1a3050" strokeWidth="0.7" opacity={0.6} />
        <Line x1="466" y1="232" x2="478" y2="345" stroke="#1a3050" strokeWidth="0.7" opacity={0.6} />
        <Line x1="268" y1="268" x2="574" y2="268" stroke="#1a3050" strokeWidth="0.7" opacity={0.6} />
        <Line x1="260" y1="308" x2="574" y2="308" stroke="#1a3050" strokeWidth="0.7" opacity={0.6} />

        {/* ═══ HULL DESIGNATION ═══ */}
        <SvgText fontFamily="monospace" fontSize="12" fill="#4a9eff" opacity={0.15}
          x="352" y="295" letterSpacing={7} textAnchor="start">THE AXIOM</SvgText>

        {/* ═══ COMMAND SECTION (Zone 2: Navigation Array) ═══ */}
        <Polygon
          points="540,232 582,260 582,285 574,286 574,264 552,240"
          fill="#0f2438"
          stroke="#243a5a"
          strokeWidth="1"
          strokeOpacity={zo(r[2], 0.8, 0.3)}
        />
        <Polygon
          points="552,240 578,263 578,281 570,278 570,266 556,246"
          fill="#061828"
          stroke="#4a9eff"
          strokeWidth="1.5"
          strokeOpacity={zo(r[2], 0.9, 0.15)}
        />
        <Polygon
          points="556,246 576,267 576,278 568,276 568,264 560,250"
          fill="#4a9eff"
          opacity={zo(r[2], 0.12, 0.02)}
        />
        <Line x1="566" y1="250" x2="568" y2="278" stroke="#4a9eff" strokeWidth="0.8" opacity={zo(r[2], 0.45, 0.06)} />
        <Polygon
          points="552,240 578,263 578,281 570,278 570,266 556,246"
          fill="none"
          stroke="#c87941"
          strokeWidth="1"
          opacity={zo(r[2], 0.55, 0.08)}
        />

        {/* ═══ FORWARD SENSOR WING (Zone 4: Communication Array) ═══ */}
        <Polygon
          points="314,248 340,232 388,225 382,237 338,242"
          fill="#08121e"
          stroke="#1a3050"
          strokeWidth="1"
          strokeOpacity={zo(r[4], 0.7, 0.2)}
        />
        <Polygon
          points="388,225 464,202 484,212 428,236 382,237"
          fill="#0f2438"
          stroke="#1e3a5c"
          strokeWidth="1.5"
          strokeOpacity={zo(r[4], 0.9, 0.2)}
        />
        <Polygon
          points="382,237 428,236 484,212 476,222 422,244"
          fill="#08121e"
          stroke="#152232"
          strokeWidth="1"
          strokeOpacity={zo(r[4], 0.6, 0.15)}
        />
        {/* Sensor array panel */}
        <Rect x="402" y="212" width="60" height="20" rx="3"
          fill="#061428" stroke="#4a9eff" strokeWidth="1.2"
          strokeOpacity={zo(r[4], 0.9, 0.12)} />
        <Line x1="416" y1="212" x2="416" y2="232" stroke="#4a9eff" strokeWidth="0.6" opacity={zo(r[4], 0.4, 0.05)} />
        <Line x1="430" y1="212" x2="430" y2="232" stroke="#4a9eff" strokeWidth="0.6" opacity={zo(r[4], 0.4, 0.05)} />
        <Line x1="444" y1="212" x2="444" y2="232" stroke="#4a9eff" strokeWidth="0.6" opacity={zo(r[4], 0.4, 0.05)} />
        <Line x1="458" y1="212" x2="458" y2="232" stroke="#4a9eff" strokeWidth="0.6" opacity={zo(r[4], 0.4, 0.05)} />
        {/* Sensor dots */}
        <Circle cx="409" cy="222" r="2.5" fill="#4a9eff" opacity={zo(r[4], 0.8, 0.08)} />
        <Circle cx="423" cy="220" r="2" fill="#4a9eff" opacity={zo(r[4], 0.65, 0.06)} />
        <Circle cx="437" cy="219" r="2.5" fill="#4a9eff" opacity={zo(r[4], 0.8, 0.08)} />
        <Circle cx="451" cy="220" r="2" fill="#4a9eff" opacity={zo(r[4], 0.65, 0.06)} />
        <Circle cx="462" cy="221" r="2.5" fill="#4a9eff" opacity={zo(r[4], 0.75, 0.07)} />
        {/* Wing tip beacon (animated) */}
        <Circle cx="480" cy="213" r="4" fill="#4a9eff" opacity={zo(r[4], 0.9, 0.08)} />
        <Circle cx="480" cy="213" r="8" fill="none" stroke="#4a9eff" strokeWidth="1" opacity={zo(r[4], 0.3, 0.03)} />
        {/* Copper accent line */}
        <Line x1="388" y1="225" x2="484" y2="212" stroke="#c87941" strokeWidth="1.2" opacity={zo(r[4], 0.55, 0.08)} />

        {/* ═══ SENSOR MAST (Zone 4 detail) ═══ */}
        <Rect x="457" y="218" width="5" height="16" rx="1.5" fill="#0a1828"
          stroke="#1e3a5c" strokeWidth="1" strokeOpacity={zo(r[4], 0.7, 0.15)} />
        <Circle cx="459" cy="217" r="4" fill="#0a1828"
          stroke={allDone ? '#4ecb8d' : '#4ecb8d'} strokeWidth="1.2"
          strokeOpacity={zo(r[4], 0.9, 0.12)} />
        <Circle cx="459" cy="217" r="2" fill="#4ecb8d" opacity={zo(r[4], 0.75, 0.06)} />

        {/* ═══ ENGINE SECTION (Zone 0: Emergency Power) ═══ */}
        <Rect x="218" y="293" width="66" height="38" rx="7"
          fill="#0c1e36" stroke="#1e3a5c" strokeWidth="1.5"
          strokeOpacity={zo(r[0], 0.8, 0.2)} />
        <Rect x="223" y="298" width="56" height="28" rx="5"
          fill="#08121e" stroke="#1a2e48" strokeWidth="1"
          strokeOpacity={zo(r[0], 0.6, 0.15)} />
        {/* Primary engine nozzle */}
        <Ellipse cx="222" cy="312" rx="12" ry="18"
          fill="#061428" stroke="#4a9eff" strokeWidth="1.8"
          strokeOpacity={zo(r[0], 0.9, 0.15)} />
        <Ellipse cx="222" cy="312" rx="7" ry="12" fill="#4a9eff" opacity={zo(r[0], 0.28, 0.03)} />
        <Ellipse cx="222" cy="312" rx="3.5" ry="7" fill="#4a9eff" opacity={zo(r[0], 0.55, 0.05)} />
        {/* Secondary engine */}
        <Rect x="236" y="296" width="38" height="24" rx="5"
          fill="#0a1624" stroke="#1a2e48" strokeWidth="1"
          strokeOpacity={zo(r[0], 0.6, 0.12)} />
        <Rect x="237" y="297" width="36" height="22" rx="4"
          fill="none" stroke="#c87941" strokeWidth="0.7" opacity={zo(r[0], 0.35, 0.05)} />
        <Ellipse cx="242" cy="312" rx="8" ry="10"
          fill="#061428" stroke="#4a9eff" strokeWidth="1.3"
          strokeOpacity={zo(r[0], 0.8, 0.12)} />
        <Ellipse cx="242" cy="312" rx="4.5" ry="6" fill="#4a9eff" opacity={zo(r[0], 0.18, 0.02)} />
        <Ellipse cx="242" cy="312" rx="2" ry="3.5" fill="#4a9eff" opacity={zo(r[0], 0.38, 0.04)} />
        {/* Engine status panel */}
        <Rect x="255" y="275" width="46" height="12" rx="3"
          fill="#061428" stroke="#1e3a5c" strokeWidth="0.8"
          strokeOpacity={zo(r[0], 0.6, 0.1)} />
        <Circle cx="262" cy="281" r="2.2" fill="#4a9eff" opacity={zo(r[0], 0.6, 0.06)} />
        <Circle cx="271" cy="281" r="2.2" fill="#4ecb8d" opacity={zo(r[0], 0.6, 0.06)} />
        <Circle cx="280" cy="281" r="2.2" fill="#c87941" opacity={zo(r[0], 0.65, 0.06)} />
        <Circle cx="289" cy="281" r="2.2" fill="#4a9eff" opacity={zo(r[0], 0.4, 0.04)} />

        {/* ═══ AX-MOD PORT (Zone 7: Bridge Systems) ═══ */}
        <Rect x="348" y="268" width="14" height="18" rx="3"
          fill="#061428" stroke="#c87941" strokeWidth="1.5"
          strokeOpacity={zo(r[7], 0.9, 0.15)} />
        <Circle cx="355" cy="277" r="4" fill="#c87941" opacity={zo(r[7], 0.5, 0.05)} />

        {/* ═══ LANDING GEAR BAYS (Zone 6: Weapons Lock) ═══ */}
        <Rect x="316" y="334" width="36" height="9" rx="2.5"
          fill="#061428" stroke="#1a2e48" strokeWidth="0.8"
          strokeOpacity={zo(r[6], 0.6, 0.15)} />
        <Rect x="436" y="334" width="36" height="9" rx="2.5"
          fill="#061428" stroke="#1a2e48" strokeWidth="0.8"
          strokeOpacity={zo(r[6], 0.6, 0.15)} />

        {/* ═══ HULL DAMAGE (copper) ═══ */}
        <Path d="M 370,252 L 378,264 L 373,274" stroke="#c87941" strokeWidth="0.9" fill="none" opacity={0.45} />
        <Path d="M 373,255 L 381,260" stroke="#c87941" strokeWidth="0.6" fill="none" opacity={0.3} />
        <Path d="M 504,272 L 510,282 L 506,289" stroke="#c87941" strokeWidth="0.8" fill="none" opacity={0.3} />
        <Line x1="292" y1="286" x2="306" y2="296" stroke="#c87941" strokeWidth="0.8" opacity={0.22} />

      </Svg>
    </View>
  );
}
