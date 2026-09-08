# Design Review — Pieces, Board, HUD, Ship

Status: proposed
Author: external design review, 2026-09-07
Scope: `src/components/PieceIcon.tsx`, `src/components/gameplay/*`, `src/components/hub/AxiomShip.tsx`, `src/components/ShipRepairProgress.tsx`, `design/screens/ship-axiom.html`
Visual reference: `Axiom Design Review.dc.html` (sections 1a / 1b / 1c)

Every finding below was read out of master at commit-tree `e49e43a`. Nothing here
changes gameplay rules, level data, scoring, or COGS copy. No proposed COGS lines.

---

## D-01 — PieceIcon viewBox is not uniform (blocker for tray rhythm)

**Observed.** Every case in `PieceIcon.tsx` renders `viewBox="0 0 40 40"` at
`width={s} height={s}`, except `conveyor`, which renders `viewBox="0 0 60 36"`
at `width={s} height={s * 0.6}`.

**Consequence.** At tray size (`size={22}`) the conveyor occupies 22×13.2pt
against 22×22pt neighbours — 40% less vertical mass. On the board
(`iconSize = (cellSize - 4) * 0.60`, so 34.2pt at 6 columns) it is 34×20.4pt in
a 57pt cell. The conveyor is the first piece the player ever touches (A1-1) and
it is the one that looks least like a piece.

**Change.** Move conveyor to a `0 0 40 40` viewBox rendered `s × s`. Keep the
belt horizontal, centred vertically, with the drum circles inset — the drawing
does not need to change shape, only to be composed on the shared canvas so the
optical mass matches. Emit `width={s} height={s}` for every case with no
exceptions.

**Test.** Extend `__tests__/unit/components/` with an assertion that every
`PieceIcon` case renders a square `Svg` whose `viewBox` is `0 0 40 40`. This is
a lint-class test — it should fail on any future piece that deviates.

---

## D-02 — Stroke weights are sub-pixel at tray size

**Observed.** Icon strokes are `1` to `1.5` in a 40-unit viewBox. At `size={22}`
the scale factor is 0.55, so a `1.5` stroke renders at 0.83pt and a `1` stroke
at 0.55pt. Several accents are `strokeOpacity` 0.3–0.5 on top of that.

**Consequence.** On a 3× device a 0.55pt stroke at 30% opacity is a barely-tinted
pixel row. This — not the 22pt size itself — is why the tray reads as mush.
`docs/PIECE_CREATION_STANDARD.md` requires legibility at 32×32; the tray ships
at 22.

**Change.** Two parts, both needed.

1. Raise tray icon size from 22 to 32 (`PieceTray.tsx`, `PieceIcon size={22}` →
   `32`). The 56pt tray cell has room: see D-05 for what to remove to make it.
2. Introduce a stroke scale in `PieceIcon`. Derive one multiplier from `size` and
   apply it to every stroke width:

   ```
   const k = Math.max(1, 34 / size);   // 1.0 at board size, ~1.06 at tray 32
   const sw = (w: number) => w * k;
   ```

   Then floor the resulting rendered weight: no stroke may render below 1.0
   device-independent pt. Practically that means primary strokes go to `2` in
   the viewBox and no accent stroke goes below `1.2`.

**Change (accent opacity).** No stroke or fill inside a piece icon may sit below
0.45 opacity. Anything that needed to be quieter than that is detail that does
not survive the size and should be deleted rather than dimmed. Current
violations: conveyor belt dashes (0.4), gear inner ring (0.4), configNode data
rows (0.3), configNode corner accents (0.3), configNode inactive strips (0.3),
splitter wires (0.5), bridge centre X (0.3), inverter data row (0.3).

**Test.** A lint-class test that greps the `PieceIcon` source for
`strokeOpacity` / `opacity` literals below 0.45 and fails. Same pattern as
`__tests__/lint/nativeDriverHostUniqueness.test.ts`.

---

## D-03 — The `color` prop does not actually carry category

**Observed.** `BoardGrid.getPieceColor` and `PieceTray.getPieceColor` both split
pieces into `#8B5CF6` (Protocol: configNode, scanner, transmitter, inverter,
counter, latch) and `Colors.blue` (Physics: everything else), and the docblock in
`PieceIcon.tsx` states the `color` prop "drives the primary stroke for
board-level uniformity."

But each case then hardcodes its own accents. Counting hue occurrences across the
icon set:

| Hue | Meanings it currently carries |
|---|---|
| `#F0B429` amber | Physics beam · Source body · conveyor start drum · configNode gate strips · Latch WRITE arrow · Merger centre + glow · Splitter magnet 0 · gear centre pivot |
| `#00C48C` green | Terminal body · gate PASS result · conveyor end drum · Splitter magnet 1 · Bridge vertical path · locked-piece border in `BoardPiece` |
| `#00D4FF` cyan | Protocol beam · HUD chrome (pause bars, info icon, timer) · Scanner crosshairs + centre + readout · Inverter output bubble · Counter dashed ring · Latch READ arrow · transmitter tip |
| `#c87941` copper | gear tooth nubs · conveyor belt dashes · splitter wires · merger wires · bridge horizontal path · level id in HUD |

**Consequence.** This is the most serious finding in the review, and it is a
teaching problem, not an aesthetics problem. `docs/TEACHING_PROGRESSION.md`
requires the player to internalise, before Kepler Belt unlocks, that the signal
path and the data trail are separate systems. The game teaches that with two
beam colors — amber and cyan. But amber already appears on seven unrelated
static elements and cyan on seven more, so when the beam fires there is no
color contrast event. The player has no way to learn the rule the sector gate
depends on.

**Change — reserve the beam hues.**

- `#F0B429` amber and `#00D4FF` cyan become **beam-only**. They may appear in an
  animated beam, in a transient success/charge/lock animation, and nowhere else
  in a static piece icon.
- Static Physics accents use copper `#c87941`. Static Protocol accents use
  lavender `#a78bfa`.
- Category identity stays with the `color` prop on the primary body stroke,
  raised to weight `2` per D-02 so it is the dominant mark on the icon.

Per-piece edits this implies:

| Piece | Edit |
|---|---|
| conveyor | start drum `#F0B429` → `#c87941`; end drum `#00C48C` → keep (see D-04); direction chevrons → `#c87941` |
| gear | centre pivot `#F0B429` → `#c87941` |
| splitter | magnet 0 `#F0B429` → `#c87941`; magnet 1 stays `#00C48C` only if D-04 keeps green as "output" |
| merger | centre dot + glow ring `#F0B429` → `#c87941` |
| configNode | gate strips `#F0B429` → `#c87941`; status dot keeps semantic color (amber/red/green) as it is a live state readout, not decoration |
| scanner | crosshairs, centre, readout `#00D4FF` → `#a78bfa` |
| transmitter | tip dot `#00D4FF` → `#a78bfa` |
| inverter | output bubble `#00D4FF` → `#a78bfa` |
| counter | dashed ring `#00D4FF` → `#a78bfa` |
| latch | WRITE arrow `#F0B429` → `#c87941`; READ arrow `#00D4FF` → `#a78bfa` |

**Test.** Lint-class test asserting `#F0B429` / `#00D4FF` (and the `Colors.amber`
/ `Colors.neonCyan` token references) do not appear in `PieceIcon.tsx` outside a
block guarded by an animation flag (`charging`, `locking`, `gating`, `splitting`,
`transmitting`, `rolling`, `scanning`). Update
`docs/PIECE_CREATION_STANDARD.md` "Color identity" bullet to state the reserved
hues so no future piece reintroduces the collision.

---

## D-04 — Green means three different things

**Observed.** `#00C48C` is the Terminal body, the gate PASS result, the
locked-piece border in `BoardPiece`, the conveyor's downstream drum, the
Splitter's second magnet, and the Bridge's vertical path.

**Consequence.** Milder than D-03 but the same failure: green cannot become the
player's mental symbol for "the answer arrived" if it also decorates half the
static pieces.

**Change.** Reserve `#00C48C` for **destination and success** only — Terminal,
gate PASS, locked piece, lock animation. For pieces that need to distinguish two
outputs (splitter magnets, conveyor drums, bridge axes), use form rather than
hue: differing shapes, one filled and one hollow, or a numeral. This also fixes
the accessibility case — the current splitter is amber-vs-green, the single worst
pairing for deuteranopia, and it is carrying load-bearing information about which
output goes where.

**Test.** Extend the D-03 lint test to `#00C48C` with the same animation-guard
exemption plus a `terminal` case exemption.

---

## D-05 — Type inside piece icons is unreadable

**Observed.** Three icons render `SvgText` inside a 40-unit viewBox:

| Piece | Source size | Renders at tray 22 | Renders at board 34 |
|---|---|---|---|
| counter | `fontSize="9"` (`count/threshold`) | 5.0pt | 7.6pt |
| latch | `fontSize="5"` (mode badge) | 2.8pt | 4.3pt |
| ship designation, `ShipRepairProgress` | `fontSize="12"` | — | ~4pt at delivered width |

The `latch` case already carries this comment in source: *"storedValue is
preserved for future reintroduction of a value badge. It's intentionally not
rendered right now — the bottom circle was unreadable at small sizes."* The
mode badge above it is the same mistake at half the size, still shipping.

**Consequence.** For the Counter, the count *is* the piece's entire purpose —
`docs/TEACHING_PROGRESSION.md` places accumulation-and-threshold at the centre of
The Rift. The player cannot read it on the board.

**Change.** Remove all `SvgText` from `PieceIcon`. Replace with:

- **Counter** — a segmented ring: `threshold` arc segments around the body,
  `count` of them filled. Reads as a quantity at 22pt, exactly, and scales to any
  threshold. No type.
- **Latch** — drop the mode badge from the icon. Mode is already conveyed by the
  lit half (write/read/delay); make that legible instead by taking the unlit half
  to 0.45 and the lit half to 1.0, and rely on the Spec Sheet / long-press for
  the word.
- Exact numeric values (`count`, `storedValue`, `configValue`) belong in a
  **board overlay layer**, not inside the icon: a 11pt monospace chip rendered by
  `BoardPiece` at the cell corner, outside the rotated `View` so it stays upright
  when the piece rotates. This is one new small component and it fixes the whole
  class of problem permanently.

**Test.** Lint-class test asserting `PieceIcon.tsx` contains no `SvgText` /
`Text as SvgText` usage.

---

## D-06 — configNode state breaks under rotation

**Observed.** The active/inactive distinction is encoded as gate-strip
**position** — active draws amber strips on the left and right edges, inactive
draws them on top and bottom. `BoardPiece` wraps the icon in
`<View style={{ transform: [{ rotate: `${piece.rotation}deg` }] }}`.

**Consequence.** A 90°-rotated active Config Node is pixel-identical to an
unrotated inactive one. `CLAUDE.md` states only the Conveyor rotates on tap, but
`rotation` is a property of every non-pre-placed `PlacedPiece` and is applied
unconditionally here — so this is reachable through level data or any future
rotation affordance. The Config Node's value is the thing A1-3 teaches. It must
not be ambiguous.

**Change.** Encode value rotation-invariantly. The centre status dot already
carries the right semantics (`dotFill` = amber when active, dim when inactive) —
make it the primary signal: 2 → 4 radius, full opacity, and add a concentric ring
when active so it reads as on/off rather than bright/less-bright. Keep the strips
as a secondary cue but draw them on all four edges so position carries no
meaning.

**Test.** Unit test rendering `configNode` at `configValue` 0 and 1 and asserting
the outputs differ in a rotation-invariant property (centre element radius or
fill), not in element position.

---

## D-07 — HUD stack: four of five lines are below the readable floor

**Observed.** `HUDChrome.tsx` centre column, top to bottom:

| Element | Size | Color | Contrast vs `#06090f` |
|---|---|---|---|
| `sectorTag` | 7pt | `Colors.dim` `#3a5070` | **2.4:1** |
| `levelTag` | 8pt | `Colors.copper` `#c87941` | 5.9:1 |
| `levelName` | Orbitron 14 bold | `#e8f0ff` | 15.8:1 |
| `timerText` | 13pt | `#00D4FF` @ 0.7 | ~7:1 |
| `pulseCounterText` | 9pt | `#1A3050` | **1.5:1** |

**Consequence.** The pulse counter is invisible — 1.5:1 is below the threshold at
which text is distinguishable from its background at all, and pulse count is
live state the player needs while a machine runs. The sector tag fails at 2.4:1
and is set at 7pt on top of that. Meanwhile the loudest element on the screen is
the level title, which the player needs once, at the dossier, before the level
starts.

**Change — invert the hierarchy.**

1. Delete `sectorTag` from the gameplay HUD. The sector is established by the
   Mission Dossier and the Sector Map; repeating it at 7pt in 2.4:1 serves
   nobody. (HUD chrome is contextual per Design Principle 6 — this is that
   principle applied.)
2. Collapse `levelTag` + `levelName` into **one** line: `A1-3 · Navigation Array`,
   11pt Space Mono, `Colors.muted` `#7a96b0` (7.4:1). Level identity becomes
   reference information, which is what it is.
3. Promote the two live values. Timer at 15pt `#e8f0ff`, pulse counter at 13pt
   `Colors.muted`. Pulse counter must never render below 4.5:1 — `#1A3050` is
   deleted from the HUD entirely.
4. The result is a two-line stack instead of five, freeing roughly 30pt of
   vertical space above the board.

**Change (touch targets).** `pauseBtn` and `specSheetBtn` are 36×36. Minimum is
44×44. Raise both; the visual glyph stays its current size, only the pressable
grows.

**Test.** Extend `HubScreen.audit.test.ts`-style audit to `HUDChrome`: assert no
rendered text style has `fontSize < 11`, and add a contrast assertion for every
color/background pair in the component.

---

## D-08 — Tray cell carries three information layers in 56pt

**Observed.** `trayItem` is 56×56 and contains a 22pt icon, an 8pt count badge
(`trayBadgeText`, `#06090f` on the category hue), and a 7pt price
(`trayCost`, `40 CR`).

**Consequence.** The 7pt price is unreadable, and it is also information the
player cannot act on: `CLAUDE.md` locks a **one-time requisition window** before
the level starts, so mid-level the price is decoration for a purchase that is no
longer possible. It is taking space from the icon, which is the thing the player
must recognise.

**Change.**

1. Remove `trayCost` from the in-level tray. Price belongs in
   `RequisitionPanel`, where the buying decision happens, at a readable size.
2. Icon 22 → 32.
3. Count badge to 11pt minimum. It is currently 8pt dark-on-hue; at 11pt it is
   both legible and still small enough to sit in the corner.
4. Keep the 56pt cell. With the price gone, a 32pt icon plus an 11pt corner badge
   fits with 8pt of breathing room.

**Test.** `PieceTray` audit test asserting no `fontSize < 11` and
`PieceIcon size >= 32`.

---

## D-09 — The ship has no canonical geometry

**Observed.** Three unrelated hull designs:

| File | View | Notes |
|---|---|---|
| `design/screens/ship-axiom.html` | Side profile, faces right | Twin dorsal nacelles, chin guns, dorsal turret, comm tower, weld scars, painted-over hull marking. Marked "Approved" in `design/README.md` — actually it is not listed there at all; the README lists only the two boot screens. |
| `src/components/hub/AxiomShip.tsx` | Top-down | Different hull. Uses `#38BDF8` / `#B87333` / `#F87171` — **none of which are in `src/theme/tokens.ts`**. Eight system lights in a row. |
| `src/components/ShipRepairProgress.tsx` | Three-quarter, faces right | Fourth hull shape. Eight repair zones mapped to A1-1…A1-8 via `SHIP_SYSTEMS`. |

`src/components/icons/AxiomShipSVG.tsx` is a fourth rendering not reviewed here.

**Consequence.** The Axiom sector's emotional arc — *"Player arrives on a broken
ship. Fixes things one at a time. Each fix makes the ship more alive"* — depends
on the player holding a single mental image of the vessel. Three silhouettes
means no image forms. This is why the ship design feels wrong; it is not a
drawing-quality problem.

**Change.**

1. **Declare `ShipRepairProgress` geometry canon.** It is the only rendering that
   carries game state, it appears most often, and the eight-zone repair mapping
   is the mechanic. Record the decision in `CLAUDE.md` "Decisions Already Made".
2. Re-derive the hub view from that same geometry at a smaller size rather than
   maintaining a second top-down hull. Retire `AxiomShip.tsx`'s independent
   geometry, or reduce it to a schematic explicitly framed as a *readout*, not a
   portrait.
3. Promote the side profile to a **Codex illustration of the same ship** — same
   proportions, same nacelle count, same comm tower placement. Where it currently
   disagrees with the canon geometry, the side profile changes.
4. `AxiomShip.tsx` colors move onto `src/theme/tokens.ts`. `#38BDF8` → `Colors.blue`,
   `#B87333` → `Colors.copper`, `#F87171` → `Colors.red`.

---

## D-10 — The ship is drawn below the visibility floor

**Observed.** `ShipRepairProgress` unrepaired zones render at
`strokeOpacity` 0.10–0.35 and fills at `opacity` 0.01–0.05 (`zo(repaired, lit, dark)`).
Repaired zones reach 0.6–0.9. Engine wash lines sit at 0.015. The side-profile
prototype is similar — most strokes between `rgba(74,158,255,.06)` and `.4`.

**Consequence.** On an OLED phone at moderate brightness in daylight, the
unrepaired ship is not dim, it is absent. That destroys the repair reveal: there
is no "before" for the "after" to improve on. The player's first look at the
Axiom is a blank field.

**Change.** Floor unrepaired strokes at **0.25** and lift repaired to **0.85**.
The arc becomes dark-but-present → lit, which is both visible and a bigger
perceptual jump than 0.05 → 0.6. Delete detail that cannot survive 0.25 rather
than drawing it at 0.02 — the engine wash lines at 0.015 are costing render
nodes for nothing.

Same treatment for the side profile prototype if it is kept as a Codex asset.

---

## D-11 — `ship-axiom.html` contains a malformed SVG element

**Observed.** In the PYLON block:

```
<polygon points="132" y1="90" x2="140" y2="90" x3="148,104" x4="138,106"
         fill="url(#accentPanel)" opacity=".5" .../>
```

`points` is `"132"`, and the remaining coordinates are written as `<line>`
attributes (`y1`, `x2`) plus invented ones (`x3`, `x4`). The element renders
nothing.

**Change.** Rewrite as a valid polygon —
`points="132,90 140,90 148,104 138,106"` — or delete it. Note that this is a
prototype the workflow treats as design source of truth, so the missing part has
been invisible to every downstream reader.

---

## Priority order

1. **D-03** and **D-04** — color roles. Highest value, purely mechanical, and
   they unblock the sector-gate teaching goal.
2. **D-07** — HUD contrast and type floor. Two of these are accessibility
   failures shipping in a playable build.
3. **D-05** — remove type from icons; add the upright overlay chip.
4. **D-01**, **D-02**, **D-08** — legibility pass on icons and tray.
5. **D-06** — configNode rotation invariance.
6. **D-09**, **D-10** — ship canon and visibility. Bigger discussion, needs
   Tucker's call on which geometry wins before any drawing happens.
7. **D-11** — one-line fix, do it whenever the file is next open.

## Out of scope / needs Tucker

- No COGS lines are proposed anywhere in this document.
- No UI copy is changed except the HUD level line collapse in D-07, which merges
  two existing strings and invents no new words. That still needs sign-off under
  Design Principle 2.
- D-09's canon decision is a design call, not an implementation task. Nothing in
  D-09 should be built before it is made.
