import {
  ALL_CONSEQUENCES,
  KEPLER_BOSS_CONSEQUENCE,
  NOVA_BOSS_CONSEQUENCE,
  RIFT_BOSS_CONSEQUENCE,
  DEEP_VOID_BOSS_CONSEQUENCE,
  COGS_INTEGRITY_LINES,
  resolveCogsLine,
  getTriggeredConsequence,
} from '../../src/game/consequences';

describe('ALL_CONSEQUENCES', () => {
  it('contains exactly 4 consequences', () => {
    expect(ALL_CONSEQUENCES).toHaveLength(4);
  });

  it('each has required fields', () => {
    for (const c of ALL_CONSEQUENCES) {
      expect(c.id).toBeTruthy();
      expect(c.sectorId).toBeTruthy();
      expect(c.triggerLevelId).toBeTruthy();
      expect(['fail', 'below2star', 'below3star']).toContain(c.triggerCondition);
      expect(c.mechanicalEffects.length).toBeGreaterThan(0);
      expect(c.cogsImmediateResponse).toBeDefined();
    }
  });

  it('unique IDs', () => {
    const ids = ALL_CONSEQUENCES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveCogsLine', () => {
  it('replaces {AMOUNT} placeholder', () => {
    const result = resolveCogsLine('They took {AMOUNT} credits', 150);
    expect(result).toBe('They took 150 credits');
  });

  it('replaces multiple {AMOUNT} occurrences', () => {
    const result = resolveCogsLine('{AMOUNT} and {AMOUNT}', 50);
    expect(result).toBe('50 and 50');
  });

  it('returns unchanged when no stolenAmount', () => {
    const result = resolveCogsLine('No amount here');
    expect(result).toBe('No amount here');
  });
});

describe('getTriggeredConsequence', () => {
  it('returns Kepler consequence on below3star', () => {
    const c = getTriggeredConsequence('K2-10', true, 2);
    expect(c?.id).toBe('kepler_boss_consequence');
  });

  it('returns Kepler consequence on fail', () => {
    const c = getTriggeredConsequence('K2-10', false, 0);
    expect(c?.id).toBe('kepler_boss_consequence');
  });

  it('returns null for Kepler on 3-star success', () => {
    const c = getTriggeredConsequence('K2-10', true, 3);
    expect(c).toBeNull();
  });

  it('returns Nova consequence on below2star', () => {
    const c = getTriggeredConsequence('NF-BOSS', true, 1);
    expect(c?.id).toBe('nova_boss_consequence');
  });

  it('returns null for Nova on 2+ stars', () => {
    const c = getTriggeredConsequence('NF-BOSS', true, 2);
    expect(c).toBeNull();
  });

  it('returns Deep Void consequence only on fail', () => {
    const c = getTriggeredConsequence('DV-BOSS', false, 0);
    expect(c?.id).toBe('deep_void_boss_consequence');
  });

  it('returns null for Deep Void on success (any stars)', () => {
    expect(getTriggeredConsequence('DV-BOSS', true, 1)).toBeNull();
  });

  it('returns null for unknown level', () => {
    expect(getTriggeredConsequence('UNKNOWN', false, 0)).toBeNull();
  });
});

describe('COGS_INTEGRITY_LINES', () => {
  it('minimum is null (empty bubble)', () => {
    expect(COGS_INTEGRITY_LINES.minimum).toBeNull();
  });

  it('recovering is "Still here."', () => {
    expect(COGS_INTEGRITY_LINES.recovering).toBe('Still here.');
  });

  it('fullyRestored contains {NAME} placeholder', () => {
    expect(COGS_INTEGRITY_LINES.fullyRestored).toContain('{NAME}');
  });
});
