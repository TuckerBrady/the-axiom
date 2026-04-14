import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import AxiomShipSVG from '../../components/icons/AxiomShipSVG';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

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
      <AxiomShipSVG width={180} height={120} />
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
  const contentReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 });
    contentReveal.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
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
      </View>

      {/* Single CTA */}
      <Animated.View style={[s.ctaSection, contentStyle]}>
        <TouchableOpacity
          style={s.beginBtn}
          onPress={() => completeOnboarding(navigation)}
          activeOpacity={0.85}
        >
          <Text style={s.beginBtnText}>BEGIN</Text>
        </TouchableOpacity>
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
  ctaSection: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  beginBtn: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.45)',
    borderRadius: 10,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  beginBtnText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.amber,
    letterSpacing: 4,
  },
});
