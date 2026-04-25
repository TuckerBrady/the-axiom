// Codex discovery store tests (Prompt 92, Fix 8). Verifies the
// store starts empty, marks pieces discovered monotonically, and
// hydrates from AsyncStorage on cold start.

import { useCodexStore } from '../../src/store/codexStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'axiom_codex_discovered';

function resetStore(): void {
  useCodexStore.setState({ discoveredIds: [] });
}

beforeEach(() => {
  resetStore();
  (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
});

describe('useCodexStore', () => {
  it('discoveredIds is an empty array on a fresh start', () => {
    expect(useCodexStore.getState().discoveredIds).toEqual([]);
    expect(useCodexStore.getState().isDiscovered('source')).toBe(false);
  });

  it('markDiscovered adds a piece id and persists to AsyncStorage', async () => {
    useCodexStore.getState().markDiscovered('conveyor');
    expect(useCodexStore.getState().isDiscovered('conveyor')).toBe(true);
    expect(useCodexStore.getState().discoveredIds).toEqual(['conveyor']);
    // Persistence is fire-and-forget; let microtasks flush.
    await Promise.resolve();
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(['conveyor']);
  });

  it('markDiscovered is monotonic — re-marking is a no-op', () => {
    useCodexStore.getState().markDiscovered('conveyor');
    useCodexStore.getState().markDiscovered('conveyor');
    useCodexStore.getState().markDiscovered('conveyor');
    expect(useCodexStore.getState().discoveredIds).toEqual(['conveyor']);
  });

  it('markDiscovered preserves earlier discoveries', () => {
    useCodexStore.getState().markDiscovered('source');
    useCodexStore.getState().markDiscovered('terminal');
    useCodexStore.getState().markDiscovered('conveyor');
    expect(useCodexStore.getState().discoveredIds).toEqual([
      'source',
      'terminal',
      'conveyor',
    ]);
  });

  it('hydrate restores a persisted set from AsyncStorage', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(['source', 'gear']));
    await useCodexStore.getState().hydrate();
    expect(useCodexStore.getState().discoveredIds).toEqual(['source', 'gear']);
    expect(useCodexStore.getState().isDiscovered('source')).toBe(true);
    expect(useCodexStore.getState().isDiscovered('configNode')).toBe(false);
  });

  it('hydrate keeps empty default when storage is missing or corrupt', async () => {
    await AsyncStorage.setItem(KEY, '<<<not-json>>>');
    await useCodexStore.getState().hydrate();
    expect(useCodexStore.getState().discoveredIds).toEqual([]);
  });

  it('hydrate filters non-string entries (defensive against tampering)', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(['source', 42, null, 'gear']));
    await useCodexStore.getState().hydrate();
    expect(useCodexStore.getState().discoveredIds).toEqual(['source', 'gear']);
  });
});
