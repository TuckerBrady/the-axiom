# SPEC: Signal Engine State Machine

**ID:** SE-SIG  
**Author:** THEOREM (Systems Engineering)  
**Status:** DRAFT  
**Date:** 2026-05-10  
**Depends on:** docs/COMPUTATIONAL_MODEL.md, docs/TRIBAL_KNOWLEDGE.md  
**Depended on by:** SPEC_BEAM_ANIMATION.md (SE-BEAM)

---

## 1. Purpose

This spec defines the signal engine — the pure-logic computation layer that determines what happens when a machine runs. The engine produces no visual output. It computes an ordered execution trace that the beam animation system (SE-BEAM) consumes and renders.

The engine is the single source of truth for machine correctness. If the engine says a machine passes, it passes. If it says void, void. The animation is a faithful rendering of what the engine already decided.

---

## 2. Pulse Lifecycle

### SE-SIG-001 — Pulse Definition

A pulse is one discrete unit of machine execution. The Source emits one pulse per input tape value. Each pulse carries a signal value (the current input tape value at the head position, or `null` if no input tape is present).

### SE-SIG-002 — Pulse Emission

The Source MUST emit exactly one pulse per execution step. Each pulse begins at the Source cell and terminates when all signal paths originating from that pulse reach either a Terminal, a dead-end, or an error condition.

### SE-SIG-003 — Pulse Value

A pulse carries a value of type `number | null`. The value is determined at emission time:

- If an Input Tape exists and a Scanner is present in the machine, the Scanner reads the current head position and writes to the Data Trail. The pulse value is the signal value propagating through the path.
- If no Input Tape exists, the pulse value is `null`.
- The pulse value MAY be transformed by Protocol pieces during traversal (Inverter flips 0/1).

### SE-SIG-004 — Pulse Completion

A pulse is complete when ALL active signal paths spawned by that pulse have terminated. A path terminates by reaching Terminal (success), reaching a dead-end (error), or being blocked by a gate (Config Node condition fails, Counter threshold not met).

---

## 3. Three-Layer Interaction Model

### SE-SIG-010 — Signal Path (Layer 1)

The Signal Path is the physical routing graph. Physics pieces define edges. The engine traverses this graph step by step, cell by cell.

Signal Path rules:

- Signal enters a cell from a specific direction.
- The piece in that cell determines where signal exits (one or more directions).
- If no piece occupies a cell the signal is routed to, that path is a dead-end.
- The Signal Path is stateless — it routes identically regardless of pulse number.

### SE-SIG-011 — Data Trail (Layer 2)

The Data Trail is persistent working memory. It is an array of cells, one per board column (or per relevant position, implementation-defined). Each cell holds a value of type `number | null`.

Data Trail rules:

- All cells MUST initialize as `null` at machine-run start. NOT `0`.
- Values written to the Data Trail persist across pulses within a single run.
- The Data Trail resets to all `null` on machine reset (new run).
- Only Protocol pieces interact with the Data Trail (read or write).
- The Data Trail is NOT the Input Tape. The Data Trail is NOT the Output Tape.

### SE-SIG-012 — Tape System (Layer 3)

The Tape System provides external I/O.

**Input Tape:**

- A read-only sequence of values fed into the machine.
- One value consumed per pulse (head advances after each pulse).
- Only the Scanner piece reads from the Input Tape.

**Output Tape:**

- A write-only sequence of values the machine produces.
- Only the Transmitter piece writes to the Output Tape.
- Transmitter writes the signal VALUE at the current output head position, not merely a presence flag. Writing `0` is a valid write.
- After all pulses complete, Output Tape is compared against `expectedOutput` for correctness.

**Trail Tape (Data Trail):**

- Covered by SE-SIG-011. Purchasable infrastructure per level.

### SE-SIG-013 — Layer Interaction Sequence (Single Pulse)

For each pulse, the engine MUST execute in this order:

1. Head position determined (Input Tape head, Output Tape head, Data Trail head — all advance per pulse unless Navigator overrides).
2. Source emits pulse. Signal value established.
3. Signal propagates step-by-step through the Signal Path.
4. At each cell, if the piece is a Protocol piece, its Data Trail / Tape interaction executes synchronously before signal exits the cell.
5. When signal reaches a Transmitter, the Transmitter writes to Output Tape.
6. When all paths terminate, the pulse is complete.
7. Heads advance. Next pulse begins (if input remains).

---

## 4. Piece Routing Rules

### SE-SIG-020 — Physics Piece Routing

All Physics pieces route signal based on entry direction and piece-specific rules. Physics pieces do NOT interact with the Data Trail or Tape System.

| Piece | Inputs | Outputs | Behavior |
|-------|--------|---------|----------|
| Conveyor | 1 (back) | 1 (front) | Straight-through in orientation direction. Only piece that rotates on tap. |
| Gear | 1 (any) | 1 (perpendicular) | Changes signal direction 90 degrees. The only Physics piece that turns corners. Omnidirectional entry. |
| Splitter | 1 (back) | 2 (left + right, or front + one side) | Forks signal into two simultaneous paths. Signal is COPIED, not divided. |
| Merger | 2 (any two sides) | 1 (remaining side) | Accepts signal from either input. OR logic. Either is sufficient. |
| Bridge | 2 (opposing pairs) | 2 (opposing pairs) | Two independent paths cross one cell. No interaction between paths. |
| Relay | 1 (back) | 1 (front) | One-pulse delay. Receives on pulse N, outputs on pulse N+1. |
| Threshold Relay | 2 (any two sides) | 1 (remaining side) | Either input triggers output. OR-gated with one-pulse delay. |
| Amplifier | 1 (back) | 1 (front, extended range) | Signal jumps across non-adjacent cells. |
| Junction | 1 (any) | 1 (continues arrival direction) | Four-way intersection. Passes through unless redirected by adjacent Gear. |
| Sequencer | 1 (back) | N (multiple, ordered) | Fires outputs in defined sequential order, not simultaneously. |

### SE-SIG-021 — Protocol Piece Routing

All Protocol pieces MUST route signal straight-through only: enter from one side, exit from the opposite side. Only Gears change direction. Protocol pieces have side effects (Data Trail reads/writes, Tape interactions) but their routing is always linear pass-through.

| Piece | Side Effect | Routing |
|-------|-------------|---------|
| Config Node | Reads Data Trail at its position. Gates signal: passes if trail value matches `configValue`, blocks otherwise. | Straight-through (if pass) or BLOCKED (if fail). |
| Scanner | Reads Input Tape at current head position. Writes that value to Data Trail at its board position. | Straight-through always. Side effect executes regardless. |
| Transmitter | Writes current signal value to Output Tape at current output head position. | Straight-through always. Side effect executes regardless. |
| Inverter | Flips pulse bit value: 0 becomes 1, 1 becomes 0. | Straight-through always. Signal value is transformed. |
| Counter | Increments internal count. If count reaches threshold N, passes signal and resets. Otherwise blocks. | Straight-through (if threshold met) or BLOCKED. |
| Latch | WRITE mode: captures incoming signal value. READ mode: outputs stored value. | Straight-through always. |
| Capacitor | Snapshots Data Trail value at its position when signal passes. Holds snapshot immutably. | Straight-through always. |
| Divergence Gate | Passes signal when exactly one input is active (XOR). | Straight-through (if XOR condition met) or BLOCKED. |
| Confluence Node | Requires simultaneous signal from two inputs (AND). | Output (if AND condition met) or BLOCKED. |

### SE-SIG-022 — Source Auto-Orientation

The Source piece MUST trigger auto-orientation of adjacent connected pieces when placed or when the machine starts. No other piece triggers auto-orientation.

### SE-SIG-023 — Config Node Reads Data Trail

The Config Node MUST read from the Data Trail at its board position. It MUST NOT read from the Input Tape. This is a historical correction (Prompt 55) and is non-negotiable.

### SE-SIG-024 — Scanner Writes to Data Trail

The Scanner MUST read the current Input Tape value and write it to the Data Trail at its board position. The Scanner bridges Layer 3 (Input Tape) into Layer 2 (Data Trail).

### SE-SIG-025 — Transmitter Writes Signal Value

The Transmitter MUST write the current signal VALUE to the Output Tape. This includes writing `0`. The Transmitter is NOT a presence sensor — it records what value the signal carries, not that a signal arrived.

---

## 5. Multi-Path Resolution

### SE-SIG-030 — Splitter Creates Parallel Paths

When a Splitter forks signal into two paths, the engine MUST create two independent execution branches. Both branches carry the same signal value (copy, not divide).

### SE-SIG-031 — Execution Order for Parallel Paths

Parallel paths MUST execute in deterministic order. The engine MUST define a stable ordering rule: paths are executed LEFT-before-RIGHT (relative to signal entry direction), then TOP-before-BOTTOM for vertical splits. This ordering MUST be consistent across runs with identical machine configurations.

### SE-SIG-032 — Path Reconvergence at Merger

When two paths reconverge at a Merger, the Merger fires on the FIRST signal to arrive. The second signal arriving at an already-fired Merger is consumed (no-op). The Merger does NOT wait for both paths.

### SE-SIG-033 — Dead-End Paths

A path that reaches a cell with no valid exit (empty cell, edge of board, blocked gate) terminates as a dead-end. Dead-ends do NOT cause machine failure if at least one path reaches Terminal successfully. Dead-ends are recorded in the execution trace for diagnostic purposes.

### SE-SIG-034 — All Paths Dead-End

If ALL paths from a pulse terminate as dead-ends (no path reaches Terminal), the engine MUST record a DEAD_END error for that pulse. The machine may continue subsequent pulses (Relay-buffered signals), but the pulse itself is marked as failed.

---

## 6. State Machine

### SE-SIG-040 — Engine States

The engine MUST implement exactly these states:

| State | Description |
|-------|-------------|
| IDLE | Machine loaded, no execution in progress. Initial state. |
| RUNNING | Pulses are being executed sequentially. |
| COMPLETE | All pulses executed. Output tape populated. Ready for comparison. |
| ERROR | Unrecoverable error detected (infinite loop, malformed machine). |

### SE-SIG-041 — State Transitions

```
IDLE ──[run()]──> RUNNING
RUNNING ──[all pulses complete]──> COMPLETE
RUNNING ──[unrecoverable error]──> ERROR
COMPLETE ──[reset()]──> IDLE
ERROR ──[reset()]──> IDLE
```

### SE-SIG-042 — Run Trigger

Transition from IDLE to RUNNING MUST occur only on explicit invocation (user presses Engage). The engine MUST NOT auto-run.

### SE-SIG-043 — Cleanup on Transition to IDLE

When transitioning to IDLE (from COMPLETE or ERROR via reset), the engine MUST:

- Clear the execution trace.
- Reset Data Trail to all `null`.
- Reset Input Tape head to position 0.
- Reset Output Tape head to position 0.
- Reset all stateful piece internals (Counter counts, Latch values, Relay buffers).
- Clear all error records.

### SE-SIG-044 — No PAUSED State

The engine does NOT implement a PAUSED state. The beam animation system may pause its rendering, but the engine computes the full trace synchronously once invoked. The engine runs to completion or error in a single synchronous pass.

---

## 7. Error States

### SE-SIG-050 — Dead-End Error

Condition: A signal path has no valid next cell (no piece, board edge, or piece with no valid exit for the entry direction).  
Severity: Per-path warning. Machine continues if other paths succeed.  
Trace record: `{ type: 'DEAD_END', cell: [row, col], pulse: N, direction: Direction }`

### SE-SIG-051 — Infinite Loop Detection

Condition: A signal visits the same cell from the same direction more than once within a single pulse.  
Severity: Unrecoverable. Engine transitions to ERROR.  
Trace record: `{ type: 'INFINITE_LOOP', cell: [row, col], pulse: N, visitCount: number }`  
Detection method: The engine MUST maintain a visited set per pulse keyed on `[row, col, entryDirection]`. If a cell+direction combination is visited twice, loop is detected.

### SE-SIG-052 — Missing Tape Cell

Condition: Scanner attempts to read Input Tape beyond its length. Transmitter attempts to write Output Tape beyond its length.  
Severity: Per-operation warning. Signal continues. Write/read produces `null`.  
Trace record: `{ type: 'TAPE_OVERFLOW', piece: PieceType, cell: [row, col], pulse: N, tapeType: 'INPUT' | 'OUTPUT' }`

### SE-SIG-053 — Type Mismatch

Condition: A piece receives a signal value it cannot process (implementation-defined edge cases).  
Severity: Per-operation warning. Piece passes signal through unmodified.  
Trace record: `{ type: 'TYPE_MISMATCH', piece: PieceType, cell: [row, col], pulse: N, expected: string, received: string }`

---

## 8. Engine Output Format (Interface Contract with SE-BEAM)

### SE-SIG-060 — Execution Trace Structure

The engine MUST produce an `ExecutionTrace` as its primary output. This is the contract between the signal engine and the beam animation system.

```typescript
interface ExecutionTrace {
  pulses: PulseTrace[];
  finalState: 'COMPLETE' | 'ERROR';
  outputTape: (number | null)[];
  errors: EngineError[];
}

interface PulseTrace {
  pulseIndex: number;
  inputValue: number | null;
  steps: ExecutionStep[];
  result: 'SUCCESS' | 'PARTIAL' | 'DEAD_END';
}

interface ExecutionStep {
  stepIndex: number;
  cell: [number, number];           // [row, col]
  piece: PieceType;
  action: StepAction;
  signalValue: number | null;       // value AFTER this step
  entryDirection: Direction;
  exitDirections: Direction[];       // may be multiple (Splitter)
  sideEffect: SideEffect | null;    // Data Trail / Tape interaction
  pathId: string;                    // unique per fork path
  category: 'physics' | 'protocol'; // determines beam color
}

type StepAction =
  | 'ROUTE'           // signal passed through (Conveyor, Gear, Junction)
  | 'SPLIT'           // signal forked into multiple paths (Splitter)
  | 'MERGE'           // signal arrived at Merger
  | 'BUFFER'          // signal stored for next pulse (Relay)
  | 'GATE_PASS'       // conditional gate opened (Config Node, Counter)
  | 'GATE_BLOCK'      // conditional gate closed
  | 'READ_TAPE'       // Scanner read from Input Tape
  | 'WRITE_TAPE'      // Transmitter wrote to Output Tape
  | 'TRANSFORM'       // value modified (Inverter)
  | 'STORE'           // value stored (Latch write, Capacitor snapshot)
  | 'RECALL'          // value retrieved (Latch read)
  | 'TERMINATE'       // signal reached Terminal
  | 'DEAD_END'        // signal had nowhere to go
  | 'AMPLIFY'         // signal jumped cells (Amplifier)
  | 'SEQUENCE_FIRE'   // Sequencer fired one output

interface SideEffect {
  type: 'TRAIL_WRITE' | 'TRAIL_READ' | 'TAPE_READ' | 'TAPE_WRITE' | 'SNAPSHOT';
  trailIndex?: number;
  tapeIndex?: number;
  valueBefore: number | null;
  valueAfter: number | null;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface EngineError {
  type: 'DEAD_END' | 'INFINITE_LOOP' | 'TAPE_OVERFLOW' | 'TYPE_MISMATCH';
  cell: [number, number];
  pulse: number;
  detail: string;
}
```

### SE-SIG-061 — Step Ordering

Steps within a `PulseTrace` MUST be ordered in the exact sequence the engine evaluated them. For parallel paths (post-Splitter), steps interleave according to the deterministic ordering defined in SE-SIG-031. The `pathId` field distinguishes which fork a step belongs to.

### SE-SIG-062 — Path Identification

Each path begins with `pathId: 'main'`. When a Splitter creates a fork, the engine MUST assign unique path IDs to each branch (e.g., `'main.L'`, `'main.R'`). Nested splits produce nested IDs (e.g., `'main.L.R'`). The beam animation uses `pathId` to coordinate multi-path rendering.

### SE-SIG-063 — Category Field

Every `ExecutionStep` MUST include a `category` field: `'physics'` for Physics pieces, `'protocol'` for Protocol pieces. This determines the beam color used by the animation system (amber for physics, blue for protocol).

### SE-SIG-064 — Synchronous Computation

The engine MUST compute the entire `ExecutionTrace` synchronously. It does NOT yield, await, or emit partial results. The beam animation system receives the complete trace and renders it at its own pace.

---

## 9. Pre-Written Tests

All tests reference the requirement ID they validate. Tests are specified as behavior descriptions with inputs and expected outputs. Implementation uses Jest.

### TEST-SIG-001 — Linear Conveyor Chain (validates SE-SIG-001, SE-SIG-002, SE-SIG-020)

**Setup:** Source -> Conveyor -> Conveyor -> Conveyor -> Terminal. Input tape: [1].  
**Expected:** Engine produces 1 pulse with 5 steps (Source, C, C, C, Terminal). All steps have action ROUTE except Terminal (TERMINATE). Final state COMPLETE. Output: step sequence matches cell positions in order.

### TEST-SIG-002 — Splitter Both Paths Reach Terminal (validates SE-SIG-030, SE-SIG-031)

**Setup:** Source -> Splitter -> (left path: Gear -> Terminal-A) + (right path: Gear -> Terminal-B). Input tape: [1].  
**Expected:** Engine produces 1 pulse. Steps include a SPLIT action at Splitter cell. Two paths with distinct pathIds both terminate with TERMINATE action. Pulse result: SUCCESS.

### TEST-SIG-003 — Dead-End Detection (validates SE-SIG-050, SE-SIG-033)

**Setup:** Source -> Conveyor -> (empty cell, no piece). Input tape: [1].  
**Expected:** Engine produces 1 pulse. Last step has action DEAD_END. Pulse result: DEAD_END. Engine error array contains one DEAD_END entry. Final state: COMPLETE (not ERROR — dead-end is a per-pulse failure, not unrecoverable).

### TEST-SIG-004 — Scanner Read + Trail Write (validates SE-SIG-024, SE-SIG-011)

**Setup:** Source -> Scanner -> Terminal. Input tape: [7]. Data Trail initialized all null.  
**Expected:** Scanner step has action READ_TAPE. SideEffect: `{ type: 'TAPE_READ', tapeIndex: 0, valueBefore: null, valueAfter: 7 }`. Data Trail at Scanner's column position is 7 after pulse. Also has TRAIL_WRITE sideEffect.

### TEST-SIG-005 — Transmitter Writes Signal Value (validates SE-SIG-025)

**Setup:** Source -> Conveyor -> Transmitter -> Terminal. Input tape: [0]. Signal carries value 0.  
**Expected:** Transmitter step has action WRITE_TAPE. SideEffect: `{ type: 'TAPE_WRITE', tapeIndex: 0, valueBefore: null, valueAfter: 0 }`. Output tape after run: [0]. NOT null, NOT skipped. Zero IS written.

### TEST-SIG-006 — Config Node Reads Data Trail (validates SE-SIG-023)

**Setup:** Source -> Scanner -> Config Node (configValue: 1) -> Terminal. Input tape: [1]. Scanner at column 2, Config Node at column 3. Data Trail[3] initialized to null.  
**Expected:** Config Node step reads Data Trail at ITS position (column 3), NOT Input Tape. Since Data Trail[3] is null and configValue is 1, gate BLOCKS. Action: GATE_BLOCK. If we pre-set Data Trail[3] = 1 (via previous pulse with Scanner writing to column 3), Config Node passes.

### TEST-SIG-007 — Data Trail Persistence Across Pulses (validates SE-SIG-011)

**Setup:** Source -> Scanner (col 2) -> Conveyor -> Terminal. Input tape: [5, 3]. Two pulses.  
**Expected:** After pulse 1, Data Trail[2] = 5. After pulse 2, Data Trail[2] = 3 (overwritten). Between pulses, the trail value persisted (was 5 during start of pulse 2 before Scanner overwrote it). Verify trail state between pulses by checking that if a Config Node at col 2 checked for value 5 during pulse 2 BEFORE the Scanner in that pulse, it would pass.

### TEST-SIG-008 — Multi-Path Execution Order Consistency (validates SE-SIG-031)

**Setup:** Source -> Splitter -> (Left path: 3 Conveyors -> Terminal-A) + (Right path: 2 Conveyors -> Terminal-B). Input tape: [1]. Run engine 100 times.  
**Expected:** Step ordering is IDENTICAL across all 100 runs. Left path steps always appear before right path steps in the interleaved sequence (per LEFT-before-RIGHT rule).

### TEST-SIG-009 — State Transition IDLE to COMPLETE (validates SE-SIG-040, SE-SIG-041)

**Setup:** Source -> Terminal. Input tape: [1].  
**Expected:** Engine starts in IDLE. After run(), transitions to RUNNING, then COMPLETE. Final state is COMPLETE. Reset returns to IDLE.

### TEST-SIG-010 — Infinite Loop Detection (validates SE-SIG-051)

**Setup:** Source -> Gear (down) -> Gear (right) -> Gear (up) -> Gear (left, back to first Gear). A 4-cell loop. Input tape: [1].  
**Expected:** Engine detects same cell visited from same direction twice. Transitions to ERROR state. Error array contains INFINITE_LOOP entry with the cell and pulse number.

---

## 10. Open Questions for Tucker

1. **Relay buffer across run boundary:** When machine resets, Relay buffers clear (per SE-SIG-043). Confirm no scenario where buffered signals should survive reset.
2. **Sequencer firing order:** Is Sequencer output order defined by the level designer (explicit ordering in level data) or derived from spatial position of connected pieces?
3. **Navigator interaction:** Navigator is Legendary and COGS-operated. Does the engine need to model Navigator head-control now, or is it deferred to Deep Void sector implementation?

---

END OF SPEC_SIGNAL_ENGINE.md
