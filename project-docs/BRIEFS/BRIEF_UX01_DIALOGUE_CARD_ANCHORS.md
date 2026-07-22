# BRIEF — UX-01: COGS Dialogue Card Two-Position Anchor System
**Date:** 2026-06-09
**From:** PRISM (UX/UI)
**To:** WRENCH (Dev)
**File:** `src/components/TutorialHUDOverlay.tsx`
**Priority:** P2 — implement before Axiom sector is considered final

---

## What Needs to Change

The COGS dialogue card currently uses a floating position algorithm (`calloutPos` useMemo, lines ~346–411) that places the card relative to the portal/spotlight target. This produces inconsistent card positions across tutorial steps.

Replace the floating algorithm with a strict two-position system. The card snaps to one of two fixed vertical anchors. No floating. No per-portal offset calculations.

---

## The Two Positions (390x844 canonical)

| Position | `top` | `left` | When to use |
|----------|-------|--------|-------------|
| **Upper** | `80` | centered* | Spotlight/orb centerY is in the **lower half** of screen (centerY > 422) |
| **Lower** | `576` | centered* | Spotlight/orb centerY is in the **upper half** of screen (centerY ≤ 422) |

*Centered: `left = Math.max(15, Math.min(SCREEN_W / 2 - CALLOUT_W / 2, SCREEN_W - 15 - CALLOUT_W))`

These values already exist in the codebase — `top: 80` is used for `awaitPlacement` tray steps, `top: 576` is used for `allowPieceTap` steps. Both are correct. Extend them to all steps.

---

## The Rule

```
if (spotlight or orb centerY > SCREEN_H / 2) {
  // target in bottom half → card at top
  return { top: UPPER_TOP, left: centeredLeft }
} else {
  // target in top half → card at bottom
  return { top: LOWER_TOP, left: centeredLeft }
}
```

Special case: Presentation Mode center steps where `step.targetRef === 'center'` (orb centered, no spotlight) → always use upper position (`top: 80`).

---

## Constants to Add

```ts
const CALLOUT_UPPER_TOP = 80;
const CALLOUT_LOWER_TOP = SCREEN_H - NAV_HEIGHT - 16 - CALLOUT_H_EST; // ~576 at default height
```

Note: `CALLOUT_LOWER_TOP` uses `CALLOUT_H_EST` which varies by message length (188 default, 240 long). That's fine — the lower anchor floats slightly for long messages. The upper anchor is always exactly 80.

---

## What to Remove

Replace the entire body of the `calloutPos` useMemo (lines ~346–411) with the two-branch logic above. The following cases in the current code are superseded and should be removed:

- The `awaitPlacement` tray top-dock special case (now handled by general rule)
- The `allowPieceTap` bottom-dock special case (now handled by general rule)
- The `targetRef === 'center'` above-orb calculation (replaced by: always upper)
- The `portalCenterY < midY` floating above/below flip logic

---

## What Not to Change

- Horizontal centering logic — keep as-is
- `CALLOUT_MAX_W`, `CALLOUT_SIDE_PAD`, `CALLOUT_GAP` constants — unchanged
- `CALLOUT_H_EST` / `CALLOUT_H_EST_LONG` — unchanged, still used for lower anchor calculation
- The `calloutOpacity` animation — unchanged

---

## Acceptance Criteria

- [ ] Dialogue card appears at `top: 80` when the spotlight/orb is in the lower half of the screen
- [ ] Dialogue card appears at `top: ~576` when the spotlight/orb is in the upper half of the screen
- [ ] Card never overlaps the spotlight/orb target
- [ ] Card position is stable across all Axiom sector levels (A1-1 through A1-8)
- [ ] Presentation Mode center steps use upper position
- [ ] No regressions on `awaitPlacement` or `allowPieceTap` step behavior

---

## Test Levels

Verify against: A1-1, A1-2, A1-3, A1-4, A1-5, A1-7 (all observed to have floating card issues).
