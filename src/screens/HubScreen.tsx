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
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TabParamList } from '../navigation/TabNavigator';
import Svg, { Path } from 'react-native-svg';
import StarField from '../components/StarField';
import ShipRepairProgress from '../components/ShipRepairProgress';
import CogsAvatar from '../components/CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useLivesStore, MAX_LIVES_COUNT } from '../store/livesStore';
import { useProgressionStore, AXIOM_TOTAL_LEVELS, SHIP_SYSTEMS } from '../store/progressionStore';
import { AXIOM_LEVELS } from '../game/levels';

const { height: H } = Dimensions.get('window');

// ─── HUD corner bracket ──────────────────────────────────────────────────────

const BRACKET_SIZE = 14;
const BRACKET_THICKNESS = 1.5;
const BRACKET_COLOR = 'rgba(74,158,255,0.4)';

function TopLeftBracket() {
  return (
    <View style={styles.bracketTopLeft}>
      <View style={[styles.bracketH, { backgroundColor: BRACKET_COLOR }]} />
      <View style={[styles.bracketV, { backgroundColor: BRACKET_COLOR }]} />
    </View>
  );
}

function TopRightBracket() {
  return (
    <View style={styles.bracketTopRight}>
      <View style={[styles.bracketH, { backgroundColor: BRACKET_COLOR }]} />
      <View style={[styles.bracketV, { backgroundColor: BRACKET_COLOR, alignSelf: 'flex-end' }]} />
    </View>
  );
}

function BottomLeftBracket() {
  return (
    <View style={styles.bracketBottomLeft}>
      <View style={[styles.bracketV, { backgroundColor: BRACKET_COLOR }]} />
      <View style={[styles.bracketH, { backgroundColor: BRACKET_COLOR }]} />
    </View>
  );
}

function BottomRightBracket() {
  return (
    <View style={styles.bracketBottomRight}>
      <View style={[styles.bracketV, { backgroundColor: BRACKET_COLOR, alignSelf: 'flex-end' }]} />
      <View style={[styles.bracketH, { backgroundColor: BRACKET_COLOR }]} />
    </View>
  );
}

// ─── Scanning line ────────────────────────────────────────────────────────────

function ScanLine({ containerHeight }: { containerHeight: number }) {
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(containerHeight, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [containerHeight]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.scanLine, style]}
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Props = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<TabParamList, 'Hub'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

const HUB_COGS_LINES = [
  'Kepler Station grid is failing. They asked for help. I told them you are on your way. You are welcome.',
  'Nova Fringe is showing unusual energy readings. I have flagged it in the mission queue.',
  'All systems nominal. That is not a common status on this vessel. Noted.',
  'The Codex has new entries since your last session. I recommend reviewing them.',
  'Three missions in Kepler Belt remain incomplete. I am not reminding you. I am informing you.',
  'Ship maintenance is current. I handled it while you were away.',
  'Long range sensors are picking up something in the Deep Void. Classification pending.',
  'You have been away for some time. The Axiom managed. As it tends to.',
];

function HeartIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={filled ? Colors.blue : 'transparent'}
        stroke={filled ? Colors.blue : Colors.dim}
        strokeWidth="1.5"
        opacity={filled ? 1 : 0.5}
      />
    </Svg>
  );
}

export default function HubScreen({ navigation }: Props) {
  const { lives, regenerate } = useLivesStore();
  const { getSectorCompletedCount, isLevelCompleted } = useProgressionStore();

  const axiomCompleted = getSectorCompletedCount('A1-');
  const axiomDone = axiomCompleted >= AXIOM_TOTAL_LEVELS;

  // Determine next mission
  const nextAxiomIdx = AXIOM_LEVELS.findIndex((_, i) => !isLevelCompleted(`A1-${i + 1}`));
  const nextAxiomLevel = nextAxiomIdx >= 0 ? AXIOM_LEVELS[nextAxiomIdx] : null;

  // COGS line: special if ship fully repaired, otherwise daily rotation
  const todayCogsLine = axiomDone
    ? 'The Axiom is fully operational. For the first time since I can remember. You did that. I will not say that again.'
    : HUB_COGS_LINES[new Date().getDay() % HUB_COGS_LINES.length];

  // Regenerate lives on mount (app foreground)
  useEffect(() => {
    regenerate();
  }, []);

  const screenOpacity = useSharedValue(0);
  const headerReveal = useSharedValue(0);
  const hudReveal = useSharedValue(0);
  const shipReveal = useSharedValue(0);
  const cogsReveal = useSharedValue(0);
  const missionReveal = useSharedValue(0);
  const shipFloat = useSharedValue(0);

  // Lives pulse when full
  const livesPulse = useSharedValue(1);
  useEffect(() => {
    if (lives >= MAX_LIVES_COUNT) {
      livesPulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      livesPulse.value = withTiming(1, { duration: 200 });
    }
  }, [lives]);
  const livesPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livesPulse.value }],
  }));

  // Container height for the HUD bracket area (approximate)
  const HUD_HEIGHT = H * 0.26;

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerReveal.value = withTiming(1, { duration: 600 });
    hudReveal.value = withDelay(150, withTiming(1, { duration: 600 }));
    shipReveal.value = withDelay(300, withTiming(1, { duration: 600 }));
    cogsReveal.value = withDelay(450, withTiming(1, { duration: 600 }));
    missionReveal.value = withDelay(600, withTiming(1, { duration: 600 }));

    shipFloat.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const headerRevealStyle = useAnimatedStyle(() => ({ opacity: headerReveal.value }));
  const hudRevealStyle = useAnimatedStyle(() => ({ opacity: hudReveal.value }));
  const shipRevealStyle = useAnimatedStyle(() => ({
    opacity: shipReveal.value,
    transform: [{ translateY: shipFloat.value }],
  }));
  const cogsRevealStyle = useAnimatedStyle(() => ({ opacity: cogsReveal.value }));
  const missionRevealStyle = useAnimatedStyle(() => ({ opacity: missionReveal.value }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={1} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ── */}
        <Animated.View style={[styles.header, headerRevealStyle]}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>COMMAND DECK</Text>
            <Text style={styles.headerTitle}>THE AXIOM</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.livesBadge}>
              <HeartIcon filled={lives > 0} size={12} />
              <Text style={[styles.livesCount, lives <= 1 && { color: Colors.red }]}>{lives}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>● ONLINE</Text>
            </View>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HUD brackets + scanning line + ship ── */}
          <Animated.View
            style={[styles.hudContainer, { height: HUD_HEIGHT }, hudRevealStyle]}
          >
            {/* Corner brackets */}
            <TopLeftBracket />
            <TopRightBracket />
            <BottomLeftBracket />
            <BottomRightBracket />

            {/* Scanning line */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <ScanLine containerHeight={HUD_HEIGHT} />
            </View>

            {/* Spacecraft */}
            <Animated.View style={[styles.shipInner, shipRevealStyle]}>
              <ShipRepairProgress width={280} height={140} />
            </Animated.View>
          </Animated.View>

          {/* ── Cogs speech bubble ── */}
          <Animated.View style={[styles.cogsBubble, cogsRevealStyle]}>
            <View style={styles.cogsHeader}>
              <View style={styles.cogsAvatar}>
                <CogsAvatar size="small" state="online" />
              </View>
              <Text style={styles.cogsName}>COGS · AI UNIT</Text>
            </View>
            <Text style={styles.cogsSpeech}>{todayCogsLine}</Text>
          </Animated.View>

          {/* ── Lives row ── */}
          <Animated.View style={[styles.livesRow, cogsRevealStyle]}>
            <Text style={styles.livesLabel}>LIVES</Text>
            <Animated.View style={[styles.heartsRow, livesPulseStyle]}>
              {Array.from({ length: MAX_LIVES_COUNT }, (_, i) => (
                <HeartIcon key={i} filled={i < lives} size={18} />
              ))}
            </Animated.View>
          </Animated.View>

          {/* ── Active mission card ── */}
          <Animated.View style={[styles.missionCard, missionRevealStyle]}>
            <LinearGradient
              colors={axiomDone
                ? ['rgba(78,203,141,0.15)', 'rgba(10,22,40,0.95)']
                : ['rgba(26,58,92,0.85)', 'rgba(10,18,30,0.95)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            {/* Corner accent */}
            <View style={styles.missionCornerAccent} />
            <View style={styles.missionCardInner}>
              <View style={styles.missionCardLeft}>
                <Text style={styles.missionCardLabel}>
                  {axiomDone ? 'SHIP STATUS' : 'ACTIVE MISSION'}
                </Text>
                <Text style={styles.missionCardTitle}>
                  {axiomDone ? 'Fully Operational' : 'The Axiom'}
                </Text>
                <Text style={styles.missionCardSub}>
                  {axiomDone
                    ? `${axiomCompleted}/${AXIOM_TOTAL_LEVELS} Systems Online`
                    : nextAxiomLevel
                    ? `${nextAxiomLevel.id} · ${nextAxiomLevel.name}`
                    : `${axiomCompleted}/${AXIOM_TOTAL_LEVELS} Repaired`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.launchBtn}
                onPress={() => navigation.navigate('SectorMap')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={axiomDone ? [Colors.green, '#3aad75'] : [Colors.copper, Colors.amber]}
                  style={styles.launchBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.launchBtnText}>
                    {axiomDone ? 'SECTORS' : 'LAUNCH'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Ship repair progress ── */}
          {!axiomDone && (
            <Animated.View style={[styles.repairProgress, missionRevealStyle]}>
              <Text style={styles.repairProgressLabel}>REPAIR PROGRESS</Text>
              <View style={styles.repairProgressBar}>
                <View style={[styles.repairProgressFill, { width: `${Math.round(axiomCompleted / AXIOM_TOTAL_LEVELS * 100)}%` as any }]} />
              </View>
              <Text style={styles.repairProgressText}>
                {axiomCompleted}/{AXIOM_TOTAL_LEVELS} systems repaired
              </Text>
            </Animated.View>
          )}
        </ScrollView>

      </SafeAreaView>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  safeArea: {
    flex: 1,
  },

  // Header
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  livesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(74,158,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  livesCount: {
    fontFamily: Fonts.orbitron,
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.blue,
  },
  statusBadge: {
    backgroundColor: 'rgba(78,203,141,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(78,203,141,0.3)',
    borderRadius: 20,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 1,
  },

  // Scroll
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },

  // HUD + ship container
  hudContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shipInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipEmoji: {
    fontSize: 88,
  },

  // HUD corner brackets
  bracketTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
  },
  bracketTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
  },
  bracketBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    justifyContent: 'flex-end',
  },
  bracketBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    justifyContent: 'flex-end',
  },
  bracketH: {
    width: BRACKET_SIZE,
    height: BRACKET_THICKNESS,
  },
  bracketV: {
    width: BRACKET_THICKNESS,
    height: BRACKET_SIZE,
    position: 'absolute',
    top: 0,
  },

  // Scanning line
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(74,158,255,0.25)',
  },

  // Cogs speech bubble
  cogsBubble: {
    width: '100%',
    backgroundColor: 'rgba(10,18,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 14,
    padding: 14,
  },
  cogsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cogsAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cogsAvatarEmoji: {
    fontSize: 16,
  },
  cogsName: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1,
  },
  cogsSpeech: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: Colors.starWhite,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Lives row
  livesRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10,18,30,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  livesLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 6,
  },

  // Active mission card
  missionCard: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.25)',
    minHeight: 90,
  },
  missionCornerAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 28,
    borderLeftWidth: 28,
    borderTopColor: 'rgba(74,158,255,0.3)',
    borderLeftColor: 'transparent',
  },
  missionCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  missionCardLeft: {
    flex: 1,
  },
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
  launchBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  launchBtnGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  launchBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: Colors.void,
  },

  // Repair progress
  repairProgress: {
    width: '100%',
    backgroundColor: 'rgba(10,18,30,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  repairProgressLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  repairProgressBar: {
    height: 4,
    backgroundColor: 'rgba(74,158,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  repairProgressFill: {
    height: 4,
    backgroundColor: Colors.blue,
    borderRadius: 2,
  },
  repairProgressText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.blue,
    letterSpacing: 1,
  },

});
