import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import StarField from '../components/StarField';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LevelSelect'>;
};

type Level = {
  id: number;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  stars: number;
  completed: boolean;
  locked: boolean;
  reward: string;
};

const LEVELS: Level[] = [
  { id: 1, name: 'First Contact', difficulty: 'Easy', stars: 3, completed: true, locked: false, reward: '50 CR' },
  { id: 2, name: 'Signal Drift', difficulty: 'Easy', stars: 2, completed: true, locked: false, reward: '50 CR' },
  { id: 3, name: 'Relay Breach', difficulty: 'Medium', stars: 1, completed: true, locked: false, reward: '80 CR' },
  { id: 4, name: 'Ion Cascade', difficulty: 'Medium', stars: 0, completed: false, locked: false, reward: '80 CR' },
  { id: 5, name: 'Flux Resonance', difficulty: 'Hard', stars: 0, completed: false, locked: false, reward: '120 CR' },
  { id: 6, name: 'Core Overload', difficulty: 'Hard', stars: 0, completed: false, locked: true, reward: '120 CR' },
  { id: 7, name: 'Null Space', difficulty: 'Expert', stars: 0, completed: false, locked: true, reward: '200 CR' },
  { id: 8, name: 'The Singularity', difficulty: 'Expert', stars: 0, completed: false, locked: true, reward: '300 CR' },
];

const DIFF_COLOR: Record<string, string> = {
  Easy: Colors.green,
  Medium: Colors.amber,
  Hard: Colors.copper,
  Expert: Colors.red,
};

function LevelCard({
  level,
  delay,
  onPress,
}: {
  level: Level;
  delay: number;
  onPress: () => void;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 500 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 12 }],
  }));
  const diffColor = DIFF_COLOR[level.difficulty] ?? Colors.muted;

  return (
    <Animated.View style={[styles.levelCard, style]}>
      <TouchableOpacity
        onPress={level.locked ? undefined : onPress}
        activeOpacity={level.locked ? 1 : 0.8}
      >
        <LinearGradient
          colors={
            level.locked
              ? ['rgba(15,22,35,0.6)', 'rgba(10,16,28,0.8)']
              : level.completed
              ? ['rgba(78,203,141,0.07)', 'rgba(10,22,40,0.85)']
              : ['rgba(26,58,92,0.55)', 'rgba(10,22,40,0.9)']
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View
          style={[
            styles.cardBorder,
            {
              borderColor: level.completed
                ? 'rgba(78,203,141,0.25)'
                : level.locked
                ? 'rgba(58,80,112,0.25)'
                : 'rgba(74,158,255,0.2)',
            },
          ]}
        />
        <View style={styles.cardInner}>
          {/* Level number */}
          <View
            style={[
              styles.levelNum,
              {
                backgroundColor: level.locked
                  ? 'rgba(58,80,112,0.3)'
                  : `${diffColor}22`,
                borderColor: level.locked ? Colors.dim : diffColor,
              },
            ]}
          >
            {level.locked ? (
              <Text style={styles.lockIcon}>🔒</Text>
            ) : (
              <Text
                style={[styles.levelNumText, { color: diffColor }]}
              >
                {level.id}
              </Text>
            )}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text
              style={[
                styles.levelName,
                { color: level.locked ? Colors.dim : Colors.starWhite },
              ]}
            >
              {level.name}
            </Text>
            <View style={styles.cardMeta}>
              <Text
                style={[styles.diffLabel, { color: diffColor }]}
              >
                {level.difficulty}
              </Text>
              <Text style={styles.rewardText}>{level.reward}</Text>
            </View>
          </View>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[0, 1, 2].map((i) => (
              <Text
                key={i}
                style={[
                  styles.star,
                  { opacity: level.stars > i ? 1 : 0.2 },
                ]}
              >
                ⭐
              </Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LevelSelectScreen({ navigation }: Props) {
  const screenOpacity = useSharedValue(0);
  const headerReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerReveal.value = withTiming(1, { duration: 600 });
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const headerRevealStyle = useAnimatedStyle(() => ({ opacity: headerReveal.value }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={3} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, headerRevealStyle]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>KEPLER BELT</Text>
            <Text style={styles.headerTitle}>SELECT LEVEL</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Sector summary */}
        <Animated.View style={[styles.sectorSummary, headerRevealStyle]}>
          <LinearGradient
            colors={['rgba(26,58,92,0.6)', 'rgba(10,22,40,0.8)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.summaryEmoji}>🪨</Text>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryTitle}>Kepler Belt</Text>
            <Text style={styles.summaryProgress}>
              3 / 8 completed · 6 ⭐
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {LEVELS.map((level, i) => (
            <LevelCard
              key={level.id}
              level={level}
              delay={100 + i * 80}
              onPress={() => navigation.navigate('Gameplay')}
            />
          ))}
        </ScrollView>
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
  headerLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.copper, letterSpacing: 2,
  },
  headerTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.lg, fontWeight: 'bold',
    color: Colors.starWhite, letterSpacing: 2,
  },
  headerSpacer: { width: 36 },
  sectorSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.1)',
    gap: Spacing.md,
    overflow: 'hidden',
  },
  summaryEmoji: { fontSize: 28 },
  summaryInfo: { flex: 1 },
  summaryTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.cream,
  },
  summaryProgress: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted,
    letterSpacing: 1, marginTop: 2,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(74,158,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'absolute',
    right: Spacing.lg,
    bottom: 12,
  },
  progressFill: {
    width: '37.5%',
    height: '100%',
    backgroundColor: Colors.copper,
    borderRadius: 2,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  levelCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  levelNum: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { fontSize: 16 },
  levelNumText: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.lg, fontWeight: 'bold',
  },
  cardInfo: { flex: 1 },
  levelName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, fontWeight: 'bold',
    marginBottom: 3,
  },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  diffLabel: { fontFamily: Fonts.spaceMono, fontSize: 9, letterSpacing: 1 },
  rewardText: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.amber, letterSpacing: 1,
  },
  starsRow: { flexDirection: 'row', gap: 1 },
  star: { fontSize: 12 },
});
