# Build 20 A1-1 SIGABRT — Root Cause Investigation

Date: 2026-05-02
Author: Code (claude-opus-4-7)
Incident: Build 20 (TestFlight, version 0.9.265, build number 20, commit cd9ca57)
crashes on launching A1-1, same crash class as Build 19 SIGABRT (`88c0b99`).

---

## Verification of prior fix (Step 1 of brief)

- `96a4aba` modifies `src/components/TutorialHUDOverlay.tsx` and
  `src/hooks/useGameplayTutorial.ts`. It moves the `dimOpacity`
  `Animated.View` out of a ternary that swapped its parent on
  `awaitPlacement` / `allowPieceTap` toggles; the dim
  `Animated.View` is now unconditionally rendered, and only the
  sibling `Pressable` is conditionally mounted.
- `git merge-base --is-ancestor 96a4aba cd9ca57` → **YES**.
  The fix IS in Build 20.
- Inspecting the live source confirms the fix is intact:
  `TutorialHUDOverlay.tsx:858` is the single, always-mounted host
  for `dimOpacity`. The conditional sibling at line 859 is a bare
  `Pressable`, no `Animated.View` inside.

The dimOpacity fix held. Build 20 is crashing for a different reason.

---

## Root cause — REQ-A-1 violation on `glowPulse`

A second `Animated.Value` declared with `useNativeDriver: true`
exhibits the same parent-swap pattern that caused Build 19. It was
not noticed during the Build 19 corrective action work because:

1. The `__tests__/lint/nativeDriverHostUniqueness.test.ts` static
   check (added post-Build-20 in `ee66456`) only flags violations
   when a conditional render marker (`?`, `&&`, `if (`) appears
   within 5 lines above each host. The hosts involved here sit
   inside conditional branches whose opening line is 20+ lines
   above the `<Animated.View` — out of the scan's window. The
   check returns PASS even though the violation is real.
2. The Build 19 incident centered on `dimOpacity`. `glowPulse`
   was not in scope for the incident review.

### Anatomy of the violation

`glowPulse` is declared at `TutorialHUDOverlay.tsx:188`. It is
animated by an `Animated.loop` running `Animated.timing` with
`useNativeDriver: true` (lines 615-630). The loop starts whenever
`showPieceGlow` flips true (line 612-634).

`glowPulse` is consumed via `.interpolate(...)` for `opacity` on
**seven distinct `Animated.View` hosts**, mounted across three
independent conditional branches:

| Lines | Host group | Conditional |
|-------|------------|-------------|
| 882, 883, 884, 885 | 4 corner brackets (portal corners) | `phase !== 'flying' && phase !== 'idle' && portalBox` |
| 932, 946 | 2 piece-glow inner/outer rings | `showPieceGlow && glowCircle` |
| 971 | Spotlight rings (mapped) | `showSpotlights && targetLayout && spotlightCells && spotlightCellSize` |

These three branches mount and unmount independently as the
tutorial advances:

- Step 0 (`cogs-intro`, `targetRef: 'center'`): no portal box → no
  corners; not arrived on a piece target → no piece glow; not a
  board step → no spotlights. Zero `glowPulse` hosts.
- Step 1 (`board-intro`, `targetRef: 'boardGrid'`): portal exists
  → 4 corners; `boardGrid` is a section target so
  `showPieceGlow` is false; `showSpotlights` is true on A1-1
  → 2 spotlights (source + terminal). **6 `glowPulse` hosts.**
- Step 2 (`source-collect`, `targetRef: 'sourceNode'`): portal
  exists → 4 corners; non-section target arrived → piece glow on
  → 2 piece-glow rings; not a board step → spotlights gone.
  **6 `glowPulse` hosts, but 2 of them are NEW Animated.View
  instances and 2 are GONE compared to step 1.**

The parent-swap fires on every `'flying' → 'arrived'` transition
because `showPieceGlow` depends on `phase === 'arrived'`: the
piece-glow `Animated.View` instances unmount during `'flying'` and
remount on `'arrived'`. The native loop is still running across
that boundary, so the new mounts try to attach a value the native
side has already claimed. iOS raises SIGABRT — the same root cause
class as Prompt 93 `portalOpacity` and Build 19 `dimOpacity`.

### Why the crash surfaced now

The pattern has existed since `477238a` (`source`/`terminal`
rename), but the `showSpotlights` branch is only ever true on
A1-1's board-intro step (gated by `levelId === 'A1-1'` at
TutorialHUDOverlay.tsx:804). Earlier crashes (Build 19) happened
at step 5 (`awaitPlacement` toggle on `dimOpacity`) before the
user ever transitioned beyond the `glowPulse` hot zone. With
96a4aba removing the dimOpacity crash, users now progress past
step 1 → step 2 — which is exactly the transition that swaps
`glowPulse`'s host parents.

---

## Other Build-20 candidates that were ruled out

- **Other native-driven values in TutorialHUDOverlay.tsx**:
  `exitOpacity` (1 host, line 850), `dimOpacity` (1 host, line
  858, post-96a4aba), `calloutOpacity` (1 host, 992),
  `glowOpacity` (1 host, 914), `codexTranslate` (1 host, 1056).
  All comply with REQ-A-1.
- **Native-driven values across `src/`**: a single-pass scan
  (broader than `nativeDriverHostUniqueness.test.ts`) of all 65
  `.tsx` files found no other multi-host violations.
- **Build 20 `cd9ca57` deltas** (requiredPieces enforcement +
  K1-7 fix): none of the changes touch A1-1 or the tutorial
  overlay's animation tree. They only run after a successful
  Engage on Kepler levels with `requiredPieces`.
- **`react-native-reanimated` mixing**: `GameplayScreen.tsx` uses
  reanimated `useSharedValue` for `screenOpacity` only. Reanimated
  `Animated.View` is not mixed with RN `Animated.Value` instances.

---

## Proposed fix (lowest blast radius)

**Switch `glowPulse` to `useNativeDriver: false`.**

`TutorialHUDOverlay.tsx` lines 617 and 623:

```ts
Animated.timing(glowPulse, { toValue: 1, duration: 600,
  easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
Animated.timing(glowPulse, { toValue: 0.7, duration: 600,
  easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
```

Change both to `useNativeDriver: false`. REQ-A-1 only constrains
**native-driven** values; downgrading the loop to the JS driver
removes the single-host constraint and leaves all seven consumers
valid.

### Why JS driver is acceptable here

- `glowPulse` only drives `opacity` interpolations on small chrome
  elements (4 corner brackets ~16x16, two glow rings, ≤2 spotlight
  rings). The bridge cost per frame is trivial.
- The same Animated.View tree already runs portal layout on the
  JS driver (`portalLeft`, `portalTop`, `portalW`, `portalH`,
  `portalOpacity` all use `useNativeDriver: false` per the
  comment at lines 445-449 — Prompt 93 Fix 1). Mixing native
  and JS opacity on the same `Animated.View` is itself a known
  crash. JS driver across the whole tutorial chrome is the
  consistent shape.
- The tutorial is suspended during beam execution (Prompt 99B,
  `isBeamActive` ref). The JS thread is not under load when the
  glow loop runs.

### Alternative (more invasive, not recommended)

Refactor per REQ-A-2: collapse all seven hosts into a single
always-mounted Animated.View whose children swap. This requires
rebuilding the corner bracket / piece-glow / spotlight render
trees and is a much larger diff. The native-driver perf gain on
4-7 small opacity interpolations is not worth the regression
surface. Reserve REQ-A-2 refactor for a future polish pass if the
JS-driver loop ever shows up in profiles.

---

## Verification steps for the fix

1. Apply the two-line change in `TutorialHUDOverlay.tsx`.
2. Run `npx expo lint && npx tsc --noEmit && npm test`. All four
   quality gates must hold. Coverage floors unchanged.
3. Backport the lint test from `ee66456` (or write a new one with
   a wider conditional-context window) into Build 20 source so
   future regressions are caught at CI rather than TestFlight.
   The current scan misses any host whose conditional branch is
   more than 5 lines above the host line; widen the lookback
   window or, better, count hosts unconditionally and let the
   author justify deliberate multi-host cases via a code comment
   the scan ignores.
4. Pre-TestFlight smoke per `docs/PRE_TESTFLIGHT_CHECKLIST.md`:
   walk A1-1 step 0 → step 7, attempting the engage. Specifically
   verify the `step 1 → step 2` boundary (board-intro to
   source-collect) — that is the parent-swap moment.

---

## Cross-references

- `docs/ANIMATION_RULES.md` REQ-A-1, REQ-A-2 — canonical clauses.
- `project-docs/REPORTS/se-build19-corrective-actions.md` —
  prior corrective action surface (Build 19 dimOpacity).
- `__tests__/lint/nativeDriverHostUniqueness.test.ts` (in
  `ee66456`, not yet in Build 20 source) — the scan that should
  have caught this; widening its conditional-context window is
  required.
- `docs/TRIBAL_KNOWLEDGE.md` Section 2 — Native-driver
  Animated.View parent-swap (SIGABRT pattern).
