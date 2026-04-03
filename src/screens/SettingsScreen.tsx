import React, { useEffect, useState } from 'react';
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
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '../navigation/TabNavigator';
import StarField from '../components/StarField';
import CogsAvatar from '../components/CogsAvatar';
import {
  VolumeIcon,
  MusicIcon,
  HapticIcon,
  NotificationIcon,
  GlobeIcon,
  CloudIcon,
  GamepadIcon,
  ClipboardIcon,
  ScrollDocIcon,
  BulbIcon,
} from '../components/icons/SettingsIcons';
import { ShieldIcon } from '../components/icons/PartIcons';
import PadlockIcon from '../components/icons/PadlockIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

type Props = {
  navigation: BottomTabNavigationProp<TabParamList, 'Settings'>;
};

// ─── Custom Animated Toggle ──────────────────────────────────────────────────

const TOGGLE_WIDTH = 48;
const TOGGLE_HEIGHT = 26;
const THUMB_SIZE = 20;
const WIRE_NODE_SIZE = 8;
const THUMB_TRAVEL = TOGGLE_WIDTH - THUMB_SIZE - 6; // 3px padding each side

function CircuitToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 280 });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', Colors.blue],
    );
    return {
      backgroundColor: bgColor,
      borderWidth: interpolate(progress.value, [0, 1], [0, 1.5]),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', 'rgba(74,158,255,0.4)'],
      ),
      opacity: progress.value,
    };
  });

  // The dead circuit wire (visible when OFF)
  const wireStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0]),
  }));

  // Wire node (left dot visible when OFF)
  const nodeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0]),
    transform: [
      { scale: interpolate(progress.value, [0, 0.4], [1, 0.5]) },
    ],
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, THUMB_TRAVEL]) },
    ],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(58,80,112,0.6)', '#ffffff'],
    ),
    width: interpolate(progress.value, [0, 1], [WIRE_NODE_SIZE, THUMB_SIZE]),
    height: interpolate(progress.value, [0, 1], [WIRE_NODE_SIZE, THUMB_SIZE]),
    borderRadius: interpolate(progress.value, [0, 1], [WIRE_NODE_SIZE / 2, THUMB_SIZE / 2]),
  }));

  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      style={toggleStyles.container}
    >
      {/* Dead circuit wire line (OFF state) */}
      <Animated.View style={[toggleStyles.wireLine, wireStyle]} />

      {/* Wire node (OFF state left dot) */}
      <Animated.View style={[toggleStyles.wireNode, nodeStyle]} />

      {/* Filled track (ON state) */}
      <Animated.View style={[toggleStyles.track, trackStyle]} />

      {/* Thumb / node */}
      <Animated.View style={[toggleStyles.thumb, thumbStyle]} />
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    justifyContent: 'center',
  },
  wireLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(58,80,112,0.6)',
    top: (TOGGLE_HEIGHT - 1.5) / 2,
  },
  wireNode: {
    position: 'absolute',
    left: 3,
    top: (TOGGLE_HEIGHT - WIRE_NODE_SIZE) / 2,
    width: WIRE_NODE_SIZE,
    height: WIRE_NODE_SIZE,
    borderRadius: WIRE_NODE_SIZE / 2,
    backgroundColor: 'rgba(58,80,112,0.4)',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: TOGGLE_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    left: 3,
    top: (TOGGLE_HEIGHT - THUMB_SIZE) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
});

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
      <CircuitToggle value={value} onValueChange={onChange} />
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

export default function SettingsScreen(_: Props) {
  const [sfx, setSfx] = useState(true);
  const [music, setMusic] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [cogsHints, setCogsHints] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

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
            <CogsAvatar size="small" state="online" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Commander</Text>
            <Text style={styles.profileSub}>Rank: Engineer IV · 4,250 CR</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.75}>
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Audio */}
          <SectionHeader title="AUDIO" delay={100} />
          <View style={styles.settingGroup}>
            <ToggleRow icon={<VolumeIcon size={18} color={Colors.blue} />} label="Sound Effects" value={sfx} onChange={setSfx} delay={150} />
            <View style={styles.divider} />
            <ToggleRow icon={<MusicIcon size={18} color={Colors.blue} />} label="Background Music" value={music} onChange={setMusic} delay={200} />
            <View style={styles.divider} />
            <ToggleRow icon={<HapticIcon size={18} color={Colors.blue} />} label="Haptic Feedback" sub="Vibration on interactions" value={haptics} onChange={setHaptics} delay={250} />
          </View>

          {/* Gameplay */}
          <SectionHeader title="GAMEPLAY" delay={300} />
          <View style={styles.settingGroup}>
            <ToggleRow icon={<CogsAvatar size="small" state="online" />} label="Cogs Hints" sub="Show AI tips during levels" value={cogsHints} onChange={setCogsHints} delay={350} />
            <View style={styles.divider} />
            <ToggleRow icon={<BulbIcon size={18} color={Colors.amber} />} label="Reduce Motion" sub="Disable parallax and animations" value={reducedMotion} onChange={setReducedMotion} delay={400} />
            <View style={styles.divider} />
            <TapRow icon={<GlobeIcon size={18} color={Colors.blue} />} label="Language" value="English" chevron delay={450} />
            <View style={styles.divider} />
            <TapRow icon={<GamepadIcon size={18} color={Colors.blue} />} label="Control Scheme" value="Standard" chevron delay={500} />
          </View>

          {/* Account */}
          <SectionHeader title="ACCOUNT" delay={550} />
          <View style={styles.settingGroup}>
            <ToggleRow icon={<NotificationIcon size={18} color={Colors.amber} />} label="Push Notifications" value={notifications} onChange={setNotifications} delay={600} />
            <View style={styles.divider} />
            <TapRow icon={<CloudIcon size={18} color={Colors.blue} />} label="Cloud Save" sub="Last synced: just now" chevron delay={650} />
            <View style={styles.divider} />
            <TapRow icon={<PadlockIcon size={18} color={Colors.blue} />} label="Privacy Settings" chevron delay={700} />
            {__DEV__ && (
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
              </>
            )}
          </View>

          {/* About */}
          <SectionHeader title="ABOUT" delay={750} />
          <View style={styles.settingGroup}>
            <TapRow icon={<ClipboardIcon size={18} color={Colors.blue} />} label="Version" value="v0.1.0 (dev)" delay={800} />
            <View style={styles.divider} />
            <TapRow icon={<ScrollDocIcon size={18} color={Colors.blue} />} label="Terms of Service" chevron delay={850} />
            <View style={styles.divider} />
            <TapRow icon={<ShieldIcon size={18} color={Colors.blue} />} label="Privacy Policy" chevron delay={900} />
          </View>

          {/* Cogs credit */}
          <Animated.View style={[styles.cogsCredit, cogsRevealStyle]}>
            <CogsAvatar size="small" state="online" />
            <Text style={styles.cogsCredText}>
              Cogs AI v2.1 · All systems nominal.{'\n'}
              <Text style={styles.cogsCredSub}>The Axiom · Build 0.1.0</Text>
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
  rowIconWrap: { width: 26, alignItems: 'center', justifyContent: 'center' },
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
