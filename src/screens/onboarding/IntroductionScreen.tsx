import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
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

function OnlinePill({ small }: { small?: boolean }) {
  return (
    <View style={[s.onlinePill, small && s.onlinePillSmall]}>
      <Text style={[s.onlinePillText, small && s.onlinePillTextSmall]}>SYSTEMS ONLINE</Text>
    </View>
  );
}

function DialogueCard({
  card,
  active,
  onPress,
}: {
  card: typeof CARDS[0];
  active: boolean;
  onPress: () => void;
}) {
  const [shouldRender, setShouldRender] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  useEffect(() => {
    if (active) {
      setShouldRender(true);
      opacity.value = withTiming(1, { duration: 400 });
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    } else if (shouldRender) {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-40, { duration: 300, easing: Easing.in(Easing.cubic) });
      setTimeout(() => setShouldRender(false), 350);
    }
  }, [active]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!shouldRender) return null;

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0 }, cardStyle]}>
      <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
        <Text style={s.cardLabel}>{card.label}</Text>
        <Text style={s.cardText}>{card.text}</Text>
        <Text style={s.cardTap}>TAP TO CONTINUE  →</Text>
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
      setStep(sv => sv + 1);
    } else {
      navigation.navigate('CharacterName');
    }
  };

  return (
    <Animated.View style={[s.root, screenStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />

      {/* Header */}
      <View style={s.header} pointerEvents="box-none">
        <Text style={s.headerLabel}>C.O.G.S UNIT 7 — SYSTEMS NOMINAL</Text>
        <OnlinePill small />
      </View>

      {/* Avatar */}
      <Animated.View style={[s.avatarSection, avatarStyle]} pointerEvents="box-none">
        <CogsAvatar size="large" state="online" />
        <Text style={s.cogsDesignation}>C.O.G.S UNIT 7</Text>
        <OnlinePill />
      </Animated.View>

      {/* Cards */}
      <View style={s.cardsSection} pointerEvents="box-none">
        {CARDS.map((card, i) => (
          <DialogueCard key={i} card={card} active={step === i} onPress={handlePress} />
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    zIndex: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.08)',
  },
  headerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    opacity: 0.65,
    letterSpacing: 1,
  },
  onlinePill: {
    backgroundColor: '#00C48C',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  onlinePillSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  onlinePillText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#001A10',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  onlinePillTextSmall: { fontSize: 8 },
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
  cardsSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    position: 'relative',
  },
  card: {
    backgroundColor: 'rgba(6,9,18,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.12)',
    borderRadius: 10,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    letterSpacing: 1.2,
    opacity: 0.7,
  },
  cardText: {
    fontFamily: Fonts.exo2,
    fontSize: 14,
    fontWeight: '300',
    color: '#B0CCE8',
    lineHeight: 23,
    fontStyle: 'italic',
  },
  cardTap: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#00D4FF',
    opacity: 0.65,
    marginTop: Spacing.xs,
  },
});
