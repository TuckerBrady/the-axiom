# GameplayScreen Refactor Spec

**Status:** Draft  
**Author:** Claude Code (Systems Engineer)  
**Ref commit:** 35d32ac

---

## Problem Statement

`GameplayScreen.tsx` is 3,069 lines and owns 117 hooks (40 useRef, 42 useState, plus
useMemo, useCallback, useEffect, useFocusEffect, useSharedValue). It handles tape
rendering, beam animation, tutorial coordination, all modal overlays, the timer, board
interaction, scoring, and navigation in one undifferentiated tree. Every beam-tick
setState call reconciles the entire component. Performance bugs are hard to isolate
because unrelated state shares a reconciliation boundary. Tests are hard to write
because nothing is independently importable.

---

## Complete Hook / State Inventory

### useState (42 hooks)

| Variable | Domain | Couples To |
|---|---|---|
| `scoreResult` | scoring | Results overlay |
| `cogsScoreComment` | scoring | Results overlay |
| `currentHint` | tutorial | TutorialHint |
| `hintQueue` | tutorial | currentHint |
| `tutorialComplete` | tutorial | TutorialHUDOverlay gate |
| `tutorialSkipped` | tutorial | TutorialHUDOverlay gate |
| `showDisciplineCard` | modal | navigation |
| `creditError` | modal | tray UI |
| `failCount` | failure | blownCells, void overlay |
| `blownCells` | failure | board render, void/wrong output modals |
| `showTeachCard` | modal | void overlay (sequenced) |
| `showEconomyIntro` | modal | level sector |
| `showResults` | modal | scoring, navigation |
| `showCompletionCard` | modal | handleEngage success path |
| `showVoid` | modal | handleEngage failure path |
| `showWrongOutput` | modal | handleEngage wrong-output path |
| `wrongOutputData` | modal | showWrongOutput |
| `showInsufficientPulses` | modal | handleEngage failure path |
| `pulseResultData` | modal | showInsufficientPulses |
| `showOutOfLives` | modal | lives, navigation |
| `showPauseModal` | modal | timer |
| `showAbandonConfirm` | modal | showPauseModal (nested) |
| `elapsedSeconds` | timer | HUDChrome, Results, Pause |
| `showSystemRestored` | modal | handleEngage success path |
| `showCompletionScene` | modal | A1-8 success path |
| `completionText` | modal | showCompletionScene |
| `firstTimeBonus` | scoring | Results overlay |
| `elaborationMult` | scoring | Results overlay |
| `flashColor` | beam | flash overlay |
| `beamState` | beam | BeamOverlay, WireOverlay, HUDChrome pulse counter |
| `pieceAnimState` | beam | BoardGrid / BoardPiece |
| `chargeState` | beam | BeamOverlay |
| `lockRingCenter` | beam | BeamOverlay |
| `voidBurstCenter` | beam | BeamOverlay |
| `tapeCellHighlights` | tape | TapeBarShell |
| `tapeBarState` | tape | TapeBarShell |
| `glowTravelerState` | tape | glow traveler RNAnimated.View |
| `visualTrailOverride` | tape | TapeBarShell |
| `visualOutputOverride` | tape | TapeBarShell |
| `currentPulseIndex` | beam | HUDChrome pulse counter, TapeBarShell |
| `canvasLayout` | board | CELL_SIZE derivation |

### useRef (40 hooks)

| Ref | Domain | Notes |
|---|---|---|
| `sourceNodeRef` | tutorial measurement | Passed to TutorialHUDOverlay targetRefs |
| `outputNodeRef` | tutorial measurement | Passed to TutorialHUDOverlay targetRefs |
| `boardGridRef` | tutorial/beam | measureInWindow in handleEngage |
| `engageButtonRef` | tutorial measurement | Passed to TutorialHUDOverlay targetRefs |
| `boardScannerRef` | tutorial measurement | Passed to TutorialHUDOverlay targetRefs |
| `trayConveyorRef` | tutorial measurement | Passed to TutorialHUDOverlay targetRefs |
| `trayGearRef` | tutorial measurement | Same |
| `trayConfigNodeRef` | tutorial measurement | Same |
| `traySplitterRef` | tutorial measurement | Same |
| `traScannerRef` | tutorial measurement | Same |
| `trayTransmitterRef` | tutorial measurement | Same |
| `inputTapeRowRef` | tape/tutorial | TapeBarShell ref prop + tutorial targetRefs |
| `outputTapeRowRef` | tape/tutorial | Same |
| `dataTrailRowRef` | tape/tutorial | Same |
| `inputTapeCellsRef` | tape/beam | measureInWindow in handleEngage |
| `dataTrailCellsRef` | tape/beam | Same |
| `outputTapeCellsRef` | tape/beam | Same |
| `currentPulseRef` | beam | Sync read inside EngagementContext |
| `timerRef` | timer | setInterval handle |
| `timerRunning` | timer | Mutable boolean for timer |
| `lockedRef` | timer | Stops timer at ENGAGE press |
| `glowTravelerX/Y/Scale/Opacity` | tape | Animated.Values, passed to EngagementContext |
| `beamOpacity` | beam | Animated.Value, passed to EngagementContext |
| `chargeProgressAnim` | beam | Animated.Value, native-driver charge rings |
| `lockRingProgressAnim` | beam | Animated.Value, native-driver lock rings |
| `voidPulseRingProgressAnim` | beam | Animated.Value, native-driver void burst |
| `animFrameRef` | beam | Map of RAF IDs per branch slot |
| `loopingRef` | beam | Replay loop guard |
| `flashTimersRef` | beam | Per-pulse sweep bucket |
| `safetyTimersRef` | beam | Safety timer bucket (cross-pulse) |
| `gateOutcomesRef` | tape | GateOutcomeMap, passed to EngagementContext and TapeBarShell |
| `terminalSuccessCountRef` | beam | Live pulse counter |
| `cacheRef` | beam | MeasurementCache for board/tape positions |
| `hintTriggered` | tutorial | Set<string> deduplication |
| `tutorialIsActiveRef` | tutorial | Read by timer interval callback |
| `blownCellsRef` | failure | Sync copy of blownCells for closure reads |
| `screenOpacity` | screen | Reanimated shared value |

---

## Dependency Graph

```
GameplayScreen (orchestrator)
│
├── Store layer (stable external deps)
│   ├── useGameStore     → level, machineState, pieces, wires, engage(), reset(), ...
│   ├── useLivesStore    → lives, loseLife(), refillLives(), livesCredits, addCredits()
│   ├── useProgressionStore → completeLevel(), isLevelDone()
│   ├── usePlayerStore   → discipline
│   └── useEconomyStore  → credits, setLevelBudget(), spendCredits(), earnCredits(), ...
│
├── [Phase 1] useGameplayModals
│   needs: level (read), lives, credits, livesCredits, navigation, handleReset, blownCells, failCount
│   needs (from beam/scoring): setScoreResult, setCogsScoreComment, setFirstTimeBonus,
│           setElaborationMult, setFlashColor, setShowSystemRestored, setShowCompletionScene,
│           setCompletionText, setShowCompletionCard
│   returns: 14 modal booleans + data, all setters, showAbandonConfirm
│
├── [Phase 1] useGameplayFailure
│   needs: level, blownCells, isAxiomLevel
│   owns: blownCells, failCount, blownCellsRef
│   returns: blownCells, failCount, setBlownCells, setFailCount, findBlownPiece, getBlownCellCOGSLine
│
├── [Phase 2] useGameplayTutorial
│   needs: level, isAxiomLevel, isLevelPreviouslyCompleted
│   owns: tutorialComplete, tutorialSkipped, currentHint, hintQueue, hintTriggered,
│         all tutorial refs (sourceNodeRef, outputNodeRef, boardGridRef, engageButtonRef,
│         boardScannerRef, inputTapeRowRef, outputTapeRowRef, dataTrailRowRef,
│         all tray refs), tutorialTargetRefs memo, tutorialTrayRefs memo,
│         tutorialSpotlightCells memo
│   needs (from timer): tutorialIsActiveRef (receives the ref, doesn't own it)
│   returns: tutorialComplete, tutorialSkipped, tutorialIsActive, currentHint,
│             triggerHints(), dismissHint(), tutorialTargetRefs, tutorialTrayRefs,
│             tutorialSpotlightCells, all piece refs (sourceNodeRef, outputNodeRef, etc.)
│
├── [Phase 2] useGameplayTimer
│   needs: level?.id, tutorialIsActiveRef, showPauseModal
│   owns: elapsedSeconds, timerRef, timerRunning, lockedRef
│   returns: elapsedSeconds, lockTimer(), resetTimer()
│   note: lockTimer() is called at ENGAGE start; resetTimer() at handleReset
│
├── [Phase 3] useGameplayTape
│   needs: level
│   owns: visualTrailOverride, visualOutputOverride, tapeCellHighlights, tapeBarState,
│         glowTravelerState, glowTravelerX/Y/Scale/Opacity (Animated.Values),
│         gateOutcomesRef, inputTapeCellsRef, dataTrailCellsRef, outputTapeCellsRef
│   returns: all state (for rendering), all setters (for EngagementContext),
│             all refs (for TapeBarShell ref props and EngagementContext),
│             resetTape()
│
└── [Phase 4] useBeamEngine
    needs: CELL_SIZE, machineStatePieces, wires
    owns: beamState, pieceAnimState, chargeState, lockRingCenter, voidBurstCenter,
          flashColor, currentPulseIndex, currentPulseRef, beamOpacity,
          chargeProgressAnim, lockRingProgressAnim, voidPulseRingProgressAnim,
          animFrameRef, loopingRef, flashTimersRef, safetyTimersRef,
          terminalSuccessCountRef, cacheRef
    returns: all state (for rendering), all setters (for EngagementContext),
              pieceAnimProps (memoized), cancelAllFrames(), resetBeam(),
              buildEngagementContextFields()

Cross-cutting state that stays in GameplayScreen:
  - getPieceCenter (needs machineState.pieces AND CELL_SIZE — both available above)
  - handleEngage (async, needs state from every domain — orchestrator-level)
  - handleReset (calls resetBeam + resetTape + resetTimer + gameStore.reset)
  - canvasLayout / CELL_SIZE derivation
  - pieceById memo (for WireOverlay)
  - playerPieces, availableCounts, trayPieceTypes, trayCosts, trayAffordable memos
  - handleCanvasTap, handlePieceTap, handlePieceLongPress, getAutoRotation
  - creditError, setCreditError (local UI flash — inline, no extraction needed)
```

### State That Cannot Be Cleanly Separated

1. **`blownCells` / `failCount`** — Set by `handleVoidFailure` (beam domain logic) and
   read by the Void and Wrong Output modals (UI domain). These are owned by a small
   `useGameplayFailure` hook and passed into both domains.

2. **`handleEngage`** — This async callback is the system boundary where every domain
   converges. It reads CELL_SIZE, machineState, level, triggerHints, the tape refs,
   the beam engine state, and writes to modals. It must stay in GameplayScreen as the
   orchestrator. Beam engine extraction (Phase 4) makes it smaller but does not move it.

3. **Tape refs that serve two masters** — `inputTapeCellsRef`, `dataTrailCellsRef`,
   `outputTapeCellsRef` are ref-prop targets in TapeBarShell JSX *and* measurement
   inputs to EngagementContext. The hook owns the refs and returns them; JSX receives
   them via destructuring.

4. **`tutorialIsActiveRef`** — Owned by the tutorial hook but read by the timer
   interval callback (which is set up in the timer hook/effect). The timer hook
   receives the ref as an argument rather than duplicating it.

5. **`gateOutcomesRef`** — Owned by the tape hook, passed to both TapeBarShell
   (as `gateOutcomesByIndex`) and to EngagementContext (as `gateOutcomes`).

---

## Phase 1: Modals + Failure (Lowest Risk)

**Goal:** Remove all full-screen overlay rendering from GameplayScreen's JSX.
Estimated line reduction: ~900 lines of JSX + styles.

### Extract: `useGameplayFailure`

```typescript
// hooks/useGameplayFailure.ts
function useGameplayFailure(level: Level | null, isAxiomLevel: boolean) {
  const [blownCells, setBlownCells] = useState<Set<string>>(new Set());
  const [failCount, setFailCount] = useState(0);
  const blownCellsRef = useRef<Set<string>>(new Set());

  useEffect(() => { blownCellsRef.current = blownCells; }, [blownCells]);

  useEffect(() => {
    setBlownCells(new Set());
    setFailCount(0);
  }, [level?.id]);

  const findBlownPiece = useCallback(/* existing logic */, [blownCells]);
  const getBlownCellCOGSLine = (count: number): string | null => /* existing */;

  return { blownCells, setBlownCells, failCount, setFailCount,
           blownCellsRef, findBlownPiece, getBlownCellCOGSLine };
}
```

### Extract: `useGameplayModals`

Owns all 14 modal boolean flags plus their associated data state:

```typescript
// hooks/useGameplayModals.ts
function useGameplayModals(deps: {
  level: Level | null;
  lives: number;
  credits: number;
  livesCredits: number;
  isDailyChallenge: boolean;
  isAxiomLevel: boolean;
  blownCells: Set<string>;
}) {
  // Modal flags
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCompletionCard, setShowCompletionCard] = useState(false);
  const [showWrongOutput, setShowWrongOutput] = useState(false);
  const [wrongOutputData, setWrongOutputData] = useState<...>(null);
  const [showInsufficientPulses, setShowInsufficientPulses] = useState(false);
  const [pulseResultData, setPulseResultData] = useState<...>(null);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [showEconomyIntro, setShowEconomyIntro] = useState(false);
  const [showSystemRestored, setShowSystemRestored] = useState<string | null>(null);
  const [showCompletionScene, setShowCompletionScene] = useState(false);
  const [completionText, setCompletionText] = useState('');
  const [showDisciplineCard, setShowDisciplineCard] = useState(false);
  const [showTeachCard, setShowTeachCard] = useState<string[] | null>(null);

  // Scoring display state (read by Results overlay)
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [cogsScoreComment, setCogsScoreComment] = useState('');
  const [firstTimeBonus, setFirstTimeBonus] = useState(false);
  const [elaborationMult, setElaborationMult] = useState(1);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Economy intro AsyncStorage effect (moved from GameplayScreen)
  useEffect(/* existing economy intro effect */, [level?.id]);

  // Pause stops/resumes timer — no, timer hook handles this. This hook
  // exposes showPauseModal as a signal for the timer hook to consume.

  const anyModalOpen = showPauseModal || showVoid || showResults ||
    showWrongOutput || showInsufficientPulses || showOutOfLives ||
    showEconomyIntro || showCompletionCard;

  return {
    // flags (read by render + execution guards in handleCanvasTap, handlePieceTap, etc.)
    showPauseModal, setShowPauseModal,
    showAbandonConfirm, setShowAbandonConfirm,
    showVoid, setShowVoid,
    showResults, setShowResults,
    showCompletionCard, setShowCompletionCard,
    showWrongOutput, setShowWrongOutput, wrongOutputData, setWrongOutputData,
    showInsufficientPulses, setShowInsufficientPulses, pulseResultData, setPulseResultData,
    showOutOfLives, setShowOutOfLives,
    showEconomyIntro, setShowEconomyIntro,
    showSystemRestored, setShowSystemRestored,
    showCompletionScene, setShowCompletionScene, completionText, setCompletionText,
    showDisciplineCard, setShowDisciplineCard,
    showTeachCard, setShowTeachCard,
    scoreResult, setScoreResult,
    cogsScoreComment, setCogsScoreComment,
    firstTimeBonus, setFirstTimeBonus,
    elaborationMult, setElaborationMult,
    flashColor, setFlashColor,
    anyModalOpen,
  };
}
```

### Extract: `GameplayModals` component

A single component that receives all the above as props and renders the full-screen
overlays. No logic — pure conditional render + existing JSX. ~800 lines of JSX move
here. `handleReset` and `navigation` are passed as props.

**Risk assessment:** Low.
- Modal booleans are set by `handleEngage`, `handleVoidFailure`, `handleWrongOutput`,
  `handleSuccess`. Those pass the setters as arguments already (via EngagementContext
  or directly). Setters returned by the hook are stable React `Dispatch` refs.
- `showPauseModal` gates the timer; with extraction the timer hook receives
  `showPauseModal` as a reactive input.
- `showVoid`, `showWrongOutput`, `showInsufficientPulses` are read in
  `handleCanvasTap`, `handlePieceTap`, `handlePieceLongPress` to block interaction.
  These remain accessible from GameplayScreen via destructuring.

**Test surface:** Render each overlay independently with mock props. Verify
correct overlay renders for each modal boolean set to true.

---

## Phase 2: Tutorial + Timer (Low-Medium Risk)

**Goal:** Remove tutorial hydration logic and timer from GameplayScreen.
Estimated line reduction: ~200 lines.

### Extract: `useGameplayTimer`

```typescript
// hooks/useGameplayTimer.ts
function useGameplayTimer(
  levelId: string | undefined,
  tutorialIsActiveRef: React.MutableRefObject<boolean>,
  showPauseModal: boolean,
) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRunning = useRef(false);
  const lockedRef = useRef(false);

  // Reset on level change (existing effect)
  useEffect(() => {
    setElapsedSeconds(0);
    lockedRef.current = false;
    timerRunning.current = true;
    timerRef.current = setInterval(() => {
      if (timerRunning.current && !tutorialIsActiveRef.current) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      timerRunning.current = false;
    };
  }, [levelId]);

  // Pause modal gates timer (existing effect)
  useEffect(() => {
    if (lockedRef.current) return;
    timerRunning.current = !showPauseModal;
  }, [showPauseModal]);

  const lockTimer = useCallback(() => {
    timerRunning.current = false;
    lockedRef.current = true;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    return elapsedSeconds; // returns snapshot for scoring
  }, [elapsedSeconds]);

  const resetTimer = useCallback((tutorialRef: React.MutableRefObject<boolean>) => {
    setElapsedSeconds(0);
    lockedRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (timerRunning.current && !tutorialRef.current) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    timerRunning.current = true;
  }, []);

  return { elapsedSeconds, lockTimer, resetTimer, lockedRef };
}
```

**Note on `tutorialIsActiveRef` threading:** The tutorial hook owns `tutorialIsActive`
(derived boolean) and maintains `tutorialIsActiveRef`. The timer hook receives that
ref as a constructor argument. GameplayScreen wires them:

```typescript
const tutorial = useGameplayTutorial(level, isAxiomLevel, isLevelPreviouslyCompleted);
const timer = useGameplayTimer(level?.id, tutorial.tutorialIsActiveRef, modals.showPauseModal);
```

### Extract: `useGameplayTutorial`

```typescript
// hooks/useGameplayTutorial.ts
function useGameplayTutorial(
  level: Level | null,
  isAxiomLevel: boolean,
  isLevelPreviouslyCompleted: boolean,
) {
  // Owned state
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [tutorialSkipped, setTutorialSkipped] = useState(false);
  const [currentHint, setCurrentHint] = useState<...>(null);
  const [hintQueue, setHintQueue] = useState<...>([]);
  const hintTriggered = useRef<Set<string>>(new Set());

  // All piece + tray refs (stable — deps array is empty on memos)
  const sourceNodeRef = useRef<View>(null);
  const outputNodeRef = useRef<View>(null);
  const engageButtonRef = useRef<View>(null);
  const boardScannerRef = useRef<View>(null);
  const trayConveyorRef = useRef<View>(null);
  // ... etc.

  const tutorialIsActive = !tutorialComplete && !tutorialSkipped &&
    !isLevelPreviouslyCompleted && isAxiomLevel &&
    (level?.tutorialSteps?.length ?? 0) > 0;

  const tutorialIsActiveRef = useRef(tutorialIsActive);
  useEffect(() => { tutorialIsActiveRef.current = tutorialIsActive; }, [tutorialIsActive]);

  // Hydration effect (existing)
  useEffect(/* existing hydration */, [level?.id, isAxiomLevel, isLevelPreviouslyCompleted]);

  // Tutorial hints setup effect (existing)
  useEffect(/* existing hint setup */, [level?.id]);

  const triggerHints = useCallback(/* existing */, [level, isAxiomLevel, isLevelPreviouslyCompleted, currentHint]);
  const dismissHint = useCallback(/* existing */, []);

  const tutorialTargetRefs = useMemo(() => ({
    sourceNode: sourceNodeRef,
    outputNode: outputNodeRef,
    // ... etc.
  }), []);

  const tutorialTrayRefs = useMemo(() => ({
    trayConveyor: trayConveyorRef,
    // ... etc.
  }), []);

  const tutorialSpotlightCells = useMemo(
    () => level?.prePlacedPieces.filter(...).map(...) ?? [],
    [level?.prePlacedPieces],
  );

  return {
    tutorialComplete, setTutorialComplete,
    tutorialSkipped, setTutorialSkipped,
    tutorialIsActive, tutorialIsActiveRef,
    currentHint, hintQueue,
    triggerHints, dismissHint,
    tutorialTargetRefs, tutorialTrayRefs, tutorialSpotlightCells,
    sourceNodeRef, outputNodeRef, engageButtonRef, boardScannerRef,
  };
}
```

**Risk assessment:** Low-medium.
- `triggerHints` is called from inside `handleEngage` (async closure). The closure
  captures `triggerHints` from the destructured hook return. As long as it's wrapped
  in `useCallback` with stable deps (which it already is), this is safe.
- `tutorialIsActiveRef` threading through to the timer is the most novel pattern.
  It is a ref (not state), so passing it as a constructor argument is safe — no
  stale-closure risk.
- The 10 tray/piece refs move from GameplayScreen's top-level declarations to the
  tutorial hook. JSX that renders PieceTray and BoardGrid receives them via
  destructuring. No functional change.

**Test surface:** Verify tutorial hydration reads/writes AsyncStorage correctly.
Verify `triggerHints` deduplicates correctly across calls. Verify timer pauses
during tutorial steps.

---

## Phase 3: Tape System (Medium Risk)

**Goal:** Isolate all tape-visual state from beam state.
Estimated line reduction: ~100 lines of hook setup + 50 lines JSX.

### Extract: `useGameplayTape`

```typescript
// hooks/useGameplayTape.ts
function useGameplayTape(level: Level | null) {
  const [visualTrailOverride, setVisualTrailOverride] = useState<(number | null)[] | null>(null);
  const [visualOutputOverride, setVisualOutputOverride] = useState<number[] | null>(null);
  const [tapeCellHighlights, setTapeCellHighlights] = useState<Map<string, TapeHighlight>>(new Map());
  const [tapeBarState, setTapeBarState] = useState<TapeIndicatorBarState>(TAPE_BAR_INITIAL);
  const [glowTravelerState, setGlowTravelerState] = useState<GlowTravelerState>(GLOW_TRAVELER_INITIAL);

  // Animated.Values — allocated once, stable across re-renders
  const glowTravelerX = useRef(new RNAnimated.Value(0)).current;
  const glowTravelerY = useRef(new RNAnimated.Value(0)).current;
  const glowTravelerScale = useRef(new RNAnimated.Value(1)).current;
  const glowTravelerOpacity = useRef(new RNAnimated.Value(0)).current;

  // Measurement refs — ref-prop targets in TapeBarShell and EngagementContext
  const inputTapeCellsRef = useRef<View>(null);
  const dataTrailCellsRef = useRef<View>(null);
  const outputTapeCellsRef = useRef<View>(null);

  // Gate outcome map (cross-domain: tape state + beam logic)
  const gateOutcomesRef = useRef<GateOutcomeMap>(new Map());

  const resetTape = useCallback(() => {
    setTapeCellHighlights(new Map());
    setTapeBarState(TAPE_BAR_INITIAL);
    resetGlowTraveler({ x: glowTravelerX, y: glowTravelerY, scale: glowTravelerScale, opacity: glowTravelerOpacity });
    setGlowTravelerState(GLOW_TRAVELER_INITIAL);
    gateOutcomesRef.current.clear();
    setVisualTrailOverride(null);
    setVisualOutputOverride(null);
  }, [glowTravelerX, glowTravelerY, glowTravelerScale, glowTravelerOpacity]);

  // Tape setters for EngagementContext
  const tapeSetters = {
    setTapeCellHighlights,
    setTapeBarState,
    setGlowTravelerState,
    setVisualTrailOverride,
    setVisualOutputOverride,
  };

  const valueTravelRefs: ValueTravelRefs = {
    x: glowTravelerX,
    y: glowTravelerY,
    scale: glowTravelerScale,
    opacity: glowTravelerOpacity,
  };

  return {
    // Render values
    visualTrailOverride, visualOutputOverride,
    tapeCellHighlights, tapeBarState, glowTravelerState,
    // Animated.Values (for glow traveler rendering)
    glowTravelerX, glowTravelerY, glowTravelerScale, glowTravelerOpacity,
    // Refs (for JSX ref props AND EngagementContext)
    inputTapeCellsRef, dataTrailCellsRef, outputTapeCellsRef,
    gateOutcomesRef,
    // For EngagementContext construction
    tapeSetters, valueTravelRefs,
    // Cleanup
    resetTape,
  };
}
```

**Risk assessment:** Medium.
- The tape refs serve two JSX consumers: the `ref` prop on the TapeBarShell sub-views,
  and `measureInWindow` calls inside `handleEngage`. Both receive the same ref object
  from the hook — no issue.
- `gateOutcomesRef.current.clear()` is called in 4 places: unmount cleanup,
  blur cleanup, `handleEngage` completion, and `handleReset`. With extraction, all
  four call `tape.gateOutcomesRef.current.clear()`. The pattern is unchanged.
- `setVisualTrailOverride` / `setVisualOutputOverride` are called at the start of
  `handleEngage` to seed the progressive reveal. They are now accessed via
  `tape.tapeSetters.*`. The async closure captures these at hook-call time — they
  are stable `Dispatch` references, safe to capture.

**Test surface:** Verify glow traveler animates correctly via Animated.Value refs.
Verify resetTape() clears all state cleanly. Verify TapeBarShell receives correct
refs and renders highlights.

---

## Phase 4: Beam Engine (Highest Risk, Highest Value)

**Goal:** Move all beam animation state into a single hook. Make EngagementContext
construction call the hook's output rather than building from raw GameplayScreen state.
Estimated line reduction: ~300 lines of hook setup.

### Extract: `useBeamEngine`

```typescript
// hooks/useBeamEngine.ts
function useBeamEngine(
  CELL_SIZE: number,
  machineStatePieces: PlacedPiece[],
  wires: WireRef[],
) {
  // Compound state (see PERFORMANCE_CONTRACT — these groupings must not be split)
  const [beamState, setBeamState] = useState<BeamState>(BEAM_INITIAL);
  const [pieceAnimState, setPieceAnimState] = useState<PieceAnimState>(PIECE_ANIM_INITIAL);
  const [chargeState, setChargeState] = useState<ChargeState>(CHARGE_INITIAL);
  const [lockRingCenter, setLockRingCenter] = useState<Pt | null>(null);
  const [voidBurstCenter, setVoidBurstCenter] = useState<Pt | null>(null);
  const [currentPulseIndex, setCurrentPulseIndex] = useState(0);

  // Native-driver Animated.Values
  const beamOpacity = useRef(new RNAnimated.Value(1)).current;
  const chargeProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const lockRingProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const voidPulseRingProgressAnim = useRef(new RNAnimated.Value(0)).current;

  // Mutable refs
  const animFrameRef = useRef<Map<number | null, number | null>>(new Map());
  const loopingRef = useRef(false);
  const flashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const safetyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const terminalSuccessCountRef = useRef(0);
  const currentPulseRef = useRef(0);
  const cacheRef = useRef<MeasurementCache>({ board: { x: 0, y: 0 }, input: null, trail: null, output: null });

  const cancelAllFrames = useCallback(() => {
    animFrameRef.current.forEach(id => { if (id != null) cancelAnimationFrame(id); });
    animFrameRef.current.clear();
    flashTimersRef.current.forEach(t => clearTimeout(t));
    flashTimersRef.current = [];
    safetyTimersRef.current.forEach(t => clearTimeout(t));
    safetyTimersRef.current = [];
    loopingRef.current = false;
  }, []);

  const resetBeam = useCallback(() => {
    cancelAllFrames();
    setBeamState(BEAM_INITIAL);
    setPieceAnimState(PIECE_ANIM_INITIAL);
    setChargeState(CHARGE_INITIAL);
    setLockRingCenter(null);
    setVoidBurstCenter(null);
    chargeProgressAnim.setValue(0);
    lockRingProgressAnim.setValue(0);
    voidPulseRingProgressAnim.setValue(0);
    setCurrentPulseIndex(0);
    terminalSuccessCountRef.current = 0;
    currentPulseRef.current = 0;
    cacheRef.current = { board: { x: 0, y: 0 }, input: null, trail: null, output: null };
    beamOpacity.setValue(1);
  }, [cancelAllFrames, beamOpacity, chargeProgressAnim, lockRingProgressAnim, voidPulseRingProgressAnim]);

  // Memoized pieceAnimProps (currently in GameplayScreen)
  const pieceAnimProps = useMemo(() => {
    const map = new Map<string, PieceAnimProps>();
    for (const piece of machineStatePieces) {
      map.set(piece.id, {
        animType: pieceAnimState.animations.get(piece.id),
        gateResult: pieceAnimState.gates.get(piece.id) ?? null,
        failColor: pieceAnimState.failColors.get(piece.id) ?? null,
        flashColor: pieceAnimState.flashing.get(piece.id) ?? null,
        flashCounter: pieceAnimState.flashCounter.get(piece.id) ?? 0,
      });
    }
    return map;
  }, [machineStatePieces, pieceAnimState.animations, pieceAnimState.gates,
      pieceAnimState.failColors, pieceAnimState.flashing, pieceAnimState.flashCounter]);

  return {
    // Render state
    beamState, pieceAnimState, chargeState, lockRingCenter, voidBurstCenter,
    currentPulseIndex, pieceAnimProps,
    // Animated.Values (for BeamOverlay)
    beamOpacity, chargeProgressAnim, lockRingProgressAnim, voidPulseRingProgressAnim,
    // Refs (for EngagementContext)
    animFrameRef, loopingRef, flashTimersRef, safetyTimersRef,
    terminalSuccessCountRef, currentPulseRef, cacheRef,
    // Setters (for EngagementContext)
    setBeamState, setPieceAnimState, setChargeState,
    setLockRingCenter, setVoidBurstCenter, setCurrentPulseIndex,
    // Lifecycle
    cancelAllFrames, resetBeam,
  };
}
```

### EngagementContext Construction After Phase 4

In `handleEngage`, the ctx object is built from destructured hook returns:

```typescript
const ctx: EngagementContext = {
  CELL_SIZE,
  getPieceCenter,
  machineStatePieces: machineState.pieces,

  // Beam engine state
  setBeamState: beam.setBeamState,
  setPieceAnimState: beam.setPieceAnimState,
  setChargeState: beam.setChargeState,
  setLockRingCenter: beam.setLockRingCenter,
  setVoidBurstCenter: beam.setVoidBurstCenter,
  animFrameRef: beam.animFrameRef,
  flashTimersRef: beam.flashTimersRef,
  safetyTimersRef: beam.safetyTimersRef,
  beamOpacity: beam.beamOpacity,
  chargeProgressAnim: beam.chargeProgressAnim,
  lockRingProgressAnim: beam.lockRingProgressAnim,
  voidPulseRingProgressAnim: beam.voidPulseRingProgressAnim,
  currentPulseRef: beam.currentPulseRef,
  loopingRef: beam.loopingRef,
  cacheRef: beam.cacheRef,
  chargeAnim: null,
  lockAnim: null,
  voidPulseAnim: null,
  setCurrentPulseIndex: beam.setCurrentPulseIndex,
  wires,

  // Tape state
  setTapeCellHighlights: tape.tapeSetters.setTapeCellHighlights,
  setTapeBarState: tape.tapeSetters.setTapeBarState,
  setGlowTravelerState: tape.tapeSetters.setGlowTravelerState,
  setVisualTrailOverride: tape.tapeSetters.setVisualTrailOverride,
  setVisualOutputOverride: tape.tapeSetters.setVisualOutputOverride,
  valueTravelRefs: tape.valueTravelRefs,
  gateOutcomes: tape.gateOutcomesRef,
  boardGridRef: tutorial.boardGridRef, // from tutorial hook (measurement ref)
  inputTapeCellsRef: tape.inputTapeCellsRef,
  dataTrailCellsRef: tape.dataTrailCellsRef,
  outputTapeCellsRef: tape.outputTapeCellsRef,

  inputTape: level.inputTape,
};
```

`handleEngage` remains in GameplayScreen but shrinks from ~180 lines of ctx
construction + orchestration to mostly orchestration.

**Risk assessment:** High.
- The `CELL_SIZE` value changes when canvas layout changes. If `useBeamEngine`
  receives `CELL_SIZE` as a prop, the hook doesn't re-create on CELL_SIZE change
  (the hook's own refs are stable). However, `getPieceCenter` in `handleEngage`
  captures CELL_SIZE at call time from the outer scope — this is correct, since
  CELL_SIZE should not change during an execution run.
- `cancelAllFrames` is called in three places: unmount cleanup, blur cleanup
  (useFocusEffect), and the CONTINUE button inline handler. The unmount and blur
  effects must call `beam.cancelAllFrames()`. The inline handler can do the same.
  Both effects currently duplicate the cleanup logic — with extraction, they both
  call one function.
- The `loopingRef.current = false` assignment on level change (the "belt-and-suspenders"
  effect) becomes `beam.loopingRef.current = false` — same pattern.
- `terminalSuccessCountRef.current` is read in the HUDChrome `pulseCounterText` prop
  computation. After extraction this becomes `beam.terminalSuccessCountRef.current` —
  an inline ref read, same as before.

**Test surface:**
- Charge phase renders correct ring expansion.
- Lock phase renders correct lock rings.
- Void burst renders and clears.
- Splitter branch: two RAF slots cancel independently.
- resetBeam() called from handleReset leaves all state at INITIAL.
- cancelAllFrames() on unmount stops all pending frames.

---

## Implementation Order and Shipping Gates

Each phase is independently shippable. Phases do not need to land together.

```
Phase 1 (modals)
  → Pass quality gates
  → Manual test: Pause, Void, Wrong Output, Results, Out of Lives, Economy Intro
  → Ship

Phase 2 (tutorial + timer)
  → Pass quality gates
  → Manual test: A1-1 through A1-8 tutorial steps, hint queue, timer accuracy
  → Ship

Phase 3 (tape)
  → Pass quality gates
  → Manual test: glow traveler on Scanner/Transmitter, gate outcomes on OUT tape,
    tape highlights during beam, visual overrides during beam
  → Ship

Phase 4 (beam engine)
  → Pass quality gates
  → Manual test: full run on A1-1, A1-4 (Splitter), A1-7 (multi-pulse), A1-8
    (multi-pulse + Transmitter), plus void and wrong-output paths
  → Ship
```

---

## Risk Register

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Stale `triggerHints` captured in `handleEngage` async closure | Low | Medium | `triggerHints` is `useCallback` with stable deps; setter refs are stable |
| `tutorialIsActiveRef` not updating before timer tick | Low | Low | Effect runs synchronously after render; timer fires at 1s intervals |
| Tape refs unmounted before `measureInWindow` resolves | Low | Medium | Same issue existed before extraction; existing retry logic handles it |
| Phase 4: `CELL_SIZE` snapshot diverges during execution | Very Low | Low | CELL_SIZE cannot change while beam is executing (layout is locked) |
| Phase 4: `animFrameRef` identity lost on re-render | None | — | Refs are never re-allocated on re-render in React |
| Hook ordering constraint violated | Low | High | All hooks must be called unconditionally; each extraction hook uses only valid patterns |

---

## What This Does NOT Change

- `EngagementContext` type definition — shape is unchanged, only the construction site moves.
- `src/game/engagement/` module — no changes to phase functions.
- `TutorialHUDOverlay.tsx` — props interface unchanged; GameplayScreen still passes same values.
- `TapeBarShell`, `BeamOverlay`, `BoardGrid`, `WireOverlay`, `HUDChrome` — all unchanged.
- The three-layer architecture (Signal Path / Data Trail / Tape System).
- Any behavior visible to the player.

---

## Coverage Requirements

Each extracted hook ships with unit tests in `__tests__/unit/hooks/`:
- `useGameplayFailure.test.ts`
- `useGameplayModals.test.ts`
- `useGameplayTutorial.test.ts`
- `useGameplayTimer.test.ts`
- `useGameplayTape.test.ts`
- `useBeamEngine.test.ts`

Each test verifies: initial state, state transitions from public API, cleanup functions.
Integration tests for modal rendering move to `__tests__/integration/GameplayModals.test.tsx`.

Coverage targets (from jest.config.js) must be maintained: 80% statements, 80%
functions, 70% branches, 80% lines.
