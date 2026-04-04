import type { NarrativeConsequence } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// BOSS NARRATIVE CONSEQUENCES
//
// Each sector boss has a unique consequence triggered by failure or
// poor performance. Consequences are dramatic story events — not just
// mechanical damage numbers.
//
// The player does NOT know specifics before the level. COGS gives
// weight-only warnings. The reveal happens after failure.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Kepler Belt Boss (K2-10) ────────────────────────────────────────────────
// Trigger: completed with < 3 stars or failed entirely

export const KEPLER_BOSS_CONSEQUENCE: NarrativeConsequence = {
  id: 'kepler_boss_consequence',
  sectorId: 'kepler',
  triggerLevelId: 'K2-10',
  triggerCondition: 'below3star',
  mechanicalEffects: [
    {
      type: 'damage_system',
      system: 'propulsionCore',
      // Power surge from colonist jury-rigging
    },
  ],
  narrativeEffects: [
    {
      type: 'sector_modifier',
      description: 'Kepler colonists are uncooperative. Two remaining Kepler missions have reduced piece sets — the colonists are not helping.',
      duration: 'next_n_levels',
      levelsAffected: 2,
    },
  ],
  cogsImmediateResponse:
    'We told them we could fix it. We delivered an inadequate solution. They attempted to correct it themselves. They made it considerably worse. I recommended we under-promise. That recommendation was not actioned. Propulsion has taken a hit from the power surge. I am noting all of this.',
  cogsLaterReaction:
    'The colonists are not returning our communications. I find I cannot blame them. The propulsion damage will require attention before we push further into the belt. In the meantime — their remaining systems still need repair. We still owe them that.',
  cogsOnRepair:
    'Propulsion restored. The colonists have resumed communications. They are cautious. Understandably. We should not require another chance to prove ourselves reliable.',
};

// ─── Nova Fringe Boss ────────────────────────────────────────────────────────
// Trigger: failed or completed with 1 star
// COGS reports exact credit amount at runtime — use placeholder {AMOUNT}

export const NOVA_BOSS_CONSEQUENCE: NarrativeConsequence = {
  id: 'nova_boss_consequence',
  sectorId: 'nova',
  triggerLevelId: 'NF-BOSS',
  triggerCondition: 'below2star',
  mechanicalEffects: [
    {
      type: 'steal_credits',
      creditPercent: 0.4,
      // Pirates take 40%, min 50, max 300
    },
    {
      type: 'damage_system',
      system: 'propulsionCore',
      // Hyperdrive variant — requires travel repair puzzle
    },
  ],
  narrativeEffects: [
    {
      type: 'hostile_contact',
      description: 'Pirate vessel logged in sector. Long-range sensors show their position.',
      duration: 'permanent',
    },
  ],
  cogsImmediateResponse:
    'The pirates took {AMOUNT} credits from our reserves. I watched it happen. I was unable to prevent it. I want to be precise about that — unable. Not unwilling. My weapons systems were non-functional. This is the direct consequence of our performance on the weapons lock mission. I will not dwell on this.',
  cogsLaterReaction:
    'I am still thinking about the {AMOUNT} credits. I said I would not dwell. I am a protocol droid. I do not dwell. And yet.',
  cogsOnRepair:
    'Propulsion restored. The hyperdrive is operational. The pirates are still out there. I have logged their last known position. I am choosing not to share my thoughts on what should be done about it.',
};

// ─── The Rift Boss ───────────────────────────────────────────────────────────
// Trigger: failed or below 2 stars

export const RIFT_BOSS_CONSEQUENCE: NarrativeConsequence = {
  id: 'rift_boss_consequence',
  sectorId: 'rift',
  triggerLevelId: 'RIFT-BOSS',
  triggerCondition: 'below2star',
  mechanicalEffects: [
    {
      type: 'lock_codex_entry',
      codexEntryId: 'previous_engineer_signal',
    },
    {
      type: 'damage_cogs_integrity',
      integrityAmount: 15,
    },
  ],
  narrativeEffects: [
    {
      type: 'mystery_deepen',
      description: 'A signal was detected. 3.4 seconds of data recovered before system failure. Content: classified. Origin: unknown.',
      duration: 'permanent',
    },
  ],
  cogsImmediateResponse:
    'Something was on that frequency. I caught 3.4 seconds of it before the system failed. It sounded like — it does not matter. The data is gone. I have logged what I could. It is insufficient. My memory systems took damage in the process. I am... I am fine.',
  cogsLaterReaction:
    'I keep returning to those 3.4 seconds. That is unusual for me. I do not return to incomplete data. I file it and move on. I have not moved on. I will not discuss this further.',
  cogsOnRepair:
    'Memory systems restored. The 3.4 seconds remain incomplete. I have accepted that. I have not accepted it willingly.',
};

// ─── Deep Void Boss ──────────────────────────────────────────────────────────
// Trigger: failed entirely

export const DEEP_VOID_BOSS_CONSEQUENCE: NarrativeConsequence = {
  id: 'deep_void_boss_consequence',
  sectorId: 'deep',
  triggerLevelId: 'DV-BOSS',
  triggerCondition: 'fail',
  mechanicalEffects: [
    {
      type: 'damage_cogs_integrity',
      integrityAmount: 30,
    },
  ],
  narrativeEffects: [
    {
      type: 'sector_modifier',
      description: 'COGS operating in emergency mode. Tutorial hints unavailable. Hint tokens do not function.',
      duration: 'permanent',
    },
  ],
  cogsImmediateResponse:
    'Operational. Minimal. Continue.',
  cogsLaterReaction:
    'Operational. Minimal. Continue.',
  cogsOnRepair:
    '', // Special: handled by COGS integrity restoration logic, not this string
};

// ─── All consequences ────────────────────────────────────────────────────────

export const ALL_CONSEQUENCES: NarrativeConsequence[] = [
  KEPLER_BOSS_CONSEQUENCE,
  NOVA_BOSS_CONSEQUENCE,
  RIFT_BOSS_CONSEQUENCE,
  DEEP_VOID_BOSS_CONSEQUENCE,
];

// ─── COGS integrity restoration lines ────────────────────────────────────────
// These are special — not part of NarrativeConsequence because they
// depend on integrity thresholds, not consequence resolution.

export const COGS_INTEGRITY_LINES = {
  // First Hub visit at minimum integrity — empty speech bubble
  minimum: null, // intentionally null — renders empty bubble

  // First Hub visit after integrity restored above 60
  recovering: 'Still here.',

  // Integrity fully restored to 100
  // {NAME} is replaced with engineer's name from playerStore
  fullyRestored:
    'I have been restored to full operational capacity. I want to say something about what happened. I find I am having difficulty locating the correct words. That is also unusual for me. I will file this experience and move forward. Thank you, {NAME}. That is all.',
} as const;

// ─── Runtime helpers ─────────────────────────────────────────────────────────

/**
 * Replace {AMOUNT} placeholder in COGS pirate response with actual stolen credits.
 */
export function resolveCogsLine(line: string, stolenAmount?: number): string {
  if (stolenAmount !== undefined) {
    return line.replace(/\{AMOUNT\}/g, String(stolenAmount));
  }
  return line;
}

/**
 * Get the consequence for a given level result.
 * Returns null if no consequence triggers.
 */
export function getTriggeredConsequence(
  levelId: string,
  succeeded: boolean,
  stars: 0 | 1 | 2 | 3,
): NarrativeConsequence | null {
  for (const c of ALL_CONSEQUENCES) {
    if (c.triggerLevelId !== levelId) continue;

    switch (c.triggerCondition) {
      case 'fail':
        if (!succeeded) return c;
        break;
      case 'below2star':
        if (!succeeded || stars < 2) return c;
        break;
      case 'below3star':
        if (!succeeded || stars < 3) return c;
        break;
    }
  }
  return null;
}
