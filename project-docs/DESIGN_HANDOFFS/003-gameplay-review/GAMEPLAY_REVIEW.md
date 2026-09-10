# Gameplay Screen Design Review — Findings G-01 … G-15

**Round:** 003 — Gameplay screen (board, placement, tape system, beam
animation, tray/economy, modals)
**Prepared:** 2026-09-09 for `TuckerBrady/the-axiom` @ `master` (tree
`a2f9f548a389`)
**Status:** Locked. Findings are numbered and stable; cite them as `G-NN`.
**Companion visual reference:** `Gameplay Review 003.dc.html` (browser, not
production code)

---

## What this review is graded against

Every finding below is tied to one of:

- a **locked decision** in `CLAUDE.md` or Request 001's
  `AXIOM_DESIGN_REVIEW.md` / bundle README (color roles, type floor, sizing),
- a **doc-bible clause** — `docs/COMPUTATIONAL_MODEL.md` "The Soul of the
  Game" (build bigger, never smaller; failure is the curriculum),
  `docs/TEACHING_PROGRESSION.md` (tape visibility by sector),
- a **spec clause** — `project-docs/SPECS/SPEC_BEAM_ANIMATION.md` (SE-BEAM-\*),
  `docs/ANIMATION_RULES.md` (REQ-A-\*),
- or a **concrete on-device failure** with the arithmetic shown.

No finding here is a matter of taste. Where a presentation problem cannot be
solved without a systems or level-design change, the finding says so and
stops (G-01).

Reference device for all arithmetic: **iPhone 15 Pro, 393 × 852 pt**. Where a
number changes materially on 375 pt or 430 pt, both are given.

---

## Priority order

| Order | Finding | Why first |
|---|---|---|
| 1 | **G-01** | Board columns are physically unreachable on 10 of 11 Kepler grids. Hard bug. |
| 2 | **G-07** | The dashed wire layer currently teaches the *inverse* of the locked color roles. One-line fix. |
| 3 | **G-05** | CHARGE renders in Protocol purple on every run, including all-Physics machines. Spec-fail against SE-BEAM-081. |
| 4 | **G-04** | Two of three tape layers render in a color other than their locked one. Needs one decision from Tucker first. |
| 5 | **G-03** | Amber and cyan are static chrome in six places, so the beam has no contrast event to land on. |
| 6 | **G-02** | The machine jumps down the screen at the exact moment ENGAGE fires. |
| 7 | **G-08** | The most common failure state has no computational diagnostic and rerolls its COGS line every second. |
| 8 | **G-09** | Two COGS lines render side by side as narrow columns on the void screen. |
| 9 | **G-06** | D-05 overlay chip collides with neighbours and clips at the board edge. |
| 10 | **G-10** | 39 rendered strings below the 11 pt floor, plus three touch targets under 44 pt. |
| 11 | **G-12** | The requisition catalogue hides most of itself, which pushes the Engineer toward the floor solve. |
| 12 | **G-13** | Arc Wheel expanded overview renders piece icons at 20 pt. |
| 13 | **G-11** | Dead style duplicates in `GameplayScreen.tsx` still hold the values D-07 deleted. |
| 14 | **G-14** | Phantom dot row/column makes the board read as cut off. |
| 15 | **G-15** | Blown-cell scars use off-token oranges. |

---

## G-01 — Grids of nine columns or more are clipped, and the clipped columns are unreachable

**Observed.** `GameplayScreen.tsx` computes

```
availW    = canvasLayout.w - CANVAS_PAD * 2          // 393 - 40 = 353
CELL_SIZE = clamp(MIN_CELL 48, MAX_CELL 88,
              floor(min(availW / numColumns, availH / numRows)))
gridW     = numColumns * CELL_SIZE
```

`canvasOuter` is `flex: 1, alignItems: 'center', overflow: 'hidden'`. The
`MIN_CELL = 48` floor is reached long before the board fits:

| Grid columns | Unclamped cell | Clamped cell | `gridW` | Clipped per side (393 pt) |
|---|---|---|---|---|
| 8 | 44 | 48 | 384 | 0 |
| 9 | 39 | 48 | 432 | 19.5 pt |
| 10 | 35 | 48 | 480 | 43.5 pt (≈ 0.9 column) |
| 11 | 32 | 48 | 528 | 67.5 pt (≈ 1.4 columns) |
| 12 | 29 | 48 | 576 | 91.5 pt (≈ 1.9 columns) |

`src/game/levels.ts` declares grids of 8, 9, 10, 10, 10, 11, 10, 11, 11, 12
and 9 columns. **Ten of the eleven clip at 393 pt.** On K1-10 (12 × 9) roughly
four of twelve columns sit outside the visible canvas. Because the clipped
region is outside `overflow: 'hidden'`, those cells cannot be tapped, cannot
receive a drop, and any pre-placed piece in them is invisible.

**Why it is a problem.** This is the direct inversion of
`COMPUTATIONAL_MODEL.md` "The Soul of the Game": the wider the board — the
more room the level gives for an elaborate machine — the more of it the
Engineer cannot see or touch. It also contradicts the locked sizing rule in
`CLAUDE.md` (`CELL_SIZE = BOARD_SIZE / numColumns`), which `MIN_CELL` silently
overrides. It is very likely the "gameplay canvas rendering bug" already on
the Next-up list.

**The specific change.** Two parts, and the second one has a boundary this
review will not cross.

1. **Remove the `MIN_CELL` clamp from the fit calculation** (keep `MAX_CELL`).
   The board must never be laid out larger than the space it is drawn into.
   Touch targets are then preserved independently of visual cell size: give
   the `Pressable` in `BoardPiece.tsx` and the ghost-cell `TouchableOpacity`
   in `GameplayScreen.tsx` a `hitSlop` that pads the pressable to 44 pt while
   the drawn cell stays at its computed size.
2. Removing the clamp fixes reachability but not legibility: at 12 columns on
   393 pt the cell is 29 pt and `iconSize = (cell - 4) * 0.60` is **15 pt**,
   far under the 22 pt floor Request 001 set for a catchable icon. Presentation
   alone cannot show a legible 12-wide board on a 393 pt screen. The two ways
   out are (a) the canvas becomes pannable / zoomable, or (b) grid width is
   capped. **AMENDED 2026-09-10 — the docs answer this.** `CLAUDE_CONTEXT.md`
   specifies `BOARD_SIZE = SCREEN_WIDTH - 24, always square` and prohibits a
   fixed `CELL_SIZE` outright, and `LEVEL_DESIGN_FRAMEWORK.md`'s quality
   checklist already requires "board size is minimum necessary for correct
   solution." So (b) is correct: the board always fits, and a 12-wide grid at
   390 pt is a level that fails its own checklist. Referred to level design.
   Pan/zoom is not supported by any design doc and is withdrawn.

**How to verify.** On K1-10, log `gridW` and `canvasLayout.w` in the
`canvasOuter` `onLayout`; before the fix they read 576 and 393. Then assert in
an integration test that `numColumns * CELL_SIZE <= canvasLayout.w - CANVAS_PAD * 2`
for every grid in `levels.ts` at widths 375 / 393 / 430. Manual check: on
K1-10 attempt to place a piece in column 0 and column 11.

---

## G-07 — The dashed wire layer renders Protocol connections in the Physics beam color

**Observed.** `WireOverlay.tsx`:

```ts
const wireColor = isProtocol ? Colors.amber : Colors.blue;
```

`isProtocol` is true when either endpoint has `category === 'protocol'`. So an
unlit wire touching a Scanner, Config Node or Transmitter draws in
`#f0b429` — **the Physics beam color** — and an unlit Physics-to-Physics wire
draws in `#4a9eff`.

**Why it is a problem.** D-03 / D-04 lock amber to the Physics beam and
nothing else. The wire layer is the most repeated static element on the board;
it is currently the largest single source of amber on screen, and it applies
amber precisely to the Protocol relationships. Per Request 001's token table,
static identity is `copper #c87941` for Physics and `circuit #a78bfa` for
Protocol. The current mapping does not merely break a token rule, it teaches
the inverse of the mapping `TEACHING_PROGRESSION.md` gates Kepler Belt on.

**The specific change.** In `WireOverlay.tsx`, `wireColor = isProtocol ?
Colors.circuit : Colors.copper`. Lit and locked behavior is unchanged (`isLit`
already defers to `getBeamColor(toType)`, `isLocked` to `#00C48C`). No change
to dash geometry, stroke widths, or the all-sectors rendering rule.

**How to verify.** Place a Conveyor adjacent to a Scanner on A1-5 and read the
two connecting `Line` strokes: expect `#c87941` and `#a78bfa`, and no `#f0b429`
anywhere in the wire layer while `beamState.phase === 'idle'`.

---

## G-05 — The CHARGE phase always renders in Protocol purple, and the beam never crossfades

**Observed.** `BeamOverlay.tsx` draws both charge rings with
`stroke="#8B5CF6"`, hardcoded, regardless of the machine. The inter-pulse
source flash in `GameplayScreen.handleEngage` is hardcoded the other way:
`engageFlashPiece(ctx, sourcePiece.id, '#F0B429')`. Beam heads render as
`Circle r=3.5 fill="white" opacity 0.95` over an `r=11` halo of
`beamState.headColor` at `opacity 0.25`; per-segment `stroke={seg.color}`
switches instantly between segments.

**Why it is a problem.** Three spec-fails in one component:

- **SE-BEAM-081** requires the charge glow to match the category of the first
  piece after Source — amber for Physics, `#00D4FF` for Protocol. It is
  currently neither; `#8B5CF6` is the Protocol *body stroke*, not a beam color,
  so on an all-Physics machine the run opens in the wrong layer's color and in
  a color that is reserved for static piece bodies (D-03).
- **SE-BEAM-082** requires a 0.3 s crossfade when the beam crosses between
  layers. There is no interpolation; segment color changes on the step
  boundary.
- The travelling front — the thing the eye actually tracks — is white. The
  category color survives only in the trail at 0.72 / 0.45 opacity and in a
  0.25-opacity halo. The layer change that SE-BEAM-082 exists to communicate
  is the least visible part of the animation.

**The specific change.** All three are JS-driven
(`useNativeDriver: false`, per SE-BEAM-001) and none change the CHARGE /
BEAM / LOCK phase model or move an `Animated.View` host across a conditional
branch.

1. Pass a `chargeColor` prop into `BeamOverlay` derived from the first
   post-Source step's `category` (`#F0B429` / `#00D4FF`); use it for both
   charge rings and for the inter-pulse source flash instead of the two
   hardcoded literals.
2. Fill the beam head with `beamState.headColor` and keep white as a smaller
   inner core (r ≈ 1.5) so the front carries its layer color.
3. Drive segment color through a single JS-driven `Animated.Value` per active
   trail interpolated across the two category colors over 300 ms at a
   category boundary, rather than swapping the `stroke` literal.

**How to verify.** `TEST-BEAM-008` as already written in
`SPEC_BEAM_ANIMATION.md` §10, extended with one assertion: on a trace whose
first post-Source piece is a Conveyor, the charge ring stroke is `#F0B429`
and `#8B5CF6` appears nowhere in `BeamOverlay`'s rendered tree.

---

## G-04 — Two of the three tape layers render in a color other than their locked one

**Observed.** The indicator bars use the locked palette
(`Colors.tapeInBar / tapeTrailBar / tapeOutBar`), but the cells do not:

| Layer | Indicator bar | Cell border / text | Locked per Request 003 |
|---|---|---|---|
| IN | `#BFFF3F` | `#BFFF3F` (`tapeCellIn*`) | `#7FC8E8` |
| TRAIL | `#A97FDB` | `Colors.neonGreen #00FF87` | `#A97FDB` |
| OUT | `#FF7D3F` | `#FF7D3F` (`tapeCellArrived`) | `#FF7D3F` |

Two further colors enter the same 100 pt-tall region: the IN tape's head
marker is `#8B5CF6` (Protocol body stroke — `TapeCell.styles.tapeHead`), and
the glow traveler that carries a value between tapes is `#00E5FF` with 10 pt
`#00E5FF` text (`GameplayScreen.styles.glowTraveler`), so the value in flight
speaks a fifth color while its destination cell pulses in the tape's own color
(`TapeCell.colorsForHighlight`, case `'arrived'`).

**Why it is a problem.** The tape stack is the only place in the game where
Layer 3 and Layer 2 are visible simultaneously; its color identity is the
whole teaching payload of `COMPUTATIONAL_MODEL.md` Part One. Right now TRAIL
cells are green while the TRAIL head bar above them is purple, and the value
crossing from IN to TRAIL is cyan — the Protocol *beam* color — so a Scanner
read reads as three unrelated events instead of one carry between layers.

**Canon (no decision needed).** `docs/TRIBAL_KNOWLEDGE.md` §3 "Y2K aesthetic
(locked)" locks all three: IN Ice Blue `#7FC8E8`, TRAIL Atomic Purple
`#A97FDB`, OUT Fire Orange `#FF7D3F`. `tokens.tapeInBar: '#BFFF3F'` and
`SpecSheetPanel`'s hardcoded `#BFFF3F` are divergences from that lock, not a
competing canon.

**Root cause of the green TRAIL cells.** `design/specs/TRAIL_TAPE_COLORS.md`
(Sprint 18) specifies trail primary `#00D4FF`, trail accent `#22c55e`, and
*requires* alternating green-accented cells to avoid "green-to-green"
transitions. `TapeCell`'s `#00FF87` is that spec being obeyed. It contradicts
the §3 lock, and `TRIBAL_KNOWLEDGE.md` §5 does not rank `design/specs/` in its
authority order, so nothing tells the next implementer which file wins. Mark
`TRAIL_TAPE_COLORS.md` SUPERSEDED and add `design/specs/` to the §5 order, or
G-04 will regress.

**The specific change.**

1. Delete every tape hex literal outside `tokens.ts`. `TapeCell.tsx`
   (`tapeCellIn`, `tapeCellInActive`, `tapeCellTextIn*`, the `neonGreen` trail
   text and head styling, `tapeCellArrived`) and `SpecSheetPanel.tsx`
   (`#BFFF3F` / `#FF7D3F` strip colors) all read `Colors.tapeInBar /
   tapeTrailBar / tapeOutBar`. One hex per layer, one place.
2. TRAIL cells take TRAIL purple; the trail head keeps its distinct treatment
   through weight and border, not a different hue.
3. `tapeHead` on the IN tape takes the IN color, not `#8B5CF6`.
4. The glow traveler is tinted per journey — the color of the destination tape
   — so a Scanner read is one purple event and a Transmitter write is one
   orange event. It is a single persistent host whose border, background and
   text color come from props, so this is a style change on an already-mounted
   `Animated.View` (REQ-A-2 safe).

**How to verify.** Screenshot A1-7 at the moment the Scanner fires and at the
moment the Transmitter writes; assert exactly two distinct hues in the tape
region per event (the layer's color and the ink). Unit-assert that no file
under `src/components/gameplay/` contains a tape hex literal.

---

## G-03 — Amber and cyan are used as static chrome in six places, so the beam has no contrast event

**Observed.** D-03 / D-04 reserve `#F0B429` for the Physics beam and `#00D4FF`
for the Protocol beam. Current static uses inside this request's scope:

| File | Use |
|---|---|
| `ArcWheel.tsx` | `getPieceColor()` returns `#F0B429` for **every** non-Protocol piece — while the comment two lines above states it returns "the canonical blue (NOT the amber source-accent)". The code and its own comment disagree. |
| `ArcWheel.tsx` | `SOURCE_COLORS = { preAssigned: '#F0B429', requisitioned: '#00D4FF' }` — node borders encode purchase provenance in the two beam colors. |
| `RequisitionPanel.tsx` | `TAB_COLORS.PHYSICS = '#F0B429'`, `PROTOCOL = '#00D4FF'`; `tabColor` also colors the REQUISITION confirm button, so the primary CTA changes color with the selected tab. |
| `SpecSheetPanel.tsx` | `SECTION_ACCENT.SHALL = Colors.amber`, `WILL = '#00D4FF'`. |
| `GameplayScreen.tsx` | `dragHoverCellValid` border/fill `#F0B429` — while the Axiom placement hint (`ghostInnerValid`) is correctly copper. |
| `BoardGrid.tsx` | Source piece icon color `#F0B429`, static, for the whole level. |

`ArcWheel`'s amber/cyan-by-provenance also contradicts
`COMPUTATIONAL_MODEL.md` "Visual Distinction": purchased pieces appear
**identically** to pre-assigned ones (Option B — unified), no visual
distinction in the tray.

**Why it is a problem.** The beam is the payoff of every run, and the two beam
colors are how the Engineer learns that Physics and Protocol are separate
systems. When the wheel, the store tabs, the CTA, the drop highlight and the
Source all sit in those hues permanently, the run produces no contrast event.
This is the same failure D-03 named in Request 001, migrated into the surfaces
Request 001 did not cover.

**AMENDED 2026-09-10 — partially retracted.** `CLAUDE_CONTEXT.md` lists
`Source visual: amber #F0B429` as a live locked decision, and
`TRIBAL_KNOWLEDGE.md` Section 3 states engine-semantic colors stay unchanged
including "amber for Physics." Request 001's D-03 reserved amber for the beam.
**Those documents conflict; that conflict is the real finding and needs
Tucker, not a unilateral fix.** Do NOT move the Source off amber. The
sub-findings that stand independently, because other docs settle them, are:
`ArcWheel.getPieceColor` contradicting its own adjacent comment, and
`SOURCE_COLORS` encoding purchase provenance, which `COMPUTATIONAL_MODEL.md`
forbids (Option B — purchased pieces appear identically to pre-assigned).

**The specific change (as originally written, pending the conflict above).**

- `ArcWheel.getPieceColor` returns `Colors.blue` for Physics (matching
  `BoardGrid` / `PieceTray`, and matching its own comment).
- `SOURCE_COLORS` collapses to one neutral border treatment. Provenance is not
  encoded at all, per Option B.
- `RequisitionPanel.TAB_COLORS.PHYSICS` → `Colors.copper`, `PROTOCOL` →
  `Colors.circuit`; the confirm button takes one fixed accent rather than
  `tabColor`.
- `SpecSheetPanel` obligation strength is carried by copper (SHALL) and muted
  (SHOULD) with weight and the existing tick, not by beam hues.
- `dragHoverCellValid` → copper, matching `ghostInnerValid`.
- ~~Source moves to copper~~ — RETRACTED, Source amber is a locked decision.

No new hues are introduced; every value above is already in `tokens.ts`.

**How to verify.** Grep `src/components/gameplay/` and `src/screens/GameplayScreen.tsx`
for `F0B429` and `00D4FF`: after the fix the only hits are in the beam /
charge / flash paths and `getBeamColor`. Visual check: with the board idle, no
amber and no cyan is on screen except the Source charge affordance.

---

## G-02 — The machine jumps down the screen at the moment ENGAGE fires

**Observed.** Inside the `SafeAreaView` flex column, both the tray and the
engage row are conditionally mounted on `!isExecuting`:

```
{isAxiomLevel && !isExecuting && ... && <PieceTray />}      // styles.partsTray height 72
{!isExecuting && ... && <View style={styles.engageRow}>}    // height 56
```

`canvasOuter` is `flex: 1, justifyContent: 'center'`. Pressing ENGAGE
therefore removes 128 pt of siblings and the board re-centers by roughly 64 pt
in the same frame the run begins. Simultaneously `HUDChrome` gains a fourth
stacked line (`pulseCounterText` mounts only while `beamState.phase === 'beam'`),
adding ~19 pt at the top, and its content is center-aligned text whose length
changes per pulse (`PULSE 1 / 6` → `PULSE 1 / 6 — REACHED: 0 / 3`), so the HUD
reflows on every pulse.

**Why it is a problem.** The run is the moment the player is most engaged and
is being asked to read a cell-by-cell traversal; the frame it starts, the
entire machine translates vertically. Secondary risk: `CELL_SIZE` is derived
from `canvasLayout.h`, so on any grid where the height term wins the `min()`,
board scale changes mid-run *after* `handleEngage` has already cached
`board0`, `input0`, `trail0`, `output0` — beam and glow coordinates are then
computed against a stale geometry.

**The specific change.** Reserve the chrome instead of unmounting it. Keep
`partsTray` and `engageRow` mounted for the whole level and change their
contents / opacity / `pointerEvents` for the run state (this is also the
SE-BEAM-003 posture, and it removes a live REQ-A-2 hazard rather than adding
one). Give `HUDChrome` a fixed-height row for the pulse counter that is
present and empty when idle, and left-align it, so per-pulse string growth
does not reflow the HUD. No change to the pause / spec-sheet buttons or to
what the counter says.

**How to verify.** `measureInWindow` the board container before and after
pressing ENGAGE on A1-6: `y` must be unchanged, and `CELL_SIZE` must be equal.
Add an integration assertion that `styles.partsTray` and `styles.engageRow`
remain mounted while `isExecuting` is true.

---

## G-08 — The dead-end failure has no computational diagnostic, and its COGS line rerolls every second

**Observed.** `GameplayModals.tsx`:

```tsx
<Text style={styles.voidQuote}>
  {VOID_QUOTES[Math.floor(Math.random() * VOID_QUOTES.length)]}
</Text>
```

The index is drawn during render. `GameplayModals` receives `elapsedSeconds`
as a prop, so while the void overlay is open the component re-renders at least
once per second and **the line changes with it**. Separately: the four other
failure paths carry specific diagnostics (`OUTPUT MISMATCH` with expected
versus produced, `INSUFFICIENT PULSES` with achieved-of-required,
`SPECIFICATION NOT MET` with the requirement text, `CONFIGURATION REJECTED`
with the missing architecture). `VOID STATE` — the dead-end, the most common
early failure and the only failure an A1 player can produce — carries a
generic line drawn from a five-item array plus the blown-cell count.

**Why it is a problem.** `COMPUTATIONAL_MODEL.md` "Failure Is the Curriculum"
makes diagnostic feedback the primary teaching mechanism and requires COGS to
name what went wrong *in computational terms*. A randomly rerolling line does
the opposite: it tells the Engineer the machine's failure was not specific to
their machine. The reroll also breaks tone hard — COGS appears to change his
mind about what he observed, once a second, on the screen where his authority
matters most.

**The specific change.** Two parts, and the copy half stops at a flag.

1. **Mechanical (no sign-off needed):** select the line once. Draw the index
   when the void state is entered (in the failure handler, stored in
   `useGameplayFailure` alongside `failCount`) and pass it in as a prop.
   `Math.random()` must not appear in a render path.
2. **Copy (AMENDED 2026-09-10 — it is already written):**
   `docs/DIALOGUE_SYSTEM.md` contains an authored void `resultsLine` for every
   discipline x behavior x phase combination, plus hub follow-ups, all awaiting
   Tucker sign-off. This is not a writing task — it is wiring an existing
   matrix. The ask is approval of that matrix, not a new line. For the
   board-state diagnostic alongside it: the trace already knows the failure —
   the last piece the signal reached, its cell, whether the stall was on the
   Signal Path, at a closed gate, or at a Data Trail read that found `null`.
   The void modal should state that the way the other four modals state theirs.
   Per Design Principle 2 and this request's scope, **no line is written
   here.** What is specified is the data the modal should be given
   (`lastStep.pieceId`, its `type`, `gridX/gridY`, and the layer at which the
   traversal stopped) and where it goes in the existing layout: the diagnostic
   block sits above the COGS quote, in the same slot `INSUFFICIENT PULSES`
   uses for `insufficientSubtext`.

**How to verify.** Open the void modal and watch for five seconds: the line
must not change. Unit test: render `GameplayModals` twice with a changed
`elapsedSeconds` and assert the rendered quote is identical.

---

## G-09 — On the void screen, two COGS lines render as narrow side-by-side columns

**Observed.** `cogsResultRow` is `flexDirection: 'row'`. When blown cells
exist it contains three children: `CogsAvatar`, the void quote (`flex: 1`) and
`getBlownCellCOGSLine(...)` in a second `voidQuote` (`flex: 1`). The two
lines split the remaining width roughly in half, producing two ~130 pt-wide
columns of 12 pt italic Exo 2 next to the avatar.

**Why it is a problem.** Two consecutive COGS statements are being presented
as parallel columns, which reads as a layout accident, on the failure screen —
the highest-stakes text in the loop. The blown-cell line is also the one that
explains a board change the Engineer must now plan around.

**The specific change.** In `GameplayModals.tsx`, wrap the text children in a
`View style={{ flex: 1, gap: Spacing.sm }}` inside `cogsResultRow` so the
avatar stays on the left and the lines stack. No copy change; the same
`resultsQuote` / `voidQuote` type styles apply.

**How to verify.** Fail a Kepler level with at least one blown cell; both
lines must be full-width and stacked, in order.

---

## G-06 — The D-05 overlay chip collides with the neighbouring cell and clips at the board edge

**Observed.** `BoardPiece.tsx` renders the D-05 chip at `bottom: -2, right: -2`
of a `pieceSize = cellSize - 4` pressable, itself inset by 2 pt inside the
cell. The chip is 11 pt Space Mono with `paddingHorizontal: 3` and a 1 pt
border: for a Counter (`"0/2"`, three glyphs) that is roughly 28 × 17 pt at
`CELL_SIZE = 48`, sitting entirely outside the piece box and 4 pt into the
adjacent cell. At the right or bottom edge of the board it extends past
`gridW / gridH` and is cut by `styles.canvas` `overflow: 'hidden'`.

The chip itself is legible — 11 pt starWhite on `rgba(6,9,15,0.85)` clears the
floor, and being outside the rotation transform it stays upright as specified.
This finding is about placement only, per the request's instruction to evaluate
the shipped chip rather than redesign it.

**Why it is a problem.** On a dense board — the build the game is asking for —
a Counter or Latch chip overlaps its neighbour's icon, and the `1/2` state that
D-05 exists to expose is the first thing lost at the board's edge, which is
exactly where the Terminal usually sits.

**The specific change.** Inset the chip inside the piece box
(`bottom: 1, right: 1`), and let the chip shrink its own padding to
`paddingHorizontal: 2` when the value is three glyphs or more. Keep the 11 pt
floor: if the value cannot fit at 11 pt inside the box at the current cell
size, drop the denominator (`0/2` → `0`) rather than the point size — the
threshold is already stated on the Spec Sheet and in the Codex.

**How to verify.** Place a Counter at `gridX = numColumns - 1, gridY =
numRows - 1` on an 8-wide grid: the chip renders fully inside the board and
does not overlap the neighbouring cell's icon. Snapshot at `CELL_SIZE` 48 and
88.

---

## G-10 — Thirty-nine rendered strings sit below the 11 pt floor, and three touch targets below 44 pt

**Observed.** D-07 / D-08 set an 11 pt floor and `FontSizes.floor = 11` was
added to `tokens.ts`. The floor was applied in `HUDChrome.tsx` and
`PieceTray.tsx` only. Remaining sub-11 pt `fontSize` declarations in this
request's scope:

| File | Count | Notable |
|---|---|---|
| `GameplayModals.tsx` | 13 | `voidBtnText` 10 pt (the failure screen's buttons), 8 pt section labels |
| `RequisitionPanel.tsx` | 11 | `budgetLabel` 7 pt, `rowPrice` 9 pt, `tapeTypeLabel` / `tapeDesc` 8 pt — the numbers the purchase decision is made from |
| `ArcWheel.tsx` | 7 | `countBadgeText` 9 pt, `overviewLabel` 10 pt, `overviewCount` 8 pt |
| `SpecSheetPanel.tsx` | 5 | `levelLine` 9 pt, `expectedLabel` 8 pt, `chromeLabel` 10 pt |
| `TapeBarShell.tsx` | 2 | `tapeLabel` 9 pt (`IN` / `TRAIL` / `OUT`), `pulseTargetText` 9 pt |
| `TapeCell.tsx` | 1 | `tapeCellText` **10 pt** — every tape value in the game |
| `GameplayScreen.tsx` | 11 | mostly dead duplicates — see G-11 |

Touch targets under 44 pt: `voidBtn` ≈ 37 pt tall (`Spacing.md` × 2 + 13 pt
line), `SpecSheetPanel.closeBtn` ≈ 31 pt, `RequisitionPanel.qtyBtn`
**28 × 28** — the plus/minus pressed repeatedly during requisition.
`voidBtnText` is also `Colors.red #e05555` on the void gradient
(`rgba(30,5,5,0.94)`), about 4.4:1, below 4.5:1 at 10 pt.

**Why it is a problem.** Same argument D-07 made and won, in the surfaces
D-07 did not reach. The tape digit is the sharpest case: a 24 pt cell carrying
a 10 pt glyph is the single most-read value on the gameplay screen, and it is
below the floor the project already ratified.

**The specific change.** Raise all listed strings to `FontSizes.floor` or
above, using `FontSizes.floor` rather than a literal. Two need a size change
around them: `TapeCell` grows to 26 × 26 with a 12 pt digit (see the visual
reference for the reflowed row, and the row-width note below), and
`RequisitionPanel.qtyBtn` grows to 44 × 44. `voidBtn` takes
`paddingVertical: Spacing.lg` and 11 pt, and its label color moves to
`Colors.starWhite` with the red carried by the border, which fixes the
contrast without introducing a color. `SpecSheetPanel.closeBtn` takes
`paddingVertical: 14`.

**Related ceiling worth recording now (not a separate finding).** The tape row
is fixed-width: `42` label + `8` gap + `n × 24` + `(n-1) × 3` + `24`
container padding. At `n = 10` (K1-10's input tape) that is 341 pt — it fits
393 pt but not with the 26 pt cells above (361 pt at n = 10, still fits;
n = 12 overflows 375 pt). `TEACHING_PROGRESSION.md` locks Axiom and Kepler to
"full tape visible", and there is no scroll, wrap or scale in `TapeBarShell`,
so the row will clip silently the first time a tape exceeds eleven cells.
Recommend the cell size be derived from available width with a floor, the same
discipline as the board.

**How to verify.** CI check: no `fontSize` literal below 11 in
`src/components/gameplay/` or `GameplayScreen.tsx`. Accessibility Inspector
pass on the void modal, the Spec Sheet and the Requisition panel for 44 pt
targets.

---

## G-12 — The requisition catalogue shows about five rows and hides that there are more

**Observed.** `RequisitionPanel.tsx`: `contentScroll: { maxHeight: 240 }`,
rows are 40 pt icons plus padding in an 8 pt-gapped list, and the `ScrollView`
sets `showsVerticalScrollIndicator={false}`. Roughly five rows are visible at
once, with no fade, count, or indicator that the catalogue continues. Row
icons are 22 pt — the size D-08 raised the tray to 32 pt for the same
legibility reason. Price and stock read at 9 pt (G-10).

**Why it is a problem.** This is the surface `COMPUTATIONAL_MODEL.md` builds
the entire economy on, and purchases happen **once**, before the level.
Scoring awards 3 stars at 75%+ tray usage (`TRIBAL_KNOWLEDGE.md` §3), and
credits buy tray pieces — so the catalogue sits directly upstream of the
score. A catalogue that looks five items long, priced in 9 pt, suppresses the
exact behavior scoring rewards: "the joy is building elaborate machines, NOT
finding the minimum solution." It also weakens the "failure is the curriculum"
loop, because the retry's smarter purchase depends on the Engineer knowing
what was buyable.

Note: the free-to-play guarantee is unaffected either way — every level is
solvable at three stars on tray pieces with zero credits
(`LEVEL_DESIGN_FRAMEWORK.md` Part 2). This finding is about the catalogue
concealing its own length, not about pricing or difficulty.

**The specific change.** Presentation only; no pricing, stock or economy
change.

- Restore the scroll indicator and add a bottom fade plus a per-tab count
  (`n items`) in the tab bar so the length of the catalogue is legible.
- `maxHeight` derives from available height rather than a fixed 240 pt.
- Row icons 22 → 32 pt, matching the tray (D-08).
- `qtyBtn` to 44 × 44 (G-10); price and stock to the 11 pt floor.

**How to verify.** On a Kepler level with more than six purchasable rows, the
panel shows a scroll indicator and a count, and the sixth row is discoverable
without a blind drag. Snapshot at 375 / 393 / 430 pt.

---

## G-13 — Arc Wheel expanded overview renders piece icons at 20 pt

**Observed.** `ArcWheel.renderOverview` draws `<PieceIcon size={20} />` per
row, with `overviewLabel` at 10 pt and `overviewCount` at 8 pt. Collapsed
wheel nodes scale from `NODE_SIZE_MAX = 52` down by up to 45 % with distance
from the selection (`nodeSize = 52 × (1 − …0.45)`), and `distanceOpacity`
falls to as low as 0.3.

**Why it is a problem.** The expanded overview is where the Engineer chooses
what to place from a full inventory — the same decision the Axiom tray makes
at 32 pt after D-08. 20 pt is below the 22 pt catchability floor Request 001
established, and the collapsed wheel's distance scaling pushes the outer nodes
to ~29 pt at 0.3 opacity, which is under both the size and the 0.45 opacity
floor of the piece drawing standard.

**The specific change.** Overview icons to 32 pt, labels and counts to
`FontSizes.floor`. Clamp the collapsed wheel's distance scaling so the
smallest rendered node is not below 32 pt and `distanceOpacity` bottoms out at
0.45, matching the piece drawing standard's opacity floor. Entrance and
scroll timings are unchanged.

**How to verify.** Expand the wheel on K1-5 and measure a rendered icon
(32 pt) and the dimmest node's opacity (≥ 0.45).

---

## G-11 — `GameplayScreen.tsx` still holds the style block D-07 and D-08 corrected elsewhere

**Observed.** After the `HUDChrome` / `PieceTray` / `TapeBarShell` /
`TapeCell` extractions, `GameplayScreen.styles` retains unused duplicates of
the pre-AXM-001 values, including:

- `pulseCounterText: { fontSize: 9, color: '#1A3050' }` — the 1.5:1 color
  D-07 said to **delete from the HUD entirely**,
- `sectorTag` 7 pt (the element D-07 removed), `levelTag` 8 pt,
- `trayBadge` 8 pt and `trayCost` 7 pt (D-08 removed the price and raised the
  badge),
- `pauseBtn` / `backBtn` at 36 × 36 (D-07 raised to 44 × 44),
- roughly forty orphaned tape styles including `tapeCellGatePassed`
  green-on-green, which `TapeCell`'s live code specifically replaced.

**Why it is a problem.** Ratified deletions still exist in the file, one
`style={...}` reference away from shipping again, and any future audit of this
screen re-finds them. The 001 review's own process note is the precedent for
cleaning rather than leaving them.

**The specific change.** Delete the unused style entries from
`GameplayScreen.styles`, keeping only what the file's own JSX references
(`root`, `safeArea`, `errorText`, `canvasOuter`, `canvas`, `flashOverlay`,
`ghostDragPiece`, `ghostCell`, `ghostInnerValid`, `dragHoverCell*`,
`creditError*`, `debug*`, `engageRow*`, `glowTraveler*`). No behavior change.

**How to verify.** `npx expo lint` with an unused-style rule, or a
`react-native/no-unused-styles` pass on the file; `npx tsc --noEmit` clean and
all four quality gates green with no visual diff.

---

## G-14 — The dot grid draws a phantom row and column that the board then clips

**Observed.** `GameplayScreen` renders `(numRows + 1) × (numColumns + 1)` dots
at `cx = x * CELL_SIZE + CELL_SIZE / 2`. Dots are cell-centered, so index
`numColumns` lands at `gridW + CELL_SIZE / 2` — half a cell outside the
board — and is cut by `styles.canvas` `overflow: 'hidden'`.

**Why it is a problem.** The board's field of dots ends in a clipped partial
row on two sides, so the bay reads as cut off rather than framed. On a machine
that is supposed to read as a working machine, the frame is the cheapest
signal available and it is currently broken by an off-by-one.

**The specific change.** Iterate `numRows × numColumns`. If a boundary marker
is wanted, it belongs in the `styles.canvas` border, not in the dot field.

**How to verify.** Snapshot any board: the outermost dots are one half-cell
inside the border on all four sides, and the dot count equals
`numRows * numColumns`.

---

## G-15 — Blown-cell scars use off-token oranges

**Observed.** The scar group in `GameplayScreen` draws with
`rgba(176,106,44,·)` and `rgba(200,72,40,·)`, neither of which is in
`tokens.ts`. D-03's cleanup pass removed exactly this class of literal
elsewhere (`#38BDF8`, `#B87333`, `#F87171`).

**Why it is a problem.** Damage is a recurring, load-bearing board state
(`docs/COMPUTATIONAL_MODEL.md`, "blown cells punish imprecise placement"). It
should read in the palette's damage vocabulary, which already exists, rather
than in two one-off oranges that sit between copper and red.

**The specific change.** Map the scorched rim to `Colors.copper` and the inner
crater ring to `Colors.red`, at the existing opacities. Geometry unchanged.

**How to verify.** Grep the file for `rgba(176,106,44` and `rgba(200,72,40`:
no hits. Visual check on a Kepler level with pre-existing blown cells.

---

## Verified compliant — no change proposed

Recorded so the next round does not re-litigate them:

- **Placement highlights are Axiom-only.** `ghostInnerValid` (copper dashed)
  renders only when `level.sector === 'axiom'`; Kepler ghost cells are
  invisible tap targets. Matches the locked rule.
- **Wires render on all sectors.** `WireOverlay` is mounted unconditionally.
  Only its color is wrong (G-07).
- **Long press returns the piece directly to the tray / wheel.** No ghost or
  held intermediate state anywhere in `handlePieceLongPress`.
- **Tap actions.** Conveyor rotates; Config Node cycles `configValue`; Latch
  cycles mode; everything else has no tap action. Note for the record: the
  Latch is now a three-state cycle (write → read → delay, `nextLatchMode`),
  which is broader than `CLAUDE.md`'s "toggles latchMode" line — a docs
  update, not a design finding.
- **JS-driver discipline.** Every animation in the scope reviewed uses
  `useNativeDriver: false`; the two conditionally-mounted hosts
  (`BoardPiece` flash, `TapeCell` highlight overlay) are documented as
  REQ-A-1 FORM B with the JS driver as the mitigation. G-02's fix moves in the
  safe direction (more persistent hosts). No finding here proposes a
  native-driven value or a host swap across a conditional branch.
- **The D-05 chip stays upright** outside the rotation transform, at the 11 pt
  floor, as specified. Only its position is at issue (G-06).

---

## Decisions needed from Tucker

1. **Kepler grid width.** `LEVEL_DESIGN_FRAMEWORK.md` ("board size is minimum
   necessary"; Kepler boards must let the player route around scars) plus
   `PIECE_CREATION_STANDARD.md` (board icons legible at 52 px) put the ceiling
   at roughly 8 columns on a 390 pt viewport. Ten of eleven Kepler grids
   exceed it. Cap and re-floor-solve, or accept sub-spec icons on wide boards.
   Level-design scheduling, not a design question.
2. **Void diagnostic copy.** G-08 specifies the data and the slot. The line
   itself needs sign-off, and it is COGS dialogue.

Resolved since first draft: the IN tape hex is not an open decision —
`TRIBAL_KNOWLEDGE.md` §3 locks `#7FC8E8`. See G-04 and `INTENT_VS_BUILD.md`.

---

## Repo files touched

```
src/screens/GameplayScreen.tsx          G-01, G-02, G-03, G-04, G-11, G-14, G-15
src/components/gameplay/WireOverlay.tsx G-07
src/components/gameplay/BeamOverlay.tsx G-05
src/components/gameplay/TapeCell.tsx    G-04, G-10
src/components/gameplay/TapeBarShell.tsx G-04, G-10
src/components/gameplay/BoardPiece.tsx  G-01 (hitSlop), G-06
src/components/gameplay/BoardGrid.tsx   G-03
src/components/gameplay/ArcWheel.tsx    G-03, G-10, G-13
src/components/gameplay/RequisitionPanel.tsx  G-03, G-10, G-12
src/components/gameplay/SpecSheetPanel.tsx    G-03, G-04, G-10
src/components/gameplay/GameplayModals.tsx    G-08, G-09, G-10
src/components/gameplay/HUDChrome.tsx   G-02 (pulse-counter row)
src/hooks/useGameplayFailure.ts         G-08 (line selected once, on entry)
src/theme/tokens.ts                     G-04 (single source for tape hues)
```

END OF GAMEPLAY_REVIEW.md
