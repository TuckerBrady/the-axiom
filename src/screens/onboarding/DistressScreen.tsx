import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import CogsAvatar from '../../components/CogsAvatar';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Distress'>;
};

const CARDS = [
  {
    label: 'TRANSMISSION 01 / 03',
    text: 'Systems critical. Hull integrity at 47%. Navigation offline. Immediate repairs required. We do not have much time.',
  },
  {
    label: 'TRANSMISSION 02 / 03',
    text: 'Five protocol components are required. They are located aboard this vessel. You must locate each one and follow my instructions precisely.',
  },
  {
    label: 'TRANSMISSION 03 / 03',
    text: 'We begin with the Conveyor. It is the simplest. It will not stay simple for long. Proceed to the repair bay.',
  },
];

function FlickerText({ text, style }: { text: string; style?: object }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 120 }),
        withTiming(1, { duration: 80 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(1, { duration: 900 }),
        withTiming(0.3, { duration: 80 }),
        withTiming(1, { duration: 1400 }),
      ),
      -1,
      false,
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[animStyle, style]}>
      {text}
    </Animated.Text>
  );
}

function DialogueCard({
  card,
  index,
  visible,
  isLast,
  onPress,
}: {
  card: typeof CARDS[0];
  index: number;
  visible: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

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
          <Text style={s.cardTap}>{isLast ? 'TAP TO PROCEED TO REPAIR BAY →' : 'TAP TO CONTINUE →'}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DistressScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);

  const screenOpacity = useSharedValue(0);
  const avatarReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 500 });
    avatarReveal.value = withDelay(300, withTiming(1, { duration: 600 }));
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
      navigation.navigate('Repair');
    }
  };

  return (
    <Animated.View style={[s.root, screenStyle]}>
      {/* Top status bar */}
      <View style={s.statusBar}>
        <Text style={s.statusLabel}>C.O.G.S UNIT 7 — DISTRESS SIGNAL</Text>
        <FlickerText text="SYSTEM CRITICAL" style={s.statusCritical} />
      </View>

      {/* COGS Avatar */}
      <Animated.View style={[s.avatarSection, avatarStyle]}>
        <View style={s.avatarContainer}>
          <CogsAvatar size="large" state="damaged" />
          {/* Damage badge overlay label */}
          <View style={s.damageBadge}>
            <Text style={s.damageBadgeText}>HULL 47%</Text>
          </View>
        </View>
        <Text style={s.cogsDesignation}>C.O.G.S UNIT 7</Text>
        <FlickerText text="⚠ SYSTEM CRITICAL" style={s.criticalLabel} />
      </Animated.View>

      {/* Dialogue cards */}
      <View style={s.cardsSection}>
        {CARDS.map((card, i) => (
          <DialogueCard
            key={i}
            card={card}
            index={i}
            visible={step >= i}
            isLast={i === CARDS.length - 1}
            onPress={handlePress}
          />
        ))}
      </View>

      {/* Static noise lines */}
      <View style={s.noise} pointerEvents="none">
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              s.noiseLine,
              { top: 80 + i * 40, opacity: 0.03 + (i % 3) * 0.02 },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(224,85,85,0.2)',
  },
  statusLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.muted,
    letterSpacing: 1,
  },
  statusCritical: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.red,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  damageBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: Colors.red,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  damageBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: '#fff',
    letterSpacing: 1,
  },
  cogsDesignation: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    color: Colors.muted,
    letterSpacing: 3,
    marginTop: Spacing.sm,
  },
  criticalLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.red,
    letterSpacing: 2,
  },
  cardsSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(224,85,85,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(224,85,85,0.25)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBorderLeft: {
    width: 3,
    backgroundColor: Colors.red,
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
    color: Colors.red,
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
  noise: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  noiseLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.red,
  },
});
