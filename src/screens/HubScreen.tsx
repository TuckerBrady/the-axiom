import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import CogsHubCard from '../components/cogs/CogsHubCard';
import AxiomShip from '../components/hub/AxiomShip';
import type { SystemLightState } from '../components/hub/AxiomShip';
import { Fonts, Spacing } from '../theme/tokens';
import { useLivesStore, MAX_LIVES_COUNT } from '../store/livesStore';
import { useEconomyStore } from '../store/economyStore';
import { useChallengeStore } from '../store/challengeStore';
import { useConsequenceStore } from '../store/consequenceStore';
import { useProgressionStore, AXIOM_TOTAL_LEVELS, SHIP_SYSTEMS } from '../store/progressionStore';
import { useGameStore } from '../store/gameStore';
import { AXIOM_LEVELS } from '../game/levels';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const AMBER = '#F59E0B';
const BLUE = '#38BDF8';
const GREEN = '#4ADE80';
const RED = '#F87171';
const COPPER = '#B87333';
const BG = '#060A0F';
const SURFACE = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT_DIM = 'rgba(255,255,255,0.3)';
const TEXT_MID = 'rgba(255,255,255,0.55)';
const TEXT_LABEL = 'rgba(255,255,255,0.55)';
const TEXT_SUB = 'rgba(255,255,255,0.4)';

// Rank table R01-R10
const RANKS = [
  'Salvager', 'Apprentice', 'Technician', 'Mechanic', 'Engineer',
  'Lead Engineer', 'Systems Architect', 'Chief Engineer', 'Captain', 'Commander',
];

const RANK_COLORS = [
  '#6B7F99',   // R01 Salvager
  '#00E5FF',   // R02 Apprentice
  '#00FFC8',   // R03 Technician
  '#FF6B35',   // R04 Mechanic
  '#FF2D92',   // R05 Engineer
  '#A855F7',   // R06 Lead Engineer
  '#6366F1',   // R07 Systems Architect
  '#FACC15',   // R08 Chief Engineer
  '#FF8C00',   // R09 Captain
  '#F0E8FF',   // R10 Commander
];

function getRank(completedCount: number): { name: string; index: number; color: string } {
  const idx = Math.min(Math.floor(completedCount / 2), RANKS.length - 1);
  return { name: RANKS[idx], index: idx, color: RANK_COLORS[idx] };
}

type HubNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Hub'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = { navigation: HubNav };

// ─── Component ────────────────────────────────────────────────────────────────

export default function HubScreen({ navigation }: Props) {
  const { lives, regenerate } = useLivesStore();
  const { credits } = useEconomyStore();
  const { currentChallenge, challengeStatus, loadOrGenerateChallenge } = useChallengeStore();
  const damagedSystems = useConsequenceStore(s => s.damagedSystems);
  const { getSectorCompletedCount, isLevelCompleted } = useProgressionStore();
  const setLevel = useGameStore(s => s.setLevel);

  // Regenerate lives on mount
  useEffect(() => { regenerate(); }, []);
  // Load daily challenge
  useEffect(() => { loadOrGenerateChallenge().catch(() => {}); }, []);

  const axiomCompleted = getSectorCompletedCount('A1-');
  const systemsOnline = axiomCompleted;
  const totalSystems = AXIOM_TOTAL_LEVELS;

  // Find next uncompleted level
  const nextLevel = AXIOM_LEVELS.find(l => !isLevelCompleted(l.id));
  const nextLevelId = nextLevel ? nextLevel.id : null;
  const nextLevelName = nextLevel ? nextLevel.name : 'All Complete';

  // Rank
  const totalCompleted = axiomCompleted;
  const { name: rankName, index: rankIndex, color: rankColor } = getRank(totalCompleted);
  const nextRank = rankIndex < RANKS.length - 1 ? RANKS[rankIndex + 1] : null;
  const rankProgress = totalCompleted > 0 ? Math.min(1, (totalCompleted % 2) / 2 + 0.5) : 0;

  // Bounty
  const hasBounty = !!currentChallenge && challengeStatus === 'available';

  // System light states
  const systemLights = SHIP_SYSTEMS.map((sys, i) => {
    const levelId = `A1-${i + 1}`;
    const completed = isLevelCompleted(levelId);
    const damaged = damagedSystems.includes(sys.toLowerCase().replace(/\s/g, ''));
    if (damaged) return 'dmg';
    if (completed) return 'on';
    return 'off';
  });

  // Damage flicker animation
  const flickerOp = useSharedValue(1);
  useEffect(() => {
    if (systemLights.some(s => s === 'dmg')) {
      flickerOp.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 700, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        ), -1, false,
      );
    }
  }, [systemLights.join(',')]);
  const flickerStyle = useAnimatedStyle(() => ({ opacity: flickerOp.value }));

  // Entrance animations
  const headerOp = useSharedValue(0);
  const shipOp = useSharedValue(0);
  const contentOp = useSharedValue(0);
  useEffect(() => {
    headerOp.value = withDelay(100, withTiming(1, { duration: 400 }));
    shipOp.value = withDelay(300, withTiming(1, { duration: 500 }));
    contentOp.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, []);
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOp.value }));
  const shipStyle = useAnimatedStyle(() => ({ opacity: shipOp.value }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOp.value }));

  return (
    <View style={st.root}>
      <SafeAreaView style={st.safe} edges={['top']}>
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

          {/* ── HEADER ── */}
          <Animated.View style={[st.header, headerStyle]}>
            <View>
              <Text style={st.headerSup}>COMMAND DECK</Text>
              <Text style={st.headerTitle}>THE AXIOM</Text>
            </View>
            <View style={st.headerRight}>
              <Text style={st.headerSector}>Sector 0</Text>
              <Text style={st.headerSystems}>{systemsOnline} / {totalSystems} systems</Text>
            </View>
          </Animated.View>

          {/* ── SHIP SECTION ── */}
          <Animated.View style={[st.shipSection, shipStyle]}>
            <View style={st.shipSvgWrap}>
              <AxiomShip systemStates={systemLights as [SystemLightState, SystemLightState, SystemLightState, SystemLightState, SystemLightState, SystemLightState, SystemLightState, SystemLightState]} />
            </View>
            {/* Repair bar */}
            <View style={st.repairBar}>
              <Text style={st.repairLabel}>SYSTEMS</Text>
              <View style={st.repairTrack}>
                <View style={[st.repairFill, { width: `${(systemsOnline / totalSystems) * 100}%` }]} />
              </View>
              <Text style={st.repairCount}>{systemsOnline} / {totalSystems}</Text>
            </View>
          </Animated.View>

          {/* ── CONTENT ── */}
          <Animated.View style={[st.content, contentStyle]}>

            {/* Amber COGS card — mission guidance */}
            <CogsHubCard
              color="AMBER"
              role="MISSION BRIEFING"
              cta={nextLevelId ? `${nextLevelId} →` : 'Complete'}
              body={nextLevel
                ? nextLevel.cogsLine || `${nextLevel.name} is the next objective.`
                : 'All Axiom systems are operational.'}
              onPress={() => {
                if (nextLevelId && nextLevel) {
                  setLevel(nextLevel);
                  navigation.navigate('Gameplay');
                }
              }}
            />

            {/* Blue COGS card — bounty (hidden if no active bounty) */}
            {hasBounty && currentChallenge && (
              <CogsHubCard
                color="BLUE"
                role="BOUNTY TRANSMISSION"
                cta="Bounty →"
                body={currentChallenge.cogsPresentation || 'Incoming transmission. Bounty available.'}
                onPress={() => navigation.navigate('DailyChallengeDossier')}
              />
            )}

            {/* 2x2 Instrument Grid */}
            <View style={st.grid}>
              {/* Credits */}
              <View style={st.gridCard}>
                <Text style={st.gridLabel}>CREDITS</Text>
                <Text style={[st.gridValue, { color: GREEN }]}>{credits}</Text>
                <Text style={st.gridSub}>CR</Text>
              </View>

              {/* Lives */}
              <View style={st.gridCard}>
                <Text style={st.gridLabel}>LIVES</Text>
                <View style={st.livesPips}>
                  {Array.from({ length: MAX_LIVES_COUNT }, (_, i) => (
                    <View
                      key={i}
                      style={[st.pip, i < lives ? st.pipFilled : st.pipEmpty]}
                    />
                  ))}
                </View>
              </View>

              {/* Rank */}
              <View style={st.gridCard}>
                <Text style={st.gridLabel}>RANK</Text>
                <Text style={[st.gridValue, { color: rankColor }]}>{rankName}</Text>
                {nextRank && (
                  <>
                    <View style={st.rankTrack}>
                      <View style={[st.rankFill, { width: `${rankProgress * 100}%` }]} />
                    </View>
                    <Text style={st.gridSub}>next: {nextRank}</Text>
                  </>
                )}
              </View>

              {/* Sector */}
              <View style={st.gridCard}>
                <Text style={st.gridLabel}>SECTOR</Text>
                <View style={st.sectorPips}>
                  {Array.from({ length: totalSystems }, (_, i) => {
                    const done = isLevelCompleted(`A1-${i + 1}`);
                    const isNext = nextLevelId === `A1-${i + 1}`;
                    return (
                      <View
                        key={i}
                        style={[
                          st.sectorPip,
                          done && st.sectorPipDone,
                          isNext && st.sectorPipActive,
                        ]}
                      />
                    );
                  })}
                </View>
                <Text style={st.gridSub}>The Axiom{nextLevelId ? ` · ${nextLevelId} next` : ''}</Text>
              </View>
            </View>

          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  scroll: { paddingBottom: 80 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerSup: { fontFamily: Fonts.spaceMono, fontSize: 8, color: TEXT_DIM, letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontFamily: Fonts.orbitron, fontSize: 18, fontWeight: '700', color: '#E8F0FF', letterSpacing: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerSector: { fontFamily: Fonts.spaceMono, fontSize: 8, color: TEXT_DIM, letterSpacing: 1.5 },
  headerSystems: { fontFamily: Fonts.spaceMono, fontSize: 9, color: TEXT_MID, letterSpacing: 1 },

  // Ship section
  shipSection: { alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  shipSvgWrap: { marginBottom: 8 },
  repairBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  repairLabel: { fontFamily: Fonts.spaceMono, fontSize: 8, color: TEXT_DIM, letterSpacing: 1.5, width: 55 },
  repairTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  repairFill: { height: '100%', backgroundColor: BLUE, borderRadius: 2 },
  repairCount: { fontFamily: Fonts.spaceMono, fontSize: 9, color: TEXT_MID, letterSpacing: 1, width: 40, textAlign: 'right' },

  // Content
  content: { padding: 14, paddingTop: 8, gap: 7 },

  // 2x2 Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  gridCard: { width: (SCREEN_W - 28 - 7) / 2, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 9, padding: 10, gap: 4 },
  gridLabel: { fontFamily: Fonts.spaceMono, fontSize: 8, color: TEXT_LABEL, letterSpacing: 1.5 },
  gridValue: { fontFamily: Fonts.spaceMono, fontSize: 16, color: '#E8F0FF', letterSpacing: 1 },
  gridSub: { fontFamily: Fonts.spaceMono, fontSize: 8, color: TEXT_SUB, letterSpacing: 1 },

  // Lives pips
  livesPips: { flexDirection: 'row', gap: 5, marginTop: 4 },
  pip: { width: 10, height: 10, borderRadius: 5 },
  pipFilled: { backgroundColor: COPPER },
  pipEmpty: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },

  // Rank progress
  rankTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 1.5, overflow: 'hidden', marginTop: 4 },
  rankFill: { height: '100%', backgroundColor: AMBER, borderRadius: 1.5 },

  // Sector pips
  sectorPips: { flexDirection: 'row', gap: 4, marginTop: 4 },
  sectorPip: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sectorPipDone: { backgroundColor: GREEN, borderColor: GREEN },
  sectorPipActive: { backgroundColor: AMBER, borderColor: AMBER },
});
