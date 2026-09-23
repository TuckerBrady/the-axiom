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

// Short error buzz for a rejected action (AXM-013: a drop or tap-place on a
// blown cell), so the rejection reads as the scar and not a missed gesture.
export function hapticError(): void {
  if (!useSettingsStore.getState().hapticsEnabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
