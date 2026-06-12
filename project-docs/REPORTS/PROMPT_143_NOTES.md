# PROMPT_143 NOTES — Codex-discovery '???' caption restore + generalize

## Base-branch deviation (decision point)

The prompt states the base is master HEAD `d8c9d1d` with PROMPT_142 / PR #16
already merged. Reality at execution time (2026-06-10):

- `master` HEAD is `f83cb87` — does NOT contain PROMPT_142.
- PROMPT_142's UX-02 sub-header removal lives unmerged on branch
  `fix/lane1-ux-game-batch` (commit `a95c2cb`), which is the branch checked
  out at execution.

Because PROMPT_143 depends directly on PROMPT_142's removal of the
`<Text style={st.label}>{step.label}</Text>` sub-header (the regression this
prompt repairs), the correct base is `fix/lane1-ux-game-batch`, not `master`.

**Resolution:** Branched `fix/codex-discovery-caption` off
`fix/lane1-ux-game-batch` and targeted the PR at `fix/lane1-ux-game-batch`
so the review diff is isolated to PROMPT_143's changes only. Targeting
`master` would have folded all of PROMPT_142's diff into this PR. Once
PROMPT_142 merges to master, this branch can be rebased/retargeted if Tucker
prefers a master-targeted PR.

## step.label dead-data decision

Chose option (a) from Implementation step 3: `step.label` is left as-is in
`levels.ts` (dead data, per PROMPT_142's "future cleanup pass" note). The new
'???' caption does NOT read `step.label` — it is derived purely from
`step.codexEntryId` + `useCodexStore.isDiscovered(...)`. No duplicate or
competing '???' mechanism exists; the removed sub-header render was the only
prior consumer and stays removed. No change to `levels.ts`.

## New player-facing copy

None. The '???' glyph is existing, already-shipped copy (live on A1-1 before
PROMPT_142's regression). No accessibility label, tooltip, or explanatory
string was added (caption container is `pointerEvents="none"`). Nothing
requires fresh sign-off.

## Implementation summary

- Hoisted `showCodexDiscoveryCaption` derived boolean next to `codexEntry`
  (~line 940): `isCodexStep && !!step.codexEntryId &&
  !useCodexStore.getState().isDiscovered(step.codexEntryId)`.
- Added a render block where the removed sub-header used to live (~line 1050):
  an `Animated.View` matching the portal box geometry exactly (same animated
  `left`/`top`/`width`/`height` + `portalOpacity`), `alignItems`/
  `justifyContent: 'center'`, `pointerEvents="none"`, `zIndex: 151`, rendering
  `<Text style={st.label}>???</Text>`. Centered over the highlight square ->
  no UX-03 off-center regression. Reuses the existing `st.label` amber-mono
  caption style.
- No changes to `handlePrimary` / `markDiscovered` calls, animation host
  structure, driver flags, or triple-guard cleanup (REQ-A-1 intact).
