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

  it('gameStore exposes setLevel for direct mission card launch', () => {
    const { useGameStore } = require('../../src/store/gameStore');
    const state = useGameStore.getState();
    expect(typeof state.setLevel).toBe('function');
  });

  it('mission card launch path: setLevel(nextLevel) then navigate Gameplay', () => {
    const { useGameStore } = require('../../src/store/gameStore');
    const { AXIOM_LEVELS } = require('../../src/game/levels');
    const { useProgressionStore } = require('../../src/store/progressionStore');

    const { isLevelCompleted } = useProgressionStore.getState();
    const nextLevel = AXIOM_LEVELS.find((l: { id: string }) => !isLevelCompleted(l.id));
    expect(nextLevel).toBeDefined();

    const setLevel = useGameStore.getState().setLevel;
    const navigate = jest.fn();

    // Simulate the exact onPress used by the amber mission card in HubScreen.
    const onPress = () => {
      if (nextLevel?.id && nextLevel) {
        setLevel(nextLevel);
        navigate('Gameplay');
      }
    };
    onPress();

    expect(useGameStore.getState().currentLevel?.id).toBe(nextLevel.id);
    expect(navigate).toHaveBeenCalledWith('Gameplay');
    expect(navigate).not.toHaveBeenCalledWith('LevelSelect');
  });
});
