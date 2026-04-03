import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';

const TOGGLE_WIDTH = 48;
const TOGGLE_HEIGHT = 28;
const THUMB_SIZE = 22;
const WIRE_NODE_SIZE = 8;
const THUMB_TRAVEL = TOGGLE_WIDTH - THUMB_SIZE - 6;

interface Props {
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export function AnimatedToggle({ value, onValueChange }: Props) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', 'rgba(74,158,255,0.7)'],
    ),
    opacity: progress.value,
  }));

  const wireStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0]),
  }));

  const nodeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 0.4], [1, 0.5]) }],
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, THUMB_TRAVEL]) },
    ],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(58,80,112,0.6)', '#ffffff'],
    ),
    width: interpolate(progress.value, [0, 1], [WIRE_NODE_SIZE, THUMB_SIZE]),
    height: interpolate(progress.value, [0, 1], [WIRE_NODE_SIZE, THUMB_SIZE]),
    borderRadius: interpolate(progress.value, [0, 1], [WIRE_NODE_SIZE / 2, THUMB_SIZE / 2]),
  }));

  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      style={styles.container}
    >
      <Animated.View style={[styles.wireLine, wireStyle]} />
      <Animated.View style={[styles.wireNode, nodeStyle]} />
      <Animated.View style={[styles.track, trackStyle]} />
      <Animated.View style={[styles.thumb, thumbStyle]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    justifyContent: 'center',
  },
  wireLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(58,80,112,0.6)',
    top: (TOGGLE_HEIGHT - 1.5) / 2,
  },
  wireNode: {
    position: 'absolute',
    left: 3,
    top: (TOGGLE_HEIGHT - WIRE_NODE_SIZE) / 2,
    width: WIRE_NODE_SIZE,
    height: WIRE_NODE_SIZE,
    borderRadius: WIRE_NODE_SIZE / 2,
    backgroundColor: 'rgba(58,80,112,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(58,80,112,0.6)',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: TOGGLE_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    left: 3,
    top: (TOGGLE_HEIGHT - THUMB_SIZE) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
});
