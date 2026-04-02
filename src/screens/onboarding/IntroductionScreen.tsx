import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Introduction'>;
};

const CARDS = [
  {
    label: 'INTRODUCTION 01 / 03',
    text: 'Core systems restored. Propulsion returning to nominal. I do not, however, have you in my manifest.',
  },
  {
    label: 'INTRODUCTION 02 / 03',
    text: 'I am C.O.G.S Unit 7. Cognitive Operations and Guidance System. I have been assigned to this vessel for four years, two months, and eleven days.',
  },
  {
    label: 'INTRODUCTION 03 / 03',
    text: 'You are not the operator I was expecting. That is unusual. I will need something to call you.',
  },
];

function DialogueCard({
  card,
  visible,
  isLast,
  onPress,
}: {
  card: typeof CARDS[0];
  visible: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 400 });
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }
  }, [visible]);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  if (!visible) return null;
  return (
    <Animated.View style={cardStyle}>
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
        <View style={s.cardBorderLeft} />
        <View style={s.cardContent}>
          <Text style={s.cardLabel}>{card.label}</Text>
          <Text style={s.cardText}>{card.text}</Text>
          <Text style={s.cardTap}>
            {isLast ? 'TAP TO CONTINUE →' : 'TAP TO CONTINUE →'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function IntroductionScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);

  const screenOpacity = useSharedValue(0);
  const avatarReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
    avatarReveal.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarReveal.value,
    transform: [{ translateY: (1 - avatarReveal.value) * 20 }],
  }));

  const handlePress = () => {
    if (step < CARDS.length - 1) {
      setStep(s => s + 1);
    } else {
      navigation.navigate('CharacterName');
    }
  };

  return (
    <Animated.View style={[s.root, screenStyle]}>
      {/* Status bar */}
      <View style={s.statusBar}>
        <Text style={s.statusLabel}>C.O.G.S UNIT 7 — SYSTEMS NOMINAL</Text>
        <View style={s.onlineBadge}>
          <View style={s.onlineDot} />
          <Text style={s.onlineText}>ONLINE</Text>
        </View>
      </View>

      {/* COGS avatar — now online */}
      <Animated.View style={[s.avatarSection, avatarStyle]}>
        <CogsAvatar size="large" state="online" />
        <Text style={s.cogsDesignation}>C.O.G.S UNIT 7</Text>
        <View style={s.onlineBadgeLarge}>
          <View style={s.onlineDotLarge} />
          <Text style={s.onlineTextLarge}>SYSTEMS ONLINE</Text>
        </View>
      </Animated.View>

      {/* Dialogue cards */}
      <View style={s.cardsSection}>
        {CARDS.map((card, i) => (
          <DialogueCard
            key={i}
            card={card}
            visible={step >= i}
            isLast={i === CARDS.length - 1}
            onPress={handlePress}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(78,203,141,0.2)',
  },
  statusLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(78,203,141,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78,203,141,0.3)',
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.green,
  },
  onlineText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  cogsDesignation: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.muted,
    letterSpacing: 3,
    marginTop: Spacing.sm,
  },
  onlineBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(78,203,141,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78,203,141,0.3)',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  onlineDotLarge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  onlineTextLarge: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.green,
    letterSpacing: 1,
  },
  cardsSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74,158,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.22)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBorderLeft: {
    width: 3,
    backgroundColor: Colors.blue,
    opacity: 0.7,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  cardText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  cardTap: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
});
