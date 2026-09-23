import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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

// Hold threshold (ms) before a touch promotes from a tap candidate to a
// drag. A shorter press is a tap (select / deselect).
const DRAG_HOLD_MS = 180;

// AXM-013 — every sector places from this one tray. The row is a fixed
// height for the whole level; when the level needs filter chips they mount
// with the tray and are part of that fixed height, so neither the chips nor
// the tray can shift the board.
const TRAY_ROW_H = 72;
const CHIP_ROW_H = 32;
const EDGE_FADE_W = 28;

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

// Scroll offset that brings [itemX, itemX + itemW] fully into view, or null
// when it already is.
export function scrollToReveal(
  itemX: number,
  itemW: number,
  scrollX: number,
  viewportW: number,
  pad: number,
): number | null {
  if (itemX - pad < scrollX) return Math.max(0, itemX - pad);
  if (itemX + itemW + pad > scrollX + viewportW) return itemX + itemW + pad - viewportW;
  return null;
}

interface Props {
  items: TrayItem[];
  selectedKey: string | null;
  refs?: TutorialTrayRefs;
  onPickup: (key: string | null) => void;
  // Optional drag wiring. When all four are provided, a hold-to-drag
  // PanResponder is mounted per item: a 180 ms hold promotes the touch
  // to a drag; a shorter press falls through to onPickup (tap).
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
  useEffect(() => { setFilter('ALL'); }, [resetKey]);
  useEffect(() => { if (forceFilterAll) setFilter('ALL'); }, [forceFilterAll]);
  const effectiveFilter: TrayFilter = showFilterChips && !forceFilterAll ? filter : 'ALL';
  const visibleItems = applyTrayFilter(items, effectiveFilter);
  const chips = showFilterChips ? trayFilterChips(items) : [];

  // A selection the filter hides is cleared rather than left invisible.
  const selectedHidden =
    selectedKey !== null && items.some(i => i.key === selectedKey) &&
    !visibleItems.some(i => i.key === selectedKey);
  useEffect(() => {
    if (selectedHidden) onPickup(null);
  }, [selectedHidden, onPickup]);

  // ── Sliding: edge fade + scroll-into-view ──
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const viewportWRef = useRef(0);
  const contentWRef = useRef(0);
  const itemLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});
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
    refreshFade();
  }, [refreshFade]);

  const handleContentSize = useCallback((w: number) => {
    contentWRef.current = w;
    refreshFade();
  }, [refreshFade]);

  const revealSelected = useCallback(() => {
    if (!selectedKey) return;
    const layout = itemLayoutsRef.current[selectedKey];
    if (!layout) return;
    const target = scrollToReveal(
      layout.x, layout.width, scrollXRef.current, viewportWRef.current, styles.partsTrayInner.paddingHorizontal,
    );
    if (target !== null) scrollRef.current?.scrollTo({ x: target, animated: true });
  }, [selectedKey]);

  // Selected by tap or programmatically (a tutorial step): scroll it fully
  // into view.
  useEffect(() => { revealSelected(); }, [revealSelected, effectiveFilter]);

  const handleItemLayout = useCallback((key: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    itemLayoutsRef.current[key] = { x, width };
    if (key === selectedKey) revealSelected();
  }, [selectedKey, revealSelected]);

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
      <View style={styles.trayRow} onLayout={handleViewportLayout}>
        <ScrollView
          ref={scrollRef}
          horizontal
          scrollEnabled={!dragActive}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.partsTrayInner}
          onScroll={handleScroll}
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
                  onLayout={handleItemLayout}
                  disabled={itemDisabled}
                  isActive={isActive}
                  itemStyle={itemStyle}
                  accessibilityLabel={accessibilityLabel}
                  onPickup={onPickup}
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
                onLayout={e => handleItemLayout(item.key, e)}
              >
                <TouchableOpacity
                  style={itemStyle}
                  onPress={() => {
                    if (itemDisabled) return;
                    onPickup(isActive ? null : item.key);
                  }}
                  activeOpacity={0.7}
                  disabled={itemDisabled}
                  accessibilityLabel={accessibilityLabel}
                >
                  {innerContent}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
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
//   • 0–180 ms hold + release  → tap → onPickup(key) (or null to deselect)
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
  onLayout: (key: string, e: LayoutChangeEvent) => void;
  disabled: boolean;
  isActive: boolean;
  itemStyle: unknown;
  accessibilityLabel: string;
  onPickup: (key: string | null) => void;
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
  onLayout,
  disabled,
  isActive,
  itemStyle,
  accessibilityLabel,
  onPickup,
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
    onPickup, onDragStart, onDragMove, onDragEnd, onDragCancel, onDragActiveChange,
  });
  useEffect(() => {
    propsRef.current = {
      itemKey, pt, disabled, isActive,
      onPickup, onDragStart, onDragMove, onDragEnd, onDragCancel, onDragActiveChange,
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
        // Short press: treat as a tap. Toggle selection.
        const { itemKey: keyNow, isActive: activeNow, onPickup: pickup } =
          propsRef.current;
        pickup(activeNow ? null : keyNow);
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
    <View ref={measureRef} collapsable={false} onLayout={e => onLayout(itemKey, e)}>
      <View
        {...panResponder.panHandlers}
        style={itemStyle as object}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </View>
    </View>
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
  partsTrayInner: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: EDGE_FADE_W,
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
