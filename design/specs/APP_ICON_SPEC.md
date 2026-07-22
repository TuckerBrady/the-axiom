# App Icon Specification — COGS AI Orb

Sprint 18 -- UX/UI Department

---

## Concept

The app icon is the COGS AI orb in his green (warmth) eye state. Green represents COGS showing genuine care — the state players associate with positive moments in the game. Clean, iconic, reads well at all sizes.

## Colors

| Element | Hex | Source |
|---------|-----|--------|
| Background | #0a0a1a | Game dark background |
| Orb center highlight | #8FFFB0 | Bright green (light reflection) |
| Orb primary | #4ADE80 | COGS_EYE_COLORS.GREEN.solid |
| Orb mid | #22C55E | Green mid-tone |
| Orb edge | #16A34A | Green dark edge |
| Outer ring | #4ADE80 at 40% opacity | Subtle containment ring |
| Inner ring | #4ADE80 at 12% opacity | Secondary depth ring |

## Sizing

- Source SVG: 1024x1024
- Production PNG: 1024x1024 (no transparency, no rounded corners — OS handles rounding)
- Must be legible at 29x29 (Settings icon size on iOS)
- Orb diameter is ~35% of icon width for clear reading at small sizes

## Production Notes

1. Export from SVG to 1024x1024 PNG for Expo icon asset
2. Place at `assets/icon.png` (replaces current icon)
3. Update `app.json` icon field if path changes
4. iOS will apply rounding mask automatically
5. Android adaptive icon: the orb should be centered in the safe zone (inner 66% circle)

## Design Source

SVG master file: `design/mockups/cogs-app-icon.svg`
