import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';

const { width: W, height: H } = Dimensions.get('window');

const STARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % (W - 4),
  y: (i * 79.4 + i * i * 11.3) % (H * 0.85),
  size: i % 3 === 0 ? 2.5 : i % 3 === 1 ? 1.5 : 2,
  delay: i * 250,
  duration: 1200 + (i * 173) % 1400,
}));

type StarProps = (typeof STARS)[0];

function Star({ x, y, size, delay, duration }: StarProps) {
  const opacity = useSharedValue(0.15);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration }),
          withTiming(0.2, { duration }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.starWhite,
        },
        style,
      ]}
    />
  );
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Launch'>;
};

export default function LaunchScreen({ navigation }: Props) {
  const planetFloat = useSharedValue(0);
  const shipFloat = useSharedValue(0);
  const robotFloat = useSharedValue(0);

  const screenOpacity = useSharedValue(0);
  const planetReveal = useSharedValue(0);
  const logoReveal = useSharedValue(0);
  const taglineReveal = useSharedValue(0);
  const cogsReveal = useSharedValue(0);
  const buttonsReveal = useSharedValue(0);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });

    planetReveal.value = withTiming(1, { duration: 600 });
    logoReveal.value = withDelay(150, withTiming(1, { duration: 600 }));
    taglineReveal.value = withDelay(300, withTiming(1, { duration: 600 }));
    cogsReveal.value = withDelay(450, withTiming(1, { duration: 600 }));
    buttonsReveal.value = withDelay(600, withTiming(1, { duration: 600 }));

    const floatAnim = (sv: SharedValue<number>, offsetDelay: number) => {
      sv.value = withDelay(
        offsetDelay,
        withRepeat(
          withSequence(
            withTiming(-9, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
    };

    floatAnim(planetFloat, 0);
    floatAnim(shipFloat, 800);
    floatAnim(robotFloat, 1400);
  }, []);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const planetFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: planetFloat.value }],
  }));
  const shipFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: shipFloat.value }],
  }));
  const robotFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: robotFloat.value }],
  }));
  const planetRevealStyle = useAnimatedStyle(() => ({ opacity: planetReveal.value }));
  const logoRevealStyle = useAnimatedStyle(() => ({ opacity: logoReveal.value }));
  const taglineRevealStyle = useAnimatedStyle(() => ({ opacity: taglineReveal.value }));
  const cogsRevealStyle = useAnimatedStyle(() => ({ opacity: cogsReveal.value }));
  const buttonsRevealStyle = useAnimatedStyle(() => ({ opacity: buttonsReveal.value }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      {/* Starfield */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {STARS.map((s) => (
          <Star key={s.id} {...s} />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Planet + emojis */}
          <Animated.View style={[styles.planetContainer, planetRevealStyle]}>
            <Animated.View style={[styles.planetWrapper, planetFloatStyle]}>
              {/* Robot - top left */}
              <Animated.Text style={[styles.robotEmoji, robotFloatStyle]}>
                🤖
              </Animated.Text>

              {/* Planet */}
              <View style={styles.planetOuter}>
                <LinearGradient
                  colors={['#2a5a9a', '#1e4a7a', '#0a2040', '#04101e']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0.25, y: 0.1 }}
                  end={{ x: 0.85, y: 0.95 }}
                />
                {/* Highlight shimmer */}
                <View style={styles.planetHighlight} />
              </View>

              {/* Ship - bottom right */}
              <Animated.Text style={[styles.shipEmoji, shipFloatStyle]}>
                🚀
              </Animated.Text>
            </Animated.View>
          </Animated.View>

          {/* Logo */}
          <Animated.View style={[styles.logoContainer, logoRevealStyle]}>
            <Text style={styles.logoText}>TINKERER</Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View style={taglineRevealStyle}>
            <Text style={styles.tagline}>Build · Configure · Explore</Text>
          </Animated.View>

          {/* Cogs bubble */}
          <Animated.View style={[styles.cogsBubble, cogsRevealStyle]}>
            <View style={styles.cogsHeader}>
              <View style={styles.cogsAvatar}>
                <Text style={styles.cogsAvatarEmoji}>🤖</Text>
              </View>
              <Text style={styles.cogsName}>COGS · AI UNIT</Text>
            </View>
            <Text style={styles.cogsSpeech}>
              {'"'}The cosmos does not fix itself. Good thing you have a sharp
              mind, a trusty ship, and an AI companion with opinions.{'"'}
            </Text>
          </Animated.View>

          {/* Buttons */}
          <Animated.View style={[styles.buttonsContainer, buttonsRevealStyle]}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Hub')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.copper, Colors.amber]}
                style={styles.primaryBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryBtnText}>BEGIN MISSION</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.75}>
              <Text style={styles.secondaryBtnText}>Resume Journey</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.void,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.xxl,
  },
  planetContainer: {
    marginBottom: Spacing.xxl,
  },
  planetWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 22,
    elevation: 14,
  },
  planetHighlight: {
    position: 'absolute',
    top: 18,
    left: 22,
    width: 36,
    height: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '-30deg' }],
  },
  robotEmoji: {
    position: 'absolute',
    top: 14,
    left: 8,
    fontSize: 26,
  },
  shipEmoji: {
    position: 'absolute',
    bottom: 14,
    right: 8,
    fontSize: 26,
  },
  logoContainer: {
    marginBottom: Spacing.sm,
  },
  logoText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.display,
    fontWeight: 'bold',
    color: Colors.cream,
    letterSpacing: 3,
    textShadowColor: Colors.copper,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  tagline: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.xs,
    color: Colors.copperLight,
    letterSpacing: 4,
    marginBottom: Spacing.xxl,
  },
  cogsBubble: {
    width: '100%',
    backgroundColor: 'rgba(10,18,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.xxl,
  },
  cogsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cogsAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  cogsAvatarEmoji: {
    fontSize: 16,
  },
  cogsName: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.blue,
    letterSpacing: 1,
  },
  cogsSpeech: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.starWhite,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  buttonsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnGradient: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: Colors.void,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.steel,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.md,
    color: Colors.muted,
  },
});
