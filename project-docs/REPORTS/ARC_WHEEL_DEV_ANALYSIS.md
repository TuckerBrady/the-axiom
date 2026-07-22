# ARC WHEEL — Dev Analysis Report

Author: WRENCH (Dev Department)
Date: 2026-05-11
Scope: Investigate old ArcWheel implementation, determine if Build 19 crash was inherent to the wheel pattern or incidental to integration, assess rebuild feasibility.

---

## 1. Old Implementation Summary

### What it was

ArcWheel is a vertical pill-shaped piece selector that sits on the left or right edge of the gameplay screen. It displays up to 5 visible piece nodes in a stacked column, with the selected/center node rendered largest and nodes above/below scaling down proportionally (fish-eye effect). The player scrolls vertically via PanResponder swipe to cycle through pieces, taps a node to select it, and long-presses (180ms hold) to initiate a drag-to-place interaction. The entire pill can be swiped horizontally to dismiss it offscreen, leaving a thin 5px recall strip.

### Animated.Values — 14 total

| Value | Purpose | Native driver? |
|-------|---------|----------------|
| `slideAnim` (line 110) | Horizontal dismiss/recall translation | No |
| `idleAnim` (line 111) | Opacity fade between idle (0.18) and active (1.0) states | No |
| `entranceY[0..4]` (line 120) | 5 per-node vertical entrance offsets, staggered alternating above/below | No |
| `entranceOpacity[0..4]` (line 123) | 5 per-node fade-in during entrance animation | No |
| Fallback `new Animated.Value(0)` / `new Animated.Value(1)` (lines 317-318) | Safety fallback when `relIdx` exceeds array bounds | No |

Every single animation uses `useNativeDriver: false`. The ArcWheel component itself has zero native-driven values.

### Component tree

```
Animated.View (container, translateX: slideAnim)
  TouchableOpacity (recall strip, visible when dismissed)
  Animated.View (pill body, opacity: idleAnim)
    View (empty state) — conditional: pieces.length === 0
    Animated.View[] (per-node wrappers, translateY: entranceY, opacity: entranceOpacity)
      View (nodeWrapper, ref: mainNodeRef when selected)
        TouchableOpacity (node, pressIn/pressOut/press handlers)
          PieceIcon
          View[] (4 corner brackets, conditional: isSelected)
        Text (label, conditional: isSelected)
```

Two PanResponders operate on the pill body: `scrollPan` (vertical swipe to cycle) and `dismissPan` (horizontal swipe to dismiss). Both are disabled during drag state.

### Integration points

The ArcWheel is rendered twice in GameplayScreen (lines 1516-1545):
1. Kepler+ levels: `!isAxiomLevel && requisitionPhase === 'placement'` — full inventory, no tutorial ref.
2. Axiom tutorial levels: `hasAxiomArcWheel` — filtered to `tutorialFocusPiece` only, passes `mainNodeRef` for tutorial orb targeting.

The `mainNodeRef` prop is attached via `ref={isSelected ? mainNodeRef : undefined}` on the nodeWrapper View (line 331). This is a plain View ref, not an Animated.Value — it poses no animation host-swap risk.

---

## 2. Crash Root Cause — Incidental, Not Inherent

### The crash was NOT in ArcWheel

Build 19 (commit `88c0b99`) crashed on A1-1 step 5. The crash was a SIGABRT caused by `dimOpacity` host swap in `TutorialHUDOverlay.tsx`, not in `ArcWheel.tsx`.

Per `ANIMATION_RULES.md` incident history and `se-build19-corrective-actions.md`:

> The arc-wheel-tutorial commit introduced a ternary 200 lines below the existing comment and reintroduced the identical anti-pattern (`dimOpacity` host swap on `awaitPlacement` toggle). Crash on A1-1 step 5.

The `awaitPlacement` field was added to tutorial step types as part of the arc-wheel-tutorial feature. When this field toggled, the TutorialHUDOverlay conditionally mounted/unmounted an `Animated.View` consuming `dimOpacity` (which was native-driven). The native binding orphaned on unmount, and the remount on the next step triggered SIGABRT.

Post-fix state (commit `96a4aba`, confirmed in `build20-a1-1-sigabrt-investigation.md` lines referencing TutorialHUDOverlay.tsx:858):

```
dimOpacity Animated.View is now unconditionally rendered (line 893).
Only the sibling Pressable is conditionally mounted (line 894).
```

### Which value, which branch

- **Value**: `dimOpacity`, declared at `TutorialHUDOverlay.tsx:189`, animated with `useNativeDriver: true` (originally).
- **Branch**: The `awaitPlacement` toggle on tutorial steps caused a ternary that swapped whether the `Animated.View` consuming `dimOpacity` was mounted. This was in the TutorialHUDOverlay render tree, not in ArcWheel.

### Inherent vs incidental — verdict: INCIDENTAL

The crash was caused by how the tutorial overlay integrated with the new `awaitPlacement` step type that the arc-wheel-tutorial feature introduced. The ArcWheel component itself:

1. Uses zero native-driven Animated.Values (all 14 use `useNativeDriver: false`).
2. Has no conditional host-swap pattern — every `Animated.View` is either always-mounted or part of a simple list slice.
3. The `mainNodeRef` is a plain View ref, not an animation target.

**Would the crash have occurred without the tutorial overlay?** No. The ArcWheel on Kepler levels (no tutorial, no `mainNodeRef`) has never crashed. The crash required the combination of: (a) a new `awaitPlacement` step type, (b) a conditional render branch in TutorialHUDOverlay that swapped a native-driven animation host based on that field.

Build 20 subsequently revealed a second crash (`glowPulse`, same SIGABRT class) also in TutorialHUDOverlay, also triggered by conditional branch host swaps — further confirming the crash pattern lives in the overlay's animation tree, not in the wheel.

---

## 3. Rebuild Feasibility Under R1-R4

Note: `GAMEBOARD_REBUILD_PLAN.md` was not found in the mounted workspace. The following assessment uses the animation rules from `ANIMATION_RULES.md` (REQ-A-1 through REQ-A-3) as the governing constraints, which represent the same safety principles.

### Strip the crash-causing pattern — what remains?

The ArcWheel never had the crash-causing pattern. Its entire animation surface is already clean:

| Rule | ArcWheel compliance |
|------|-------------------|
| REQ-A-1 (single-host invariant for native-driven values) | Compliant by default — zero native-driven values |
| REQ-A-2 (persistent host on state transitions) | All Animated.Views are either persistent (container, pill) or list-rendered with stable keys |
| REQ-A-3 (code review grep mandate) | Would pass trivially — no native-driven values to grep |

### Can the core wheel interaction work safely?

Yes. The interaction model (vertical scroll to cycle, tap to select, long-press to drag, horizontal swipe to dismiss) is mechanically independent of the animation driver choice. All animations are cosmetic transitions (slide, fade, entrance stagger) that work correctly on the JS driver.

### Minimum Animated.Values needed

For a faithful rebuild of the core wheel:

| Value | Purpose | Removable? |
|-------|---------|-----------|
| `slideAnim` | Dismiss/recall horizontal translation | Required if dismiss feature is kept |
| `idleAnim` | Active/idle opacity transition | Could replace with simple state + opacity style (no animation needed) |
| `entranceY[N]` | Staggered node entrance | Nice-to-have, not functional |
| `entranceOpacity[N]` | Staggered node fade-in | Nice-to-have, not functional |

**Minimum**: 1 (slideAnim for dismiss). Could be 0 if dismiss is removed and the wheel is always visible.

**Recommended**: 2 (slideAnim + idleAnim) for the dismiss and idle-state behaviors that make the wheel unobtrusive during gameplay.

The entrance stagger (10 values) is a polish animation that fires once on mount. It could be deferred to a later polish pass or simplified to a single group fade.

---

## 4. Complexity Comparison — Wheel vs Tray

### PieceTray (current simple tray)

- **Lines**: 133 (including styles)
- **Animated.Values**: 0
- **PanResponders**: 0
- **State variables**: 0 (stateless — all state lifted to parent)
- **Interaction model**: Horizontal ScrollView, tap to select
- **Tutorial integration**: Optional `refs` prop for per-piece-type measurement refs
- **Render complexity**: Single map over `trayPieceTypes`, no windowing or slicing

### ArcWheel (old implementation)

- **Lines**: 406 (including styles)
- **Animated.Values**: 14
- **PanResponders**: 2 (scroll + dismiss)
- **State variables**: 4 (`dismissed`, `isActive`, `selectedIndex`, `isDragging`)
- **Refs**: 6 (`activeTimer`, `dragHoldTimer`, `dragStartPos`, `dragPieceIndex`, `isDraggingRef`, `scrollDelta`)
- **Interaction model**: Vertical PanResponder scroll, tap select, long-press drag, horizontal dismiss
- **Tutorial integration**: `mainNodeRef` prop attached to selected node
- **Render complexity**: Windowed slice (selectedIndex +/- 2), per-node scale/opacity interpolation

### Ratio

ArcWheel is roughly 3x the code volume of PieceTray, with substantially more interaction state. The additional complexity comes from:

1. **Manual scroll management** — PanResponder scroll reimplements what ScrollView gives for free, adding gesture threshold logic, wrap-around index math, and haptic feedback timing.
2. **Dismiss/recall behavior** — A feature unique to the wheel (the tray is always visible).
3. **Fish-eye scaling** — Per-node size/opacity interpolation based on distance from selected index.
4. **Drag initiation** — Long-press timer with hold threshold, separate from tap handler.
5. **Entrance stagger** — 10 Animated.Values for a one-time cosmetic effect.

---

## 5. Recommendation — Code Safety Perspective

### The ArcWheel is safe to rebuild

The Build 19 crash was not caused by anything in the ArcWheel component. It was caused by a host-swap anti-pattern in TutorialHUDOverlay that was introduced alongside the arc-wheel-tutorial feature but is architecturally separate. The wheel's own animation surface uses `useNativeDriver: false` throughout and has no conditional host-swap patterns. A rebuild of the ArcWheel would not reintroduce the crash.

### Conditions for a safe rebuild

1. **Keep `useNativeDriver: false` on all wheel animations.** The existing implementation already does this. A rebuild should maintain it. The wheel's animations (slide, fade, entrance) are cosmetic chrome on small elements — JS driver cost is negligible.

2. **Do not pass Animated.Values across the wheel/overlay boundary.** The old implementation correctly isolates its animations. The only cross-boundary prop is `mainNodeRef` (a plain View ref for measurement). Keep it that way.

3. **Tutorial integration via ref measurement, not shared animation state.** The `mainNodeRef` pattern (attach ref to selected node, let overlay measure it) is the correct approach. It avoids coupling the wheel's animation tree to the overlay's animation tree.

4. **Simplification opportunities if rebuilding from scratch:**
   - Replace PanResponder scroll with a vertical FlatList or ScrollView with snap points — eliminates manual index math and gesture thresholds.
   - Replace entrance stagger with LayoutAnimation or a single group Animated.Value — drops 10 values to 1.
   - Consider whether dismiss/recall is needed — if not, eliminate slideAnim entirely.

### Risk assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Reintroducing native-driver host swap in overlay integration | High | REQ-A-1..3 + static lint check already in CI |
| PanResponder gesture conflicts with board gestures | Medium | Existing implementation already handles this via `isDraggingRef` guard |
| Complexity budget vs. simple tray | Low | Wheel is 3x code but provides meaningfully different UX (vertical space efficiency, dismiss capability) |
| Entrance animation perf on JS driver | Negligible | 10 opacity+translate animations on mount, one-time cost |

### Bottom line

The ArcWheel pattern is safe. The crash was incidental to tutorial overlay integration, not inherent to the wheel. A rebuild under the existing animation rules (all JS driver, no host swaps, persistent hosts) would produce a component that cannot trigger the SIGABRT class. The 3x complexity premium over a simple tray is real but manageable, and the wheel provides UX benefits (vertical space preservation, dismissibility) that may justify it depending on design goals.

---

## Cross-References

- `src/components/gameplay/ArcWheel.tsx` — old implementation (still in repo)
- `src/components/gameplay/PieceTray.tsx` — simple tray for comparison
- `docs/ANIMATION_RULES.md` — REQ-A-1..3, incident history
- `project-docs/REPORTS/se-build19-corrective-actions.md` — Build 19 fix and test surface
- `project-docs/REPORTS/build20-a1-1-sigabrt-investigation.md` — Build 20 confirms crash in overlay, not wheel
- `project-docs/REPORTS/qa-arc-wheel-tutorial.md` — QA review of commit 88c0b99
- `docs/TRIBAL_KNOWLEDGE.md` Section 2 — Native-driver SIGABRT pattern
