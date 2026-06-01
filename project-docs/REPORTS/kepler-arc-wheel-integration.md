# ARC WHEEL — KEPLER BELT INTEGRATION SPEC

### Canonical Behavioral / Tutorial / Animation / Accessibility Spec for the Kepler Belt Rebuild

Author: Arc Wheel Integration specialist
Date: 2026-05-31
Status: DRAFT FOR TUCKER REVIEW
Scope: Load-bearing. The Arc Wheel debuts at K1-1 and is the primary piece-selection model for every Kepler-and-later level. Axiom keeps the PieceTray (with the documented exception that Axiom new-piece tutorial levels render a focus-filtered Arc Wheel). All player-facing copy below is flagged PROPOSED and requires Tucker sign-off before any line lands.

Source files audited (read-only):
- `src/components/gameplay/ArcWheel.tsx` (current implementation, 521 lines)
- `src/screens/GameplayScreen.tsx` (integration / render gating)
- `src/store/requisitionStore.ts` (inventory + phase model)
- `src/game/levels.ts` (A1-1..A1-8 and K1-1..K1-10 definitions)
- `src/game/engagement/requiredPiecesDialogue.ts` (requiredPieces enforcement copy)
- `project-docs/SPECS/arc-wheel-tutorial.md` (APPROVED — Axiom codex rework)
- `project-docs/SPECS/tray-to-arc-wheel-rename.md`
- `docs/LEVEL_DESIGN_FRAMEWORK.md`, `docs/ANIMATION_RULES.md`
- `project-docs/REPORTS/ARC_WHEEL_DEV_ANALYSIS.md`, `ARC_WHEEL_UX_ANALYSIS.md`, `qa-arc-wheel-tutorial.md`

---

## 0. ARCHITECTURE BASELINE (what exists today)

The current `ArcWheel` is a vertical pill anchored to a screen edge (`side: 'left' | 'right'`, driven by `useSettingsStore.arcWheelPosition`). It renders a windowed slice of up to 5 nodes centered on `selectedIndex`, with fish-eye depth scaling (selected node largest at `NODE_SIZE_MAX = 52`, neighbors shrink by `scaleFactor` and fade by `distanceOpacity`). State:

- `dismissed`, `isActive`, `selectedIndex`, `isDragging` (component-local React state)
- 14 `Animated.Value`s, all `useNativeDriver: false` (confirmed line-by-line): `slideAnim`, `idleAnim`, `entranceY[0..4]`, `entranceOpacity[0..4]`, plus two inline fallbacks.
- Two `PanResponder`s: `scrollPan` (vertical swipe cycles `selectedIndex` with wrap-around + `hapticLight()` per step) and `dismissPan` (horizontal swipe past `DISMISS_THRESHOLD = 40` slides the pill off, leaving a `RECALL_STRIP_W = 5` recall strip).
- Idle behavior: after `ACTIVE_TIMEOUT_MS = 2000` the pill fades to `IDLE_OPACITY = 0.18`; any touch re-activates to full opacity.
- Drag: `onPressIn` starts a `DRAG_HOLD_MS = 180` timer; if the hold completes without a competing tap, `onDragStart` fires with the piece id/type and the press's screen coordinates.

Integration in `GameplayScreen`:
- Kepler+ placement phase: rendered when `!isAxiomLevel && requisitionPhase === 'placement' && !isExecuting && !showResults && !showVoid`. Fed by `arcWheelPieces = inventory.pieces.filter(p => !p.placed)`.
- Axiom new-piece levels: rendered when `isAxiomLevel && !isExecuting && ...`, filtered to the `tutorialFocusPiece`, with `mainNodeRef` wired for COGS-orb targeting.
- `handleDragEnd(x, y)` converts screen coords to a grid cell, rejects out-of-bounds / occupied / blown cells, and on success calls `placePiece` then either `tutorialOnPiecePlaced` (Axiom) or `placeInventoryPiece` (Kepler).

The `requisitionStore` models the one-time requisition window as a phase machine: `requisition -> transitioning -> placement`. Inventory is built from `availablePieces` (source `preAssigned`) plus confirmed purchases (source `requisitioned`), sorted by `arcWheelSortKey` (category, then price ascending). Tapes (IN free, TRAIL/OUT free-or-purchased) are tracked separately and are NOT Arc Wheel nodes despite `ArcWheelPiece.isTape` and `TAPE_COLOR` existing in the component — see Open Question Q7.

---

## 1. BEHAVIORAL CONTRACT

This section is the normative contract. RFC 2119 keywords (MUST / SHOULD / MAY) are load-bearing.

### 1.1 What the Arc Wheel does that the PieceTray does not

| Capability | PieceTray (Axiom) | Arc Wheel (Kepler+) |
|---|---|---|
| Layout | Bottom-docked horizontal strip, all types visible | Edge-anchored vertical pill, 5-node window |
| Inventory model | Type + count badge (`availableCounts`) | One node per physical instance (`InventoryPiece`) |
| Selection | Tap type to select | Tap node to select; vertical swipe to cycle |
| Placement | Tap selected type, then tap a board cell | Long-press a node, drag to a board cell, release |
| Dismiss | Always visible | Swipe off-screen, recall via edge strip |
| Idle state | Always full opacity | Fades to 18% after 2s, wakes on touch |
| Source color coding | Uniform (Axiom = all pre-assigned) | Border color encodes source: amber pre-assigned, blue requisitioned, purple tape |
| Economy surface | Cost/affordable per type | None at placement (economy lives in REQUISITION store, pre-placement) |

The defining Kepler-only behaviors are: (a) per-instance inventory (a purchased third Conveyor is its own node and disappears from the wheel once placed), (b) source color coding so the Engineer can see at a glance which pieces were bought, and (c) dismiss/recall to free board space on the large Kepler boards (up to 12x9 at K1-10).

### 1.2 Rotation interaction

The wheel is NOT a rotation surface. Rotation is a board-level interaction governed by the locked "plumber model": only a placed Conveyor rotates on tap; Config Node tap cycles configValue; Latch tap toggles latchMode; all other placed pieces have no tap action (CLAUDE.md, locked). The wheel's only gesture that resembles rotation is the vertical scroll that cycles `selectedIndex`. The component MUST NOT introduce any node-rotation affordance. Auto-orientation on placement remains Source-only (locked); wheel-placed pieces receive `getAutoRotation(gridX, gridY)` at drop time, identical to tray placement.

### 1.3 Piece selection

- Tapping a node MUST select it (`onSelect(piece.id)`), snap `selectedIndex`, fire `hapticLight()`, and re-activate the wheel.
- Vertical swipe past one `NODE_SLOT_H` MUST advance `selectedIndex` by one step, with wrap-around, one `hapticLight()` per step.
- Selection state is the single source of truth held in `requisitionStore.selectedInventoryId`; the wheel mirrors it via the `selectedId` prop and the `useEffect` that snaps `selectedIndex` to the matching index. The wheel MUST NOT hold authoritative selection state.
- When the selected piece is placed and removed from `arcWheelPieces`, the parent MUST clear or re-point `selectedInventoryId` (today `placeInventoryPiece` sets `selectedInventoryId: null`). The wheel MUST tolerate `selectedId === null` (no node shows the hero treatment; window stays centered on its last index).

### 1.4 How pieces are dragged onto the board

The canonical placement gesture for Kepler is press-hold-drag-release:

1. `onPressIn` on a node starts the `DRAG_HOLD_MS` timer and records the press screen position.
2. After 180ms hold (no competing tap), `onDragStart(DragState)` fires; the parent sets `dragState.active` and renders the floating ghost (`PieceIcon` at the drag coordinates).
3. The drag follows the finger; on release, `onDragEnd(x, y)` resolves the target cell.
4. `handleDragEnd` rejects the drop if out-of-bounds, occupied, OR blown; otherwise places, haptics, and marks the inventory instance placed.

KNOWN DEFECT (must be fixed in the rebuild): the ghost does not follow the finger. `ArcWheel` accepts `onDragMove` as a prop but never calls it (no PanResponder is attached during drag; `handleNodePressIn`/`onDragStart` only fire once). `GameplayScreen` wires `onDragMove={handleDragMove}` and `handleDragMove` updates `dragState.x/y`, but nothing drives it from the wheel. The result is a ghost frozen at the press point until release. The rebuild MUST attach a move-tracking responder (a `PanResponder` on the node, or a `Pressable` with `onTouchMove`, or a screen-level move tracker) so `onDragMove(x, y)` fires continuously during the drag. This is a behavioral correctness bug, not cosmetic — the Engineer currently has no visual confirmation of where the piece will land. (Cross-ref Open Question Q1.)

Tap-then-tap placement (PieceTray model) is NOT currently supported on the Arc Wheel. The parent gates the tap-to-place board handler on `selectedPieceFromTray || (!isAxiomLevel && selectedInventoryId && requisitionPhase === 'placement')` (line ~1383), which suggests an intent to support tap-place for wheel selections too. Open Question Q2: is drag-only the canonical Kepler gesture, or must tap-select-then-tap-board also work as a fallback (important for accessibility — see section 5)?

### 1.5 Interaction with damaged (blown) cells

Kepler is the first sector with blown cells and lives (LEVEL_DESIGN_FRAMEWORK Part 5). On a void result the piece where the signal died blows and permanently scars that cell for the session; pre-placed pieces never blow (the nearest player-placed piece blows instead).

Arc Wheel contract:
- A drop onto a blown cell MUST be rejected. `handleDragEnd` already checks `blownCellsRef.current.has('gx,gy')` and silently cancels. The rebuild MUST keep this guard reading the ref (not stale state) because blown cells accrue mid-session.
- The wheel SHOULD give negative feedback on a rejected drop (currently it silently snaps back with no haptic). PROPOSED: a short error haptic + ghost snap-back so the Engineer understands the rejection was the scar, not a missed gesture. (Open Question Q3 — feedback is unspecified.)
- The wheel itself has no blown-cell state; blown cells are board state. The wheel MUST NOT attempt to render or reason about scars.

### 1.6 Interaction with the REQUISITION store / expanding tray

The requisition window is one-time and pre-placement (CLAUDE.md soul: "Purchases happen once, before the level starts"). The phase machine enforces this:
- `requisition` phase: `RequisitionPanel` is shown; Arc Wheel is NOT rendered.
- `transitioning` phase: `PlacementTransition` plays; neither is interactive.
- `placement` phase: Arc Wheel is shown; REQUISITION store is gone. No mid-level buying.

Therefore the Arc Wheel and the REQUISITION store never coexist. The wheel's inventory is frozen at the moment `confirmRequisition` runs. The "expanding tray" concept (CLAUDE.md / COMPUTATIONAL_MODEL) is realized as: purchased instances appended to `inventory.pieces` with `source: 'requisitioned'`, surfaced as blue-bordered nodes. Note the terminology rename (`tray-to-arc-wheel-rename.md`): player-facing copy MUST say "the wheel" or name pieces directly, never "tray."

Unused-purchased-pieces-are-lost (soul rule): a requisitioned node never placed simply remains on the wheel at engage time and is forfeited by scoring. The wheel does not need to enforce this; it is a scoring concern. The wheel SHOULD, however, make unplaced requisitioned pieces visually distinct (blue border, already implemented) so the Engineer can self-audit before engaging. PROPOSED enhancement (Open Question Q4): a subtle count or "unspent" indicator, given the forfeiture stakes.

### 1.7 Interaction with requiredPieces enforcement

`requiredPieces` (K1-6, K1-8 in current data) is enforced at engage time, after a correct output, by `evaluateRequiredPieces` — it checks whether each required type `firedDuringRun`. If a required piece was not engaged, the run fails (`loseLife`) with a tailored COGS line from `buildRequiredPiecesCogsLine`.

The Arc Wheel's relationship to `requiredPieces` is indirect but real:
- The wheel MUST make every `requiredPieces` type reachable, i.e. present in `availablePieces` (verified: K1-6 requires splitter+merger, both pre-assigned; K1-8 requires bridge+latch+splitter+merger, all pre-assigned). The wheel surfaces them as nodes; placement is the Engineer's job.
- The wheel MUST NOT pre-validate or block engage based on requiredPieces — enforcement is deliberately deferred to post-run so the Engineer learns through failure (soul: "Failure is the curriculum").
- Because a required piece placed-but-not-engaged still fails, the wheel's job ends at making the piece placeable. No wheel-level "you forgot the Merger" warning — that would short-circuit the intended diagnostic loop.

---

## 2. PER-KEPLER-LEVEL SURFACE

For each level: what Arc Wheel capabilities are surfaced, what is hidden, and what tutorial hand-holding exists. Tutorial-step IDs are cited from `levels.ts` where present. NOTE: most K1 levels have board-grid tutorial steps but NO wheel-specific steps; the wheel is taught once at K1-1 (section 3) and assumed thereafter.

### K1-1 Corridor Entry (8x6) — WHEEL DEBUT + REQUISITION DEBUT
- Inventory: 3 conveyor + 2 gear pre-assigned. `creditBudget: 75`, `purchasableTapes: ['TRAIL','OUT']`, `freeTapes: ['IN']`.
- Surfaced: requisition window (first ever), then the full wheel gesture set (scroll, select, drag-place, dismiss/recall).
- Hidden: nothing is mechanically hidden, but the board is deliberately small (5 pieces, two corners) so the wheel's discoverability weakness (UX report section 5) does not bite.
- Tutorial: existing steps `board-intro`, `board-resume` (board grid), then `store-intro`, `store-tabs`, `store-forfeiture`, `store-window` (all `targetRef: 'tray'`, `eyeState: 'amber'`). DEFECT per `tray-to-arc-wheel-rename.md`: these four steps target `'tray'`, which on Kepler must resolve to the REQUISITION panel, not the wheel. The rename spec explicitly flags this. The rebuild MUST repoint these to a REQUISITION-panel ref, and a separate set of wheel-onboarding steps MUST be added for the placement phase (section 3). See Open Question Q5.

### K1-2 Relay Splice (9x6)
- Inventory: 4 conveyor + scanner + transmitter + gear pre-assigned. No required pieces. `optimalPieces: 5`.
- Surfaced: full wheel; first time the Engineer scrolls past more than 5 nodes is NOT here (7 nodes — within/near window). Scanner + Transmitter are blue/amber by source (all pre-assigned, so all amber).
- Hidden: economy (no `creditBudget` on K1-2 — confirm Open Question Q6; if 0, requisition is skipped and phase jumps straight to placement via `initRequisition`'s `creditBudget === 0` branch).
- Tutorial: `board-intro`, `board-resume` (board grid only). No wheel steps. Wheel assumed learned at K1-1.

### K1-3 Junction 7 (10x7)
- Inventory: 4 conveyor + scanner + transmitter + configNode + gear (8 nodes — first level the 5-node window definitely requires scrolling). Pre-placed Latch on board.
- Surfaced: scrolling through an 8-node inventory; the discoverability gap (UX report) first becomes tangible. This is the strongest argument for the UX report's recommended dot-strip / quick-jump enhancement (Open Question Q9).
- Tutorial: `board-intro`, `latch-collect` (codex), `board-resume` — all `targetRef: 'boardGrid'`. The Latch is pre-placed, not a wheel node, so its codex collection happens on the board, not the wheel. NOTE: `board-intro` text "The board has a piece that remembers" refers to the pre-placed Latch; no wheel reference. Good (rename-clean).

### K1-4 Mining Platform Alpha (10x7) — CONSEQUENCE LEVEL
- Inventory: 10 nodes (conveyor x4, scanner, latch, configNode, transmitter, gear x2). `consequence` fires blown cell + ship damage on void.
- Surfaced: full wheel on a board where a misplacement now costs a life + a scar. Dismiss/recall becomes valuable (large board, want max visibility). The blown-cell drop rejection (1.5) is first exercised here under stakes.
- Tutorial: none defined (`tutorialSteps` absent). Wheel fully assumed. This is the first level where a rejected blown-cell drop with no feedback (Open Question Q3) would be most confusing.

### K1-5 Resupply Chain (10x8)
- Inventory: 12 nodes incl. merger; pre-placed splitter. `merger-collect` codex step.
- Surfaced: 12-node inventory — scrolling is now routine. First Merger appears as a wheel node (amber, pre-assigned).
- Tutorial: `board-intro`, `merger-collect` (`targetRef: 'boardGrid'`, codex), `board-resume`. Codex collection is board-targeted, not wheel-targeted, even though the Merger lives on the wheel until placed. INCONSISTENCY to flag (Open Question Q8): Axiom new-piece codex collection (arc-wheel-tutorial.md) targets `arcWheelMain`; Kepler new-piece codex collection targets `boardGrid`. Two different patterns for "notice the new piece."

### K1-6 Colonist Hub (11x8) — requiredPieces: splitter + merger
- Inventory: 14 nodes. `requiredPieces` enforced post-run.
- Surfaced: largest inventory so far; full dismiss/recall value. requiredPieces enforcement (1.7) — both required types are wheel nodes the Engineer must place AND engage.
- Tutorial: none. `disciplineBonus` now visible in scoring.

### K1-7 Ore Processing (10x8)
- Inventory: 12 nodes incl. nothing new on the wheel (Bridge is pre-placed). `bridge-collect` codex step.
- Tutorial: `board-intro`, `bridge-collect` (`targetRef: 'boardGrid'`), `board-resume`. NOTE: `board-intro` says "Something in the available pieces solves this" — clean, references "available pieces" not "tray" (rename-compliant). Bridge is pre-placed so it is not a wheel node here.

### K1-8 Transit Gate (11x8) — CONSEQUENCE + requiredPieces: bridge+latch+splitter+merger
- Inventory: 16 nodes — the largest yet. 4 required types, all wheel nodes, all must be placed and engaged.
- Surfaced: heaviest simultaneous demand on the wheel — 16 nodes, 4 required, consequence stakes, large board. This level is the stress test for every wheel weakness the UX report names (discoverability, rebuild friction, sequential access). Strongly motivates the quick-jump enhancement (Q9).
- Tutorial: none. `speedBonus` now visible.

### K1-9 The Narrows (11x9)
- Inventory: 20 nodes (two latches, two configNodes, bridge, merger, splitter, scanner, transmitter, 8 conveyors, 3 gears). XOR logic.
- Surfaced: the full inventory now exceeds the 5-node window by 4x. Scrolling through 20 nodes to find a specific piece is the worst-case discoverability scenario described in the UX report (section 5, "you cannot be inspired by a piece you forgot exists").
- Tutorial: none.

### K1-10 Central Hub (12x9) — BOSS, CONSEQUENCE, requireThreeStars
- Inventory: 22 nodes (the largest in the sector). `requireThreeStars` — must 3-star to pass. Running-count machine.
- Surfaced: maximum board (12x9) + maximum inventory (22) + maximum stakes. Dismiss/recall is near-mandatory to see the full board. The wheel must remain performant and legible at 22 nodes.
- Tutorial: `board-intro` only (board grid). Boss; no hand-holding.

### Surface summary

| Level | Nodes | New wheel node | Required | Consequence | Wheel tutorial steps |
|---|---|---|---|---|---|
| K1-1 | 5 | (debut) | - | - | NONE yet (store steps mis-target `tray`) |
| K1-2 | 7 | - | - | - | none |
| K1-3 | 8 | - | - | - | none (Latch pre-placed) |
| K1-4 | 10 | - | - | YES | none |
| K1-5 | 12 | Merger (codex on board) | - | - | none |
| K1-6 | 14 | - | splitter,merger | - | none |
| K1-7 | 12 | - (Bridge pre-placed) | - | - | none |
| K1-8 | 16 | - | bridge,latch,splitter,merger | YES | none |
| K1-9 | 20 | - | - | - | none |
| K1-10 | 22 | - | - | YES (3-star req) | none |

The single biggest gap: there is no wheel-onboarding tutorial anywhere in K1, and the only wheel-adjacent steps (K1-1 store steps) target the wrong element. Section 3 proposes the fix.

---

## 3. TUTORIAL INTRODUCTION AT K1-1

The Engineer reaches K1-1 having learned the PieceTray across all 8 Axiom levels (tap-select, tap-place). At K1-1 two new systems appear at once: the REQUISITION store (pre-placement) and the Arc Wheel (placement). These are sequenced by the phase machine, so they can be taught separately.

### 3.1 Sequence overview

Phase `requisition` -> teach the store (4 existing steps, repointed). Phase `transitioning` -> `PlacementTransition`. Phase `placement` -> teach the wheel (NEW steps, proposed below). Then the existing `board-intro` / `board-resume` board steps.

IMPORTANT ordering note: the existing K1-1 `tutorialSteps` array lists `board-intro`, `board-resume` BEFORE the `store-*` steps. Because the store appears first chronologically (requisition phase precedes placement), the step ORDER in the array does not match the phase order. The rebuild MUST verify the tutorial driver sequences steps by phase, not by array index, or reorder the array. (Open Question Q5.)

### 3.2 What the Engineer sees when the wheel first appears

On entering the placement phase, the `PlacementTransition` resolves and the Arc Wheel slides in via the staggered entrance animation (section 4). Five nodes (3 conveyor, 2 gear) animate in, the center node hero-treated with corner brackets and a label. The board is now highlight-free (first sector without placement highlights; wires remain). COGS appears with the orb targeting `arcWheelMain` (the wheel already forwards `mainNodeRef`).

### 3.3 What COGS says — PROPOSED (requires Tucker sign-off)

These lines do not exist yet. They must be written in COGS voice (dry, witty, reluctantly impressed, no cheerleading, "acceptable" is the high praise) and approved before landing. All flagged PROPOSED. COGS-to-Engineer speech may use "you" (the carveout).

Wheel-onboarding steps (placement phase, after transition, before `board-intro`):

```
{
  id: 'wheel-intro',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'PROPOSED: New hardware. The parts manifest is no longer a tray along the bottom. It is this wheel. Everything requisitioned is loaded onto it.',
}
{
  id: 'wheel-scroll',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'PROPOSED: Swipe the wheel to bring a piece to center. The one in the middle is selected. You will not see every part at once. That is the trade for the room it gives the board.',
}
{
  id: 'wheel-place',
  label: 'ARC WHEEL',
  targetRef: 'arcWheelMain',
  eyeState: 'blue',
  message: 'PROPOSED: Press and hold a piece, then drag it onto the board. Release where it belongs. No more tapping the grid. The wheel hands the piece to you directly.',
}
```

(Optional fourth step, only if dismiss is taught explicitly — see deferred gestures.)

The four EXISTING store steps (`store-intro`, `store-tabs`, `store-forfeiture`, `store-window`) are ALREADY APPROVED copy and must be preserved character-for-character; only their `targetRef` changes from `'tray'` to a REQUISITION-panel ref. Do not rewrite their text.

### 3.4 First gesture taught

The drag-place gesture (press-hold-drag-release) is the load-bearing change from Axiom and MUST be the first gesture taught after selection. Recommended teaching order: (1) scroll to select, (2) drag to place. Selection-by-tap is a natural carryover from the tray and can be mentioned but does not need a dedicated step.

### 3.5 Gestures deferred

- Dismiss / recall (horizontal swipe off-screen): SHOULD be deferred. It is a convenience for large boards; K1-1's board is small. Introduce it later, ideally as an ambient COGS line at K1-4 or K1-6 when boards grow. PROPOSED deferred line (flag for Tucker): "PROPOSED: If the wheel is in the way, swipe it off the edge. It leaves a marker. Tap the marker to bring it back."
- Idle fade: requires no teaching — it is self-evident and re-activates on touch. Do NOT add a step.
- Per-instance inventory semantics (placed pieces leave the wheel): self-evident on first placement. Do NOT add a step.

### 3.6 arc-wheel-tutorial.md items now OBSOLETE or AT RISK given the rebuild

The APPROVED `arc-wheel-tutorial.md` spec is Axiom-scoped (A1-1/2/3/5/7 codex rework). It is NOT obsolete for Axiom, but several items intersect the rebuild and must be re-checked:

1. OBSOLETE FOR KEPLER: the four-beat NOTICE/INSTRUCT/CAPTURE/TEACH pattern targets `arcWheelMain` for the uncatalogued piece. On Kepler, new pieces (Latch K1-3, Merger K1-5, Bridge pre-placed K1-7) are introduced via codex steps that target `boardGrid`, not the wheel. The two sectors use different "notice the piece" patterns. This is not a contradiction within arc-wheel-tutorial.md (which is Axiom-only) but IS an inconsistency the rebuild inherits. Flag: should Kepler new-piece codex collection move to `arcWheelMain` for consistency, or is the board-target deliberate because some Kepler new pieces are pre-placed? (Open Question Q8.)

2. AT RISK: arc-wheel-tutorial.md's `awaitPlacement` flow is the exact field that caused the Build 19 SIGABRT (the `dimOpacity` host swap in `TutorialHUDOverlay`, per ANIMATION_RULES incident history and the Dev Analysis). Any Kepler wheel-onboarding steps that introduce new `await*` fields or new conditional overlay branches MUST be reviewed against REQ-A-1..3 (section 4). The crash was in the overlay, not the wheel, but the wheel tutorial is the feature that surfaced it.

3. STILL VALID: `mainNodeRef` forwarding, `tutorialFocusPiece` pre-selection, green-eye CAPTURE beat — all Axiom mechanisms that the rebuild should preserve unchanged. The Kepler wheel reuses `mainNodeRef` for orb targeting on the proposed wheel-onboarding steps.

4. TERMINOLOGY: arc-wheel-tutorial.md predates the rename spec but already uses "the wheel" in its approved copy ("That piece on the wheel"). Consistent with `tray-to-arc-wheel-rename.md`. No conflict.

---

## 4. ANIMATION INVARIANTS

Governing doc: `docs/ANIMATION_RULES.md`, clauses REQ-A-1..3. Incident context: two SIGABRT crashes (Prompt 93 `portalOpacity`, Build 19 `dimOpacity`), both native-driver host swaps in `TutorialHUDOverlay`, not in the wheel.

### 4.1 The clauses, applied to the Arc Wheel

- REQ-A-1 (single-host invariant for native-driven values): an `Animated.Value` with `useNativeDriver: true` MUST be consumed by exactly one `Animated.View` across the component lifecycle. Host-swapping a native-driven value between conditional branches is prohibited.
- REQ-A-2 (persistent host on state transitions): if a state transition would unmount a native-driven `Animated.View`, refactor so the host is persistent and only children/opacity/styles change.
- REQ-A-3 (code review grep mandate): any diff touching an `Animated.View` tree MUST grep every `Animated.Value` in the file and confirm each native-driven value appears in exactly one host. Reviewer recites the attestation.

### 4.2 Driver classification for every Arc Wheel animation

The current wheel uses `useNativeDriver: false` on ALL 14 values (confirmed line-by-line; Dev Analysis section 1 corroborates). Under that policy the wheel is trivially REQ-A compliant — there are zero native-driven values to grep.

| Animation | Value(s) | Current driver | Rebuild recommendation |
|---|---|---|---|
| Dismiss / recall translateX | `slideAnim` | JS (false) | KEEP JS. Touches layout-coupled translate on a conditionally-mounted-sibling tree (recall strip vs pill). JS driver avoids any host-swap class of risk. |
| Idle / active opacity | `idleAnim` | JS (false) | KEEP JS. Opacity on the pill; trivial cost. |
| Entrance translateY (per node) | `entranceY[0..4]` | JS (false) | KEEP JS. Per-node, list-rendered, one-time. |
| Entrance opacity (per node) | `entranceOpacity[0..4]` | JS (false) | KEEP JS. |
| Drag ghost position | (parent `dragState.x/y`, plain View `left/top`) | not animated | Plain layout, not Animated. If the rebuild animates the ghost, it MUST be a persistent host (the ghost is conditionally mounted on `dragState.active` — a native-driven ghost would be a host-swap risk; keep it plain or JS-driven). |

### 4.3 Locked policy and the single-host rule for the rebuild

- `useNativeDriver: false` is LOCKED for all piece animations (CLAUDE.md gotchas: "useNativeDriver: false for all piece animations"). The wheel's node entrance/scale animations are piece animations and MUST stay JS-driven.
- The rebuild MAY use the native driver ONLY for a value that is (a) pure transform/opacity, (b) NOT a piece animation, and (c) hosted by a single persistent `Animated.View` that is never conditionally unmounted. Given the wheel's conditional structure (recall strip vs pill, idle vs active, drag vs non-drag pan handlers), there is NO value that cleanly satisfies all three. RECOMMENDATION: keep the entire wheel JS-driven, matching today. The Dev Analysis reaches the same conclusion ("Keep useNativeDriver: false on all wheel animations").
- Single-host invariant, restated for the rebuild: if any value is ever promoted to native (against the recommendation above), that value gets exactly one persistent `Animated.View` host across all branches (dismissed/not-dismissed, active/idle, dragging/not-dragging). The current pill toggles its pan handlers with `{...(isDragging ? {} : scrollPan.panHandlers)}` but does NOT swap the Animated.View host — the pill is one persistent `Animated.View`. The rebuild MUST preserve that single-host structure if it touches the pill.

### 4.4 The real animation risk lives in the overlay, not the wheel

The crash class is in `TutorialHUDOverlay`'s reaction to tutorial-step fields (`awaitPlacement`, etc.), not in the wheel. The Kepler wheel-onboarding steps proposed in section 3 do NOT introduce new `await*` fields (they are plain advance-on-confirm steps), which keeps them clear of the host-swap pattern. Any future Kepler step that DOES add an `await*` field MUST be reviewed against the post-fix overlay structure (unconditional `dimOpacity` host, conditional sibling `Pressable` only) documented in the Dev Analysis. The pre-written defenses (`tutorialHUDOverlayTransitions.test.tsx`, `nativeDriverHostUniqueness.test.ts`) MUST stay green.

---

## 5. ACCESSIBILITY

Target: WCAG 2.1 AA. Mobile, touch-first. The current implementation has partial coverage; gaps are flagged MUST-FIX.

### 5.1 Touch target sizes

WCAG 2.1 AA Success Criterion 2.5.5 (Target Size, AAA) recommends 44x44 CSS px; the AA-level 2.5.8 (Target Size Minimum, WCAG 2.2) requires 24x24. Apple HIG recommends 44x44 pt.

- Selected (center) node: `NODE_SIZE_MAX = 52` -> 52x52 pt. PASSES 44pt.
- Neighbor nodes: scaled down by `scaleFactor` (down to ~`NODE_SIZE_MIN = 28`) -> as small as ~28x28 pt. This is BELOW 44pt and only marginally above the 24pt AA minimum. The fish-eye shrink is a deliberate aesthetic, but the shrunk neighbors are still tappable targets (tap selects them). MUST-FIX or DOCUMENT-WAIVER: either (a) expand the touchable hit area beyond the visual node (e.g. `hitSlop` to bring effective target to >=44pt) so the shrink is purely visual, or (b) make only the center node tappable-to-place and require scroll-to-center first. Recommendation: (a) — add `hitSlop` so every node has a >=44pt effective target while keeping the visual fish-eye. (Open Question Q10.)
- Recall strip: `RECALL_STRIP_W = 5` pt wide, 40% of screen height tall. 5pt is far below any target minimum. MUST-FIX: add `hitSlop` to give the recall strip a >=44pt effective horizontal target. The tall axis is fine; the 5pt width is the problem.

### 5.2 Screen reader labels

Current state: nodes have `accessibilityLabel` of the form ``${PIECE_LABELS[type]}, ${source === 'requisitioned' ? 'purchased' : 'pre-assigned'}`` (e.g. "CONV, pre-assigned"). The recall strip has "Recall piece selector".

MUST-FIX gaps:
- Labels use the terse internal codes (CONV, CFG, XMIT) rather than full piece names. Screen-reader users hear "conv, pre-assigned" — unclear. PROPOSED: use full names ("Conveyor, pre-assigned") and announce selection state and position ("Conveyor, pre-assigned, selected, 2 of 5"). All copy flagged PROPOSED.
- No `accessibilityRole` on nodes (should be `button` or `adjustable`). The wheel as a whole behaves like an adjustable picker; consider `accessibilityRole="adjustable"` on the pill with `accessibilityActions` for increment/decrement (scroll) so VoiceOver/TalkBack users can cycle without a swipe gesture.
- The drag-to-place gesture is inaccessible to screen-reader users (no equivalent to a press-hold-drag via assistive tech). This is the strongest argument for retaining a tap-select-then-tap-board fallback (Open Question Q2). MUST resolve: there MUST be a non-drag placement path for accessibility. The PieceTray's tap-select-then-tap-board model is the natural accessible fallback and the board handler already partially supports it (gated on `selectedInventoryId`).
- No `accessibilityLabel` announcing the wheel's purpose on first appearance. PROPOSED: pill-level label "Piece selector wheel. Swipe up or down to choose a piece."

### 5.3 Reduced motion fallback

Current state: NO reduced-motion handling. The entrance stagger, dismiss slide, and idle fade all play unconditionally.

MUST-FIX: respect the OS reduce-motion setting (`AccessibilityInfo.isReduceMotionEnabled()` / `reduceMotionChanged` listener). When reduce-motion is on:
- Skip the staggered entrance — render nodes at final position/opacity immediately.
- Replace the dismiss/recall slide with an instant show/hide (or a short cross-fade).
- The idle fade MAY remain (it is a slow opacity change, not motion) but SHOULD be reducible to an instant state change if the Engineer finds it distracting.

This is a net-new capability. There is no existing reduce-motion plumbing in the wheel.

---

## 6. OPEN QUESTIONS FOR TUCKER

Every ambiguity the docs/code do not resolve. None of these is papered over below — each needs a decision before the rebuild lands.

1. DRAG-MOVE DEFECT: the ghost piece does not follow the finger because `ArcWheel` never calls `onDragMove` (no move responder during drag). Confirm the intended behavior is a finger-following ghost, and confirm the rebuild should attach a continuous move tracker. (This is almost certainly a bug, but it changes the gesture model so it needs your call.)

2. TAP-PLACE FALLBACK: is press-hold-drag-release the ONLY Kepler placement gesture, or must tap-select-then-tap-board also work (as the PieceTray does)? The board handler is already gated to allow it. A tap-place path is effectively required for screen-reader accessibility (section 5.2).

3. BLOWN-CELL DROP FEEDBACK: a drop onto a scarred cell is silently rejected today. What feedback should the Engineer get — error haptic, ghost snap-back, a COGS line? Stakes are high (K1-4/8/10 consequence levels).

4. FORFEITURE VISIBILITY: should the wheel surface an "unspent / will be forfeited" indicator for unplaced requisitioned pieces, given the soul rule that unused purchased pieces are lost?

5. K1-1 STORE-STEP TARGETS + ORDER: the four `store-*` steps target `'tray'` and must repoint to the REQUISITION panel (per the rename spec). Also: the `tutorialSteps` array lists board steps before store steps, but the store appears first chronologically. Does the tutorial driver sequence by phase or by array index? Confirm the repoint target ref name and the ordering fix.

6. KEPLER CREDIT BUDGETS: only K1-1 has an explicit `creditBudget: 75` in the data I read. K1-2..K1-10 do not show a `creditBudget` field in the grepped definitions. If absent (0), `initRequisition` skips the requisition phase entirely and goes straight to placement, meaning the REQUISITION store and the expanding-tray purchase loop appear ONLY at K1-1. Is that intended, or should later Kepler levels also offer requisition? This materially affects how often the blue (requisitioned) wheel nodes ever appear.

7. TAPES ON THE WHEEL: `ArcWheelPiece.isTape`, `TAPE_COLOR` (#8B5CF6 purple), and `getNodeBorderColor`'s tape branch exist in the component, but `arcWheelPieces` is built from `inventory.pieces` which excludes tapes (tapes are tracked in `inventory.tapes`). Are tapes ever meant to be wheel nodes, or is that dead code? If purple tape nodes are intended, the inventory builder needs to emit them.

8. KEPLER NEW-PIECE CODEX TARGET: Axiom new-piece codex collection targets `arcWheelMain` (arc-wheel-tutorial.md four-beat). Kepler new-piece codex collection (K1-3 Latch, K1-5 Merger) targets `boardGrid`. Should Kepler unify to `arcWheelMain` for consistency, or is the board target deliberate (because some Kepler new pieces like the Bridge are pre-placed and never appear on the wheel)?

9. DISCOVERABILITY ENHANCEMENT: the UX report (ARC_WHEEL_UX_ANALYSIS) strongly recommends a quick-jump / dot-strip index because the wheel hides most of a large inventory (up to 22 nodes at K1-10). Do you want this enhancement in the rebuild, and if so, dot-strip vs category-toggle vs neither?

10. NEIGHBOR-NODE HIT TARGETS: the fish-eye shrink takes neighbor nodes down to ~28pt, below the 44pt comfortable target. Approve adding `hitSlop` to keep the visual shrink while making effective targets >=44pt, or prefer center-only-tappable?

11. WHEEL-ONBOARDING COPY: the three proposed `wheel-intro` / `wheel-scroll` / `wheel-place` lines (section 3.3) and the deferred dismiss line (3.5) are PROPOSED placeholders. They need your voice pass and sign-off, or a rewrite. No wheel-onboarding copy exists today.

12. DISMISS GESTURE TEACHING: confirm dismiss/recall is deferred (not taught at K1-1) and decide where it gets introduced (proposed: ambient line at K1-4 or K1-6 when boards grow).
