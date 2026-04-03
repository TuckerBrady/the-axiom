import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  filled?: boolean;
  color?: string;
}

export default function StarIcon({ size = 24, filled = true, color = Colors.amber }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.3}
      />
    </Svg>
  );
}
