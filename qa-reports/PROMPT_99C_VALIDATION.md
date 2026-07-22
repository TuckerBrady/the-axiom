# QA Validation Report: Prompt 99C

Prompt: 99C — Remaining Native Driver Migrations
Commit: b8fb203
Commit message: refactor: migrate beam-tick animations to native driver
Spec: PERFORMANCE_CONTRACT (clauses 2.1.1, 2.1.2, 2.1.5, 2.1.6, 2.1.7, 2.3.3, 3.1.3, 3.4.1, 3.5.1, 3.5.2, 7.1.1, 7.2.1)
Prompt file: cowork-prompts/PROMPT_99C.md
Date: 2026-04-26
QA Engineer: QA Department (Automated)

---

## 1. Summary

VERDICT: PASS (with one known deviation documented by Dev)

Prompt 99C completes the native driver migration series (99A/99B/99C).
Piece flash opacity, void burst rings, and tape cell highlights are all
moved from JS-thread RAF loops or instant style swaps to native-driven
Animated.Value sequences. Glow traveler setState cadence trimmed from 4
to 2 calls. Per-tick flash batching via FlashBatch eliminates the
multi-setter-per-tick violation. All targeted clauses are satisfied
except 3.5.1, where the Scanner read interaction fires 9 setState calls
against a <=2 budget — Dev documented the overflow, identified all
offending call sites, and recommended a spec revision. QA concurs this
is a spec framing issue, not a performance regression.

---

## 2. Scope of Change

24 files changed, +877/-227.

Production files changed (14):
- src/components/gameplay/BoardPiece.tsx — flashOpacity Animated.Value, flashCounter watch, native 90+90ms sequence
- src/components/gameplay/BeamOverlay.tsx — voidBurstCenter prop, AnimatedCircle for void burst
- src/components/gameplay/TapeCell.tsx — highlightOpacity per cell, native 120ms/180ms fade, colorsForHighlight palette
- src/components/gameplay/BoardGrid.tsx — minor cleanup
- src/game/engagement/beamAnimation.ts — void burst native path, FlashBatch per-tick dispatch
- src/game/engagement/bubbleHelpers.ts — FlashBatch/makeFlashBatch/applyFlashBatch, flashPiece rewrite
- src/game/engagement/interactions.ts — triggerPieceAnim batch parameter, Scanner/ConfigNode/Transmitter interactions
- src/game/engagement/lockPhase.ts — runWrongOutputRings migrated to voidBurstCenter path
- src/game/engagement/valueTravelAnimation.ts — trimmed 4 to 2 setGlowTravelerState calls
- src/game/engagement/types.ts — flashCounter Map, setVoidBurstCenter, FlashBatch types
- src/game/engagement/replayLoop.ts — flashCounter reset added
- src/screens/GameplayScreen.tsx — voidBurstCenter state, flashCounter in pieceAnimProps memo
- src/components/PieceIcon.tsx — bucket classification comment added
- src/components/PieceSimulation.tsx — bucket classification comment added

Test files changed (10):
- __tests__/unit/beamPerformance.test.ts (+194 lines)
- __tests__/unit/components/BoardPieceFlash.test.ts (NEW, 108 lines)
- __tests__/unit/components/TapeCellHighlight.test.ts (NEW, 74 lines)
- __tests__/unit/engagement/bubbleHelpers.test.ts (+84 lines, FlashBatch coverage)
- __tests__/unit/engagement/valueTravelAnimation.test.ts (+20 lines)
- __tests__/unit/engagement/lockPhase.test.ts (+15 lines)
- __tests__/unit/engagement/chargeLockPhaseAnim.test.ts (+2 lines)
- __tests__/unit/engagement/stateHelpers.test.ts (+1 line)
- __tests__/unit/components/BoardGrid.test.ts (+12 lines)
- __tests__/unit/prompt94Fixes.test.ts (+8 lines)

---

## 3. Clause-by-Clause Compliance

### [2.1.1] Beam dim/brighten — native driver
STATUS: COMPLIANT (already satisfied by 99A, confirmed)

dimBeam and brightenBeam at beamAnimation.ts:35-53 both use
`useNativeDriver: true`. dimBeam drives beamOpacity to 0.3 over 200ms;
brightenBeam drives it back to 1.0 over 200ms. No code change required
in 99C — test [2.1.1] wired to confirm.

### [2.1.2] Piece flash — native driver
STATUS: COMPLIANT

Implementation: Fix 1, option (b) — counter-based.

BoardPiece.tsx allocates `flashOpacity = useRef(new Animated.Value(0)).current`
(line 72). A useEffect watches `flashCounter` (from animProps slice) and
fires:
```
Animated.sequence([
  Animated.timing(flashOpacity, { toValue: 1, duration: 90, useNativeDriver: true }),
  Animated.timing(flashOpacity, { toValue: 0, duration: 90, useNativeDriver: true }),
]).start()
```
Total 180ms (90+90) matches the contract. The old setTimeout-based
flash-off setter is eliminated — entries stay in `flashing` Map until
the per-pulse sweep.

Verified: Both Animated.timing calls at lines 87-94 carry
`useNativeDriver: true`. The flash overlay renders via `<Animated.View
style={{ opacity: flashOpacity }}>` (line 139-156), which is a
native-driver-compatible property on a non-SVG View.

### [2.1.5] Void burst — native driver
STATUS: COMPLIANT

beamAnimation.ts lines 369-392: void burst uses setVoidBurstCenter to
mount the anchor (1 setState), drives voidPulseRingProgressAnim 0->1
over 320ms with `useNativeDriver: true` (line 385), then unmounts via
setVoidBurstCenter(null) (1 setState). Two setState calls total,
replacing ~19 per-RAF setVoidPulse calls.

BeamOverlay.tsx lines 119-133: AnimatedCircle reads
voidPulseRingProgressAnim.interpolate for r [6,46] and opacity [0.9,0].
Mounts only when voidBurstCenter is non-null.

lockPhase.ts lines 86-107: runWrongOutputRings uses the same
voidBurstCenter path — setVoidBurstCenter mount, native timing 320ms,
setVoidBurstCenter(null) unmount. Consistent with the in-pulse burst.

### [2.1.6] Tape cell highlight — native driver
STATUS: COMPLIANT

TapeCell.tsx allocates `highlightOpacity = useRef(new Animated.Value(0)).current`
per cell (line 85). useEffect at lines 92-107:
- highlight non-null: fade-in 120ms, `useNativeDriver: true` (line 98)
- highlight null: fade-out 180ms, `useNativeDriver: true` (line 104)

The latching pattern via `lastColorsRef` (line 90) correctly preserves
the color during fade-out — without this, the overlay would unmount
immediately when highlight becomes null, skipping the fade.

colorsForHighlight helper (lines 53-74) preserves the exact palette from
the deleted tapeCellHighlight* style classes: read (cyan 0.18/0.9),
write (cyan 0.22/0.9), gate-pass (green 0.18/0.9), gate-block (red
0.18/0.9), departing (dark 0.55, faded cyan 0.2).

### [2.1.7] Glow traveler — native driver
STATUS: COMPLIANT (already satisfied, confirmed)

All 7 Animated.timing calls in valueTravelAnimation.ts use
`useNativeDriver: true` (lines 54, 60, 66, 77, 83, 89, 105). These
drive translateX/Y, scale, and opacity — all native-compatible.

### [2.3.3] <=3 JS-thread animations per beam tick
STATUS: COMPLIANT

After 99C, zero Animated.timing calls on the beam-tick path use
`useNativeDriver: false`. The only JS-driven animations remaining in
the codebase are:
- PieceIcon.tsx (26 hits) — SVG attribute animations, Bucket B per 2.2.3
- TutorialHUDOverlay.tsx (10 hits) — layout properties, Bucket A per 2.3.1
- PieceSimulation.tsx (1 hit) — addListener bridge, Bucket C
- DistressScreen.tsx (3 hits) — off beam path, Bucket C
- RepairScreen.tsx (4 hits) — off beam path, Bucket C

Zero Bucket D violations found. Total remaining: 44 code hits across 5
files, all categorized and permitted.

### [3.1.3] <=1 setPieceAnimState per beam tick
STATUS: COMPLIANT

The beam tick creates a FlashBatch via makeFlashBatch() (beamAnimation.ts
line 248), accumulates all flashes, animation tags, and gate results
through the tick (lines 257, 344, 354), and dispatches a single
applyFlashBatch(ctx, tickBatch) at line 361. applyFlashBatch
(bubbleHelpers.ts:63-101) executes one setPieceAnimState functional
update that covers all accumulated entries. If the batch is empty
(no waypoints crossed threshold this frame), it no-ops.

### [3.4.1] Inter-pulse cleanup <=1 setPieceAnimState
STATUS: COMPLIANT

GameplayScreen.tsx lines 1010-1024: the per-pulse sweep clears
flashTimersRef, then fires exactly one setPieceAnimState that resets all
four Maps (flashing, flashCounter, animations, gates) in a single
functional update. Comment at line 1017 explicitly cites clause 3.4.1.

### [3.5.1] Tape interaction <=2 setState calls
STATUS: KNOWN DEVIATION — 9 calls actual

Dev documented this thoroughly in LAST_REPORT.md. Full Scanner read
interaction setState breakdown:

| Setter | Calls | Sources |
|--------|-------|---------|
| setTapeCellHighlights | 4 | read, departing, write, delete-in |
| setTapeBarState | 2 | inIndex, trailIndex |
| setGlowTravelerState | 2 | liftoff start, idle end |
| setVisualTrailOverride | 1 | onArrive write |
| Total | 9 | |

Plus 1 setPieceAnimState for the scanner flash (separate budget).

QA independently verified the call sites by reading interactions.ts
(lines 36-88) and valueTravelAnimation.ts (lines 41, 107). Each setter
is driven by a gameplay logic milestone (read highlight, departing,
glow liftoff, on-arrive write, glow end, cleanup). These are boundary
setters, not per-tick streams — clause 3.5.2 (no setState on
intermediate ticks) IS satisfied. The spirit of 3.5.1 (prevent per-tick
setState during animation windows) is honored.

Dev's recommendation to reframe the clause as a per-tick budget rather
than a per-interaction total is sound. Reducing to <=2 would require
merging unrelated state slices, which the prompt explicitly forbids.

RECOMMENDATION: Flag for SE to revise clause 3.5.1 wording in
PERFORMANCE_CONTRACT.

### [3.5.2] No setState on intermediate RAF ticks
STATUS: COMPLIANT

During the value-travel arc (600ms) and tape highlight fade windows
(120ms/180ms), no setState fires from RAF callbacks. React-side setters
fire only at start / on-arrive / end milestones. The native
Animated.timing sequences run entirely on the native thread during the
animation windows.

### [7.1.1] Batched flash calls within one tick
STATUS: COMPLIANT

Same FlashBatch mechanism as 3.1.3. When multiple waypoints cross their
threshold in the same RAF tick, all flashes accumulate into the batch
and dispatch as one setPieceAnimState at the end of the tick.

### [7.2.1] Dim + tape highlight + glow traveler share one JS tick
STATUS: COMPLIANT

runScannerInteraction synchronously calls flashPiece, setHighlight, and
setTapeBarState before the first await. These dispatch in the same JS
microtask before the awaited timer fires. Native timings (dimBeam,
highlight fade-in, glow traveler liftoff) start on the native thread
in that same tick.

---

## 4. Fix 1 Option Analysis

Dev chose option (b) — counter-based — over option (a) — registry.

QA validates the reasoning: option (a) would have required restructuring
pieceAnimState.flashing away from the Map-as-source-of-truth invariant
that existing tests depend on. Option (b) preserves the Map, adds a
sibling flashCounter Map, and delegates the visual animation to each
BoardPiece's local Animated.Value. This is the lower-risk path.

The implementation correctly uses a ref-based latch (lastCounterRef at
line 73) to avoid re-triggering on re-renders where flashCounter hasn't
actually changed. The useEffect dependency array [flashCounter,
flashColor, flashOpacity] is minimal and correct.

---

## 5. useNativeDriver: false Audit

QA independently verified the remaining useNativeDriver: false
occurrences against Dev's bucket categorization:

| Bucket | File | Hits | Justification |
|--------|------|------|---------------|
| A (layout) | TutorialHUDOverlay.tsx | 10 | Drives top/left/width/height on portal |
| B (SVG) | PieceIcon.tsx | 26 | SVG attribute interpolation, native driver unsupported |
| C (off-path) | PieceSimulation.tsx | 1 | addListener bridge, Codex preview |
| C (off-path) | DistressScreen.tsx | 3 | Onboarding, not mounted during gameplay |
| C (off-path) | RepairScreen.tsx | 4 | Onboarding, not mounted during gameplay |
| D (violation) | — | 0 | None found |

Total: 44 code hits. Zero violations. All categorized correctly.

---

## 6. Test Coverage

### New Test Files (2)
- BoardPieceFlash.test.ts (108 lines) — verifies flashCounter behavior,
  native opacity sequence, no setPieceAnimState on flash-off
- TapeCellHighlight.test.ts (74 lines) — verifies highlight palette,
  overlay animation, native driver on fade-in/fade-out

### Expanded Test Files (8)
- beamPerformance.test.ts (+194 lines) — wired clauses [2.1.1], [2.1.2],
  [2.1.5], [2.1.6], [2.1.7], [2.3.3], [3.1.3], [3.4.1], [3.5.1], [3.5.2]
- bubbleHelpers.test.ts (+84 lines) — FlashBatch accumulation,
  applyFlashBatch single-dispatch verification
- valueTravelAnimation.test.ts (+20 lines) — 2-setter cadence assertion
- lockPhase.test.ts (+15 lines) — voidBurstCenter path
- BoardGrid.test.ts (+12 lines), prompt94Fixes.test.ts (+8 lines),
  chargeLockPhaseAnim.test.ts (+2 lines), stateHelpers.test.ts (+1 line)

### Coverage Delta
| Metric | Baseline | After 99C | Delta |
|--------|----------|-----------|-------|
| Statements | 71.31% | 72.15% | +0.84 |
| Branches | 62.32% | 62.61% | +0.29 |
| Functions | 72.82% | 74.60% | +1.78 |
| Lines | 72.87% | 73.74% | +0.87 |

All four metrics improved. Coverage thresholds (80/70/80/80) remain
under on all metrics — this is a pre-existing condition driven by
uncovered files (failureHandlers.ts, replayLoop.ts, successHandlers.ts,
beamAnimation.ts at 8.65%).

### Quality Gates
- Lint: pass (1 pre-existing buildInfo warning)
- TypeScript: pass (2 pre-existing buildInfo errors)
- Tests: 805 unit + 21 integration pass
- Audit: clean (no high/critical, 4 low + 15 moderate pre-existing)

---

## 7. Findings

### F-1: Clause 3.5.1 setState budget incompatible with state architecture (DEVIATION)

Severity: Medium (spec issue, not code issue)

The Scanner read interaction fires 9 setState calls across 4 state
slices. The clause specifies <=2. Dev identified all offending call
sites and documented the structural impossibility of meeting the budget
without either merging state slices (forbidden by prompt) or removing
gameplay-visible behavior. QA concurs with Dev's recommendation to
reframe clause 3.5.1 as a per-tick budget. The implementation satisfies
the spirit of the clause (no per-tick setState during animation windows)
and clause 3.5.2 is fully met.

Action: SE should revise clause 3.5.1 wording in PERFORMANCE_CONTRACT.

### F-2: Pre-existing coverage below thresholds (OBSERVATION)

Severity: Low (not introduced by 99C)

Coverage sits at 72.15/62.61/74.60/73.74 against 80/70/80/80
thresholds. The gap is driven by uncovered engagement files
(failureHandlers.ts 0%, replayLoop.ts 0%, successHandlers.ts 0%,
beamAnimation.ts 8.65%). 99C improved all metrics but cannot close the
gap alone.

Action: Tracked in QA-005 (CURRENT_STATUS.md). Needs dedicated coverage
prompt.

### F-3: Parallel test runner flake (OBSERVATION)

Severity: Low (pre-existing)

Running the full test suite in parallel mode produces transient worker
exceptions in 3 store-related tests. Each passes individually. Dev
confirmed this reproduces on baseline. Not introduced by 99C.

---

## 8. Verdict

PASS

The 99A/99B/99C migration series is complete. All beam-tick animations
now run on the native thread via useNativeDriver: true. The single
deviation (3.5.1 setState count) is a spec framing issue, not a
performance regression — intermediate ticks are setter-free (3.5.2
satisfied), and the implementation matches the performance intent of the
clause.

Clause compliance summary:
- 2.1.1: PASS (confirmed, no change needed)
- 2.1.2: PASS (piece flash migrated to native)
- 2.1.5: PASS (void burst migrated to native)
- 2.1.6: PASS (tape highlight migrated to native)
- 2.1.7: PASS (confirmed, no change needed)
- 2.3.3: PASS (zero JS-driven animations on beam path)
- 3.1.3: PASS (FlashBatch enforces 1 setter per tick)
- 3.4.1: PASS (single setPieceAnimState per inter-pulse sweep)
- 3.5.1: DEVIATION (9 calls vs <=2 budget; spec revision recommended)
- 3.5.2: PASS (no setState on intermediate RAF ticks)
- 7.1.1: PASS (batched via FlashBatch)
- 7.2.1: PASS (dim + highlight + glow share one JS tick)

Recommended follow-ups:
1. SE to revise clause 3.5.1 to per-tick framing (F-1)
2. Coverage hardening prompt for engagement files (F-2)
