# The Axiom — Ship Canon Spec

Status: **LOCKED 2026-09-07.** Single-hull canon. Geometry final.
Reference art: three rounds of image exploration, v3 sheet is canonical.
Supersedes: all three prior ship renderings.
History source: docs/NARRATIVE.md (Parts One, Three, Four).

---

## S-00 — Canon decision (DECIDED)

Three unrelated hulls previously shipped:

| File | View | Disposition |
|---|---|---|
| design/screens/ship-axiom.html | side profile | **RETIRED** (approved 2026-09-07) |
| src/components/hub/AxiomShip.tsx | top-down | **rebuild** on canon geometry |
| src/components/ShipRepairProgress.tsx | three-quarter | **rebuild** on canon geometry |

**One geometry.** The starboard side profile below. Every surface renders the
same silhouette at a different scale — hub, repair progress, codex. There is no
second geometry and no top-down variant.

Rationale: the player repairs this ship across A1-1 to A1-8 and it lights up as
they go. That only lands if they hold a single mental image of the vessel.

---

## S-01 — Proportions and construction

| Property | Value |
|---|---|
| Length | 46 m |
| Registration | AX-07 (ghosted under a paint patch — see S-03) |
| Proportion | ~3.8 : 1, length to height |
| Crew | 1 pilot + 1 robot |
| Facing | Starboard profile, bow to the right |
| Reference viewBox | `0 0 1300 450` |

- **Small-ship scale is part of the identity.** An earlier 4.6:1 ratio read as a
  freighter. Compact and dense, not elongated.
- **One integrated hull.** Reads as a single monolithic vessel. Equipment is
  recessed *into* the hull, not perched on top — this is what makes it feel like
  one ship rather than a hull with parts bolted to it.
- **Shoulder break at ~x=700.** Aft hull deep (~140u), stepping down and inward
  to a shallower forward section (~90u). The primary line in the silhouette.
- **Blunt faceted bow** with a flat vertical nose face, ~24u tall. A pointed
  nose reads as a weapon.
- **One oversized drive block**, x 92–240, bolted to the stern, visibly bulkier
  and cruder than the hull, single squared nozzle. Never a symmetrical pair —
  twin nacelles read as a fighter; one heavy drive reads as range.
- **Flat-sided utility hull.** Only two curved forms on the vessel: the ventral
  pod and the dorsal dome. Everything else faceted.
- **Restrained surface detail.** This is a rendering constraint, not taste — the
  ship draws at roughly 200pt wide in the hub on a phone, and dense detail turns
  to mud. Large legible panel forms; no greebling.
- **Asymmetry is required.** Do not regularise the plating. Uniform symmetry
  throws away S-03.

---

## S-02 — The eight zones

Sector 0 has eight levels; the ship has eight repairable zones. Same list.
Positions follow level order so progress reads back-to-front, bottom-to-top.

| # | Level | Zone | Geometry |
|---|---|---|---|
| 1 | A1-1 Emergency Power | Plated battery bank | x 252–390, y 312–344, aft ventral |
| 2 | A1-2 Life Support | Elongated ventral pod | x 398–562, capsule below hull line |
| 3 | A1-3 Navigation Array | Forward dorsal dome | x 920–1000, peak y 182 |
| 4 | A1-4 Propulsion Core | Drive block + nozzle | x 32–240 |
| 5 | A1-5 Communication Array | Recessed spine relay bay | x 328–690, set into the spine |
| 6 | A1-6 Sensor Grid | Bow wedge + nose face | x 1010–1136 |
| 7 | A1-7 Weapons Lock | Two capped ventral hardpoints | x 760–830, x 870–940 |
| 8 | A1-8 Bridge Systems | Forward dorsal canopy | x 775–900, peak y 176 |

**Every zone must have its own drawn form.** A repair that produces no visible
change is a broken payoff. Zone 1 in particular is the first repair in the game
and needs a real object — a plated battery bank with external cable clamps, not
a bare stretch of hull edge.

**Zone 8 is last and highest.** Its cyan canopy glow is the payoff frame of
Sector 0 — hold it a beat before the A1-8 monologue fires.

**Zone 7 is repaired but never unlocked.** The cap plates stay on and the zone
reaches POWERED, never ONLINE. Consistent with COGS at A1-7 noting the weapons
were locked deliberately and declining to comment.

**Zone 5 is the centrepiece.** The relay bay is recessed into the spine and
built from fine precision-machined nested arcs — visibly better work than the
crude hull holding it. This is the Maker's hand, and it must read as such: an
instrument set into a workboat. Not a mesh grille, not a wire screen, and never
a vertical lattice tower or truss mast (reads as 20th-century naval).

---

## S-03 — Story features (all sourced from NARRATIVE.md)

Not decoration. Each is something the narrative already asserts. On a restrained
hull these read *more* clearly, not less — do not let them dissolve into texture.

**A — Painted-over hull marking.** x 440–590, y 220–266. A rectangle of newer,
mismatched grey paint on the aft flank with `AX-07` only partially legible
beneath it (ghost glyph ~0.14 alpha). NARRATIVE.md Part Three: the hull markings
have something painted over. A Chapter Two thread, visible from the first frame
of the game. It must read as something suppressed, not as a nameplate.

**B — Three welding styles, three distinct treatments.** NARRATIVE.md Part One:
patched in at least three different welding styles. Visually unmistakable from
each other, not three variations of one idea:

| Seam | Treatment | Position |
|---|---|---|
| Field repair | crude hand-run zigzag | x 380 |
| Depot repair | neat line of round rivets | x 620 |
| Yard repair | heavy stepped square-edged overlap | x 268, at the drive-block joint |

Three people fixed this ship and none of them talked to each other.

**C — The Maker's bypass conduit.** External copper run from the nav dome aft
along the forward flank, hand-clamped in two places. It must visibly **ignore
the hull's own panel lines** — that is the entire point. This is the relay COGS
tells the Engineer to leave alone in Sector 3: *"That relay was installed before
your tenure. It is functional. Leave it."* Copper `#c87941`, never hull blue.

**D — Capped weapon hardpoints.** Two ventral mounts plated over with copper
cross-braces. Not battle damage. Someone sealed these on purpose.

---

## S-04 — Repair state: the three-value rule

**Observed.** `ShipRepairProgress.tsx` renders unrepaired zones between 0.01
and 0.2 stroke opacity, repaired up to ~0.4.

**Consequence.** On an OLED phone at 40% brightness outdoors most of the vessel
is not dim, it is absent. The reveal has nowhere to travel from, so the central
payoff of Sector 0 does not land. Also an accessibility failure in a playable
build.

**Required.** Three fixed values. No exceptions, no per-zone tuning.

| State | Stroke opacity | Meaning |
|---|---|---|
| DERELICT | 0.25 | not yet repaired — dark but present |
| POWERED | 0.55 | repaired, idle — structure fully legible, no glow |
| ONLINE | 0.90 + accent | repaired and running |

**Never render any hull stroke below 0.25.**

**Accents — only two,** matching the piece-color rule in
AXIOM_DESIGN_REVIEW.md D-03/D-04:

- `#00D4FF` cyan on signal systems — relay bay, bridge canopy, nav dome,
  sensor grid, and the ventral pod's interior lighting
- `#F0B429` amber on the drive only

Nothing else on the hull ever lights. The ship teaches the amber/cyan
distinction before the first puzzle does.

**Grime is expressed as opacity, not texture.** In vector linework the
derelict-to-repaired arc is carried by the three stroke values plus accent
lighting — do not attempt painted weathering.

**Palette.** All strokes from `src/theme/tokens.ts`: hull `#4a9eff`, fill
`#0c1524`, copper `#c87941`. Delete the `#38BDF8` / `#B87333` / `#F87171`
values currently hardcoded in `AxiomShip.tsx`.

---

## S-05 — ship-axiom.html (RETIRED)

**Decided 2026-09-07: delete the file.** It is a fourth non-canon hull, and its
PYLON block contains a malformed element that renders nothing (`polygon` and
`line` attributes mixed on one tag). Not worth fixing — retire rather than
repair.

Anything still referencing it moves to the canonical component in S-01.

---

## Implementation order

1. ~~**S-00** — canon call.~~ **Decided.** Single hull, geometry above.
2. **S-04** — the three-value rule. Cheapest change, largest visible gain, fixes
   an accessibility failure, and **can land against the existing geometry
   before any redraw**. Do this first.
3. **S-01 / S-02 / S-03** — build the canonical component. One SVG, eight
   addressable zone groups, three states per zone.
4. **S-05** — delete `design/screens/ship-axiom.html`.

## Component shape

One shared geometry module. Each of the eight zones is an addressable group
taking a state prop (`DERELICT` | `POWERED` | `ONLINE`). Consumers differ only
in scale and in which zones they light:

- **Hub** — full silhouette, live state from save data
- **Repair progress** — same silhouette, zone callouts and labels
- **Codex** — same silhouette, all zones POWERED, annotation layer

No consumer defines its own paths.

## Out of scope / needs Tucker

- **No COGS dialogue is proposed anywhere in this document.**
- No player-facing copy is proposed. The vessel history in
  `Axiom Ship Canon.dc.html` is reference for whoever draws or writes the ship
  next, not Codex text.
- **The game's existing tagline stands.** An exploration sheet invented *"Built
  for distance. Kept alive by people who shouldn't have to."* — approved as a
  **candidate line for the onboarding sequence**, at or near the first meeting
  with COGS, where a description of the ship carries weight. It is NOT the
  game's tagline and is not approved as COGS dialogue. Placement and final
  wording need Tucker's sign-off before it enters the build.
- Reference art is concept art, not a shippable asset. Final linework is drawn
  in the game's vector style per S-04's palette; the sheets settle geometry,
  proportion and feature placement only.
