import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';

const TOGGLE_WIDTH = 52;
const TOGGLE_HEIGHT = 28;
const ORB_SIZE = 20;
const ORB_TRAVEL = TOGGLE_WIDTH - ORB_SIZE - 4; // 2px padding each side

interface Props {
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function WireToggle({ value, onValueChange }: Props) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [value]);

  // Wire color: amber when ON, dim when OFF
  const wireStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(30,46,68,0.5)', 'rgba(240,180,41,0.6)'],
    ),
  }));

  // Orb position
  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, ORB_TRAVEL]) },
    ],
  }));

  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      style={styles.container}
    >
      {/* Wire line */}
      <Animated.View style={[styles.wire, wireStyle]} />

      {/* Orb */}
      <Animated.View style={[styles.orbWrap, orbStyle]}>
        {value ? (
          <View style={styles.orbOn}>
            <LinearGradient
              colors={['#8ac4ff', '#4a9eff', '#0e2a50']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.3, y: 0.2 }}
              end={{ x: 0.8, y: 0.9 }}
            />
          </View>
        ) : (
          <View style={styles.orbOff}>
            <LinearGradient
              colors={['rgba(30,46,68,0.6)', '#060a14']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.3, y: 0.2 }}
              end={{ x: 0.8, y: 0.9 }}
            />
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    justifyContent: 'center',
  },
  wire: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    top: (TOGGLE_HEIGHT - 2) / 2,
    borderRadius: 1,
  },
  orbWrap: {
    position: 'absolute',
    left: 2,
    top: (TOGGLE_HEIGHT - ORB_SIZE) / 2,
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  orbOn: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(74,158,255,0.9)',
    shadowColor: 'rgba(74,158,255,0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },
  orbOff: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(30,46,68,0.6)',
  },
});
