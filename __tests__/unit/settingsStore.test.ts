import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../../src/store/settingsStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useSettingsStore.setState({
    sfxEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    cogsHintsEnabled: true,
    notificationsEnabled: false,
  });
});

describe('settingsStore', () => {
  it('has correct defaults', () => {
    const state = useSettingsStore.getState();
    expect(state.sfxEnabled).toBe(true);
    expect(state.musicEnabled).toBe(true);
    expect(state.hapticsEnabled).toBe(true);
    expect(state.cogsHintsEnabled).toBe(true);
    expect(state.notificationsEnabled).toBe(false);
  });

  it('setSfxEnabled persists', async () => {
    useSettingsStore.getState().setSfxEnabled(false);
    expect(useSettingsStore.getState().sfxEnabled).toBe(false);
    const raw = await AsyncStorage.getItem('axiom_settings');
    expect(JSON.parse(raw!).sfxEnabled).toBe(false);
  });

  it('setMusicEnabled persists', async () => {
    useSettingsStore.getState().setMusicEnabled(false);
    expect(useSettingsStore.getState().musicEnabled).toBe(false);
    const raw = await AsyncStorage.getItem('axiom_settings');
    expect(JSON.parse(raw!).musicEnabled).toBe(false);
  });

  it('setHapticsEnabled persists', async () => {
    useSettingsStore.getState().setHapticsEnabled(false);
    expect(useSettingsStore.getState().hapticsEnabled).toBe(false);
    const raw = await AsyncStorage.getItem('axiom_settings');
    expect(JSON.parse(raw!).hapticsEnabled).toBe(false);
  });

  it('setCogsHintsEnabled persists', async () => {
    useSettingsStore.getState().setCogsHintsEnabled(false);
    expect(useSettingsStore.getState().cogsHintsEnabled).toBe(false);
    const raw = await AsyncStorage.getItem('axiom_settings');
    expect(JSON.parse(raw!).cogsHintsEnabled).toBe(false);
  });

  it('setNotificationsEnabled persists', async () => {
    useSettingsStore.getState().setNotificationsEnabled(true);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(true);
    const raw = await AsyncStorage.getItem('axiom_settings');
    expect(JSON.parse(raw!).notificationsEnabled).toBe(true);
  });

  it('hydrate restores persisted values', async () => {
    await AsyncStorage.setItem('axiom_settings', JSON.stringify({
      sfxEnabled: false,
      musicEnabled: false,
      hapticsEnabled: false,
      cogsHintsEnabled: false,
      notificationsEnabled: true,
    }));
    await useSettingsStore.getState().hydrate();
    const state = useSettingsStore.getState();
    expect(state.sfxEnabled).toBe(false);
    expect(state.musicEnabled).toBe(false);
    expect(state.hapticsEnabled).toBe(false);
    expect(state.cogsHintsEnabled).toBe(false);
    expect(state.notificationsEnabled).toBe(true);
  });

  it('hydrate uses defaults for missing fields', async () => {
    await AsyncStorage.setItem('axiom_settings', JSON.stringify({ sfxEnabled: false }));
    await useSettingsStore.getState().hydrate();
    const state = useSettingsStore.getState();
    expect(state.sfxEnabled).toBe(false);
    expect(state.musicEnabled).toBe(true);
    expect(state.hapticsEnabled).toBe(true);
    expect(state.cogsHintsEnabled).toBe(true);
    expect(state.notificationsEnabled).toBe(false);
  });

  it('hydrate handles corrupted storage gracefully', async () => {
    await AsyncStorage.setItem('axiom_settings', 'not valid json');
    await useSettingsStore.getState().hydrate();
    const state = useSettingsStore.getState();
    expect(state.sfxEnabled).toBe(true);
    expect(state.notificationsEnabled).toBe(false);
  });
});
