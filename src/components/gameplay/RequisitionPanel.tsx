import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  REQ_SLIDE_DISTANCE,
  REQ_SLIDE_MS,
  REQ_SLIDE_IN_BEZIER,
  REQ_SLIDE_OUT_BEZIER,
  REQ_SWIPE_START,
  resolveReqSwipe,
} from './requisitionSlide';
import { REQ_TAB_LETTER_SPACING, REQ_TAB_PAD_X } from './requisitionTabs';

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
        <Text style={styles.tapeTypeLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {tapeType}
        </Text>
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
  // P3-2: starts off-screen at REQ_SLIDE_DISTANCE and eases to 0 on mount.
  // This is the SAME Animated.Value the confirm slide-out (P3-4) later
  // drives back to REQ_SLIDE_DISTANCE — one translate value, one root host.
  const slideOutAnim = useRef(new Animated.Value(REQ_SLIDE_DISTANCE)).current;

  // P3-3: the body (tab bar, content, footer) stays mounted always; its
  // maxHeight animates between 0 and its measured open height instead of
  // the body itself being conditionally rendered (REQ-A-2).
  //
  // AXM-036 hotfix 2. Three rules, each from the build-51 smoke:
  // - The body's inner column shrinks with the body (flexShrink), so on a
  //   short column the list gives up height and the footer stays on screen.
  //   #78's measuring wrapper did not shrink, so the body clipped the footer.
  // - The list region has one fixed height on every tab (contentMaxHeight),
  //   so the column's natural height IS the open height, and a tab switch
  //   never resizes the panel.
  // - The column is measured ONCE, while the body is out of the column's
  //   flow (absolute, invisible, non-interactive). It cannot be measured
  //   inside a maxHeight-0 body: Yoga lays its children out against the
  //   0 bound and reports them at 0 (seen on device: tab bar 1, footer 0).
  //   Measuring out of flow also means the board never resizes for it.
  //   After that the value is kept: a taller footer (the insufficient-
  //   credits line) is absorbed by the list, never by clipping the footer.
  const [bodyMeasuredHeight, setBodyMeasuredHeight] = useState<number | null>(null);
  const bodyHeightAnim = useRef(new Animated.Value(0)).current;

  const handleBodyLayout = useCallback((e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setBodyMeasuredHeight(prev => prev ?? h);
  }, []);

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
  // SWEEP-B51 S8: the responder is created once, so it reads `expanded`
  // through a ref kept current on every render. (It used to close over the
  // first render's `expanded`, so a down swipe never collapsed the panel.)
  // Its handlers sit on the handle area and the budget bar.
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const claimVerticalSwipe = (_: unknown, gs: { dx: number; dy: number }) =>
    Math.abs(gs.dy) > REQ_SWIPE_START && Math.abs(gs.dy) > Math.abs(gs.dx);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: claimVerticalSwipe,
      onMoveShouldSetPanResponderCapture: claimVerticalSwipe,
      onPanResponderRelease: (_, gs) => {
        const next = resolveReqSwipe(expandedRef.current, gs.dy);
        if (next !== null) setExpanded(next);
      },
    }),
  ).current;

  // P3-2: entrance animation. Runs once on mount, driving the same
  // slideOutAnim value the confirm handler later reverses.
  useEffect(() => {
    Animated.timing(slideOutAnim, {
      toValue: 0,
      duration: REQ_SLIDE_MS,
      easing: Easing.bezier(...REQ_SLIDE_IN_BEZIER),
      useNativeDriver: false,
    }).start();
    // Mount-only: slideOutAnim is a ref and stable across renders.
  }, []);

  // REQ-G-17: the list's height derives from available screen height
  // instead of a fixed 240pt, which showed ~5 rows regardless of device
  // size and hid the sixth-plus row behind a blind drag with no indicator
  // or count. AXM-036 hotfix 2: it is the list's height on every tab.
  const contentMaxHeight = Math.round(Dimensions.get('window').height * 0.32);

  // P3-3: expand slides the body up (IN curve), collapse slides it down
  // (OUT curve). Both take REQ_SLIDE_MS and run against maxHeight, never
  // height. Nothing to animate until the body has measured itself once.
  useEffect(() => {
    if (bodyMeasuredHeight == null) return;
    Animated.timing(bodyHeightAnim, {
      toValue: expanded ? bodyMeasuredHeight : 0,
      duration: REQ_SLIDE_MS,
      easing: Easing.bezier(...(expanded ? REQ_SLIDE_IN_BEZIER : REQ_SLIDE_OUT_BEZIER)),
      useNativeDriver: false,
    }).start();
  }, [expanded, bodyMeasuredHeight, bodyHeightAnim]);

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
      toValue: REQ_SLIDE_DISTANCE,
      duration: REQ_SLIDE_MS,
      easing: Easing.bezier(...REQ_SLIDE_OUT_BEZIER),
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

  return (
    <Animated.View style={[styles.root, { transform: [{ translateY: slideOutAnim }] }]}>
      {/* Drag handle */}
      <View style={styles.handleArea} {...panResponder.panHandlers}>
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.handleBtn} activeOpacity={0.7}>
          <View style={styles.handle} />
          <Text style={styles.handleLabel}>{expanded ? 'REQUISITION STORE ↓' : 'REQUISITION STORE ↑'}</Text>
        </TouchableOpacity>
      </View>

      {/* Budget summary — always visible. Also a swipe surface (S8-2). */}
      <View style={styles.budgetBar} {...panResponder.panHandlers}>
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

      {/* P3-3: the body stays mounted always (REQ-A-2) — expand/collapse
          animates this host's maxHeight (never height) between 0 and its
          measured natural height, never swaps it out of the tree. While
          collapsed it is non-interactive and hidden from accessibility. */}
      <Animated.View
        style={[
          styles.body,
          bodyMeasuredHeight == null ? styles.bodyMeasuring : { maxHeight: bodyHeightAnim },
        ]}
        pointerEvents={expanded && bodyMeasuredHeight != null ? 'auto' : 'none'}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!expanded}
      >
        <View style={styles.bodyColumn} onLayout={handleBodyLayout}>
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
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: activeTab === tab ? TAB_COLORS[tab] : Colors.muted },
                    ]}
                    numberOfLines={1}
                  >
                    {tab}{count > 0 ? ` (${count})` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab content */}
          <View style={[styles.contentWrap, { height: contentMaxHeight }]}>
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
        </View>
      </Animated.View>
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

  // P3-3: the always-mounted expand/collapse host. flexShrink matches
  // root/contentWrap so a compact screen still gives this element up
  // before the footer. overflow hidden clips the body while its
  // maxHeight animates toward 0; no fixed height is set here or on any
  // ancestor of the footer.
  body: { flexShrink: 1, minHeight: 0, overflow: 'hidden' },
  // AXM-036 hotfix 2: first layout only. Out of the column's flow and
  // invisible, so the body column reports its natural (open) height and
  // the board does not resize for it. No maxHeight here on purpose.
  bodyMeasuring: { position: 'absolute', left: 0, right: 0, opacity: 0 },
  // AXM-036 hotfix 2: the body's one child. It must shrink with the body,
  // or the shrink chain from root to list breaks and the body clips the
  // footer instead (the build-51 FAIL).
  bodyColumn: { flexShrink: 1, minHeight: 0 },

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
    flexShrink: 0,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74,158,255,0.08)',
  },
  // SWEEP-B51 H1-2: tabs size to their labels (spare width shared after),
  // so every label fits at the 11px floor with no auto-shrink.
  tab: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 'auto',
    paddingHorizontal: REQ_TAB_PAD_X,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  // REQ-G-10: 9 -> FontSizes.floor.
  tabLabel: {
    fontFamily: Fonts.spaceMono, fontSize: FontSizes.floor, letterSpacing: REQ_TAB_LETTER_SPACING,
  },

  // REQ-G-17: contentScroll's maxHeight is set inline per-render from
  // contentMaxHeight (derived from screen height).
  // AXM-036 hotfix 2: contentWrap's height is set inline to the same
  // contentMaxHeight, on every tab. The list is the one part of the drawer
  // that gives up height when the column is short: it shrinks (to 0 if it
  // must) and the scroll view fills whatever it keeps.
  contentWrap: { position: 'relative', flexShrink: 1, minHeight: 0 },
  footer: { flexShrink: 0 },
  contentScroll: { flex: 1 },
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
