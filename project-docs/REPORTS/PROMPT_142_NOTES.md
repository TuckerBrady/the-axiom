# PROMPT_142 — Implementation Notes

Lane-1 UX/GAME batch (UX-02/03/04/05/07/08, GAME-02/03/04).
Base: master HEAD `6a9fa35`.

## UX-05 — stray Source/Terminal spotlights during A1-1 conveyor step

**Resolution: verified-correct at HEAD, regression test added (no code change).**

The `showSpotlights` gate in `TutorialHUDOverlay.tsx` already requires
`isBoardStep` (`step.targetRef === 'boardGrid'`) along with
`levelId === 'A1-1' && phase === 'arrived' && targetLayout &&
spotlightCells.length > 0 && spotlightCellSize > 0`. The
`conveyor-collect` / `conveyor-reveal` steps target `trayConveyor`, so
`isBoardStep` is `false` and `showSpotlights` cannot be true for them.

The pre-written test (`TutorialHUDOverlay.promo142.test.ts`, UX-05 describe
block) passes against current HEAD with no code change — the static gate is
correct. Per Fix 4's "if NOT reproducible" branch, that test stands as the
regression guard; no additional code change was required. A device repro of
a stale-frame flicker during the transition was not performed (no simulator
in this environment); if one surfaces in playtest it would be a transition
timing issue, not a gate-logic issue, and the gate itself is confirmed sound.

## UX-03 — center piece/element labels over highlight square

**Resolution: resolved as a side effect of UX-02.**

Fix 1 (UX-02) removed the only consumer of `step.label` — the
`<Text style={st.label}>{step.label}</Text>` sub-header block above the
portal. That block was the sole renderer of any overlay label, including the
`'???'` codex-discovery captions. With it removed, no overlay label renders
that could be off-center, so there is nothing left to center. UX-02's own
test (the `step.label` block is gone) covers the absence; no separate
centering fix or regression test is needed.

`step.label` remains as data in `src/game/levels.ts` (now unused) — flagged
in the PR description for a future cleanup pass rather than deleted here.
