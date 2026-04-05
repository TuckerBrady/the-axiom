// Integration test: verify LevelSelectScreen's data dependencies

describe('LevelSelectScreen data layer', () => {
  it('progressionStore provides activeSector and level completion', () => {
    const { useProgressionStore } = require('../../src/store/progressionStore');
    const state = useProgressionStore.getState();
    expect(state.activeSector).toBe('A1');
    expect(typeof state.isLevelCompleted).toBe('function');
    expect(typeof state.getLevelStars).toBe('function');
  });

  it('AXIOM_LEVELS exports 8 levels', () => {
    const { AXIOM_LEVELS } = require('../../src/game/levels');
    expect(AXIOM_LEVELS).toHaveLength(8);
    expect(AXIOM_LEVELS[0].id).toBe('A1-1');
    expect(AXIOM_LEVELS[7].id).toBe('A1-8');
  });

  it('getLevelById finds Axiom levels', () => {
    const { getLevelById } = require('../../src/game/levels');
    expect(getLevelById('A1-1')).toBeDefined();
    expect(getLevelById('A1-8')).toBeDefined();
    expect(getLevelById('nonexistent')).toBeUndefined();
  });
});
