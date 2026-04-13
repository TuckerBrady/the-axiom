import React from 'react';
import Svg, { Circle, Rect, Path, Line, Ellipse, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SystemLightState = 'on' | 'off' | 'dmg';

interface Props {
  systemStates: [
    SystemLightState, SystemLightState, SystemLightState, SystemLightState,
    SystemLightState, SystemLightState, SystemLightState, SystemLightState,
  ];
  width?: number;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const BLUE = '#38BDF8';
const RED = '#F87171';
const COPPER = '#B87333';
const HULL_STROKE = 'rgba(255,255,255,0.15)';
const HULL_FILL = 'rgba(12,22,38,0.93)';
const PANEL_STROKE = 'rgba(255,255,255,0.05)';
const DECK_LINE = 'rgba(255,255,255,0.06)';
const WEAR = 'rgba(255,255,255,0.03)';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * The Axiom — top-down ship rendering for the Hub captain's dashboard.
 * 8 system lights accept real state (on/off/dmg). Everything else is
 * atmospheric detail: hull plating, bridge module, engine nacelles,
 * antenna cluster, cargo bays, and wear marks.
 */
export default function AxiomShip({ systemStates, width = 270 }: Props) {
  const scale = width / 270;
  const height = 135 * scale;

  return (
    <Svg width={width} height={height} viewBox="0 0 270 135">
      <Defs>
        <RadialGradient id="bridgeGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={BLUE} stopOpacity="0.15" />
          <Stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="engineGlowL" cx="50%" cy="0%" r="80%">
          <Stop offset="0%" stopColor={BLUE} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="engineGlowR" cx="50%" cy="0%" r="80%">
          <Stop offset="0%" stopColor={BLUE} stopOpacity="0.2" />
          <Stop offset="100%" stopColor={BLUE} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* ── Main hull (filled, not just outline) ── */}
      <Path
        d="M42,95 L198,95 L228,75 L228,45 L198,25 L62,25 L42,40 Z"
        fill={HULL_FILL}
        stroke={HULL_STROKE}
        strokeWidth="1.2"
      />

      {/* ── Command section (starboard) ── */}
      <Path
        d="M198,25 L228,45 L228,75 L198,95 L248,80 L248,35 Z"
        fill="rgba(8,18,32,0.9)"
        stroke={HULL_STROKE}
        strokeWidth="0.8"
      />

      {/* ── Hull plating (irregular panel lines) ── */}
      <G opacity={1}>
        <Line x1="72" y1="25" x2="72" y2="95" stroke={PANEL_STROKE} strokeWidth="0.6" />
        <Line x1="105" y1="25" x2="105" y2="95" stroke={PANEL_STROKE} strokeWidth="0.5" />
        <Line x1="135" y1="28" x2="135" y2="92" stroke={PANEL_STROKE} strokeWidth="0.7" />
        <Line x1="165" y1="25" x2="165" y2="95" stroke={PANEL_STROKE} strokeWidth="0.5" />
        <Line x1="195" y1="30" x2="195" y2="90" stroke={PANEL_STROKE} strokeWidth="0.6" />
        {/* Horizontal panel seams */}
        <Line x1="50" y1="45" x2="220" y2="45" stroke={PANEL_STROKE} strokeWidth="0.5" />
        <Line x1="48" y1="60" x2="225" y2="60" stroke={PANEL_STROKE} strokeWidth="0.6" />
        <Line x1="45" y1="75" x2="222" y2="75" stroke={PANEL_STROKE} strokeWidth="0.5" />
        {/* Diagonal patch seam (repair work) */}
        <Line x1="88" y1="32" x2="95" y2="42" stroke={PANEL_STROKE} strokeWidth="0.8" />
        <Line x1="150" y1="68" x2="158" y2="78" stroke={PANEL_STROKE} strokeWidth="0.7" />
      </G>

      {/* ── Deck lines (internal structure visible through hull) ── */}
      <Line x1="60" y1="50" x2="200" y2="50" stroke={DECK_LINE} strokeWidth="0.5" />
      <Line x1="55" y1="70" x2="210" y2="70" stroke={DECK_LINE} strokeWidth="0.5" />

      {/* ── Bridge module (raised housing, not just an ellipse) ── */}
      <G>
        {/* Bridge glow underneath */}
        <Ellipse cx="190" cy="42" rx="24" ry="14" fill="url(#bridgeGlow)" />
        {/* Bridge housing */}
        <Path
          d="M172,36 L208,36 L212,42 L208,48 L172,48 L168,42 Z"
          fill="rgba(6,14,26,0.95)"
          stroke={BLUE}
          strokeWidth="0.8"
          strokeOpacity={0.35}
        />
        {/* Forward viewport */}
        <Rect x="195" y="38" width="12" height="8" rx="2" fill="rgba(56,189,248,0.08)" stroke={BLUE} strokeWidth="0.6" strokeOpacity={0.4} />
        {/* Bridge interior detail */}
        <Line x1="178" y1="42" x2="192" y2="42" stroke={BLUE} strokeWidth="0.4" strokeOpacity={0.15} />
        <Circle cx="185" cy="42" r="1.5" fill={BLUE} fillOpacity={0.2} />
      </G>

      {/* ── Engine nacelle LEFT ── */}
      <G>
        <Rect x="18" y="50" width="24" height="32" rx="3" fill="rgba(8,16,28,0.95)" stroke={HULL_STROKE} strokeWidth="0.8" />
        {/* Intake grating */}
        <Line x1="22" y1="54" x2="38" y2="54" stroke={HULL_STROKE} strokeWidth="0.5" />
        <Line x1="22" y1="57" x2="38" y2="57" stroke={HULL_STROKE} strokeWidth="0.5" />
        <Line x1="22" y1="60" x2="38" y2="60" stroke={HULL_STROKE} strokeWidth="0.5" />
        {/* Exhaust bell */}
        <Rect x="20" y="76" width="20" height="6" rx="1.5" fill={BLUE} fillOpacity={0.18} />
        {/* Exhaust glow */}
        <Ellipse cx="30" cy="86" rx="10" ry="4" fill="url(#engineGlowL)" />
      </G>

      {/* ── Engine nacelle RIGHT (secondary, smaller) ── */}
      <G>
        <Rect x="18" y="30" width="20" height="18" rx="2" fill="rgba(8,16,28,0.9)" stroke={HULL_STROKE} strokeWidth="0.6" />
        {/* Intake grating */}
        <Line x1="22" y1="34" x2="34" y2="34" stroke={HULL_STROKE} strokeWidth="0.4" />
        <Line x1="22" y1="37" x2="34" y2="37" stroke={HULL_STROKE} strokeWidth="0.4" />
        <Line x1="22" y1="40" x2="34" y2="40" stroke={HULL_STROKE} strokeWidth="0.4" />
        {/* Exhaust */}
        <Rect x="20" y="26" width="16" height="4" rx="1" fill={BLUE} fillOpacity={0.12} />
      </G>

      {/* ── Antenna / sensor cluster (dorsal spine) ── */}
      <G>
        <Line x1="175" y1="30" x2="175" y2="18" stroke={HULL_STROKE} strokeWidth="0.8" strokeLinecap="round" />
        <Circle cx="175" cy="17" r="1.5" fill={BLUE} fillOpacity={0.3} />
        <Line x1="182" y1="32" x2="185" y2="22" stroke={HULL_STROKE} strokeWidth="0.6" strokeLinecap="round" />
        <Line x1="168" y1="32" x2="165" y2="24" stroke={HULL_STROKE} strokeWidth="0.6" strokeLinecap="round" />
      </G>

      {/* ── Cargo bays (midships) ── */}
      <G>
        <Rect x="108" y="48" width="22" height="12" rx="2" fill="rgba(255,255,255,0.01)" stroke={HULL_STROKE} strokeWidth="0.6" />
        <Rect x="108" y="64" width="22" height="12" rx="2" fill="rgba(255,255,255,0.01)" stroke={HULL_STROKE} strokeWidth="0.6" />
        {/* Bay door lines */}
        <Line x1="119" y1="48" x2="119" y2="60" stroke={PANEL_STROKE} strokeWidth="0.5" />
        <Line x1="119" y1="64" x2="119" y2="76" stroke={PANEL_STROKE} strokeWidth="0.5" />
      </G>

      {/* ── Copper accent stripe ── */}
      <Line x1="50" y1="92" x2="210" y2="92" stroke={COPPER} strokeWidth="1" strokeOpacity={0.35} />

      {/* ── AX-MOD port (copper) ── */}
      <Rect x="145" y="55" width="5" height="7" rx="1.5" fill="none" stroke={COPPER} strokeWidth="0.8" strokeOpacity={0.4} />

      {/* ── Wear marks (hull scars) ── */}
      <G>
        <Rect x="78" y="35" width="8" height="5" rx="1" fill={WEAR} />
        <Rect x="155" y="50" width="6" height="4" rx="1" fill={WEAR} />
        <Rect x="92" y="72" width="10" height="3" rx="1" fill={WEAR} />
        <Path d="M115,34 L120,38" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
        <Path d="M180,70 L185,75" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
      </G>

      {/* ── Hull designation ── */}
      <SvgText
        x="120"
        y="108"
        fontSize="7"
        fontFamily="monospace"
        fill="rgba(255,255,255,0.08)"
        letterSpacing={6}
        textAnchor="middle"
      >
        THE AXIOM
      </SvgText>

      {/* ── 8 System lights ── */}
      {systemStates.map((state, i) => {
        const cx = 70 + i * 20;
        const cy = 88;
        const color = state === 'on' ? BLUE : state === 'dmg' ? RED : 'rgba(255,255,255,0.1)';
        const glowR = state === 'on' ? 6 : 0;
        return (
          <G key={`sys-${i}`}>
            {/* Glow halo for on-state */}
            {state === 'on' && (
              <Circle cx={cx} cy={cy} r={glowR} fill={BLUE} fillOpacity={0.15} />
            )}
            <Circle
              cx={cx}
              cy={cy}
              r={3.5}
              fill={color}
              opacity={state === 'off' ? 0.5 : 1}
            />
            {/* Light housing ring */}
            <Circle
              cx={cx}
              cy={cy}
              r={5}
              fill="none"
              stroke={HULL_STROKE}
              strokeWidth="0.5"
            />
          </G>
        );
      })}
    </Svg>
  );
}
