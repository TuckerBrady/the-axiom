// Pure helpers shared by the value-bubble interaction layer.
// Kept in a separate module so unit tests can import them without the
// React Native / Reanimated transform chain.

export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Slow-motion on pulse 0 so new players see each protocol read/write;
// subsequent pulses run at full speed.
export const getPulseSpeed = (pulseIndex: number): number =>
  pulseIndex === 0 ? 2.0 : 1.0;
