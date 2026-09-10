# Implementation Requirements — Gameplay Loop

**Handoff:** 003-gameplay-review
**Prepared:** 2026-09-10 · Product/UX for Tucker Brady
**Repo:** `TuckerBrady/the-axiom` @ `master`
**Basis:** `INTENT_VS_BUILD.md` (intent gaps) and `GAMEPLAY_REVIEW.md`
(findings G-01…G-15, as amended 2026-09-10)

Read order for the implementer: this file, then `GAMEPLAY_REVIEW.md` for the
observed-behavior detail behind each `G-NN` reference, then
`Gameplay Review 003.dc.html` for sizes and colors at device scale.

---

## How to read this

Requirements are `REQ-G-NN`, grouped into four waves. Each carries **what
changes**, **acceptance criteria** (verifiable, not descriptive), and its
source finding. Anything marked **BLOCKED** must not be started until the
named decision lands — implementing it early means implementing it twice.

Waves are dependency-ordered, not effort-ordered. Wave 0 decisions gate
Wave 2.

Two standing rules apply to every requirement below, both from
`docs/ANIMATION_RULES.md` and non-negotiable:

- Every animated value stays `useNativeDriver: false`.
- No `Animated.View` host may be swapped across a conditional branch. Where a
  requirement changes mount behavior it moves toward *more* persistent hosts
  (REQ-G-02), never fewer.

Canonical test viewport: **390 × 844** (`TRIBAL_KNOWLEDGE.md`). Arithmetic in
`GAMEPLAY_REVIEW.md` was run at 393 pt; read it as approximate by 3 pt.

---

## WAVE 0 — Decisions (no code)

Three questions block eight requirements. None need new design work; two are
picking between documents that disagree.

### DEC-1 — Scoring model
`scoring.ts` scores Efficiency (30 pts, fewer pieces is better) and Speed
Bonus (10 pts, with a live HUD timer). `scoring-algorithm-v2.md` replaces
Efficiency with Signal Depth (14 pts, longer paths score higher), adds
Investment (25 pts), and **deletes Speed Bonus** — its stated reason being that
speed rewards rushing. `COMPUTATIONAL_MODEL.md` and `TRIBAL_KNOWLEDGE.md`
agree with v2. Three documents, three systems; the shipped one matches none.

**Ratify v2, or amend the soul statement.** v2 is still marked PROPOSED and
carries six open questions in its own spec — those need answers too.

Blocks: REQ-G-12, REQ-G-16, REQ-G-17.

### DEC-2 — Amber
`CLAUDE_CONTEXT.md` lists `Source visual: amber #F0B429` as locked.
`TRIBAL_KNOWLEDGE.md` §3 keeps "amber for Physics" as an engine-semantic
color. Request 001's D-03 reserves amber for the Physics beam. The first two
cannot coexist with the third.

Recommended: keep Source amber (it is the signal's origin, and the charge glow
reads as continuous with it), and drop D-03's claim to exclusivity for static
piece identity — but this is your call, not mine to take.

Blocks: REQ-G-03, and the charge-color half of REQ-G-05.

### DEC-3 — Void dialogue matrix
`DIALOGUE_SYSTEM.md` already contains an authored void `resultsLine` for every
discipline × behavior × phase combination, plus hub follow-ups, awaiting
sign-off. No writing is required — approve it and REQ-G-08 becomes wiring.

Blocks: REQ-G-08 (part 2 only; part 1 ships regardless).

---

## WAVE 1 — Contradictions of written decisions

Each of these is code drifting from a decision already made in writing. No
design input needed; ship in any order.

### REQ-G-04 — Tape colors to their locked values
**Source:** G-04 · **Files:** `tokens.ts`, `TapeCell.tsx`,
`TapeBarShell.tsx`, `SpecSheetPanel.tsx`, `GameplayScreen.tsx`

`TRIBAL_KNOWLEDGE.md` §3 locks all three: IN = Ice Blue `#7FC8E8`,
TRAIL = Atomic Purple `#A97FDB`, OUT = Fire Orange `#FF7D3F`. Shipped code has
`tapeInBar: '#BFFF3F'` and renders TRAIL cells in `#00FF87`.

1. `tokens.ts` carries exactly one hex per tape layer, at the locked values.
2. Delete every tape hex literal outside `tokens.ts` — including
   `SpecSheetPanel`'s hardcoded strip colors and `TapeCell`'s `neonGreen`
   trail text.
3. TRAIL cells render in TRAIL purple. The trail *head* stays distinct through
   weight and border, not a different hue.
4. `TapeCell.tapeHead` on the IN tape takes the IN color, not `#8B5CF6`.
5. The glow traveler is tinted to its **destination** layer, so a Scanner read
   is one purple event and a Transmitter write is one orange event. It is one
   persistent host taking color from props — style change only, no remount.

**Acceptance:** no file under `src/components/gameplay/` or
`src/screens/GameplayScreen.tsx` contains a tape hex literal. At the moment a
Scanner fires, the tape region shows exactly two hues: the layer's color and
the ink.

### REQ-G-01 — Remove the `MIN_CELL` clamp
**Source:** G-01 (amended) · **Files:** `GameplayScreen.tsx`, `BoardPiece.tsx`

`CLAUDE_CONTEXT.md` WHAT NOT TO DO: *"Do not use a fixed CELL_SIZE — always
calculate dynamically from canvas dimensions and level grid size."*
`MIN_CELL = 48` is that fixed floor, and it is why ten of eleven Kepler grids
clip — at 12 columns, `gridW` is 576 inside a 353 pt canvas, and the clipped
columns sit outside `overflow: 'hidden'`, so they cannot be tapped or dropped
into at all.

1. Remove `MIN_CELL` from the fit calculation. Keep `MAX_CELL`.
2. Preserve touch targets independently of drawn size: `hitSlop` on
   `BoardPiece`'s `Pressable` and the ghost-cell `TouchableOpacity` pads each
   to 44 pt while the drawn cell stays at its computed size.

**Acceptance:** for every grid in `levels.ts`, at widths 375 / 390 / 430,
`numColumns * CELL_SIZE <= canvasLayout.w - CANVAS_PAD * 2`. On K1-10, a piece
can be placed in column 0 and column 11.

**Referred out, not solved here:** at 12 columns on 390 pt the cell is 29 pt
and the icon lands at 15 pt, under the 22 pt catchability floor.
`LEVEL_DESIGN_FRAMEWORK.md`'s own quality checklist requires "board size is
minimum necessary for correct solution," so 9-plus-column grids are a
level-design item. Pan/zoom is not supported by any design doc and is
withdrawn. **Do not add a viewport interaction to work around this.**

### REQ-G-07 — Wire colors follow static identity, not beam colors
**Source:** G-07 · **File:** `WireOverlay.tsx`

`wireColor = isProtocol ? Colors.amber : Colors.blue` paints unlit Protocol
wires in the Physics beam color and unlit Physics wires in blue — teaching the
inverse of the mapping Kepler Belt is gated on.

Change to `isProtocol ? Colors.circuit : Colors.copper`. Lit and locked
behavior unchanged (`isLit` defers to `getBeamColor(toType)`, `isLocked` to
`#00C48C`). No change to dash geometry, stroke widths, or the all-sectors
render rule.

**Acceptance:** with a Conveyor adjacent to a Scanner on A1-5 and
`beamState.phase === 'idle'`, the two connecting strokes are `#c87941` and
`#a78bfa`, and no `#f0b429` appears anywhere in the wire layer.

### REQ-G-08 — Void failure: select once, then wire the authored matrix
**Source:** G-08 · **Files:** `GameplayModals.tsx`, `useGameplayFailure.ts`

Part 1 ships now. Part 2 is **BLOCKED on DEC-3.**

1. **Now:** `VOID_QUOTES[Math.floor(Math.random() * …)]` is called in the
   render path, and `GameplayModals` re-renders every second from its
   `elapsedSeconds` prop, so the line rerolls while the player reads it. Draw
   the index once when the void state is entered, store it in
   `useGameplayFailure` alongside `failCount`, pass it in as a prop.
   `Math.random()` must not appear in any render path.
2. **BLOCKED (DEC-3):** replace the five-item array with the
   `DIALOGUE_SYSTEM.md` void matrix, selected on discipline × behavior × phase.
3. **BLOCKED (DEC-3):** add the board-state diagnostic above the COGS quote,
   in the slot `INSUFFICIENT PULSES` uses for `insufficientSubtext`. It needs
   `lastStep.pieceId`, its `type`, `gridX/gridY`, and the layer the traversal
   stopped on. The other four failure modals all carry a specific diagnostic;
   the void — the most common early failure — carries none.

**Acceptance (part 1):** rendering `GameplayModals` twice with a changed
`elapsedSeconds` produces an identical quote. Open the modal and watch five
seconds: no change.

### REQ-G-14 — Dot grid stops drawing a phantom row and column
**Source:** G-14 · **File:** `GameplayScreen.tsx`

The field iterates `(numRows + 1) × (numColumns + 1)` with cell-centered dots,
so index `numColumns` lands half a cell outside the board and gets clipped —
the bay reads as cut off rather than framed. Iterate `numRows × numColumns`. A
boundary marker, if wanted, belongs in the `styles.canvas` border.

**Acceptance:** dot count equals `numRows * numColumns`; the outermost dots sit
one half-cell inside the border on all four sides.

### REQ-G-15 — Blown-cell scars use palette tokens
**Source:** G-15 · **File:** `GameplayScreen.tsx`

`rgba(176,106,44,·)` and `rgba(200,72,40,·)` are not in `tokens.ts`. Map the
scorched rim to `Colors.copper` and the inner crater ring to `Colors.red`, at
existing opacities. Geometry unchanged.

**Acceptance:** no hits for `rgba(176,106,44` or `rgba(200,72,40`.

### REQ-G-11 — Delete the dead style block
**Source:** G-11 · **File:** `GameplayScreen.tsx`

Post-extraction, `GameplayScreen.styles` still holds the pre-AXM-001 values
that D-07 and D-08 deleted elsewhere: `pulseCounterText` at 9 pt in `#1A3050`
(the 1.5:1 color D-07 removed from the HUD), `sectorTag` 7 pt, `trayCost`
7 pt, `pauseBtn`/`backBtn` at 36 × 36, and ~40 orphaned tape styles including
the `tapeCellGatePassed` green-on-green that `TapeCell` replaced. Each is one
`style={…}` reference away from shipping again.

Keep only what the file's own JSX references: `root`, `safeArea`, `errorText`,
`canvasOuter`, `canvas`, `flashOverlay`, `ghostDragPiece`, `ghostCell`,
`ghostInnerValid`, `dragHoverCell*`, `creditError*`, `debug*`, `engageRow*`,
`glowTraveler*`.

**Acceptance:** `react-native/no-unused-styles` clean on the file;
`npx tsc --noEmit` clean; all four quality gates green; no visual diff.

---

## WAVE 2 — Intent gaps

Where the build works as coded but not as designed.

### REQ-G-05 — The beam carries its layer's color
**Source:** G-05 · **File:** `BeamOverlay.tsx`, `GameplayScreen.handleEngage`

Charge color is **BLOCKED on DEC-2**; items 2 and 3 ship regardless.

Three spec-fails against `SPEC_BEAM_ANIMATION.md`: both charge rings are
hardcoded `#8B5CF6` (the Protocol *body* stroke — neither beam color, so an
all-Physics machine opens its run in the wrong layer's hue), the inter-pulse
source flash is hardcoded the other way at `#F0B429`, and there is no
crossfade at a category boundary. Worse, the travelling front is white
(`Circle r=3.5 fill="white"`) over a 0.25-opacity halo, so the layer change
SE-BEAM-082 exists to communicate is the least visible part of the animation.

1. **BLOCKED (DEC-2):** derive a `chargeColor` prop from the first
   post-Source step's `category` and use it for both charge rings and the
   source flash, replacing both hardcoded literals. Per SE-BEAM-081 that is
   `#F0B429` / `#00D4FF`; DEC-2 confirms whether amber stays.
2. Fill the beam head with `beamState.headColor`, keeping white as a smaller
   inner core (r ≈ 1.5) so the front carries its layer color.
3. Per SE-BEAM-082, interpolate segment color across a category boundary over
   300 ms via one JS-driven `Animated.Value` per active trail, instead of
   swapping the `stroke` literal on the step boundary.

**Acceptance:** `TEST-BEAM-008` as written in `SPEC_BEAM_ANIMATION.md` §10,
plus: on a trace whose first post-Source piece is a Conveyor, the charge ring
matches that category and `#8B5CF6` appears nowhere in `BeamOverlay`'s
rendered tree.

### REQ-G-02 — The board holds still when ENGAGE fires
**Source:** G-02 · **Files:** `GameplayScreen.tsx`, `HUDChrome.tsx`

Both the tray (72 pt) and the engage row (56 pt) are mounted on
`!isExecuting` inside a `flex: 1, justifyContent: 'center'` canvas, so pressing
ENGAGE removes 128 pt of siblings and the machine translates ~64 pt down the
screen in the same frame the run begins. `HUDChrome` simultaneously gains a
line and reflows per pulse as the counter string grows.

Secondary and more serious: `CELL_SIZE` derives from `canvasLayout.h`, so on
any grid where the height term wins the `min()`, board scale changes mid-run
*after* `handleEngage` cached `board0`/`input0`/`trail0`/`output0` — beam and
glow coordinates then compute against stale geometry.

1. Keep `partsTray` and `engageRow` mounted for the whole level; change
   contents, opacity and `pointerEvents` for the run state. This is also the
   SE-BEAM-003 posture and it retires a live REQ-A-2 hazard.
2. Give `HUDChrome` a fixed-height pulse-counter row, present and empty when
   idle, left-aligned, so per-pulse string growth does not reflow the HUD. No
   change to what the counter says or to the pause / spec-sheet buttons.

**Acceptance:** `measureInWindow` on the board container before and after
ENGAGE on A1-6 returns an unchanged `y` and an equal `CELL_SIZE`. Integration
test asserts both style hosts stay mounted while `isExecuting` is true.

### REQ-G-16 — Machine heartbeat (haptics)
**Source:** `INTENT_VS_BUILD.md` §3 · **Spec:** `audio-haptics.md`
**BLOCKED on DEC-1** only insofar as the timer's fate affects run pacing;
the haptic work itself can start immediately.

Specced and unbuilt. One of the game's two stated signature moments — the
signal reaching Terminal and locking — currently lands silent and untouched.

1. One light tap per piece the beam touches.
2. Medium on Terminal arrival.
3. Nothing during CHARGE, so the launch is the first thing felt.

**Acceptance:** as written in `audio-haptics.md`. On a six-piece trace, six
light taps and one medium, with no haptic before the beam leaves Source.

### REQ-G-17 — Requisition reads as a real constraint
**Source:** G-12 · **File:** `RequisitionPanel.tsx` · **BLOCKED on DEC-1**

Purchases happen once, before the level, and under v2 a floor solve caps at 45
points — one star. The panel currently shows ~5 rows out of a `maxHeight: 240`
`ScrollView` with `showsVerticalScrollIndicator={false}` and no fade or count,
so the catalogue looks five items long and priced in 9 pt. That invites buying
nothing and walking in under-equipped, which is the behavior the design says
must never be encouraged.

Presentation only — no pricing, stock or economy change.

1. Restore the scroll indicator; add a bottom fade and a per-tab item count in
   the tab bar so catalogue length is legible.
2. `maxHeight` derives from available height, not a fixed 240 pt.
3. Row icons 22 → 32 pt, matching the tray per D-08.
4. `qtyBtn` to 44 × 44 (see REQ-G-10); price and stock to the 11 pt floor.

**Acceptance:** on a Kepler level with more than six purchasable rows, a scroll
indicator and a count are visible and the sixth row is discoverable without a
blind drag. Snapshots at 375 / 390 / 430 pt.

### REQ-G-03 — Static identity stops borrowing beam colors
**Source:** G-03 (amended) · **BLOCKED on DEC-2** for the Source and
Physics-identity questions

Two sub-findings are settled by other docs and ship regardless of DEC-2:

1. `ArcWheel.getPieceColor` returns `#F0B429` for every non-Protocol piece
   while its own adjacent comment states it returns "the canonical blue (NOT
   the amber source-accent)." Code and comment disagree; make it
   `Colors.blue`, matching `BoardGrid` and `PieceTray`.
2. `SOURCE_COLORS = { preAssigned: '#F0B429', requisitioned: '#00D4FF' }`
   encodes purchase provenance on tray node borders.
   `COMPUTATIONAL_MODEL.md` "Visual Distinction" mandates Option B —
   purchased pieces appear **identically** to pre-assigned ones. Collapse to
   one neutral border; do not encode provenance at all.

Held for DEC-2: `RequisitionPanel.TAB_COLORS`, `SpecSheetPanel.SECTION_ACCENT`,
`dragHoverCellValid`, and the Source's static color.

**Acceptance (1 and 2):** `ArcWheel` node borders are identical for a
pre-assigned and a requisitioned piece of the same type; no `#00D4FF` in
`SOURCE_COLORS`.

---

## WAVE 3 — Legibility and reach

Applying ratified Request 001 decisions to the surfaces 001 did not reach.

### REQ-G-10 — 11 pt type floor and 44 pt targets, everywhere
**Source:** G-10 · **Files:** `GameplayModals.tsx` (13),
`RequisitionPanel.tsx` (11), `ArcWheel.tsx` (7), `SpecSheetPanel.tsx` (5),
`TapeBarShell.tsx` (2), `TapeCell.tsx` (1), `GameplayScreen.tsx` (11, mostly
dead — see REQ-G-11)

D-07/D-08 set an 11 pt floor and `FontSizes.floor = 11` exists; it was applied
in `HUDChrome` and `PieceTray` only. 39 rendered strings remain below it. The
sharpest case is `TapeCell.tapeCellText` at **10 pt** — every tape value in the
game, on a stated signature moment.

1. Raise all listed strings to `FontSizes.floor` or above, referencing the
   token rather than a literal.
2. `TapeCell` grows to 26 × 26 with a 12 pt digit.
3. `RequisitionPanel.qtyBtn` 28 × 28 → 44 × 44.
4. `voidBtn` takes `paddingVertical: Spacing.lg` and an 11 pt label; the label
   moves to `Colors.starWhite` with red carried by the border, which clears
   the ~4.4:1 contrast fail without introducing a color.
5. `SpecSheetPanel.closeBtn` takes `paddingVertical: 14` (was ~31 pt tall).

**Acceptance:** CI check — no `fontSize` literal below 11 in
`src/components/gameplay/` or `GameplayScreen.tsx`. Accessibility Inspector
pass for 44 pt targets on the void modal, Spec Sheet and Requisition panel.

**Related ceiling, recorded not fixed:** the tape row is fixed-width
(`42` label + `8` gap + `n × cell` + gaps + `24` padding). At 26 pt cells and
n = 10 that is 361 pt of 390 — it fits, n = 12 does not, and `TapeBarShell` has
no scroll, wrap or scale. `TEACHING_PROGRESSION.md` locks Axiom and Kepler to
"full tape visible," so the row will clip silently the first time a tape
exceeds eleven cells. Derive cell size from available width with a floor, same
discipline as the board.

### REQ-G-13 — Arc Wheel inventory is legible
**Source:** G-13 · **File:** `ArcWheel.tsx`

The expanded overview — where the Engineer picks from a full inventory, the
same decision the Axiom tray makes at 32 pt — renders `PieceIcon size={20}`
with 10 pt labels and 8 pt counts. Collapsed nodes scale down 45 % with
distance from the selection and fade to 0.3 opacity, putting outer nodes at
~29 pt below both the size and the 0.45 opacity floor of the piece drawing
standard.

1. Overview icons to 32 pt; labels and counts to `FontSizes.floor`.
2. Clamp distance scaling so the smallest rendered node is ≥ 32 pt and
   `distanceOpacity` bottoms out at 0.45. Entrance and scroll timings
   unchanged.

**Acceptance:** on K1-5 expanded, a rendered icon measures 32 pt and the
dimmest node's opacity is ≥ 0.45.

### REQ-G-18 — Arc Wheel category quick-jump
**Source:** `INTENT_VS_BUILD.md` §7 · **Spec:** `ARC_WHEEL_UX_ANALYSIS.md`

Your own analysis scored wheel discoverability 3/10 and recommended keeping it
for Kepler+ with exactly one addition: a category quick-jump or dot-strip
index, because *"the expanding tray mechanic in Kepler needs the Engineer to be
able to assess their full inventory quickly."* Unbuilt. Under DEC-1's v2 this
compounds — three of six scoring categories depend on inventory comprehension.

Build the quick-jump as specced. With REQ-G-13 and REQ-G-17 this closes the
same underlying problem on all three surfaces: the Engineer cannot see what
they have or could have.

**Acceptance:** as written in `ARC_WHEEL_UX_ANALYSIS.md`.

### REQ-G-06 — D-05 chip sits inside its piece box
**Source:** G-06 · **File:** `BoardPiece.tsx`

The chip is correct — 11 pt starWhite on `rgba(6,9,15,0.85)`, upright outside
the rotation transform, as specified. Its position is not: at `bottom: -2,
right: -2` on a `cellSize - 4` pressable, a Counter's `"0/2"` is ~28 × 17 pt
sitting entirely outside the piece box and 4 pt into the neighbouring cell. At
the board's right or bottom edge it clips — which is where the Terminal
usually sits.

1. Inset to `bottom: 1, right: 1`.
2. Shrink to `paddingHorizontal: 2` at three glyphs or more.
3. Hold the 11 pt floor: if the value cannot fit at 11 pt inside the box at
   the current cell size, drop the denominator (`0/2` → `0`) rather than the
   point size. The threshold is already on the Spec Sheet and in the Codex.

**Acceptance:** a Counter at `gridX = numColumns - 1, gridY = numRows - 1` on
an 8-wide grid renders fully inside the board and does not overlap its
neighbour's icon. Snapshots at `CELL_SIZE` 48 and 88.

### REQ-G-09 — Void COGS lines stack
**Source:** G-09 · **File:** `GameplayModals.tsx`

`cogsResultRow` is `flexDirection: 'row'`, so with blown cells present the
void quote and the blown-cell line each take `flex: 1` and split into two
~130 pt columns of 12 pt italic beside the avatar — two consecutive COGS
statements presented as parallel columns, on the highest-stakes text in the
loop.

Wrap the text children in `View style={{ flex: 1, gap: Spacing.sm }}` inside
`cogsResultRow`. Avatar stays left, lines stack in order. No copy change.

**Acceptance:** failing a Kepler level with ≥ 1 blown cell renders both lines
full-width and stacked.

---

## Design work I owe you

Two playtest specs are blocked on design, not development
(`SKEPTIC_PLAYTEST_2026-06-09.md`):

- **SPEC-02 / UX-01** — exact pixel anchors for the two-position COGS dialogue
  card. Explicitly blocked on design; still undefined.
- **CONTENT-01** — Codex entry format for IN / TRAIL / OUT. The three tape
  elements are the only game objects with no Codex entry, so they never get the
  "???" → entry → UNDERSTOOD discovery beat every piece gets — on a stated
  signature moment.

Say the word and I will deliver both as a 004 handoff.

---

## Scope boundaries

Not proposed anywhere in this document: level-design changes (grid widths are
referred to level design under REQ-G-01), scoring or economy value changes
(DEC-1 is a ratification question, not a rebalance), new player-facing copy
(the void lines exist in `DIALOGUE_SYSTEM.md` awaiting sign-off), and any
change to piece icon art, HUD chrome styling, the ship, or onboarding — all
treated as ground truth from Requests 001 and 002.

The `.dc.html` in this folder is a browser reference at device scale. It is not
a React Native component and must not be ported into `src/`.

---

## Requirement index

| ID | Wave | Blocked by | Files |
|---|---|---|---|
| DEC-1 scoring | 0 | — | decision |
| DEC-2 amber | 0 | — | decision |
| DEC-3 void matrix | 0 | — | decision |
| REQ-G-04 tape colors | 1 | — | tokens, TapeCell, TapeBarShell, SpecSheet, GameplayScreen |
| REQ-G-01 MIN_CELL | 1 | — | GameplayScreen, BoardPiece |
| REQ-G-07 wire colors | 1 | — | WireOverlay |
| REQ-G-08 void reroll | 1 | pt 2–3: DEC-3 | GameplayModals, useGameplayFailure |
| REQ-G-14 dot grid | 1 | — | GameplayScreen |
| REQ-G-15 scar tokens | 1 | — | GameplayScreen |
| REQ-G-11 dead styles | 1 | — | GameplayScreen |
| REQ-G-05 beam color | 2 | pt 1: DEC-2 | BeamOverlay, GameplayScreen |
| REQ-G-02 layout jump | 2 | — | GameplayScreen, HUDChrome |
| REQ-G-16 haptics | 2 | — | new — per audio-haptics.md |
| REQ-G-17 requisition | 2 | DEC-1 | RequisitionPanel |
| REQ-G-03 static identity | 2 | partial: DEC-2 | ArcWheel, RequisitionPanel, SpecSheet, GameplayScreen |
| REQ-G-10 type floor | 3 | — | 7 files |
| REQ-G-13 wheel legibility | 3 | — | ArcWheel |
| REQ-G-18 wheel quick-jump | 3 | — | ArcWheel |
| REQ-G-06 D-05 chip | 3 | — | BoardPiece |
| REQ-G-09 COGS stacking | 3 | — | GameplayModals |
