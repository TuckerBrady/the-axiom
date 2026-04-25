import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import CogsAvatar, { CogsState } from '../components/CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import { useLivesStore } from '../store/livesStore';
import { getLevelById } from '../game/levels';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MissionDossier'>;
  route: RouteProp<RootStackParamList, 'MissionDossier'>;
};

// ─── Mission icon (same SVGs as LevelSelectScreen) ──────────────────────────

type MissionIconType = 'bolt' | 'signal' | 'plug' | 'atom' | 'vortex' | 'fire' | 'moon' | 'void' | 'radio' | 'magnet' | 'sparkle' | 'rocket';

function MissionIcon({ type, size = 24, color = Colors.blue }: { type: MissionIconType; size?: number; color?: string }) {
  switch (type) {
    case 'bolt':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M13 2 L5 14 L11 14 L10 22 L19 10 L13 10 Z" fill={color} opacity={0.85} /></Svg>);
    case 'signal':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="18" r="2" fill={color} /><Path d="M8.5 14.5 A5 5 0 0 1 15.5 14.5" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Path d="M5.5 11.5 A9 9 0 0 1 18.5 11.5" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Line x1="12" y1="4" x2="12" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></Svg>);
    case 'plug':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Line x1="9" y1="3" x2="9" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" /><Line x1="15" y1="3" x2="15" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" /><Rect x="6" y="8" width="12" height="6" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}22`} /><Line x1="12" y1="14" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" /></Svg>);
    case 'atom':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="2.5" fill={color} /><Path d="M12 4 Q18 8 18 12 Q18 16 12 20 Q6 16 6 12 Q6 8 12 4 Z" stroke={color} strokeWidth="1.2" fill="none" /><Path d="M5 7 Q9 12 12 12 Q15 12 19 7" stroke={color} strokeWidth="1.2" fill="none" /><Path d="M5 17 Q9 12 12 12 Q15 12 19 17" stroke={color} strokeWidth="1.2" fill="none" /></Svg>);
    case 'vortex':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 4 A8 8 0 0 1 20 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Path d="M20 12 A8 8 0 0 1 12 20" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Path d="M12 20 A8 8 0 0 1 4 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Path d="M4 12 A8 8 0 0 1 12 4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" /><Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.2" fill={`${color}33`} /></Svg>);
    case 'fire':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 2 C12 2 16 7 17 11 C18 15 15 20 12 21 C9 20 6 15 7 11 C8 7 12 2 12 2 Z" fill={color} opacity={0.8} /><Path d="M12 10 C12 10 14 13 14 15 C14 17 13 18 12 18 C11 18 10 17 10 15 C10 13 12 10 12 10 Z" fill={Colors.void} opacity={0.6} /></Svg>);
    case 'moon':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M20 12 A8 8 0 1 1 10 4 A6 6 0 0 0 20 12 Z" fill={color} opacity={0.8} /></Svg>);
    case 'void':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill={`${color}11`} /><Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1" fill={`${color}22`} /><Circle cx="12" cy="12" r="1.5" fill={color} /></Svg>);
    case 'radio':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Rect x="4" y="8" width="16" height="12" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}15`} /><Circle cx="15" cy="14" r="3" stroke={color} strokeWidth="1.2" fill="none" /><Line x1="7" y1="12" x2="11" y2="12" stroke={color} strokeWidth="1" strokeLinecap="round" /><Line x1="7" y1="14" x2="10" y2="14" stroke={color} strokeWidth="1" strokeLinecap="round" /><Line x1="7" y1="16" x2="11" y2="16" stroke={color} strokeWidth="1" strokeLinecap="round" /><Line x1="8" y1="4" x2="12" y2="8" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></Svg>);
    case 'magnet':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M7 4 L7 13 A5 5 0 0 0 17 13 L17 4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" /><Line x1="5" y1="4" x2="9" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" /><Line x1="15" y1="4" x2="19" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></Svg>);
    case 'sparkle':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 2 L13.5 9 L20 8 L14.5 12 L18 19 L12 14 L6 19 L9.5 12 L4 8 L10.5 9 Z" fill={color} opacity={0.85} /></Svg>);
    case 'rocket':
      return (<Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 3 C12 3 8 8 8 14 L10 16 L14 16 L16 14 C16 8 12 3 12 3 Z" stroke={color} strokeWidth="1.5" fill={`${color}22`} /><Circle cx="12" cy="11" r="1.5" fill={color} /><Path d="M8 14 L5 17 L8 16 Z" fill={color} opacity={0.7} /><Path d="M16 14 L19 17 L16 16 Z" fill={color} opacity={0.7} /><Path d="M10 16 L10 19 L12 18 L14 19 L14 16" stroke={color} strokeWidth="1" fill={`${color}44`} /></Svg>);
  }
}

const { height: screenHeight } = Dimensions.get('window');

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MissionDossierScreen({ navigation, route }: Props) {
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  const {
    missionId,
    missionName,
    iconType,
    stars,
    bestTime,
    piecesUsed,
    cogsQuote,
    levelId,
    nodeState,
  } = route.params;

  const setLevel = useGameStore(s => s.setLevel);

  const levelDef = levelId ? getLevelById(levelId) : undefined;
  const displayedCogsQuote = levelDef?.cogsLine ?? cogsQuote;
  const eyeState = levelDef?.eyeState ?? 'blue';
  const cogsAvatarState: CogsState =
    eyeState === 'red' ? 'damaged'
    : eyeState === 'amber' ? 'engaged'
    : eyeState === 'green' ? 'green'
    : eyeState === 'dark' ? 'dark'
    : 'online';

  const isCompleted = nodeState === 'completed';
  const isActive = nodeState === 'active';
  const isLocked = nodeState === 'locked';

  const handleLaunch = () => {
    // Check lives before launching
    const { lives } = useLivesStore.getState();
    if (lives <= 0) {
      Alert.alert(
        'No Lives Remaining',
        'You are out of lives. Wait for regeneration or refill from the Hub.',
        [{ text: 'OK' }],
      );
      return;
    }
    if (levelDef) {
      setLevel(levelDef);
    }
    // Use replace (not navigate) so each level launch forces a fresh
    // GameplayScreen mount. With navigate, native-stack pops back to
    // the existing Gameplay instance whenever one is still in the
    // stack, causing timers, animation refs, and loopingRef state
    // to accumulate across levels.
    navigation.replace('Gameplay');
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
    <View style={st.root}>
      <SafeAreaView style={st.safeArea}>
        {/* ── Header ── */}
        <View style={st.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={st.headerCenter}>
            <Text style={st.headerLabel}>MISSION {missionId}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero area ── */}
          <View style={st.heroArea}>
            {/* Radial glow */}
            <View style={st.heroGlow} />
            <MissionIcon type={iconType as MissionIconType} size={80} color={Colors.blue} />
          </View>

          {/* ── Mission title ── */}
          <Text style={st.missionTitle}>{missionName}</Text>

          {/* ── Star rating ── */}
          <View style={st.starsRow}>
            {[0, 1, 2].map(i => (
              <Text key={i} style={[st.star, { opacity: stars > i ? 1 : 0.18 }]}>★</Text>
            ))}
          </View>

          {/* ── Stats row ── */}
          <View style={st.statsGrid}>
            <View style={st.statCell}>
              <Text style={st.statValue}>{isCompleted ? bestTime : '—'}</Text>
              <Text style={st.statKey}>BEST TIME</Text>
            </View>
            <View style={[st.statCell, st.statBorder]}>
              <Text style={st.statValue}>{isCompleted ? String(piecesUsed) : '—'}</Text>
              <Text style={st.statKey}>PIECES USED</Text>
            </View>
            <View style={[st.statCell, st.statBorder]}>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {[0, 1, 2].map(i => (
                  <Text key={i} style={[st.statStar, { opacity: stars > i ? 1 : 0.2 }]}>★</Text>
                ))}
              </View>
              <Text style={st.statKey}>STAR RATING</Text>
            </View>
          </View>

          {/* ── COGS analysis ── */}
          <View style={st.cogsCard}>
            <View style={st.cogsCardHeader}>
              <CogsAvatar size="small" state={cogsAvatarState} />
              <Text style={st.cogsCardTitle}>COGS ANALYSIS</Text>
            </View>
            <Text style={st.cogsCardQuote}>{'"'}{displayedCogsQuote}{'"'}</Text>
          </View>
        </ScrollView>

        {/* ── Bottom pinned launch button ── */}
        <View style={st.bottomBar}>
          {isActive ? (
            <Button variant="gradient" label="LAUNCH MISSION" onPress={handleLaunch} />
          ) : isCompleted ? (
            <Button variant="secondary" label="REPLAY" onPress={handleLaunch} />
          ) : (
            <Button variant="secondary" label="LOCKED" onPress={() => {}} disabled />
          )}
        </View>
      </SafeAreaView>
    </View>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.copper,
    letterSpacing: 2,
  },

  // Scroll
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  // Hero
  heroArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: Spacing.xxxl,
    overflow: 'visible',
  },
  heroGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(74,158,255,0.06)',
  },

  // Title
  missionTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.xl,
  },
  star: { fontSize: 24, color: Colors.amber },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26,58,92,0.3)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(74,158,255,0.12)',
  },
  statValue: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.starWhite,
  },
  statKey: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    color: Colors.muted,
    letterSpacing: 1,
  },
  statStar: { fontSize: 14, color: Colors.amber },

  // COGS card
  cogsCard: {
    backgroundColor: 'rgba(10,18,30,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.18)',
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cogsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cogsCardTitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1.5,
  },
  cogsCardQuote: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: Colors.cream,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.08)',
  },
});
