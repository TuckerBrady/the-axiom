# Handoff 003 — Gameplay Screen Review

Prepared 2026-09-09 for `TuckerBrady/the-axiom` @ `master` (tree
`a2f9f548a389`). Delivered against `REQUEST.md` in this folder.

## Overview

Fifteen numbered findings (`G-01` … `G-15`) against the live gameplay
experience: the board and placement, the tape system, the beam animation, the
tray and requisition economy, and the failure modals. Each carries observed
behavior, why it is a problem (tied to a locked decision, a doc-bible clause, a
spec clause, or arithmetic that fails on device), the specific change, and how
to verify the fix.

**Implementers start with `REQUIREMENTS.md`.** It is the actionable
deliverable: 20 numbered requirements in four dependency-ordered waves, each
with acceptance criteria, plus three Wave 0 decisions that gate eight of them.

**Read `INTENT_VS_BUILD.md` for the why.** It compares the design bible
against the shipped build. The largest gap is not visual: shipped scoring
rewards fewer pieces and faster finishes, the exact inversion of the stated
design soul.

`GAMEPLAY_REVIEW.md` holds the observed-behavior detail behind each `G-NN`
reference. The `.dc.html` is a visual reference at device scale.

Scope held to what Requests 001 and 002 did not settle. Piece icon rendering,
HUD chrome styling, color-role *assignment*, type *scale*, the ship, and
onboarding/COGS presentation are all treated as ground truth, not re-reviewed.
Where a finding cites a Request 001 value (11 pt floor, 32 pt tray icon, amber
and cyan reserved for beams, the piece drawing standard) it is applying that
decision to a surface 001 did not reach.

## Files in this bundle

| File | What it is | Read order |
|---|---|---|
| `REQUIREMENTS.md` | **Hand this to the implementer.** REQ-G-01 … REQ-G-18 plus DEC-1/2/3, in four waves, with acceptance criteria and a blocked-by index. | 1 |
| `INTENT_VS_BUILD.md` | Product/UX pass: what the docs say the game should be, where the build diverges, and corrections to this bundle. | 2 |
| `GAMEPLAY_REVIEW.md` | Findings G-01 … G-15 — observed behavior, arithmetic, verification. Amended 2026-09-10. | 3, as reference |
| `Gameplay Review 003.dc.html` | Four panels at true device sizes: board geometry, the tape stack mid-pulse, tray collapsed/expanded, the void modal. Open in a browser. | as needed |
| `REQUEST.md` | The inbound request (unchanged). | — |

## Fidelity

- **Hi-fi / exact:** every hex, point size, cell size, stroke weight, opacity
  and touch-target dimension in both the spec and the HTML. Implement these
  literally. All panels are drawn 1 px = 1 pt at iPhone 15 Pro width (393 pt).
- **Lo-fi / blueprint:** piece icons in the HTML are labelled placeholder
  boxes at the correct size. Icon art is Request 001's scope and
  `PieceIcon.tsx` remains the single source of truth; the placeholders exist
  only to show scale and category color.
- The void-modal panel is a **layout** reference. The COGS lines shown are
  existing strings from the codebase; the diagnostic slot is deliberately
  empty because its wording needs sign-off.

## Priority order

Superseded by `REQUIREMENTS.md`'s wave structure, which reorders around the
Wave 0 decisions. Kept for traceability to the finding IDs.

1. **G-01** — grids of nine columns or more clip; the clipped columns cannot
   be tapped. Ten of eleven Kepler grids affected. Part one is a clamp
   removal; part two is referred to level design.
2. **G-07** — the dashed wire layer draws Protocol connections in the Physics
   beam color. One line.
3. **G-05** — CHARGE renders in Protocol purple on every run; no category
   crossfade; the beam head is white. Spec-fail against SE-BEAM-081/082.
4. **G-04** — IN and TRAIL cells render in colors other than their locked
   ones. Root cause is a superseded spec (`design/specs/TRAIL_TAPE_COLORS.md`)
   that the code is still obeying.
5. **G-03** — amber and cyan used as static chrome in six places, so the beam
   has no contrast event. Mechanical.
6. **G-02** — the board translates ~64 pt down the screen the frame ENGAGE
   fires, because the tray and engage row unmount.
7. **G-08** — the void failure has no computational diagnostic and its COGS
   line rerolls once per second (`Math.random()` in a render path).
8. **G-09** — two COGS lines render side by side as narrow columns on the void
   screen.
9. **G-06** — the D-05 overlay chip collides with the neighbouring cell and
   clips at the board edge. Position only; the chip itself is correct.
10. **G-10** — 39 rendered strings below the 11 pt floor, three touch targets
    below 44 pt, including the tape digit and the requisition ± buttons.
11. **G-12** — the requisition catalogue shows about five rows and hides that
    it continues, which pushes the Engineer toward the floor solve.
12. **G-13** — Arc Wheel expanded overview renders icons at 20 pt.
13. **G-11** — dead style duplicates in `GameplayScreen.tsx` still hold the
    values D-07 and D-08 deleted, including the 1.5:1 `#1A3050`.
14. **G-14** — the dot grid draws a phantom row and column that the board clips.
15. **G-15** — blown-cell scars use two off-token oranges.

## Repo files each finding touches

```
src/screens/GameplayScreen.tsx                G-01, G-02, G-03, G-04, G-11, G-14, G-15
src/components/gameplay/WireOverlay.tsx       G-07
src/components/gameplay/BeamOverlay.tsx       G-05
src/components/gameplay/TapeCell.tsx          G-04, G-10
src/components/gameplay/TapeBarShell.tsx      G-04, G-10
src/components/gameplay/BoardPiece.tsx        G-01 (hitSlop), G-06
src/components/gameplay/BoardGrid.tsx         G-03
src/components/gameplay/ArcWheel.tsx          G-03, G-10, G-13
src/components/gameplay/RequisitionPanel.tsx  G-03, G-10, G-12
src/components/gameplay/SpecSheetPanel.tsx    G-03, G-04, G-10
src/components/gameplay/GameplayModals.tsx    G-08, G-09, G-10
src/components/gameplay/HUDChrome.tsx         G-02
src/hooks/useGameplayFailure.ts               G-08
src/theme/tokens.ts                           G-04
```

## Decisions needed before implementation starts

Full statements in `REQUIREMENTS.md` Wave 0. Three decisions gate eight
requirements.

1. **DEC-1 — scoring.** Shipped `scoring.ts` scores Efficiency (fewer pieces)
   and Speed Bonus (with a live HUD timer). `scoring-algorithm-v2.md` rewards
   longer paths and deletes Speed Bonus outright; `COMPUTATIONAL_MODEL.md` and
   `TRIBAL_KNOWLEDGE.md` agree with v2. Three documents, three systems, and
   the shipped one matches none. Gates REQ-G-12, REQ-G-16, REQ-G-17.
2. **DEC-2 — amber.** `CLAUDE_CONTEXT.md` ("Source visual: amber #F0B429") and
   `TRIBAL_KNOWLEDGE.md` §3 ("amber for Physics") versus Request 001's D-03,
   which reserves amber for the Physics beam. Gates REQ-G-03 and the
   charge-color half of REQ-G-05.
3. **DEC-3 — void dialogue matrix.** The copy already exists in
   `DIALOGUE_SYSTEM.md`, authored per discipline × behavior × phase plus hub
   follow-ups, awaiting sign-off. Approve it and REQ-G-08 becomes a wiring
   task, not a writing one.

**Kepler grid width** is referred to level design rather than escalated here:
`CLAUDE_CONTEXT.md` prohibits a fixed `CELL_SIZE`, and
`LEVEL_DESIGN_FRAMEWORK.md`'s own checklist ("board size is minimum
necessary") plus `PIECE_CREATION_STANDARD.md` (icons legible at 52 px) put the
ceiling near 8 columns on a 390 pt viewport. Ten of eleven Kepler grids exceed
it. REQ-G-01 removes the clamp; the grids themselves need re-floor-solving.

The IN tape hex is **not** an open decision — `TRIBAL_KNOWLEDGE.md` §3 locks
`#7FC8E8`. An earlier draft of this bundle escalated it in error; see
`INTENT_VS_BUILD.md` Part 3.

## Ground rules observed

- No emojis anywhere in this bundle.
- **No COGS dialogue is written.** G-08 flags a missing diagnostic and
  specifies the data it should be given; it writes no line. Existing strings
  are quoted only where a finding is about how they are presented.
- **No new player-facing copy.** The one copy-adjacent recommendation
  (G-12's per-tab item count) is called out as needing sign-off.
- No scoring, economy or level-design changes are proposed. Where a
  presentation finding runs into one, it says so and stops (G-01, G-10's tape
  ceiling note).
- The `.dc.html` is a browser reference. It is not a React Native component
  and must not be ported into `src/`.

## Verified compliant

Recorded in the spec so the next round does not re-litigate: placement
highlights are Axiom-only; wires render on all sectors; long press returns a
piece directly with no held state; tap actions are exactly Conveyor / Config
Node / Latch; every animation in scope is JS-driven and no finding proposes a
native-driven value or a host swap across a conditional branch; the D-05 chip
stays upright at the 11 pt floor as specified.

One docs drift noted rather than filed as a finding: the Latch now cycles
three states (write → read → delay, `nextLatchMode`), where `CLAUDE.md` still
says it toggles two.
