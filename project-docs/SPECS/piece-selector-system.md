# PIECE SELECTOR SYSTEM — BEHAVIORAL REQUIREMENTS SPEC
### RFC 2119 Formal Spec | The Axiom | April 2026

---

## STATUS

APPROVED (with amendments). Tucker Brady resolved all open
questions on 2026-04-29. Amendments inline below.

Covers: Phase B Piece Selector — REQUISITION store (pre-gameplay
purchasing) and Arc Wheel (gameplay placement). Kepler Belt sector
onward.

Depends on: scoring-algorithm-v2.md (economy fields, pricing,
forfeiture rules), COMPUTATIONAL_MODEL.md (piece vocabulary,
expanding tray philosophy).

---

## DEFINITIONS

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in
this document are to be interpreted as described in RFC 2119.

**REQUISITION phase:** The one-time pre-gameplay purchasing window
where the Engineer buys pieces and tape infrastructure using
credits.

**PLACEMENT phase:** The gameplay phase where the Engineer places
pieces from inventory onto the board using the Arc Wheel.

**Pre-assigned piece:** A piece included in the level's
availablePieces array. Free. Already in inventory at level start.

**Requisitioned piece:** A piece purchased during the REQUISITION
phase using credits. Added to inventory alongside pre-assigned
pieces.

**Arc Wheel:** The persistent vertical piece selector used during
the PLACEMENT phase. iOS camera zoom-dial style.

**Inventory:** The combined set of pre-assigned and requisitioned
pieces available for placement during gameplay.

**Credit budget:** The maximum credits the Engineer may spend
during the REQUISITION phase for a given level, defined by
creditBudget in the LevelDefinition.

**Forfeiture:** Requisitioned pieces remaining in inventory (not
placed on the board) at level completion or failure are lost.
Credits are not refunded.

---

## PART 1 — SYSTEM OVERVIEW

### 1.1 Two-Phase Architecture

REQ-1: The piece selector system MUST operate in two sequential
phases: REQUISITION (pre-gameplay) followed by PLACEMENT
(gameplay). These phases MUST NOT overlap.

REQ-2: The REQUISITION phase MUST complete and close before the
PLACEMENT phase begins. There MUST be no mechanism to reopen the
REQUISITION store once it has been confirmed.

REQ-3: The PLACEMENT phase MUST begin immediately after the
REQUISITION-to-PLACEMENT transition sequence completes.

### 1.2 Sector Gating

REQ-4: The REQUISITION store and Arc Wheel MUST NOT appear in
Axiom sector levels (isTutorial: true). Axiom levels MUST
continue to use the existing tray model.

REQ-5: The REQUISITION store and Arc Wheel MUST be available from
Kepler Belt (K1-1) onward for all story levels and daily
challenges.

---

## PART 2 — REQUISITION PHASE

### 2.1 Store Structure

REQ-6: The REQUISITION store MUST appear as a tabbed slide-up
panel anchored to the bottom of the screen, overlaying the board.

REQ-7: The store MUST have exactly four category tabs:

| Tab | Label | Color | Contents |
|-----|-------|-------|----------|
| 1 | PHYSICS | #F0B429 (amber) | Physics pieces |
| 2 | PROTOCOL | #00D4FF (cyan) | Protocol pieces |
| 3 | DATA | #8B5CF6 (purple) | Tape capacity (nibbles) |
| 4 | INFRA | #8B5CF6 (purple) | Other infrastructure (future) |

AMENDMENT (Tucker 2026-04-29): Tab order MUST be dynamic. The tab
matching the Engineer's discipline MUST appear leftmost. Discipline
mapping: Systems Architect = PROTOCOL, Drive Engineer = PHYSICS,
Field Operative = PHYSICS (default). Remaining tabs follow in
standard order after the discipline tab.

REQ-7a: The store MUST default to the Engineer's discipline tab
on first open (not always PHYSICS).

REQ-8: Tab labels and borders MUST use the category color defined
in REQ-7. Active tab MUST be visually distinct from inactive tabs.

### 2.2 Store Visual States

REQ-9: The store MUST have two visual states:

**Collapsed:** A single row showing the active tab's pieces with
a swipe-up affordance (chevron or drag handle). The board remains
mostly visible behind the collapsed store.

**Expanded:** The full store panel slides up over the board,
displaying all purchasable items in the active tab with quantity
selectors and pricing.

REQ-10: The store MUST default to the collapsed state on first
appearance.

REQ-11: The Engineer MUST be able to transition between collapsed
and expanded states via swipe gesture (swipe up to expand, swipe
down to collapse) or by tapping the drag handle.

### 2.3 Piece Display and Purchasing

REQ-12: Each tab MUST display all pieces in that category that
the Engineer has discovered in the Codex and that are available
for the current level.

REQ-13: Each purchasable piece MUST display:
- Piece icon (rendered via PieceIcon component)
- Piece name
- Unit price in credits (CR)
- Quantity selector (+/- buttons)
- Current quantity selected (default 0)

REQ-14: Pre-assigned pieces MUST appear in their respective
category tab with a "FREE" label. Pre-assigned pieces MUST NOT
have quantity selectors and MUST NOT be purchasable (they are
already in inventory).

REQ-15: The quantity selector MUST enforce a minimum of 0 and
MUST NOT allow the total spend to exceed creditBudget.

REQ-16: Tapping the + button when the purchase would exceed
creditBudget MUST be a no-op. The + button SHOULD appear
visually disabled (reduced opacity) when adding one more unit
would exceed the budget.

### 2.4 Piece Pricing

REQ-17: Piece prices MUST be as follows:

**Physics pieces:**

| Piece | Base Price (CR) |
|-------|----------------|
| Conveyor | 10 |
| Gear | 10 |
| Splitter | 15 |
| Merger | 15 |
| Bridge | 20 |

**Protocol pieces:**

| Piece | Base Price (CR) |
|-------|----------------|
| Config Node | 20 |
| Scanner | 20 |
| Transmitter | 20 |
| Inverter | 25 |
| Counter | 25 |
| Latch | 25 |

**Tape infrastructure (AMENDMENT — nibble pricing):**

| Item | Price (CR) | Unit |
|------|-----------|------|
| Any tape nibble | 20 | per nibble (4 cells) |

Note: The previous 40 CR per tape is replaced. Tapes are now
purchased in nibble increments. 2 nibbles = 1 byte = 8 cells = 40 CR
(equivalent to the old price for a full tape).

REQ-18: Discipline discounts MUST apply: 20% discount on pieces
matching the Engineer's discipline category (Physics pieces for
Drive Engineer, Protocol pieces for Systems Architect, both at
10% for Field Operative). Discounted prices MUST be displayed
with the original price struck through and the discounted price
adjacent.

REQ-19: Discounted prices MUST be rounded to the nearest integer
using standard rounding (0.5 rounds up).

### 2.5 Infra Tab

AMENDMENT (Tucker 2026-04-29): Tape infrastructure is now sold
in NIBBLES (4 cells per nibble). The Engineer selects tape type
and quantity of nibbles. This replaces the binary tape purchase
model from Phase A.

REQ-20: The DATA tab MUST display tape types available for
purchase as listed in the level's purchasableTapes array. Each
tape type MUST have a +/- quantity selector for nibbles.

REQ-20a: One nibble equals 4 tape cells. Tape capacity MUST be
sold exclusively in nibble increments. Partial nibbles are not
permitted.

REQ-20b: Nibble price MUST be 20 CR per nibble for all tape
types (TRAIL, OUT). Discipline discounts (REQ-18) do NOT apply
to tape purchases.

REQ-20c: The DATA tab MUST display for each tape type:
- Tape type label (TRAIL, OUT)
- Brief description ("Working memory — persists between pulses"
  for TRAIL, "Records machine output" for OUT)
- Price per nibble (20 CR)
- +/- quantity selector (nibbles)
- Total cells resulting from selection (quantity x 4)

REQ-21: If a tape type is listed in the level's freeTapes array,
it MUST NOT appear in the DATA tab as purchasable. Free tapes
are provided at the level's default capacity.

REQ-22: The IN tape MUST NEVER appear in the DATA tab. IN tape
is always provided (per COMPUTATIONAL_MODEL.md).

REQ-22a: Tapes are their own category on the Arc Wheel during
the PLACEMENT phase, displayed with purple (#8B5CF6) borders.
Tape pieces on the Arc Wheel are sorted by type (TRAIL before
OUT), not by price.

### 2.6 Budget Display

REQ-24: The store MUST display at all times (both collapsed and
expanded states):
- Total credits available (creditBudget)
- Credits spent so far (running sum of all selected quantities
  times their prices)
- Credits remaining (creditBudget minus credits spent)

REQ-25: Credits remaining MUST update in real time as the
Engineer adjusts quantities.

REQ-26: If credits remaining reaches 0, all + buttons across
all tabs MUST be disabled.

### 2.7 Warning and Confirmation

REQ-27: The store MUST display a persistent warning in red text
(#FF4444 or equivalent high-visibility red) stating that the
store closes permanently after confirmation and the Engineer has
one chance to make all purchases. RECOMMENDED text (subject to
Tucker sign-off): "This store closes after confirmation.
Requisition carefully."

REQ-28: The store MUST include a REQUISITION button that confirms
all purchases. This button MUST be visually prominent and require
an explicit tap (no swipe, no hold).

REQ-29: Tapping the REQUISITION button MUST:
1. Deduct total spend from the Engineer's credit balance
2. Add all requisitioned pieces to the inventory
3. Activate any purchased tape infrastructure for the level
4. Close the store permanently for this level attempt
5. Begin the REQUISITION-to-PLACEMENT transition (REQ-65)

REQ-30: If the Engineer has selected zero purchases, tapping the
REQUISITION button MUST still close the store and begin the
transition. A zero-purchase REQUISITION is valid — the Engineer
may choose to attempt a floor solve.

REQ-31: There MUST be no "cancel" or "undo" mechanism after
the REQUISITION button is tapped. The purchase is final.

### 2.8 Budget Enforcement

REQ-32: The system MUST enforce creditBudget as a hard cap. At
no point during the REQUISITION phase SHALL the total spend
exceed creditBudget.

REQ-33: If the Engineer does not have sufficient credits in
their balance to cover the total spend, the REQUISITION button
MUST be disabled. The system MUST display a message indicating
insufficient credits.

REQ-34: creditBudget is a per-level spending limit, not a global
wallet cap. It defines the maximum the Engineer may spend on
this level, regardless of total credit balance.

---

## PART 3 — PLACEMENT PHASE (ARC WHEEL)

### 3.1 Arc Wheel Structure

REQ-35: The Arc Wheel MUST be a persistent vertical arc-shaped
piece selector displayed on the right side of the screen (default
position).

REQ-36: The Arc Wheel MUST use an iOS camera zoom-dial visual
style: a pill-shaped track with pieces arranged as nodes along
the curve.

REQ-37: Pieces MUST be arranged along the arc with the selected
piece at the midpoint. The selected piece MUST be displayed at
the largest size and full opacity. Pieces above and below the
midpoint MUST recede with decreasing size and opacity
proportional to their distance from the midpoint.

REQ-38: The Arc Wheel MUST display all pieces currently in
inventory (pre-assigned and requisitioned combined). Pieces that
have been placed on the board MUST be removed from the Arc Wheel.
Pieces returned to inventory (via long-press removal) MUST
reappear in the Arc Wheel.

### 3.2 Arc Wheel Visual States

REQ-39: The Arc Wheel MUST have two visual states:

**IDLE:** Low opacity (15-20% fill), ghosted piece silhouettes,
thin pill track. The Arc Wheel is visible but unobtrusive.

**ACTIVE:** On touch, the Arc Wheel MUST snap to full contrast.
Pieces MUST pop to full size within the arc layout. Corner
brackets MUST appear on the currently selected piece. The
transition from IDLE to ACTIVE MUST be immediate (no delay).

REQ-40: The Arc Wheel MUST return to IDLE state after 2 seconds
of no touch interaction.

### 3.3 Color Coding

REQ-41: Pieces in the Arc Wheel MUST be visually distinguished
by acquisition source:

| Border Color | Meaning |
|-------------|---------|
| #F0B429 (amber) | Pre-assigned piece |
| #00D4FF (cyan) | Requisitioned piece |
| #8B5CF6 (purple) | Tape infrastructure |

REQ-42: The border color MUST be applied to the piece node in
the Arc Wheel, not to the piece icon itself. PieceIcon rendering
MUST remain unchanged.

### 3.4 Navigation

AMENDMENT (Tucker 2026-04-29): Arc Wheel piece ordering MUST be
sorted by category first, then by price (ascending) within each
category. Category order: Physics, Protocol, Data (tapes). Tapes
are their own category on the wheel, sorted by type (TRAIL before
OUT). This groups related pieces together and puts cheaper options
first within each group.

REQ-43: The Engineer MUST be able to browse inventory by swiping
up/down along the arc. Swiping MUST scroll the piece list,
advancing the midpoint selection.

REQ-44: Scrolling MUST wrap around if the inventory contains
more pieces than can be displayed simultaneously. The scroll
SHOULD have momentum and deceleration consistent with platform
conventions.

REQ-45: If inventory is empty (all pieces placed), the Arc Wheel
MUST display an empty state — the pill track with no piece nodes.

### 3.5 Dismiss and Recall

REQ-46: The Engineer MUST be able to dismiss the Arc Wheel via
an edge swipe to the right (swipe toward screen edge). The Arc
Wheel MUST slide off screen with a smooth animation.

REQ-47: When dismissed, a thin strip (approximately 4-6pt wide)
MUST remain visible along the right edge as a recall affordance.

REQ-48: The Engineer MUST be able to recall the Arc Wheel via
an edge swipe from the right (swipe from screen edge toward
center). The Arc Wheel MUST slide in from the right with a
smooth animation.

REQ-49: Dismiss and recall animations MUST use cubic-bezier
easing and MUST be at least 0.3 seconds duration.

### 3.6 Position Configurability

REQ-50: The Arc Wheel MUST default to the right side of the
screen.

REQ-51: A setting MUST be available in the Settings menu under a
"Controls" or "Layout" section allowing the Engineer to switch
the Arc Wheel to the left side of the screen.

REQ-52: Left-side configuration MUST mirror the right-side layout
exactly (dismiss swipe becomes left edge swipe, recall swipe
becomes swipe from left edge).

REQ-53: When configured for the left side, the Arc Wheel MUST
include a grab handle or slight inset (minimum 16pt from screen
edge) to avoid conflict with the iOS back-swipe gesture.

REQ-54: Top and bottom position options MUST NOT be provided.

---

## PART 4 — PLACEMENT INTERACTIONS

### 4.1 Method 1: Tap-to-Place

REQ-55: The Engineer MUST be able to place a piece by:
1. Tapping a piece on the Arc Wheel to select it (the piece
   becomes the midpoint selection with corner brackets)
2. Tapping an empty, valid cell on the board to place it

REQ-56: When a piece is selected via tap, valid placement cells
on the board SHOULD highlight using the existing placement
highlight system (orange valid-cell indicators, Axiom sector
only per CLAUDE.md; Kepler and beyond use wire rendering only).

REQ-57: Tapping an invalid cell (occupied, damaged, out of
bounds) while a piece is selected MUST be a no-op. The selection
MUST persist.

REQ-58: Tapping a different piece on the Arc Wheel while one is
already selected MUST change the selection to the newly tapped
piece.

### 4.2 Method 2: Drag-to-Place

REQ-59: The Engineer MUST be able to place a piece by pressing
and holding a piece on the Arc Wheel, then dragging it directly
onto a board cell.

REQ-60: During an active drag:
- A ghost piece preview MUST follow the Engineer's finger at
  all times
- Valid cells MUST highlight when the ghost hovers over them
- Invalid cells MUST NOT highlight
- The Arc Wheel MUST collapse to a thin strip (matching the
  dismissed state, REQ-47) to maximize board visibility
- The ghost piece MUST be rendered at the same size as a placed
  board piece, using PieceIcon

REQ-61: On successful drop (finger lifts over a valid cell):
- The piece MUST snap into the cell with a spring-snap animation
  (overshoot + settle, duration 0.3-0.5s)
- The piece MUST be removed from inventory/Arc Wheel
- The Arc Wheel MUST return to full size from its collapsed state

REQ-62: On cancelled drop (finger lifts over an invalid location
or off the board):
- The ghost piece MUST rubber-band back to the Arc Wheel with
  an elastic animation (duration 0.3-0.5s)
- The piece MUST remain in inventory
- The Arc Wheel MUST return to full size from its collapsed state

REQ-63: The drag interaction MUST use a press-and-hold threshold
of 150-250ms before initiating drag mode. A quick tap MUST NOT
initiate a drag (it selects per REQ-55).

### 4.3 Piece Removal

REQ-64: Long-press on a placed piece on the board MUST return
the piece directly to the Arc Wheel inventory. No ghost state.
No confirmation. This is existing behavior and MUST NOT change.

---

## PART 5 — TRANSITION SEQUENCE

REQ-65: Upon REQUISITION confirmation (REQ-29), the following
transition sequence MUST play:

| Step | Description | Duration |
|------|-------------|----------|
| 1 | Store panel collapses downward and off screen | 0.6s |
| 2 | Board powers up (subtle pulse/glow animation) | 0.6s |
| 3 | Arc Wheel enters from right with staggered piece entrance | 0.8s |
| 4 | "PLACEMENT PHASE" flash text at screen center | 0.6s |

REQ-66: The total transition duration MUST be approximately 2.2
seconds. Individual step durations MAY be adjusted for cinematic
feel but each step MUST be at least 0.6 seconds (per CLAUDE.md
animation minimum).

REQ-67: All transition animations MUST use cubic-bezier easing.
Linear easing MUST NOT be used.

REQ-68: The staggered piece entrance (step 3) MUST animate pieces
individually with a 50-100ms delay between each piece appearing
on the arc, starting from the midpoint and alternating above/below.

REQ-69: The "PLACEMENT PHASE" flash text MUST fade in, hold
briefly, and fade out. It MUST NOT require interaction to dismiss.

REQ-70: During the transition sequence, board interaction MUST be
disabled. The Engineer MUST NOT be able to place pieces until the
transition completes.

---

## PART 6 — FORFEITURE

REQ-71: On level completion (lock), any requisitioned pieces
remaining in the Arc Wheel inventory (not placed on the board)
MUST be forfeited. Credits spent on forfeited pieces MUST NOT be
refunded.

REQ-72: On level failure (void), any requisitioned pieces
remaining in the Arc Wheel inventory MUST be forfeited. Credits
spent on forfeited pieces MUST NOT be refunded.

REQ-73: Pre-assigned pieces remaining in the Arc Wheel MUST NOT
be subject to forfeiture. Pre-assigned pieces have no credit cost.

REQ-74: The results screen SHOULD display a forfeiture summary
if any requisitioned pieces were forfeited, showing piece names
and total credits lost. This serves as feedback reinforcing the
"buy what you need, use what you buy" principle.

REQ-75: Forfeited pieces MUST NOT affect scoring. Scoring operates
on placed pieces only (per scoring-algorithm-v2.md REQ-43).

---

## PART 7 — DATA MODEL AND INTEGRATION

### 7.1 LevelDefinition Fields

REQ-76: The LevelDefinition type MUST include the following
economy fields (already defined in types.ts):

freeTapes?: ('IN' | 'TRAIL' | 'OUT')[];
purchasableTapes?: ('TRAIL' | 'OUT')[];
creditBudget?: number;
depthCeiling?: number;
baseReward?: number;

REQ-77: For Kepler Belt levels and beyond, creditBudget MUST be
defined. If creditBudget is undefined or 0, the REQUISITION store
MUST NOT appear for that level.

REQ-78: freeTapes MUST default to ['IN'] if not specified.

### 7.2 Requisition State

REQ-79: The system MUST maintain a RequisitionState during the
REQUISITION phase:

type RequisitionState = {
  purchases: Array<{
    type: PieceType | 'TRAIL_TAPE' | 'OUT_TAPE';
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalSpend: number;
  creditBudget: number;
  confirmed: boolean;
};

REQ-80: RequisitionState MUST be initialized when the REQUISITION
store opens and MUST persist until level completion or failure.

### 7.3 Inventory State

REQ-81: The system MUST maintain an InventoryState during the
PLACEMENT phase:

type InventoryState = {
  pieces: Array<{
    id: string;
    type: PieceType;
    source: 'preAssigned' | 'requisitioned';
    placed: boolean;
  }>;
  tapes: {
    in: boolean;
    trail: boolean;
    out: boolean;
  };
};

REQ-82: When a piece is placed on the board, its placed flag
MUST be set to true. When removed via long-press, it MUST be
set back to false.

### 7.4 Scoring Integration

REQ-83: The success handler (successHandlers.ts) MUST pass the
following from RequisitionState to calculateScore:
- purchasedTapeTypes: array of tape types purchased AND utilized
- The board state distinguishes pre-assigned from purchased pieces
  via the availablePieces array comparison

REQ-84: calculateScore already accepts purchasedTapeTypes as a
parameter (scoring.ts). The REQUISITION system MUST populate this
parameter.

REQ-85: A purchased TRAIL tape MUST be considered "utilized" if
any Scanner or Capacitor wrote to the Data Trail during
execution. A purchased OUT tape MUST be considered "utilized" if
any Transmitter wrote to the output tape during execution.

### 7.5 Piece Pricing Constants

REQ-86: Piece prices MUST be defined as a constant map:

PIECE_PRICES: conveyor 10, gear 10, splitter 15, merger 15,
bridge 20, configNode 20, scanner 20, transmitter 20,
inverter 25, counter 25, latch 25.

NIBBLE_PRICE = 20 CR per nibble (4 cells).
CELLS_PER_NIBBLE = 4.

REQ-87: Discipline discounts MUST be applied using the constant
map as the base price. Discount rate (20% in-category, 10% Field
Operative) MUST be defined as a named constant.

---

## PART 8 — ANIMATION SPECIFICATIONS

### 8.1 General Animation Rules

REQ-88: All animations MUST use useNativeDriver: false.

REQ-89: All animations MUST use cubic-bezier easing. RECOMMENDED:
cubic-bezier(0.25, 0.1, 0.25, 1.0) for standard transitions,
cubic-bezier(0.34, 1.56, 0.64, 1) for spring-snap effects.

### 8.2 Specific Animations

REQ-90: Store expand/collapse: slide motion (0.3-0.5s).
REQ-91: Tab switching: cross-fade (0.2-0.3s).
REQ-92: Quantity change: pulse piece icon + running total (0.15s up, 0.15s settle).
REQ-93: Arc Wheel dismiss/recall: horizontal translate with easing (0.3-0.5s).
REQ-94: Arc Wheel scroll: momentum physics matching platform deceleration.

---

## PART 9 — ACCESSIBILITY

REQ-95: All store items MUST have accessible labels.
REQ-96: +/- buttons MUST announce new quantity.
REQ-97: Arc Wheel MUST support VoiceOver/TalkBack.
REQ-98: Tap-to-place MUST always be available (drag is not accessible to all users).

### 9.2 Haptic Feedback

REQ-98a: Light impact on scroll snap, medium impact on placement.
REQ-98b: Use platform native haptic engine.

---

## PART 10 — EDGE CASES

REQ-99: creditBudget 0 = skip REQUISITION, go straight to PLACEMENT.
REQ-100: Empty pre-assigned set = store still works, Engineer must buy everything.
REQ-101: Retry = REQUISITION reopens fresh. Previous purchases not carried over.
REQ-102: Retry credit balance reflects prior forfeiture.
REQ-103: Insufficient credits = store still opens, zero-purchase allowed.
REQ-104: Daily challenges use same system when creditBudget > 0.
REQ-105: Only Codex-discovered pieces appear in store.
REQ-106: Arc Wheel non-interactive during signal execution.
REQ-107: Multiple same-type pieces = separate nodes, not a stack.

---

## PART 12 — RESOLVED QUESTIONS (Tucker 2026-04-29)

1. Store default tab: discipline tab, leftmost. Field Operative = PHYSICS.
2. Haptics: light on scroll snap, medium on place/drop.
3. No confirmation dialog. COGS teaches it in tutorial.
4. Forfeiture: text summary only.
5. Arc wheel ordering: category first, price ascending within.
6. Sound design: deferred.

TAPE NIBBLE MECHANIC: 4 cells = 1 nibble, 20 CR per nibble.
Engineer selects tape type and quantity of nibbles.

---

END OF PIECE SELECTOR SYSTEM SPECIFICATION
