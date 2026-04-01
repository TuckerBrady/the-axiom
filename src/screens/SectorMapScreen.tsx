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
  navigation: NativeStackNavigationProp<RootStackParamList, 'SectorMap'>;
};

type Sector = {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  levels: string;
  status: 'unlocked' | 'locked' | 'active';
  color: string;
  glowColor: string;
};

const SECTORS: Sector[] = [
  {
    id: 'kepler',
    name: 'Kepler Belt',
    subtitle: 'Asteroid fields & relay stations',
    emoji: '🪨',
    levels: '8 levels',
    status: 'active',
    color: Colors.copper,
    glowColor: 'rgba(200,121,65,0.3)',
  },
  {
    id: 'nova',
    name: 'Nova Fringe',
    subtitle: 'Stellar nursery & plasma storms',
    emoji: '💫',
    levels: '10 levels',
    status: 'unlocked',
    color: Colors.blue,
    glowColor: 'rgba(74,158,255,0.25)',
  },
  {
    id: 'rift',
    name: 'The Rift',
    subtitle: 'Dimensional anomaly zone',
    emoji: '🌀',
    levels: '6 levels',
    status: 'unlocked',
    color: Colors.circuit,
    glowColor: 'rgba(167,139,250,0.25)',
  },
  {
    id: 'deep',
    name: 'Deep Void',
    subtitle: 'Unknown space — hostile',
    emoji: '🕳️',
    levels: '12 levels',
    status: 'locked',
    color: Colors.dim,
    glowColor: 'rgba(58,80,112,0.2)',
  },
];

function SectorCard({
  sector,
  delay,
  onPress,
}: {
  sector: Sector;
  delay: number;
  onPress: () => void;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 500 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: reveal.value }));
  const locked = sector.status === 'locked';

  return (
    <Animated.View style={[styles.sectorCard, style]}>
      <TouchableOpacity
        onPress={locked ? undefined : onPress}
        activeOpacity={locked ? 1 : 0.8}
        style={styles.sectorCardTouch}
      >
        <LinearGradient
          colors={
            locked
              ? ['rgba(20,30,45,0.6)', 'rgba(10,18,30,0.8)']
              : ['rgba(26,58,92,0.7)', 'rgba(10,22,40,0.9)']
          }
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View
          style={[
            styles.sectorBorder,
            {
              borderColor: locked
                ? 'rgba(58,80,112,0.3)'
                : sector.glowColor,
            },
          ]}
        />
        <View style={styles.sectorRow}>
          <View
            style={[
              styles.sectorIcon,
              { backgroundColor: sector.glowColor },
            ]}
          >
            <Text style={styles.sectorEmoji}>{sector.emoji}</Text>
          </View>
          <View style={styles.sectorInfo}>
            <View style={styles.sectorNameRow}>
              <Text
                style={[
                  styles.sectorName,
                  { color: locked ? Colors.dim : Colors.starWhite },
                ]}
              >
                {sector.name}
              </Text>
              {sector.status === 'active' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
              {locked && (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>🔒</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.sectorSub,
                { color: locked ? Colors.dim : Colors.muted },
              ]}
            >
              {sector.subtitle}
            </Text>
            <Text style={[styles.sectorLevels, { color: sector.color }]}>
              {sector.levels}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SectorMapScreen({ navigation }: Props) {
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
      <StarField seed={2} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, headerRevealStyle]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>NAVIGATION</Text>
            <Text style={styles.headerTitle}>SECTOR MAP</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Galaxy visual */}
          <Animated.View
            style={[styles.galaxyContainer, headerRevealStyle]}
          >
            <Text style={styles.galaxyEmoji}>🌌</Text>
            <Text style={styles.galaxyLabel}>ANDROS CLUSTER</Text>
            <Text style={styles.galaxyCoords}>COORDS: 47.2N · 183.5E</Text>
          </Animated.View>

          {/* Sector cards */}
          {SECTORS.map((sector, i) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              delay={200 + i * 120}
              onPress={() => navigation.navigate('LevelSelect')}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: Fonts.orbitron,
    fontSize: 20,
    color: Colors.muted,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
  },
  headerTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 2,
  },
  headerSpacer: { width: 36 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  galaxyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  galaxyEmoji: { fontSize: 64, marginBottom: Spacing.sm },
  galaxyLabel: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.md,
    color: Colors.cream,
    letterSpacing: 3,
  },
  galaxyCoords: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    marginTop: 4,
  },
  sectorCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sectorCardTouch: {
    minHeight: 88,
  },
  sectorBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sectorIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectorEmoji: { fontSize: 26 },
  sectorInfo: { flex: 1 },
  sectorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 3,
  },
  sectorName: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  activeBadge: {
    backgroundColor: 'rgba(200,121,65,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.5)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    color: Colors.copper,
    letterSpacing: 1,
  },
  lockedBadge: { marginLeft: 2 },
  lockedBadgeText: { fontSize: 12 },
  sectorSub: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
    marginBottom: 4,
  },
  sectorLevels: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
  },
});
