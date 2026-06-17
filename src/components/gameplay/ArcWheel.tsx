import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { hapticLight } from '../../utils/haptics';
import { PieceIcon } from '../PieceIcon';
import type { PieceType } from '../../game/types';
import type { InventoryPiece } from '../../store/requisitionStore';
import { Colors, Fonts } from '../../theme/tokens';
import {
  groupArcWheelPieces,
  type ArcWheelPiece,
  type PieceGroup,
} from './arcWheelGrouping';

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

function getNodeBorderColor(source: InventoryPiece['source'], isTape: boolean): string {
  if (isTape) return TAPE_COLOR;
  return SOURCE_COLORS[source];
}

const PIECE_LABELS: Record<PieceType, string> = {
  source: 'IN', terminal: 'OUT',
  conveyor: 'CONV', gear: 'GEAR', splitter: 'SPLIT',
  configNode: 'CFG', scanner: 'SCAN', transmitter: 'XMIT',
  merger: 'MERGE', bridge: 'BRIDGE',
  inverter: 'INV', counter: 'CNT', latch: 'LATCH',
  obstacle: '',
};

// Matches BoardGrid/PieceTray: Protocol pieces purple, everything else the
// canonical blue (NOT the amber source-accent used for node borders).
function getPieceColor(type: PieceType): string {
  const protocol: PieceType[] = ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'];
  return protocol.includes(type) ? '#8B5CF6' : Colors.blue;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ArcWheelPiece, PieceGroup };

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
  // Tutorial: ref attached to the center/selected node for COGS orb targeting
  mainNodeRef?: React.RefObject<View | null>;
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
  mainNodeRef,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Collapse the flat inventory into one node per type (+ count badge).
  const groups = useMemo(() => groupArcWheelPieces(pieces), [pieces]);
  // Per-node handlers below read the live group list through this ref.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(IDLE_OPACITY)).current;
  const activeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Entrance animation (REQ-68): 0.8s staggered, alternating above/below ──
  const entranceY = useRef(
    Array.from({ length: VISIBLE_NODES }, () => new Animated.Value(0))
  ).current;
  const entranceOpacity = useRef(
    Array.from({ length: VISIBLE_NODES }, () => new Animated.Value(0))
  ).current;
  const entranceFired = useRef(false);

  useEffect(() => {
    if (entranceFired.current || groups.length === 0) return;
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
    const idx = groups.findIndex(g => g.repId === selectedId);
    if (idx !== -1 && idx !== selectedIndex) {
      setSelectedIndex(idx);
    }
  }, [selectedId, groups]);

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
  }, []);

  // ── Node gesture callbacks (each WheelNode owns its own PanResponder) ──
  const handleScrollSteps = useCallback((steps: number) => {
    setSelectedIndex(prev => {
      const len = groupsRef.current.length;
      if (len === 0) return 0;
      const next = prev + steps;
      return ((next % len) + len) % len;
    });
    hapticLight();
  }, []);

  const handleTapSelect = useCallback((idx: number) => {
    const group = groupsRef.current[idx];
    if (!group) return;
    setSelectedIndex(idx);
    onSelect(group.repId);
    hapticLight();
    activateWheel();
  }, [onSelect, activateWheel]);

  const handleDismissMove = useCallback((dx: number) => {
    if (dismissed) return;
    if (side === 'right' && dx > 0) {
      slideAnim.setValue(Math.min(dx, WHEEL_WIDTH));
    } else if (side === 'left' && dx < 0) {
      slideAnim.setValue(Math.max(dx, -WHEEL_WIDTH));
    }
  }, [side, slideAnim, dismissed]);

  const handleDismissRelease = useCallback((dx: number) => {
    const dist = side === 'right' ? dx : -dx;
    if (dist > DISMISS_THRESHOLD) {
      dismissSlide();
    } else {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: false }).start();
    }
  }, [side, slideAnim, dismissSlide]);

  // ── Render nodes ──
  function renderNode(group: PieceGroup, idx: number, relIdx: number) {
    const distance = idx - selectedIndex;
    const absDistance = Math.abs(distance);
    const maxVisible = Math.floor(VISIBLE_NODES / 2);

    if (absDistance > maxVisible) return null;

    const scaleFactor = 1 - (absDistance / (maxVisible + 1)) * 0.45;
    const nodeSize = NODE_SIZE_MAX * scaleFactor;
    const distanceOpacity = 1 - (absDistance / (maxVisible + 1)) * 0.7;
    const isSelected = group.repId === selectedId || idx === selectedIndex;
    const borderColor = getNodeBorderColor(group.source, group.isTape);
    const color = getPieceColor(group.type);
    const eY = entranceY[relIdx] ?? new Animated.Value(0);
    const eOp = entranceOpacity[relIdx] ?? new Animated.Value(1);

    return (
      <Animated.View
        key={group.key}
        pointerEvents="box-none"
        style={{
          opacity: eOp,
          transform: [{ translateY: eY }],
        }}
      >
        <View
          ref={isSelected ? mainNodeRef : undefined}
          collapsable={false}
          pointerEvents="box-none"
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
          <WheelNode
            index={idx}
            group={group}
            isSelected={isSelected}
            nodeSize={nodeSize}
            borderColor={borderColor}
            iconColor={color}
            disabled={disabled}
            activateWheel={activateWheel}
            onTapSelect={handleTapSelect}
            onScrollSteps={handleScrollSteps}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
            onDismissMove={handleDismissMove}
            onDismissRelease={handleDismissRelease}
          />
          {isSelected && (
            <Text style={[styles.nodeLabel, { color: borderColor }]} numberOfLines={1}>
              {PIECE_LABELS[group.type]}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }

  const isRight = side === 'right';

  // The pill track offset — we show a slice centered on the selected index
  const visibleGroups = groups.slice(
    Math.max(0, selectedIndex - 2),
    Math.min(groups.length, selectedIndex + 3),
  );
  const startIdx = Math.max(0, selectedIndex - 2);

  return (
    <Animated.View
      pointerEvents="box-none"
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
          pointerEvents="box-none"
          style={[styles.pill, { opacity: isActive ? 1 : idleAnim }]}
        >
          {/* Empty state */}
          {groups.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>——</Text>
            </View>
          )}

          {/* Piece nodes — one per type, count badge for duplicates */}
          {visibleGroups.map((group, relIdx) => renderNode(group, startIdx + relIdx, relIdx))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── WheelNode ──────────────────────────────────────────────────────────────
// One interactive node. Its PanResponder resolves a single gesture into
// exactly one of: tap (select), hold-to-drag (start/move/end/cancel),
// vertical scroll (change selection), or horizontal swipe (dismiss). The
// responder is created once; latest props reach it through propsRef. This is
// the same hold-to-drag pattern proven in PieceTray.TrayItemDraggable, plus
// scroll/dismiss so the node can fully own the gesture (the pill itself is
// box-none so board cells behind the wheel stay tappable).
interface WheelNodeProps {
  index: number;
  group: PieceGroup;
  isSelected: boolean;
  nodeSize: number;
  borderColor: string;
  iconColor: string;
  disabled: boolean;
  activateWheel: () => void;
  onTapSelect: (index: number) => void;
  onScrollSteps: (steps: number) => void;
  onDragStart: (drag: DragState) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragCancel: () => void;
  onDismissMove: (dx: number) => void;
  onDismissRelease: (dx: number) => void;
}

function WheelNode(props: WheelNodeProps) {
  const { group, isSelected, nodeSize, borderColor, iconColor } = props;

  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; });

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<'idle' | 'drag' | 'scroll' | 'dismiss'>('idle');
  const startPos = useRef({ x: 0, y: 0 });
  const scrollAccum = useRef(0);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !propsRef.current.disabled,
      onMoveShouldSetPanResponder: () => !propsRef.current.disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const p = propsRef.current;
        modeRef.current = 'idle';
        scrollAccum.current = 0;
        startPos.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        p.activateWheel();
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(() => {
          if (modeRef.current !== 'idle') return;
          modeRef.current = 'drag';
          p.onDragStart({
            active: true,
            pieceId: p.group.repId,
            type: p.group.type,
            x: startPos.current.x,
            y: startPos.current.y,
          });
        }, DRAG_HOLD_MS);
      },
      onPanResponderMove: (e, gs) => {
        const p = propsRef.current;
        if (modeRef.current === 'drag') {
          p.onDragMove(e.nativeEvent.pageX, e.nativeEvent.pageY);
          return;
        }
        if (modeRef.current === 'idle') {
          // First meaningful movement decides scroll vs dismiss and cancels
          // the pending hold-to-drag.
          if (Math.abs(gs.dy) > 8 && Math.abs(gs.dy) >= Math.abs(gs.dx)) {
            modeRef.current = 'scroll';
            scrollAccum.current = gs.dy;
          } else if (Math.abs(gs.dx) > 10) {
            modeRef.current = 'dismiss';
          } else {
            return;
          }
          if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
        }
        if (modeRef.current === 'scroll') {
          const steps = Math.round((scrollAccum.current - gs.dy) / NODE_SLOT_H);
          if (steps !== 0) {
            scrollAccum.current = gs.dy;
            p.onScrollSteps(steps);
          }
        } else if (modeRef.current === 'dismiss') {
          p.onDismissMove(gs.dx);
        }
      },
      onPanResponderRelease: (e, gs) => {
        const p = propsRef.current;
        if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
        const mode = modeRef.current;
        modeRef.current = 'idle';
        if (mode === 'drag') {
          p.onDragEnd(e.nativeEvent.pageX, e.nativeEvent.pageY);
        } else if (mode === 'dismiss') {
          p.onDismissRelease(gs.dx);
        } else if (mode === 'idle') {
          p.onTapSelect(p.index);
        }
      },
      onPanResponderTerminate: () => {
        const p = propsRef.current;
        if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
        if (modeRef.current === 'drag') p.onDragCancel();
        modeRef.current = 'idle';
      },
    }),
  ).current;

  return (
    <View
      {...pan.panHandlers}
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
      accessibilityLabel={`${PIECE_LABELS[group.type]}, ${group.count} available`}
    >
      <PieceIcon type={group.type} size={nodeSize * 0.45} color={iconColor} />
      {group.count > 1 && (
        <View style={[styles.countBadge, { backgroundColor: borderColor }]}>
          <Text style={styles.countBadgeText}>{group.count}</Text>
        </View>
      )}
      {isSelected && (
        <>
          <View style={[styles.cornerTL, { borderColor }]} />
          <View style={[styles.cornerTR, { borderColor }]} />
          <View style={[styles.cornerBL, { borderColor }]} />
          <View style={[styles.cornerBR, { borderColor }]} />
        </>
      )}
    </View>
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

  // Count badge for grouped nodes (top-right corner of the node).
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontFamily: Fonts.spaceMono,
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.void,
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
