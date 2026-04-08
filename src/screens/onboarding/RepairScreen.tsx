import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Easing as RNEasing,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { PieceIcon } from '../../components/PieceIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

const AnimatedCircle = RNAnimated.createAnimatedComponent(SvgCircle);

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Repair'>;
};

type RepairState = 'idle' | 'selected' | 'placed' | 'engaging' | 'done';

// ─── HUD brackets ──────────────────────────────────────────────────────────────

function HudBrackets() {
  const C = 'rgba(0,212,255,0.28)';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[s.corner, { top: 14, left: 14 }]}>
        <View style={[s.cornerH, { top: 0, left: 0, backgroundColor: C }]} />
        <View style={[s.cornerV, { top: 0, left: 0, backgroundColor: C }]} />
      </View>
      <View style={[s.corner, { top: 14, right: 14 }]}>
        <View style={[s.cornerH, { top: 0, right: 0, backgroundColor: C }]} />
        <View style={[s.cornerV, { top: 0, right: 0, backgroundColor: C }]} />
      </View>
    </View>
  );
}

// ─── Integrity bar with pulse ─────────────────────────────────────────────────

function IntegrityBar({ percent }: { percent: number }) {
  const width = useRef(new RNAnimated.Value(20)).current;
  const pulse = useRef(new RNAnimated.Value(0.7)).current;

  useEffect(() => {
    RNAnimated.timing(width, {
      toValue: percent,
      duration: 1000,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent, width]);

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 600, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: false }),
        RNAnimated.timing(pulse, { toValue: 0.7, duration: 600, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: false }),
      ]),
    ).start();
  }, [pulse]);

  const widthPct = width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  const fillColor = percent <= 20 ? Colors.red : percent <= 40 ? Colors.amber : Colors.green;
  const labelColor = percent <= 20 ? Colors.red : Colors.amber;

  return (
    <View style={s.integrityWrap}>
      <Text style={s.integrityLabel}>C.O.G.S CORE INTEGRITY</Text>
      <View style={s.integrityTrack}>
        <RNAnimated.View
          style={[s.integrityFill, { width: widthPct, backgroundColor: fillColor, opacity: pulse }]}
        />
      </View>
      <Text style={[s.integrityPct, { color: labelColor }]}>
        {percent}% {percent <= 20 ? '— CRITICAL' : '— RECOVERING'}
      </Text>
    </View>
  );
}

// ─── Board cell ───────────────────────────────────────────────────────────────

type CellKind = 'source' | 'output' | 'empty' | 'conveyor';

function BoardCell({
  kind,
  isTarget,
  onPress,
}: {
  kind: CellKind;
  isTarget?: boolean;
  onPress?: () => void;
}) {
  const content =
    kind === 'source' ? <PieceIcon type="source" size={40} /> :
    kind === 'output' ? <PieceIcon type="output" size={40} /> :
    kind === 'conveyor' ? <PieceIcon type="conveyor" size={44} /> :
    isTarget ? <Text style={s.emptyPlus}>+</Text> : null;

  const cellStyle =
    kind === 'source' ? s.cellSource :
    kind === 'output' ? s.cellOutput :
    s.cellRegular;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
      style={[s.cell, cellStyle, isTarget && kind === 'empty' && s.cellTarget]}
    >
      {content}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RepairScreen({ navigation }: Props) {
  const [repairState, setRepairState] = useState<RepairState>('idle');
  const [integrity, setIntegrity] = useState(20);
  const [beamPts, setBeamPts] = useState<{ x: number; y: number }[]>([]);

  const screenOpacity = useSharedValue(0);
  const contentReveal = useSharedValue(0);

  // ── Engage signal beam animation ──
  const beamHead = useRef(new RNAnimated.ValueXY({ x: 0, y: 0 })).current;
  const beamOpacity = useRef(new RNAnimated.Value(0)).current;
  const chargeOpacity = useRef(new RNAnimated.Value(0)).current;
  const chargeRadius = useRef(new RNAnimated.Value(4)).current;

  const boardRef = useRef<View>(null);
  const srcRef = useRef<View>(null);
  const convRef = useRef<View>(null);
  const outRef = useRef<View>(null);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
    contentReveal.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentReveal.value,
    transform: [{ translateY: (1 - contentReveal.value) * 16 }],
  }));

  const handleConveyorSelect = () => {
    if (repairState === 'idle') setRepairState('selected');
  };

  const handleSlotPress = () => {
    if (repairState === 'selected') setRepairState('placed');
  };

  const handleEngage = () => {
    if (repairState !== 'placed') return;
    setRepairState('engaging');

    type Pt = { x: number; y: number };
    const doMeasure = (
      ref: React.RefObject<View | null>,
    ): Promise<Pt> => new Promise(resolve => {
      setTimeout(() => {
        ref.current?.measureInWindow((x, y, w, h) => {
          boardRef.current?.measureInWindow((bx, by) => {
            resolve({ x: x - bx + w / 2, y: y - by + h / 2 });
          });
        });
      }, 80);
    });

    Promise.all([doMeasure(srcRef), doMeasure(convRef), doMeasure(outRef)]).then(pts => {
      setBeamPts(pts);

      // Phase 1 — CHARGE at source (280ms)
      chargeOpacity.setValue(0);
      chargeRadius.setValue(4);
      RNAnimated.parallel([
        RNAnimated.timing(chargeOpacity, { toValue: 0.8, duration: 140, useNativeDriver: false }),
        RNAnimated.timing(chargeRadius, { toValue: 26, duration: 280, useNativeDriver: false }),
      ]).start(() => {
        chargeOpacity.setValue(0);

        // Phase 2 — BEAM (400ms across 3 waypoints)
        beamOpacity.setValue(0.8);
        const totalMs = 400;
        const start = Date.now();
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
        const dx1 = pts[1].x - pts[0].x;
        const dy1 = pts[1].y - pts[0].y;
        const dx2 = pts[2].x - pts[1].x;
        const dy2 = pts[2].y - pts[1].y;
        const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        const total = d1 + d2;

        const tick = () => {
          const elapsed = Date.now() - start;
          const t = Math.min(1, easeOut(elapsed / totalMs));
          const headDist = t * total;
          let hx: number;
          let hy: number;
          if (headDist <= d1) {
            const sFrac = d1 > 0 ? headDist / d1 : 0;
            hx = pts[0].x + dx1 * sFrac;
            hy = pts[0].y + dy1 * sFrac;
          } else {
            const sFrac = d2 > 0 ? (headDist - d1) / d2 : 0;
            hx = pts[1].x + dx2 * sFrac;
            hy = pts[1].y + dy2 * sFrac;
          }
          beamHead.setValue({ x: hx, y: hy });

          if (elapsed < totalMs) {
            requestAnimationFrame(tick);
          } else {
            beamOpacity.setValue(0);
            // Phase 3 — LOCK then continue with existing flow
            setTimeout(() => {
              setIntegrity(40);
              setTimeout(() => {
                setRepairState('done');
                navigation.navigate('Introduction');
              }, 1200);
            }, 400);
          }
        };
        requestAnimationFrame(tick);
      });
    });
  };

  const centerKind: CellKind =
    repairState === 'placed' || repairState === 'engaging' || repairState === 'done'
      ? 'conveyor'
      : 'empty';

  const conveyorInTray = repairState === 'idle' || repairState === 'selected';
  const enabled = repairState === 'placed';

  return (
    <Animated.View style={[s.root, screenStyle]}>
      <HudBrackets />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>C.O.G.S UNIT 7 — CRITICAL SYSTEMS</Text>
      </View>

      <Animated.View style={[s.content, contentStyle]}>
        {/* COGS + integrity */}
        <View style={s.cogsRow}>
          <CogsAvatar
            size="small"
            state={repairState === 'engaging' || repairState === 'done' ? 'partial' : 'damaged'}
          />
          <View style={{ flex: 1 }}>
            <IntegrityBar percent={integrity} />
          </View>
        </View>

        {/* COGS directive */}
        <Text style={s.directive}>Connect the relay. Source to Output.</Text>

        {/* Board */}
        <View ref={boardRef} style={s.board}>
          <View ref={srcRef} collapsable={false}>
            <BoardCell kind="source" />
          </View>
          <View ref={convRef} collapsable={false}>
            <BoardCell
              kind={centerKind}
              isTarget={centerKind === 'empty'}
              onPress={repairState === 'selected' ? handleSlotPress : undefined}
            />
          </View>
          <View ref={outRef} collapsable={false}>
            <BoardCell kind="output" />
          </View>
          {/* Signal beam SVG overlay */}
          <Svg
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <AnimatedCircle
              cx={beamPts[0]?.x ?? 0}
              cy={beamPts[0]?.y ?? 0}
              r={chargeRadius as unknown as number}
              stroke="#F0B429"
              strokeWidth={1.8}
              fill="none"
              opacity={chargeOpacity as unknown as number}
            />
            <AnimatedCircle
              cx={beamHead.x as unknown as number}
              cy={beamHead.y as unknown as number}
              r={10}
              fill="#00D4FF"
              opacity={beamOpacity as unknown as number}
            />
            <AnimatedCircle
              cx={beamHead.x as unknown as number}
              cy={beamHead.y as unknown as number}
              r={4}
              fill="#FFFFFF"
              opacity={beamOpacity as unknown as number}
            />
          </Svg>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Tray */}
        <View style={s.tray}>
          {conveyorInTray ? (
            <TouchableOpacity
              onPress={handleConveyorSelect}
              activeOpacity={0.8}
              style={[s.trayChip, repairState === 'selected' && s.trayChipSelected]}
            >
              <PieceIcon type="conveyor" size={34} />
              <Text style={s.trayChipLabel}>CONV</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.trayChip, s.trayChipEmpty]}>
              <Text style={s.trayEmptyText}>—</Text>
            </View>
          )}
        </View>

        {/* Engage */}
        <TouchableOpacity
          style={[s.engageBtn, !enabled && s.engageBtnDisabled]}
          onPress={handleEngage}
          activeOpacity={enabled ? 0.85 : 1}
          disabled={!enabled}
        >
          <Text style={[s.engageBtnText, !enabled && { color: Colors.muted }]}>
            {repairState === 'engaging' ? 'ENGAGING...' : 'ENGAGE MACHINE'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  corner: { position: 'absolute', width: 18, height: 18 },
  cornerH: { position: 'absolute', width: 18, height: 2 },
  cornerV: { position: 'absolute', width: 2, height: 18 },

  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240,180,41,0.18)',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: 'rgba(240,180,41,0.75)',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  cogsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  integrityWrap: { gap: 4 },
  integrityLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  integrityTrack: {
    height: 6,
    backgroundColor: 'rgba(224,85,85,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  integrityFill: {
    height: '100%',
    borderRadius: 3,
  },
  integrityPct: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
  },
  directive: {
    fontFamily: Fonts.exo2,
    fontSize: 14,
    fontWeight: '300',
    color: '#B0CCE8',
    fontStyle: 'italic',
  },
  board: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  cell: {
    width: 68,
    height: 68,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRegular: {
    backgroundColor: '#0C1628',
    borderWidth: 1,
    borderColor: '#141E30',
  },
  cellSource: {
    backgroundColor: '#1F1000',
    borderWidth: 1,
    borderColor: '#4A2800',
  },
  cellOutput: {
    backgroundColor: '#001F10',
    borderWidth: 1,
    borderColor: '#004A28',
  },
  cellTarget: {
    borderStyle: 'dashed',
    borderColor: '#00D4FF',
  },
  emptyPlus: {
    fontFamily: Fonts.spaceMono,
    fontSize: 20,
    color: 'rgba(0,212,255,0.35)',
  },
  tray: {
    backgroundColor: '#08101C',
    borderTopWidth: 1,
    borderTopColor: '#141E30',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  trayChip: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#0C1628',
    borderWidth: 1,
    borderColor: '#1A2840',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayChipSelected: {
    borderColor: '#00D4FF',
  },
  trayChipEmpty: {
    opacity: 0.4,
  },
  trayChipLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#2A3F5F',
    marginTop: 1,
  },
  trayEmptyText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 14,
    color: Colors.muted,
  },
  engageBtn: {
    backgroundColor: Colors.amber,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  engageBtnDisabled: {
    backgroundColor: 'rgba(240,180,41,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.25)',
  },
  engageBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: Colors.void,
  },
});
