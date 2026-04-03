import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Repair'>;
};

const { width: W } = Dimensions.get('window');

type RepairState = 'idle' | 'selected' | 'placed' | 'engaging' | 'done';

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ active }: { active: number }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i === active && s.dotActive,
            i < active && s.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Integrity bar ─────────────────────────────────────────────────────────────

function IntegrityBar({ percent }: { percent: number }) {
  const width = useSharedValue(20);
  useEffect(() => {
    width.value = withTiming(percent, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [percent]);
  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: percent <= 20 ? Colors.red : percent <= 40 ? Colors.amber : Colors.green,
  }));
  return (
    <View style={s.integrityWrap}>
      <Text style={s.integrityLabel}>C.O.G.S CORE INTEGRITY</Text>
      <View style={s.integrityTrack}>
        <Animated.View style={[s.integrityFill, fillStyle]} />
      </View>
      <Text style={[s.integrityPct, { color: percent <= 20 ? Colors.red : Colors.amber }]}>
        {percent}% {percent <= 20 ? '— CRITICAL' : '— RECOVERING'}
      </Text>
    </View>
  );
}

// ─── Grid cell ─────────────────────────────────────────────────────────────────

type CellType = 'source' | 'empty' | 'output' | 'conveyor';

function GridCell({
  type,
  isTarget,
  isSelected,
  onPress,
}: {
  type: CellType;
  isTarget?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
}) {
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    if (isTarget && type === 'empty') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = 1;
    }
  }, [isTarget, type]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: isTarget && type === 'empty'
      ? `rgba(74,158,255,${pulse.value})`
      : type === 'source' ? Colors.amber
      : type === 'output' ? Colors.green
      : type === 'conveyor' ? Colors.copper
      : Colors.dim,
  }));

  const label =
    type === 'source' ? 'SRC\nSOURCE'
    : type === 'output' ? 'OUT\nOUTPUT'
    : type === 'conveyor' ? '>>\nCONVEYOR'
    : isTarget ? '+' : '';

  const labelColor =
    type === 'source' ? Colors.amber
    : type === 'output' ? Colors.green
    : type === 'conveyor' ? Colors.copper
    : Colors.blue;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.75 : 1} disabled={!onPress}>
      <Animated.View
        style={[
          s.gridCell,
          borderStyle,
          isTarget && type === 'empty' && s.gridCellTarget,
          isSelected && s.gridCellSelected,
          type !== 'empty' && s.gridCellFilled,
        ]}
      >
        <Text style={[s.cellLabel, { color: labelColor }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Signal animation ──────────────────────────────────────────────────────────

function SignalFlow({ playing }: { playing: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      progress.value = withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) });
    }
  }, [playing]);

  const CELL_W = 80;
  const TOTAL = CELL_W * 3 + Spacing.md * 2;

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, TOTAL], Extrapolation.CLAMP) }],
    opacity: playing ? 1 : 0,
  }));

  return (
    <View style={s.signalTrack} pointerEvents="none">
      <Animated.View style={[s.signalDot, dotStyle]} />
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

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

  const placedType: CellType = repairState === 'placed' || repairState === 'engaging' || repairState === 'done'
    ? 'conveyor' : 'empty';

  const conveyorInTray = repairState === 'idle' || repairState === 'selected';

  return (
    <Animated.View style={[s.root, screenStyle]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>BOOT SEQUENCE T-1</Text>
        <Text style={s.headerSub}>REPAIR PROTOCOL — COMPONENT INSTALLATION</Text>
      </View>

      <Animated.View style={[s.content, contentStyle]}>
        {/* Progress dots */}
        <ProgressDots active={0} />

        {/* COGS + integrity */}
        <View style={s.cogsRow}>
          <CogsAvatar size="small" state={repairState === 'engaging' || repairState === 'done' ? 'partial' : 'damaged'} />
          <View style={{ flex: 1 }}>
            <IntegrityBar percent={integrity} />
          </View>
        </View>

        {/* COGS instruction */}
        <View style={s.instruction}>
          <Text style={s.instructionText}>
            {repairState === 'idle'
              ? 'The Conveyor piece is in the parts tray. Select it.'
              : repairState === 'selected'
              ? 'Good. Now tap the empty target slot to install it.'
              : repairState === 'placed'
              ? 'Circuit connected. Engage the machine to test signal flow.'
              : repairState === 'engaging'
              ? 'Signal propagating... stand by.'
              : 'Component nominal. Integrity recovering. Proceed.'}
          </Text>
        </View>

        {/* Grid canvas */}
        <View style={s.gridWrap}>
          <Text style={s.gridLabel}>REPAIR GRID — BAY T-1</Text>
          <View style={s.grid}>
            <GridCell type="source" />
            <View style={s.connector} />
            <GridCell
              type={placedType}
              isTarget={placedType === 'empty'}
              onPress={repairState === 'selected' ? handleSlotPress : undefined}
            />
            <View style={s.connector} />
            <GridCell type="output" />
          </View>
          <SignalFlow playing={repairState === 'engaging' || repairState === 'done'} />
        </View>

        {/* Parts tray */}
        <View style={s.tray}>
          <Text style={s.trayLabel}>PARTS TRAY</Text>
          {conveyorInTray ? (
            <TouchableOpacity onPress={handleConveyorSelect} activeOpacity={0.8}>
              <View style={[s.trayPiece, repairState === 'selected' && s.trayPieceSelected]}>
                <Text style={s.trayPieceIcon}>▶▶</Text>
                <Text style={s.trayPieceName}>CONVEYOR</Text>
                <Text style={s.trayPieceType}>PHYSICS PIECE</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={s.trayEmpty}>
              <Text style={s.trayEmptyText}>— INSTALLED —</Text>
            </View>
          )}
        </View>

        {/* Engage button */}
        <TouchableOpacity
          style={[
            s.engageBtn,
            repairState !== 'placed' && s.engageBtnDisabled,
          ]}
          onPress={handleEngage}
          activeOpacity={repairState === 'placed' ? 0.8 : 1}
          disabled={repairState !== 'placed'}
        >
          <Text style={[s.engageBtnText, repairState !== 'placed' && s.engageBtnTextDim]}>
            {repairState === 'engaging' ? 'ENGAGING...' : 'ENGAGE MACHINE'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 3,
  },
  headerSub: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dim,
  },
  dotActive: {
    backgroundColor: Colors.blue,
    width: 20,
  },
  dotDone: {
    backgroundColor: Colors.green,
  },
  cogsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  integrityWrap: {
    gap: 4,
  },
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
  instruction: {
    backgroundColor: 'rgba(10,22,40,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 10,
    padding: Spacing.md,
  },
  instructionText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  gridWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gridLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 2,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gridCell: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.dim,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,18,30,0.8)',
  },
  gridCellTarget: {
    borderStyle: 'dashed',
    borderColor: Colors.blue,
    backgroundColor: 'rgba(74,158,255,0.05)',
  },
  gridCellSelected: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(74,158,255,0.1)',
  },
  gridCellFilled: {
    backgroundColor: 'rgba(26,58,92,0.5)',
  },
  cellLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
  },
  connector: {
    width: Spacing.md,
    height: 2,
    backgroundColor: Colors.dim,
    opacity: 0.5,
  },
  signalTrack: {
    position: 'absolute',
    bottom: -12,
    left: 0,
    right: 0,
    height: 8,
    alignItems: 'flex-start',
  },
  signalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.amber,
  },
  tray: {
    backgroundColor: 'rgba(10,18,30,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  trayLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 2,
  },
  trayPiece: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(200,121,65,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.3)',
    borderRadius: 10,
    padding: Spacing.md,
  },
  trayPieceSelected: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(74,158,255,0.1)',
  },
  trayPieceIcon: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.lg,
    color: Colors.copper,
  },
  trayPieceName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.starWhite,
    flex: 1,
  },
  trayPieceType: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.copper,
    letterSpacing: 1,
  },
  trayEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  trayEmptyText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
  },
  engageBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  engageBtnDisabled: {
    backgroundColor: 'rgba(74,158,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
  },
  engageBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 3,
  },
  engageBtnTextDim: {
    color: Colors.dim,
  },
});
