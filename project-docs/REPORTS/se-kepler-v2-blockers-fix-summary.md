# Fix Summary — Kepler v2 Blockers SE Amendment Pass

**Author:** SE Cowork session
**Date:** 2026-05-01
**Tucker authorizations:** All three decisions received 2026-04-30.
**Status:** All seven deliverables complete.

---

## Files Touched

| File | Worktree | Type | Change |
|------|----------|------|--------|
| `project-docs/SPECS/kepler-belt-levels-v2-part1.md` | infallible-shirley-12eb4c | Spec amendment | Blocker 1: REQ-T-* canonical clauses; REQ-2 reversion; K1-2–K1-5 cross-references |
| `project-docs/SPECS/kepler-belt-levels-v2-part2.md` | kind-agnesi-f1f35a | Spec amendment | Blocker 2: REQ-RP-* clauses + engine API contract; Blocker 3: K1-7 collision fix; K1-6/K1-7/K1-8 cross-references |
| `project-docs/SPECS/kepler-belt-levels-v2-part3.md` | jolly-nobel-98d164 | Spec amendment | K1-9/K1-10 cross-references to REQ-T-* |
| `__tests__/unit/keplerTransmitterCanonical.test.ts` | infallible-shirley-12eb4c | Pre-written test | K1-5 expectedOutput + REQ-T-2/T-3/T-4 engine tests |
| `__tests__/unit/keplerK17FloorSolve.test.ts` | kind-agnesi-f1f35a | Pre-written test | K1-7 optimalPieces=7 + floor-solve pass-through |
| `__tests__/unit/keplerRequiredPieces.test.ts` | kind-agnesi-f1f35a | Pre-written test | K1-6 bypass-fails/required-passes/engaged-but-not-fired; K1-8 bypass-fails/required-passes |
| `project-docs/REPORTS/se-kepler-v2-blockers-validation.md` | serene-herschel-087975 | Report | Cross-cutting validation results |
| `project-docs/REPORTS/se-kepler-v2-blockers-fix-summary.md` | serene-herschel-087975 | Report | This file |

---

## Blocker 1 — Canonical Transmitter Behavior

### Decision

Tucker confirmed canonical Model β: a Transmitter writes the *value* carried by
the activating signal pulse, not a "signal arrived" indicator (Model α).

### Canonical clauses (verbatim)

**REQ-T-1**: A Transmitter MUST write to its target tape cell the value carried
by the signal pulse that activated it.

**REQ-T-2**: A Transmitter MUST NOT write `1` to indicate "signal arrived" when
the signal value is `0`. The Transmitter is not a presence sensor.

**REQ-T-3**: A Transmitter MAY be activated by a signal carrying value `0`; in
that case it MUST write `0` to its target tape cell.

**REQ-T-4**: When a Transmitter has not been activated within a given pulse, the
target tape cell MUST remain unchanged from its prior state (initial value:
`null`).

### Placement

Added as §CANONICAL TRANSMITTER BEHAVIOR in Part 1, between the SCOPE section
and the GLOBAL CODE FIX section. One-line cross-reference blockquote added after
the header of every Transmitter-using level (K1-2 through K1-10). K1-1 has no
Transmitter and was not modified.

### K1-5 expectedOutput reversion

REQ-2 proposed correcting `expectedOutput` from `[1,0,1,0]` to `[1,1,1,1]`.
This correction was based on Model α semantics (Path B always delivers value 1).
Under canonical Model β, Path B carries the source signal's value — `0` when
input is `0`. Transmitter writes `0` on those pulses. Expected output is `[1,0,1,0]`.

Changes made:
- SCOPE section: REQ-2 line amended to note REJECTED status.
- K1-5 §6: Full rewrite. Model α pulse table removed. Model β pulse table added.
  Historical note included. The distinction between [1,0,1,0] (Model β) and
  [1,1,1,1] (Model α) is explicitly documented as the level's edge-case test.
- K1-5 §15 Code Fixes: REQ-2 row updated to REMAINS [1,0,1,0] / RESOLVED.
- CODE FIX SUMMARY: Row #2 updated to RESOLVED.

### Anomaly: K1-5 optimalPieces discrepancy

The Part 1 spec notes an unresolved discrepancy between optimalPieces=8 (in code)
and the 9-piece floor solve documented in §5. This discrepancy pre-dates this
amendment pass and is outside Blocker 1 scope. It is documented in the QUALITY
CHECKLIST as a VERIFY item and was not modified by this pass.

---

## Blocker 2 — requiredPieces Enforcement

### Decision

Tucker confirmed enforcement flavor A3a: level runs, then fails with a
COGS-voiced rejection if required pieces were not engaged. "Engaged" means placed
AND fired at least once during the run.

### Canonical clauses (verbatim)

**REQ-RP-1**: A `LevelDefinition` MAY include a `requiredPieces` array. When
present, every entry specifies a piece type and minimum count that MUST be
engaged for the level to be considered solved.

**REQ-RP-2**: A piece counts as *engaged* when it has been placed on the grid
AND fired (activated by a signal) at least once during the run.

**REQ-RP-3**: Upon run completion, the engine MUST evaluate the `requiredPieces`
array. If any required piece-type/count is not satisfied by engaged pieces, the
level transitions to a fail-state with reason `requiredPiecesNotEngaged` and an
enumeration of the missing piece types.

**REQ-RP-4**: When the level enters the `requiredPiecesNotEngaged` fail-state,
the UI MUST present a level-specific COGS-voiced rejection message identifying
the missing piece(s). The Engage button MUST NOT be disabled pre-run; the failure
occurs post-run.

**REQ-RP-5**: A `requiredPiecesNotEngaged` failure MUST NOT consume the player's
run attempts in the way a damage-based failure does. Confirm with Tucker if this
conflicts with existing failure economics before Dev implements.

### Engine API contract (for Dev)

```typescript
interface PieceRunState {
  pieceId: string;
  firedDuringRun: boolean;
}

type RequiredPiecesResult =
  | { result: 'satisfied' }
  | {
      result: 'requiredPiecesNotEngaged';
      missing: Array<{ type: string; required: number; engaged: number }>;
    };

function evaluateRequiredPieces(
  levelDef: LevelDefinition,
  pieceRunStates: PieceRunState[],
): RequiredPiecesResult;
```

Fail-state routing fields: `failReason: 'requiredPiecesNotEngaged'`,
`missingPieces: Array<{ type: PieceType; required: number; engaged: number }>`.

### Placement

Added as §CANONICAL REQUIREDPIECES ENFORCEMENT (with §ENGINE API CONTRACT
subsection) in Part 2, between the preamble header and the K1-6 section.

### K1-6 amendment

- Header blockquote: cross-reference to REQ-RP-*.
- REQ-51: cross-reference to REQ-RP-* and §12 added.
- New §12: COGS failure-message slot `requiredPiecesNotEngagedDialogue`. Status:
  PROPOSED. Constraints specified (voice, enumeration of missing pieces). No
  copy authored.

### K1-8 amendment

- Header blockquote: cross-reference to REQ-RP-*.
- REQ-68: cross-reference to REQ-RP-* and §13 added.
- New §13: COGS failure-message slot `requiredPiecesNotEngagedDialogue`. Status:
  PROPOSED. Constraints specified, including consequence-level tone note. No
  copy authored.

---

## Blocker 3 — K1-7 Coordinate Collision

### Decision

Tucker confirmed Fix #1: drop the redundant Conveyor at (7,6). Transmitter
takes (7,6); Terminal stays at (8,6).

### Changes made to K1-7 Path A

| Before | After |
|--------|-------|
| Step 9A: Conveyor at (7,6) | REMOVED |
| Step 10A: Transmitter at (7,6)† | Step 9A: Transmitter at (7,6) — no dagger |
| Dagger footnote: "shift Transmitter/Terminal if needed" | REMOVED |

### Economy values re-derived

| Field | Before | After |
|-------|--------|-------|
| optimalPieces | 8 | 7 |
| Floor solve piece count | 8 | 7 |
| Full demonstration piece count | 11 of 12 | 10 of 12 |
| budget (CR) | 55 CR | 55 CR (unchanged) |
| REQ-63 | SHOULD (conditional) | RESOLVED |

### Path B verification

Path B (monitoring loop) uses cells (4,4), (4,5), Bridge(5,5), (6,5). No
overlap with the corrected Path A. Path B is unmodified.

---

## Pre-written Tests

### keplerTransmitterCanonical.test.ts (Part 1 worktree)

Tests that will pass immediately (level-definition checks):
- K1-5 `expectedOutput` equals `[1,0,1,0]`
- K1-5 `expectedOutput` does NOT equal `[1,1,1,1]`

Tests that run engine (should pass with current engine under Model β):
- REQ-T-3: Source → Transmitter → Terminal, input=0, writes 0
- REQ-T-2: same machine, output is NOT 1
- REQ-T-4: Transmitter downstream of blocking Config Node does not write
- Four-pulse [1,0,1,0] alternating tape: passthrough output equals input

### keplerK17FloorSolve.test.ts (Part 2 worktree)

Tests that will pass once Dev updates levels.ts:
- K1-7 `optimalPieces` equals 7
- No Conveyor at (7,6) in prePlacedPieces
- K1-7 `expectedOutput` equals [1,0,1,1]

Engine test (passes with current engine):
- 7-piece linear path (Scanner→Conveyors→Transmitter): output tracks input on 4 pulses

### keplerRequiredPieces.test.ts (Part 2 worktree)

Tests that run immediately (level-definition checks):
- K1-6 `requiredPieces` equals [splitter×1, merger×1]
- K1-6 `optimalPieces` equals 11
- K1-8 `requiredPieces` equals [bridge×1, latch×1, splitter×1, merger×1]
- K1-8 `optimalPieces` equals 12
- K1-8 `availablePieces` includes 'splitter'

Engine enforcement tests (describe.skip — require Dev implementation):
- K1-6 bypass-fails: Scanner→Transmitter only → requiredPiecesNotEngaged
- K1-6 required-passes: full machine → satisfied
- K1-6 engaged-but-not-fired: Splitter+Merger placed in dead corners → requiredPiecesNotEngaged
- K1-8 bypass-fails: Scanner→Transmitter only → requiredPiecesNotEngaged
- K1-8 required-passes: full machine → satisfied

---

## Anomalies Caught During Amendment Pass

1. **K1-5 optimalPieces=8 vs 9-piece floor solve (pre-existing, not introduced)**
   Spec documents 9 tray pieces in the floor solve but optimalPieces=8 in code.
   No shorter 8-piece path is documented. This was flagged in the QUALITY
   CHECKLIST as a VERIFY item in the original Part 1 spec. Not modified by this
   pass — Dev must verify against engine.

2. **K1-6 and K1-8 Data Trail column assignment (pre-existing, not introduced)**
   REQ-54 (K1-6) and REQ-71 (K1-8) flag that Config Node/Latch column indexing
   may require coordinate adjustment. These are carry-overs from original Part 2
   authoring. Not modified by this pass — Dev must verify against engine.

3. **K1-7 dead-end void handling (pre-existing, not introduced)**
   REQ-62 flags that the engine's behavior when a Splitter arm voids must be
   verified before K1-7 is finalized. Not a collision issue; distinct from Blocker 3.

4. **REQ-RP-5 run-attempt conflict (flagged for Tucker)**
   It is unclear whether `requiredPiecesNotEngaged` failures should consume run
   attempts. The clause says MUST NOT consume attempts, but this may conflict with
   the existing failure system. Tucker confirmation needed before Dev implements.
