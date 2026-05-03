# SPEC: Kepler Belt Levels v2 — Part 2 (K1-6, K1-7, K1-8)
### Sprint 19 | April 2026

Requirements REQ-51 through REQ-75. RFC 2119 (MUST / SHOULD / MAY).
Arc Wheel terminology applies to all player-facing copy. "Tray" never appears.
See kepler-belt-levels-v2-part1.md for K1-1 through K1-5 conventions.

> Canonical Transmitter behavior (Model β): see REQ-T-1 through REQ-T-4 in
> kepler-belt-levels-v2-part1.md §CANONICAL TRANSMITTER BEHAVIOR. All
> Transmitter activations in K1-6 through K1-8 MUST be read under those clauses.

---

## CANONICAL REQUIREDPIECES ENFORCEMENT

These clauses define the normative enforcement model for `requiredPieces` in the
Kepler Belt spec set. When a `LevelDefinition` carries a non-empty `requiredPieces`
array, the engine MUST enforce it as defined below. See §ENGINE API CONTRACT for
the interface Dev MUST implement.

**Tucker authorization: 2026-04-30. Enforcement flavor: A3a — level runs, then
fails with a COGS-voiced rejection if required pieces were not engaged.**

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

**REQ-RP-5**: A `requiredPiecesNotEngaged` failure MUST consume the player's
run attempts in the same way a damage-based failure does. Tucker confirmed this
on 2026-05-01: 'It does consume a life. It\'s a failure of the level.' Credit
refund behavior aligns with damage-failure economics -- Dev verifies and aligns
in implementation.

### ENGINE API CONTRACT

Dev MUST implement the following interface. Pre-written tests in
`__tests__/unit/keplerRequiredPieces.test.ts` are written against this contract.

**Per-piece fired tracking**

The engine MUST track a `firedDuringRun` boolean for each placed piece, reset to
`false` at the start of a full machine run (all pulses). The flag is set to `true`
when the piece receives at least one activating signal during the run.

```typescript
interface PieceRunState {
  pieceId: string;
  firedDuringRun: boolean;
}
```

**Post-run evaluation hook**

```typescript
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

If `levelDef.requiredPieces` is undefined or empty, the function MUST return
`{ result: 'satisfied' }`. For each entry in `requiredPieces`: count placed
pieces of that type where `firedDuringRun === true`. If the engaged count is less
than `entry.count`, record the deficit. If any deficit exists, return
`{ result: 'requiredPiecesNotEngaged', missing: [...] }`.

**Fail-state routing**

The engine MUST route a `requiredPiecesNotEngaged` result into the existing
fail-state plumbing with fields:
- `failReason: 'requiredPiecesNotEngaged'`
- `missingPieces: Array<{ type: PieceType; required: number; engaged: number }>`

Applicable levels: K1-6 (REQ-51, REQ-RP-* cross-reference), K1-8 (REQ-68,
REQ-RP-* cross-reference).

---

## K1-6 — COLONIST HUB

> Transmitter behavior: see canonical clause REQ-T-* (Part 1 §CANONICAL TRANSMITTER BEHAVIOR).
> requiredPieces enforcement: see REQ-RP-1 through REQ-RP-5 (§CANONICAL REQUIREDPIECES ENFORCEMENT above).

### 1. Computational Goal

Output each input tape value faithfully. Machine stores the current pulse value in a Latch; a Splitter forks the signal into a gated path (Config Node, passes on stored value = 1) and a bypass path; a Merger reconverges both; Transmitter writes the trail value to the output tape.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept taught | Latch + Merger combined: stateful branching where a single stored value governs a gated path paired with a bypass |
| Prerequisites | Latch write/read (K1-3, K1-4); Merger OR-logic (K1-5); Splitter (K1-5, pre-placed there) |
| New piece | None |
| Difficulty band | abstract |

### 3. Board Layout

| Element | Value |
|---------|-------|
| Grid | 11 × 8 |
| Source | (1, 4) |
| Terminal | (9, 4) |
| Pre-placed | Source, Terminal only |

### 4. Available Pieces

| Piece | Count |
|-------|-------|
| Conveyor | 6 |
| Scanner | 1 |
| Latch | 1 |
| Splitter | 1 |
| Config Node | 1 |
| Merger | 1 |
| Transmitter | 1 |
| Gear | 2 |
| **Total** | **14** |

No changes to current availablePieces. REQ-51 adds a requiredPieces constraint only.

### 5. Floor Solve

Minimum piece count to 3-star: 11. Configuration: Scanner(2,4), Latch-write(3,4), Splitter(4,4), then two paths reconverging at Merger(7,4), then Transmitter(8,4).

| Step | Piece | Position | Role |
|------|-------|----------|------|
| 1 | Scanner | (2, 4) | Reads input tape, writes to Data Trail |
| 2 | Latch (write) | (3, 4) | Stores current signal value |
| 3 | Splitter | (4, 4) | Forks east (Path A) and south (Path B) |
| 4A | Config Node (configValue=1) | (5, 4) | Gates on Latch stored value; passes on 1, blocks on 0 |
| 4A | Conveyor | (6, 4) | Carries gated signal east to Merger |
| 4B | Conveyor | (4, 5) | Bypass path: south from Splitter |
| 4B | Conveyor | (5, 5) | Bypass continues east |
| 4B | Conveyor | (6, 5) | Bypass continues east |
| 4B | Gear | (7, 5) | Turns signal north to Merger |
| 5 | Merger | (7, 4) | Reconverges: Path A from west, Path B from south |
| 6 | Transmitter | (8, 4) | Reads Data Trail, writes to output tape |

**Piece budget:** 4 × Conveyor + 1 × Gear + Scanner + Latch + Splitter + Config Node + Merger + Transmitter = 11 of 14 available.

**Trail position note:** Config Node at (5,4) reads the Data Trail at the column where the relevant value was written. Engine must be verified: if the trail head advances per piece, the Config Node MUST be placed downstream of Scanner and Latch so the head has advanced to a populated cell. If the engine uses column-indexed trail reads, Config Node at col 5 must coincide with a column Scanner or Latch wrote. Implementer MUST verify this against the engine before finalising coordinates.

### 6. Input Tape / Expected Output

| Pulse | Input | Latch stores | Config Node (configValue=1) | Path taken | Trail read by Transmitter | Output |
|-------|-------|-------------|---------------------------|-----------|--------------------------|--------|
| 0 | 1 | 1 | trail=1 → PASS | A (gated) | 1 | **1** |
| 1 | 0 | 0 | trail=0 → BLOCK | B (bypass) | 0 | **0** |
| 2 | 1 | 1 | trail=1 → PASS | A (gated) | 1 | **1** |
| 3 | 1 | 1 | trail=1 → PASS | A (gated) | 1 | **1** |
| 4 | 0 | 0 | trail=0 → BLOCK | B (bypass) | 0 | **0** |
| 5 | 1 | 1 | trail=1 → PASS | A (gated) | 1 | **1** |

inputTape: `[1, 0, 1, 1, 0, 1]` — unchanged from current code.
expectedOutput: `[1, 0, 1, 1, 0, 1]` — unchanged from current code.

**Edge case:** Pulses 2-3 are consecutive 1s; pulses 1 and 4 are isolated 0s. A hardcoded always-pass machine produces [1,1,1,1,1,1], which fails on pulses 1 and 4. A simple Scanner→Transmitter bypass (no gating) produces correct output — see REQ-51 for the enforcement fix.

### 7. Data Trail

Size: 6 cells (one per pulse). `{ cells: [null,null,null,null,null,null], headPosition: 0 }` — unchanged from current code.

### 8. Scoring, Budget, Difficulty

| Field | Value |
|-------|-------|
| optimalPieces | 11 (was 7 — see REQ-52) |
| budget | 55 CR (unchanged) |
| Difficulty band | abstract |
| Scoring categories visible | efficiency, chainIntegrity, protocolPrecision, disciplineBonus |
| 3-star threshold | 80+ points |

### 9. COGS Line

> "The Colonist Hub coordinates resupply for thirty-one settlements. It is running on equipment that should have been replaced three cycles ago. The people depending on it do not have the option of waiting for something better."

**DO NOT MODIFY.**

### 10. Tutorial Steps

No new piece. Two instructor steps only.

| Step ID | Target | Eye | Message |
|---------|--------|-----|---------|
| `board-intro` | `boardGrid` | blue | "Colonist Hub. Thirty-one settlements route through this machine. The signal value changes on every pulse. The machine needs to remember what it just received and act on it. One stored value. Two paths. They have to converge before the result is written." |
| `board-resume` | `boardGrid` | blue | "Build the branch first. Place what stores, then what splits, then what gates. The bypass carries what the gate blocks. The Merger brings them back together. Transmitter goes last." |

Arc Wheel terminology: neither step references "tray." Permitted: "available pieces," "the wheel," or direct piece names.

### 11. Code Fixes Required

**REQ-51** (MUST): Add `requiredPieces: [{ type: 'splitter', count: 1 }, { type: 'merger', count: 1 }]` to `levelK1_6`. Enforcement semantics: see REQ-RP-1 through REQ-RP-5 (§CANONICAL REQUIREDPIECES ENFORCEMENT above). COGS failure-message slot: see §12 below. The current architecture is bypassable — a Scanner→Transmitter straight-line path produces correct output for every input=output tape. `requiredPieces` enforcement ensures the player builds the intended stateful-branching machine.

**REQ-52** (MUST): Update `optimalPieces` in `levelK1_6` from `7` to `11`.

**REQ-53** (MUST): Add or replace `tutorialSteps` in `levelK1_6` with the two-step sequence defined in section 10. Current code has no tutorial steps for this level.

**REQ-54** (MUST): Verify Data Trail column assignments in the engine match the floor solve above. Config Node at (5,4) MUST read a trail cell that was written by Scanner or Latch during this pulse. If column indexing is used, Scanner or Latch MUST be repositioned to col 5, or Config Node moved to col 3 (Latch's column). Exact coordinates are implementation-pending.

### 12. COGS Failure-Message Slot (PROPOSED)

Slot identity: `requiredPiecesNotEngagedDialogue`

Status: PROPOSED — copy is not yet authored. T-Bot will route a PROPOSED draft
through Tucker for sign-off after SE delivers this amendment. Do not write
actual copy here.

Constraints (for copy author):
- Per-level string. MUST reference the missing piece(s) by type name (Splitter,
  Merger).
- Voice: dry, witty, reluctantly impressed; never a cheerleader; uses
  "acceptable" the way other people use "extraordinary"; uses second person
  ("you" refers to The Engineer).
- No emojis. No exclamation points.
- Triggered post-run only. The player has already seen the machine run and fail
  — the line explains why.

---

## K1-7 — ORE PROCESSING

> Transmitter behavior: see canonical clause REQ-T-* (Part 1 §CANONICAL TRANSMITTER BEHAVIOR).
> Blocker 3 fix applied: coordinate collision at (7,6) resolved — see §5 Floor Solve below.

### 1. Computational Goal

Two independent signal paths share the board. Path A (primary) carries the signal from Source to Terminal via the Bridge cell in the north-south direction. Path B (monitoring loop) crosses the same Bridge cell in the east-west direction. Neither path is aware of the other.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept taught | Bridge: two independent paths sharing one cell without interference |
| Prerequisites | All prior Kepler concepts. Splitter (K1-5); path routing |
| New piece | Bridge (pre-placed; Codex collection fires on this level) |
| Difficulty band | derivable |

### 3. Board Layout

| Element | Value |
|---------|-------|
| Grid | 10 × 8 |
| Source | (1, 3) |
| Terminal | (8, 6) |
| Pre-placed | Source (1,3), Terminal (8,6), Splitter (4,3) ← **NEW**, Bridge (5,5) |

**REQ-59 note:** Splitter is added as a pre-placed piece at (4,3). Current code has no Splitter; without it Bridge's second crossing path has no signal source.

### 4. Available Pieces

| Piece | Count |
|-------|-------|
| Conveyor | 6 |
| Scanner | 1 |
| Transmitter | 1 |
| Gear | 3 |
| Config Node | 1 |
| **Total** | **12** |

Splitter is removed from availablePieces (it is now pre-placed). All other pieces unchanged.

### 5. Floor Solve

Minimum piece count to 3-star: 8 (Path A only). Full demonstration uses 11 (Paths A + B).

**Path A — primary, north-south through Bridge (reaches Terminal):**

| Step | Piece | Position | Role |
|------|-------|----------|------|
| 1 | Scanner | (2, 3) | Reads input tape, writes to Data Trail |
| 2 | Conveyor | (3, 3) | Carries signal east to Splitter |
| 3 | — | Splitter (4,3) pre-placed | Forks: east arm → Path A; south arm → Path B |
| 4A | Gear | (5, 3) | Turns signal south (enters from west, exits south) |
| 5A | Conveyor | (5, 4) | Carries signal south toward Bridge |
| 6A | — | Bridge (5,5) pre-placed | Path A enters from north, exits south |
| 7A | Conveyor | (5, 6) | Carries signal south away from Bridge |
| 8A | Gear | (6, 6) | Turns signal east (enters from north, exits east) |
| 9A | Transmitter | (7, 6) | Reads Data Trail, writes to output tape |

Transmitter at (7,6) exits east to Terminal (8,6). Coordinate collision
resolved (Blocker 3, Tucker authorization 2026-04-30): the redundant Conveyor
that previously occupied (7,6) alongside the Transmitter has been removed.
Terminal remains at (8,6). No board width adjustment required.

**Path B — monitoring loop, east-west through Bridge:**

| Step | Piece | Position | Role |
|------|-------|----------|------|
| 1B | Conveyor | (4, 4) | South arm of Splitter continues south |
| 2B | Gear | (4, 5) | Turns signal east (enters from north, exits east) |
| 3B | — | Bridge (5,5) pre-placed | Path B enters from west, exits east |
| 4B | Conveyor | (6, 5) | Path B continues east; terminates (dead end) |

**Piece budget (full demonstration):**
Scanner + 3 × Conveyor + 2 × Gear (Path A) + 2 × Conveyor + 1 × Gear (Path B) + Transmitter = Scanner + 5 × Conveyor + 3 × Gear + Transmitter = 10 of 12 available. Config Node unused (available for alternate builds).

**Piece budget (floor solve, Path A only):**
Scanner + Conveyor(3,3) + Gear(5,3) + Conveyor(5,4) + Conveyor(5,6) + Gear(6,6) + Transmitter = 7 pieces.

Note: collision Conveyor at (7,6) removed (Blocker 3 fix). Floor solve is now 7 tray pieces, not 8.

**Bridge crossing verification:**
- Path A: enters Bridge (5,5) from cell (5,4) [north face], exits to cell (5,6) [south face] — north-south direction.
- Path B: enters Bridge (5,5) from cell (4,5) via Gear(4,5) east exit [west face], exits to cell (6,5) [east face] — east-west direction.
- Both directions active simultaneously on each pulse. Neither signal is rerouted by the other. ✓

**Dead-end handling:** Path B signal reaches Conveyor(6,5) with no onward piece — it voids at (6,5). The engine MUST NOT void the entire machine when one Splitter arm terminates without reaching Terminal. Only Path A must produce correct output. Implementer MUST verify engine behaviour for split-arm void before finalising this design.

### 6. Input Tape / Expected Output

| Pulse | Input | Scanner writes | Path A active | Transmitter writes | Output |
|-------|-------|---------------|---------------|-------------------|--------|
| 0 | 1 | trail = 1 | yes | 1 | **1** |
| 1 | 0 | trail = 0 | yes | 0 | **0** |
| 2 | 1 | trail = 1 | yes | 1 | **1** |
| 3 | 1 | trail = 1 | yes | 1 | **1** |

inputTape: `[1, 0, 1, 1]` — unchanged.
expectedOutput: `[1, 0, 1, 1]` — unchanged.

Path A carries all pulses regardless of value — this is a pass-through. Edge case: pulse 1 (input=0) confirms Scanner writes 0 correctly and Transmitter reads 0.

### 7. Data Trail

Size: 4 cells. `{ cells: [null,null,null,null], headPosition: 0 }` — unchanged.

### 8. Scoring, Budget, Difficulty

| Field | Value |
|-------|-------|
| optimalPieces | 7 (Path A floor solve; updated from 8 — Blocker 3 fix removes collision Conveyor at (7,6)) |
| budget | 55 CR (unchanged) |
| Difficulty band | derivable |
| Scoring categories visible | efficiency, chainIntegrity, protocolPrecision, disciplineBonus |

### 9. COGS Line

> "The ore processing relay is still active. There is no active mining in this corridor. Something is still transmitting on the processing frequency. I have not identified the source. It is not relevant to the current objective."

**DO NOT MODIFY.**

### 10. Tutorial Steps

Introduces Bridge (pre-placed; collector step targets boardGrid). Four steps.

| Step ID | Target | Eye | Message |
|---------|--------|-----|---------|
| `board-intro` | `boardGrid` | blue | "Two signals on this board. Both need to reach their destination. The board does not have room for both to go around each other. Something in the available pieces solves this without the signals being aware of it." |
| `bridge-collect` | `boardGrid` | amber | "Two paths. One cell. Neither interferes. I have been waiting for something like this to catalog." *(codexEntryId: bridge)* |
| *(Codex opens automatically)* | — | — | — |
| `board-resume` | `boardGrid` | blue | "As I was saying. The Bridge allows two independent paths to share one cell. Neither signal is aware of the other. Both are correct. Place it where the paths cross." |

**Existing message fix:** Current `board-intro` reads "Something in the tray solves this…" — MUST be updated to "Something in the available pieces solves this…" per Arc Wheel rename.

### 11. Code Fixes Required

**REQ-59** (MUST): Add `prePlaced('splitter', 4, 3)` to `levelK1_7.prePlacedPieces`. Without a Splitter, there is no second signal source and Bridge cannot demonstrate two independent crossing paths.

**REQ-60** (MUST): Do not add `splitter` to `levelK1_7.availablePieces` — it is now pre-placed. All other availablePieces unchanged.

**REQ-61** (MUST): Update `levelK1_7.tutorialSteps[0].message` (board-intro) to remove "tray" reference. Use text from section 10.

**REQ-62** (MUST): Verify engine dead-end behaviour: when a Splitter produces two signal arms and one arm voids (no Terminal reached), the machine MUST NOT be classified as void if the other arm produces correct output. If engine currently voids on any dead-end arm, add a terminating Gear at (6,5) in the floor solve (pointing into an unreachable cell) and document that this is intentional.

**REQ-63** (RESOLVED): Transmitter occupies (7,6); Terminal occupies (8,6). Adjacency is confirmed on a 10-wide grid. No board width adjustment required. The dagger conditional note has been removed.

---

## K1-8 — TRANSIT GATE

> Transmitter behavior: see canonical clause REQ-T-* (Part 1 §CANONICAL TRANSMITTER BEHAVIOR).
> requiredPieces enforcement: see REQ-RP-1 through REQ-RP-5 (§CANONICAL REQUIREDPIECES ENFORCEMENT above).

### 1. Computational Goal

Output each input tape value faithfully using a machine that combines Bridge crossing with Latch-based gating in a single architecture. Latch stores each pulse value; Splitter forks the signal; Path A bypasses the gate (crosses Bridge north-south); Path B is gated by Config Node (crosses Bridge east-west); Merger reconverges; Transmitter writes the result.

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| Concept taught | Bridge + Latch integration: crossing paths and state maintenance in one machine |
| Prerequisites | Bridge (K1-7); Latch as dynamic per-pulse memory (K1-4, K1-6); Splitter + Merger (K1-5) |
| New piece | None |
| Difficulty band | abstract |

### 3. Board Layout

| Element | Value |
|---------|-------|
| Grid | 11 × 8 |
| Source | (1, 4) |
| Terminal | (9, 4) |
| Pre-placed | Source (1,4), Terminal (9,4) only |

### 4. Available Pieces

| Piece | Count |
|-------|-------|
| Conveyor | 6 |
| Scanner | 1 |
| Latch | 1 |
| Bridge | 1 |
| Config Node | 1 |
| Transmitter | 1 |
| Gear | 3 |
| Merger | 1 |
| Splitter | 1 ← **NEW** |
| **Total** | **16** |

**REQ-67 note:** Splitter added to `availablePieces`. Current code has no Splitter; without it Bridge has no second path source.

### 5. Floor Solve

Minimum piece count to 3-star: 12.

| Step | Piece | Position | Role |
|------|-------|----------|------|
| 1 | Scanner | (2, 4) | Reads input tape, writes to Data Trail |
| 2 | Latch (write) | (3, 4) | Stores current signal value per pulse |
| 3 | Splitter | (4, 4) | Forks: north arm → Path A; east arm → Path B |
| 4A | Gear | (4, 3) | Turns signal east (enters from south, exits east) |
| 5A | Conveyor | (5, 3) | Carries Path A east toward Bridge |
| 6A | Gear | (6, 3) | Turns signal south (enters from west, exits south) |
| 7A | Bridge | (6, 4) | Path A enters from north (N-S), exits south |
| 8A | Conveyor | (6, 5) | Carries Path A south away from Bridge |
| 9A | Gear | (7, 5) | Turns signal north (enters from west, exits north) |
| 4B | Config Node (configValue=1) | (5, 4) | Gates on Latch stored value: passes on 1, blocks on 0 |
| 5B | Bridge | (6, 4) shared | Path B enters from west (E-W), exits east |
| 10 | Merger | (7, 4) | Path A from south; Path B from west |
| 11 | Transmitter | (8, 4) | Reads Data Trail, writes to output tape |

**Bridge crossing verification:**
- Path A: enters Bridge (6,4) from cell (6,3) [north face, going south]. Exits to (6,5). ✓
- Path B: enters Bridge (6,4) from cell (5,4) [west face, going east — Config Node exit]. Exits to Merger (7,4). ✓
- Both paths share (6,4) without interference. ✓

**Merger inputs:**
- Path A: Conveyor(6,5) → Gear(7,5) exits north to Merger(7,4) south face. ✓
- Path B: Bridge(6,4) exits east to Merger(7,4) west face. ✓

**Piece budget:** Scanner + Latch + Splitter + 3×Gear + 2×Conveyor + Bridge + Config Node + Merger + Transmitter = 12 of 16 available. (4 Conveyors unused; available for alternate builds.)

### 6. Input Tape / Expected Output

| Pulse | Input | Latch stores | Config Node (configValue=1) | Path taken | Trail read by Transmitter | Output |
|-------|-------|-------------|---------------------------|-----------|--------------------------|--------|
| 0 | 1 | 1 | trail=1 → PASS | B (gated) + A (bypass) | 1 | **1** |
| 1 | 1 | 1 | trail=1 → PASS | B + A | 1 | **1** |
| 2 | 0 | 0 | trail=0 → BLOCK | A (bypass only) | 0 | **0** |
| 3 | 1 | 1 | trail=1 → PASS | B + A | 1 | **1** |
| 4 | 0 | 0 | trail=0 → BLOCK | A (bypass only) | 0 | **0** |
| 5 | 0 | 0 | trail=0 → BLOCK | A (bypass only) | 0 | **0** |
| 6 | 1 | 1 | trail=1 → PASS | B + A | 1 | **1** |
| 7 | 1 | 1 | trail=1 → PASS | B + A | 1 | **1** |

inputTape: `[1, 1, 0, 1, 0, 0, 1, 1]` — unchanged.
expectedOutput: `[1, 1, 0, 1, 0, 0, 1, 1]` — unchanged.

**Edge cases:** Pulses 4-5 are consecutive 0s; pulses 0-1 and 6-7 are consecutive 1s. A hardcoded always-pass machine fails on pulses 2, 4, 5. A Scanner→Transmitter bypass with no gating produces correct output — see REQ-68 for enforcement fix.

### 7. Data Trail

Size: 8 cells. `{ cells: [null,null,null,null,null,null,null,null], headPosition: 0 }` — unchanged.

### 8. Scoring, Budget, Difficulty

| Field | Value |
|-------|-------|
| optimalPieces | 12 (was 7 — see REQ-69) |
| budget | 60 CR (unchanged) |
| Difficulty band | abstract |
| Scoring categories visible | efficiency, chainIntegrity, protocolPrecision, disciplineBonus, speedBonus |

### 9. COGS Line

> "The transit gate regulates traffic flow through the entire corridor. It has not been updated since the mining operations closed. It is routing ghost traffic from ships that no longer exist. I find that inefficient and something else I will not specify."

**DO NOT MODIFY.**

### 10. Tutorial Steps

No new piece. Two instructor steps. Currently no tutorial steps exist for K1-8 — MUST be added.

| Step ID | Target | Eye | Message |
|---------|--------|-----|---------|
| `board-intro` | `boardGrid` | blue | "Transit Gate. The board carries a signal that must cross itself. The crossing requires a piece from the last mission. The Latch stores what the current pulse brought. The Bridge allows what would otherwise be a conflict. These are not new concepts. This is what they look like together." |
| `board-resume` | `boardGrid` | blue | "Build the Latch architecture first. It determines what the gate reads. Route the Bridge crossing around it. The transit gate has been routing ghost traffic for three years. The Engineer is correcting that now." |

Arc Wheel terminology: neither step references "tray." The second step references "the Engineer" (correct, not "you").

### 11. Consequence Config

| Field | Current value | Status |
|-------|--------------|--------|
| `cogsWarning` | "This mission matters more than most. That is all." | **DO NOT MODIFY** |
| `failureEffect` | "Transit gate failure. All corridor traffic suspended for seventy-two hours. The transit authority has escalated the negligence inquiry." | **DO NOT MODIFY** |
| `requireThreeStars` | not set (undefined) | Correct — K1-8 is a mid-sector consequence, not boss. Leave unset. |

Per Level Design Framework (PART 5 — KEPLER BELT): consequence levels K1-4, K1-8, K1-10 trigger both a blown cell AND ship damage on void result. The blown cell + piece destruction is handled by the gameplay engine on any void. The ship damage (narrative consequence) MUST be wired via a `NarrativeConsequence` entry in the consequence system, not the `levelK1_8.consequence` object.

**REQ-75:** Verify a `NarrativeConsequence` record exists with `triggerLevelId: 'K1-8'`, `triggerCondition: 'fail'`, and at least one `mechanicalEffect` of type `damage_system`. If no such record exists, create one. Confirm the consequence fires: blown cell on the piece where signal stopped, plus ship damage.

### 12. Code Fixes Required

**REQ-67** (MUST): Add `'splitter'` to `levelK1_8.availablePieces`. Without Splitter there is no mechanism to produce two independent signal paths and the Bridge cannot demonstrate crossing.

**REQ-68** (MUST): Add `requiredPieces: [{ type: 'bridge', count: 1 }, { type: 'latch', count: 1 }, { type: 'splitter', count: 1 }, { type: 'merger', count: 1 }]` to `levelK1_8`. Enforcement semantics: see REQ-RP-1 through REQ-RP-5 (§CANONICAL REQUIREDPIECES ENFORCEMENT above). COGS failure-message slot: see §13 below. The tape satisfies output = input, making direct Scanner→Transmitter bypass architecturally valid. `requiredPieces` forces the intended integrated machine.

**REQ-69** (MUST): Update `optimalPieces` in `levelK1_8` from `7` to `12`.

**REQ-70** (MUST): Add `tutorialSteps` to `levelK1_8` with the two-step sequence from section 10.

**REQ-71** (MUST): Verify engine Trail position semantics (same concern as K1-6 REQ-54). Latch at (3,4) MUST write to a trail cell that Config Node at (5,4) can read on the same pulse. If column-indexed, Latch at col 3 and Config Node at col 5 read different cells. Either co-locate Latch and Config Node at the same column on different rows, or confirm the engine uses a different addressing scheme. Floor solve coordinates are preliminary pending this verification.

**REQ-72** (MUST): Verify `NarrativeConsequence` entry per REQ-75.

**REQ-73** (SHOULD): Confirm `eyeState: 'blue'` on `levelK1_8`. Current code is correct; confirm no change needed.

**REQ-74** (SHOULD): Because K1-8 is a consequence level, the board MUST have slack: the floor solve MUST NOT fill every viable path. With 16 available pieces and 12 used in the floor solve, 4 Conveyors remain unused. Verify that on the 11×8 grid at least 2 additional non-floor-solve cells exist per viable routing path so one blown cell does not create a softlock.

### 13. COGS Failure-Message Slot (PROPOSED)

Slot identity: `requiredPiecesNotEngagedDialogue`

Status: PROPOSED — copy is not yet authored. T-Bot will route a PROPOSED draft
through Tucker for sign-off after SE delivers this amendment. Do not write
actual copy here.

Constraints (for copy author):
- Per-level string. MUST reference the missing piece(s) by type name (Bridge,
  Latch, Splitter, Merger). Because K1-8 has four required pieces, the line MUST
  enumerate at minimum the most computationally significant missing type(s) — not
  a generic "pieces are missing" rejection.
- Voice: dry, witty, reluctantly impressed; never a cheerleader; uses
  "acceptable" the way other people use "extraordinary"; uses second person
  ("you" refers to The Engineer).
- No emojis. No exclamation points.
- Triggered post-run only. Consequence context: The Engineer has failed a
  consequence level — the tone MUST reflect that weight without editorializing.

---

## Cross-Level Code Fix Summary

| REQ | Level | File | Change |
|-----|-------|------|--------|
| REQ-51 | K1-6 | levels.ts | Add `requiredPieces` (splitter×1, merger×1) |
| REQ-52 | K1-6 | levels.ts | `optimalPieces` 7 → 11 |
| REQ-53 | K1-6 | levels.ts | Add `tutorialSteps` (2 steps) |
| REQ-54 | K1-6 | levels.ts + engine | Verify Data Trail column assignment for Config Node |
| REQ-59 | K1-7 | levels.ts | Add `prePlaced('splitter', 4, 3)` to prePlacedPieces |
| REQ-60 | K1-7 | levels.ts | Remove splitter from availablePieces if present; no other change |
| REQ-61 | K1-7 | levels.ts | Update board-intro message (remove "tray") |
| REQ-62 | K1-7 | engine | Verify split-arm-void behaviour |
| REQ-63 | K1-7 | levels.ts | Shift Terminal/Transmitter if adjacency fix needed |
| REQ-67 | K1-8 | levels.ts | Add `'splitter'` to availablePieces |
| REQ-68 | K1-8 | levels.ts | Add `requiredPieces` (bridge×1, latch×1, splitter×1, merger×1) |
| REQ-69 | K1-8 | levels.ts | `optimalPieces` 7 → 12 |
| REQ-70 | K1-8 | levels.ts | Add `tutorialSteps` (2 steps) |
| REQ-71 | K1-8 | levels.ts + engine | Verify Data Trail column assignment for Latch → Config Node |
| REQ-72 | K1-8 | consequence system | Verify/create NarrativeConsequence for K1-8 |
| REQ-73 | K1-8 | levels.ts | Confirm eyeState: 'blue' |
| REQ-74 | K1-8 | levels.ts | Verify board slack (≥2 free cells per path after floor solve) |
| REQ-75 | K1-8 | consequence system | NarrativeConsequence triggers blown cell + ship damage on void |

| REQ-RP-1–5 | K1-6, K1-8 | engine | Implement `evaluateRequiredPieces` per ENGINE API CONTRACT (§CANONICAL REQUIREDPIECES ENFORCEMENT) |
| Blocker 3 | K1-7 | levels.ts | Remove collision Conveyor at (7,6); `optimalPieces` 8 → 7 |
| Blocker 3 | K1-7 | levels.ts | Remove conditional dagger note on Transmitter/Terminal adjacency |

---

END OF kepler-belt-levels-v2-part2.md
