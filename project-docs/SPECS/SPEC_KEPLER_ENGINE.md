# SPEC: Kepler Belt Engine-Mechanic Contract (Phase 2, SE)

Status: BEHAVIORAL CONTRACT — drives Phase 3 (Dev) implementation
Date: 2026-05-31
Author: Systems Engineering (SE) phase, Kepler rebuild
Scope: The engine mechanics the Kepler Belt levels (K1-1 .. K1-10) require but the
live engine does NOT yet support. Derived from per-level `availablePieces` and
`prePlacedPieces` in `SPEC_KEPLER_REBUILD_v3.md` Section 3, cross-checked against
`kepler-engine-capability-audit.md` and `kepler-teaching-map.md`.

This document is the behavioral spec. It states OBSERVABLE behavior, not
implementation. The companion pending tests in `__tests__/unit/kepler-engine/`
encode each clause; Phase 3 (Dev) activates those tests (un-skip / fill the todo)
while implementing against this contract. Phase 3 MUST NOT alter the assertions.

POLICY (binding on this document):
- No emojis anywhere.
- Player-facing copy is OUT OF SCOPE. Where a behavior implies copy (a COGS
  rejection line, a tutorial step), it is referenced as a Tucker PROPOSED item and
  NOT authored here.
- Scoring is OUT OF SCOPE (Tucker ruling: Speed removed, handled on a separate
  track). Audit gap 10 is listed under Deferred only.
- The RFC-2119 keywords MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, MAY are used with
  their normative meaning.

---

## 1. DERIVED REQUIRED-GAP SET

Scope was derived by reading the per-level `availablePieces` / `prePlacedPieces`
across K1-1 .. K1-10 (`SPEC_KEPLER_REBUILD_v3.md` Section 3) and intersecting them
with the audit gap list. Only gaps that a K1 level actually exercises are specced
below. Gaps no K1 level touches are listed in Section 4 (Deferred) and are NOT
specced here.

| # | Required gap | Audit ref | Driving K1 levels | Clauses |
|---|---|---|---|---|
| G1 | Latch DELAY mode (true D flip-flop) | Audit Bug A | K1-9 (shift register), K1-10 (temporal AND) | 3.1 |
| G2 | Config Node reads a Latch's value within the pulse | Audit gap 1 | K1-3, K1-4 | 3.2 |
| G3 | Merger value-level OR (no silent BFS path drop) | Audit gap 3 | K1-5, K1-6, K1-8 | 3.3 |
| G4 | requiredPieces instance-to-type resolution | Audit gap 9 | K1-6, K1-8 | 3.4 |
| G5 | Pre-placed Latch categorized 'protocol' | Audit Bug B | K1-3 (pre-placed Latch) | 3.5 |
| G6 | Kepler boss consequence re-keyed K2-10 to K1-10 | Audit gap 8 | K1-10 | 3.6 |

Notes on the derivation:
- G1 is driven by K1-9 `expectedOutput` `[0,0,1,1,0,1]` (output[N] = input[N-1]) and
  K1-10 `expectedOutput` `[0,1,0,0,1,1,0,0,0,1]` (output[N] = input[N] AND
  input[N-1]). Both `tapeDesignRationale` entries name "Latch DELAY mode" explicitly
  (`SPEC_KEPLER_REBUILD_v3.md` K1-9, K1-10). Tucker ruling: BUILD it as a true D
  flip-flop. Neither level may ship without it.
- G2 is driven by K1-3 `computationalGoal` ("Latch WRITE captures each pulse, Config
  Node gates") and K1-4 ("Latch stores each pulse value and gates a Config Node").
  The live Config Node reads only the Data Trail, never a Latch's emitted value.
- G3 is driven by K1-5 (Splitter forks to a gated Path A plus a bypass Path B, a
  Merger reconverges) and the requiredPieces Merger on K1-6 and K1-8. The live
  Merger emits the value of whichever path the BFS visits first and drops the second.
- G4 is driven by K1-6 (`requiredPieces` splitter, merger) and K1-8 (`requiredPieces`
  bridge, latch, splitter, merger). The core `evaluateRequiredPieces` logic is
  IMPLEMENTED and covered by `keplerRequiredPieces.test.ts`; the remaining gap is the
  instance-to-type resolution at the calling boundary.
- G5 is driven by K1-3's pre-placed Latch, which MUST be category 'protocol'.
- G6 is driven by K1-10, whose boss consequence never fires because the
  NarrativeConsequence is keyed to the non-existent 'K2-10'.

---

## 2. CONVENTIONS

- Each clause has a dotted canonical number (e.g. 3.1.2) and a stable requirement id
  (e.g. `REQ-LATCH-DELAY-1`). The id is the identifier cited by the pending tests and
  is the canonical reference; cross-reference rather than restate a clause.
- "Pulse N" means the Nth invocation of `executeMachine(state, N)` over a shared
  `MachineState` during one run (the multi-pulse tape loop). Pulse indices are
  zero-based.
- "Run" means one full pulse loop from a freshly initialized state (one Engage
  press). State persists across pulses within a run; runs are independent.
- "Emit" / "emitted value" means the outbound signal value a piece passes downstream
  for the current pulse (the value a downstream Transmitter would write, per the
  canonical Transmitter Model β in `keplerTransmitterCanonical.test.ts`).

---

## 3. CLAUSES

### 3.1 Latch DELAY mode — true D flip-flop (G1)

Canonical mechanic: a Latch has three modes, `write`, `read`, and `delay`. `delay`
makes the Latch a D flip-flop: each pulse it emits the value it captured on the
previous pulse, then captures the current pulse's value for the next. `write` and
`read` are unchanged and remain as covered by `engine.test.ts` (the WRITE-stores and
READ-outputs-or-blocks suite); those existing behaviors MUST be preserved.

- **3.1.1 `REQ-LATCH-MODE-1`** — The set of Latch modes SHALL be exactly
  { `write`, `read`, `delay` }. Tapping a placed Latch MUST advance `latchMode`
  through the cycle `write` to `read` to `delay` to `write`. (This supersedes the
  two-state toggle noted in CLAUDE.md "Latch tap toggles latchMode".)

- **3.1.2 `REQ-LATCH-DELAY-1`** — On a pulse N greater than or equal to 1 of a run, a
  Latch in `delay` mode MUST emit, as its outbound signal value, the inbound signal
  value it received on pulse N minus 1 of the same run.

- **3.1.3 `REQ-LATCH-DELAY-2`** — On the first activated pulse of a run (no value yet
  captured), a `delay` Latch MUST emit 0.

- **3.1.4 `REQ-LATCH-DELAY-3`** — On every activated pulse, a `delay` Latch MUST
  capture its current inbound signal value into stored state AFTER emitting the
  previously stored value (read-before-write ordering within the pulse), so the
  one-pulse delay holds into the next pulse.

- **3.1.5 `REQ-LATCH-DELAY-4`** — A `delay` Latch MUST always pass the signal; it
  never blocks. Its effect is on the carried value only, not on signal flow.
  (Contrast `read`, which blocks when nothing is stored.)

- **3.1.6 `REQ-LATCH-RESET-1`** — Run initialization (the `resetRunState` path, or
  equivalent run-start step that precedes pulse 0, NOT the per-pulse
  `executeMachine` body) MUST clear every Latch's stored state so that consecutive
  runs are independent and a `delay` Latch emits 0 on pulse 0 of every run.

- **3.1.7 `REQ-LATCH-PREPLACE-1`** — A pre-placed Latch in a level definition MUST
  carry an explicit `latchMode`. The engine MUST treat a Latch whose `latchMode` is
  unset as `write` (deterministic default). (K1-3's pre-placed Latch is `write`.)

Forward use: 3.1.2 plus 3.1.1 plus 3.1.3 realize the K1-9 shift register
(output[N] = input[N-1], output[0] = 0). The K1-10 temporal-AND capstone
(output[N] = input[N] AND input[N-1]) is built from a `delay` Latch combined with a
Config gate (level-design work in a later phase); it depends on this clause set.

### 3.2 Config Node reads a Latch's value within the pulse (G2)

Baseline (existing, preserved): a Config Node passes the signal when the value under
test equals its `configValue`, and blocks otherwise (`engine.test.ts` Config Node
suite). When no value is available (empty/short trail, no tape, no upstream value),
it falls back to a default pass (`engine.test.ts` "passes by default with empty
trail and no tape"). The clauses below extend the SOURCE of the value under test to
include an upstream Latch's emitted value.

- **3.2.1 `REQ-CONFIG-LATCH-1`** — A Config Node placed downstream of a Latch MUST be
  able to gate on the value the Latch emits in the current pulse (the carried signal
  value), not solely on a Data Trail cell. Observable: given an upstream Latch
  emitting value V and a Config Node with `configValue` C on the path, the signal
  continues past the Config Node in that pulse if and only if V equals C.

- **3.2.2 `REQ-CONFIG-LATCH-2`** — When a carried value from an upstream Latch is
  available at a Config Node, the node MUST evaluate that carried value and MUST NOT
  fall back to the empty/short-trail default pass. The default-pass fallback applies
  only when no carried value and no trail/tape value is available (the existing
  empty-trail-no-tape case is unchanged).

### 3.3 Merger value-level OR (G3)

Canonical mechanic: a Merger reconverges two inbound paths under OR semantics —
either inbound path carrying 1 is sufficient. The live engine drops the second
converging path via the BFS visited-set dedup; that defect MUST be closed.

- **3.3.1 `REQ-MERGER-OR-1`** — A Merger with two inbound paths MUST emit 1 if either
  inbound path delivers signal value 1 in the pulse (logical OR). It MUST emit 0 only
  when every inbound path that delivers a signal carries 0.

- **3.3.2 `REQ-MERGER-OR-2`** — Both inbound paths to a Merger MUST be evaluated and
  contribute to the OR. The engine MUST NOT silently drop the second converging path
  because the visited-set already reached the Merger from the first path. (Closes
  audit gap 3.)

- **3.3.3 `REQ-MERGER-OR-3`** — When only one inbound path delivers a signal (the
  other blocked upstream), the Merger MUST emit the delivering path's value ("either
  is sufficient"). A non-delivering path contributes nothing (treated as no operand),
  never forcing the output to 0.

### 3.4 requiredPieces instance-to-type resolution (G4)

Baseline (existing, preserved): `evaluateRequiredPieces(levelDef, pieceRunStates)`
returns `satisfied` or `requiredPiecesNotEngaged` and is covered by
`keplerRequiredPieces.test.ts` (REQ-RP-1 .. REQ-RP-5: engaged means placed AND fired;
bypass machines fail; full floor solves pass). This clause adds only the boundary
resolution the audit flagged.

- **3.4.1 `REQ-REQPIECES-MAP-1`** — Before requiredPieces are evaluated, each fired
  piece instance MUST be resolved to its piece TYPE for matching against
  `requiredPieces` entries. A required piece placed from the Arc Wheel (whose
  instance id is an inventory id such as `inv-NN`, not a type string) that fires
  during the run MUST count as engaged. A real placed-and-fired Splitter plus Merger
  on K1-6, or Bridge plus Latch plus Splitter plus Merger on K1-8, MUST evaluate to
  `satisfied`. (Closes audit gap 9: the `s.pieceId === entry.type` match must see
  types, never raw instance ids.)

### 3.5 Pre-placed Latch protocol categorization (G5)

- **3.5.1 `REQ-PREPLACED-CAT-1`** — The level-data pre-placement helper that assigns
  `category` to pre-placed pieces MUST categorize a pre-placed Latch (and, for
  consistency, Inverter and Counter) as `'protocol'`. A pre-placed Latch MUST NOT be
  categorized `'physics'`. (Closes archaeology Bug B; driven by K1-3's pre-placed
  Latch.)

### 3.6 Kepler boss consequence key (G6)

- **3.6.1 `REQ-CONSEQ-KEY-1`** — The Kepler boss `NarrativeConsequence`
  `triggerLevelId` MUST be `'K1-10'` (the actual boss level), not `'K2-10'`.
  `getTriggeredConsequence('K1-10', ...)` MUST return the Kepler boss consequence
  under its trigger condition, and `getTriggeredConsequence('K2-10', ...)` MUST NOT
  return it.

- **3.6.2 `REQ-CONSEQ-KEY-2`** — The re-key MUST preserve the existing trigger
  semantics and payload: a below-three-star or fail result on K1-10 fires the
  consequence; a three-star success returns null; and the `damage_system` mechanical
  effect targeting `propulsionCore` is retained.

PHASE 3 NOTE (not a new clause): the existing `consequences.test.ts` encodes the
buggy behavior (it asserts `getTriggeredConsequence('K2-10', ...)` returns the Kepler
consequence). When Phase 3 re-keys to `'K1-10'`, Dev MUST update those existing
assertions in `consequences.test.ts` to the corrected key. That existing-test edit is
Phase 3 work and is explicitly permitted (the no-edit rule applies only to the
pending tests authored in this phase).

---

## 4. DEFERRED — audit gaps NOT required by any Kepler level

These are out of scope for this contract. Each is either unused by every K1 level or
governed by a separate track. They are recorded so the scope boundary is explicit.

| Audit gap | Why deferred |
|---|---|
| 2. Transmitter addressable target cell | Every K1 tape level is one-output-per-pulse; the hardwired `pulseIndex` write index is sufficient. Canonical Transmitter Model β is already covered by `keplerTransmitterCanonical.test.ts`. |
| 4. Counter increment / reset | No K1 level places a Counter (absent from every `availablePieces` and `prePlacedPieces`). Counter is withheld to The Rift. |
| 5. Capacitor | MISSING piece; withheld to Nova Fringe. No K1 level uses it. |
| 6. Divergence Gate | MISSING piece; withheld to Nova Fringe. No K1 level uses it. |
| 7. Confluence Node | MISSING piece; withheld to Nova Fringe. The Merger covers the Kepler two-paths-converge teaching point. |
| 10. Scoring v2 five named components | OUT OF SCOPE by Tucker ruling (Speed removed, separate track). Not specced here. The `scoringCategoriesVisible` / `speedBonus` reconciliation belongs to the scoring track. |

Assumed-supported, not audited as a gap (so not specced here): the Bridge's
two-path independence (two signals crossing one cell without interacting). The audit
did not flag Bridge as a gap and `engine.test.ts` exercises Bridge passthrough. If
Phase 3 finds the two-path crossing unsupported under the K1-7 topology, that is a
newly surfaced gap to escalate, not a clause silently covered here.

---

## 5. CLAUSE-TO-TEST MAP

Every clause is encoded by a pending test in `__tests__/unit/kepler-engine/`. Tests
are PENDING (`it.todo` or inside `describe.skip`) so they do not execute-and-fail;
Phase 3 activates them.

| Clause | Test file |
|---|---|
| 3.1.1 .. 3.1.7 (Latch DELAY) | `latchDelay.test.ts` |
| 3.2.1, 3.2.2 (Config reads Latch) | `configReadsLatch.test.ts` |
| 3.3.1, 3.3.2, 3.3.3 (Merger OR) | `mergerValueOr.test.ts` |
| 3.4.1 (requiredPieces mapping) | `requiredPiecesMapping.test.ts` |
| 3.5.1 (pre-placed protocol) | `prePlacedCategory.test.ts` |
| 3.6.1, 3.6.2 (boss consequence key) | `keplerBossConsequenceKey.test.ts` |
