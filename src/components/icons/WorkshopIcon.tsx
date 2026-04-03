import React from 'react';
import Svg, { Circle, Rect, Path } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

export default function WorkshopIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Gear */}
      <Circle cx="10" cy="10" r="4" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="10" cy="10" r="1.5" fill={color} opacity={0.5} />
      {/* Gear teeth */}
      <Rect x="8.5" y="4" width="3" height="2.5" rx="0.5" fill={color} />
      <Rect x="8.5" y="13.5" width="3" height="2.5" rx="0.5" fill={color} />
      <Rect x="4" y="8.5" width="2.5" height="3" rx="0.5" fill={color} />
      <Rect x="13.5" y="8.5" width="2.5" height="3" rx="0.5" fill={color} />
      {/* Wrench */}
      <Path
        d="M16 14 L20 18 M20 18 L21 17 M20 18 L19 19"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 16 L15 17"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
