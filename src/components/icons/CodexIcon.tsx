import React from 'react';
import Svg, { Rect, Path, Line } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

export default function CodexIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Book outline */}
      <Path
        d="M4 3 L4 20 Q4 21 5 21 L19 21 Q20 21 20 20 L20 5 Q20 4 19 4 L7 4 Q4 4 4 3 Z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      {/* Spine */}
      <Line x1="4" y1="3" x2="7" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="7" y1="3" x2="7" y2="4" stroke={color} strokeWidth="1.5" />
      {/* Circuit detail on cover */}
      <Line x1="10" y1="9" x2="16" y2="9" stroke={color} strokeWidth="1" opacity={0.6} />
      <Line x1="10" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1" opacity={0.6} />
      <Line x1="16" y1="9" x2="16" y2="15" stroke={color} strokeWidth="1" opacity={0.6} />
      <Rect x="9" y="14" width="5" height="3" rx="0.5" stroke={color} strokeWidth="1" opacity={0.6} fill="none" />
    </Svg>
  );
}
