import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Colors } from '../theme/tokens';

const { width: W, height: H } = Dimensions.get('window');

interface StarConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

function buildStars(seed: number): StarConfig[] {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: ((i + seed) * 137.508 + seed * 17.3) % (W - 4),
    y: ((i + seed) * (79.4 + seed) + i * i * 11.3) % (H * 0.88),
    size: i % 3 === 0 ? 2 : i % 3 === 1 ? 1.5 : 2.5,
    delay: ((i * 310) + seed * 50) % 4000,
    duration: 1100 + ((i * 211) + seed * 37) % 1600,
  }));
}

function Star({ x, y, size, delay, duration }: StarConfig) {
  const opacity = useSharedValue(0.1);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration }),
          withTiming(0.15, { duration }),
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

interface Props {
  seed?: number;
}

export default function StarField({ seed = 0 }: Props) {
  const stars = React.useMemo(() => buildStars(seed), [seed]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s) => (
        <Star key={s.id} {...s} />
      ))}
    </View>
  );
}
