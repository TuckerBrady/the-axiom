# DESIGN_SPEC — AXM-031 COGS discovery flight (motion and placement)

| | |
|---|---|
| Mission | AXM-031 |
| Version | 1.0.0 |
| Date | 2026-09-26 |
| APPROVED | Tucker, 2026-09-26, via /design (Design Principle 7): "go with your picks" |
| Canvas | https://claude.ai/artifact/REPcHwy1MrJF9dhGSRE8tx (private) |
| Chosen | Flight **C** (arc + zip), Arrival **C** (look), Codex **B** (dock), Perch **A** (callout side) |
| Parent spec | `Pierce - System Engineer/SPEC_COGS_DISCOVERY_FLIGHT.md` v1.1. That spec is the behaviour; this one is the look and the motion. Where they overlap, this one is the numbers. |

## What and why

When COGS meets something he doesn't recognise, he goes to look at it:

- He zips to a spot beside it along a short arc.
- He peers at it.
- The "???" appears.
- When the Engineer opens the Codex, he rides up with it, and he turns green the moment the entry is filed.

The investigation reads as curiosity (amber). The moment it's filed reads as warmth (green).

## Requirements

### Flight (option C)

- **DR-1 Path.** A quadratic arc from start to perch.
  - The control point sits on the perpendicular bisector of the straight line between them, offset by `0.35 x distance`.
  - It bows toward whichever side has more room to the screen edge (tie: left).
  - If the straight distance is under 48dp, fly straight.
- **DR-2 Timing.** 600ms total, in two segments:
  - **0 to 480ms:** travel along the arc to an overshoot point 6dp past the perch, along the arrival direction. Easing `cubic-bezier(0.2, 0, 0, 1)`, a fast start (the zip).
  - **480 to 600ms:** settle back to the perch, easing `cubic-bezier(0.4, 0, 0.2, 1)`.

  The overshoot never exceeds 6dp, and the overshoot point is clamped inside the screen margins.
- **DR-3 Driver.** JS driver only, on the existing orb host. Parent spec REQ-A clauses apply. A single progress value, interpolated to `left` and `top` through sampled arc points (at least 9 samples), is the expected shape. Nash owns the implementation.
- **DR-4 Colour in flight.** Amber (`COGS_AI_ORB_COLORS.AMBER`) from take-off, per the ruled eye state. It does not change mid-flight.
- **DR-5 Same flight everywhere.** The same DR-1 to DR-2 motion applies whether COGS is flying home to a discovery, from one discovery to the next, or back home at the end. Flying home uses the next step's eye colour, per the parent spec.

### Arrival look (option C)

- **DR-6 Look.** On landing, the 8dp core moves 3dp toward the target's centre (along the unit vector from the orb centre) over 150ms with `bezier(0.4, 0, 0.2, 1)`, then holds 250ms. The ring does not move or scale.
- **DR-7 Release.** At the end of the hold, the "???" caption begins its existing fade-in. The core returns to centre over 150ms at the same time. So the "???" appears 400ms after landing (it previously appeared immediately).
- **DR-8 No new parts.** The look uses only the existing ring and 8dp core. There is no new glyph, eyelid or text.

### During the Codex (option B)

- **DR-9 Dock.** When the Engineer taps to open the Codex (as built), the orb travels with the panel's 600ms slide-up to a dock at the panel's **top-right**:
  - centre at 28dp in from the panel's right edge and 28dp down from its top edge
  - clear of the header text (the canvas drew it top-left; top-right is the locked position, to keep clear of "CODEX · NN")
  - same easing as the panel
- **DR-10 Above the panel.** While docked, the orb renders above the Codex view. Today the Codex covers it. This is still the same single orb host: raise its stacking and don't mount a second orb.
- **DR-11 Filing.** On the collection beat (the parent spec's collection moment, UNDERSTOOD as built), the orb crossfades amber to green over **600ms**, using the existing `orbCollectAnim` with its duration set to 600.
- **DR-12 Undock.** When the panel slides down (600ms, per the parent spec), the orb rides down with it to the perch it left, then takes the DR-5 flight to the next discovery or home.

### Perch (option A)

- **DR-13 Side.** He perches on the side of the target that faces the callout, so the eye runs target, COGS, callout. The fallback order and clearances are the parent spec's `computeDiscoveryPerch`. This spec only fixes option A as the first choice.

### Defaults (not drawn; locked as stated)

- **DR-14 Spotlight on dense boards.** Keep the 64dp minimum spotlight box. On a 12x9 board at 360dp it covers about 2x2 cells, and COGS perches outside the box, not the cell.
- **DR-15 Dim.** Board-piece discovery steps use the existing dim level of 0.45.
- **DR-16 No Kepler or Nova reveal beat.** The five Kepler and Nova discoveries end at the collection beat. There are no new reveal steps and no new COGS lines.

## Doctrine note

The 0.6s cinematic floor applies to COGS's travel (DR-2, DR-9, DR-12) and to the crossfade (DR-11). The
arrival look (DR-6 and DR-7) is a character micro-beat, like the piece-interaction beats (180 to 400ms),
and is declared exempt. The existing sub-floor tutorial beats (portal 180ms, callout 120ms, dim 250ms)
stay out of scope, as in the parent spec.

## Acceptance (Android, 360dp compact)

1. **Screen recording:** the A1-5 IN-tape discovery. It must show the arc, the visible overshoot and settle, the look, and the "???" arriving about 400ms after landing.
2. **Screen recording:** K1-5, the Splitter (a board piece) then the Merger (the tray, via #62's slide), showing a flight from one discovery to the next.
3. **Stills:**
   - perched on the callout side (A1-5)
   - docked amber on the Codex header, with the orb above the panel
   - docked green after UNDERSTOOD
   - back on the perch after the Codex closes
4. **Reduced motion on**, per the parent spec: a fade in place of the flight. The look is skipped and the "???" shows immediately.

## Tests (red first)

These are in addition to the parent spec's list:

- `[DR-1]` The pure arc helper:
  - the control point is at 0.35 x distance on the perpendicular bisector
  - it bows to the side with more room
  - it falls back to a straight line under 48dp
- `[DR-2]` The overshoot point is 6dp past the perch along the arrival direction and clamped inside the margins. The segment durations sum to 600.
- `[DR-6, DR-7]` The look offset is 3dp toward the target centre. The "???" fade is scheduled 400ms after landing, and immediately under reduced motion.
- `[DR-9, DR-10]` A source contract: the docked orb is the same host (no second orb `Animated.View`), and it stacks above the Codex view while docked.
- `[DR-11]` A source contract: the `orbCollectAnim` duration is 600.
- REQ-A-3 recital in the PR body.

## Touch points (pointers only)

`TutorialHUDOverlay.tsx`: `flyOrbTo`, `runStep`, the orb host, the Codex slide and the orb's stacking. A new pure
helper for the arc and overshoot fits next to the parent spec's `src/game/discoveryFlight.ts`.

## Out of scope

- All COGS lines (TBD under the COGS doctrine).
- The Kepler and Nova reveal beats.
- The existing sub-floor tutorial timings.
