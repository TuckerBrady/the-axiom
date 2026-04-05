import React from 'react';
import Svg, { Circle, Line, Rect, Path } from 'react-native-svg';
import { Colors } from '../theme/tokens';

// Normalize underscore IDs (Codex) to camelCase (engine)
function normalizeType(type: string): string {
  if (type === 'config_node') return 'configNode';
  return type;
}

// Default color by piece category
function defaultColor(type: string): string {
  switch (normalizeType(type)) {
    case 'configNode':
    case 'scanner':
    case 'transmitter':
      return Colors.amber;
    default:
      return Colors.blue;
  }
}

interface Props {
  type: string;
  size?: number;
  color?: string;
}

export function PieceIcon({ type: rawType, size = 24, color }: Props) {
  const type = normalizeType(rawType);
  const c = color ?? defaultColor(type);
  const sw = 1.5;

  switch (type) {
    case 'source':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Circle cx="14" cy="14" r="6" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="14" y1="4" x2="14" y2="2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="14" y1="26" x2="14" y2="24" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="4" y1="14" x2="2" y2="14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="26" y1="14" x2="24" y2="14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'output':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Circle cx="14" cy="14" r="7" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M10 14L14 10L18 14L14 18Z" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'conveyor':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="3" y="10" width="22" height="8" rx="3" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M17 9L23 14L17 19" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Circle cx="14" cy="14" r="5" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Rect x="12.5" y="3" width="3" height="5" rx="1" fill="none" stroke={c} strokeWidth={sw} />
          <Rect x="12.5" y="20" width="3" height="5" rx="1" fill="none" stroke={c} strokeWidth={sw} />
          <Rect x="3" y="12.5" width="5" height="3" rx="1" fill="none" stroke={c} strokeWidth={sw} />
          <Rect x="20" y="12.5" width="5" height="3" rx="1" fill="none" stroke={c} strokeWidth={sw} />
        </Svg>
      );
    case 'splitter':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Path d="M4 14L14 14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M14 14L24 8" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M14 14L24 20" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="14" cy="14" r="3" fill="none" stroke={c} strokeWidth={sw} />
        </Svg>
      );
    case 'configNode':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="4" y="8" width="20" height="12" rx="4" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="14" cy="14" r="3" fill="none" stroke={c} strokeWidth={sw} />
          <Line x1="0" y1="14" x2="4" y2="14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="24" y1="14" x2="28" y2="14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'scanner':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="3" y="9" width="22" height="10" rx="3" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Rect x="10" y="11" width="7" height="6" rx="1.5" fill="none" stroke={c} strokeWidth={sw} />
          <Line x1="0" y1="14" x2="3" y2="14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'transmitter':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="3" y="9" width="22" height="10" rx="3" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
          <Rect x="11" y="11" width="7" height="6" rx="1.5" fill="none" stroke={c} strokeWidth={sw} />
          <Line x1="25" y1="14" x2="28" y2="14" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="4" y="4" width="20" height="20" rx="4" fill="none" stroke={Colors.dim} strokeWidth={sw} />
        </Svg>
      );
  }
}
