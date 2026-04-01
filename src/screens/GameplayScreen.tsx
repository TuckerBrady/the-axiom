import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import StarField from '../components/StarField';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

const { width: W } = Dimensions.get('window');
const GRID_SIZE = 6;
const CELL = Math.floor((W - Spacing.lg * 2 - Spacing.sm * (GRID_SIZE - 1)) / GRID_SIZE);

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Gameplay'>;
};

type CellState = 'empty' | 'wire' | 'source' | 'target' | 'active';

const INITIAL_GRID: CellState[][] = [
  ['source', 'empty', 'empty', 'empty', 'empty', 'empty'],
  ['empty', 'empty', 'wire',  'empty', 'empty', 'empty'],
  ['empty', 'wire',  'wire',  'empty', 'empty', 'empty'],
  ['empty', 'wire',  'empty', 'wire',  'empty', 'empty'],
  ['empty', 'empty', 'empty', 'wire',  'wire',  'empty'],
  ['empty', 'empty', 'empty', 'empty', 'wire',  'target'],
];

const CELL_COLORS: Record<CellState, string> = {
  empty: 'rgba(26,58,92,0.25)',
  wire: 'rgba(74,158,255,0.35)',
  source: Colors.green,
  target: Colors.copper,
  active: Colors.circuit,
};

export default function GameplayScreen({ navigation }: Props) {
  const [grid, setGrid] = useState(INITIAL_GRID);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);

  const screenOpacity = useSharedValue(0);
  const pulseAnim = useSharedValue(0.6);
  const solvedScale = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  useEffect(() => {
    if (solved) {
      solvedScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) });
    }
  }, [solved]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseAnim.value }));
  const solvedStyle = useAnimatedStyle(() => ({
    opacity: solvedScale.value,
    transform: [{ scale: solvedScale.value }],
  }));

  const handleCellPress = (row: number, col: number) => {
    if (solved) return;
    const current = grid[row][col];
    if (current === 'source' || current === 'target') return;
    const next: CellState = current === 'empty' ? 'wire' : current === 'wire' ? 'active' : 'empty';
    const newGrid = grid.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? next : c)),
    );
    setGrid(newGrid);
    setMoves((m) => m + 1);
  };

  const checkSolved = () => {
    setSolved(true);
  };

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={4} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.levelLabel}>KEPLER BELT · LEVEL 2-4</Text>
            <Text style={styles.levelName}>Ion Cascade</Text>
          </View>
          <View style={styles.movesBox}>
            <Text style={styles.movesNum}>{moves}</Text>
            <Text style={styles.movesLabel}>MOVES</Text>
          </View>
        </View>

        {/* Objective strip */}
        <Animated.View style={[styles.objectiveStrip, pulseStyle]}>
          <Text style={styles.objectiveText}>
            ⚡ Connect the power source to the relay target
          </Text>
        </Animated.View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          {grid.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((cell, ci) => {
                const isSource = cell === 'source';
                const isTarget = cell === 'target';
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: CELL_COLORS[cell],
                        borderColor:
                          isSource
                            ? Colors.green
                            : isTarget
                            ? Colors.copper
                            : cell === 'active'
                            ? Colors.circuit
                            : cell === 'wire'
                            ? 'rgba(74,158,255,0.5)'
                            : 'rgba(74,158,255,0.12)',
                      },
                    ]}
                    onPress={() => handleCellPress(ri, ci)}
                    activeOpacity={isSource || isTarget ? 1 : 0.7}
                  >
                    {isSource && <Text style={styles.cellIcon}>⚡</Text>}
                    {isTarget && <Text style={styles.cellIcon}>🎯</Text>}
                    {cell === 'active' && (
                      <View style={styles.activeNode} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Hint from Cogs */}
        <View style={styles.cogsHint}>
          <Text style={styles.cogsHintEmoji}>🤖</Text>
          <Text style={styles.cogsHintText}>
            Tap cells to place wires. Connect ⚡ to 🎯 to complete the circuit.
          </Text>
        </View>

        {/* Check button */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => { setGrid(INITIAL_GRID); setMoves(0); setSolved(false); }}
            activeOpacity={0.75}
          >
            <Text style={styles.resetBtnText}>↺  RESET</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkBtn}
            onPress={checkSolved}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.copper, Colors.amber]}
              style={styles.checkBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.checkBtnText}>CHECK CIRCUIT</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Solved overlay */}
        {solved && (
          <Animated.View style={[styles.solvedOverlay, solvedStyle]}>
            <LinearGradient
              colors={['rgba(6,9,15,0.92)', 'rgba(10,22,40,0.97)']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.solvedEmoji}>🏆</Text>
            <Text style={styles.solvedTitle}>CIRCUIT COMPLETE</Text>
            <Text style={styles.solvedSub}>Solved in {moves} moves</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3].map((i) => (
                <Text key={i} style={styles.solvedStar}>⭐</Text>
              ))}
            </View>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => navigation.navigate('Hub')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.copper, Colors.amber]}
                style={styles.continueBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.continueBtnText}>CONTINUE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontFamily: Fonts.orbitron, fontSize: 20, color: Colors.muted },
  headerCenter: { flex: 1, alignItems: 'center' },
  levelLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.copper, letterSpacing: 1.5,
  },
  levelName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.starWhite,
  },
  movesBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(26,58,92,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  movesNum: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.lg, fontWeight: 'bold',
    color: Colors.starWhite,
  },
  movesLabel: { fontFamily: Fonts.spaceMono, fontSize: 7, color: Colors.muted, letterSpacing: 1 },
  objectiveStrip: {
    backgroundColor: 'rgba(74,158,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  objectiveText: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.muted, textAlign: 'center',
  },
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  gridRow: { flexDirection: 'row', gap: Spacing.xs },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIcon: { fontSize: CELL * 0.45 },
  activeNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.circuit,
  },
  cogsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(10,18,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    borderRadius: 10,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cogsHintEmoji: { fontSize: 18 },
  cogsHintText: {
    flex: 1,
    fontFamily: Fonts.exo2, fontSize: 11, color: Colors.muted, fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  resetBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 10, color: Colors.muted, letterSpacing: 1,
  },
  checkBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkBtnGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  checkBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 11, fontWeight: 'bold',
    letterSpacing: 2, color: Colors.void,
  },
  solvedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  solvedEmoji: { fontSize: 60, marginBottom: Spacing.lg },
  solvedTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.xxl, fontWeight: 'bold',
    color: Colors.amber, letterSpacing: 3, marginBottom: Spacing.sm,
  },
  solvedSub: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.sm, color: Colors.muted,
    marginBottom: Spacing.lg,
  },
  starsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  solvedStar: { fontSize: 32 },
  continueBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  continueBtnGradient: {
    paddingVertical: Spacing.lg, alignItems: 'center',
  },
  continueBtnText: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, fontWeight: 'bold',
    letterSpacing: 2, color: Colors.void,
  },
});
