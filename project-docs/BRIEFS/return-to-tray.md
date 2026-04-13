# CODE PROMPT: Return to Tray — Sprint 18A

Paste this entire prompt into Claude Code.

---

## Context

Read CLAUDE.md first. Then read project-docs/SPECS/return-to-tray.md.

Long press on a placed piece currently enters a held/ghost state
for repositioning. The approved behavior is: long press returns the
piece directly to the tray. No ghost state. No repositioning.

The tray inventory is computed dynamically (availablePieces minus
placed pieces), so removing a piece from the board automatically
replenishes the tray. No tray logic changes needed.

## Changes — All in src/screens/GameplayScreen.tsx

Make these changes in order. Do not touch any other file.

### 1. Rewrite handlePieceLongPress (lines 547-553)

Replace the entire function body. Keep the guards. Replace
setHeldPieceId with deletePiece:

```typescript
const handlePieceLongPress = useCallback((piece: PlacedPiece) => {
  if (piece.isPrePlaced) return;
  if (isExecuting || showResults || showVoid) return;
  deletePiece(piece.id);
}, [isExecuting, showResults, showVoid, deletePiece]);
```

### 2. Delete heldPieceId state (line 220)

Delete this line entirely:
```typescript
const [heldPieceId, setHeldPieceId] = useState<string | null>(null);
```

### 3. Delete held piece repositioning in handleCanvasTap (lines 485-490)

Delete this entire block:
```typescript
if (heldPieceId) {
  movePiece(heldPieceId, gridX, gridY);
  setHeldPieceId(null);
  selectPlaced(null);
  return;
}
```

### 4. Delete held cancel in handlePieceTap (lines 526-530)

Delete this entire block:
```typescript
if (heldPieceId === piece.id) {
  setHeldPieceId(null);
  selectPlaced(null);
  return;
}
```

### 5. Delete isHeld visual feedback (line 1363, lines 1393-1395)

Delete the isHeld calculation:
```typescript
const isHeld = heldPieceId === piece.id;
```

Replace the styling that uses isHeld:
```typescript
opacity: isHeld ? 0.6 : 1,
transform: [{ scale: isHeld ? 1.15 : 1 }],
zIndex: isHeld ? 10 : 0,
```
With:
```typescript
opacity: 1,
transform: [{ scale: 1 }],
zIndex: 0,
```

### 6. Fix ghost cell render condition (line 1429)

Replace:
```typescript
{(selectedPieceFromTray || heldPieceId) &&
```
With:
```typescript
{selectedPieceFromTray &&
```

### 7. Clean up unused references

After all deletions, search the file for any remaining references
to heldPieceId, setHeldPieceId, or isHeld. Delete them all.

If movePiece is no longer used anywhere in the file after removing
the held repositioning block, remove it from the gameStore
destructuring (around line 178).

## Do NOT Touch

- Tap handlers: Conveyor rotation, Config Node cycle, Latch toggle
- PieceSandboxScreen (already correct)
- Ghost cell styles (keep for tray selection)
- selectPlaced calls in handlePieceTap (used for highlighting)
- Any animation code
- Any other file

## Verify

Run all four quality gates:
```
npx expo lint
npx tsc --noEmit
npm test
npm audit --audit-level=high
```

All must pass. If any test fails because it asserts ghost/held
behavior, update the test to assert the new behavior (long press
removes piece, tray count increments).

## Commit

```
git commit -m "fix: long press returns piece to tray, remove held/ghost state"
```

Report: which lines changed, quality gate results, commit hash.
