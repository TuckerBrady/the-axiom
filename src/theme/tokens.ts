// ─── Game Identity ─────────────────────────────────────────────────────────────
export const Game = {
  name: 'The Axiom',
  tagline: 'Not all damage is structural',
  cogsDesignation: 'C.O.G.S Unit 7',
  cogsFullName: 'Cognitive Operations and Guidance System',
} as const;

// ─── Colours ───────────────────────────────────────────────────────────────────
export const Colors = {
  void: '#06090f',
  navy: '#0a1628',
  steel: '#1a3a5c',
  copper: '#c87941',
  copperLight: '#e8a060',
  amber: '#f0b429',
  cream: '#f5ede0',
  starWhite: '#e8f0ff',
  dim: '#3a5070',
  muted: '#7a96b0',
  green: '#4ecb8d',
  blue: '#4a9eff',
  red: '#e05555',
  circuit: '#a78bfa',
  neonCyan: '#00E5FF',
  neonGreen: '#00FF87',
  neonYellow: '#FFE000',
  // Y2K Indicator Bar palette
  tapeInBar: '#BFFF3F',       // Neon Green (N64 Funtastic)
  tapeTrailBar: '#A97FDB',    // Atomic Purple (Game Boy Color)
  tapeOutBar: '#FF7D3F',      // Fire Orange (iMac Tangerine)
  // Gate-outcome colors
  gatePass: '#00FF87',        // Pulse passed through gate
  gateBlock: '#FF3B3B',       // Pulse blocked by gate
}

export const Fonts = {
  orbitron: 'Orbitron',
  spaceMono: 'Space Mono',
  exo2: 'Exo 2',
}

export const FontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  display: 32,
  hero: 48,
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}
