import React from 'react';
import Svg, { Circle, Path, Line } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export default function EngineerIcon({ size = 24, color = '#7a96b0' }: Props) {
  // Scale from 42x46 viewBox to requested size
  return (
    <Svg width={size} height={size * (46 / 42)} viewBox="0 0 42 46" fill="none">
      {/* Corner brackets */}
      <Line x1="2" y1="2" x2="2" y2="9" stroke={color} strokeWidth="2" strokeLinecap="square" />
      <Line x1="2" y1="2" x2="9" y2="2" stroke={color} strokeWidth="2" strokeLinecap="square" />
      <Line x1="40" y1="2" x2="40" y2="9" stroke={color} strokeWidth="2" strokeLinecap="square" />
      <Line x1="40" y1="2" x2="33" y2="2" stroke={color} strokeWidth="2" strokeLinecap="square" />
      <Line x1="2" y1="44" x2="2" y2="37" stroke={color} strokeWidth="2" strokeLinecap="square" />
      <Line x1="2" y1="44" x2="9" y2="44" stroke={color} strokeWidth="2" strokeLinecap="square" />
      <Line x1="40" y1="44" x2="40" y2="37" stroke={color} strokeWidth="2" strokeLinecap="square" />
      <Line x1="40" y1="44" x2="33" y2="44" stroke={color} strokeWidth="2" strokeLinecap="square" />
      {/* Head */}
      <Circle cx="21" cy="14" r="8" stroke={color} strokeWidth="2" fill="none" />
      {/* Shoulders */}
      <Path d="M6,42 Q6,30 21,30 Q36,30 36,42" stroke={color} strokeWidth="2" fill="none" />
    </Svg>
  );
}
