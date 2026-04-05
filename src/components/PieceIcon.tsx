import React from 'react';
import Svg, { Circle, Line, Rect, Path } from 'react-native-svg';
import { Colors } from '../theme/tokens';

// Normalize underscore IDs (Codex data) to camelCase (engine)
function normalizeType(type: string): string {
  if (type === 'config_node') return 'configNode';
  return type;
}

interface Props {
  type: string;
  size?: number;
  color?: string;
}

/**
 * Canonical piece icon SVGs — recovered from the approved Codex designs.
 * Single source of truth for Codex grid, Codex detail, game board, and tray.
 */
export function PieceIcon({ type: rawType, size = 24, color }: Props) {
  const type = normalizeType(rawType);
  const s = size;

  switch (type) {
    case 'conveyor':
      return (
        <Svg width={s} height={s * 0.6} viewBox="0 0 60 36">
          <Rect x="5" y="10" width="50" height="16" rx="8" fill="#0e1f36" stroke={color ?? Colors.copper} strokeWidth="1.5" />
          <Circle cx="13" cy="18" r="8" fill="#0a1628" stroke={color ?? Colors.copper} strokeWidth="1.5" />
          <Circle cx="13" cy="18" r="3.5" fill={color ?? Colors.copper} />
          <Circle cx="47" cy="18" r="8" fill="#0a1628" stroke={color ?? Colors.copper} strokeWidth="1.5" />
          <Circle cx="47" cy="18" r="3.5" fill={color ?? Colors.copper} />
          <Path d="M 23 14 L 29 18 L 23 22" stroke={color ?? Colors.amber} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M 30 14 L 36 18 L 30 22" stroke={color ?? Colors.amber} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        </Svg>
      );
    case 'source':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={color ?? Colors.amber} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="10" fill="#060e1a" stroke={color ?? Colors.amber} strokeWidth="1" strokeOpacity="0.5" />
          <Path d="M 17 13 L 17 27 L 27 20 Z" fill={color ?? Colors.amber} />
        </Svg>
      );
    case 'output':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="16" fill="#0e1f36" stroke={color ?? Colors.green} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="9" fill="#060e1a" stroke={color ?? Colors.green} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="4" fill={color ?? Colors.green} />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path
            d="M 20 6 L 22 10 L 26 10 L 28 14 L 34 16 L 34 20 L 34 24 L 28 26 L 26 30 L 22 30 L 20 34 L 18 30 L 14 30 L 12 26 L 6 24 L 6 20 L 6 16 L 12 14 L 14 10 L 18 10 Z"
            fill="#0e1f36" stroke={color ?? Colors.copper} strokeWidth="1.5" strokeLinejoin="round"
          />
          <Circle cx="20" cy="20" r="6" fill="#060e1a" stroke={color ?? Colors.copper} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="2.5" fill={color ?? Colors.copper} />
        </Svg>
      );
    case 'splitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="6" y="17" width="16" height="6" rx="3" fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="1.5" />
          <Rect x="24" y="8" width="12" height="6" rx="3" fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="1.5" />
          <Rect x="24" y="26" width="12" height="6" rx="3" fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="1.5" />
          <Path d="M 22 20 L 28 11" stroke={color ?? Colors.blue} strokeWidth="1.5" strokeOpacity="0.7" />
          <Path d="M 22 20 L 28 29" stroke={color ?? Colors.blue} strokeWidth="1.5" strokeOpacity="0.7" />
        </Svg>
      );
    case 'configNode':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="5" fill="#0e1f36" stroke={color ?? Colors.circuit} strokeWidth="1.5" />
          <Line x1="14" y1="16" x2="26" y2="16" stroke={color ?? Colors.circuit} strokeWidth="1.5" strokeOpacity="0.8" />
          <Line x1="14" y1="20" x2="22" y2="20" stroke={color ?? Colors.circuit} strokeWidth="1.5" strokeOpacity="0.5" />
          <Line x1="14" y1="24" x2="24" y2="24" stroke={color ?? Colors.circuit} strokeWidth="1.5" strokeOpacity="0.6" />
          <Circle cx="26" cy="20" r="2.5" fill={color ?? Colors.circuit} />
        </Svg>
      );
    case 'scanner':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="15" fill="#0e1f36" stroke={color ?? Colors.circuit} strokeWidth="1.5" />
          <Circle cx="20" cy="20" r="10" fill="none" stroke={color ?? Colors.circuit} strokeWidth="1" strokeOpacity="0.4" />
          <Circle cx="20" cy="20" r="5" fill="none" stroke={color ?? Colors.circuit} strokeWidth="1" strokeOpacity="0.7" />
          <Line x1="20" y1="5" x2="20" y2="35" stroke={color ?? Colors.circuit} strokeWidth="1" strokeOpacity="0.3" />
          <Line x1="5" y1="20" x2="35" y2="20" stroke={color ?? Colors.circuit} strokeWidth="1" strokeOpacity="0.3" />
          <Circle cx="20" cy="20" r="2" fill={color ?? Colors.circuit} />
        </Svg>
      );
    case 'transmitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Path d="M 20 28 L 20 12" stroke={color ?? Colors.blue} strokeWidth="2" strokeLinecap="round" />
          <Path d="M 14 22 Q 10 16 14 10" stroke={color ?? Colors.blue} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.7" />
          <Path d="M 26 22 Q 30 16 26 10" stroke={color ?? Colors.blue} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.7" />
          <Path d="M 10 26 Q 4 18 10 8" stroke={color ?? Colors.blue} strokeWidth="1" fill="none" strokeLinecap="round" strokeOpacity="0.4" />
          <Path d="M 30 26 Q 36 18 30 8" stroke={color ?? Colors.blue} strokeWidth="1" fill="none" strokeLinecap="round" strokeOpacity="0.4" />
          <Circle cx="20" cy="30" r="3" fill={color ?? Colors.blue} />
          <Rect x="16" y="30" width="8" height="5" rx="2" fill="#0e1f36" stroke={color ?? Colors.blue} strokeWidth="1" />
        </Svg>
      );
    default:
      return (
        <Svg width={s} height={s} viewBox="0 0 40 40">
          <Rect x="8" y="8" width="24" height="24" rx="4" fill="#0e1f36" stroke={color ?? Colors.dim} strokeWidth="1.5" />
        </Svg>
      );
  }
}
