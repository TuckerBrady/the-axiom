import React from 'react';
import type { CogsEyeColor } from '../../constants/cogsEyeColors';
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
 * COGS avatar for Hub cards. Renders the canonical CogsAvatar
 * (src/components/CogsAvatar.tsx — the copper-bust portrait with
 * animated eyes and reactor used across the entire app) directly,
 * matching LaunchScreen and LevelSelectScreen treatment.
 *
 * Props `color` and `size` are retained in the interface for
 * call-site compatibility; `color` drives eye state, `size` is
 * no longer applied (CogsAvatar uses its own SIZE_MAP).
 */
export default function CogsRobotAvatar({ color }: Props) {
  const cogsState = COLOR_TO_STATE[color];

  return <CogsAvatar size="small" state={cogsState} />;
}
