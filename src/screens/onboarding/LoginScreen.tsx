import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AxiomShip from '../../components/hub/AxiomShip';
import { Button } from '../../components/Button';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { Colors, Fonts, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

// ─── Floating wrapper ────────────────────────────────────────────────────────

function FloatingShip() {
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  return (
    <Animated.View style={style}>
      <AxiomShip systemStates={['on', 'on', 'on', 'on', 'on', 'on', 'on', 'on']} width={180} />
    </Animated.View>
  );
}

// ─── Complete onboarding ─────────────────────────────────────────────────────

const completeOnboarding = async (nav: Props['navigation']) => {
  await AsyncStorage.setItem('@axiom_onboarding_complete', 'true');
  nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
};

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: Props) {
  const screenOpacity = useSharedValue(0);
  const taglineReveal = useSharedValue(0);
  const contentReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
    taglineReveal.value = withDelay(300, withTiming(1, { duration: 600 }));
    contentReveal.value = withDelay(900, withTiming(1, { duration: 600 }));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineReveal.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentReveal.value,
    transform: [{ translateY: (1 - contentReveal.value) * 16 }],
  }));

  return (
    <Animated.View style={[s.root, screenStyle]}>
      {/* HUD brackets */}
      <View pointerEvents="none" style={[s.bracket, { top: 8, left: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopLeftRadius: 3 }]} />
      <View pointerEvents="none" style={[s.bracket, { top: 8, right: 8, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderTopRightRadius: 3 }]} />
      <View pointerEvents="none" style={[s.bracket, { bottom: 8, left: 8, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomLeftRadius: 3 }]} />
      <View pointerEvents="none" style={[s.bracket, { bottom: 8, right: 8, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: 'rgba(0,212,255,0.28)', borderBottomRightRadius: 3 }]} />

      {/* Ship */}
      <View style={s.shipSection}>
        <FloatingShip />
      </View>

      {/* Title */}
      <View style={s.titleSection}>
        <Text style={s.title}>THE AXIOM</Text>
        <Animated.Text style={[s.tagline, taglineStyle]}>not all damage is structural</Animated.Text>
      </View>

      {/* Single CTA */}
      <Animated.View style={[s.ctaSection, contentStyle]}>
        <Button
          variant="primary"
          label="BEGIN"
          onPress={() => completeOnboarding(navigation)}
          style={s.beginBtn}
        />
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void, justifyContent: 'center' },
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    zIndex: 20,
    elevation: 20,
  },
  shipSection: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.orbitron,
    fontSize: 28,
    fontWeight: '700',
    color: '#E8F4FF',
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: 'rgba(232,244,255,0.42)',
    letterSpacing: 2,
  },
  ctaSection: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  beginBtn: {
    paddingHorizontal: 48,
  },
});
