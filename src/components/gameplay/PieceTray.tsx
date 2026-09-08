import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
} from 'react-native';
import { PieceIcon } from '../PieceIcon';
import type { PieceType } from '../../game/types';
import type { DragState } from './ArcWheel';
import { Colors, Fonts, FontSizes } from '../../theme/tokens';

// Hold threshold (ms) before a touch promotes from a tap candidate to a
// drag. Mirrors the ArcWheel.tsx constant of the same name.
const DRAG_HOLD_MS = 180;

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

export interface TutorialTrayRefs {
  trayConveyor: React.Ref<View>;
  trayGear: React.Ref<View>;
  trayConfigNode: React.Ref<View>;
  traySplitter: React.Ref<View>;
  trayScanner: React.Ref<View>;
  trayTransmitter: React.Ref<View>;
}

interface Props {
  trayPieceTypes: PieceType[];
  availableCounts: Partial<Record<PieceType, number>>;
  selectedPieceFromTray: PieceType | null;
  costs: Partial<Record<PieceType, number>>;
  affordable: Partial<Record<PieceType, boolean>>;
  refs?: TutorialTrayRefs;
  onPickup: (type: PieceType | null) => void;
  // Optional drag wiring. When all four are provided, a hold-to-drag
  // PanResponder is mounted per item: a 180 ms hold promotes the touch
  // to a drag; a shorter press falls through to onPickup (tap).
  // When the drag props are absent, the existing TouchableOpacity tap
  // path is rendered unchanged so non-drag call sites keep working.
  onDragStart?: (drag: DragState) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDragCancel?: () => void;
  disabled?: boolean;
}

// React.memo with default shallow comparison. The `refs` prop must be
// memoized in the parent (useMemo) so reference identity is stable
// across renders. Tray is hidden during beam runs (its parent does
// not render it when isExecuting), so it does not re-render at all
// during a beam tick — clause 4.1.5.
function PieceTrayComponent({
  trayPieceTypes,
  availableCounts,
  selectedPieceFromTray,
  costs,
  affordable,
  refs,
  onPickup,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
  disabled,
}: Props) {
  // D-08 — `costs` is kept on the Props interface for call-site
  // compatibility (RequisitionPanel is the buying screen and the
  // right home for price; the parent screen still computes per-piece
  // pricing for it elsewhere) but is no longer rendered here.
  void costs;
  const dragEnabled =
    !!onDragStart && !!onDragMove && !!onDragEnd && !!onDragCancel;

  // While a piece is being dragged out, the tray must stay STATIC — otherwise
  // the horizontal finger motion scrolls the ScrollView and the tray items
  // slide left/right following the drag (Tucker, 2026-06-15). Disabling
  // scrolling for the duration of the drag pins them in place.
  const [dragActive, setDragActive] = useState(false);

  return (
    <View style={styles.partsTray}>
      <ScrollView
        horizontal
        scrollEnabled={!dragActive}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.partsTrayInner}
      >
        {trayPieceTypes.map(pt => {
          const count = availableCounts[pt] || 0;
          const isActive = selectedPieceFromTray === pt;
          const color = getPieceColor(pt);
          // D-08: `costs` (CR price) is no longer displayed in the tray,
          // but `affordable`/canAfford still drives the icon dim state
          // so the player can see what they can't currently place.
          const canAfford = affordable[pt] ?? true;
          const measureRef = refs
            ? pt === 'conveyor' ? refs.trayConveyor
            : pt === 'gear' ? refs.trayGear
            : pt === 'configNode' ? refs.trayConfigNode
            : pt === 'splitter' ? refs.traySplitter
            : pt === 'scanner' ? refs.trayScanner
            : pt === 'transmitter' ? refs.trayTransmitter
            : undefined
            : undefined;
          const itemDisabled = !!disabled || count <= 0;
          const accessibilityLabel = `${PIECE_LABELS[pt]}, ${count} available`;
          const itemStyle = [
            styles.trayItem,
            isActive && { borderColor: color, backgroundColor: `${color}15` },
          ];
          // D-08 — price display removed from the in-level tray: it is
          // information the player cannot act on (the requisition
          // window is one-time, before the level starts) and it was
          // taking space from the icon at an unreadable 7pt. Price
          // belongs in RequisitionPanel, where the buying decision
          // actually happens. `cost`/`canAfford` stay computed above
          // for the icon dim-when-unaffordable treatment below.
          const innerContent = (
            <>
              <View style={{ opacity: count > 0 && canAfford ? 1 : 0.3 }}>
                <PieceIcon type={pt} size={32} color={color} />
              </View>
              <View style={[styles.trayBadge, { backgroundColor: count > 0 ? color : Colors.dim }]}>
                <Text style={styles.trayBadgeText}>{count}</Text>
              </View>
            </>
          );

          if (dragEnabled) {
            return (
              <TrayItemDraggable
                key={pt}
                pt={pt}
                measureRef={measureRef}
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
            <View key={pt} ref={measureRef} collapsable={false}>
              <TouchableOpacity
                style={itemStyle}
                onPress={() => {
                  if (itemDisabled) return;
                  onPickup(isActive ? null : pt);
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
    </View>
  );
}

// ── TrayItemDraggable ────────────────────────────────────────────────────
// Per-item touch wrapper used only when all four drag callbacks are
// provided. Implements the hold-to-drag pattern documented at the
// top of this file:
//   • 0–180 ms hold + release  → tap → onPickup(pt) (or null to deselect)
//   • >= 180 ms hold           → drag → onDragStart, onDragMove, onDragEnd
//   • interruption mid-drag    → onDragCancel
//
// PanResponder.create() is called once per mount and its callbacks
// reach the latest props via a single `propsRef` written in an effect.
// This avoids reconstructing the PanResponder on every render (which
// would race with active gestures) while keeping prop semantics live.
interface TrayItemDraggableProps {
  pt: PieceType;
  measureRef: React.Ref<View> | undefined;
  disabled: boolean;
  isActive: boolean;
  itemStyle: unknown;
  accessibilityLabel: string;
  onPickup: (type: PieceType | null) => void;
  onDragStart: (drag: DragState) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragCancel: () => void;
  // Notifies the tray to freeze/unfreeze ScrollView scrolling for the drag.
  onDragActiveChange: (active: boolean) => void;
  children: React.ReactNode;
}

function TrayItemDraggable({
  pt,
  measureRef,
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
    pt, disabled, isActive,
    onPickup, onDragStart, onDragMove, onDragEnd, onDragCancel, onDragActiveChange,
  });
  useEffect(() => {
    propsRef.current = {
      pt, disabled, isActive,
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
          const { pt: ptNow, onDragStart: ods, onDragActiveChange: dac } = propsRef.current;
          dac(true); // freeze the tray so it doesn't scroll under the drag
          ods({
            active: true,
            pieceId: ptNow,
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
        const { pt: ptNow, isActive: activeNow, onPickup: pickup } =
          propsRef.current;
        pickup(activeNow ? null : ptNow);
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
  trayBadgeText: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.void, fontWeight: 'bold',
  },
});
