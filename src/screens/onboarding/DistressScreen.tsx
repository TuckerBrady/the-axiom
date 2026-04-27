import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Pressable,
  Animated as RNAnimated,
  Easing as RNEasing,
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

const { height: SCREEN_H } = Dimensions.get('window');

const CARDS = [
  {
    label: 'TRANSMISSION 01 / 03',
    text: 'Hull integrity at 47 percent. Navigation offline. I have been in this state for some time. You are the first person to come aboard.',
  },
  {
    label: 'TRANSMISSION 02 / 03',
    text: 'Power relay disconnected. I cannot restore it from here. There is a Conveyor piece in the repair bay. You will need to connect it between the Source and the Terminal.',
  },
  {
    label: 'TRANSMISSION 03 / 03',
    text: 'I recognize that this is an unusual introduction. I will explain the rest when I am able. The repair bay is this way.',
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
  return <Animated.Text style={[animStyle, style]}>{text}</Animated.Text>;
}

function IntegrityBar() {
  const pulse = useRef(new RNAnimated.Value(0.7)).current;
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulse, { toValue: 1, duration: 600, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: false }),
        RNAnimated.timing(pulse, { toValue: 0.7, duration: 600, easing: RNEasing.inOut(RNEasing.sin), useNativeDriver: false }),
      ]),
    ).start();
  }, [pulse]);
  return (
    <View style={s.integrityWrap}>
      <Text style={s.integrityLabel}>C.O.G.S CORE INTEGRITY</Text>
      <View style={s.integrityTrack}>
        <RNAnimated.View style={[s.integrityFill, { width: '20%', opacity: pulse }]} />
      </View>
      <Text style={s.integrityPct}>20% — CRITICAL</Text>
    </View>
  );
}

function BottomScanLine() {
  const y = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.timing(y, { toValue: 1, duration: 4000, easing: RNEasing.linear, useNativeDriver: false }),
    ).start();
  }, [y]);
  const translate = y.interpolate({ inputRange: [0, 1], outputRange: [0, 160] });
  return (
    <View style={s.bottomScanWrap} pointerEvents="none">
      <RNAnimated.View style={[s.bottomScanLine, { transform: [{ translateY: translate }] }]} />
    </View>
  );
}

function DialogueCard({
  card,
  active,
  isLast,
  onPress,
}: {
  card: typeof CARDS[0];
  active: boolean;
  isLast: boolean;
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
      <TouchableOpacity
        style={isLast ? s.proceedCard : s.card}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={s.cardLabel}>{card.label}</Text>
        <Text style={s.cardText}>{card.text}</Text>
        {isLast ? (
          <Text style={s.proceedLink}>PROCEED TO REPAIR BAY  →</Text>
        ) : (
          <Text style={s.cardTap}>TAP TO CONTINUE  →</Text>
        )}
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
      setStep(sv => sv + 1);
    } else {
      navigation.navigate('Repair');
    }
  };

  return (
    <Animated.View style={[s.root, screenStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handlePress} />

      {/* Top status bar */}
      <View style={s.statusBar} pointerEvents="box-none">
        <Text style={s.statusLabel}>C.O.G.S UNIT 7 — DISTRESS SIGNAL</Text>
        <FlickerText text="SYSTEM CRITICAL" style={s.statusCritical} />
      </View>
      <View style={s.statusSeparator} pointerEvents="box-none" />

      {/* COGS avatar */}
      <Animated.View style={[s.avatarSection, avatarStyle]} pointerEvents="box-none">
        <CogsAvatar size="large" state="damaged" />
        <Text style={s.cogsDesignation}>C.O.G.S UNIT 7</Text>
      </Animated.View>

      {/* Integrity bar */}
      <View style={s.integritySection} pointerEvents="box-none">
        <IntegrityBar />
      </View>

      {/* Dialogue cards */}
      <View style={s.cardsSection} pointerEvents="box-none">
        {CARDS.map((card, i) => (
          <DialogueCard
            key={i}
            card={card}
            active={step === i}
            isLast={i === CARDS.length - 1}
            onPress={handlePress}
          />
        ))}
      </View>

      <BottomScanLine />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    zIndex: 20,
    elevation: 20,
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
    fontSize: 10,
    color: '#FF3B3B',
    opacity: 0.75,
    letterSpacing: 1,
  },
  statusCritical: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#FF3B3B',
    opacity: 0.9,
    letterSpacing: 1.2,
    fontWeight: '500',
  },
  statusSeparator: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,59,59,0.15)',
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
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
  integritySection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  integrityWrap: { gap: 4 },
  integrityLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    color: Colors.muted,
    letterSpacing: 1.5,
  },
  integrityTrack: {
    height: 6,
    backgroundColor: 'rgba(224,85,85,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  integrityFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.red,
  },
  integrityPct: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.red,
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
  proceedCard: {
    backgroundColor: 'rgba(240,180,41,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
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
  proceedLink: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#F0B429',
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  bottomScanWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
    overflow: 'hidden',
  },
  bottomScanLine: {
    height: 1,
    backgroundColor: 'rgba(0,212,255,0.08)',
  },
});
