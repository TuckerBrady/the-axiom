import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import PieceTray, { type DragState, type TrayItem } from '../components/gameplay/PieceTray';
import DragGhostSnapBack from '../components/gameplay/DragGhostSnapBack';
import { groupTrayPieces, shouldShowFilterChips, type TrayPiece } from '../components/gameplay/trayGrouping';
import { PieceIcon } from '../components/PieceIcon';
import GameplayModals from '../components/gameplay/GameplayModals';
import SpecSheetPanel from '../components/gameplay/SpecSheetPanel';
import RequisitionPanel from '../components/gameplay/RequisitionPanel';
import PlacementTransition from '../components/gameplay/PlacementTransition';
import DamagedCell from '../components/gameplay/DamagedCell';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import { useLivesStore } from '../store/livesStore';
import { useProgressionStore } from '../store/progressionStore';
import { usePlayerStore } from '../store/playerStore';
import { useEconomyStore } from '../store/economyStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRequisitionStore, buildInventoryForLevel } from '../store/requisitionStore';
import { useShallow } from 'zustand/react/shallow';
import { TutorialHint } from '../components/TutorialHint';
import TutorialHUDOverlay from '../components/TutorialHUDOverlay';
import GameplayErrorBoundary from '../components/GameplayErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PieceType, PlacedPiece, ExecutionStep, PortSide } from '../game/types';
import { getPieceCost, BLANK } from '../game/types';
import { hapticLight, hapticMedium, hapticHeavy, hapticError } from '../utils/haptics';
import { placeFromKeplerInventory, shouldMountTray } from '../game/trayPlacement';
import { resolveDropCell } from '../utils/dropTarget';
import { getOutputPorts, getInputPorts, evaluateRequiredPieces, evaluateMinPieces, nextLatchMode } from '../game/engine';
import { buildRequiredPiecesCogsLine, buildMinPiecesCogsLine } from '../game/engagement/requiredPiecesDialogue';
import { useGameplayFailure } from '../hooks/useGameplayFailure';
import { useGameplayModals } from '../hooks/useGameplayModals';
import { useGameplayTimer } from '../hooks/useGameplayTimer';
import { useGameplayTutorial } from '../hooks/useGameplayTutorial';
import { useGameplayTape } from '../hooks/useGameplayTape';
import { useBeamEngine } from '../hooks/useBeamEngine';
import { shallStatementToCopy } from '../game/spec/specSheetCopy';
import { evaluateTopologyGate } from '../game/objectives';
import { resolveBoardSize } from '../utils/boardSizeOverride';
import { SHOW_DEV_TOOLS } from '../utils/devFlags';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Grid constants ───────────────────────────────────────────────────────────

const DOT_R = 1.5;
const PIECE_RADIUS = 10;
const CANVAS_PAD = 20;  // padding inside canvas area — ensures edge pieces are fully visible
// REQ-G-01 (Handoff 003): MIN_CELL removed. It was a fixed floor that
// silently overrode the locked sizing rule ("CELL_SIZE always derives
// dynamically from canvas + grid" — CLAUDE_CONTEXT.md) and clipped 10 of 11
// Kepler grids outside `overflow: 'hidden'`, making their outer columns
// untappable. Touch targets are preserved independently via hitSlop
// (BoardPiece's Pressable, and the ghost-cell TouchableOpacity below).
const MAX_CELL = 88;
// Minimum pressable size for a placed/ghost cell, independent of CELL_SIZE.
const MIN_TOUCH_TARGET = 44;

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
  type Pt,
  type EngagementContext,
  type GlowTravelerLayer,
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
    endRun,
    toggleConfiguration,
    setDebugMode,
    debugNext,
    debugPrev,
  } = useGameStore(useShallow(s => ({
    currentLevel: s.currentLevel,
    machineState: s.machineState,
    selectedPieceFromTray: s.selectedPieceFromTray,
    selectedPlacedPiece: s.selectedPlacedPiece,
    executionSteps: s.executionSteps,
    isExecuting: s.isExecuting,
    stars: s.stars,
    configuration: s.configuration,
    debugMode: s.debugMode,
    debugStepIndex: s.debugStepIndex,
    setLevel: s.setLevel,
    placePiece: s.placePiece,
    movePiece: s.movePiece,
    deletePiece: s.deletePiece,
    rotatePiece: s.rotatePiece,
    updatePiece: s.updatePiece,
    selectFromTray: s.selectFromTray,
    selectPlaced: s.selectPlaced,
    engage: s.engage,
    reset: s.reset,
    endRun: s.endRun,
    toggleConfiguration: s.toggleConfiguration,
    setDebugMode: s.setDebugMode,
    debugNext: s.debugNext,
    debugPrev: s.debugPrev,
  })));

  const { lives, loseLife, refillLives, credits: livesCredits, addCredits } = useLivesStore(useShallow(s => ({
    lives: s.lives,
    loseLife: s.loseLife,
    refillLives: s.refillLives,
    credits: s.credits,
    addCredits: s.addCredits,
  })));
  const completeLevel = useProgressionStore(s => s.completeLevel);
  const isLevelDone = useProgressionStore(s => s.isLevelCompleted);
  const discipline = usePlayerStore(s => s.discipline);
  const { credits, setLevelBudget, spendCredits, spendDirect, earnCredits, resetLevelBudget, levelSpent } = useEconomyStore(useShallow(s => ({
    credits: s.credits,
    setLevelBudget: s.setLevelBudget,
    spendCredits: s.spendCredits,
    spendDirect: s.spendDirect,
    earnCredits: s.earnCredits,
    resetLevelBudget: s.resetLevelBudget,
    levelSpent: s.levelSpent,
  })));
  const devBoardSizeOverride = useSettingsStore(s => s.devBoardSizeOverride);
  const requisitionPhase = useRequisitionStore(s => s.phase);
  const selectedInventoryId = useRequisitionStore(s => s.selectedInventoryId);
  // Whole inventory (placed and unplaced). The store replaces the array on
  // every change, so the plain selector is already reference-stable.
  const inventoryPieces = useRequisitionStore(s => s.inventory.pieces) as TrayPiece[];

  // Level-derived values needed by extracted hooks. Computed before
  // hook calls so hook order stays stable across renders.
  const level = currentLevel;
  const isAxiomLevel = level?.sector === 'axiom';
  const isDailyChallenge = level?.sector === 'daily';
  const isLevelPreviouslyCompleted = level ? isLevelDone(level.id) : false;

  // Replay-tutorial override (player-facing "Replay Tutorial" setting). It sets
  // axiom_tutorial_force_show, which lets the tutorial overlay run even on a
  // level the player has already completed — without wiping their progress.
  // Read once per level; cleared when the overlay ends.
  const [forceTutorial, setForceTutorial] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('axiom_tutorial_force_show').then(v => {
      if (active && v === '1') setForceTutorial(true);
    });
    return () => { active = false; };
  }, [level?.id]);

  // Phase 1 extraction — failure state (blownCells, failCount, helpers).
  const {
    blownCells, setBlownCells,
    liveBurnCells, settleLiveBurns,
    failCount, setFailCount,
    voidQuoteIndex, setVoidQuoteIndex,
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
    showSpecNotMet, setShowSpecNotMet,
    specNotMetData, setSpecNotMetData,
    showOutOfLives, setShowOutOfLives,
    showEconomyIntro,
    showSystemRestored, setShowSystemRestored,
    showCompletionScene, setShowCompletionScene,
    completionText, setCompletionText,
    showDisciplineCard, setShowDisciplineCard,
    showTeachCard, setShowTeachCard,
    showSpecSheet, setShowSpecSheet,
    scoreResult, setScoreResult,
    cogsScoreComment, setCogsScoreComment,
    firstTimeBonus, setFirstTimeBonus,
    elaborationMult, setElaborationMult,
    mayBonus, setMayBonus,
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
    tutorialSpotlightCells,
    sourceNodeRef,
    outputNodeRef,
    boardGridRef,
    engageButtonRef,
    boardScannerRef,
    inputTapeRowRef,
    outputTapeRowRef,
    dataTrailRowRef,
    specSheetBtnRef,
    tutorialTrayRefs,
    placedPieceRef,
    tutorialPlacedGridPos,
    lastPlacedTrigger,
    lastTappedTrigger,
    onPiecePlaced: tutorialOnPiecePlaced,
    onPieceTapped: tutorialOnPieceTapped,
  } = tutorial;

  // Phase 2 extraction — elapsed-seconds timer with pause/lock/reset API.
  const timer = useGameplayTimer(level?.id, tutorialIsActiveRef, showPauseModal);
  const { elapsedSeconds, lockTimer, resetTimer, resumeTimer } = timer;

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
  const [showRequiredNotEngaged, setShowRequiredNotEngaged] = useState(false);
  const [requiredNotEngagedLine, setRequiredNotEngagedLine] = useState('');
  const [dragState, setDragState] = useState<DragState>({ active: false, pieceId: null, type: null, x: 0, y: 0 });
  // Where the current drag began, for the blown-cell snap-back.
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const [snapBack, setSnapBack] = useState<{
    id: number; type: PieceType; from: { x: number; y: number }; to: { x: number; y: number };
  } | null>(null);
  const boardScreenPos = useRef({ x: 0, y: 0 });
  const cellSizeRef = useRef(52);

  // Screen is immediately visible — slide_from_bottom handles entry transition
  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Star reveal / credits / 3-star haptics on results screen ──
  useEffect(() => {
    if (!showResults || !scoreResult) return;
    const starsCount = scoreResult.stars;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= starsCount; i++) {
      timers.push(setTimeout(() => hapticMedium(), i * 200));
    }
    if (starsCount === 3) {
      timers.push(setTimeout(() => hapticHeavy(), starsCount * 200 + 50));
    }
    timers.push(setTimeout(() => hapticMedium(), starsCount * 200 + 300));
    return () => timers.forEach(t => clearTimeout(t));
  }, [showResults]);

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

  // ── Requisition store init for Kepler+ levels ──
  useEffect(() => {
    if (!level) return;
    if (level.sector === 'axiom') return;
    useRequisitionStore.getState().initRequisition(level, discipline);
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

  // PROMPT_159 task 3: the board-size sweep changes the board from the
  // dev-only Settings toggle, never from a source edit, so one shots run can
  // shoot the same level at every candidate size. `resolveBoardSize` returns
  // the level's own size whenever SHOW_DEV_TOOLS is false, which is every
  // `production` build.
  const sweptBoardSize = resolveBoardSize(
    { columns: level?.gridWidth ?? 8, rows: level?.gridHeight ?? 7 },
    devBoardSizeOverride,
    SHOW_DEV_TOOLS,
  );
  const numColumns = sweptBoardSize.columns;
  const numRows = sweptBoardSize.rows;
  const availW = canvasLayout.w - CANVAS_PAD * 2;
  const availH = canvasLayout.h - CANVAS_PAD * 2;
  const CELL_SIZE = availW > 0 && availH > 0
    ? Math.min(MAX_CELL, Math.floor(Math.min(availW / numColumns, availH / numRows)))
    : 52;
  cellSizeRef.current = CELL_SIZE;
  const gridW = numColumns * CELL_SIZE;
  const gridH = numRows * CELL_SIZE;
  // REQ-G-01: the drawn cell can now fall under 44pt on dense grids; pad the
  // ghost-cell pressable back to the touch-target floor via hitSlop rather
  // than inflating the drawn cell itself.
  const ghostCellSlop = Math.max(0, (MIN_TOUCH_TARGET - CELL_SIZE) / 2);

  // ── Drag hover cell — board cell the dragged piece would drop into ──
  // Reads boardScreenPos.current during render; dragState changes on every
  // move so the ref is always fresh by the time this recomputes.
  const dragHoverCell = useMemo(() => {
    if (!dragState.active || !dragState.type) return null;
    const boardPos = boardScreenPos.current;
    const cell = resolveDropCell({
      x: dragState.x,
      y: dragState.y,
      boardX: boardPos.x,
      boardY: boardPos.y,
      cellSize: CELL_SIZE,
      numColumns,
      numRows,
      isOccupied: (gx, gy) => pieces.some(p => p.gridX === gx && p.gridY === gy),
      isBlown: (gx, gy) => blownCells.has(`${gx},${gy}`),
    });
    if (!cell.inBounds) return null;
    return { gridX: cell.gridX, gridY: cell.gridY, valid: cell.valid };
  }, [dragState.active, dragState.type, dragState.x, dragState.y, CELL_SIZE, numColumns, numRows, pieces, blownCells]);

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

  // ── Tray items (AXM-013: one tray, every sector) ──
  // Kepler+: one item per type from the unplaced inventory, with the count
  // split by source; a type leaves the tray when its count reaches zero.
  const keplerGroups = useMemo(() => groupTrayPieces(inventoryPieces), [inventoryPieces]);
  // Chips are decided from the whole inventory (placed or not), so the count
  // is fixed for the level and the chip row never appears or vanishes mid-level.
  const keplerTrayItemCount = useMemo(
    () => groupTrayPieces(inventoryPieces.map(p => ({ ...p, placed: false }))).length,
    [inventoryPieces],
  );
  const trayItems = useMemo<TrayItem[]>(() => (
    isAxiomLevel
      ? trayPieceTypes.map(pt => ({
          key: pt,
          type: pt,
          isTape: false,
          count: availableCounts[pt] || 0,
          dimmed: !(trayAffordable[pt] ?? true),
        }))
      : keplerGroups.map(g => ({
          key: g.key,
          type: g.type,
          isTape: g.isTape,
          count: g.count,
          preAssignedCount: g.preAssignedCount,
          requisitionedCount: g.requisitionedCount,
        }))
  ), [isAxiomLevel, trayPieceTypes, availableCounts, trayAffordable, keplerGroups]);
  const traySelectedKey = useMemo(() => {
    if (isAxiomLevel) return selectedPieceFromTray;
    const sel = inventoryPieces.find(p => p.id === selectedInventoryId && !p.placed);
    return sel ? `${sel.type}:${sel.isTape ? 'tape' : 'piece'}` : null;
  }, [isAxiomLevel, selectedPieceFromTray, inventoryPieces, selectedInventoryId]);

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
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses || showRequiredNotEngaged) return;

    if (isAxiomLevel) {
      // Axiom: tray-based placement (existing behavior)
      if (selectedPieceFromTray) {
        const count = availableCounts[selectedPieceFromTray] || 0;
        if (count > 0) {
          if (blownCells.has(`${gridX},${gridY}`)) return;
          // Tutorial (Axiom) levels never charge credits, and pre-assigned
          // pieces are always free regardless of sector. Protocol pieces
          // (Scanner, Config Node, Transmitter) carry non-zero base costs,
          // so without these guards the credit gate fired on A1-3/5/6/7/8.
          const isPreAssigned = level?.availablePieces?.includes(selectedPieceFromTray) ?? false;
          const cost = isAxiomLevel || isPreAssigned ? 0 : getPieceCost(selectedPieceFromTray, discipline);
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
          hapticLight();
          tutorialOnPiecePlaced(selectedPieceFromTray, gridX, gridY);
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
    } else {
      // Kepler+: tray placement from the requisitioned inventory. Credits were
      // spent in the REQUISITION store; placement never charges.
      const { selectedInventoryId: selId, inventory } = useRequisitionStore.getState();
      if (selId) {
        const invPiece = inventory.pieces.find(p => p.id === selId && !p.placed);
        if (!invPiece) return;
        if (blownCells.has(`${gridX},${gridY}`)) {
          hapticError();
          return;
        }
        if (!placeFromKeplerInventory(invPiece.type)) return;
        const rotation = getAutoRotation(gridX, gridY);
        placePiece(invPiece.type, gridX, gridY, rotation);
        hapticLight();
      } else if (selectedPlacedPiece) {
        if (blownCells.has(`${gridX},${gridY}`)) return;
        movePiece(selectedPlacedPiece, gridX, gridY);
        selectPlaced(null);
      }
    }
  }, [isAxiomLevel, selectedPieceFromTray, selectedPlacedPiece, isExecuting, showResults, showVoid, availableCounts, placePiece, discipline, spendCredits, hasPlacedPieces, triggerHints, selectPlaced, getAutoRotation, selectedInventoryId, tutorialOnPiecePlaced]);

  // ── Piece tap handler ──
  const handlePieceTap = useCallback((pieceId: string) => {
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses || showRequiredNotEngaged) return;
    const piece = machineState.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    if (piece.isPrePlaced) return;

    // Type-specific tap actions
    if (piece.type === 'conveyor') {
      rotatePiece(piece.id);
      hapticLight();
      tutorialOnPieceTapped(piece.type);
    } else if (piece.type === 'configNode') {
      const current = piece.configValue ?? 1;
      const next = current === 1 ? 0 : 1;
      updatePiece(piece.id, { configValue: next });
      hapticLight();
      tutorialOnPieceTapped(piece.type);
    } else if (piece.type === 'latch') {
      // Three-state cycle write -> read -> delay -> write (REQ-LATCH-MODE-1).
      // DELAY is the cross-pulse memory K1-9/K1-10 depend on.
      updatePiece(piece.id, { latchMode: nextLatchMode(piece.latchMode) });
      hapticLight();
      tutorialOnPieceTapped(piece.type);
    }
    // All other piece types: no tap action
  }, [isExecuting, showResults, showVoid, showWrongOutput, showInsufficientPulses, machineState.pieces, rotatePiece, updatePiece, tutorialOnPieceTapped]);

  // ── Long press returns piece to the tray (no ghost/held state) ──
  const handlePieceLongPress = useCallback((pieceId: string) => {
    if (isExecuting || showResults || showVoid || showWrongOutput || showInsufficientPulses || showRequiredNotEngaged) return;
    const piece = machineState.pieces.find(p => p.id === pieceId);
    if (!piece) return;
    if (piece.isPrePlaced) return;
    deletePiece(piece.id);
    hapticLight();
    // For Kepler+ levels, return the piece to the tray inventory (REQ-64);
    // the store restores its count and source (pre-assigned first).
    if (!isAxiomLevel) {
      useRequisitionStore.getState().unplaceInventoryPiece(piece.type);
    }
  }, [isAxiomLevel, isExecuting, showResults, showVoid, showWrongOutput, showInsufficientPulses, machineState.pieces, deletePiece]);

  // ── Pause modal opener (stable ref so HUDChrome memo holds) ──
  const handlePauseOpen = useCallback(() => {
    setShowPauseModal(true);
  }, []);

  // ── Spec Sheet opener (stable ref so HUDChrome memo holds — SE-TM-030) ──
  const handleSpecSheetOpen = useCallback(() => {
    setShowSpecSheet(true);
  }, []);
  // The HUD Spec Sheet button ref now comes from useGameplayTutorial so the
  // A1-1 final tutorial step (targetRef 'specSheetBtn') can anchor to it.

  // ── REQUISITION confirm ──
  const handleRequisitionConfirm = useCallback(() => {
    if (!level) return;
    const store = useRequisitionStore.getState();
    const ok = store.confirmRequisition(spendDirect);
    if (!ok) return;
    const inv = buildInventoryForLevel(level, store.requisition.purchases);
    useRequisitionStore.setState({ inventory: inv });
    store.beginTransition();
  }, [level, spendDirect]);

  const handleTransitionComplete = useCallback(() => {
    useRequisitionStore.getState().beginPlacement();
  }, []);

  // ── Tray interaction ──
  const handleTrayPickup = useCallback((key: string | null) => {
    if (isAxiomLevel) {
      selectFromTray(key as PieceType | null);
      return;
    }
    const group = key ? keplerGroups.find(g => g.key === key) : undefined;
    useRequisitionStore.getState().selectInventoryPiece(group ? group.repId : null);
  }, [isAxiomLevel, selectFromTray, keplerGroups]);

  // Where the board is, in the same space as a touch's pageX/pageY. Found on
  // device (AXM-013): measureInWindow is not that space, and drops resolved
  // one to two rows below the finger in every sector; measure()'s pageX/pageY
  // is. The board's onLayout also only fires when its own frame changes, not
  // when a sibling (the tray mounting at placement start, the chip row, the
  // tape rows) moves it, so a drag re-measures when it starts.
  const measureBoardOnScreen = useCallback(() => {
    boardGridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      boardScreenPos.current = { x: pageX, y: pageY };
    });
  }, []);

  const handleDragStart = useCallback((drag: DragState) => {
    dragOriginRef.current = { x: drag.x, y: drag.y };
    measureBoardOnScreen();
    setDragState(drag);
  }, [measureBoardOnScreen]);

  const handleDragMove = useCallback((x: number, y: number) => {
    setDragState(prev => ({ ...prev, x, y }));
  }, []);

  const handleDragEnd = useCallback((x: number, y: number) => {
    // Compute which board cell the drop landed in
    const boardPos = boardScreenPos.current;
    const { gridX, gridY, valid, inBounds } = resolveDropCell({
      x,
      y,
      boardX: boardPos.x,
      boardY: boardPos.y,
      cellSize: cellSizeRef.current,
      numColumns: level?.gridWidth ?? 8,
      numRows: level?.gridHeight ?? 7,
      isOccupied: (gx, gy) => pieces.some(p => p.gridX === gx && p.gridY === gy),
      isBlown: (gx, gy) => blownCellsRef.current.has(`${gx},${gy}`),
    });
    const currentDrag = dragState;

    // A drop on a blown cell is rejected: error haptic, and the ghost snaps
    // back to where the drag began so it reads as the scar, not a miss.
    if (currentDrag.type && inBounds && blownCellsRef.current.has(`${gridX},${gridY}`)) {
      hapticError();
      setSnapBack({
        id: Date.now(),
        type: currentDrag.type,
        from: { x, y },
        to: { ...dragOriginRef.current },
      });
    } else if (currentDrag.type && valid) {
      // Kepler+ consumes an inventory instance first (never credits); a drop
      // with nothing left of that type places nothing.
      if (isAxiomLevel || placeFromKeplerInventory(currentDrag.type)) {
        const rotation = getAutoRotation(gridX, gridY);
        placePiece(currentDrag.type, gridX, gridY, rotation);
        hapticLight();
        if (isAxiomLevel) tutorialOnPiecePlaced(currentDrag.type, gridX, gridY);
      }
    }
    setDragState({ active: false, pieceId: null, type: null, x: 0, y: 0 });
  }, [isAxiomLevel, dragState, level, pieces, getAutoRotation, placePiece, tutorialOnPiecePlaced]);

  const handleDragCancel = useCallback(() => {
    setDragState({ active: false, pieceId: null, type: null, x: 0, y: 0 });
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
    hapticMedium();
    // Any crater from a previous run stops smouldering the moment a new run
    // begins — it settles to plain terrain damage (see DamagedCell).
    settleLiveBurns();
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

    // REQ-G-05 (Handoff 003) / SE-BEAM-081 — the charge glow and the
    // inter-pulse source flash both take the first post-Source step's
    // category color (amber for Physics, blue for Protocol), computed once
    // per run. getBeamColor's 'terminal' case returns the Protocol body
    // stroke, which is wrong here too, so a direct Source-to-Terminal trace
    // (no piece in between) falls back to amber rather than inheriting
    // that bug.
    const firstPostSourceStep = pulses[0]?.[1];
    const chargeColor =
      firstPostSourceStep && firstPostSourceStep.type !== 'terminal'
        ? getBeamColor(firstPostSourceStep.type)
        : Colors.amber;

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
      tape.tapeSetters.setVisualOutputOverride(level.inputTape.map(() => BLANK));
    }

    // PHASE 1 — CHARGE
    const sourcePiece = machineState.pieces.find(p => p.type === 'source');
    if (sourcePiece) {
      await runChargePhase(ctx, sourcePiece.id, chargeColor);
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
        // REQ-G-05: was hardcoded amber regardless of the machine's actual
        // category; now the same chargeColor the charge rings use.
        if (sourcePiece) engageFlashPiece(ctx, sourcePiece.id, chargeColor);
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
    // BLANK-aware exact-match comparator (SE-TM-001/SE-TM-003). BLANK === BLANK
    // holds (single canonical sentinel), so a pulse that legitimately produces
    // no output matches an expectedOutput cell of BLANK.
    const expected = level.expectedOutput;
    const tapeMatches = hasTape && !!storeOutputTape && !!expected &&
      storeOutputTape.length === expected.length &&
      storeOutputTape.every((v, i) => v === expected[i]);
    // SE-TM-002 discriminator: expectedOutput is the LIVE gate iff it is
    // full-length (one cell per input pulse) — A1-7/A1-8. Short/documentary
    // expectedOutput (A1-5/A1-6) keeps requiredTerminalCount as the live gate.
    const expectedOutputIsLiveGate = hasTape && !!expected && !!level.inputTape &&
      expected.length === level.inputTape.length;
    const reachedOutputEveryPulse = steps.filter(s => s.type === 'terminal' && s.success).length >= (pulses.length || 1);
    // Live-gate levels: ANY tape mismatch is a wrong output. Blocked pulses
    // legitimately produce BLANK (part of expectedOutput under SE-TM-003), so
    // we no longer require every pulse to reach Terminal. Documentary levels
    // keep the old "all pulses reached Terminal but values are wrong" check.
    const wrongOutput = expectedOutputIsLiveGate
      ? hasTape && !tapeMatches
      : hasTape && reachedOutputEveryPulse && !tapeMatches;

    // Count pulses that reached Terminal. Levels without a Transmitter
    // use this for their success condition via requiredTerminalCount.
    const terminalSuccessCount = steps.filter(
      s => s.type === 'terminal' && s.success,
    ).length;
    const requiredCount = level.requiredTerminalCount ?? 1;
    // Live-gate levels are governed entirely by tapeMatches; requiredTerminalCount
    // is documentary for them, so the pulse-count requirement is satisfied by
    // definition (a blocked BLANK pulse must not fail via a count it no longer
    // answers to). Documentary levels keep the requiredTerminalCount gate.
    const metPulseRequirement = expectedOutputIsLiveGate
      ? true
      : terminalSuccessCount >= requiredCount;

    // SE-TM-035: grade the executed signal path against the level's board-
    // topology SHALL (the same requirement the Spec Sheet surfaces). A machine
    // that produces the right output but routes through too few direction
    // changes has not met the full SHALL set — a legitimate failure.
    const topoGate = evaluateTopologyGate(level, steps);

    if (wrongOutput) {
      const outputPiece = machineState.pieces.find(p => p.type === 'terminal');
      if (outputPiece) {
        setPieceAnimState(prev => {
          const next = new Map(prev.failColors);
          next.set(outputPiece.id, '#FF3B3B');
          return { ...prev, failColors: next };
        });
        const op = getPieceCenter(outputPiece.id);
        if (op) {
          hapticHeavy();
          await runWrongOutputRings(ctx, op);
        }
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

    // PHASE 3 — LOCK (400ms) — only on success (and matching tape if tape level
    // and the topology SHALL is met, so the green lock never plays on a build
    // that failed spec)
    const succeededFinal = !wrongOutput && metPulseRequirement && topoGate.met;
    if (succeededFinal) {
      const outputPiece = machineState.pieces.find(p => p.type === 'terminal');
      if (outputPiece) {
        const op = getPieceCenter(outputPiece.id);
        if (op) {
          hapticMedium();
          await runLockPhase(ctx, op);
        }
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

    // Topology SHALL enforcement (SE-TM-035): the output is correct (or the
    // level has no output gate) and the pulses landed, but the signal path
    // violated a stated board-topology requirement. Graded against the Spec
    // Sheet — a real failure, not a completion. Shows the spec diagnostic.
    if (!wrongOutput && metPulseRequirement && !topoGate.met) {
      setBeamState(prev => ({ ...prev, phase: 'idle' }));
      if (!isAxiomLevel) loseLife();
      setSpecNotMetData({
        required: topoGate.required,
        actual: topoGate.actual,
        requirementText: shallStatementToCopy({
          type: 'topology',
          predicate: 'minDirectionChanges',
          value: topoGate.required,
        }),
      });
      setShowSpecNotMet(true);
      return;
    }

    // Required-pieces enforcement (A3a flavor: run completes, then
    // evaluate. If any required piece was not engaged, consume a life
    // and show the COGS rejection modal. REQ-RP-5: same life-cost as
    // damage failure. Tucker confirmed 2026-05-01.)
    if (!wrongOutput && metPulseRequirement && level.requiredPieces?.length) {
      const placedPieces = useGameStore.getState().machineState.pieces;
      // Run states carry the instance id (which may be a Kepler+ inventory
      // id like inv-NN); evaluateRequiredPieces resolves it to the piece type
      // via the placedPieces array (REQ-REQPIECES-MAP-1).
      const runStates = placedPieces.map(p => ({
        pieceId: p.id,
        firedDuringRun: p.firedDuringRun ?? false,
      }));
      const rpResult = evaluateRequiredPieces(level, runStates, placedPieces);
      if (rpResult.result === 'requiredPiecesNotEngaged') {
        setBeamState(prev => ({ ...prev, phase: 'idle' }));
        loseLife();
        setRequiredNotEngagedLine(buildRequiredPiecesCogsLine(level.id, rpResult.missing));
        setShowRequiredNotEngaged(true);
        return;
      }
    }

    // Min-pieces hard floor: the output is correct, the pulses landed, and any
    // required-piece architecture was engaged — but the machine is too sparse.
    // Reject the run and consume a life (Axiom never loses a life), pushing the
    // Engineer toward elaborate builds. Placed AFTER requiredPieces so a
    // specific missing-piece message takes priority over this generic floor.
    // Reuses the requiredNotEngaged modal (generic COGS-line renderer).
    if (!wrongOutput && metPulseRequirement && level.minPieces) {
      const placedPieces = useGameStore.getState().machineState.pieces;
      const mp = evaluateMinPieces(level, placedPieces);
      if (!mp.met) {
        setBeamState(prev => ({ ...prev, phase: 'idle' }));
        if (!isAxiomLevel) loseLife();
        setRequiredNotEngagedLine(buildMinPiecesCogsLine(level.id, mp.active, mp.required));
        setShowRequiredNotEngaged(true);
        return;
      }
    }

    const succeeded = !wrongOutput && metPulseRequirement && topoGate.met;
    if (succeeded) {
      const routed = await handleSuccess({
        steps,
        level,
        pieces: machineState.pieces,
        discipline,
        lockedElapsed,
        levelSpent,
        purchasedTapeTypes: isAxiomLevel ? [] : useRequisitionStore.getState().getPurchasedTapeTypes(),
        setScoreResult,
        setCogsScoreComment,
        setFirstTimeBonus,
        setElaborationMult,
        setMayBonus,
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
      hapticHeavy();
      await handleVoidFailure({
        steps,
        levelId: level.id,
        isAxiomLevel,
        failCount,
        findBlownPiece,
        deletePiece,
        setBlownCells,
        setFailCount,
        setVoidQuoteIndex,
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
    setShowRequiredNotEngaged(false);
    beam.resetBeam();
    tape.resetTape();
    setShowInsufficientPulses(false);
    setPulseResultData(null);
    reset();
    resetTimer();
    // Retry on Kepler+: REQUISITION reopens fresh (REQ-101)
    if (!isAxiomLevel && level) {
      useRequisitionStore.getState().initRequisition(level, discipline);
    }
  }, [reset, resetTimer, isAxiomLevel, level, discipline]);

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
  // Dismisses the diagnostic modal, checks the lives gate, and ends
  // the run while leaving the board configuration (and blown cells)
  // intact. endRun() clears the store's isExecuting — without it the
  // ENGAGE row, tray and placement stay locked (soft-lock, K1-2).
  const handleWrongOutputRetry = useCallback(() => {
    setShowWrongOutput(false);
    setWrongOutputData(null);
    beam.resetBeam();
    tape.resetTape();
    endRun();
    if (lives <= 0) {
      setShowOutOfLives(true);
    } else {
      resumeTimer();
    }
  }, [lives, endRun, resumeTimer, setShowOutOfLives, setShowWrongOutput, setWrongOutputData]);

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

  // REQ-G-04: the glow traveler tints to its destination tape's locked
  // color, driven by tape.glowTravelerState.layer — no hex literal here,
  // no remount, just a per-render lookup into tokens.ts. Falls back to
  // 'trail' (the traveler's original journey) if layer is unset.
  const GLOW_TRAVELER_COLORS: Record<GlowTravelerLayer, string> = {
    in: Colors.tapeInBar,
    trail: Colors.tapeTrailBar,
    out: Colors.tapeOutBar,
  };
  const glowTravelerColor = GLOW_TRAVELER_COLORS[tape.glowTravelerState.layer ?? 'trail'];
  const glowTravelerTint = hexToRgba(glowTravelerColor, 0.22);

  return (
    <GameplayErrorBoundary onReset={handleReset}>
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={7} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Top Bar ── */}
        <HUDChrome
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
          onOpenSpecSheet={handleSpecSheetOpen}
          specSheetBtnRef={specSheetBtnRef}
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
          <View
            ref={boardGridRef}
            style={[styles.canvas, { width: gridW, height: gridH }]}
            onLayout={measureBoardOnScreen}
          >
            {/* Dot grid + blown-cell scars (static across beam animation) */}
            <Svg width={gridW} height={gridH} style={StyleSheet.absoluteFill}>
              {/* REQ-G-14: iterate numRows × numColumns, not
                  (numRows + 1) × (numColumns + 1) — the +1 drew a phantom
                  row/column half a cell outside the board that
                  styles.canvas's overflow: 'hidden' then clipped, reading
                  as cut off rather than framed. A boundary marker, if
                  wanted, belongs in styles.canvas's border, not here. */}
              {Array.from({ length: numRows }, (_, y) =>
                Array.from({ length: numColumns }, (_, x) => (
                  <Circle
                    key={`dot-${x}-${y}`}
                    cx={x * CELL_SIZE + CELL_SIZE / 2}
                    cy={y * CELL_SIZE + CELL_SIZE / 2}
                    r={DOT_R}
                    fill="rgba(74,158,255,0.12)"
                  />
                )),
              )}

              {/* Damaged cells — "missing plate" (Tucker approved 2026-09-20).
                  Terrain damage (level.damagedCells) and failure craters are
                  the same hole in the deck; a cell blown during the CURRENT
                  run additionally carries a live ember. Drawing lives in
                  DamagedCell so this screen stays a layout file. */}
              {Array.from(blownCells).map(key => {
                const [gx, gy] = key.split(',').map(Number);
                return (
                  <DamagedCell
                    key={`damaged-${key}`}
                    size={CELL_SIZE}
                    x={gx * CELL_SIZE}
                    y={gy * CELL_SIZE}
                    live={liveBurnCells.has(key)}
                  />
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

            {/* Drag hover highlight — copper when the cell is a valid drop
                target, red when occupied/blown. Sits under the floating ghost
                piece so the Engineer sees exactly where the drop will land. */}
            {dragHoverCell && (
              <View
                pointerEvents="none"
                style={[
                  styles.dragHoverCell,
                  dragHoverCell.valid
                    ? styles.dragHoverCellValid
                    : styles.dragHoverCellInvalid,
                  {
                    left: dragHoverCell.gridX * CELL_SIZE,
                    top: dragHoverCell.gridY * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  },
                ]}
              />
            )}

            {/* Tutorial placed-piece marker — zero-size invisible View at the
                placed piece's grid cell. TutorialHUDOverlay measures it with
                measureInWindow to fly the CAPTURE beat orb to the right spot. */}
            {tutorialIsActive && tutorialPlacedGridPos && (
              <View
                ref={placedPieceRef as React.RefObject<View>}
                collapsable={false}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: tutorialPlacedGridPos.gridX * CELL_SIZE,
                  top: tutorialPlacedGridPos.gridY * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                }}
              />
            )}

            {/* Ghost cells — copper valid hints on Axiom; invisible tap targets on Kepler */}
            {(selectedPieceFromTray || (!isAxiomLevel && selectedInventoryId && requisitionPhase === 'placement')) &&
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
                      // PROMPT_159: a stable handle for Maestro to place a
                      // piece on a known cell. Added to the existing
                      // TouchableOpacity — no new host, and nothing animated
                      // here.
                      testID={`board-cell-${x}-${y}`}
                      style={[
                        styles.ghostCell,
                        { left: x * CELL_SIZE, top: y * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE },
                      ]}
                      hitSlop={{ top: ghostCellSlop, bottom: ghostCellSlop, left: ghostCellSlop, right: ghostCellSlop }}
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


        {/* ── Parts Tray (every sector; AXM-013 removed the Kepler+ selector) ── */}
        {/* REQ-G-02 (Handoff 003): stays mounted for the whole level —
            conditionally unmounting it on !isExecuting removed 72pt of
            siblings the instant ENGAGE fired, translating the board ~64pt
            down the screen in the same frame the run begins (canvasOuter
            is flex:1, justifyContent:'center'). `hidden` now drives
            opacity/pointerEvents instead of existence; the run-state gate
            (isExecuting/showResults/showVoid/debugMode) is unchanged, only
            its effect is. Kepler+ mounts it when placement begins (never beside
            the REQUISITION store) and it stays for the rest of the level. One
            element for both cases: the sectors differ only in props. */}
        {shouldMountTray({ isAxiomLevel: !!isAxiomLevel, phase: requisitionPhase }) && (
          <PieceTray
            items={trayItems}
            selectedKey={traySelectedKey}
            refs={tutorialTrayRefs}
            onPickup={handleTrayPickup}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            hidden={isExecuting || showResults || showVoid || debugMode}
            showSourceSplit={!isAxiomLevel}
            showFilterChips={!isAxiomLevel && shouldShowFilterChips(keplerTrayItemCount)}
            forceFilterAll={tutorialIsActive}
            resetKey={level?.id}
            holdSelection={selectedPlacedPiece !== null}
          />
        )}

        {/* ── REQUISITION Store (Kepler+, pre-placement phase) ── */}
        {!isAxiomLevel && requisitionPhase === 'requisition' && !showResults && !showVoid && (
          <RequisitionPanel
            discipline={discipline}
            creditBalance={credits}
            preAssignedPieces={level?.availablePieces ?? []}
            purchasableTapes={level?.purchasableTapes ?? []}
            freeTapes={level?.freeTapes ?? ['IN']}
            onConfirm={handleRequisitionConfirm}
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
        {/* REQ-G-02: stays mounted for the whole level, same reasoning as
            the Parts Tray above — this row's 56pt was the other sibling
            whose unmount produced the ENGAGE-frame layout jump. Hidden via
            opacity/pointerEvents instead of existence; RESET/ENGAGE stay
            disabled while hidden so a stray touch during the transition
            can't fire either. */}
        {(() => {
          const engageRowHidden = isExecuting || showResults || showVoid || debugMode;
          return (
            <View
              style={[styles.engageRow, engageRowHidden && { opacity: 0 }]}
              pointerEvents={engageRowHidden ? 'none' : 'auto'}
            >
              <Button
                variant="secondary"
                label="RESET"
                onPress={handleReset}
                disabled={engageRowHidden}
                style={styles.engageRowReset}
              />
              <Button
                ref={engageButtonRef}
                variant="gradient"
                label="ENGAGE MACHINE"
                onPress={handleEngage}
                disabled={engageRowHidden || !hasPlacedPieces}
                style={styles.engageRowEngage}
              />
            </View>
          );
        })()}

        {/* ── Flash Overlay ── */}
        {flashColor && (
          <View style={[styles.flashOverlay, { backgroundColor: flashColor }]} />
        )}

      </SafeAreaView>

      {/* ── Placement Transition (Kepler+) ── */}
      {!isAxiomLevel && requisitionPhase === 'transitioning' && (
        <PlacementTransition onComplete={handleTransitionComplete} />
      )}

      {/* ── Ghost piece during a tray drag ── */}
      {dragState.active && dragState.type && (
        <View
          pointerEvents="none"
          style={[
            styles.ghostDragPiece,
            { left: dragState.x - CELL_SIZE / 2, top: dragState.y - CELL_SIZE / 2 },
          ]}
        >
          <PieceIcon
            type={dragState.type}
            size={CELL_SIZE * 0.6}
            color={getPieceColor(dragState.type)}
          />
        </View>
      )}

      {/* ── Blown-cell rejection: the ghost glides back to the tray ── */}
      {snapBack && (
        <DragGhostSnapBack
          key={snapBack.id}
          type={snapBack.type}
          color={getPieceColor(snapBack.type)}
          size={CELL_SIZE}
          from={snapBack.from}
          to={snapBack.to}
          onDone={() => setSnapBack(null)}
        />
      )}

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
        showSpecNotMet={showSpecNotMet}
        setShowSpecNotMet={setShowSpecNotMet}
        specNotMetData={specNotMetData}
        setSpecNotMetData={setSpecNotMetData}
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
        mayBonus={mayBonus}
        blownCells={blownCells}
        setBlownCells={setBlownCells}
        failCount={failCount}
        voidQuoteIndex={voidQuoteIndex}
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
        showRequiredNotEngaged={showRequiredNotEngaged}
        setShowRequiredNotEngaged={setShowRequiredNotEngaged}
        requiredNotEngagedLine={requiredNotEngagedLine}
      />

      {/* ── Spec Sheet panel (SE-TM-030) — read-only requirement reference ── */}
      <SpecSheetPanel
        level={level}
        visible={showSpecSheet}
        onClose={() => setShowSpecSheet(false)}
      />

      {/* ── HUD Tutorial Overlay ── */}
      {/* Gated on !isExecuting so measure() calls don't race beam-animation
          setState updates during the run (Prompt 83). The overlay
          remounts at its persisted step once the run resolves. */}
      {/* Axiom runs the overlay from mount. Kepler+ runs it only in the
          placement phase, after the REQUISITION store closes — that is when the
          board and tray are mounted, so 'boardGrid'/'tray*' targets measure
          reliably (the requisition-phase store screen is not a tutorial target). */}
      {(forceTutorial || (!tutorialComplete && !tutorialSkipped && !isLevelPreviouslyCompleted)) &&
        !isExecuting && (level?.tutorialSteps?.length ?? 0) > 0 &&
        (level?.sector === 'axiom' ||
          (!isAxiomLevel && requisitionPhase === 'placement')) && (
        <TutorialHUDOverlay
          steps={level!.tutorialSteps!}
          levelId={level!.id}
          targetRefs={tutorialTargetRefs}
          spotlightCells={tutorialSpotlightCells}
          spotlightCellSize={CELL_SIZE}
          onComplete={() => { setTutorialComplete(true); setForceTutorial(false); }}
          onSkip={() => { setTutorialSkipped(true); setForceTutorial(false); }}
          isBeamActive={beamState.phase !== 'idle'}
          lastPlacedTrigger={lastPlacedTrigger}
          lastTappedTrigger={lastTappedTrigger}
        />
      )}

      {/* Glow Traveler — single reusable element. Stays mounted; opacity
          drives visibility, transforms drive position. REQ-G-04: color
          comes from the destination tape's layer via props (border,
          background, shadow, text) — a style change on the same
          already-mounted host, never a remount. */}
      <RNAnimated.View
        pointerEvents="none"
        style={[
          styles.glowTraveler,
          {
            borderColor: glowTravelerColor,
            backgroundColor: glowTravelerTint,
            shadowColor: glowTravelerColor,
            opacity: tape.glowTravelerOpacity,
            transform: [
              { translateX: tape.glowTravelerX },
              { translateY: tape.glowTravelerY },
              { scale: tape.glowTravelerScale },
            ],
          },
        ]}
      >
        <Text style={[styles.glowTravelerText, { color: glowTravelerColor }]}>
          {tape.glowTravelerState.value}
        </Text>
      </RNAnimated.View>
    </Animated.View>
    </GameplayErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// REQ-G-11 (Handoff 003): GameplayScreen.styles previously retained ~65
// unused entries — pre-AXM-001 duplicates of values D-07/D-08 deleted
// elsewhere (topBar/backBtn/pauseBtn/timerText/sectorTag/levelTag/
// configRow/piece/partsTray/trayBadge/trayCost and ~40 orphaned tape
// styles, including the tapeCellGatePassed green-on-green TapeCell
// replaced) after the HUDChrome / PieceTray / TapeBarShell / TapeCell
// extractions moved their live styles into those components. Deleted;
// this file's own JSX only ever referenced the entries kept below.
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.void },
  safeArea: { flex: 1 },
  errorText: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.md, color: Colors.muted,
    textAlign: 'center', marginTop: Spacing.xxxl,
  },

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

  // Ghost piece during a tray drag
  ghostDragPiece: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    opacity: 0.85,
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
  dragHoverCell: {
    position: 'absolute',
    borderRadius: PIECE_RADIUS,
    borderWidth: 2,
    zIndex: 150,
  },
  // REQ-G-03 (Handoff 003): matches ghostInnerValid (copper), not the
  // Physics beam amber — the Axiom placement hint and the Kepler drag-hover
  // highlight are the same "valid drop" signal and should read as one.
  dragHoverCellValid: {
    borderColor: Colors.copper,
    backgroundColor: 'rgba(200,121,65,0.16)',
  },
  dragHoverCellInvalid: {
    borderColor: 'rgba(200,60,60,0.8)',
    backgroundColor: 'rgba(200,60,60,0.14)',
  },

  creditErrorWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  // REQ-G-10: 9 -> FontSizes.floor.
  creditErrorText: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.red, letterSpacing: 1,
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
  // REQ-G-10: 9 -> FontSizes.floor.
  debugBtnText: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.amber, letterSpacing: 1,
  },
  // REQ-G-10: 10 -> FontSizes.floor.
  debugStep: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.starWhite,
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

  // REQ-G-04: borderColor / backgroundColor / shadowColor / text color are
  // no longer hardcoded here — they come from glowTravelerColor /
  // glowTravelerTint, derived per-render from the traveler's destination
  // layer (tokens.ts tapeInBar / tapeTrailBar / tapeOutBar).
  glowTraveler: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
  },
  // REQ-G-10: 10 -> FontSizes.floor.
  glowTravelerText: {
    fontFamily: Fonts.spaceMono,
    fontSize: FontSizes.floor,
    fontWeight: 'bold',
  },
});
