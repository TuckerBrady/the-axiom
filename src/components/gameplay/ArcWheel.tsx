import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import { groupPieces, type ArcWheelPiece, type Group } from './arcWheelGroups';

export type { ArcWheelPiece } from './arcWheelGroups';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const WHEEL_WIDTH = 72;
const NODE_SIZE_MAX = 52;
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

const PROTOCOL_TYPES: PieceType[] = ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'];

const PIECE_LABELS: Record<PieceType, string> = {
  source: 'IN', terminal: 'OUT',
  conveyor: 'CONV', gear: 'GEAR', splitter: 'SPLIT',
  configNode: 'CFG', scanner: 'SCAN', transmitter: 'XMIT',
  merger: 'MERGE', bridge: 'BRIDGE',
  inverter: 'INV', counter: 'CNT', latch: 'LATCH',
  obstacle: '',
};

function getPieceColor(type: PieceType): string {
  return PROTOCOL_TYPES.includes(type) ? '#8B5CF6' : '#F0B429';
}

type CategoryKey = 'PHYSICS' | 'PROTOCOL' | 'DATA';
function categoryOf(group: Group): CategoryKey {
  if (group.isTape) return 'DATA';
  return PROTOCOL_TYPES.includes(group.type) ? 'PROTOCOL' : 'PHYSICS';
}
const CATEGORY_LABEL: Record<CategoryKey, string> = {
  PHYSICS: 'PHYSICS',
  PROTOCOL: 'PROTOCOL',
  DATA: 'DATA',
};

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // Tutorial: ref attached to the center/selected node for COGS orb targeting.
  // Vestigial now (Axiom tutorial uses the PieceTray) but kept for compatibility.
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
  const groups = useMemo(() => groupPieces(pieces), [pieces]);

  const [dismissed, setDismissed] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(IDLE_OPACITY)).current;
  const activeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragGroupIndex = useRef(-1);
  const isDraggingRef = useRef(false);

  // Keep selectedIndex in range as groups shrink (e.g. last of a type placed).
  useEffect(() => {
    if (groups.length === 0) return;
    if (selectedIndex > groups.length - 1) setSelectedIndex(groups.length - 1);
  }, [groups.length, selectedIndex]);

  // Sync selectedIndex to the parent's selected instance id (which maps to a
  // group via its representative / membership).
  useEffect(() => {
    if (!selectedId) return;
    const idx = groups.findIndex(g => g.repId === selectedId);
    if (idx !== -1 && idx !== selectedIndex) setSelectedIndex(idx);
  }, [selectedId, groups]);

  // ── Entrance animation (REQ-68): staggered, alternating above/below ──
  const entranceY = useRef(
    Array.from({ length: VISIBLE_NODES }, () => new Animated.Value(0)),
  ).current;
  const entranceOpacity = useRef(
    Array.from({ length: VISIBLE_NODES }, () => new Animated.Value(0)),
  ).current;
  const entranceFired = useRef(false);

  useEffect(() => {
    if (entranceFired.current || groups.length === 0) return;
    entranceFired.current = true;
    const ENTRY_DIST = NODE_SLOT_H * 1.5;
    const STAGGER_MS = 80;
    const ITEM_MS = 500;
    entranceY.forEach((anim, i) => anim.setValue(i % 2 === 0 ? -ENTRY_DIST : ENTRY_DIST));
    entranceOpacity.forEach(a => a.setValue(0));
    const animations = entranceY.map((yAnim, i) =>
      Animated.parallel([
        Animated.timing(yAnim, {
          toValue: 0, duration: ITEM_MS, delay: i * STAGGER_MS,
          easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false,
        }),
        Animated.timing(entranceOpacity[i], {
          toValue: 1, duration: Math.round(ITEM_MS * 0.6), delay: i * STAGGER_MS,
          useNativeDriver: false,
        }),
      ]),
    );
    Animated.parallel(animations).start();
  }, []);

  // ── Dismiss / recall ──
  const dismissSlide = useCallback(() => {
    const toValue = side === 'right' ? WHEEL_WIDTH - RECALL_STRIP_W : -(WHEEL_WIDTH - RECALL_STRIP_W);
    Animated.timing(slideAnim, { toValue, duration: 380, useNativeDriver: false }).start(() => setDismissed(true));
  }, [side, slideAnim]);

  const recallSlide = useCallback(() => {
    setDismissed(false);
    Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: false }).start();
  }, [slideAnim]);

  // ── Active state management ──
  const activateWheel = useCallback(() => {
    if (disabled) return;
    setIsActive(true);
    idleAnim.setValue(1);
    if (activeTimer.current) clearTimeout(activeTimer.current);
    activeTimer.current = setTimeout(() => {
      setIsActive(false);
      Animated.timing(idleAnim, { toValue: IDLE_OPACITY, duration: 400, useNativeDriver: false }).start();
    }, ACTIVE_TIMEOUT_MS);
  }, [disabled, idleAnim]);

  useEffect(() => () => {
    if (activeTimer.current) clearTimeout(activeTimer.current);
    if (dragHoldTimer.current) clearTimeout(dragHoldTimer.current);
  }, []);

  // groups in a ref so the (stable) PanResponder closure reads current length.
  const groupsRef = useRef(groups);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

  // ── Scroll pan responder (vertical swipe to cycle groups) ──
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
            const len = groupsRef.current.length;
            if (len === 0) return 0;
            const next = prev + steps;
            return ((next % len) + len) % len;
          });
          hapticLight();
        }
      },
      onPanResponderRelease: () => { scrollDelta.current = 0; },
    }),
  ).current;

  // ── Drag initiation (long-press a node) ──
  const beginDrag = useCallback((groupIdx: number, screenX: number, screenY: number) => {
    activateWheel();
    dragGroupIndex.current = groupIdx;
    dragStartPos.current = { x: screenX, y: screenY };
    dragHoldTimer.current = setTimeout(() => {
      if (dragGroupIndex.current !== groupIdx) return;
      const group = groupsRef.current[groupIdx];
      if (!group) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      setExpanded(false); // collapse overview when a drag starts
      onDragStart({ active: true, pieceId: group.repId, type: group.type, x: screenX, y: screenY });
    }, DRAG_HOLD_MS);
  }, [activateWheel, onDragStart]);

  const endDragHold = useCallback(() => {
    if (dragHoldTimer.current) { clearTimeout(dragHoldTimer.current); dragHoldTimer.current = null; }
  }, []);

  const selectGroup = useCallback((groupIdx: number, collapse: boolean) => {
    if (isDraggingRef.current) return;
    const group = groups[groupIdx];
    if (!group) return;
    setSelectedIndex(groupIdx);
    onSelect(group.repId);
    hapticLight();
    activateWheel();
    if (collapse) setExpanded(false);
  }, [groups, onSelect, activateWheel]);

  // ── Dismiss pan responder ──
  const dismissPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
      onPanResponderMove: (_, gs) => {
        if (side === 'right' && gs.dx > 0 && !dismissed) slideAnim.setValue(Math.min(gs.dx, WHEEL_WIDTH));
        else if (side === 'left' && gs.dx < 0 && !dismissed) slideAnim.setValue(Math.max(gs.dx, -WHEEL_WIDTH));
      },
      onPanResponderRelease: (_, gs) => {
        const dist = side === 'right' ? gs.dx : -gs.dx;
        if (dist > DISMISS_THRESHOLD) dismissSlide();
        else Animated.spring(slideAnim, { toValue: 0, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const isRight = side === 'right';

  // ── Count badge ──
  function CountBadge({ count, color }: { count: number; color: string }) {
    if (count <= 1) return null;
    return (
      <View style={[styles.countBadge, { borderColor: color }]}>
        <Text style={[styles.countBadgeText, { color }]}>{count}</Text>
      </View>
    );
  }

  // ── Compact node ──
  function renderCompactNode(group: Group, idx: number, relIdx: number) {
    const distance = idx - selectedIndex;
    const absDistance = Math.abs(distance);
    const maxVisible = Math.floor(VISIBLE_NODES / 2);
    if (absDistance > maxVisible) return null;

    const scaleFactor = 1 - (absDistance / (maxVisible + 1)) * 0.45;
    const nodeSize = NODE_SIZE_MAX * scaleFactor;
    const distanceOpacity = 1 - (absDistance / (maxVisible + 1)) * 0.7;
    const isSelected = idx === selectedIndex;
    const borderColor = group.isTape ? TAPE_COLOR : SOURCE_COLORS[group.source];
    const color = getPieceColor(group.type);
    const eY = entranceY[relIdx] ?? new Animated.Value(0);
    const eOp = entranceOpacity[relIdx] ?? new Animated.Value(1);

    return (
      <Animated.View key={group.type} style={{ opacity: eOp, transform: [{ translateY: eY }] }}>
        <View
          ref={isSelected ? mainNodeRef : undefined}
          collapsable={false}
          style={[styles.nodeWrapper, { width: NODE_SIZE_MAX, height: NODE_SLOT_H, alignItems: 'center', justifyContent: 'center', opacity: distanceOpacity }]}
        >
          <TouchableOpacity
            onPressIn={(e) => beginDrag(idx, e.nativeEvent.pageX, e.nativeEvent.pageY)}
            onPressOut={endDragHold}
            onPress={() => selectGroup(idx, false)}
            activeOpacity={0.8}
            style={[styles.node, {
              width: nodeSize, height: nodeSize,
              borderColor: isSelected ? borderColor : `${borderColor}60`,
              borderWidth: isSelected ? 2 : 1,
              backgroundColor: isSelected ? `${borderColor}18` : 'rgba(8,14,28,0.9)',
            }]}
            accessibilityLabel={`${PIECE_LABELS[group.type]}, ${group.count} available`}
          >
            <PieceIcon type={group.type} size={nodeSize * 0.45} color={color} />
            {isSelected && (
              <>
                <View style={[styles.cornerTL, { borderColor }]} />
                <View style={[styles.cornerTR, { borderColor }]} />
                <View style={[styles.cornerBL, { borderColor }]} />
                <View style={[styles.cornerBR, { borderColor }]} />
              </>
            )}
            <CountBadge count={group.count} color={borderColor} />
          </TouchableOpacity>
          {isSelected && (
            <Text style={[styles.nodeLabel, { color: borderColor }]} numberOfLines={1}>
              {PIECE_LABELS[group.type]}
            </Text>
          )}
        </View>
      </Animated.View>
    );
  }

  // ── Overview (expanded) — all groups at once, grouped by category ──
  function renderOverview() {
    const sections: { key: CategoryKey; groups: { group: Group; idx: number }[] }[] = [];
    const order: CategoryKey[] = ['PHYSICS', 'PROTOCOL', 'DATA'];
    for (const key of order) {
      const inCat = groups
        .map((group, idx) => ({ group, idx }))
        .filter(({ group }) => categoryOf(group) === key);
      if (inCat.length > 0) sections.push({ key, groups: inCat });
    }

    return (
      <View style={[styles.overviewPanel, isRight ? styles.overviewRight : styles.overviewLeft]}>
        <TouchableOpacity style={styles.overviewClose} onPress={() => setExpanded(false)} activeOpacity={0.7} accessibilityLabel="Collapse inventory">
          <Text style={styles.overviewCloseText}>{isRight ? '›' : '‹'} CLOSE</Text>
        </TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.overviewScroll}>
          {sections.map(section => (
            <View key={section.key} style={styles.overviewSection}>
              <Text style={styles.overviewHeader}>{CATEGORY_LABEL[section.key]}</Text>
              {section.groups.map(({ group, idx }) => {
                const borderColor = group.isTape ? TAPE_COLOR : SOURCE_COLORS[group.source];
                const color = getPieceColor(group.type);
                const isSelected = idx === selectedIndex;
                return (
                  <TouchableOpacity
                    key={group.type}
                    onPressIn={(e) => beginDrag(idx, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                    onPressOut={endDragHold}
                    onPress={() => selectGroup(idx, true)}
                    activeOpacity={0.8}
                    style={[styles.overviewItem, { borderColor: isSelected ? borderColor : `${borderColor}40` }]}
                    accessibilityLabel={`${PIECE_LABELS[group.type]}, ${group.count} available`}
                  >
                    <View style={[styles.overviewIcon, { borderColor: `${borderColor}60` }]}>
                      <PieceIcon type={group.type} size={20} color={color} />
                    </View>
                    <Text style={[styles.overviewLabel, { color: isSelected ? borderColor : Colors.starWhite }]} numberOfLines={1}>
                      {PIECE_LABELS[group.type]}
                    </Text>
                    <Text style={[styles.overviewCount, { color: borderColor }]}>×{group.count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // The slice centered on the selected index.
  const startIdx = Math.max(0, selectedIndex - 2);
  const visibleGroups = groups.slice(startIdx, Math.min(groups.length, selectedIndex + 3));

  return (
    <Animated.View
      style={[styles.container, isRight ? styles.containerRight : styles.containerLeft, { transform: [{ translateX: slideAnim }] }]}
    >
      {/* Recall strip (visible when dismissed) */}
      {dismissed && (
        <TouchableOpacity
          style={[styles.recallStrip, isRight ? styles.recallStripRight : styles.recallStripLeft]}
          onPress={recallSlide}
          activeOpacity={0.7}
          accessibilityLabel="Recall piece selector"
        />
      )}

      {!dismissed && expanded && renderOverview()}

      {!dismissed && !expanded && (
        <Animated.View
          style={[styles.pill, { opacity: isActive ? 1 : idleAnim }]}
          {...(isDragging ? {} : scrollPan.panHandlers)}
          {...(isDragging ? {} : dismissPan.panHandlers)}
        >
          {/* Overview toggle */}
          {groups.length > 0 && (
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={() => { setExpanded(true); activateWheel(); }}
              activeOpacity={0.7}
              accessibilityLabel="Show all pieces"
            >
              <View style={styles.expandDot} />
              <View style={styles.expandDot} />
              <View style={styles.expandDot} />
            </TouchableOpacity>
          )}

          {/* Empty state */}
          {groups.length === 0 && (
            <View style={styles.emptyState}><Text style={styles.emptyText}>——</Text></View>
          )}

          {/* Group nodes */}
          {visibleGroups.map((group, relIdx) => renderCompactNode(group, startIdx + relIdx, relIdx))}
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
    top: 0, bottom: 0,
    width: WHEEL_WIDTH,
    justifyContent: 'center',
    zIndex: 10,
  },
  containerRight: { right: 0 },
  containerLeft: { left: 0 },

  recallStrip: {
    position: 'absolute', top: '30%', height: '40%', width: RECALL_STRIP_W,
    backgroundColor: 'rgba(74,158,255,0.25)', borderRadius: 3,
  },
  recallStripRight: { right: 0 },
  recallStripLeft: { left: 0 },

  pill: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 8,
    backgroundColor: 'rgba(6,10,20,0.85)',
    borderRadius: 36, borderWidth: 1, borderColor: 'rgba(74,158,255,0.15)',
    minHeight: WHEEL_H, gap: 0,
  },

  expandBtn: {
    position: 'absolute', top: 4, alignSelf: 'center',
    flexDirection: 'row', gap: 3, padding: 6, zIndex: 2,
  },
  expandDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(74,158,255,0.6)' },

  nodeWrapper: {},
  node: { borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  nodeLabel: { fontFamily: Fonts.spaceMono, fontSize: 7, letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },

  countBadge: {
    position: 'absolute', top: -5, right: -5,
    minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8,
    borderWidth: 1, backgroundColor: 'rgba(6,10,20,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontFamily: Fonts.spaceMono, fontSize: 9, fontWeight: '700' },

  emptyState: { height: WHEEL_H, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.muted, opacity: 0.4 },

  // Corner brackets for selected piece
  cornerTL: { position: 'absolute', top: -1, left: -1, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { position: 'absolute', top: -1, right: -1, width: CORNER_SIZE, height: CORNER_SIZE, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { position: 'absolute', bottom: -1, left: -1, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { position: 'absolute', bottom: -1, right: -1, width: CORNER_SIZE, height: CORNER_SIZE, borderBottomWidth: 2, borderRightWidth: 2 },

  // ── Overview (expanded) ──
  overviewPanel: {
    position: 'absolute', top: 0, bottom: 0, width: 150,
    backgroundColor: 'rgba(6,10,20,0.97)',
    borderColor: 'rgba(74,158,255,0.2)',
    paddingTop: 12,
  },
  overviewRight: { right: 0, borderLeftWidth: 1 },
  overviewLeft: { left: 0, borderRightWidth: 1 },
  overviewClose: { paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-end' },
  overviewCloseText: { fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted, letterSpacing: 1.5 },
  overviewScroll: { paddingHorizontal: 8, paddingBottom: 24, gap: 4 },
  overviewSection: { marginBottom: 10 },
  overviewHeader: {
    fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.dim,
    letterSpacing: 2, marginBottom: 4, marginLeft: 4,
  },
  overviewItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 6,
    borderWidth: 1, borderRadius: 8, marginBottom: 4,
    backgroundColor: 'rgba(8,14,28,0.8)',
  },
  overviewIcon: {
    width: 32, height: 32, borderRadius: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  overviewLabel: { flex: 1, fontFamily: Fonts.spaceMono, fontSize: 10, letterSpacing: 0.5 },
  overviewCount: { fontFamily: Fonts.spaceMono, fontSize: 11, fontWeight: '700' },
});
