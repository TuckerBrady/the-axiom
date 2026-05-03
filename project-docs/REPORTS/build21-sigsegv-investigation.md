# Build 21 A1-1 SIGSEGV — Root Cause Investigation

Date: 2026-05-02
Author: Code (claude-opus-4-7)
Incident: Build 21 (TestFlight) crashes on launching A1-1 ~4 seconds
after launch (launch 17:33:26 → crash 17:33:30). Crash class is
SIGSEGV / KERN_INVALID_ADDRESS, distinct from the SIGABRT classes of
Builds 19 and 20.

Crash report:
- Exception Type: EXC_BAD_ACCESS (SIGSEGV)
- Exception Subtype: KERN_INVALID_ADDRESS at 0x000000000000000a
- Triggered by Thread: 12 (JS thread)
- Inner stack (Hermes): HiddenClass::getHasIndexLikeProperties →
  JSObject::addOwnPropertyImpl → JSObject::putComputedWithReceiver_RJS
- Outer stack: three nested arrayPrototypeMap frames
  (Array.cpp:2950), inside RuntimeScheduler_Modern::runEventLoopTick
- Thread 6 simultaneously inside TurboModule
  convertNSExceptionToJSError

---

## TL;DR

The SIGSEGV is **not** a literal triple-`.map()` bug in user code. The
A1-1 init render path was audited in full and **no triple-nested
`.map()` over non-empty data exists** at launch.

The most likely root cause is the **next link in the chain of
native-driver host-swap crashes** that fixes 96a4aba (dimOpacity) and
bd4ed90 (glowPulse) have been working through. Three more
`Animated.Value`s in `TutorialHUDOverlay.tsx` are still declared with
`useNativeDriver: true` *and* consumed by **conditionally-mounted**
`Animated.View` hosts:

| Value | Declaration | Consumer | Conditional gate | First fires |
|-------|-------------|----------|------------------|-------------|
| `calloutOpacity` | line 186 | line 1010 (callout) | `phase === 'arrived' && calloutPos` | A1-1 step 0→1 (cogs-intro → board-intro) |
| `glowOpacity` | line 187 | line 934 (piece glow) | `showPieceGlow && glowCircle` | A1-1 step 1→2 (board-intro → source-collect) |
| `codexTranslate` | line 190 | line 1066 (codex sheet) | `codexVisible && codexEntry` | A1-1 step 6 (conveyor-capture) |

Build 21 is the first build where users can **reach** the
`calloutOpacity` host-swap because Builds 19 and 20 crashed earlier in
the sequence. The 4-second crash window matches step 0 → step 1
exactly: 400 ms hydration delay + ~1 s orb fly-in to center + user
tap + ~1 s board reveal.

When the native Animated module hits the parent-swap on
`calloutOpacity` it raises an Objective-C `NSException` (the "node
moved to native earlier" check). Thread 6's
`convertNSExceptionToJSError` is exactly that path. The JS thread
receives the exception mid-render. If the reconciler is iterating a
children array at that moment, the partially-detached state can
expose an unsafe pointer to Hermes; the next render's
`arrayPrototypeMap` then dereferences a HiddenClass at address 0xa.

The reported "three nested arrayPrototypeMap" frames are call-stack
nesting (recursive React reconciliation iterating render output that
itself contains `.map()` blocks), not a single triple-nested `.map()`
in source.

---

## Step 1 — Verify the bd4ed90 glowPulse fix is intact

- `git show bd4ed90` modifies only
  `src/components/TutorialHUDOverlay.tsx` lines 617 and 623,
  flipping `useNativeDriver: true → false` on both halves of the
  glowPulse loop.
- Live source confirmed at lines 627-638: both `Animated.timing`
  calls inside the `glowPulse` loop are JS-driver post-fix.
- The change is two lines plus one explanatory comment block. **No
  side effect on the render pipeline is plausible from this delta
  alone.** glowPulse continues to drive `.interpolate(...)` on the
  same seven Animated.View hosts, but the value tree is now JS so
  the multi-host constraint is moot.

The bd4ed90 fix did its job. It also unblocked progression past the
former crash point, exposing the next latent fault.

---

## Step 2 — Audit triple-nested `.map()` patterns on the A1-1 init path

A repo-wide grep for `.map(` was filtered down to chains that could
be reached during A1-1 launch. Findings:

### Two-level `.map()` (executed at launch, safe)

- `src/store/gameStore.ts:143` — `setLevel`:
  `level.prePlacedPieces.map(p => ({ ...p, ports: p.ports.map(port => ({ ...port })) }))`.
  Outer iterates 2 prePlaced pieces (source, terminal), inner
  iterates ~4 ports each. Spread allocates new objects; ports are
  fresh arrays. Runs once per level mount. No triple nesting.
- `src/screens/GameplayScreen.tsx:1259-1270` — dot grid:
  `Array.from({ length: numRows + 1 }, (_, y) => Array.from({ length: numColumns + 1 }, (_, x) => <Circle ... />))`.
  Two levels via `Array.from` mapper. Hermes implements `Array.from`
  via its own iteration intrinsic (`arrayFrom`), **not** via
  `Array.prototype.map`. So these frames would not symbolicate as
  `arrayPrototypeMap` even though structurally they are nested
  iterations. 81 Circles for an 8×8 board (numRows + 1 = 9, same
  for cols).
- `src/screens/GameplayScreen.tsx:1373-1418` — ghost cells:
  same `Array.from` × `Array.from` pattern, gated on
  `selectedPieceFromTray`. **Not active at A1-1 launch** — no
  piece is selected yet (the wheel has its own internal selection
  but `selectedPieceFromTray` in `gameStore` is `null` until the
  user taps).

### Three-level `.map()` (in source, but inactive at launch)

The only literal triple-nested `.map()` chain in the codebase is in
`src/components/gameplay/BeamOverlay.tsx:84-97`:

```tsx
{beamState.branchTrails.map((branch, bi) =>          // outer
  branch.map((seg, si) => (                          // middle
    seg.points.length > 1 ? (
      <Polyline
        ...
        points={seg.points.map(p => `${p.x},${p.y}`).join(' ')}  // inner
        ...
```

At init, `BEAM_INITIAL` (`src/game/engagement/types.ts:111`) sets
`trails: []`, `branchTrails: []`, `heads: []`. All three `.map()`
calls fire on empty arrays → no callback invocations → no element
allocations. The pattern only activates during ENGAGE pulse
animation, never at launch. **Ruled out as the culprit.**

### Other .map sites checked

- `src/screens/GameplayScreen.tsx:439` —
  `new Map(pieces.map(p => [p.id, p]))`. Single level.
- `src/screens/GameplayScreen.tsx:486` — Arc Wheel piece list,
  single level on 1 element.
- `src/components/gameplay/BoardGrid.tsx:52` — `pieces.map`, single
  level on 2 elements at launch.
- `src/components/gameplay/WireOverlay.tsx:84` — `wires.map`, on
  empty array at launch (source/terminal at (4,1) and (4,6) are
  not adjacent → `autoConnectPhysicsPieces` returns `[]`).
- `src/components/TutorialHUDOverlay.tsx:841-855` — message
  highlight render. Two levels (`amberWords.map` then `parts.map`)
  on the active step. A1-1 step 0 (`cogs-intro`) has no
  `highlightWords`/`highlightAmberWords`, so the inner branch
  short-circuits.

---

## Step 3 — Audit A1-1 level data for malformed entries

`src/game/levels.ts:42-137` defines `levelA1_1`. All entries
checked:

- `prePlacedPieces`: 2 well-formed `PlacedPiece` instances built by
  `prePlaced(...)`. Ports populated by `getDefaultPorts(type)`. No
  undefined/null in the array.
- `availablePieces`: 4 conveyor strings.
- `dataTrail`: `{ cells: [], headPosition: 0 }`.
- `objectives`, `tutorialHints`, `tutorialSteps`: all dense arrays
  of well-formed objects.
- No `undefined` slots, no shared mutable refs, no `null`
  placeholders.

`pieceCounter` is reset to 0 before A1-1 (`src/game/levels.ts:36`)
and to 100 before A1-2 (line 139). IDs (`pre-source-1`,
`pre-terminal-2`) are deterministic across mounts. No collisions.

---

## Step 4 — Audit Animated.Value lifetime in TutorialHUDOverlay

Surveyed every `useNativeDriver: true` usage in
`src/components/TutorialHUDOverlay.tsx`. The native-driven values
and their hosts:

| Value | Host line | Host condition | Status |
|-------|-----------|----------------|--------|
| `exitOpacity` | 862 | always-mounted root | SAFE |
| `dimOpacity` | 868 | always-mounted (96a4aba fix) | SAFE — and now JS driver post-96a4aba |
| `glowPulse` | 892-895, 952, 967, 993 | seven hosts across conditionals | SAFE — now JS driver post-bd4ed90 |
| `glowOpacity` | 934 | `{showPieceGlow && glowCircle && (...)}` | **VIOLATION** |
| `calloutOpacity` | 1010 | `{phase === 'arrived' && calloutPos && (...)}` | **VIOLATION** |
| `codexTranslate` | 1070 | `{codexVisible && codexEntry && (...)}` | **VIOLATION** |
| `orbCollectAnim` | various | passed through `orbCollectAnim.interpolate(...)` on always-mounted orb (line 1037) | SAFE — and runs JS driver per its declaration |

For `glowOpacity` / `calloutOpacity` / `codexTranslate` the parent
`Animated.View` is conditionally mounted. Each step transition that
flips the gate from true → false → true (e.g.,
`phase: 'arrived' → 'flying' → 'arrived'`) tears down the host's
native node and remounts a new one. The next
`Animated.timing(value, { useNativeDriver: true }).start()` call
attaches that value to the new host while the native side still
holds the binding for the prior host. iOS RN's "Animated node …
moved to native earlier" check raises NSException → the same crash
class as Build 19/20.

### Why the Build 20 lint guard didn't catch them

`__tests__/lint/nativeDriverHostUniqueness.test.ts` flags
`uniqueHosts.length > 1`, i.e., a native-driven value that appears
in **multiple** Animated.View hosts in the source. A single host
that is *conditionally mounted* (one `<Animated.View>` inside an
`{condition && (...)}`) has `uniqueHosts.length === 1`, so it
passes. The runtime crash class is identical (parent-swap of the
native node), but the static signature is different.

---

## Step 5 — Why the crash manifests as SIGSEGV, not SIGABRT

Builds 19 and 20 hit the same anti-pattern and produced SIGABRT (RN
abort path). Build 21 is SIGSEGV. The difference is a function of
*when* the parent-swap fires inside the render cycle.

When the host parent swap is detected on a `useNativeDriver: true`
value, iOS RN raises NSException from the Animated TurboModule. The
runtime path:

1. `RCTNativeAnimatedNodesManager` raises NSException.
2. The TurboModule shim catches via `convertNSExceptionToJSError`
   (Thread 6 in the crash report).
3. The exception is forwarded to the JS thread as a thrown JS
   error.
4. If the JS thread is **idle**, the error surfaces cleanly and
   RN's unhandled-rejection path calls `abort()` → SIGABRT (Build
   19/20 path).
5. If the JS thread is **mid-render** (currently inside React
   reconciliation, which is itself iterating children arrays via
   `arrayPrototypeMap`), the thrown error short-circuits the
   reconciler. React's children arrays end up in a partially-
   processed state with stale or freed JS object references.
6. The next reconciliation pass tries to write properties on those
   partially-freed objects → Hermes hits a HiddenClass at 0xa →
   SIGSEGV.

The bd4ed90 glowPulse fix changed the timing of the next failure.
Pre-fix, glowPulse crashed during `Animated.loop` startup (a quiet
moment, JS thread idle, → SIGABRT). Post-fix, the next eligible
violation is `calloutOpacity` whose `Animated.timing` is invoked
**inside** a `flyOrbTo` `.start()` callback that fires synchronously
during the React render cycle (after `setPhase('arrived')` queues
the callout mount). The error lands mid-render → SIGSEGV.

This is consistent with the
"three nested arrayPrototypeMap (Array.cpp:2950)" call stack: React
reconciliation iterates the overlay's render output, which contains
`.map()` blocks for the message highlights (line 850), which itself
sits inside the always-mounted root that contains the freshly-
mounted callout.

---

## Step 6 — Why the timer matches (4 seconds)

A1-1 step 0 (`cogs-intro`, `targetRef: 'center'`) sequence:

1. Mount: `0 ms`. AsyncStorage hydration begins.
2. `didStartRef`-gated mount effect schedules `runStep(0)` at
   `400 ms`. dimOpacity native fade-in starts at the same moment.
3. `runStep(0)` calls `flyOrbTo(SCREEN_W/2, SCREEN_H/2)` —
   `Animated.spring`, JS driver, ~600-800 ms to settle.
4. On settle, `setPhase('arrived')`. Center step → `box = null`,
   so neither `morphPortalIn` nor `morphBoardReveal` runs. Just a
   bare `Animated.timing(calloutOpacity, useNativeDriver: true)`
   with duration 200 ms (line 564-568). Total elapsed: ~1.4 s.
5. The callout mounts (line 1001). `calloutOpacity` is bound to
   its first native node here. The 200 ms tail completes.
6. User taps to advance → `advanceStep()` → `setCurrentStepIndex(1)`
   → `runStep(1)` → `setPhase('flying')` → callout unmounts (the
   native node detaches). Some ms elapse for the next measure.
7. `flyOrbTo` to boardGrid center (~600-800 ms). Then
   `setPhase('arrived')` → callout **remounts** at line 1001 with
   a fresh `Animated.View` host.
8. `morphBoardReveal` parallel anim starts, then on completion runs
   `Animated.timing(calloutOpacity, useNativeDriver: true)` (line
   509-513). **This is the parent-swap moment.** The native side
   still has the binding from step 5; the new mount has no native
   node bound; iOS raises.

A reasonably attentive user reaches the step 0 → step 1 transition
in 3-4 seconds. The crash report's 4-second window is a clean fit.

---

## Step 7 — On the "corrupted data" hypothesis from the brief

The brief asks whether the bd4ed90 fix could have introduced a
side effect that corrupts data passed to `.map()`. Re-checked:

- bd4ed90 only edits two `useNativeDriver: true → false` flags and
  adds a comment. No structural changes, no closure changes, no
  ref-handling changes.
- The seven Animated.View hosts that consume `glowPulse` are
  unchanged. They still render the same JSX with the same
  `glowPulse.interpolate(...)` calls.
- `glowPulse` runs continuously when `showPieceGlow` is true. JS
  driver means each tick triggers a small bridge round-trip per
  host (~7 hosts × 60 fps = 420 round-trips/s). This is *back-
  pressure* on the JS thread, not corruption. It can degrade
  performance but cannot fabricate a bad pointer.

No data-corruption pathway from the glowPulse change is plausible.
The fix is sound; the crash is a different REQ-A-1 violation
surfacing because the overlay can now reach the next step.

---

## Proposed fix (lowest blast radius)

**Switch `calloutOpacity`, `glowOpacity`, and `codexTranslate` to
`useNativeDriver: false`.** This is the same remedy as 96a4aba
(dimOpacity) and bd4ed90 (glowPulse): REQ-A-1 only constrains
**native-driven** values, so demoting them to the JS driver makes
the parent-swap pattern legal.

### Edits

`src/components/TutorialHUDOverlay.tsx`:

1. Line 463-468 (morphPortalIn tail glowOpacity): `true → false`.
2. Line 469-473 (morphPortalIn tail calloutOpacity): `true → false`.
3. Line 509-513 (morphBoardReveal tail calloutOpacity):
   `true → false`.
4. Line 564-568 (runStep center step calloutOpacity tail):
   `true → false`.
5. Line 651-656 (codex slide-in codexTranslate): `true → false`.
6. Line 748-752 (handleCodexUnderstood codexTranslate slide-out):
   `true → false`.

Add an explanatory comment block above each of the six call sites
mirroring the bd4ed90 pattern, citing this report and REQ-A-1.

### Test updates

`__tests__/unit/components/TutorialHUDOverlayPerformance.test.ts`
lines 121-132: assert `useNativeDriver: false` on `calloutOpacity`
and `codexTranslate`. (`dimOpacity` was already updated post-96a4aba;
double-check that test now matches the JS-driver direction.)

`__tests__/unit/prompt93Fixes.test.ts` line 66-72: same — invert
the `glowOpacity` / `calloutOpacity` / `codexTranslate` assertions.
The test name "does not regress … to JS driver" is now backwards;
rename to "asserts the post-Build-21 JS-driver assignment" or
similar. The Prompt 93 historical context still applies to
`portalOpacity` / `portalLeft` / `portalTop` / `portalW` /
`portalH`, which remain JS driver.

### Lint check tightening

`__tests__/lint/nativeDriverHostUniqueness.test.ts` currently flags
`uniqueHosts.length > 1`. Add a parallel scan that also flags
`uniqueHosts.length === 1` when that single host is wrapped in a
conditional render branch (`{cond && <Animated.View ...>}` or a
`{cond ? <Animated.View ...> : ...}`). The conditional-mount
pattern crashes for the same root reason — the native binding
detaches on the gate falsifying — so the static check should treat
it identically.

The detection heuristic: for each Animated.View host that consumes
a native-driven value, walk back to the nearest enclosing JSX
expression-container `{...}` opener. If it contains `&&`, `?:`, or
`.map(`/`.filter(`-style call between the opener and the
Animated.View, classify as conditionally-mounted and flag.

### Pre-TestFlight smoke (per docs/PRE_TESTFLIGHT_CHECKLIST.md)

After the fix lands, walk A1-1 step 0 → step 7 on iPhone 15 Pro
Max **without skipping**. Specifically verify these transitions:

- step 0 → step 1 (cogs-intro → board-intro): callout host
  remount, board reveal morph. **This is the Build 21 crash
  point.**
- step 1 → step 2 (board-intro → source-collect): glow circle
  host first-mount, callout host remount.
- step 5 (codex on conveyor): codex sheet first-mount,
  codexTranslate native binding.
- step 5 → step 6 (codex dismiss → conveyor-teach): codex
  sheet unmount, callout remount.

Each transition should be observed for at least 2 seconds without
crash before continuing. The 8-step walk should take ~30-60
seconds end-to-end.

### Alternative (more invasive, not recommended)

Refactor the overlay so glowOpacity, calloutOpacity, and
codexTranslate live on **always-mounted** hosts whose children
swap via opacity-driven visibility. This is an REQ-A-2-style
restructure and matches the dimOpacity 96a4aba pattern. Reserve
for a polish pass — the JS-driver demotion is a one-line-per-
violation fix with minimal regression surface, and the surrounding
overlay tree already runs largely on JS driver.

---

## Why the fix is unlikely to expose yet *another* hidden crash

After this fix, the only `useNativeDriver: true` values left in
TutorialHUDOverlay.tsx are `exitOpacity` (line 191, host at 862 —
always-mounted root) and the `dim` Animated.timing in the mount
effect (line 586-590, also targets the always-mounted dim view).
Both are single-host, always-mounted, REQ-A-1 compliant.

Repo-wide grep across all `.tsx` files in `src/` confirms no other
multi-host or conditionally-mounted native-driven Animated.Value.
The only remaining native-driven values outside this file are in:

- `BeamOverlay.tsx` — `chargeProgressAnim`, `lockRingProgressAnim`,
  `voidPulseRingProgressAnim`, `beamOpacity` — all consumed by a
  single, always-mounted Animated.View tree. Safe.
- `BoardPiece.tsx` — per-piece native-driver flash anims, each on
  its own per-piece Animated.View. One value, one host per piece.
  Safe.

If a third native-driver crash class surfaces post-fix, it will
likely be in a different component, not the tutorial overlay.

---

## Cross-references

- `docs/ANIMATION_RULES.md` — REQ-A-1, REQ-A-2, REQ-A-3.
- `project-docs/REPORTS/build20-a1-1-sigabrt-investigation.md` —
  the prior fix in this chain (glowPulse).
- `project-docs/REPORTS/se-build19-corrective-actions.md` — the
  initial fix in this chain (dimOpacity).
- `__tests__/lint/nativeDriverHostUniqueness.test.ts` — the
  static check that needs the conditional-mount widening
  described in Step 7.
- `docs/TRIBAL_KNOWLEDGE.md` Section 2 — Native-driver
  Animated.View parent-swap (SIGABRT/SIGSEGV pattern).
- bd4ed90, 96a4aba — the prior fixes' commits.

---

## Summary

- **Triple-nested `.map()` over real data**: NOT FOUND in the A1-1
  init path. The literal pattern in `BeamOverlay.tsx` only
  activates during ENGAGE.
- **bd4ed90 glowPulse fix**: intact, sound, and not the cause of
  Build 21's regression.
- **Root cause (highest-confidence hypothesis)**: native-driver
  parent-swap on `calloutOpacity` at A1-1 step 0 → step 1
  transition. Same anti-pattern class as Builds 19 and 20, third
  iteration. The SIGSEGV (vs SIGABRT) symptom comes from the
  exception landing mid-render rather than at idle.
- **Fix**: demote `calloutOpacity`, `glowOpacity`, `codexTranslate`
  to `useNativeDriver: false`. Six edits across one file. No
  structural refactor required.
- **Lint tightening**: extend the existing static check to flag
  conditionally-mounted single hosts of native-driven values, not
  only multi-host violations.

Awaiting Tucker sign-off before applying the fix.

---

## Scope extension (post-approval)

When the widened lint check (FORM B detector) ran for the first
time, it surfaced two additional pre-existing FORM B violations
beyond the three covered above. Tucker authorized extending the
fix to "kill the entire bug class" rather than allowlisting:

### `flashOpacity` in `src/components/gameplay/BoardPiece.tsx:139`

Native-driven value consumed by the per-piece flash overlay
`Animated.View` wrapped in `{flashColor ? (...) : null}`. The
`GameplayScreen.handleEngage` per-pulse sweep clears `flashColor`
between pulses (`setPieceAnimState({ flashing: new Map(), ... })`
at `src/screens/GameplayScreen.tsx:894-900`), so the host genuinely
remounts on every flash during ENGAGE. **Real latent FORM B
violation** — never crashed publicly because flashes are short and
the animation completes before the next remount, but the static
shape is the same Build-21 anti-pattern.

Edit: `useNativeDriver: true → false` on both halves of the
180 ms `Animated.sequence` (`BoardPiece.tsx` lines 90, 95). Six
flash slots × per-pulse remount × JS bridge overhead is trivial
relative to the rest of the beam tick.

### `highlightOpacity` in `src/components/gameplay/TapeCell.tsx:115`

Native-driven value consumed by the tape-cell highlight overlay
`Animated.View` wrapped in `overlayColors ? (...) : null`. Mitigated
at runtime by `lastColorsRef.current` which keeps `overlayColors`
truthy after the first highlight ever fires — the host then never
unmounts. **Static shape is FORM B; runtime behavior is currently
safe.** Demoted to JS driver for two reasons:

1. The mitigation is a single ref-latch line that a future refactor
   could easily remove without realising the static check would
   still pass (it sees the latch and infers safety, but a fresh
   reader wouldn't necessarily understand the load-bearing role).
2. JS-driver cost on a 24×24-px cell overlay opacity is trivial.

Edit: `useNativeDriver: true → false` on both `Animated.timing`
calls in the highlight effect (`TapeCell.tsx` lines 102, 108).

### Files touched by the scope extension

| File | Lines | Edit |
|------|-------|------|
| `src/components/gameplay/BoardPiece.tsx` | 90, 95 | `true → false`, comment block above |
| `src/components/gameplay/TapeCell.tsx` | 102, 108 | `true → false`, comment block above |

### Final status of native-driven Animated.Values

After this fix, the only `useNativeDriver: true` values that remain
in components consumed by A1-1 are:

| File | Value | Host | Status |
|------|-------|------|--------|
| `TutorialHUDOverlay.tsx` | `dimOpacity` | always-mounted dim backdrop | SAFE |
| `TutorialHUDOverlay.tsx` | `exitOpacity` | always-mounted root | SAFE |
| `BeamOverlay.tsx` | `chargeProgressAnim`, `lockRingProgressAnim`, `voidPulseRingProgressAnim`, `beamOpacity` | single always-mounted Animated.View tree | SAFE |

All five are single, always-mounted hosts — REQ-A-1 compliant on
the native driver. The FORM A and FORM B detectors both pass on
the live source.
