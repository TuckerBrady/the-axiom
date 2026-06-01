# SPEC: Kepler Belt Rebuild v3 (CANONICAL)

Status: DRAFT FOR TUCKER REVIEW
Date: 2026-05-31
Author: Coordinator (synthesis of five research reports + LevelDefinition schema)
Scope: Sector 1, Kepler Belt, levels K1-1 through K1-10. This is the single
canonical rebuild spec. It supersedes `kepler-belt-levels.md` (the "original"),
`kepler-belt-levels-v2-part1/2/3.md`, and the current `src/game/levels.ts` data
WHERE THEY CONFLICT. Conflicts are resolved here with the canonical answer and
the rejected alternative noted inline.

POLICY (binding on this document):
- No emojis anywhere.
- The Engineer is "The Engineer" in all UI copy. COGS speech MAY use "you" (the carveout).
- No chosen name for the Engineer anywhere in Kepler (reserved for post-Deep-Void).
- ALL player-facing copy below is flagged PROPOSED and requires Tucker sign-off
  before it lands, EXCEPT lines explicitly cited as already approved in
  NARRATIVE.md / DIALOGUE_SYSTEM.md, which are carried verbatim and still gated
  on a final character-for-character check.
- Only real `LevelDefinition` fields (src/game/types.ts) are used. No invented fields.

CANONICAL RESOLUTION OF THE THREE-SOURCE PRECEDENCE CONFLICT:
The archaeology report found a circular precedence claim (original calls itself
"v3"; v2 parts claim to replace it; code diverges from both). This spec adopts
the V2 + CODE level-and-mechanic assignment as canonical, because: (a) it is the
ordering the engine, the per-level approved COGS lines, the narrative map, and the
arc-wheel surface map are ALL already keyed to by level NAME; (b) the teaching-map
report's alternative ordering (Merger@K1-3 / Bridge@K1-5 / Latch@K1-7) re-pins the
sector against names that no longer match. The teaching-map ordering is preserved
as the noted alternative on each affected level. The original doc's signature
"damaged cells" mechanic (K1-5/6/7/8) is NOT adopted (absent from engine + v2 +
code); it is flagged in Open Questions as a possible re-introduction.

---

## 1. SECTOR OVERVIEW

### 1.1 Narrative arc
Kepler Belt is "the first real work. Stakes become human." (NARRATIVE.md Part Four,
Sector 1.) It is a former mining corridor, mostly decommissioned, with residual
salvage activity and disputed claims. The colonists depend on the infrastructure
the Engineer is repairing. COGS becomes more engaged — not more encouraging, more
present — watching how the Engineer handles work that has weight. A buried
breadcrumb runs through the sector: the Axiom has transited this corridor before
(residual route marker, no mission data), surfacing as a post-boss hub ambient at
K1-10. The sector closes with a post-completion COGS reflection that the work had
consequences for real people.

Game-phase: all Kepler levels evaluate as EARLY-game (Sectors 0-1) for
DIALOGUE_SYSTEM purposes. Early-game COGS is assessing.

### 1.2 Mechanics introduced (sector-wide)
Stateful computation, non-uniform tapes, and three new pieces:
- Merger (Physics, OR logic, parallel-path convergence)
- Bridge (Physics, two independent paths share one cell)
- Latch (Protocol, single stored value, write/read are separate operations)

Kepler is also the FIRST sector with:
- No placement highlights (Axiom-only; wires remain on all sectors).
- Blown (damaged) cells + lives. Void blows the player-placed piece where the
  signal died and permanently scars that cell for the session. Pre-placed pieces
  never blow.
- Consequence levels at K1-4, K1-8, K1-10 (dual penalty on void: blown cell + ship
  damage / narrative consequence). Confirmed by LEVEL_DESIGN_FRAMEWORK and all five
  reports.
- The Arc Wheel as the primary piece-selection model (PieceTray retired for Kepler+;
  see Section 2).

WITHHELD across all of Kepler (reserved for later sectors): Inverter, Capacitor,
Confluence Node, Divergence Gate (Nova Fringe); Relay, Counter, Threshold Relay,
Junction (The Rift); Sequencer, Navigator (Deep Void); Resonator (The Cradle).
Withholding Inverter and Counter specifically is curriculum-load-bearing.

### 1.3 Position in teaching progression
- Prerequisite sector: AXIOM (A1-1..A1-8). The Engineer enters K1-1 knowing:
  signal travels a path and direction matters; Data Trail memory persists and can
  be read/written; Config Nodes gate on memory; placement order = execution order;
  input (Scanner) and output (Transmitter) are separate. (TEACHING_PROGRESSION.md:43-49.)
- Kepler question: "How does a machine handle different inputs differently?"
- Exit thesis (must be true before Nova Fringe unlocks): memory written/read
  dynamically across pulses; a single stored value can drive multiple decisions;
  parallel paths can serve different purposes; "the difference between a solution
  and an algorithm" — a machine must be correct for ANY valid input, not just the
  shown tape. (TEACHING_PROGRESSION.md:70-76.) The sector's anti-hardcode rule:
  "Every level must have a tape that tests the rule, not a tape that telegraphs the
  solution. A player who hardcodes from the tape should fail."

### 1.4 Forward references (post-Kepler)
- Nova Fringe (next): introduces Inverter, Capacitor, Confluence Node, Divergence
  Gate; theme is input-independence — the K1-9 "solution vs algorithm" lesson is
  the bridge into it.
- The Rift: Relay, Counter, Threshold Relay, Junction. K1-10's consecutive-1s /
  running-count idea foreshadows the Counter (withheld until The Rift).
- Capacitor (Nova Fringe) is the deliberate contrast to the Latch (persistent vs
  dynamic state) — which is why the Latch must be fully landed in Kepler.

---

## 2. ARC WHEEL INTEGRATION (full, cleaned, PROPOSED where copy is involved)

The Arc Wheel debuts at K1-1 and is the primary piece-selection model for every
Kepler-and-later level. Axiom keeps the PieceTray (with the documented exception
that Axiom new-piece tutorial levels render a focus-filtered Arc Wheel). All
player-facing copy in this section is PROPOSED.

### 2.0 Architecture baseline
The current `ArcWheel` (src/components/gameplay/ArcWheel.tsx) is an edge-anchored
vertical pill rendering a windowed slice of up to 5 nodes centered on
`selectedIndex`, with fish-eye depth scaling (selected `NODE_SIZE_MAX = 52`;
neighbors shrink toward `NODE_SIZE_MIN = 28`). It uses 14 `Animated.Value`s, ALL
`useNativeDriver: false`. Two PanResponders: `scrollPan` (vertical swipe cycles
selection, wrap-around, `hapticLight()` per step) and `dismissPan` (horizontal
swipe past `DISMISS_THRESHOLD = 40` slides off, leaving a `RECALL_STRIP_W = 5`
recall strip). Idle: after `ACTIVE_TIMEOUT_MS = 2000` fades to `IDLE_OPACITY = 0.18`,
re-activates on touch. Drag: `onPressIn` starts a `DRAG_HOLD_MS = 180` timer; on hold
completion `onDragStart` fires with the piece id/type and press coordinates.

GameplayScreen render gating:
- Kepler+ placement: rendered when `!isAxiomLevel && requisitionPhase === 'placement'
  && !isExecuting && !showResults && !showVoid`; fed by `inventory.pieces.filter(p => !p.placed)`.
- Axiom new-piece levels: rendered filtered to `tutorialFocusPiece`, `mainNodeRef`
  wired for COGS-orb targeting.

The `requisitionStore` models the one-time window as a phase machine:
`requisition -> transitioning -> placement`. Inventory = `availablePieces`
(`source: 'preAssigned'`) + confirmed purchases (`source: 'requisitioned'`), sorted
by `arcWheelSortKey` (category, then price ascending). Tapes are tracked separately
in `inventory.tapes` and are NOT Arc Wheel nodes today (see Open Question on tape nodes).

### 2.1 Behavioral contract (RFC 2119)
What the Arc Wheel does that the PieceTray does not:
- Per-instance inventory: a purchased third Conveyor is its own node and disappears
  from the wheel once placed.
- Source color coding: border encodes source (amber = pre-assigned, blue =
  requisitioned, purple = tape if ever surfaced).
- Dismiss/recall to free board space on large Kepler boards (up to 12x9 at K1-10).

Rotation: the wheel is NOT a rotation surface. Rotation is a board-level interaction
under the locked plumber model (only placed Conveyor rotates on tap; Config Node tap
cycles configValue; Latch tap toggles latchMode; all others no tap action). The
component MUST NOT introduce a node-rotation affordance. Auto-orientation on placement
remains Source-only; wheel-placed pieces receive `getAutoRotation(gridX, gridY)` at drop.

Selection:
- Tap a node MUST select it, snap `selectedIndex`, fire `hapticLight()`, re-activate.
- Vertical swipe past one `NODE_SLOT_H` MUST advance selection by one, wrap-around,
  one `hapticLight()` per step.
- `requisitionStore.selectedInventoryId` is the single source of truth; the wheel
  mirrors via `selectedId` and MUST NOT hold authoritative selection state.
- When a placed piece leaves `arcWheelPieces`, the parent MUST clear/re-point
  `selectedInventoryId` (today `placeInventoryPiece` sets it null); the wheel MUST
  tolerate `selectedId === null`.

Placement gesture (canonical Kepler): press-hold-drag-release.
1. `onPressIn` starts `DRAG_HOLD_MS` timer, records press position.
2. After 180ms hold, `onDragStart(DragState)` fires; parent renders floating ghost.
3. Drag follows finger; on release `onDragEnd(x, y)` resolves the target cell.
4. `handleDragEnd` rejects out-of-bounds / occupied / blown; else places + haptics +
   marks the instance placed.

KNOWN DEFECT (MUST fix in rebuild): the ghost does not follow the finger. `ArcWheel`
accepts `onDragMove` but never calls it (no move responder during drag). The rebuild
MUST attach a continuous move tracker so `onDragMove(x, y)` fires during the drag.
This is a correctness bug: the Engineer currently has no visual confirmation of where
the piece lands.

Blown-cell interaction (Kepler-first):
- A drop onto a blown cell MUST be rejected. `handleDragEnd` already checks
  `blownCellsRef.current.has('gx,gy')`; the rebuild MUST keep reading the ref (not
  stale state) because scars accrue mid-session.
- PROPOSED: give negative feedback on a rejected drop (short error haptic + ghost
  snap-back) so the Engineer reads the rejection as a scar, not a missed gesture.
- The wheel MUST NOT render or reason about scars; blown cells are board state.

Requisition store / expanding tray:
- Window is one-time and pre-placement. Wheel and store NEVER coexist (phase machine).
- Wheel inventory freezes at `confirmRequisition`. Purchased instances append to
  `inventory.pieces` with `source: 'requisitioned'` (blue-bordered nodes).
- Player-facing copy MUST say "the wheel" or name pieces directly, never "tray"
  (tray-to-arc-wheel-rename.md).
- Unused-purchased-pieces-are-lost is a scoring concern; the wheel does not enforce
  it but SHOULD keep requisitioned nodes visually distinct (blue border). PROPOSED
  enhancement: an "unspent / will be forfeited" indicator.

requiredPieces enforcement:
- The wheel MUST make every required type reachable (present in `availablePieces`).
- The wheel MUST NOT pre-validate or block engage on requiredPieces — enforcement is
  deferred to post-run by design ("Failure is the curriculum"). No "you forgot the
  Merger" wheel warning.

### 2.2 Per-level Arc Wheel surface
| Level | Wheel nodes | New wheel node | requiredPieces | Consequence | Wheel tutorial |
|---|---|---|---|---|---|
| K1-1 | 5 | (debut) | - | - | store steps (mis-target `tray`, MUST repoint) + NEW wheel steps |
| K1-2 | 7 | - | - | - | none |
| K1-3 | 8 | - (Latch pre-placed) | - | - | none |
| K1-4 | 10 | - | - | YES | none |
| K1-5 | 12 | Merger (codex on board) | - | - | none |
| K1-6 | 14 | - | splitter, merger | - | none |
| K1-7 | 12 | - (Bridge pre-placed) | - | - | none |
| K1-8 | 16 | - | bridge, latch, splitter, merger | YES | none |
| K1-9 | 20 | - | - | - | none |
| K1-10 | 22 | - | - | YES (3-star req) | board-intro only |

Single biggest gap: there is NO wheel-onboarding tutorial anywhere in K1, and the
only wheel-adjacent steps (K1-1 store steps) target the wrong element.

### 2.3 Tutorial introduction at K1-1 (PROPOSED copy)
At K1-1 two new systems appear, sequenced by the phase machine and taught separately:
- `requisition` phase -> teach the store (4 EXISTING approved steps, repointed from
  `'tray'` to a REQUISITION-panel ref; their TEXT MUST be preserved character-for-
  character — only `targetRef` changes).
- `transitioning` -> `PlacementTransition`.
- `placement` -> teach the wheel (NEW steps below), then existing `board-intro` /
  `board-resume`.

Ordering caveat: the existing K1-1 `tutorialSteps` array lists board steps BEFORE
store steps, but the store appears first chronologically. The rebuild MUST sequence
steps by PHASE, not by array index, or reorder the array.

PROPOSED wheel-onboarding steps (placement phase, before `board-intro`):
```
{ id: 'wheel-intro', label: 'ARC WHEEL', targetRef: 'arcWheelMain', eyeState: 'blue',
  message: 'PROPOSED: New hardware. The parts manifest is no longer a tray along the
  bottom. It is this wheel. Everything requisitioned is loaded onto it.' }
{ id: 'wheel-scroll', label: 'ARC WHEEL', targetRef: 'arcWheelMain', eyeState: 'blue',
  message: 'PROPOSED: Swipe the wheel to bring a piece to center. The one in the middle
  is selected. You will not see every part at once. That is the trade for the room it
  gives the board.' }
{ id: 'wheel-place', label: 'ARC WHEEL', targetRef: 'arcWheelMain', eyeState: 'blue',
  message: 'PROPOSED: Press and hold a piece, then drag it onto the board. Release where
  it belongs. No more tapping the grid. The wheel hands the piece to you directly.' }
```
First gesture taught after selection MUST be drag-place. Tap-select is a natural
carryover and needs no dedicated step.

Gestures deferred:
- Dismiss/recall: deferred (convenience for large boards; K1-1 is small). PROPOSED
  ambient line, introduce at K1-4 or K1-6 when boards grow: "PROPOSED: If the wheel
  is in the way, swipe it off the edge. It leaves a marker. Tap the marker to bring
  it back."
- Idle fade and per-instance semantics: self-evident; do NOT add steps.

arc-wheel-tutorial.md (APPROVED, Axiom-scoped) intersections:
- The Axiom four-beat NOTICE/INSTRUCT/CAPTURE/TEACH targets `arcWheelMain`. Kepler
  new-piece codex steps (K1-3 Latch, K1-5 Merger) target `boardGrid` because those
  pieces are pre-placed. This is an inherited inconsistency (see Open Questions).
- `mainNodeRef` forwarding, `tutorialFocusPiece`, the green-eye CAPTURE beat all
  remain valid and reused.

### 2.4 Animation invariants (ANIMATION_RULES REQ-A-1..3)
- REQ-A-1: a native-driven `Animated.Value` MUST be consumed by exactly one
  `Animated.View` across the lifecycle (no host-swap between conditional branches).
- REQ-A-2: a state transition MUST NOT unmount a native-driven host; refactor to a
  persistent host.
- REQ-A-3: any diff touching an `Animated.View` tree MUST grep every `Animated.Value`
  and confirm each native value appears in exactly one host (recite the attestation).
- `useNativeDriver: false` is LOCKED for all piece animations. RECOMMENDATION: keep the
  ENTIRE wheel JS-driven (matches today; trivially REQ-A compliant — zero native values).
- The drag ghost is conditionally mounted on `dragState.active`; if animated it MUST be
  plain or JS-driven (a native ghost would be a host-swap risk).
- The real crash class lives in `TutorialHUDOverlay`'s reaction to `await*` step fields,
  not in the wheel. The proposed wheel-onboarding steps add NO `await*` fields. Any
  future Kepler step that does MUST be reviewed against the post-fix overlay structure;
  `tutorialHUDOverlayTransitions.test.tsx` and `nativeDriverHostUniqueness.test.ts` MUST
  stay green.

### 2.5 Accessibility (WCAG 2.1 AA)
- Touch targets: selected node 52pt PASSES; neighbor nodes shrink to ~28pt — MUST-FIX
  via `hitSlop` to keep visual fish-eye while making effective targets >=44pt (or
  document a waiver). Recall strip is 5pt wide — MUST-FIX with `hitSlop` to >=44pt.
- Screen reader: use FULL piece names not terse codes; announce selection + position
  ("Conveyor, pre-assigned, selected, 2 of 5"); add `accessibilityRole`
  (`adjustable` on the pill with increment/decrement actions). PROPOSED pill label:
  "Piece selector wheel. Swipe up or down to choose a piece."
- Drag-to-place is inaccessible to screen-reader users: there MUST be a non-drag
  placement path (tap-select-then-tap-board; board handler already partially supports
  it via `selectedInventoryId`).
- Reduced motion: net-new. MUST respect OS reduce-motion — skip staggered entrance,
  replace dismiss slide with instant show/hide; idle fade MAY remain but SHOULD be
  reducible.

---

## 3. PER-LEVEL SPEC (K1-1 .. K1-10)

All `sector` = "Kepler Belt". Coordinates use the V2/CODE geometry as canonical;
the original doc's reversed/diagonal geometries and damaged-cell layouts are noted
as rejected alternatives. Data Trail `cells` use `null` (V2/CODE), NOT the original's
zero-filled 8-cell trails. `headPosition: 0` on all. cogsLine values cited "EXISTING"
are verbatim from NARRATIVE.md and treated PROPOSED pending final check.

Economy-field policy: the schema supports `creditBudget`, `freeTapes`,
`purchasableTapes`, `depthCeiling`, `baseReward`. Code currently carries them ONLY on
K1-1. This spec PROPOSES carrying them on every level (values below are PROPOSED,
derived from the original doc's pattern and the V2 budgets) — but whether later Kepler
levels actually open a requisition window is an Open Question (if `creditBudget` is 0
the requisition phase is skipped). Where V2 and CODE budgets diverge, V2's higher
`budget`/`creditBudget` are taken as canonical because V2 is the deliberate economy
rework; CODE's low values appear to be stale.

`scoringCategoriesVisible` uses the real `ScoringCategory` union: `'efficiency' |
'chainIntegrity' | 'protocolPrecision' | 'disciplineBonus' | 'speedBonus' |
'elaboration'`. NOTE the engine-gap caveat (Section 4 gap 10): `speedBonus` is
permanently 0 in the live engine; listing it surfaces a category that always scores 0.

---

### K1-1 — Corridor Entry
- id: `K1-1` | name: Corridor Entry | sector: Kepler Belt
- description (PROPOSED): "A former mining corridor the Axiom has, per the charts,
  transited before. The first work outside the home ship. Route two direction changes
  from Source to Terminal."
- cogsLine (EXISTING, NARRATIVE L586): "Kepler Belt. Former mining corridor, mostly
  decommissioned. Some salvage activity remains. We have been here before. The charts
  confirm it."
- eyeState: blue
- narrativeFrame (PROPOSED): "Arrival at a former mining corridor the Axiom has
  transited before. The first work outside the home ship."
- gridWidth: 8 | gridHeight: 6
- prePlacedPieces: source(1,2), terminal(6,4). (CANONICAL = V2/CODE. Original said
  source(1,1) — rejected.)
- availablePieces: conveyor x4, gear x2. (CANONICAL = V2 fix; CODE's 3 conveyors make
  the board unsolvable at Manhattan distance 7 from (1,2)->(6,4) — rejected.)
- dataTrail: { cells: [], headPosition: 0 } (no tape level)
- inputTape: undefined | expectedOutput: undefined
- tapeDesignRationale: n/a (no tape)
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 6 (CANONICAL = V2; CODE's 5 ties the unsolvable 3-conveyor tray — rejected.)
- budget: 40 | creditBudget: 75 | depthCeiling: 10 | baseReward: 100
- scoringCategoriesVisible: ['efficiency','chainIntegrity'] (CANONICAL = V2: REMOVE
  protocolPrecision — no Protocol pieces present. CODE includes it — rejected.)
- freeTapes: ['IN'] | purchasableTapes: ['TRAIL','OUT']
- computationalGoal: "Exactly two direction changes, no placement highlights. The
  Engineer decides where pieces go."
- conceptTaught: "Non-uniform tape handling under new rules: REQUISITION store debut +
  Arc Wheel debut + no placement highlights."
- prerequisiteConcept: "Axiom pipeline (Scanner reads / Config gates / Transmitter
  records); path building + direction (Conveyor, Gear)."
- difficultyBand: intuitive
- tutorialSteps (PROPOSED): EXISTING approved store steps `store-intro`, `store-tabs`,
  `store-forfeiture`, `store-window` (text unchanged; targetRef repointed from `'tray'`
  to REQUISITION panel ref); NEW `wheel-intro` / `wheel-scroll` / `wheel-place`
  (Section 2.3, targetRef `arcWheelMain`, eyeState blue); then `board-intro`,
  `board-resume` (targetRef `boardGrid`). Sequence by phase, not array index.
- consequence: NONE (confirmed — not in the K1-4/8/10 set).
- Post-level dialogue (PROPOSED):
  - SUCCESS 3-star (sample, Drive Engineer): "Three stars. Physics-primary. Efficient.
    Direct. The discipline is working." (DIALOGUE_SYSTEM L288)
  - FAILURE void: "No stars. The pieces were present. The routing logic was not. Kepler
    Belt is the first corridor where the work has weight. The corridor is repairable.
    We try again." (eyeState red per matrix)

---

### K1-2 — Relay Splice
- id: `K1-2` | name: Relay Splice | sector: Kepler Belt
- description (PROPOSED): "A primary relay chain that has outlasted its maintainers.
  Pass each input value through to output unchanged."
- cogsLine (EXISTING, L590): "The primary relay chain out here was built to last. It
  has lasted past the people responsible for maintaining it. That is a common condition
  in this corridor."
- eyeState: blue
- narrativeFrame: "A primary relay chain that has outlasted the people who maintained it."
- gridWidth: 9 | gridHeight: 6
- prePlacedPieces: source(1,3), terminal(7,3)
- availablePieces: conveyor x4, scanner, transmitter, gear (CANONICAL = V2/CODE;
  original's 5-piece set rejected).
- dataTrail: { cells: [null,null,null,null,null], headPosition: 0 } (CANONICAL = V2/CODE
  5 nulls; original's 8 zero cells rejected).
- inputTape: [1,0,1,1,0] | expectedOutput: [1,0,1,1,0]
- tapeDesignRationale (PROPOSED): "Identity pass-through. Tape varies (non-uniform) so a
  stateless hardcode for the first value fails on a differing bit."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 5
- budget: 80 (CANONICAL = V2; CODE 35 rejected) | creditBudget: 80 | depthCeiling: 10 | baseReward: 100
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision']
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: [] (CANONICAL = original; later
  levels' tape split is an Open Question)
- computationalGoal: "Pass each input tape value through to output unchanged (identity)."
- conceptTaught: "Dynamic state across pulses — Data Trail as live memory, written/read
  each pulse, not a static preset."
- prerequisiteConcept: "Non-uniform tape handling (K1-1); memory persists/read/write (Axiom)."
- difficultyBand: intuitive
- tutorialSteps: 2 existing instructor steps (board-intro, board-resume; aligned across
  all sources).
- consequence: NONE.
- Post-level dialogue (PROPOSED):
  - SUCCESS 2-star (Drive Engineer): "Two stars. Physics-primary. The routing was sound.
    The optimization was not complete. One fewer piece would have changed the rating." (L310)
  - FAILURE 1-star (Systems Architect): "One star. The Protocol pieces were present in
    the solution. Their contribution to the outcome was marginal. The discipline expects
    more of them." (L96)

---

### K1-3 — Junction 7  (NEW PIECE: Latch, pre-placed)
- id: `K1-3` | name: Junction 7 | sector: Kepler Belt
- description (PROPOSED): "A routing bottleneck where eleven settlements feed through one
  underbuilt point. A Latch on the board remembers a value; gate the pulses through it."
- cogsLine (EXISTING, L594): "Junction 7 is a routing bottleneck. Eleven settlements feed
  through this point. The original engineers underestimated the load. It is not the last
  time that has happened out here."
- eyeState: blue
- narrativeFrame: "A routing bottleneck where eleven settlements feed through one
  underbuilt point."
- gridWidth: 10 | gridHeight: 7
- prePlacedPieces: source(1,3), latch(4,3) with latchMode:'write' (MUST set explicitly;
  CODE omits it — fix), terminal(8,3). (CANONICAL = V2/CODE. Original's terminal(8,5),
  no Latch, Splitter-intro version is the NOTED ALTERNATIVE.)
- availablePieces: conveyor x4, scanner, transmitter, configNode, gear
- dataTrail: { cells: [null,null,null,null,null], headPosition: 0 }
- inputTape: [1,1,0,1,1] | expectedOutput: [1,1,0,1,1]
- tapeDesignRationale (PROPOSED, V2 REQ-1 per-pulse rewrite): "Per-pulse: the Latch WRITE
  captures the current pulse value, the Config gate reads it within the same pulse. Tape
  is non-uniform so a single stored constant cannot satisfy all pulses." (CODE's
  cross-pulse 'store FIRST value, gate SUBSEQUENT' rationale is the documented bug — rejected.)
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 5 (CANONICAL = V2/CODE; original 6 rejected)
- budget: 100 (V2; CODE 40 rejected) | creditBudget: 100 | depthCeiling: 10 | baseReward: 100
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision']
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "Per-pulse gating: Latch WRITE captures each pulse, Config Node gates."
- conceptTaught: "Latch — a single stored value, write/read are separate operations."
- prerequisiteConcept: "Dynamic state across pulses (K1-2); read/write separation (Axiom)."
- difficultyBand: derivable
- tutorialSteps (PROPOSED): board-intro, `latch-collect` (codexEntryId 'latch',
  targetRef 'boardGrid' — Latch is pre-placed), board-resume. (Original's 4-step Splitter
  tutorial is the noted alternative tied to the rejected Splitter-intro design.)
- consequence: NONE.
- ENGINE NOTE: prePlaced() category bug — the pre-placed Latch must be category
  'protocol'; current `prePlaced()` mis-categorizes latch/inverter/counter as 'physics'
  (Section 4 / global bug). Fix before this level lands.
- Post-level dialogue (PROPOSED):
  - SUCCESS 3-star mixed (Drive Engineer): "Three stars. Mixed approach from a Drive
    Engineer. ... The result argues for itself." (L432)
  - FAILURE void mixed: "No stars. Mixed approach, void result. Neither piece type was
    used effectively. The Engineer was present. The discipline was not." (L260, red)

NOTED ALTERNATIVE (teaching-map report + original doc): K1-3 could instead introduce the
MERGER (or the original's SPLITTER) and defer the Latch. Rejected for canonical because
the approved cogsLine, the narrative frame, and the code/engine are all keyed to Junction
7 = Latch. See Open Questions.

---

### K1-4 — Mining Platform Alpha  (CONSEQUENCE)
- id: `K1-4` | name: Mining Platform Alpha | sector: Kepler Belt
- description (PROPOSED): "A platform decommissioned six years ago, repurposed by
  colonists as a signal relay it was never built for. Output each input value faithfully
  using a Latch + Config gate."
- cogsLine (EXISTING, L598): "Mining Platform Alpha has been decommissioned for six years.
  The colonists use it as a signal relay. It was not designed for this purpose. It is
  doing the job anyway."
- eyeState: blue (PROPOSED per-step shift to amber on the colonist-dependency reveal — see
  Open Questions; CONFIRM whether per-step eye changes are allowed on non-boss levels).
- narrativeFrame: "A decommissioned mining platform colonists repurposed as a relay."
- gridWidth: 10 | gridHeight: 7
- prePlacedPieces: source(1,3), terminal(8,3). (CANONICAL = V2/CODE; Latch is in the
  tray, player-placed. Original's reversed geometry source(8,1)/terminal(2,5) + pre-placed
  Latch(5,3) is the noted alternative.)
- availablePieces: conveyor x4, scanner, latch, configNode, transmitter, gear x2
- dataTrail: { cells: [null,null,null,null,null,null], headPosition: 0 }
- inputTape: [1,0,0,1,1,0] | expectedOutput: [1,0,0,1,1,0]
- tapeDesignRationale (PROPOSED): "Identity via player-placed Latch WRITE per pulse + Config
  gate. Non-uniform tape with a zero run defeats any always-pass hardcode."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 6
- budget: 130 (V2; CODE 45 rejected) | creditBudget: 100 | depthCeiling: 10 | baseReward: 110
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision']
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "Output 1 when input 1, 0 when 0. Latch stores each pulse value and
  gates a Config Node."
- conceptTaught: "Precise placement as the Kepler discipline, under consequence stakes."
- prerequisiteConcept: "Latch write-then-read (K1-3)."
- difficultyBand: derivable
- tutorialSteps: NONE (consequence level; V2 confirms absence is acceptable; CODE has none).
- consequence (CONFIRMED present; requireThreeStars NOT set):
  - cogsWarning (PROPOSED, NEW, below-boss weight): "Mining Platform Alpha is carrying
    more than it was built to carry. If the relay drops, it does not fail quietly. The
    colonists routing through it lose their signal path before they know it is gone. I am
    stating the stakes once. Proceed."
  - failureEffect (PROPOSED, NEW): "The platform relay dropped. Four settlements on the
    Alpha branch lost signal routing for the duration. They reverted to manual relay, the
    way they did before this ship arrived. No casualties logged. I am logging the
    interruption. They will have noticed it."
- Post-level dialogue (PROPOSED):
  - SUCCESS 3-star (Field Operative): "Full marks. Efficient use of both piece types. No
    redundancy. ... So does the scoring engine." (L510)
  - FAILURE void (Drive Engineer): "No stars. Physics pieces used extensively, void rating
    achieved. The pieces were present. The routing logic was not." (L342, red) + optional
    hubFollowUp (L778): "I have reviewed the last level. I am available to run a systems
    diagnostic ... The offer stands without judgment attached to it." (blue)

---

### K1-5 — Resupply Chain  (NEW PIECE: Merger; Splitter back-introduced, pre-placed)
- id: `K1-5` | name: Resupply Chain | sector: Kepler Belt
- description (PROPOSED): "Four degraded relay nodes the colonists have compensated for
  manually for years. A Splitter forks the signal; a Merger reconverges it — either path
  is sufficient."
- cogsLine (EXISTING, L602): "The resupply chain for this region runs through four
  independent relay nodes. All four are degraded. The colonists have been compensating
  manually for at least two years. They have not filed a formal repair request. I find
  that worth noting."
- eyeState: blue
- narrativeFrame: "Four degraded relay nodes colonists have manually compensated for."
- gridWidth: 10 | gridHeight: 8
- prePlacedPieces: source(1,4), splitter(3,4), terminal(8,4). (CANONICAL = V2/CODE.
  Original's damaged-cell diagonal barrier + Latch-routing version is the noted alternative.)
- availablePieces: conveyor x6, merger, scanner, configNode, transmitter, gear x2
- dataTrail: { cells: [null,null,null,null], headPosition: 0 }
- inputTape: [1,0,1,0] | expectedOutput: [1,0,1,0] (CANONICAL = V2/CODE under Transmitter
  Model β — the value carried is written, not a presence "1". The original's [1,0,1,0,1]
  length and the rejected Model-alpha [1,1,1,1] are both noted alternatives.)
- tapeDesignRationale (PROPOSED): "OR-redundancy: Splitter forks to a gated Path A + a
  bypass Path B; Merger reconverges. Under Model β the output tracks the carried value, so
  the tape is identity, not always-1."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 9 (CANONICAL = V2, which flags CODE's 8 as likely wrong — VERIFY at build.)
- budget: 155 (V2; CODE 50 rejected) | creditBudget: 100 | depthCeiling: 10 | baseReward: 110
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision']
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "OR-redundancy via Splitter -> gated Path A + bypass Path B -> Merger."
- conceptTaught: "Merger — OR logic / parallel-path convergence (either input suffices)."
- prerequisiteConcept: "Parallel paths exist; routing under pressure (K1-3/K1-4)."
- difficultyBand: derivable
- tutorialSteps (PROPOSED): board-intro, `merger-collect` (codexEntryId 'merger', targetRef
  'boardGrid'), board-resume. V2 REQ-5 ALSO mandates a Splitter Codex step (codexEntryId
  'splitter') because the Splitter has no prior Codex entry — CODE is MISSING it. ADD the
  Splitter collector step. (See Splitter-ownership Open Question.)
- consequence: NONE.
- ENGINE NOTE: Merger OR semantics are PARTIAL (Section 4 gap 3) — both inbound paths must
  carry identical values, which this design satisfies.
- Post-level dialogue (PROPOSED):
  - SUCCESS 3-star (Systems Architect): "Full Protocol integrity on the first pass. ... It
    was applied correctly." (L51)
  - FAILURE 2-star against type (Drive Engineer): "Two stars. Protocol-heavy from a Drive
    Engineer. ... Two stars is the cost of not using it." (L382)

---

### K1-6 — Colonist Hub  (requiredPieces: splitter, merger)
- id: `K1-6` | name: Colonist Hub | sector: Kepler Belt
- description (PROPOSED): "A coordination hub for thirty-one settlements running on
  equipment three cycles overdue. Build stateful branching that outputs each value
  faithfully — and the Hub requires both a Splitter and a Merger."
- cogsLine (EXISTING, L606): "The Colonist Hub coordinates resupply for thirty-one
  settlements. It is running on equipment that should have been replaced three cycles ago.
  The people depending on it do not have the option of waiting for something better."
- eyeState: amber (EXISTING source marks AMBER)
- narrativeFrame: "A coordination hub for thirty-one settlements on aging infrastructure;
  the human-stakes peak of the non-boss Kepler levels."
- gridWidth: 11 | gridHeight: 8
- prePlacedPieces: source(1,4), terminal(9,4). (CANONICAL = V2/CODE. Original's pre-placed
  Splitter(3,4) + damaged cells (5,2),(6,6) version is the noted alternative.)
- availablePieces: conveyor x6, scanner, latch, splitter, merger, configNode, transmitter, gear x2
- dataTrail: { cells: [null,null,null,null,null,null], headPosition: 0 }
- inputTape: [1,0,1,1,0,1] | expectedOutput: [1,0,1,1,0,1] (CANONICAL = V2/CODE identity;
  original's [1,0,1,0] -> [1,1,1,1] always-1 design rejected.)
- tapeDesignRationale (PROPOSED): "Identity via Latch-store + Splitter + gated/bypass +
  Merger. Required pieces force the redundant routing pattern."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 11 (CANONICAL = V2/CODE; original 8 rejected)
- requiredPieces: [{ type:'splitter', count:1 }, { type:'merger', count:1 }] (CANONICAL =
  V2/CODE; original's merger-only + reason string is the noted alternative — see Open Q on
  reason strings).
- budget: 55 | creditBudget: (PROPOSED) 120 | depthCeiling: 12 | baseReward: 120
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision','disciplineBonus']
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "Identity output via stateful branching; Latch stores, Splitter/Merger
  route."
- conceptTaught: "Parallel paths serving different purposes; required-piece enforcement."
- prerequisiteConcept: "Merger (K1-5); Latch (K1-3/K1-4)."
- difficultyBand: derivable
- tutorialSteps (PROPOSED): V2 REQ-53 MUST add 2 instructor steps; CODE has NONE. ADD 2
  board-grid instructor steps (no new piece — both pieces already introduced).
- consequence: NONE.
- requiredPieces ENFORCEMENT MODEL (CANONICAL = V2 A3a): post-run, COGS-voiced rejection,
  consumes a life — NOT the original's pre-engage modal with no life lost. Rationale:
  "Failure is the curriculum." The original's pre-engage/no-life model is the noted
  alternative (see Open Questions).
- COGS requiredPieces-not-engaged dialogue (PROPOSED, unwritten — `requiredPiecesNotEngaged`
  slot): must name Splitter + Merger; copy NOT yet authored; needs Tucker.
- Post-level dialogue (PROPOSED):
  - SUCCESS 3-star mixed (Systems Architect): "Three stars. Mixed approach from a Systems
    Architect. ... The Engineer found a third option. It worked." (L208)
  - FAILURE 1-star mixed: "One star. Mixed methodology ... Splitting the focus split the
    result." (L244)

---

### K1-7 — Ore Processing  (NEW PIECE: Bridge, pre-placed)
- id: `K1-7` | name: Ore Processing | sector: Kepler Belt
- description (PROPOSED): "An ore processing relay still transmitting though no mining
  remains. Two independent signal processes cross through a Bridge without interfering."
- cogsLine (EXISTING, L610): "The ore processing relay is still active. There is no active
  mining in this corridor. Something is still transmitting on the processing frequency. I
  have not identified the source. It is not relevant to the current objective."
- eyeState: amber (EXISTING source marks AMBER)
- narrativeFrame: "A relay still transmitting on a dead frequency; the unidentified source
  is a flagged Chapter Two seed — do NOT resolve in Kepler."
- gridWidth: 10 | gridHeight: 8
- prePlacedPieces: source(1,3), terminal(8,6), splitter(4,3), bridge(5,5). (CANONICAL =
  V2/CODE; Splitter pre-placed feeds the Bridge's second crossing path. Original's Bridge(5,4)
  only + damaged cell (4,5) version is the noted alternative.)
- availablePieces: conveyor x6, scanner, transmitter, gear x3, configNode. (Splitter MUST
  NOT be in the tray — it is pre-placed; CODE correctly omits it.)
- dataTrail: { cells: [null,null,null,null], headPosition: 0 }
- inputTape: [1,0,1,1] | expectedOutput: [1,0,1,1]
- tapeDesignRationale (PROPOSED): "Two independent paths: Path A primary N-S carries the
  signal-of-record; Path B monitoring E-W crosses A through the Bridge. Identity output."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 7 (ALIGNED across all sources)
- budget: 55 | creditBudget: (PROPOSED) 120 | depthCeiling: 12 | baseReward: 120
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision','disciplineBonus']
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "Two independent processes cross via Bridge; parallel paths, different purposes."
- conceptTaught: "Bridge — two paths share one cell without interacting (independence)."
- prerequisiteConcept: "Parallel paths (K1-5/K1-6)."
- difficultyBand: derivable
- tutorialSteps (PROPOSED): board-intro ("Something in the available pieces solves this" —
  rename-compliant), `bridge-collect` (codexEntryId 'bridge', targetRef 'boardGrid'),
  board-resume.
- consequence: NONE.
- Post-level dialogue (PROPOSED):
  - SUCCESS 2-star (Systems Architect): "Protocol pieces engaged. Results acceptable. The
    approach was sound. The execution had room." (L76, "acceptable" at ceiling)
  - FAILURE void against type (Drive Engineer): "Void. Protocol-dominant, Drive Engineer
    discipline. The mismatch produced the expected result. That is the only thing about
    this outcome that was expected." (L418, red)

---

### K1-8 — Transit Gate  (CONSEQUENCE; requiredPieces: bridge, latch, splitter, merger)
- id: `K1-8` | name: Transit Gate | sector: Kepler Belt
- description (PROPOSED): "A traffic-regulation gate never updated since the mines closed,
  routing ghost traffic from ships that no longer exist. Integrate Bridge + Latch to hold
  the routing clean."
- cogsLine (EXISTING, L616): "The transit gate regulates traffic flow through the entire
  corridor. It has not been updated since the mining operations closed. It is routing ghost
  traffic from ships that no longer exist. I find that inefficient and something else I
  will not specify."
- eyeState: blue (PROPOSED brief amber flicker on "something else I will not specify" — the
  buried 847-days beat; see Open Questions, risk of over-signaling).
- narrativeFrame: "A traffic gate routing ghost traffic; a buried thematic rhyme with COGS's
  waiting, never stated."
- gridWidth: 11 | gridHeight: 8 (CANONICAL = V2/CODE; original 11x9 + two terminals rejected.)
- prePlacedPieces: source(1,4), terminal(9,4). (CANONICAL = single terminal, V2/CODE. The
  original's TWO-TERMINAL design — Terminal A(1,7), Terminal B(9,7), Source(5,1) — is the
  noted alternative and a root-level mechanic conflict; see Open Questions.)
- availablePieces: conveyor x6, scanner, latch, bridge, splitter, configNode, transmitter,
  gear x3, merger
- dataTrail: { cells: [null,null,null,null,null,null,null,null], headPosition: 0 }
- inputTape: [1,1,0,1,0,0,1,1] | expectedOutput: [1,1,0,1,0,0,1,1]
- tapeDesignRationale (PROPOSED): "Integration: signal crosses itself via Bridge while a
  Latch stores state; identity output on an 8-pulse non-uniform tape."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 12 (CANONICAL = V2/CODE; original not read)
- requiredPieces: [{type:'bridge',count:1},{type:'latch',count:1},{type:'splitter',count:1},{type:'merger',count:1}]
- budget: 60 | creditBudget: (PROPOSED) 140 | depthCeiling: 14 | baseReward: 140
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision','disciplineBonus','speedBonus']
  (CAVEAT: speedBonus always scores 0 in the live engine — Section 4 gap 10.)
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "Bridge + Latch integration; identity output; single terminal."
- conceptTaught: "A single stored value drives multiple decisions, under consequence stakes."
- prerequisiteConcept: "Latch (K1-3/4), Bridge (K1-7), Merger/Splitter (K1-5/6)."
- difficultyBand: abstract
- tutorialSteps (PROPOSED): V2 REQ-70 MUST add 2 board-grid steps; CODE has NONE. ADD them.
- consequence (CONFIRMED present; requireThreeStars NOT set):
  - cogsWarning (PROPOSED, NEW, below-boss): "The transit gate sorts everything moving
    through this corridor, including traffic that stopped existing years ago. If the routing
    logic fails, live traffic gets queued behind ghosts. Nothing collides. Everything waits.
    Hold the routing clean. Proceed."
  - failureEffect (PROPOSED, NEW): "The gate routing collapsed back to its default table.
    Live corridor traffic queued behind transit records for ships that no longer exist. The
    backlog cleared on its own in time. No vessel was lost. The gate kept faithfully
    directing the dead. I have left that observation in the log without further comment."
- requiredPieces-not-engaged dialogue (PROPOSED, unwritten): must enumerate Bridge, Latch,
  Splitter, Merger; needs Tucker.
- NarrativeConsequence (V2 REQ-72/75): a `damage_system` NarrativeConsequence record keyed
  to triggerLevelId 'K1-8' should exist separate from the `consequence` text object; CODE
  carries only the text object. (See Section 4 / consequence mis-key gap.)
- Post-level dialogue (PROPOSED):
  - SUCCESS 3-star (Drive Engineer): "Clean routing. Physics pieces used efficiently. ... The
    signal path found the shortest distance and took it." (L284)
  - FAILURE void (Field Operative): "Void. The Field Operative discipline is built around the
    idea that the best solution uses the fewest pieces. This solution used the most pieces.
    Those are opposite ideas." (L568, red)

---

### K1-9 — The Narrows
- id: `K1-9` | name: The Narrows | sector: Kepler Belt
- description (PROPOSED): "The densest, most interference-heavy section of the corridor.
  Output each pulse the value of the PREVIOUS pulse — a one-pulse delay."
- cogsLine (EXISTING, L622): "The Narrows is the densest section of the corridor. Maximum
  signal interference. The colonists call it The Narrows because of what it does to
  communication. It has another name on older charts. I will use the current one."
- eyeState: blue
- narrativeFrame: "The densest section; a quiet breadcrumb that the corridor predates current habitation."
- gridWidth: 11 | gridHeight: 9
- prePlacedPieces: source(1,4), terminal(9,4) (no obstacles)
- availablePieces: conveyor x8, scanner, latch x2, splitter, merger, configNode x2,
  transmitter, gear x3, bridge
- dataTrail: { cells: [null,null,null,null,null,null], headPosition: 0 }
- inputTape: [0,1,1,0,1,0]
- expectedOutput: [0,0,1,1,0,1] (CANONICAL = V2 — the 1-pulse shift register, output[N] =
  input[N-1], output[0]=0. CODE's [0,1,0,1,1,1] is the XOR design that V2's audit declares
  UNSOLVABLE with Kepler pieces — REJECTED.)
- tapeDesignRationale (PROPOSED): "Shift register: each pulse outputs the previous pulse's
  value via Latch DELAY mode. output[0]=0 (nothing stored yet). Tape forces a true
  cross-pulse memory, not a hardcode."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 7 (CANONICAL = V2; CODE 11 rejected)
- budget: 50 (V2; CODE 70 rejected) | creditBudget: (PROPOSED) 150 | depthCeiling: 16 | baseReward: 120
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision','disciplineBonus','speedBonus']
  (CAVEAT: speedBonus always 0.)
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "output[N] = input[N-1], 1-pulse shift; output[0]=0."
- conceptTaught: "Solution vs algorithm — correct for ANY valid input (the Kepler exit thesis)."
- prerequisiteConcept: "Stateful multi-decision machines (K1-7/8); non-uniform tapes (K1-1)."
- difficultyBand: abstract
- tutorialSteps (PROPOSED): exactly 3 steps introducing Latch DELAY mode (codexEntryId 'latch',
  updated entry); CODE has NONE. ADD them.
- consequence: NONE (V2 REQ-85 confirms K1-9 is not a consequence level).
- ENGINE PREREQUISITE: Latch DELAY mode (third tap state, D flip-flop) does NOT exist in the
  engine (Section 4). K1-9 MUST NOT ship without it.
- Post-level dialogue (PROPOSED):
  - SUCCESS 3-star (Field Operative): "Three stars. Optimal piece count. The solution was
    tight. I find tight solutions preferable to elaborate ones. Not as a preference. As an
    engineering principle." (L516)
  - FAILURE 1-star against type (Field Operative): "One star. Single piece type, above-optimal
    count, one-star result. The Field Operative methodology is built for exactly this kind of
    level. It was not applied to it." (L616)

---

### K1-10 — Central Hub  (BOSS, CONSEQUENCE, requireThreeStars)
- id: `K1-10` | name: Central Hub | sector: Kepler Belt
- description (PROPOSED): "The corridor's single point of failure. Output 1 only when the
  current pulse AND the previous pulse are both 1 — a consecutive-ones detector."
- cogsLine (EXISTING, L626): "The Central Hub. Everything in this corridor routes through here.
  If it holds, the corridor holds. Three hundred thousand people depend on infrastructure that
  runs through a single point. That is not good design. It is, however, the current situation."
- eyeState: amber (EXISTING source marks AMBER; hold amber through the run; on failure stay
  amber, NOT red — red is reserved for the Rift/Deep Void strain arc).
- narrativeFrame: "The corridor's single point of failure; bad design, current situation."
- gridWidth: 12 | gridHeight: 9
- prePlacedPieces: source(1,4), terminal(10,4) (no obstacles)
- availablePieces: conveyor x8, scanner x2, latch x2, splitter, merger, configNode x2,
  transmitter, gear x4, bridge
- dataTrail: { cells: [null,null,null,null,null,null,null,null,null,null], headPosition: 0 }
- inputTape: [1,1,0,1,1,1,0,0,1,1]
- expectedOutput: [0,1,0,0,1,1,0,0,0,1] (CANONICAL — ALIGNED V2 + CODE; MUST NOT change.)
- tapeDesignRationale (PROPOSED): "Temporal AND: output[N] = input[N] AND input[N-1];
  output[0]=0. Detects consecutive 1s via Latch DELAY (stored previous pulse) ANDed with the
  current pulse. The tape includes a 1-run and isolated 1s to defeat any hardcode."
- objectives: [{ type: 'reach_output' }]
- optimalPieces: 8 (CANONICAL = V2; CODE 13 rejected)
- budget: 80 | creditBudget: (PROPOSED) 180 | depthCeiling: 18 | baseReward: 150
- scoringCategoriesVisible: ['efficiency','chainIntegrity','protocolPrecision','disciplineBonus','speedBonus']
  (CAVEAT: speedBonus always 0.)
- freeTapes: ['IN','TRAIL','OUT'] | purchasableTapes: []
- computationalGoal: "output[N] = input[N] AND input[N-1]; output[0]=0 (consecutive-1 detector)."
- conceptTaught: "Kepler synthesis capstone — full stateful computation under maximum stakes."
- prerequisiteConcept: "All Kepler concepts (K1-1..K1-9), especially Latch DELAY (K1-9)."
- difficultyBand: abstract
- tutorialSteps (PROPOSED): exactly 2 steps (board-intro amber + board-resume blue), copy
  referencing "the Engineer"; CODE has 1 step with divergent wording. Reconcile to 2 steps.
- consequence (CONFIRMED present; requireThreeStars: TRUE):
  - cogsWarning (PROPOSED, NEW, boss-weight): "The Central Hub is the corridor's single point
    of failure. There is no redundancy. If this routing does not hold, it does not degrade
    gracefully. It drops. Three hundred thousand people are downstream of the work you are
    about to do. I am not saying that to apply pressure. I am saying it because it is the
    situation, and you should have it before you begin. Proceed."
  - failureEffect / consequenceNarrative (EXISTING, NARRATIVE L254-258): "The relay failure has
    been logged with the transit authority. Three hundred and fourteen colonists lost scheduled
    resupply access for eleven days. The transit authority has filed a negligence inquiry against
    this vessel. [Amber eyes.] I would suggest we resolve the inquiry through competence rather
    than correspondence. The systems are repairable."
- ENGINE PREREQUISITE: Latch DELAY mode (Section 4). K1-10 MUST NOT ship without it. ALSO the
  Kepler boss NarrativeConsequence is mis-keyed to 'K2-10' and will never fire for 'K1-10' —
  MUST be corrected (Section 4 gap 8).
- Boss success lines (EXISTING, NARRATIVE L440-450):
  - Standard: "Central Hub relay restored. The corridor is functional. The colonists will
    receive their resupply on schedule. That is the intended outcome."
  - First attempt: "Central Hub restored. Single attempt. The colonists will not know how close
    the margin was. That is acceptable."
  - First attempt, 3 stars (amber): "Central Hub restored. First attempt. The efficiency rating
    is the highest I have logged for an operation of this complexity. I have nothing to add to
    that. The work speaks."
- Boss-void special case (DIALOGUE_SYSTEM L788): "The boss level was not completed at a passing
  threshold. The sector is not closed. The systems are repairable. We try again."
- Post-boss breadcrumb (EXISTING, NARRATIVE L135-137, fires after standard completion):
  "The nav system has logged this route before. Prior transit. No mission data attached. I have
  nothing to add to that."
- Post-sector arc line (EXISTING, DIALOGUE_SYSTEM L844, after full Kepler completion): "Kepler
  Belt sector complete. The corridor is stable. The colonists have resupply. I want to note that
  the work in this sector had consequences for real people. The Engineer should know that was
  not lost on me."

CONSEQUENCE-LEVEL CONFIRMATION: K1-4, K1-8, K1-10 carry a `consequence` object;
requireThreeStars is set ONLY on K1-10. This MATCHES the existing specs and code and is
CONFIRMED canonical. No other Kepler level carries a consequence.

---

## 4. ENGINE GAP LIST (must ship BEFORE level data lands)

Every item below is engineering work that MUST land before the corresponding level data
can ship. (Full audit: kepler-engine-capability-audit.md.) PARTIAL + MISSING total: 10,
plus 3 cross-level code bugs from the archaeology report.

1. Config Node gating — PARTIAL. Config Node reads only the Data Trail
   (`trail.cells[pulseIndex]` then `headPosition` then `nodeValue` fallback that trivially
   passes when the trail is empty/short). It cannot read a Latch's stored output within the
   same pulse. The K1-4 "Config reads the Latch output" model is unsupported. FIX: either
   route Latch output to the trail before the gate, or extend Config Node to gate on the
   carried signal value. (engine.ts:356-377.)
2. Transmitter target cell — PARTIAL. Write index hardwired to `pulseIndex`; no addressable
   target. Sufficient for all K1 one-output-per-pulse designs, but blocks any future
   out-of-order tape write. (engine.ts:394-412.)
3. Merger OR logic — PARTIAL. No value-level OR; the second converging path is dropped by the
   BFS visited-set dedup. K1-5/K1-6 work ONLY because both inbound paths carry identical
   values. FIX: define + verify Merger value semantics, or constrain designs so both paths
   always carry the same bit. (engine.ts:60-61, 98-99, 315-316, 414-416.)
4. Counter increment/reset — PARTIAL, and UNUSED by any K1 level. No per-pulse/explicit reset;
   count accumulates monotonically across pulses. Since Kepler withholds the Counter, this is a
   non-blocker for Kepler — but it means "Counter increment/reset" is NOT a Kepler mechanic and
   should be struck from the Kepler teach list. (engine.ts:435-449, 604-608.)
5. Capacitor — MISSING. No PieceType member, no engine support. Not required by any K1 level
   (withheld to Nova Fringe). Non-blocker for Kepler.
6. Divergence Gate — MISSING. No support. Withheld to Nova Fringe. Non-blocker.
7. Confluence Node — MISSING. No support. Withheld to Nova Fringe. Non-blocker. (Merger covers
   the Kepler two-paths-converge teaching point.)
8. Damage mechanic — PARTIAL, BLOCKER for K1-10. The Kepler boss `NarrativeConsequence`
   `triggerLevelId` is 'K2-10' but the actual boss is 'K1-10', so `getTriggeredConsequence
   ('K1-10', ...)` NEVER matches and the propulsion damage never fires. Additionally the
   per-level `ConsequenceConfig` on K1-4/8/10 is text-only (no `mechanicalEffects`), so those
   levels apply no mechanical damage of their own; mechanical damage flows solely through the
   mis-keyed NarrativeConsequence path. FIX: re-key to 'K1-10' and/or add `mechanicalEffects` to
   the per-level consequence configs. (consequences.ts:17-43, 21, 185-206.)
9. requiredPieces enforcement — PARTIAL caveat. Core logic IMPLEMENTED (engine.ts:610-630) and
   exercised by K1-6/K1-8. BUT it matches `s.pieceId === entry.type`; the engine sets
   `firedDuringRun` on instances whose `.id` is an instance id (e.g. `inv-NN`). The
   instance->type mapping is done by an unaudited caller. VERIFY the caller maps instance->type
   before `evaluateRequiredPieces`, or K1-6/K1-8 will silently report zero engaged. (engine.ts:321, 621.)
10. Scoring v2 five named components — MISSING as specified, BLOCKER (policy conflict). The
    locked CLAUDE.md spec is Efficiency 30 / Protocol Precision 25 / Chain Integrity 20 /
    Discipline 15 / Speed 10. The live engine emits a DIFFERENT six-bucket model (completion 25,
    pathIntegrity 15, signalDepth 14, investment 25, diversity 11, discipline 10) with
    `speedBonus` HARDCODED to 0. The legacy five names survive only as backward-compat aliases
    with different weights and Speed permanently zero. No Kepler level can emit a non-zero Speed
    component. RESOLVE which scoring model is canonical before building levels; reconcile the
    `scoringCategoriesVisible` lists (which include `'speedBonus'`) with whatever the engine
    actually emits. (scoring.ts:124-228, 219.)

ADDITIONAL CODE BUGS (from archaeology, must fix before level data lands):
A. Latch DELAY mode does NOT exist. K1-9 (shift register) and K1-10 (temporal AND) both REQUIRE
   a new third Latch tap state (D flip-flop / delay). NEITHER level may ship without it. This is
   the single largest engine prerequisite for the back half of the sector.
B. `prePlaced()` category bug — `prePlaced()` (levels.ts ~lines 17-20) categorizes only
   `configNode || scanner || transmitter` as protocol, so a pre-placed Latch/Inverter/Counter is
   mis-categorized 'physics'. Fix before K1-3 (pre-placed Latch) lands.
C. Pre-placed Latch `latchMode` not set — K1-3's pre-placed Latch must set `latchMode:'write'`
   explicitly; CODE omits it.

---

## 5. OPEN QUESTIONS FOR TUCKER

1. PRECEDENCE: This spec adopts the V2/CODE level-and-mechanic assignment (Latch@K1-3,
   Merger@K1-5, Bridge@K1-7) over the original doc's (Splitter@K1-3, Damaged Cells@K1-5,
   Merger@K1-6) and over the teaching-map's (Merger@K1-3, Bridge@K1-5, Latch@K1-7) — confirm
   this is correct, since all three sources claim primacy. RECOMMENDATION: adopt V2/CODE as
   canonical (it is what the approved per-level COGS lines, narrative, and engine are keyed to).
2. SCORING MODEL: The locked CLAUDE.md five-component spec (with Speed 10) and the live
   six-bucket engine (Speed permanently 0) disagree; which is canonical for Kepler, and should
   `scoringCategoriesVisible` keep listing `speedBonus` when it always scores 0? RECOMMENDATION:
   either restore a real Speed component or drop `speedBonus` from the visible lists.
3. LATCH DELAY MODE: K1-9 and K1-10 both require a Latch DELAY (D flip-flop) mode that does not
   exist in the engine; confirm we build it (the alternative is redesigning both levels around
   existing WRITE/READ). RECOMMENDATION: build the DELAY mode — it is the cleanest path and the
   levels' computational goals depend on it.
4. CREDIT BUDGET COVERAGE: Only K1-1 carries a `creditBudget` in code; if later levels have 0,
   the requisition window is skipped and blue (requisitioned) wheel nodes appear ONLY at K1-1 —
   is requisition intended at every Kepler level or only K1-1? RECOMMENDATION: open requisition
   on every level (PROPOSED budgets above) so the expanding-tray economy and forfeiture loop
   actually function across the sector.
5. K1-8 ONE TERMINAL vs TWO: The original made Transit Gate a two-terminal level (Terminal A +
   Terminal B, both must receive); V2/CODE use a single terminal Bridge+Latch integration —
   confirm single-terminal is canonical. RECOMMENDATION: single terminal (engine + requiredPieces
   are built for it; two-terminal needs new engine support).
6. DAMAGED CELLS: The original's signature damaged-cell mechanic (K1-5/6/7/8) is absent from V2,
   the engine, and code; do we re-introduce blown-from-design damaged cells as a deliberate Kepler
   mechanic, or rely solely on void-blown scars? RECOMMENDATION: rely on void-blown scars for now;
   damaged-by-design cells are a separate feature with no current engine support.
7. requiredPieces ENFORCEMENT TIMING: post-run rejection that consumes a life (V2) vs pre-engage
   modal with no life lost (original) — confirm the post-run model. RECOMMENDATION: post-run,
   consumes a life ("Failure is the curriculum"); requires the unwritten
   `requiredPiecesNotEngaged` COGS copy for K1-6 and K1-8.
8. CONSEQUENCE TIER for K1-4 and K1-8: NARRATIVE.md defines a formal `consequenceNarrative` only
   for the K1-10 boss; the K1-4/K1-8 cogsWarning/failureEffect lines here are NEW PROPOSED and
   scaled BELOW boss weight (no casualties, no inquiry) — confirm that tier, or specify heavier
   stakes. RECOMMENDATION: keep mid-sector consequences below boss weight.
9. RED EYE STATE IN EARLY GAME: DIALOGUE_SYSTEM marks standard void resultsLines RED across all
   phases, but the Sector 1 arc reserves visible strain (RED) for the Rift/Deep Void; should
   early-game void results use RED, or a softer BLUE/AMBER to protect the strain arc's first real
   appearance? RECOMMENDATION: keep performance-matrix void RED but hold consequence-narrative eyes
   at AMBER (as K1-10 source does).
10. PER-STEP EYE SHIFTS on non-boss levels: the proposed K1-4 mid-level amber shift and K1-8 amber
    flicker add per-step eye changes to non-boss levels — are per-step eye changes supported there,
    or reserved for boss/consequence beats? RECOMMENDATION: reserve per-step shifts for boss beats;
    keep K1-4/K1-8 single-state unless Tucker wants the buried beats.
11. SPLITTER OWNERSHIP: The Splitter has no Axiom introduction level and no prior Codex entry, yet
    it is first needed at K1-5 to feed the Merger; is the Splitter introduced in Axiom or first in
    Kepler (requiring the V2 REQ-5 Splitter Codex step at K1-5)? RECOMMENDATION: introduce the
    Splitter Codex at K1-5 unless an Axiom Splitter level is added.
12. requiredPieces REASON STRINGS: the original attached a `reason` string to required pieces (the
    schema supports `reason?`); V2/CODE omit it — do we want reason strings surfaced to the Engineer
    on K1-6/K1-8? RECOMMENDATION: include reason strings (they aid the diagnostic loop) — copy PROPOSED.
13. K1-5 optimalPieces: V2 says 9 and flags CODE's 8 as likely wrong; this needs a build-time
    floor-solve verification. RECOMMENDATION: verify by actually solving the board before locking the value.
14. TAPE NODES ON THE WHEEL: `ArcWheelPiece.isTape` / `TAPE_COLOR` / a tape border branch exist in
    the component but `arcWheelPieces` excludes tapes — are purple tape nodes intended on the wheel,
    or is that dead code? RECOMMENDATION: treat as dead code (tapes live in the REQUISITION store)
    unless Tucker wants tape nodes.
15. KEPLER NEW-PIECE CODEX TARGET: Axiom new-piece codex collection targets `arcWheelMain`; Kepler
    targets `boardGrid` (because some Kepler new pieces are pre-placed) — unify or keep the split?
    RECOMMENDATION: keep `boardGrid` for pre-placed Kepler pieces (it is where the piece actually is).
16. CODEX ID SCHEME: all CDX-* narrative codex IDs in the narrative map are PROPOSED placeholders;
    confirm the canonical codex ID scheme and whether piece codex entries (Latch, Merger, Bridge)
    already exist to avoid duplication.
17. WHEEL ONBOARDING COPY + DISCOVERABILITY: the proposed wheel-intro/scroll/place lines and the
    deferred dismiss line need a Tucker voice pass; and the UX report recommends a discoverability
    enhancement (dot-strip / quick-jump) for the large late-Kepler inventories (up to 22 nodes at
    K1-10) — do we want it, and in what form? RECOMMENDATION: ship the copy after sign-off; add a
    dot-strip index given the 20-22 node worst case at K1-9/K1-10.
