import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

interface Props {
  rank: number; // 1-10
  size?: number;
}

export function RankInsignia({ rank, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {rank === 1 && (
        /* R01 Salvager — empty circle */
        <Circle cx="12" cy="12" r="7" stroke="rgba(58,80,112,0.6)" strokeWidth="1.5" />
      )}
      {rank === 2 && (
        /* R02 Apprentice — filled circle */
        <Circle cx="12" cy="12" r="4" fill="rgba(74,158,255,0.5)" stroke="rgba(74,158,255,0.7)" strokeWidth="1" />
      )}
      {rank === 3 && (
        /* R03 Technician — two circles connected */
        <>
          <Circle cx="8" cy="12" r="3.2" fill="rgba(74,158,255,0.55)" />
          <Circle cx="16" cy="12" r="3.2" fill="rgba(74,158,255,0.55)" />
          <Line x1="11.2" y1="12" x2="12.8" y2="12" stroke="rgba(74,158,255,0.5)" strokeWidth="1.5" />
        </>
      )}
      {rank === 4 && (
        /* R04 Mechanic — 3 pip triangle in copper */
        <>
          <Circle cx="12" cy="6" r="2.5" fill="rgba(200,121,65,0.9)" />
          <Circle cx="6" cy="16" r="2.5" fill="rgba(200,121,65,0.9)" />
          <Circle cx="18" cy="16" r="2.5" fill="rgba(200,121,65,0.9)" />
          <Line x1="12" y1="8.5" x2="7" y2="13.5" stroke="rgba(200,121,65,0.4)" strokeWidth="0.8" />
          <Line x1="12" y1="8.5" x2="17" y2="13.5" stroke="rgba(200,121,65,0.4)" strokeWidth="0.8" />
          <Line x1="8.5" y1="16" x2="15.5" y2="16" stroke="rgba(200,121,65,0.4)" strokeWidth="0.8" />
        </>
      )}
      {rank === 5 && (
        /* R05 Engineer — single chevron */
        <Path d="M4,8 L12,16 L20,8" stroke="rgba(74,158,255,0.4)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {rank === 6 && (
        /* R06 Lead Engineer — double chevron */
        <>
          <Path d="M4,6 L12,13 L20,6" stroke="rgba(74,158,255,0.4)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M4,12 L12,19 L20,12" stroke="rgba(74,158,255,0.4)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {rank === 7 && (
        /* R07 Systems Architect — triple chevron */
        <>
          <Path d="M4,4 L12,9 L20,4" stroke="rgba(74,158,255,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M4,9 L12,14 L20,9" stroke="rgba(74,158,255,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M4,14 L12,19 L20,14" stroke="rgba(74,158,255,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {rank === 8 && (
        /* R08 Chief Engineer — circuit bar + chevron */
        <>
          <Line x1="4" y1="7" x2="20" y2="7" stroke="rgba(74,158,255,0.45)" strokeWidth="1.8" />
          <Circle cx="8" cy="7" r="2" fill="rgba(74,158,255,0.5)" />
          <Circle cx="16" cy="7" r="2" fill="rgba(74,158,255,0.5)" />
          <Path d="M4,10 L12,17 L20,10" stroke="rgba(74,158,255,0.4)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {rank === 9 && (
        /* R09 Captain — double circuit bar */
        <>
          <Line x1="4" y1="8" x2="20" y2="8" stroke="rgba(74,158,255,0.45)" strokeWidth="1.8" />
          <Circle cx="8" cy="8" r="3" fill="rgba(74,158,255,0.5)" stroke="rgba(74,158,255,0.65)" strokeWidth="0.8" />
          <Circle cx="16" cy="8" r="3" fill="rgba(74,158,255,0.5)" stroke="rgba(74,158,255,0.65)" strokeWidth="0.8" />
          <Line x1="4" y1="16" x2="20" y2="16" stroke="rgba(74,158,255,0.45)" strokeWidth="1.8" />
          <Circle cx="8" cy="16" r="3" fill="rgba(74,158,255,0.5)" stroke="rgba(74,158,255,0.65)" strokeWidth="0.8" />
          <Circle cx="16" cy="16" r="3" fill="rgba(74,158,255,0.5)" stroke="rgba(74,158,255,0.65)" strokeWidth="0.8" />
        </>
      )}
      {rank === 10 && (
        /* R10 Commander — corner brackets + center pip */
        <>
          <Line x1="3" y1="3" x2="3" y2="8" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Line x1="3" y1="3" x2="8" y2="3" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Line x1="21" y1="3" x2="21" y2="8" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Line x1="21" y1="3" x2="16" y2="3" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Line x1="3" y1="21" x2="3" y2="16" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Line x1="3" y1="21" x2="8" y2="21" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Line x1="21" y1="21" x2="21" y2="16" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Line x1="21" y1="21" x2="16" y2="21" stroke="rgba(200,121,65,0.55)" strokeWidth="2" />
          <Circle cx="12" cy="12" r="4" stroke="rgba(200,121,65,0.5)" strokeWidth="1.5" fill="none" />
          <Circle cx="12" cy="12" r="1.5" fill="rgba(200,121,65,0.6)" />
        </>
      )}
    </Svg>
  );
}

export const RANK_NAMES = [
  'Salvager',
  'Apprentice',
  'Technician',
  'Mechanic',
  'Engineer',
  'Lead Engineer',
  'Sys. Architect',
  'Chief Engineer',
  'Captain',
  'Commander',
] as const;
