# DESIGN_SPEC: AXM-037, Source and Terminal sockets

| | |
|---|---|
| Mission | AXM-037 (TestFlight build 49, notes 16 and 19) |
| Version | 1.0.0 |
| Date | 2026-09-26 |
| APPROVED | Tucker, 2026-09-26, via /design (Design Principle 7) |
| Canvas | https://claude.ai/artifact/BcNEKxyPzcyyCYKMQxywk7 (private), board "Option B" |
| Chosen option | **B: Socket on connect** |
| Builds on | `DESIGN/AXM-029-terminal-entry-marker/DESIGN_SPEC.md` v1.0 (the directional Terminal port socket). Its DR-2 to DR-5 geometry is reused as-is. |
| Design system | https://claude.ai/artifact/EaHveGcVoUt5auA5U9BnEn (tokens by name) |

## What and why

Tucker's notes:
- "There is no socket on the terminal for A1-1."
- "This terminal piece needs to have the socket; we should probably update the source to have outlet sockets as well."

Every other piece shows its ports (the Conveyor rollers, the Splitter magnets); the Source and Terminal show none. Under option B:
- A Terminal shows the AXM-029 port socket on every side where a wire enters it.
- A Source shows an outlet socket on every side where a wire leaves it.
- A directional Terminal (`entrySide`) always shows its one socket, exactly as AXM-029 locked it, whether or not it is connected.

## Requirements

- **DR-1 Source of truth.** The connected sides are derived from the same wire set the board already draws: `autoConnectPhysicsPieces` (`src/game/engine.ts:164`) and its WireOverlay consumers. For each piece:
  - A socket shows on side X of a Terminal if and only if a wire ends at that Terminal and arrives through side X.
  - An outlet shows on side X of a Source if and only if a wire starts at that Source and leaves through side X.
  - No second connection model may be introduced.
- **DR-2 Terminal socket geometry.** This is identical to AXM-029 DR-2 to DR-5: ring gap `0.15c`; socket `0.15c` tall, running from `0.02c` inside the cell edge to the outer ring and overlapping it by one ring stroke `2s`; channel `0.05c` in `pieceCore`; corner radius `0.015c`. The fill is the Terminal's stroke colour (`lockGreen` on the board). Build ONE shared socket renderer and use it for both AXM-029 and AXM-037. Do not duplicate it.
- **DR-3 Source outlet geometry.** It uses the same bar and ring gap as DR-2, with these differences:
  - **Fill:** `amber`, the Source stroke colour.
  - **Channel:** `0.05c` in `pieceCore`. It starts `0.035c` from the open (outer) end and stops `0.02c` short of the inner end.
  - **Notch:** an outward chevron at the open end, a triangle `0.045c` deep spanning the full `0.15c` socket height, filled `void`.

  The notch is the non-colour cue that tells an outlet (Source) from a socket (Terminal).
- **DR-4 Directional Terminal.** With `entrySide` set, the Terminal renders exactly as AXM-029 specifies: one socket on `entrySide`, always, static. A wire arriving on a non-entry side adds no socket there. AXM-029's wrong-side handling is unchanged.
- **DR-5 Unconnected.** An omnidirectional Terminal or a Source with no wire at a side renders that side exactly as today, with no gap and no socket. A board with no connections must be pixel-identical to master.
- **DR-6 Appear and retract.** When a side becomes connected or disconnected (a neighbour is placed, removed or rotated), the socket extends or retracts along its own axis:
  - Extending from the ring outward takes 150ms with `Easing.out(Easing.cubic)`.
  - Retracting takes 100ms.
  - These are the Splitter magnet timings (`PieceIcon.tsx` magnet effect). They are a piece interaction beat, not UI motion, so the 0.6s cinematic floor does not apply.
  - Use `useNativeDriver: false`.
  - Each of the four side sockets has one persistent host that is always mounted (length and opacity driven to 0 when retracted). Never `{connected && <Animated...>}` (REQ-A-1 to REQ-A-3).
  - A directional Terminal's socket does not animate (AXM-029 DR-6).
- **DR-7 No beam-phase animation.** Sockets do not change during CHARGE, BEAM or LOCK. The Terminal lock rings, the Source charge rings and BoardPiece's locked border all run unchanged.
- **DR-8 Not colour alone.** In greyscale, a socket, an outlet and an unconnected side must each be identifiable by shape: the ring gap, the channel, and the outlet's notch.
- **DR-9 Stacking and bounds.** Sockets draw above the cell ground and below any wire entering the cell, and a wire meets the socket's outer end (as AXM-029 DR-8). Nothing draws outside the cell (AXM-029 DR-9).
- **DR-10 Scope.** Only the board rendering changes. Codex, tray and dossier icons for the Source and Terminal stay as they are.

## Acceptance criteria (device screenshots, 360dp compact)

1. A1-1, solved: a Source outlet on the side toward the first Conveyor, and a Terminal socket on its fed side.
2. The same Terminal fed from above (a fixture or a Kepler board): the socket is on top.
3. A level start with nothing placed: the Source and Terminal render as they do on master.
4. The smallest board (26px cells): the socket, the outlet notch and both channels are visible at 100% zoom.
5. A directional Terminal (AXM-029 fixture): one static socket, identical to AXM-029's acceptance shot.
6. A greyscale copy of shot 1.
7. A short screen recording of placing and removing the last Conveyor before the Terminal, showing the socket extend and retract.

## Tests (red first)

- `[DR-1]` A pure helper (for example `getEndpointSocketSides(pieces, wires)`) returns the connected sides per Source and Terminal. Unit-test it on:
  - A1-1's solved layout
  - a Terminal fed from above
  - no wires
  - a Source with two outgoing wires, if the engine allows one
- `[DR-2, DR-3]` At c = 42 and c = 26: socket height `0.15c`, channel `0.05c`, ring overlap `2s`, outlet notch depth `0.045c`, all within 0.5px. The testIDs are `endpoint-socket-<piece>-<side>`.
- `[DR-4]` A directional Terminal renders exactly one socket on `entrySide` even with a wire on another side. The existing AXM-029 marker tests still pass unchanged.
- `[DR-5]` Snapshot guard: an unconnected Source and Terminal render the same tree as master.
- `[DR-6]` The socket host is mounted in both states. The animated value is created once per side. No `useNativeDriver: true` is added, and `__tests__/lint/nativeDriverHostUniqueness.test.ts` passes.
- `[DR-9]` All socket geometry lies within `[0, c]`.

## Touch points (pointers only)

- `src/components/PieceIcon.tsx`, the Source and Terminal cases. The AXM-029 marker lives here or in BoardPiece; share the renderer.
- `src/components/gameplay/BoardPiece` / `BoardGrid`. The socket sits in the cell margin, so it needs the cell size.
- `src/game/engine.ts:164` `autoConnectPhysicsPieces` / `WireOverlay.tsx`, as the connection source.

## Build plan

The AXM-029 marker is NOT on master yet (checked 2026-09-26, origin/master 5c2a969). It is built in the same package as this spec, with one shared socket renderer: AXM-036 Morph package **P12**, run on lane C after P1 merges, because P1 also edits `PieceIcon.tsx`. The rest of AXM-029 PR 3 (Codex, the COGS `terminal_wrong_side` line, enabling K1-7/8/10) stays with AXM-029.

## Out of scope and open items

- AXM-029 PR 3's enabling of `entrySide` on K1-7, K1-8 and K1-10 follows its own spec.
- Codex art for the Source and Terminal.
- No COGS copy is needed.
