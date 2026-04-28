import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LevelDefinition } from '../game/types';
import type { TutorialTrayRefs } from '../components/gameplay/PieceTray';

type Hint = { key: string; text: string };

export type TutorialTargetRefs = Record<string, React.RefObject<View | null>>;

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
  tutorialTrayRefs: TutorialTrayRefs;
  tutorialSpotlightCells: { col: number; row: number; color: string }[];
  sourceNodeRef: React.RefObject<View | null>;
  outputNodeRef: React.RefObject<View | null>;
  boardGridRef: React.RefObject<View | null>;
  engageButtonRef: React.RefObject<View | null>;
  boardScannerRef: React.RefObject<View | null>;
  inputTapeRowRef: React.RefObject<View | null>;
  outputTapeRowRef: React.RefObject<View | null>;
  dataTrailRowRef: React.RefObject<View | null>;
  trayConveyorRef: React.RefObject<View | null>;
  trayGearRef: React.RefObject<View | null>;
  trayConfigNodeRef: React.RefObject<View | null>;
  traySplitterRef: React.RefObject<View | null>;
  trayScannerRef: React.RefObject<View | null>;
  trayTransmitterRef: React.RefObject<View | null>;
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

  const sourceNodeRef = useRef<View>(null);
  const outputNodeRef = useRef<View>(null);
  const boardGridRef = useRef<View>(null);
  const engageButtonRef = useRef<View>(null);
  const boardScannerRef = useRef<View>(null);
  const inputTapeRowRef = useRef<View>(null);
  const outputTapeRowRef = useRef<View>(null);
  const dataTrailRowRef = useRef<View>(null);
  const trayConveyorRef = useRef<View>(null);
  const trayGearRef = useRef<View>(null);
  const trayConfigNodeRef = useRef<View>(null);
  const traySplitterRef = useRef<View>(null);
  const trayScannerRef = useRef<View>(null);
  const trayTransmitterRef = useRef<View>(null);

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
      trayConveyor: trayConveyorRef,
      trayGear: trayGearRef,
      trayConfigNode: trayConfigNodeRef,
      traySplitter: traySplitterRef,
      trayScanner: trayScannerRef,
      trayTransmitter: trayTransmitterRef,
      boardScanner: boardScannerRef,
      inputTapeRow: inputTapeRowRef,
      outputTapeRow: outputTapeRowRef,
      dataTrailRow: dataTrailRowRef,
    }),
    [],
  );

  // Memoized PieceTray refs object (Prompt 99B). Stable identity so
  // PieceTray's React.memo barrier holds across parent re-renders.
  const tutorialTrayRefs = useMemo(
    () => ({
      trayConveyor: trayConveyorRef,
      trayGear: trayGearRef,
      trayConfigNode: trayConfigNodeRef,
      traySplitter: traySplitterRef,
      trayScanner: trayScannerRef,
      trayTransmitter: trayTransmitterRef,
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

  // HUD tutorial overlay hydration
  useEffect(() => {
    if (!level || !isAxiomLevel || isLevelPreviouslyCompleted) return;
    if (!level.tutorialSteps || level.tutorialSteps.length === 0) return;
    (async () => {
      const done = await AsyncStorage.getItem(`axiom_tutorial_complete_${level.id}`);
      const skipped = await AsyncStorage.getItem(`axiom_tutorial_skipped_${level.id}`);
      if (done) setTutorialComplete(true);
      if (skipped) setTutorialSkipped(true);
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
    tutorialTrayRefs,
    tutorialSpotlightCells,
    sourceNodeRef,
    outputNodeRef,
    boardGridRef,
    engageButtonRef,
    boardScannerRef,
    inputTapeRowRef,
    outputTapeRowRef,
    dataTrailRowRef,
    trayConveyorRef,
    trayGearRef,
    trayConfigNodeRef,
    traySplitterRef,
    trayScannerRef,
    trayTransmitterRef,
  };
}
