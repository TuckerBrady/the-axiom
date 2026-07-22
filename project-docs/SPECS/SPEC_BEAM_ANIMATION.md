# SPEC: Beam Animation Lifecycle

**ID:** SE-BEAM  
**Author:** THEOREM (Systems Engineering)  
**Status:** DRAFT  
**Date:** 2026-05-10  
**Depends on:** SPEC_SIGNAL_ENGINE.md (SE-SIG), docs/ANIMATION_RULES.md, docs/TRIBAL_KNOWLEDGE.md  
**Depended on by:** Gameboard Layer 6 implementation

---

## 1. Purpose

This spec defines how the signal engine's `ExecutionTrace` (SE-SIG-060) is rendered as a visible beam animation. The beam animation is the component that crashed in Builds 19-21. This spec exists to make a third crash architecturally impossible.

The beam animation receives a complete, pre-computed trace and renders it step-by-step. It makes no routing decisions. It visualizes decisions the engine already made.

---

## 2. Safety Invariants (Non-Negotiable)

These constraints are inherited from docs/ANIMATION_RULES.md and CLAUDE.md. They are REQUIREMENTS, not recommendations. Violation of any invariant is a spec-fail regardless of other correctness.

### SE-BEAM-001 — JS Thread Only

ALL beam and piece animations MUST use `useNativeDriver: false`. No animation in the gameplay component tree may use the native driver. This is the root defense against the SIGABRT crash pattern.

**Rationale:** Native-driven values create native-thread bindings that cannot survive host-swap. Since the gameplay tree has complex conditional state (tutorial overlays, modal interruptions, level transitions), the only safe architecture is JS-thread-only.

### SE-BEAM-002 — Single-Host Invariant

Every `Animated.Value` consumed by the beam animation system MUST be bound to exactly ONE `Animated.View` instance across the entire component lifecycle. No conditional render branch may swap which `Animated.View` consumes a given `Animated.Value`.

### SE-BEAM-003 — Persistent Host Architecture

Animated containers (the `Animated.View` nodes that consume `Animated.Value` refs) MUST be mounted exactly once when the gameplay screen mounts. They MUST NOT unmount until the gameplay screen unmounts. Visual state changes (visibility, position, color, opacity) MUST be achieved by changing styles/props on persistent hosts, NEVER by conditional mounting/unmounting of the host itself.

### SE-BEAM-004 — Cinematic Minimum Duration

All animation phases MUST have a minimum duration of 0.6 seconds with cubic-bezier easing. No animation may complete faster than 0.6s regardless of path length.

### SE-BEAM-005 — PieceIcon Single Source of Truth

All piece rendering during beam animation MUST go through PieceIcon. The beam animation system MUST NOT render piece visuals independently. Interaction animations are triggered via props on PieceIcon.

---

## 3. Three-Phase Sequence

### SE-BEAM-010 — Phase Definitions

The beam animation executes in three mandatory sequential phases:

| Phase | Name | Purpose | Min Duration |
|-------|------|---------|--------------|
| 1 | CHARGE | Energy builds visibly at the Source piece. Communicates "machine is about to fire." | 0.8s |
| 2 | BEAM | Signal travels the path step-by-step per the ExecutionTrace. The main phase. | 0.6s per step (minimum; scales with step count) |
| 3 | LOCK | Signal arrives at Terminal. Lock animation confirms success. | 0.6s |

### SE-BEAM-011 — CHARGE Phase

**Trigger:** Animation state transitions from IDLE to CHARGING.  
**Visual:** Source piece emits a building glow. Intensity ramps from 0% to 100% over the duration. Glow color matches the first step's category (amber if first piece after Source is Physics, blue if Protocol).  
**Easing:** cubic-bezier(0.4, 0, 0.2, 1) — slow start, accelerating build.  
**Duration:** 0.8s minimum.  
**Completion:** Transitions to BEAMING state.

### SE-BEAM-012 — BEAM Phase

**Trigger:** Animation state transitions from CHARGING to BEAMING.  
**Visual:** The beam travels cell-to-cell following the ExecutionTrace step order. At each cell:

1. Beam enters the cell from `entryDirection`.
2. Cell highlights (subtle glow behind piece).
3. Piece interaction animation triggers (see Section 5).
4. Beam exits the cell toward `exitDirections`.
5. Next step begins.

**Per-step duration:** 0.6s minimum. For machines with fewer than 4 steps, each step takes 0.8s (slower pace for readability). For machines with more than 12 steps, each step takes 0.4s (faster to avoid tedium) with a floor of 0.4s.  
**Easing per step:** cubic-bezier(0.25, 0.1, 0.25, 1) — smooth traversal.  
**Beam appearance:** A glowing line/particle that travels from cell center to cell center. Color determined by SE-BEAM-070.

### SE-BEAM-013 — LOCK Phase

**Trigger:** Last step in trace has action TERMINATE at Terminal cell.  
**Visual:** Terminal piece plays lock animation. Brief flash/pulse confirming signal arrived. Terminal glow persists after animation completes.  
**Easing:** cubic-bezier(0, 0, 0.2, 1) — fast arrival, gentle settle.  
**Duration:** 0.6s minimum.  
**Completion:** Transitions to COMPLETE state.

### SE-BEAM-014 — Failed Pulse Rendering

If a pulse result is DEAD_END (no path reached Terminal), the LOCK phase is replaced by a failure indication: beam fades/dissipates at the dead-end cell. No lock animation. Failure renders distinctly from success (color shift to red/dim, or particle scatter).

---

## 4. Animation State Machine

### SE-BEAM-020 — States

| State | Description |
|-------|-------------|
| IDLE | No animation running. Board is static. Ready to receive trace. |
| CHARGING | CHARGE phase active. Source building energy. |
| BEAMING | BEAM phase active. Signal traversing path. |
| LOCKING | LOCK phase active. Terminal confirming receipt. |
| COMPLETE | All pulses rendered. Animation system at rest. |
| INTERRUPTED | External interruption occurred. Cleanup in progress. |

### SE-BEAM-021 — Transitions

```
IDLE ──[trace received + play()]──> CHARGING
CHARGING ──[charge complete]──> BEAMING
BEAMING ──[last step of last pulse rendered]──> LOCKING
BEAMING ──[last step is DEAD_END]──> LOCKING (failure variant)
LOCKING ──[lock animation complete]──> COMPLETE (if last pulse)
LOCKING ──[lock animation complete]──> CHARGING (if more pulses remain)
ANY ──[interrupt()]──> INTERRUPTED
INTERRUPTED ──[cleanup complete]──> IDLE
COMPLETE ──[reset()]──> IDLE
```

### SE-BEAM-022 — Multi-Pulse Looping

For machines with multiple pulses (multi-value Input Tape), the animation cycles through CHARGING -> BEAMING -> LOCKING for each pulse. Between pulses, a brief inter-pulse pause (0.3s) occurs during the LOCKING-to-CHARGING transition.

### SE-BEAM-023 — Interrupt Trigger Sources

The following events MUST trigger an interrupt:

- User taps reset/clear board.
- User navigates away from gameplay screen.
- App transitions to background (AppState change).
- Level timer expiration (if applicable in future sectors).

---

## 5. Piece Animation Interface (Contract with PieceIcon)

### SE-BEAM-030 — Interaction Animation Props

PieceIcon MUST accept the following animation-related props:

```typescript
interface PieceAnimationProps {
  // Triggered when beam arrives at this piece
  isActive: boolean;
  
  // The action the engine determined for this piece
  activeAction: StepAction | null;
  
  // Whether the piece blocked signal (gate closed, counter not met)
  isBlocked: boolean;
  
  // Signal value passing through (for value-dependent animations)
  activeSignalValue: number | null;
  
  // Callback when piece interaction animation completes
  onAnimationComplete?: () => void;
}
```

### SE-BEAM-031 — Animation Trigger Mechanism

The beam animation system MUST trigger piece interaction animations by setting `isActive: true` on the appropriate PieceIcon instance when the beam arrives at that cell's step in the trace. The beam animation MUST wait for `onAnimationComplete` before advancing to the next step.

### SE-BEAM-032 — Piece Animation Duration

Per docs/PIECE_CREATION_STANDARD.md, piece interaction animations have duration 150-400ms. These run WITHIN the per-step duration window. The step's total duration is: beam-enter (partial) + piece-animation (150-400ms) + beam-exit (remaining).

### SE-BEAM-033 — PieceIcon Memoization Bypass

PieceIcon MAY be memoized for render performance. Animation props (`isActive`, `activeAction`, `isBlocked`, `activeSignalValue`) MUST be excluded from the memoization comparison, OR the animation prop object MUST use a mechanism that triggers re-render on change (new object reference per step, or a dedicated animation state update path that bypasses memo).

**Requirement:** When the beam animation sets `isActive: true` on a PieceIcon, that PieceIcon MUST re-render within the same frame. Stale memoized renders during beam traversal are a spec violation.

### SE-BEAM-034 — Reset Animation Props

When the animation transitions to IDLE (via reset or interrupt cleanup), ALL PieceIcon instances MUST have their animation props reset: `isActive: false`, `activeAction: null`, `isBlocked: false`, `activeSignalValue: null`.

---

## 6. Animated.View Host Architecture

### SE-BEAM-040 — Host Inventory

The beam animation system MUST declare exactly these persistent `Animated.View` hosts in the gameplay component tree:

| Host | Purpose | Animated Values |
|------|---------|-----------------|
| BeamTrailHost | Renders the beam trail (the glowing line following the signal path) | position-x, position-y, opacity, scale |
| CellHighlightHost | Renders the per-cell highlight glow behind the active piece | position-x, position-y, opacity |
| SourceChargeHost | Renders the Source charge-up glow | opacity, scale |
| TerminalLockHost | Renders the Terminal lock flash | opacity, scale |

Additional hosts for multi-path rendering (see SE-BEAM-060).

### SE-BEAM-041 — Mount Timing

All hosts listed in SE-BEAM-040 MUST mount when the gameplay screen mounts. They MUST NOT mount conditionally based on animation state. When no animation is running (IDLE state), hosts remain mounted with `opacity: 0`.

### SE-BEAM-042 — No Conditional Render Branches

The following pattern is PROHIBITED and MUST NOT appear in any file that renders beam animation:

```
// PROHIBITED — violates SE-BEAM-003 and REQ-A-2
{isAnimating ? (
  <Animated.View style={{ opacity: beamOpacity }}>...</Animated.View>
) : (
  <View>...</View>
)}
```

The correct pattern:

```
// REQUIRED — persistent host, visual state via style
<Animated.View style={{ opacity: beamOpacity }}>
  {/* Content changes via props/children, host stays mounted */}
</Animated.View>
```

### SE-BEAM-043 — State Change via Style, Not Mount

All visual state changes during animation MUST be achieved through:

- Animated style values (opacity, transform, backgroundColor)
- Prop changes on persistent children
- Conditional children WITHIN a persistent host (children unmounting is safe; the HOST must not unmount)

### SE-BEAM-044 — Cleanup Pattern

When the gameplay screen unmounts, all `Animated.Value` instances MUST be stopped via `Animated.Value.stopAnimation()` BEFORE the host unmounts. This prevents orphaned animation callbacks firing after unmount.

---

## 7. Multi-Path Animation

### SE-BEAM-060 — Splitter Fork Rendering

When the ExecutionTrace contains a SPLIT action, the beam animation MUST render both paths. The rendering strategy:

**Sequential with offset:** The primary path (first per SE-SIG-031 ordering, LEFT-before-RIGHT) renders fully. Then the secondary path renders from the Splitter cell forward. A brief offset delay (0.2s) separates the start of the secondary path from the end of the primary path.

**Rationale:** Simultaneous parallel rendering is visually confusing on a small mobile screen. Sequential-with-offset communicates "both paths exist" while maintaining readability.

### SE-BEAM-061 — Multi-Path Host Pool

For multi-path machines, the beam animation system MUST pre-allocate a pool of BeamTrailHost instances (minimum 4). All hosts mount at gameplay-screen mount time with `opacity: 0`. When a fork occurs, the next available host is assigned to render the secondary path. Hosts return to the pool (opacity 0) when their path completes.

### SE-BEAM-062 — Path Color Continuity

Each path segment maintains beam color based on the `category` of the piece at each step. When a path transitions from a Physics piece to a Protocol piece (or vice versa), the beam color crossfades over 0.3s during the step transition.

### SE-BEAM-063 — Nested Splits

For nested splits (Splitter output feeds into another Splitter), paths render recursively following the same sequential-with-offset strategy. Maximum supported render depth: 4 levels of nesting (16 simultaneous paths). Beyond this, additional paths render but with simplified visuals (no per-cell highlight, beam-only).

---

## 8. Interruption Handling

### SE-BEAM-070 — Interrupt Protocol

When `interrupt()` is called (from any source per SE-BEAM-023), the animation system MUST execute this cleanup sequence:

1. Immediately stop all running `Animated.timing` / `Animated.sequence` calls via `stopAnimation()` on every active `Animated.Value`.
2. Reset all `Animated.Value` instances to their IDLE values (opacity: 0, position: origin, scale: 1).
3. Reset all PieceIcon animation props to defaults (SE-BEAM-034).
4. Return all multi-path hosts to the pool.
5. Transition state to INTERRUPTED, then immediately to IDLE.
6. The entire cleanup MUST complete within a single frame (synchronous, no animations during cleanup).

### SE-BEAM-071 — User Taps Reset

On reset, the animation system calls `interrupt()`. The engine resets (SE-SIG-043). The board returns to pre-run state. No residual visual artifacts remain.

### SE-BEAM-072 — Navigation Away

When the gameplay screen receives a navigation-away event (screen blur, navigator pop), `interrupt()` fires. Because hosts are persistent within the screen component, they will unmount with the screen. The cleanup in SE-BEAM-070 ensures no orphaned callbacks fire during or after unmount.

### SE-BEAM-073 — App Background

When AppState changes to 'background' or 'inactive', `interrupt()` fires. On return to foreground, the animation system is in IDLE. The user may re-trigger the run. The engine trace is still available (engine state is independent of animation state).

### SE-BEAM-074 — No Orphaned Native Bindings

Because SE-BEAM-001 prohibits `useNativeDriver: true`, there are no native bindings to orphan. This invariant is the architectural guarantee that interruption cannot cause SIGABRT. JS-thread-only animations can be stopped, reset, and garbage-collected without native-side coordination.

---

## 9. Beam Colors

### SE-BEAM-080 — Color Assignment

Beam color is determined per-step by the `category` field of the `ExecutionStep`:

| Category | Beam Color | Hex |
|----------|-----------|-----|
| physics | Amber | #F0B429 |
| protocol | Blue | #00D4FF |

### SE-BEAM-081 — Source Charge Color

The CHARGE phase glow color matches the category of the FIRST piece after Source in the trace. If the first piece is Physics, charge is amber. If Protocol, charge is blue.

### SE-BEAM-082 — Color Transition

When the beam crosses from a Physics piece to a Protocol piece (or vice versa), the beam color MUST transition smoothly over 0.3s (crossfade/blend, not instant swap). This communicates the layer change visually.

### SE-BEAM-083 — Terminal Lock Color

The LOCK phase color matches the category of the LAST piece before Terminal in the trace. This provides visual continuity into the lock animation.

### SE-BEAM-084 — Dead-End Color

When a beam reaches a dead-end (action: DEAD_END), the beam color fades to a dim red (#FF4444 at 40% opacity) over 0.4s before dissipating. This signals failure distinctly from the amber/blue success colors.

---

## 10. Pre-Written Tests

### TEST-BEAM-001 — Three-Phase Sequence Completion (validates SE-BEAM-010, SE-BEAM-011, SE-BEAM-012, SE-BEAM-013)

**Setup:** ExecutionTrace with 1 pulse, 3 steps (Source -> Conveyor -> Terminal). Play animation.  
**Expected:** Animation state transitions: IDLE -> CHARGING -> BEAMING -> LOCKING -> COMPLETE. Total elapsed time >= 0.8s (CHARGE) + 3 * 0.8s (BEAM, <4 steps so 0.8s each) + 0.6s (LOCK) = 3.8s minimum. All phases complete without error.

### TEST-BEAM-002 — State Machine Transitions (validates SE-BEAM-020, SE-BEAM-021)

**Setup:** Trace with 1 pulse. Monitor state transitions.  
**Expected:** State sequence is exactly [IDLE, CHARGING, BEAMING, LOCKING, COMPLETE]. No skipped states. No repeated states. Each state persists for minimum duration per its phase.

### TEST-BEAM-003 — Interrupted State Cleanup (validates SE-BEAM-070, SE-BEAM-074)

**Setup:** Trace with 8 steps. Start animation. Call `interrupt()` during BEAMING (after step 3).  
**Expected:** All Animated.Values reset to IDLE values synchronously. All PieceIcon animation props reset. State transitions to INTERRUPTED then IDLE. No console warnings about "calling setState on unmounted component." No lingering timeouts or callbacks fire after interrupt.

### TEST-BEAM-004 — Piece Interaction Triggers at Correct Step (validates SE-BEAM-030, SE-BEAM-031)

**Setup:** Trace: Source -> Scanner -> Config Node -> Terminal. Monitor PieceIcon props at each step.  
**Expected:** Scanner PieceIcon receives `isActive: true` and `activeAction: 'READ_TAPE'` during step 2. Config Node receives `isActive: true` and `activeAction: 'GATE_PASS'` (or GATE_BLOCK) during step 3. Props reset to defaults between steps. `onAnimationComplete` fires before next step begins.

### TEST-BEAM-005 — Multi-Path Splitter Rendering (validates SE-BEAM-060, SE-BEAM-061)

**Setup:** Trace with Splitter creating 2 paths (pathId 'main.L' and 'main.R'). Both reach Terminal.  
**Expected:** First path (LEFT) renders fully. After brief offset, second path (RIGHT) renders. Both BeamTrailHosts activated (opacity > 0 during their respective path). Total animation includes all steps from both paths.

### TEST-BEAM-006 — Component Unmount During Active Animation (validates SE-BEAM-044, SE-BEAM-072)

**Setup:** Start animation (BEAMING state). Unmount the gameplay component (simulate navigation away).  
**Expected:** `interrupt()` fires on unmount lifecycle. `stopAnimation()` called on all active values. Component unmounts cleanly. No "memory leak" warnings. No SIGABRT. No errors in test output.

### TEST-BEAM-007 — PieceIcon Memoization Update (validates SE-BEAM-033)

**Setup:** PieceIcon rendered with React.memo (or equivalent). Beam animation sets `isActive: true`.  
**Expected:** PieceIcon re-renders with new `isActive` value. The memoization does NOT prevent the update. Verify by checking that the piece interaction animation triggers (onAnimationComplete eventually fires).

### TEST-BEAM-008 — Beam Color Matches Category (validates SE-BEAM-080, SE-BEAM-082)

**Setup:** Trace: Source -> Conveyor (physics) -> Scanner (protocol) -> Terminal. Monitor beam color at each step.  
**Expected:** During Conveyor step, beam color is #F0B429 (amber). During Scanner step, beam color is #00D4FF (blue). Transition between steps includes 0.3s crossfade (not instant color swap).

---

## 11. Implementation Guidance (Behavior, Not Code)

This section constrains BEHAVIOR that any implementation must exhibit. It does not prescribe React Native APIs or specific patterns.

### SE-BEAM-090 — Animation Frame Budget

The beam animation MUST maintain 30fps minimum on iPhone 15 Pro Max during the BEAMING phase. If profiling shows frame drops below 30fps, the per-step duration MUST increase (slower animation) rather than dropping frames. Smooth > fast.

### SE-BEAM-091 — Tutorial Overlay Coexistence

The tutorial overlay MAY be mounted simultaneously with beam animation hosts. The beam animation system MUST NOT conflict with or depend on the tutorial overlay's mounted state. They are independent component subtrees sharing the same screen.

### SE-BEAM-092 — Trace Replay

The animation system MUST support replaying the same trace without re-running the engine. Calling `play()` when state is COMPLETE (without intervening `reset()`) MUST replay from CHARGING using the existing trace.

---

## 12. Open Questions for Tucker

1. **Multi-pulse pacing:** For machines with 8+ pulses, should the inter-pulse pause increase to let the user process each result, or should it stay constant (0.3s)?
2. **Dead-end feedback:** Should dead-end failure show a brief COGS reaction (eye state change to red) inline with the beam animation, or is that handled by a separate system post-run?
3. **Beam trail persistence:** Should the beam trail remain visible after it passes (fading slowly), or disappear cell-by-cell as the active front advances? Trail-persistence helps the user see the full path; trail-disappearance keeps the board clean.
4. **Performance baseline:** The 30fps target (SE-BEAM-090) — is this acceptable given JS-thread-only constraint, or does Tucker want 60fps mandated (which may require architectural concessions)?

---

## 13. Cross-References

| Document | Relevant Sections |
|----------|-------------------|
| SE-SIG (SPEC_SIGNAL_ENGINE.md) | Section 8: Engine Output Format — defines the data this spec consumes |
| docs/ANIMATION_RULES.md | REQ-A-1, REQ-A-2, REQ-A-3 — inherited as SE-BEAM-001/002/003 |
| docs/TRIBAL_KNOWLEDGE.md | Section 2: Beam animation performance, PieceIcon memoization |
| docs/PIECE_CREATION_STANDARD.md | Animation checklist — success animation prop, duration 150-400ms |
| CLAUDE.md | Locked decisions: useNativeDriver: false, PieceIcon single source of truth, 0.6s cubic-bezier minimum |

---

END OF SPEC_BEAM_ANIMATION.md
