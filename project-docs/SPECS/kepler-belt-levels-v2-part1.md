# SPEC: Kepler Belt Level Rework — K1-1 through K1-5
### Sprint 19 | Part 1 of 2 | April 2026 | REPLACES kepler-belt-levels.md §§ K1-1 – K1-5

RFC 2119: MUST, SHOULD, MAY.
Requirements numbered REQ-1 through REQ-N (document-global).

---

## SCOPE

This document covers K1-1 through K1-5 only. K1-6 through K1-10 are
covered in kepler-belt-levels-v2-part2.md (not yet written).

Issues addressed in this document:
- REQ-1: K1-3 computational goal MUST be rewritten (original contradicts tape)
- REQ-2: K1-5 expectedOutput — proposed correction ([1,0,1,0] → [1,1,1,1]) REJECTED. Canonical Model β (REQ-T-1) restores expectedOutput: [1,0,1,0]. See §CANONICAL TRANSMITTER BEHAVIOR.
- REQ-3: prePlaced() helper MUST be fixed for protocol-category pieces
- REQ-4: Floor solves MUST be documented for all five levels
- REQ-5: Splitter MUST receive a Codex tutorial step before or at K1-5
- REQ-6: K1-1 tray MUST be corrected (currently unsolvable — see §K1-1)

---

## CANONICAL TRANSMITTER BEHAVIOR

These clauses define the normative Transmitter model for the entire Kepler Belt
spec set. All Transmitter activations in K1-2 through K1-10 MUST be interpreted
under these semantics. Wherever a floor solve or pulse-by-pulse table involves a
Transmitter, these clauses apply without exception.

**Tucker authorization: 2026-04-30. Model β is canonical and locked.**

**REQ-T-1**: A Transmitter MUST write to its target tape cell the value carried
by the signal pulse that activated it.

**REQ-T-2**: A Transmitter MUST NOT write `1` to indicate "signal arrived" when
the signal value is `0`. The Transmitter is not a presence sensor.

**REQ-T-3**: A Transmitter MAY be activated by a signal carrying value `0`; in
that case it MUST write `0` to its target tape cell.

**REQ-T-4**: When a Transmitter has not been activated within a given pulse, the
target tape cell MUST remain unchanged from its prior state (initial value:
`null`).

**Model distinction:**

- Model α (rejected): Transmitter writes `1` when a signal arrives, regardless
  of the signal's carried value. The Transmitter acts as a presence sensor.
- Model β (canonical): Transmitter writes the *value* carried by the activating
  signal pulse. Signal value `0` produces output `0`.

Any prose in the Kepler Belt spec set that implies Model α semantics MUST be
treated as a drafting error and corrected under these clauses.

**Applicable levels:** K1-2, K1-3, K1-4, K1-5, K1-6, K1-7, K1-8, K1-9,
K1-10. K1-1 has no Transmitter.

---

## GLOBAL CODE FIX — prePlaced() CATEGORY BUG

**File:** `src/game/levels.ts`, lines 17–20.

**Current:**
```typescript
const category =
  type === 'configNode' || type === 'scanner' || type === 'transmitter'
    ? 'protocol'
    : 'physics';
```

**Required (REQ-3):**
```typescript
const category =
  type === 'configNode' || type === 'scanner' || type === 'transmitter' ||
  type === 'latch' || type === 'inverter' || type === 'counter'
    ? 'protocol'
    : 'physics';
```

`latch`, `inverter`, and `counter` are Protocol pieces.
Any pre-placed Latch (K1-3, and optionally K1-4) currently gets
`category: 'physics'`. This is incorrect and MUST be fixed before
implementing any Kepler level that pre-places a Latch.

---

## K1-1 — Corridor Entry

### 1. Computational Goal
Route signal from Source to Terminal with exactly two direction
changes on a board that provides no placement highlights.
The player must choose cell placement independently.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept | Independent routing without placement highlights |
| New piece | None |
| Prerequisite | All Axiom sector concepts, specifically Conveyor + Gear routing |

### 3. Board Layout

| Field | Value |
|-------|-------|
| Grid | 8 × 6 |
| Source | (1, 2) |
| Terminal | (6, 4) |
| Pre-placed | Source, Terminal only |

### 4. Available Pieces (REQ-6 FIX)

**Bug:** Current tray is `['conveyor' ×3, 'gear' ×2]` = 5 pieces.
Source (1,2) to Terminal (6,4): Manhattan distance = |6-1| + |4-2| = 7.
Intermediate cells = 7 - 1 = 6. Any rectilinear path needs 6 tray pieces.
Five pieces is insufficient. Level is unsolvable as currently specced.

**REQ-6:** Tray MUST be corrected to one of:
- Option A (RECOMMENDED): `['conveyor' ×4, 'gear' ×2]` — 6 pieces, optimalPieces = 6
- Option B: Move Terminal to (5, 4) (Manhattan = 6, needs 5 pieces). Requires board replan.

This spec uses Option A. If Tucker prefers a tighter board, Option B
produces a 5-piece solve with Terminal at (5,4).

**Tray (Option A):**

| Piece | Count | Role |
|-------|-------|------|
| Conveyor | 4 | Path routing |
| Gear | 2 | Direction changes |

### 5. Floor Solve

Minimum viable solution — 6 pieces (all tray pieces).

Path layout (Source auto-orients right):

```
(1,2) Source → (2,2) Conveyor → (3,2) Gear [right→down]
 → (3,3) Conveyor → (3,4) Conveyor → (4,4) Gear [down→right]
 → (5,4) Conveyor → (6,4) Terminal
```

| Step | Piece | Cell | Role |
|------|-------|------|------|
| 1 | Conveyor | (2,2) | Extends Source right |
| 2 | Gear | (3,2) | Turns signal right → down |
| 3 | Conveyor | (3,3) | Carries signal down |
| 4 | Conveyor | (3,4) | Continues down |
| 5 | Gear | (4,4) | Turns signal down → right |
| 6 | Conveyor | (5,4) | Bridges to Terminal |

Signal trace: Source(1,2) → right → right → turn-down → down → down →
turn-right → right → Terminal(6,4).

Three-star reachable on floor solve: YES (uses all tray pieces,
efficiency = 100%).

### 6. Input Tape / Expected Output

Single-pulse level. No input tape. No output tape. No Transmitter.

```
inputTape: undefined
expectedOutput: undefined
requiredTerminalCount: 1
```

### 7. Data Trail

```typescript
dataTrail: { cells: [], headPosition: 0 }
```

No Protocol pieces. Data Trail unused.

### 8. Scoring Categories Visible

`['efficiency', 'chainIntegrity']`

Note: `protocolPrecision` SHOULD be removed from K1-1 — no Protocol
pieces are present. Showing it implies there is something to measure.
Current code includes it; this spec corrects that.

### 9. Budget / Credit Budget

| Field | Value | Rationale |
|-------|-------|-----------|
| Floor solve cost | 40 CR | 4 × Conveyor (5) + 2 × Gear (10) |
| Fresh board buffer | 50 CR | Kepler Belt rate |
| creditBudget | 90 CR | |
| budget (tray cost) | 40 CR | |

### 10. Difficulty Band

`intuitive`

### 11. Narrative Frame

First repair in the Kepler Belt corridor. Simple routing problem.
Familiar tools, no wire guides. The unfamiliarity is environmental,
not mechanical.

### 12. COGS Line

> "Kepler Belt. Former mining corridor, mostly decommissioned. Some
> salvage activity remains. We have been here before. The charts
> confirm it."

`eyeState: 'blue'`
**[DO NOT MODIFY — APPROVED in NARRATIVE.md]**

### 13. Tutorial Steps

K1-1 introduces the Requisition Store. No new piece. Six steps:
board intro, Requisition explanation (4 steps), board resume.

Steps from current implementation are approved. The store tutorial
steps (store-intro, store-tabs, store-forfeiture, store-window) MUST
remain in K1-1 — this is the first Kepler level and the first time
the Requisition mechanic appears.

Current tutorialSteps in levels.ts are correct. No changes needed.

### 14. Consequence Config

None. K1-1 is not a consequence level.

### 15. Code Fixes Required

| Fix | Field | Current | Required |
|-----|-------|---------|----------|
| REQ-6 | availablePieces | `[c,c,c,g,g]` | `[c,c,c,c,g,g]` |
| REQ-6 | optimalPieces | 5 | 6 |
| REQ-6 | budget | 30 | 40 |
| REQ-6 | creditBudget | 75 | 90 |
| Scoring | scoringCategoriesVisible | includes protocolPrecision | remove protocolPrecision |

---

## K1-2 — Relay Splice

> Transmitter behavior: see canonical clause REQ-T-* (§CANONICAL TRANSMITTER BEHAVIOR above).

### 1. Computational Goal

Pass each value from the input tape to the output tape unchanged.
Scanner reads each input bit to the Data Trail; Transmitter writes
that value to the output tape. Output equals input on every pulse.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept | Dynamic tape processing — Scanner + Transmitter review in non-uniform context |
| New piece | None |
| Prerequisite | Scanner reads input tape to DT; Transmitter writes DT value to output tape; placement order = execution order |

The Axiom introduced these pieces but used uniform or minimal tapes.
K1-2 is the first Kepler level with a mixed tape, confirming the player's
understanding is general, not hardcoded to the Axiom's specific tapes.

### 3. Board Layout

| Field | Value |
|-------|-------|
| Grid | 9 × 6 |
| Source | (1, 3) |
| Terminal | (7, 3) |
| Pre-placed | Source, Terminal only |

### 4. Available Pieces

| Piece | Count | Role |
|-------|-------|------|
| Conveyor | 4 | Path routing |
| Scanner | 1 | Reads input tape → DT |
| Transmitter | 1 | Writes DT → output tape |
| Gear | 1 | Optional corner (not used in floor solve) |

### 5. Floor Solve

Straight horizontal path. Source and Terminal on same row.
No Gear required. Minimum = 5 pieces.

```
(1,3) Source → (2,3) Scanner → (3,3) Conveyor → (4,3) Conveyor
 → (5,3) Conveyor → (6,3) Transmitter → (7,3) Terminal
```

| Step | Piece | Cell | Role |
|------|-------|------|------|
| 1 | Scanner | (2,3) | Reads input[P], writes DT = input[P] |
| 2 | Conveyor | (3,3) | Routing |
| 3 | Conveyor | (4,3) | Routing |
| 4 | Conveyor | (5,3) | Routing |
| 5 | Transmitter | (6,3) | Writes output[P] = signal value |

Signal trace: each pulse — Source → Scanner reads input, writes DT →
signal continues → Transmitter reads DT, writes to output tape → Terminal.

Configuration: Scanner configValue irrelevant (reads, does not gate).
Transmitter configValue irrelevant (writes whatever arrives).

Three-star reachable on floor solve: YES.

### 6. Input Tape / Expected Output

```
inputTape:      [1, 0, 1, 1, 0]
expectedOutput: [1, 0, 1, 1, 0]
```

Pulse-by-pulse verification:

| Pulse | Input | DT after Scanner | Transmitter writes | Output |
|-------|-------|------------------|--------------------|--------|
| 0 | 1 | 1 | 1 | 1 ✓ |
| 1 | 0 | 0 | 0 | 0 ✓ |
| 2 | 1 | 1 | 1 | 1 ✓ |
| 3 | 1 | 1 | 1 | 1 ✓ |
| 4 | 0 | 0 | 0 | 0 ✓ |

Edge case: pulses 1 and 4 (both input=0) — hardcoded "always output 1"
machine fails. A machine with Transmitter bypassing the Scanner outputs
wrong values on 0-input pulses.

Tape design rationale: mixed 1s and 0s confirm the machine passes each
value faithfully rather than outputting a constant. Two 0-values are
the edge cases; a hardcoded pass-through fails them.

### 7. Data Trail

```typescript
dataTrail: { cells: [null, null, null, null, null], headPosition: 0 }
```

5 cells for 5 pulses. Scanner writes to DT; Transmitter reads from it.

### 8. Scoring Categories Visible

`['efficiency', 'chainIntegrity', 'protocolPrecision']`

protocolPrecision is visible because Scanner and Transmitter are present.

### 9. Budget / Credit Budget

| Field | Value | Rationale |
|-------|-------|-----------|
| Floor solve cost | 80 CR | Scanner(30) + 3×Conveyor(15) + Transmitter(35) |
| Fresh board buffer | 50 CR | |
| creditBudget | 130 CR | |
| budget | 80 CR | |

### 10. Difficulty Band

`derivable`

### 11. Narrative Frame

The relay chain in Kepler Belt was built to last. It has lasted past
the people responsible for maintaining it. Every value on the tape
must pass through unchanged — degradation is the failure mode, not
transformation.

### 12. COGS Line

> "The primary relay chain out here was built to last. It has lasted
> past the people responsible for maintaining it. That is a common
> condition in this corridor."

`eyeState: 'blue'`
**[DO NOT MODIFY — APPROVED in NARRATIVE.md]**

### 13. Tutorial Steps

No new piece. Two instructor steps.

```
Step 1 (board-intro, boardGrid, blue):
"The input tape feeds a mixed signal. Each value must pass through
unchanged. The Scanner reads it. The Transmitter writes it. The
path between them is yours to build."

Step 2 (board-resume, boardGrid, blue):
"Scanner before Transmitter. The Data Trail carries the value
between them. Every pulse must produce the correct output."
```

Current tutorialSteps in levels.ts are correct. No changes needed.

### 14. Consequence Config

None.

### 15. Code Fixes Required

| Fix | Field | Current | Required |
|-----|-------|---------|----------|
| Budget | budget | undefined | 80 |
| Budget | creditBudget | undefined | 130 |

---

## K1-3 — Junction 7

> Transmitter behavior: see canonical clause REQ-T-* (§CANONICAL TRANSMITTER BEHAVIOR above).

### 1. Computational Goal (REQ-1 FIX)

**Current (WRONG):** "Store the first input value in a Latch (write
mode), then use that stored value to gate subsequent pulses via Config
Node reading the Latch output (read mode)."

**Why it is wrong:** The described machine stores the first value (e.g.
1) and gates all subsequent pulses against that fixed stored value.
With input [1, 1, 0, 1, 1] and first value = 1, this machine would
output [1, 1, 1, 1, 1] — all pulses pass. The actual expected output
is [1, 1, 0, 1, 1], which requires per-pulse gating, not fixed-value
gating. The stated goal contradicts the tape.

**REQ-1 — Required computational goal:**

Gate each input pulse based on its own current value: pass pulses
carrying 1, block pulses carrying 0. The pre-placed Latch in WRITE
mode captures the current signal value each pulse and writes it to
the Data Trail. A player-placed Config Node reads that DT value and
opens or closes the gate. Output matches input (identity function).
The player must place the Config Node downstream of the Latch.

**What K1-3 actually teaches:** Latch in WRITE mode as a per-pulse DT
writer. Unlike Scanner (which reads the input tape), Latch(WRITE)
captures the signal value directly. Downstream pieces read whatever
the Latch last wrote. Placement order remains critical: Config Node
after Latch, not before.

Cross-pulse memory (where a stored value persists and influences later
pulses independently of new input) is introduced in K1-4 and K1-6.
K1-3 teaches only the WRITE side of the Latch.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept | Latch introduction — WRITE mode as per-pulse DT writer. Pre-placed piece constraints design. |
| New piece | Latch (pre-placed, Codex entry triggered here) |
| Prerequisite | Scanner→DT→Config gating chain (Axiom A1-5 / A1-6); understanding that placement order is execution order |

### 3. Board Layout

| Field | Value |
|-------|-------|
| Grid | 10 × 7 |
| Source | (1, 3) |
| Terminal | (8, 3) |
| Pre-placed | Source (1,3); Latch (4,3) WRITE mode; Terminal (8,3) |

The Latch is pre-placed in WRITE mode. Its latchMode must be
explicitly set in the level definition.

**REQ-3 applies:** prePlaced('latch', 4, 3) MUST get category 'protocol'
after the global helper fix. Verify after applying REQ-3.

### 4. Available Pieces

| Piece | Count | Role |
|-------|-------|------|
| Conveyor | 4 | Path routing |
| Scanner | 1 | Reads input tape → DT (upstream of Latch) |
| Transmitter | 1 | Writes output tape |
| Config Node | 1 | Gates on DT value (placed downstream of Latch) |
| Gear | 1 | Optional routing (not needed in floor solve) |

### 5. Floor Solve

Source and Terminal on same row (row 3). Latch pre-placed at (4,3).
Cells requiring tray pieces: (2,3), (3,3), (5,3), (6,3), (7,3) = 5 cells.

```
(1,3) Source → (2,3) Scanner → (3,3) Conveyor → (4,3) Latch[pre-placed,WRITE]
 → (5,3) ConfigNode → (6,3) Conveyor → (7,3) Transmitter → (8,3) Terminal
```

| Step | Piece | Cell | Config | Role |
|------|-------|------|--------|------|
| 1 | Scanner | (2,3) | — | Reads input[P] → DT |
| 2 | Conveyor | (3,3) | — | Routing |
| — | Latch | (4,3) | WRITE | Pre-placed; captures signal value → DT |
| 3 | Config Node | (5,3) | configValue=1 | Reads DT; gates on DT=1 |
| 4 | Conveyor | (6,3) | — | Routing |
| 5 | Transmitter | (7,3) | — | Writes output[P] |

Pieces from tray used: Scanner + 2×Conveyor + Config Node + Transmitter = 5.
optimalPieces = 5. Matches current code value.

Three-star reachable on floor solve: YES.

### 6. Input Tape / Expected Output

```
inputTape:      [1, 1, 0, 1, 1]
expectedOutput: [1, 1, 0, 1, 1]
```

Pulse-by-pulse verification (Latch WRITE captures per pulse):

| P | Input | Scanner→DT | Latch writes DT | Config reads DT | Gate | Transmitter | Output |
|---|-------|------------|-----------------|-----------------|------|-------------|--------|
| 0 | 1 | DT=1 | DT=1 | 1 = configValue(1) | OPEN | writes 1 | 1 ✓ |
| 1 | 1 | DT=1 | DT=1 | 1 = 1 | OPEN | writes 1 | 1 ✓ |
| 2 | 0 | DT=0 | DT=0 | 0 ≠ 1 | BLOCK | no signal | 0 ✓ |
| 3 | 1 | DT=1 | DT=1 | 1 = 1 | OPEN | writes 1 | 1 ✓ |
| 4 | 1 | DT=1 | DT=1 | 1 = 1 | OPEN | writes 1 | 1 ✓ |

Edge case: pulse 2 (input=0). Latch writes 0 → DT=0 → Config Node
(configValue=1) blocks. A hardcoded "always pass" machine fails here.
A machine with Config Node UPSTREAM of the Latch reads a stale DT
value and produces incorrect results on tapes that start with 0.

Alternative test tape that validates general machine (not this tape
specifically): [0, 1, 1, 0, 1] → expected [0, 1, 1, 0, 1]. The
floor solve machine handles this correctly.

Tape design rationale: mixed 1s and 0s. The 0 at position 2 tests
Config Node blocks correctly. A hardcoded pass-through fails. A machine
with Config Node upstream of Latch fails on any tape beginning with 0.

### 7. Data Trail

```typescript
dataTrail: { cells: [null, null, null, null, null], headPosition: 0 }
```

### 8. Scoring Categories Visible

`['efficiency', 'chainIntegrity', 'protocolPrecision']`

### 9. Budget / Credit Budget

| Field | Value | Rationale |
|-------|-------|-----------|
| Floor solve cost | 100 CR | Scanner(30) + 2×Conv(10) + Config(25) + Trans(35) |
| Fresh board buffer | 50 CR | |
| creditBudget | 150 CR | |
| budget | 100 CR | |

### 10. Difficulty Band

`derivable`

### 11. Narrative Frame

Junction 7 is a routing bottleneck. Eleven settlements depend on it.
The routing decision cannot be arbitrary — it must be determined by
what arrives and applied consistently. A pre-placed piece on the board
has already made one architectural choice; the player works with it.

### 12. COGS Line

> "Junction 7 is a routing bottleneck. Eleven settlements feed through
> this point. The original engineers underestimated the load. It is not
> the last time that has happened out here."

`eyeState: 'blue'`
**[DO NOT MODIFY — APPROVED in NARRATIVE.md]**

### 13. Tutorial Steps

New piece: Latch. Four-beat pattern. Three steps (Codex opens on
step 2 automatically, no separate step needed in TutorialStep array).

```
Step 1 (board-intro, boardGrid, blue):
"Junction 7. Eleven settlements feed through this point. The routing
decision here must be stored and applied to every signal that passes
through. The board has a piece that remembers. It has two modes.
Placement determines which mode it uses."

Step 2 (latch-collect, boardGrid, amber):
[codexEntryId: 'latch']
"A storage unit. Two modes. Uncatalogued. This goes in the Codex
immediately."

Step 3 (board-resume, boardGrid, blue):
"As I was saying. Write mode captures the value. Read mode outputs
what was captured. The order matters. Write before read. The junction
depends on what was stored."
```

Note: step 2 targets `boardGrid` (not a tray slot) because the Latch
is pre-placed. COGS notices a piece already on the board, not one in
the Engineer's tray. This is a collector-noticing-an-existing-piece
variant; the eye-state and urgency follow the same pattern.

Current tutorialSteps in levels.ts match this. No changes needed.

### 14. Consequence Config

None.

### 15. Code Fixes Required

| Fix | Field | Current | Required |
|-----|-------|---------|----------|
| REQ-1 | computationalGoal | cross-pulse description | per-pulse description (see §1 above) |
| REQ-1 | tapeDesignRationale | references "stored value does not match" | update to per-pulse framing |
| REQ-3 | prePlaced('latch') category | 'physics' | 'protocol' (via global helper fix) |
| Budget | budget | 40 | 100 |
| Budget | creditBudget | undefined | 150 |
| prePlaced | latchMode on pre-placed Latch | not set | MUST set latchMode: 'write' explicitly |

The pre-placed Latch definition must explicitly include `latchMode: 'write'`:

```typescript
prePlaced('latch', 4, 3)
// becomes:
{ ...prePlaced('latch', 4, 3), latchMode: 'write' }
```

or the prePlaced helper must be extended to accept a latchMode option.

---

## K1-4 — Mining Platform Alpha (CONSEQUENCE)

> Transmitter behavior: see canonical clause REQ-T-* (§CANONICAL TRANSMITTER BEHAVIOR above).

### 1. Computational Goal

Output 1 for each input pulse of value 1; output 0 for each input
pulse of value 0. The player places a Latch in WRITE mode on the path
each pulse, a Config Node reads the DT value written by the Latch, and
a Transmitter records the gated result. Output equals input (identity
function implemented via player-controlled Latch placement).

Distinction from K1-3: In K1-3 the Latch was pre-placed and in WRITE
mode; the player only placed Config Node and routing pieces. In K1-4
the player places the Latch themselves and chooses its mode. The
concept being reinforced: Latch WRITE mode as per-pulse memory, now
chosen deliberately by the Engineer.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept | Latch as player-placed per-pulse memory (WRITE mode, player chooses placement and mode) |
| New piece | None (Latch was introduced in K1-3) |
| Prerequisite | K1-3: Latch WRITE mode; Config Node gating; Scanner → DT sequence |

### 3. Board Layout

| Field | Value |
|-------|-------|
| Grid | 10 × 7 |
| Source | (1, 3) |
| Terminal | (8, 3) |
| Pre-placed | Source (1,3); Terminal (8,3) only |

No pre-placed Latch here — the player must place it.

### 4. Available Pieces

| Piece | Count | Role |
|-------|-------|------|
| Conveyor | 4 | Path routing |
| Scanner | 1 | Reads input tape → DT |
| Latch | 1 | Player places in WRITE mode; per-pulse DT write |
| Config Node | 1 | Gates on DT value |
| Transmitter | 1 | Writes output tape |
| Gear | 2 | Optional routing (not needed in floor solve) |

### 5. Floor Solve

Straight horizontal path. 6 intermediate cells = 6 tray pieces.

```
(1,3) Source → (2,3) Scanner → (3,3) Latch[WRITE] → (4,3) ConfigNode
 → (5,3) Conveyor → (6,3) Conveyor → (7,3) Transmitter → (8,3) Terminal
```

| Step | Piece | Cell | Config | Role |
|------|-------|------|--------|------|
| 1 | Scanner | (2,3) | — | Reads input[P] → DT |
| 2 | Latch | (3,3) | WRITE | Captures signal → DT |
| 3 | Config Node | (4,3) | configValue=1 | Reads DT; gates on DT=1 |
| 4 | Conveyor | (5,3) | — | Routing |
| 5 | Conveyor | (6,3) | — | Routing |
| 6 | Transmitter | (7,3) | — | Writes output[P] |

Pieces from tray: Scanner + Latch + Config + 2×Conveyor + Transmitter = 6.
optimalPieces = 6. Matches current code value.

Player MUST tap the Latch after placing it to confirm WRITE mode
(or confirm default mode is WRITE). COGS: "Write before read."

Three-star reachable on floor solve: YES.

### 6. Input Tape / Expected Output

```
inputTape:      [1, 0, 0, 1, 1, 0]
expectedOutput: [1, 0, 0, 1, 1, 0]
```

Pulse-by-pulse verification:

| P | Input | Latch WRITE → DT | Config (cv=1) | Gate | Output |
|---|-------|------------------|----------------|------|--------|
| 0 | 1 | DT=1 | 1=1 | OPEN | 1 ✓ |
| 1 | 0 | DT=0 | 0≠1 | BLOCK | 0 ✓ |
| 2 | 0 | DT=0 | 0≠1 | BLOCK | 0 ✓ |
| 3 | 1 | DT=1 | 1=1 | OPEN | 1 ✓ |
| 4 | 1 | DT=1 | 1=1 | OPEN | 1 ✓ |
| 5 | 0 | DT=0 | 0≠1 | BLOCK | 0 ✓ |

Edge cases: pulses 1–2 (consecutive 0s) and pulses 3–4 (consecutive 1s)
test that the machine is not alternating or using any cross-pulse memory.
A machine that hardcodes "pass odd pulses, block even pulses" fails
on pulses 2 and 3. A machine that stores and re-uses pulse 0's value
fails on pulses 1–2 (would pass them since pulse 0 = 1).

Tape design rationale: three consecutive same values (positions 1–2
and 3–4) confirm the machine responds to each pulse independently.

### 7. Data Trail

```typescript
dataTrail: { cells: [null, null, null, null, null, null], headPosition: 0 }
```

### 8. Scoring Categories Visible

`['efficiency', 'chainIntegrity', 'protocolPrecision']`

### 9. Budget / Credit Budget

| Field | Value | Rationale |
|-------|-------|-----------|
| Floor solve cost | 130 CR | Scanner(30)+Latch(30)+Config(25)+2×Conv(10)+Trans(35) |
| Fresh board buffer | 50 CR | Consequence level — fresh board is a likely purchase |
| creditBudget | 180 CR | |
| budget | 130 CR | |

Consequence level: SHOULD be more generous with budget to ensure
free-to-play guarantee is unambiguous. 180 CR is sufficient.

### 10. Difficulty Band

`derivable`

### 11. Narrative Frame

Mining Platform Alpha has been decommissioned for six years. The
colonists use it as a signal relay. It was not designed for this
purpose. It is doing the job anyway. Failure affects seven settlements
for forty-eight hours. The weight of this is stated plainly by COGS,
without editorializing.

### 12. COGS Line

> "Mining Platform Alpha has been decommissioned for six years. The
> colonists use it as a signal relay. It was not designed for this
> purpose. It is doing the job anyway."

`eyeState: 'blue'`
**[DO NOT MODIFY — APPROVED in NARRATIVE.md]**

### 13. Tutorial Steps

No new piece. K1-4 has no tutorialSteps in current code. This is
acceptable — consequence levels can forgo tutorial steps to let the
weight of the consequence land without COGS interruption.

SHOULD add a single pre-launch instructor step referencing the
consequence weight, but this is not required. Current (empty) state
is acceptable.

### 14. Consequence Config

```typescript
consequence: {
  cogsWarning: 'Pay attention to this one.',
  failureEffect:
    'Mining Platform Alpha relay failure. Seven settlements lost ' +
    'communication for forty-eight hours.',
}
```

`requireThreeStars` is NOT set on K1-4. Only the boss level (K1-10)
requires three stars to avoid the consequence.

Consequence timing: blown cell fires on void result. Ship damage fires
on void result. Both fire simultaneously. K1-4 does not have a separate
narrative consequence beyond the failureEffect text.

### 15. Code Fixes Required

| Fix | Field | Current | Required |
|-----|-------|---------|----------|
| Budget | budget | 45 | 130 |
| Budget | creditBudget | undefined | 180 |

---

## K1-5 — Resupply Chain

> Transmitter behavior: see canonical clause REQ-T-* (§CANONICAL TRANSMITTER BEHAVIOR above). REQ-2 correction ([1,0,1,0] → [1,1,1,1]) was REJECTED under Model β; see §6 below.

### 1. Computational Goal

Output 1 on every pulse regardless of input value. The signal is split
at a pre-placed Splitter: Path A passes through a Config Node (opens
when DT = 1); Path B bypasses the Config Node entirely. A Merger
reconverges both paths. Because Path B always carries a signal, the
Transmitter always fires. The machine demonstrates OR-style redundancy:
even when one path fails (input = 0 blocks Path A), the other ensures
the signal arrives.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept | Merger — OR logic, two-path reconvergence. Redundancy as correctness. |
| New pieces | Splitter (pre-placed, Codex entry here — see REQ-5); Merger (tray, Codex entry here) |
| Prerequisite | Config Node gating; path routing; Splitter visual recognition |

**REQ-5 — Splitter Codex entry:**

The Splitter has not appeared in any prior level (Axiom or Kepler).
K1-5 is the first time the player encounters it. It is pre-placed,
meaning it appears on the board before any tray interaction.

K1-5 violates the "one new piece per level" rule from the Level Design
Framework. This spec accepts the violation with explicit justification:
the Splitter cannot be demonstrated without a split destination (the
Merger), and the Merger cannot be demonstrated without a split origin
(the Splitter). They are architecturally paired. Introducing them
together is pedagogically correct even though it breaks the
one-piece rule.

Both pieces MUST receive Codex entries in K1-5's tutorial steps.

### 3. Board Layout

| Field | Value |
|-------|-------|
| Grid | 10 × 8 |
| Source | (1, 4) |
| Terminal | (8, 4) |
| Pre-placed | Source (1,4); Splitter (3,4); Terminal (8,4) |

### 4. Available Pieces (REQ-2 context)

| Piece | Count | Role |
|-------|-------|------|
| Conveyor | 6 | Path routing (both paths) |
| Scanner | 1 | Reads input tape → DT (before Splitter) |
| Config Node | 1 | Path A gate |
| Merger | 1 | Reconvergence (OR logic) |
| Transmitter | 1 | Writes output tape |
| Gear | 2 | Direction changes on Path B |

### 5. Floor Solve

Scanner placed before the pre-placed Splitter. Path A continues
along row 4 (gated). Path B loops above via row 3 (bypass). Both
rejoin at Merger. Transmitter between Merger and Terminal.

```
Row 4: (1,4)Source → (2,4)Scanner → (3,4)Splitter[pre-placed]
 ┌─ Path A (row 4, gated): → (4,4)ConfigNode → (5,4)Conveyor → Merger(6,4)
 └─ Path B (rows 3, bypass): → (3,3)Gear → (4,3)Conveyor → (5,3)Conveyor
                                → (6,3)Gear → Merger(6,4) [top input]

(6,4)Merger → (7,4)Transmitter → (8,4)Terminal
```

| Step | Piece | Cell | Config | Role |
|------|-------|------|--------|------|
| 1 | Scanner | (2,4) | — | Reads input[P] → DT |
| — | Splitter | (3,4) | pre-placed | Splits: right output (Path A) + up output (Path B) |
| 2 | Config Node | (4,4) | configValue=1 | Path A gate; opens when DT=1 |
| 3 | Conveyor | (5,4) | — | Path A routing |
| 4 | Gear | (3,3) | — | Path B: Splitter-up → right turn |
| 5 | Conveyor | (4,3) | — | Path B routing |
| 6 | Conveyor | (5,3) | — | Path B routing |
| 7 | Gear | (6,3) | — | Path B: right → down turn into Merger top |
| 8 | Merger | (6,4) | — | Reconverges Path A (left) + Path B (top) |
| 9 | Transmitter | (7,4) | — | Writes output[P] = 1 (signal always present) |

Pieces from tray: Scanner + Config + 2×Conveyor (Path A) + 2×Gear + 2×Conveyor (Path B) + Merger + Transmitter = 9.

**Discrepancy:** Current code has optimalPieces = 8. This floor solve
uses 9 tray pieces. Either:
- A shorter Path B route exists (possible if Merger placed earlier), OR
- optimalPieces SHOULD be 9 and the code value is wrong.

This MUST be verified against the engine. The floor solve path above
is geometrically sound. If a shorter route proves valid, document it
and update optimalPieces. Do not set optimalPieces = 8 without a
verified 8-piece path.

Three-star reachable on floor solve: YES.

### 6. Input Tape / Expected Output

**Historical note (REQ-2 REJECTED):** An earlier draft of this spec proposed
correcting `expectedOutput` from `[1,0,1,0]` to `[1,1,1,1]`, on the grounds
that Path B always carries a signal and Transmitter always fires. That
correction assumed Model α ("signal arrived" = 1). Tucker confirmed canonical
Model β on 2026-04-30 after QA flagged the cross-level contradiction. Under
Model β (REQ-T-1), the Transmitter writes the *value* carried by the signal
pulse, not a presence indicator. The proposed correction is rejected and the
current code value `[1,0,1,0]` is confirmed correct.

```
inputTape:      [1, 0, 1, 0]
expectedOutput: [1, 0, 1, 0]
```

Pulse-by-pulse verification (canonical Model β — Transmitter writes carried
signal value):

| P | Input | DT | Path B signal value | Path A (Config cv=1) | Merger active input | Transmitter writes | Output |
|---|-------|----|---------------------|----------------------|---------------------|--------------------|--------|
| 0 | 1 | 1 | 1 | OPEN — carries value 1 | both paths, value 1 | 1 | 1 ✓ |
| 1 | 0 | 0 | 0 | BLOCK — no signal | Path B only, value 0 | 0 | 0 ✓ |
| 2 | 1 | 1 | 1 | OPEN — carries value 1 | both paths, value 1 | 1 | 1 ✓ |
| 3 | 0 | 0 | 0 | BLOCK — no signal | Path B only, value 0 | 0 | 0 ✓ |

Under canonical Model β: the Splitter emits the source signal's *value* on all
output arms. When input is 0, Path B carries value 0. The Merger reconverges on
signal arrival (OR on arrival); the arriving signal from Path B carries value 0.
The Transmitter writes the value of the Merger's active input — which is 0 on
pulses 1 and 3. Output tracks input on every pulse.

Edge cases: pulses 1 and 3 (input=0) distinguish the two models. Under Model α
(rejected), Path B delivers a "signal arrived" value of 1 to the Merger, so
Transmitter writes 1 regardless of input — producing [1,1,1,1]. Under Model β
(canonical), Path B delivers value 0, so Transmitter writes 0 — producing
[1,0,1,0]. The canonical expected output [1,0,1,0] is the Model β result.

Tape design rationale: alternating 1 and 0. The 0-input pulses (1, 3) are the
distinguishing edge cases. A Model α engine implementation produces [1,1,1,1]
and fails this level on a correct machine. A Model β engine produces [1,0,1,0]
and passes. The tape is also the minimum tape that exposes the model difference.

### 7. Data Trail

```typescript
dataTrail: { cells: [null, null, null, null], headPosition: 0 }
```

4 cells for 4 pulses.

### 8. Scoring Categories Visible

`['efficiency', 'chainIntegrity', 'protocolPrecision']`

### 9. Budget / Credit Budget

| Field | Value | Rationale |
|-------|-------|-----------|
| Floor solve cost | 155 CR | Scanner(30)+Config(25)+2×Conv(10)+2×Gear(20)+Merger(15)+Trans(35) = 135; +Splitter pre-placed = 0 tray cost. Wait — tray total: 135 + 2×Conv(10) for Path A = 155 |
| Fresh board buffer | 50 CR | |
| creditBudget | 205 CR | |
| budget | 155 CR | |

Note: Splitter is pre-placed and does not cost CR from the tray.

### 10. Difficulty Band

`derivable`

### 11. Narrative Frame

The resupply chain runs through four independent relay nodes. All four
are degraded. The colonists have been compensating manually for two
years without filing a repair request. Redundancy is the only option —
one path is not enough. Two routes to the same destination.

### 12. COGS Line

> "The resupply chain for this region runs through four independent
> relay nodes. All four are degraded. The colonists have been
> compensating manually for at least two years. They have not filed
> a formal repair request. I find that worth noting."

`eyeState: 'blue'`
**[DO NOT MODIFY — APPROVED in NARRATIVE.md]**

### 13. Tutorial Steps (REQ-5 FIX)

Two new pieces in this level: Splitter (pre-placed on board) and
Merger (in tray). Seven-beat tutorial — dual introduction pattern.

```
Step 1 (board-intro, boardGrid, blue):
"The resupply chain has four relay nodes. All degraded. One path
may not be enough. The board has already split the signal into two
routes. Something downstream needs to bring them back together.
First — that piece on the board."

Step 2 (splitter-collect, boardGrid, amber):
[codexEntryId: 'splitter']
"One input. Two outputs. Simultaneously. Uncatalogued. I am
correcting that."

Step 3: Codex opens automatically (splitter entry).

Step 4 (board-resume-1, boardGrid, blue):
"As I was saying. The Splitter divides the signal. Both outputs
receive a copy. One route goes through a gate. The other does not.
Both need a destination."

Step 5 (merger-collect, tray Merger slot, amber):
[codexEntryId: 'merger']
"Two inputs. One output. Either is sufficient. Logging this under
redundancy infrastructure."

Step 6: Codex opens automatically (merger entry).

Step 7 (board-resume-2, boardGrid, blue):
"As I was saying. The Merger accepts signal from either input.
Both paths lead to the same destination. The resupply chain does
not care which route the signal took. It cares that it arrived."
```

Current tutorialSteps in levels.ts have only 3 steps (missing the
Splitter collector step and the associated resume). MUST be replaced
with the 7-step sequence above.

Note on step 2 voice: COGS is noticing a piece already on the board.
Target is `boardGrid`, eyeState `amber`. This is not the standard
tray-slot collector, but COGS noticing something pre-existing. The
urgency and brevity are the same.

### 14. Consequence Config

None. K1-5 is not a consequence level.

### 15. Code Fixes Required

| Fix | Field | Current | Required |
|-----|-------|---------|----------|
| REQ-2 | expectedOutput | `[1, 0, 1, 0]` | REMAINS `[1, 0, 1, 0]` — REQ-2 correction rejected. Canonical Model β (REQ-T-1) confirms this value is correct. No code change required. |
| REQ-5 | tutorialSteps | 3 steps (no Splitter) | 7 steps (see §13) |
| Budget | budget | 50 | 155 |
| Budget | creditBudget | undefined | 205 |
| Scoring goal | computationalGoal | "bypass guarantees always reaches output" — partially correct | update to reflect OR-redundancy explicitly |
| optimalPieces | optimalPieces | 8 | verify; likely 9 (see §5) |

---

## CODE FIX SUMMARY

All fixes in priority order:

| # | File | Location | Fix | Severity |
|---|------|----------|-----|----------|
| 1 | levels.ts | prePlaced() lines 17–20 | Add latch/inverter/counter to protocol category | BLOCKING — affects all pre-placed Latch levels |
| 2 | — | levelK1_5.expectedOutput | REQ-2 REJECTED — no code change. `[1,0,1,0]` is correct under canonical Model β (REQ-T-1). Tucker authorized 2026-04-30. | RESOLVED |
| 3 | levels.ts | levelK1_1.availablePieces | Add 4th Conveyor; update optimalPieces, budget, creditBudget | BLOCKING — level unsolvable |
| 4 | levels.ts | levelK1_3.computationalGoal | Rewrite to per-pulse description | REQUIRED — documentation correctness |
| 5 | levels.ts | levelK1_3 prePlaced Latch | Add `latchMode: 'write'` to pre-placed Latch | REQUIRED — engine behavior |
| 6 | levels.ts | levelK1_5 tutorialSteps | Add Splitter collector step + 4 beats | REQUIRED — Splitter has no Codex entry |
| 7 | levels.ts | levelK1_2 budget/creditBudget | Set budget: 80, creditBudget: 130 | RECOMMENDED |
| 8 | levels.ts | levelK1_3 budget/creditBudget | Set budget: 100, creditBudget: 150 | RECOMMENDED |
| 9 | levels.ts | levelK1_4 budget/creditBudget | Set budget: 130, creditBudget: 180 | RECOMMENDED |
| 10 | levels.ts | levelK1_5 budget/creditBudget | Set budget: 155, creditBudget: 205 | RECOMMENDED |
| 11 | levels.ts | levelK1_5.optimalPieces | Verify 8 vs 9 against engine | VERIFY |
| 12 | levels.ts | levelK1_1 scoringCategoriesVisible | Remove protocolPrecision | MINOR |

---

## QUALITY CHECKLIST SIGN-OFF

For each level, the following MUST be verified against the engine
before marking the level ready for implementation:

- [ ] Floor solve traced in engine — all pulses produce correct output
- [ ] Floor solve achievable with availablePieces only (no purchased pieces)
- [ ] Alternative solution exists (at least one non-floor-solve path)
- [ ] Tape tests both gate states (where applicable)
- [ ] Player who hardcodes from tape fails or scores below three stars
- [ ] Board remains solvable with 2 blown cells (Kepler requirement)
- [ ] Pre-placed pieces verified to never be last-touched on common failure paths
- [ ] Free-to-play guarantee: three stars reachable at zero extra credits
- [ ] All four CI quality gates pass after code changes

---

END OF kepler-belt-levels-v2-part1.md
