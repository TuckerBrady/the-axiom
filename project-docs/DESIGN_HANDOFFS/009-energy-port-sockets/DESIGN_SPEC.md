# DESIGN_SPEC: AXM-044, Energy port sockets (with AXM-043 Codex art)

| | |
|---|---|
| Mission | AXM-044 (socket look upgrade), AXM-043 (Codex Source/Terminal art) |
| Version | 1.0.0 |
| Date | 2026-09-27 |
| APPROVED | Tucker, 2026-09-27, via /design (Design Principle 7) |
| Canvas | https://claude.ai/artifact/G35eG3zKTUh2up5hhtwHQf (private), artboard "AXM-044 Sockets" |
| Chosen option | **S3: Energy port** |
| Supersedes | `DESIGN/AXM-037-source-terminal-sockets/DESIGN_SPEC.md` DR-2, DR-3 (bar geometry) and DR-10 (scope). AXM-037 DR-1, DR-4 to DR-9 stay in force. AXM-029 DR-2 to DR-5 geometry is replaced by DR-2 below for the Terminal. |
| Design system | https://claude.ai/artifact/EaHveGcVoUt5auA5U9BnEn |

## What and why

Tucker, build 51: the sockets work and the idea is solid, but they look basic. S3 replaces the flat bar with an
energy port: a half-disc aperture on the cell edge. The Source port has a filled core (it emits); the Terminal port
has a hollow core (it receives). The same renderer draws the Codex art, which AXM-037 DR-10 had excluded.

Under AXM-041 every Terminal will be single-entry. This spec draws a directional Terminal's port on `entrySide`
from level start (AXM-037 DR-4). Setting `entrySide` on each level is AXM-041's job, not this one.

## Requirements (c = cell size, geometry relative to the cell box)

- **DR-1 One renderer.** Keep ONE shared endpoint-socket renderer (`EndpointSockets.tsx` / `endpointSocketGeometry.ts`)
  and change its drawing. The board, the Codex field simulation and the Codex chips all use it. No second copy.
- **DR-2 Aperture.** A half-disc centred on the midpoint of the port's cell edge, opening into the cell:
  radius `0.153c`, fill `pieceCore`, stroke `0.028c` (min 1px) in the endpoint colour (Source `amber`, Terminal
  `lockGreen` on the board, `green` in Codex icons).
- **DR-3 Core.** A circle centred on the same edge midpoint, radius `0.0625c` (min 2.5px):
  - Source: filled `amber`.
  - Terminal: hollow, stroke `0.022c` (min 1px) `lockGreen`, interior `pieceCore`.
  Filled versus hollow is the non-colour cue for emit versus receive (DR-8 of AXM-037).
- **DR-4 Inner arc.** One arc concentric with the aperture, radius `0.111c`, stroke `0.017c` (min 1px), endpoint
  colour at opacity 0.6 (not below the 0.45 D-02 floor), spanning the aperture's inner side.
- **DR-5 Clip.** Aperture, core and arc are clipped to the cell box: the half of the core that falls outside the
  edge is not drawn (AXM-029 DR-9, AXM-037 DR-9). Wires meet the aperture's outer edge.
- **DR-6 When shown.** Unchanged from AXM-037: Source port on each side a wire leaves; Terminal port on each fed side;
  a directional Terminal shows exactly one port on `entrySide`, always, static.
- **DR-7 Motion.** Unchanged from AXM-037 DR-6: extend (scale the port radius from 0) 150ms `Easing.out(Easing.cubic)`,
  retract 100ms, `useNativeDriver: false`, one persistent host per side, never conditionally mounted. No beam-phase
  animation (AXM-037 DR-7).
- **DR-8 Small cells.** At c = 26 the filled Source core and the hollow Terminal core must be distinguishable at 100%
  zoom; the min px values in DR-2 to DR-4 exist for this. If the hollow core closes up, the min values win.
- **DR-9 Codex (AXM-043).** The Codex Source and Terminal art shows ports:
  - Field Simulation diagram: Source port on its outgoing side, Terminal port on its fed side, same renderer.
  - ALSO CATALOGUED chips and the Codex detail header icon for Source and Terminal: one port each (Source right,
    Terminal left), scaled to the icon.
- **DR-10 Unconnected.** An omnidirectional Terminal or Source with no wire at a side draws nothing there.

## Acceptance (device screenshots, 360dp)

1. A1-1 solved: Source port (filled core) toward the first Conveyor; Terminal port (hollow core) on its fed side.
2. A directional Terminal fixture, nothing placed: one port on `entrySide`.
3. Smallest board (26px cells): filled and hollow cores distinguishable at 100%.
4. Greyscale copy of shot 1.
5. Codex Conveyor entry: Field Simulation and ALSO CATALOGUED chips show ports.
6. Codex Source and Terminal entries: header icons show ports.
7. Screen recording: place and remove the last Conveyor before the Terminal; port extends and retracts.

## Tests (red first)

- `[DR-2..DR-4]` Geometry at c = 72, 42, 26: aperture r, core r, arc r and strokes within 0.5px, min px applied at 26.
- `[DR-3]` Source core has a fill and no hollow interior; Terminal core has stroke and `pieceCore` interior.
- `[DR-5]` All drawn geometry within `[0, c]` after clip.
- `[DR-1, DR-9]` Codex FieldSimulation and chip components render the shared renderer (testIDs
  `endpoint-socket-<piece>-<side>`); no second socket drawing exists (source grep).
- `[DR-7]` Existing AXM-037 host tests (`HF1.endpointSocketHost`, `nativeDriverHostUniqueness`) pass unchanged.

## Touch points (pointers only)

`src/components/gameplay/EndpointSockets.tsx`, `src/components/gameplay/endpointSocketGeometry.ts`,
`src/game/endpointSockets.ts`, the Codex detail / field simulation components, `PieceIcon.tsx` Source and Terminal
cases for the Codex chips.

## Out of scope and open items

- AXM-041: per-level `entrySide`, Codex entry and `terminal_wrong_side` COGS line.
- AXM-045: Scanner/Transmitter as Source/Terminal upgrades may change the port art later.
- Beam-phase glow on the port (not requested).
