import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LevelDefinition, PieceType } from '../game/types';

type Hint = { key: string; text: string };

export type TutorialTargetRefs = Record<string, React.RefObject<View | null>>;

// Placement trigger: incremented every time onPiecePlaced fires so
// TutorialHUDOverlay can react to the event even when pieceType repeats.
export type PlacedTrigger = { type: PieceType; seq: number };

// Tap trigger: incremented every time onPieceTapped fires.
export type TappedTrigger = { type: PieceType; seq: number };

export interface UseGameplayTutorialResult {
  tutorialComplete: boolean;
  setTutorialComplete: React.Dispatch<React.SetStateAction<boolean>>;
  tutorialSkipped: boolean;
  setTutorialSkipped: React.Dispatch<React.SetStateAction<boolean>>;
  tutorialIsActive: boolean;
  tutorialIsActiveRef: React.MutableRefObject<boolean>;
  currentHint: Hint | null;
  triggerHints: (trigger: string) => Promise<void>;
  dismissHint: () => void;
  tutorialTargetRefs: TutorialTargetRefs;
  tutorialSpotlightCells: { col: number; row: number; color: string }[];
  sourceNodeRef: React.RefObject<View | null>;
  outputNodeRef: React.RefObject<View | null>;
  boardGridRef: React.RefObject<View | null>;
  engageButtonRef: React.RefObject<View | null>;
  boardScannerRef: React.RefObject<View | null>;
  inputTapeRowRef: React.RefObject<View | null>;
  outputTapeRowRef: React.RefObject<View | null>;
  dataTrailRowRef: React.RefObject<View | null>;
  // Arc Wheel tutorial refs
  arcWheelMainRef: React.RefObject<View | null>;
  placedPieceRef: React.RefObject<View | null>;
  // Placement / tap state tracked for TutorialHUDOverlay
  tutorialPlacedGridPos: { gridX: number; gridY: number } | null;
  lastPlacedTrigger: PlacedTrigger | null;
  lastTappedTrigger: TappedTrigger | null;
  // Callbacks called by GameplayScreen on board events
  onPiecePlaced: (pieceType: PieceType, gridX: number, gridY: number) => void;
  onPieceTapped: (pieceType: PieceType) => void;
}

export function useGameplayTutorial(
  level: LevelDefinition | null,
  isAxiomLevel: boolean,
  isLevelPreviouslyCompleted: boolean,
): UseGameplayTutorialResult {
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [tutorialSkipped, setTutorialSkipped] = useState(false);
  const [currentHint, setCurrentHint] = useState<Hint | null>(null);
  const [hintQueue, setHintQueue] = useState<Hint[]>([]);
  const hintTriggered = useRef<Set<string>>(new Set());

  // Board / HUD refs
  const sourceNodeRef = useRef<View>(null);
  const outputNodeRef = useRef<View>(null);
  const boardGridRef = useRef<View>(null);
  const engageButtonRef = useRef<View>(null);
  const boardScannerRef = useRef<View>(null);
  const inputTapeRowRef = useRef<View>(null);
  const outputTapeRowRef = useRef<View>(null);
  const dataTrailRowRef = useRef<View>(null);

  // Arc Wheel tutorial refs
  const arcWheelMainRef = useRef<View>(null);
  // placedPieceRef is attached to a zero-size invisible View rendered at
  // the placed piece's board position so TutorialHUDOverlay can measure it.
  const placedPieceRef = useRef<View>(null);

  // Placed piece grid position — GameplayScreen renders a marker View here
  const [tutorialPlacedGridPos, setTutorialPlacedGridPos] = useState<{ gridX: number; gridY: number } | null>(null);

  // Trigger counters for TutorialHUDOverlay effects
  const placedSeqRef = useRef(0);
  const tappedSeqRef = useRef(0);
  const [lastPlacedTrigger, setLastPlacedTrigger] = useState<PlacedTrigger | null>(null);
  const [lastTappedTrigger, setLastTappedTrigger] = useState<TappedTrigger | null>(null);

  // Memoized targetRefs object passed to TutorialHUDOverlay. Without
  // this, the inline object literal in JSX produced a fresh identity
  // on every parent re-render, which invalidated the overlay's
  // measureTarget useCallback (deps: [targetRefs]) and cascaded
  // through every downstream callback / useEffect every render.
  // Across A1-1 → A1-8 that thrash compounded into the freeze
  // reported on TestFlight (Prompt 90). Refs themselves are stable,
  // so the deps array is empty.
  const tutorialTargetRefs = useMemo(
    () => ({
      sourceNode: sourceNodeRef,
      outputNode: outputNodeRef,
      boardGrid: boardGridRef,
      engageButton: engageButtonRef,
      boardScanner: boardScannerRef,
      inputTapeRow: inputTapeRowRef,
      outputTapeRow: outputTapeRowRef,
      dataTrailRow: dataTrailRowRef,
      arcWheelMain: arcWheelMainRef,
      placedPiece: placedPieceRef,
    }),
    [],
  );

  // Memoized A1-1 spotlight cells fed to TutorialHUDOverlay. The
  // inline `.filter(...).map(...)` expression at the JSX site
  // allocated a new array every parent render even when the overlay
  // was unmounted; combined with the new targetRefs identity, it
  // churned the overlay's effect graph on every run-loop tick.
  const tutorialSpotlightCells = useMemo(
    () =>
      level?.prePlacedPieces
        .filter(p => p.type === 'source' || p.type === 'terminal')
        .map(p => ({
          col: p.gridX,
          row: p.gridY,
          color: p.type === 'source' ? '#8B5CF6' : '#00C48C',
        })) ?? [],
    [level?.prePlacedPieces],
  );

  const tutorialIsActive =
    !tutorialComplete &&
    !tutorialSkipped &&
    !isLevelPreviouslyCompleted &&
    isAxiomLevel &&
    (level?.tutorialSteps?.length ?? 0) > 0;

  const tutorialIsActiveRef = useRef(tutorialIsActive);
  useEffect(() => {
    tutorialIsActiveRef.current = tutorialIsActive;
  }, [tutorialIsActive]);

  // Reset hint dedupe Set on level change. Pre-fix the Set accumulated
  // trigger keys across levels and was never cleared, leaking state
  // between Axiom levels (lag audit, Prompt 108).
  useEffect(() => {
    hintTriggered.current = new Set();
  }, [level?.id]);

  // Reset placed piece position on level change so stale markers
  // from the previous level don't show on the new board.
  useEffect(() => {
    setTutorialPlacedGridPos(null);
    setLastPlacedTrigger(null);
    setLastTappedTrigger(null);
  }, [level?.id]);

  // HUD tutorial overlay hydration
  useEffect(() => {
    if (!level || !isAxiomLevel || isLevelPreviouslyCompleted) return;
    if (!level.tutorialSteps || level.tutorialSteps.length === 0) return;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(`axiom_tutorial_complete_${level.id}`);
        const skipped = await AsyncStorage.getItem(`axiom_tutorial_skipped_${level.id}`);
        if (done) setTutorialComplete(true);
        if (skipped) setTutorialSkipped(true);
      } catch { /* storage unavailable — keep defaults */ }
    })();
  }, [level?.id, isAxiomLevel, isLevelPreviouslyCompleted]);

  // onMount hints
  useEffect(() => {
    if (!level || !isAxiomLevel || isLevelPreviouslyCompleted || !level.tutorialHints) return;
    if ((level.tutorialSteps?.length ?? 0) > 0) return;
    (async () => {
      const onMountHints: Hint[] = [];
      for (const h of level.tutorialHints!) {
        if (h.trigger !== 'onMount') continue;
        const seen = await AsyncStorage.getItem(`axiom_hint_seen_${h.key}`);
        if (!seen) onMountHints.push({ key: h.key, text: h.text });
      }
      if (onMountHints.length > 0) {
        setCurrentHint(onMountHints[0]);
        setHintQueue(onMountHints.slice(1));
      }
    })();
  }, [level?.id]);

  const triggerHints = useCallback(
    async (trigger: string) => {
      if (!level || !isAxiomLevel || isLevelPreviouslyCompleted || !level.tutorialHints) return;
      if (hintTriggered.current.has(trigger)) return;
      hintTriggered.current.add(trigger);
      const hints: Hint[] = [];
      for (const h of level.tutorialHints!) {
        if (h.trigger !== trigger) continue;
        const seen = await AsyncStorage.getItem(`axiom_hint_seen_${h.key}`);
        if (!seen) hints.push({ key: h.key, text: h.text });
      }
      if (hints.length > 0 && !currentHint) {
        setCurrentHint(hints[0]);
        setHintQueue(prev => [...prev, ...hints.slice(1)]);
      } else {
        setHintQueue(prev => [...prev, ...hints]);
      }
    },
    [level, isAxiomLevel, isLevelPreviouslyCompleted, currentHint],
  );

  const dismissHint = useCallback(() => {
    setCurrentHint(null);
    setTimeout(() => {
      setHintQueue(prev => {
        if (prev.length === 0) return prev;
        setCurrentHint(prev[0]);
        return prev.slice(1);
      });
    }, 1500);
  }, []);

  // Called by GameplayScreen when a piece is placed on the board.
  // Stores the grid position for the placed-piece marker View and
  // fires a trigger signal that TutorialHUDOverlay watches.
  const onPiecePlaced = useCallback((pieceType: PieceType, gridX: number, gridY: number) => {
    setTutorialPlacedGridPos({ gridX, gridY });
    placedSeqRef.current += 1;
    setLastPlacedTrigger({ type: pieceType, seq: placedSeqRef.current });
  }, []);

  // Called by GameplayScreen when a placed piece is tapped on the board.
  // Fires a trigger signal that TutorialHUDOverlay watches for awaitPieceTap.
  const onPieceTapped = useCallback((pieceType: PieceType) => {
    tappedSeqRef.current += 1;
    setLastTappedTrigger({ type: pieceType, seq: tappedSeqRef.current });
  }, []);

  return {
    tutorialComplete,
    setTutorialComplete,
    tutorialSkipped,
    setTutorialSkipped,
    tutorialIsActive,
    tutorialIsActiveRef,
    currentHint,
    triggerHints,
    dismissHint,
    tutorialTargetRefs,
    tutorialSpotlightCells,
    sourceNodeRef,
    outputNodeRef,
    boardGridRef,
    engageButtonRef,
    boardScannerRef,
    inputTapeRowRef,
    outputTapeRowRef,
    dataTrailRowRef,
    arcWheelMainRef,
    placedPieceRef,
    tutorialPlacedGridPos,
    lastPlacedTrigger,
    lastTappedTrigger,
    onPiecePlaced,
    onPieceTapped,
  };
}
