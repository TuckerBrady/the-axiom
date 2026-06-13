# A1-7 OUT Tape — Arrival Highlight

Decision record. Resolves the last A1-7 finding from the QA walkthrough
(GAME-03/04 follow-up). Approved by Tucker 2026-06-13.

## Problem

The OUT tape cell lit up **when the Transmitter fired** (mid-traversal) and the
fill was keyed to the gate outcome (green = passed). Walkthrough notes:
1. The highlight should mean "this signal reached the Terminal," for **any**
   value — a 0 that reaches the Terminal should fill the same as a 1.
2. It should fire **when the signal reaches the Terminal**, not at an
   indeterminate point during traversal.
3. The OUT/TRAIL number styling needed work (arrival fill chosen).

## Decision — arrival fill

The OUT cell stays dim until its pulse's signal reaches the Terminal, then
fills with the OUT tape's own color (`#FF7D3F`) and pulses — for any value.

- The Transmitter still **computes** the value but no longer reveals it. The
  value reveal (`visualOutputOverride`), OUT bar slide (`outIndex`), and the new
  `'arrived'` highlight all fire in `runTerminalInteraction`, dispatched from
  `triggerPieceAnim` when the terminal step executes successfully.
- TapeCell: the OUT fill is driven by `styleAsArrived = cellHasWrittenValue`
  (value revealed = reached Terminal), NOT by the gate outcome. Blocked pulses
  never arrive and keep the red middle-dot from the gate-block highlight.
- New `'arrived'` member on `TapeHighlight` → orange overlay pulse.

## Files

- `src/game/engagement/types.ts` — `'arrived'` highlight.
- `src/game/engagement/interactions.ts` — `runTransmitterInteraction` defers
  the reveal; new `runTerminalInteraction`; dispatched in `triggerPieceAnim`.
- `src/components/gameplay/TapeCell.tsx` — `arrived` overlay color +
  `tapeCellArrived` fill (orange), driven off arrival not gate.

Levels without an OUT tape have no `visualOutputOverride` and are skipped.
