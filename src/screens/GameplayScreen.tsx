import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Rect, Path, G, Polyline } from 'react-native-svg';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PieceType, PlacedPiece, ExecutionStep, TutorialHint as TutorialHintType, ScoringCategory, PortSide } from '../game/types';
import { getPieceCost } from '../game/types';
import { getOutputPorts, getInputPorts } from '../game/engine';
import { AXIOM_LEVELS } from '../game/levels';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Grid constants ───────────────────────────────────────────────────────────

const DOT_R = 1.5;
const PIECE_RADIUS = 10;
const CANVAS_PAD = 16;  // padding inside canvas area
const MIN_CELL = 58;
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
  inputPort: 'IN',
  outputPort: 'OUT',
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
};

function getPieceColor(type: PieceType): string {
  switch (type) {
    case 'configNode':
    case 'scanner':
    case 'transmitter':
      return Colors.amber;
    default:
      return Colors.blue;
  }
}

// Segmented beam color by piece layer.
// Purple = data entry/exit (source, output)
// Amber  = physics layer (conveyor, gear, splitter)
// Blue   = protocol layer (scanner, configNode, transmitter)
function getBeamColor(pieceType: string): string {
  switch (pieceType) {
    case 'inputPort':
    case 'outputPort':
      return '#8B5CF6';
    case 'conveyor':
    case 'gear':
    case 'splitter':
      return '#F0B429';
    case 'scanner':
    case 'configNode':
    case 'config_node':
    case 'transmitter':
      return '#00D4FF';
    default:
      return '#F0B429';
  }
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Signal beam path utilities ───────────────────────────────────────────────

type Pt = { x: number; y: number };
type Segment = { s: number; e: number; l: number; dx: number; dy: number; x0: number; y0: number };
type SignalPath = { segs: Segment[]; total: number };

function buildSignalPath(points: Pt[]): SignalPath {
  const segs: Segment[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const l = Math.sqrt(dx * dx + dy * dy);
    segs.push({ s: total, e: total + l, l, dx, dy, x0: points[i - 1].x, y0: points[i - 1].y });
    total += l;
  }
  return { segs, total };
}

function posAlongPath(path: SignalPath, d: number): Pt {
  d = Math.max(0, Math.min(d, path.total));
  for (const seg of path.segs) {
    if (d <= seg.e) {
      const t = seg.l > 0 ? (d - seg.s) / seg.l : 0;
      return { x: seg.x0 + seg.dx * t, y: seg.y0 + seg.dy * t };
    }
  }
  const last = path.segs[path.segs.length - 1];
  return last ? { x: last.x0 + last.dx, y: last.y0 + last.dy } : { x: 0, y: 0 };
}

const easeOut3 = (t: number) => 1 - Math.pow(1 - t, 3);

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
  const trayConveyorRef = useRef<View>(null);
  const trayGearRef = useRef<View>(null);
  const trayConfigNodeRef = useRef<View>(null);
  const traySplitterRef = useRef<View>(null);
  const traScannerRef = useRef<View>(null);
  const trayTransmitterRef = useRef<View>(null);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [tutorialSkipped, setTutorialSkipped] = useState(false);
  const [showDisciplineCard, setShowDisciplineCard] = useState(false);
  const [creditError, setCreditError] = useState(false);

  const [heldPieceId, setHeldPieceId] = useState<string | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [showTeachCard, setShowTeachCard] = useState<string[] | null>(null);
  const [teachCardLine, setTeachCardLine] = useState(0);
  const [showBriefing, setShowBriefing] = useState(true);
  const [showEconomyIntro, setShowEconomyIntro] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
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
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // ── New signal beam animation state ──
  const [beamHead, setBeamHead] = useState<Pt | null>(null);
  const [beamHeadColor, setBeamHeadColor] = useState('#8B5CF6');
  const [trailSegments, setTrailSegments] = useState<{ points: Pt[]; color: string }[]>([]);
  const [voidPulse, setVoidPulse] = useState<{ x: number; y: number; r: number; opacity: number } | null>(null);
  const [litWires, setLitWires] = useState<Set<string>>(new Set());
  const [flashingPieces, setFlashingPieces] = useState<Map<string, string>>(new Map());
  // Active per-piece animations (rolling, spinning, charging, etc.) keyed by
  // piece id. Values are animation tags matching PieceIcon props.
  const [activeAnimations, setActiveAnimations] = useState<Map<string, string>>(new Map());
  const [gateResults, setGateResults] = useState<Map<string, 'pass' | 'block'>>(new Map());
  // Per-piece failure colors for red-X overlay on wrong output / void.
  const [failColors, setFailColors] = useState<Map<string, string>>(new Map());
  const [lockedPieces, setLockedPieces] = useState<Set<string>>(new Set());
  const [chargePos, setChargePos] = useState<Pt | null>(null);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [lockRings, setLockRings] = useState<{ x: number; y: number; r: number; opacity: number }[]>([]);
  const [signalPhase, setSignalPhase] = useState<'idle' | 'charge' | 'beam' | 'lock'>('idle');
  const [currentPulseIndex, setCurrentPulseIndex] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const flashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Screen is immediately visible — slide_from_bottom handles entry transition
  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Derived (all hooks must be above the early return) ──
  const level = currentLevel;

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
    if (!level) return;
    if (level.sector === 'axiom') return; // free pieces on tutorial
    setLevelBudget(level.budget ?? 0);
    return () => resetLevelBudget();
  }, [level?.id]);

  // ── Tutorial hints setup (suppress on replay) ──
  const isReplay = level ? isLevelDone(level.id) : false;
  const isAxiomLevel = level?.sector === 'axiom';

  // ── Tutorial active derivation (matches overlay render gate) ──
  const tutorialIsActive =
    !tutorialComplete &&
    !tutorialSkipped &&
    !isReplay &&
    level?.sector === 'axiom' &&
    (level?.tutorialSteps?.length ?? 0) > 0;
  const tutorialIsActiveRef = useRef(tutorialIsActive);
  useEffect(() => {
    tutorialIsActiveRef.current = tutorialIsActive;
  }, [tutorialIsActive]);

  // ── Auto-dismiss COGS briefing strip ──
  // During an active tutorial, hide it immediately — the tutorial overlay
  // is already narrating; COGS should not compete with it. Otherwise fade
  // after 4 seconds.
  useEffect(() => {
    if (!showBriefing) return;
    if (tutorialIsActive) {
      setShowBriefing(false);
      return;
    }
    const t = setTimeout(() => setShowBriefing(false), 4000);
    return () => clearTimeout(t);
  }, [showBriefing, tutorialIsActive]);

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
      if (animFrameRef.current != null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      flashTimersRef.current.forEach(t => clearTimeout(t));
      flashTimersRef.current = [];
    };
  }, []);

  // ── Pause modal stops/resumes timer ──
  useEffect(() => {
    if (lockedRef.current) return;
    timerRunning.current = !showPauseModal;
  }, [showPauseModal]);

  // ── HUD tutorial overlay hydration ──
  useEffect(() => {
    if (!level || !isAxiomLevel || isReplay) return;
    if (!level.tutorialSteps || level.tutorialSteps.length === 0) return;
    (async () => {
      const done = await AsyncStorage.getItem(`axiom_tutorial_complete_${level.id}`);
      const skipped = await AsyncStorage.getItem(`axiom_tutorial_skipped_${level.id}`);
      if (done) setTutorialComplete(true);
      if (skipped) setTutorialSkipped(true);
    })();
  }, [level?.id, isAxiomLevel, isReplay]);

  useEffect(() => {
    if (!level || !isAxiomLevel || isReplay || !level.tutorialHints) return;
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
    if (!level || !isAxiomLevel || isReplay || !level.tutorialHints) return;
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
  }, [level, isAxiomLevel, isReplay, currentHint]);

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
  const playerPieces = pieces.filter(p => !p.isPrePlaced);
  const hasPlacedPieces = playerPieces.length > 0;

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
    const source = pieces.find(p => p.type === 'inputPort');
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
    if (isExecuting || showResults || showVoid) return;

    // Held piece repositioning (from long press)
    if (heldPieceId) {
      movePiece(heldPieceId, gridX, gridY);
      setHeldPieceId(null);
      selectPlaced(null);
      return;
    }

    if (selectedPieceFromTray) {
      const count = availableCounts[selectedPieceFromTray] || 0;
      if (count > 0) {
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
        if (!hasPlacedPieces) triggerHints('onFirstPiecePlaced');
      }
    } else if (selectedPlacedPiece) {
      movePiece(selectedPlacedPiece, gridX, gridY);
      selectPlaced(null);
    }
  }, [selectedPieceFromTray, selectedPlacedPiece, heldPieceId, isExecuting, showResults, showVoid, availableCounts, placePiece, movePiece, discipline, spendCredits, hasPlacedPieces, triggerHints, selectPlaced, getAutoRotation]);

  // ── Piece tap handler ──
  const handlePieceTap = useCallback((piece: PlacedPiece) => {
    if (isExecuting || showResults || showVoid) return;
    if (piece.isPrePlaced) return;

    // If this piece is held (long-pressed), cancel hold
    if (heldPieceId === piece.id) {
      setHeldPieceId(null);
      selectPlaced(null);
      return;
    }

    // Tap on placed piece rotates it 90°
    rotatePiece(piece.id);
  }, [isExecuting, showResults, showVoid, rotatePiece, heldPieceId, selectPlaced]);

  // ── Long press to pick up piece for repositioning ──
  const handlePieceLongPress = useCallback((piece: PlacedPiece) => {
    if (piece.isPrePlaced) return;
    if (isExecuting || showResults || showVoid) return;
    // Enter "held" state — piece stays on board, ghost cells appear
    setHeldPieceId(piece.id);
    selectPlaced(piece.id);
  }, [isExecuting, showResults, showVoid, selectPlaced]);

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
    triggerHints('onEngage');
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

    // ── New beam animation pipeline ─────────────────────────────────────────
    // Determine pulse boundaries by counting source-typed steps. Each source
    // step begins a new traversal.
    const pulseStarts: number[] = [];
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].type === 'inputPort') pulseStarts.push(i);
    }
    if (pulseStarts.length === 0) pulseStarts.push(0);
    const pulses: typeof steps[] = [];
    for (let pi = 0; pi < pulseStarts.length; pi++) {
      const start = pulseStarts[pi];
      const end = pi + 1 < pulseStarts.length ? pulseStarts[pi + 1] : steps.length;
      pulses.push(steps.slice(start, end));
    }

    const flashPiece = (pieceId: string, c: string) => {
      setFlashingPieces(prev => {
        const m = new Map(prev);
        m.set(pieceId, c);
        return m;
      });
      const t = setTimeout(() => {
        setFlashingPieces(prev => {
          const m = new Map(prev);
          m.delete(pieceId);
          return m;
        });
      }, 180);
      flashTimersRef.current.push(t);
    };

    const runPulse = (pulseSteps: typeof steps): Promise<void> => new Promise<void>(resolveAll => {
      // Build waypoints from piece centers
      const waypoints: Pt[] = [];
      for (const st of pulseSteps) {
        const c = getPieceCenter(st.pieceId);
        if (c) waypoints.push(c);
      }
      if (waypoints.length < 2) {
        // Single-piece pulse: just flash it.
        if (pulseSteps[0]) {
          const p = pieces.find(pp => pp.id === pulseSteps[0].pieceId);
          flashPiece(pulseSteps[0].pieceId, p?.type === 'outputPort' ? '#00C48C' : '#00D4FF');
        }
        setTimeout(resolveAll, 180);
        return;
      }
      const path = buildSignalPath(waypoints);
      const refLen = CELL_SIZE * 4;
      const totalMs = Math.max(300, Math.min(1200, 480 * (path.total / refLen)));

      // Segment colors derived from piece type per waypoint.
      // Segment i (from waypoints[i] to waypoints[i+1]) is colored by
      // the piece the beam is leaving — waypoints[i]'s piece type.
      const segColors: string[] = pulseSteps.map(s => getBeamColor(s.type));

      // Void detection: if this pulse ends in a void step, the beam dies red
      // at the piece BEFORE the void waypoint. We detect by checking the last
      // step — if it's 'void', the preceding piece is the blocker.
      const pulseHasVoid = pulseSteps.some(s => s.type === 'void');

      // Initialize a fresh purple segment at the source.
      setTrailSegments([{ points: [], color: segColors[0] ?? '#8B5CF6' }]);

      const start = performance.now();
      const lit = new Set<number>();
      const flashed = new Set<number>();

      const tick = () => {
        const now = performance.now();
        const rawT = Math.min(1, (now - start) / totalMs);
        const t = easeOut3(rawT);
        const headDist = t * path.total;

        const head = posAlongPath(path, headDist);

        // Rebuild segments from path up to headDist. Each path seg i
        // corresponds to waypoints[i] → waypoints[i+1] and is colored by
        // segColors[i] (the piece being left).
        const newSegs: { points: Pt[]; color: string }[] = [];
        for (let i = 0; i < path.segs.length; i++) {
          const sg = path.segs[i];
          const color = segColors[i] ?? '#F0B429';
          if (headDist >= sg.e) {
            newSegs.push({ points: [{ x: sg.x0, y: sg.y0 }, { x: sg.x0 + sg.dx, y: sg.y0 + sg.dy }], color });
          } else if (headDist > sg.s) {
            const tt = sg.l > 0 ? (headDist - sg.s) / sg.l : 0;
            newSegs.push({ points: [{ x: sg.x0, y: sg.y0 }, { x: sg.x0 + sg.dx * tt, y: sg.y0 + sg.dy * tt }], color });
            break;
          }
        }
        setTrailSegments(newSegs);

        // Beam head color = current segment color (or red on void)
        const currentColor = pulseHasVoid && rawT > 0.85
          ? '#FF3B3B'
          : (newSegs.length > 0 ? newSegs[newSegs.length - 1].color : '#8B5CF6');
        setBeamHead(head);
        setBeamHeadColor(currentColor);

        // Light wires whose midpoint we've passed
        for (let i = 0; i < path.segs.length; i++) {
          if (lit.has(i)) continue;
          const mid = path.segs[i].s + path.segs[i].l / 2;
          if (headDist >= mid) {
            lit.add(i);
            const fromId = pulseSteps[i].pieceId;
            const toId = pulseSteps[i + 1]?.pieceId;
            if (fromId && toId) {
              setLitWires(prev => {
                const next = new Set(prev);
                next.add(`${fromId}_${toId}`);
                next.add(`${toId}_${fromId}`);
                return next;
              });
            }
          }
        }

        // Flash nodes within 4px of waypoint
        for (let i = 0; i < waypoints.length; i++) {
          if (flashed.has(i)) continue;
          const wp = waypoints[i];
          const dx = head.x - wp.x;
          const dy = head.y - wp.y;
          if (Math.sqrt(dx * dx + dy * dy) < 4 || (i === waypoints.length - 1 && rawT >= 1)) {
            flashed.add(i);
            const stp = pulseSteps[i];
            const isVoidBlocker = pulseHasVoid && i === waypoints.length - 1;
            const flashCol = isVoidBlocker ? '#FF3B3B' : getBeamColor(stp.type);
            flashPiece(stp.pieceId, flashCol);
            // Drive per-piece animation prop via activeAnimations map.
            const animMap: Record<string, { tag: string; duration: number }> = {
              inputPort: { tag: 'charging', duration: 280 },
              outputPort: { tag: 'locking', duration: 400 },
              conveyor: { tag: 'rolling', duration: 180 },
              gear: { tag: 'spinning', duration: 400 },
              splitter: { tag: 'splitting', duration: 180 },
              scanner: { tag: 'scanning', duration: 200 },
              configNode: { tag: 'gating', duration: 300 },
              transmitter: { tag: 'transmitting', duration: 180 },
            };
            const anim = animMap[stp.type];
            if (anim) {
              const pieceId = stp.pieceId;
              setActiveAnimations(prev => {
                const next = new Map(prev);
                next.set(pieceId, anim.tag);
                return next;
              });
              if (stp.type === 'configNode') {
                const result: 'pass' | 'block' = stp.success ? 'pass' : 'block';
                setGateResults(prev => {
                  const next = new Map(prev);
                  next.set(pieceId, result);
                  return next;
                });
              }
              const t = setTimeout(() => {
                setActiveAnimations(prev => {
                  const next = new Map(prev);
                  next.delete(pieceId);
                  return next;
                });
              }, anim.duration);
              flashTimersRef.current.push(t);
            }
          }
        }

        if (rawT < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          if (pulseHasVoid) {
            // Red pulse expanding from the final (blocker) waypoint
            const blocker = waypoints[waypoints.length - 1];
            const pulseStart = performance.now();
            const pulseTick = () => {
              const e = performance.now() - pulseStart;
              const p = Math.min(1, e / 320);
              setVoidPulse({ x: blocker.x, y: blocker.y, r: 6 + p * 40, opacity: 0.9 * (1 - p) });
              if (p < 1) {
                animFrameRef.current = requestAnimationFrame(pulseTick);
              } else {
                setVoidPulse(null);
                setBeamHead(null);
                setTrailSegments([]);
                resolveAll();
              }
            };
            animFrameRef.current = requestAnimationFrame(pulseTick);
          } else {
            setBeamHead(null);
            setTrailSegments([]);
            resolveAll();
          }
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);
    });

    // PHASE 1 — CHARGE (300ms)
    const sourcePiece = machineState.pieces.find(p => p.type === 'inputPort');
    if (sourcePiece) {
      const sp = getPieceCenter(sourcePiece.id);
      if (sp) {
        setChargePos(sp);
        setSignalPhase('charge');
        const chargeStart = performance.now();
        await new Promise<void>(res => {
          const tick = () => {
            const ct = Math.min(1, (performance.now() - chargeStart) / 280);
            setChargeProgress(ct);
            if (ct < 1) {
              animFrameRef.current = requestAnimationFrame(tick);
            } else {
              res();
            }
          };
          animFrameRef.current = requestAnimationFrame(tick);
        });
        setChargePos(null);
      }
    }

    // PHASE 2 — BEAM (one or more pulses)
    setSignalPhase('beam');
    for (let p = 0; p < pulses.length; p++) {
      setCurrentPulseIndex(p);
      await runPulse(pulses[p]);
      if (p < pulses.length - 1) {
        // Brief gap + source re-flash
        if (sourcePiece) flashPiece(sourcePiece.id, '#F0B429');
        await new Promise(r => setTimeout(r, 80));
      }
    }

    // Wrong-output detection for tape-enabled levels. If the tape didn't
    // match expectedOutput, suppress the green lock sequence and show a
    // red wrong-output ring burst instead.
    const hasTape = !!(level.inputTape && level.expectedOutput);
    const storeOutputTape = useGameStore.getState().machineState.outputTape;
    const tapeMatches = hasTape && !!storeOutputTape && !!level.expectedOutput &&
      storeOutputTape.length === level.expectedOutput.length &&
      storeOutputTape.every((v, i) => v === (level.expectedOutput as number[])[i]);
    const reachedOutputEveryPulse = steps.filter(s => s.type === 'outputPort' && s.success).length >= (pulses.length || 1);
    const wrongOutput = hasTape && reachedOutputEveryPulse && !tapeMatches;

    if (wrongOutput) {
      // Mark mismatched outputTape cells for X overlay on output port.
      const outputPiece = machineState.pieces.find(p => p.type === 'outputPort');
      if (outputPiece) {
        setFailColors(prev => {
          const next = new Map(prev);
          next.set(outputPiece.id, '#FF3B3B');
          return next;
        });
        const op = getPieceCenter(outputPiece.id);
        if (op) {
          // 2 red rings expanding from output, 200ms each, staggered.
          const ringStart = performance.now();
          await new Promise<void>(res => {
            const tick = () => {
              const elapsed = performance.now() - ringStart;
              const ringsState: { x: number; y: number; r: number; opacity: number }[] = [];
              for (let ri = 0; ri < 2; ri++) {
                const ringElapsed = elapsed - ri * 100;
                if (ringElapsed >= 0 && ringElapsed <= 200) {
                  const rt = ringElapsed / 200;
                  ringsState.push({ x: op.x, y: op.y, r: 6 + rt * 36, opacity: 0.95 * (1 - rt) });
                }
              }
              // Reuse lockRings state but the rendering will still show
              // green rings; for simplicity we overlay via voidPulse too.
              if (ringsState[0]) setVoidPulse({ x: ringsState[0].x, y: ringsState[0].y, r: ringsState[0].r, opacity: ringsState[0].opacity });
              if (elapsed < 320) {
                animFrameRef.current = requestAnimationFrame(tick);
              } else {
                setVoidPulse(null);
                res();
              }
            };
            animFrameRef.current = requestAnimationFrame(tick);
          });
        }
      }
    }

    // PHASE 3 — LOCK (400ms) — only on success (and matching tape if tape level)
    const succeededFinal = !wrongOutput && steps.some(s => s.type === 'outputPort' && s.success);
    if (succeededFinal) {
      const outputPiece = machineState.pieces.find(p => p.type === 'outputPort');
      if (outputPiece) {
        const op = getPieceCenter(outputPiece.id);
        if (op) {
          setSignalPhase('lock');
          // Two expanding rings (200ms each, staggered)
          const ringStart = performance.now();
          await new Promise<void>(res => {
            const tick = () => {
              const elapsed = performance.now() - ringStart;
              const ringsState: { x: number; y: number; r: number; opacity: number }[] = [];
              for (let ri = 0; ri < 2; ri++) {
                const ringElapsed = elapsed - ri * 100;
                if (ringElapsed >= 0 && ringElapsed <= 200) {
                  const rt = ringElapsed / 200;
                  ringsState.push({ x: op.x, y: op.y, r: 6 + rt * 36, opacity: 0.95 * (1 - rt) });
                }
              }
              setLockRings(ringsState);
              if (elapsed < 320) {
                animFrameRef.current = requestAnimationFrame(tick);
              } else {
                setLockRings([]);
                res();
              }
            };
            animFrameRef.current = requestAnimationFrame(tick);
          });
          // Lock all pieces and wires
          setLockedPieces(new Set(machineState.pieces.map(p => p.id)));
          setLitWires(prev => {
            const next = new Set(prev);
            for (const w of wires) {
              next.add(`${w.fromPieceId}_${w.toPieceId}`);
              next.add(`${w.toPieceId}_${w.fromPieceId}`);
            }
            return next;
          });
          await new Promise(r => setTimeout(r, 160));
        }
      }
    }
    setSignalPhase('idle');

    // Flash effect before showing overlay
    const succeeded = !wrongOutput && steps.some(s => s.type === 'outputPort' && s.success);
    if (succeeded) {
      // Calculate score using new scoring engine
      const engageDurationMs = Date.now() - engageStartTime;
      const currentDiscipline = discipline ?? 'field'; // fallback
      const result = calculateScore({
        executionSteps: steps,
        placedPieces: machineState.pieces,
        optimalPieces: level.optimalPieces,
        discipline: currentDiscipline,
        engageDurationMs,
        elapsedSeconds: lockedElapsed,
      });

      // Axiom tutorial levels: always 3 stars, honest COGS quote
      const isTutorial = level.sector === 'axiom';
      const displayStars = isTutorial ? 3 : result.stars;
      const displayResult: ScoreResult = isTutorial
        ? { ...result, stars: 3 as 0 | 1 | 2 | 3 }
        : result;
      setScoreResult(displayResult);

      const playerPieceCount = machineState.pieces.filter(p => !p.isPrePlaced).length;
      setCogsScoreComment(
        isTutorial
          ? getTutorialCOGSComment(result.total, currentDiscipline)
          : getCOGSScoreComment(result.breakdown, currentDiscipline, result.stars, playerPieceCount, level.optimalPieces),
      );

      // Record progression — save displayed stars (3 for tutorial)
      const levelId = level.id;
      const starsEarned = displayStars as 0 | 1 | 2 | 3;
      const isFirst = completeLevel(levelId, starsEarned);
      setFirstTimeBonus(isFirst);

      // Credit rewards
      if (result.stars === 3) earnCredits(levelSpent + 25);
      else if (result.stars === 2) earnCredits(Math.ceil(levelSpent * 0.5));
      if (isFirst) {
        earnCredits(25);
        addCredits(25);
      }
      triggerHints('onSuccess');

      // Green flash
      setFlashColor(Colors.green);
      await new Promise(resolve => setTimeout(resolve, 300));
      setFlashColor(null);

      // Show system restored for Axiom levels
      if (level.systemRepaired) {
        setShowSystemRestored(level.systemRepaired);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setShowSystemRestored(null);
      } else {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // A1-8 completion scene — check if all 8 Axiom levels are now done
      if (level.id === 'A1-8' && isFirst) {
        const { getSectorCompletedCount } = useProgressionStore.getState();
        if (getSectorCompletedCount('A1-') >= 8) {
          setShowCompletionScene(true);
          const lines = [
            'The Axiom is fully operational.',
            'For the first time since I can remember.',
            '',
            'You did that.',
            '',
            'I will not say that again.',
          ];
          const delays = [1200, 2400, 3600, 4400, 5200, 5800];
          for (let i = 0; i < lines.length; i++) {
            await new Promise(resolve => setTimeout(resolve, i === 0 ? delays[0] : delays[i] - delays[i - 1]));
            setCompletionText(lines.slice(0, i + 1).join('\n'));
          }
          await new Promise(resolve => setTimeout(resolve, 1200));
          setShowCompletionScene(false);
          navigation.navigate('Tabs');
          return;
        }
      }

      setShowResults(true);
    } else {
      // Red flash 3 times
      for (let f = 0; f < 3; f++) {
        setFlashColor(Colors.red);
        await new Promise(resolve => setTimeout(resolve, 150));
        setFlashColor(null);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await new Promise(resolve => setTimeout(resolve, 200));

      // Progressive teaching on A1-3 failures
      const newFailCount = failCount + 1;
      setFailCount(newFailCount);

      if (level.id === 'A1-3' && newFailCount === 1) {
        setShowTeachCard([
          'The Config Node blocked the signal.',
          'A Config Node reads the current Configuration value. It only passes the signal when that value matches its condition.',
          'The condition here requires Configuration = 1. Check that Configuration is set to ACTIVE before engaging.',
          'The Data Trail at the bottom is the memory. The Scanner reads it. What it reads can affect the Configuration.',
        ]);
        setTeachCardLine(0);
        return;
      }
      if (level.id === 'A1-3' && newFailCount === 2) {
        setShowTeachCard([
          'Still blocked. Let me be more direct.',
          'The Data Trail reads left to right as the signal travels. Cell 0 first, then cell 1, then cell 2.',
          'The Scanner reads the trail value at the current head position when the signal reaches it.',
          'Check which value the Scanner will read. If it reads 1, the Config Node opens. If it reads 0, it stays closed.',
          'Toggle the Configuration to ACTIVE before engaging. That is the key.',
        ]);
        setTeachCardLine(0);
        return;
      }

      setShowVoid(true);
      triggerHints('onVoid');
    }
  }, [isExecuting, engage, getPieceCenter, triggerHints, levelSpent, earnCredits]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setShowResults(false);
    setShowVoid(false);
    // Cancel beam animation and clear all visual signal state
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    flashTimersRef.current.forEach(t => clearTimeout(t));
    flashTimersRef.current = [];
    setBeamHead(null);
    setTrailSegments([]);
    setVoidPulse(null);
    setLitWires(new Set());
    setFlashingPieces(new Map());
    setLockedPieces(new Set());
    setChargePos(null);
    setLockRings([]);
    setSignalPhase('idle');
    setCurrentPulseIndex(0);
    setActiveAnimations(new Map());
    setGateResults(new Map());
    setFailColors(new Map());
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
            {level.inputTape && level.inputTape.length > 0 && signalPhase === 'beam' && (
              <Text style={styles.pulseCounterText}>
                PULSE {Math.min(currentPulseIndex + 1, level.inputTape.length)} / {level.inputTape.length}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.hintBtn} activeOpacity={0.7} onPress={() => setShowBriefing(true)}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Circle cx="12" cy="12" r="10" fill="none" stroke={Colors.muted} strokeWidth="2" />
              <Path d="M12 16 L12 12" stroke={Colors.muted} strokeWidth="2" strokeLinecap="round" />
              <Circle cx="12" cy="8" r="1" fill={Colors.muted} />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* ── Configuration Toggle (for levels with configNodes) ── */}
        {pieces.some(p => p.type === 'configNode') && (
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>CONFIGURATION</Text>
            <TouchableOpacity
              style={[
                styles.configToggle,
                configuration === 1 && styles.configToggleActive,
              ]}
              onPress={toggleConfiguration}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.configToggleText,
                configuration === 1 && styles.configToggleTextActive,
              ]}>
                {configuration === 0 ? 'INACTIVE' : 'ACTIVE'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Turing Tape Display ── */}
        {level.inputTape && level.inputTape.length > 0 && (
          <View style={styles.tapeSection}>
            <View style={styles.tapeRow}>
              <Text style={styles.tapeLabel}>IN</Text>
              <View style={styles.tapeCells}>
                {level.inputTape.map((bit, i) => {
                  const isActive = signalPhase === 'beam' && i === currentPulseIndex;
                  const isPast = signalPhase === 'beam' && i < currentPulseIndex;
                  return (
                    <View key={`in-${i}`} style={styles.tapeCellWrap}>
                      <View style={[styles.tapeHead, !isActive && { opacity: 0 }]} />
                      <View
                        style={[
                          styles.tapeCell,
                          isActive && styles.tapeCellActive,
                          isPast && styles.tapeCellPast,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tapeCellText,
                            isActive && styles.tapeCellTextActive,
                            isPast && styles.tapeCellTextPast,
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
            <View style={styles.tapeRow}>
              <Text style={styles.tapeLabel}>OUT</Text>
              <View style={styles.tapeCells}>
                {level.inputTape.map((_, i) => {
                  const written = machineState.outputTape?.[i];
                  const expected = level.expectedOutput?.[i];
                  const hasValue = written !== undefined && written !== -1;
                  const correct = hasValue && expected !== undefined && written === expected;
                  const wrong = hasValue && expected !== undefined && written !== expected;
                  return (
                    <View key={`out-${i}`} style={styles.tapeCellWrap}>
                      <View style={[styles.tapeHead, { opacity: 0 }]} />
                      <View
                        style={[
                          styles.tapeCell,
                          correct && styles.tapeCellCorrect,
                          wrong && styles.tapeCellWrong,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tapeCellText,
                            correct && styles.tapeCellTextCorrect,
                            wrong && styles.tapeCellTextWrong,
                          ]}
                        >
                          {hasValue ? written : '_'}
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

              {/* Wires — only on Axiom tutorial levels */}
              {level.sector === 'axiom' && wires.map(wire => {
                const fromPiece = pieces.find(p => p.id === wire.fromPieceId);
                const toPiece = pieces.find(p => p.id === wire.toPieceId);
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
                const isLit = litWires.has(wireKey);
                const isLocked = signalPhase === 'lock' && lockedPieces.size > 0;
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
                component prop reliably passes touches through on iOS. */}
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
            >
            <Svg
              width={gridW}
              height={gridH}
              style={StyleSheet.absoluteFill}
            >
              {signalPhase === 'charge' && chargePos && (
                <>
                  <Circle
                    cx={chargePos.x} cy={chargePos.y}
                    r={6 + chargeProgress * 18}
                    fill="none" stroke="#8B5CF6" strokeWidth={2}
                    opacity={0.8 * (1 - chargeProgress)}
                  />
                  <Circle
                    cx={chargePos.x} cy={chargePos.y}
                    r={2 + chargeProgress * 26}
                    fill="none" stroke="#8B5CF6" strokeWidth={1.5}
                    opacity={0.5 * (1 - chargeProgress)}
                  />
                </>
              )}
              {trailSegments.map((seg, i) => (
                seg.points.length > 1 ? (
                  <Polyline
                    key={`seg-${i}`}
                    points={seg.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={i === trailSegments.length - 1 ? 2.5 : 2}
                    strokeLinecap="round"
                    opacity={i === trailSegments.length - 1 ? 0.72 : 0.45}
                  />
                ) : null
              ))}
              {beamHead && (
                <>
                  <Circle cx={beamHead.x} cy={beamHead.y} r={11} fill={beamHeadColor} opacity={0.25} />
                  <Circle cx={beamHead.x} cy={beamHead.y} r={3.5} fill="white" opacity={0.95} />
                </>
              )}
              {voidPulse && (
                <Circle
                  cx={voidPulse.x} cy={voidPulse.y} r={voidPulse.r}
                  stroke="#FF3B3B" strokeWidth={2.5}
                  fill="none" opacity={voidPulse.opacity}
                />
              )}
              {lockRings.map((ring, i) => (
                <Circle
                  key={`lockring-${i}`}
                  cx={ring.x} cy={ring.y} r={ring.r}
                  stroke="#00C48C" strokeWidth={2.5}
                  fill="none" opacity={ring.opacity}
                />
              ))}
            </Svg>
            </View>

            {/* Pieces */}
            {pieces.map(piece => {
              const isPrePlaced = piece.isPrePlaced;
              const isSource = piece.type === 'inputPort';
              const isOutput = piece.type === 'outputPort';
              const isHeld = heldPieceId === piece.id;
              const pieceSize = CELL_SIZE - 4;
              const offset = (CELL_SIZE - pieceSize) / 2;
              const cellPx = piece.gridX * CELL_SIZE + offset;
              const cellPy = piece.gridY * CELL_SIZE + offset;
              const iconSize = (CELL_SIZE - 4) * 0.60;
              const iconColor = isSource ? '#F0B429' : isOutput ? '#00C48C' : getPieceColor(piece.type);
              const flashColorP = flashingPieces.get(piece.id);
              const isLocked = lockedPieces.has(piece.id);
              const borderColorP = isHeld ? Colors.copper
                : flashColorP ? flashColorP
                : isLocked ? '#00C48C'
                : undefined;
              const borderWidthP = isHeld || flashColorP || isLocked ? 2 : 0;
              const shadowC = flashColorP ?? (isLocked ? '#00C48C' : undefined);

              return (
                <Pressable
                  key={piece.id}
                  ref={isSource ? sourceNodeRef : isOutput ? outputNodeRef : undefined}
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
                      opacity: isHeld ? 0.6 : 1,
                      transform: [{ scale: isHeld ? 1.15 : 1 }],
                      zIndex: isHeld ? 10 : 0,
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
                    <PieceIcon
                      type={piece.type}
                      size={iconSize}
                      color={iconColor}
                      spinning={activeAnimations.get(piece.id) === 'spinning'}
                      scanning={activeAnimations.get(piece.id) === 'scanning'}
                      transmitting={activeAnimations.get(piece.id) === 'transmitting'}
                      rolling={activeAnimations.get(piece.id) === 'rolling'}
                      splitting={activeAnimations.get(piece.id) === 'splitting'}
                      gating={activeAnimations.get(piece.id) === 'gating'}
                      gateResult={gateResults.get(piece.id) ?? null}
                      locking={activeAnimations.get(piece.id) === 'locking'}
                      charging={activeAnimations.get(piece.id) === 'charging'}
                      failColor={failColors.get(piece.id) ?? null}
                    />
                  </View>
                </Pressable>
              );
            })}

            {/* Ghost cells — copper valid hints on Axiom, invisible taps elsewhere */}
            {(selectedPieceFromTray || heldPieceId) &&
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

        {/* ── Data Trail Strip ── */}
        {level.dataTrail.cells.length > 0 && (
          <View style={styles.dataTrailStrip}>
            <Text style={styles.dataTrailLabel}>DATA TRAIL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dataTrailScroll}>
              {machineState.dataTrail.cells.map((cell, i) => {
                const isHead = i === machineState.dataTrail.headPosition;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dataTrailCell,
                      isHead && styles.dataTrailCellHead,
                    ]}
                  >
                    <Text style={[
                      styles.dataTrailCellText,
                      isHead && styles.dataTrailCellTextHead,
                    ]}>
                      {cell}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

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
                    onPress={() => selectFromTray(isActive ? null : pt)}
                    activeOpacity={0.7}
                    disabled={count <= 0}
                  >
                    <View style={{ opacity: count > 0 && canAfford ? 1 : 0.3 }}>
                      <PieceIcon type={pt} size={22} color={color} />
                    </View>
                    <Text style={[styles.trayLabel, { color }]}>{PIECE_LABELS[pt]}</Text>
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
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              activeOpacity={0.75}
            >
              <Text style={styles.resetBtnText}>RESET</Text>
            </TouchableOpacity>
            <TouchableOpacity
              ref={engageButtonRef}
              style={[styles.engageBtn, !hasPlacedPieces && styles.engageBtnDisabled]}
              onPress={handleEngage}
              activeOpacity={0.85}
              disabled={!hasPlacedPieces}
            >
              <LinearGradient
                colors={hasPlacedPieces ? [Colors.copper, Colors.amber] : [Colors.dim, Colors.steel]}
                style={styles.engageBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.engageBtnText, !hasPlacedPieces && { color: Colors.muted }]}>
                  ENGAGE MACHINE
                </Text>
              </LinearGradient>
            </TouchableOpacity>
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
                ];
                const shown = allCats.filter(([cat]) => visible.includes(cat));
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
                </Text>
              </View>
              <View style={styles.resultsActions}>
                <TouchableOpacity
                  style={styles.resultsSecondaryBtn}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultsSecondaryText}>REPLAY</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resultsPrimaryBtn}
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
                    // Pop past MissionDossier back to LevelSelect
                    // progressionStore already updated — getAxiomState will show next level as active
                    if (navigation.canGoBack()) navigation.pop(2);
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[Colors.copper, Colors.amber]}
                    style={styles.resultsPrimaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.resultsPrimaryText}>CONTINUE</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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

        {/* ── COGS Teach Card (progressive failure teaching) ── */}
        {showTeachCard && (
          <Animated.View style={styles.overlay} entering={FadeIn.duration(400)}>
            <LinearGradient
              colors={['rgba(6,9,15,0.97)', 'rgba(10,22,40,0.99)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlayContent}>
              <CogsAvatar size="medium" state="engaged" />
              <View style={{ gap: 16, marginTop: Spacing.xl, maxWidth: 320 }}>
                {showTeachCard.slice(0, teachCardLine + 1).map((line, i) => (
                  <Text key={i} style={{
                    fontFamily: Fonts.exo2, fontSize: 13, fontStyle: 'italic',
                    color: Colors.starWhite, lineHeight: 20,
                  }}>{line}</Text>
                ))}
              </View>
              {teachCardLine < showTeachCard.length - 1 ? (
                <TouchableOpacity
                  style={{ marginTop: Spacing.xl }}
                  onPress={() => setTeachCardLine(prev => prev + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.copper, letterSpacing: 2 }}>
                    NEXT
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ marginTop: Spacing.xl }}
                  onPress={() => {
                    setShowTeachCard(null);
                    setTeachCardLine(0);
                    setShowVoid(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim, letterSpacing: 3 }}>
                    TAP TO CONTINUE
                  </Text>
                </TouchableOpacity>
              )}
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
              <TouchableOpacity
                style={[styles.resultsPrimaryBtn, { width: '100%', marginBottom: Spacing.sm }]}
                onPress={() => {
                  const ok = refillLives();
                  if (ok) {
                    setShowOutOfLives(false);
                    handleReset();
                  }
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={livesCredits >= 30 ? [Colors.circuit, '#7c5fcf'] : [Colors.dim, Colors.steel]}
                  style={styles.resultsPrimaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.resultsPrimaryText}>
                    {livesCredits >= 30 ? 'REFILL LIVES · 30 CR' : `NEED ${30 - livesCredits} MORE CR`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resultsSecondaryBtn, { width: '100%' }]}
                onPress={() => {
                  setShowOutOfLives(false);
                  navigation.goBack();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.resultsSecondaryText}>MAYBE LATER</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* ── A1-3 Discipline Acknowledgment ── */}
      {showDisciplineCard && discipline && (
        <TouchableOpacity
          style={styles.completionScene}
          activeOpacity={1}
          onPress={() => { setShowDisciplineCard(false); if (navigation.canGoBack()) navigation.pop(2); }}
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

                <TouchableOpacity
                  style={styles.pauseResumeBtn}
                  onPress={() => setShowPauseModal(false)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.pauseBtnCornerTL, { borderColor: 'rgba(0,212,255,0.5)' }]} />
                  <View style={[styles.pauseBtnCornerTR, { borderColor: 'rgba(0,212,255,0.5)' }]} />
                  <View style={[styles.pauseBtnCornerBL, { borderColor: 'rgba(0,212,255,0.5)' }]} />
                  <View style={[styles.pauseBtnCornerBR, { borderColor: 'rgba(0,212,255,0.5)' }]} />
                  <Text style={styles.pauseResumeText}>RESUME</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pauseRestartBtn}
                  onPress={() => {
                    handleReset();
                    setShowPauseModal(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pauseRestartText}>RESTART LEVEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pauseAbandonBtn}
                  onPress={() => setShowAbandonConfirm(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.pauseAbandonText}>ABANDON MISSION</Text>
                </TouchableOpacity>
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
      {!tutorialComplete && !tutorialSkipped && !isReplay &&
        level?.sector === 'axiom' && (level?.tutorialSteps?.length ?? 0) > 0 && (
        <TutorialHUDOverlay
          steps={level!.tutorialSteps!}
          levelId={level!.id}
          targetRefs={{
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
          }}
          spotlightCells={level!.prePlacedPieces
            .filter(p => p.type === 'inputPort' || p.type === 'outputPort')
            .map(p => ({
              col: p.gridX,
              row: p.gridY,
              color: p.type === 'inputPort' ? '#8B5CF6' : '#00C48C',
            }))}
          spotlightCellSize={CELL_SIZE}
          onComplete={() => setTutorialComplete(true)}
          onSkip={() => setTutorialSkipped(true)}
        />
      )}
    </Animated.View>
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
  pauseResumeBtn: {
    width: '100%',
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.35)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  pauseResumeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 12,
    color: '#00D4FF',
    letterSpacing: 1.5,
  },
  pauseBtnCornerTL: { position: 'absolute', top: 4, left: 4, width: 8, height: 8, borderTopWidth: 1, borderLeftWidth: 1 },
  pauseBtnCornerTR: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderTopWidth: 1, borderRightWidth: 1 },
  pauseBtnCornerBL: { position: 'absolute', bottom: 4, left: 4, width: 8, height: 8, borderBottomWidth: 1, borderLeftWidth: 1 },
  pauseBtnCornerBR: { position: 'absolute', bottom: 4, right: 4, width: 8, height: 8, borderBottomWidth: 1, borderRightWidth: 1 },
  pauseRestartBtn: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  pauseRestartText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
  },
  pauseAbandonBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,59,59,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,59,0.25)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pauseAbandonText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 11,
    color: 'rgba(255,59,59,0.7)',
    letterSpacing: 1.5,
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
  hintBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(74,158,255,0.15)', borderRadius: 8,
  },

  // Briefing
  briefingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(10,18,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    borderRadius: 10,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  briefingText: {
    flex: 1,
    fontFamily: Fonts.exo2, fontSize: 11, color: Colors.muted, fontStyle: 'italic',
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

  // Data trail
  dataTrailStrip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,180,41,0.15)',
  },
  dataTrailLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 7, color: Colors.amber,
    letterSpacing: 1.5, marginBottom: 4,
  },
  dataTrailScroll: { flexDirection: 'row' },
  dataTrailCell: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.3)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    backgroundColor: 'rgba(10,18,30,0.6)',
  },
  dataTrailCellHead: {
    borderColor: Colors.amber,
    backgroundColor: 'rgba(240,180,41,0.15)',
  },
  dataTrailCellText: {
    fontFamily: Fonts.spaceMono, fontSize: 11, color: Colors.muted,
  },
  dataTrailCellTextHead: { color: Colors.amber, fontWeight: 'bold' },

  // Parts tray
  partsTray: {
    height: 80,
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.12)',
    justifyContent: 'center',
  },
  partsTrayInner: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'center',
  },
  trayItem: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,28,0.8)',
    gap: 2,
    position: 'relative',
  },
  trayLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 7, letterSpacing: 0.5,
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
  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  resetBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 10, color: Colors.muted, letterSpacing: 1,
  },
  engageBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  engageBtnDisabled: { opacity: 0.5 },
  engageBtnGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  engageBtnText: {
    fontFamily: Fonts.orbitron, fontSize: 11, fontWeight: 'bold',
    letterSpacing: 2, color: Colors.void,
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
  resultsSecondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.steel,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  resultsSecondaryText: {
    fontFamily: Fonts.orbitron, fontSize: 10, color: Colors.muted, letterSpacing: 1,
  },
  resultsPrimaryBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultsPrimaryGradient: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  resultsPrimaryText: {
    fontFamily: Fonts.orbitron, fontSize: 11, fontWeight: 'bold',
    letterSpacing: 2, color: Colors.void,
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
  tapeSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  tapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tapeLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 9,
    color: '#1A3050',
    letterSpacing: 1,
    width: 24,
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
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  tapeCellPast: {
    borderColor: 'rgba(139,92,246,0.3)',
  },
  tapeCellCorrect: {
    borderColor: '#00C48C',
    backgroundColor: 'rgba(0,196,140,0.08)',
  },
  tapeCellWrong: {
    borderColor: '#FF3B3B',
    backgroundColor: 'rgba(255,59,59,0.08)',
  },
  tapeCellText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: '#1A3050',
  },
  tapeCellTextActive: {
    color: '#8B5CF6',
  },
  tapeCellTextPast: {
    color: 'rgba(139,92,246,0.3)',
  },
  tapeCellTextCorrect: {
    color: '#00C48C',
  },
  tapeCellTextWrong: {
    color: '#FF3B3B',
  },
});
