// ─── COGS eye state color tokens (DECISION-08) ──────────────────────────────
// Locked values from the Hub mockup. The ONLY place hex values live.
// Components reference tokens by CogsEyeColor name, never raw hex.

export type CogsEyeColor = 'AMBER' | 'BLUE' | 'GREEN' | 'RED' | 'DARK';

export const COGS_EYE_COLORS: Record<CogsEyeColor, {
  solid: string;
  border: string;
  dim: string;
  avatarBg: string;
}> = {
  AMBER: {
    solid: '#F59E0B',
    border: 'rgba(245,158,11,0.28)',
    dim: 'rgba(245,158,11,0.09)',
    avatarBg: 'rgba(245,158,11,0.08)',
  },
  BLUE: {
    solid: '#38BDF8',
    border: 'rgba(56,189,248,0.25)',
    dim: 'rgba(56,189,248,0.07)',
    avatarBg: 'rgba(56,189,248,0.08)',
  },
  GREEN: {
    solid: '#4ADE80',
    border: 'rgba(74,222,128,0.28)',
    dim: 'rgba(74,222,128,0.09)',
    avatarBg: 'rgba(74,222,128,0.08)',
  },
  RED: {
    solid: '#F87171',
    border: 'rgba(248,113,113,0.28)',
    dim: 'rgba(248,113,113,0.09)',
    avatarBg: 'rgba(248,113,113,0.08)',
  },
  DARK: {
    solid: '#1F2937',
    border: 'rgba(31,41,55,0.4)',
    dim: 'rgba(31,41,55,0.15)',
    avatarBg: 'rgba(31,41,55,0.2)',
  },
} as const;
