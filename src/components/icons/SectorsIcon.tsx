import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

export default function SectorsIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Constellation dots */}
      <Circle cx="4" cy="6" r="1.5" fill={color} />
      <Circle cx="12" cy="3" r="1.5" fill={color} />
      <Circle cx="20" cy="8" r="1.5" fill={color} />
      <Circle cx="8" cy="14" r="1.5" fill={color} />
      <Circle cx="16" cy="16" r="1.5" fill={color} />
      <Circle cx="6" cy="20" r="1.5" fill={color} />
      <Circle cx="18" cy="21" r="1.5" fill={color} />
      {/* Connection lines */}
      <Line x1="4" y1="6" x2="12" y2="3" stroke={color} strokeWidth="0.8" opacity={0.5} />
      <Line x1="12" y1="3" x2="20" y2="8" stroke={color} strokeWidth="0.8" opacity={0.5} />
      <Line x1="8" y1="14" x2="16" y2="16" stroke={color} strokeWidth="0.8" opacity={0.5} />
      <Line x1="4" y1="6" x2="8" y2="14" stroke={color} strokeWidth="0.8" opacity={0.5} />
      <Line x1="16" y1="16" x2="18" y2="21" stroke={color} strokeWidth="0.8" opacity={0.5} />
      <Line x1="6" y1="20" x2="18" y2="21" stroke={color} strokeWidth="0.8" opacity={0.5} />
    </Svg>
  );
}
