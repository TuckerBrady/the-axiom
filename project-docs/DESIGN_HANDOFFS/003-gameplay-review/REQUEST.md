# Request 003 — Gameplay Screen Review

Prepared for Claude Design. Repo: `TuckerBrady/the-axiom` @ `master`
(local dev name `TheTinkerer`).

## Ask

Read the live gameplay experience — the board, piece placement and
interaction, the tape system, the beam animation, and the surrounding
gameplay chrome (tray, spec sheet, requisition, modals) — and produce the
same kind of deliverable as Requests 001 and 002: a locked spec with
numbered findings, grounded in what's actually in the repo, plus `.dc.html`
visual references where a picture earns its place.

This request is scoped deliberately narrower than it sounds. Requests 001
and 002 already settled piece rendering, HUD chrome, color roles, type
scale, and the ship. **Do not re-review those.** This request is about
everything that happens *during a puzzle attempt* that 001 and 002 didn't
already cover: whether the board reads as a machine while it's running,
whether placing and configuring pieces feels good, and whether the tape
system and beam animation actually teach the three-layer model they're
supposed to teach.

## Scope

**Primary screen:**

- `src/screens/GameplayScreen.tsx` — the whole assembly

**Board and placement** (`src/components/gameplay/`):

- `BoardGrid.tsx` — the grid itself
- `BoardPiece.tsx` — a placed piece, including the D-05 overlay chip from
  Request 001 (already implemented — evaluate its on-board legibility now
  that it exists, don't redesign it)
- `PlacementTransition.tsx` — the drag/drop-into-cell interaction
- `WireOverlay.tsx` — the dashed connection-line rendering (locked to render
  on all sectors per `CLAUDE.md` — evaluate execution, not whether it
  should exist)

**Tape system:**

- `TapeBarShell.tsx`, `TapeCell.tsx` — Input/Trail/Output tape rendering
  (colors are locked: IN `#7FC8E8`, TRAIL `#A97FDB`, OUT `#FF7D3F` — do not
  propose new tape colors)
- `BeamOverlay.tsx` — the three-phase CHARGE/BEAM/LOCK signal animation
  (see `project-docs/SPECS/SPEC_BEAM_ANIMATION.md` for the existing spec;
  review execution against that spec, not the phase model itself)

**Tray and economy:**

- `PieceTray.tsx` and `ArcWheel.tsx` / `arcWheelGrouping.ts` — the
  collapsed/expanded tray states (see `docs/COMPUTATIONAL_MODEL.md`, "THE
  EXPANDING TRAY")
- `RequisitionPanel.tsx` — the one-time purchase window before a level
  starts

**Modals and side panels:**

- `GameplayModals.tsx` — success/failure/consequence modals
- `SpecSheetPanel.tsx` — the mission dossier panel accessible mid-level

**Required reading before forming findings:**

- `docs/COMPUTATIONAL_MODEL.md` — "THE SOUL OF THE GAME" section is
  load-bearing: the game is not an optimization puzzle, scoring rewards
  elaborate machines, and every design decision must encourage the player
  to build bigger, not smaller. A finding that would push players toward
  minimal solutions (visually rewarding fewer pieces, cramping the board at
  larger machine sizes, etc.) is itself a bug.
- `docs/ANIMATION_RULES.md` — REQ-A-1/A-2 single-host invariant for
  native-driven animated values. Any finding proposing an animation change
  must specify whether it's JS-driven (`useNativeDriver: false`, required
  for all piece animations per `CLAUDE.md`) and must not propose swapping
  an `Animated.View` host across a conditional render branch.
- `project-docs/SPECS/SPEC_BEAM_ANIMATION.md` — the existing beam animation
  spec.
- `project-docs/SPECS/SPEC_SIGNAL_ENGINE.md` — how the engine models signal
  flow, for grounding what the beam animation is actually representing.
- `docs/TEACHING_PROGRESSION.md` — what the board is teaching at each
  sector, so findings about clarity connect to a real learning goal, not
  taste.
- `CLAUDE.md` at repo root: Design Principles (never violate), Engine
  Gotchas section (Config Node reads Data Trail not Input Tape, Protocol
  pieces are straight-through only, Data Trail values persist across
  pulses and initialize null not 0, etc. — get these right when describing
  what a finding's board state means).

## What's already decided — do not relitigate

- Amber (`#F0B429`) = Physics beam only, cyan (`#00D4FF`) = Protocol beam
  only. Locked by Request 001, D-03/D-04.
- Tape colors: IN `#7FC8E8`, TRAIL `#A97FDB`, OUT `#FF7D3F` — locked.
- Wire rendering (dashed connection lines) renders on **all** sectors —
  never suppress it.
- Placement highlights (orange valid-cell indicators) render on **Axiom
  sector only** — never add them elsewhere.
- Dynamic board sizing: `BOARD_SIZE = SCREEN_WIDTH - 24`,
  `CELL_SIZE = BOARD_SIZE / numColumns`. Never propose a fixed cell size.
- Three-phase beam animation: CHARGE / BEAM / LOCK. This structure is
  locked; findings can address execution (timing, legibility, color) not
  the phase model itself.
- Long press on a placed piece returns it directly to the tray — no
  ghost/held intermediate state. Don't propose one.
- Only Conveyor rotates on tap. Config Node tap cycles its value, Latch tap
  toggles its mode. No other piece has a tap action.
- HUD chrome (corner brackets) belongs on tactical/operational screens —
  the gameplay screen qualifies, onboarding/personal screens don't. This
  request's screens are exactly where HUD chrome is supposed to live.
- The expanding tray, one-time requisition window, and the credit economy
  rewarding bigger machines (docs/COMPUTATIONAL_MODEL.md) are foundational
  and not up for redesign — only for legibility/execution findings.

## What we want back

Same shape as Requests 001 and 002:

1. A `REVIEW.md` (or similarly named locked spec) — numbered findings, each
   with: observed behavior, why it's a problem (tie it to the doc bible,
   the teaching goal, or a concrete on-device failure — not taste), the
   specific change, and how to verify the fix.
2. `.dc.html` visual references as needed — the board mid-run, the tape row
   during a beam pulse, the tray in both collapsed/expanded states, at true
   device sizes. Note fidelity per element (hi-fi exact values vs. lo-fi
   blueprint), same convention as prior rounds.
3. A short README indexing the bundle, priority order, and the repo files
   each finding touches — same format as Round 001's.

## Explicitly out of scope

- **Piece icon rendering, HUD chrome styling, color-role assignment, type
  scale.** Settled by Request 001. Reference those tokens as ground truth.
- **Onboarding, COGS presentation, character/discipline screens.** That's
  Request 002's scope, in progress separately.
- **The ship, hub screen.** Settled by Request 001 (ship canon).
- **No new COGS dialogue.** Not one line — this screen has COGS-adjacent
  moments (post-level dialogue, mid-level hints) but the dialogue system
  itself is out of scope; flag presentation issues around existing lines,
  don't write new ones.
- **No new player-facing copy.** Design Principle 2 requires Tucker's
  sign-off on any text change; flag, don't rewrite.
- **No changes to scoring math, the credit economy, or level design.**
  This is a presentation/interaction review of the existing systems, not a
  systems-design review. If a presentation finding seems to require a
  systems change, say so explicitly and stop there — don't propose the
  systems change yourself.
- **No new screens.** If the flow is missing a real state (e.g., an
  unrendered failure case), that's a finding against an existing screen,
  not a proposal for a new one.

## Context Tucker gave directly

Requests 001 and 002 covered the pieces/HUD/ship and the onboarding/COGS
introduction respectively. This is the third and largest remaining surface:
the actual moment-to-moment experience of playing a level. Tucker wants to
know whether the board, the tape system, and the beam animation are
successfully teaching the three-layer computational model in the moment a
player is most engaged — not just whether individual elements look right in
isolation.
