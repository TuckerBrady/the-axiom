import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'axiom_settings';

export type ArcWheelPosition = 'left' | 'right';

interface SettingsState {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  cogsHintsEnabled: boolean;
  notificationsEnabled: boolean;
  arcWheelPosition: ArcWheelPosition;
  setSfxEnabled: (v: boolean) => void;
  setMusicEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setCogsHintsEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setArcWheelPosition: (v: ArcWheelPosition) => void;
  hydrate: () => Promise<void>;
}

function persist(state: Partial<SettingsState>) {
  const serializable = {
    sfxEnabled: state.sfxEnabled,
    musicEnabled: state.musicEnabled,
    hapticsEnabled: state.hapticsEnabled,
    cogsHintsEnabled: state.cogsHintsEnabled,
    notificationsEnabled: state.notificationsEnabled,
    arcWheelPosition: state.arcWheelPosition,
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(serializable));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sfxEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  cogsHintsEnabled: true,
  notificationsEnabled: false,
  arcWheelPosition: 'right',
  setSfxEnabled: (v) => { set({ sfxEnabled: v }); persist({ ...get(), sfxEnabled: v }); },
  setMusicEnabled: (v) => { set({ musicEnabled: v }); persist({ ...get(), musicEnabled: v }); },
  setHapticsEnabled: (v) => { set({ hapticsEnabled: v }); persist({ ...get(), hapticsEnabled: v }); },
  setCogsHintsEnabled: (v) => { set({ cogsHintsEnabled: v }); persist({ ...get(), cogsHintsEnabled: v }); },
  setNotificationsEnabled: (v) => { set({ notificationsEnabled: v }); persist({ ...get(), notificationsEnabled: v }); },
  setArcWheelPosition: (v) => { set({ arcWheelPosition: v }); persist({ ...get(), arcWheelPosition: v }); },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        set({
          sfxEnabled: parsed.sfxEnabled ?? true,
          musicEnabled: parsed.musicEnabled ?? true,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          cogsHintsEnabled: parsed.cogsHintsEnabled ?? true,
          notificationsEnabled: parsed.notificationsEnabled ?? false,
          arcWheelPosition: parsed.arcWheelPosition === 'left' ? 'left' : 'right',
        });
      } catch { /* corrupted storage, use defaults */ }
    }
  },
}));
