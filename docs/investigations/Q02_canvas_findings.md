# Q-02: Canvas/Board Rendering Investigation Findings
### 2026-04-13 | Read-only audit | No code changes

---

## TL;DR

1. **A1-1 specific or universal:** The rendering system is universal — all levels share the same `GameplayScreen.tsx` render path. A1-1 has no unique code path. However, A1-1's recent geometry change (vertical layout: Input at col 4 row 1, Output at col 4 row 5, gridHeight 8) means the board is taller than most levels, which may trigger the `MIN_CELL = 58` floor on smaller devices, causing the board to overflow its container. This is a layout clamp issue, not A1-1-specific rendering code.

2. **Most likely component:** The CELL_SIZE dynamic calculation (line 506-508). When `MIN_CELL` (58) forces cells larger than the available space can hold, `gridH = numRows * CELL_SIZE` exceeds `canvasLayout.h`, and the board overflows the `canvasOuter` container. This is a layout clamp issue that became more visible after the non-linear redesign increased grid heights (A1-1 from 7 to 8 rows, A1-3 from 7 to 8 rows).

3. **Confidence:** MEDIUM. The static analysis is consistent with a layout overflow bug, but without device testing the exact visual symptom (clipping, overlapping, or blank area) is unconfirmed.

---

## Board Render Tree

The board renders inside `GameplayScreen.tsx` (single file, no separate board component). Actual render tree from the canvas View (line 1373):

```
<View ref={boardGridRef} style={[styles.canvas, { width: gridW, height: gridH }]}>
  ├─ <Svg absoluteFill>                    (z-implicit: base layer)
  │   ├─ Grid dot circles                  (Array.from numRows+1 x numCols+1)
  │   └─ Wire connection lines             (wires.map — dashed lines)
  │
  ├─ <Animated.View absoluteFill z=5>      (Ghost beams — conditional)
  │   └─ <Svg absoluteFill>
  │       └─ Rect per tape-interacting piece
  │
  ├─ <View absoluteFill z=20>              (Signal beam overlay)
  │   └─ <Svg absoluteFill>
  │       ├─ Charge rings (during charge phase)
  │       ├─ Trail polylines (trailSegments + branchTrails)
  │       ├─ Beam heads (beamHeads array)
  │       ├─ Void pulse circle
  │       └─ Lock rings
  │
  ├─ Piece Pressables (absolute positioned) (z=0, per piece)
  │   └─ <PieceIcon> inside rotation wrapper
  │
  └─ Ghost cell overlays (conditional)     (placement highlights, Axiom only)
```

**Divergence from expected:** Tape strips are NOT inside the canvas — they render ABOVE the canvas in a separate `tapeSection` View. This is correct per the design. Connection lines render inside the same base SVG as grid dots, not in a separate layer.

---

## A1-1 vs Other Levels

**Config shape comparison:**

| Field | A1-1 | A1-2 | Difference |
|-------|------|------|------------|
| gridWidth | 8 | 8 | Same |
| gridHeight | 8 | 7 | A1-1 is taller |
| prePlacedPieces | 2 (input, output) | 2 (input, output) | Same count |
| inputTape | undefined | undefined | Same (no tape) |
| dataTrail | empty | empty | Same |
| sector | 'axiom' | 'axiom' | Same |

A1-1 uses `gridHeight: 8` (increased from 7 in the non-linear redesign). This is the tallest non-tape Axiom level. With `MIN_CELL = 58`, the board height = `8 * 58 = 464px`. On a 390x844 device, after header (~110px) and tray (~80px), available canvas height is ~650px. `464 < 650` so it should fit. But on smaller devices (360x640), available height drops to ~450px, and `464 > 450` — overflow.

**Tutorial-specific code:** Lines 377-488 set up tutorial hints and steps. These are data-driven (read from `level.tutorialSteps`) with no A1-1-specific render branching. Placement highlights (copper cells showing valid placement) are gated on `level.sector === 'axiom'` (line 1623), affecting all Axiom levels equally.

**No A1-1-specific render path exists.** Any visual defect on A1-1 would also appear on any level with gridHeight >= 8 on the same device.

---

## Audit Subsections

### Pieces
Pieces render as `Pressable` elements with absolute positioning (line 1547-1612). Position: `gridX * CELL_SIZE + offset`. No piece type has a missing case in PieceIcon — the switch has a `default:` fallback (renders a generic rect). Config Node recently changed to amber state-driven color with a configValue badge — this is handled correctly per the PieceIcon case.

**No defect found in piece rendering.**

### Connection Lines
Wires render inside the base SVG layer (line 1389-1433). The `level.sector === 'axiom'` gate was removed in commit `7ce3fcb` — wires now render on all levels. Wire direction uses `getOutputPorts`/`getInputPorts` to determine fromPieceId/toPieceId. Handles the case where `fromPiece` or `toPiece` is null (returns null, skips rendering).

**No defect found. Diagonal connections not possible** — pieces are always grid-adjacent, so all lines are horizontal or vertical.

### Tape Strips
Tape section renders ABOVE the canvas (line 1266) conditioned on `level.inputTape && level.inputTape.length > 0`. A1-1 through A1-4 have no inputTape — no tape strips render. A1-5+ renders IN/OUT/TRAIL strips. The `tapeSection` has `flexShrink: 0` (added in commit `02b3f6f`) preventing compression.

**No defect found for A1-1** (no tapes). For tape levels, the strips reduce available canvas height, which could contribute to CELL_SIZE clamping on smaller devices.

### Ghost Beams
Ghost beams ARE implemented (commit `8ccca84`). They render as a `Animated.View` with `zIndex: 5` and `ghostBeamStyle` driving opacity via reanimated `useSharedValue`. Ghost beams only appear during execution (`ghostBeamOp` starts at 0, fades to 0.2 on ENGAGE). They are NOT gated behind a feature flag — they render universally when tape-interacting pieces exist. A1-1 has no Scanner/ConfigNode/Transmitter on the board, so ghost beams never activate.

**No ghost beam defect on A1-1.** No partial implementation — the feature is complete.

---

## Existing TODOs / FIXMEs / HACKs

Only one found in the canvas file: line 2093 shows `DEBUG (50 CR)` text for a debug button in the void overlay — this is intentional dev tooling, not a bug marker.

**No in-code acknowledgment of a canvas rendering bug.**

---

## Recent Commits (21 days) Touching Board Render

15 commits touched `GameplayScreen.tsx` in the last 21 days. Most significant for canvas rendering:

| SHA | Subject | Canvas Impact |
|-----|---------|---------------|
| `2f6410e` | Non-linear board layouts | Changed A1-1 gridHeight 7→8, moved port positions |
| `02b3f6f` | Layout fixes — label truncation, canvas overlap, node margins | Added `flexShrink: 0` to tapeSection, increased CANVAS_PAD 16→20 |
| `8ccca84` | Ghost beams | Added ghost beam SVG layer at zIndex 5 |
| `7ce3fcb` | Dashed connection lines on all levels | Removed `sector === 'axiom'` gate from wire rendering |
| `82f6909` | Wrong output diagnostic modal | Added showWrongOutput state gating |
| `c497f68` | Bible compliance — neon colors, A1-4 obstacle | Changed tape cell colors to neon tokens |

**The non-linear redesign (2f6410e) is the most likely regression source.** It changed grid dimensions for multiple levels, potentially pushing boards past the MIN_CELL clamp on smaller screens.

---

## Reproduction Hypothesis

**Most likely reproduction:** Mount A1-1 on a 360x640 device (common Android). With gridHeight=8 and MIN_CELL=58, the board demands 464px vertical but only ~450px is available. The board canvas overflows the `canvasOuter` container. Since `canvasOuter` does NOT have `overflow: 'hidden'`, the board bleeds into the tray area below or gets clipped by the SafeAreaView.

**Secondary hypothesis:** On any tape-enabled level (A1-5+) on a smaller device, the tape section (3 strips * ~30px each = ~90px) plus the board height (at MIN_CELL=58) may exceed the viewport, causing overlap between tapes and the board grid.

**Component:** `canvasOuter` style (line 2716) — `flex: 1` container without overflow control. The `CELL_SIZE` calculation (line 506) should enforce `availH / numRows` as the upper bound, but `MIN_CELL = 58` overrides this floor, making the board larger than the space allows.

**Fix scope:** Either lower MIN_CELL to 48 (fits on 360px screens) or add `overflow: 'hidden'` to canvasOuter and let the board clip cleanly.

---

## Routing Recommendation for Prompt 8

**Prompt 8 can proceed as planned.** The Q-02 canvas issue is a universal layout clamp problem, not A1-1-specific rendering code. A1-1's tutorial redesign (which changes tutorial steps, copy, and possibly board geometry) does not interact with the CELL_SIZE calculation or the canvas overflow behavior. The fix (adjusting MIN_CELL or adding overflow clipping) is independent of tutorial content and can ship in a parallel fix prompt without blocking Prompt 8.

If Prompt 8 changes A1-1's gridHeight, it should keep it at 8 or lower to avoid worsening the clamp issue on small devices.

---

END OF FINDINGS
