// Lightweight mock for the "unit" jest project (ts-jest transforms only
// .ts/.tsx, so expo-haptics' own ESM source can't load un-transformed).
// Only the surface src/utils/haptics.ts actually calls.
export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;

export const impactAsync = jest.fn(() => Promise.resolve());

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export const notificationAsync = jest.fn(() => Promise.resolve());
