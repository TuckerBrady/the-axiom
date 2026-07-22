# Tray to Arc Wheel — Player-Facing Terminology Rename

Sprint 18A — All Departments

---

## Decision

The "tray" was replaced by the Arc Wheel in Phase B (Piece Selector).
All player-facing references to "tray" MUST be updated. Internal code
variable names are deferred to a post-MVP cleanup sprint.

---

## Scope: Player-Facing Only (MVP)

### Tutorial Messages (src/game/levels.ts)

| Level | Current Text | Fix |
|-------|-------------|-----|
| A1-1 | "Tap a piece in the tray to select it. Then tap the grid to place it between Source and Terminal." | Rewrite for Arc Wheel interaction |
| K1-3 | "Something in the tray solves this without the signals being aware of it." | Replace "tray" with "wheel" or remove container reference |

### Tutorial targetRefs (src/game/levels.ts)

K1-1 REQUISITION tutorial steps use `targetRef: 'tray'` for the store
intro sequence (4 steps). These need to target the correct UI element
now that the tray is an Arc Wheel on Axiom levels and a REQUISITION
panel on Kepler levels.

### COGS Dialogue

Any new COGS lines being written (Kepler v2 specs) MUST NOT reference
"tray." Use "the wheel," reference pieces directly, or omit the
container name entirely.

### Design Documentation

These files reference "expanding tray" as a player concept:

- CLAUDE.md (lines 11, 13, 15, 19, 193, 283)
- docs/COMPUTATIONAL_MODEL.md (lines 28-29, 44-46, 51-56, 88-103)
- docs/LEVEL_DESIGN_FRAMEWORK.md (lines 46-47, 94-103)
- docs/PIECE_CREATION_STANDARD.md (line 18)

Update terminology in next doc revision pass.

---

## Out of Scope (Post-MVP)

Internal code rename (~230 references):

- Variable names: `trayPieceTypes`, `trayCosts`, `trayAffordable`
- Component: `PieceTray.tsx` (entire file)
- Scoring: `splitPurchased()` references to "tray-supplied"
- Style keys: `partsTray`, `trayItem`, `trayBadge`, etc.
- Test descriptions and test data (~50+ scoring tests)
- Internal specs and briefs

These are invisible to the player and functionally correct. Rename
in a dedicated refactor sprint after MVP ships.

---

## Instructions by Department

**SE:** All Kepler v2 level specs MUST use Arc Wheel terminology,
not "tray." Floor solve descriptions should reference "the wheel"
or "available pieces," never "the tray."

**Dev:** When implementing Kepler v2 specs, also fix the two
player-facing tutorial messages listed above. Update targetRefs
as needed.

**QA:** Flag any player-facing string that references "tray" as
a blocker. Internal variable names are NOT blockers for MVP.
