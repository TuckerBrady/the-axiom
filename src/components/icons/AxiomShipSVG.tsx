import React from 'react';
import Svg, { Path, Rect, Ellipse, Line, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '../../theme/tokens';

interface Props {
  width?: number;
  height?: number;
}

export default function AxiomShipSVG({ width = 120, height = 80 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 80" fill="none">
      <Defs>
        <RadialGradient id="engineGlow" cx="50%" cy="100%" r="60%">
          <Stop offset="0%" stopColor={Colors.blue} stopOpacity="0.4" />
          <Stop offset="100%" stopColor={Colors.blue} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Engine glow underneath */}
      <Ellipse cx="60" cy="72" rx="40" ry="12" fill="url(#engineGlow)" />

      {/* Main hull - wide angular shape */}
      <Path
        d="M60 8 L100 35 L95 50 L25 50 L20 35 Z"
        stroke={Colors.blue}
        strokeWidth="1.5"
        fill="#0a1628"
        strokeOpacity={0.7}
      />

      {/* Command tower */}
      <Path
        d="M52 15 L68 15 L65 30 L55 30 Z"
        stroke={Colors.blue}
        strokeWidth="1"
        fill="#0e1f36"
        strokeOpacity={0.5}
      />
      {/* Tower window */}
      <Rect x="57" y="18" width="6" height="3" rx="1" fill={Colors.blue} opacity={0.4} />

      {/* Hull detail lines (battle worn) */}
      <Line x1="30" y1="38" x2="50" y2="38" stroke={Colors.dim} strokeWidth="0.8" opacity={0.4} />
      <Line x1="70" y1="38" x2="90" y2="38" stroke={Colors.dim} strokeWidth="0.8" opacity={0.4} />
      <Line x1="35" y1="44" x2="85" y2="44" stroke={Colors.dim} strokeWidth="0.5" opacity={0.3} />

      {/* Copper accent stripe */}
      <Line x1="25" y1="48" x2="95" y2="48" stroke={Colors.copper} strokeWidth="1" opacity={0.5} />

      {/* Left engine pod */}
      <G>
        <Path
          d="M22 50 L18 52 L18 65 L28 65 L28 52 L24 50"
          stroke={Colors.blue}
          strokeWidth="1"
          fill="#0a1628"
          strokeOpacity={0.5}
        />
        <Rect x="19" y="62" width="8" height="4" rx="1" fill={Colors.blue} opacity={0.3} />
        {/* Exhaust */}
        <Line x1="21" y1="66" x2="21" y2="72" stroke={Colors.blue} strokeWidth="1.5" opacity={0.2} />
        <Line x1="25" y1="66" x2="25" y2="74" stroke={Colors.blue} strokeWidth="1" opacity={0.15} />
      </G>

      {/* Right engine pod */}
      <G>
        <Path
          d="M92 50 L88 52 L88 65 L98 65 L98 52 L96 50"
          stroke={Colors.blue}
          strokeWidth="1"
          fill="#0a1628"
          strokeOpacity={0.5}
        />
        <Rect x="89" y="62" width="8" height="4" rx="1" fill={Colors.blue} opacity={0.3} />
        {/* Exhaust */}
        <Line x1="91" y1="66" x2="91" y2="72" stroke={Colors.blue} strokeWidth="1.5" opacity={0.2} />
        <Line x1="95" y1="66" x2="95" y2="74" stroke={Colors.blue} strokeWidth="1" opacity={0.15} />
      </G>

      {/* Battle damage scratches */}
      <Line x1="40" y1="28" x2="46" y2="35" stroke={Colors.dim} strokeWidth="0.5" opacity={0.3} />
      <Line x1="78" y1="32" x2="82" y2="38" stroke={Colors.dim} strokeWidth="0.5" opacity={0.25} />
    </Svg>
  );
}
