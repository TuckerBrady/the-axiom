import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { PieceIcon } from '../PieceIcon';
import type { PieceType } from '../../game/types';
import type { InventoryPiece } from '../../store/requisitionStore';
import { Colors, Fonts } from '../../theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const WHEEL_WIDTH = 72;
const NODE_SIZE_MAX = 52;
const NODE_SIZE_MIN = 28;
const NODE_GAP = 8;
const VISIBLE_NODES = 5;
const IDLE_OPACITY = 0.18;
const RECALL_STRIP_W = 5;
const DISMISS_THRESHOLD = 40;
const ACTIVE_TIMEOUT_MS = 2000;
const DRAG_HOLD_MS = 180;

const NODE_SLOT_H = NODE_SIZE_MAX + NODE_GAP;
const WHEEL_H = VISIBLE_NODES * NODE_SLOT_H;

// ─── Color coding by source (REQ-41) ─────────────────────────────────────────

const SOURCE_COLORS: Record<InventoryPiece['source'], string> = {
  preAssigned:  '#F0B429',
  requisitioned: '#00D4FF',
};
const TAPE_COLOR = '#8B5CF6';

function getNodeBorderColor(piece: InventoryPiece, isTape: boolean): string {
  if (isTape) return TAPE_COLOR;
  return SOURCE_COLORS[piece.source];
}

const PIECE_LABELS: Record<PieceType, string> = {
  source: 'IN', terminal: 'OUT',
  conveyor: 'CONV', gear: 'GEAR', splitter: 'SPLIT',
  configNode: 'CFG', scanner: 'SCAN', transmitter: 'XMIT',
  merger: 'MERGE', bridge: 'BRIDGE',
  inverter: 'INV', counter: 'CNT', latch: 'LATCH',
  obstacle: '',
};

function getPieceColor(type: PieceType): string {
  const protocol: PieceType[] = ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'];
  return protocol.includes(type) ? '#8B5CF6' : '#F0B429';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArcWheelPiece extends InventoryPiece {
  isTape?: boolean;
}

export interface DragState {
  active: boolean;
  pieceId: string | null;
  type: PieceType | null;
  x: number;
  y: number;
}

interface Props {
  pieces: ArcWheelPiece[];
  side: 'left' | 'right';
  selectedId: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onDragStart: (drag: DragState) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragCancel: () => void;
}

// ─── ArcWheel component ───────────────────────────────────────────────────────

export default function ArcWheel({
  pieces,
  side,
  selectedId,
  disabled,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(IDLE_OPACITY)).current;
  const activeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragPieceIndex = useRef(-1);
  const isDraggingRef = useRef(false);

  // ── Entrance animation (REQ-68): 0.8s staggered, alternating above/below ──
  const entranceY = useRef(
    Array.from({ length: VISIBLE_NODES }, () => new Animated.Value(0))
  ).current;
  const entranceOpacity = useRef(
    Array.from({ length: VISIBLE_NODES }, () => new Animated.Value(0))
  ).current;
  const entranceFired = useRef(false);

  useEffect(() => {
    if (entranceFired.current || pieces.length === 0) return;
    entranceFired.current = true;

    const ENTRY_DIST = NODE_SLOT_H * 1.5;
    const STAGGER_MS = 80;
    const ITEM_MS = 500;

    entranceY.forEach((anim, i) => {
      anim.setValue(i % 2 === 0 ? -ENTRY_DIST : ENTRY_DIST);
    });
    entranceOpacity.forEach(a => a.setValue(0));

    const animations = entranceY.map((yAnim, i) =>
      Animated.parallel([
        Animated.timing(yAnim, {
          toValue: 0,
          duration: ITEM_MS,
          delay: i * STAGGER_MS,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: false,
        }),
        Animated.timing(entranceOpacity[i], {
          toValue: 1,
          duration: Math.round(ITEM_MS * 0.6),
          delay: i * STAGGER_MS,
          useNativeDriver: false,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, []);

  // Snap selectedIndex to match selectedId from parent
  useEffect(() => {
    if (!selectedId) return;
    const idx = pieces.findIndex(p => p.id === selectedId);
    if (idx !== -1 && idx !== selectedIndex) {
      setSelectedIndex(idx);
    }
  }, [selectedId, pieces]);

  // Dismiss/recall animation
  const dismissSlide = useCallback(() => {
    const toValue = side === 'right' ? WHEEL_WIDTH - RECALL_STRIP_W : -(WHEEL_WIDTH - RECALL_STRIP_W);
    Animated.timing(slideAnim, {
      toValue,
      duration: 380,
      useNativeDriver: false,
    }).start(() => setDismissed(true));
  }, [side, slideAnim]);

  const recallSlide = useCallback(() => {
    setDismissed(false);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 380,
      useNativeDriver: false,
    }).start();
  }, [slideAnim]);

  // Active state management
  const activateWheel = useCallback(() => {
    if (disabled) return;
    setIsActive(true);
    Animated.timing(idleAnim, {
      toValue: 1,
      duration: 0,
      useNativeDriver: false,
    }).start();
    if (activeTimer.current) clearTimeout(activeTimer.current);
    activeTimer.current = setTimeout(() => {
      setIsActive(false);
      Animated.timing(idleAnim, {
        toValue: IDLE_OPACITY,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }, ACTIVE_TIMEOUT_MS);
  }, [disabled, idleAnim]);

  useEffect(() => () => {
    if (activeTimer.current) clearTimeout(activeTimer.current);
    if (dragHoldTimer.current) clearTimeout(dragHoldTimer.current);
  }, []);

  // ── Scroll pan responder (vertical swipe to scroll) ──
  const scrollDelta = useRef(0);
  const scrollPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !isDraggingRef.current,
      onMoveShouldSetPanResponder: (_, gs) => !disabled && !isDraggingRef.current && Math.abs(gs.dy) > 6,
      onPanResponderGrant: (_, gs) => {
        activateWheel();
        scrollDelta.current = 0;
        dragStartPos.current = { x: gs.moveX, y: gs.moveY };
      },
      onPanResponderMove: (_, gs) => {
        if (isDraggingRef.current) return;
        const delta = gs.dy;
        const steps = Math.round((scrollDelta.current - delta) / NODE_SLOT_H);
        if (steps !== 0) {
          scrollDelta.current = delta;
          setSelectedIndex(prev => {
            const next = prev + steps;
            if (pieces.length === 0) return 0;
            const wrapped = ((next % pieces.length) + pieces.length) % pieces.length;
            return wrapped;
          });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      },
      onPanResponderRelease: () => { scrollDelta.current = 0; },
    }),
  ).current;

  // ── Per-node press / long-press ──
  const handleNodePressIn = useCallback((idx: number, screenX: number, screenY: number) => {
    activateWheel();
    dragPieceIndex.current = idx;
    dragStartPos.current = { x: screenX, y: screenY };
    dragHoldTimer.current = setTimeout(() => {
      if (dragPieceIndex.current !== idx) return;
      const piece = pieces[idx];
      if (!piece) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      onDragStart({
        active: true,
        pieceId: piece.id,
        type: piece.type,
        x: screenX,
        y: screenY,
      });
    }, DRAG_HOLD_MS);
  }, [activateWheel, pieces, onDragStart]);

  const handleNodePressOut = useCallback(() => {
    if (dragHoldTimer.current) {
      clearTimeout(dragHoldTimer.current);
      dragHoldTimer.current = null;
    }
  }, []);

  const handleNodeTap = useCallback((idx: number) => {
    if (isDraggingRef.current) return;
    const piece = pieces[idx];
    if (!piece) return;
    setSelectedIndex(idx);
    onSelect(piece.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    activateWheel();
  }, [pieces, onSelect, activateWheel]);

  // ── Dismiss pan responder ──
  const dismissPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
      onPanResponderMove: (_, gs) => {
        if (side === 'right' && gs.dx > 0 && !dismissed) {
          slideAnim.setValue(Math.min(gs.dx, WHEEL_WIDTH));
        } else if (side === 'left' && gs.dx < 0 && !dismissed) {
          slideAnim.setValue(Math.max(gs.dx, -WHEEL_WIDTH));
        }
      },
      onPanResponderRelease: (_, gs) => {
        const dist = side === 'right' ? gs.dx : -gs.dx;
        if (dist > DISMISS_THRESHOLD) {
          dismissSlide();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  // ── Render nodes ──
  function renderNode(piece: ArcWheelPiece, idx: number, relIdx: number) {
    const distance = idx - selectedIndex;
    const absDistance = Math.abs(distance);
    const maxVisible = Math.floor(VISIBLE_NODES / 2);

    if (absDistance > maxVisible) return null;

    const scaleFactor = 1 - (absDistance / (maxVisible + 1)) * 0.45;
    const nodeSize = NODE_SIZE_MAX * scaleFactor;
    const distanceOpacity = 1 - (absDistance / (maxVisible + 1)) * 0.7;
    const isSelected = piece.id === selectedId || idx === selectedIndex;
    const borderColor = getNodeBorderColor(piece, piece.isTape ?? false);
    const color = getPieceColor(piece.type);
    const eY = entranceY[relIdx] ?? new Animated.Value(0);
    const eOp = entranceOpacity[relIdx] ?? new Animated.Value(1);

    return (
      <Animated.View
        key={piece.id}
        style={{
          opacity: eOp,
          transform: [{ translateY: eY }],
        }}
      >
        <View
          style={[
            styles.nodeWrapper,
            {
              width: NODE_SIZE_MAX,
              height: NODE_SLOT_H,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: distanceOpacity,
            },
          ]}
        >
          <TouchableOpacity
            onPressIn={(e) => handleNodePressIn(idx, e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onPressOut={handleNodePressOut}
            onPress={() => handleNodeTap(idx)}
            activeOpacity={0.8}
            style={[
              styles.node,
              {
                width: nodeSize,
                height: nodeSize,
                borderColor: isSelected ? borderColor : `${borderColor}60`,
                borderWidth: isSelected ? 2 : 1,
                backgroundColor: isSelected ? `${borderColor}18` : 'rgba(8,14,28,0.9)',
              },
            ]}
            accessibilityLabel={`${PIECE_LABELS[piece.type]}, ${piece.source === 'requisitioned' ? 'purchased' : 'pre-assigned'}`}
          >
            <PieceIcon type={piece.type} size={nodeSize * 0.45} color={color} />
            {isSelected && (
              <>
                <View style={[styles.cornerTL, { borderColor }]} />
                <View style={[styles.cornerTR, { borderColor }]} />
                <View style={[styles.cornerBL, { borderColor }]} />
                <View style={[styles.cornerBR, { borderColor }]} />
              </>
            )}
          </TouchableOpacity>
          {isSelected && (
            <Text style={[styles.nodeLabel, { color: borderColor }]} numberOfLines={1}>
              {PIECE_LABELS[piece.type]}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }

  const isRight = side === 'right';

  // The pill track offset — we show a slice centered on the selected index
  const visiblePieces = pieces.slice(
    Math.max(0, selectedIndex - 2),
    Math.min(pieces.length, selectedIndex + 3),
  );
  const startIdx = Math.max(0, selectedIndex - 2);

  return (
    <Animated.View
      style={[
        styles.container,
        isRight ? styles.containerRight : styles.containerLeft,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      {/* Recall strip (visible when dismissed) */}
      {dismissed && (
        <TouchableOpacity
          style={[
            styles.recallStrip,
            isRight ? styles.recallStripRight : styles.recallStripLeft,
          ]}
          onPress={recallSlide}
          activeOpacity={0.7}
          accessibilityLabel="Recall piece selector"
        />
      )}

      {!dismissed && (
        <Animated.View
          style={[styles.pill, { opacity: isActive ? 1 : idleAnim }]}
          {...(isDragging ? {} : scrollPan.panHandlers)}
          {...(isDragging ? {} : dismissPan.panHandlers)}
        >
          {/* Empty state */}
          {pieces.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>——</Text>
            </View>
          )}

          {/* Piece nodes */}
          {visiblePieces.map((piece, relIdx) => renderNode(piece, startIdx + relIdx, relIdx))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CORNER_SIZE = 6;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: WHEEL_WIDTH,
    justifyContent: 'center',
    zIndex: 10,
  },
  containerRight: { right: 0 },
  containerLeft: { left: 0 },

  recallStrip: {
    position: 'absolute',
    top: '30%',
    height: '40%',
    width: RECALL_STRIP_W,
    backgroundColor: 'rgba(74,158,255,0.25)',
    borderRadius: 3,
  },
  recallStripRight: { right: 0 },
  recallStripLeft: { left: 0 },

  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(6,10,20,0.85)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.15)',
    minHeight: WHEEL_H,
    gap: 0,
  },

  nodeWrapper: {},

  node: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  nodeLabel: {
    fontFamily: Fonts.spaceMono,
    fontSize: 7,
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },

  emptyState: {
    height: WHEEL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 10,
    color: Colors.muted,
    opacity: 0.4,
  },

  // Corner brackets for selected piece
  cornerTL: {
    position: 'absolute', top: -1, left: -1,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: 2, borderLeftWidth: 2,
  },
  cornerTR: {
    position: 'absolute', top: -1, right: -1,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderTopWidth: 2, borderRightWidth: 2,
  },
  cornerBL: {
    position: 'absolute', bottom: -1, left: -1,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: 2, borderLeftWidth: 2,
  },
  cornerBR: {
    position: 'absolute', bottom: -1, right: -1,
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderBottomWidth: 2, borderRightWidth: 2,
  },
});
