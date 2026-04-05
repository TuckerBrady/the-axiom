// Integration test: verify SectorMapScreen's data dependencies

describe('SectorMapScreen data layer', () => {
  it('progressionStore provides sector completion tracking', () => {
    const { useProgressionStore, AXIOM_TOTAL_LEVELS } = require('../../src/store/progressionStore');
    const state = useProgressionStore.getState();
    expect(AXIOM_TOTAL_LEVELS).toBe(8);
    expect(state.getSectorCompletedCount('A1-')).toBe(0);
  });

  it('consequenceStore tracks active consequences', () => {
    const { useConsequenceStore } = require('../../src/store/consequenceStore');
    const state = useConsequenceStore.getState();
    expect(state.activeConsequences).toEqual([]);
    expect(typeof state.applyConsequence).toBe('function');
  });
});
