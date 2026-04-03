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
import { Colors, Fonts, FontSizes, Spacing } from '../theme/tokens';
import { useGameStore } from '../store/gameStore';
import type { PieceType, PlacedPiece, ExecutionStep } from '../game/types';

const { width: W, height: H } = Dimensions.get('window');

// ─── Grid constants ───────────────────────────────────────────────────────────

const CELL_SIZE = 34;
const DOT_R = 1.5;
const PIECE_SIZE = 30;
const PIECE_RADIUS = 6;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Gameplay'>;
};

// ─── Piece SVG Icons ──────────────────────────────────────────────────────────

function PieceIcon({ type, size = 20, color }: { type: PieceType; size?: number; color: string }) {
  const s = size;
  const half = s / 2;

  switch (type) {
    case 'source':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="5" fill="none" stroke={color} strokeWidth="2" />
          <Line x1="12" y1="2" x2="12" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="2" y1="12" x2="6" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="18" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'output':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M12 2 L22 12 L12 22 L2 12 Z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <Circle cx="12" cy="12" r="3" fill={color} opacity={0.6} />
        </Svg>
      );
    case 'conveyor':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="4" y="7" width="16" height="10" rx="2" fill="none" stroke={color} strokeWidth="2" />
          <Path d="M10 12 L16 12 M14 9 L17 12 L14 15" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="5" fill="none" stroke={color} strokeWidth="2" />
          <Rect x="10" y="1" width="4" height="5" rx="1" fill={color} />
          <Rect x="10" y="18" width="4" height="5" rx="1" fill={color} />
          <Rect x="1" y="10" width="5" height="4" rx="1" fill={color} />
          <Rect x="18" y="10" width="5" height="4" rx="1" fill={color} />
        </Svg>
      );
    case 'splitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Path d="M4 12 L12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M12 12 L20 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Path d="M12 12 L20 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="12" cy="12" r="3" fill={color} opacity={0.4} />
        </Svg>
      );
    case 'configNode':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={color} strokeWidth="2" />
          <Circle cx="12" cy="12" r="3" fill={color} opacity={0.7} />
          <Line x1="1" y1="12" x2="4" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <Line x1="20" y1="12" x2="23" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'scanner':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={color} strokeWidth="2" />
          <Path d="M8 14 L12 8 L16 14" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="12" y1="14" x2="12" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'transmitter':
      return (
        <Svg width={s} height={s} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke={color} strokeWidth="2" />
          <Path d="M8 10 L12 16 L16 10" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="12" y1="6" x2="12" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
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
    selectFromTray,
    selectPlaced,
    engage,
    reset,
    toggleConfiguration,
    setDebugMode,
    debugNext,
    debugPrev,
  } = useGameStore();

  const [showBriefing, setShowBriefing] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [showVoid, setShowVoid] = useState(false);
  const [animatingStep, setAnimatingStep] = useState(-1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [signalDot, setSignalDot] = useState<{ x: number; y: number } | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Fade in
  const screenOpacity = useSharedValue(0);
  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 300 });
  }, []);
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  // ── Derived ──
  const level = currentLevel;
  if (!level) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>No level loaded</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>{'<'} BACK</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const { pieces, wires } = machineState;
  const playerPieces = pieces.filter(p => !p.isPrePlaced);
  const hasPlacedPieces = playerPieces.length > 0;

  // Count remaining available pieces from tray
  const availableCounts = useMemo(() => {
    const counts: Partial<Record<PieceType, number>> = {};
    for (const pt of level.availablePieces) {
      counts[pt] = (counts[pt] || 0) + 1;
    }
    // Subtract placed pieces
    for (const p of playerPieces) {
      if (counts[p.type] && counts[p.type]! > 0) {
        counts[p.type] = counts[p.type]! - 1;
      }
    }
    return counts;
  }, [level.availablePieces, playerPieces]);

  // Unique piece types for tray display
  const trayPieceTypes = useMemo(() => {
    const seen = new Set<PieceType>();
    return level.availablePieces.filter(pt => {
      if (seen.has(pt)) return false;
      seen.add(pt);
      return true;
    });
  }, [level.availablePieces]);

  const canvasWidth = level.gridWidth * CELL_SIZE;
  const canvasHeight = level.gridHeight * CELL_SIZE;

  // ── Grid tap handler ──
  const handleCanvasTap = useCallback((gridX: number, gridY: number) => {
    if (isExecuting || showResults || showVoid) return;

    if (selectedPieceFromTray) {
      // Place piece from tray
      const count = availableCounts[selectedPieceFromTray] || 0;
      if (count > 0) {
        placePiece(selectedPieceFromTray, gridX, gridY);
      }
    } else if (selectedPlacedPiece) {
      // Move selected piece to this cell
      movePiece(selectedPlacedPiece, gridX, gridY);
    }
  }, [selectedPieceFromTray, selectedPlacedPiece, isExecuting, showResults, showVoid, availableCounts, placePiece, movePiece]);

  // ── Piece tap handler ──
  const handlePieceTap = useCallback((piece: PlacedPiece) => {
    if (isExecuting || showResults || showVoid) return;
    if (piece.isPrePlaced) return;

    if (selectedPlacedPiece === piece.id) {
      selectPlaced(null); // Deselect
    } else {
      selectPlaced(piece.id);
    }
  }, [selectedPlacedPiece, isExecuting, showResults, showVoid, selectPlaced]);

  // ── Long press for delete ──
  const handlePieceLongPress = useCallback((piece: PlacedPiece) => {
    if (piece.isPrePlaced) return;
    setDeleteConfirm(piece.id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirm) {
      deletePiece(deleteConfirm);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, deletePiece]);

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
      // Green flash
      setFlashColor(Colors.green);
      await new Promise(resolve => setTimeout(resolve, 300));
      setFlashColor(null);
      await new Promise(resolve => setTimeout(resolve, 200));
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
    }
    setAnimatingStep(-1);
  }, [isExecuting, engage, getPieceCenter]);

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

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StarField seed={7} />

      <SafeAreaView style={styles.safeArea}>
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.levelTag}>MISSION {level.id}</Text>
            <Text style={styles.levelName}>{level.name}</Text>
          </View>
          <TouchableOpacity style={styles.hintBtn} activeOpacity={0.7}>
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

        {/* ── Game Canvas ── */}
        <ScrollView
          style={styles.canvasScroll}
          contentContainerStyle={styles.canvasScrollContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center', paddingVertical: Spacing.md }}
          >
            <View style={[styles.canvas, { width: canvasWidth + CELL_SIZE, height: canvasHeight + CELL_SIZE }]}>
              {/* Dot grid */}
              <Svg
                width={canvasWidth + CELL_SIZE}
                height={canvasHeight + CELL_SIZE}
                style={StyleSheet.absoluteFill}
              >
                {Array.from({ length: level.gridHeight + 1 }, (_, y) =>
                  Array.from({ length: level.gridWidth + 1 }, (_, x) => (
                    <Circle
                      key={`dot-${x}-${y}`}
                      cx={x * CELL_SIZE + CELL_SIZE / 2}
                      cy={y * CELL_SIZE + CELL_SIZE / 2}
                      r={DOT_R}
                      fill="rgba(74,158,255,0.15)"
                    />
                  )),
                )}

                {/* Wires */}
                {wires.map(wire => {
                  const fromPiece = pieces.find(p => p.id === wire.fromPieceId);
                  const toPiece = pieces.find(p => p.id === wire.toPieceId);
                  if (!fromPiece || !toPiece) return null;

                  const fx = fromPiece.gridX * CELL_SIZE + CELL_SIZE / 2;
                  const fy = fromPiece.gridY * CELL_SIZE + CELL_SIZE / 2;
                  const tx = toPiece.gridX * CELL_SIZE + CELL_SIZE / 2;
                  const ty = toPiece.gridY * CELL_SIZE + CELL_SIZE / 2;

                  const isProtocol = fromPiece.category === 'protocol' || toPiece.category === 'protocol';
                  const wireColor = isProtocol ? Colors.amber : Colors.blue;

                  // Check if this wire is part of the current animation
                  const isAnimating = animatingStep >= 0 && executionSteps.length > 0;
                  const animatedPieceIds = isAnimating
                    ? executionSteps.slice(0, animatingStep + 1).map(s => s.pieceId)
                    : [];
                  const isLit = animatedPieceIds.includes(wire.fromPieceId) &&
                                animatedPieceIds.includes(wire.toPieceId);

                  return (
                    <Line
                      key={wire.id}
                      x1={fx}
                      y1={fy}
                      x2={tx}
                      y2={ty}
                      stroke={isLit ? Colors.green : wireColor}
                      strokeWidth={isLit ? 3 : 2}
                      strokeDasharray={isLit ? undefined : '4,4'}
                      strokeOpacity={isLit ? 0.9 : 0.5}
                      strokeLinecap="round"
                    />
                  );
                })}
              </Svg>

              {/* Signal dot travelling along wires */}
              {signalDot && (
                <View
                  style={[
                    styles.signalDot,
                    {
                      left: signalDot.x - 6,
                      top: signalDot.y - 6,
                    },
                  ]}
                />
              )}

              {/* Placed pieces */}
              {pieces.map(piece => {
                const px = piece.gridX * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2;
                const py = piece.gridY * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2;
                const isSelected = selectedPlacedPiece === piece.id;
                const pieceColor = getPieceColor(piece.type);
                const isSource = piece.type === 'source';
                const isOutput = piece.type === 'output';
                const isPrePlaced = piece.isPrePlaced;
                const pieceSize = isPrePlaced ? PIECE_SIZE + 4 : PIECE_SIZE;
                const offset = isPrePlaced ? -2 : 0;

                // Animation state
                const isAnimStep = animatingStep >= 0 &&
                  executionSteps[animatingStep]?.pieceId === piece.id;

                // Debug state
                let debugColor: string | null = null;
                if (debugMode && executionSteps.length > 0) {
                  const stepIdx = executionSteps.findIndex(s => s.pieceId === piece.id);
                  if (stepIdx >= 0) {
                    if (stepIdx < debugStepIndex) debugColor = Colors.green;
                    else if (stepIdx === debugStepIndex) debugColor = Colors.amber;
                    else if (!executionSteps[stepIdx].success) debugColor = Colors.red;
                  }
                }

                return (
                  <Pressable
                    key={piece.id}
                    style={[
                      styles.piece,
                      {
                        left: px + offset,
                        top: py + offset,
                        width: pieceSize,
                        height: pieceSize,
                        borderColor: debugColor || (isAnimStep ? Colors.green : isSelected ? Colors.starWhite : pieceColor),
                        borderWidth: isSelected ? 2 : 1,
                        backgroundColor: isAnimStep
                          ? `${pieceColor}40`
                          : `${Colors.navy}cc`,
                      },
                    ]}
                    onPress={() => handlePieceTap(piece)}
                    onLongPress={() => handlePieceLongPress(piece)}
                    delayLongPress={500}
                  >
                    <PieceIcon type={piece.type} size={pieceSize * 0.55} color={pieceColor} />
                  </Pressable>
                );
              })}

              {/* Ghost piece (tap targets for empty cells) */}
              {(selectedPieceFromTray || selectedPlacedPiece) &&
                Array.from({ length: level.gridHeight }, (_, y) =>
                  Array.from({ length: level.gridWidth }, (_, x) => {
                    const occupied = pieces.some(p => p.gridX === x && p.gridY === y);
                    if (occupied) return null;
                    return (
                      <TouchableOpacity
                        key={`ghost-${x}-${y}`}
                        style={[
                          styles.ghostCell,
                          {
                            left: x * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2,
                            top: y * CELL_SIZE + (CELL_SIZE - PIECE_SIZE) / 2,
                            width: PIECE_SIZE,
                            height: PIECE_SIZE,
                          },
                        ]}
                        onPress={() => handleCanvasTap(x, y)}
                        activeOpacity={0.6}
                      >
                        <View style={styles.ghostInner} />
                      </TouchableOpacity>
                    );
                  }),
                )}
            </View>
          </ScrollView>
        </ScrollView>

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
                    <View style={{ opacity: count > 0 ? 1 : 0.3 }}>
                      <PieceIcon type={pt} size={22} color={color} />
                    </View>
                    <Text style={[styles.trayLabel, { color }]}>{PIECE_LABELS[pt]}</Text>
                    <View style={[styles.trayBadge, { backgroundColor: count > 0 ? color : Colors.dim }]}>
                      <Text style={styles.trayBadgeText}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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

        {/* ── Delete Confirmation ── */}
        {deleteConfirm && (
          <View style={styles.deleteOverlay}>
            <View style={styles.deleteDialog}>
              <Text style={styles.deleteTitle}>DELETE PIECE?</Text>
              <Text style={styles.deleteSubtext}>This action cannot be undone.</Text>
              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={() => setDeleteConfirm(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteCancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={confirmDelete}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteConfirmText}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
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
              <View style={styles.starsRow}>{renderStars(stars)}</View>
              <Text style={styles.resultsTitle}>CIRCUIT COMPLETE</Text>
              <Text style={styles.resultsLevel}>{level.name}</Text>
              <View style={styles.cogsResultRow}>
                <CogsAvatar size="small" state="online" />
                <Text style={styles.resultsQuote}>
                  {stars === 3
                    ? '"Optimal solution. I am... impressed. Do not let it go to your head."'
                    : stars === 2
                    ? '"Functional. Not optimal. I have logged the inefficiency for your review."'
                    : '"It works. Barely. I suggest you revisit this when your skills improve."'}
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
                  onPress={() => navigation.goBack()}
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
                  "The signal vanished into nothing. This is what happens when you don't think it through."
                </Text>
              </View>
              <View style={styles.voidActions}>
                <TouchableOpacity
                  style={styles.voidBtn}
                  onPress={handleReset}
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
      </SafeAreaView>
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
  canvasScroll: { flex: 1 },
  canvasScrollContent: { alignItems: 'center', paddingHorizontal: Spacing.md },
  canvas: {
    backgroundColor: 'rgba(6,9,15,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.1)',
    borderRadius: 8,
    position: 'relative',
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
  ghostInner: {
    width: '80%',
    height: '80%',
    borderRadius: PIECE_RADIUS - 1,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    borderStyle: 'dashed',
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.12)',
    paddingVertical: Spacing.sm,
  },
  partsTrayInner: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  trayItem: {
    width: 64,
    height: 72,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,18,30,0.6)',
    gap: 2,
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
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
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

  // Delete dialog
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  deleteDialog: {
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 12,
    padding: Spacing.xl,
    width: W * 0.7,
    alignItems: 'center',
  },
  deleteTitle: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md, fontWeight: 'bold',
    color: Colors.red, marginBottom: Spacing.sm,
  },
  deleteSubtext: {
    fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.muted,
    marginBottom: Spacing.lg,
  },
  deleteActions: { flexDirection: 'row', gap: Spacing.md },
  deleteCancelBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.dim, borderRadius: 8,
  },
  deleteCancelText: {
    fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.muted, letterSpacing: 1,
  },
  deleteConfirmBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.red, borderRadius: 8,
  },
  deleteConfirmText: {
    fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.starWhite, letterSpacing: 1,
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
});
