/**
 * SYNTHETIC FIXTURE -- DO NOT USE IN PRODUCTION
 *
 * This file deliberately reintroduces the native-driver parent-swap
 * anti-pattern that caused Build 19 SIGABRT (commit 88c0b99). It
 * exists solely to verify that the static check in
 * __tests__/lint/nativeDriverHostUniqueness.test.ts correctly detects
 * the violation.
 *
 * The anti-pattern: dimOpacity is declared with useNativeDriver: true,
 * then consumed by TWO different Animated.View hosts inside a ternary
 * conditional based on awaitPlacement. When awaitPlacement toggles,
 * React unmounts one host and mounts the other, orphaning the native
 * binding and causing SIGABRT on iOS.
 *
 * See docs/ANIMATION_RULES.md REQ-A-1 for the canonical rule.
 */

import React, { useRef, useState } from 'react';
import { Animated, View, Pressable, StyleSheet } from 'react-native';

interface Props {
  awaitPlacement?: boolean;
}

function AntiPatternOverlay({ awaitPlacement = false }: Props) {
  const [_phase, _setPhase] = useState<'idle' | 'active'>('idle');
  const dimOpacity = useRef(new Animated.Value(0)).current;

  // This animation declaration marks dimOpacity as native-driven.
  React.useEffect(() => {
    Animated.timing(dimOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [dimOpacity]);

  // ANTI-PATTERN: dimOpacity appears in TWO Animated.View hosts
  // inside a ternary conditional. When awaitPlacement changes,
  // the first host unmounts and the second mounts (or vice versa),
  // orphaning the native binding.
  return (
    <View style={StyleSheet.absoluteFill}>
      {awaitPlacement ? (
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, { opacity: dimOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: dimOpacity }]}
        />
      )}
    </View>
  );
}

export default AntiPatternOverlay;
