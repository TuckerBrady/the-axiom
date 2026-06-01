// Pending tests — Kepler boss consequence re-keyed from K2-10 to K1-10.
// Contract: project-docs/SPECS/SPEC_KEPLER_ENGINE.md Section 3.6 (G6).
// Driving level: K1-10 (Central Hub, the actual Kepler boss).
//
// Audit gap 8: KEPLER_BOSS_CONSEQUENCE.triggerLevelId is 'K2-10' but the boss level
// is 'K1-10', so getTriggeredConsequence('K1-10', ...) never matches and the
// propulsion damage never fires.
//
// PENDING STATUS: `describe.skip` — Phase 3 re-keys to 'K1-10' and activates this.
//
// PHASE 3 NOTE: the existing __tests__/unit/consequences.test.ts asserts the BUGGY
// 'K2-10' key. Dev MUST update those existing assertions when re-keying. That edit to
// an existing test is Phase 3 work and is permitted; the no-edit rule applies only to
// the pending tests authored in this phase.

import {
  KEPLER_BOSS_CONSEQUENCE,
  getTriggeredConsequence,
} from '../../../src/game/consequences';

describe.skip('Kepler boss consequence key (3.6.1)', () => {
  it('[REQ-CONSEQ-KEY-1] KEPLER_BOSS_CONSEQUENCE.triggerLevelId is K1-10', () => {
    expect(KEPLER_BOSS_CONSEQUENCE.triggerLevelId).toBe('K1-10');
  });

  it('[REQ-CONSEQ-KEY-1] getTriggeredConsequence fires the Kepler consequence on K1-10 below-3-star', () => {
    const c = getTriggeredConsequence('K1-10', true, 2);
    expect(c?.id).toBe('kepler_boss_consequence');
  });

  it('[REQ-CONSEQ-KEY-1] getTriggeredConsequence fires the Kepler consequence on K1-10 fail', () => {
    const c = getTriggeredConsequence('K1-10', false, 0);
    expect(c?.id).toBe('kepler_boss_consequence');
  });

  it('[REQ-CONSEQ-KEY-1] getTriggeredConsequence does NOT fire on the obsolete K2-10 key', () => {
    const c = getTriggeredConsequence('K2-10', false, 0);
    expect(c).toBeNull();
  });
});

describe.skip('Kepler boss consequence semantics preserved (3.6.2)', () => {
  it('[REQ-CONSEQ-KEY-2] a 3-star success on K1-10 returns null (no consequence)', () => {
    const c = getTriggeredConsequence('K1-10', true, 3);
    expect(c).toBeNull();
  });

  it('[REQ-CONSEQ-KEY-2] the consequence retains a damage_system effect targeting propulsionCore', () => {
    const damage = KEPLER_BOSS_CONSEQUENCE.mechanicalEffects.find(
      e => e.type === 'damage_system',
    );
    expect(damage).toBeDefined();
    expect(damage!.system).toBe('propulsionCore');
  });
});
