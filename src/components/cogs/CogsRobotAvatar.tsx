import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CogsEyeColor } from '../../constants/cogsEyeColors';
import { COGS_EYE_COLORS } from '../../constants/cogsEyeColors';
import CogsAvatar from '../CogsAvatar';
import type { CogsState } from '../CogsAvatar';

interface Props {
  color: CogsEyeColor;
  size?: number;
}

// Map hub eye color to the canonical CogsAvatar state
const COLOR_TO_STATE: Record<CogsEyeColor, CogsState> = {
  AMBER: 'engaged',
  BLUE: 'online',
  GREEN: 'green',
  RED: 'damaged',
  DARK: 'dark',
};

/**
 * COGS avatar for Hub cards. Wraps the canonical CogsAvatar
 * (src/components/CogsAvatar.tsx — the copper-bust portrait with
 * animated eyes and reactor used across the entire app) inside a
 * colored circle container driven by the eye-state color token.
 */
export default function CogsRobotAvatar({ color, size = 30 }: Props) {
  const c = COGS_EYE_COLORS[color];
  const cogsState = COLOR_TO_STATE[color];

  return (
    <View style={[st.circle, { width: size, height: size, borderRadius: size / 2, borderColor: c.solid, backgroundColor: c.avatarBg }]}>
      <CogsAvatar size="small" state={cogsState} />
    </View>
  );
}

const st = StyleSheet.create({
  circle: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
