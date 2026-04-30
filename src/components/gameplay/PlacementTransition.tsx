import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { Colors, Fonts, FontSizes } from '../../theme/tokens';

// ─── Transition sequence (REQ-65–REQ-70) ─────────────────────────────────────
//
// Step 1: Board powers up — subtle pulse/glow at board position (0.6s)
// Step 2: "PLACEMENT PHASE" text fades in, holds, fades out (0.6s each)
// Step 3: Arc Wheel enters from the side (driven externally; this component
//         signals readiness via onComplete so the parent can unmount the panel)

interface Props {
  onComplete: () => void;
}

export default function PlacementTransition({ onComplete }: Props) {
  const boardGlow = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Step 1 — board glow pulse (0.6s)
    const step1 = Animated.sequence([
      Animated.timing(boardGlow, {
        toValue: 1,
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        useNativeDriver: false,
      }),
      Animated.timing(boardGlow, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        useNativeDriver: false,
      }),
    ]);

    // Step 2 — "PLACEMENT PHASE" text (fade in 0.3s, hold 0.6s, fade out 0.3s)
    const step2 = Animated.sequence([
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
          useNativeDriver: false,
        }),
        Animated.timing(textScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          useNativeDriver: false,
        }),
      ]),
      Animated.delay(600),
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        useNativeDriver: false,
      }),
    ]);

    Animated.sequence([step1, Animated.delay(100), step2]).start(() => {
      onComplete();
    });
  }, []);

  const glowColor = boardGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(74,158,255,0)', 'rgba(74,158,255,0.12)'],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Board glow overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: glowColor }]}
      />

      {/* Placement Phase flash text */}
      <Animated.View
        style={[
          styles.textContainer,
          { opacity: textOpacity, transform: [{ scale: textScale }] },
        ]}
      >
        <Text style={styles.phaseLabel}>PLACEMENT PHASE</Text>
        <View style={styles.phaseDivider} />
        <Text style={styles.phaseSubLabel}>Position your pieces</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.xl,
    color: Colors.starWhite,
    letterSpacing: 4,
    textShadowColor: 'rgba(74,158,255,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  phaseDivider: {
    width: 120,
    height: 1,
    backgroundColor: 'rgba(74,158,255,0.4)',
    marginVertical: 8,
  },
  phaseSubLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.sm,
    color: Colors.muted,
    letterSpacing: 2,
  },
});
