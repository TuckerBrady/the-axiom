# Validation Report — Kepler v2 Blockers SE Amendment Pass

**Author:** SE Cowork session
**Date:** 2026-05-01
**Scope:** Self-consistency check across the entire Kepler v2 spec set (Parts 1, 2, 3) after all three blocker amendments.

---

## Validation Method

Each clause below was checked against the amended spec files in the order listed.
Results are PASS, FAIL, or NOTE (requires Dev verification, not a spec defect).

---

## Section 1 — Transmitter Model β consistency

### 1.1 Canonical clause location

| Check | Result |
|-------|--------|
| REQ-T-1 through REQ-T-4 exist in exactly one location (Part 1 §CANONICAL TRANSMITTER BEHAVIOR) | PASS |
| Clause wording is RFC 2119 compliant | PASS |
| Tucker authorization date is recorded (2026-04-30) | PASS |

### 1.2 Cross-references from Transmitter-using levels

| Level | Cross-reference present | Result |
|-------|-------------------------|--------|
| K1-2 | Yes — one-line note after header | PASS |
| K1-3 | Yes — one-line note after header | PASS |
| K1-4 | Yes — one-line note after header | PASS |
| K1-5 | Yes — one-line note after header, plus expanded §6 note | PASS |
| K1-6 | Yes — one-line note after header in Part 2 | PASS |
| K1-7 | Yes — one-line note after header in Part 2 | PASS |
| K1-8 | Yes — one-line note after header in Part 2 | PASS |
| K1-9 | Yes — one-line note after header in Part 3 | PASS |
| K1-10 | Yes — one-line note after header in Part 3 | PASS |
| K1-1 | Not applicable (no Transmitter) | PASS |

### 1.3 Prose Model α / Model β consistency

Searched all three spec parts for phrases implying "signal arrived" = 1 or
Transmitter-as-presence-sensor semantics independent of signal value.

| Location | Finding | Result |
|----------|---------|--------|
| K1-2 §6 pulse table | Transmitter writes input value — consistent with Model β | PASS |
| K1-3 §6 pulse table | Transmitter writes 1 only when signal reaches it (value 1) — consistent | PASS |
| K1-4 §6 pulse table | Transmitter writes value 1 when gated open, 0 when blocked — consistent | PASS |
| K1-5 §6 (amended) | Model α prose removed. Model β analysis explicit. expectedOutput [1,0,1,0] | PASS |
| K1-6 §6 pulse table | Transmitter reads Data Trail, writes value — consistent with Model β | PASS |
| K1-7 §6 pulse table | Transmitter writes trail value on each pulse — consistent | PASS |
| K1-8 §6 pulse table | Transmitter writes outboundSignal (Latch DELAY output) — consistent | PASS |
| K1-9 §5 signal trace | Transmitter writes delayed value — consistent | PASS |
| K1-10 §5 signal trace | Transmitter writes Latch DELAY output when ConfigNode passes — consistent | PASS |

### 1.4 K1-5 expectedOutput

| Check | Result |
|-------|--------|
| expectedOutput: [1,0,1,0] in Part 1 §6 | PASS |
| The rejected [1,1,1,1] value does not appear in Part 1 as a current requirement | PASS |
| REQ-2 in SCOPE section marked REJECTED | PASS |
| §15 Code Fixes table REQ-2 row marked RESOLVED with no code change | PASS |
| CODE FIX SUMMARY row #2 updated to RESOLVED | PASS |

### 1.5 K1-6 expectedOutput consistency with Model β

K1-6 expectedOutput is [1,0,1,1,0,1]. Under the floor solve machine
(Latch→Splitter→gated/bypass→Merger→Transmitter), Model β predicts:
- Input 0 → Latch stores 0 → Config Node blocks Path A → Path B carries value 0
  → Merger receives value 0 → Transmitter writes 0 → output 0. Consistent.
- Input 1 → Path A open (value 1) and/or Path B (value 1) → output 1. Consistent.

| Check | Result |
|-------|--------|
| K1-6 expectedOutput [1,0,1,1,0,1] is consistent with Model β | PASS |

---

## Section 2 — requiredPieces enforcement consistency

### 2.1 Canonical clause location

| Check | Result |
|-------|--------|
| REQ-RP-1 through REQ-RP-5 exist in exactly one location (Part 2 §CANONICAL REQUIREDPIECES ENFORCEMENT) | PASS |
| Clause wording is RFC 2119 compliant | PASS |
| Tucker authorization date is recorded (2026-04-30) | PASS |
| Enforcement flavor A3a is named and defined | PASS |

### 2.2 Engine API contract

| Check | Result |
|-------|--------|
| PieceRunState interface defined | PASS |
| RequiredPiecesResult union type defined | PASS |
| evaluateRequiredPieces function signature specified | PASS |
| Fail-state routing fields (failReason, missingPieces) specified | PASS |
| Applicable levels named (K1-6, K1-8) | PASS |

### 2.3 K1-6 requiredPieces

| Check | Result |
|-------|--------|
| requiredPieces array present in K1-6 spec: [{ type: 'splitter', count: 1 }, { type: 'merger', count: 1 }] | PASS |
| REQ-51 cross-references REQ-RP-* | PASS |
| COGS failure-message slot (§12) specified | PASS |
| Slot status is PROPOSED (not authored) | PASS |
| No actual COGS line content written | PASS |

### 2.4 K1-8 requiredPieces

| Check | Result |
|-------|--------|
| requiredPieces array present in K1-8 spec: [bridge×1, latch×1, splitter×1, merger×1] | PASS |
| REQ-68 cross-references REQ-RP-* | PASS |
| COGS failure-message slot (§13) specified | PASS |
| Slot status is PROPOSED (not authored) | PASS |
| No actual COGS line content written | PASS |

### 2.5 REQ-RP-5 conflict flag

REQ-RP-5 notes a potential conflict with existing failure economics (run-attempt
consumption). This is flagged for Tucker confirmation before Dev implements.
No existing spec clause was found that contradicts REQ-RP-5 within this spec set,
but the engine's run-attempt system lives in src/ and is outside SE scope.

| Check | Result |
|-------|--------|
| REQ-RP-5 conflict with run-attempt system flagged for Tucker confirmation | PASS (flagged) |

---

## Section 3 — K1-7 coordinate collision resolution

### 3.1 Conveyor at (7,6) removed

| Check | Result |
|-------|--------|
| Step 9A (Conveyor at (7,6)) removed from Path A table | PASS |
| Transmitter is step 9A at (7,6) — no longer marked with dagger | PASS |
| Dagger footnote ("shift Transmitter/Terminal if needed") removed | PASS |
| No remaining "if needed" dangling conditional in K1-7 | PASS |

### 3.2 Terminal coordinate unchanged

| Check | Result |
|-------|--------|
| Terminal remains at (8,6) | PASS |
| Grid width 10 is sufficient for Transmitter(7,6) → Terminal(8,6) adjacency | PASS |

### 3.3 Economy values re-derived

| Field | Old value | New value | Result |
|-------|-----------|-----------|--------|
| optimalPieces | 8 | 7 | PASS |
| Floor solve piece budget text | 8 pieces | 7 pieces | PASS |
| Full demonstration budget text | 11 of 12 | 10 of 12 | PASS |
| budget (CR) | 55 CR | 55 CR (unchanged — not piece-count indexed) | PASS |
| REQ-63 | SHOULD (conditional) | RESOLVED | PASS |

### 3.4 Path B collision check

Path B uses: Conveyor(4,4), Gear(4,5), Bridge(5,5)[pre-placed], Conveyor(6,5).
No Path B cell overlaps any Path A cell. Path B does not use (7,6) at any step.

| Check | Result |
|-------|--------|
| Path B has no coordinate collision | PASS |
| Path B unchanged by Blocker 3 fix | PASS |

---

## Section 4 — No dangling "if needed" notes

Searched all three parts for conditional language suggesting unresolved
implementation questions that could indicate specification ambiguity.

| Location | Finding | Result |
|----------|---------|--------|
| K1-7 §5 dagger footnote | REMOVED by Blocker 3 fix | PASS |
| K1-7 REQ-63 | Amended to RESOLVED | PASS |
| K1-6 REQ-54 | "implementation-pending" for Data Trail column assignment — flagged for Dev verification, not a spec defect | NOTE |
| K1-8 REQ-71 | "preliminary pending verification" for Latch/Config Node trail semantics — flagged for Dev verification | NOTE |
| K1-7 REQ-62 | "Implementer MUST verify engine behaviour for split-arm void" — flagged for Dev | NOTE |

The three NOTEs above are carry-overs from the original Part 2 spec (pre-amendment)
and are correctly left as implementation-verification flags, not open specification
questions. They do not represent blockers introduced by this amendment pass.

---

## Section 5 — Cross-cutting checks

| Check | Result |
|-------|--------|
| No src/ changes in any spec amendment | PASS |
| No actual COGS dialogue content written (slots only) | PASS |
| No emojis in any amended file | PASS |
| RFC 2119 voice throughout | PASS |
| Part 3 amended only for cross-reference additions (no issues found in K1-9 or K1-10 Transmitter analysis) | PASS |
| K1-9 Model β: Latch DELAY emits previous signal value; Transmitter writes it — consistent | PASS |
| K1-10 Model β: Transmitter writes Latch DELAY output only when ConfigNode passes — consistent | PASS |

---

## Summary

All T-Bot verification checks pass. Three blockers resolved:

1. Transmitter canonical clause (REQ-T-1 through REQ-T-4): exists in Part 1, cross-referenced from all 9 Transmitter-using levels. K1-5 expectedOutput confirmed [1,0,1,0]. No Model α prose remaining.

2. requiredPieces enforcement (REQ-RP-1 through REQ-RP-5): exists in Part 2 with Engine API contract. K1-6 and K1-8 cross-referenced. COGS failure-message slots specified (PROPOSED status). No copy authored.

3. K1-7 coordinate collision: Conveyor at (7,6) removed. Transmitter at (7,6), Terminal at (8,6). optimalPieces updated 8 → 7. Path B unaffected. No dangling conditional notes.

**Spec set is ready for Code task commit.**
