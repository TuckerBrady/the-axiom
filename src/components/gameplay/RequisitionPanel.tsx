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
} from 'react-native';
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

const TAB_COLORS: Record<TabKey, string> = {
  PHYSICS:  '#F0B429',
  PROTOCOL: '#00D4FF',
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

function getPieceColor(type: PieceType): string {
  return PROTOCOL_PIECE_TYPES.includes(type) ? '#8B5CF6' : '#F0B429';
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
  isPreAssigned: boolean;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  budgetRemaining: number;
}

function PieceRow({ type, discipline, isPreAssigned, quantity, onIncrement, onDecrement, budgetRemaining }: PieceRowProps) {
  const base = PIECE_PRICES[type] ?? 0;
  const price = getRequisitionPrice(type, discipline);
  const discounted = hasRequisitionDiscount(type, discipline);
  const color = getPieceColor(type);
  const canIncrement = isPreAssigned ? false : budgetRemaining >= price;

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { borderColor: `${color}40` }]}>
        <PieceIcon type={type} size={22} color={color} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{PIECE_LABELS[type]}</Text>
        {isPreAssigned ? (
          <Text style={[styles.rowPrice, { color: Colors.green }]}>FREE</Text>
        ) : discounted ? (
          <View style={styles.rowPriceRow}>
            <Text style={styles.rowPriceStrike}>{base}</Text>
            <Text style={[styles.rowPrice, { color }]}>{price} CR</Text>
          </View>
        ) : (
          <Text style={styles.rowPrice}>{price} CR</Text>
        )}
      </View>
      {isPreAssigned ? (
        <View style={styles.rowPreAssignedBadge}>
          <Text style={styles.rowPreAssignedText}>INCLUDED</Text>
        </View>
      ) : (
        <View style={styles.rowControls}>
          <TouchableOpacity
            style={[styles.qtyBtn, quantity <= 0 && styles.qtyBtnDisabled]}
            onPress={onDecrement}
            disabled={quantity <= 0}
            accessibilityLabel={`Remove one ${PIECE_LABELS[type]}`}
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
      )}
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

  // ── Render tab content ──
  function renderTabContent() {
    if (activeTab === 'PHYSICS') {
      const pieces = PHYSICS_PIECE_TYPES;
      return pieces.map(type => {
        const isPreAssigned = preAssignedPieces.includes(type);
        return (
          <PieceRow
            key={type}
            type={type}
            discipline={discipline}
            isPreAssigned={isPreAssigned}
            quantity={getQuantityForPiece(type)}
            onIncrement={() => handleIncrement(type)}
            onDecrement={() => handleDecrement(type)}
            budgetRemaining={budgetRemaining}
          />
        );
      });
    }

    if (activeTab === 'PROTOCOL') {
      const pieces = PROTOCOL_PIECE_TYPES;
      return pieces.map(type => {
        const isPreAssigned = preAssignedPieces.includes(type);
        return (
          <PieceRow
            key={type}
            type={type}
            discipline={discipline}
            isPreAssigned={isPreAssigned}
            quantity={getQuantityForPiece(type)}
            onIncrement={() => handleIncrement(type)}
            onDecrement={() => handleDecrement(type)}
            budgetRemaining={budgetRemaining}
          />
        );
      });
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

  const tabColor = TAB_COLORS[activeTab];

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
            {orderedTabs.map(tab => (
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
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {renderTabContent()}
          </ScrollView>

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

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmBtn, { borderColor: tabColor }, (dismissing || (!canAffordRequisition && totalSpend > 0)) && styles.confirmBtnDisabled]}
            onPress={handleConfirmPress}
            disabled={dismissing || (!canAffordRequisition && totalSpend > 0)}
            activeOpacity={0.8}
            accessibilityLabel="Confirm requisition"
          >
            <Text style={[styles.confirmBtnText, { color: tabColor }]}>REQUISITION</Text>
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
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
  handleLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted,
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
  budgetLabel: { fontFamily: Fonts.spaceMono, fontSize: 7, color: Colors.muted, letterSpacing: 1 },
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
  tabLabel: {
    fontFamily: Fonts.spaceMono, fontSize: 9, letterSpacing: 1.2,
  },

  contentScroll: { maxHeight: 240 },
  contentInner: { paddingHorizontal: Spacing.lg, paddingVertical: 8, gap: 8 },

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
  rowPriceStrike: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted,
    textDecorationLine: 'line-through',
  },
  rowPrice: { fontFamily: Fonts.spaceMono, fontSize: 9, color: Colors.muted, marginTop: 2 },

  rowPreAssignedBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 4, borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.3)',
  },
  rowPreAssignedText: {
    fontFamily: Fonts.spaceMono, fontSize: 8,
    color: Colors.muted, letterSpacing: 0.5,
  },

  rowControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(74,158,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.3 },
  qtyBtnText: { fontFamily: Fonts.orbitron, fontSize: 14, color: Colors.starWhite, lineHeight: 16 },
  qtyValue: { fontFamily: Fonts.orbitron, fontSize: FontSizes.sm, color: Colors.starWhite, minWidth: 20, textAlign: 'center' },

  tapeTypeLabel: { fontFamily: Fonts.orbitron, fontSize: 8, color: '#8B5CF6', letterSpacing: 1 },
  tapeDesc: { fontFamily: Fonts.spaceMono, fontSize: 8, color: Colors.muted, marginTop: 2 },

  emptyTab: { paddingVertical: 24, alignItems: 'center' },
  emptyTabText: { fontFamily: Fonts.spaceMono, fontSize: 10, color: Colors.muted, textAlign: 'center' },

  warningRow: {
    paddingHorizontal: Spacing.lg, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: 'rgba(255,68,68,0.15)',
  },
  warningText: {
    fontFamily: Fonts.spaceMono, fontSize: 9,
    color: '#FF4444', textAlign: 'center', letterSpacing: 0.5,
  },

  insufficientText: {
    fontFamily: Fonts.spaceMono, fontSize: 9, color: '#FF4444',
    textAlign: 'center', paddingBottom: 4,
  },

  confirmBtn: {
    marginHorizontal: Spacing.lg,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: {
    fontFamily: Fonts.orbitron, fontSize: FontSizes.md,
    letterSpacing: 2,
  },
});
