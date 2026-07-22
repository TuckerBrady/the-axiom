# SPEC: Nova Fringe (Sector 2) — Scope & Build Plan

Status: DRAFT FOR TUCKER REVIEW
Date: 2026-06-16
Author: Claude Code (synthesis of TEACHING_PROGRESSION, NARRATIVE, COMPUTATIONAL_MODEL,
LEVEL_DESIGN_FRAMEWORK + a code-state audit)
Scope: Sector 2, Nova Fringe, levels NF-1 through NF-10.

POLICY (binding):
- No emojis. The Engineer is "The Engineer"; COGS speech MAY use "you".
- ALL player-facing copy here is PROPOSED pending Tucker sign-off. The NF-1..NF-10
  cogsLines already exist (PROPOSED) in NARRATIVE.md and are carried by reference.
- Only real `LevelDefinition` fields are used. New pieces follow PIECE_CREATION_STANDARD.
- Builds on the shipped Kepler v3 pattern: Arc Wheel + REQUISITION economy, blown
  cells (obstacle rubble + craters), placement-phase tutorial overlay.

---

## 1. SECTOR OVERVIEW

### 1.1 Teaching thesis
Nova Fringe answers: **"How does a machine work when it does not know everything in
advance?"** The lesson is **input-independence** — the difference between a machine
that works for the shown tape and one that implements a correct *rule*
(TEACHING_PROGRESSION.md:79-93). It builds on Kepler's "solution vs algorithm" exit.

Exit thesis (must hold before The Rift unlocks): logical transformation is distinct
from routing; state preservation differs from dynamic state; AND and XOR understood;
the machine must be built for possibility, not certainty.

### 1.2 New mechanics (sector-wide)
- **Reducing tape visibility**: full (NF-1/2) -> length-visible-values-hidden
  (NF-3..5) -> nothing visible (NF-6..10). This is the mechanical embodiment of
  input-independence: you cannot hardcode what you cannot see.
- **Four logic/state pieces** (all Protocol, blue #00D4FF): Inverter (NOT),
  Capacitor (snapshot), Confluence Node (AND), Divergence Gate (XOR).
- Carries forward from Kepler: Arc Wheel, REQUISITION economy, blown cells (craters
  + obstacle rubble), consequence levels, no placement highlights.

### 1.3 Narrative (NARRATIVE.md:143-283, 631-677)
Unregistered, off-chart territory — where people go to stop being found. COGS manages
incomplete information, choosing what to disclose. The Maker breadcrumb surfaces: the
hull is recognized by a third party; "We remember this ship" is burned into cargo bay
two on boss failure. Boss NF-10 = "The Recognition". All level cogsLines are PROPOSED
in NARRATIVE.md and reused verbatim.

---

## 2. PIECE STATUS & PROPOSED ENGINE SEMANTICS

| Piece | Category | CS concept | Code status |
|---|---|---|---|
| Inverter | Protocol | NOT | **BUILT** (engine NOT, icon, price 25) |
| Capacitor | Protocol | snapshot register | **MISSING** — build required |
| Confluence Node | Protocol | AND (two inputs / same pulse) | **MISSING** — build required |
| Divergence Gate | Protocol | XOR (exactly one input) | **MISSING** — build required |

(Audit: kepler-engine-capability-audit.md + this session's code read. Counter is also
built but is reserved for The Rift, not Nova.)

### 2.1 Inverter (built) — REQ-INV
Reads the carried signal bit and flips it (0<->1); always passes. Already implemented
(engine.ts execution `case 'inverter'`). No work beyond assigning it to levels.

### 2.2 Capacitor (PROPOSED semantics) — REQ-CAP
- Reads the current Data Trail value as the signal passes and stores it in a new
  immutable field `capturedValue` (first capture wins per the run; "what it captures,
  it keeps"). Emits the captured value downstream.
- Distinct from Latch: Latch stores the *carried signal*; Capacitor snapshots the
  *Data Trail* and is immutable once set. Lets a level overwrite the trail downstream
  while the Capacitor still carries the original value.
- `resetRunState` clears `capturedValue` to null each run (mirrors Latch storedValue).
- Engine work: PieceType, ports (left in / right out, like Latch), category 'protocol',
  execution case, reset clearing, price, icon, tests.

### 2.3 Confluence Node (PROPOSED semantics) — REQ-CONF
- AND join: passes only when BOTH input ports carry an active signal in the SAME pulse.
  Models on the existing Merger's pending-arrivals collection (engine.ts pendingMergers
  / flushMerger), but requires arrivals from >=2 distinct inbound edges before flushing,
  and the OR becomes AND (both must be value 1 to pass; otherwise blocks).
- Ports: two inputs (left + top, like Merger/Bridge), one output (right).
- Engine work as above + the AND flush semantics + tests (mirror mergerValueOr).

### 2.4 Divergence Gate (PROPOSED semantics) — REQ-DIV
- XOR: passes when exactly one of its two inputs is active; blocks on zero or both.
- Ports: two inputs (left + top), one output (right). Uses the same pending-arrivals
  collection as Confluence/Merger but flushes pass only when exactly one arrival is active.
- Engine work as above + XOR flush semantics + tests.

NOTE on Splitter/Merger overlap: Splitter (1->2 routing) and Merger (OR converge) are
PHYSICS routing pieces and already exist. Confluence (AND) and Divergence (XOR) are
PROTOCOL logic pieces — distinct purpose (logic, not routing). Keep both.

---

## 3. PIECE-INTRODUCTION ORDER & PER-LEVEL DESIGN (PROPOSED)

One new piece per level max. Inverter@NF-1, Capacitor@NF-3, Confluence@NF-4,
Divergence@NF-5; the rest reinforce/synthesize. Geometry follows the Kepler lesson:
non-linear Source/Terminal, pre-existing craters (damagedCells) to route around.

| Level | Name | New piece | Tape vis | Computational goal (PROPOSED) |
|---|---|---|---|---|
| NF-1 | Outer Marker | Inverter | full | output[N] = NOT input[N] (logical negation) |
| NF-2 | Ghost Station | — | partial | NOT with some values hidden — trust the rule |
| NF-3 | The Quiet | Capacitor | partial | snapshot a trail value, use it after the trail is overwritten |
| NF-4 | Salvage Yard | Confluence Node | partial | output 1 only when two conditions both hold (AND) |
| NF-5 | Settlement Grid | Divergence Gate | hidden | output 1 only when exactly one condition holds (XOR) |
| NF-6 | Dark Frequency | — | hidden | Inverter + Capacitor: emit NOT of a preserved earlier value |
| NF-7 | Unmarked | — | hidden | AND + XOR combined gate logic |
| NF-8 | The Crossing | — (Consequence) | hidden | state + logic integration under stakes |
| NF-9 | Freehold | — | hidden | multi-gate synthesis; correct for ANY valid input |
| NF-10 | The Recognition | — (Boss, Consequence, 3-star) | hidden | full synthesis capstone |

Consequence levels: NF-8 (mid-sector) and NF-10 (boss). NF-10 wires the existing
NOVA_BOSS_CONSEQUENCE (currently keyed `NF-BOSS` — must re-key to `NF-10`, mirroring the
Kepler K2-10->K1-10 fix).

Tapes are test data, not answer keys (anti-hardcode rule). Each expectedOutput is
derived from the rule, and the rule must hold for unshown inputs.

---

## 4. BUILD PLAN (phased)

Phase 0 — sector plumbing: `sector: 'nova'`, `NOVA_LEVELS` export, level-select import,
ALL_LEVELS, unlock gating (already gated on Kepler). Tutorial overlay already renders
for non-Axiom placement phase (shipped with Kepler).

Phase 1 — Inverter levels NF-1, NF-2 (no new piece needed; buildable now).

Phase 2 — build the three missing pieces (Capacitor, Confluence, Divergence) per
PIECE_CREATION_STANDARD: type, ports, category, execution, reset, price, icon, tests.

Phase 3 — levels NF-3..NF-9 using the new pieces; floor-solve each; place craters.

Phase 4 — NF-10 boss + re-key NOVA_BOSS_CONSEQUENCE to `NF-10`; consequence copy.

Phase 5 — quality gates, integration smoke for 2+ Nova levels.

Each level/piece commit includes tests (TEST COVERAGE RULE).

---

## 5. OPEN QUESTIONS FOR TUCKER
1. Piece-intro order (Inverter@1 / Capacitor@3 / Confluence@4 / Divergence@5) — confirm.
2. Consequence levels NF-8 + NF-10 — confirm tiers (NF-8 below boss weight, like Kepler K1-8).
3. Capacitor immutability: first-capture-wins for the whole run, or re-snapshot each pulse?
   (Recommendation: first-capture-wins; simplest and matches "what it captures, it keeps".)
4. Tape-visibility: is there an existing hidden-tape rendering mechanic, or must it be
   built? (To verify in code; affects NF-2+ feasibility.)
5. Does Nova use designer craters (damagedCells) like Kepler? (Recommendation: yes, lighter.)
6. All NF cogsLines + new consequence/tutorial copy are PROPOSED — sign-off gate.
