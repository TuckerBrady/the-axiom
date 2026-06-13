# PROMPT_146 NOTES — Dead `tutorialStep.label` removal

**Date:** 2026-06-12
**Branch:** fix/a1-7-output-tape-intro (per Tucker decision — see below)

## Branch decision

The brief specified `master (commit directly)`. At execution time the working
tree was on `fix/a1-7-output-tape-intro`, which carries one unmerged commit
(c054c1e) adding the A1-7 `output-tape-intro` step — including a
`label: 'OUTPUT TAPE'` line that does **not** exist on `master` (master had 54
label lines; this branch had 55). Committing the cleanup to `master` would have
left A1-7's stray label behind, to re-surface when that PR merges. Tucker chose
to land the cleanup on **this branch** so all 55 labels (including A1-7's new
step) are removed in one pass and ride the existing A1-7 PR.

## TutorialHUDOverlay.tsx — did it need an edit?

No dead **code** reference to `step.label` exists. Grep for `.label` across
`src/` returns only:
- Style-object keys (`st.label`, `tapeStyles.label`, `simStyles.label`) — not
  the tutorial-step field.
- Unrelated data fields on other objects (`reward.label`, `card.label`,
  `entry.label`, `it.label`).
- **Comments** in `TutorialHUDOverlay.tsx` (the UX-02 / PROMPT_143 explanatory
  blocks). The only renderer of `step.label` was already removed by UX-02.

One comment block (the UX-02 note above the '???' caption) stated
"step.label is retained as data in levels.ts (now unused — flag for a future
cleanup pass)." That statement is now false, so the comment was updated to
record that PROMPT_146 removed the data. This is a comment-only edit; no
behavior change.

## TutorialStep.label type field — follow-up candidate (CONFIRMED unused)

`TutorialStep.label` (`src/game/types.ts`) is read **nowhere** in the codebase
outside the now-removed `levels.ts` data and the explanatory comments above.

The field was `label: string;` (required). Removing the data from every step
literal while leaving the field required would have failed `tsc` with
missing-property errors on every tutorial step. To keep the typecheck gate
green without removing or renaming the field (both out of scope per the brief),
the field was **widened to optional** (`label?: string;`). Required→optional is
a zero-blast-radius widening: it breaks no readers (there are none), and is
neither a removal nor a rename.

**Follow-up candidate:** fully delete `TutorialStep.label` from `types.ts`. Grep
confirms no consumer. Deferred to a separate prompt per the brief's blast-radius
guidance.

## Result

- `src/game/levels.ts`: 0 occurrences of `label:` inside tutorialSteps; 0
  occurrences of `'PIECE TRAY'`. 55 label entries removed (18 inline Kepler
  forms, 37 own-line Axiom forms — net 55 fields gone).
- `src/game/types.ts`: `label` widened to optional with an explanatory comment.
- `src/components/TutorialHUDOverlay.tsx`: one stale comment corrected.
- Tests: new `PROMPT_146` describe block added to `prompt92Fixes.test.ts`
  (red before edit, green after). Three pre-existing tests that asserted on the
  removed `label` field were updated to assert on the surviving, meaningful
  fields (`targetRef` / `codexEntryId` / message copy) instead:
  - `components/TutorialHUDOverlay.test.ts` (PROMPT_140 conveyor steps)
  - `levels.test.ts` (K1-1 REQUISITION store steps)
  - `prompt101Fixes.test.ts` (A1-1 source/terminal copy)
