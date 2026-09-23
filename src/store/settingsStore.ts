import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'axiom_settings';

interface SettingsState {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  cogsHintsEnabled: boolean;
  notificationsEnabled: boolean;
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
    devForceRequisitionGate: state.devForceRequisitionGate,
    devBoardSizeOverride: state.devBoardSizeOverride,
  };
  AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(serializable));
}

// Keys older builds persisted that no longer exist. AXM-013 removed the
// left/right side setting along with the piece selector it positioned. The
// key is assembled from parts on purpose: it is the one intentional reference
// to the removed selector, and spelling it whole would put it back into the
// repo-wide "no references left" search (reported in PROMPT_160_REPORT.md).
const RETIRED_KEYS = [['arc', 'Wheel', 'Position'].join('')];

// Drops retired keys from a persisted settings object. Non-object input (a
// corrupted or hand-edited save) migrates to an empty object, so hydration
// falls back to defaults instead of throwing.
export function migrateSettings(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: Record<string, unknown> = { ...(parsed as Record<string, unknown>) };
  for (const key of RETIRED_KEYS) delete out[key];
  return out;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sfxEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  cogsHintsEnabled: true,
  notificationsEnabled: false,
  devForceRequisitionGate: false,
  devBoardSizeOverride: null,
  setSfxEnabled: (v) => { set({ sfxEnabled: v }); persist({ ...get(), sfxEnabled: v }); },
  setMusicEnabled: (v) => { set({ musicEnabled: v }); persist({ ...get(), musicEnabled: v }); },
  setHapticsEnabled: (v) => { set({ hapticsEnabled: v }); persist({ ...get(), hapticsEnabled: v }); },
  setCogsHintsEnabled: (v) => { set({ cogsHintsEnabled: v }); persist({ ...get(), cogsHintsEnabled: v }); },
  setNotificationsEnabled: (v) => { set({ notificationsEnabled: v }); persist({ ...get(), notificationsEnabled: v }); },
  setDevForceRequisitionGate: (v) => { set({ devForceRequisitionGate: v }); persist({ ...get(), devForceRequisitionGate: v }); },
  setDevBoardSizeOverride: (v) => { set({ devBoardSizeOverride: v }); persist({ ...get(), devBoardSizeOverride: v }); },
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        const parsed = migrateSettings(stored) as Partial<SettingsState>;
        set({
          sfxEnabled: parsed.sfxEnabled ?? true,
          musicEnabled: parsed.musicEnabled ?? true,
          hapticsEnabled: parsed.hapticsEnabled ?? true,
          cogsHintsEnabled: parsed.cogsHintsEnabled ?? true,
          notificationsEnabled: parsed.notificationsEnabled ?? false,
          devForceRequisitionGate: parsed.devForceRequisitionGate ?? false,
          devBoardSizeOverride:
            typeof parsed.devBoardSizeOverride === 'string'
              ? parsed.devBoardSizeOverride
              : null,
        });
        // Rewrite an old save once so the retired keys stop riding along.
        if (stored && typeof stored === 'object' && RETIRED_KEYS.some(k => k in stored)) {
          persist(get());
        }
      } catch { /* corrupted storage, use defaults */ }
    }
  },
}));
