import React from 'react';
import Svg, { Path, Circle, Rect, Line, Ellipse } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

export function BatteryIcon({ size = 24, color = Colors.amber }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="16" height="12" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <Rect x="19" y="10" width="3" height="4" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M11 9 L9 12.5 L12 12.5 L10 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ShieldIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2 L20 6 L20 12 Q20 18 12 22 Q4 18 4 12 L4 6 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <Path d="M9 12 L11 14 L15 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function GearIcon({ size = 24, color = Colors.copper }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M12 1 L13.5 4.5 L10.5 4.5 Z" fill={color} opacity={0.6} />
      <Path d="M12 23 L13.5 19.5 L10.5 19.5 Z" fill={color} opacity={0.6} />
      <Path d="M1 12 L4.5 13.5 L4.5 10.5 Z" fill={color} opacity={0.6} />
      <Path d="M23 12 L19.5 13.5 L19.5 10.5 Z" fill={color} opacity={0.6} />
      <Path d="M4.2 4.2 L6.8 6 L5.5 7.3 Z" fill={color} opacity={0.4} />
      <Path d="M19.8 4.2 L17.2 6 L18.5 7.3 Z" fill={color} opacity={0.4} />
      <Path d="M4.2 19.8 L6.8 18 L5.5 16.7 Z" fill={color} opacity={0.4} />
      <Path d="M19.8 19.8 L17.2 18 L18.5 16.7 Z" fill={color} opacity={0.4} />
    </Svg>
  );
}

export function ScannerIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="14" r="8" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M12 14 L12 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 14 L18 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="12" cy="14" r="2" fill={color} opacity={0.4} />
      <Path d="M6 4 L12 3 L18 4" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.5} />
    </Svg>
  );
}

export function RailgunIcon({ size = 24, color = Colors.circuit }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12 L20 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 8 L22 12 L16 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x="2" y="9" width="6" height="6" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="10" y1="10" x2="10" y2="14" stroke={color} strokeWidth="1" opacity={0.5} />
      <Line x1="13" y1="10" x2="13" y2="14" stroke={color} strokeWidth="1" opacity={0.5} />
    </Svg>
  );
}

export function CompassIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M16.24 7.76 L14 14 L7.76 16.24 L10 10 Z" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

export function MicIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="2" width="6" height="12" rx="3" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M5 10 Q5 17 12 17 Q19 17 19 10" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="9" y1="22" x2="15" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function KeyIcon({ size = 24, color = Colors.circuit }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="8" cy="8" r="5" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="8" cy="8" r="2" fill={color} opacity={0.3} />
      <Path d="M12 12 L20 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M17 17 L20 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function CoinIcon({ size = 24, color = Colors.amber }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M12 6 L12 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M9 8.5 Q12 6 15 8.5 Q12 11 9 8.5 Z" stroke={color} strokeWidth="1" fill="none" />
      <Path d="M9 15.5 Q12 13 15 15.5 Q12 18 9 15.5 Z" stroke={color} strokeWidth="1" fill="none" />
    </Svg>
  );
}

export function DiamondIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2 L22 9 L12 22 L2 9 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <Path d="M2 9 L22 9" stroke={color} strokeWidth="1" opacity={0.5} />
      <Path d="M8 2 L6 9 L12 22 L18 9 L16 2" stroke={color} strokeWidth="1" opacity={0.3} fill="none" />
    </Svg>
  );
}

export function CrownIcon({ size = 24, color = Colors.amber }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 18 L5 8 L9 12 L12 4 L15 12 L19 8 L21 18 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="12" cy="4" r="1" fill={color} />
    </Svg>
  );
}

export function PackageIcon({ size = 24, color = Colors.copper }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 8 L12 3 L21 8 L21 16 L12 21 L3 16 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <Path d="M3 8 L12 13 L21 8" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="12" y1="13" x2="12" y2="21" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}
