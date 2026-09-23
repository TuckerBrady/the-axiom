import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { PieceIcon } from '../PieceIcon';
import type { PieceType } from '../../game/types';

// AXM-013 — a drag released over a blown cell is rejected. The ghost glides
// back to where the drag began, so the rejection reads as the scar and not as
// a missed gesture. Mounted only for the length of the snap and unmounted by
// the parent in onDone; the Animated.View below is this component's one host
// for its whole life (REQ-A-2), and it runs on the JS driver (REQ-A-1).
export const SNAP_BACK_MS = 220;

interface Props {
  type: PieceType;
  color: string;
  size: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  onDone: () => void;
}

export default function DragGhostSnapBack({ type, color, size, from, to, onDone }: Props) {
  const pos = useRef(new Animated.ValueXY({ x: from.x - size / 2, y: from.y - size / 2 })).current;
  const opacity = useRef(new Animated.Value(0.85)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(pos, {
        toValue: { x: to.x - size / 2, y: to.y - size / 2 },
        duration: SNAP_BACK_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: SNAP_BACK_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]);
    anim.start(() => onDoneRef.current());
    return () => anim.stop();
    // Runs once per mount: the parent remounts (new key) for each rejection.
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ghost,
        { width: size, height: size, left: pos.x, top: pos.y, opacity },
      ]}
    >
      <PieceIcon type={type} size={size * 0.6} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
});
