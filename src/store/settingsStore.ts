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
  devForceRequisitionGate: boolean;
  /**
   * Dev-only board-size override as `"<columns>x<rows>"`, or null for the
   * level's own size. PROMPT_159 task 3: the board-size sweep changes the
   * board from here, not from a source edit, so one `npm run shots` run can
   * shoot every candidate size. Read through `resolveBoardSize`, which
   * ignores it unless SHOW_DEV_TOOLS is true — so it is invisible in a
   * `production` build.
   */
  devBoardSizeOverride: string | null;
  setSfxEnabled: (v: boolean) => void;
  setMusicEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setCogsHintsEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setArcWheelPosition: (v: ArcWheelPosition) => void;
  setDevForceRequisitionGate: (v: boolean) => void;
  setDevBoardSizeOverride: (v: string | null) => void;
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
    devForceRequisitionGate: state.devForceRequisitionGate,
    devBoardSizeOverride: state.devBoardSizeOverride,
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
  devForceRequisitionGate: false,
  devBoardSizeOverride: null,
  setSfxEnabled: (v) => { set({ sfxEnabled: v }); persist({ ...get(), sfxEnabled: v }); },
  setMusicEnabled: (v) => { set({ musicEnabled: v }); persist({ ...get(), musicEnabled: v }); },
  setHapticsEnabled: (v) => { set({ hapticsEnabled: v }); persist({ ...get(), hapticsEnabled: v }); },
  setCogsHintsEnabled: (v) => { set({ cogsHintsEnabled: v }); persist({ ...get(), cogsHintsEnabled: v }); },
  setNotificationsEnabled: (v) => { set({ notificationsEnabled: v }); persist({ ...get(), notificationsEnabled: v }); },
  setArcWheelPosition: (v) => { set({ arcWheelPosition: v }); persist({ ...get(), arcWheelPosition: v }); },
  setDevForceRequisitionGate: (v) => { set({ devForceRequisitionGate: v }); persist({ ...get(), devForceRequisitionGate: v }); },
  setDevBoardSizeOverride: (v) => { set({ devBoardSizeOverride: v }); persist({ ...get(), devBoardSizeOverride: v }); },
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
          devForceRequisitionGate: parsed.devForceRequisitionGate ?? false,
          devBoardSizeOverride:
            typeof parsed.devBoardSizeOverride === 'string'
              ? parsed.devBoardSizeOverride
              : null,
        });
      } catch { /* corrupted storage, use defaults */ }
    }
  },
}));
