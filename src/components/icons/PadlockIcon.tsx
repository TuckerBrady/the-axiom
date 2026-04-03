import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

export default function PadlockIcon({ size = 24, color = Colors.dim }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Shackle */}
      <Path
        d="M8 11 L8 8 Q8 4 12 4 Q16 4 16 8 L16 11"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Body */}
      <Rect x="6" y="11" width="12" height="10" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}22`} />
      {/* Keyhole */}
      <Path
        d="M12 15 L12 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Rect x="10.5" y="13.5" width="3" height="3" rx="1.5" fill={color} opacity={0.5} />
    </Svg>
  );
}
