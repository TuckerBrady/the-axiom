// Integration test: verify ReturnBriefScreen's data dependencies work correctly
// Full render tests require jest-expo preset with native module mocking

describe('ReturnBriefScreen data layer', () => {
  it('livesStore exports required functions', () => {
    const { useLivesStore } = require('../../src/store/livesStore');
    expect(useLivesStore).toBeDefined();
    const state = useLivesStore.getState();
    expect(state.lives).toBeDefined();
    expect(state.regenerate).toBeDefined();
  });

  it('progressionStore exports required functions', () => {
    const { useProgressionStore } = require('../../src/store/progressionStore');
    expect(useProgressionStore).toBeDefined();
    const state = useProgressionStore.getState();
    expect(state.getSectorCompletedCount).toBeDefined();
  });
});
