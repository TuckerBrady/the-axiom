# SPEC: Kepler Belt Level Design v3
### Sprint 19 | April 2026 | IN PROGRESS

---

## Version History

v1 — Initial 10 levels. Basic routing and tape processing.
v2 — Splitter introduction, damaged cells, piece requirements,
two-terminal levels, Codex entries. Revised teaching sequence.
v3 (this document) — Integrates REQUISITION store, expanding
tray, one-time requisition window, purchasable tape
infrastructure, unused piece forfeiture, Scoring Algorithm v2,
credit economy per level, and progressive hint reduction.
All v2 content (board layouts, floor solves, tutorial copy,
Codex entries, COGS lines) is preserved unchanged.

---

## Overview

10 levels for Sector 1 (Kepler Belt). Replaces the current 10
levels in levels.ts. Introduces Splitter, Latch, Merger, Bridge.
Non-uniform tapes. Damaged cells. Piece requirements. Two-terminal
levels. Progressive difficulty ramp from Axiom.

**New in v3:**
- REQUISITION store (expanding tray) active from K1-1
- One-time requisition window before each level
- Purchasable tape infrastructure (TRAIL, OUT)
- Unused purchased pieces forfeited on completion/failure
- Scoring Algorithm v2 integration (floor solve = 1 star max)
- Credit economy: budget, piece prices, tape prices per level
- Progressive hint reduction for store and tape mechanics
- Per-level elaboration paths and forfeiture risk notes

Key changes from v2 (preserved from v1->v2):
- Splitter properly introduced with full Codex collection flow
  (it was NEVER taught in Axiom; the Codex entry claiming A1-4
  is a bug to fix)
- Splitter introduced BEFORE Merger (pedagogical prerequisite)
- Damaged cells mechanic (new level definition field)
- Piece requirements mechanic (hard gate on solution validation)
- Two-terminal levels (Splitter sends beam to two Terminals)
- Varied Source/Terminal positioning (not always left-to-right)
- Codex entries for Kepler Belt locations and entities
- Every new piece gets full 4-step tutorial pattern

Wires (dashed connection lines) render on ALL sectors including
Kepler. Placement highlights are OFF (Axiom only). Blown cells
and lives system active per Level Design Framework Part 5.

---

## NEW MECHANIC: REQUISITION Store / Expanding Tray

### Concept

From K1-1 onward, the tray has two states:

**Collapsed (default):** Shows the pre-assigned pieces for the
level — enough to complete the floor solve, nothing more. These
are the pieces the Engineer gets for free.

**Expanded (swipe up):** The full REQUISITION store slides up,
revealing ALL pieces discovered so far in the Codex, available
for purchase. Three tabs organize the store:

- **PHYSICS** — Physics pieces (Conveyor, Gear, Splitter, etc.)
- **PROTOCOL** — Protocol pieces (Scanner, Config Node, etc.)
- **INFRA** — Tape infrastructure (TRAIL tape, OUT tape)

Each item shows a plus/minus quantity selector and the price in
CR. COGS is the vendor. Purchased pieces appear in the tray
next to pre-assigned ones with no visual distinction (Option B:
unified appearance). Once purchased, it is the Engineer's piece.

### One-Time Requisition Window

All purchases happen ONCE, before the level starts. The flow:

1. Mission Dossier screen shows COGS line and board preview
2. Engineer reviews board layout, damaged cells, positions
3. Engineer checks pre-assigned pieces in collapsed tray
4. Engineer swipes up to open REQUISITION store
5. Engineer makes ALL purchases in one session
6. Engineer closes store and begins the level
7. No further purchases until next attempt

This forces planning. On failure, the requisition window opens
again on retry and the Engineer can make different purchases
based on what they learned.

### Purchased Pieces Are Identical

Purchased pieces look identical to pre-assigned pieces in the
tray (Option B — unified). No REQ labels. No visual distinction.
Once purchased, it is the Engineer's piece.

### Unused Purchased Pieces Are Lost

Complete or fail with purchased pieces still in the tray =
forfeited. No refund. Pre-assigned pieces are not affected.
Only purchased pieces are forfeited if unused.

This prevents stockpiling and ensures deliberate decisions
about every requisitioned piece.

---

## NEW MECHANIC: Purchasable Tape Infrastructure

### Concept

Not every level provides all three tapes. The IN tape is always
provided free. TRAIL and OUT tapes may need to be purchased
from the INFRA tab of the REQUISITION store.

Two resource dimensions the Engineer manages:
1. **Physical pieces** (PHYSICS + PROTOCOL tabs) — components
   that build the signal path and protocol logic
2. **Data infrastructure** (INFRA tab) — tapes that provide
   computational capability (TRAIL = working memory,
   OUT = output recording)

### Level Definition Fields

```typescript
freeTapes: ('IN' | 'TRAIL' | 'OUT')[];    // provided at no cost
purchasableTapes?: ('TRAIL' | 'OUT')[];    // available for purchase
```

IN is always in freeTapes. TRAIL and OUT appear in either
freeTapes or purchasableTapes depending on the level.

### Tape Prices

| Tape | Price |
|------|-------|
| TRAIL tape | 40 CR |
| OUT tape | 40 CR |

### Design Constraint

The floor solve must be achievable using only pre-assigned
pieces and free tapes. If a level's floor solve requires
Scanner/Transmitter (and therefore TRAIL/OUT tapes), those
tapes MUST be free. Purchasable tapes are for elaboration
paths that go beyond the floor solve.

Levels with reach_output objectives (no expectedOutput
matching): TRAIL and OUT are purchasable — the floor solve
is pure routing, and purchasing tapes enables data processing
elaboration for higher scores.

Levels with expectedOutput matching in the floor solve: all
required tapes are free.

### Progressive Hint Reduction

- K1-1: COGS introduces the REQUISITION store with explicit
  tutorial. The INFRA tab is visible and COGS explains that
  tapes can be purchased.
- K1-3: First level where purchasing TRAIL + OUT tape enables
  meaningful data processing elaboration. COGS gives a brief
  nudge: "The INFRA tab has additional capability."
- After K1-3: COGS steps back. On failure without needed tape,
  diagnostic feedback hints: "The machine had no persistent
  memory between pulses" or "The machine produced no recorded
  output." The Engineer connects the dots.

---

## CREDIT ECONOMY

### Piece Prices

| Piece | Category | Price (CR) |
|-------|----------|------------|
| Conveyor | Physics | 5 |
| Gear | Physics | 10 |
| Relay | Physics | 12 |
| Splitter | Physics | 15 |
| Merger | Physics | 15 |
| Bridge | Physics | 20 |
| Config Node | Protocol | 8 |
| Scanner | Protocol | 10 |
| Transmitter | Protocol | 10 |
| Latch | Protocol | 20 |

### Tape Prices

| Tape | Price (CR) |
|------|------------|
| TRAIL tape | 40 |
| OUT tape | 40 |

### Discipline Discounts (per Scoring Algorithm v2 REQ-58)

- Systems Architect: 20% discount on Protocol pieces
- Drive Engineer: 20% discount on Physics pieces
- Field Operative: 10% discount on all pieces

### Budget Design Principles

Credit budgets per level are set so that:
1. The Engineer has enough CR for a meaningful 2-star solution
   (floor solve pieces are free, so budget = elaboration funds)
2. A 3-star solution requires spending most of the budget wisely
3. Overspending is possible (forfeiture risk)
4. Budget + 3-star payout > budget spent (virtuous cycle per
   Scoring Algorithm v2 REQ-35)

---

## SCORING INTEGRATION (Summary)

Full specification: project-docs/SPECS/scoring-algorithm-v2.md

### Floor-Solve Ceiling

A level completed using ONLY pre-assigned pieces and free tape
infrastructure scores a maximum of 45 points (1-star band).

| Category | Floor Solve Max |
|----------|----------------|
| Completion | 25 |
| Path Integrity | 15 |
| Signal Depth | 0 (gated) |
| Investment | 0 (nothing purchased) |
| Diversity | 0 (gated) |
| Discipline | 5 (half credit) |
| **Total** | **45** |

### Investment Unlocks Higher Stars

To reach 2 stars (55+): purchase and actively use 2-3 pieces.
To reach 3 stars (80+): purchase and actively use 5-6 pieces,
potentially with tape purchases, high diversity, and full
discipline alignment.

### Per-Level Fields Required

```typescript
depthCeiling: number;          // active pieces for full Signal Depth
baseReward: number;            // credit payout base
creditBudget: number;          // starting CR for the level
freeTapes: TapeType[];         // which tapes are free
purchasableTapes?: TapeType[]; // which tapes can be bought
```

---

## NEW MECHANIC: Damaged Cells

### Concept

Some board cells are pre-damaged and cannot receive pieces. The
player must route around them. Fits the raggedy mining corridor
narrative: infrastructure that has been neglected, patched, and
partially destroyed over years of abandonment.

Damaged cells are visible as scarred/cracked cells on the board.
They are distinct from blown cells (which occur during gameplay
from failed runs). Damaged cells exist before the level starts.

### Level Definition Field

```typescript
damagedCells?: Array<{ gridX: number; gridY: number }>;
```

Array of grid coordinates that are pre-damaged. These cells:
- Cannot receive player-placed pieces
- Cannot receive pre-placed pieces (level design must not
  place pieces on damaged cells)
- Are visually distinct from empty cells and blown cells
- Do not interact with the signal path (signal cannot travel
  through a damaged cell)
- Are permanent for the level (not repairable, unlike blown
  cells which reset with Fresh Board power-up)

### Engine Changes

1. **Board validation**: During piece placement, check if the
   target cell is in the `damagedCells` array. Reject placement
   with haptic feedback and brief visual shake.

2. **Signal path validation**: During path resolution, treat
   damaged cells as impassable. Signal cannot enter or exit a
   damaged cell.

3. **Rendering**: Damaged cells render with a cracked/scarred
   texture overlay. Visual language: dark scoring marks, exposed
   underlayer, copper-tinted cracks. Distinct from blown cells
   (which show fresh damage with ember particles).

4. **Fresh Board interaction**: Fresh Board power-up (50 CR in
   Kepler) resets blown cells but NOT damaged cells. Damaged
   cells are part of the level geography, not session state.

### UI Changes

1. Board grid renders damaged cells with scar texture at level
   load time (before any player interaction).

2. Attempting to place a piece on a damaged cell triggers:
   - Brief cell shake animation (0.3s)
   - Haptic feedback (light impact)
   - No error message (the visual state is sufficient)

3. Tutorial step in K1-5 (first level with damaged cells)
   addresses the mechanic through COGS instructor dialogue.

### Design Constraints

Per Level Design Framework Part 5 (Kepler Belt):
- Boards must have slack. Floor solve must not fill every viable
  path. Design so 2-3 cells can blow (in addition to damaged
  cells) before softlock.
- Damaged cells + blown cells compound. A board with 3 damaged
  cells and 2 blown cells has lost 5 cells total. Design boards
  generously.

---

## NEW MECHANIC: Piece Requirements

### Concept

COGS can specify that certain pieces MUST be used in the
solution. This is a hard gate: the machine is rejected at
engage time if requirements are not met, before the signal
even fires. The player sees which pieces are required in the
tray (marked with a requirement indicator).

Narrative justification: COGS has assessed the infrastructure
and determined that specific components are structurally
necessary. "Two gears are needed" is not a suggestion. It is
an engineering constraint.

### Level Definition Field

```typescript
requiredPieces?: Array<{
  type: string;     // piece type id (e.g., 'gear', 'latch')
  count: number;    // minimum count that must be placed
  reason?: string;  // COGS explanation (shown on rejection)
}>;
```

### Engine Changes

1. **Pre-engage validation**: Before signal fires, count
   player-placed pieces by type. For each entry in
   `requiredPieces`, verify that the placed count >= required
   count. Pre-placed pieces do NOT count toward requirements
   (the player must place them).

2. **Rejection flow**: If requirements not met, display a
   rejection modal with:
   - Header: "REQUIREMENTS NOT MET"
   - List of unmet requirements with piece icon + count
   - COGS reason string if provided
   - Single "ACKNOWLEDGED" dismiss button
   - Signal does not fire. No life lost. No blown cells.

3. **Scoring interaction**: Required pieces are not bonus
   pieces. They are mandatory. The optimal solution already
   includes them. No scoring penalty for meeting requirements.

### UI Changes

1. Tray pieces that are required show a small copper diamond
   indicator on their tray slot. The indicator persists until
   the piece is placed on the board.

2. When all required pieces are placed, the requirement
   indicators disappear. The ENGAGE button visual state does
   not change (requirements are checked at engage time, not
   continuously).

3. Rejection modal follows existing modal patterns: dark
   overlay, centered content, copper accent border.

### Design Constraints

- Requirements should be pedagogically motivated. They guide
  the player toward the intended learning, not toward a
  specific solution path.
- Requirements should never exceed what the optimal solution
  uses. If the floor solve uses 2 gears, the requirement can
  be "at least 1 gear" but not "at least 3 gears."
- First appearance: K1-6 (after damaged cells are established).

---

## NEW MECHANIC: Two-Terminal Levels

### Concept

Some levels have two Terminal nodes. The signal must reach
BOTH Terminals for the level to lock. This is the natural
evolution of Splitter: one signal split into two paths, each
reaching its own destination.

### Level Definition Changes

No new field needed. The existing `prePlacedPieces` array
already supports multiple Terminal entries. The engine change
is in success validation.

### Engine Changes

1. **Success condition**: Currently, `reach_output` objective
   checks that signal reached at least one Terminal. For
   two-terminal levels, ALL Terminals in `prePlacedPieces`
   must receive signal for the objective to pass.

   Implementation: count Terminal pieces in prePlacedPieces.
   If count > 1, require signal arrival at ALL of them.
   Single-terminal levels are unchanged.

2. **Signal animation**: Both paths animate simultaneously
   after the Splitter. Each path's CHARGE/BEAM/LOCK sequence
   plays independently. Both must complete LOCK for the level
   to resolve.

3. **Partial success handling**: If signal reaches one Terminal
   but not the other, the level is a void result. The Terminal
   that received signal shows a partial lock indicator
   (dimmed green). The Terminal that did not receive signal
   shows the standard void state (red flash).

4. **Output tape**: In two-terminal levels, both paths may
   have Transmitters. Output tape receives writes from all
   Transmitters in path order. The expectedOutput accounts
   for writes from both branches.

### UI Changes

1. Two Terminal nodes visible on the board. Both show the
   standard Terminal icon. No special visual distinction
   needed (the Splitter on the board makes the dual-path
   intent clear).

2. Mission Dossier for two-terminal levels includes both
   Terminal positions in the board preview.

3. Results screen shows "BOTH TERMINALS LOCKED" on success
   or "TERMINAL 2 NOT REACHED" (etc.) on partial failure.

### Design Constraints

- Two-terminal levels require a Splitter upstream. The player
  must have been introduced to Splitter before encountering
  two-terminal levels.
- First appearance: K1-8 (after Splitter, Latch, Merger, and
  Bridge are all established).
- Board must have enough space for two complete paths from
  Splitter to their respective Terminals.

---

## Level Designs

### Teaching Sequence

| Level | Name | New Piece | New Mechanic | Difficulty |
|-------|------|-----------|--------------|------------|
| K1-1 | Corridor Entry | None | REQUISITION store, no highlights | intuitive |
| K1-2 | Relay Splice | None | Tape review | derivable |
| K1-3 | Junction 7 | SPLITTER | Signal fork, purchasable tapes | derivable |
| K1-4 | Mining Platform Alpha | LATCH | Write/read memory | derivable |
| K1-5 | Resupply Chain | None | Damaged cells | derivable |
| K1-6 | Colonist Hub | MERGER | Piece requirements | abstract |
| K1-7 | Ore Processing | BRIDGE | None | derivable |
| K1-8 | Transit Gate | None | Two terminals | abstract |
| K1-9 | The Narrows | None | Synthesis | abstract |
| K1-10 | Central Hub | None | Boss | abstract |

Pedagogical rationale:
- K1-1/K1-2: Ease into Kepler. Review Axiom skills without
  placement highlights. Reestablish tape processing. K1-1
  introduces the REQUISITION store mechanic.
- K1-3: Splitter is the first new piece. Simplest new concept
  (one input, two outputs). Must precede Merger. First level
  where purchasing tapes enables data processing elaboration.
- K1-4: Latch introduces memory. Consequence level adds
  weight. Separated from Splitter by one level to avoid
  cognitive overload.
- K1-5: Damaged cells introduced on a level with no new piece.
  Player focuses on the board constraint, not a new piece.
- K1-6: Merger requires Splitter understanding. Piece
  requirements introduced here (COGS mandates the Merger).
- K1-7: Bridge is conceptually simple (two paths cross). Gives
  breathing room before the two-terminal level.
- K1-8: Two-terminal level. Consequence level. Combines
  Splitter + routing to reach two destinations.
- K1-9: Synthesis. All pieces, all mechanics. Dense corridor.
- K1-10: Boss. Full stateful computation. Longest tape.
  requireThreeStars.

### REQUISITION Store Availability by Level

The REQUISITION store shows all pieces discovered in the Codex
up to the current point. As the Engineer progresses through
Kepler, newly introduced pieces become available for purchase
on subsequent levels.

| Level | Store Inventory (cumulative) |
|-------|----------------------------|
| K1-1 | Conveyor, Gear, Config Node, Scanner, Transmitter, Relay |
| K1-2 | Same as K1-1 |
| K1-3 | Same + Splitter (just discovered) |
| K1-4 | Same + Latch (just discovered) |
| K1-5 | Same as K1-4 |
| K1-6 | Same + Merger (just discovered) |
| K1-7 | Same + Bridge (just discovered) |
| K1-8 | Same as K1-7 |
| K1-9 | Same as K1-7 |
| K1-10 | Same as K1-7 |

Note: Relay is discovered in Axiom sector and available from
K1-1 onward. The table above lists commonly used pieces; the
full store includes every Codex-discovered piece.

---

### K1-1 Corridor Entry

**Computational goal:** Route signal from Source to Terminal
with two direction changes on a board without placement
highlights.

**Concept taught:** Independent routing. No placement
highlights. The player decides where pieces go without visual
guidance. REQUISITION store introduction.

**Prerequisite concept:** All Axiom sector concepts (routing,
gating, tape processing).

**Board design:**
Grid: 8x6.
Source: (1,1) top-left area.
Terminal: (6,4) bottom-right area.
Pre-placed: Source (1,1), Terminal (6,4). No other pre-placed pieces.
Source and Terminal are offset both horizontally and vertically,
requiring two direction changes (Z-path or S-path).

**Floor solve:**
Conveyor at (2,1) facing right.
Conveyor at (3,1) facing right.
Gear at (4,1) turning signal down.
Conveyor at (4,2) facing down.
Conveyor at (4,3) facing down.
Gear at (4,4) turning signal right.
Conveyor at (5,4) facing right.
Path: Source(1,1) -> (2,1) -> (3,1) -> Gear(4,1) -> (4,2) ->
(4,3) -> Gear(4,4) -> (5,4) -> Terminal(6,4).
Pieces used: 5 (3 Conveyors, 2 Gears).

Alternative solve: route down first then right, using a
different Gear placement. At least 2 valid configurations.

**Tape:** None (single pulse, no tape). Stateless routing.

**Pre-assigned tray:** Conveyor x3, Gear x2.
Five pieces. Exactly the floor solve minimum. No extras.

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR). All Axiom-discovered pieces.

**Free tapes:** IN.
**Purchasable tapes:** TRAIL (40 CR), OUT (40 CR).
Note: This is a stateless routing level. Purchasing tapes
enables data processing elaboration (buy Scanner + TRAIL to
write working memory, buy Transmitter + OUT to record output)
but is not required for completion.

**Credit budget:** 75 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 2-3 extra Conveyors (10-15 CR) and 1-2 Gears
(10-20 CR) to build a longer, winding path with more active
pieces. Total spend ~25-35 CR. Unlocks Investment (6-9 pts),
Signal Depth, and Diversity.
3 stars: Buy 4-5 extra pieces across multiple types (Conveyors,
Gears, Relay) for maximum path length and diversity. Total
spend ~45-55 CR. Could also invest in TRAIL tape (40 CR) +
Scanner (10 CR) for data processing, but this consumes most
of the budget.

**Forfeiture risk notes:** An Engineer who buys tapes (80 CR
total for both) will exhaust most of the budget and may not
have enough for physical pieces that actually contribute to
the score. Buying more Conveyors/Gears than the board can
use risks forfeiting unused pieces.

**depthCeiling:** 10.
**baseReward:** 100 CR.

**Difficulty band:** intuitive.

**Narrative frame:** First repair in the mining corridor.
Familiar work in unfamiliar territory. No guides, no safety
net.

**COGS line:** "Kepler Belt. Former mining corridor, mostly
decommissioned. Some salvage activity remains. We have been
here before. The charts confirm it."
[PROPOSED | cogsLine | BLUE]
(From NARRATIVE.md K1-1. No changes.)

**COGS tutorial for new mechanics:** K1-1 introduces the
REQUISITION store. Three additional tutorial steps after the
existing two:

**Tutorial steps:** 5 steps total. No new piece. REQUISITION
store introduction.

Step 1 (instructor, boardGrid, blue):
"No placement highlights on this board. The pieces connect the
same way. But where they go is entirely up to the Engineer now.
Plan the path before placing anything."

Step 2 (instructor, boardGrid, blue):
"Two direction changes to reach the Terminal. The Gears handle
the corners. The Conveyors fill the straights. The methodology
has not changed. The guidance has."

Step 3 (instructor, tray, blue):
[NEW COPY — REQUISITION store tutorial. Tucker sign-off required.]
"The tray contains the minimum. Swipe up to open the
REQUISITION store. Additional pieces are available for
purchase. More pieces means a more elaborate machine. A more
elaborate machine earns a higher evaluation."

Step 4 (instructor, tray expanded, blue):
[NEW COPY — REQUISITION store tutorial. Tucker sign-off required.]
"Three categories. PHYSICS for signal path components.
PROTOCOL for data processing. INFRA for tape infrastructure.
Select what the machine needs. All purchases are final. All
purchases happen now, before the work begins."

Step 5 (instructor, tray expanded, blue):
[NEW COPY — Unused pieces warning. Tucker sign-off required.]
"Anything requisitioned but not used when the machine runs is
forfeited. Buy what the machine needs. Use what is bought. The
budget is not unlimited. Neither is the margin for waste."

---

### K1-2 Relay Splice

**Computational goal:** Pass each input tape value through to
output unchanged using Scanner to write and Transmitter to
read.

**Concept taught:** Dynamic tape processing review. Scanner +
Transmitter in a non-uniform tape context. Reinforces the
three-layer pipeline before introducing new pieces.

**Prerequisite concept:** Scanner reads input, Transmitter
writes output (A1-5, A1-7).

**Board design:**
Grid: 9x6.
Source: (1,3) left edge.
Terminal: (7,3) right edge.
Straight horizontal layout. Simple routing to focus attention
on the tape behavior.

**Floor solve:**
Scanner at (2,3).
Conveyor at (3,3).
Conveyor at (4,3).
Transmitter at (5,3).
Conveyor at (6,3).
Path: Source(1,3) -> Scanner(2,3) -> (3,3) -> (4,3) ->
Transmitter(5,3) -> (6,3) -> Terminal(7,3).
Pieces used: 5 (Scanner, 2 Conveyors, Transmitter, Conveyor).

**Tape:** [1, 0, 1, 1, 0]
Expected output: [1, 0, 1, 1, 0]
Edge case: mixed values verify the machine passes faithfully
rather than outputting a constant.

**Pre-assigned tray:** Scanner x1, Conveyor x3, Transmitter x1.
Five pieces. Floor solve minimum.

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: This is a tape review level. All three tapes are free
because the floor solve requires Scanner (writes TRAIL) and
Transmitter (writes OUT).

**Credit budget:** 80 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 2-3 extra pieces — additional Conveyors/Gears to
extend the path, or a Config Node (8 CR) to add conditional
gating. Total spend ~20-30 CR. Unlocks Investment and gated
scoring categories.
3 stars: Buy 4-5 extra pieces across diverse types. Add Gears
for direction changes (creating a non-straight path), Config
Node for conditional logic, extra Scanner for redundancy. Use
5+ distinct piece types for full Diversity. Total spend ~40-55
CR.

**Forfeiture risk notes:** The board is a straight horizontal
layout. An Engineer who buys many Gears but does not create
a winding path will have unused pieces. The temptation to
over-buy for a simple level is the lesson.

**depthCeiling:** 10.
**baseReward:** 100 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** derivable.

**Narrative frame:** Relay chain built to last, outlived its
maintainers. The signal must pass faithfully.

**COGS line:** "The primary relay chain out here was built to
last. It has lasted past the people responsible for maintaining
it. That is a common condition in this corridor."
[PROPOSED | cogsLine | BLUE]
(From NARRATIVE.md K1-2. No changes.)

**COGS tutorial for new mechanics:** None. REQUISITION store
was introduced in K1-1. No new mechanic.

**Tutorial steps:** 2 instructor steps. No new piece.

Step 1 (instructor, boardGrid, blue):
"The input tape feeds a mixed signal. Each value must pass
through unchanged. The Scanner reads it. The Transmitter writes
it. The path between them is yours to build."

Step 2 (instructor, boardGrid, blue):
"Scanner before Transmitter. The Data Trail carries the value
between them. Every pulse must produce the correct output."

---

### K1-3 Junction 7

**Computational goal:** Split the signal into two paths using
a Splitter. Both paths must reach the Terminal. One path goes
direct. The other goes through a Config Node gate. The signal
arrives via whichever path is open.

**Concept taught:** Splitter (one input, two simultaneous
outputs). Signal fork. The beam duplicates, not divides.

**Prerequisite concept:** Routing with Gears, Config Node
gating, tape processing.

**Board design:**
Grid: 10x7.
Source: (1,3) left edge.
Terminal: (8,5) bottom-right (NOT horizontally aligned with
Source, forcing a non-trivial routing decision after the split).
No damaged cells. This level focuses entirely on understanding
the Splitter.

**Floor solve:**
Conveyor at (2,3) right.
Splitter at (3,3) splitting to right and down.
Path A (upper/right): Conveyor at (4,3) right, Gear at (5,3)
  turning down, Conveyor at (5,4), Gear at (5,5) turning right.
Path B (lower): Gear at (3,4) turning right from downward
  split output, Conveyor at (4,4), Conveyor at (4,5),
  Gear turning right at (4,5)...

[Note: exact floor solve coordinates depend on final board
layout. The principle is: Splitter creates two paths, both
converge toward the Terminal area. One path is shorter, one is
longer. Both valid. The player learns that the Splitter
duplicates, it does not divide.]

Pieces used: 6 minimum.
Multiple valid configurations exist because both split paths
can be routed various ways to reach the Terminal.

**Tape:** [1, 1, 0, 1] -> Expected: signal reaches Terminal
on all pulses (reach_output, no tape-gated output).
Simple tape keeps focus on the routing concept, not data
processing.

**Pre-assigned tray:** Conveyor x3, Splitter x1, Gear x2.
Six pieces. Floor solve minimum.

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR).

**Free tapes:** IN.
**Purchasable tapes:** TRAIL (40 CR), OUT (40 CR).
Note: This is a reach_output level. The floor solve is pure
routing. Purchasing TRAIL + Scanner enables working memory.
Purchasing OUT + Transmitter enables recorded output. Both
expand the machine's capability for higher scoring but are not
required for completion.

**Credit budget:** 100 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 3-4 extra Conveyors/Gears (15-30 CR) to build
both split paths with more active pieces. Longer paths through
both branches. Total spend ~25-35 CR. Unlocks Investment,
Signal Depth, Diversity.
3 stars: Buy 5-6 extra routing pieces AND invest in TRAIL tape
(40 CR) + Scanner (10 CR) to add data processing to the
machine. 6+ distinct active types for full Diversity. Total
spend ~75-90 CR. The budget allows this but leaves little
margin — every piece must be active.

**Forfeiture risk notes:** Buying both tapes (80 CR) plus
data processing pieces (Scanner 10 + Transmitter 10 = 20 CR)
totals 100 CR, exhausting the entire budget. If any purchased
piece is not active (signal does not pass through), it is
forfeited AND reduces Path Integrity. The Engineer must plan
carefully if pursuing the data processing path.

**depthCeiling:** 12.
**baseReward:** 120 CR.

**Difficulty band:** derivable.

**Narrative frame:** Junction 7 is a routing bottleneck.
Eleven settlements feed through this point. The signal needs
to reach its destination even if one path is compromised.
Redundancy through splitting.

**COGS line:** "Junction 7 is a routing bottleneck. Eleven
settlements feed through this point. The original engineers
underestimated the load. It is not the last time that has
happened out here."
[PROPOSED | cogsLine | BLUE]
(From NARRATIVE.md K1-3. No changes.)

**COGS tutorial for new mechanics:** Splitter introduction
(4-step pattern). COGS gives a brief nudge about purchasable
tapes after the Splitter tutorial.

**Tutorial steps:** 4 steps (full new-piece introduction) +
1 purchasable tape hint.

Step 1 (instructor, boardGrid, blue):
"Junction 7. The signal needs to reach the far side of this
board, and the direct route is not viable. The board has more
width than the path requires. That is usually a sign that a
single path is not the intended approach."

Step 2 (collector, tray Splitter slot, amber):
"One input. Two outputs. Uncatalogued. Logging it now."
[codexEntryId: splitter]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Splitter duplicates the signal. Both
outputs carry the full beam. Route both paths toward the
Terminal. The signal does not care which path arrives first.
It cares that it arrives."

Step 5 (instructor, tray, blue):
[NEW COPY — Purchasable tape hint. Tucker sign-off required.]
"The INFRA tab in the REQUISITION store has additional
capability for this board. Not required. But available."

---

### K1-4 Mining Platform Alpha (CONSEQUENCE)

**Computational goal:** Store the first input value in a Latch
(write mode), then use that stored value to gate subsequent
pulses via Config Node reading the Latch output (read mode).

**Concept taught:** Latch (write and read as separate
operations). Memory that persists across pulses. Write before
read.

**Prerequisite concept:** Splitter (K1-3), Scanner, Config
Node, Data Trail.

**Board design:**
Grid: 10x7.
Source: (8,1) top-right (reversed direction: signal travels
right-to-left and downward, breaking the left-to-right habit).
Terminal: (2,5) bottom-left.
Pre-placed: Latch at (5,3) center of board. Player must route
through it.

**Floor solve:**
Signal travels from Source(8,1) left and down through Gears,
passes through Latch(5,3) in write mode on first pass, then
routes through Scanner and Config Node to gate subsequent
pulses, reaching Terminal(2,5).

Scanner at (7,1) or nearby, reading input.
Latch at (5,3) pre-placed in write mode.
Config Node downstream, reading Latch-written trail value.
Transmitter before Terminal writing gated result.

Pieces used: 6 minimum.

**Tape:** [1, 0, 0, 1, 1, 0]
Expected output: [1, 0, 0, 1, 1, 0]
Edge case: three consecutive same values (positions 1-2 and
4-5) test that the machine is not just alternating.

**Pre-assigned tray:** Scanner x1, Conveyor x2, Config Node x1,
Transmitter x1, Gear x1.
Six pieces. Floor solve minimum. Latch is pre-placed on the
board and not counted in the tray.

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR), Latch (20 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: Floor solve requires Scanner (writes TRAIL) and
Transmitter (writes OUT). All tapes free.

**Credit budget:** 100 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 2-3 extra Conveyors/Gears (10-25 CR) to extend
the signal path. The reversed Source position creates room for
longer routing. Buy an extra Latch (20 CR) for additional
memory operations. Total spend ~30-45 CR.
3 stars: Buy 5+ extra pieces. Extra Latch (20 CR), additional
Gears for winding path (20-30 CR), extra Scanner (10 CR) for
redundant reads, Splitter (15 CR) for parallel processing.
Use 5-6 distinct types. Total spend ~65-85 CR.

**Forfeiture risk notes:** Buying a Splitter (15 CR) without a
clear plan for both output paths risks forfeiting the Splitter
or creating dead-end paths that reduce Path Integrity. The
reversed Source direction may trick Engineers into over-buying
routing pieces for paths that do not work.

**depthCeiling:** 12.
**baseReward:** 120 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** derivable.

**Narrative frame:** Decommissioned platform repurposed as
signal relay. Not designed for this purpose. Doing the job
anyway. Failure affects colonist communication.

**COGS line:** "Mining Platform Alpha has been decommissioned
for six years. The colonists use it as a signal relay. It was
not designed for this purpose. It is doing the job anyway."
[PROPOSED | cogsLine | BLUE]
(From NARRATIVE.md K1-4. No changes.)

**Consequence:**
cogsWarning: "Pay attention to this one."
failureEffect: "Mining Platform Alpha relay failure. Seven
settlements lost communication for forty-eight hours."

**COGS tutorial for new mechanics:** Latch introduction (full
4-step pattern). No additional store/tape tutorial.

**Tutorial steps:** 4 steps (full new-piece introduction).

Step 1 (instructor, boardGrid, blue):
"The platform was not built for this. The signal path runs
through infrastructure that was designed for ore telemetry,
not communication relay. There is a component on this board
that stores a value. It has two states, and the state it is in
when the signal arrives determines everything downstream."

Step 2 (collector, pre-placed Latch, amber):
"A storage unit. Two modes. Uncatalogued. This goes in the
Codex immediately."
[codexEntryId: latch]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. Write mode captures the value. Read mode
outputs what was captured. The order matters. Write before
read. The platform depends on what was stored."

---

### K1-5 Resupply Chain

**Computational goal:** Route signal from Source to Terminal
through a board with damaged cells, using Latch to store and
gate on pulse values. The damaged cells force a non-obvious
routing path.

**Concept taught:** Routing around obstacles. Damaged cells
as board constraints. Reinforces Latch in a constrained
environment.

**Prerequisite concept:** Latch write/read (K1-4), independent
routing.

**Board design:**
Grid: 10x7.
Source: (1,5) bottom-left (signal travels upward and right).
Terminal: (8,2) top-right.
Damaged cells: (3,3), (4,4), (5,3), (6,4). Four cells forming
a diagonal barrier through the center of the board, forcing the
player to route around. The obvious straight path is blocked.

Pre-placed: none beyond Source/Terminal.

**Floor solve:**
Signal must navigate around the damaged diagonal. Route goes
up from Source, across the top of the damaged area, then
down to Terminal level. Scanner early, Latch mid-path,
Config Node downstream, Transmitter before Terminal.

Pieces used: 7 minimum.
Board has enough slack for 2 blown cells beyond the 4 damaged.

**Tape:** [1, 0, 1, 0, 1]
Expected output: [1, 0, 1, 0, 1]
Pass-through with Latch gating. The damaged cells are the
puzzle, not the tape logic.

**Pre-assigned tray:** Scanner x1, Conveyor x2, Latch x1,
Config Node x1, Transmitter x1, Gear x1.
Seven pieces. Floor solve minimum.

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR), Latch (20 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: Floor solve requires Scanner (writes TRAIL) and
Transmitter (writes OUT). All tapes free.

**Credit budget:** 100 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 2-3 extra Gears/Conveyors (10-20 CR) to navigate
the damaged cell barrier with a more elaborate path. Extra Gear
placements create longer routing around obstacles. Total spend
~20-30 CR.
3 stars: Buy 5+ pieces. Extra Gears (20-30 CR) and Conveyors
(10-15 CR) for maximum path length around the barrier. Extra
Latch (20 CR) for additional memory state. Splitter (15 CR)
for parallel routing around different sides of the damaged
diagonal. Use 5-6 distinct types. Total spend ~65-80 CR.

**Forfeiture risk notes:** The damaged cells severely constrain
routing options. An Engineer who buys too many pieces may find
that the board cannot accommodate them all due to the damaged
barrier. Buying a Splitter on this level is high-risk/high-
reward: both split paths must navigate around damaged cells,
requiring precise planning.

**depthCeiling:** 14.
**baseReward:** 120 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** derivable.

**Narrative frame:** Resupply chain runs through a corridor
section that took structural damage years ago. Some relay
points are permanently offline. The remaining path is longer
but functional.

**COGS line:** "The resupply chain for this region runs through
four independent relay nodes. All four are degraded. The
colonists have been compensating manually for at least two
years. They have not filed a formal repair request. I find that
worth noting."
[PROPOSED | cogsLine | BLUE]
(From NARRATIVE.md K1-5. No changes.)

**COGS tutorial for new mechanics:** Damaged cells introduction
(2 steps). No additional store/tape tutorial.

**Tutorial steps:** 2 instructor steps. No new piece. First
appearance of damaged cells.

Step 1 (instructor, boardGrid, blue):
"Some cells on this board are damaged. Structural scoring from
years of neglect. No piece will seat in a damaged cell. The
path routes around them, not through them. Survey the board
before placing anything."

Step 2 (instructor, boardGrid, blue):
"The damage narrows the viable routes. Fewer options means
each placement carries more weight. Plan the full path first.
Corrections cost more when there is less room to maneuver."

---

### K1-6 Colonist Hub (PIECE REQUIREMENT)

**Computational goal:** Signal splits into two paths via
Splitter. Path A goes through a Config Node (passes when trail
value is 1). Path B bypasses the gate. A Merger reconverges
both paths. The bypass guarantees the signal always reaches
output regardless of input value.

**Concept taught:** Merger (OR logic, two paths converge to
one). Also introduces piece requirements mechanic.

**Prerequisite concept:** Splitter (K1-3), Config Node gating,
Latch, path routing.

**Board design:**
Grid: 11x8.
Source: (1,4) left edge.
Terminal: (9,4) right edge.
Damaged cells: (5,2), (6,6). Two damaged cells that prevent
trivial straight-line paths on the upper and lower routes,
adding routing texture.

Pre-placed: Splitter at (3,4) center-left. The signal splits
here. Player must build both paths and reconverge with Merger.

**Piece requirements:**
requiredPieces: [{ type: 'merger', count: 1, reason: 'The
Colonist Hub requires redundant routing. Both paths must
reconverge.' }]

**Floor solve:**
Source(1,4) -> Conveyor(2,4) -> Splitter(3,4).
Path A (upper): Gear(3,3) up from split, Conveyor(4,3),
Scanner(5,3) reads input, Config Node(6,3) gates on trail,
Gear(7,3) turning down, Conveyor(7,4) -> Merger(7,4).
Path B (lower): Gear(3,5) down from split, Conveyor(4,5),
Conveyor(5,5), Conveyor(6,5), Gear(6,4) or (7,5) turning
to reach Merger.
Merger at (7,4) reconverges. Transmitter(8,4). Terminal(9,4).

Pieces used: 8 minimum.

**Tape:** [1, 0, 1, 0] -> Expected: [1, 1, 1, 1].
The machine must output 1 for every pulse regardless of input.
When input is 1, path A opens. When input is 0, path A blocks
but path B always reaches the Merger. Both paths lead to output.
Edge case: a machine that only routes through path A would fail
on input=0 pulses.

**Pre-assigned tray:** Conveyor x4, Merger x1, Scanner x1,
Config Node x1, Transmitter x1, Gear x2.
Ten pieces. Floor solve minimum (8 used, with routing
flexibility for navigating around damaged cells and the
pre-placed Splitter).

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR), Latch (20 CR),
Merger (15 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: Floor solve requires Scanner (writes TRAIL) and
Transmitter (writes OUT). All tapes free.

**Credit budget:** 120 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 2-3 extra Conveyors/Gears (10-25 CR) to extend
both split paths. Longer routes through both branches increase
Signal Depth. Total spend ~20-30 CR.
3 stars: Buy 5-6 extra pieces. Extra Merger (15 CR) for
additional convergence point. Extra Latch (20 CR) for memory.
Additional Gears (20-30 CR) for winding paths through both
branches. Use 6+ distinct active types. Total spend ~70-95 CR.

**Forfeiture risk notes:** The two-path structure means every
purchased piece must be assigned to a specific branch. Buying
for "both paths" without planning which pieces go where risks
forfeiture. The two damaged cells (5,2) and (6,6) limit
certain routing options — an Engineer who does not account for
them may over-purchase.

**depthCeiling:** 16.
**baseReward:** 140 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** abstract.

**Narrative frame:** The Colonist Hub coordinates resupply for
thirty-one settlements. Running on equipment three cycles past
replacement. Redundancy is not a luxury. It is the only option.

**COGS line:** "The Colonist Hub coordinates resupply for
thirty-one settlements. It is running on equipment that should
have been replaced three cycles ago. The people depending on it
do not have the option of waiting for something better."
[PROPOSED | cogsLine | AMBER]
(From NARRATIVE.md K1-6. No changes.)

**COGS tutorial for new mechanics:** Merger introduction (full
4-step pattern). Piece requirements are self-evident from the
rejection modal if the Engineer forgets the Merger.

**Tutorial steps:** 4 steps (full new-piece introduction).

Step 1 (instructor, boardGrid, blue):
"The Hub has two viable signal routes. One is conditional. One
is not. The infrastructure requires both. Something downstream
needs to bring them back together. The board will not accept a
solution that ignores either path."

Step 2 (collector, tray Merger slot, amber):
"Two inputs. One output. Either is sufficient. Logging this
under redundancy infrastructure."
[codexEntryId: merger]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Merger accepts signal from either input.
Both paths lead to the same destination. The Hub does not care
which route the signal took. It cares that it arrived."

---

### K1-7 Ore Processing

**Computational goal:** Two independent signal processes share
the board. Path A carries the primary signal from Source to
Terminal. Path B is a monitoring loop (pre-placed, does not
require player action). The Bridge allows both paths to cross
without interfering.

**Concept taught:** Bridge (two independent paths sharing one
cell without interaction).

**Prerequisite concept:** All prior Kepler concepts (Splitter,
Latch, Merger).

**Board design:**
Grid: 10x8.
Source: (1,6) bottom-left (signal travels upward, breaking
left-to-right + top-to-bottom conventions).
Terminal: (8,2) top-right.
Damaged cells: (4,5). One damaged cell on the obvious diagonal
path, adding minor routing complexity.

Pre-placed: Bridge at (5,4) center of board. The primary path
must cross here.

**Floor solve:**
Signal from Source(1,6) routes up and right. Scanner reads
input. Path crosses the Bridge at (5,4) where a pre-existing
monitoring signal runs vertically. Transmitter downstream.
Gears handle the direction changes. Terminal at (8,2).

Pieces used: 7 minimum.
Board has slack for blown cells around the Bridge.

**Tape:** [1, 0, 1, 1] -> Expected: [1, 0, 1, 1].
Pass-through with gating. Simple tape keeps focus on the
Bridge mechanic.

**Pre-assigned tray:** Conveyor x3, Scanner x1, Transmitter x1,
Gear x2.
Seven pieces. Floor solve minimum. Config Node available in
store for gating elaboration.

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR), Latch (20 CR),
Merger (15 CR), Bridge (20 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: Floor solve requires Scanner (writes TRAIL) and
Transmitter (writes OUT). All tapes free.

**Credit budget:** 120 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy Config Node (8 CR) for conditional gating and
2-3 extra Conveyors/Gears (10-25 CR) to extend the path.
Total spend ~20-35 CR. Config Node adds a distinct type for
Diversity scoring.
3 stars: Buy 5-6 extra pieces. Latch (20 CR) for memory,
Config Node (8 CR) for gating, extra Gears (20-30 CR) for
elaborate routing through the Bridge area, Bridge (20 CR) if
the board supports a second crossing. Use 6+ distinct types.
Total spend ~70-95 CR.

**Forfeiture risk notes:** The bottom-left to top-right
routing creates a long diagonal. An Engineer who over-buys
routing pieces may find fewer viable cells than expected due
to the damaged cell at (4,5) and the Bridge at (5,4) occupying
key positions. Buying a second Bridge (20 CR) without a clear
use for it is a common over-investment.

**depthCeiling:** 14.
**baseReward:** 140 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** derivable.

**Narrative frame:** Ore processing relay still active despite
no mining. Something transmitting on the frequency. Two signals
that must not interfere.

**COGS line:** "The ore processing relay is still active. There
is no active mining in this corridor. Something is still
transmitting on the processing frequency. I have not identified
the source. It is not relevant to the current objective."
[PROPOSED | cogsLine | AMBER]
(From NARRATIVE.md K1-7. No changes.)

**COGS tutorial for new mechanics:** Bridge introduction (full
4-step pattern). No additional store/tape tutorial.

**Tutorial steps:** 4 steps (full new-piece introduction).

Step 1 (instructor, boardGrid, blue):
"Two signals on this board. Both need to reach their
destination. The board does not have room for both to go around
each other. Something on the board solves this without the
signals being aware of it."

Step 2 (collector, pre-placed Bridge, amber):
"Two paths. One cell. Neither interferes. I have been waiting
for something like this to catalog."
[codexEntryId: bridge]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Bridge allows two independent paths to
share one cell. Neither signal is aware of the other. Both are
correct. Route through it. Not around it."

---

### K1-8 Transit Gate (CONSEQUENCE, TWO TERMINALS)

**Computational goal:** Split the signal via Splitter and
route each branch to a separate Terminal. Both Terminals must
receive the signal for the level to lock. One path goes through
a Config Node gate. The other bypasses it. Both must reach
their respective Terminals.

**Concept taught:** Two-terminal levels. A single signal serves
two destinations simultaneously. The Splitter is not just
redundancy, it is distribution.

**Prerequisite concept:** Splitter (K1-3), Merger (K1-6),
Bridge (K1-7), Latch (K1-4).

**Board design:**
Grid: 11x9.
Source: (5,1) top-center (signal enters from above, splits
left and right).
Terminal A: (1,7) bottom-left.
Terminal B: (9,7) bottom-right.
Damaged cells: (3,4), (7,4). Two damaged cells flanking the
center at mid-height, forcing each split path to route around
obstacles on its way to its respective Terminal.

Pre-placed: Splitter at (5,3) below Source. Signal splits left
and right.

**Floor solve:**
Source(5,1) -> Conveyor(5,2) -> Splitter(5,3).
Path A (left): Gear(4,3) left, Conveyor(3,3), Gear(2,3) down,
Conveyor(2,4), Conveyor(2,5), Scanner(2,6) or similar,
Conveyor to Terminal A(1,7).
Path B (right): Gear(6,3) right, Conveyor(7,3), Gear(8,3)
down, Conveyor(8,4) [routes around damaged cell at (7,4)],
Config Node + Transmitter downstream, Terminal B(9,7).

Pieces used: 9 minimum.
Board has slack for blown cells on both paths.

**Tape:** [1, 1, 0, 1, 0, 0, 1, 1]
Expected output: [1, 1, 0, 1, 0, 0, 1, 1]
Eight pulses. Longer tape increases difficulty. Both paths must
handle all pulses correctly.

**Pre-assigned tray:** Conveyor x4, Scanner x1, Config Node x1,
Transmitter x1, Gear x3.
Ten pieces. Slightly above floor solve minimum (9) to allow
flexibility in routing around damaged cells. Latch and Bridge
available in store for elaboration.

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR), Latch (20 CR),
Merger (15 CR), Bridge (20 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: Floor solve requires Scanner and Transmitter. All tapes
free.

**Credit budget:** 150 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 3-4 extra pieces — Conveyors/Gears (15-30 CR) to
extend both branches. Latch (20 CR) for memory on one path.
Total spend ~35-50 CR. Two paths give natural room for more
active pieces.
3 stars: Buy 6+ extra pieces. Latch (20 CR), Bridge (20 CR)
for crossing paths mid-board, extra Merger (15 CR) for
convergence, Gears (20-30 CR) for elaborate routing. Use 6+
distinct types across both branches. Total spend ~90-130 CR.
The generous board (11x9) supports it.

**Forfeiture risk notes:** The two-terminal structure doubles
the routing challenge. An Engineer who invests heavily in one
branch but neglects the other may have unused pieces assigned
to the weak branch. The damaged cells at (3,4) and (7,4)
eliminate specific routing options — purchasing pieces that
assume those cells are viable is a common mistake.

**depthCeiling:** 18.
**baseReward:** 175 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** abstract.

**Narrative frame:** Transit gate regulates traffic for the
entire corridor. Two separate relay networks feed through this
point. Both must be active for corridor traffic to flow.
Failure suspends all traffic.

**COGS line:** "The transit gate regulates traffic flow through
the entire corridor. It has not been updated since the mining
operations closed. It is routing ghost traffic from ships that
no longer exist. I find that inefficient and something else I
will not specify."
[PROPOSED | cogsLine | BLUE]
(From NARRATIVE.md K1-8. No changes.)

**Consequence:**
cogsWarning: "This mission matters more than most. That is all."
failureEffect: "Transit gate failure. All corridor traffic
suspended for seventy-two hours. The transit authority has
escalated the negligence inquiry."

**COGS tutorial for new mechanics:** Two-terminal mechanic
taught through board layout (2 steps). No additional store/
tape tutorial. By K1-8, the Engineer should be familiar with
the REQUISITION store.

**Tutorial steps:** 2 instructor steps. No new piece.
Two-terminal mechanic is taught through board layout.

Step 1 (instructor, boardGrid, blue):
"Two Terminals on this board. The signal must reach both. A
single path will not do. The Splitter divides the signal. The
Engineer builds two complete routes. One destination is not
sufficient when the corridor depends on both."

Step 2 (instructor, boardGrid, blue):
"Each path is independent. Each Terminal requires a complete
signal chain. If one Terminal locks and the other does not, the
transit gate stays offline. Both or neither."

---

### K1-9 The Narrows

**Computational goal:** Process a tape where the output for
each pulse is the XOR of the current input and the previously
stored Latch value. The machine writes the current input to
the Latch after using the previous stored value for the
comparison.

**Concept taught:** Synthesis. Dynamic memory across pulses
where the stored value changes each pulse. The difference
between a solution and an algorithm.

**Prerequisite concept:** All Kepler pieces and concepts.

**Board design:**
Grid: 12x9.
Source: (1,4) left edge.
Terminal: (10,4) right edge.
Damaged cells: (4,2), (7,6), (9,3). Three damaged cells
scattered across the board, adding routing complexity to an
already demanding logic puzzle.

Pre-placed: none beyond Source/Terminal.

**Piece requirements:**
requiredPieces: [
  { type: 'latch', count: 2, reason: 'The comparison requires
    storing the previous value while processing the current
    one.' },
  { type: 'splitter', count: 1, reason: 'The signal must be
    evaluated on two paths simultaneously.' }
]

**Floor solve:**
The machine uses two Latches: one stores the previous pulse
value (persists across pulses), the other stores the current
value for comparison. Splitter creates parallel evaluation
paths. Config Nodes on each path check different conditions.
Merger reconverges. Bridge handles crossing paths.

Pieces used: 11 minimum.

**Tape:** [0, 1, 1, 0, 1, 0]
Expected output: [0, 1, 0, 1, 1, 1]
Pulse 0: Latch empty (0), input 0, XOR = 0.
Pulse 1: Latch has 0, input 1, XOR = 1.
Pulse 2: Latch has 1, input 1, XOR = 0.
Pulse 3: Latch has 1, input 0, XOR = 1.
Pulse 4: Latch has 0, input 1, XOR = 1.
Pulse 5: Latch has 1, input 0, XOR = 1.

Edge case: XOR output differs from input on several pulses,
proving the machine compares against stored state rather than
passing through.

**Pre-assigned tray:** Conveyor x4, Scanner x1, Latch x2,
Splitter x1, Merger x1, Config Node x2, Transmitter x1,
Gear x2, Bridge x1.
Sixteen pieces. Floor solve minimum (11 used, with routing
flexibility for damaged cell navigation).

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR), Latch (20 CR),
Merger (15 CR), Bridge (20 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: Floor solve requires Scanner, Transmitter, and Latch
(all use TRAIL/OUT). All tapes free.

**Credit budget:** 150 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 3-4 extra Gears/Conveyors (15-30 CR) to extend
paths around the three damaged cells. The 12x9 board has room
for longer routing. Total spend ~25-40 CR.
3 stars: Buy 5-6 extra pieces. Extra Latch (20 CR) for
additional memory state, extra Config Node (8 CR) for more
conditions, Gears (20-30 CR) for elaborate routing through the
dense Narrows corridor. Use 6+ distinct active types. Total
spend ~75-100 CR. The piece requirements (2 Latches, 1
Splitter) already provide a strong diversity base.

**Forfeiture risk notes:** The three scattered damaged cells
create unpredictable routing constraints. An Engineer who buys
pieces based on an initial visual assessment may find their
planned path blocked by a damaged cell they missed. This level
is where the one-time requisition window creates the most
pressure: study the board carefully before purchasing.

**depthCeiling:** 22.
**baseReward:** 175 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** abstract.

**Narrative frame:** The Narrows is the densest section of the
corridor. Maximum signal interference. The machine must compare
each new signal against what came before.

**COGS line:** "The Narrows is the densest section of the
corridor. Maximum signal interference. The colonists call it
The Narrows because of what it does to communication. It has
another name on older charts. I will use the current one."
[PROPOSED | cogsLine | BLUE]
(From NARRATIVE.md K1-9. No changes.)

**COGS tutorial for new mechanics:** None. No new piece. No
new mechanic. The player has all the tools. This is synthesis.

**Tutorial steps:** None. No new piece. No new mechanic. The
player has all the tools. This is synthesis.

---

### K1-10 Central Hub (BOSS, CONSEQUENCE, requireThreeStars)

**Computational goal:** Implement a running count machine. The
output for each pulse is 1 if two or more consecutive 1s have
been seen in the input (including the current pulse). Otherwise
output 0. The Latch stores whether the previous input was 1.

**Concept taught:** Full stateful computation. A machine that
behaves differently on pulse N based on what happened on
pulse N-1. This is the difference between a solution and an
algorithm.

**Prerequisite concept:** All Kepler concepts mastered.

**Board design:**
Grid: 12x9.
Source: (10,1) top-right (signal enters from the top-right
corner, maximizing path length across the board).
Terminal: (1,7) bottom-left.
Damaged cells: (4,3), (7,5), (8,3). Three damaged cells
creating routing obstacles. Board is generous (12x9) to
compensate for consequence-level blown cell risk.

Pre-placed: none beyond Source/Terminal.

**Piece requirements:**
requiredPieces: [
  { type: 'latch', count: 2, reason: 'State tracking across
    pulses requires persistent memory.' },
  { type: 'scanner', count: 1 }
]

**Floor solve:**
The machine reads each input value via Scanner. Latch A stores
whether the previous input was 1 (write current value each
pulse). Latch B stores the comparison result. Splitter creates
parallel paths for the current and previous value checks.
Config Nodes gate on both conditions. Merger reconverges.
Bridge handles any crossing paths. Transmitter writes the
AND result (current=1 AND previous=1) to output tape.

Pieces used: 13 minimum.
Board has generous slack for blown cells + damaged cells.

**Tape:** [1, 1, 0, 1, 1, 1, 0, 0, 1, 1]
Expected output: [0, 1, 0, 0, 1, 1, 0, 0, 0, 1]
Pulse 0: first 1, no previous, output 0.
Pulse 1: 1 and previous was 1, output 1.
Pulse 2: 0, reset, output 0.
Pulse 3: 1, no previous 1, output 0.
Pulse 4: 1 and previous was 1, output 1.
Pulse 5: 1 and previous was 1, output 1.
Pulse 6: 0, reset, output 0.
Pulse 7: 0, still reset, output 0.
Pulse 8: 1, no previous 1, output 0.
Pulse 9: 1 and previous was 1, output 1.

Edge case: consecutive 0s at positions 6-7 test that the
machine correctly resets. Isolated 1 at position 3 tests
that a single 1 does not trigger output.

**Pre-assigned tray:** Conveyor x4, Scanner x1, Latch x2,
Splitter x1, Merger x1, Config Node x2, Transmitter x1,
Gear x3, Bridge x1.
Seventeen pieces. Floor solve minimum (13 used, with routing
flexibility for the large board and damaged cells).

**REQUISITION store availability:** Conveyor (5 CR), Gear
(10 CR), Config Node (8 CR), Scanner (10 CR), Transmitter
(10 CR), Relay (12 CR), Splitter (15 CR), Latch (20 CR),
Merger (15 CR), Bridge (20 CR).

**Free tapes:** IN, TRAIL, OUT.
**Purchasable tapes:** None (all provided).
Note: Floor solve requires Scanner, Transmitter, and Latch
(all use TRAIL/OUT). All tapes free.

**Credit budget:** 200 CR.

**Intended elaboration path (2-3 star):**
2 stars: Buy 3-4 extra Gears/Conveyors (15-30 CR) to extend
the already-long path across the 12x9 board. The top-right to
bottom-left diagonal provides natural room for elaborate
routing. Total spend ~25-40 CR.
3 stars (REQUIRED for this level): Buy 6+ extra pieces.
Extra Scanner (10 CR) for redundant reads, extra Latch (20 CR)
for additional memory, Gears (30-40 CR) for maximum path
length, Bridge (20 CR) for crossing paths on the large board.
Use 6+ distinct active types. Total spend ~100-140 CR.
The generous budget (200 CR) and baseReward (225 CR) ensure
the virtuous cycle: a well-built 3-star machine earns back
more than it cost.

**Forfeiture risk notes:** This is the boss level.
requireThreeStars means the Engineer MUST invest. The 200 CR
budget is generous but not unlimited. Over-purchasing on one
area of the board (e.g., heavy investment in routing pieces
for the top half) while neglecting the bottom half risks
forfeiting unused pieces AND failing to reach 3 stars. The
three damaged cells at (4,3), (7,5), (8,3) must be accounted
for in the purchase plan. The consequence of failure here is
severe — treat the requisition window as the most important
decision on this level.

**depthCeiling:** 26.
**baseReward:** 225 CR.

**Data Trail:** [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].

**Difficulty band:** abstract.

**Narrative frame:** Everything routes through the Central Hub.
Three hundred thousand people depend on infrastructure that
runs through a single point. That is not good design. It is,
however, the current situation.

**COGS line:** "The Central Hub. Everything in this corridor
routes through here. If it holds, the corridor holds. Three
hundred thousand people depend on infrastructure that runs
through a single point. That is not good design. It is,
however, the current situation."
[PROPOSED | cogsLine | AMBER]
(From NARRATIVE.md K1-10. No changes.)

**Consequence:**
cogsWarning: "Do not fail here. I will not elaborate."
failureEffect: "Central Hub failure. The corridor is offline.
Three hundred and fourteen colonists lost scheduled resupply
access for eleven days. The transit authority has filed a
negligence inquiry against this vessel."
requireThreeStars: true.

**COGS tutorial for new mechanics:** None. Boss level. The
Engineer has all tools and knowledge.

**Tutorial steps:** 2 instructor steps. No new piece. Boss
level framing.

Step 1 (instructor, boardGrid, blue):
"The Central Hub. The board is larger than anything the Engineer
has worked on in this sector. Every piece type available in
Kepler Belt is in the tray. The machine must track what
happened on the previous pulse and use that to decide the
current output. There is nothing on this board that has not
been seen before. The work is putting it together under
pressure."

Step 2 (instructor, boardGrid, blue):
"Plan the memory first. The Latches determine the logic. Route
the Physics pieces around them. The path serves the state, not
the other way around."

---

## Economy Summary Table

| Level | Budget | Free Tapes | Purchasable Tapes | Floor Pieces | depthCeiling | baseReward |
|-------|--------|------------|-------------------|-------------|--------------|------------|
| K1-1 | 75 CR | IN | TRAIL, OUT | 5 | 10 | 100 CR |
| K1-2 | 80 CR | IN, TRAIL, OUT | None | 5 | 10 | 100 CR |
| K1-3 | 100 CR | IN | TRAIL, OUT | 6 | 12 | 120 CR |
| K1-4 | 100 CR | IN, TRAIL, OUT | None | 6 | 12 | 120 CR |
| K1-5 | 100 CR | IN, TRAIL, OUT | None | 7 | 14 | 120 CR |
| K1-6 | 120 CR | IN, TRAIL, OUT | None | 8 | 16 | 140 CR |
| K1-7 | 120 CR | IN, TRAIL, OUT | None | 7 | 14 | 140 CR |
| K1-8 | 150 CR | IN, TRAIL, OUT | None | 9 | 18 | 175 CR |
| K1-9 | 150 CR | IN, TRAIL, OUT | None | 11 | 22 | 175 CR |
| K1-10 | 200 CR | IN, TRAIL, OUT | None | 13 | 26 | 225 CR |

Design notes:
- depthCeiling = floorSolvePieces * 2 for all levels (per
  Scoring Algorithm v2 REQ-17 default).
- baseReward set so that 3-star payout (~0.93x base) exceeds
  expected investment, per REQ-35.
- Purchasable tapes (TRAIL, OUT) available only on K1-1 and
  K1-3, which have reach_output objectives. All other levels
  require data processing in the floor solve, so TRAIL and OUT
  are provided free.
- Later sectors (Nova Fringe onward) will introduce levels
  designed from the ground up with purchasable tapes as a
  primary mechanic — levels where the floor solve is pure
  routing and data processing is the investment path.

---

## Tutorial Copy Summary: All New Piece Introductions

All tutorial copy follows the 4-step pattern defined in
LEVEL_DESIGN_FRAMEWORK.md Part 4.

### REQUISITION Store (K1-1 Corridor Entry)
[NEW COPY — not in NARRATIVE.md. Tucker sign-off required.]

Step 3 (instructor, tray, blue):
"The tray contains the minimum. Swipe up to open the
REQUISITION store. Additional pieces are available for
purchase. More pieces means a more elaborate machine. A more
elaborate machine earns a higher evaluation."

Step 4 (instructor, tray expanded, blue):
"Three categories. PHYSICS for signal path components.
PROTOCOL for data processing. INFRA for tape infrastructure.
Select what the machine needs. All purchases are final. All
purchases happen now, before the work begins."

Step 5 (instructor, tray expanded, blue):
"Anything requisitioned but not used when the machine runs is
forfeited. Buy what the machine needs. Use what is bought. The
budget is not unlimited. Neither is the margin for waste."

### Purchasable Tape Hint (K1-3 Junction 7)
[NEW COPY — not in NARRATIVE.md. Tucker sign-off required.]

Step 5 (instructor, tray, blue):
"The INFRA tab in the REQUISITION store has additional
capability for this board. Not required. But available."

### Splitter (K1-3 Junction 7)
[NEW COPY — NOT IN NARRATIVE.md. Tucker sign-off required.]

Step 1 (instructor, boardGrid, blue):
"Junction 7. The signal needs to reach the far side of this
board, and the direct route is not viable. The board has more
width than the path requires. That is usually a sign that a
single path is not the intended approach."

Step 2 (collector, tray Splitter slot, amber):
"One input. Two outputs. Uncatalogued. Logging it now."
[codexEntryId: splitter]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Splitter duplicates the signal. Both
outputs carry the full beam. Route both paths toward the
Terminal. The signal does not care which path arrives first. It
cares that it arrives."

### Latch (K1-4 Mining Platform Alpha)
[REVISED — original was in previous spec. Minor wording
changes for revised board context. Tucker sign-off required.]

Step 1 (instructor, boardGrid, blue):
"The platform was not built for this. The signal path runs
through infrastructure that was designed for ore telemetry, not
communication relay. There is a component on this board that
stores a value. It has two states, and the state it is in when
the signal arrives determines everything downstream."

Step 2 (collector, pre-placed Latch, amber):
"A storage unit. Two modes. Uncatalogued. This goes in the
Codex immediately."
[codexEntryId: latch]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. Write mode captures the value. Read mode
outputs what was captured. The order matters. Write before
read. The platform depends on what was stored."

### Merger (K1-6 Colonist Hub)
[REVISED — moved from K1-5 to K1-6. Wording unchanged.
Tucker sign-off required.]

Step 1 (instructor, boardGrid, blue):
"The Hub has two viable signal routes. One is conditional. One
is not. The infrastructure requires both. Something downstream
needs to bring them back together. The board will not accept a
solution that ignores either path."

Step 2 (collector, tray Merger slot, amber):
"Two inputs. One output. Either is sufficient. Logging this
under redundancy infrastructure."
[codexEntryId: merger]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Merger accepts signal from either input.
Both paths lead to the same destination. The Hub does not care
which route the signal took. It cares that it arrived."

### Bridge (K1-7 Ore Processing)
[REVISED — wording unchanged from previous spec. Tucker
sign-off required.]

Step 1 (instructor, boardGrid, blue):
"Two signals on this board. Both need to reach their
destination. The board does not have room for both to go around
each other. Something on the board solves this without the
signals being aware of it."

Step 2 (collector, pre-placed Bridge, amber):
"Two paths. One cell. Neither interferes. I have been waiting
for something like this to catalog."
[codexEntryId: bridge]

Step 3: Codex opens automatically.

Step 4 (instructor resumes, boardGrid, blue):
"As I was saying. The Bridge allows two independent paths to
share one cell. Neither signal is aware of the other. Both are
correct. Route through it. Not around it."

---

## Codex Entries

### Piece Entries (unlock via collector tutorial steps)

**Splitter** [NEW — unlocks K1-3]
Category: Physics
Description: Divides a single signal path into two parallel
streams without amplification loss. Both outputs carry the
complete signal. Nothing is lost, nothing is reduced.
Function: One input, two simultaneous outputs. Signal is copied
not divided. Both outputs fire on the same pulse.
Importance: When a circuit must reach two destinations
simultaneously, or when redundancy is required, the Splitter
is the only option.
cogsNote: "The Splitter divides a single signal into two
parallel paths. Both carry the complete signal. Nothing is
lost, nothing is reduced. One input, two outputs. The piece
itself is straightforward. What is not straightforward is
committing to two complete routes simultaneously before either
one is finished. Plan both before you place either."
firstEncountered: KEPLER BELT -- K1-3 Junction 7
[Tucker sign-off required on cogsNote.]

NOTE: The Codex currently lists Splitter as firstEncountered
"A1-4 Propulsion Core." This is INCORRECT. Splitter never
appears in any Axiom level. Fix the Codex entry to read
"KEPLER BELT -- K1-3 Junction 7" when implementing this spec.

**Latch** [UNCHANGED — unlocks K1-4]
Category: Protocol
cogsNote: "Memory is the ability to be wrong later about what
was true earlier. This piece has that ability."
firstEncountered: KEPLER BELT -- K1-4 Mining Platform Alpha

**Merger** [UNCHANGED — unlocks K1-6]
Category: Physics
cogsNote: "Two paths returning to one. The machine remembers
where it started even when the signal forgot."
firstEncountered: KEPLER BELT -- K1-6 Colonist Hub

**Bridge** [UNCHANGED — unlocks K1-7]
Category: Physics
cogsNote: "Two signals occupy the same cell. Neither is aware
of this. Both are correct."
firstEncountered: KEPLER BELT -- K1-7 Ore Processing

### Location Entries (Codex "Locations" category)

The Codex Locations category currently shows 12 total, 1
unlocked. Kepler Belt levels should unlock location entries
as the player progresses through the sector. These entries
provide narrative depth without interrupting gameplay. They
unlock automatically on level completion (no collector step
needed for locations).

**Kepler Belt** [unlocks on K1-1 completion]
[NEW COPY — Tucker sign-off required.]
Name: Kepler Belt
Description: Former mining corridor. Mostly decommissioned.
Salvage claims and disputed territory define the region now.
The original mining operations closed when the ore yields
dropped below profitability thresholds. The infrastructure
remained. So did the colonists.
cogsNote: "The Axiom has transited this corridor before. The
nav system logged the route. No mission data was attached. I
have nothing to add to that."
Status: Unlocked on K1-1 completion.

**Junction 7** [unlocks on K1-3 completion]
[NEW COPY — Tucker sign-off required.]
Name: Junction 7
Description: Routing bottleneck in the central Kepler corridor.
Eleven settlements feed through this single relay point. The
original engineers underestimated the load requirements. The
colonists have been compensating for the shortfall manually for
years.
cogsNote: "Eleven settlements. One junction. The arithmetic is
not encouraging."
Status: Unlocked on K1-3 completion.

**Mining Platform Alpha** [unlocks on K1-4 completion]
[NEW COPY — Tucker sign-off required.]
Name: Mining Platform Alpha
Description: Decommissioned mining platform repurposed as a
signal relay by Kepler Belt colonists. Not designed for
communication infrastructure. Performing the function anyway.
Six years past decommission. No formal handover. No maintenance
contract. The colonists maintain it themselves.
cogsNote: "Repurposed equipment is either resourceful or
desperate. In this corridor the distinction is not always
clear."
Status: Unlocked on K1-4 completion.

**The Narrows** [unlocks on K1-9 completion]
[NEW COPY — Tucker sign-off required.]
Name: The Narrows
Description: The densest section of the Kepler Belt corridor.
Maximum signal interference due to compressed relay spacing and
residual electromagnetic activity from the mining era. The
colonists named it for what it does to communication. It has
another designation on older charts that COGS has chosen not to
use.
cogsNote: "The older designation is in my logs. I am using the
current one. The colonists earned the right to name their own
corridor."
Status: Unlocked on K1-9 completion.

**Central Hub** [unlocks on K1-10 completion]
[NEW COPY — Tucker sign-off required.]
Name: Central Hub
Description: The single routing nexus for the entire Kepler
Belt corridor. Every settlement, relay, and transit point
feeds through this infrastructure. Three hundred thousand
people depend on it. It is a single point of failure in a
region that cannot afford one. The original designers knew
this. Budget constraints made the decision for them.
cogsNote: "Single point of failure serving three hundred
thousand. That is not good design. It is, however, the current
situation. I find myself repeating that phrase in this corridor
more than I would prefer."
Status: Unlocked on K1-10 completion.

### Entity Entries (Codex "Entities" category)

The Codex Entities category currently shows 8 total, 2
unlocked (presumably COGS and The Engineer). Kepler Belt
introduces the first references to people who depend on the
Engineer's work. These entries unlock on specific level
completions.

**Kepler Colonists** [unlocks on K1-4 completion]
[NEW COPY — Tucker sign-off required.]
Name: Kepler Belt Colonists
Description: Approximately three hundred thousand people living
in settlements throughout the Kepler Belt corridor. They
remained after the mining operations closed. No formal
government. No registered economic framework in several
settlements. They maintain their own infrastructure, file no
repair requests, and compensate for failing systems manually.
cogsNote: "They did not file a formal repair request. They have
been compensating manually for at least two years. I find that
worth noting. Not because it is unusual. Because it is not."
Status: Unlocked on K1-4 completion (first consequence level,
where the human stakes become real).

**Transit Authority** [unlocks on K1-8 consequence]
[NEW COPY — Tucker sign-off required.]
Name: Kepler Belt Transit Authority
Description: The administrative body responsible for corridor
traffic regulation and infrastructure compliance. They filed a
negligence inquiry against the Axiom following the first
infrastructure failure. Their jurisdiction is nominal. Their
record-keeping is thorough.
cogsNote: "The transit authority has opinions about our work.
Their opinions are documented. I recommend we resolve the
inquiry through competence rather than correspondence."
Status: Unlocked on K1-8 consequence trigger (transit gate
failure). If the player completes K1-8 without failing, this
entry remains locked until K1-10 consequence (which references
the same authority).

---

## COGS Lines (All Levels)

All COGS lines sourced from NARRATIVE.md Part Six, Sector 1.
No changes to approved lines. Listed here for reference.

| Level | COGS Line | Eye State |
|-------|-----------|-----------|
| K1-1 | "Kepler Belt. Former mining corridor, mostly decommissioned. Some salvage activity remains. We have been here before. The charts confirm it." | BLUE |
| K1-2 | "The primary relay chain out here was built to last. It has lasted past the people responsible for maintaining it. That is a common condition in this corridor." | BLUE |
| K1-3 | "Junction 7 is a routing bottleneck. Eleven settlements feed through this point. The original engineers underestimated the load. It is not the last time that has happened out here." | BLUE |
| K1-4 | "Mining Platform Alpha has been decommissioned for six years. The colonists use it as a signal relay. It was not designed for this purpose. It is doing the job anyway." | BLUE |
| K1-5 | "The resupply chain for this region runs through four independent relay nodes. All four are degraded. The colonists have been compensating manually for at least two years. They have not filed a formal repair request. I find that worth noting." | BLUE |
| K1-6 | "The Colonist Hub coordinates resupply for thirty-one settlements. It is running on equipment that should have been replaced three cycles ago. The people depending on it do not have the option of waiting for something better." | AMBER |
| K1-7 | "The ore processing relay is still active. There is no active mining in this corridor. Something is still transmitting on the processing frequency. I have not identified the source. It is not relevant to the current objective." | AMBER |
| K1-8 | "The transit gate regulates traffic flow through the entire corridor. It has not been updated since the mining operations closed. It is routing ghost traffic from ships that no longer exist. I find that inefficient and something else I will not specify." | BLUE |
| K1-9 | "The Narrows is the densest section of the corridor. Maximum signal interference. The colonists call it The Narrows because of what it does to communication. It has another name on older charts. I will use the current one." | BLUE |
| K1-10 | "The Central Hub. Everything in this corridor routes through here. If it holds, the corridor holds. Three hundred thousand people depend on infrastructure that runs through a single point. That is not good design. It is, however, the current situation." | AMBER |

All lines are [PROPOSED] per NARRATIVE.md. Tucker sign-off
required on all.

---

## New Copy Inventory

The following copy is NEW and does not appear in NARRATIVE.md.
All requires Tucker sign-off before implementation.

### REQUISITION Store tutorial (K1-1):
- Step 3: "The tray contains the minimum..."
- Step 4: "Three categories. PHYSICS for signal path..."
- Step 5: "Anything requisitioned but not used..."

### Purchasable tape hint (K1-3):
- Step 5: "The INFRA tab in the REQUISITION store..."

### Tutorial steps (new or revised):
- K1-1 Step 1 and 2 [REVISED wording]
- K1-3 Steps 1, 2, 4 [NEW — Splitter introduction]
- K1-4 Steps 1, 4 [REVISED — board context changed]
- K1-5 Steps 1, 2 [NEW — damaged cells introduction]
- K1-6 Step 1 [REVISED — requirement mechanic context]
- K1-7 Step 4 [REVISED — minor: "Route through it. Not around it."]
- K1-8 Steps 1, 2 [NEW — two-terminal introduction]
- K1-10 Steps 1, 2 [REVISED — boss framing]

### Codex entries (all new):
- Splitter cogsNote (revised from incorrect Codex entry)
- All Location entries (Kepler Belt, Junction 7, Mining
  Platform Alpha, The Narrows, Central Hub)
- All Entity entries (Kepler Colonists, Transit Authority)
- All Location/Entity cogsNotes

### Piece requirement rejection reasons:
- K1-6 Merger requirement reason
- K1-9 Latch and Splitter requirement reasons
- K1-10 Latch and Scanner requirement reasons

---

## Prerequisites Verified

By K1-10 completion, player has demonstrated:
[x] A machine must produce correct output for any valid input
    (K1-4 through K1-10 all use non-trivial tapes)
[x] Memory can be written and read dynamically across pulses
    (K1-4 introduces, K1-5 through K1-10 require)
[x] A single stored value (Latch) can influence multiple
    decisions (K1-8, K1-9, K1-10)
[x] Parallel paths can serve different purposes simultaneously
    (K1-3 introduces Splitter, K1-6 adds Merger, K1-8 adds
    two-terminal)
[x] The difference between a solution and an algorithm
    (K1-9 XOR, K1-10 consecutive detection)
[x] Routing around obstacles (K1-5 damaged cells, reinforced
    through K1-6, K1-7, K1-8, K1-9, K1-10)
[x] Signal can reach multiple destinations (K1-8 two-terminal)
[x] Credit investment drives machine quality (K1-1 introduces,
    all levels reinforce through scoring)
[x] Planning purchases before building (one-time requisition
    window, reinforced every level)

These match the prerequisites required before Nova Fringe
unlocks per TEACHING_PROGRESSION.md.

---

## Known Bugs to Fix During Implementation

1. **Codex Splitter entry**: Currently lists firstEncountered
   as "THE AXIOM -- A1-4 Propulsion Core". This is incorrect.
   Splitter never appears in any Axiom level. Update to
   "KEPLER BELT -- K1-3 Junction 7" in both CodexScreen.tsx
   and CodexDetailView.tsx.

2. **Previous spec said "No wires"**: The previous spec
   Overview stated "No wires or placement highlights." This
   was incorrect. Wires (dashed connection lines) render on
   ALL sectors per CLAUDE.md decisions. Only placement
   highlights are removed. Corrected in v2.

---

## Implementation Notes

- Replace current 10 Kepler levels with revised 10 levels
- Sector string: 'kepler' (unchanged)
- KEPLER_LEVELS array: all 10 in order
- pieceCounter: start at 800, increment by 10 per level
- Wires ON, placement highlights OFF
- All COGS lines from NARRATIVE.md (K1-1 through K1-10)
- New LevelDefinition fields required:
  - damagedCells: Array<{ gridX: number; gridY: number }>
  - requiredPieces: Array<{ type: string; count: number;
    reason?: string }>
  - creditBudget: number
  - freeTapes: TapeType[]
  - purchasableTapes?: TapeType[]
  - depthCeiling: number
  - baseReward: number
  - Existing fields already needed: computationalGoal,
    conceptTaught, prerequisiteConcept, tapeDesignRationale,
    difficultyBand, narrativeFrame
- Engine changes required:
  1. Damaged cell placement rejection + rendering
  2. Piece requirement pre-engage validation + rejection modal
  3. Multi-terminal success condition (all Terminals must lock)
  4. Partial terminal success visual feedback
  5. REQUISITION store UI (expanding tray, three tabs, purchase
     flow, one-time window)
  6. Purchased piece tracking (for scoring + forfeiture)
  7. Tape purchase flow (INFRA tab)
  8. Forfeiture logic (unused purchased pieces lost on
     completion/failure)
  9. Credit budget display and deduction
  10. Scoring Algorithm v2 integration (six categories, gates)
- Codex additions:
  - 5 Location entries (unlock on level completion)
  - 2 Entity entries (unlock on level completion / consequence)
  - Fix Splitter firstEncountered
- Tutorial system: existing 4-step pattern supports all new
  piece introductions. K1-1 adds 3 new steps for REQUISITION
  store tutorial. K1-3 adds 1 step for purchasable tape hint.

---

## Scoring Verification Per Level

Floor-solve ceiling verification for each level (per Scoring
Algorithm v2 REQ-32):

All levels:
  Completion: 25 (perfect lock)
  Path Integrity: 15 (all pre-assigned pieces active)
  Signal Depth: 0 (gated — no purchased active pieces)
  Investment: 0 (nothing purchased)
  Diversity: 0 (gated — no purchased active pieces)
  Discipline: max 5 (rawDiscipline * 0.5)

  Maximum floor solve: 25 + 15 + 0 + 0 + 0 + 5 = 45.

This holds structurally for all 10 levels. The floor-solve
ceiling is within the 1-star band (30-54) regardless of how
well the pre-assigned pieces are used.

---

## Future Sector Notes

Kepler Belt is the first sector with the REQUISITION store and
credit economy. The mechanic is introduced gently here:

- Purchasable tapes are limited to K1-1 and K1-3 (reach_output
  levels) because most Kepler levels need all tapes for the
  floor solve
- Pre-assigned trays are reasonably generous (floor solve
  minimum with slight routing flexibility)
- Credit budgets allow meaningful investment without requiring
  it for completion

Nova Fringe (Sector 2) and later sectors will:
- Design more levels with reach_output floor solves, making
  purchasable tapes a central mechanic
- Reduce pre-assigned tray sizes (fewer free pieces, more
  must be purchased)
- Eventually reach levels with zero pre-assigned pieces (all
  must be purchased)
- Introduce higher tape prices or tiered infrastructure

---

END OF kepler-belt-levels.md v3
