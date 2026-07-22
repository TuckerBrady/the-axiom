# Trail Tape Color Specification

Sprint 18 -- UX/UI Department

---

## Purpose

Establishes the color palette for data trail visualization on the tape system to prevent visual confusion between signal path (Layer 1) and data trail (Layer 2).

## Rules

1. Data trails use a blue-with-green palette.
2. Never use green-to-green transitions between adjacent trail segments.
3. Signal path (amber beam) and data trail (blue-green) must remain visually distinct at all times.

## Palette

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Trail primary | Blue | #00D4FF | Active data trail segments |
| Trail accent | Green | #22c55e | Trail write indicators, completion marks |
| Trail dim | Muted blue | #0e7490 | Inactive/completed trail segments |
| Signal beam | Amber | #F0B429 | Physics layer -- never used for trails |

## Constraint

Adjacent trail cells must alternate between blue and green-accented blue. Two consecutive green segments create visual ambiguity with the signal path layer, especially on smaller screens where the amber/green distinction is subtle.

## Rationale

The three-layer architecture (Signal Path, Data Trail, Tape System) depends on instant visual identification of which layer the player is observing. Color is the primary differentiator. If trails read as green-to-green, players lose the layer distinction and misinterpret data trail activity as signal path behavior.
