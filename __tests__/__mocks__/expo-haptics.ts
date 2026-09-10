// Lightweight mock for the "unit" jest project (ts-jest transforms only
// .ts/.tsx, so expo-haptics' own ESM source can't load un-transformed).
// Only the surface src/utils/haptics.ts actually calls.
export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;

export const impactAsync = jest.fn(() => Promise.resolve());
