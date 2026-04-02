import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
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
import StarField from '../components/StarField';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

type Props = {
  navigation: BottomTabNavigationProp<TabParamList, 'Settings'>;
};

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
  emoji,
  label,
  sub,
  value,
  onChange,
  delay,
}: {
  emoji: string;
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
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.steel, true: Colors.copper }}
        thumbColor={value ? Colors.amber : Colors.muted}
      />
    </Animated.View>
  );
}

function TapRow({
  emoji,
  label,
  sub,
  value,
  chevron,
  delay,
  onPress,
}: {
  emoji: string;
  label: string;
  sub?: string;
  value?: string;
  chevron?: boolean;
  delay: number;
  onPress?: () => void;
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
        <Text style={styles.rowEmoji}>{emoji}</Text>
        <View style={styles.rowInfo}>
          <Text style={styles.rowLabel}>{label}</Text>
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
            <Text style={styles.profileAvatarEmoji}>👨‍🚀</Text>
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
            <ToggleRow emoji="🔊" label="Sound Effects" value={sfx} onChange={setSfx} delay={150} />
            <View style={styles.divider} />
            <ToggleRow emoji="🎵" label="Background Music" value={music} onChange={setMusic} delay={200} />
            <View style={styles.divider} />
            <ToggleRow emoji="📳" label="Haptic Feedback" sub="Vibration on interactions" value={haptics} onChange={setHaptics} delay={250} />
          </View>

          {/* Gameplay */}
          <SectionHeader title="GAMEPLAY" delay={300} />
          <View style={styles.settingGroup}>
            <ToggleRow emoji="🤖" label="Cogs Hints" sub="Show AI tips during levels" value={cogsHints} onChange={setCogsHints} delay={350} />
            <View style={styles.divider} />
            <ToggleRow emoji="✨" label="Reduce Motion" sub="Disable parallax and animations" value={reducedMotion} onChange={setReducedMotion} delay={400} />
            <View style={styles.divider} />
            <TapRow emoji="🌐" label="Language" value="English" chevron delay={450} />
            <View style={styles.divider} />
            <TapRow emoji="🎮" label="Control Scheme" value="Standard" chevron delay={500} />
          </View>

          {/* Account */}
          <SectionHeader title="ACCOUNT" delay={550} />
          <View style={styles.settingGroup}>
            <ToggleRow emoji="🔔" label="Push Notifications" value={notifications} onChange={setNotifications} delay={600} />
            <View style={styles.divider} />
            <TapRow emoji="☁️" label="Cloud Save" sub="Last synced: just now" chevron delay={650} />
            <View style={styles.divider} />
            <TapRow emoji="🔒" label="Privacy Settings" chevron delay={700} />
          </View>

          {/* About */}
          <SectionHeader title="ABOUT" delay={750} />
          <View style={styles.settingGroup}>
            <TapRow emoji="📋" label="Version" value="v0.1.0 (dev)" delay={800} />
            <View style={styles.divider} />
            <TapRow emoji="📜" label="Terms of Service" chevron delay={850} />
            <View style={styles.divider} />
            <TapRow emoji="🛡️" label="Privacy Policy" chevron delay={900} />
          </View>

          {/* Cogs credit */}
          <Animated.View style={[styles.cogsCredit, cogsRevealStyle]}>
            <Text style={styles.cogsCredEmoji}>🤖</Text>
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
  rowEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
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
