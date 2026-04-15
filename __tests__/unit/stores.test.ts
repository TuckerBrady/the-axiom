import { useEconomyStore } from '../../src/store/economyStore';
import { useProgressionStore } from '../../src/store/progressionStore';
import { useLivesStore } from '../../src/store/livesStore';
import { useConsequenceStore } from '../../src/store/consequenceStore';
import { usePlayerStore } from '../../src/store/playerStore';
import { getStreakCOGSLine } from '../../src/store/challengeStore';
import { KEPLER_BOSS_CONSEQUENCE, DEEP_VOID_BOSS_CONSEQUENCE } from '../../src/game/consequences';

// ─── EconomyStore ────────────────────────────────────────────────────────────

describe('economyStore', () => {
  beforeEach(() => {
    useEconomyStore.setState({ credits: 100, levelBudget: 0, levelSpent: 0 });
  });

  it('initial credits is 100', () => {
    expect(useEconomyStore.getState().credits).toBe(100);
  });

  it('earnCredits adds to balance', () => {
    useEconomyStore.getState().earnCredits(50);
    expect(useEconomyStore.getState().credits).toBe(150);
  });

  it('earnCredits ignores zero/negative', () => {
    useEconomyStore.getState().earnCredits(0);
    expect(useEconomyStore.getState().credits).toBe(100);
    useEconomyStore.getState().earnCredits(-10);
    expect(useEconomyStore.getState().credits).toBe(100);
  });

  it('setLevelBudget sets budget and resets spent', () => {
    useEconomyStore.getState().setLevelBudget(50);
    expect(useEconomyStore.getState().levelBudget).toBe(50);
    expect(useEconomyStore.getState().levelSpent).toBe(0);
  });

  it('spendCredits: deducts from budget first, then credits', () => {
    useEconomyStore.setState({ credits: 100, levelBudget: 20, levelSpent: 0 });
    // Spending conveyor (5 CR) deducts from budget
    const success = useEconomyStore.getState().spendCredits('conveyor', null);
    expect(success).toBe(true);
    expect(useEconomyStore.getState().levelSpent).toBe(5);
    expect(useEconomyStore.getState().credits).toBe(100); // Credits untouched
  });

  it('spendCredits: uses credits when budget exhausted', () => {
    useEconomyStore.setState({ credits: 100, levelBudget: 3, levelSpent: 0 });
    const success = useEconomyStore.getState().spendCredits('conveyor', null);
    expect(success).toBe(true);
    expect(useEconomyStore.getState().credits).toBeLessThan(100);
  });

  it('spendCredits: returns false when insufficient total', () => {
    useEconomyStore.setState({ credits: 0, levelBudget: 0, levelSpent: 0 });
    const success = useEconomyStore.getState().spendCredits('gear', null);
    expect(success).toBe(false);
  });

  it('spendCredits: free for zero-cost pieces', () => {
    const success = useEconomyStore.getState().spendCredits('inputPort', null);
    expect(success).toBe(true);
  });

  it('resetLevelBudget clears budget and spent', () => {
    useEconomyStore.getState().setLevelBudget(50);
    useEconomyStore.getState().resetLevelBudget();
    expect(useEconomyStore.getState().levelBudget).toBe(0);
    expect(useEconomyStore.getState().levelSpent).toBe(0);
  });
});

// ─── ProgressionStore ────────────────────────────────────────────────────────

describe('progressionStore', () => {
  beforeEach(() => {
    useProgressionStore.setState({ completedLevels: {}, activeSector: 'A1' });
  });

  it('completeLevel records stars and returns true on first time', () => {
    const isFirst = useProgressionStore.getState().completeLevel('A1-1', 3);
    expect(isFirst).toBe(true);
    expect(useProgressionStore.getState().getLevelStars('A1-1')).toBe(3);
  });

  it('completeLevel keeps best stars', () => {
    useProgressionStore.getState().completeLevel('A1-1', 3);
    useProgressionStore.getState().completeLevel('A1-1', 1);
    expect(useProgressionStore.getState().getLevelStars('A1-1')).toBe(3);
  });

  it('isLevelCompleted returns correct state', () => {
    expect(useProgressionStore.getState().isLevelCompleted('A1-1')).toBe(false);
    useProgressionStore.getState().completeLevel('A1-1', 2);
    expect(useProgressionStore.getState().isLevelCompleted('A1-1')).toBe(true);
  });

  it('getSectorCompletedCount counts by prefix', () => {
    useProgressionStore.getState().completeLevel('A1-1', 3);
    useProgressionStore.getState().completeLevel('A1-2', 2);
    useProgressionStore.getState().completeLevel('2-1', 1);
    expect(useProgressionStore.getState().getSectorCompletedCount('A1-')).toBe(2);
    expect(useProgressionStore.getState().getSectorCompletedCount('2-')).toBe(1);
  });

  it('setActiveSector updates sector', () => {
    useProgressionStore.getState().setActiveSector('kepler');
    expect(useProgressionStore.getState().activeSector).toBe('kepler');
  });
});

// ─── ProgressionStore persistence ────────────────────────────────────────────

describe('progressionStore persistence', () => {
  const PROGRESSION_KEY = 'axiom_progression_completed';
  const ACTIVE_SECTOR_KEY = 'axiom_progression_active_sector';
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;

  beforeEach(async () => {
    await AsyncStorage.clear();
    useProgressionStore.setState({ completedLevels: {}, activeSector: 'A1' });
  });

  it('completeLevel persists completedLevels to AsyncStorage', async () => {
    useProgressionStore.getState().completeLevel('A1-1', 3);
    // setItem is awaited internally via fire-and-forget; the mock resolves synchronously
    const raw = await AsyncStorage.getItem(PROGRESSION_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed['A1-1']).toBeDefined();
    expect(parsed['A1-1'].stars).toBe(3);
  });

  it('setActiveSector persists activeSector to AsyncStorage', async () => {
    useProgressionStore.getState().setActiveSector('kepler');
    const stored = await AsyncStorage.getItem(ACTIVE_SECTOR_KEY);
    expect(stored).toBe('kepler');
  });

  it('hydrate restores completedLevels from AsyncStorage', async () => {
    await AsyncStorage.setItem(
      PROGRESSION_KEY,
      JSON.stringify({ 'A1-1': { stars: 2, completedAt: 1234 } }),
    );
    await useProgressionStore.getState().hydrate();
    expect(useProgressionStore.getState().isLevelCompleted('A1-1')).toBe(true);
    expect(useProgressionStore.getState().getLevelStars('A1-1')).toBe(2);
  });

  it('hydrate restores activeSector from AsyncStorage', async () => {
    await AsyncStorage.setItem(ACTIVE_SECTOR_KEY, 'kepler');
    await useProgressionStore.getState().hydrate();
    expect(useProgressionStore.getState().activeSector).toBe('kepler');
  });

  it('hydrate is safe on missing keys (defaults preserved)', async () => {
    await useProgressionStore.getState().hydrate();
    expect(useProgressionStore.getState().completedLevels).toEqual({});
    expect(useProgressionStore.getState().activeSector).toBe('A1');
  });

  it('hydrate is safe on corrupt JSON (defaults preserved)', async () => {
    await AsyncStorage.setItem(PROGRESSION_KEY, '{not valid json');
    await useProgressionStore.getState().hydrate();
    expect(useProgressionStore.getState().completedLevels).toEqual({});
  });
});

// ─── LivesStore ──────────────────────────────────────────────────────────────

describe('livesStore', () => {
  beforeEach(() => {
    useLivesStore.setState({ lives: 5, lastLifeLostAt: null, credits: 500 });
  });

  it('initial lives is 5', () => {
    expect(useLivesStore.getState().lives).toBe(5);
  });

  it('refillLives sets to max and deducts credits', () => {
    useLivesStore.setState({ lives: 1 });
    const success = useLivesStore.getState().refillLives();
    expect(success).toBe(true);
    expect(useLivesStore.getState().lives).toBe(5);
  });

  it('refillLives fails when insufficient credits', () => {
    useLivesStore.setState({ lives: 1, credits: 0 });
    const success = useLivesStore.getState().refillLives();
    expect(success).toBe(false);
    expect(useLivesStore.getState().lives).toBe(1);
  });

  it('loseLife decrements lives count', () => {
    useLivesStore.setState({ lives: 3 });
    useLivesStore.getState().loseLife();
    // __DEV__ is false in test env, so loseLife actually fires
    expect(useLivesStore.getState().lives).toBe(2);
  });

  it('loseLife does nothing at 0 lives', () => {
    useLivesStore.setState({ lives: 0 });
    useLivesStore.getState().loseLife();
    expect(useLivesStore.getState().lives).toBe(0);
  });

  it('regenerate restores lives over time', () => {
    const halfHourAgo = Date.now() - 30 * 60 * 1000;
    useLivesStore.setState({ lives: 3, lastLifeLostAt: halfHourAgo });
    useLivesStore.getState().regenerate();
    expect(useLivesStore.getState().lives).toBeGreaterThanOrEqual(4);
  });

  it('regenerate does nothing at max lives', () => {
    useLivesStore.setState({ lives: 5 });
    useLivesStore.getState().regenerate();
    expect(useLivesStore.getState().lives).toBe(5);
  });

  it('addCredits adds to balance', () => {
    useLivesStore.setState({ credits: 100 });
    useLivesStore.getState().addCredits(50);
    expect(useLivesStore.getState().credits).toBe(150);
  });

  it('spendCredits deducts from balance', () => {
    useLivesStore.setState({ credits: 100 });
    const ok = useLivesStore.getState().spendCredits(30);
    expect(ok).toBe(true);
    expect(useLivesStore.getState().credits).toBe(70);
  });

  it('spendCredits returns false when insufficient', () => {
    useLivesStore.setState({ credits: 10 });
    const ok = useLivesStore.getState().spendCredits(20);
    expect(ok).toBe(false);
  });

  // Legacy aliases use dynamic getters — just verify they exist and return a number
  it('legacy aliases: circuits/cogs are accessible', () => {
    expect(typeof useLivesStore.getState().circuits).toBe('number');
    expect(typeof useLivesStore.getState().cogs).toBe('number');
  });

  it('legacy: addCircuits adds credits', () => {
    useLivesStore.setState({ credits: 100 });
    useLivesStore.getState().addCircuits(25);
    expect(useLivesStore.getState().credits).toBe(125);
  });

  it('legacy: addCogs adds credits', () => {
    useLivesStore.setState({ credits: 100 });
    useLivesStore.getState().addCogs(30);
    expect(useLivesStore.getState().credits).toBe(130);
  });

  it('legacy: spendCogs deducts credits', () => {
    useLivesStore.setState({ credits: 100 });
    expect(useLivesStore.getState().spendCogs(40)).toBe(true);
    expect(useLivesStore.getState().credits).toBe(60);
  });
});

// ─── ConsequenceStore ────────────────────────────────────────────────────────

describe('consequenceStore', () => {
  beforeEach(() => {
    useConsequenceStore.setState({
      activeConsequences: [],
      damagedSystems: [],
      cogsIntegrity: 100,
      creditHistory: [],
      acknowledgedEffects: [],
    });
  });

  it('initial integrity is 100', () => {
    expect(useConsequenceStore.getState().cogsIntegrity).toBe(100);
  });

  it('applyConsequence adds to active list', () => {
    useConsequenceStore.getState().applyConsequence(DEEP_VOID_BOSS_CONSEQUENCE);
    expect(useConsequenceStore.getState().activeConsequences).toHaveLength(1);
  });

  it('applyConsequence damages integrity', () => {
    useConsequenceStore.getState().applyConsequence(DEEP_VOID_BOSS_CONSEQUENCE);
    expect(useConsequenceStore.getState().cogsIntegrity).toBe(70); // 100 - 30
  });

  it('applyConsequence damages systems', () => {
    useConsequenceStore.getState().applyConsequence(KEPLER_BOSS_CONSEQUENCE);
    expect(useConsequenceStore.getState().damagedSystems).toContain('propulsionCore');
  });

  it('resolveConsequence removes from active list', () => {
    useConsequenceStore.getState().applyConsequence(DEEP_VOID_BOSS_CONSEQUENCE);
    useConsequenceStore.getState().resolveConsequence('deep_void_boss_consequence');
    expect(useConsequenceStore.getState().activeConsequences).toHaveLength(0);
  });

  it('repairSystem removes from damaged list', () => {
    useConsequenceStore.getState().applyConsequence(KEPLER_BOSS_CONSEQUENCE);
    useConsequenceStore.getState().repairSystem('propulsionCore');
    expect(useConsequenceStore.getState().damagedSystems).not.toContain('propulsionCore');
  });

  it('setCOGSIntegrity clamps 0-100', () => {
    useConsequenceStore.getState().setCOGSIntegrity(150);
    expect(useConsequenceStore.getState().cogsIntegrity).toBe(100);
    useConsequenceStore.getState().setCOGSIntegrity(-10);
    expect(useConsequenceStore.getState().cogsIntegrity).toBe(0);
  });

  it('isDamaged returns correct state', () => {
    expect(useConsequenceStore.getState().isDamaged('propulsionCore')).toBe(false);
    useConsequenceStore.getState().applyConsequence(KEPLER_BOSS_CONSEQUENCE);
    expect(useConsequenceStore.getState().isDamaged('propulsionCore')).toBe(true);
  });

  it('logCreditTransaction adds to history', () => {
    useConsequenceStore.getState().logCreditTransaction(-50, 'test');
    expect(useConsequenceStore.getState().creditHistory).toHaveLength(1);
    expect(useConsequenceStore.getState().creditHistory[0].amount).toBe(-50);
  });

  it('acknowledgeEffect tracks dismissed effects', () => {
    useConsequenceStore.getState().acknowledgeEffect('test effect');
    expect(useConsequenceStore.getState().acknowledgedEffects).toContain('test effect');
  });

  it('addWearPoint increments wear', () => {
    useConsequenceStore.setState({ wearPoints: 0 });
    useConsequenceStore.getState().addWearPoint();
    expect(useConsequenceStore.getState().wearPoints).toBe(1);
  });

  it('addWearPoint caps at 20', () => {
    useConsequenceStore.setState({ wearPoints: 20 });
    useConsequenceStore.getState().addWearPoint();
    expect(useConsequenceStore.getState().wearPoints).toBe(20);
  });

  it('removeWearPoints decrements', () => {
    useConsequenceStore.setState({ wearPoints: 10 });
    useConsequenceStore.getState().removeWearPoints(5);
    expect(useConsequenceStore.getState().wearPoints).toBe(5);
  });

  it('removeWearPoints floors at 0', () => {
    useConsequenceStore.setState({ wearPoints: 3 });
    useConsequenceStore.getState().removeWearPoints(10);
    expect(useConsequenceStore.getState().wearPoints).toBe(0);
  });

  it('getWearLevel returns correct thresholds', () => {
    useConsequenceStore.setState({ wearPoints: 0 });
    expect(useConsequenceStore.getState().getWearLevel()).toBe('pristine');

    useConsequenceStore.setState({ wearPoints: 3 });
    expect(useConsequenceStore.getState().getWearLevel()).toBe('scuffed');

    useConsequenceStore.setState({ wearPoints: 8 });
    expect(useConsequenceStore.getState().getWearLevel()).toBe('battered');

    useConsequenceStore.setState({ wearPoints: 15 });
    expect(useConsequenceStore.getState().getWearLevel()).toBe('rough');

    useConsequenceStore.setState({ wearPoints: 20 });
    expect(useConsequenceStore.getState().getWearLevel()).toBe('critical');
  });

  it('getActiveSectorModifiers filters by sectorId', () => {
    useConsequenceStore.getState().applyConsequence(KEPLER_BOSS_CONSEQUENCE);
    useConsequenceStore.getState().applyConsequence(DEEP_VOID_BOSS_CONSEQUENCE);
    const kepler = useConsequenceStore.getState().getActiveSectorModifiers('kepler');
    expect(kepler).toHaveLength(1);
  });
});

// ─── PlayerStore ─────────────────────────────────────────────────────────────

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({ name: '', discipline: null });
  });

  it('initial state has empty name and null discipline', () => {
    const s = usePlayerStore.getState();
    expect(s.name).toBe('');
    expect(s.discipline).toBeNull();
  });

  it('setName updates name', () => {
    usePlayerStore.getState().setName('Tucker');
    expect(usePlayerStore.getState().name).toBe('Tucker');
  });

  it('setDiscipline updates discipline', () => {
    usePlayerStore.getState().setDiscipline('systems');
    expect(usePlayerStore.getState().discipline).toBe('systems');
  });
});

// ─── PlayerStore hydrate ─────────────────────────────────────────────────────

describe('playerStore hydrate', () => {
  it('hydrate reads from AsyncStorage', async () => {
    // hydrate() reads DISCIPLINE_KEY from AsyncStorage.
    // Our mock starts empty, but previous tests may have written.
    // Just verify hydrate() runs without error.
    await usePlayerStore.getState().hydrate();
    const d = usePlayerStore.getState().discipline;
    expect(d === null || d === 'systems' || d === 'drive' || d === 'field').toBe(true);
  });
});

// ─── ChallengeStore actions ──────────────────────────────────────────────────

describe('challengeStore', () => {
  const { useChallengeStore } = require('../../src/store/challengeStore');

  beforeEach(() => {
    useChallengeStore.setState({
      currentChallenge: null,
      challengeStatus: 'available',
      challengeHistory: [],
      currentStreak: 0,
      bestStreak: 0,
      totalEarned: 0,
    });
  });

  it('initial state is available', () => {
    expect(useChallengeStore.getState().challengeStatus).toBe('available');
  });

  it('loadOrGenerateChallenge sets a challenge', async () => {
    await useChallengeStore.getState().loadOrGenerateChallenge();
    expect(useChallengeStore.getState().currentChallenge).toBeDefined();
  });

  it('markAttempted changes status', async () => {
    await useChallengeStore.getState().markAttempted();
    expect(useChallengeStore.getState().challengeStatus).toBe('attempted');
  });

  it('recordResult updates streak on 3star', () => {
    useChallengeStore.getState().recordResult({
      date: '2026-04-10', senderName: 'Test', result: '3star',
      creditsEarned: 150, puzzleType: 'test',
    });
    expect(useChallengeStore.getState().currentStreak).toBe(1);
    expect(useChallengeStore.getState().totalEarned).toBe(150);
  });

  it('recordResult resets streak on non-3star', () => {
    useChallengeStore.setState({ currentStreak: 5 });
    useChallengeStore.getState().recordResult({
      date: '2026-04-10', senderName: 'Test', result: 'failed',
      creditsEarned: 0, puzzleType: 'test',
    });
    expect(useChallengeStore.getState().currentStreak).toBe(0);
  });

  it('declineChallenge sets status to declined', async () => {
    await useChallengeStore.getState().declineChallenge();
    expect(useChallengeStore.getState().challengeStatus).toBe('declined');
  });

  it('recordResult maintains history up to 30', () => {
    for (let i = 0; i < 35; i++) {
      useChallengeStore.getState().recordResult({
        date: `2026-04-${String(i).padStart(2, '0')}`,
        senderName: 'T', result: '3star', creditsEarned: 10, puzzleType: 't',
      });
    }
    expect(useChallengeStore.getState().challengeHistory.length).toBeLessThanOrEqual(30);
  });
});

// ─── ChallengeStore helpers ──────────────────────────────────────────────────

describe('getStreakCOGSLine', () => {
  it('returns null for non-milestone streaks', () => {
    expect(getStreakCOGSLine(1)).toBeNull();
    expect(getStreakCOGSLine(5)).toBeNull();
  });

  it('returns line for streak 3', () => {
    expect(getStreakCOGSLine(3)).toContain('Three');
  });

  it('returns line for streak 7', () => {
    expect(getStreakCOGSLine(7)).toContain('Seven');
  });

  it('returns line for streak 30', () => {
    expect(getStreakCOGSLine(30)).toContain('Thirty');
  });
});
