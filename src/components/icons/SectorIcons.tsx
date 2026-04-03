import React from 'react';
import Svg, { Circle, Path, Line, Ellipse, Rect } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

/** Kepler Belt: asteroid field — small irregular shapes orbiting a point */
export function KeplerBeltIcon({ size = 24, color = Colors.blue }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="2" fill={color} opacity={0.4} />
      <Ellipse cx="12" cy="12" rx="9" ry="4" stroke={color} strokeWidth="0.8" opacity={0.3} transform="rotate(-20, 12, 12)" />
      {/* Asteroids */}
      <Path d="M5 8 L6 7 L7 8 L6.5 9 Z" fill={color} opacity={0.7} />
      <Path d="M17 10 L18.5 9.5 L19 11 L17.5 11 Z" fill={color} opacity={0.6} />
      <Path d="M8 16 L9 15 L10 16.5 L8.5 17 Z" fill={color} opacity={0.5} />
      <Path d="M15 15 L16 14.5 L16.5 15.5 L15 16 Z" fill={color} opacity={0.6} />
      <Circle cx="4" cy="12" r="1" fill={color} opacity={0.4} />
      <Circle cx="20" cy="13" r="0.8" fill={color} opacity={0.3} />
    </Svg>
  );
}

/** Nova Fringe: stellar nursery — radiating lines from a central star */
export function NovaFringeIcon({ size = 24, color = Colors.amber }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" fill={color} opacity={0.6} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
      {/* Radiating lines */}
      <Line x1="12" y1="2" x2="12" y2="7" stroke={color} strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12" y2="22" stroke={color} strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
      <Line x1="2" y1="12" x2="7" y2="12" stroke={color} strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
      <Line x1="17" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
      <Line x1="5" y1="5" x2="8.5" y2="8.5" stroke={color} strokeWidth="1" opacity={0.3} strokeLinecap="round" />
      <Line x1="15.5" y1="15.5" x2="19" y2="19" stroke={color} strokeWidth="1" opacity={0.3} strokeLinecap="round" />
      <Line x1="5" y1="19" x2="8.5" y2="15.5" stroke={color} strokeWidth="1" opacity={0.3} strokeLinecap="round" />
      <Line x1="15.5" y1="8.5" x2="19" y2="5" stroke={color} strokeWidth="1" opacity={0.3} strokeLinecap="round" />
    </Svg>
  );
}

/** The Rift: dimensional tear — jagged split with glow */
export function RiftIcon({ size = 24, color = Colors.circuit }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 L10 8 L14 10 L9 14 L13 16 L11 22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Glow lines */}
      <Path
        d="M12 2 L10 8 L14 10 L9 14 L13 16 L11 22"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.15}
      />
    </Svg>
  );
}

/** Deep Void: empty space — minimal, single distant point */
export function DeepVoidIcon({ size = 24, color = Colors.muted }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="0.5" opacity={0.15} />
      <Circle cx="12" cy="12" r="1" fill={color} opacity={0.5} />
    </Svg>
  );
}
