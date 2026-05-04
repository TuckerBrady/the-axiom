import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import CogsAvatar from '../components/CogsAvatar';
import { Button } from '../components/Button';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useLivesStore } from '../store/livesStore';

const DAILY_REWARD_KEY = '@axiom_last_daily_reward_date';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DailyReward'>;
  route: RouteProp<RootStackParamList, 'DailyReward'>;
};

// ─── Reward schedule ────────────────────────────────────────────────────────

type RewardDay = {
  day: number;
  type: 'credits' | 'life' | 'debug' | 'hint' | 'combo';
  label: string;
  amount: string;
  cogsLine: string;
};

const REWARDS: RewardDay[] = [
  { day: 1, type: 'credits', label: '50 CR', amount: '50', cogsLine: 'Your daily allocation. Do not spend it on anything unnecessary.' },
  { day: 2, type: 'life', label: '1 Extra Life', amount: '1', cogsLine: 'One life. Use it better than the last one.' },
  { day: 3, type: 'credits', label: '75 CR', amount: '75', cogsLine: 'More than yesterday. You are making adequate progress.' },
  { day: 4, type: 'debug', label: '1 Debug Credit', amount: '1', cogsLine: 'This allows you to see where you went wrong. I suspect you already know.' },
  { day: 5, type: 'credits', label: '100 CR', amount: '100', cogsLine: 'Day five. I have updated my assessment of your commitment.' },
  { day: 6, type: 'life', label: '2 Extra Lives', amount: '2', cogsLine: 'Two lives. I am not going soft. The mathematics simply worked out this way.' },
  { day: 7, type: 'combo', label: '150 CR + 1 Hint', amount: '150+1', cogsLine: 'Seven days. That is either dedication or habit. Either is acceptable.' },
];

const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── Reward icon ─────────────────────────────────────────────────────────────

function RewardIcon({ type, size = 48 }: { type: string; size?: number }) {
  switch (type) {
    case 'credits':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" fill="none" stroke={Colors.amber} strokeWidth="2" />
          <Circle cx="12" cy="12" r="5" fill={Colors.amber} opacity={0.3} />
          <Path d="M12 7v10M7 12h10" stroke={Colors.amber} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
      );
    case 'life':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={Colors.blue}
            stroke={Colors.blue}
            strokeWidth="1"
          />
        </Svg>
      );
    case 'debug':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={Colors.green} strokeWidth="2" />
          <Path d="M8 12h8M12 8v8" stroke={Colors.green} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'hint':
    case 'combo':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="9" r="6" fill="none" stroke={Colors.copper} strokeWidth="2" />
          <Path d="M10 15h4v4h-4z" fill={Colors.copper} opacity={0.4} />
          <Path d="M12 6v4" stroke={Colors.copper} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="12" cy="9" r="2" fill={Colors.copper} opacity={0.5} />
        </Svg>
      );
    default:
      return null;
  }
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DailyRewardScreen({ navigation, route }: Props) {
  const { addCredits } = useLivesStore();
  const fromReturningSession = route.params?.fromReturningSession ?? false;

  // Determine streak day (1–7 cycling)
  const dayOfYear = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, []);

  const streakDay = ((dayOfYear - 1) % 7) + 1; // 1–7
  const reward = REWARDS[streakDay - 1];

  // Animations
  const screenOpacity = useSharedValue(0);
  const rewardScale = useSharedValue(0);

  useEffect(() => {
    console.log('[BUILD24-DIAG] DailyRewardScreen:mount', { timestamp: Date.now() });
    screenOpacity.value = withTiming(1, { duration: 400 });
    rewardScale.value = withDelay(
      600,
      withSpring(1, { damping: 8, stiffness: 120 }),
    );
    // No async reads on this screen — dataLoaded fires synchronously with mount
    console.log('[BUILD24-DIAG] DailyRewardScreen:dataLoaded', { timestamp: Date.now() });
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const rewardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScale.value }],
    opacity: rewardScale.value,
  }));

  const handleCollect = async () => {
    // Apply reward
    switch (reward.type) {
      case 'credits':
        addCredits(parseInt(reward.amount, 10));
        break;
      case 'life':
        // Lives are handled via livesStore but not adding lives beyond max
        // For now just grant the life reward
        break;
      case 'combo':
        addCredits(150);
        break;
      default:
        break;
    }
    // Mark today's transmission as collected. Done here (not on entry)
    // so an aborted launch never silently consumes the day's reward.
    try {
      await AsyncStorage.setItem(DAILY_REWARD_KEY, getTodayString());
    } catch (error) {
      console.error('[BUILD24-DIAG] AsyncStorage failed', {
        operation: 'setItem',
        key: DAILY_REWARD_KEY,
        error: (error as Error).message,
        timestamp: Date.now(),
      });
    }
    // Returning sessions still see their ReturnBrief after collecting.
    navigation.replace(fromReturningSession ? 'ReturnBrief' : 'Tabs');
  };

  return (
    <Animated.View style={[s.root, screenStyle]}>
      <LinearGradient
        colors={['rgba(6,9,15,1)', 'rgba(10,22,40,0.98)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.content}>
        {/* COGS avatar */}
        <Animated.View entering={FadeIn.delay(200).duration(500)} style={s.avatarWrap}>
          <CogsAvatar size="medium" state="online" />
        </Animated.View>

        {/* Title */}
        <Text style={s.title}>DAILY TRANSMISSION</Text>
        <Text style={s.subtitle}>Day {streakDay} of 7</Text>

        {/* COGS line */}
        <Animated.View entering={FadeIn.delay(400).duration(400)} style={s.cogsLineWrap}>
          <Text style={s.cogsLine}>{'"'}{reward.cogsLine}{'"'}</Text>
        </Animated.View>

        {/* 7-day streak calendar */}
        <View style={s.calendarRow}>
          {REWARDS.map((r, i) => {
            const dayNum = i + 1;
            const isPast = dayNum < streakDay;
            const isToday = dayNum === streakDay;
            const isFuture = dayNum > streakDay;
            return (
              <View
                key={i}
                style={[
                  s.calendarDay,
                  isToday && s.calendarDayToday,
                  isPast && s.calendarDayPast,
                ]}
              >
                <Text style={[s.calendarDayLabel, isFuture && { color: Colors.dim }]}>
                  {DAY_NAMES[i]}
                </Text>
                {isPast && (
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M5 12l5 5L20 7" stroke={Colors.green} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
                {isToday && (
                  <View style={s.todayDot} />
                )}
                {isFuture && (
                  <View style={s.futureDot} />
                )}
              </View>
            );
          })}
        </View>

        {/* Reward pod */}
        <Animated.View style={[s.rewardPod, rewardStyle]}>
          <LinearGradient
            colors={['rgba(26,58,92,0.7)', 'rgba(10,22,40,0.95)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={s.rewardBorder} />
          <RewardIcon type={reward.type} size={56} />
          <Text style={s.rewardLabel}>{reward.label}</Text>
        </Animated.View>

        {/* Collect button */}
        <Button
          variant="gradient"
          label="COLLECT"
          onPress={handleCollect}
          style={s.collectBtn}
        />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: Colors.blue,
    backgroundColor: 'rgba(74,158,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.starWhite,
    letterSpacing: 3,
  },
  subtitle: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  cogsLineWrap: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  cogsLine: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  calendarRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: Spacing.md,
  },
  calendarDay: {
    width: 38,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    backgroundColor: 'rgba(10,18,30,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  calendarDayToday: {
    borderColor: Colors.copper,
    backgroundColor: 'rgba(200,121,65,0.12)',
  },
  calendarDayPast: {
    borderColor: 'rgba(78,203,141,0.3)',
    backgroundColor: 'rgba(78,203,141,0.08)',
  },
  calendarDayLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.copper,
  },
  futureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dim,
    opacity: 0.4,
  },
  rewardPod: {
    width: '80%',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    gap: Spacing.md,
  },
  rewardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200,121,65,0.3)',
  },
  rewardLabel: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.amber,
    letterSpacing: 2,
  },
  collectBtn: {
    width: '100%',
    marginTop: Spacing.md,
  },
});
