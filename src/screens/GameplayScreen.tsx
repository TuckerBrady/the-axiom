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
import Svg, { Circle, Line, Rect, Path, G } from 'react-native-svg';
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
import { BackButton } from '../components/BackButton';
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import { useLivesStore } from '../store/livesStore';
import { useProgressionStore } from '../store/progressionStore';
import { usePlayerStore, DISCIPLINE_LABELS } from '../store/playerStore';
import { useEconomyStore } from '../store/economyStore';
import { calculateScore, getCOGSScoreComment, getTutorialCOGSComment } from '../game/scoring';
import type { ScoreResult } from '../game/scoring';
import { TutorialHint } from '../components/TutorialHint';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PieceType, PlacedPiece, ExecutionStep, TutorialHint as TutorialHintType, ScoringCategory, PortSide } from '../game/types';
import { getPieceCost } from '../game/types';
import { getOutputPorts, getInputPorts } from '../game/engine';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Grid constants ───────────────────────────────────────────────────────────

const DOT_R = 1.5;
const PIECE_RADIUS = 10;
const CANVAS_PAD = 16;  // padding inside canvas area
const MIN_CELL = 44;
const MAX_CELL = 72;

const VOID_QUOTES = [
  '"The signal did not reach Output. I observed the exact moment it failed."',
  '"Void state. I could explain why. You should already know."',
  '"The machine did not lock. Review your connections."',
  '"Signal lost. The configuration was incorrect. Adjust and retry."',
];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Gameplay'>;
};

// ─── Piece SVG Icons ──────────────────────────────────────────────────────────

function PieceIcon({ type, size = 20, color }: { type: PieceType; size?: number; color: string }) {
  const sw = 1.5;

  switch (type) {
    case 'source':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Circle cx="14" cy="14" r="6" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="14" y1="4" x2="14" y2="2" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="14" y1="26" x2="14" y2="24" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="4" y1="14" x2="2" y2="14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="26" y1="14" x2="24" y2="14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'output':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Circle cx="14" cy="14" r="7" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M10 14L14 10L18 14L14 18Z" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'conveyor':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="3" y="10" width="22" height="8" rx="3" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M17 9L23 14L17 19" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Circle cx="14" cy="14" r="5" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Rect x="12.5" y="3" width="3" height="5" rx="1" fill="none" stroke={color} strokeWidth={sw} />
          <Rect x="12.5" y="20" width="3" height="5" rx="1" fill="none" stroke={color} strokeWidth={sw} />
          <Rect x="3" y="12.5" width="5" height="3" rx="1" fill="none" stroke={color} strokeWidth={sw} />
          <Rect x="20" y="12.5" width="5" height="3" rx="1" fill="none" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'splitter':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Path d="M4 14L14 14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M14 14L24 8" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Path d="M14 14L24 20" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="14" cy="14" r="3" fill="none" stroke={color} strokeWidth={sw} />
        </Svg>
      );
    case 'configNode':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="4" y="8" width="20" height="12" rx="4" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Circle cx="14" cy="14" r="3" fill="none" stroke={color} strokeWidth={sw} />
          <Line x1="0" y1="14" x2="4" y2="14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="24" y1="14" x2="28" y2="14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'scanner':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="3" y="9" width="22" height="10" rx="3" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Rect x="10" y="11" width="7" height="6" rx="1.5" fill="none" stroke={color} strokeWidth={sw} />
          <Line x1="0" y1="14" x2="3" y2="14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case 'transmitter':
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          <Rect x="3" y="9" width="22" height="10" rx="3" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Rect x="11" y="11" width="7" height="6" rx="1.5" fill="none" stroke={color} strokeWidth={sw} />
          <Line x1="25" y1="14" x2="28" y2="14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
  }
}

// ─── Piece label ──────────────────────────────────────────────────────────────

const PIECE_LABELS: Record<PieceType, string> = {
  source: 'SRC',
  output: 'OUT',
  conveyor: 'CONV',
  gear: 'GEAR',
  splitter: 'SPLIT',
  configNode: 'CFG',
  scanner: 'SCAN',
  transmitter: 'XMIT',
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

  const { lives, loseLife, refillLives, circuits, addCogs } = useLivesStore();
  const { completeLevel, isLevelCompleted: isLevelDone } = useProgressionStore();
  const discipline = usePlayerStore(s => s.discipline);
  const { credits, setLevelBudget, spendCredits, earnCredits, resetLevelBudget, levelSpent } = useEconomyStore();

  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [cogsScoreComment, setCogsScoreComment] = useState('');
  const [currentHint, setCurrentHint] = useState<{ key: string; text: string } | null>(null);
  const [hintQueue, setHintQueue] = useState<{ key: string; text: string }[]>([]);
  const hintTriggered = useRef<Set<string>>(new Set());
  const [showDisciplineCard, setShowDisciplineCard] = useState(false);
  const [creditError, setCreditError] = useState(false);

  const [heldPieceId, setHeldPieceId] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [showOutOfLives, setShowOutOfLives] = useState(false);
  const [showSystemRestored, setShowSystemRestored] = useState<string | null>(null);
  const [showCompletionScene, setShowCompletionScene] = useState(false);
  const [completionText, setCompletionText] = useState('');
  const [firstTimeBonus, setFirstTimeBonus] = useState(false);
  const [animatingStep, setAnimatingStep] = useState(-1);
  const [signalDot, setSignalDot] = useState<{ x: number; y: number } | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Screen is immediately visible — slide_from_bottom handles entry transition
  const screenOpacity = useSharedValue(1);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Derived (all hooks must be above the early return) ──
  const level = currentLevel;

  // ── Level budget setup ──
  useEffect(() => {
    if (!level) return;
    setLevelBudget(level.budget ?? 0);
    return () => resetLevelBudget();
  }, [level?.id]);

  // ── Tutorial hints setup (suppress on replay) ──
  const isReplay = level ? isLevelDone(level.id) : false;
  const isAxiomLevel = level?.sector === 'axiom';

  useEffect(() => {
    if (!level || !isAxiomLevel || isReplay || !level.tutorialHints) return;
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
        const cost = getPieceCost(selectedPieceFromTray, discipline);
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
    if (isExecuting) return;
    triggerHints('onEngage');
    const engageStartTime = Date.now();
    const steps = engage();

    // Animate signal dot travelling along wires with 400ms per step
    for (let i = 0; i < steps.length; i++) {
      const pos = getPieceCenter(steps[i].pieceId);
      if (pos) setSignalDot(pos);
      setAnimatingStep(i);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    setSignalDot(null);

    // Flash effect before showing overlay
    const succeeded = steps.some(s => s.type === 'output' && s.success);
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
        addCogs(25);
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
      setShowVoid(true);
      triggerHints('onVoid');
    }
    setAnimatingStep(-1);
  }, [isExecuting, engage, getPieceCenter, triggerHints, levelSpent, earnCredits]);

  // ── Reset ──
  const handleReset = useCallback(() => {
    setShowResults(false);
    setShowVoid(false);
    setAnimatingStep(-1);
    reset();
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
          <BackButton onPress={() => navigation.goBack()} />
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
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.topBarCenter}>
            <Text style={styles.sectorTag}>{level.sector === 'axiom' ? 'THE AXIOM' : level.sector.toUpperCase()}</Text>
            <Text style={styles.levelTag}>{level.id}</Text>
            <Text style={styles.levelName}>{level.systemRepaired ? level.systemRepaired.toUpperCase() : level.name}</Text>
          </View>
          <TouchableOpacity style={styles.hintBtn} activeOpacity={0.7} onPress={() => setShowBriefing(true)}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Circle cx="12" cy="12" r="10" fill="none" stroke={Colors.muted} strokeWidth="2" />
              <Path d="M12 16 L12 12" stroke={Colors.muted} strokeWidth="2" strokeLinecap="round" />
              <Circle cx="12" cy="8" r="1" fill={Colors.muted} />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* ── COGS Briefing ── */}
        {showBriefing && (
          <TouchableOpacity
            style={styles.briefingStrip}
            onPress={() => setShowBriefing(false)}
            activeOpacity={0.8}
          >
            <CogsAvatar size="small" state="online" />
            <Text style={styles.briefingText} numberOfLines={2}>{level.cogsLine}</Text>
          </TouchableOpacity>
        )}

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
          <View style={[styles.canvas, { width: gridW, height: gridH }]}>
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
                const wireSW = Math.max(1.5, CELL_SIZE / 22);
                const dashOn = Math.round(CELL_SIZE / 5);
                const dashOff = Math.round(CELL_SIZE / 8);

                const isAnimating = animatingStep >= 0 && executionSteps.length > 0;
                const animatedPieceIds = isAnimating
                  ? executionSteps.slice(0, animatingStep + 1).map(s => s.pieceId)
                  : [];
                const isLit = animatedPieceIds.includes(wire.fromPieceId) &&
                              animatedPieceIds.includes(wire.toPieceId);

                return (
                  <Line
                    key={wire.id}
                    x1={fx} y1={fy} x2={tx} y2={ty}
                    stroke={isLit ? Colors.green : wireColor}
                    strokeWidth={isLit ? wireSW * 1.5 : wireSW}
                    strokeDasharray={isLit ? undefined : `${dashOn},${dashOff}`}
                    strokeOpacity={isLit ? 0.9 : 0.5}
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>

            {/* Signal dot */}
            {signalDot && (
              <View style={[styles.signalDot, { left: signalDot.x - 6, top: signalDot.y - 6 }]} />
            )}

            {/* Pieces */}
            {pieces.map(piece => {
              const isPrePlaced = piece.isPrePlaced;
              const isSource = piece.type === 'source';
              const isOutput = piece.type === 'output';
              const isHeld = heldPieceId === piece.id;
              const pieceSize = isPrePlaced ? CELL_SIZE - 6 : CELL_SIZE - 8;
              const offset = (CELL_SIZE - pieceSize) / 2;
              const cellPx = piece.gridX * CELL_SIZE + offset;
              const cellPy = piece.gridY * CELL_SIZE + offset;
              const iconSize = (CELL_SIZE - 8) * 0.55;
              const iconColor = isSource ? '#F0B429' : isOutput ? '#00C48C' : getPieceColor(piece.type);
              const isAnimStep = animatingStep >= 0 && executionSteps[animatingStep]?.pieceId === piece.id;

              return (
                <Pressable
                  key={piece.id}
                  style={[
                    styles.piece,
                    {
                      left: cellPx,
                      top: cellPy,
                      width: pieceSize,
                      height: pieceSize,
                      borderWidth: isHeld ? 2 : 0,
                      borderColor: isHeld ? Colors.copper : undefined,
                      backgroundColor: isAnimStep ? `${iconColor}25` : 'transparent',
                      opacity: isHeld ? 0.6 : 1,
                      transform: [{ scale: isHeld ? 1.15 : 1 }],
                      zIndex: isHeld ? 10 : 0,
                    },
                  ]}
                  onPress={() => handlePieceTap(piece)}
                  onLongPress={() => handlePieceLongPress(piece)}
                  delayLongPress={500}
                >
                  <View style={{ transform: [{ rotate: `${!isPrePlaced ? piece.rotation : 0}deg` }] }}>
                    <PieceIcon type={piece.type} size={iconSize} color={iconColor} />
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
                      {isAxiom ? (
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
                const cost = getPieceCost(pt, discipline);
                const canAfford = cost === 0 || (useEconomyStore.getState().levelBudget - useEconomyStore.getState().levelSpent + useEconomyStore.getState().credits) >= cost;
                return (
                  <TouchableOpacity
                    key={pt}
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
                  "{cogsScoreComment || 'Circuit complete.'}"
                  {firstTimeBonus ? '\n\n"Mission logged. 25 Cogs credited to your account."' : ''}
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
                    navigation.goBack();
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
              <View style={styles.voidActions}>
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
                <TouchableOpacity
                  style={[styles.voidBtn, { borderColor: Colors.amber }]}
                  onPress={handleDebug}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.voidBtnText, { color: Colors.amber }]}>DEBUG (50 Cogs)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.voidBtn, { borderColor: Colors.muted }]}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.voidBtnText, { color: Colors.muted }]}>BACK TO MAP</Text>
                </TouchableOpacity>
              </View>
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
                  "You are out of lives. I could tell you to wait. But there is an alternative."
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
                  colors={circuits >= 30 ? [Colors.circuit, '#7c5fcf'] : [Colors.dim, Colors.steel]}
                  style={styles.resultsPrimaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.resultsPrimaryText}>
                    {circuits >= 30 ? 'REFILL LIVES · 30 CIRCUITS' : `NEED ${30 - circuits} MORE CIRCUITS`}
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
          onPress={() => { setShowDisciplineCard(false); navigation.goBack(); }}
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

  // Signal dot
  signalDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 50,
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
});
