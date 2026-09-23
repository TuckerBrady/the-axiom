import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieceIcon } from '../PieceIcon';
import type { PieceType } from '../../game/types';
import { Colors, Fonts, FontSizes } from '../../theme/tokens';
import { applyTrayFilter, trayFilterChips, type TrayFilter } from './trayGrouping';
import {
  TRAY_ITEM_GAP,
  TRAY_ITEM_W,
  centrePadding,
  frameKeyAfterItemsChange,
  frameKeyForFilter,
  indexAtOffset,
  offsetForIndex,
  selectableKey,
  snapOffsets,
} from './trayCentre';

// Hold threshold (ms) before a touch promotes from a tap candidate to a
// drag. A shorter press is a tap: centre the item and select it.
const DRAG_HOLD_MS = 180;

// AXM-013 — every sector places from this one tray. The row is a fixed
// height for the whole level; when the level needs filter chips they mount
// with the tray and are part of that fixed height, so neither the chips nor
// the tray can shift the board.
const TRAY_ROW_H = 72;
const CHIP_ROW_H = 32;
const EDGE_FADE_W = 28;

// AXM-020 — the centre frame: the piece in hand. Fixed; items slide under it.
const FRAME_COLOR = '#F0B429';
const FRAME_SIZE = 64;
// The selected item grows a little. Keyed to selection, never to the scroll
// offset (REQ-A: no per-item animation driven by scrolling).
const SELECTED_SCALE = 1.06;
const SCALE_MS = 120;
// A drag that ends without a fling settles here unless momentum takes over.
const SETTLE_NO_MOMENTUM_MS = 80;

// Source colors for the Kepler+ split count badge: amber counts pre-assigned
// pieces, blue counts requisitioned ones (unspent requisitioned pieces are
// forfeited at level end, so the Engineer needs to see them). Tapes keep the
// Trail purple.
const PRE_ASSIGNED_COLOR = '#F0B429';
const REQUISITIONED_COLOR = '#00D4FF';
const TAPE_COLOR = '#A97FDB';

export interface DragState {
  active: boolean;
  // The tray item key being dragged (a piece type in the Axiom, a group key
  // in Kepler+).
  pieceId: string | null;
  type: PieceType | null;
  x: number;
  y: number;
}

export interface TrayItem {
  key: string;
  type: PieceType;
  isTape: boolean;
  count: number;
  // Set only where the badge splits by source (Kepler+).
  preAssignedCount?: number;
  requisitionedCount?: number;
  // Axiom: icon dims when the piece can't currently be placed.
  dimmed?: boolean;
}

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

// Filter chips follow the REQUISITION store's tab treatment.
const CHIP_COLORS: Record<TrayFilter, string> = {
  ALL: Colors.blue,
  PHYSICS: Colors.copper,
  PROTOCOL: Colors.circuit,
  TAPES: TAPE_COLOR,
};

export interface TutorialTrayRefs {
  trayConveyor: React.Ref<View>;
  trayGear: React.Ref<View>;
  trayConfigNode: React.Ref<View>;
  traySplitter: React.Ref<View>;
  trayScanner: React.Ref<View>;
  trayTransmitter: React.Ref<View>;
}

type FadeSide = 'none' | 'left' | 'right';

// Which edge has more content hidden past it. No fade when everything fits.
export function edgeFadeSide(scrollX: number, contentW: number, viewportW: number): FadeSide {
  if (contentW <= viewportW + 1) return 'none';
  const hiddenLeft = Math.max(0, scrollX);
  const hiddenRight = Math.max(0, contentW - viewportW - scrollX);
  if (hiddenLeft <= 0 && hiddenRight <= 0) return 'none';
  return hiddenLeft > hiddenRight ? 'left' : 'right';
}

interface Props {
  items: TrayItem[];
  selectedKey: string | null;
  refs?: TutorialTrayRefs;
  onPickup: (key: string | null) => void;
  // Optional drag wiring. When all four are provided, a hold-to-drag
  // PanResponder is mounted per item: a 180 ms hold promotes the touch
  // to a drag; a shorter press is a tap (centre and select).
  // When the drag props are absent, the TouchableOpacity tap path is
  // rendered so non-drag call sites keep working.
  onDragStart?: (drag: DragState) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDragCancel?: () => void;
  disabled?: boolean;
  // REQ-G-02 (Handoff 003): the parent keeps this component mounted for
  // the whole level. `hidden` drives opacity + pointerEvents instead —
  // the row stays reserved in the layout, just invisible and
  // non-interactive, during the run/results/void/debug states.
  hidden?: boolean;
  // Kepler+: count badge splits amber (pre-assigned) / blue (requisitioned).
  showSourceSplit?: boolean;
  // Decided once per level by the parent (more than FILTER_CHIP_THRESHOLD
  // items at level start), so chips never appear or vanish mid-level.
  showFilterChips?: boolean;
  // A tutorial step is live: show everything so the step can measure its
  // target item.
  forceFilterAll?: boolean;
  // Changes on level entry; the filter resets to ALL and doesn't persist.
  resetKey?: string;
  // AXM-020: a placed piece is selected on the board, so the tray does not
  // put its framed item back in hand until that selection clears.
  holdSelection?: boolean;
}

// React.memo with default shallow comparison. `items` and `refs` must be
// memoized in the parent so reference identity is stable across renders.
// REQ-G-02 keeps this component mounted through beam runs (hidden via the
// `hidden` prop); none of the props change mid-run, so it does not
// meaningfully re-render during a beam tick.
function PieceTrayComponent({
  items,
  selectedKey,
  refs,
  onPickup,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  disabled,
  hidden,
  showSourceSplit,
  showFilterChips,
  forceFilterAll,
  resetKey,
  holdSelection,
}: Props) {
  const dragEnabled =
    !!onDragStart && !!onDragMove && !!onDragEnd && !!onDragCancel;

  // While a piece is being dragged out, the tray must stay STATIC — otherwise
  // the horizontal finger motion scrolls the ScrollView and the tray items
  // slide left/right following the drag (Tucker, 2026-06-15). Disabling
  // scrolling for the duration of the drag pins them in place.
  const [dragActive, setDragActive] = useState(false);

  // ── Filtering ──
  const [filter, setFilter] = useState<TrayFilter>('ALL');
  const effectiveFilter: TrayFilter = showFilterChips && !forceFilterAll ? filter : 'ALL';
  const visibleItems = useMemo(() => applyTrayFilter(items, effectiveFilter), [items, effectiveFilter]);
  const chips = showFilterChips ? trayFilterChips(items) : [];

  // ── Sliding: edge fade ──
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const viewportWRef = useRef(0);
  const contentWRef = useRef(0);
  const [viewportW, setViewportW] = useState(0);
  const [fadeSide, setFadeSide] = useState<FadeSide>('none');

  const refreshFade = useCallback(() => {
    const next = edgeFadeSide(scrollXRef.current, contentWRef.current, viewportWRef.current);
    setFadeSide(prev => (prev === next ? prev : next));
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
    refreshFade();
  }, [refreshFade]);

  const handleViewportLayout = useCallback((e: LayoutChangeEvent) => {
    viewportWRef.current = e.nativeEvent.layout.width;
    setViewportW(e.nativeEvent.layout.width);
    refreshFade();
  }, [refreshFade]);

  const handleContentSize = useCallback((w: number) => {
    contentWRef.current = w;
    refreshFade();
  }, [refreshFade]);

  // ── Centre frame (AXM-020) ──
  // The frame holds one item, tracked by key so a list change around it never
  // hands the frame to a different piece. The item in the frame is the
  // selection, except while the tray is hidden for a run or a placed piece is
  // selected on the board (holdSelection).
  const [frameKey, setFrameKey] = useState<string | null>(null);
  const prevVisibleRef = useRef(visibleItems);
  // Level entry and a filter change both re-centre on the first item.
  const recentreRef = useRef(true);

  const scrollToKey = useCallback((key: string | null, list: readonly TrayItem[], animated: boolean) => {
    const idx = key === null ? -1 : list.findIndex(i => i.key === key);
    if (idx === -1) return;
    const x = offsetForIndex(idx);
    if (Math.abs(x - scrollXRef.current) < 1) return;
    scrollXRef.current = x;
    scrollRef.current?.scrollTo({ x, animated });
  }, []);

  useEffect(() => {
    setFilter('ALL');
    recentreRef.current = true;
  }, [resetKey]);
  useEffect(() => { if (forceFilterAll) setFilter('ALL'); }, [forceFilterAll]);

  // A filter change re-lays the row from its start. Without this the old
  // offset survives: slide to the end, narrow the filter, and the filtered
  // items sit off-screen to the left (found on device, K1-10). The first item
  // of the new list takes the frame.
  useEffect(() => {
    scrollXRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    refreshFade();
    recentreRef.current = true;
  }, [effectiveFilter, refreshFade]);

  // The item list changed: a placement, a long-press return, level entry or a
  // filter change. Work out which item holds the frame now. Deliberately keyed
  // to the list alone; selection is reconciled by the effect below.
  useEffect(() => {
    const prev = prevVisibleRef.current;
    prevVisibleRef.current = visibleItems;
    if (recentreRef.current) {
      recentreRef.current = false;
      setFrameKey(frameKeyForFilter(visibleItems));
      if (!hidden && !holdSelection) onPickup(selectableKey(visibleItems[0]));
      return;
    }
    setFrameKey(current => {
      const next = frameKeyAfterItemsChange(prev, visibleItems, current);
      scrollToKey(next, visibleItems, next !== current);
      return next;
    });
  }, [visibleItems]);

  // Keep the selection and the frame in step.
  useEffect(() => {
    if (hidden) {
      if (selectedKey !== null) onPickup(null);
      return;
    }
    if (selectedKey !== null && visibleItems.some(i => i.key === selectedKey)) {
      // Selected from outside the tray (a tutorial step): bring it to the frame.
      if (selectedKey !== frameKey) {
        setFrameKey(selectedKey);
        scrollToKey(selectedKey, visibleItems, true);
      }
      return;
    }
    if (holdSelection || disabled) return;
    const want = selectableKey(visibleItems.find(i => i.key === frameKey));
    if (want !== selectedKey) onPickup(want);
  }, [hidden, holdSelection, disabled, selectedKey, frameKey, visibleItems, onPickup, scrollToKey]);

  // Whatever sits in the frame when scrolling settles is the selection.
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);
  useEffect(() => clearSettleTimer, [clearSettleTimer]);

  const settleAt = useCallback((x: number) => {
    clearSettleTimer();
    scrollXRef.current = x;
    const idx = indexAtOffset(x, visibleItems.length);
    if (idx === -1) return;
    const item = visibleItems[idx];
    setFrameKey(item.key);
    if (hidden) return;
    const want = selectableKey(item);
    if (want !== selectedKey) onPickup(want);
  }, [visibleItems, hidden, selectedKey, onPickup, clearSettleTimer]);

  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settleAt(e.nativeEvent.contentOffset.x);
  }, [settleAt]);

  // iOS sends no momentum events for a drag released without a fling.
  const handleScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => settleAt(x), SETTLE_NO_MOMENTUM_MS);
  }, [settleAt, clearSettleTimer]);

  // Tapping any visible item slides it into the frame and selects it.
  const handleItemTap = useCallback((key: string) => {
    const item = visibleItems.find(i => i.key === key);
    if (!item) return;
    setFrameKey(key);
    scrollToKey(key, visibleItems, true);
    const want = selectableKey(item);
    if (want !== selectedKey) onPickup(want);
  }, [visibleItems, selectedKey, onPickup, scrollToKey]);

  const sidePad = centrePadding(viewportW);

  return (
    <View
      style={[
        styles.partsTray,
        { height: TRAY_ROW_H + (showFilterChips ? CHIP_ROW_H : 0) },
        hidden && { opacity: 0 },
      ]}
      pointerEvents={hidden ? 'none' : 'auto'}
    >
      {showFilterChips && (
        <View style={styles.chipRow}>
          {chips.map(chip => {
            const active = effectiveFilter === chip;
            const color = CHIP_COLORS[chip];
            return (
              <TouchableOpacity
                key={chip}
                style={[
                  styles.chip,
                  { borderBottomColor: color },
                  active && { backgroundColor: `${color}18` },
                ]}
                onPress={() => setFilter(chip)}
                activeOpacity={0.7}
                accessibilityLabel={`Filter ${chip}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipLabel, { color: active ? color : Colors.muted }]}>{chip}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <View style={styles.trayRow} onLayout={handleViewportLayout} testID="tray-viewport">
        <ScrollView
          ref={scrollRef}
          horizontal
          scrollEnabled={!dragActive}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.partsTrayInner, { paddingHorizontal: sidePad }]}
          snapToOffsets={snapOffsets(visibleItems.length)}
          decelerationRate="fast"
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollBegin={clearSettleTimer}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={32}
          onContentSizeChange={handleContentSize}
        >
          {visibleItems.map(item => {
            const pt = item.type;
            const count = item.count;
            const isActive = selectedKey === item.key;
            const color = item.isTape ? TAPE_COLOR : getPieceColor(pt);
            const measureRef = refs && !item.isTape
              ? pt === 'conveyor' ? refs.trayConveyor
              : pt === 'gear' ? refs.trayGear
              : pt === 'configNode' ? refs.trayConfigNode
              : pt === 'splitter' ? refs.traySplitter
              : pt === 'scanner' ? refs.trayScanner
              : pt === 'transmitter' ? refs.trayTransmitter
              : undefined
              : undefined;
            const itemDisabled = !!disabled || count <= 0;
            const accessibilityLabel = `${PIECE_LABELS[pt]}${item.isTape ? ' tape' : ''}, ${count} available`;
            const itemStyle = [
              styles.trayItem,
              item.isTape && { borderColor: `${TAPE_COLOR}66` },
              isActive && { borderColor: color, backgroundColor: `${color}15` },
            ];
            const innerContent = (
              <>
                <View style={{ opacity: count > 0 && !item.dimmed ? 1 : 0.3 }}>
                  <PieceIcon type={pt} size={32} color={color} />
                </View>
                {showSourceSplit && !item.isTape ? (
                  <View style={styles.badgeRow}>
                    {(item.preAssignedCount ?? 0) > 0 && (
                      <View style={[styles.splitBadge, { backgroundColor: PRE_ASSIGNED_COLOR }]}>
                        <Text style={styles.trayBadgeText}>{item.preAssignedCount}</Text>
                      </View>
                    )}
                    {(item.requisitionedCount ?? 0) > 0 && (
                      <View style={[styles.splitBadge, { backgroundColor: REQUISITIONED_COLOR }]}>
                        <Text style={styles.trayBadgeText}>{item.requisitionedCount}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.trayBadge, { backgroundColor: count > 0 ? color : Colors.dim }]}>
                    <Text style={styles.trayBadgeText}>{count}</Text>
                  </View>
                )}
              </>
            );

            if (dragEnabled) {
              return (
                <TrayItemDraggable
                  key={item.key}
                  itemKey={item.key}
                  pt={pt}
                  measureRef={measureRef}
                  disabled={itemDisabled}
                  isActive={isActive}
                  itemStyle={itemStyle}
                  accessibilityLabel={accessibilityLabel}
                  onTap={handleItemTap}
                  onDragStart={onDragStart!}
                  onDragMove={onDragMove!}
                  onDragEnd={onDragEnd!}
                  onDragCancel={onDragCancel!}
                  onDragActiveChange={setDragActive}
                >
                  {innerContent}
                </TrayItemDraggable>
              );
            }

            return (
              <View
                key={item.key}
                ref={measureRef}
                collapsable={false}
              >
                <TrayItemScale itemKey={item.key} isActive={isActive}>
                  <TouchableOpacity
                    testID={`tray-item-${item.key}`}
                    style={itemStyle}
                    onPress={() => {
                      if (itemDisabled) return;
                      handleItemTap(item.key);
                    }}
                    activeOpacity={0.7}
                    disabled={itemDisabled}
                    accessibilityLabel={accessibilityLabel}
                  >
                    {innerContent}
                  </TouchableOpacity>
                </TrayItemScale>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.frameWrap} pointerEvents="none">
          <View testID="tray-frame" style={styles.frame} pointerEvents="none" />
        </View>
        {fadeSide !== 'none' && (
          <LinearGradient
            pointerEvents="none"
            start={{ x: fadeSide === 'right' ? 0 : 1, y: 0.5 }}
            end={{ x: fadeSide === 'right' ? 1 : 0, y: 0.5 }}
            colors={['rgba(6,9,15,0)', 'rgba(6,9,15,0.95)']}
            style={[styles.edgeFade, fadeSide === 'right' ? { right: 0 } : { left: 0 }]}
          />
        )}
      </View>
    </View>
  );
}

// ── TrayItemDraggable ────────────────────────────────────────────────────
// Per-item touch wrapper used only when all four drag callbacks are
// provided. Implements the hold-to-drag pattern:
//   • 0–180 ms hold + release  → tap → onTap(key): centre it and select it
//   • >= 180 ms hold           → drag → onDragStart, onDragMove, onDragEnd
//   • interruption mid-drag    → onDragCancel
//
// PanResponder.create() is called once per mount and its callbacks
// reach the latest props via a single `propsRef` written in an effect.
// This avoids reconstructing the PanResponder on every render (which
// would race with active gestures) while keeping prop semantics live.
interface TrayItemDraggableProps {
  itemKey: string;
  pt: PieceType;
  measureRef: React.Ref<View> | undefined;
  disabled: boolean;
  isActive: boolean;
  itemStyle: unknown;
  accessibilityLabel: string;
  onTap: (key: string) => void;
  onDragStart: (drag: DragState) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragCancel: () => void;
  // Notifies the tray to freeze/unfreeze ScrollView scrolling for the drag.
  onDragActiveChange: (active: boolean) => void;
  children: React.ReactNode;
}

function TrayItemDraggable({
  itemKey,
  pt,
  measureRef,
  disabled,
  isActive,
  itemStyle,
  accessibilityLabel,
  onTap,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  onDragActiveChange,
  children,
}: TrayItemDraggableProps) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const propsRef = useRef({
    itemKey, pt, disabled, isActive,
    onTap, onDragStart, onDragMove, onDragEnd, onDragCancel, onDragActiveChange,
  });
  useEffect(() => {
    propsRef.current = {
      itemKey, pt, disabled, isActive,
      onTap, onDragStart, onDragMove, onDragEnd, onDragCancel, onDragActiveChange,
    };
  });

  // Cleanup any pending hold timer when the item unmounts.
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !propsRef.current.disabled,
      onMoveShouldSetPanResponder: () => !propsRef.current.disabled,
      onPanResponderTerminationRequest: () => false,
      // Let the native ScrollView take a swipe. A PanResponder blocks the
      // native responder by default, and when the JS grant landed before the
      // ScrollView's intercept a swipe could never scroll the tray: the hold
      // fired and the swipe became a drag (found on axiom_compact, AXM-020).
      // A swipe the ScrollView takes arrives here as a terminate, which
      // clears the hold timer. Once a drag starts, scrollEnabled goes false.
      onShouldBlockNativeResponder: () => false,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        isDraggingRef.current = false;
        startPosRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
        };
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        holdTimerRef.current = setTimeout(() => {
          isDraggingRef.current = true;
          const { itemKey: keyNow, pt: ptNow, onDragStart: ods, onDragActiveChange: dac } = propsRef.current;
          dac(true); // freeze the tray so it doesn't scroll under the drag
          ods({
            active: true,
            pieceId: keyNow,
            type: ptNow,
            x: startPosRef.current.x,
            y: startPosRef.current.y,
          });
        }, DRAG_HOLD_MS);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!isDraggingRef.current) return;
        propsRef.current.onDragMove(
          evt.nativeEvent.pageX,
          evt.nativeEvent.pageY,
        );
      },
      onPanResponderRelease: (evt: GestureResponderEvent) => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          propsRef.current.onDragActiveChange(false); // re-enable tray scroll
          propsRef.current.onDragEnd(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY,
          );
          return;
        }
        // Short press: a tap. The item slides into the frame and is
        // selected (AXM-020); tapping the item already there keeps it.
        const { itemKey: keyNow, onTap: tapNow } = propsRef.current;
        tapNow(keyNow);
      },
      onPanResponderTerminate: () => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          propsRef.current.onDragActiveChange(false); // re-enable tray scroll
          propsRef.current.onDragCancel();
        }
      },
    }),
  ).current;

  return (
    <View ref={measureRef} collapsable={false}>
      <TrayItemScale itemKey={itemKey} isActive={isActive}>
        <View
          {...panResponder.panHandlers}
          testID={`tray-item-${itemKey}`}
          style={itemStyle as object}
          accessibilityLabel={accessibilityLabel}
        >
          {children}
        </View>
      </TrayItemScale>
    </View>
  );
}

// ── TrayItemScale ────────────────────────────────────────────────────────
// The selected item grows to SELECTED_SCALE. JS-driven (useNativeDriver:
// false) and keyed to selection changes only. One Animated.View per item for
// the item's whole life; nothing here swaps its host (REQ-A-1 / A-2).
function TrayItemScale({
  itemKey,
  isActive,
  children,
}: {
  itemKey: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(isActive ? SELECTED_SCALE : 1)).current;
  useEffect(() => {
    Animated.timing(scale, {
      toValue: isActive ? SELECTED_SCALE : 1,
      duration: SCALE_MS,
      useNativeDriver: false,
    }).start();
  }, [isActive, scale]);
  return (
    <Animated.View testID={`tray-item-scale-${itemKey}`} style={[styles.scaleHost, { transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}

export default React.memo(PieceTrayComponent);

const styles = StyleSheet.create({
  partsTray: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.12)',
  },
  chipRow: {
    height: CHIP_ROW_H,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.08)',
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  chipLabel: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, letterSpacing: 1.2,
  },
  trayRow: {
    height: TRAY_ROW_H,
    justifyContent: 'center',
  },
  // paddingHorizontal comes from centrePadding(viewport) at render, so the
  // first and the last item can both reach the frame.
  partsTrayInner: {
    gap: TRAY_ITEM_GAP,
    alignItems: 'center',
  },
  frameWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderWidth: 2,
    borderColor: FRAME_COLOR,
    borderRadius: 14,
  },
  scaleHost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: EDGE_FADE_W,
  },
  trayItem: {
    width: TRAY_ITEM_W,
    height: TRAY_ITEM_W,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,28,0.8)',
    gap: 2,
    position: 'relative',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 2,
  },
  // D-08 — badge raised to the 11pt floor (was 8pt, dark-on-hue and
  // unreadable). The 56pt cell still has room: a 32pt icon plus an
  // 11pt corner badge fits with the price gone.
  trayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9,
    minWidth: 20,
    alignItems: 'center',
  },
  // Kepler+ split badge: two narrower pills side by side in the same 56pt cell.
  splitBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 9,
    minWidth: 16,
    alignItems: 'center',
  },
  trayBadgeText: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.void, fontWeight: 'bold',
  },
});
