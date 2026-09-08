# Handoff: The Axiom — Ship Canon, Piece & HUD Design Review

Prepared 2026-09-07 for TuckerBrady/the-axiom @ master.

## Overview

Two bodies of work, both grounded in a read of the actual repo:

1. **Ship canon.** The repo shipped three unrelated ship geometries. This
   handoff replaces them with one canonical vessel — final proportions,
   registration, eight repair-zone coordinates, and a three-value repair-state
   rule. Decisions are locked; see `AXIOM_SHIP_CANON.md`.
2. **Piece / board / HUD review.** Eleven numbered findings against
   `PieceIcon.tsx` and `src/components/gameplay/*`, each with observed
   behavior, consequence, the specific change, and a test. See
   `AXIOM_DESIGN_REVIEW.md`.

**Read the two spec files first. They are the deliverable.** The HTML files in
this bundle are visual references that support them.

## About the design files

The `.dc.html` files here are **design references authored in HTML** — audits
and blueprints, not production code and not React Native components. Do not
port them. The Axiom is an Expo / React Native app; every change described in
the specs lands in the existing TSX components named in each finding, using the
app's existing patterns, `src/theme/tokens.ts`, and `react-native-svg`.

The ship schematic in `Axiom Ship Canon.dc.html` is a **blueprint at
`viewBox="0 0 1300 450"`** — its coordinates are the spec's coordinates and are
directly transferable to `react-native-svg` paths. Its linework quality is not
the target; the geometry is.

## Fidelity

**Mixed, and the distinction matters:**

- **Hi-fi / exact:** all color values, opacity floors, type sizes, stroke
  weights, touch-target sizes, and the ship's zone coordinates. These are
  numbers to implement literally.
- **Lo-fi / blueprint:** the ship silhouette linework. Proportions, feature
  placement and zone positions are exact; the drawing itself is a schematic to
  be redrawn in the game's vector style per S-04's palette.

## Priority order

Work in this order. Reasoning is in the spec files.

1. **D-03 + D-04** — color roles. Amber currently carries seven meanings and
   cyan seven more, so the two beam colors have no contrast event to land on.
   This is a *teaching* failure: `docs/TEACHING_PROGRESSION.md` gates Kepler
   Belt on the player having internalised that Physics and Protocol are separate
   systems. Purely mechanical to fix.
2. **S-04** — ship repair opacity. Unrepaired zones currently render as low as
   0.01 opacity; most of the vessel is invisible on a phone outdoors. **Lands
   against the existing geometry with no redraw.** Cheapest large win here.
3. **D-07** — HUD contrast and type floor. Two shipping accessibility failures
   (1.5:1 and 2.4:1 text).
4. **D-05** — remove all `SvgText` from piece icons; add the upright overlay
   chip drawn outside the rotation transform.
5. **D-01, D-02, D-08** — icon and tray legibility pass.
6. **D-06** — Config Node state must be rotation-invariant.
7. **S-01 / S-02 / S-03** — build the canonical ship component.
8. **S-05** — delete `design/screens/ship-axiom.html`.

## Files in this bundle

| File | What it is |
|---|---|
| `AXIOM_SHIP_CANON.md` | **Spec.** Ship canon, S-00…S-05. Locked. |
| `AXIOM_DESIGN_REVIEW.md` | **Spec.** Piece/board/HUD findings, D-01…D-11. |
| `Axiom Ship Canon.dc.html` | Ship blueprint, zone map, repair states, vessel history. Open in a browser. |
| `Axiom Design Review.dc.html` | Piece icons and HUD rendered at true device sizes (22pt/34pt/390pt) with per-item diagnosis. |
| `Axiom UI Kit.dc.html` | Color roles, type scale, piece drawing standard, motion bands. |
| `SHIP_PROMPT_HANDOFF.md` | Image-model prompt used to explore the ship. Historical record; not an implementation task. |

## Repo files touched by these specs

```
src/components/PieceIcon.tsx                  D-01,02,03,04,05,06
src/components/gameplay/HUDChrome.tsx         D-07
src/components/gameplay/PieceTray.tsx         D-02,03,08
src/components/gameplay/BoardPiece.tsx        D-04,05,06
src/components/gameplay/BoardGrid.tsx         D-03
src/components/hub/AxiomShip.tsx              S-00,01,04  (rebuild on canon)
src/components/ShipRepairProgress.tsx         S-00,01,02,04  (rebuild on canon)
src/components/icons/AxiomShipSVG.tsx         S-00  (audit — fourth non-canon hull)
src/theme/tokens.ts                           D-03, S-04  (add protocol purple; remove off-token colors)
design/screens/ship-axiom.html                S-05  (delete)
docs/PIECE_CREATION_STANDARD.md               D-03  (record reserved hues)
```

## Design tokens

All values below already exist in `src/theme/tokens.ts` unless marked.

### Color roles — one job per hue

| Hex | Token | Role | Never |
|---|---|---|---|
| `#F0B429` | amber | **Physics beam only.** Live signal animation. | Any static piece accent |
| `#00D4FF` | neonCyan | **Protocol beam only.** Live data-trail animation. Ship signal systems. | Any static piece accent |
| `#c87941` | copper | Physics identity, static. Wires, drums, teeth, welds, conduit. | On a Protocol piece |
| `#a78bfa` | circuit | Protocol identity, static. Data rows, rings, logic marks. | On a Physics piece |
| `#4a9eff` | blue | Physics category body stroke; hull; chrome brackets. | As an accent |
| `#8B5CF6` | protocol | Protocol category body stroke. **Not yet in tokens — add.** | — |
| `#00C48C` | terminal | Destination and success. Terminal, gate PASS, locked piece. | As a second-output marker |
| `#e05555` | red | Failure, damage, blocked. | Decoratively |
| `#f5ede0` | cream | Warmth. COGS green-eye moments, earned states. | As body text |

Ship fill: `#0c1524`. Void ground: `#06090f`.

**Remove:** `#38BDF8`, `#B87333`, `#F87171` — hardcoded in `AxiomShip.tsx`,
not in tokens. Map to `blue`, `copper`, `red`.

### Ink contrast (against `#06090f`)

| Hex | Token | Ratio | Verdict |
|---|---|---|---|
| `#e8f0ff` | starWhite | 15.8:1 | pass |
| `#f5ede0` | cream | 15.4:1 | pass |
| `#7a96b0` | muted | 7.4:1 | pass |
| `#c87941` | copper | 5.9:1 | pass |
| `#3a5070` | dim | 2.4:1 | **fail — not legal for text** |
| `#1A3050` | (HUD pulse) | 1.5:1 | **fail — delete from HUD** |

### Type

- **Orbitron 700** — screen titles, ship name. Never below 14pt.
- **Space Mono 400** — all operational text: HUD, tape values, counts, labels.
- **Exo 2 400** — prose only: COGS dialogue, Codex, narrative.

Scale: 48 / 32 / 24 / 20 / 16 / 14 / 12 / **11 floor**.
**Delete `xs: 10` from the scale so it cannot be reached.** No rendered text
below 11pt anywhere, including inside SVG.

Current violations: 5pt (Latch mode badge), 7pt (tray price, HUD sector tag),
8pt (HUD level id, tray count badge), 9pt (HUD pulse counter).

### Piece drawing standard

1. One canvas: every piece `viewBox="0 0 40 40"`, rendered `s × s`. No
   exceptions (conveyor is the current violation).
2. Enclosed mass: every piece needs a filled body catchable at 22pt.
3. Stroke floor: primary body stroke 2; no accent below 1.2; nothing renders
   under 1.0pt on device after scaling.
4. Opacity floor: no stroke or fill below 0.45. Detail quieter than that does
   not survive the size — delete it, don't dim it.
5. No type in icons. Ever.
6. Rotation invariant: state never encoded as position.
7. Two accents max: category stroke plus one accent family.
8. Form over hue for distinguishing outputs — never amber-vs-green, the worst
   pairing for deuteranopia, currently carrying routing information.

### Sizes

| Element | Current | Required |
|---|---|---|
| Tray icon | 22pt | **32pt** |
| Board icon | 34.2pt | 34.2pt (ok) |
| Board cell | 61pt @ 6 col | ok |
| Tray count badge | 8pt | **11pt** |
| HUD pause / spec buttons | 36×36 | **44×44** |
| Tray price | 7pt | **remove** (belongs in RequisitionPanel) |

### Motion

| Event | Duration |
|---|---|
| Screen transition | 600ms min (Design Principle 4) |
| Piece success feedback | 150–400ms |
| Piece flash | 180ms (90 in / 90 out), JS driver |
| Failure X fade | 800ms |
| Magnet snap | 150ms extend / 100ms retract |

Keep the two bands separate: parts react (150–400ms), the camera moves (600ms+).

## Ship component shape

One shared geometry module. Eight addressable zone groups, each taking
`DERELICT | POWERED | ONLINE`. Consumers differ only in scale and in which zones
they light:

- **Hub** — full silhouette, live state from save data
- **Repair progress** — same silhouette, zone callouts and labels
- **Codex** — same silhouette, all zones POWERED, annotation layer

**No consumer defines its own paths.** This is what prevents drifting back to
three ships.

Repair states — three fixed stroke opacities, no per-zone tuning:
`DERELICT 0.25` / `POWERED 0.55` / `ONLINE 0.90 + accent`. Never below 0.25.
Only two accents ever light: cyan on signal systems, amber on the drive.

## Assets

None to copy. No images or fonts are introduced. All three typefaces are already
in use. The ship is vector geometry specified by coordinate in
`AXIOM_SHIP_CANON.md` S-01/S-02.

Reference concept art from the ship exploration is **not** a shippable asset —
it settled geometry and proportion only. Final linework is drawn in the game's
vector style per S-04's palette.

## Decisions already made — do not relitigate

- **Single ship canon.** Three geometries retired; one starboard profile.
- **AX-07**, 46 m, ~3.8:1, relay array recessed into the spine, elongated
  ventral pod.
- **`design/screens/ship-axiom.html` is deleted**, not fixed.
- **Zone 7 (Weapons Lock) reaches POWERED and never ONLINE.** Repaired, never
  unlocked. Consistent with COGS at A1-7.

## Explicitly out of scope

- **No COGS dialogue is proposed in any of these documents.** Do not write any.
- **No new player-facing copy.** The only copy change is D-07's HUD level-line
  collapse, which merges two existing strings and invents no words — and that
  still needs Tucker's sign-off under Design Principle 2.
- The vessel history in `Axiom Ship Canon.dc.html` is reference material for
  whoever draws or writes the ship next. **It is not Codex text.**
- The line *"Built for distance. Kept alive by people who shouldn't have to."*
  came from an image-model exploration sheet. It is a **candidate** for the
  onboarding sequence near the first COGS meeting. It is **not** the game's
  tagline and **not** approved COGS dialogue. Do not place it.
