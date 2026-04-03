import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Rect, Path, G } from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingCodexEntry'>;
};

const SECTIONS = [
  {
    title: 'WHAT IT IS',
    text: 'A mechanical belt mechanism that accepts an item on one end and delivers it to the other. It has no intelligence. It does not need any.',
  },
  {
    title: 'WHAT IT DOES',
    text: 'The Conveyor moves a signal or component exactly one position forward along a defined axis. Output occurs at the far end. No branching. No delay.',
  },
  {
    title: 'WHY IT MATTERS',
    text: 'Without the Conveyor, isolated components cannot communicate. It is the connective tissue of every working circuit aboard this vessel.',
  },
  {
    title: 'C.O.G.S NOTES',
    text: '"It moves things forward. A quality I find underrated."',
    isCogs: true,
  },
];

// ─── Conveyor SVG Icon ─────────────────────────────────────────────────────────

function ConveyorIcon({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 120 72">
      {/* Belt body */}
      <Rect x="10" y="20" width="100" height="32" rx="16" fill="#0e1f36" stroke={Colors.copper} strokeWidth="2" />
      {/* Left pulley */}
      <Circle cx="26" cy="36" r="16" fill="#0a1628" stroke={Colors.copper} strokeWidth="2" />
      <Circle cx="26" cy="36" r="8" fill="#0e1f36" stroke={Colors.copperLight} strokeWidth="1.5" />
      <Circle cx="26" cy="36" r="3" fill={Colors.copper} />
      {/* Right pulley */}
      <Circle cx="94" cy="36" r="16" fill="#0a1628" stroke={Colors.copper} strokeWidth="2" />
      <Circle cx="94" cy="36" r="8" fill="#0e1f36" stroke={Colors.copperLight} strokeWidth="1.5" />
      <Circle cx="94" cy="36" r="3" fill={Colors.copper} />
      {/* Belt surface lines */}
      <Path d="M 26 20 L 94 20" stroke={Colors.copperLight} strokeWidth="1" strokeOpacity="0.4" />
      <Path d="M 26 52 L 94 52" stroke={Colors.copperLight} strokeWidth="1" strokeOpacity="0.4" />
      {/* Direction arrows */}
      <Path d="M 48 30 L 56 36 L 48 42" stroke={Colors.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M 58 30 L 66 36 L 58 42" stroke={Colors.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
    </Svg>
  );
}

// ─── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  text,
  isCogs,
  delay,
}: {
  title: string;
  text: string;
  isCogs?: boolean;
  delay: number;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delay, withTiming(1, { duration: 500 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 12 }],
  }));
  return (
    <Animated.View style={[s.sectionCard, isCogs && s.sectionCardCogs, style]}>
      <Text style={[s.sectionTitle, isCogs && { color: Colors.blue }]}>{title}</Text>
      <Text style={[s.sectionText, isCogs && s.sectionTextCogs]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function CodexEntryScreen({ navigation }: Props) {
  const screenOpacity = useSharedValue(0);
  const iconReveal = useSharedValue(0);
  const iconFloat = useSharedValue(0);
  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
    iconReveal.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));

    iconFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconReveal.value,
    transform: [
      { translateY: iconFloat.value },
      { scale: 0.8 + iconReveal.value * 0.2 },
    ],
  }));
  return (
    <Animated.View style={[s.root, screenStyle]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerLabel}>CODEX — NEW ENTRY UNLOCKED</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Piece icon hero */}
        <View style={s.heroSection}>
          <Animated.View style={iconStyle}>
            <ConveyorIcon size={100} />
          </Animated.View>

          {/* Title */}
          <Text style={s.pieceTitle}>CONVEYOR</Text>

          {/* Type badge */}
          <View style={s.typeBadge}>
            <Text style={s.typeBadgeText}>PHYSICS PIECE</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Dossier sections */}
        <View style={s.sections}>
          {SECTIONS.map((sec, i) => (
            <SectionCard
              key={i}
              title={sec.title}
              text={sec.text}
              isCogs={sec.isCogs}
              delay={400 + i * 200}
            />
          ))}
        </View>

        {/* Logged to Codex button */}
        <TouchableOpacity
          style={s.logBtn}
          onPress={() => navigation.navigate('Introduction')}
          activeOpacity={0.85}
        >
          <Text style={s.logBtnText}>LOGGED TO CODEX  →</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,121,65,0.2)',
    alignItems: 'center',
  },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
    letterSpacing: 2,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    position: 'relative',
  },
  pieceTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.display,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 4,
    marginTop: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(200,121,65,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.35)',
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  typeBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.copper,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(74,158,255,0.1)',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sections: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  sectionCard: {
    backgroundColor: 'rgba(10,22,40,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.12)',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  sectionCardCogs: {
    backgroundColor: 'rgba(74,158,255,0.05)',
    borderColor: 'rgba(74,158,255,0.2)',
  },
  sectionTitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.copper,
    letterSpacing: 2,
  },
  sectionText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    lineHeight: 22,
  },
  sectionTextCogs: {
    fontStyle: 'italic',
    color: Colors.starWhite,
  },
  logBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    backgroundColor: Colors.copper,
    borderRadius: 12,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  logBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.void,
    letterSpacing: 3,
  },
});
