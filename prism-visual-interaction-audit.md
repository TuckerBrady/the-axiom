# PRISM Visual and Interaction State Audit

## Purpose

Document the visual and interaction state of The Axiom's gameboard as it existed before the refactor crashes. This report identifies what to preserve, what was entangled with crash-causing code, and provides the full inventory needed for a rebuild.

---

## 1. Screen Inventory

### Gameplay Layer

| Component | Location | Purpose |
|-----------|----------|---------|
| GameplayScreen | src/screens/GameplayScreen.tsx (2068 lines) | Master orchestrator: layout, state, handlers, phase management |
| BoardGrid | src/components/gameplay/BoardGrid.tsx | Renders placed pieces as isolated memo'd children |
| BoardPiece | src/components/gameplay/BoardPiece.tsx | Pressable wrapper per piece: tap, long-press, flash, rotation |
| PieceIcon | src/components/PieceIcon.tsx (685 lines) | Single source of truth for all piece SVG rendering + per-piece interaction animations |
| PieceTray | src/components/gameplay/PieceTray.tsx | Axiom-sector horizontal scrollable piece selector |
| ArcWheel | src/components/gameplay/ArcWheel.tsx (521 lines) | Kepler+ vertical arc piece selector with drag-and-drop |
| BeamOverlay | src/components/gameplay/BeamOverlay.tsx | SVG overlay for beam trails, heads, charge/lock rings |
| WireOverlay | src/components/gameplay/WireOverlay.tsx | Dashed connection lines between pieces, lit state on beam pass |
| TapeBarShell | src/components/gameplay/TapeBarShell.tsx | Three-row tape display (IN/TRAIL/OUT) with indicator bars |
| TapeCell | src/components/gameplay/TapeCell.tsx | Per-cell memo'd unit with highlight overlay animation |
| HUDChrome | src/components/gameplay/HUDChrome.tsx | Top bar: pause, sector badge, level ID, timer, pulse counter |
| PlacementTransition | src/components/gameplay/PlacementTransition.tsx | Phase transition animation between placement and engagement |
| GameplayModals | src/components/gameplay/GameplayModals.tsx | Results, void, pause, wrong-output, completion overlays |
| TutorialHUDOverlay | src/components/TutorialHUDOverlay.tsx (1173 lines) | COGS orb tutorial system with portal morphs and step sequences |
| RequisitionPanel | src/components/gameplay/RequisitionPanel.tsx | Pre-level piece/tape purchasing interface |
| StarField | src/components/StarField.tsx | Procedural background star animation (20 stars, reanimated) |

### Beam Engine Layer (src/game/engagement/)

| Module | Purpose |
|--------|---------|
| beamAnimation.ts (448 lines) | RAF-driven beam tick loop, trail/head rendering |
| chargePhase.ts | Source piece expanding rings (280ms) |
| lockPhase.ts | Terminal lock ring expansion (320ms) |
| interactions.ts | Scanner/ConfigNode/Transmitter beam-pause processing |
| valueTravelAnimation.ts | Three-phase glow traveler (IN->TRAIL arc) |
| replayLoop.ts | Post-completion looping replay with 800ms gaps |
| constants.ts | Path builder, easing functions, color maps, timing constants |
| stateHelpers.ts | Typed setter wrappers for beam/piece/charge state |
| bubbleHelpers.ts | Flash batching, highlight management |
| failureHandlers.ts | Void burst and failure state transitions |
| successHandlers.ts | Lock phase and success state transitions |
| types.ts (266 lines) | All engagement type definitions |

### Hooks Layer (src/hooks/)

| Hook | Purpose |
|------|---------|
| useBeamEngine | Central beam state, Animated.Values, lifecycle, cleanup |
| useGameplayTape | Tape visual state, refs, progressive reveal arrays |
| useGameplayTimer | Level timer management |
| useGameplayTutorial | Tutorial state, refs, placement/tap triggers |
| useGameplayFailure | Failure detection and consequence triggering |
| useGameplayModals | Modal visibility state machine |

---

## 2. Interaction Map

### Piece Placement (Axiom Sector -- Tap-to-Place)

| Trigger | Action | Visual Feedback |
|---------|--------|-----------------|
| Tap piece in PieceTray | Selects piece (sets activePiece) | Colored border + 15% background tint on tray item |
| Tap empty valid cell | Places selected piece on grid | Piece icon appears in cell; placement highlight (copper dashed border) disappears |
| Tap occupied cell (own piece) | Selects that piece for move | Border highlight on selected piece |

### Piece Placement (Kepler+ Sector -- ArcWheel Drag)

| Trigger | Action | Visual Feedback |
|---------|--------|-----------------|
| Tap ArcWheel node | Selects piece type | Node scales up, opacity increases from 0.18 to full |
| Long press (180ms) ArcWheel node | Initiates drag-and-drop | Ghost piece follows finger position |
| Drag release over valid cell | Places piece | Piece appears in target cell |
| Drag release over invalid area | Cancels placement | Ghost disappears, piece returns to wheel |
| Horizontal swipe (40px) | Dismisses/recalls wheel | 380ms slide animation off/on screen |

### Board Piece Interactions (Post-Placement)

| Trigger | Piece Type | Action | Visual Feedback |
|---------|-----------|--------|-----------------|
| Tap | Conveyor | Rotates 90 degrees | 400ms rotation animation |
| Tap | Config Node | Cycles configValue (0/1) | Purple icon state change |
| Tap | Latch | Toggles latchMode (STORE/RECALL) | Icon mode indicator change |
| Tap | All others | No action | None |
| Long press (500ms) | Any placed piece | Returns piece directly to tray | Piece disappears from cell, count increments in tray |

### Engagement Phase

| Trigger | Action | Visual Feedback |
|---------|--------|-----------------|
| Tap "ENGAGE MACHINE" button | Starts signal beam animation | Button state change, tray hides, beam begins |
| Beam reaches piece | Triggers per-piece flash + interaction animation | 180ms opacity flash, piece-specific SVG animation |
| Beam reaches Scanner | Pauses beam, reads tape value | Beam dims to 0.3 opacity, glow traveler arc animation |
| Beam reaches Config Node | Pauses beam, evaluates gate condition | Beam dim, gate pass (green) or block (red) feedback |
| Beam reaches Transmitter | Pauses beam, writes to output tape | Beam dim, value travel to output tape |
| Beam reaches Terminal | Lock phase triggers | Expanding concentric rings, color shift |
| Signal fails (void) | Void burst at failure point | 320ms expanding red ring, screen flash |

### Tutorial Interactions

| Trigger | Action | Visual Feedback |
|---------|--------|-----------------|
| Tap anywhere (during "tap to continue" steps) | Advances tutorial step | COGS orb flies to next target (spring: tension 100, friction 12) |
| Place correct piece (during "await placement" steps) | Advances tutorial | Portal morph to next element, glow pulse |
| Tap highlighted piece (during "await tap" steps) | Advances tutorial | Codex slide-in animation (200ms) |

---

## 3. Animation Inventory

### Cinematic Animations (0.6s+ cubic-bezier)

| Animation | Driver | Trigger | Duration | Easing | Visual Effect |
|-----------|--------|---------|----------|--------|---------------|
| Beam travel (full path) | RAF loop | Engage button tap | 300-1200ms (path-scaled) | easeOut3 cubic | Colored beam head moves along signal path, trail drawn behind |
| Value travel (glow traveler) | RN Animated, native | Beam reaches tape piece | 1150ms total (300+600+250) | bezier(0.4, 0, 0.2, 1) | Glowing orb lifts, arcs to tape row, impacts with fade |
| Tutorial board reveal | RN Animated, JS | Tutorial step advance | 400ms | bezier(0.25, 0.1, 0.25, 1) | Portal expands from orb center to board bounding box |
| Placement transition | RN Animated, JS | Phase change | 600ms pulse + 300/600/300 text | bezier(0.25, 0.1, 0.25, 1) + spring overshoot | Board glow pulse + "PLACEMENT PHASE" text fade |
| ArcWheel entrance | RN Animated, JS | Level load | 500ms per node (80ms stagger) | bezier(0.16, 1, 0.3, 1) | Nodes fly in from alternating above/below |
| Results overlay | Reanimated | Level complete | 400ms + 200ms/star stagger | FadeIn/FadeInUp | Modal fades in, stars reveal sequentially |
| Gear rotation (interaction) | RN Animated, native | Beam crosses gear | 400ms | standard | 90-degree rotation animation |
| Lock ring expansion | RN Animated, native | Beam reaches terminal | 320ms | linear interpolation | Two staggered concentric rings expand |
| ArcWheel dismiss/recall | RN Animated, JS | Horizontal swipe | 380ms | ease | Wheel slides horizontally off/on screen |

### Fast Feedback Animations (<300ms)

| Animation | Driver | Trigger | Duration | Visual Effect |
|-----------|--------|---------|----------|---------------|
| Piece flash | RN Animated, native | Beam crosses any piece | 180ms (2x90ms) | Opacity 0->1->0 pulse |
| Charge rings (Source) | RN Animated, native | Engage starts | 280ms | Two expanding rings at Source |
| Void burst | RN Animated, native | Signal fails | 320ms | Expanding red ring at failure point |
| Scanner scanline | RN Animated, JS | Beam crosses scanner | 200ms | Y-axis sweep line |
| Transmitter wave | RN Animated, JS | Beam crosses transmitter | 150ms (75+75) | Scale wave pulse |
| Splitter magnets | RN Animated, JS | Beam crosses splitter | 150ms | Snap extension, bezier(out, cubic) |
| Config Node gate | RN Animated, JS | Beam crosses config node | 240ms (6x40ms) | Triple pulse sequence |
| Callout fade | RN Animated, native | Tutorial step | 120-200ms | Opacity transition |
| Tape highlight | RN Animated, JS | Beam processes tape piece | 120ms in / 180ms out | Cell opacity pulse |

### Continuous/Looping Animations

| Animation | Driver | Trigger | Duration/Period | Visual Effect |
|-----------|--------|---------|-----------------|---------------|
| StarField twinkle | Reanimated shared values | Screen mount | 1100-2700ms per star | 20 stars oscillate opacity 0.1-0.85 |
| Tutorial glow pulse | RN Animated, JS | Tutorial active | 600ms per direction | Orb glow oscillates 0.7-1.0 |
| Replay loop | RAF + Animated | Level complete | 800ms gap between iterations | Full beam replays continuously |
| Conveyor rolling (active) | RN Animated, JS | Beam crossing | 500ms loop | Dash offset animation |
| ArcWheel idle pulse | RN Animated, JS | Wheel idle 2000ms | continuous | Opacity drops to 0.18 |

### Animation Driver Summary

| Driver | Use Case | Native Driver |
|--------|----------|---------------|
| requestAnimationFrame (manual) | Beam head position, per-tick state | N/A (direct setState) |
| react-native-reanimated | Screen wrapper fade, StarField, Results modal | Yes |
| RN core Animated (SVG props) | All PieceIcon animations, tape highlights, beam overlay | false (required) |
| RN core Animated (transforms/opacity) | Tutorial orb, flashes, ArcWheel entrance | true where safe |
| RN core Animated (layout props) | Tutorial portal morph, placement transition | false |

---

## 4. Preserve List (Working Well -- Carry Forward Exactly)

### Visual Identity

- **Color palette**: Void black backgrounds, amber Physics beam (#F0B429), cyan Protocol data (#00D4FF), purple Protocol pieces (#8B5CF6), neon tape colors (IN=#BFFF3F, TRAIL=#A97FDB, OUT=#FF7D3F)
- **Typography**: Orbitron headers, Space Mono system/monospace text, Exo 2 body -- all consistent across every screen
- **HUD Chrome**: Minimal top bar (pause, sector, level, timer) with no corner brackets on gameplay (reserved for title/tactical screens only)
- **COGS eye states**: Red=damage, Blue=operations, Amber=engagement, Green=warmth, Dark=offline -- avatar color transitions are character-establishing

### Interaction Model

- **Tap-to-place on Axiom** with placement highlights (copper dashed borders on valid cells)
- **ArcWheel drag-and-drop on Kepler+** with long-press-to-drag (180ms threshold)
- **Long press (500ms) on placed piece** returns directly to tray -- no ghost/held state, confirmed in CLAUDE.md as locked decision
- **Piece-specific tap actions**: Conveyor rotates, Config Node cycles, Latch toggles -- all others no-op
- **Auto-orientation**: pieces adjacent to Source auto-rotate to face away from it

### Animation Patterns

- **Beam three-phase (CHARGE/BEAM/LOCK)** is the cinematic centerpiece -- preserve the RAF-driven tick loop, the easeOut3 timing, the color-per-piece-type trail
- **Per-piece flash batching** (max 1 setState per RAF tick via FlashBatch) -- critical performance pattern
- **Value travel glow traveler** (lift-off 300ms, arc 600ms, impact 250ms) -- the most visually satisfying data movement animation
- **Staggered ArcWheel entrance** (alternating above/below, spring overshoot bezier) -- sets the tone for Kepler difficulty
- **Results star reveal** (FadeInUp with 200ms stagger per star) -- satisfying completion moment
- **Board-piece memo isolation** (custom arePropsEqual on animProps slice) -- prevents cascade re-renders during beam

### Scoring/Economy Visual

- **Score breakdown strip** with color-coded categories (green=max, amber=partial, red=zero)
- **Credit display** with CR abbreviation
- **Star thresholds** rendered as sequential reveal animations
- **COGS commentary** on results screen with discipline-specific variants

### Tape System Visual

- **Three-row IN/TRAIL/OUT** with colored indicator bars
- **Progressive reveal**: cells show empty until Scanner/Transmitter visually writes them (visualTrailOverride/visualOutputOverride)
- **Per-cell memo barriers** preventing re-render cascade during beam processing

---

## 5. Caution List (Entangled with Crash-Causing Code)

### HIGH RISK: Tutorial Overlay + Animated Hosts

The TutorialHUDOverlay (1173 lines) is the most complex conditional render tree in the app. It conditionally mounts/unmounts Animated.View hosts based on tutorial phase state. Documented crash pattern REQ-A-1 explicitly notes:

- **All tutorial animations use `useNativeDriver: false`** specifically to prevent crashes on conditionally-mounted hosts
- The orb flight (Animated.spring), portal morph, glow pulse, and codex slide all target views that may unmount during animation
- Phase transitions (idle -> flying -> arrived -> codex -> complete) trigger mount/unmount of animated children
- `isBeamActive` guard suspends `measureInWindow()` calls to prevent stale layout refs

**Risk**: Any refactor that changes the conditional render order or memo boundaries around tutorial overlay children will reproduce the crash. The animation-host-swap pattern (animating a view that gets unmounted mid-animation) is the primary crash vector.

### HIGH RISK: Beam Opacity Dim/Brighten During Tape Processing

When the beam reaches a tape piece (Scanner/ConfigNode/Transmitter), the system:
1. Pauses the RAF tick loop
2. Dims beam opacity to 0.3 via `Animated.timing` on `beamOpacity`
3. Runs the interaction animation (value travel, gate evaluation)
4. Brightens beam back to 1.0
5. Resumes RAF loop

**Risk**: The `beamOpacity` Animated.Value wraps the entire BeamOverlay. If the overlay unmounts during the dim/brighten transition (e.g., due to a state change in GameplayScreen that triggers re-render and conditional branch change), the animation targets a stale ref. This is the classic animation-host-swap crash.

### MEDIUM RISK: PieceIcon SVG Prop Animations

All PieceIcon interaction animations (gear rotation, scanner scanline, transmitter wave, etc.) animate SVG attributes directly. These MUST use `useNativeDriver: false` because the native driver cannot handle SVG props. If any refactor accidentally sets native driver to true on these, it will crash immediately.

Additionally, PieceIcon receives `animProps` that change rapidly during beam execution. The custom `arePropsEqual` comparator on BoardPiece prevents unnecessary re-renders, but if this memo boundary is broken (e.g., by adding non-memoized props or changing the comparison logic), every piece will re-render on every RAF tick -- causing frame drops and potential crashes from animation queue overflow.

### MEDIUM RISK: Splitter Fork (Parallel Beam Paths)

`runPulse()` in beamAnimation.ts handles Splitter by launching parallel `runLinearPath()` calls for branch A and branch B. Both share the same `setBeamState` setter. If the component unmounts while both branches are mid-flight (e.g., navigation away during execution), both RAF loops try to setState on unmounted component.

**Risk**: The `cancelAllFrames()` cleanup in useBeamEngine must be called reliably on unmount. If the cleanup races with the RAF callbacks, stale setState calls cause the "Can't perform a React state update on an unmounted component" warning or crash.

### MEDIUM RISK: Replay Loop State Reset

`replayLoop.ts` resets litWires, pieceAnimState, and tape state between iterations with an 800ms gap. If the user navigates away during the gap (after reset but before re-launch), the component may be in a partially-reset state when unmount cleanup fires.

### LOW RISK: StarField (Reanimated Shared Values)

StarField uses react-native-reanimated `useSharedValue` + `withRepeat` + `withSequence` for 20 stars. This is isolated behind React.memo and should not interact with the beam system. However, it represents a second animation runtime (reanimated vs. core Animated) coexisting in the same screen. If any future refactor accidentally mixes reanimated shared values with core Animated.Value in the same view hierarchy, it will cause undefined behavior.

### LOW RISK: GameplayScreen Size (2068 lines)

The master screen file is extremely large. It holds state, handlers, layout, and phase management in one component. Any refactor that splits this must carefully preserve:
- The phase state machine (placement -> engagement -> results)
- The memo/ref boundaries that prevent cascade re-renders during beam
- The cleanup order in useEffect returns (beam cleanup before tutorial cleanup before timer cleanup)

---

## 6. Design System Reference (Y2K Aesthetic)

### Color Usage by Context

| Context | Primary | Secondary | Accent |
|---------|---------|-----------|--------|
| Background | #06090f (void) | #0a1628 (navy) | -- |
| Physics beam/pieces | #F0B429 (amber) | #c87941 (copper) | -- |
| Protocol data | #00D4FF (neon cyan) | #8B5CF6 (circuit purple) | #00E5FF |
| Tape IN | #BFFF3F (neon yellow-green) | -- | -- |
| Tape TRAIL | #A97FDB (soft purple) | -- | -- |
| Tape OUT | #FF7D3F (neon orange) | -- | -- |
| Success/pass | #00FF87 (neon green) | #00C48C | -- |
| Failure/block | #FF3B3B (red) | #e05555 | -- |
| Text primary | #e8f0ff (star white) | -- | -- |
| Borders/chrome | #1a3a5c (steel) | -- | -- |

### Translucent Effects

- Beam opacity dim during tape processing: 0.3 alpha
- ArcWheel idle state: 0.18 alpha
- StarField stars: 0.1-0.85 oscillation
- Wire overlay locked state: 0.45 alpha
- Tutorial dim backdrop: animated 0->0.7 alpha

### Corner Bracket Treatment

- Present ONLY on title screen and tactical/operational screens (per CLAUDE.md rule 6)
- NOT present on gameplay canvas, settings, codex details, or personal screens
- Thin teal/cyan right-angle brackets in all four viewport corners

### Spacing/Layout

- Board: `CANVAS_PAD = 20px`, `CELL_SIZE = dynamic (48-88px range)`
- Tray/HUD: consistent 16-20px horizontal margins
- Cards: subtle dark borders (slightly lighter than void background)
- Bottom tab bar: 5 tabs, icon above monospaced label, active tab amber-highlighted
- ArcWheel: `NODE_SLOT_H = 60px`, 5 visible nodes

---

## 7. Two Animation APIs -- Coexistence Rules

The codebase uses TWO distinct animation systems. Their separation is intentional and must be maintained:

| System | Files | What It Drives | Native Driver |
|--------|-------|----------------|---------------|
| react-native-reanimated | StarField, GameplayScreen wrapper, GameplayModals | Background stars, screen-level opacity, results overlay | Yes (always) |
| RN core Animated | Everything else | Beam, pieces, tutorial, tape, ArcWheel | Mixed (false for SVG, true for transform/opacity) |

**Rule**: Never mix reanimated shared values with core Animated.Value in the same view. Never pass a reanimated `useAnimatedStyle` result to a core `Animated.View`. The two systems have incompatible internals and will crash if cross-wired.

---

## End of Audit

This document provides the complete visual and interaction reference for rebuilding the gameplay layer. The Preserve List defines what must survive unchanged. The Caution List identifies the specific code patterns that were entangled with crash-causing animation host swaps. Any rebuild must address the caution items architecturally (stable animation hosts, guaranteed cleanup, memo boundary preservation) while reproducing the preserve items pixel-for-pixel.
