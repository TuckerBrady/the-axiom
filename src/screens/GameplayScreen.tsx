import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Pressable,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Rect, Path, G, Polyline } from 'react-native-svg';
// AnimatedCircle (Prompt 99A) — used by the lock ring + charge ring
// renderers below. Driven by Animated.Values on EngagementContext
// with useNativeDriver: true.
const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import StarField from '../components/StarField';
import CogsAvatar from '../components/CogsAvatar';
import { Button } from '../components/Button';
import { PieceIcon } from '../components/PieceIcon';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import { useLivesStore } from '../store/livesStore';
import { useProgressionStore } from '../store/progressionStore';
import { usePlayerStore, DISCIPLINE_LABELS } from '../store/playerStore';
import { useEconomyStore } from '../store/economyStore';
import { calculateScore, getCOGSScoreComment, getTutorialCOGSComment } from '../game/scoring';
import type { ScoreResult } from '../game/scoring';
import { TutorialHint } from '../components/TutorialHint';
import TutorialHUDOverlay from '../components/TutorialHUDOverlay';
import GameplayErrorBoundary from '../components/GameplayErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PieceType, PlacedPiece, ExecutionStep, TutorialHint as TutorialHintType, ScoringCategory, PortSide } from '../game/types';
import { getPieceCost } from '../game/types';
import { getOutputPorts, getInputPorts } from '../game/engine';
import { AXIOM_LEVELS } from '../game/levels';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Grid constants ───────────────────────────────────────────────────────────

const DOT_R = 1.5;
const PIECE_RADIUS = 10;
const CANVAS_PAD = 20;  // padding inside canvas area — ensures edge pieces are fully visible
const MIN_CELL = 48;
const MAX_CELL = 88;

const VOID_QUOTES = [
  '"The signal did not reach Output. I observed the exact moment it failed."',
  '"Void state. I could explain why. You should already know."',
  '"The machine did not lock. Review your connections."',
  '"Signal lost. The configuration was incorrect. Adjust and retry."',
];

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
  runReplayLoop,
  handleSuccess,
  handleWrongOutput,
  handleVoidFailure,
  BEAM_INITIAL,
  PIECE_ANIM_INITIAL,
  CHARGE_INITIAL,
  TAPE_BAR_INITIAL,
  GLOW_TRAVELER_INITIAL,
  resetGlowTraveler,
  type Pt,
  type EngagementContext,
  type MeasurementCache,
  type BeamState,
  type PieceAnimState,
  type ChargeState,
  type TapeIndicatorBarState,
  type GlowTravelerState,
  type TapeHighlight,
  type GateOutcomeMap,
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

  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [cogsScoreComment, setCogsScoreComment] = useState('');
  const [currentHint, setCurrentHint] = useState<{ key: string; text: string } | null>(null);

  const [hintQueue, setHintQueue] = useState<{ key: string; text: string }[]>([]);
  const hintTriggered = useRef<Set<string>>(new Set());
  const sourceNodeRef = useRef<View>(null);
  const outputNodeRef = useRef<View>(null);
  const boardGridRef = useRef<View>(null);
  const engageButtonRef = useRef<View>(null);
  const boardScannerRef = useRef<View>(null);
  const inputTapeRowRef = useRef<View>(null);
  const outputTapeRowRef = useRef<View>(null);
  const dataTrailRowRef = useRef<View>(null);
  const dataTrailCellsRef = useRef<View>(null);
  const outputTapeCellsRef = useRef<View>(null);
  const inputTapeCellsRef = useRef<View>(null);
  const currentPulseRef = useRef(0);
  const trayConveyorRef = useRef<View>(null);
  const trayGearRef = useRef<View>(null);
  const trayConfigNodeRef = useRef<View>(null);
  const traySplitterRef = useRef<View>(null);
  const traScannerRef = useRef<View>(null);
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
      trayScanner: traScannerRef,
      trayTransmitter: trayTransmitterRef,
      boardScanner: boardScannerRef,
      inputTapeRow: inputTapeRowRef,
      outputTapeRow: outputTapeRowRef,
      dataTrailRow: dataTrailRowRef,
    }),
    [],
  );

  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [tutorialSkipped, setTutorialSkipped] = useState(false);
  const [showDisciplineCard, setShowDisciplineCard] = useState(false);
  const [creditError, setCreditError] = useState(false);

  const [failCount, setFailCount] = useState(0);
  const [blownCells, setBlownCells] = useState<Set<string>>(new Set());
  const blownCellsRef = useRef<Set<string>>(new Set());
  const [showTeachCard, setShowTeachCard] = useState<string[] | null>(null);
  const [showEconomyIntro, setShowEconomyIntro] = useState(false);
  const [showResults, setShowResults] = useState(false);
  // Bug 10: completion card gates Results screen. After a successful
  // lock the lock sequence holds and a COGS completion line appears.
  // Player taps Continue to dismiss the card, which triggers Results.
  const [showCompletionCard, setShowCompletionCard] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [showWrongOutput, setShowWrongOutput] = useState(false);
  const [wrongOutputData, setWrongOutputData] = useState<{ expected: number[]; produced: number[] } | null>(null);
  const [showInsufficientPulses, setShowInsufficientPulses] = useState(false);
  const [pulseResultData, setPulseResultData] = useState<{
    results: boolean[];
    required: number;
    achieved: number;
  } | null>(null);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRunning = useRef(false);
  const lockedRef = useRef(false);
  const [showSystemRestored, setShowSystemRestored] = useState<string | null>(null);
  const [showCompletionScene, setShowCompletionScene] = useState(false);
  const [completionText, setCompletionText] = useState('');
  const [firstTimeBonus, setFirstTimeBonus] = useState(false);
  const [elaborationMult, setElaborationMult] = useState(1);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // ── Animation state (grouped to reduce per-frame setState calls) ──
  // beamState: heads, headColor, trails, beamState.branchTrails, beamState.voidPulse, phase, beamState.litWires
  const [beamState, setBeamState] = useState<BeamState>(BEAM_INITIAL);
  // pieceAnimState: flashing, animations, gates, pieceAnimState.failColors, locked
  const [pieceAnimState, setPieceAnimState] = useState<PieceAnimState>(PIECE_ANIM_INITIAL);
  // chargeState: pos, progress
  const [chargeState, setChargeState] = useState<ChargeState>(CHARGE_INITIAL);

  // Lock ring anchor (Prompt 99A). Replaces the per-tick lockRings
  // array. Mounted at lock-phase start, cleared at lock-phase end.
  // Ring radius/opacity are interpolated from lockRingProgressAnim
  // on the native thread.
  const [lockRingCenter, setLockRingCenter] = useState<{ x: number; y: number } | null>(null);
  const [tapeCellHighlights, setTapeCellHighlights] = useState<
    Map<string, TapeHighlight>
  >(new Map());
  const [tapeBarState, setTapeBarState] = useState<TapeIndicatorBarState>(TAPE_BAR_INITIAL);
  const [glowTravelerState, setGlowTravelerState] = useState<GlowTravelerState>(GLOW_TRAVELER_INITIAL);
  // Native-driveable Animated.Values for the glow traveler (transform + opacity).
  const glowTravelerX = useRef(new RNAnimated.Value(0)).current;
  const glowTravelerY = useRef(new RNAnimated.Value(0)).current;
  const glowTravelerScale = useRef(new RNAnimated.Value(1)).current;
  const glowTravelerOpacity = useRef(new RNAnimated.Value(0)).current;
  // Drives the beam SVG group's opacity. Dims to 0.3 while a tape
  // piece is processing, brightens back to 1 when ready to advance —
  // the "Rube Goldberg energy flow" feel from Prompt 91, Fix 5.
  const beamOpacity = useRef(new RNAnimated.Value(1)).current;
  // Prompt 99A — phase progress Animated.Values. Allocated once and
  // reused across pulses (PERFORMANCE_CONTRACT 5.4.2). Driven on the
  // native thread (useNativeDriver: true) so charge/lock/void burst
  // animations don't burn JS-thread cycles. The chargeAnim / lockAnim
  // / voidPulseAnim handles are stored on the EngagementContext via
  // assignment so the next phase invocation can `.stop()` an in-flight
  // animation cleanly (mirrors the existing beamOpacityAnim pattern).
  const chargeProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const lockRingProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const voidPulseRingProgressAnim = useRef(new RNAnimated.Value(0)).current;
  // Visual override for the Data Trail and Output Tape during beam phase.
  // machineState holds the post-engage values, but we want cells to pop in
  // as their writes animate. When null, rendering falls through to
  // machineState.
  const [visualTrailOverride, setVisualTrailOverride] = useState<
    (number | null)[] | null
  >(null);
  const [visualOutputOverride, setVisualOutputOverride] = useState<
    number[] | null
  >(null);

  const [currentPulseIndex, setCurrentPulseIndex] = useState(0);
  // Per-slot RAF id Map (Prompt 94, Fix 2). Key `null` = main beam +
  // charge/lock; keys `0` / `1` = Splitter branches. Pre-Fix 2 this
  // was a single `number | null`, which let Splitter branches
  // overwrite each other's frame id.
  const animFrameRef = useRef<Map<number | null, number | null>>(
    new Map(),
  );
  const loopingRef = useRef(false);
  const flashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Tape-interaction safety timers (Prompt 95, Fix 7). Held in a
  // separate bucket from flashTimersRef so the per-pulse sweep
  // (Prompt 94, Fix 1) doesn't accidentally clear an in-flight
  // 8 s "force-resume" timer that straddles a pulse boundary.
  // Cleared on full unmount / handleReset / completion CONTINUE.
  const safetyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Per-pulse gate outcome: 'passed' or 'blocked'. Drives OUT tape
  // gate-outcome coloring. Cleared at replay-iteration start and on
  // cleanup. (Prompt 84C.)
  const gateOutcomesRef = useRef<GateOutcomeMap>(new Map());
  // Counts pulses that reached Terminal with success during handleEngage.
  // Read by the live pulse counter; reset at the start of each run.
  const terminalSuccessCountRef = useRef(0);
  const cacheRef = useRef<MeasurementCache>({
    board: { x: 0, y: 0 },
    input: null,
    trail: null,
    output: null,
  });

  // Screen is immediately visible — slide_from_bottom handles entry transition
  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Derived (all hooks must be above the early return) ──
  const level = currentLevel;

  // Memoized A1-1 spotlight cells fed to TutorialHUDOverlay. The
  // inline `.filter(...).map(...)` expression at the JSX site
  // allocated a new array every parent render even when the overlay
  // was unmounted; combined with the new targetRefs identity below,
  // it churned the overlay's effect graph on every run-loop tick.
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

  // ── Daily challenge one-attempt enforcement ──
  const isDailyChallenge = level?.sector === 'daily';
  useEffect(() => {
    if (!isDailyChallenge || !level) return;
    const dateStr = level.id.replace('daily_', '');
    AsyncStorage.setItem(`axiom_daily_${dateStr}_attempted`, '1');
  }, [level?.id]);

  // ── Economy intro on first non-Axiom level ──
  useEffect(() => {
    if (!level || level.sector === 'axiom') return;
    AsyncStorage.getItem('axiom_economy_intro_seen').then(seen => {
      if (!seen) setShowEconomyIntro(true);
    });
  }, [level?.id]);

  // ── Level budget setup (skip on Axiom tutorial levels) ──
  useEffect(() => {
    setBlownCells(new Set());
    setFailCount(0);
    if (!level) return;
    if (level.sector === 'axiom') return; // free pieces on tutorial
    setLevelBudget(level.budget ?? 0);
    return () => resetLevelBudget();
  }, [level?.id]);

  useEffect(() => { blownCellsRef.current = blownCells; }, [blownCells]);

  // ── Tutorial hints setup (suppress when level has been beaten before) ──
  const isLevelPreviouslyCompleted = level ? isLevelDone(level.id) : false;
  const isAxiomLevel = level?.sector === 'axiom';

  // ── Tutorial active derivation (matches overlay render gate) ──
  const tutorialIsActive =
    !tutorialComplete &&
    !tutorialSkipped &&
    !isLevelPreviouslyCompleted &&
    level?.sector === 'axiom' &&
    (level?.tutorialSteps?.length ?? 0) > 0;

  const tutorialIsActiveRef = useRef(tutorialIsActive);
  useEffect(() => {
    tutorialIsActiveRef.current = tutorialIsActive;
  }, [tutorialIsActive]);


  // ── Elapsed timer ──
  useEffect(() => {
    if (!level) return;
    setElapsedSeconds(0);
    lockedRef.current = false;
    timerRunning.current = true;
    timerRef.current = setInterval(() => {
      if (timerRunning.current && !tutorialIsActiveRef.current) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      timerRunning.current = false;
    };
  }, [level?.id]);

  // ── Cleanup beam animation on unmount ──
  useEffect(() => {
    return () => {
      // Walk the per-slot RAF Map and cancel every in-flight frame
      // (Prompt 94, Fix 2). Pre-Fix 2 the ref held a single id and
      // we missed any frame the second Splitter branch had written.
      animFrameRef.current.forEach(id => {
        if (id != null) cancelAnimationFrame(id);
      });
      animFrameRef.current.clear();
      flashTimersRef.current.forEach(t => clearTimeout(t));
      flashTimersRef.current = [];
      safetyTimersRef.current.forEach(t => clearTimeout(t));
      safetyTimersRef.current = [];
      loopingRef.current = false;
    };
  }, []);

  // ── Reset replay-loop flag on level change. Belt-and-suspenders:
  // launch screens use navigation.replace to force a fresh mount, but
  // if any code path ever leaves the Gameplay component mounted across
  // a level transition, this guarantees the post-completion replay
  // loop flag does not leak from one level into the next.
  useEffect(() => {
    loopingRef.current = false;
  }, [level?.id]);

  // ── Pause modal stops/resumes timer ──
  useEffect(() => {
    if (lockedRef.current) return;
    timerRunning.current = !showPauseModal;
  }, [showPauseModal]);

  // ── HUD tutorial overlay hydration ──
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

  useEffect(() => {
    if (!level || !isAxiomLevel || isLevelPreviouslyCompleted || !level.tutorialHints) return;
    if ((level.tutorialSteps?.length ?? 0) > 0) return;
    (async () => {
      const onMountHints: { key: string; text: string }[] = [];
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

  const triggerHints = useCallback(async (trigger: string) => {
    if (!level || !isAxiomLevel || isLevelPreviouslyCompleted || !level.tutorialHints) return;
    if (hintTriggered.current.has(trigger)) return;
    hintTriggered.current.add(trigger);
    const hints: { key: string; text: string }[] = [];
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
  }, [level, isAxiomLevel, isLevelPreviouslyCompleted, currentHint]);

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

  // Precompute per-piece animation props so the render loop doesn't
  // re-call pieceAnimState.animations.get(piece.id) eight times for
  // every piece on every render. This + React.memo(PieceIcon) cuts
  // the beam-animation re-render cost on device.
  const pieceAnimProps = useMemo(() => {
    const map = new Map<string, {
      animType: string | undefined;
      gateResult: 'pass' | 'block' | null;
      failColor: string | null;
    }>();
    for (const piece of pieces) {
      map.set(piece.id, {
        animType: pieceAnimState.animations.get(piece.id),
        gateResult: pieceAnimState.gates.get(piece.id) ?? null,
        failColor: pieceAnimState.failColors.get(piece.id) ?? null,
      });
    }
    return map;
  }, [pieces, pieceAnimState.animations, pieceAnimState.gates, pieceAnimState.failColors]);

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
  const handlePieceTap = useCallback((piece: PlacedPiece) => {
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses) return;
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
  }, [isExecuting, showResults, showVoid, rotatePiece, updatePiece]);

  // ── Long press returns piece to tray (no ghost/held state) ──
  const handlePieceLongPress = useCallback((piece: PlacedPiece) => {
    if (piece.isPrePlaced) return;
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses) return;
    deletePiece(piece.id);
  }, [isExecuting, showResults, showVoid, deletePiece]);

  // ── Helper: get piece center in canvas coords ──
  const getPieceCenter = useCallback((pieceId: string) => {
    const p = machineState.pieces.find(pc => pc.id === pieceId);
    if (!p) return null;
    return {
      x: p.gridX * CELL_SIZE + CELL_SIZE / 2,
      y: p.gridY * CELL_SIZE + CELL_SIZE / 2,
    };
  }, [machineState.pieces]);

  const findBlownPiece = useCallback((
    failureType: 'void' | 'wrongOutput',
    steps: ExecutionStep[],
  ): PlacedPiece | null => {
    const allPieces = useGameStore.getState().machineState.pieces;
    let candidate: PlacedPiece | null = null;

    if (failureType === 'wrongOutput') {
      candidate = allPieces.find(p => p.type === 'transmitter') ?? null;
    } else {
      for (let i = steps.length - 1; i >= 0; i--) {
        const piece = allPieces.find(p => p.id === steps[i].pieceId);
        if (piece) { candidate = piece; break; }
      }
    }

    if (!candidate) return null;

    if (candidate.isPrePlaced) {
      const playerPieces = allPieces.filter(p =>
        !p.isPrePlaced && !blownCells.has(`${p.gridX},${p.gridY}`)
      );
      if (playerPieces.length === 0) return null;
      let nearest = playerPieces[0];
      let bestDist = Math.abs(nearest.gridX - candidate.gridX) + Math.abs(nearest.gridY - candidate.gridY);
      for (let i = 1; i < playerPieces.length; i++) {
        const d = Math.abs(playerPieces[i].gridX - candidate.gridX) + Math.abs(playerPieces[i].gridY - candidate.gridY);
        if (d < bestDist) { bestDist = d; nearest = playerPieces[i]; }
      }
      return nearest;
    }

    if (blownCells.has(`${candidate.gridX},${candidate.gridY}`)) return null;
    return candidate;
  }, [blownCells]);

  const getBlownCellCOGSLine = (blownCount: number): string | null => {
    if (blownCount === 0) return null;
    if (blownCount === 1) return '"The board took damage. That cell is no longer available. Route around it."';
    if (blownCount === 2) return '"Another cell lost. The board is becoming... constrained."';
    return '"I would recommend fewer failed attempts."';
  };

  // ── Engage handler ──
  const handleEngage = useCallback(async () => {
    if (isExecuting || !level) return;
    triggerHints('onEngage');
    // Reset beam dim back to fully bright at the start of every run so
    // a previous level's mid-pause dim state never carries over
    // (Prompt 91, Fix 5).
    beamOpacity.setValue(1);
    // Stop the elapsed timer at the moment ENGAGE is pressed (lock state).
    timerRunning.current = false;
    lockedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const lockedElapsed = elapsedSeconds;
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
      setBeamState,
      setPieceAnimState,
      setChargeState,
      setLockRingCenter,
      setTapeCellHighlights,
      setTapeBarState,
      setGlowTravelerState,
      valueTravelRefs: {
        x: glowTravelerX,
        y: glowTravelerY,
        scale: glowTravelerScale,
        opacity: glowTravelerOpacity,
      },
      gateOutcomes: gateOutcomesRef,
      setVisualTrailOverride,
      setVisualOutputOverride,
      setCurrentPulseIndex,
      currentPulseRef,
      animFrameRef,
      flashTimersRef,
      safetyTimersRef,
      beamOpacity,
      chargeProgressAnim,
      chargeAnim: null,
      lockRingProgressAnim,
      lockAnim: null,
      voidPulseRingProgressAnim,
      voidPulseAnim: null,
      boardGridRef,
      inputTapeCellsRef,
      dataTrailCellsRef,
      outputTapeCellsRef,
      loopingRef,
      wires,
      inputTape: level.inputTape,
      cacheRef,
    };

    // Reset the measurement cache for this run.
    cacheRef.current = { board: { x: 0, y: 0 }, input: null, trail: null, output: null };

    // Initialize progressive-reveal overrides for trail and output cells.
    // During beam animation these show empty until a Scanner / Transmitter
    // visually writes them; at lock they fall through to machineState.
    if (level.dataTrail.cells.length > 0) {
      setVisualTrailOverride(level.dataTrail.cells.map(() => null));
    }
    if (level.inputTape && level.inputTape.length > 0) {
      setVisualOutputOverride(level.inputTape.map(() => -1));
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
    const [input0, trail0, output0] = await Promise.all([
      measureTapeContainer(inputTapeCellsRef),
      measureTapeContainer(dataTrailCellsRef),
      measureTapeContainer(outputTapeCellsRef),
    ]);
    cacheRef.current = { board: board0, input: input0, trail: trail0, output: output0 };

    // PHASE 2 — BEAM (one or more pulses)
    setBeamState(prev => ({ ...prev, phase: 'beam' }));
    // Reset the live terminal-success counter for this run. Read by
    // the pulse HUD to show "REACHED: X / N" progress.
    terminalSuccessCountRef.current = 0;
    for (let p = 0; p < pulses.length; p++) {
      currentPulseRef.current = p;
      setCurrentPulseIndex(p);
      // Per-pulse flash-timer sweep (Prompt 94, Fix 1). flashPiece /
      // triggerPieceAnim / the tape-pause safety timer all push
      // setTimeout handles into flashTimersRef during a pulse.
      // Without this sweep the array grows unbounded across the run
      // — on long puzzles that pile of orphaned timers compounds
      // into the per-pulse lag Tucker reported.
      flashTimersRef.current.forEach(t => clearTimeout(t));
      flashTimersRef.current = [];
      // Cancelling the timers also kills the deferred cleanup that
      // would have removed entries from flashing / animations / gates.
      // Reset those Maps explicitly here so the terminal-piece purple
      // flash clears and PieceIcon re-triggers piece animations on
      // pulses 2+ (mirrors replayLoop.ts:52-57).
      setPieceAnimState(prev => ({
        ...prev,
        flashing: new Map(),
        animations: new Map(),
        gates: new Map(),
      }));
      await engageRunPulse(ctx, pulses[p]);

      const pulseReachedTerminal = pulses[p].some(
        s => s.type === 'terminal' && s.success,
      );
      if (pulseReachedTerminal) {
        terminalSuccessCountRef.current += 1;
      }

      if (p < pulses.length - 1) {
        if (sourcePiece) engageFlashPiece(ctx, sourcePiece.id, '#F0B429');
        await new Promise(r => setTimeout(r, 80));
      }
    }
    // Beam complete — fall through to machineState-driven rendering.
    setVisualTrailOverride(null);
    setVisualOutputOverride(null);
    setTapeCellHighlights(new Map());
    setTapeBarState(TAPE_BAR_INITIAL);
    resetGlowTraveler({ x: glowTravelerX, y: glowTravelerY, scale: glowTravelerScale, opacity: glowTravelerOpacity });
    setGlowTravelerState(GLOW_TRAVELER_INITIAL);
    gateOutcomesRef.current.clear();

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

      // Post-completion beam replay loop — visual only, no re-scoring.
      setBeamState(prev => ({ ...prev, phase: 'lock' }));
      loopingRef.current = true;
      const terminalPieceId = machineState.pieces.find(pc => pc.type === 'terminal')?.id ?? null;
      void runReplayLoop({
        ctx,
        pulses,
        sourcePieceId: sourcePiece?.id ?? null,
        terminalPieceId,
        dataTrailCellsLength: level.dataTrail.cells.length,
        inputTapeLength: level.inputTape?.length ?? 0,
        getBoardScreenPos,
        measureTapeContainer,
      });
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
    loopingRef.current = false;
    setShowResults(false);
    setShowVoid(false);
    // Cancel beam animation and clear all visual signal state.
    // Walks the per-slot RAF Map (Prompt 94, Fix 2) so Splitter
    // branches can't leave orphaned frames after a reset.
    animFrameRef.current.forEach(id => {
      if (id != null) cancelAnimationFrame(id);
    });
    animFrameRef.current.clear();
    setTapeCellHighlights(new Map());
    setTapeBarState(TAPE_BAR_INITIAL);
    resetGlowTraveler({ x: glowTravelerX, y: glowTravelerY, scale: glowTravelerScale, opacity: glowTravelerOpacity });
    setGlowTravelerState(GLOW_TRAVELER_INITIAL);
    gateOutcomesRef.current.clear();
    setVisualTrailOverride(null);
    setVisualOutputOverride(null);
    flashTimersRef.current.forEach(t => clearTimeout(t));
    flashTimersRef.current = [];
    safetyTimersRef.current.forEach(t => clearTimeout(t));
    safetyTimersRef.current = [];
    setBeamState(BEAM_INITIAL);
    setPieceAnimState(PIECE_ANIM_INITIAL);
    setChargeState(CHARGE_INITIAL);
    setLockRingCenter(null);
    chargeProgressAnim.setValue(0);
    lockRingProgressAnim.setValue(0);
    voidPulseRingProgressAnim.setValue(0);
    setCurrentPulseIndex(0);
    setShowInsufficientPulses(false);
    setPulseResultData(null);
    terminalSuccessCountRef.current = 0;
    reset();
    // Restart the elapsed timer from zero.
    setElapsedSeconds(0);
    lockedRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (timerRunning.current && !tutorialIsActiveRef.current) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    timerRunning.current = true;
  }, [reset]);

  // ── Debug ──
  const handleDebug = useCallback(() => {
    setShowVoid(false);
    setDebugMode(true);
  }, [setDebugMode]);

  // ── Star rendering ──
  const renderStars = (count: number) => {
    return [1, 2, 3].map(i => (
      <Animated.View
        key={i}
        entering={FadeInUp.delay(i * 200).duration(400)}
      >
        <Svg width={40} height={40} viewBox="0 0 24 24">
          <Path
            d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"
            fill={i <= count ? Colors.amber : 'rgba(74,158,255,0.15)'}
            stroke={i <= count ? Colors.copper : 'rgba(74,158,255,0.3)'}
            strokeWidth="1"
          />
        </Svg>
      </Animated.View>
    ));
  };

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
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.pauseBtn}
            activeOpacity={0.7}
            onPress={() => setShowPauseModal(true)}
          >
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.sectorTag}>{level.sector === 'axiom' ? 'THE AXIOM' : level.sector.toUpperCase()}</Text>
            <Text style={styles.levelTag}>{level.id}</Text>
            <Text style={styles.levelName}>{level.systemRepaired ? level.systemRepaired.toUpperCase() : level.name}</Text>
            {!showResults && !showVoid && !tutorialIsActive && (
              <Text style={styles.timerText}>{formatMMSS(elapsedSeconds)}</Text>
            )}
            {level.inputTape && level.inputTape.length > 0 && beamState.phase === 'beam' && (
              <Text style={styles.pulseCounterText}>
                PULSE {Math.min(currentPulseIndex + 1, level.inputTape.length)} / {level.inputTape.length}
                {level.requiredTerminalCount && level.requiredTerminalCount > 1
                  ? ` — REACHED: ${terminalSuccessCountRef.current} / ${level.requiredTerminalCount}`
                  : ''}
              </Text>
            )}
          </View>
          {/* Spacer to balance pause button width for centering */}
          <View style={{ width: 36 }} />
        </View>

        {/* ── Turing Tape Display ── */}
        {level.inputTape && level.inputTape.length > 0 && (
          <View collapsable={false} style={styles.tapeSection}>
            <View ref={inputTapeRowRef} collapsable={false} style={styles.tapeRow}>
              <Text style={styles.tapeLabel} numberOfLines={1}>IN</Text>
              {tapeBarState.inIndex !== null && (
                <Animated.View
                  style={[
                    styles.tapeIndicatorBar,
                    {
                      backgroundColor: Colors.tapeInBar,
                      transform: [{ translateX: tapeBarState.inIndex * (24 + 3) }],
                      shadowColor: Colors.tapeInBar,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 12,
                    },
                  ]}
                />
              )}
              <View style={styles.tapeCells}>
                {level.inputTape.map((bit, i) => {
                  const isActive = beamState.phase === 'beam' && i === currentPulseIndex;
                  const isPast = beamState.phase === 'beam' && i < currentPulseIndex;
                  const isFuture = beamState.phase === 'beam' && i > currentPulseIndex;
                  // Pre-beam "next" marker — cell 0 gets the head
                  // indicator while the machine is idle / charging so
                  // the player knows which cell fires first.
                  const isPreBeamNext =
                    (beamState.phase === 'idle' || beamState.phase === 'charge') && i === 0;
                  const highlight = tapeCellHighlights.get(`in-${i}`);
                  return (
                    <View key={`in-${i}`} style={styles.tapeCellWrap}>
                      <View style={[styles.tapeHead, !(isActive || isPreBeamNext) && { opacity: 0 }]} />
                      <View
                        ref={i === 0 ? inputTapeCellsRef : undefined}
                        collapsable={false}
                        style={[
                          styles.tapeCell,
                          styles.tapeCellIn,
                          isActive && styles.tapeCellInActive,
                          isPast && styles.tapeCellPast,
                          isFuture && { opacity: 0.55 },
                          highlight === 'read' && styles.tapeCellHighlightRead,
                          highlight === 'write' && styles.tapeCellHighlightWrite,
                          highlight === 'gate-pass' && styles.tapeCellHighlightGatePass,
                          highlight === 'gate-block' && styles.tapeCellHighlightGateBlock,
                          highlight === 'departing' && styles.tapeCellHighlightDeparting,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tapeCellText,
                            styles.tapeCellTextIn,
                            isActive && styles.tapeCellTextInActive,
                            isPast && styles.tapeCellTextInPast,
                          ]}
                        >
                          {bit}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            {/* Data Trail strip (inside tape section for tape levels) */}
            {level.dataTrail.cells.length > 0 && (
              <View ref={dataTrailRowRef} collapsable={false} style={styles.tapeRow}>
                <Text style={styles.tapeLabel} numberOfLines={1}>TRAIL</Text>
                {tapeBarState.trailIndex !== null && (
                  <Animated.View
                    style={[
                      styles.tapeIndicatorBar,
                      {
                        backgroundColor: Colors.tapeTrailBar,
                        transform: [{ translateX: tapeBarState.trailIndex * (24 + 3) }],
                        shadowColor: Colors.tapeTrailBar,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.6,
                        shadowRadius: 12,
                      },
                    ]}
                  />
                )}
                <View style={styles.tapeCells}>
                  {machineState.dataTrail.cells.map((rawCell, i) => {
                    const cell = visualTrailOverride ? visualTrailOverride[i] : rawCell;
                    const isHead = i === machineState.dataTrail.headPosition;
                    const highlight = tapeCellHighlights.get(`trail-${i}`);
                    return (
                      <View key={`trail-${i}`} style={styles.tapeCellWrap}>
                        <View style={[styles.tapeHead, { opacity: 0 }]} />
                        <View
                          ref={i === 0 ? dataTrailCellsRef : undefined}
                          collapsable={false}
                          style={[
                            styles.tapeCell,
                            isHead && { borderColor: Colors.neonGreen, backgroundColor: 'rgba(0,255,135,0.08)' },
                            highlight === 'read' && styles.tapeCellHighlightRead,
                            highlight === 'write' && styles.tapeCellHighlightWrite,
                            highlight === 'gate-pass' && styles.tapeCellHighlightGatePass,
                            highlight === 'gate-block' && styles.tapeCellHighlightGateBlock,
                          ]}
                        >
                          <Text style={[styles.tapeCellText, { color: Colors.neonGreen }, isHead && { fontWeight: 'bold' as const }, cell === null && { opacity: 0.2 }]}>
                            {cell === null ? '\u00B7' : cell}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            {/* OUT tape only renders when the level has a Transmitter (introduced A1-7) */}
            {(level.availablePieces.includes('transmitter') ||
              level.prePlacedPieces.some(p => p.type === 'transmitter')) && (
            <View ref={outputTapeRowRef} collapsable={false} style={styles.tapeRow}>
              <Text style={styles.tapeLabel} numberOfLines={1}>OUT</Text>
              {tapeBarState.outIndex !== null && (
                <Animated.View
                  style={[
                    styles.tapeIndicatorBar,
                    {
                      backgroundColor: Colors.tapeOutBar,
                      transform: [{ translateX: tapeBarState.outIndex * (24 + 3) }],
                      shadowColor: Colors.tapeOutBar,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 12,
                    },
                  ]}
                />
              )}
              <View style={styles.tapeCells}>
                {level.inputTape.map((_, i) => {
                  const rawWritten = visualOutputOverride
                    ? visualOutputOverride[i]
                    : machineState.outputTape?.[i];
                  const written = rawWritten;
                  // Gate-outcome coloring (Prompt 84C): green when the
                  // pulse passed through the Config Node, red when it
                  // was blocked. -2 is the "blocked" sentinel written
                  // into visualOutputOverride by runConfigNodeInteraction.
                  const isBlocked = rawWritten === -2;
                  const hasValue =
                    written !== undefined && written !== -1 && written !== -2;
                  const outcome = gateOutcomesRef.current.get(i);
                  const gatePassed = outcome === 'passed';
                  const gateBlocked = outcome === 'blocked' || isBlocked;

                  return (
                    <View key={`out-${i}`} style={styles.tapeCellWrap}>
                      <View style={[styles.tapeHead, { opacity: 0 }]} />
                      <View
                        ref={i === 0 ? outputTapeCellsRef : undefined}
                        collapsable={false}
                        style={[
                          styles.tapeCell,
                          gatePassed && styles.tapeCellGatePassed,
                          gateBlocked && styles.tapeCellGateBlocked,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tapeCellText,
                            gatePassed && styles.tapeCellTextGatePassed,
                            gateBlocked && styles.tapeCellTextGateBlocked,
                          ]}
                        >
                          {gatePassed && hasValue
                            ? written
                            : gateBlocked
                              ? '\u00B7'
                              : '_'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
            )}
            {level.requiredTerminalCount && level.requiredTerminalCount > 1 &&
             !isExecuting && !showResults && !showVoid && !showWrongOutput && !showInsufficientPulses && (
              <View style={styles.pulseTargetRow}>
                <Text style={styles.pulseTargetText}>
                  TARGET: {level.requiredTerminalCount} OF {level.inputTape?.length ?? '?'} PULSES MUST REACH TERMINAL
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Trail-only display (non-tape levels with Data Trail, e.g. A1-3) ── */}
        {!level.inputTape && level.dataTrail.cells.length > 0 && (
          <View collapsable={false} style={styles.tapeSection}>
            <View ref={dataTrailRowRef} collapsable={false} style={styles.tapeRow}>
              <Text style={styles.tapeLabel} numberOfLines={1}>TRAIL</Text>
              <View style={styles.tapeCells}>
                {machineState.dataTrail.cells.map((rawCell, i) => {
                  const cell = visualTrailOverride ? visualTrailOverride[i] : rawCell;
                  const isHead = i === machineState.dataTrail.headPosition;
                  const highlight = tapeCellHighlights.get(`trail-${i}`);
                  return (
                    <View key={`trail-${i}`} style={styles.tapeCellWrap}>
                      <View style={[styles.tapeHead, { opacity: 0 }]} />
                      <View
                        ref={i === 0 ? dataTrailCellsRef : undefined}
                        collapsable={false}
                        style={[
                          styles.tapeCell,
                          isHead && { borderColor: Colors.neonGreen, backgroundColor: 'rgba(0,255,135,0.08)' },
                          highlight === 'read' && styles.tapeCellHighlightRead,
                          highlight === 'write' && styles.tapeCellHighlightWrite,
                          highlight === 'gate-pass' && styles.tapeCellHighlightGatePass,
                          highlight === 'gate-block' && styles.tapeCellHighlightGateBlock,
                        ]}
                      >
                        <Text style={[styles.tapeCellText, { color: Colors.neonGreen }, isHead && { fontWeight: 'bold' as const }, cell === null && { opacity: 0.2 }]}>
                          {cell === null ? '\u00B7' : cell}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
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
            {/* Dot grid */}
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

              {/* Wires — only on Axiom tutorial levels */}
              {wires.map(wire => {
                const fromPiece = pieceById.get(wire.fromPieceId);
                const toPiece = pieceById.get(wire.toPieceId);
                if (!fromPiece || !toPiece) return null;

                const fx = fromPiece.gridX * CELL_SIZE + CELL_SIZE / 2;
                const fy = fromPiece.gridY * CELL_SIZE + CELL_SIZE / 2;
                const tx = toPiece.gridX * CELL_SIZE + CELL_SIZE / 2;
                const ty = toPiece.gridY * CELL_SIZE + CELL_SIZE / 2;

                const isProtocol = fromPiece.category === 'protocol' || toPiece.category === 'protocol';
                const wireColor = isProtocol ? Colors.amber : Colors.blue;
                const wireSW = Math.max(2, CELL_SIZE / 18);
                const dashOn = Math.round(CELL_SIZE / 5);
                const dashOff = Math.round(CELL_SIZE / 8);

                const wireKey = `${wire.fromPieceId}_${wire.toPieceId}`;
                const isLit = beamState.litWires.has(wireKey);
                const isLocked = beamState.phase === 'lock' && pieceAnimState.locked.size > 0;
                const strokeC = isLocked ? '#00C48C' : isLit ? getBeamColor(toPiece.type) : wireColor;
                const strokeOp = isLocked ? 0.45 : isLit ? 0.85 : 0.5;
                const sw = isLit || isLocked ? wireSW * 1.6 : wireSW;

                return (
                  <Line
                    key={wire.id}
                    x1={fx} y1={fy} x2={tx} y2={ty}
                    stroke={strokeC}
                    strokeWidth={sw}
                    strokeDasharray={isLit || isLocked ? undefined : `${dashOn},${dashOff}`}
                    strokeOpacity={strokeOp}
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>

            {/* Signal beam overlay — wrapped in View so pointerEvents
                component prop reliably passes touches through on iOS.
                The inner RNAnimated.View carries `beamOpacity` so the
                beam can dim during tape-piece processing (Prompt 91,
                Fix 5). useNativeDriver: true is supported because we
                only animate opacity. */}
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
            >
            <RNAnimated.View
              style={[StyleSheet.absoluteFill, { opacity: beamOpacity }]}
              pointerEvents="none"
            >
            <Svg
              width={gridW}
              height={gridH}
              style={StyleSheet.absoluteFill}
            >
              {beamState.phase === 'charge' && chargeState.pos && (
                <>
                  {/* Prompt 99A — chargeProgressAnim drives ring radius
                      and opacity natively. The ring values match the
                      pre-99A formulas (r = 6 + p*18 / 2 + p*26;
                      opacity = 0.8 * (1-p) / 0.5 * (1-p)). */}
                  <AnimatedCircle
                    cx={chargeState.pos.x} cy={chargeState.pos.y}
                    r={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 24] }) as unknown as number}
                    fill="none" stroke="#8B5CF6" strokeWidth={2}
                    opacity={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }) as unknown as number}
                  />
                  <AnimatedCircle
                    cx={chargeState.pos.x} cy={chargeState.pos.y}
                    r={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 28] }) as unknown as number}
                    fill="none" stroke="#8B5CF6" strokeWidth={1.5}
                    opacity={chargeProgressAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) as unknown as number}
                  />
                </>
              )}
              {/* Pre-fork trail segments */}
              {beamState.trails.map((seg, i) => (
                seg.points.length > 1 ? (
                  <Polyline
                    key={`seg-${i}`}
                    points={seg.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={i === beamState.trails.length - 1 ? 2.5 : 2}
                    strokeLinecap="round"
                    opacity={i === beamState.trails.length - 1 ? 0.72 : 0.45}
                  />
                ) : null
              ))}
              {/* Fork branch trail segments */}
              {beamState.branchTrails.map((branch, bi) =>
                branch.map((seg, si) => (
                  seg.points.length > 1 ? (
                    <Polyline
                      key={`br-${bi}-${si}`}
                      points={seg.points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={si === branch.length - 1 ? 2.5 : 2}
                      strokeLinecap="round"
                      opacity={si === branch.length - 1 ? 0.72 : 0.45}
                    />
                  ) : null
                )),
              )}
              {beamState.heads.map((bh, bi) => (
                <G key={`bh-${bi}`}>
                  <Circle cx={bh.x} cy={bh.y} r={11} fill={beamState.headColor} opacity={0.25} />
                  <Circle cx={bh.x} cy={bh.y} r={3.5} fill="white" opacity={0.95} />
                </G>
              ))}
              {beamState.voidPulse && (
                <Circle
                  cx={beamState.voidPulse.x} cy={beamState.voidPulse.y} r={beamState.voidPulse.r}
                  stroke="#FF3B3B" strokeWidth={2.5}
                  fill="none" opacity={beamState.voidPulse.opacity}
                />
              )}
              {/* Prompt 99A — lock rings driven by lockRingProgressAnim
                  on the native thread. Two rings, the second offset by
                  100ms within a 320ms total animation. The second ring
                  encodes its 100ms delay as a flat-then-rising
                  inputRange (output stays at 6 / opacity 0 until
                  progress reaches 100/320 = 0.3125, then rises). Total
                  visible window for each ring is 200ms (200/320 =
                  0.625 progress span). */}
              {lockRingCenter && (
                <>
                  <AnimatedCircle
                    cx={lockRingCenter.x} cy={lockRingCenter.y}
                    r={lockRingProgressAnim.interpolate({
                      inputRange: [0, 0.625, 1],
                      outputRange: [6, 42, 42],
                    }) as unknown as number}
                    stroke="#00C48C" strokeWidth={2.5} fill="none"
                    opacity={lockRingProgressAnim.interpolate({
                      inputRange: [0, 0.625, 1],
                      outputRange: [0.95, 0, 0],
                    }) as unknown as number}
                  />
                  <AnimatedCircle
                    cx={lockRingCenter.x} cy={lockRingCenter.y}
                    r={lockRingProgressAnim.interpolate({
                      inputRange: [0, 0.3125, 0.9375, 1],
                      outputRange: [6, 6, 42, 42],
                    }) as unknown as number}
                    stroke="#00C48C" strokeWidth={2.5} fill="none"
                    opacity={lockRingProgressAnim.interpolate({
                      inputRange: [0, 0.3125, 0.9375, 1],
                      outputRange: [0, 0.95, 0, 0],
                    }) as unknown as number}
                  />
                </>
              )}
            </Svg>
            </RNAnimated.View>
            </View>

            {/* Pieces */}
            {pieces.map(piece => {
              const isPrePlaced = piece.isPrePlaced;
              const isSource = piece.type === 'source';
              const isOutput = piece.type === 'terminal';
              const isPrePlacedScanner = isPrePlaced && piece.type === 'scanner';
              const pieceSize = CELL_SIZE - 4;
              const offset = (CELL_SIZE - pieceSize) / 2;
              const cellPx = piece.gridX * CELL_SIZE + offset;
              const cellPy = piece.gridY * CELL_SIZE + offset;
              const iconSize = (CELL_SIZE - 4) * 0.60;
              const iconColor = isSource ? '#F0B429' : isOutput ? '#00C48C' : getPieceColor(piece.type);
              const flashColorP = pieceAnimState.flashing.get(piece.id);
              const isLocked = pieceAnimState.locked.has(piece.id);
              const borderColorP = flashColorP ? flashColorP
                : isLocked ? '#00C48C'
                : undefined;
              const borderWidthP = flashColorP || isLocked ? 2 : 0;
              const shadowC = flashColorP ?? (isLocked ? '#00C48C' : undefined);

              return (
                <Pressable
                  key={piece.id}
                  ref={isSource ? sourceNodeRef : isOutput ? outputNodeRef : isPrePlacedScanner ? boardScannerRef : undefined}
                  style={[
                    styles.piece,
                    {
                      left: cellPx,
                      top: cellPy,
                      width: pieceSize,
                      height: pieceSize,
                      borderWidth: borderWidthP,
                      borderColor: borderColorP,
                      backgroundColor: 'transparent',
                      opacity: 1,
                      transform: [{ scale: 1 }],
                      zIndex: 0,
                      shadowColor: shadowC,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: shadowC ? (flashColorP ? 0.5 : 0.3) : 0,
                      shadowRadius: flashColorP ? 16 : isLocked ? 8 : 0,
                    },
                  ]}
                  onPress={() => handlePieceTap(piece)}
                  onLongPress={() => handlePieceLongPress(piece)}
                  delayLongPress={500}
                >
                  <View style={{ transform: [{ rotate: `${!isPrePlaced ? piece.rotation : 0}deg` }] }}>
                    {(() => {
                      const pap = pieceAnimProps.get(piece.id);
                      const animType = pap?.animType;
                      return (
                        <PieceIcon
                          type={piece.type}
                          size={iconSize}
                          color={iconColor}
                          spinning={animType === 'spinning'}
                          scanning={animType === 'scanning'}
                          transmitting={animType === 'transmitting'}
                          rolling={animType === 'rolling'}
                          splitting={animType === 'splitting'}
                          gating={animType === 'gating'}
                          gateResult={pap?.gateResult ?? null}
                          locking={animType === 'locking'}
                          charging={animType === 'charging'}
                          failColor={pap?.failColor ?? null}
                          configValue={piece.type === 'configNode' ? piece.configValue : undefined}
                          connectedMagnetSides={piece.type === 'splitter' ? piece.connectedMagnetSides : undefined}
                        />
                      );
                    })()}
                  </View>
                </Pressable>
              );
            })}

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
          <View style={styles.partsTray}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partsTrayInner}>
              {trayPieceTypes.map(pt => {
                const count = availableCounts[pt] || 0;
                const isActive = selectedPieceFromTray === pt;
                const color = getPieceColor(pt);
                const cost = isAxiomLevel ? 0 : getPieceCost(pt, discipline);
                const canAfford = cost === 0 || (useEconomyStore.getState().levelBudget - useEconomyStore.getState().levelSpent + useEconomyStore.getState().credits) >= cost;
                const measureRef =
                  pt === 'conveyor' ? trayConveyorRef
                  : pt === 'gear' ? trayGearRef
                  : pt === 'configNode' ? trayConfigNodeRef
                  : pt === 'splitter' ? traySplitterRef
                  : pt === 'scanner' ? traScannerRef
                  : pt === 'transmitter' ? trayTransmitterRef
                  : undefined;
                return (
                  // Wrap TouchableOpacity in a non-collapsable View so the
                  // tutorial overlay's .measure() call returns the actual
                  // tray-piece bounds. TouchableOpacity refs are unreliable
                  // for measure() across platforms; a wrapping View with
                  // collapsable={false} forces the native view to exist.
                  <View key={pt} ref={measureRef} collapsable={false}>
                  <TouchableOpacity
                    style={[
                      styles.trayItem,
                      isActive && { borderColor: color, backgroundColor: `${color}15` },
                    ]}
                    onPress={() => {
                      selectFromTray(isActive ? null : pt);
                    }}
                    activeOpacity={0.7}
                    disabled={count <= 0}
                    accessibilityLabel={`${PIECE_LABELS[pt]}, ${count} available`}
                  >
                    <View style={{ opacity: count > 0 && canAfford ? 1 : 0.3 }}>
                      <PieceIcon type={pt} size={22} color={color} />
                    </View>
                    <View style={[styles.trayBadge, { backgroundColor: count > 0 ? color : Colors.dim }]}>
                      <Text style={styles.trayBadgeText}>{count}</Text>
                    </View>
                    {cost > 0 && (
                      <Text style={[styles.trayCost, { color: canAfford ? Colors.amber : 'rgba(224,85,85,0.7)' }]}>{cost} CR</Text>
                    )}
                  </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
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

        {/* ── Economy Intro (first non-Axiom level) ── */}
        {showEconomyIntro && (
          <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
            <LinearGradient
              colors={['rgba(6,9,15,0.97)', 'rgba(10,22,40,0.99)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <CogsAvatar size="medium" state="online" />
              <Text style={{
                fontFamily: Fonts.exo2, fontSize: 14, fontStyle: 'italic',
                color: Colors.starWhite, lineHeight: 22, textAlign: 'center',
                marginTop: Spacing.xl, maxWidth: 300,
              }}>
                The Axiom is repaired. The training protocols are behind you. Pieces cost Credits here. You have been accumulating them. Spend wisely.
              </Text>
              <TouchableOpacity
                style={{ marginTop: Spacing.xxl }}
                onPress={async () => {
                  await AsyncStorage.setItem('axiom_economy_intro_seen', '1');
                  setShowEconomyIntro(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim, letterSpacing: 3 }}>
                  TAP TO CONTINUE
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── System Restored Overlay ── */}
        {showSystemRestored && (
          <Animated.View style={styles.overlay} entering={FadeIn.duration(300)}>
            <LinearGradient
              colors={['rgba(6,9,15,0.96)', 'rgba(10,22,40,0.98)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <Text style={styles.systemRestoredText}>
                {showSystemRestored.toUpperCase()}{'\n'}RESTORED
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Post-completion CONTINUE (gates Results screen) ── */}
        {showCompletionCard && !showResults && (
          <View style={styles.completionContinueWrap} pointerEvents="box-none">
            <Button
              variant="primary"
              label="CONTINUE"
              onPress={() => {
                loopingRef.current = false;
                // Per-slot RAF cleanup (Prompt 94, Fix 2).
                animFrameRef.current.forEach(id => {
                  if (id != null) cancelAnimationFrame(id);
                });
                animFrameRef.current.clear();
                setTapeCellHighlights(new Map());
                setTapeBarState(TAPE_BAR_INITIAL);
                resetGlowTraveler({ x: glowTravelerX, y: glowTravelerY, scale: glowTravelerScale, opacity: glowTravelerOpacity });
                setGlowTravelerState(GLOW_TRAVELER_INITIAL);
                gateOutcomesRef.current.clear();
                setVisualTrailOverride(null);
                setVisualOutputOverride(null);
                setBeamState(prev => ({
                  ...prev,
                  heads: [],
                  trails: [],
                  branchTrails: [],
                  phase: 'idle',
                }));
                setLockRingCenter(null);
                setChargeState(prev => ({ ...prev, pos: null }));
                setShowCompletionCard(false);
                setShowResults(true);
              }}
              style={styles.completionContinueBtn}
            />
          </View>
        )}

        {/* ── Results Overlay (Success) ── */}
        {showResults && (
          <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
            <LinearGradient
              colors={['rgba(6,9,15,0.94)', 'rgba(10,22,40,0.98)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <View style={styles.starsRow}>{renderStars(scoreResult?.stars ?? stars)}</View>
              <Text style={styles.resultsTitle}>CIRCUIT COMPLETE</Text>
              <Text style={styles.resultsLevel}>{level.name}</Text>

              {/* Score breakdown strip — progressive reveal */}
              {scoreResult && (() => {
                const visible = level.scoringCategoriesVisible ?? ['efficiency'];
                const allCats: [ScoringCategory, string, number, number][] = [
                  ['efficiency', 'EFFICIENCY', scoreResult.breakdown.efficiency, 30],
                  ['protocolPrecision', 'PROTOCOL', scoreResult.breakdown.protocolPrecision, 25],
                  ['chainIntegrity', 'INTEGRITY', scoreResult.breakdown.chainIntegrity, 20],
                  ['disciplineBonus', 'DISCIPLINE', scoreResult.breakdown.disciplineBonus, 15],
                  ['speedBonus', 'SPEED', scoreResult.breakdown.speedBonus, 10],
                  ['elaboration', 'ELABORATION', scoreResult.breakdown.elaboration, 15],
                ];
                const shown = allCats.filter(([cat, , val]) => {
                  if (cat === 'elaboration') return val > 0 && level.sector !== 'axiom';
                  return visible.includes(cat);
                });
                return (
                  <View style={styles.scoreStrip}>
                    {shown.map(([, label, val, max]) => (
                      <View key={label} style={styles.scoreCell}>
                        <Text style={[
                          styles.scoreCellVal,
                          { color: val >= max ? '#4ecb8d' : val > 0 ? '#f0b429' : 'rgba(224,85,85,0.7)' },
                        ]}>{val}</Text>
                        <Text style={styles.scoreCellLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}

              {level.id === 'A1-8' && firstTimeBonus && (
                <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 9, color: '#4ecb8d', letterSpacing: 3, marginBottom: Spacing.md, textAlign: 'center' }}>
                  FULL SCORING UNLOCKED
                </Text>
              )}

              <View style={styles.cogsResultRow}>
                <CogsAvatar size="small" state="online" />
                <Text style={styles.resultsQuote}>
                  {'"'}{cogsScoreComment || 'Circuit complete.'}{'"'}
                  {firstTimeBonus ? '\n\n"Mission logged. 25 CR credited to your account."' : ''}
                  {elaborationMult > 1 ? `\n\nElaboration: ${elaborationMult.toFixed(1)}x credits` : ''}
                </Text>
              </View>
              <View style={styles.resultsActions}>
                <Button
                  variant="secondary"
                  label="REPLAY"
                  onPress={handleReset}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="gradient"
                  label="CONTINUE"
                  onPress={async () => {
                    // A1-3 discipline acknowledgment (first time only)
                    if (level.id === 'A1-3' && firstTimeBonus && discipline) {
                      const seen = await AsyncStorage.getItem('axiom_a13_discipline_seen');
                      if (!seen) {
                        await AsyncStorage.setItem('axiom_a13_discipline_seen', '1');
                        setShowResults(false);
                        setShowDisciplineCard(true);
                        return;
                      }
                    }
                    navigation.navigate('LevelSelect');
                  }}
                  style={{ flex: 2 }}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Wrong Output Diagnostic Modal ── */}
        {showWrongOutput && wrongOutputData && (
          <Animated.View style={styles.completionCardWrap} entering={FadeIn.duration(300)}>
            <View style={styles.wrongOutputCard}>
              <Text style={styles.wrongOutputTitle}>OUTPUT MISMATCH</Text>
              <View style={styles.wrongOutputSection}>
                <Text style={styles.wrongOutputLabel}>EXPECTED</Text>
                <View style={styles.wrongOutputRow}>
                  {wrongOutputData.expected.map((v, i) => {
                    const match = wrongOutputData.produced[i] === v;
                    return (
                      <View key={`exp-${i}`} style={[styles.wrongOutputCell, !match && styles.wrongOutputCellMismatch]}>
                        <Text style={[styles.wrongOutputCellText, !match && { color: '#EF4444' }]}>{v}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.wrongOutputSection}>
                <Text style={styles.wrongOutputLabel}>PRODUCED</Text>
                <View style={styles.wrongOutputRow}>
                  {wrongOutputData.produced.map((v, i) => {
                    const match = wrongOutputData.expected[i] === v;
                    const isEmpty = v === -1;
                    return (
                      <View key={`prod-${i}`} style={[styles.wrongOutputCell, !match && styles.wrongOutputCellMismatch]}>
                        <Text style={[styles.wrongOutputCellText, !match && { color: '#EF4444' }]}>
                          {isEmpty ? '_' : v}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <CogsAvatar size="small" state="online" />
                {/* COGS line pending Tucker approval */}
                <Text style={styles.wrongOutputCogsText}>
                  {"\""}The machine produced an answer. It was not the correct one. The data shows where.{"\""}
                </Text>
              </View>
              {blownCells.size > 0 && (
                <TouchableOpacity
                  style={[styles.wrongOutputRetryBtn, {
                    borderColor: credits >= 50 ? Colors.amber : Colors.dim,
                    opacity: credits >= 50 ? 1 : 0.5,
                    marginBottom: 8,
                  }]}
                  onPress={() => {
                    const ok = useEconomyStore.getState().spendDirect(50);
                    if (ok) {
                      setShowWrongOutput(false);
                      setWrongOutputData(null);
                      setBlownCells(new Set());
                      handleReset();
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={credits < 50}
                >
                  <Text style={[styles.wrongOutputRetryText, {
                    color: credits >= 50 ? Colors.amber : Colors.dim,
                  }]}>
                    {credits >= 50 ? 'RESET BOARD — 50 CR' : 'RESET BOARD — INSUFFICIENT'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.wrongOutputRetryBtn}
                onPress={() => {
                  setShowWrongOutput(false);
                  setWrongOutputData(null);
                  // Check lives after diagnostic
                  if (lives <= 0) {
                    setShowOutOfLives(true);
                  }
                  // Board state preserved — pieces stay where they are
                  // Reset execution state only
                  setBeamState(prev => ({
                    ...prev,
                    heads: [],
                    trails: [],
                    branchTrails: [],
                    litWires: new Set(),
                  }));
                  setPieceAnimState(PIECE_ANIM_INITIAL);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.wrongOutputRetryText}>RETRY</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Insufficient Pulses Overlay (requiredTerminalCount not met) ── */}
        {showInsufficientPulses && pulseResultData && (
          <Animated.View style={styles.completionCardWrap} entering={FadeIn.duration(300)}>
            <View style={styles.wrongOutputCard}>
              <Text style={styles.wrongOutputTitle}>INSUFFICIENT PULSES</Text>
              <Text style={styles.insufficientSubtext}>
                {pulseResultData.achieved} of {pulseResultData.required} required pulses reached the terminal.
              </Text>
              <View style={styles.pulseResultsRow}>
                {pulseResultData.results.map((reached, i) => (
                  <View
                    key={`pulse-${i}`}
                    style={[
                      styles.pulseResultCell,
                      reached ? styles.pulseResultPass : styles.pulseResultFail,
                    ]}
                  >
                    <Text style={[
                      styles.pulseResultText,
                      { color: reached ? '#22C55E' : '#EF4444' },
                    ]}>
                      {'P' + (i + 1)}
                    </Text>
                    <Text style={[
                      styles.pulseResultIcon,
                      { color: reached ? '#22C55E' : '#EF4444' },
                    ]}>
                      {reached ? 'PASS' : 'BLOCKED'}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <CogsAvatar size="small" state="damaged" />
                {/* COGS line — base copy approved by Tucker 2026-04-19;
                    Prompt 92 Fix 1 makes the count dynamic so the
                    line stays accurate on levels where the required
                    count is not 3. */}
                <Text style={styles.wrongOutputCogsText}>
                  {`"${pulseResultData.required} pulse${pulseResultData.required === 1 ? '' : 's'} ${pulseResultData.required === 1 ? 'was' : 'were'} required. The machine delivered fewer. The configuration was not aligned with the input."`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.wrongOutputRetryBtn}
                onPress={() => {
                  setShowInsufficientPulses(false);
                  setPulseResultData(null);
                  handleReset();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.wrongOutputRetryText}>TRY AGAIN</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Void State Overlay (Failure) ── */}
        {showVoid && (
          <Animated.View style={styles.voidOverlay} entering={FadeIn.duration(400)}>
            <LinearGradient
              colors={['rgba(30,5,5,0.94)', 'rgba(15,2,2,0.98)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <Text style={styles.voidTitle}>VOID STATE</Text>
              <Text style={styles.voidSubtext}>Signal lost. Machine failed.</Text>
              <View style={styles.cogsResultRow}>
                <CogsAvatar size="small" state="damaged" />
                <Text style={styles.voidQuote}>
                  {VOID_QUOTES[Math.floor(Math.random() * VOID_QUOTES.length)]}
                </Text>
                {!isAxiomLevel && blownCells.size > 0 && (
                  <Text style={styles.voidQuote}>
                    {getBlownCellCOGSLine(blownCells.size)}
                  </Text>
                )}
              </View>
              {isDailyChallenge && (
                <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.red, letterSpacing: 3, marginBottom: Spacing.md, textAlign: 'center' }}>
                  REWARD FORFEITED
                </Text>
              )}
              <View style={styles.voidActions}>
                {!isDailyChallenge && (
                  <TouchableOpacity
                    style={styles.voidBtn}
                    onPress={() => {
                      if (lives <= 0) {
                        setShowVoid(false);
                        setShowOutOfLives(true);
                      } else {
                        loseLife();
                        handleReset();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.voidBtnText}>TRY AGAIN</Text>
                  </TouchableOpacity>
                )}
                {!isDailyChallenge && blownCells.size > 0 && (
                  <TouchableOpacity
                    style={[styles.voidBtn, {
                      borderColor: credits >= 50 ? Colors.amber : Colors.dim,
                      opacity: credits >= 50 ? 1 : 0.5,
                    }]}
                    onPress={() => {
                      const ok = useEconomyStore.getState().spendDirect(50);
                      if (ok) {
                        setBlownCells(new Set());
                        handleReset();
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={credits < 50}
                  >
                    <Text style={[styles.voidBtnText, {
                      color: credits >= 50 ? Colors.amber : Colors.dim,
                    }]}>
                      {credits >= 50 ? 'RESET BOARD — 50 CR' : 'RESET BOARD — INSUFFICIENT'}
                    </Text>
                  </TouchableOpacity>
                )}
                {!isDailyChallenge && (
                  <TouchableOpacity
                    style={[styles.voidBtn, { borderColor: Colors.amber }]}
                    onPress={handleDebug}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.voidBtnText, { color: Colors.amber }]}>DEBUG (50 CR)</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.voidBtn, { borderColor: Colors.muted }]}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.voidBtnText, { color: Colors.muted }]}>{isDailyChallenge ? 'RETURN TO SHIP' : 'BACK TO MAP'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── COGS Teach Card (failure teaching, single-tap dismiss) ── */}
        {showTeachCard && (
          <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
            <LinearGradient
              colors={['rgba(6,9,15,0.97)', 'rgba(10,22,40,0.99)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <CogsAvatar size="medium" state="engaged" />
              <View style={{ gap: 16, marginTop: Spacing.xl, maxWidth: 320 }}>
                {showTeachCard.map((line, i) => (
                  <Text key={i} style={{
                    fontFamily: Fonts.exo2, fontSize: 13, fontStyle: 'italic',
                    color: Colors.starWhite, lineHeight: 20,
                  }}>{line}</Text>
                ))}
              </View>
              <TouchableOpacity
                style={{ marginTop: Spacing.xl }}
                onPress={() => {
                  setShowTeachCard(null);
                  setShowVoid(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim, letterSpacing: 3 }}>
                  TAP TO CONTINUE
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Out of Lives Overlay ── */}
        {showOutOfLives && (
          <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
            <LinearGradient
              colors={['rgba(6,9,15,0.96)', 'rgba(10,22,40,0.98)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <Svg width={48} height={48} viewBox="0 0 24 24" style={{ marginBottom: Spacing.lg }}>
                <Path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill={Colors.dim}
                  stroke={Colors.muted}
                  strokeWidth="1"
                />
              </Svg>
              <Text style={styles.resultsTitle}>OUT OF LIVES</Text>
              <View style={[styles.cogsResultRow, { marginTop: Spacing.md }]}>
                <CogsAvatar size="small" state="online" />
                <Text style={styles.resultsQuote}>
                  {'"'}You are out of lives. I could tell you to wait. But there is an alternative.{'"'}
                </Text>
              </View>
              <Button
                variant="gradient"
                label={livesCredits >= 30 ? 'REFILL LIVES · 30 CR' : `NEED ${30 - livesCredits} MORE CR`}
                onPress={() => {
                  const ok = refillLives();
                  if (ok) {
                    setShowOutOfLives(false);
                    handleReset();
                  }
                }}
                disabled={livesCredits < 30}
                style={{ width: '100%', marginBottom: Spacing.sm }}
              />
              <Button
                variant="secondary"
                label="MAYBE LATER"
                onPress={() => {
                  setShowOutOfLives(false);
                  navigation.goBack();
                }}
                style={{ width: '100%' }}
              />
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* ── A1-3 Discipline Acknowledgment ── */}
      {showDisciplineCard && discipline && (
        <TouchableOpacity
          style={styles.completionScene}
          activeOpacity={1}
          onPress={() => { setShowDisciplineCard(false); navigation.navigate('LevelSelect'); }}
        >
          <View style={styles.completionInner}>
            <CogsAvatar size="large" state="online" />
            <Text style={[styles.completionText, { maxWidth: 300 }]}>
              {discipline === 'systems'
                ? 'Config Node. Protocol logic. This is your domain. I expected you would handle it well.'
                : discipline === 'drive'
                ? 'You navigated a Protocol piece. It was not elegant. But it worked. I am noting that.'
                : 'Physics and Protocol in the same machine. That is the Field Operative\'s answer to everything. I am beginning to understand the choice.'}
            </Text>
            <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim, letterSpacing: 3, marginTop: Spacing.xl }}>
              TAP TO CONTINUE
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── A1-8 Completion Scene ── */}
      {showCompletionScene && (
        <View style={styles.completionScene}>
          <View style={styles.completionInner}>
            <CogsAvatar size="medium" state="online" />
            <Text style={styles.completionText}>{completionText}</Text>
          </View>
        </View>
      )}

      {/* ── Pause Modal ── */}
      {showPauseModal && (
        <View style={styles.pauseDim}>
          <View style={styles.pauseCard}>
            {/* HUD corner brackets */}
            <View style={[styles.pauseCorner, { top: 6, left: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderTopLeftRadius: 3 }]} />
            <View style={[styles.pauseCorner, { top: 6, right: 6, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 3 }]} />
            <View style={[styles.pauseCorner, { bottom: 6, left: 6, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderBottomLeftRadius: 3 }]} />
            <View style={[styles.pauseCorner, { bottom: 6, right: 6, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 3 }]} />

            {!showAbandonConfirm ? (
              <>
                <Text style={styles.pauseLabel}>MISSION PAUSED</Text>
                <Text style={styles.pauseLevelName}>
                  {level.id} {(level.systemRepaired ?? level.name).toUpperCase()}
                </Text>

                <View style={styles.pauseTimerWrap}>
                  <Text style={styles.pauseTimerBig}>{formatMMSS(elapsedSeconds)}</Text>
                  <Text style={styles.pauseTimerLabel}>ELAPSED</Text>
                </View>

                <Button
                  variant="primary"
                  label="RESUME"
                  onPress={() => setShowPauseModal(false)}
                  style={styles.pauseModalBtn}
                />

                <Button
                  variant="secondary"
                  label="RESTART LEVEL"
                  onPress={() => {
                    handleReset();
                    setShowPauseModal(false);
                  }}
                  style={styles.pauseModalBtn}
                />

                <Button
                  variant="danger"
                  label="ABANDON MISSION"
                  onPress={() => setShowAbandonConfirm(true)}
                  style={styles.pauseModalBtnLast}
                />
              </>
            ) : (
              <>
                <Text style={styles.pauseLabel}>CONFIRM ABANDON</Text>
                <Text style={[styles.pauseAbandonWarn, { marginTop: 16 }]}>
                  Abandoning this mission will cost 1 life.
                </Text>
                <Text style={styles.pauseAbandonSub}>This cannot be undone.</Text>

                <View style={styles.pauseConfirmRow}>
                  <TouchableOpacity
                    style={styles.pauseCancelBtn}
                    onPress={() => setShowAbandonConfirm(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pauseCancelText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pauseConfirmBtn}
                    onPress={() => {
                      // Lives store: lives <= 1 means about to hit 0
                      if (lives <= 1) {
                        loseLife();
                        setShowAbandonConfirm(false);
                        setShowPauseModal(false);
                        setShowOutOfLives(true);
                      } else {
                        loseLife();
                        setShowAbandonConfirm(false);
                        setShowPauseModal(false);
                        navigation.pop(2);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pauseConfirmText}>CONFIRM ABANDON</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}

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
        />
      )}

      {/* Glow Traveler — single reusable element. Stays mounted; opacity
          drives visibility, transforms drive position. */}
      <RNAnimated.View
        pointerEvents="none"
        style={[
          styles.glowTraveler,
          {
            opacity: glowTravelerOpacity,
            transform: [
              { translateX: glowTravelerX },
              { translateY: glowTravelerY },
              { scale: glowTravelerScale },
            ],
          },
        ]}
      >
        <Text style={styles.glowTravelerText}>
          {glowTravelerState.value}
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
  pauseDim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,6,18,0.88)',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseCard: {
    width: screenWidth - 48,
    backgroundColor: 'rgba(4,8,20,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  pauseCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: 'rgba(0,212,255,0.35)',
  },
  pauseLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#00D4FF',
    opacity: 0.6,
    letterSpacing: 2,
  },
  pauseLevelName: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#E8F4FF',
    marginTop: 4,
    letterSpacing: 1,
  },
  pauseTimerWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  pauseTimerBig: {
    fontFamily: Fonts.spaceMono,
    fontSize: 28,
    fontWeight: '300',
    color: '#E8F4FF',
  },
  pauseTimerLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#00D4FF',
    opacity: 0.5,
    letterSpacing: 2,
    marginTop: 4,
  },
  pauseModalBtn: {
    width: '100%',
    marginBottom: 10,
  },
  pauseModalBtnLast: {
    width: '100%',
  },
  pauseAbandonWarn: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#FF3B3B',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 6,
  },
  pauseAbandonSub: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#B0CCE8',
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 20,
  },
  pauseConfirmRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  pauseCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pauseCancelText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  pauseConfirmBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,59,59,0.4)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pauseConfirmText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: '#FF3B3B',
    letterSpacing: 1.5,
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

  // Overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  voidOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  overlayContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
  },

  // System restored
  systemRestoredText: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.display,
    fontWeight: 'bold',
    color: Colors.green,
    textAlign: 'center',
    letterSpacing: 4,
    lineHeight: 44,
  },

  // Score strip
  scoreStrip: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(10,18,30,0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.1)',
    overflow: 'hidden',
  },
  scoreCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  scoreCellVal: {
    fontFamily: Fonts.orbitron,
    fontSize: 11,
    fontWeight: 'bold',
  },
  scoreCellLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 5,
    color: Colors.dim,
    letterSpacing: 0.5,
  },

  // Post-completion CONTINUE button wrapper — no backdrop, bottom-anchored.
  // completionCardWrap is retained below for the Wrong Output modal reuse.
  completionContinueWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 48,
    paddingHorizontal: 20,
    zIndex: 250,
  },
  completionCardWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(2,5,12,0.88)',
    zIndex: 250,
  },
  completionContinueBtn: {
    alignSelf: 'center',
  },

  // Wrong Output Modal
  wrongOutputCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(6,9,15,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 20,
  },
  wrongOutputTitle: {
    fontFamily: Fonts.orbitron,
    fontSize: FontSizes.lg,
    color: '#EF4444',
    letterSpacing: 3,
    marginBottom: 16,
    textAlign: 'center',
  },
  wrongOutputSection: {
    marginBottom: 12,
  },
  wrongOutputLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  wrongOutputRow: {
    flexDirection: 'row',
    gap: 4,
  },
  wrongOutputCell: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1A3050',
    backgroundColor: '#08101C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongOutputCellMismatch: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  wrongOutputCellText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    color: Colors.neonCyan,
  },
  wrongOutputCogsText: {
    fontFamily: Fonts.exo2,
    fontSize: 13,
    color: '#B0CCE8',
    lineHeight: 18,
    flex: 1,
    fontStyle: 'italic',
  },
  wrongOutputRetryBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: 4,
  },
  wrongOutputRetryText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    color: Colors.amber,
    letterSpacing: 3,
  },

  // Results
  starsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  resultsTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.xxl, fontWeight: 'bold',
    color: Colors.amber, letterSpacing: 3, marginBottom: Spacing.sm,
  },
  resultsLevel: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.sm, color: Colors.muted,
    marginBottom: Spacing.xl,
  },
  cogsResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  resultsQuote: {
    flex: 1,
    fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.muted,
    fontStyle: 'italic', lineHeight: 18,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  // Void state
  voidTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.display, fontWeight: 'bold',
    color: Colors.red, letterSpacing: 4, marginBottom: Spacing.sm,
  },
  voidSubtext: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.md, color: Colors.muted,
    marginBottom: Spacing.xl,
  },
  voidQuote: {
    flex: 1,
    fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.muted,
    fontStyle: 'italic', lineHeight: 18,
  },
  voidActions: {
    gap: Spacing.sm,
    width: '100%',
  },
  voidBtn: {
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  voidBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 10, color: Colors.red, letterSpacing: 1,
  },

  // A1-8 Completion scene
  completionScene: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.void,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  completionInner: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.xl,
  },
  completionText: {
    fontFamily: Fonts.exo2,
    fontSize: FontSizes.lg,
    color: Colors.starWhite,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
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
  insufficientSubtext: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  pulseResultsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8,
  },
  pulseResultCell: {
    width: 44,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseResultPass: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  pulseResultFail: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  pulseResultText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    letterSpacing: 1,
  },
  pulseResultIcon: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    letterSpacing: 1,
    marginTop: 2,
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
  tapeCellHighlightDeparting: {
    opacity: 0.3,
    borderColor: 'rgba(0,229,255,0.2)',
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
  tapeCellHighlightRead: {
    borderColor: 'rgba(0,229,255,0.9)',
    backgroundColor: 'rgba(0,229,255,0.18)',
  },
  tapeCellHighlightWrite: {
    borderColor: 'rgba(0,229,255,0.9)',
    backgroundColor: 'rgba(0,229,255,0.22)',
  },
  tapeCellHighlightGatePass: {
    borderColor: 'rgba(0,255,135,0.9)',
    backgroundColor: 'rgba(0,255,135,0.18)',
  },
  tapeCellHighlightGateBlock: {
    borderColor: 'rgba(255,59,59,0.9)',
    backgroundColor: 'rgba(255,59,59,0.18)',
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
