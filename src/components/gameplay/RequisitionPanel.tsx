import React, { useCallback, useRef, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { PieceIcon } from '../PieceIcon';
import type { PieceType } from '../../game/types';
import type { Discipline } from '../../store/playerStore';
import {
  PIECE_PRICES,
  PHYSICS_PIECE_TYPES,
  PROTOCOL_PIECE_TYPES,
  getRequisitionPrice,
  hasRequisitionDiscount,
  NIBBLE_PRICE,
  CELLS_PER_NIBBLE,
} from '../../game/piecePrices';
import { useRequisitionStore, type TapeType } from '../../store/requisitionStore';
import { Colors, Fonts, FontSizes, Spacing } from '../../theme/tokens';

// ─── Tab configuration ────────────────────────────────────────────────────────

type TabKey = 'PHYSICS' | 'PROTOCOL' | 'DATA' | 'INFRA';

// REQ-G-03 (Handoff 003) / DEC-2 (ratified 2026-09-10): PHYSICS and
// PROTOCOL take their static Request-001 identity colors (copper / circuit),
// not the Physics/Protocol beam colors — this was held pending DEC-2 and is
// now cleared. DATA/INFRA are unaffected (not beam colors to begin with).
const TAB_COLORS: Record<TabKey, string> = {
  PHYSICS:  Colors.copper,
  PROTOCOL: Colors.circuit,
  DATA:     '#8B5CF6',
  INFRA:    '#8B5CF6',
};

const ALL_TABS: TabKey[] = ['PHYSICS', 'PROTOCOL', 'DATA', 'INFRA'];

function getDisciplineTab(discipline: Discipline): TabKey {
  if (discipline === 'systems') return 'PROTOCOL';
  return 'PHYSICS';
}

function getOrderedTabs(discipline: Discipline): TabKey[] {
  const primary = getDisciplineTab(discipline);
  return [primary, ...ALL_TABS.filter(t => t !== primary)];
}

const PIECE_LABELS: Record<PieceType, string> = {
  source: 'Source', terminal: 'Terminal',
  conveyor: 'Conveyor', gear: 'Gear', splitter: 'Splitter',
  merger: 'Merger', bridge: 'Bridge',
  configNode: 'Config Node', scanner: 'Scanner', transmitter: 'Transmitter',
  inverter: 'Inverter', counter: 'Counter', latch: 'Latch',
  obstacle: 'Obstacle',
};

// Mirrors BoardGrid.getPieceColor so a piece's icon in the store matches
// exactly how it renders once placed on the board: Protocol pieces purple,
// Physics pieces the canonical blue (NOT the amber PHYSICS beam/tab accent).
function getPieceColor(type: PieceType): string {
  return PROTOCOL_PIECE_TYPES.includes(type) ? '#8B5CF6' : Colors.blue;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  discipline: Discipline;
  creditBalance: number;
  preAssignedPieces: PieceType[];
  purchasableTapes: ('TRAIL' | 'OUT')[];
  freeTapes: ('IN' | 'TRAIL' | 'OUT')[];
  onConfirm: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PieceRowProps {
  type: PieceType;
  discipline: Discipline;
  // How many of this type the level includes for free (0 = purchase-only).
  includedCount: number;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  budgetRemaining: number;
}

function PieceRow({ type, discipline, includedCount, quantity, onIncrement, onDecrement, budgetRemaining }: PieceRowProps) {
  const base = PIECE_PRICES[type] ?? 0;
  const price = getRequisitionPrice(type, discipline);
  const discounted = hasRequisitionDiscount(type, discipline);
  const color = getPieceColor(type);
  const isPreAssigned = includedCount > 0;
  // Total the Engineer will carry into the level: free base + requisitioned.
  // This is what "I have to work with" means at planning time.
  const inTray = includedCount + quantity;
  // Included pieces are free at their base count but may still be requisitioned
  // in additional copies — the budget is the only gate now (soul of the game:
  // spend credits to build a bigger machine with the core pieces).
  const canIncrement = budgetRemaining >= price;

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { borderColor: `${color}40` }]}>
        {/* REQ-G-17: 22 -> 32pt, matching the tray icon size per D-08. */}
        <PieceIcon type={type} size={32} color={color} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{PIECE_LABELS[type]}</Text>
        {isPreAssigned ? (
          <View style={styles.rowPriceRow}>
            <Text style={[styles.rowPrice, { color: Colors.green, marginTop: 0 }]}>INCLUDED x{includedCount}</Text>
            <Text style={styles.rowPrice}>{price} CR each</Text>
          </View>
        ) : discounted ? (
          <View style={styles.rowPriceRow}>
            <Text style={styles.rowPriceStrike}>{base}</Text>
            <Text style={[styles.rowPrice, { color }]}>{price} CR</Text>
          </View>
        ) : (
          <Text style={styles.rowPrice}>{price} CR</Text>
        )}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.trayCount}>
          IN TRAY <Text style={[styles.trayCountValue, { color }]}>{inTray}</Text>
        </Text>
        <View style={styles.rowControls}>
          <TouchableOpacity
            style={[styles.qtyBtn, quantity <= 0 && styles.qtyBtnDisabled]}
            onPress={onDecrement}
            disabled={quantity <= 0}
            accessibilityLabel={`Remove one purchased ${PIECE_LABELS[type]}`}
          >
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{quantity}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, !canIncrement && styles.qtyBtnDisabled]}
            onPress={onIncrement}
            disabled={!canIncrement}
            accessibilityLabel={`Add one ${PIECE_LABELS[type]}`}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

interface TapeRowProps {
  tapeType: TapeType;
  nibbles: number;
  onIncrement: () => void;
  onDecrement: () => void;
  budgetRemaining: number;
}

const TAPE_DESCRIPTIONS: Record<TapeType, string> = {
  TRAIL: 'Working memory — persists between pulses',
  OUT: 'Records machine output',
};

function TapeRow({ tapeType, nibbles, onIncrement, onDecrement, budgetRemaining }: TapeRowProps) {
  const canIncrement = budgetRemaining >= NIBBLE_PRICE;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { borderColor: 'rgba(139,92,246,0.4)' }]}>
        <Text style={styles.tapeTypeLabel}>{tapeType}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{tapeType} TAPE</Text>
        <Text style={styles.tapeDesc}>{TAPE_DESCRIPTIONS[tapeType]}</Text>
        <Text style={styles.rowPrice}>{NIBBLE_PRICE} CR / nibble  ({nibbles * CELLS_PER_NIBBLE} cells)</Text>
      </View>
      <View style={styles.rowControls}>
        <TouchableOpacity
          style={[styles.qtyBtn, nibbles <= 0 && styles.qtyBtnDisabled]}
          onPress={onDecrement}
          disabled={nibbles <= 0}
          accessibilityLabel={`Remove one ${tapeType} nibble`}
        >
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{nibbles}</Text>
        <TouchableOpacity
          style={[styles.qtyBtn, !canIncrement && styles.qtyBtnDisabled]}
          onPress={onIncrement}
          disabled={!canIncrement}
          accessibilityLabel={`Add one ${tapeType} nibble`}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RequisitionPanel({
  discipline,
  creditBalance,
  preAssignedPieces,
  purchasableTapes,
  freeTapes,
  onConfirm,
}: Props) {
  const orderedTabs = getOrderedTabs(discipline);
  const [activeTab, setActiveTab] = useState<TabKey>(orderedTabs[0]);
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const slideOutAnim = useRef(new Animated.Value(0)).current;

  const {
    requisition,
    setPurchaseQuantity,
    setPurchaseNibbles,
    getBudgetRemaining,
    canAffordMore,
  } = useRequisitionStore();

  // Discovery-gated purchasable types (computed in the store at initRequisition).
  // The panel only offers from this set — undiscovered pieces never appear.
  const purchasableTypes = useRequisitionStore(s => s._availablePieceTypes);

  const budgetRemaining = getBudgetRemaining();
  const { totalSpend, creditBudget } = requisition;
  const canAffordRequisition = creditBalance >= totalSpend;

  // ── Swipe gesture for expand/collapse ──
  const panY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
      onPanResponderMove: (_, gs) => {
        if (!expanded && gs.dy < 0) panY.setValue(gs.dy);
        if (expanded && gs.dy > 0) panY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        panY.setValue(0);
        if (!expanded && gs.dy < -40) setExpanded(true);
        if (expanded && gs.dy > 40) setExpanded(false);
      },
    }),
  ).current;

  const getQuantityForPiece = useCallback((type: PieceType): number => {
    const p = requisition.purchases.find(x => x.type === type);
    return p?.quantity ?? 0;
  }, [requisition.purchases]);

  // How many of this type the level hands over for free (one per matching entry
  // in availablePieces). Drives the INCLUDED xN tag and the IN TRAY total.
  const countIncluded = useCallback(
    (type: PieceType): number => preAssignedPieces.filter(t => t === type).length,
    [preAssignedPieces],
  );

  const getNibblesForTape = useCallback((tapeType: TapeType): number => {
    const key = tapeType === 'TRAIL' ? 'TRAIL_TAPE' : 'OUT_TAPE';
    const p = requisition.purchases.find(x => x.type === key);
    return p?.quantity ?? 0;
  }, [requisition.purchases]);

  const handleIncrement = useCallback((type: PieceType) => {
    const price = getRequisitionPrice(type, discipline);
    if (!canAffordMore(price)) return;
    setPurchaseQuantity(type, getQuantityForPiece(type) + 1);
  }, [discipline, canAffordMore, setPurchaseQuantity, getQuantityForPiece]);

  const handleDecrement = useCallback((type: PieceType) => {
    const qty = getQuantityForPiece(type);
    if (qty <= 0) return;
    setPurchaseQuantity(type, qty - 1);
  }, [setPurchaseQuantity, getQuantityForPiece]);

  const handleNibbleIncrement = useCallback((tapeType: TapeType) => {
    if (!canAffordMore(NIBBLE_PRICE)) return;
    setPurchaseNibbles(tapeType, getNibblesForTape(tapeType) + 1);
  }, [canAffordMore, setPurchaseNibbles, getNibblesForTape]);

  const handleNibbleDecrement = useCallback((tapeType: TapeType) => {
    const nibbles = getNibblesForTape(tapeType);
    if (nibbles <= 0) return;
    setPurchaseNibbles(tapeType, nibbles - 1);
  }, [setPurchaseNibbles, getNibblesForTape]);

  const handleConfirmPress = useCallback(() => {
    if (dismissing) return;
    setDismissing(true);
    Animated.timing(slideOutAnim, {
      toValue: 600,
      duration: 600,
      easing: Easing.bezier(0.4, 0, 1, 0.6),
      useNativeDriver: false,
    }).start(() => onConfirm());
  }, [dismissing, slideOutAnim, onConfirm]);

  // Rows for a category = level's pre-assigned pieces (INCLUDED) plus
  // discovery-gated purchasable types. Undiscovered pieces never appear.
  function categoryRows(categoryTypes: PieceType[]): PieceType[] {
    const preAssigned = categoryTypes.filter(t => preAssignedPieces.includes(t));
    const purchasable = categoryTypes.filter(
      t => purchasableTypes.includes(t) && !preAssignedPieces.includes(t),
    );
    return [...preAssigned, ...purchasable];
  }

  // REQ-G-17 (Handoff 003): a per-tab item count, so the catalogue's
  // length is legible from the tab bar itself rather than only discoverable
  // by scrolling in. Presentation only — does not affect what's purchasable.
  function getTabItemCount(tab: TabKey): number {
    if (tab === 'PHYSICS') return categoryRows(PHYSICS_PIECE_TYPES).length;
    if (tab === 'PROTOCOL') return categoryRows(PROTOCOL_PIECE_TYPES).length;
    if (tab === 'DATA') return purchasableTapes.filter(t => !freeTapes.includes(t)).length;
    return 0;
  }

  // ── Render tab content ──
  function renderTabContent() {
    if (activeTab === 'PHYSICS' || activeTab === 'PROTOCOL') {
      const allOfCategory = activeTab === 'PHYSICS' ? PHYSICS_PIECE_TYPES : PROTOCOL_PIECE_TYPES;
      const rows = categoryRows(allOfCategory);
      if (rows.length === 0) {
        return (
          <View style={styles.emptyTab}>
            <Text style={styles.emptyTabText}>
              No {activeTab === 'PHYSICS' ? 'Physics' : 'Protocol'} pieces catalogued yet.
            </Text>
          </View>
        );
      }
      return rows.map(type => (
        <PieceRow
          key={type}
          type={type}
          discipline={discipline}
          includedCount={countIncluded(type)}
          quantity={getQuantityForPiece(type)}
          onIncrement={() => handleIncrement(type)}
          onDecrement={() => handleDecrement(type)}
          budgetRemaining={budgetRemaining}
        />
      ));
    }

    if (activeTab === 'DATA') {
      const availableTapes = purchasableTapes.filter(t => !freeTapes.includes(t));
      if (availableTapes.length === 0) {
        return (
          <View style={styles.emptyTab}>
            <Text style={styles.emptyTabText}>No tape infrastructure available for purchase.</Text>
          </View>
        );
      }
      return availableTapes.map(tapeType => (
        <TapeRow
          key={tapeType}
          tapeType={tapeType}
          nibbles={getNibblesForTape(tapeType)}
          onIncrement={() => handleNibbleIncrement(tapeType)}
          onDecrement={() => handleNibbleDecrement(tapeType)}
          budgetRemaining={budgetRemaining}
        />
      ));
    }

    if (activeTab === 'INFRA') {
      return (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabText}>Additional infrastructure — coming in future sectors.</Text>
        </View>
      );
    }

    return null;
  }

  // REQ-G-17: maxHeight derives from available screen height instead of a
  // fixed 240pt, which showed ~5 rows regardless of device size and hid
  // the sixth-plus row behind a blind drag with no indicator or count.
  const contentMaxHeight = Math.round(Dimensions.get('window').height * 0.32);

  return (
    <Animated.View style={[styles.root, { transform: [{ translateY: slideOutAnim }] }]}>
      {/* Drag handle */}
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.handleBtn} activeOpacity={0.7}>
          <View style={styles.handle} />
          <Text style={styles.handleLabel}>{expanded ? 'REQUISITION STORE ↓' : 'REQUISITION STORE ↑'}</Text>
        </TouchableOpacity>
      </View>

      {/* Budget summary — always visible */}
      <View style={styles.budgetBar}>
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>BUDGET</Text>
          <Text style={styles.budgetValue}>{creditBudget} CR</Text>
        </View>
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>SPENT</Text>
          <Text style={[styles.budgetValue, totalSpend > 0 && styles.budgetSpent]}>{totalSpend} CR</Text>
        </View>
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>REMAINING</Text>
          <Text style={[styles.budgetValue, budgetRemaining === 0 && styles.budgetExhausted]}>{budgetRemaining} CR</Text>
        </View>
      </View>

      {expanded && (
        <>
          {/* Tab bar */}
          <View style={styles.tabBar}>
            {orderedTabs.map(tab => {
              const count = getTabItemCount(tab);
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    { borderBottomColor: TAB_COLORS[tab] },
                    activeTab === tab && { backgroundColor: `${TAB_COLORS[tab]}18` },
                  ]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabLabel,
                    { color: activeTab === tab ? TAB_COLORS[tab] : Colors.muted },
                  ]}>
                    {tab}{count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab content */}
          <View style={styles.contentWrap}>
            <ScrollView
              style={[styles.contentScroll, { maxHeight: contentMaxHeight }]}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator
            >
              {renderTabContent()}
            </ScrollView>
            {/* REQ-G-17: bottom fade signals there's more to scroll to,
                alongside the restored indicator and the tab-bar count. */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(6,10,20,0)', 'rgba(6,10,20,0.96)']}
              style={styles.contentFade}
            />
          </View>

          {/* Fixed footer — never shrinks. On a compact screen the list
              above gives up height instead, so the confirm control can
              never be pushed below the bottom edge. */}
          <View style={styles.footer}>
            {/* Warning text */}
            <View style={styles.warningRow}>
              <Text style={styles.warningText}>
                This store closes after confirmation. Requisition carefully.
              </Text>
            </View>

            {/* Insufficient credits message */}
            {!canAffordRequisition && totalSpend > 0 && (
              <Text style={styles.insufficientText}>
                Insufficient credits to cover selection.
              </Text>
            )}

            {/* Confirm button — REQ-G-03: one fixed accent, not tabColor.
                The primary CTA changing color with the selected tab read as
                the confirm action itself being Physics- or Protocol-flavored,
                which it isn't; matches the game's other primary-confirm CTA
                (Button variant="gradient") copper/amber accent. */}
            <TouchableOpacity
              style={[styles.confirmBtn, (dismissing || (!canAffordRequisition && totalSpend > 0)) && styles.confirmBtnDisabled]}
              onPress={handleConfirmPress}
              disabled={dismissing || (!canAffordRequisition && totalSpend > 0)}
              activeOpacity={0.8}
              accessibilityLabel="Confirm requisition"
            >
              <Text style={styles.confirmBtnText}>REQUISITION</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // flexShrink: the drawer sits in GameplayScreen's column under HUDChrome
  // and the tape display, above the ENGAGE row. Without it, its natural
  // height overflowed a 640dp screen and put the confirm button off the
  // bottom edge (the canvas, flex:1, had already shrunk to nothing).
  root: {
    flexShrink: 1,
    backgroundColor: 'rgba(6,10,20,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74,158,255,0.15)',
  },

  handleArea: { alignItems: 'center', paddingTop: 6 },
  handleBtn: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 24 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(74,158,255,0.3)',
    marginBottom: 4,
  },
  // REQ-G-10: 9 -> FontSizes.floor.
  handleLabel: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted,
    letterSpacing: 1.5,
  },

  budgetBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.08)',
  },
  budgetItem: { flex: 1, alignItems: 'center' },
  // REQ-G-10: 7 -> FontSizes.floor.
  budgetLabel: { fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted, letterSpacing: 1 },
  budgetValue: { fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, color: Colors.starWhite, marginTop: 2 },
  budgetSpent: { color: '#F0B429' },
  budgetExhausted: { color: '#FF4444' },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  // REQ-G-10: 9 -> FontSizes.floor.
  tabLabel: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, letterSpacing: 1.2,
  },

  // REQ-G-17: contentScroll's maxHeight is now set inline per-render from
  // contentMaxHeight (derived from screen height); the static entry here
  // no longer carries one.
  // The list is the one part of the drawer that gives up height when the
  // column is short; contentMaxHeight caps it when there is room to spare.
  contentWrap: { position: 'relative', flexShrink: 1 },
  footer: { flexShrink: 0 },
  contentScroll: {},
  contentInner: { paddingHorizontal: Spacing.lg, paddingVertical: 8, gap: 8 },
  // Bottom fade signaling more content below (REQ-G-17).
  contentFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.06)',
    gap: 10,
  },
  rowIcon: {
    width: 40, height: 40,
    borderWidth: 1, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(8,14,28,0.8)',
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontFamily: Fonts.exo2, fontSize: FontSizes.sm, color: Colors.starWhite },
  rowPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  // REQ-G-17: price and stock text raised to the 11pt floor (was 9pt) —
  // the numbers the purchase decision is made from. The broader 11pt-floor
  // sweep across the rest of this file is REQ-G-10 (Wave 3), out of scope
  // here.
  rowPriceStrike: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted,
    textDecorationLine: 'line-through',
  },
  rowPrice: { fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted, marginTop: 2 },

  rowRight: { alignItems: 'flex-end', gap: 4 },
  // REQ-G-10: 8 -> FontSizes.floor.
  trayCount: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted, letterSpacing: 0.5,
  },
  trayCountValue: { fontFamily: Fonts.orbitron, fontSize: 11 },

  rowControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // REQ-G-17: 28x28 -> 44x44 — the plus/minus pressed repeatedly during
  // requisition (see also REQ-G-10, which sweeps the rest of the file's
  // touch targets in Wave 3).
  qtyBtn: {
    width: 44, height: 44, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(74,158,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.3 },
  qtyBtnText: { fontFamily: Fonts.orbitron, fontSize: 14, color: Colors.starWhite, lineHeight: 16 },
  qtyValue: { fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, color: Colors.starWhite, minWidth: 20, textAlign: 'center' },

  // REQ-G-10: 8 -> FontSizes.floor (both).
  tapeTypeLabel: { fontFamily: Fonts.orbitron, fontSize: FontSizes.floor, color: '#8B5CF6', letterSpacing: 1 },
  tapeDesc: { fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted, marginTop: 2 },

  emptyTab: { paddingVertical: 24, alignItems: 'center' },
  // REQ-G-10: 10 -> FontSizes.floor.
  emptyTabText: { fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: Colors.muted, textAlign: 'center' },

  warningRow: {
    paddingHorizontal: Spacing.lg, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: 'rgba(255,68,68,0.15)',
  },
  // REQ-G-10: 9 -> FontSizes.floor (both).
  warningText: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor,
    color: '#FF4444', textAlign: 'center', letterSpacing: 0.5,
  },

  insufficientText: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, color: '#FF4444',
    textAlign: 'center', paddingBottom: 4,
  },

  confirmBtn: {
    marginHorizontal: Spacing.lg,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 8, borderWidth: 1,
    borderColor: Colors.copper,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md,
    letterSpacing: 2,
    color: Colors.amber,
  },
});
