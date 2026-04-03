import React from 'react';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

export function VolumeIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M6 8L6 12L10 14L10 6Z" fill={color} opacity={0.8} />
      <Path d="M12 7Q16 10 12 13" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function HapticIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="7" y="3" width="6" height="14" rx="3" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="4" y1="7" x2="2" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="4" y1="10" x2="1" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="4" y1="13" x2="2" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="16" y1="7" x2="18" y2="7" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="16" y1="10" x2="19" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="16" y1="13" x2="18" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

export function InfoIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="12" y1="11" x2="12" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="7.5" r="1.2" fill={color} />
    </Svg>
  );
}

export function HeartIcon({ size = 24, color = Colors.red }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21 L10.55 19.7 C5.4 15.1 2 12.1 2 8.5 C2 5.4 4.4 3 7.5 3 C9.2 3 10.9 3.8 12 5.1 C13.1 3.8 14.8 3 16.5 3 C19.6 3 22 5.4 22 8.5 C22 12.1 18.6 15.1 13.45 19.7 Z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
    </Svg>
  );
}

export function GiftIcon({ size = 24, color = Colors.copper }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="10" width="18" height="11" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <Rect x="2" y="7" width="20" height="4" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="12" y1="7" x2="12" y2="21" stroke={color} strokeWidth="1.5" />
      <Path d="M12 7 Q9 4 7 5 Q5 6 8 7" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M12 7 Q15 4 17 5 Q19 6 16 7" stroke={color} strokeWidth="1.5" fill="none" />
    </Svg>
  );
}

export function BulbIcon({ size = 24, color = Colors.blue }: Props) {
  // Reduce Motion — circle with strike-through
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="6" y1="6" x2="14" y2="14" stroke={Colors.red} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function SearchIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="15" y1="15" x2="21" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function SignalIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="18" r="2" fill={color} />
      <Path d="M8 14 Q12 10 16 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <Path d="M5 11 Q12 5 19 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <Path d="M2 8 Q12 0 22 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function MusicIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Line x1="5" y1="6" x2="15" y2="4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="15" y1="4" x2="15" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="5" y1="6" x2="5" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="5" cy="18" r="3" fill={color} opacity={0.6} />
      <Circle cx="15" cy="16" r="3" fill={color} opacity={0.6} />
    </Svg>
  );
}

export function NotificationIcon({ size = 24, color = Colors.amber }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3 Q17 3 17 9 L17 13 L20 16 L4 16 L7 13 L7 9 Q7 3 12 3 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <Path d="M10 16 Q10 20 12 20 Q14 20 14 16" stroke={color} strokeWidth="1.5" fill="none" />
    </Svg>
  );
}

export function GlobeIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M10 3 Q14 7 14 10 Q14 13 10 17" stroke={color} strokeWidth="1" fill="none" />
      <Path d="M10 3 Q6 7 6 10 Q6 13 10 17" stroke={color} strokeWidth="1" fill="none" />
      <Line x1="3" y1="10" x2="17" y2="10" stroke={color} strokeWidth="0.8" opacity={0.5} />
    </Svg>
  );
}

export function CloudIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 18 Q2 18 2 14.5 Q2 11 6 11 Q6 7 10 5.5 Q14 4 16 7 Q20 7 21 10 Q22 13 19 14 Q22 18 18 18 Z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

export function GamepadIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x="4" y="4" width="12" height="12" rx="3" stroke={color} strokeWidth="1.5" fill="none" />
      <Circle cx="10" cy="10" r="2.5" stroke={color} strokeWidth="1" fill="none" />
      <Circle cx="10" cy="5.5" r="1.5" fill={color} opacity={0.6} />
      <Circle cx="10" cy="14.5" r="1.5" fill={color} opacity={0.6} />
      <Circle cx="5.5" cy="10" r="1.5" fill={color} opacity={0.6} />
      <Circle cx="14.5" cy="10" r="1.5" fill={color} opacity={0.6} />
    </Svg>
  );
}

export function ClipboardIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="3" width="14" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" />
      <Rect x="8" y="1" width="8" height="4" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="8" y1="10" x2="16" y2="10" stroke={color} strokeWidth="1" opacity={0.5} />
      <Line x1="8" y1="13" x2="14" y2="13" stroke={color} strokeWidth="1" opacity={0.5} />
      <Line x1="8" y1="16" x2="12" y2="16" stroke={color} strokeWidth="1" opacity={0.5} />
    </Svg>
  );
}

export function ScrollDocIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3 L18 3 Q20 3 20 5 L20 17 Q20 21 16 21 L8 21 Q4 21 4 17 L4 5 Q4 3 6 3 Z" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="8" y1="8" x2="16" y2="8" stroke={color} strokeWidth="1" opacity={0.5} />
      <Line x1="8" y1="11" x2="16" y2="11" stroke={color} strokeWidth="1" opacity={0.5} />
      <Line x1="8" y1="14" x2="13" y2="14" stroke={color} strokeWidth="1" opacity={0.5} />
    </Svg>
  );
}

export function SplitIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12 L12 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 12 L20 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M12 12 L20 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="12" cy="12" r="2" fill={color} opacity={0.4} />
    </Svg>
  );
}

export function TrophyIcon({ size = 24, color = Colors.amber }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4 L17 4 L16 12 Q14 16 12 16 Q10 16 8 12 Z" stroke={color} strokeWidth="1.5" fill="none" />
      <Line x1="12" y1="16" x2="12" y2="19" stroke={color} strokeWidth="1.5" />
      <Rect x="8" y="19" width="8" height="2" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M7 4 Q3 4 3 8 Q3 10 7 10" stroke={color} strokeWidth="1.5" fill="none" />
      <Path d="M17 4 Q21 4 21 8 Q21 10 17 10" stroke={color} strokeWidth="1.5" fill="none" />
    </Svg>
  );
}
