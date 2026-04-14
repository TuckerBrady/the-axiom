// ─── COGS reactive text for discipline select (DECISION-06) ─────────────────
// These lines swap into the COGS bubble as the player previews each discipline.
// Display only — the final selection persists on confirm, not on preview.
// [APPROVED] — Tucker sign-off pending. Mark final in docs/narrative when confirmed.

type OnboardingDiscipline = 'architect' | 'engineer' | 'operative';

export const DISCIPLINE_REACTIONS: Record<OnboardingDiscipline, string> = {
  architect:
    'Architect. You want the rules to work correctly. I can respect that. We will see if the rules respect you back.',
  engineer:
    'Drive Engineer. You trust forces more than instructions. That is a defensible position on most days.',
  operative:
    'Field Operative. You intend to improvise. I will try not to find this alarming.',
};

export const DISCIPLINE_NEUTRAL_PROMPT =
  'Pick one. I will tell you what I think.';
