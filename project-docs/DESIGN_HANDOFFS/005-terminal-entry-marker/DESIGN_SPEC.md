# DESIGN_SPEC — AXM-029 Terminal entry marker

| | |
|---|---|
| Mission | AXM-029 (Directional Terminal), PR 3 of 3: the PieceIcon marker |
| Version | 1.0.0 |
| Date | 2026-09-26 |
| APPROVED | Tucker, 2026-09-26, via /design (Design Principle 7) |
| Canvas | https://claude.ai/artifact/TEDwxk3a4RiTM3sanvjJ3K (private; board "Options", column C) |
| Chosen option | **C, Port socket** |
| Parent spec | `Pierce - System Engineer/SPEC_DIRECTIONAL_TERMINAL.md` v1.0, section 6 |
| Design system | https://claude.ai/artifact/EaHveGcVoUt5auA5U9BnEn (tokens by name) |

## What and why

A directional Terminal shows its one entry side as a **port socket**: the Terminal's outer ring opens on
that side, and a short solid socket runs from the ring to the cell edge. It borrows the port language
the Gear's teeth already use, and it does not rely on colour. It reads at the smallest cell in the game
because it uses the margin between the icon and the cell edge, not the icon interior.

## Geometry reference

All values are relative to the **cell** (`c` = the board's CELL_SIZE for that level), measured in the
cell's own frame with the entry side drawn on the **left**. The other sides are this drawing rotated
about the cell centre: top = 90°, right = 180°, bottom = 270°. `entrySide` is in the board frame
(parent spec 1.x).

The Terminal glyph itself is unchanged: an icon of `(c - 4) x 0.60`, centred, in the 40-unit PieceIcon
space. Let `s = 0.6 x (c - 4) / 40` (px per icon unit) and `R = 16s` (outer ring radius in px).

## Requirements

- **DR-1 Gate on the prop.** The marker renders only when the Terminal has `entrySide`. With
  `entrySide` absent, Terminal rendering is pixel-identical to today (parent 6.1).
- **DR-2 Ring gap.** On the entry side, the outer ring's stroke is omitted over the arc where the
  perpendicular distance from the cell centre line is under `0.075c`. That makes the gap `0.15c`
  tall, centred on the entry axis. The ring's body fill (`pieceBody`) is unchanged and stays a full
  disc. The inner ring, core dot and the four corner ticks are unchanged.
- **DR-3 Socket.** A solid bar, filled in the Terminal's stroke colour (`lockGreen` on the board,
  as BoardGrid passes it; `green` wherever PieceIcon draws the Terminal in its own colour).
  - **Span:** from `0.02c` in from the cell edge on the entry side, inward to the outer ring's
    stroke. It overlaps the ring by one ring stroke width (`2s`), so socket and ring read as one piece.
  - **Height:** `0.15c`, matching the DR-2 gap exactly, centred on the entry axis.
  - **Corner radius:** `0.015c`.
- **DR-4 Channel.** A recess drawn over the socket, filled `pieceCore`:
  - `0.05c` tall, centred on the entry axis.
  - Starts at the same outer end as the socket and stops `0.02c` short of the socket's inner end.

  The channel is what makes it read as a socket rather than a stub, and it is the non-colour cue.
- **DR-5 Worked values.** These must match within 0.5px:

  | Cell `c` | Socket height | Channel height | Ring gap |
  |---|---|---|---|
  | 32 (K1-7, 10x8 at 360dp) | 4.8px | 1.6px | 4.8px |
  | 26 (12x9 at 360dp, the smallest) | 3.9px | 1.3px | 3.9px |

  The socket spans from x = 0.64px to the ring at about 10.1px (c = 32).
- **DR-6 Static.** No animation of any kind on the marker: no `Animated.Value`, no native driver,
  no opacity or scale change during CHARGE, BEAM or LOCK, and no change on a locked Terminal or on a
  wrong-side arrival. The Terminal's existing lock animation and BoardPiece's 2px locked border still
  run as today (REQ-A-1 to REQ-A-3 unchanged).
- **DR-7 Not colour alone.** In greyscale, the entry side must remain identifiable by shape: the ring
  gap, the socket and the channel. No new colour token is introduced.
- **DR-8 Stacking.** The marker draws above the cell ground and below any dashed or lit wire that
  enters the cell. A wire arriving on the entry side meets the socket's outer end.
- **DR-9 Bounds.** Nothing draws outside the cell. The socket's outer end sits `0.02c` inside the
  cell edge, so neighbouring cells never overlap.
- **DR-10 Scope.** Only the board rendering changes. The Codex Terminal icon and any tray or dossier
  icon stay omnidirectional. The Codex addendum image is out of scope for this spec.

## Acceptance criteria (device screenshots, 360dp compact)

1. **Each side.** A directional Terminal with each of the four `entrySide` values shows the gap and
   socket on that side, on a 10x8 board (32px cells). A throwaway fixture level is acceptable,
   since no shipped level may set `entrySide` before this merges (parent 6.4).
2. **Smallest cell.** The same Terminal on a 12x9 board (26px cells). The socket and channel must
   still be visible at 100% zoom.
3. **Unchanged Terminal.** A Terminal without `entrySide`, compared before and after the change,
   must be identical.
4. **Wired.** A dashed wire entering on the entry side, and the same after LOCK, with the marker
   unchanged by the lock.
5. **Greyscale.** A greyscale copy of shot 1, where the side must still be identifiable.

## Tests (red first)

From parent spec 11, `__tests__/unit/components/PieceIcon.terminalEntry.test.tsx`:

- `[6.1 / DR-1]` Snapshot guard. A Terminal without `entrySide` renders the same tree as before.
- `[DR-1]` For each of the four `entrySide` values, a marker element renders with testID
  `terminal-entry-<side>`.
- `[DR-2, DR-3, DR-5]` At c = 32 and c = 26, the socket height is `0.15c`, the gap equals the socket
  height, and the socket's inner end overlaps the ring by `2s`, all within 0.5px.
- `[DR-4]` The channel exists, is `0.05c` tall, and is filled with the `pieceCore` token.
- `[DR-6 / 6.3]` Rendering a directional Terminal constructs zero `Animated.Value`s attributable to
  the marker.
- `[DR-9]` All marker geometry lies within `[0, c]` on both axes.

## Touch points (pointers only; Nash owns the implementation)

- `src/components/PieceIcon.tsx`, the Terminal case.
- `BoardPiece` / `BoardGrid`. The socket lives in the cell margin, outside the icon's `(c - 4) x 0.6`
  box, so the marker probably needs the cell size and cannot sit purely in icon space. Choose the
  host that keeps DR-1 pixel-identical.

## Out of scope and open items

- The Codex addendum text and image, and the COGS `terminal_wrong_side` line: TBD under the COGS
  doctrine (parent 5.5 and 7).
- **Parent 6.4** asked for a prototype in `design/mockups/`. The approved canvas plus this spec,
  committed to `project-docs/DESIGN_HANDOFFS/005-terminal-entry-marker/`, satisfies it; no separate
  mockup file is needed.
- Enabling `entrySide` on K1-7, K1-8 and K1-10 stays in PR 3 and waits on AXM-026.
