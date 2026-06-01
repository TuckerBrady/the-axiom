# Kepler Belt — Engine Capability Audit

Auditor: Engine Capability Auditor (read-only pass)
Date: 2026-05-31
Scope: Verify the engine supports every mechanic a Kepler (K1) level must teach, TODAY.
Files audited: src/game/engine.ts, src/game/scoring.ts, src/game/consequences.ts,
src/game/levels.ts (K1-1..K1-10), src/store/requisitionStore.ts,
src/store/consequenceStore.ts (cross-ref), src/game/types.ts (cross-ref),
docs/COMPUTATIONAL_MODEL.md (piece vocabulary).

GAP LIST ONLY. Working mechanics are marked IMPLEMENTED with a single citation and
no further detail. The PARTIAL and MISSING entries are what drives downstream work.

---

## Mechanics audited

### Latch write mode and read mode (separate operations, persists across pulses)
IMPLEMENTED. src/game/engine.ts:451-474. WRITE captures `signalValue` into
`piece.storedValue`; READ overrides `outboundSignalValue` with the stored value and
blocks when nothing is stored. `piece.storedValue` is mutated on the shared piece
object, so state persists across pulse invocations of `executeMachine`.

### Config Node gating (reads Data Trail, blocks/passes signal based on value)
PARTIAL. src/game/engine.ts:356-377. Config Node reads the Data Trail and
passes/blocks correctly when `trail.cells[pulseIndex]` holds the value. GAP: the
read precedence is `trail.cells[pulseIndex]` first, then `trail.cells[headPosition]`,
then falls back to `nodeValue` (which makes the gate trivially pass when the trail is
empty/short). For the K1-4 and K1-6 designs where the gate must read a Latch's stored
output within the same pulse rather than a trail cell, there is no path by which the
Latch's `storedValue` reaches the Config Node — Config Node only inspects the Data
Trail, never the carried `signalValue` or an upstream Latch. The "Config Node reads
the Latch output" model described in K1-4 computationalGoal (levels.ts:791) is not
supported by the current Config Node implementation. Downstream design must either
(a) route Latch output to the trail before the gate, or (b) extend Config Node to
gate on the carried signal value.

### Scanner read of Input Tape, write to Data Trail
IMPLEMENTED. src/game/engine.ts:379-392. Reads `tapeValue` (inputTape[pulseIndex])
and writes it to `trail.cells[pulseIndex]`.

### Transmitter writes signal value to target tape cell
PARTIAL. src/game/engine.ts:394-412. Writes the carried `signalValue` to
`state.outputTape[pulseIndex]` — correct for post-Inverter / post-Latch values. GAP:
the write index is hardwired to `pulseIndex`. There is no mechanism for a Transmitter
to address an arbitrary "target tape cell" (e.g. write to a cell other than the
current pulse position). Every Kepler tape level (K1-2..K1-10) is a one-output-per-
pulse design, so this is sufficient for K1 as specified. Flagged PARTIAL only because
the brief phrasing "writes to target tape cell" implies addressable targeting, which
the engine does not provide; if any future Kepler retrofit needs out-of-order tape
writes, this is a gap.

### Merger (OR logic, two paths converge)
PARTIAL. src/game/engine.ts:60-61, 98-99, 414-416. The Merger accepts input on two
sides (left + top) and outputs on one (right), so two paths can structurally
converge, and the BFS will reach it from either path. GAP: there is no OR/merge
semantics on the signal value. The Merger emits `step.message` only; it passes
`outboundSignalValue = signalValue` from whichever path the BFS visited FIRST
(visited-set dedup at engine.ts:315-316 means the second converging path is dropped
entirely, not OR-combined). For K1-5's stated design (path A gated, path B bypass,
"either is sufficient") this happens to work because the bypass path carries the same
value — but it works by accident of BFS visit order, not by defined OR logic. There
is no value-level combination, and no guarantee about which path's value wins when the
two paths carry different bits. Downstream must define and verify Merger value
semantics, or constrain level designs so both inbound paths always carry identical
values.

### Counter increment / reset
PARTIAL. src/game/engine.ts:435-449. Increments `piece.count`, blocks until
`threshold`, then resets count to 0 and releases. GAP 1: the Counter resets its count
to 0 on threshold release WITHIN a single executeMachine run, but `piece.count` is
never reset between pulses (no per-pulse or per-run reset of `count` exists in
`resetRunState`, engine.ts:604-608, which only clears `firedDuringRun`). Across a
multi-pulse tape level the count therefore accumulates monotonically across pulses
with only the threshold-triggered wrap — there is no explicit "reset" operation
(distinct from the automatic threshold wrap) that a level could invoke. GAP 2: No
Kepler level (K1-1..K1-10) places a Counter — it is absent from every K1
`availablePieces` and `prePlacedPieces` array. K1-10's "running count / consecutive
1s" goal (levels.ts:951) is intended to be built from Latch + Config Node, not the
Counter piece. If the Counter is meant to teach in Kepler, no level exercises it; if
it is not, the brief's "Counter increment/reset" requirement is not a Kepler mechanic
and should be struck from the Kepler teach list.

### Capacitor (delay / accumulation)
MISSING. There is no `capacitor` member of `PieceType` (src/game/types.ts:3-17), no
case in `getInputPorts`/`getOutputPorts`/`executeMachine`/`getPieceCategory`
(engine.ts), and no Capacitor in any K1 level. The only references to "Capacitor" in
the codebase are COGS dialogue / doc prose (docs/COMPUTATIONAL_MODEL.md:244,477).
Required if any Kepler level must teach delay or accumulation: a new piece type,
port logic, an execution case implementing the delay/accumulate semantics, a category
mapping, a price entry, and a PieceIcon. No K1 level currently calls for it.

### Divergence Gate
MISSING. No `divergenceGate` in `PieceType` (types.ts:3-17); no engine support; not
present in any K1 level. Required if a Kepler level must teach it: full new-piece
implementation per docs/PIECE_CREATION_STANDARD.md. No K1 level currently calls for
it.

### Confluence Node
MISSING. No `confluenceNode` in `PieceType` (types.ts:3-17); no engine support; not
present in any K1 level. Required if a Kepler level must teach it: full new-piece
implementation. No K1 level currently calls for it. (Note: the Merger covers the
two-paths-converge teaching point in K1; if Confluence Node is intended as a distinct
multi-input convergence piece, its semantics must be defined separately.)

### Damage mechanic
PARTIAL. src/store/consequenceStore.ts:43-96 implements `applyConsequence`, which
processes `mechanicalEffects` of type `damage_system` (and credit/integrity/codex
effects) and tracks `damagedSystems`. The Kepler boss `NarrativeConsequence`
(src/game/consequences.ts:17-43) carries a `damage_system` -> `propulsionCore`
effect. GAP — CROSS-REFERENCE MISMATCH: `KEPLER_BOSS_CONSEQUENCE.triggerLevelId` is
`'K2-10'` (consequences.ts:21), but the actual Kepler boss level in levels.ts is
`'K1-10'` (levels.ts:938). `getTriggeredConsequence('K1-10', ...)` (consequences.ts:
185-206) will therefore NEVER match the Kepler boss consequence — the propulsion
damage never fires for the level that is supposed to trigger it. Separately, the
per-level `ConsequenceConfig` on K1-4 / K1-8 / K1-10 (cogsWarning + failureEffect)
is text-only and carries NO `mechanicalEffects`, so those three levels apply no
mechanical damage of their own; mechanical damage flows solely through the
`ALL_CONSEQUENCES` (NarrativeConsequence) path, which is mis-keyed for Kepler.

### Expanding tray purchase flow (one-time pre-level window)
IMPLEMENTED. src/store/requisitionStore.ts:169-244. `initRequisition` opens the
window, `setPurchaseQuantity`/`setPurchaseNibbles` accumulate, `confirmRequisition`
spends once and locks (`phase !== 'requisition'` guard at line 236). One-time:
purchases are only mutable while `phase === 'requisition'`, and transition moves to
placement with no re-entry.

### REQUISITION store flow
IMPLEMENTED. src/store/requisitionStore.ts:161-315. Full phase machine
(requisition -> transitioning -> placement), inventory build
(buildInventoryFromLevel:100-145), forfeiture model via `getUnplacedPieces` (line
289), budget selectors (lines 305-314).

### requiredPieces enforcement
IMPLEMENTED. src/game/engine.ts:610-630. `evaluateRequiredPieces` compares each
`levelDef.requiredPieces` entry against pieces that `firedDuringRun`. Exercised by
K1-6 (levels.ts:844) and K1-8 (levels.ts:900).
PARTIAL caveat (downstream verification, not a code defect): enforcement matches on
`s.pieceId === entry.type` (engine.ts:621). This relies on the caller populating
`PieceRunState.pieceId` with the piece TYPE, not the instance id. The engine sets
`firedDuringRun` on piece instances (engine.ts:321) whose `.id` is an instance id
(e.g. `inv-NN`), so the `pieceId === entry.type` comparison only succeeds if the
caller constructs `PieceRunState` with type strings. The mapping layer is outside the
audited files; flagging so downstream confirms the caller maps instance -> type before
calling `evaluateRequiredPieces`, or K1-6/K1-8 requiredPieces will silently report
zero engaged.

### Consequence flow (cogsWarning + failureEffect)
IMPLEMENTED. Type defined at src/game/types.ts:100-107; populated on K1-4
(levels.ts:790), K1-8 (levels.ts:903), K1-10 (levels.ts:950). `doesConsequenceTrigger`
(scoring.ts:245-254) and `getConsequenceFailureLine` (scoring.ts:256-269) consume
`requireThreeStars` and emit the failureEffect / boss line correctly. (The mechanical
damage gap is tracked separately under "Damage mechanic" above; the text consequence
flow itself works.)

### Scoring v2 — five named components
MISSING (as specified). The brief requires the engine to emit FIVE components named
Efficiency (30), Protocol Precision (25), Chain Integrity (20), Discipline (15),
Speed (10). The engine does NOT emit these five buckets with those weights. The live
scoring model (src/game/scoring.ts:124-228) is a different SIX-bucket v2 model:
completion (25), pathIntegrity (15), signalDepth (14), investment (25), diversity
(11), discipline (10) — and `speedBonus` is hardcoded to 0 (scoring.ts:219,
"removed in v2"). The legacy five-name labels survive ONLY as backward-compat aliases
on the breakdown object (efficiency = completion, protocolPrecision = diversity,
chainIntegrity = pathIntegrity, disciplineBonus = discipline, speedBonus = 0;
scoring.ts:139-147, 222-225) with different weights and, critically, with Speed
permanently zero. The locked CLAUDE.md scoring spec (Efficiency 30 / Protocol
Precision 25 / Chain Integrity 20 / Discipline 15 / Speed 10) and the v2 code DISAGREE.
Downstream MUST resolve which scoring model is canonical for Kepler before building
levels. As-is, no Kepler level can emit a non-zero Speed component, and the five named
weights in the brief are not produced by the engine.
SECONDARY GAP: K1 levels declare `scoringCategoriesVisible` using the legacy names
(e.g. K1-8 lists `'speedBonus'`, levels.ts:902), so the results UI would surface a
Speed category that the engine always scores 0. Confirm intended display behavior.

---

## Gap summary

PARTIAL or MISSING (counts toward metric):

1. Config Node gating — PARTIAL (cannot read Latch stored value; trail-empty fallback passes)
2. Transmitter target cell — PARTIAL (hardwired to pulseIndex; no addressable target)
3. Merger OR logic — PARTIAL (no value-level OR; second path dropped by visited-set)
4. Counter increment/reset — PARTIAL (no per-pulse/explicit reset; unused by any K1 level)
5. Capacitor — MISSING (no piece type, no engine support)
6. Divergence Gate — MISSING (no piece type, no engine support)
7. Confluence Node — MISSING (no piece type, no engine support)
8. Damage mechanic — PARTIAL (Kepler boss consequence mis-keyed to K2-10, never fires on K1-10)
9. requiredPieces enforcement — PARTIAL caveat (instance->type mapping done by uncaudited caller)
10. Scoring v2 five named components — MISSING as specified (engine emits a different 6-bucket model; Speed permanently 0; conflicts with locked CLAUDE.md spec)

IMPLEMENTED (no further action):
Latch write/read, Scanner read-tape/write-trail, expanding tray one-time purchase
window, REQUISITION store flow, requiredPieces core logic, consequence text flow
(cogsWarning + failureEffect).

Total PARTIAL + MISSING gaps: 10.
