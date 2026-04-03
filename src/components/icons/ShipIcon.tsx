import React from 'react';
import Svg, { Polygon, Rect, Ellipse, Circle } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

export default function ShipIcon({ size = 22, color = '#7a96b0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      {/* Main hull */}
      <Polygon
        points="2,9 8,6 18,6 20,9 20,15 2,15"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      {/* Command tower (offset right) */}
      <Rect x="13" y="3" width="6" height="5" rx="1"
        stroke={color} strokeWidth="1" fill="none" />
      {/* Bridge window */}
      <Rect x="14" y="4" width="4" height="2.5" rx="0.5"
        fill={color} opacity={0.5} />
      {/* Sensor wing (swept forward, port side) */}
      <Polygon
        points="6,6 2,3 4,3 8,6"
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity={0.8}
      />
      {/* Engine bell (rear) */}
      <Ellipse cx="2" cy="12" rx="1.5" ry="3"
        stroke={color} strokeWidth="1" fill="none" opacity={0.7} />
      {/* AX-MOD dot */}
      <Circle cx="11" cy="10" r="1" fill={color} opacity={0.5} />
    </Svg>
  );
}
