# SPEC: Return to Tray (Long Press Behavior)
### Sprint 18A | April 2026

---

## Problem

Long press on a placed piece currently enters a held/ghost state
for repositioning. The approved behavior (per CLAUDE.md and
CLAUDE_CONTEXT.md) is: long press returns the piece directly to
the tray. No ghost state. No repositioning. To move a piece, the
player returns it to tray and places it again.

The PieceSandboxScreen already implements the correct behavior.
GameplayScreen does not.

---

## Approved Behavior

- Long press (500ms) on a placed piece: piece is removed from
  the board and returned to the tray immediately.
- No ghost/held state. No visual overlay. No repositioning flow.
- Pre-placed pieces (isPrePlaced) are exempt -- long press does
  nothing on them.
- Long press during execution, results, or void screens does
  nothing (existing guard is correct).

---

## Current State (What Exists)

GameplayScreen.tsx:
- Line 220: `heldPieceId` state variable
- Lines 484-489: `handleCanvasTap` repositions held piece via
  `movePiece()`
- Lines 526-529: `handlePieceTap` cancels held state on re-tap
- Lines 547-553: `handlePieceLongPress` sets `heldPieceId`
  (enters ghost state)
- Line 1363: `isHeld` calculation for visual feedback
- Lines 1393-1395: Held piece scale (1.15) and opacity (0.6)
- Lines 1429-1474: Ghost cell overlay render (shared with tray
  selection)
- Lines 2428-2438: Ghost cell styles

gameStore.ts:
- Line 157: `deletePiece` action exists but is NOT called from
  GameplayScreen

PieceSandboxScreen.tsx:
- Lines 122-125: Correct behavior -- long press calls
  `setPieces(prev => prev.filter(...))` to remove piece

---

## Required Changes

1. **handlePieceLongPress**: Replace `setHeldPieceId(piece.id)`
   with a call to the game store's `deletePiece(piece.id)`.
   The tray piece count should increment automatically when the
   placed piece is removed (verify this).

2. **Remove heldPieceId state**: Delete the `useState` for
   `heldPieceId` entirely.

3. **Remove held piece repositioning in handleCanvasTap**: Delete
   the `if (heldPieceId)` block (lines 484-489).

4. **Remove held cancel in handlePieceTap**: Delete the
   `if (heldPieceId === piece.id)` block (lines 526-529).

5. **Remove isHeld visual feedback**: Delete the `isHeld`
   calculation and the conditional opacity/scale styling.

6. **Ghost cell overlay**: Keep the ghost cell overlay for tray
   piece selection (`selectedPieceFromTray`). Remove the
   `heldPieceId` condition from its render guard. If the only
   remaining condition is `selectedPieceFromTray`, simplify.

7. **Verify tray replenishment**: When `deletePiece` is called,
   confirm the tray piece count increments. If not, add logic
   to return the piece type to the tray inventory.

---

## Out of Scope

- Tap behavior (Conveyor rotate, Config Node cycle, Latch toggle)
  -- these are correct and must not change.
- Ghost cells for tray selection -- keep as-is.
- Pre-placed piece handling -- keep as-is.
- PieceSandboxScreen -- already correct.

---

## Quality Checklist

[ ] Long press returns piece to tray (not held state)
[ ] No heldPieceId state variable remains
[ ] No ghost/held visual feedback on placed pieces
[ ] Ghost cells still work for tray piece selection
[ ] Pre-placed pieces still immune to long press
[ ] Tray count increments when piece is returned
[ ] Tap actions unchanged (Conveyor, Config Node, Latch)
[ ] All existing tests pass
[ ] Four quality gates pass (lint, typecheck, tests, audit)
