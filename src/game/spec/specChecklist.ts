// Results-screen Spec Sheet checklist. After a level completes, the Star page
// shows the level's specs with each one's real outcome — NOT decorative copy.
// What backs each status:
//   - SHALL  : the live win condition (output-tape match / reach-Terminal /
//              topology SHALL). Reaching results PROVES every SHALL was met.
//   - SHOULD : the scoring engine — met = full marks in that category, partial
//              = some, missed = none (ScoreResult.breakdown).
//   - MAY    : evaluateMayConditions against the completed machine (+ payout).
//   - WILL   : givens (facts about the tapes), shown as context, not pass/fail.

import type { LevelDefinition, ScoringCategory } from '../types';
import type { ScoreBreakdown } from '../scoring';
import {
  deriveWillStatements,
  deriveShallStatements,
  deriveShouldStatements,
} from './specSheet';
import {
  willStatementToCopy,
  shallStatementToCopy,
  shouldStatementToCopy,
} from './specSheetCopy';

export type SpecCheckStatus = 'met' | 'partial' | 'missed' | 'given';
export type SpecSection = 'WILL' | 'SHALL' | 'SHOULD' | 'MAY';

export interface SpecCheckItem {
  section: SpecSection;
  text: string;
  status: SpecCheckStatus;
}

// Per-category point ceilings used to grade SHOULD compliance. Mirrors the
// denominators the results score strip already shows the player, so the
// checklist agrees with the numbers on the same card.
const CATEGORY_MAX: Record<ScoringCategory, number> = {
  efficiency: 30,
  protocolPrecision: 25,
  chainIntegrity: 20,
  disciplineBonus: 15,
  speedBonus: 10,
  elaboration: 15,
};

/**
 * Build the per-spec checklist for the results screen from the completed run.
 * `metMayDescriptions` are the MAY condition descriptions that were satisfied
 * (from the success handler / mayBonus). Only call this on a completed level —
 * SHALL items are reported as met because completion is their proof.
 */
export function buildSpecChecklist(
  level: LevelDefinition,
  breakdown: ScoreBreakdown,
  metMayDescriptions: string[] = [],
): SpecCheckItem[] {
  const items: SpecCheckItem[] = [];

  for (const w of deriveWillStatements(level)) {
    items.push({ section: 'WILL', text: willStatementToCopy(w), status: 'given' });
  }

  for (const s of deriveShallStatements(level)) {
    items.push({ section: 'SHALL', text: shallStatementToCopy(s), status: 'met' });
  }

  for (const sh of deriveShouldStatements(level)) {
    const val = breakdown[sh.category] ?? 0;
    const max = CATEGORY_MAX[sh.category];
    const status: SpecCheckStatus = val >= max ? 'met' : val > 0 ? 'partial' : 'missed';
    items.push({ section: 'SHOULD', text: shouldStatementToCopy(sh), status });
  }

  for (const m of level.mayConditions ?? []) {
    const met = metMayDescriptions.includes(m.description);
    const credits = m.reward.type === 'credits' ? m.reward.amount : 0;
    const text = met && credits > 0 ? `${m.description} (+${credits} CR)` : m.description;
    items.push({ section: 'MAY', text, status: met ? 'met' : 'missed' });
  }

  return items;
}
