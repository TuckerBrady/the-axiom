// Integration test: verify HubScreen's data dependencies work correctly

describe('HubScreen data layer', () => {
  it('livesStore provides lives count and regenerate', () => {
    const { useLivesStore } = require('../../src/store/livesStore');
    const state = useLivesStore.getState();
    expect(state.lives).toBe(5);
    expect(typeof state.regenerate).toBe('function');
  });

  it('economyStore provides credits', () => {
    const { useEconomyStore } = require('../../src/store/economyStore');
    const state = useEconomyStore.getState();
    expect(state.credits).toBe(100);
  });

  it('progressionStore provides sector completion count', () => {
    const { useProgressionStore } = require('../../src/store/progressionStore');
    const state = useProgressionStore.getState();
    expect(state.getSectorCompletedCount('A1-')).toBe(0);
  });

  it('challengeStore provides loadOrGenerateChallenge', () => {
    const { useChallengeStore } = require('../../src/store/challengeStore');
    const state = useChallengeStore.getState();
    expect(typeof state.loadOrGenerateChallenge).toBe('function');
  });
});
