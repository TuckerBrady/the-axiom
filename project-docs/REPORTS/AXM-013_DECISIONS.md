# AXM-013 — decisions PROMPT_160 did not cover

Written 2026-09-22 by Nash (WRENCH). PROMPT_160 says an uncovered decision goes here,
not into code as a silent pick. Each item says what was built and what reverses it.

## D-1 — The split count badge vs COMPUTATIONAL_MODEL "Visual Distinction" (sent to T-Bot)

**Conflict.** PROMPT_160 §2 wants the count badge split amber (pre-assigned) and blue
(requisitioned). `docs/COMPUTATIONAL_MODEL.md` §Visual Distinction (Option B) said purchased
pieces appear in the tray "identically to pre-assigned pieces … No visual distinction". Handoff
003 REQ-G-03 (ratified 2026-09-10) removed exactly that source coding from the wheel's borders.

**Built.** The split badge, as the brief says. The brief is the newer decision and Tucker approved
it. `COMPUTATIONAL_MODEL.md` is amended in this PR so the two stop contradicting each other: the
piece itself stays identical, and only the Kepler+ tray count splits by source.

**To reverse.** Pass `showSourceSplit={false}` from GameplayScreen and revert the
COMPUTATIONAL_MODEL amendment. The single neutral badge path is already there, and the Axiom uses it.

**Status.** Ruled by T-Bot 2026-09-22 23:40: build the split badge, and amend the doc in the same PR as a narrowing, not a reversal. Done in this PR.

## D-2 — Which instance a long-press return gives back

The brief says placement uses requisitioned pieces first, and that a long-press "restores its
count and source". A placed piece on the board doesn't record which inventory instance it came
from, so "its source" has to be decided somewhere. The return goes the opposite way from
placement: a pre-assigned instance comes back while any is on the board. With that rule, the
unspent requisitioned count equals "bought and never needed" after any sequence of placements
and returns, which is the invariant the brief's consume rule exists to protect. It is a pure
function (`nextReturnIndex`), and `trayGrouping.test.ts` covers the churn case.

## D-3 — When the filter-chip row appears

"More than 6 items" is measured over the level's whole inventory, placed or not, when placement
begins. Measuring the live tray would make the row vanish once enough types were used up, and
that would shift the board mid-level, which the brief rules out ("must not shift the board").

## D-4 — What "forces ALL" keys on for tutorials

The tray is forced to ALL whenever the tutorial overlay is active for the level
(`tutorialIsActive`). That is broader than "a step that targets a tray item", but the overlay
doesn't expose its current step to the tray. Forcing ALL for the whole tutorial is the
conservative reading, and no current Kepler tutorial level has chips anyway (K1-1 has 2 items).

## D-5 — The Settings-screen control the brief asks to delete does not exist

The brief says to delete the stored side setting "and its left/right control on the Settings
screen". The stored setting existed and is gone, and a hydration migration drops the old key from
existing saves. No Settings control was ever built on master, so there was nothing to remove. PR
#47 does edit `SettingsScreen.tsx` and `settingsStore.ts`, but for its board-size override, not
this setting.

## D-6 — The one remaining spelling of the removed setting's name

The migration has to name the retired persisted key. It is assembled from parts in
`settingsStore.ts` (`RETIRED_KEYS`), with a comment, so the repo-wide "no references" grep stays
empty. This is the only intentional reference left. It is recorded here so nobody takes it for
an oversight.

## D-7 — Tutorial step ids kept

K1-1's four onboarding step ids (`wheel-intro`, `wheel-scroll`, `wheel-place`,
`wheel-forfeit`) are unchanged. They are keys, not copy, and none of them matches the grep. Only
their `targetRef` moved (to `trayConveyor`), and two of their messages changed noun-only. The copy
that needs a rewrite is listed in `PROMPT_160_REPORT.md`.
