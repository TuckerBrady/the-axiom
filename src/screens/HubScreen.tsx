import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

const { width: W, height: H } = Dimensions.get('window');

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: (i * 97.3 + 43) % (W - 4),
  y: (i * 163.7 + i * i * 7.1) % (H * 0.88),
  size: i % 3 === 0 ? 2 : i % 3 === 1 ? 1.5 : 2.5,
  delay: (i * 310) % 4000,
  duration: 1100 + (i * 211) % 1600,
}));

type StarProps = (typeof STARS)[0];

function Star({ x, y, size, delay, duration }: StarProps) {
  const opacity = useSharedValue(0.15);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration }),
          withTiming(0.2, { duration }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.starWhite,
        },
        style,
      ]}
    />
  );
}

type NavItem = {
  label: string;
  emoji: string;
  screen: keyof RootStackParamList;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Ship', emoji: '🚀', screen: 'Hub' },
  { label: 'Sectors', emoji: '🗺️', screen: 'SectorMap' },
  { label: 'Workshop', emoji: '⚙️', screen: 'FreeBuild' },
  { label: 'Engineer', emoji: '🤖', screen: 'Settings' },
];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Hub'>;
};

export default function HubScreen({ navigation }: Props) {
  const shipFloat = useSharedValue(0);
  const screenOpacity = useSharedValue(0);
  const headerReveal = useSharedValue(0);
  const shipReveal = useSharedValue(0);
  const cogsReveal = useSharedValue(0);
  const missionReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerReveal.value = withTiming(1, { duration: 600 });
    shipReveal.value = withDelay(150, withTiming(1, { duration: 600 }));
    cogsReveal.value = withDelay(300, withTiming(1, { duration: 600 }));
    missionReveal.value = withDelay(450, withTiming(1, { duration: 600 }));

    shipFloat.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const shipFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shipFloat.value }],
  }));
  const headerRevealStyle = useAnimatedStyle(() => ({ opacity: headerReveal.value }));
  const shipRevealStyle = useAnimatedStyle(() => ({ opacity: shipReveal.value }));
  const cogsRevealStyle = useAnimatedStyle(() => ({ opacity: cogsReveal.value }));
  const missionRevealStyle = useAnimatedStyle(() => ({ opacity: missionReveal.value }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      {/* Starfield */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STARS.map((s) => (
          <Star key={s.id} {...s} />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, headerRevealStyle]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>COMMAND DECK</Text>
            <Text style={styles.headerTitle}>THE AXIOM</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>ONLINE</Text>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Spacecraft */}
          <Animated.View style={[styles.shipContainer, shipRevealStyle, shipFloatStyle]}>
            <Text style={styles.shipEmoji}>🛸</Text>
            <View style={styles.shipGlow} />
          </Animated.View>

          {/* Cogs briefing */}
          <Animated.View style={[styles.cogsBubble, cogsRevealStyle]}>
            <View style={styles.cogsHeader}>
              <View style={styles.cogsAvatar}>
                <Text style={styles.cogsAvatarEmoji}>🤖</Text>
              </View>
              <View>
                <Text style={styles.cogsName}>COGS · AI UNIT</Text>
                <Text style={styles.cogsBriefingLabel}>MISSION BRIEFING</Text>
              </View>
            </View>
            <Text style={styles.cogsSpeech}>
              {'"'}Sensor array is nominal. Kepler Belt anomalies await your
              attention — three configurations unsolved, one with a bounty
              marker. Your move, Commander.{'"'}
            </Text>
          </Animated.View>

          {/* Current mission card */}
          <Animated.View style={[styles.missionCard, missionRevealStyle]}>
            <LinearGradient
              colors={['rgba(26,58,92,0.9)', 'rgba(10,22,40,0.95)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.missionCardInner}>
              <View style={styles.missionCardLeft}>
                <Text style={styles.missionCardLabel}>ACTIVE MISSION</Text>
                <Text style={styles.missionCardTitle}>Kepler Belt</Text>
                <Text style={styles.missionCardSub}>Level 2-4</Text>
              </View>
              <TouchableOpacity
                style={styles.missionBtn}
                onPress={() => navigation.navigate('LevelSelect')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.copper, Colors.amber]}
                  style={styles.missionBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.missionBtnText}>LAUNCH</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {/* Decorative corner */}
            <View style={styles.missionCorner} />
          </Animated.View>

          {/* Quick actions */}
          <Animated.View style={[styles.quickActions, missionRevealStyle]}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('SectorMap')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickEmoji}>🗺️</Text>
              <Text style={styles.quickLabel}>Sector Map</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('FreeBuild')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickEmoji}>⚙️</Text>
              <Text style={styles.quickLabel}>Workshop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('Store')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickEmoji}>🛒</Text>
              <Text style={styles.quickLabel}>Store</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Bottom nav */}
        <View style={styles.bottomNav}>
          {NAV_ITEMS.map((item) => {
            const active = item.screen === 'Hub';
            return (
              <TouchableOpacity
                key={item.label}
                style={styles.navItem}
                onPress={() => !active && navigation.navigate(item.screen)}
                activeOpacity={0.75}
              >
                <Text style={styles.navEmoji}>{item.emoji}</Text>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {active && <View style={styles.navActiveDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  headerLeft: {},
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78,203,141,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(78,203,141,0.3)',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  statusText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  shipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  shipEmoji: {
    fontSize: 80,
    zIndex: 1,
  },
  shipGlow: {
    position: 'absolute',
    width: 100,
    height: 40,
    bottom: -10,
    backgroundColor: 'rgba(74,158,255,0.15)',
    borderRadius: 50,
  },
  cogsBubble: {
    width: '100%',
    backgroundColor: 'rgba(10,18,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.lg,
  },
  cogsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cogsAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cogsAvatarEmoji: { fontSize: 16 },
  cogsName: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1,
  },
  cogsBriefingLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.copper,
    letterSpacing: 1,
  },
  cogsSpeech: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  missionCard: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.25)',
    marginBottom: Spacing.lg,
    minHeight: 90,
  },
  missionCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  missionCardLeft: { flex: 1 },
  missionCardLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  missionCardTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.starWhite,
  },
  missionCardSub: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
    color: Colors.copperLight,
    marginTop: 2,
  },
  missionBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  missionBtnGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  missionBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: Colors.void,
  },
  missionCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 24,
    borderLeftWidth: 24,
    borderTopColor: 'rgba(74,158,255,0.3)',
    borderLeftColor: 'transparent',
  },
  quickActions: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickCard: {
    flex: 1,
    backgroundColor: 'rgba(26,58,92,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  quickEmoji: { fontSize: 22 },
  quickLabel: {
    fontFamily: Fonts.exo2,
    fontSize: 11,
    color: Colors.muted,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.15)',
    backgroundColor: 'rgba(6,9,15,0.95)',
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: 3,
  },
  navEmoji: { fontSize: 20 },
  navLabel: {
    fontFamily: Fonts.exo2,
    fontSize: 10,
    color: Colors.dim,
  },
  navLabelActive: {
    color: Colors.copper,
  },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.copper,
  },
});
