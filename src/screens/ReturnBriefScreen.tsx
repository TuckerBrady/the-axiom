import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import CogsAvatar from '../components/CogsAvatar';
import type { CogsState } from '../components/CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useProgressionStore, AXIOM_TOTAL_LEVELS } from '../store/progressionStore';
import { useLivesStore, MAX_LIVES_COUNT, REGEN_INTERVAL_MS } from '../store/livesStore';
import { AXIOM_LEVELS } from '../game/levels';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReturnBrief'>;
};

// ─── Content generation ──────────────────────────────────────────────────────

function getTimeAwayLine(lastSession: number | null): string {
  if (!lastSession) return 'Systems are nominal. Your previous session has been logged.';
  const elapsed = Date.now() - lastSession;
  const hours = elapsed / (1000 * 60 * 60);
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'You were not gone long. I barely updated my estimates.';
  if (hours < 8) return 'Short absence. The Axiom held together without incident.';
  if (hours < 24) return 'Several hours offline. Nothing critical. I handled the maintenance log.';
  if (days <= 3) return `You have been away for ${days} day${days > 1 ? 's' : ''}. The Axiom managed. As it tends to.`;
  if (days <= 7) return `It has been ${days} days. I began to wonder. Briefly.`;
  return 'I had nearly reclassified you as previous crew. Welcome back.';
}

function getRepairLine(axiomCompleted: number, keplerCompleted: number): string {
  if (axiomCompleted === 0) return 'All ship systems remain offline. The repairs are waiting on you.';
  if (axiomCompleted <= 3) return `${axiomCompleted} of 8 systems repaired. The Axiom is holding together.`;
  if (axiomCompleted <= 6) return `${axiomCompleted} of 8 systems operational. We are more than halfway there.`;
  if (axiomCompleted === 7) return 'Seven systems restored. One repair remains. Bridge systems.';
  if (keplerCompleted >= 5) {
    const pct = Math.round((keplerCompleted / 8) * 100);
    return `Kepler Belt operations are ${pct}% complete. The inhabitants are grateful.`;
  }
  return 'The Axiom is fully operational. Kepler Belt is your current focus.';
}

function getLivesLine(lives: number, lastLifeLostAt: number | null, lastSession: number | null): string | null {
  if (lives >= MAX_LIVES_COUNT && !lastLifeLostAt) return null; // already full, skip

  // Check if lives regenerated during absence
  if (lastLifeLostAt && lastSession && lives >= MAX_LIVES_COUNT) {
    return 'Your lives have regenerated during your absence. You are welcome.';
  }
  if (lives === 0) return 'You are out of operational capacity. The store has options.';
  if (lives < MAX_LIVES_COUNT) {
    const nextRegenMin = lastLifeLostAt
      ? Math.max(0, Math.ceil((REGEN_INTERVAL_MS - (Date.now() - lastLifeLostAt)) / 60000))
      : 30;
    return `${lives} of 5 lives restored. ${MAX_LIVES_COUNT - lives} more regenerate in ${nextRegenMin} minutes.`;
  }
  return null;
}

function getActiveMissionLine(axiomCompleted: number, keplerCompleted: number): string {
  if (axiomCompleted === 0) return 'A1-1 Emergency Power is queued. The ship needs its lights on first.';
  if (axiomCompleted < AXIOM_TOTAL_LEVELS) {
    const nextIdx = axiomCompleted;
    const level = AXIOM_LEVELS[nextIdx];
    return `Mission ${level.id} awaits. ${level.name} requires repair.`;
  }
  if (keplerCompleted > 0) return `Your current mission is 2-${keplerCompleted + 1}. Kepler Belt is counting on you.`;
  return 'Kepler Station has been attempting contact. They require your attention.';
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ReturnBriefScreen({ navigation }: Props) {
  const { getSectorCompletedCount } = useProgressionStore();
  const { lives, lastLifeLostAt, regenerate } = useLivesStore();

  // Regenerate lives on return
  useEffect(() => { regenerate(); }, []);

  const axiomCompleted = getSectorCompletedCount('A1-');
  const keplerCompleted = getSectorCompletedCount('2-');

  const [lastSession, setLastSession] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('axiom_last_session').then(val => {
      setLastSession(val ? parseInt(val, 10) : null);
      setReady(true);
    });
  }, []);

  // Build lines
  const lines: { text: string; isMission?: boolean }[] = [];
  if (ready) {
    lines.push({ text: getTimeAwayLine(lastSession) });
    lines.push({ text: getRepairLine(axiomCompleted, keplerCompleted) });
    const livesLine = getLivesLine(lives, lastLifeLostAt, lastSession);
    if (livesLine) lines.push({ text: livesLine });
    lines.push({ text: getActiveMissionLine(axiomCompleted, keplerCompleted), isMission: true });
  }

  // Animations
  const screenFade = useRef(new Animated.Value(0)).current;
  const cogsScale = useRef(new Animated.Value(0.92)).current;
  const cogsFade = useRef(new Animated.Value(0)).current;
  // Always allocate 4 animated values (max possible lines) to avoid
  // undefined access when lines array grows after first render
  const lineAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const tapFade = useRef(new Animated.Value(0)).current;
  const exitFade = useRef(new Animated.Value(1)).current;
  const [cogsState, setCogsState] = useState<CogsState>('engaged');
  const dismissed = useRef(false);

  useEffect(() => {
    if (!ready || lines.length === 0) return;

    // Screen fade in
    Animated.timing(screenFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // COGS avatar entrance
    Animated.parallel([
      Animated.timing(cogsFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cogsScale, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Cascade lines
    const lineDelay = 1000; // start after COGS appears
    lines.forEach((_, i) => {
      setTimeout(() => {
        if (dismissed.current) return;
        Animated.timing(lineAnims[i], { toValue: 1, duration: 400, useNativeDriver: true }).start();
        // Switch COGS state after second line
        if (i === 1) setCogsState('online');
      }, lineDelay + i * 600);
    });

    // "TAP ANYWHERE" appears after last line
    const tapDelay = lineDelay + lines.length * 600 + 400;
    setTimeout(() => {
      if (dismissed.current) return;
      Animated.timing(tapFade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }, tapDelay);

    // Auto-advance 6s after last line
    const autoTimer = setTimeout(() => {
      if (!dismissed.current) goToHub();
    }, tapDelay + 6000);

    return () => clearTimeout(autoTimer);
  }, [ready]);

  const goToHub = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.timing(exitFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      navigation.replace('Tabs');
    });
  };

  if (!ready) return <View style={st.root} />;

  return (
    <TouchableWithoutFeedback onPress={goToHub}>
      <Animated.View style={[st.root, { opacity: Animated.multiply(screenFade, exitFade) }]}>
        {/* COGS Avatar */}
        <Animated.View style={[st.avatarWrap, { opacity: cogsFade, transform: [{ scale: cogsScale }] }]}>
          <CogsAvatar size="large" state={cogsState} />
        </Animated.View>

        {/* Brief lines */}
        <View style={st.linesWrap}>
          {lines.map((line, i) => (
            <Animated.Text
              key={i}
              style={[
                st.lineText,
                line.isMission && { color: Colors.copper },
                { opacity: lineAnims[i] ?? 0 },
              ]}
            >
              {line.text}
            </Animated.Text>
          ))}
        </View>

        {/* Tap to continue */}
        <Animated.Text style={[st.tapText, { opacity: tapFade }]}>
          TAP ANYWHERE TO CONTINUE
        </Animated.Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06090f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  avatarWrap: {
    marginBottom: Spacing.xxl,
  },
  linesWrap: {
    maxWidth: 320,
    gap: 20,
  },
  lineText: {
    fontFamily: Fonts.exo2,
    fontSize: 14,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#e8f0ff',
    lineHeight: 14 * 1.6,
  },
  tapText: {
    position: 'absolute',
    bottom: 60,
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: '#3a5070',
    letterSpacing: 3,
  },
});
