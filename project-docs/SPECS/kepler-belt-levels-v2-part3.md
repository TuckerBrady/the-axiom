# Kepler Belt Levels v2 — Part 3: K1-9 and K1-10

Spec author: Claude Code
Date: 2026-04-30
Prerequisite specs: kepler-belt-levels-v2-part1.md, kepler-belt-levels-v2-part2.md

> Canonical Transmitter behavior (Model β): see REQ-T-1 through REQ-T-4 in
> kepler-belt-levels-v2-part1.md §CANONICAL TRANSMITTER BEHAVIOR. All
> Transmitter activations in K1-9 and K1-10 MUST be read under those clauses.

---

## AUDIT FINDINGS

### K1-9 XOR Solvability Verdict: UNSOLVABLE AS DESIGNED

XOR requires `(A AND NOT B) OR (NOT A AND B)`. NOT requires an Inverter (Nova Fringe) or
Divergence Gate (Nova Fringe). Neither is available in Kepler Belt. Additionally, the engine
indexes `trail.cells[pulseIndex]` — ConfigNode and Scanner both operate on the same pulse-
indexed cell with no mechanism to read `trail.cells[N-1]` in pulse N. Result: XOR and all
cross-pulse comparison functions are engine-broken with Kepler pieces.

### K1-10 Consecutive-1 Detector Verdict: CORRECT MATH, ENGINE FIX REQUIRED

Tape math is sound. The computation `output[N] = input[N] AND input[N-1]` is correctly
encoded in the expected output. The machine design requires the Latch to behave as a D
flip-flop (store current, output previous). The current engine WRITE mode stores and passes
through the current value — it does not output the previous value. Engine fix required before
K1-10 is solvable.

### Root Cause: Latch DELAY Mode Missing

Both levels require a third Latch mode. Current modes: `write` (store + pass), `read`
(output stored, never update). Missing: `delay` (D flip-flop: store current, output previous).
Adding `delay` without touching `write` preserves K1-3 through K1-8.

---

## K1-9 — The Narrows (REDESIGN)

> Transmitter behavior: see canonical clause REQ-T-* (Part 1 §CANONICAL TRANSMITTER BEHAVIOR). K1-9's floor solve (Source → Latch(DELAY) → Transmitter → Terminal) produces [0,0,1,1,0,1] from input [0,1,1,0,1,0] under Model β — Transmitter writes the carried signal value (post-delay output).

### 1. Computational Goal

| Field | Value |
|-------|-------|
| REQ | REQ-76 |
| RFC | MUST |
| Goal | Output the value of the previous input pulse. Output 0 on pulse 0. |
| One-sentence rule | `output[N] = input[N-1]` with `output[0] = 0` (1-pulse shift register). |

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| REQ | REQ-77 |
| RFC | MUST |
| Concept | Latch DELAY mode as a 1-pulse shift register. Cross-pulse memory via D flip-flop. |
| What the player learns | The machine can carry a value forward one pulse, making its current output depend on what happened last time. |
| CS concept | D flip-flop. Shift register. Temporal coupling. |
| Prerequisite | All Kepler concepts through K1-8. Specifically: Latch write/read from K1-3 and K1-4. |
| New mechanic | Latch DELAY mode (third tap state, introduced here). Tap cycles: write → delay → read. |

### 3. Board Layout

REQ-78: The board MUST use the following layout.

| Field | Value |
|-------|-------|
| Grid | 11 wide × 9 tall (unchanged) |
| Source | Pre-placed at (col 1, row 4) |
| Terminal | Pre-placed at (col 9, row 4) |
| Pre-placed obstacles | None |
| Blown cells active | Yes (Kepler sector) |
| Placement highlights | Off (Kepler sector) |

Board provides a clear horizontal corridor (row 4) for the obvious path, plus vertical
routing room (rows 0–8) for alternative builds. 2–3 blown cells MUST leave at least one
complete path from Source to Terminal.

### 4. Available Pieces

REQ-79: The tray MUST contain these pieces.

| Piece | Count | Role |
|-------|-------|------|
| Conveyor | 8 | Routing |
| Latch | 2 | Floor solve uses 1 in DELAY mode; second enables alternative machines |
| Transmitter | 1 | Required for output |
| Scanner | 1 | Optional — enables alternative scanner-gated approaches |
| ConfigNode | 2 | Optional — alternative machines |
| Splitter | 1 | Optional — parallel path alternatives |
| Merger | 1 | Optional — combine parallel paths |
| Gear | 3 | Routing around blown cells |
| Bridge | 1 | Cross-path routing alternative |

### 5. Floor Solve

REQ-80: The following floor solve MUST be verified solvable before merge.

**Machine**: Source → Latch(DELAY) → Transmitter → Terminal via straight horizontal path.

| Col | Row | Piece | Config | Role |
|-----|-----|-------|--------|------|
| 1 | 4 | Source | — | Pre-placed |
| 2 | 4 | Conveyor | right | Connect |
| 3 | 4 | Conveyor | right | Connect |
| 4 | 4 | Latch | DELAY mode | 1-pulse shift: stores input[N], outputs input[N-1] |
| 5 | 4 | Conveyor | right | Connect |
| 6 | 4 | Transmitter | — | Writes delayed value to outputTape[N] |
| 7 | 4 | Conveyor | right | Connect |
| 8 | 4 | Conveyor | right | Connect |
| 9 | 4 | Terminal | — | Pre-placed |

**Pieces placed**: 5 Conveyor + 1 Latch + 1 Transmitter = **7 pieces**

**Signal trace per pulse** (machine: signal enters Latch, Latch stores current and emits previous):

| Pulse | Input | Latch.stored before | Latch emits | Transmitter writes | Output |
|-------|-------|--------------------:|:-----------:|-------------------:|-------:|
| 0 | 0 | null → 0 | 0 | 0 | 0 |
| 1 | 1 | 0 | 0 | 0 | 0 |
| 2 | 1 | 1 | 1 | 1 | 1 |
| 3 | 0 | 1 | 1 | 1 | 1 |
| 4 | 1 | 0 | 0 | 0 | 0 |
| 5 | 0 | 1 | 1 | 1 | 1 |

No Scanner required. Signal always reaches Terminal (Latch DELAY never blocks). Transmitter
fires every pulse, writing the delayed value.

REQ-81: The floor solve MUST reach 3 stars. `piecesUsed / totalTrayPieces` with 7 placed
from ~21 tray pieces = ratio 0.33 → 1 star. EXCEPTION: `optimalPieces` is set to 7 so
efficiency scoring uses 7 as the baseline. The floor solve is the optimal solution. 3 stars
requires using all 7 optimal pieces, which the floor solve does.

### 6. Input Tape / Expected Output

REQ-82: Tape MUST match exactly.

| Field | Value |
|-------|-------|
| inputTape | `[0, 1, 1, 0, 1, 0]` (unchanged from broken version) |
| expectedOutput | `[0, 0, 1, 1, 0, 1]` (CHANGED — was `[0, 1, 0, 1, 1, 1]`) |

**Tape design rationale**: Output lags input by one pulse. Pulse 1 outputs 0 despite input 1
(proving delay, not identity). Pulse 3 outputs 1 despite input 0 (proving previous-value
persistence). Pulse 4 outputs 0 despite a run of 1s (proves the delay resets on 0 input).
A hardcoded identity machine produces `[0, 1, 1, 0, 1, 0]` — does not match.

### 7. Data Trail, Scoring, Budget, Difficulty Band

| Field | Value |
|-------|-------|
| dataTrail | `{ cells: [null, null, null, null, null, null], headPosition: 0 }` (unchanged) |
| optimalPieces | 7 (CHANGED — was 11) |
| budget | 50 CR (CHANGED — was 70 CR) |
| baseReward | 120 CR |
| difficultyBand | `'abstract'` (unchanged) |
| scoringCategoriesVisible | `['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus']` |

### 8. COGS Line

REQ-83: cogsLine MUST be preserved exactly.

> "The Narrows is the densest section of the corridor. Maximum signal interference. The
> colonists call it The Narrows because of what it does to communication. It has another
> name on older charts. I will use the current one."

eyeState: `'blue'`

### 9. Tutorial Steps

REQ-84: K1-9 MUST have exactly three tutorial steps. Latch DELAY mode is a new mechanic
of an existing piece — it warrants the collector-interrupts pattern. The `codexEntryId`
references the existing `'latch'` entry, triggering a Codex open to the updated entry.

**Step 1 — board-intro** [targetRef: boardGrid, eyeState: blue]
> "The Narrows. Every pulse carries a value. This machine's output is not the current value.
> It is the previous one. The path requires something that holds what just happened and
> releases it one beat later. Plan around the sequence, not the destination."

**Step 2 — latch-delay-collect** [targetRef: tray latch slot, eyeState: amber,
codexEntryId: 'latch']
> "The Latch has a third mode. I missed it the first time. I am correcting the entry now."

**Step 3 — board-resume** [targetRef: boardGrid, eyeState: blue]
> "As I was saying. Delay mode captures the incoming value and releases what it held before.
> One pulse behind. Place it between the Source and the Transmitter. The Transmitter records
> whatever exits the Latch. That is the previous value. That is the answer."

### 10. Consequence Config

REQ-85: K1-9 is NOT a consequence level. No `consequence` field.

### 11. Code Fixes Required (K1-9)

REQ-86: The following code changes MUST be implemented before K1-9 is playable.

| File | Change | Detail |
|------|--------|--------|
| `src/game/types.ts` | Add `'delay'` to latchMode union | `latchMode?: 'write' \| 'delay' \| 'read'` |
| `src/game/engine.ts` | Add delay branch to latch case | See implementation note below |
| `src/game/levels.ts` | Update K1-9 definition | `expectedOutput: [0, 0, 1, 1, 0, 1]`, `optimalPieces: 7`, `budget: 50` |
| Codex entry for latch | Update to describe three modes | Add delay mode description: "DELAY mode stores the incoming value and outputs the value it held before — one pulse behind." |
| Tap handler for Latch | Cycle write → delay → read | Currently cycles write ↔ read only |
| PieceIcon.tsx | Visual indicator for DELAY mode | Distinct from write and read mode states |

**Engine implementation for DELAY mode** (insert after the existing `'write'` branch in
`src/game/engine.ts` latch case):

```typescript
} else if (mode === 'delay') {
  const prev = piece.storedValue;
  piece.storedValue = signalValue as 0 | 1;
  outboundSignalValue = prev ?? 0;
  step.message = `Latch DELAY — stored ${piece.storedValue}, output ${outboundSignalValue}`;
}
```

The existing `'write'` branch is NOT modified. K1-3 through K1-8 are unaffected.

---

## K1-10 — Central Hub (VERIFY + DOCUMENT)

> Transmitter behavior: see canonical clause REQ-T-* (Part 1 §CANONICAL TRANSMITTER BEHAVIOR). K1-10's Transmitter writes Latch DELAY output (input[N-1]) only when ConfigNode passes — consistent with Model β. Expected output [0,1,0,0,1,1,0,0,0,1] verified under Model β (see §5 floor solve trace).

### 1. Computational Goal

| Field | Value |
|-------|-------|
| REQ | REQ-87 |
| RFC | MUST |
| Goal | Output 1 when both the current and previous input are 1. Otherwise output 0. |
| One-sentence rule | `output[N] = input[N] AND input[N-1]` with `output[0] = 0` (consecutive-1 detector). |

### 2. Concept Taught + Prerequisites

| Field | Value |
|-------|-------|
| REQ | REQ-88 |
| RFC | MUST |
| Concept | Full stateful computation. A single Latch DELAY combines cross-pulse memory with a ConfigNode gate to produce a result dependent on two pulses simultaneously. |
| What the player learns | How to compose the delay shift from K1-9 with conditional gating from K1-3/K1-5 to make a machine that detects a pattern across time. |
| CS concept | State machine. Pattern detection. Temporal AND gate. |
| Prerequisite | K1-9 (Latch DELAY mode). All Kepler concepts. |
| New mechanic | None — synthesis of all Kepler concepts. |

### 3. Board Layout

REQ-89: The board MUST use the following layout.

| Field | Value |
|-------|-------|
| Grid | 12 wide × 9 tall (unchanged) |
| Source | Pre-placed at (col 1, row 4) |
| Terminal | Pre-placed at (col 10, row 4) |
| Pre-placed obstacles | None |
| Blown cells active | Yes (Kepler sector, consequence level) |
| Placement highlights | Off (Kepler sector) |

Consequence levels MUST have board slack. With 9 columns between Source and Terminal (cols
2–9) and a floor solve using 8 of those cells in row 4, the player has rows 0–3 and 5–8
for rerouting around up to 3 blown cells.

### 4. Available Pieces

REQ-90: The tray MUST contain these pieces (unchanged from current definition).

| Piece | Count | Role |
|-------|-------|------|
| Conveyor | 8 | Routing |
| Scanner | 2 | Floor solve uses 1; second enables alternative builds |
| Latch | 2 | Floor solve uses 1 in DELAY mode |
| ConfigNode | 2 | Floor solve uses 1 (val=1); second for alternative gating |
| Transmitter | 1 | Required for output |
| Splitter | 1 | Optional parallel paths |
| Merger | 1 | Optional reconvergence |
| Gear | 4 | Routing corners and blown-cell recovery |
| Bridge | 1 | Cross-path routing |

### 5. Floor Solve

REQ-91: The following floor solve MUST be verified solvable before merge.

**Machine**: Source → Scanner → Latch(DELAY) → ConfigNode(val=1) → Transmitter → Terminal.

The Scanner writes `trail[N] = input[N]`. The Latch DELAY stores `input[N]` and emits
`input[N-1]` as the outbound signal. The ConfigNode reads `trail[N]` (current input) and
gates when `trail[N] = 1`. The Transmitter writes `outboundSignal = input[N-1]` only when
ConfigNode passes. When ConfigNode blocks (`input[N]=0`), Transmitter is never reached and
`outputTape[N]` stays at 0.

| Col | Row | Piece | Config | Role |
|-----|-----|-------|--------|------|
| 1 | 4 | Source | — | Pre-placed |
| 2 | 4 | Conveyor | right | Connect |
| 3 | 4 | Scanner | — | Write trail[N] = input[N] |
| 4 | 4 | Conveyor | right | Connect |
| 5 | 4 | Latch | DELAY mode | Store input[N], emit input[N-1] |
| 6 | 4 | Conveyor | right | Connect |
| 7 | 4 | ConfigNode | configValue=1 | Gate: pass when trail[N]=1 (input[N]=1) |
| 8 | 4 | Conveyor | right | Connect |
| 9 | 4 | Transmitter | — | Write outputTape[N] = outboundSignal = input[N-1] |
| 10 | 4 | Terminal | — | Pre-placed |

**Pieces placed**: 4 Conveyor + 1 Scanner + 1 Latch + 1 ConfigNode + 1 Transmitter = **8 pieces**

REQ-92: Piece-by-piece signal trace MUST verify against expectedOutput before merge.

| Pulse | Input[N] | trail[N] | Latch.stored before | Latch emits | ConfigNode | Transmitter writes | Output |
|-------|----------|----------|--------------------:|:-----------:|:----------:|-------------------:|-------:|
| 0 | 1 | 1 | null → 0 | 0 | PASS (trail=1) | 0 | 0 |
| 1 | 1 | 1 | 1 | 1 | PASS | 1 | 1 |
| 2 | 0 | 0 | 1 | 1 | BLOCK (trail=0) | — | 0 |
| 3 | 1 | 1 | 0 | 0 | PASS | 0 | 0 |
| 4 | 1 | 1 | 1 | 1 | PASS | 1 | 1 |
| 5 | 1 | 1 | 1 | 1 | PASS | 1 | 1 |
| 6 | 0 | 0 | 1 | 1 | BLOCK | — | 0 |
| 7 | 0 | 0 | 0 | 0 | BLOCK | — | 0 |
| 8 | 1 | 1 | 0 | 0 | PASS | 0 | 0 |
| 9 | 1 | 1 | 1 | 1 | PASS | 1 | 1 |

All 10 pulses match expectedOutput `[0, 1, 0, 0, 1, 1, 0, 0, 0, 1]`. **Tape math verified.**

Note on pulse 2: Latch stores 0 (input=0) but emits previous=1. ConfigNode blocks because
trail[2]=0. Transmitter never reached. outputTape[2]=0. Latch.stored after pulse 2 = 0.
This correctly "resets" the consecutive state: pulse 3 has input=1 but prev=0, so output=0.

### 6. Input Tape / Expected Output

REQ-93: Tape is CORRECT and MUST NOT be changed.

| Field | Value |
|-------|-------|
| inputTape | `[1, 1, 0, 1, 1, 1, 0, 0, 1, 1]` |
| expectedOutput | `[0, 1, 0, 0, 1, 1, 0, 0, 0, 1]` |

**Tape design rationale** (verified): 10 pulses cover all state transitions: isolated 1 (pulse
0→output 0 — no previous), consecutive 1s (pulses 1, 4-5, 9), isolated 0 between runs
(pulse 2 resets state), two consecutive 0s (pulses 7-8), and run-start after silence (pulse 8
outputs 0 despite input=1 because prev=0). A hardcoded machine fails on any of these.

### 7. Data Trail, Scoring, Budget, Difficulty Band

| Field | Value |
|-------|-------|
| dataTrail | `{ cells: [null,null,null,null,null,null,null,null,null,null], headPosition: 0 }` (unchanged) |
| optimalPieces | 8 (CHANGED — was 13) |
| budget | 80 CR (unchanged — consequence level buffer maintained) |
| baseReward | 150 CR |
| requireThreeStars | `true` (via consequence config) |
| difficultyBand | `'abstract'` (unchanged) |
| scoringCategoriesVisible | `['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus']` |

### 8. COGS Line

REQ-94: cogsLine MUST be preserved exactly.

> "The Central Hub. Everything in this corridor routes through here. If it holds, the corridor
> holds. Three hundred thousand people depend on infrastructure that runs through a single
> point. That is not good design. It is, however, the current situation."

eyeState: `'amber'`

### 9. Tutorial Steps

REQ-95: K1-10 MUST have exactly two tutorial steps (boss synthesis level, no new piece,
no new mode — K1-9 already introduced DELAY).

**Step 1 — board-intro** [targetRef: boardGrid, eyeState: amber]
> "The Central Hub. Three hundred thousand people. Single point of failure. The machine needs
> to know two things at once: what the current signal is, and what the signal was last time.
> Both must be true for the output to fire. The Engineer has all the tools. This is what
> they were built toward."

**Step 2 — board-resume** [targetRef: boardGrid, eyeState: blue]
> "The Scanner writes the current value. The Latch holds the previous one and releases it
> downstream. The gate checks the current. The Transmitter records what the Latch released.
> The sequence is the machine. Place it in that order."

### 10. Consequence Config

REQ-96: `consequence` field MUST be preserved exactly.

```typescript
consequence: {
  cogsWarning: 'Do not fail here. I will not elaborate.',
  failureEffect: 'Central Hub failure. The corridor is offline. Three hundred and fourteen colonists lost scheduled resupply access for eleven days. The transit authority has filed a negligence inquiry against this vessel.',
  requireThreeStars: true,
}
```

REQ-97: `requireThreeStars: true` means a score below 3 stars triggers both the blown-cell
mechanic AND the consequence effect. The floor solve MUST reach 3 stars. With 8 optimal
pieces and the floor solve using exactly 8, the efficiency ratio = 8/8 = 1.0 ≥ 0.75 → 3 stars.

### 11. Code Fixes Required (K1-10)

REQ-98: The K1-10 level definition MUST be updated.

| Field | Old Value | New Value |
|-------|-----------|-----------|
| `optimalPieces` | 13 | 8 |
| `computationalGoal` | (keep prose) | add: "Machine: Source → Scanner → Latch(DELAY) → ConfigNode(1) → Transmitter → Terminal." |

REQ-99: The engine fix from REQ-86 (Latch DELAY mode) is also a prerequisite for K1-10.
K1-10 MUST NOT ship without the DELAY mode engine change.

REQ-100: Tests MUST cover both levels.

| Test | Location | What to verify |
|------|----------|----------------|
| K1-9 tape math | `__tests__/unit/levels.test.ts` | 1-pulse delay machine produces `[0,0,1,1,0,1]` from `[0,1,1,0,1,0]` |
| K1-10 tape math | `__tests__/unit/levels.test.ts` | Consecutive-1 machine produces `[0,1,0,0,1,1,0,0,0,1]` from `[1,1,0,1,1,1,0,0,1,1]` |
| Latch DELAY engine | `__tests__/unit/engine.test.ts` | DELAY mode stores current, emits previous; null initial emits 0 |
| K1-10 consequence | `__tests__/integration/` | below-3-star result triggers consequence effect |
| K1-3 through K1-8 regression | `__tests__/unit/levels.test.ts` | All 6 identity-function levels still pass after DELAY mode addition |

---

## Summary of Changes

| Level | Field | Before | After |
|-------|-------|--------|-------|
| K1-9 | Computational goal | XOR(input[N], latch_stored) | output[N] = input[N-1] |
| K1-9 | expectedOutput | `[0,1,0,1,1,1]` | `[0,0,1,1,0,1]` |
| K1-9 | optimalPieces | 11 | 7 |
| K1-9 | budget | 70 CR | 50 CR |
| K1-9 | Machine design | Broken (XOR, no Inverter) | Source→Latch(DELAY)→Transmitter→Terminal |
| K1-10 | Tape math | Unverified | Verified correct (see REQ-92) |
| K1-10 | optimalPieces | 13 | 8 |
| K1-10 | Machine design | Undocumented | Source→Scanner→Latch(DELAY)→ConfigNode(1)→Transmitter→Terminal |
| Both | Engine prerequisite | None | Latch DELAY mode (D flip-flop) required |

---

## Blocker

The Latch DELAY mode engine change is a prerequisite for both K1-9 and K1-10. It also
requires: type update, tap-handler cycle update, visual indicator in PieceIcon, and Codex
entry update. These MUST land in one commit before level data is pushed. Recommend a
single PR: `feat(latch-delay): add delay mode for K1-9 and K1-10 shift register machines`.
