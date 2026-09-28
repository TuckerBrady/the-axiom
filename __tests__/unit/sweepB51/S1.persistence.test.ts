/**
 * SWEEP-B51 S1 (AXM-039): credits and lives persist; one credit ledger.
 *
 * Every test runs against a fresh module registry (jest.isolateModules), so
 * each gets its own economy store, lives store and AsyncStorage mock. The
 * AsyncStorage mock is module-scoped, which makes a fresh registry the model
 * of a cold launch with whatever the test writes into it as the device disk.
 */

type Registry = {
  AsyncStorage: {
    getItem: (k: string) => Promise<string | null>;
    setItem: (k: string, v: string) => Promise<void>;
  };
  useEconomyStore: typeof import('../../../src/store/economyStore').useEconomyStore;
  useLivesStore: typeof import('../../../src/store/livesStore').useLivesStore;
};

const ECON_KEY = 'axiom_economy_credits';
const LIVES_KEY = 'axiom_lives_state';

function freshRegistry(seed?: Record<string, string>): Registry {
  let reg: Registry | undefined;
  jest.isolateModules(() => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (seed) {
      for (const [k, v] of Object.entries(seed)) AsyncStorage.setItem(k, v);
    }
    const { useEconomyStore } = require('../../../src/store/economyStore');
    const { useLivesStore } = require('../../../src/store/livesStore');
    reg = { AsyncStorage, useEconomyStore, useLivesStore };
  });
  return reg as Registry;
}

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('SWEEP-B51 S1 one credit ledger', () => {
  test('[S1-1] livesStore has no credits field of its own', () => {
    const { useLivesStore } = freshRegistry();
    expect('credits' in useLivesStore.getState()).toBe(false);
  });

  test('[S1-1] livesStore addCredits and spendCredits move the economy balance', () => {
    const { useLivesStore, useEconomyStore } = freshRegistry();
    useEconomyStore.setState({ credits: 100 });
    expect(useLivesStore.getState().circuits).toBe(100);
    expect(useLivesStore.getState().cogs).toBe(100);

    useLivesStore.getState().addCredits(50);
    expect(useEconomyStore.getState().credits).toBe(150);

    useLivesStore.getState().addCredits(0);
    useLivesStore.getState().addCredits(-20);
    expect(useEconomyStore.getState().credits).toBe(150);

    expect(useLivesStore.getState().spendCredits(30)).toBe(true);
    expect(useEconomyStore.getState().credits).toBe(120);
    expect(useLivesStore.getState().spendCredits(1000)).toBe(false);
    expect(useEconomyStore.getState().credits).toBe(120);

    useLivesStore.getState().addCircuits(5);
    useLivesStore.getState().addCogs(5);
    expect(useEconomyStore.getState().credits).toBe(130);
    expect(useLivesStore.getState().spendCogs(10)).toBe(true);
    expect(useEconomyStore.getState().credits).toBe(120);
  });

  test('[S1-1] refillLives spends 30 from the economy balance and fails when it is short', () => {
    const { useLivesStore, useEconomyStore } = freshRegistry();
    useEconomyStore.setState({ credits: 29 });
    useLivesStore.setState({ lives: 1, lastLifeLostAt: 1000 });
    expect(useLivesStore.getState().refillLives()).toBe(false);
    expect(useLivesStore.getState().lives).toBe(1);
    expect(useLivesStore.getState().lastLifeLostAt).toBe(1000);
    expect(useEconomyStore.getState().credits).toBe(29);

    useEconomyStore.setState({ credits: 45 });
    expect(useLivesStore.getState().refillLives()).toBe(true);
    expect(useLivesStore.getState().lives).toBe(5);
    expect(useLivesStore.getState().lastLifeLostAt).toBeNull();
    expect(useEconomyStore.getState().credits).toBe(15);
  });
});

describe('SWEEP-B51 S1 persistence', () => {
  test('[S1-2] a credits change after hydrate writes axiom_economy_credits', async () => {
    const { AsyncStorage, useEconomyStore } = freshRegistry();
    await useEconomyStore.getState().hydrate();
    useEconomyStore.getState().earnCredits(25);
    await flush();
    expect(await AsyncStorage.getItem(ECON_KEY)).toBe('125');
    expect(useEconomyStore.getState().spendDirect(20)).toBe(true);
    await flush();
    expect(await AsyncStorage.getItem(ECON_KEY)).toBe('105');
  });

  test('[S1-2] a setState credits change after hydrate is also written', async () => {
    const { AsyncStorage, useEconomyStore } = freshRegistry();
    await useEconomyStore.getState().hydrate();
    useEconomyStore.setState({ credits: 777 });
    await flush();
    expect(await AsyncStorage.getItem(ECON_KEY)).toBe('777');
    // levelBudget and levelSpent are never persisted
    useEconomyStore.setState({ levelBudget: 40, levelSpent: 3 });
    await flush();
    expect(await AsyncStorage.getItem(ECON_KEY)).toBe('777');
  });

  test('[S1-3] a lives change after hydrate writes axiom_lives_state', async () => {
    const { AsyncStorage, useLivesStore } = freshRegistry();
    await useLivesStore.getState().hydrate();
    useLivesStore.getState().loseLife();
    await flush();
    const stored = JSON.parse((await AsyncStorage.getItem(LIVES_KEY)) as string);
    expect(stored.lives).toBe(4);
    expect(typeof stored.lastLifeLostAt).toBe('number');
    expect(Object.keys(stored).sort()).toEqual(['lastLifeLostAt', 'lives']);

    useLivesStore.setState({ lives: 5, lastLifeLostAt: null });
    await flush();
    expect(JSON.parse((await AsyncStorage.getItem(LIVES_KEY)) as string)).toEqual({ lives: 5, lastLifeLostAt: null });
  });

  test('[S1-4] economy hydrate restores a stored balance', async () => {
    const { useEconomyStore } = freshRegistry({ [ECON_KEY]: '565' });
    expect(useEconomyStore.getState().credits).toBe(100);
    await useEconomyStore.getState().hydrate();
    expect(useEconomyStore.getState().credits).toBe(565);
  });

  test('[S1-4] economy hydrate on a missing or corrupt key keeps the current balance', async () => {
    const seeds: (Record<string, string> | undefined)[] = [
      undefined,
      { [ECON_KEY]: 'abc' },
      { [ECON_KEY]: '-5' },
      { [ECON_KEY]: '12.5' },
      { [ECON_KEY]: '' },
    ];
    for (const seed of seeds) {
      const { AsyncStorage, useEconomyStore } = freshRegistry(seed);
      await useEconomyStore.getState().hydrate();
      expect(useEconomyStore.getState().credits).toBe(100);
      await flush();
      expect(await AsyncStorage.getItem(ECON_KEY)).toBe('100');
    }

    // A storage error is caught; hydrate resolves and the default stands.
    const { AsyncStorage, useEconomyStore } = freshRegistry();
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    await expect(useEconomyStore.getState().hydrate()).resolves.toBeUndefined();
    expect(useEconomyStore.getState().credits).toBe(100);
    spy.mockRestore();
  });

  test('[S1-4] lives hydrate restores lives and lastLifeLostAt then regenerates', async () => {
    const now = Date.now();
    // Stored 2 lives, last lost 65 minutes ago: two regen intervals have passed.
    const lostAt = now - 65 * 60 * 1000;
    const a = freshRegistry({ [LIVES_KEY]: JSON.stringify({ lives: 2, lastLifeLostAt: lostAt }) });
    await a.useLivesStore.getState().hydrate();
    expect(a.useLivesStore.getState().lives).toBe(4);
    expect(a.useLivesStore.getState().lastLifeLostAt).toBe(lostAt + 2 * 30 * 60 * 1000);

    // Recent loss: no regen, values restored as stored.
    const recent = now - 60 * 1000;
    const b = freshRegistry({ [LIVES_KEY]: JSON.stringify({ lives: 3, lastLifeLostAt: recent }) });
    await b.useLivesStore.getState().hydrate();
    expect(b.useLivesStore.getState().lives).toBe(3);
    expect(b.useLivesStore.getState().lastLifeLostAt).toBe(recent);

    // Invalid shapes leave defaults; a storage error is caught.
    const bads = [
      'nope',
      JSON.stringify({ lives: 9, lastLifeLostAt: null }),
      JSON.stringify({ lives: 2.5, lastLifeLostAt: null }),
      JSON.stringify({ lives: 2, lastLifeLostAt: 'x' }),
      JSON.stringify(null),
    ];
    for (const bad of bads) {
      const c = freshRegistry({ [LIVES_KEY]: bad });
      await expect(c.useLivesStore.getState().hydrate()).resolves.toBeUndefined();
      expect(c.useLivesStore.getState().lives).toBe(5);
      expect(c.useLivesStore.getState().lastLifeLostAt).toBeNull();
    }
    const d = freshRegistry();
    const spy = jest.spyOn(d.AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    await expect(d.useLivesStore.getState().hydrate()).resolves.toBeUndefined();
    expect(d.useLivesStore.getState().lives).toBe(5);
    spy.mockRestore();
  });

  test('[S1-5] nothing is written before hydrate resolves', async () => {
    const { AsyncStorage, useEconomyStore, useLivesStore } = freshRegistry();
    useEconomyStore.getState().earnCredits(40);
    useEconomyStore.setState({ credits: 300 });
    useLivesStore.getState().loseLife();
    await flush();
    expect(await AsyncStorage.getItem(ECON_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(LIVES_KEY)).toBeNull();

    // A saved balance on disk is not overwritten by a default while hydrate is pending.
    const b = freshRegistry({ [ECON_KEY]: '565' });
    const pending = b.useEconomyStore.getState().hydrate();
    b.useEconomyStore.setState({ credits: 100 });
    expect(await b.AsyncStorage.getItem(ECON_KEY)).toBe('565');
    await pending;
    expect(b.useEconomyStore.getState().credits).toBe(565);
  });

  test('[S1-9] cold launch round trip: 565 CR and 4 lives survive a fresh module registry', async () => {
    const a = freshRegistry();
    await a.useEconomyStore.getState().hydrate();
    await a.useLivesStore.getState().hydrate();
    a.useEconomyStore.setState({ credits: 565 });
    a.useLivesStore.getState().loseLife();
    await flush();
    const econDisk = await a.AsyncStorage.getItem(ECON_KEY);
    const livesDisk = await a.AsyncStorage.getItem(LIVES_KEY);
    expect(econDisk).not.toBeNull();
    expect(livesDisk).not.toBeNull();

    const b = freshRegistry({ [ECON_KEY]: econDisk as string, [LIVES_KEY]: livesDisk as string });
    expect(b.useEconomyStore.getState().credits).toBe(100);
    await b.useEconomyStore.getState().hydrate();
    await b.useLivesStore.getState().hydrate();
    expect(b.useEconomyStore.getState().credits).toBe(565);
    expect(b.useLivesStore.getState().lives).toBe(4);
  });
});
