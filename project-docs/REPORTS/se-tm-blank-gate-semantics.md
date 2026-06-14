# BLOCKER — SE-TM-002 A1-7/A1-8 gate switch needs a level-data + gameplay decision

**From:** Code (Prompt 148, Unit B)
**Date:** 2026-06-14
**Status:** BLOCKER (one item) — the rest of Prompt 148 shipped (BLANK type system, COGS diagnostic, tests).

## TL;DR

Prompt 148 step 4 / SE-TM-002 asks that for A1-7 onward, `expectedOutput`
becomes the **live** win gate and `requiredTerminalCount` becomes documentary.
The prompt assumed A1-7/A1-8 already pass on `tapeMatches` and that "no current
level needs BLANK in expectedOutput yet."

**Investigation found the opposite is true.** A1-7/A1-8 today pass purely on
`requiredTerminalCount`; their `expectedOutput` is documentary and CANNOT serve
as a live gate as written. Making the switch requires rewriting their
`expectedOutput` to full-length BLANK-aware tapes — a gameplay change (and, for
A1-8, a visual change) on two shipped tutorial levels. That is a Tucker
decision, so I implemented everything else and held this.

## What I shipped (no behavior change)

- `BLANK` type system end-to-end (SE-TM-003): `BLANK`/`OutputTapeValue` in
  `types.ts`; `-1` "unwritten" sentinel replaced with `BLANK` in `gameStore`,
  `GameplayScreen` (visual override init), `TapeBarShell`, `GameplayModals`
  (wrong-output modal), and `interactions.ts`. The `-2` blocked-cell marker is
  left intact (different concept). Comparators (`gameStore.engage()`,
  `GameplayScreen`) are now BLANK-aware via plain `===`.
- Because A1-7/A1-8 `expectedOutput` stays documentary, `tapeMatches` stays
  `false` for them exactly as before, so they keep gating on
  `requiredTerminalCount`. **Verified behavior is identical** — full suite green.
- SE-TM-011 COGS placement diagnostic: detection + `[PROPOSED]` copy landed
  (`transmitterPlacementDiagnostic.ts`), UI surface deferred (see LAST_REPORT).

## The contradiction, concretely

| Level | inputTape (len) | outputTape (len) | expectedOutput today | Produced tape (BLANK-aware) | Live gate today |
|-------|-----------------|------------------|----------------------|-----------------------------|-----------------|
| A1-7  | `[1,1,0,1,0,0,1,1]` (8) | 8 | `[1,1,1,1,1]` (len **5**) | `[1,1,BLANK,1,BLANK,BLANK,1,1]` | `requiredTerminalCount: 5` |
| A1-8  | `[1,0,1,1,0,1,0,1]` (8) | 8 | `[0,0,0,0,0,0,0,0]` (8, all 0) | `[BLANK,0,BLANK,BLANK,0,BLANK,0,BLANK]` | `requiredTerminalCount: 3` |

- **A1-7**: `expectedOutput` lists only the 5 passing pulses, so its length (5)
  never matches the length-8 output tape — `tapeMatches` is `false`, and the
  level passes via `requiredTerminalCount=5`. Note the produced tape matches the
  OUT screenshot Tucker already confirmed correct (`1 1 _ 1 _ _ 1 1`).
- **A1-8**: `expectedOutput` is all-zeros and length-8 *by design* — its comment
  says this is so blocked cells render **red** on mismatch. But the 5 blocked
  pulses produce `BLANK`, not `0`, so an exact match against all-zeros can never
  pass. It passes via `requiredTerminalCount=3`.

So "expectedOutput is the live gate for A1-7+" is impossible without rewriting
the data, and at least A1-7 genuinely needs `BLANK` in `expectedOutput` — which
contradicts the prompt's "no current level needs this yet."

## Second issue surfaced: gameStore vs GameplayScreen disagree today

The two success paths the prompt says must "agree" already disagree for A1-7/A1-8:

- `gameStore.engage()` (tape+expectedOutput branch):
  `succeeded = reachedOutputEveryPulse && tapeMatches`. For A1-7 this is
  `false && false = false` → the store thinks A1-7 **fails** (stars 0).
- `GameplayScreen` (authoritative for the actual win/score):
  `succeeded = !wrongOutput && metPulseRequirement`. For A1-7, `wrongOutput` is
  `false` (it is gated behind `reachedOutputEveryPulse`) and
  `metPulseRequirement = 5>=5 = true` → **win**.

GameplayScreen drives `handleSuccess`/`calculateStars`, so the game is correct,
but the store's `succeeded`/`stars` for tape levels is effectively dead. Any
real gate switch must reconcile these two paths, not just flip one.

## Recommended resolution (ready to apply once approved)

1. **Discriminator (data-driven, no hardcoded IDs):** treat `expectedOutput` as
   the live gate **iff** `expectedOutput.length === inputTape.length`
   (full-length). Short/documentary `expectedOutput` (A1-5 `[1,1,1]`, A1-6
   `[0,0,0]`) stays on `requiredTerminalCount`. This cleanly preserves
   A1-5/A1-6 and switches A1-7/A1-8 once their data is full-length.
2. **A1-7** `expectedOutput` → `[1, 1, BLANK, 1, BLANK, BLANK, 1, 1]`
   (matches the confirmed screenshot).
3. **A1-8** `expectedOutput` → `[BLANK, 0, BLANK, BLANK, 0, BLANK, 0, BLANK]`.
   **Visual implication:** blocked cells now MATCH (BLANK===BLANK) and render as
   a neutral dash instead of red. Under SE-TM-003 (BLANK is a valid expected
   value, not an error) this is arguably more correct, but it changes the
   capstone's look — needs Tucker's eye.
4. **gameStore.engage()** and **GameplayScreen**: for full-length-expectedOutput
   levels, gate on `tapeMatches` alone (drop the `reachedOutputEveryPulse` AND
   and the `metPulseRequirement` AND for that branch). A blocked pulse that
   legitimately produces BLANK must not fail the level via a terminal-count
   requirement. Reconcile both paths to the same predicate.
5. Update `requiredTerminalCount.test.ts` (the "pending reclassification"
   describe block I added) to assert the new live-gate behavior.

**Gameplay impact to confirm:** switching A1-7 from "5 pulses reach Terminal"
to "exact tape match" makes the level stricter (only the precise gating produces
a pass). That is the SE-TM-002 intent (Turing-correct output matching), but it
is a difficulty/behavior change on a tutorial level — your call.

## Decision needed

- (a) Switch the gate per the plan above (I apply steps 1–5), accepting the A1-8
  red→dash visual change and the A1-7 stricter gate, **or**
- (b) Keep `requiredTerminalCount` as the live gate for now and treat
  `expectedOutput` as documentary (current shipped behavior) — in which case the
  documentary comments I added in `levels.ts` should be reworded to drop the
  "pending" framing.
