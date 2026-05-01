import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../store/settingsStore';

export function hapticLight(): void {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium(): void {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function hapticHeavy(): void {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}
