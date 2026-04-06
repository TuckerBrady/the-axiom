import React, { useEffect } from 'react';
import Svg, {
  Rect,
  Circle,
  Line,
  Path,
  G,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  createAnimatedComponent,
} from 'react-native-reanimated';
import { Colors } from '../theme/tokens';

// ─── Animated SVG primitives ───────────────────────────────────────────────────

const AnimatedCircle = createAnimatedComponent(Circle);

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CogsSize = 'small' | 'medium' | 'large';
export type CogsState = 'damaged' | 'partial' | 'online' | 'engaged' | 'green' | 'dark';

interface Props {
  size?: CogsSize;
  state?: CogsState;
}

const SIZE_MAP: Record<CogsSize, number> = {
  small: 28,
  medium: 56,
  large: 96,
};

// Hex tokens used for the new states. Colors.green / Colors.blue in tokens
// resolve to slightly different hex values; the spec calls for these exact ones.
const GREEN_HEX = '#00C48C';
const DARK_BLUE_HEX = '#00D4FF';

// ─── Component ─────────────────────────────────────────────────────────────────
// All geometry defined for a 100×130 viewBox. SVG scales via width/height props.

export default function CogsAvatar({ size = 'medium', state = 'online' }: Props) {
  const px = SIZE_MAP[size];
  const py = px * (130 / 100);

  const isGreen = state === 'green';
  const isDark = state === 'dark';
  const isOnline = state === 'online';
  const isEngaged = state === 'engaged';
  const isDamaged = state === 'damaged';

  // ── Eye colour ──
  const eyeColor =
    isDamaged ? Colors.red
    : state === 'partial' ? Colors.amber
    : isOnline ? Colors.blue
    : isGreen ? GREEN_HEX
    : isDark ? DARK_BLUE_HEX
    : Colors.amber; // engaged

  const reactorColor =
    isOnline ? Colors.blue
    : isEngaged ? Colors.amber
    : isDamaged ? Colors.red
    : isGreen ? GREEN_HEX
    : isDark ? DARK_BLUE_HEX
    : `${Colors.amber}88`;

  // ── Animations ──

  // Eye opacity (left). Damaged flickers; dark slow-breathes; otherwise solid.
  const eyeOpacity = useSharedValue(1);
  // Eye opacity (right). Only diverges from left in dark state where it is
  // phase-offset by 400ms for the breathing effect.
  const eyeOpacity2 = useSharedValue(1);
  useEffect(() => {
    if (isDamaged) {
      eyeOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 80 }),
          withTiming(1, { duration: 60 }),
          withTiming(0.5, { duration: 100 }),
          withTiming(1, { duration: 200 }),
          withTiming(0.1, { duration: 60 }),
          withTiming(1, { duration: 400 }),
        ),
        -1,
        false,
      );
      eyeOpacity2.value = eyeOpacity.value;
    } else if (isDark) {
      eyeOpacity.value = 0.12;
      eyeOpacity.value = withRepeat(
        withSequence(
          withTiming(0.28, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.12, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      eyeOpacity2.value = 0.12;
      eyeOpacity2.value = withDelay(
        400,
        withRepeat(
          withSequence(
            withTiming(0.28, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.12, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      eyeOpacity.value = 1;
      eyeOpacity2.value = 1;
    }
  }, [state]);

  const eyeProps1 = useAnimatedProps(() => ({
    opacity: eyeOpacity.value,
    fill: eyeColor,
  }));
  const eyeProps2 = useAnimatedProps(() => ({
    opacity: eyeOpacity2.value,
    fill: eyeColor,
  }));

  // Antenna pulse glow
  const antennaPulse = useSharedValue(0.4);
  useEffect(() => {
    if (isOnline) {
      antennaPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else if (isGreen) {
      antennaPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else if (isDark) {
      antennaPulse.value = 0.10;
    } else {
      antennaPulse.value = 0.6;
    }
  }, [state]);

  const antennaFill =
    isOnline ? Colors.green
    : isDamaged ? Colors.red
    : isGreen ? GREEN_HEX
    : isDark ? DARK_BLUE_HEX
    : Colors.amber;

  const antennaProps = useAnimatedProps(() => ({
    opacity: antennaPulse.value,
    fill: antennaFill,
  }));

  // Chest reactor pulse
  const reactorPulse = useSharedValue(0.6);
  useEffect(() => {
    if (isOnline || isEngaged) {
      reactorPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else if (isGreen) {
      reactorPulse.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: 1250, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else if (isDark) {
      reactorPulse.value = withRepeat(
        withSequence(
          withTiming(0.18, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.08, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      reactorPulse.value = isDamaged ? 0.3 : 0.5;
    }
  }, [state]);

  const reactorProps = useAnimatedProps(() => ({
    opacity: reactorPulse.value,
  }));

  // Outer reactor ring pulse (opposite phase). Hidden for green and dark.
  const reactorRing = useSharedValue(0.2);
  useEffect(() => {
    if (isOnline || isEngaged) {
      reactorRing.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else if (isGreen || isDark) {
      reactorRing.value = 0;
    } else {
      reactorRing.value = 0.1;
    }
  }, [state]);

  const reactorRingProps = useAnimatedProps(() => ({
    opacity: reactorRing.value,
  }));

  // Engaged — container slight tilt
  const tiltStyle = useAnimatedStyle(() => ({
    transform: isEngaged ? [{ rotate: '-4deg' }] : [],
  }));

  // ── Head group transform for engaged (slight tilt) ──
  const headTransform = isEngaged ? 'rotate(-5, 50, 40)' : undefined;

  // ── Left arm raise for engaged ──
  const leftArmY = isEngaged ? 66 : 74;

  // ── Chassis stroke per state ──
  const chassisStroke =
    isDamaged ? Colors.red
    : isOnline ? Colors.blue
    : isGreen ? GREEN_HEX
    : isDark ? DARK_BLUE_HEX
    : Colors.dim;
  const chassisStrokeWidth =
    isOnline || isGreen || isDark ? '1.5' : '1';
  const headStrokeOpacity =
    isOnline ? 0.6
    : isGreen ? 0.5
    : isDark ? 0.18
    : 0.4;
  const bodyStrokeOpacity =
    isOnline ? 0.5
    : isGreen ? 0.5
    : isDark ? 0.18
    : 0.35;

  // ── Mouth LED dot fill ──
  const mouthLedFill =
    isOnline ? Colors.green
    : isGreen ? GREEN_HEX
    : isDark ? GREEN_HEX
    : Colors.dim;
  const mouthLedOpacityHigh = isDark ? 0.10 : 0.8;
  const mouthLedOpacityLow = isDark ? 0.10 : 0.5;

  // ── Copper accent opacity per state ──
  const showCopperLines = isOnline || isEngaged || isGreen || isDark;
  const copperLineOpacity = isDark ? 0.18 : 0.6;
  const copperBarHigh =
    isDark ? 0.18
    : isOnline || isEngaged || isGreen ? 0.7
    : 0.3;
  const copperBarLow =
    isDark ? 0.14
    : isOnline || isEngaged || isGreen ? 0.5
    : 0.2;

  return (
    <Animated.View style={tiltStyle}>
      <Svg width={px} height={py} viewBox="0 0 100 130">
        <Defs>
          <RadialGradient id="reactorGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={reactorColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={reactorColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── Antenna ── */}
        <Line
          x1="50" y1="2" x2="50" y2="14"
          stroke={isDamaged ? Colors.red : Colors.dim}
          strokeWidth="2"
          strokeLinecap="round"
          transform={isDamaged ? 'rotate(22, 50, 14)' : undefined}
        />
        <AnimatedCircle
          cx="50"
          cy="2"
          r="4"
          animatedProps={antennaProps}
        />

        {/* ── Head group ── */}
        <G transform={headTransform}>
          {/* Head chassis */}
          <Rect
            x="14" y="12" width="72" height="52"
            rx="12" ry="12"
            fill="#0e1f36"
            stroke={chassisStroke}
            strokeWidth={chassisStrokeWidth}
            strokeOpacity={headStrokeOpacity}
          />

          {/* Visor slot */}
          <Rect
            x="18" y="24" width="64" height="28"
            rx="6" ry="6"
            fill="#060e1a"
          />

          {/* Left eye */}
          <AnimatedCircle cx="36" cy="38" r="10" animatedProps={eyeProps1} />
          <Circle cx="36" cy="38" r="5" fill="#000" opacity="0.5" />
          <Circle cx="38" cy="36" r="2" fill="#fff" opacity="0.4" />

          {/* Right eye */}
          <AnimatedCircle cx="64" cy="38" r="10" animatedProps={eyeProps2} />
          <Circle cx="64" cy="38" r="5" fill="#000" opacity="0.5" />
          <Circle cx="66" cy="36" r="2" fill="#fff" opacity="0.4" />

          {/* Mouth bar */}
          <Rect x="34" y="55" width="32" height="5" rx="2.5" fill={Colors.dim} opacity="0.6" />
          {/* Mouth LED dots */}
          <Circle cx="42" cy="57.5" r="1.5" fill={mouthLedFill} opacity={mouthLedOpacityHigh} />
          <Circle cx="50" cy="57.5" r="1.5" fill={mouthLedFill} opacity={mouthLedOpacityLow} />
          <Circle cx="58" cy="57.5" r="1.5" fill={mouthLedFill} opacity={mouthLedOpacityHigh} />

          {/* Copper accent lines */}
          {showCopperLines && (
            <>
              <Line x1="14" y1="26" x2="14" y2="50" stroke={Colors.copper} strokeWidth="2" strokeOpacity={copperLineOpacity} />
              <Line x1="86" y1="26" x2="86" y2="50" stroke={Colors.copper} strokeWidth="2" strokeOpacity={copperLineOpacity} />
            </>
          )}

          {/* Damage crack */}
          {isDamaged && (
            <Path
              d="M 52 14 L 46 36 L 50 48 L 44 64"
              stroke={Colors.red}
              strokeWidth="1.5"
              strokeOpacity="0.7"
              fill="none"
              strokeLinecap="round"
            />
          )}
        </G>

        {/* ── Neck ── */}
        <Rect x="40" y="64" width="20" height="8" rx="3" fill="#0a1628" stroke={Colors.dim} strokeWidth="1" strokeOpacity="0.4" />

        {/* ── Body chassis ── */}
        <Rect
          x="12" y="72" width="76" height="46"
          rx="8" ry="8"
          fill="#0e1f36"
          stroke={chassisStroke}
          strokeWidth={chassisStrokeWidth}
          strokeOpacity={bodyStrokeOpacity}
        />

        {/* Chest reactor glow halo */}
        <AnimatedCircle cx="50" cy="91" r="18" fill="url(#reactorGrad)" animatedProps={reactorRingProps} />

        {/* Chest reactor core */}
        <AnimatedCircle cx="50" cy="91" r="10" fill={reactorColor} animatedProps={reactorProps} />
        <Circle cx="50" cy="91" r="6" fill="#060e1a" opacity="0.7" />
        <Circle cx="50" cy="91" r="3" fill={reactorColor} opacity="0.9" />

        {/* Copper body accents */}
        <Rect x="18" y="82" width="10" height="2.5" rx="1.25" fill={Colors.copper} opacity={copperBarHigh} />
        <Rect x="72" y="82" width="10" height="2.5" rx="1.25" fill={Colors.copper} opacity={copperBarHigh} />
        <Rect x="18" y="100" width="10" height="2" rx="1" fill={Colors.copper} opacity={copperBarLow} />
        <Rect x="72" y="100" width="10" height="2" rx="1" fill={Colors.copper} opacity={copperBarLow} />

        {/* ── Left arm ── */}
        <Rect
          x="0" y={leftArmY} width="14" height="32"
          rx="5" ry="5"
          fill="#0e1f36"
          stroke={Colors.dim} strokeWidth="1" strokeOpacity="0.5"
        />
        <Circle cx="7" cy={leftArmY + 32} r="4" fill="#0a1628" stroke={Colors.dim} strokeWidth="1" strokeOpacity="0.4" />

        {/* ── Right arm ── */}
        <Rect x="86" y="74" width="14" height="32" rx="5" ry="5"
          fill="#0e1f36" stroke={Colors.dim} strokeWidth="1" strokeOpacity="0.5" />
        <Circle cx="93" cy="110" r="4" fill="#0a1628" stroke={Colors.dim} strokeWidth="1" strokeOpacity="0.4" />

        {/* ── Legs ── */}
        <Rect x="22" y="118" width="22" height="12" rx="4" fill="#0a1628" stroke={Colors.dim} strokeWidth="1" strokeOpacity="0.4" />
        <Rect x="56" y="118" width="22" height="12" rx="4" fill="#0a1628" stroke={Colors.dim} strokeWidth="1" strokeOpacity="0.4" />

        {/* ── Damage badge (damaged only) ── */}
        {isDamaged && (
          <G>
            <Circle cx="84" cy="16" r="12" fill={Colors.red} opacity="0.9" />
            <Rect x="82.5" y="10" width="3" height="7" rx="1.5" fill="#fff" />
            <Circle cx="84" cy="20" r="1.5" fill="#fff" />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}
