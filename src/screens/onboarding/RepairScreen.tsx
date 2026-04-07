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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { PieceIcon } from '../../components/PieceIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

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

  const screenOpacity = useSharedValue(0);
  const contentReveal = useSharedValue(0);

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
    setTimeout(() => {
      setIntegrity(40);
      setTimeout(() => {
        setRepairState('done');
        navigation.navigate('OnboardingCodexEntry');
      }, 1800);
    }, 1500);
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
        <View style={s.board}>
          <BoardCell kind="source" />
          <BoardCell
            kind={centerKind}
            isTarget={centerKind === 'empty'}
            onPress={repairState === 'selected' ? handleSlotPress : undefined}
          />
          <BoardCell kind="output" />
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
