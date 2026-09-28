import React from 'react';
import Svg, { Rect, Path, Ellipse } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

// AXM-042 (locked design, DESIGN_HANDOFFS/008-ship-tab-icon, option A):
// the canon hull (AxiomHull) in side profile, nose to the right, depth
// exaggerated about 2x so it holds at the 20px tab size. One colour at
// full strength, no state.
export default function ShipIcon({ size = 22, color = '#7a96b0' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Drive block */}
      <Rect x={2.4} y={8.8} width={4} height={6.4} rx={0.6}
        stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      {/* Aft hull */}
      <Path d="M6.4 7.6 H13.8 V16.4 H6.4 Z"
        stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      {/* Forward hull (shoulder step) */}
      <Path d="M13.8 9.2 H19 V14.8 H13.8"
        stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      {/* Sensor wedge nose */}
      <Path d="M19 9.2 L23.2 12 L19 14.8"
        stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
      {/* Life-support pod */}
      <Ellipse cx={10} cy={17.8} rx={2.6} ry={1}
        stroke={color} strokeWidth={1.2} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}
