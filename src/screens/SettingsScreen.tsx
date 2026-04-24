import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '../navigation/TabNavigator';
import Svg, { Circle, Rect, Line, Path } from 'react-native-svg';
import StarField from '../components/StarField';
import CogsAvatar from '../components/CogsAvatar';
import EngineerIcon from '../components/icons/EngineerIcon';
import { WireToggle } from '../components/WireToggle';
import { RankInsignia, RANK_NAMES } from '../components/RankInsignia';
import { usePlayerStore, DISCIPLINE_LABELS } from '../store/playerStore';
import {
  NotificationIcon,
  ClipboardIcon,
} from '../components/icons/SettingsIcons';
import { useSettingsStore } from '../store/settingsStore';
import { useEconomyStore } from '../store/economyStore';
import { useLivesStore } from '../store/livesStore';
import { ALL_LEVELS } from '../game/levels';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { BUILD_INFO } from '../buildInfo';
import { SHOW_DEV_TOOLS } from '../utils/devFlags';

type Props = {
  navigation: BottomTabNavigationProp<TabParamList, 'Settings'>;
};

// ─── Icon background wrapper ────────────────────────────────────────────────

function IconBg({ children, amber }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <View style={{
      width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
      backgroundColor: amber ? 'rgba(200,121,65,0.08)' : 'rgba(74,158,255,0.08)',
      borderWidth: 1,
      borderColor: amber ? 'rgba(200,121,65,0.18)' : 'rgba(74,158,255,0.18)',
    }}>
      {children}
    </View>
  );
}

// ─── Inline settings icons ──────────────────────────────────────────────────

function SfxIcon() {
  return (
    <IconBg>
      <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
        <Path d="M6 8L6 12L10 14L10 6Z" fill="#4a9eff" opacity={0.8} />
        <Path d="M12 7Q16 10 12 13" stroke="#4a9eff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </Svg>
    </IconBg>
  );
}

function MusicRowIcon() {
  return (
    <IconBg>
      <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
        <Line x1="5" y1="6" x2="15" y2="4" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="15" y1="4" x2="15" y2="16" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="5" y1="6" x2="5" y2="18" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Circle cx="5" cy="18" r="3" fill="#4a9eff" opacity={0.6} />
        <Circle cx="15" cy="16" r="3" fill="#4a9eff" opacity={0.6} />
      </Svg>
    </IconBg>
  );
}

function HapticRowIcon() {
  return (
    <IconBg>
      <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
        <Rect x="7" y="3" width="6" height="14" rx="3" stroke="#4a9eff" strokeWidth="1.5" fill="none" />
        <Line x1="4" y1="7" x2="2" y2="7" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="4" y1="10" x2="1" y2="10" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="4" y1="13" x2="2" y2="13" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="16" y1="7" x2="18" y2="7" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="16" y1="10" x2="19" y2="10" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="16" y1="13" x2="18" y2="13" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
    </IconBg>
  );
}

function CogsHintsIcon() {
  return (
    <IconBg amber>
      <Svg width={18} height={18} viewBox="0 0 28 28" fill="none">
        <Rect x="2" y="4" width="24" height="20" rx="5" stroke="#c87941" strokeWidth="1" fill="#0c1a2e" />
        <Circle cx="9" cy="13" r="3.5" stroke="#c87941" strokeWidth="0.5" fill="#061830" />
        <Circle cx="9" cy="13" r="2" fill="#c87941" opacity={0.8} />
        <Circle cx="19" cy="13" r="2.8" stroke="#c87941" strokeWidth="0.5" fill="#061830" />
        <Circle cx="19" cy="13" r="1.6" fill="#c87941" opacity={0.7} />
      </Svg>
    </IconBg>
  );
}

// ─── R04 Mechanic Insignia (inline) ─────────────────────────────────────────

function R04Insignia({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (18 / 22)} viewBox="0 0 22 18" fill="none">
      <Circle cx="11" cy="5" r="2.5" fill="#c87941" opacity={0.9} />
      <Circle cx="5" cy="14" r="2.5" fill="#c87941" opacity={0.9} />
      <Circle cx="17" cy="14" r="2.5" fill="#c87941" opacity={0.9} />
      <Line x1="11" y1="7.5" x2="5.8" y2="11.5" stroke="#c87941" strokeWidth="0.8" opacity={0.4} />
      <Line x1="11" y1="7.5" x2="16.2" y2="11.5" stroke="#c87941" strokeWidth="0.8" opacity={0.4} />
      <Line x1="7.5" y1="14" x2="14.5" y2="14" stroke="#c87941" strokeWidth="0.8" opacity={0.4} />
    </Svg>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({ title, delay }: { title: string; delay: number }) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: reveal.value }));
  return (
    <Animated.Text style={[styles.sectionHeader, style]}>{title}</Animated.Text>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onChange,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  delay: number;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateX: (1 - reveal.value) * -8 }],
  }));
  return (
    <Animated.View style={[styles.settingRow, style]}>
      <View style={styles.rowIconWrap}>{icon}</View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <WireToggle value={value} onValueChange={onChange} />
    </Animated.View>
  );
}

function TapRow({
  icon,
  label,
  sub,
  value,
  chevron,
  delay,
  onPress,
  labelColor,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value?: string;
  chevron?: boolean;
  delay: number;
  onPress?: () => void;
  labelColor?: string;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateX: (1 - reveal.value) * -8 }],
  }));
  return (
    <Animated.View style={[styles.settingRow, style]}>
      <TouchableOpacity
        style={styles.tapRowInner}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.rowIconWrap}>{icon}</View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowLabel, labelColor ? { color: labelColor } : undefined]}>{label}</Text>
          {sub && <Text style={styles.rowSub}>{sub}</Text>}
        </View>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {chevron && <Text style={styles.chevron}>›</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

function DisciplineIcon({ disc }: { disc: 'systems' | 'drive' | 'field' }) {
  const size = 16;
  if (disc === 'systems') {
    return (
      <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <Rect x="4" y="8" width="20" height="12" rx="4" stroke="#c87941" strokeWidth="1.5" fill="none" />
        <Circle cx="14" cy="14" r="3" fill="#c87941" opacity={0.6} />
        <Line x1="4" y1="14" x2="1" y2="14" stroke="#c87941" strokeWidth="1.5" />
        <Line x1="27" y1="14" x2="24" y2="14" stroke="#c87941" strokeWidth="1.5" />
      </Svg>
    );
  }
  if (disc === 'drive') {
    return (
      <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
        <Rect x="3" y="10" width="22" height="8" rx="3" stroke="#4a9eff" strokeWidth="1.5" fill="none" />
        <Path d="M17 9L23 14L17 19" stroke="#4a9eff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="9" cy="14" r="2" fill="#4a9eff" opacity={0.5} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="14" r="8" stroke="#4ecb8d" strokeWidth="1.5" fill="none" />
      <Path d="M10 14L14 10L18 14L14 18Z" fill="#4ecb8d" opacity={0.7} />
    </Svg>
  );
}

function DisciplineLabel() {
  const disc = usePlayerStore(s => s.discipline);
  if (!disc) return null;
  const label = DISCIPLINE_LABELS[disc];
  const color = disc === 'systems' ? Colors.amber : disc === 'drive' ? Colors.blue : Colors.green;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
      <DisciplineIcon disc={disc} />
      <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const {
    sfxEnabled, setSfxEnabled,
    musicEnabled, setMusicEnabled,
    hapticsEnabled, setHapticsEnabled,
    cogsHintsEnabled, setCogsHintsEnabled,
    notificationsEnabled, setNotificationsEnabled,
  } = useSettingsStore();
  const [forceShowTutorial, setForceShowTutorial] = useState(false);

  const sectorGroups = useMemo(() => {
    const sectorMap = new Map<string, { id: string; sector: string }[]>();
    for (const level of ALL_LEVELS) {
      const sectorName = level.sector === 'axiom' ? 'THE AXIOM'
        : level.sector === 'kepler' ? 'KEPLER BELT'
        : level.sector === 'nova' ? 'NOVA RING'
        : level.sector.toUpperCase();
      if (!sectorMap.has(sectorName)) sectorMap.set(sectorName, []);
      sectorMap.get(sectorName)!.push({ id: level.id, sector: level.sector });
    }
    return Array.from(sectorMap, ([sector, ids]) => ({ sector, ids }));
  }, []);

  // Hydrate force-show toggle
  useEffect(() => {
    AsyncStorage.getItem('axiom_tutorial_force_show').then(v => {
      setForceShowTutorial(v === '1');
    });
  }, []);

  const screenOpacity = useSharedValue(0);
  const headerReveal = useSharedValue(0);
  const cogsReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
    headerReveal.value = withTiming(1, { duration: 600 });
    cogsReveal.value = withDelay(950, withTiming(1, { duration: 500 }));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const headerRevealStyle = useAnimatedStyle(() => ({ opacity: headerReveal.value }));
  const cogsRevealStyle = useAnimatedStyle(() => ({ opacity: cogsReveal.value }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={7} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, headerRevealStyle]}>
          <View style={styles.backBtn} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>AXIOM SYSTEM</Text>
            <Text style={styles.headerTitle}>SETTINGS</Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Profile card */}
        <Animated.View style={[styles.profileCard, headerRevealStyle]}>
          <LinearGradient
            colors={['rgba(26,58,92,0.7)', 'rgba(10,22,40,0.9)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.profileBorder} />
          <View style={styles.profileAvatar}>
            <EngineerIcon size={26} color={Colors.blue} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Commander</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <R04Insignia size={18} />
              <Text style={styles.profileSub}>R04 Mechanic · 4,250 CR</Text>
            </View>
            <DisciplineLabel />
          </View>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.75}>
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Rank progression */}
        <View style={styles.rankSection}>
          <Text style={styles.rankSectionLabel}>RANK PROGRESSION</Text>
          <View style={styles.rankGrid}>
            {Array.from({ length: 10 }, (_, i) => {
              const rk = i + 1;
              const isCurrent = rk === 4;
              const isEarned = rk <= 4;
              return (
                <View
                  key={rk}
                  style={[
                    styles.rankCell,
                    isCurrent && styles.rankCellCurrent,
                  ]}
                >
                  <View style={{ opacity: isEarned ? 1 : 0.25 }}>
                    <RankInsignia rank={rk} size={20} />
                  </View>
                  <Text style={[styles.rankCellLabel, isCurrent && { color: Colors.copper }]}>
                    R{String(rk).padStart(2, '0')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Audio */}
          <SectionHeader title="AUDIO" delay={100} />
          <View style={styles.settingGroup}>
            <ToggleRow icon={<SfxIcon />} label="Sound Effects" value={sfxEnabled} onChange={setSfxEnabled} delay={150} />
            <View style={styles.divider} />
            <ToggleRow icon={<MusicRowIcon />} label="Background Music" value={musicEnabled} onChange={setMusicEnabled} delay={200} />
            <View style={styles.divider} />
            <ToggleRow icon={<HapticRowIcon />} label="Haptic Feedback" sub="Vibration on interactions" value={hapticsEnabled} onChange={setHapticsEnabled} delay={250} />
          </View>

          {/* Gameplay */}
          <SectionHeader title="GAMEPLAY" delay={300} />
          <View style={styles.settingGroup}>
            <ToggleRow icon={<CogsHintsIcon />} label="Cogs Hints" sub="Show AI tips during levels" value={cogsHintsEnabled} onChange={setCogsHintsEnabled} delay={350} />
          </View>

          {/* Account */}
          <SectionHeader title="ACCOUNT" delay={550} />
          <View style={styles.settingGroup}>
            <ToggleRow icon={<NotificationIcon size={18} color={Colors.amber} />} label="Push Notifications" value={notificationsEnabled} onChange={setNotificationsEnabled} delay={600} />
            {SHOW_DEV_TOOLS && (
              <>
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.red, fontSize: 14, fontWeight: 'bold' }}>!</Text>}
                  label="Reset Onboarding (Dev)"
                  labelColor={Colors.red}
                  sub="Clears onboarding flag — restarts flow"
                  delay={720}
                  onPress={() => {
                    Alert.alert(
                      'Reset Onboarding',
                      'This will clear the onboarding flag. Restart the app to see the onboarding flow.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset',
                          style: 'destructive',
                          onPress: async () => {
                            await AsyncStorage.removeItem('@axiom_onboarding_complete');
                            Alert.alert('Done', 'Restart the app to see onboarding.');
                          },
                        },
                      ],
                    );
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.amber, fontSize: 14, fontWeight: 'bold' }}>↻</Text>}
                  label="Trigger Return Brief (Dev)"
                  labelColor={Colors.amber}
                  sub="Sets last session to 3 days ago"
                  delay={740}
                  onPress={async () => {
                    const threeDaysAgo = Date.now() - 259200000;
                    await AsyncStorage.setItem('axiom_last_session', threeDaysAgo.toString());
                    Alert.alert('Done', 'Last session set to 72 hours ago. Reload the app to see the return brief.');
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.green, fontSize: 14 }}>◆</Text>}
                  label="Generate Today's Challenge (Dev)"
                  labelColor={Colors.green}
                  sub="Logs full challenge to console"
                  delay={760}
                  onPress={() => {
                    const { generateDailyChallenge, getTodayDateString } = require('../game/dailyChallenge');
                    const today = getTodayDateString();
                    const challenge = generateDailyChallenge(today);
                    console.log('[Challenge]', JSON.stringify({
                      date: challenge.date,
                      template: challenge.level.name,
                      difficulty: challenge.level.optimalPieces,
                      sender: challenge.sender.name,
                      reward: challenge.reward,
                      grid: `${challenge.level.gridWidth}x${challenge.level.gridHeight}`,
                      pieces: challenge.level.availablePieces.length,
                    }, null, 2));
                    Alert.alert('Challenge Generated', `${challenge.level.name}\nSender: ${challenge.sender.name}\nReward: ${challenge.reward.creditAmount} CR`);
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.green, fontSize: 14 }}>▣</Text>}
                  label="Test All Templates (Dev)"
                  labelColor={Colors.green}
                  sub="Verifies all 50 templates solvable"
                  delay={780}
                  onPress={() => {
                    const { ALL_TEMPLATES } = require('../game/challengeTemplates');
                    const { SeededRandom } = require('../game/seededRandom');
                    const { generatePuzzleFromTemplate } = require('../game/puzzleGenerator');
                    const { verifyPuzzle } = require('../game/puzzleVerifier');
                    let pass = 0;
                    let fail = 0;
                    const failures: string[] = [];
                    for (const tpl of ALL_TEMPLATES) {
                      const rng = new SeededRandom(12345);
                      const { level, solutionPieces } = generatePuzzleFromTemplate(tpl, rng, '2026-04-04');
                      const result = verifyPuzzle(level, solutionPieces);
                      if (result.solvable) { pass++; } else { fail++; failures.push(`${tpl.id}: ${result.failReason}`); }
                    }
                    console.log('[Templates]', `${pass}/${ALL_TEMPLATES.length} verified`, failures);
                    Alert.alert('Template Test', `${pass}/${ALL_TEMPLATES.length} verified\n${failures.length > 0 ? failures.slice(0, 3).join('\n') : 'All passed!'}`);
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.amber, fontSize: 14, fontWeight: 'bold' }}>↺</Text>}
                  label="Reset Tutorial Progress"
                  labelColor={Colors.amber}
                  sub="Clears all 24 tutorial AsyncStorage keys"
                  delay={790}
                  onPress={async () => {
                    const keys: string[] = [];
                    for (let i = 1; i <= 8; i++) {
                      const id = `A1-${i}`;
                      keys.push(`axiom_tutorial_step_${id}`);
                      keys.push(`axiom_tutorial_complete_${id}`);
                      keys.push(`axiom_tutorial_skipped_${id}`);
                    }
                    await AsyncStorage.multiRemove(keys);
                    Alert.alert('Tutorial Progress', 'Tutorial progress cleared.');
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.red, fontSize: 14, fontWeight: 'bold' }}>⌫</Text>}
                  label="Reset Level Progress"
                  labelColor={Colors.red}
                  sub="Clears stars, completion, and sector unlock state"
                  delay={795}
                  onPress={async () => {
                    const all = await AsyncStorage.getAllKeys();
                    const patterns = [
                      'level_complete', 'level_stars', 'sector_unlock',
                      'axiom_sector', 'kepler', 'nova', 'rift', 'void',
                      'cradle', 'completion', 'progress',
                    ];
                    const matched = all.filter(k =>
                      patterns.some(p => k.toLowerCase().includes(p)),
                    );
                    const extra = [
                      'axiom_economy_intro_seen',
                      'axiom_a13_discipline_seen',
                      'axiom_daily_challenge_last_date',
                    ];
                    const toRemove = Array.from(new Set([...matched, ...extra]));
                    await AsyncStorage.multiRemove(toRemove);
                    Alert.alert('Level Progress', 'Level progress cleared. Restart the app to see changes.');
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.amber, fontSize: 14, fontWeight: 'bold' }}>$</Text>}
                  label="Reset Economy (Dev)"
                  labelColor={Colors.amber}
                  sub="Sets credits to 100, clears level budget"
                  delay={796}
                  onPress={() => {
                    Alert.alert(
                      'Reset Economy',
                      'This will reset credits to 100 and clear the level budget.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset',
                          style: 'destructive',
                          onPress: () => {
                            useEconomyStore.setState({ credits: 100, levelBudget: 0, levelSpent: 0 });
                            Alert.alert('Done', 'Economy reset to 100 CR.');
                          },
                        },
                      ],
                    );
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.blue, fontSize: 14, fontWeight: 'bold' }}>&#x2665;</Text>}
                  label="Set Lives (Dev)"
                  labelColor={Colors.blue}
                  sub="Set lives to 0 or refill to max"
                  delay={797}
                  onPress={() => {
                    Alert.alert(
                      'Set Lives',
                      `Current: ${useLivesStore.getState().lives} lives`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Set to 0',
                          style: 'destructive',
                          onPress: () => {
                            useLivesStore.setState({ lives: 0, lastLifeLostAt: Date.now() });
                            Alert.alert('Done', 'Lives set to 0.');
                          },
                        },
                        {
                          text: 'Refill to Max',
                          onPress: () => {
                            useLivesStore.setState({ lives: 5, lastLifeLostAt: null });
                            Alert.alert('Done', 'Lives refilled to 5.');
                          },
                        },
                      ],
                    );
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.green, fontSize: 14, fontWeight: 'bold' }}>?</Text>}
                  label="Store Inspector (Dev)"
                  labelColor={Colors.green}
                  sub="Dumps all AsyncStorage keys to console"
                  delay={798}
                  onPress={async () => {
                    const allKeys = [...await AsyncStorage.getAllKeys()].sort();
                    const entries: Record<string, string | null> = {};
                    for (const key of allKeys) {
                      entries[key] = await AsyncStorage.getItem(key);
                    }
                    console.log('[Store Inspector]', JSON.stringify(entries, null, 2));
                    Alert.alert(
                      'Store Inspector',
                      `${allKeys.length} keys logged to console.\n\nKeys:\n${allKeys.join('\n')}`,
                    );
                  }}
                />
                <View style={styles.divider} />
                <ToggleRow
                  icon={<Text style={{ color: Colors.amber, fontSize: 14, fontWeight: 'bold' }}>!</Text>}
                  label="Force Show Tutorial"
                  sub="Clears skip/complete for current level on next launch"
                  value={forceShowTutorial}
                  onChange={async (v) => {
                    setForceShowTutorial(v);
                    if (v) {
                      await AsyncStorage.setItem('axiom_tutorial_force_show', '1');
                      // Clear complete/skipped so GameplayScreen does not suppress the overlay
                      const keys: string[] = [];
                      for (let i = 1; i <= 8; i++) {
                        keys.push(`axiom_tutorial_complete_A1-${i}`);
                        keys.push(`axiom_tutorial_skipped_A1-${i}`);
                        keys.push(`axiom_tutorial_step_A1-${i}`);
                      }
                      await AsyncStorage.multiRemove(keys);
                    } else {
                      await AsyncStorage.removeItem('axiom_tutorial_force_show');
                    }
                  }}
                  delay={798}
                />
                <View style={styles.divider} />
                <View style={styles.devLevelJumpWrap}>
                  <Text style={styles.devLevelJumpLabel}>JUMP TO LEVEL</Text>
                  {sectorGroups.map(group => (
                    <View key={group.sector} style={styles.devLevelJumpGroup}>
                      <Text style={styles.devLevelJumpSector}>{group.sector}</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.devLevelJumpChips}>
                        {group.ids.map(({ id, sector }) => (
                          <TouchableOpacity
                            key={id}
                            style={styles.devLevelJumpChip}
                            onPress={() => {
                              const num = parseInt(id.split('-')[1], 10) || 1;
                              const parent = navigation.getParent();
                              if (!parent) {
                                Alert.alert('Jump', 'No parent navigator available.');
                                return;
                              }
                              (parent as unknown as { navigate: (name: string, params: unknown) => void }).navigate('MissionDossier', {
                                missionId: num,
                                missionName: id,
                                iconType: sector,
                                stars: 0,
                                bestTime: '--',
                                piecesUsed: 0,
                                cogsQuote: '',
                                levelId: id,
                                nodeState: 'active',
                              });
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.devLevelJumpChipText}>{id}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ))}
                </View>
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.blue, fontSize: 14 }}>▦</Text>}
                  label="Piece Sandbox (Dev)"
                  labelColor={Colors.blue}
                  sub="Test all piece interactions in a sandbox board"
                  delay={800}
                  onPress={() => {
                    const parent = navigation.getParent();
                    parent?.navigate('PieceSandbox' as never);
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.green, fontSize: 14 }}>⟳</Text>}
                  label="Preview Next 7 Days (Dev)"
                  labelColor={Colors.green}
                  sub="Shows upcoming daily challenges"
                  delay={800}
                  onPress={() => {
                    const { generateDailyChallenge } = require('../game/dailyChallenge');
                    const days: string[] = [];
                    for (let i = 0; i < 7; i++) {
                      const d = new Date();
                      d.setDate(d.getDate() + i);
                      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      const ch = generateDailyChallenge(ds);
                      days.push(`${ds}: ${ch.level.name} (${ch.sender.type})`);
                    }
                    console.log('[Next 7 Days]', days);
                    Alert.alert('Next 7 Days', days.join('\n'));
                  }}
                />
                <View style={styles.divider} />
                <TapRow
                  icon={<Text style={{ color: Colors.red, fontSize: 14, fontWeight: 'bold' }}>X</Text>}
                  label="Factory Reset (Dev)"
                  labelColor={Colors.red}
                  sub="Clears ALL data — full fresh install"
                  delay={810}
                  onPress={() => {
                    Alert.alert(
                      'Factory Reset',
                      'This will clear ALL data: progression, economy, settings, tutorial state, onboarding, challenge history, and consequences. The app will behave like a fresh install.\n\nThis cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Reset Everything',
                          style: 'destructive',
                          onPress: async () => {
                            await AsyncStorage.clear();
                            Alert.alert('Done', 'All data cleared. Restart the app for a fresh experience.');
                          },
                        },
                      ],
                    );
                  }}
                />
              </>
            )}
          </View>

          {/* About */}
          <SectionHeader title="ABOUT" delay={750} />
          <View style={styles.settingGroup}>
            <TapRow
              icon={<ClipboardIcon size={18} color={Colors.blue} />}
              label="Version"
              value={`v0.9.${BUILD_INFO.buildNumber}${BUILD_INFO.dirty ? '*' : ''}`}
              delay={800}
            />
          </View>

          {/* Cogs credit */}
          <Animated.View style={[styles.cogsCredit, cogsRevealStyle]}>
            <CogsAvatar size="small" state="online" />
            <Text style={styles.cogsCredText}>
              Cogs AI v2.1 · All systems nominal.{'\n'}
              <Text style={styles.cogsCredSub}>The Axiom · Build 0.9.{BUILD_INFO.buildNumber}</Text>
            </Text>
          </Animated.View>
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
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted, letterSpacing: 2,
  },
  headerTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.lg, fontWeight: 'bold',
    color: Colors.starWhite, letterSpacing: 2,
  },
  headerSpacer: { width: 36 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.md,
    minHeight: 72,
  },
  profileBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.22)',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(74,158,255,0.12)',
    borderWidth: 1.5,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarEmoji: { fontSize: 24 },
  profileInfo: { flex: 1 },
  profileName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.starWhite,
  },
  profileSub: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted,
    letterSpacing: 0.5, marginTop: 2,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  editBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 9, color: Colors.muted, letterSpacing: 1,
  },
  rankSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  rankSectionLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    color: Colors.copper,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  rankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rankCell: {
    width: '18%',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  rankCellCurrent: {
    backgroundColor: 'rgba(200,121,65,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.25)',
  },
  rankCellLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 6,
    color: Colors.dim,
    letterSpacing: 0.5,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
    letterSpacing: 2,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  settingGroup: {
    backgroundColor: 'rgba(10,18,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  tapRowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowIconWrap: { width: 30, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowLabel: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.md, color: Colors.starWhite,
  },
  rowSub: {
    fontFamily: Fonts.exo2, fontSize: 11, color: Colors.dim, marginTop: 1,
  },
  rowValue: {
    fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.muted,
  },
  chevron: {
    fontFamily: Fonts.orbitron, fontSize: 18, color: Colors.dim,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(74,158,255,0.08)',
    marginLeft: Spacing.xxxl + Spacing.md,
  },
  devLevelJumpWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  devLevelJumpLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.amber,
    letterSpacing: 2,
  },
  devLevelJumpGroup: {
    gap: 6,
  },
  devLevelJumpSector: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  devLevelJumpChips: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: Spacing.lg,
  },
  devLevelJumpChip: {
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.35)',
    backgroundColor: 'rgba(0,212,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  devLevelJumpChipText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    letterSpacing: 1,
  },
  cogsCredit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.md,
  },
  cogsCredEmoji: { fontSize: 20 },
  cogsCredText: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.dim,
    letterSpacing: 0.5, lineHeight: 16,
  },
  cogsCredSub: { color: Colors.dim },
});
