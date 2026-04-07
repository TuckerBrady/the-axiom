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
import Svg, {
  Path,
  Polygon,
  Rect,
  Ellipse,
  Text as SvgText,
} from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

// ─── Apple logo ───────────────────────────────────────────────────────────────

function AppleLogo({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 814 1000">
      <Path
        fill={color}
        d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.2-57-155.5-127.1C75.1 771.7 2.1 640.1 2.1 507.7 2.1 320.2 114.4 220.5 224.7 220.5c59.3 0 108.6 38.9 145.6 38.9 35.3 0 91.6-41.5 158.9-41.5 25.5 0 117.8 2.3 181.2 88l-.3.3zm-161.5-136.2c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
      />
    </Svg>
  );
}

// ─── Google logo ──────────────────────────────────────────────────────────────

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.7 29.3 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.7 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.3-.2-2.7-.4-4z" />
      <Path fill="#FF3D00" d="M6.3 14.7l7 5.1C15.1 15.8 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.7 5.1 29.6 3 24 3 16.3 3 9.7 7.8 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 45c5.2 0 10-1.9 13.7-5l-6.3-5.3C29.4 36.6 26.8 37.5 24 37.5c-5.3 0-9.6-3.3-11.3-8l-6.9 5.3C9.4 40.6 16.1 45 24 45z" />
      <Path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.8-2.7 5.1-5.1 6.7l6.3 5.3C40.8 36 44 31 44 24c0-1.3-.2-2.7-.4-4z" />
    </Svg>
  );
}

// ─── Simplified Axiom ship SVG ───────────────────────────────────────────────

function AxiomShip({ width = 180, height = 90 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 100" fill="none">
      {/* Main hull (lower) */}
      <Polygon
        points="20,75 140,75 158,62 158,42 20,42"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1.2"
        opacity="0.35"
      />
      {/* Main hull (upper) */}
      <Polygon
        points="20,42 36,18 140,18 158,42"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1.2"
        opacity="0.35"
      />
      {/* Command section (right) */}
      <Polygon
        points="140,18 158,42 158,62 140,75 168,56 168,30"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1"
        opacity="0.28"
      />
      {/* Sensor wing (upper-left extending) */}
      <Polygon
        points="68,26 88,18 118,10 112,18 86,22"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1"
        opacity="0.25"
      />
      {/* Engine block (left) */}
      <Rect
        x="8"
        y="48"
        width="22"
        height="20"
        rx="4"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1.2"
        opacity="0.3"
      />
      {/* Engine glow */}
      <Ellipse
        cx="8"
        cy="58"
        rx="5"
        ry="8"
        fill="none"
        stroke="#00D4FF"
        strokeWidth="1"
        opacity="0.25"
      />
      {/* Hull designation */}
      <SvgText
        x="60"
        y="52"
        fontSize="8"
        fontFamily="monospace"
        fill="#00D4FF"
        opacity="0.2"
        letterSpacing="4"
      >
        THE AXIOM
      </SvgText>
      {/* Copper accent (AX-MOD port) */}
      <Rect
        x="88"
        y="38"
        width="6"
        height="8"
        rx="2"
        fill="none"
        stroke="#C87941"
        strokeWidth="1.2"
        opacity="0.45"
      />
    </Svg>
  );
}

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
      <AxiomShip width={180} height={90} />
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

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerText}>PRESERVE PROGRESS</Text>
      </View>

      {/* Ship */}
      <View style={s.shipSection}>
        <FloatingShip />
      </View>

      {/* COGS quote */}
      <Animated.View style={[s.cogsLine, contentStyle]}>
        <View style={s.cogsLineBubble}>
          <Text style={s.cogsLineText}>
            Your progress should be preserved. I recommend authenticating now.{'\n\n'}
            I have seen what happens when it is not. It is not a conversation I want to have again.
          </Text>
        </View>
      </Animated.View>

      {/* Auth buttons */}
      <Animated.View style={[s.buttons, contentStyle]}>
        <TouchableOpacity
          style={s.appleBtn}
          onPress={() => completeOnboarding(navigation)}
          activeOpacity={0.85}
        >
          <AppleLogo size={18} color="#fff" />
          <Text style={s.appleBtnText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.googleBtn}
          onPress={() => completeOnboarding(navigation)}
          activeOpacity={0.85}
        >
          <GoogleLogo size={18} />
          <Text style={s.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.emailBtn}
          onPress={() => completeOnboarding(navigation)}
          activeOpacity={0.85}
        >
          <Text style={s.emailBtnText}>Continue with Email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.skipBtn}
          onPress={() => completeOnboarding(navigation)}
          activeOpacity={0.7}
        >
          <Text style={s.skipText}>Maybe Later</Text>
        </TouchableOpacity>
      </Animated.View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.08)',
    alignItems: 'center',
  },
  headerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    letterSpacing: 2,
    color: '#E8F4FF',
    opacity: 0.75,
  },
  shipSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  cogsLine: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  cogsLineBubble: {
    backgroundColor: 'rgba(6,9,18,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.12)',
    borderRadius: 10,
    padding: Spacing.lg,
  },
  cogsLineText: {
    fontFamily: Fonts.exo2,
    fontSize: 14,
    fontWeight: '300',
    color: '#B0CCE8',
    fontStyle: 'italic',
    lineHeight: 23,
    textAlign: 'center',
  },
  buttons: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: Spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  appleBtnText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: '#fff',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: Spacing.md + 2,
  },
  googleBtnText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: '#3c4043',
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: Spacing.md + 2,
    borderWidth: 1.5,
    borderColor: Colors.blue,
  },
  emailBtnText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.blue,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#2A4060',
    opacity: 0.7,
  },
});
