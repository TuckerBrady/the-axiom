import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Line, Rect, Path, G, Ellipse } from 'react-native-svg';
import { Colors } from '../theme/tokens';

// useNativeDriver: false on every Animated.timing in this file is
// load-bearing — every animated value here interpolates into an SVG
// attribute (Circle r / cy, Path strokeDashoffset, Rect width, etc.)
// which the native driver does not support. Flipping to native
// silently breaks the animation on iOS device. PERFORMANCE_CONTRACT
// 2.2.3 / 2.3.1 (Bucket B exemption). Audited 99C, Fix 6.

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// Normalize underscore IDs (Codex data) to camelCase (engine)
function normalizeType(type: string): string {
  if (type === 'config_node') return 'configNode';
  return type;
}

// D-05 — Counter's quantity readout as a segmented ring instead of
// SvgText (unreadable below ~10pt). Returns an SVG arc `d` string for
// segment `index` of `total`, evenly spaced around a circle of radius
// `r` centred at (cx, cy), with a small gap between segments.
function ringSegmentPath(cx: number, cy: number, r: number, index: number, total: number): string {
  const gapDeg = total > 1 ? 6 : 0;
  const segDeg = 360 / total - gapDeg;
  const startDeg = index * (360 / total) - 90 + gapDeg / 2;
  const endDeg = startDeg + segDeg;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const largeArc = segDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
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
  latchMode?: 'write' | 'read' | 'delay';
  storedValue?: number | null;
  count?: number;
  configValue?: number;
  threshold?: number;
  connectedMagnetSides?: string[];
}

/**
 * Canonical piece icon SVGs — each piece type has a distinctive secondary
 * accent treatment that is independent of the `color` prop. The `color` prop
 * still drives the primary stroke for board-level uniformity.
 */
// React.memo prevents per-frame re-renders during beam animation. The
// props are primitives + strings; default shallow comparison is
// sufficient. Non-memoized render of this SVG + animation ref setup
// was one of the biggest JS-thread costs on device.
export const PieceIcon = React.memo(function PieceIcon({
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
  connectedMagnetSides,
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
  // Splitter magnet positions (0 = retracted, 1 = extended)
  const magnet0Ext = useRef(new Animated.Value(0)).current;
  const magnet1Ext = useRef(new Animated.Value(0)).current;
  const prevMagnetsRef = useRef<string[] | undefined>(undefined);

  useEffect(() => {
    if (spinning) {
      gearRot.setValue(0);
      Animated.timing(gearRot, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        // Safe: gearRot drives only a transform on an Animated.View
        // (line ~350), never an SVG prop. Native driver moves the
        // rotation off the JS thread.
        useNativeDriver: true,
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

  // Conveyor rolling: drive dash offset via Animated.loop so it syncs
  // with the native frame rate instead of competing with it via a
  // 25ms setInterval on the JS thread.
  useEffect(() => {
    if (!rolling) return;
    rollDash.setValue(0);
    const loop = Animated.loop(
      Animated.timing(rollDash, {
        toValue: 30,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
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

  // Terminal lock sequence — drives 3 expanding rings over 400ms.
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

  // Source charge sequence — drives 2 expanding rings over 280ms.
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

  // Splitter magnet snap: animate magnets when connectedMagnetSides changes
  useEffect(() => {
    const prev = prevMagnetsRef.current;
    const curr = connectedMagnetSides ?? [];
    prevMagnetsRef.current = curr.length > 0 ? [...curr] : undefined;

    // Magnet 0
    const has0 = curr.length >= 1;
    const had0 = prev ? prev.length >= 1 : false;
    if (has0 && !had0) {
      Animated.timing(magnet0Ext, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    } else if (!has0 && had0) {
      Animated.timing(magnet0Ext, { toValue: 0, duration: 100, useNativeDriver: false }).start();
    } else if (has0) {
      magnet0Ext.setValue(1);
    }

    // Magnet 1
    const has1 = curr.length >= 2;
    const had1 = prev ? prev.length >= 2 : false;
    if (has1 && !had1) {
      Animated.timing(magnet1Ext, { toValue: 1, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    } else if (!has1 && had1) {
      Animated.timing(magnet1Ext, { toValue: 0, duration: 100, useNativeDriver: false }).start();
    } else if (has1) {
      magnet1Ext.setValue(1);
    }
  }, [connectedMagnetSides, magnet0Ext, magnet1Ext]);

  switch (type) {
    case 'conveyor':
      // D-01 — moved onto the shared 0 0 40 40 canvas, rendered s x s
      // with no exceptions, so optical mass matches every other piece
      // at tray/board size. D-03/D-04 — both drums are Physics copper;
      // start vs end is now told by FORM (filled vs hollow), not hue.
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="3" y="13" width="34" height="14" rx="7" fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="2" />
          <AnimatedLine
            x1="15" y1="17" x2="25" y2="17"
            stroke={Colors.copper} strokeWidth="1.2" strokeOpacity="0.5"
            strokeDasharray="3,2"
            strokeDashoffset={rolling ? (rollDash as unknown as number) : 0}
          />
          <AnimatedLine
            x1="15" y1="23" x2="25" y2="23"
            stroke={Colors.copper} strokeWidth="1.2" strokeOpacity="0.5"
            strokeDasharray="3,2"
            strokeDashoffset={rolling ? (rollDash as unknown as number) : 0}
          />
          {/* Start drum — filled */}
          <Circle cx="9" cy="20" r="6.5" fill={Colors.copper} stroke={Colors.copper} strokeWidth="1.5" />
          {/* End drum — hollow (form differentiates output from input) */}
          <Circle cx="31" cy="20" r="6.5" fill="none" stroke={Colors.copper} strokeWidth="1.5" />
          <Path d="M 18 16 L 23 20 L 18 24" stroke={Colors.copper} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </Svg>
      );

    case 'source': {
      const chargeR1 = chargeProgress.interpolate({ inputRange: [0, 1], outputRange: [4, 28] });
      const chargeR2 = chargeProgress.interpolate({ inputRange: [0, 1], outputRange: [4, 22] });
      const chargeOp = chargeProgress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* D-02: the faint 0.2-opacity outer halo did not survive at
              size — deleted rather than dimmed. */}
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={color ?? Colors.amber} strokeWidth="2" />
          <Circle cx="20" cy="20" r="10" fill="#060e1a" stroke={color ?? Colors.amber} strokeWidth="1.2" strokeOpacity="0.5" />
          <Path d="M 17 13 L 17 27 L 27 20 Z" fill={color ?? Colors.amber} />
          {charging && (
            <>
              <AnimatedCircle cx="20" cy="20" r={chargeR1 as unknown as number} fill="none" stroke={Colors.protocol} strokeWidth="1.5" strokeOpacity={chargeOp as unknown as number} />
              <AnimatedCircle cx="20" cy="20" r={chargeR2 as unknown as number} fill="none" stroke={Colors.protocol} strokeWidth="1.5" strokeOpacity={chargeOp as unknown as number} />
            </>
          )}
        </Svg>
      );
    }

    case 'terminal': {
      const lockR1 = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 42] });
      const lockR2 = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 34] });
      const lockR3 = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 28] });
      const lockOp = lockProgress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={color ?? Colors.green} strokeWidth="2" />
          <Circle cx="20" cy="20" r="9" fill="#060e1a" stroke={color ?? Colors.green} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="4" fill={color ?? Colors.green} />
          {/* Corner accent L-marks */}
          <Path d="M 6 6 L 9 6 M 6 6 L 6 9" stroke={Colors.green} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
          <Path d="M 34 6 L 31 6 M 34 6 L 34 9" stroke={Colors.green} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
          <Path d="M 6 34 L 9 34 M 6 34 L 6 31" stroke={Colors.green} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
          <Path d="M 34 34 L 31 34 M 34 34 L 34 31" stroke={Colors.green} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
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
              fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="2" strokeLinejoin="round"
            />
            {/* N/S/E/W tooth nubs */}
            <Rect x="18.5" y="2" width="3" height="4" rx="1" fill={Colors.copper} opacity="0.85" />
            <Rect x="18.5" y="34" width="3" height="4" rx="1" fill={Colors.copper} opacity="0.85" />
            <Rect x="2" y="18.5" width="4" height="3" rx="1" fill={Colors.copper} opacity="0.85" />
            <Rect x="34" y="18.5" width="4" height="3" rx="1" fill={Colors.copper} opacity="0.85" />
            {/* Inner ring + center pivot — D-02 opacity floor, D-03 copper (not amber) */}
            <Circle cx="20" cy="20" r="6" fill="#060e1a" stroke={Colors.copper} strokeWidth="1.2" strokeOpacity="0.5" />
            <Circle cx="20" cy="20" r="2.5" fill={Colors.copper} />
          </Svg>
        </Animated.View>
      );
    }

    case 'splitter': {
      const juncR = splitPulse.interpolate({ inputRange: [0, 1], outputRange: [3, 4.2] });
      const mags = connectedMagnetSides ?? [];
      // Magnet layout lookup: extended pos, retracted pos
      const magnetLayout: Record<string, { ex: number; ey: number; rx: number; ry: number; wx: number; wy: number }> = {
        top:    { ex: 20, ey: 4,  rx: 20, ry: 14, wx: 20, wy: 16 },
        bottom: { ex: 20, ey: 36, rx: 20, ry: 26, wx: 20, wy: 24 },
        left:   { ex: 4,  ey: 20, rx: 14, ry: 20, wx: 16, wy: 20 },
        right:  { ex: 36, ey: 20, rx: 26, ry: 20, wx: 24, wy: 20 },
      };
      // Default retracted positions for unconnected magnets: first uses top, second uses bottom
      const defaultSides = ['top', 'bottom'];
      const m0Side = mags[0] ?? defaultSides[0];
      const m1Side = mags[1] ?? defaultSides[1];
      const m0 = magnetLayout[m0Side];
      const m1 = magnetLayout[m1Side];
      const m0x = magnet0Ext.interpolate({ inputRange: [0, 1], outputRange: [m0.rx, m0.ex] });
      const m0y = magnet0Ext.interpolate({ inputRange: [0, 1], outputRange: [m0.ry, m0.ey] });
      const m1x = magnet1Ext.interpolate({ inputRange: [0, 1], outputRange: [m1.rx, m1.ex] });
      const m1y = magnet1Ext.interpolate({ inputRange: [0, 1], outputRange: [m1.ry, m1.ey] });
      const wireOp0 = magnet0Ext.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.8] });
      const wireOp1 = magnet1Ext.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.8] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Wire 0: center to magnet 0 — copper routing */}
          <AnimatedLine
            x1={m0.wx} y1={m0.wy}
            x2={m0x as unknown as number} y2={m0y as unknown as number}
            stroke={splitting ? '#F0B429' : '#c87941'}
            strokeWidth={1.2}
            strokeOpacity={splitting ? 1 : (wireOp0 as unknown as number)}
          />
          {/* Wire 1: center to magnet 1 — copper routing */}
          <AnimatedLine
            x1={m1.wx} y1={m1.wy}
            x2={m1x as unknown as number} y2={m1y as unknown as number}
            stroke={splitting ? '#F0B429' : '#c87941'}
            strokeWidth={1.2}
            strokeOpacity={splitting ? 1 : (wireOp1 as unknown as number)}
          />
          {/* Center node — Physics identity via color prop */}
          <AnimatedCircle
            cx="20" cy="20"
            r={juncR as unknown as number}
            fill="#0e1f36"
            stroke={color ?? '#4a9eff'}
            strokeWidth="2"
          />
          {/* Magnet 0 (oval) — filled copper. D-04: two outputs told
              apart by FORM (filled vs hollow), not by hue. */}
          <AnimatedEllipse
            cx={m0x as unknown as number} cy={m0y as unknown as number}
            rx="3" ry="2"
            fill={Colors.copper}
            stroke={Colors.copper}
            strokeWidth="1.2"
          />
          {/* Magnet 1 (oval) — hollow copper */}
          <AnimatedEllipse
            cx={m1x as unknown as number} cy={m1y as unknown as number}
            rx="3" ry="2"
            fill="#0e1f36"
            stroke={Colors.copper}
            strokeWidth="1.5"
          />
        </Svg>
      );
    }

    case 'configNode': {
      // D-06 — state is NEVER encoded as position. Gate strips render on
      // all four edges identically regardless of active/inactive; only
      // opacity (a property of the strip itself, invariant under
      // rotation) and the centre status dot distinguish the states.
      const isActive = (configValue ?? 1) === 1;
      // D-03: resting (non-gating) strip fill is copper, not amber —
      // amber is reserved for the beam. The gating-flash colors stay,
      // exempted as a transient gate-evaluation event.
      const gateFill = gating
        ? (gateResult === 'block' ? '#FF3B3B' : '#00C48C')
        : Colors.copper;
      const gateOp = gatePulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
      const restOpacity = isActive ? 0.7 : 0.45;
      const stripOpacity = gating ? (gateOp as unknown as number) : restOpacity;
      // Status dot semantic color (amber/red/green) is a live state
      // readout, not decoration — D-03's explicit exemption for this case.
      const dotFill = gating
        ? (gateResult === 'block' ? '#FF3B3B' : '#00C48C')
        : (isActive ? Colors.amber : Colors.dim);
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="5" fill="#0e1f36" stroke={color ?? Colors.protocol} strokeWidth="2" />
          {/* Gate strips — all four edges, always. */}
          <AnimatedRect x="8" y="8" width="4" height="24" rx="2" fill={gateFill} opacity={stripOpacity} />
          <AnimatedRect x="28" y="8" width="4" height="24" rx="2" fill={gateFill} opacity={stripOpacity} />
          <AnimatedRect x="8" y="8" width="24" height="4" rx="2" fill={gateFill} opacity={stripOpacity} />
          <AnimatedRect x="8" y="28" width="24" height="4" rx="2" fill={gateFill} opacity={stripOpacity} />
          {/* Data rows: lavender, fixed position (D-02 opacity floor) */}
          <Line x1="15" y1="15" x2="25" y2="15" stroke={Colors.circuit} strokeWidth="1.5" strokeOpacity="0.5" />
          <Line x1="15" y1="20" x2="23" y2="20" stroke={Colors.circuit} strokeWidth="1.5" strokeOpacity="0.5" />
          <Line x1="15" y1="25" x2="25" y2="25" stroke={Colors.circuit} strokeWidth="1.5" strokeOpacity="0.5" />
          {/* Centre status dot — the rotation-invariant primary signal
              (D-06): radius 4 + full-opacity fill communicate on/off; a
              concentric ring appears only when active. */}
          <Circle cx="20" cy="20" r="4" fill={dotFill} />
          {isActive && !gating && (
            <Circle cx="20" cy="20" r="6.5" fill="none" stroke={dotFill} strokeWidth="1.2" strokeOpacity="0.6" />
          )}
          {/* Corner accents: protocol identity */}
          <Path d="M 8 8 L 11 8 M 8 8 L 8 11" stroke={Colors.protocol} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
          <Path d="M 32 32 L 29 32 M 32 32 L 32 29" stroke={Colors.protocol} strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
        </Svg>
      );
    }

    case 'scanner': {
      const sweepY = scanY.interpolate({ inputRange: [0, 1], outputRange: [6, 34] });
      const sweepOpacity = scanY.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.9, 0.9, 0] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Outer ring — Protocol identity via color prop */}
          <Circle cx="20" cy="20" r="15" fill="#0e1f36" stroke={color ?? Colors.protocol} strokeWidth="2" />
          {/* Middle ring — lavender (D-03: cyan is beam-only) */}
          <Circle cx="20" cy="20" r="10" fill="none" stroke={Colors.circuit} strokeWidth="1.2" strokeOpacity="0.5" />
          {/* Inner ring — light violet */}
          <Circle cx="20" cy="20" r="5" fill="none" stroke="#C4B5FD" strokeWidth="1.2" strokeOpacity="0.45" />
          {/* Crosshairs — lavender static identity */}
          <Line x1="20" y1="5" x2="20" y2="35" stroke={Colors.circuit} strokeWidth="1.2" strokeOpacity="0.45" />
          <Line x1="5" y1="20" x2="35" y2="20" stroke={Colors.circuit} strokeWidth="1.2" strokeOpacity="0.45" />
          {/* Center dot — lavender */}
          <Circle cx="20" cy="20" r="2" fill={Colors.circuit} />
          {/* Readout panel — lavender */}
          <Rect x="12" y="35" width="16" height="3" fill={Colors.circuit} opacity="0.5" />
          {/* Active scan sweep — cyan (D-03 exemption: `scanning`-guarded) */}
          <AnimatedLine
            x1="6" y1={sweepY as unknown as number}
            x2="34" y2={sweepY as unknown as number}
            stroke="#00D4FF" strokeWidth="1.5"
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
          {/* Base circle — lavender */}
          <Circle cx="20" cy="32" r="5" fill="rgba(139,92,246,0.15)" stroke="#a78bfa" strokeOpacity="0.7" strokeWidth="1.2" />
          {/* Antenna mast — Protocol identity via color prop */}
          <Path d="M 20 28 L 20 12" stroke={color ?? Colors.protocol} strokeWidth="2" strokeLinecap="round" />
          {/* Innermost wave arcs — light violet */}
          <AnimatedPath d="M 14 22 Q 10 16 14 10" stroke="#C4B5FD" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity={innerOp as unknown as number} />
          <AnimatedPath d="M 26 22 Q 30 16 26 10" stroke="#C4B5FD" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity={innerOp as unknown as number} />
          {/* Mid wave arcs — lavender */}
          <AnimatedPath d="M 11 25 Q 6 17 11 7" stroke={Colors.circuit} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity={midOp as unknown as number} />
          <AnimatedPath d="M 29 25 Q 34 17 29 7" stroke={Colors.circuit} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity={midOp as unknown as number} />
          {/* Outer wave arcs — purple */}
          <AnimatedPath d="M 8 27 Q 2 17 8 5" stroke={Colors.protocol} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity={outerOp as unknown as number} />
          <AnimatedPath d="M 32 27 Q 38 17 32 5" stroke={Colors.protocol} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity={outerOp as unknown as number} />
          {/* Antenna tip dot — lavender (D-03: static accent, not beam cyan) */}
          <Circle cx="20" cy="12" r="2" fill={Colors.circuit} opacity="0.9" />
        </Svg>
      );
    }

    case 'merger': {
      const juncR = mergePulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [3.5, 5.2, 3.5] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Hex body — Physics identity via color prop */}
          <Path d="M 16 12 L 24 12 L 28 20 L 24 28 L 16 28 L 12 20 Z"
            fill="#0e1f36" stroke={color ?? '#4a9eff'} strokeWidth="2" strokeLinejoin="round" />
          {/* Input magnet wire 0: center to left — copper */}
          <Line x1="14" y1="20" x2="8" y2="20" stroke={Colors.copper} strokeWidth="1.2" strokeOpacity="0.6" />
          {/* Input magnet 0 — filled copper (D-03/D-04: two inputs told
              apart by form, matching Splitter's filled/hollow rule) */}
          <Ellipse cx="6" cy="20" rx="3" ry="2" fill={Colors.copper} stroke={Colors.copper} strokeWidth="1.2" />
          {/* Input magnet wire 1: center to top — copper */}
          <Line x1="20" y1="14" x2="20" y2="8" stroke={Colors.copper} strokeWidth="1.2" strokeOpacity="0.6" />
          {/* Input magnet 1 — hollow copper */}
          <Ellipse cx="20" cy="6" rx="3" ry="2" fill="#0e1f36" stroke={Colors.copper} strokeWidth="1.2" />
          {/* Inner glow ring — copper pulse (D-03: amber reserved for beam) */}
          <AnimatedCircle cx="20" cy="20" r={juncR as unknown as number}
            fill="none" stroke={Colors.copper} strokeWidth="1.2" strokeOpacity="0.5" />
          {/* Center dot — copper */}
          <Circle cx="20" cy="20" r="1.5" fill={Colors.copper} />
        </Svg>
      );
    }

    case 'bridge': {
      const hOp = bridging ? 1 : 0.55;
      const vOp = bridging ? 1 : 0.55;
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Center housing — Physics identity via color prop */}
          <Rect x="14" y="14" width="12" height="12" rx="2" fill="#0e1f36" stroke={color ?? '#4a9eff'} strokeWidth="2" />
          {/* Horizontal path: copper — Physics identity (enters + exits the housing) */}
          <Line x1="4" y1="20" x2="14" y2="20" stroke={Colors.copper} strokeWidth="2.2" strokeLinecap="round" opacity={hOp} />
          <Line x1="26" y1="20" x2="36" y2="20" stroke={Colors.copper} strokeWidth="2.2" strokeLinecap="round" opacity={hOp} />
          <Circle cx="4" cy="20" r="1.5" fill={Colors.copper} />
          <Circle cx="36" cy="20" r="1.5" fill={Colors.copper} />
          {/* Vertical path: lavender — Protocol identity (D-04: green is
              reserved for destination/success; the two Bridge paths are
              already form-differentiated by orientation, so category
              colour carries the crossing without borrowing green) */}
          <Line x1="20" y1="4" x2="20" y2="12" stroke={Colors.circuit} strokeWidth="1.8" strokeLinecap="round" opacity={vOp} />
          <Line x1="20" y1="26" x2="20" y2="36" stroke={Colors.circuit} strokeWidth="1.8" strokeLinecap="round" opacity={vOp} />
          {/* Overpass arc — lavender */}
          <Path d="M 16 14 Q 20 10 24 14" stroke={Colors.circuit} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
          <Circle cx="20" cy="4" r="1.5" fill={Colors.circuit} />
          <Circle cx="20" cy="36" r="1.5" fill={Colors.circuit} />
          {/* Center X accent — protocol overlay (D-02 opacity floor) */}
          <Line x1="17" y1="17" x2="23" y2="23" stroke={Colors.protocol} strokeWidth="1.2" strokeOpacity="0.45" />
          <Line x1="23" y1="17" x2="17" y2="23" stroke={Colors.protocol} strokeWidth="1.2" strokeOpacity="0.45" />
        </Svg>
      );
    }

    case 'inverter': {
      const flashOp = invertFlash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Outer rect — Protocol identity via color prop */}
          <Rect x="6" y="10" width="28" height="20" rx="3" fill="#0e1f36" stroke={color ?? Colors.protocol} strokeWidth="2" />
          {/* Flash overlay — purple */}
          <AnimatedRect x="6" y="10" width="28" height="20" rx="3" fill={Colors.protocol} opacity={flashOp as unknown as number} />
          {/* NOT gate triangle — lavender logic symbol */}
          <Path d="M 12 14 L 12 26 L 24 20 Z" fill="none" stroke={Colors.circuit} strokeWidth="1.5" strokeLinejoin="round" />
          {/* Output bubble — lavender (D-03: static accent, not beam cyan) */}
          <Circle cx="26" cy="20" r="2" fill={Colors.circuit} />
          {/* Data row marks — light violet (D-02 opacity floor) */}
          <Line x1="10" y1="32" x2="30" y2="32" stroke="#C4B5FD" strokeWidth="1.2" strokeOpacity="0.45" />
        </Svg>
      );
    }

    case 'counter': {
      // D-05 — the count/threshold readout is a segmented ring, not
      // SvgText. `threshold` segments around the body; `count` of them
      // lit. Reads as a quantity at 22pt and scales to any threshold.
      const segCount = Math.max(1, threshold);
      const segments = Array.from({ length: segCount }, (_, i) => i);
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Outer rect — Protocol identity via color prop */}
          <Rect x="6" y="8" width="28" height="24" rx="3" fill="#0e1f36" stroke={color ?? Colors.protocol} strokeWidth="2" strokeOpacity="0.6" />
          {/* Inner screen — lavender bezel */}
          <Rect x="11" y="13" width="18" height="14" rx="2" fill="#060e1a" stroke={Colors.circuit} strokeWidth="1.2" />
          {/* Segmented quantity ring — lit segments = count, unlit = remaining threshold */}
          {segments.map(i => (
            <Path
              key={`counter-seg-${i}`}
              d={ringSegmentPath(20, 20, 13, i, segCount)}
              stroke={i < count ? Colors.circuit : Colors.protocol}
              strokeWidth={i < count ? 2.4 : 1.2}
              strokeOpacity={i < count ? 1 : 0.45}
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </Svg>
      );
    }

    case 'latch': {
      const isWrite = latchMode === 'write';
      const isDelay = latchMode === 'delay';
      // D-05 — the mode badge (SvgText at 5pt, ~2.8pt rendered) is gone.
      // Mode is now conveyed entirely by which half is lit: unlit half
      // to 0.45, lit half to 1.0. DELAY (D flip-flop) does both a read
      // and a write each pulse, so both halves stay lit.
      const writeOp = (isWrite || isDelay) ? 1 : 0.45;
      const readOp = (!isWrite || isDelay) ? 1 : 0.45;
      // storedValue is preserved for future reintroduction of a value
      // badge. It's intentionally not rendered right now — the bottom
      // circle was unreadable at small sizes.
      void storedValue;
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          {/* Left half (write) — Protocol purple frame. Arrow is copper
              (D-03: static Physics-style state indicator, not the beam amber). */}
          <Rect x="6" y="10" width="14" height="20" rx="2" fill="#0e1f36" stroke={Colors.protocol} strokeWidth="2" opacity={writeOp} />
          <Path d="M 13 14 L 13 22 M 10 19 L 13 22 L 16 19" stroke={Colors.copper} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* Right half (read) — Protocol purple frame. Arrow is
              lavender to mark the read as a data/signal operation. */}
          <Rect x="20" y="10" width="14" height="20" rx="2" fill="#0e1f36" stroke={Colors.protocol} strokeWidth="2" opacity={readOp} />
          <Path d="M 23 20 L 31 20 M 28 17 L 31 20 L 28 23" stroke={Colors.circuit} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* Center divider — lavender */}
          <Line x1="20" y1="10" x2="20" y2="30" stroke={Colors.circuit} strokeWidth="1.2" strokeOpacity="0.5" />
        </Svg>
      );
    }

    case 'obstacle':
      // Collapsed-corridor debris: a pile of angular rubble. Distinct from the
      // blown-cell crater (a charred recess) — this is solid terrain in the way.
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path d="M5 29 L13 15 L21 27 L14 33 Z" fill={Colors.steel} fillOpacity="0.45" stroke={Colors.dim} strokeWidth="1.2" strokeOpacity="0.5" />
          <Path d="M18 31 L27 13 L35 28 L27 34 Z" fill={Colors.steel} fillOpacity="0.45" stroke={Colors.dim} strokeWidth="1.2" strokeOpacity="0.45" />
          <Path d="M9 34 L19 30 L31 33 L23 37 L13 37 Z" fill={Colors.steel} fillOpacity="0.5" stroke={Colors.dim} strokeWidth="1.2" strokeOpacity="0.45" />
        </Svg>
      );

    default:
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="4" fill="#0e1f36" stroke={color ?? Colors.dim} strokeWidth="2" />
        </Svg>
      );
  }
});

// Avoid unused warnings for AnimatedG (not currently used but kept for future).
void AnimatedG;
