import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Rect, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import StarField from '../components/StarField';
import { Button } from '../components/Button';
import HUDChrome from '../components/gameplay/HUDChrome';
import TapeBarShell from '../components/gameplay/TapeBarShell';
import BoardGrid from '../components/gameplay/BoardGrid';
import WireOverlay from '../components/gameplay/WireOverlay';
import BeamOverlay from '../components/gameplay/BeamOverlay';
import PieceTray from '../components/gameplay/PieceTray';
import GameplayModals from '../components/gameplay/GameplayModals';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import { useLivesStore } from '../store/livesStore';
import { useProgressionStore } from '../store/progressionStore';
import { usePlayerStore } from '../store/playerStore';
import { useEconomyStore } from '../store/economyStore';
import { TutorialHint } from '../components/TutorialHint';
import TutorialHUDOverlay from '../components/TutorialHUDOverlay';
import GameplayErrorBoundary from '../components/GameplayErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PieceType, PlacedPiece, ExecutionStep, PortSide } from '../game/types';
import { getPieceCost } from '../game/types';
import { getOutputPorts, getInputPorts } from '../game/engine';
import { useGameplayFailure } from '../hooks/useGameplayFailure';
import { useGameplayModals } from '../hooks/useGameplayModals';
import { useGameplayTimer } from '../hooks/useGameplayTimer';
import { useGameplayTutorial } from '../hooks/useGameplayTutorial';
import { useGameplayTape } from '../hooks/useGameplayTape';
import { useBeamEngine } from '../hooks/useBeamEngine';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Grid constants ───────────────────────────────────────────────────────────

const DOT_R = 1.5;
const PIECE_RADIUS = 10;
const CANVAS_PAD = 20;  // padding inside canvas area — ensures edge pieces are fully visible
const MIN_CELL = 48;
const MAX_CELL = 88;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Gameplay'>;
};

// PieceIcon imported from shared component

// ─── Piece label ──────────────────────────────────────────────────────────────

const PIECE_LABELS: Record<PieceType, string> = {
  source: 'IN',
  terminal: 'OUT',
  conveyor: 'CONV',
  gear: 'GEAR',
  splitter: 'SPLIT',
  configNode: 'CFG',
  scanner: 'SCAN',
  transmitter: 'XMIT',
  merger: 'MERGE',
  bridge: 'BRIDGE',
  inverter: 'INV',
  counter: 'CNT',
  latch: 'LATCH',
  obstacle: '',
};

function getPieceColor(type: PieceType): string {
  switch (type) {
    case 'configNode':
    case 'scanner':
    case 'transmitter':
    case 'inverter':
    case 'counter':
    case 'latch':
      return '#8B5CF6';
    default:
      return Colors.blue;
  }
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

import {
  hexToRgba,
  type TapeCellContainerMeasure,
} from '../game/bubbleMath';
import {
  getBeamColor,
  flashPiece as engageFlashPiece,
  runChargePhase,
  runPulse as engageRunPulse,
  runLockPhase,
  runWrongOutputRings,
  handleSuccess,
  handleWrongOutput,
  handleVoidFailure,
  PIECE_ANIM_INITIAL,
  type Pt,
  type EngagementContext,
} from '../game/engagement';

// ─── Branch partitioning for Splitter fork ────────────────────────────────────

/**
 * Post-process a pulse's execution steps to annotate branchId on steps
 * that occur after a Splitter fork. Steps before the Splitter (and the
 * Splitter step itself) get no branchId. Each downstream branch gets "A"
 * or "B" based on the Splitter's connectedMagnetSides.
 */
function partitionBranches(
  pulseSteps: ExecutionStep[],
  pieces: PlacedPiece[],
): ExecutionStep[] {
  const forkIdx = pulseSteps.findIndex(s => s.type === 'splitter');
  if (forkIdx === -1) return pulseSteps;

  const splitterStep = pulseSteps[forkIdx];
  const splitter = pieces.find(p => p.id === splitterStep.pieceId);
  if (!splitter) return pulseSteps;
  const mags = splitter.connectedMagnetSides;
  if (!mags || mags.length < 2) return pulseSteps;

  // Map from magnet side to the grid cell it points to
  const sideOffset: Record<string, { dx: number; dy: number }> = {
    top: { dx: 0, dy: -1 }, bottom: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 },
  };

  // Find the immediate neighbor piece on each magnet side
  const branchRoots: [string | null, string | null] = [null, null];
  for (let mi = 0; mi < 2; mi++) {
    const off = sideOffset[mags[mi]];
    if (!off) continue;
    const nx = splitter.gridX + off.dx;
    const ny = splitter.gridY + off.dy;
    const neighbor = pieces.find(p => p.gridX === nx && p.gridY === ny);
    if (neighbor) branchRoots[mi] = neighbor.id;
  }

  // BFS from each root to collect all piece IDs in that branch
  const branchSets: [Set<string>, Set<string>] = [new Set(), new Set()];
  for (let bi = 0; bi < 2; bi++) {
    if (!branchRoots[bi]) continue;
    const q = [branchRoots[bi]!];
    const visited = new Set<string>([splitter.id]);
    while (q.length > 0) {
      const id = q.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      branchSets[bi].add(id);
      // Find adjacent pieces to continue tracing the branch
      const pc = pieces.find(p => p.id === id);
      if (!pc) continue;
      for (const dir of Object.values(sideOffset)) {
        const ax = pc.gridX + dir.dx;
        const ay = pc.gridY + dir.dy;
        const adj = pieces.find(p => p.gridX === ax && p.gridY === ay);
        if (adj && !visited.has(adj.id)) q.push(adj.id);
      }
    }
  }

  // Annotate steps
  return pulseSteps.map((s, i) => {
    if (i <= forkIdx) return s;
    if (branchSets[0].has(s.pieceId)) return { ...s, branchId: 'A' };
    if (branchSets[1].has(s.pieceId)) return { ...s, branchId: 'B' };
    return s;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameplayScreen({ navigation }: Props) {
  const {
    currentLevel,
    machineState,
    selectedPieceFromTray,
    selectedPlacedPiece,
    executionSteps,
    isExecuting,
    stars,
    configuration,
    debugMode,
    debugStepIndex,
    setLevel,
    placePiece,
    movePiece,
    deletePiece,
    rotatePiece,
    updatePiece,
    selectFromTray,
    selectPlaced,
    engage,
    reset,
    toggleConfiguration,
    setDebugMode,
    debugNext,
    debugPrev,
  } = useGameStore();

  const { lives, loseLife, refillLives, credits: livesCredits, addCredits } = useLivesStore();
  const { completeLevel, isLevelCompleted: isLevelDone } = useProgressionStore();
  const discipline = usePlayerStore(s => s.discipline);
  const { credits, setLevelBudget, spendCredits, earnCredits, resetLevelBudget, levelSpent } = useEconomyStore();

  // Level-derived values needed by extracted hooks. Computed before
  // hook calls so hook order stays stable across renders.
  const level = currentLevel;
  const isAxiomLevel = level?.sector === 'axiom';
  const isDailyChallenge = level?.sector === 'daily';
  const isLevelPreviouslyCompleted = level ? isLevelDone(level.id) : false;

  // Phase 1 extraction — failure state (blownCells, failCount, helpers).
  const {
    blownCells, setBlownCells,
    failCount, setFailCount,
    blownCellsRef,
    findBlownPiece,
    getBlownCellCOGSLine,
  } = useGameplayFailure(level, isAxiomLevel);

  // Phase 1 extraction — modal flags + scoring display state.
  const modals = useGameplayModals(level);
  const {
    showPauseModal, setShowPauseModal,
    showAbandonConfirm, setShowAbandonConfirm,
    showVoid, setShowVoid,
    showResults, setShowResults,
    showCompletionCard, setShowCompletionCard,
    showWrongOutput, setShowWrongOutput,
    wrongOutputData, setWrongOutputData,
    showInsufficientPulses, setShowInsufficientPulses,
    pulseResultData, setPulseResultData,
    showOutOfLives, setShowOutOfLives,
    showEconomyIntro,
    showSystemRestored, setShowSystemRestored,
    showCompletionScene, setShowCompletionScene,
    completionText, setCompletionText,
    showDisciplineCard, setShowDisciplineCard,
    showTeachCard, setShowTeachCard,
    scoreResult, setScoreResult,
    cogsScoreComment, setCogsScoreComment,
    firstTimeBonus, setFirstTimeBonus,
    elaborationMult, setElaborationMult,
  } = modals;

  // Phase 2 extraction — tutorial state, hint queue, all measurement refs.
  const tutorial = useGameplayTutorial(level, isAxiomLevel, isLevelPreviouslyCompleted);
  const {
    tutorialComplete, setTutorialComplete,
    tutorialSkipped, setTutorialSkipped,
    tutorialIsActive, tutorialIsActiveRef,
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
  } = tutorial;

  // Phase 2 extraction — elapsed-seconds timer with pause/lock/reset API.
  const timer = useGameplayTimer(level?.id, tutorialIsActiveRef, showPauseModal);
  const { elapsedSeconds, lockTimer, resetTimer } = timer;

  // Phase 3 extraction — tape visual state (highlights, overrides, glow traveler, refs).
  const tape = useGameplayTape(level);

  // Phase 4 extraction — beam animation state, Animated.Values, and mutable refs.
  const beam = useBeamEngine(machineState.pieces);
  const {
    beamState, setBeamState,
    pieceAnimState, setPieceAnimState,
    chargeState, setChargeState,
    lockRingCenter, setLockRingCenter,
    voidBurstCenter, setVoidBurstCenter,
    currentPulseIndex, setCurrentPulseIndex,
    flashColor, setFlashColor,
    pieceAnimProps,
    beamOpacity,
    chargeProgressAnim,
    lockRingProgressAnim,
    voidPulseRingProgressAnim,
  } = beam;

  const [creditError, setCreditError] = useState(false);

  // Screen is immediately visible — slide_from_bottom handles entry transition
  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Daily challenge one-attempt enforcement ──
  useEffect(() => {
    if (!isDailyChallenge || !level) return;
    const dateStr = level.id.replace('daily_', '');
    AsyncStorage.setItem(`axiom_daily_${dateStr}_attempted`, '1');
  }, [level?.id]);

  // ── Level budget setup (skip on Axiom tutorial levels) ──
  useEffect(() => {
    if (!level) return;
    if (level.sector === 'axiom') return; // free pieces on tutorial
    setLevelBudget(level.budget ?? 0);
    return () => resetLevelBudget();
  }, [level?.id]);

  // ── Cleanup beam animation on unmount ──
  useEffect(() => {
    return () => {
      beam.cancelAllFrames();
      tape.resetTape();
    };
  }, []);

  // ── Cleanup beam animation on blur (Prompt 106, Fix 2) ──
  // Native-stack screens that get a new screen pushed on top STAY
  // mounted (the previous screen renders behind the new one). Without
  // this, an HubScreen → Gameplay → navigate('LevelSelect') flow
  // (HubScreen still uses navigate, not replace, by design) leaves
  // the prior Gameplay instance mounted with its RAF loops and
  // tape-interaction setTimeouts still pumping. Repeating that loop a
  // few times stacks several Gameplay instances and produces the
  // mid-sector lag Tucker reported. Running the same cleanup on blur
  // as on unmount ensures background instances stop burning frames.
  useFocusEffect(
    useCallback(() => {
      return () => {
        beam.cancelAllFrames();
        tape.resetTape();
      };
    }, []),
  );

  // ── Reset replay-loop flag on level change. Belt-and-suspenders:
  // launch screens use navigation.replace to force a fresh mount, but
  // if any code path ever leaves the Gameplay component mounted across
  // a level transition, this guarantees the post-completion replay
  // loop flag does not leak from one level into the next.
  useEffect(() => {
    beam.loopingRef.current = false;
  }, [level?.id]);

  // ── Dynamic board sizing (from available canvas space) ──
  const [canvasLayout, setCanvasLayout] = useState({ w: screenWidth - 32, h: 300 });
  const { pieces, wires } = machineState;
  // Memoize player-placed pieces so the array identity is stable
  // across beam-tick re-renders (Prompt 95, Fix 8.2). Without this,
  // every setBeamState produced a fresh array, invalidating any
  // downstream consumer that depends on it for memo equality.
  const playerPieces = useMemo(
    () => pieces.filter(p => !p.isPrePlaced),
    [pieces],
  );
  const hasPlacedPieces = playerPieces.length > 0;

  // O(1) piece-id lookup for the wire render block (Prompt 94, Fix 4).
  // Pre-fix that block called `pieces.find(...)` twice per wire on
  // every render — O(n*w). On a complex level (~20 pieces, ~8
  // wires) that is ~144 linear scans per frame. Building the Map
  // once per render replaces it with one O(n) setup + O(1) lookups.
  const pieceById = useMemo(
    () => new Map(pieces.map(p => [p.id, p])),
    [pieces],
  );

  const numColumns = level?.gridWidth ?? 8;
  const numRows = level?.gridHeight ?? 7;
  const availW = canvasLayout.w - CANVAS_PAD * 2;
  const availH = canvasLayout.h - CANVAS_PAD * 2;
  const CELL_SIZE = availW > 0 && availH > 0
    ? Math.min(MAX_CELL, Math.max(MIN_CELL, Math.floor(Math.min(availW / numColumns, availH / numRows))))
    : 52;
  const gridW = numColumns * CELL_SIZE;
  const gridH = numRows * CELL_SIZE;

  // Count remaining available pieces from tray
  const availablePiecesList = level?.availablePieces ?? [];
  const availableCounts = useMemo(() => {
    const counts: Partial<Record<PieceType, number>> = {};
    for (const pt of availablePiecesList) {
      counts[pt] = (counts[pt] || 0) + 1;
    }
    for (const p of playerPieces) {
      if (counts[p.type] && counts[p.type]! > 0) {
        counts[p.type] = counts[p.type]! - 1;
      }
    }
    return counts;
  }, [availablePiecesList, playerPieces]);

  // Unique piece types for tray display
  const trayPieceTypes = useMemo(() => {
    const seen = new Set<PieceType>();
    return availablePiecesList.filter(pt => {
      if (seen.has(pt)) return false;
      seen.add(pt);
      return true;
    });
  }, [availablePiecesList]);

  // Per-piece cost lookup for the tray (axiom levels are free).
  const trayCosts = useMemo(() => {
    const map: Partial<Record<PieceType, number>> = {};
    for (const pt of trayPieceTypes) {
      map[pt] = isAxiomLevel ? 0 : getPieceCost(pt, discipline);
    }
    return map;
  }, [trayPieceTypes, isAxiomLevel, discipline]);

  // Per-piece affordability lookup. Reads from useEconomyStore
  // imperatively to match the prior inline behavior.
  const trayAffordable = useMemo(() => {
    const map: Partial<Record<PieceType, boolean>> = {};
    const econ = useEconomyStore.getState();
    const purse = econ.levelBudget - econ.levelSpent + econ.credits;
    for (const pt of trayPieceTypes) {
      const cost = trayCosts[pt] ?? 0;
      map[pt] = cost === 0 || purse >= cost;
    }
    return map;
  }, [trayPieceTypes, trayCosts, credits, levelSpent]);

  // ── Auto-orientation: face away from Source if adjacent ──
  const getAutoRotation = useCallback((gridX: number, gridY: number): number => {
    const source = pieces.find(p => p.type === 'source');
    if (!source) return 0;
    const dx = gridX - source.gridX;
    const dy = gridY - source.gridY;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return 0;
    if (dx === 1) return 0;    // right of Source → face right
    if (dy === 1) return 90;   // below Source → face down
    if (dx === -1) return 180; // left of Source → face left
    if (dy === -1) return 270; // above Source → face up
    return 0;
  }, [pieces]);

  // ── Grid tap handler ──
  const handleCanvasTap = useCallback((gridX: number, gridY: number) => {
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses) return;

    if (selectedPieceFromTray) {
      const count = availableCounts[selectedPieceFromTray] || 0;
      if (count > 0) {
        if (blownCells.has(`${gridX},${gridY}`)) return;
        const cost = isAxiomLevel ? 0 : getPieceCost(selectedPieceFromTray, discipline);
        if (cost > 0) {
          const ok = spendCredits(selectedPieceFromTray, discipline);
          if (!ok) {
            setCreditError(true);
            setTimeout(() => setCreditError(false), 1500);
            return;
          }
        }
        const rotation = getAutoRotation(gridX, gridY);
        placePiece(selectedPieceFromTray, gridX, gridY, rotation);
        // Bug 7 fix: only fire the "tap ENGAGE MACHINE" hint once the
        // player has placed enough pieces to plausibly have a complete
        // path. Gate on optimalPieces as the minimum threshold.
        const placedCountAfter = playerPieces.length + 1;
        if (!hasPlacedPieces && placedCountAfter >= (level?.optimalPieces ?? 99)) {
          triggerHints('onFirstPiecePlaced');
        }
      }
    } else if (selectedPlacedPiece) {
      if (blownCells.has(`${gridX},${gridY}`)) return;
      movePiece(selectedPlacedPiece, gridX, gridY);
      selectPlaced(null);
    }
  }, [selectedPieceFromTray, selectedPlacedPiece, isExecuting, showResults, showVoid, availableCounts, placePiece, discipline, spendCredits, hasPlacedPieces, triggerHints, selectPlaced, getAutoRotation]);

  // ── Piece tap handler ──
  const handlePieceTap = useCallback((pieceId: string) => {
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses) return;
    const piece = machineState.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    if (piece.isPrePlaced) return;

    // Type-specific tap actions
    if (piece.type === 'conveyor') {
      rotatePiece(piece.id);
    } else if (piece.type === 'configNode') {
      const current = piece.configValue ?? 1;
      const next = current === 1 ? 0 : 1;
      updatePiece(piece.id, { configValue: next });
    } else if (piece.type === 'latch') {
      const nextMode = piece.latchMode === 'write' ? 'read' : 'write';
      updatePiece(piece.id, { latchMode: nextMode });
    }
    // All other piece types: no tap action
  }, [isExecuting, showResults, showVoid, showWrongOutput, showInsufficientPulses, machineState.pieces, rotatePiece, updatePiece]);

  // ── Long press returns piece to tray (no ghost/held state) ──
  const handlePieceLongPress = useCallback((pieceId: string) => {
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses) return;
    const piece = machineState.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    if (piece.isPrePlaced) return;
    deletePiece(piece.id);
  }, [isExecuting, showResults, showVoid, showWrongOutput, showInsufficientPulses, machineState.pieces, deletePiece]);

  // ── Pause modal opener (stable ref so HUDChrome memo holds) ──
  const handlePauseOpen = useCallback(() => {
    setShowPauseModal(true);
  }, []);

  // ── Helper: get piece center in canvas coords ──
  const getPieceCenter = useCallback((pieceId: string) => {
    const p = machineState.pieces.find(pc => pc.id === pieceId);
    if (!p) return null;
    return {
      x: p.gridX * CELL_SIZE + CELL_SIZE / 2,
      y: p.gridY * CELL_SIZE + CELL_SIZE / 2,
    };
  }, [machineState.pieces]);

  // ── Engage handler ──
  const handleEngage = useCallback(async () => {
    if (isExecuting || !level) return;
    // Increment run ID before any async work so stale callbacks from the
    // previous run can detect the mismatch and no-op. (A1-7 crash fix.)
    beam.runIdRef.current += 1;
    const runId = beam.runIdRef.current;
    triggerHints('onEngage');
    // Reset beam dim back to fully bright at the start of every run so
    // a previous level's mid-pause dim state never carries over
    // (Prompt 91, Fix 5).
    beamOpacity.setValue(1);
    // Cancel any in-flight 8s safety timers from the previous run
    // before starting fresh (Prompt 104, Fix 4A).
    beam.safetyTimersRef.current.forEach(t => clearTimeout(t));
    beam.safetyTimersRef.current = [];
    // Stop the elapsed timer at the moment ENGAGE is pressed (lock state).
    const lockedElapsed = lockTimer();
    const engageStartTime = Date.now();
    const steps = engage();

    // Determine pulse boundaries by counting source-typed steps. Each
    // source step begins a new traversal.
    const pulseStarts: number[] = [];
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].type === 'source') pulseStarts.push(i);
    }
    if (pulseStarts.length === 0) pulseStarts.push(0);
    const pulses: ExecutionStep[][] = [];
    for (let pi = 0; pi < pulseStarts.length; pi++) {
      const start = pulseStarts[pi];
      const end = pi + 1 < pulseStarts.length ? pulseStarts[pi + 1] : steps.length;
      pulses.push(partitionBranches(steps.slice(start, end), pieces));
    }

    // Screen-position helpers (need refs at component scope — keep inline).
    const getBoardScreenPos = (): Promise<{ x: number; y: number }> =>
      new Promise(resolve => {
        if (boardGridRef.current) {
          boardGridRef.current.measureInWindow((x: number, y: number) => resolve({ x, y }));
        } else {
          resolve({ x: 0, y: 0 });
        }
      });

    const measureTapeContainer = (
      containerRef: React.RefObject<View | null>,
    ): Promise<TapeCellContainerMeasure | null> =>
      new Promise(resolve => {
        if (!containerRef.current) {
          resolve(null);
          return;
        }
        containerRef.current.measureInWindow(
          (x: number, y: number, w: number, h: number) => resolve({ x, y, w, h }),
        );
      });

    // Build the EngagementContext once for this run. State setters and
    // refs flow into the extracted phase functions through here instead
    // of via closure capture.
    const ctx: EngagementContext = {
      CELL_SIZE,
      getPieceCenter,
      machineStatePieces: machineState.pieces,

      // Beam engine (Phase 4 hook)
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
      runId: beam.runIdRef.current,
      currentRunIdRef: beam.runIdRef,

      // Tape (Phase 3 hook)
      setTapeCellHighlights: tape.tapeSetters.setTapeCellHighlights,
      setTapeBarState: tape.tapeSetters.setTapeBarState,
      setGlowTravelerState: tape.tapeSetters.setGlowTravelerState,
      valueTravelRefs: tape.valueTravelRefs,
      gateOutcomes: tape.gateOutcomesRef,
      setVisualTrailOverride: tape.tapeSetters.setVisualTrailOverride,
      setVisualOutputOverride: tape.tapeSetters.setVisualOutputOverride,
      boardGridRef,
      inputTapeCellsRef: tape.inputTapeCellsRef,
      dataTrailCellsRef: tape.dataTrailCellsRef,
      outputTapeCellsRef: tape.outputTapeCellsRef,
      inputTape: level.inputTape,
    };

    // Reset the measurement cache for this run.
    beam.cacheRef.current = { board: { x: 0, y: 0 }, input: null, trail: null, output: null };

    // Initialize progressive-reveal overrides for trail and output cells.
    // During beam animation, cells that begin null show empty until a
    // Scanner visually writes them. Cells with pre-existing values from
    // the level definition (e.g., A1-3's seeded trail [0]) stay visible
    // — those values aren't written during the run, so wiping them to
    // null on engage made them disappear and rendered as '·' for the
    // entire beam phase (Prompt 106, Fix 3).
    if (level.dataTrail.cells.length > 0) {
      tape.tapeSetters.setVisualTrailOverride([...level.dataTrail.cells]);
    }
    if (level.inputTape && level.inputTape.length > 0) {
      tape.tapeSetters.setVisualOutputOverride(level.inputTape.map(() => -1));
    }

    // PHASE 1 — CHARGE
    const sourcePiece = machineState.pieces.find(p => p.type === 'source');
    if (sourcePiece) {
      await runChargePhase(ctx, sourcePiece.id);
    }

    // Cache screen coordinates once — board and tape containers do not
    // move during execution, and re-measuring per pulse can return
    // stale (0, 0) during re-render windows.
    const board0 = await getBoardScreenPos();
    let [input0, trail0, output0] = await Promise.all([
      measureTapeContainer(tape.inputTapeCellsRef),
      measureTapeContainer(tape.dataTrailCellsRef),
      measureTapeContainer(tape.outputTapeCellsRef),
    ]);
    // Null ref guard: React lifecycle timing or memory pressure can leave
    // a tape container unmeasured on the first attempt. Retry once after
    // 150ms (same pattern as the tutorial orb delayed measure). If still
    // null, glow animations are skipped via the getTapeCellPosFromCache
    // null return; tape state still updates correctly.
    if (!input0 || !trail0 || !output0) {
      await new Promise<void>(r => setTimeout(r, 150));
      const [input1, trail1, output1] = await Promise.all([
        measureTapeContainer(tape.inputTapeCellsRef),
        measureTapeContainer(tape.dataTrailCellsRef),
        measureTapeContainer(tape.outputTapeCellsRef),
      ]);
      if (!input0) input0 = input1;
      if (!trail0) trail0 = trail1;
      if (!output0) output0 = output1;
      if (__DEV__ && (!input0 || !trail0 || !output0)) {
        console.warn('[handleEngage] tape container null after retry; glow animations skipped for this run');
      }
    }
    beam.cacheRef.current = { board: board0, input: input0, trail: trail0, output: output0 };

    // PHASE 2 — BEAM (one or more pulses)
    setBeamState(prev => ({ ...prev, phase: 'beam' }));
    // Reset the live terminal-success counter for this run. Read by
    // the pulse HUD to show "REACHED: X / N" progress.
    beam.terminalSuccessCountRef.current = 0;
    for (let p = 0; p < pulses.length; p++) {
      beam.currentPulseRef.current = p;
      setCurrentPulseIndex(p);
      // Per-pulse flash-timer sweep (Prompt 94, Fix 1). flashPiece /
      // triggerPieceAnim / the tape-pause safety timer all push
      // setTimeout handles into flashTimersRef during a pulse.
      // Without this sweep the array grows unbounded across the run
      // — on long puzzles that pile of orphaned timers compounds
      // into the per-pulse lag Tucker reported.
      beam.flashTimersRef.current.forEach(t => clearTimeout(t));
      beam.flashTimersRef.current = [];
      // Cancelling the timers also kills the deferred cleanup that
      // would have removed entries from flashing / animations / gates.
      // Reset those Maps explicitly here so the terminal-piece purple
      // flash clears and PieceIcon re-triggers piece animations on
      // pulses 2+ (mirrors replayLoop.ts:52-57). PERFORMANCE_CONTRACT
      // 3.4.1 — at most one setPieceAnimState per inter-pulse sweep.
      setPieceAnimState(prev => ({
        ...prev,
        flashing: new Map(),
        flashCounter: new Map(),
        animations: new Map(),
        gates: new Map(),
      }));
      // Reset wire glow state so each pulse starts with un-lit wires.
      // Without this, wires lit during pulse N stay lit on pulse N+1
      // and the beam becomes invisible against already-lit segments.
      setBeamState(prev => ({ ...prev, litWires: new Set() }));
      await engageRunPulse(ctx, pulses[p]);

      const pulseReachedTerminal = pulses[p].some(
        s => s.type === 'terminal' && s.success,
      );
      if (pulseReachedTerminal) {
        beam.terminalSuccessCountRef.current += 1;
      }

      if (p < pulses.length - 1) {
        if (sourcePiece) engageFlashPiece(ctx, sourcePiece.id, '#F0B429');
        await new Promise(r => setTimeout(r, 80));
      }
    }
    // Beam complete — fall through to machineState-driven rendering.
    tape.resetTape();

    // Wrong-output detection for tape-enabled levels. If the tape didn't
    // match expectedOutput, suppress the green lock sequence and show a
    // red wrong-output ring burst instead.
    const hasTape = !!(level.inputTape && level.expectedOutput);
    const storeOutputTape = useGameStore.getState().machineState.outputTape;
    const tapeMatches = hasTape && !!storeOutputTape && !!level.expectedOutput &&
      storeOutputTape.length === level.expectedOutput.length &&
      storeOutputTape.every((v, i) => v === (level.expectedOutput as number[])[i]);
    const reachedOutputEveryPulse = steps.filter(s => s.type === 'terminal' && s.success).length >= (pulses.length || 1);
    const wrongOutput = hasTape && reachedOutputEveryPulse && !tapeMatches;

    // Count pulses that reached Terminal. Levels without a Transmitter
    // use this for their success condition via requiredTerminalCount.
    const terminalSuccessCount = steps.filter(
      s => s.type === 'terminal' && s.success,
    ).length;
    const requiredCount = level.requiredTerminalCount ?? 1;
    const metPulseRequirement = terminalSuccessCount >= requiredCount;

    if (wrongOutput) {
      const outputPiece = machineState.pieces.find(p => p.type === 'terminal');
      if (outputPiece) {
        setPieceAnimState(prev => {
          const next = new Map(prev.failColors);
          next.set(outputPiece.id, '#FF3B3B');
          return { ...prev, failColors: next };
        });
        const op = getPieceCenter(outputPiece.id);
        if (op) await runWrongOutputRings(ctx, op);
      }
    }

    // Insufficient-pulses failure (no Transmitter, requiredTerminalCount
    // not met). Fires red rings then shows the INSUFFICIENT PULSES modal.
    if (!metPulseRequirement && !wrongOutput) {
      const pulseResults: boolean[] = [];
      for (let p = 0; p < pulses.length; p++) {
        const reached = pulses[p].some(
          s => s.type === 'terminal' && s.success,
        );
        pulseResults.push(reached);
      }

      const outputPiece = machineState.pieces.find(pp => pp.type === 'terminal');
      if (outputPiece) {
        setPieceAnimState(prev => {
          const next = new Map(prev.failColors);
          next.set(outputPiece.id, '#FF3B3B');
          return { ...prev, failColors: next };
        });
        const op = getPieceCenter(outputPiece.id);
        if (op) await runWrongOutputRings(ctx, op);
      }

      setBeamState(prev => ({ ...prev, phase: 'idle' }));
      setPulseResultData({
        results: pulseResults,
        required: requiredCount,
        achieved: terminalSuccessCount,
      });
      setShowInsufficientPulses(true);
      if (!isAxiomLevel) loseLife();
      return;
    }

    // PHASE 3 — LOCK (400ms) — only on success (and matching tape if tape level)
    const succeededFinal = !wrongOutput && metPulseRequirement;
    if (succeededFinal) {
      const outputPiece = machineState.pieces.find(p => p.type === 'terminal');
      if (outputPiece) {
        const op = getPieceCenter(outputPiece.id);
        if (op) await runLockPhase(ctx, op);
      }
    }
    setBeamState(prev => ({ ...prev, phase: 'idle' }));

    // Wrong output: show diagnostic modal instead of void
    if (wrongOutput && storeOutputTape && level.expectedOutput) {
      handleWrongOutput({
        steps,
        expected: level.expectedOutput,
        produced: storeOutputTape,
        isAxiomLevel,
        findBlownPiece,
        deletePiece,
        setBlownCells,
        setWrongOutputData,
        setShowWrongOutput,
        loseLife,
      });
      return;
    }

    const succeeded = !wrongOutput && metPulseRequirement;
    if (succeeded) {
      const engageDurationMs = Date.now() - engageStartTime;
      const routed = await handleSuccess({
        steps,
        level,
        pieces: machineState.pieces,
        discipline,
        engageDurationMs,
        lockedElapsed,
        levelSpent,
        setScoreResult,
        setCogsScoreComment,
        setFirstTimeBonus,
        setElaborationMult,
        setFlashColor,
        setShowSystemRestored,
        setShowCompletionScene,
        setCompletionText,
        setShowCompletionCard,
        completeLevel,
        earnCredits,
        addLivesCredits: addCredits,
        triggerHints,
        navigation,
        greenColor: Colors.green,
      });
      if (routed) return;

      // Beam animation stops here. The board remains in the static
      // locked success state from the lock phase (all pieces green,
      // all wires lit, phase: 'idle'). The full replay loop was
      // removed because it stacked RAF frames and timer callbacks
      // that accumulated if the player waited before tapping CONTINUE
      // — the root cause of the progressive lag on A1-7/A1-8 when
      // playing sequentially (Prompt 104, Fix 4B).
      // Player taps CONTINUE to proceed to the results screen.
    } else {
      await handleVoidFailure({
        steps,
        levelId: level.id,
        isAxiomLevel,
        failCount,
        findBlownPiece,
        deletePiece,
        setBlownCells,
        setFailCount,
        setFlashColor,
        setShowTeachCard,
        setShowVoid,
        triggerHints,
        redColor: Colors.red,
      });
    }
  }, [isExecuting, engage, getPieceCenter, triggerHints, levelSpent, earnCredits]);


  // ── Reset ──
  const handleReset = useCallback(() => {
    setShowResults(false);
    setShowVoid(false);
    beam.resetBeam();
    tape.resetTape();
    setShowInsufficientPulses(false);
    setPulseResultData(null);
    reset();
    resetTimer();
  }, [reset, resetTimer]);

  // ── Debug ──
  const handleDebug = useCallback(() => {
    setShowVoid(false);
    setDebugMode(true);
  }, [setDebugMode, setShowVoid]);

  // ── Completion CONTINUE handler (passed to GameplayModals) ──
  // Cleans up any lingering beam/tape animation state from the lock
  // hold then transitions from the completion card to the Results
  // overlay.
  const handleCompletionContinue = useCallback(() => {
    beam.cancelAllFrames();
    tape.resetTape();
    setBeamState(prev => ({
      ...prev,
      heads: [],
      trails: [],
      branchTrails: [],
      phase: 'idle',
    }));
    setLockRingCenter(null);
    setVoidBurstCenter(null);
    setChargeState(prev => ({ ...prev, pos: null }));
    setShowCompletionCard(false);
    setShowResults(true);
  }, [setShowCompletionCard, setShowResults]);

  // ── Wrong Output RETRY handler (passed to GameplayModals) ──
  // Dismisses the diagnostic modal, checks the lives gate, and
  // resets transient beam/piece-anim state while leaving the
  // board configuration intact.
  const handleWrongOutputRetry = useCallback(() => {
    setShowWrongOutput(false);
    setWrongOutputData(null);
    if (lives <= 0) {
      setShowOutOfLives(true);
    }
    setBeamState(prev => ({
      ...prev,
      heads: [],
      trails: [],
      branchTrails: [],
      litWires: new Set(),
    }));
    setPieceAnimState(PIECE_ANIM_INITIAL);
  }, [lives, setShowOutOfLives, setShowWrongOutput, setWrongOutputData]);

  // ── No-level guard (after all hooks) ──
  if (!level) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>No level loaded</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'center', padding: 16 }}>
            <Text style={{ color: Colors.muted, fontFamily: Fonts.spaceMono }}>BACK</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <GameplayErrorBoundary onReset={handleReset}>
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={7} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Top Bar ── */}
        <HUDChrome
          sectorBadge={level.sector === 'axiom' ? 'THE AXIOM' : level.sector.toUpperCase()}
          levelId={level.id}
          levelTitle={level.systemRepaired ? level.systemRepaired.toUpperCase() : level.name}
          timerText={!showResults && !showVoid && !tutorialIsActive ? formatMMSS(elapsedSeconds) : null}
          pulseCounterText={
            level.inputTape && level.inputTape.length > 0 && beamState.phase === 'beam'
              ? `PULSE ${Math.min(currentPulseIndex + 1, level.inputTape.length)} / ${level.inputTape.length}${
                  level.requiredTerminalCount && level.requiredTerminalCount > 1
                    ? ` — REACHED: ${beam.terminalSuccessCountRef.current} / ${level.requiredTerminalCount}`
                    : ''
                }`
              : null
          }
          onPause={handlePauseOpen}
        />

        {/* ── Turing Tape Display ── */}
        {((level.inputTape && level.inputTape.length > 0) ||
          level.dataTrail.cells.length > 0) && (
          <TapeBarShell
            inputTape={level.inputTape}
            trailCells={machineState.dataTrail.cells}
            trailHeadPosition={machineState.dataTrail.headPosition}
            outputTape={machineState.outputTape}
            expectedOutput={level.expectedOutput}
            hasOutTape={
              level.availablePieces.includes('transmitter') ||
              level.prePlacedPieces.some(p => p.type === 'transmitter')
            }
            visualTrailOverride={tape.visualTrailOverride}
            visualOutputOverride={tape.visualOutputOverride}
            tapeCellHighlights={tape.tapeCellHighlights}
            tapeBarState={tape.tapeBarState}
            gateOutcomesByIndex={tape.gateOutcomesRef.current}
            beamPhase={beamState.phase}
            currentPulseIndex={currentPulseIndex}
            inputTapeRowRef={inputTapeRowRef}
            outputTapeRowRef={outputTapeRowRef}
            dataTrailRowRef={dataTrailRowRef}
            inputTapeCellsRef={tape.inputTapeCellsRef}
            dataTrailCellsRef={tape.dataTrailCellsRef}
            outputTapeCellsRef={tape.outputTapeCellsRef}
            requiredTerminalCount={level.requiredTerminalCount}
            showPulseTarget={
              !isExecuting && !showResults && !showVoid &&
              !showWrongOutput && !showInsufficientPulses
            }
          />
        )}

        {/* ── Game Canvas (flex fills remaining space) ── */}
        <View
          style={styles.canvasOuter}
          onLayout={e => {
            const { width: w, height: h } = e.nativeEvent.layout;
            setCanvasLayout(prev =>
              prev.w === Math.round(w) && prev.h === Math.round(h)
                ? prev
                : { w: Math.round(w), h: Math.round(h) }
            );
          }}
        >
          <View ref={boardGridRef} style={[styles.canvas, { width: gridW, height: gridH }]}>
            {/* Dot grid + blown-cell scars (static across beam animation) */}
            <Svg width={gridW} height={gridH} style={StyleSheet.absoluteFill}>
              {Array.from({ length: numRows + 1 }, (_, y) =>
                Array.from({ length: numColumns + 1 }, (_, x) => (
                  <Circle
                    key={`dot-${x}-${y}`}
                    cx={x * CELL_SIZE + CELL_SIZE / 2}
                    cy={y * CELL_SIZE + CELL_SIZE / 2}
                    r={DOT_R}
                    fill="rgba(74,158,255,0.12)"
                  />
                )),
              )}

              {/* Blown cell scars */}
              {Array.from(blownCells).map(key => {
                const [gx, gy] = key.split(',').map(Number);
                const cx = gx * CELL_SIZE + CELL_SIZE / 2;
                const cy = gy * CELL_SIZE + CELL_SIZE / 2;
                return (
                  <G key={`scar-${key}`}>
                    <Rect
                      x={gx * CELL_SIZE + 2}
                      y={gy * CELL_SIZE + 2}
                      width={CELL_SIZE - 4}
                      height={CELL_SIZE - 4}
                      rx={4}
                      fill="rgba(180,30,30,0.12)"
                      stroke="rgba(180,30,30,0.25)"
                      strokeWidth={1}
                    />
                    <Line
                      x1={cx - 6} y1={cy - 6}
                      x2={cx + 4} y2={cy + 2}
                      stroke="rgba(255,60,60,0.3)"
                      strokeWidth={1}
                    />
                    <Line
                      x1={cx + 2} y1={cy - 4}
                      x2={cx - 3} y2={cy + 7}
                      stroke="rgba(255,60,60,0.25)"
                      strokeWidth={1}
                    />
                    <Circle
                      cx={cx} cy={cy} r={3}
                      fill="rgba(255,50,50,0.2)"
                    />
                  </G>
                );
              })}
            </Svg>

            {/* Wire layer — sibling Svg so lit-wire updates do not
                cascade through the dot grid or piece layers
                (PERFORMANCE_CONTRACT 4.3.1, 4.3.2). */}
            <WireOverlay
              wires={wires}
              litWires={beamState.litWires}
              pieceById={pieceById}
              cellSize={CELL_SIZE}
              gridW={gridW}
              gridH={gridH}
              isLocked={beamState.phase === 'lock' && pieceAnimState.locked.size > 0}
            />

            {/* Signal beam overlay (extracted Prompt 99B). Sibling of
                board grid + wire overlay; setBeamState re-renders only
                this subtree (clause 4.4.1, 4.4.2). */}
            <BeamOverlay
              beamState={beamState}
              chargeState={chargeState}
              lockRingCenter={lockRingCenter}
              voidBurstCenter={voidBurstCenter}
              chargeProgressAnim={chargeProgressAnim}
              lockRingProgressAnim={lockRingProgressAnim}
              voidPulseRingProgressAnim={voidPulseRingProgressAnim}
              beamOpacity={beamOpacity}
              gridW={gridW}
              gridH={gridH}
            />

            {/* Pieces — per-piece prop isolation lives in BoardPiece
                so PieceIcon's React.memo barrier holds across beam
                ticks (clause 4.2.2). */}
            <BoardGrid
              pieces={pieces}
              pieceAnimProps={pieceAnimProps}
              lockedSet={pieceAnimState.locked}
              cellSize={CELL_SIZE}
              sourceNodeRef={sourceNodeRef}
              outputNodeRef={outputNodeRef}
              boardScannerRef={boardScannerRef}
              onPieceTap={handlePieceTap}
              onPieceLongPress={handlePieceLongPress}
            />

            {/* Ghost cells — copper valid hints on Axiom, invisible taps elsewhere */}
            {selectedPieceFromTray &&
              Array.from({ length: numRows }, (_, y) =>
                Array.from({ length: numColumns }, (_, x) => {
                  const occupied = pieces.some(p => p.gridX === x && p.gridY === y);
                  if (occupied) return null;

                  const isTutorialSector = level.sector === 'axiom';
                  let isValid = true;
                  if (isTutorialSector) {
                    // Check: would a piece placed here (with auto-rotation)
                    // connect to at least one existing piece?
                    const autoRot = getAutoRotation(x, y);
                    isValid = pieces.some(p => {
                      const dx = x - p.gridX;
                      const dy = y - p.gridY;
                      if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
                      // Direction from existing piece toward this cell
                      let sideFromExisting: PortSide;
                      if (dx === 1) sideFromExisting = 'right';
                      else if (dx === -1) sideFromExisting = 'left';
                      else if (dy === 1) sideFromExisting = 'bottom';
                      else sideFromExisting = 'top';
                      const oppSide = sideFromExisting === 'right' ? 'left' : sideFromExisting === 'left' ? 'right' : sideFromExisting === 'bottom' ? 'top' : 'bottom';
                      // Existing piece outputs toward this cell, OR this cell's auto-rotated piece outputs toward existing
                      return getOutputPorts(p).includes(sideFromExisting) || getInputPorts(p).includes(sideFromExisting);
                    });
                    if (!isValid) return null;
                  }

                  return (
                    <TouchableOpacity
                      key={`ghost-${x}-${y}`}
                      style={[
                        styles.ghostCell,
                        { left: x * CELL_SIZE, top: y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE },
                      ]}
                      onPress={() => handleCanvasTap(x, y)}
                      activeOpacity={0.6}
                    >
                      {isTutorialSector ? (
                        <View style={styles.ghostInnerValid} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }),
              )}
          </View>
        </View>


        {/* ── Parts Tray ── */}
        {!isExecuting && !showResults && !showVoid && !debugMode && (
          <PieceTray
            trayPieceTypes={trayPieceTypes}
            availableCounts={availableCounts}
            selectedPieceFromTray={selectedPieceFromTray}
            costs={trayCosts}
            affordable={trayAffordable}
            refs={tutorialTrayRefs}
            onPickup={selectFromTray}
          />
        )}

        {/* ── Tutorial Hint ── */}
        {currentHint && (
          <TutorialHint hintKey={currentHint.key} text={currentHint.text} onDismiss={dismissHint} />
        )}


        {/* ── Credit Error ── */}
        {creditError && (
          <View style={styles.creditErrorWrap}>
            <Text style={styles.creditErrorText}>Insufficient credits.</Text>
          </View>
        )}

        {/* ── Debug Controls ── */}
        {debugMode && (
          <View style={styles.debugBar}>
            <TouchableOpacity style={styles.debugBtn} onPress={debugPrev} activeOpacity={0.7}>
              <Text style={styles.debugBtnText}>{'<'} PREV</Text>
            </TouchableOpacity>
            <Text style={styles.debugStep}>
              Step {debugStepIndex + 1}/{executionSteps.length}
            </Text>
            <TouchableOpacity style={styles.debugBtn} onPress={debugNext} activeOpacity={0.7}>
              <Text style={styles.debugBtnText}>NEXT {'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.debugBtn, { borderColor: Colors.red }]}
              onPress={() => setDebugMode(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.debugBtnText, { color: Colors.red }]}>EXIT</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Engage Button ── */}
        {!isExecuting && !showResults && !showVoid && !debugMode && (
          <View style={styles.engageRow}>
            <Button
              variant="secondary"
              label="RESET"
              onPress={handleReset}
              style={styles.engageRowReset}
            />
            <Button
              ref={engageButtonRef}
              variant="gradient"
              label="ENGAGE MACHINE"
              onPress={handleEngage}
              disabled={!hasPlacedPieces}
              style={styles.engageRowEngage}
            />
          </View>
        )}

        {/* ── Flash Overlay ── */}
        {flashColor && (
          <View style={[styles.flashOverlay, { backgroundColor: flashColor }]} />
        )}

      </SafeAreaView>

      {/* ── All full-screen modal overlays (Phase 1 extraction) ── */}
      <GameplayModals
        showPauseModal={showPauseModal}
        setShowPauseModal={setShowPauseModal}
        showAbandonConfirm={showAbandonConfirm}
        setShowAbandonConfirm={setShowAbandonConfirm}
        showVoid={showVoid}
        setShowVoid={setShowVoid}
        showResults={showResults}
        setShowResults={setShowResults}
        showCompletionCard={showCompletionCard}
        showWrongOutput={showWrongOutput}
        setShowWrongOutput={setShowWrongOutput}
        wrongOutputData={wrongOutputData}
        setWrongOutputData={setWrongOutputData}
        showInsufficientPulses={showInsufficientPulses}
        setShowInsufficientPulses={setShowInsufficientPulses}
        pulseResultData={pulseResultData}
        setPulseResultData={setPulseResultData}
        showOutOfLives={showOutOfLives}
        setShowOutOfLives={setShowOutOfLives}
        showEconomyIntro={showEconomyIntro}
        setShowEconomyIntro={modals.setShowEconomyIntro}
        showSystemRestored={showSystemRestored}
        showCompletionScene={showCompletionScene}
        completionText={completionText}
        showDisciplineCard={showDisciplineCard}
        setShowDisciplineCard={setShowDisciplineCard}
        showTeachCard={showTeachCard}
        setShowTeachCard={setShowTeachCard}
        scoreResult={scoreResult}
        cogsScoreComment={cogsScoreComment}
        firstTimeBonus={firstTimeBonus}
        elaborationMult={elaborationMult}
        blownCells={blownCells}
        setBlownCells={setBlownCells}
        failCount={failCount}
        getBlownCellCOGSLine={getBlownCellCOGSLine}
        lives={lives}
        livesCredits={livesCredits}
        discipline={discipline}
        credits={credits}
        loseLife={loseLife}
        refillLives={refillLives}
        stars={stars}
        level={level}
        isAxiomLevel={!!isAxiomLevel}
        isDailyChallenge={isDailyChallenge}
        elapsedSeconds={elapsedSeconds}
        CELL_SIZE={CELL_SIZE}
        navigation={navigation}
        handleReset={handleReset}
        onCompletionContinue={handleCompletionContinue}
        onWrongOutputRetry={handleWrongOutputRetry}
        onDebug={handleDebug}
      />

      {/* ── HUD Tutorial Overlay ── */}
      {/* Gated on !isExecuting so measure() calls don't race beam-animation
          setState updates during the run (Prompt 83). The overlay
          remounts at its persisted step once the run resolves. */}
      {!tutorialComplete && !tutorialSkipped && !isLevelPreviouslyCompleted &&
        !isExecuting && level?.sector === 'axiom' &&
        (level?.tutorialSteps?.length ?? 0) > 0 && (
        <TutorialHUDOverlay
          steps={level!.tutorialSteps!}
          levelId={level!.id}
          targetRefs={tutorialTargetRefs}
          spotlightCells={tutorialSpotlightCells}
          spotlightCellSize={CELL_SIZE}
          onComplete={() => setTutorialComplete(true)}
          onSkip={() => setTutorialSkipped(true)}
          isBeamActive={beamState.phase !== 'idle'}
        />
      )}

      {/* Glow Traveler — single reusable element. Stays mounted; opacity
          drives visibility, transforms drive position. */}
      <RNAnimated.View
        pointerEvents="none"
        style={[
          styles.glowTraveler,
          {
            opacity: tape.glowTravelerOpacity,
            transform: [
              { translateX: tape.glowTravelerX },
              { translateY: tape.glowTravelerY },
              { scale: tape.glowTravelerScale },
            ],
          },
        ]}
      >
        <Text style={styles.glowTravelerText}>
          {tape.glowTravelerState.value}
        </Text>
      </RNAnimated.View>
    </Animated.View>
    </GameplayErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },
  errorText: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.md, color: Colors.muted,
    textAlign: 'center', marginTop: Spacing.xxxl,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.12)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontFamily: Fonts.orbitron, fontSize: 18, color: Colors.muted },
  pauseBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 4,
  },
  pauseBar: {
    width: 3, height: 10, backgroundColor: '#00D4FF', opacity: 0.7, borderRadius: 1,
  },
  timerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 13,
    color: '#00D4FF',
    opacity: 0.7,
    letterSpacing: 1,
    marginTop: 2,
  },
  topBarCenter: { flex: 1, alignItems: 'center' },
  sectorTag: {
    fontFamily: Fonts.spaceMono, fontSize: 7, color: Colors.dim,
    letterSpacing: 2, marginBottom: 1,
  },
  levelTag: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.copper,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  levelName: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.starWhite,
  },

  // Configuration
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    zIndex: 30,
  },
  configLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.muted, letterSpacing: 1,
  },
  configToggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dim,
    borderRadius: 6,
  },
  configToggleActive: {
    borderColor: Colors.amber,
    backgroundColor: 'rgba(240,180,41,0.12)',
  },
  configToggleText: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.dim, letterSpacing: 1,
  },
  configToggleTextActive: { color: Colors.amber },

  // Canvas
  canvasOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: CANVAS_PAD,
    paddingVertical: CANVAS_PAD / 2,
    overflow: 'hidden',
  },
  canvas: {
    backgroundColor: '#06090f',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.1)',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },


  // Flash overlay
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    zIndex: 150,
  },

  // Pieces
  piece: {
    position: 'absolute',
    borderRadius: PIECE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ghost cells
  ghostCell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostInnerValid: {
    width: '80%',
    height: '80%',
    borderRadius: PIECE_RADIUS - 1,
    borderWidth: 1.5,
    borderColor: '#c87941',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(200,121,65,0.08)',
  },

  // Parts tray
  partsTray: {
    height: 72,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.12)',
    justifyContent: 'center',
  },
  partsTrayInner: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  trayItem: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,28,0.8)',
    gap: 2,
    position: 'relative',
  },
  trayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  trayBadgeText: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.void, fontWeight: 'bold',
  },
  trayCost: {
    fontFamily: Fonts.spaceMono, fontSize: 7, letterSpacing: 0.5,
  },
  creditErrorWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  creditErrorText: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.red, letterSpacing: 1,
  },

  // Debug bar
  debugBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,180,41,0.2)',
    backgroundColor: 'rgba(10,18,30,0.8)',
  },
  debugBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 6,
  },
  debugBtnText: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.amber, letterSpacing: 1,
  },
  debugStep: {
    fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.starWhite,
  },

  // Engage row
  engageRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  engageRowReset: {
    flex: 1,
  },
  engageRowEngage: {
    flex: 2,
  },

  // Turing tape UI
  pulseCounterText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#1A3050',
    marginTop: 2,
    letterSpacing: 1,
  },
  pulseTargetRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  pulseTargetText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.amber,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  tapeSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
    flexShrink: 0,
  },
  tapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tapeIndicatorBar: {
    position: 'absolute',
    top: -2,
    left: 42 + 8,  // tapeLabel width (42) + tapeRow gap (8)
    width: 24,      // matches cell width
    height: 6,
    borderRadius: 3,
    // The bar must render ABOVE the cell wraps (which include the
    // purple `tapeHead` strip on the IN tape's active/pre-beam cell).
    // Without an explicit zIndex, the in-flow `tapeCells` container
    // stacks over this absolute sibling and the purple head pokes
    // through the green IN bar (Prompt 91, Fix 2).
    zIndex: 2,
    elevation: 2,
  },
  glowTraveler: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0,229,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
  },
  glowTravelerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00E5FF',
    fontWeight: 'bold',
  },
  tapeLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1,
    width: 42,
  },
  tapeCells: {
    flexDirection: 'row',
    gap: 3,
  },
  tapeCellWrap: {
    alignItems: 'center',
  },
  tapeHead: {
    width: 6,
    height: 4,
    backgroundColor: '#8B5CF6',
    marginBottom: 2,
  },
  tapeCell: {
    width: 24,
    height: 24,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#0D1E30',
    backgroundColor: '#08101C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapeCellActive: {
    borderColor: Colors.neonCyan,
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  tapeCellPast: {
    borderColor: 'rgba(139,92,246,0.3)',
  },
  // Legacy: retained for non-gate output comparison (Kepler Belt).
  tapeCellCorrect: {
    borderColor: '#00C48C',
    backgroundColor: 'rgba(0,196,140,0.08)',
  },
  // Legacy: retained for non-gate output comparison (Kepler Belt).
  tapeCellWrong: {
    borderColor: '#FF3B3B',
    backgroundColor: 'rgba(255,59,59,0.08)',
  },
  // Gate-outcome styles (Prompt 84C). OUT tape cells use these
  // instead of the legacy correct/wrong styles on Axiom levels.
  tapeCellGatePassed: {
    borderColor: '#00FF87',
    backgroundColor: 'rgba(0,255,135,0.14)',
  },
  tapeCellGateBlocked: {
    borderColor: '#FF3B3B',
    backgroundColor: 'rgba(255,59,59,0.14)',
  },
  tapeCellText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.neonCyan,
  },
  tapeCellTextActive: {
    color: Colors.neonCyan,
    fontWeight: 'bold' as const,
  },
  tapeCellTextPast: {
    color: 'rgba(0,229,255,0.4)',
  },
  // Legacy: retained for non-gate output comparison (Kepler Belt).
  tapeCellTextCorrect: {
    color: Colors.neonYellow,
  },
  // Legacy: retained for non-gate output comparison (Kepler Belt).
  tapeCellTextWrong: {
    color: '#FF3B3B',
  },
  tapeCellTextGatePassed: {
    color: '#00FF87',
  },
  tapeCellTextGateBlocked: {
    color: '#FF3B3B',
  },
  // IN-tape-specific palette (Prompt 91, Fix 1). Tucker moved the
  // green/yellow color treatment from the TRAIL tape to the IN tape;
  // these overrides apply on top of the shared tapeCell / tapeCellText
  // styles. The hex matches Colors.tapeInBar (#BFFF3F).
  tapeCellIn: {
    // Idle IN cell still uses the dark base background; the active
    // override below paints the neon-green tint.
  },
  tapeCellInActive: {
    borderColor: '#BFFF3F',
    backgroundColor: 'rgba(191,255,63,0.14)',
  },
  tapeCellTextIn: {
    color: '#BFFF3F',
  },
  tapeCellTextInActive: {
    color: '#BFFF3F',
    fontWeight: 'bold' as const,
  },
  tapeCellTextInPast: {
    color: 'rgba(191,255,63,0.4)',
  },
});
