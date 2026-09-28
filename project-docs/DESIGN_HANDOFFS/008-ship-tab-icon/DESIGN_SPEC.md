# DESIGN_SPEC: AXM-042, Ship tab icon

| | |
|---|---|
| Mission | AXM-042 (TestFlight build 49 note 17; build 51 "That's a fail.") |
| Version | 1.0.0 |
| Date | 2026-09-27 |
| APPROVED | Tucker, 2026-09-27, via /design (Design Principle 7) |
| Canvas | https://claude.ai/artifact/G35eG3zKTUh2up5hhtwHQf (private), artboard "AXM-042 Ship tab icon" |
| Chosen option | **A: Canon profile** |
| Design system | https://claude.ai/artifact/EaHveGcVoUt5auA5U9BnEn |

## What and why

The Ship tab icon (`src/components/icons/ShipIcon.tsx`) is a generic ship with a command tower. It was never
derived from the canon hull (`src/components/ship/AxiomHull.tsx`, AXIOM_SHIP_CANON.md S-01/S-02), so the tab and
the Command Deck show two different ships. Option A redraws the icon as the canon hull in side profile, with its
depth exaggerated so it holds at 20px.

## Requirements

- **DR-1 Geometry.** `ShipIcon` keeps its props (`size`, `color`) and draws on a `0 0 24 24` viewBox, nose to the
  right, exactly these elements, all `stroke={color}`, `fill="none"`, `strokeLinejoin="round"`:
  - drive block: `Rect x=2.4 y=8.8 w=4 h=6.4 rx=0.6`, stroke 1.6
  - aft hull: `Path "M6.4 7.6 H13.8 V16.4 H6.4 Z"`, stroke 1.6
  - forward hull (shoulder step): `Path "M13.8 9.2 H19 V14.8 H13.8"`, stroke 1.6
  - sensor wedge nose: `Path "M19 9.2 L23.2 12 L19 14.8"`, stroke 1.6
  - life-support pod: `Ellipse cx=10 cy=17.8 rx=2.6 ry=1`, stroke 1.2
- **DR-2 Proportion to canon.** Horizontal segment order and relative lengths follow AxiomHull (drive, aft hull to
  the x=700 shoulder, forward hull to x=1010, wedge). Vertical depth is exaggerated about 2x on purpose; this is
  the only permitted departure from canon.
- **DR-3 Tint.** Active and inactive colours are whatever TabNavigator passes (today `#F59E0B` active,
  `rgba(255,255,255,0.28)` inactive). The icon adds no colour of its own and no opacity below 1 on any element
  (D-02 floor).
- **DR-4 Size.** Rendered at the size TabNavigator passes (20). All five elements visible at 20px, 100% zoom.
- **DR-5 No state.** The icon encodes no progress or state (option C was not chosen).
- **DR-6 Scope.** Only the tab icon. `AxiomHull` is unchanged.

## Acceptance (device screenshots, 360dp)

1. Tab bar, Ship tab active, Hub visible: icon and Command Deck hull read as the same ship.
2. Tab bar, another tab active: Ship icon in the inactive tint.
3. 3x crop of the 20px icon: drive, hull, shoulder step, nose and pod all distinct.

## Tests (red first)

- `[DR-1]` Render test: ShipIcon renders exactly 1 Rect, 3 Path, 1 Ellipse with the attributes above; no Polygon,
  no Circle (the old tower, window, wing and AX-MOD dot are gone).
- `[DR-3]` Every element's stroke equals the `color` prop; no element sets `opacity`.

## Touch points (pointers only)

`src/components/icons/ShipIcon.tsx`; `src/navigation/TabNavigator.tsx` (unchanged, reference for size and tint).

## Out of scope

Canon hull art, Command Deck, 3D ship models (separate mission).
