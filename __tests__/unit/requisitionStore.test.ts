import { useRequisitionStore, buildInventoryForLevel } from '../../src/store/requisitionStore';
import type { LevelDefinition } from '../../src/game/types';
import { NIBBLE_PRICE } from '../../src/game/piecePrices';

// Minimal LevelDefinition for testing
function makeLevel(overrides: Partial<LevelDefinition> = {}): LevelDefinition {
  return {
    id: 'K1-1',
    name: 'Test Level',
    sector: 'kepler',
    description: 'Test',
    cogsLine: 'Test',
    gridWidth: 5,
    gridHeight: 5,
    prePlacedPieces: [],
    availablePieces: ['conveyor', 'gear'],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [{ type: 'reach_output' }],
    optimalPieces: 2,
    creditBudget: 100,
    purchasableTapes: ['TRAIL', 'OUT'],
    freeTapes: ['IN'],
    ...overrides,
  } as LevelDefinition;
}

beforeEach(() => {
  useRequisitionStore.setState({
    phase: 'requisition',
    requisition: { purchases: [], totalSpend: 0, creditBudget: 0, confirmed: false },
    inventory: { pieces: [], tapes: { in: true, trail: false, out: false } },
    selectedInventoryId: null,
    _availablePieceTypes: [],
    _discipline: null,
  });
});

describe('useRequisitionStore — initRequisition', () => {
  it('sets phase to requisition when creditBudget > 0', () => {
    const level = makeLevel({ creditBudget: 100 });
    useRequisitionStore.getState().initRequisition(level, 'drive');
    expect(useRequisitionStore.getState().phase).toBe('requisition');
  });

  it('sets phase to placement when creditBudget = 0', () => {
    const level = makeLevel({ creditBudget: 0 });
    useRequisitionStore.getState().initRequisition(level, 'drive');
    expect(useRequisitionStore.getState().phase).toBe('placement');
  });

  it('stores creditBudget in requisition state', () => {
    const level = makeLevel({ creditBudget: 80 });
    useRequisitionStore.getState().initRequisition(level, 'systems');
    expect(useRequisitionStore.getState().requisition.creditBudget).toBe(80);
  });

  it('resets purchases on init', () => {
    const level = makeLevel({ creditBudget: 100 });
    const store = useRequisitionStore.getState();
    store.setPurchaseQuantity('conveyor', 3);
    store.initRequisition(level, 'drive');
    expect(useRequisitionStore.getState().requisition.purchases).toHaveLength(0);
    expect(useRequisitionStore.getState().requisition.totalSpend).toBe(0);
  });
});

describe('useRequisitionStore — setPurchaseQuantity', () => {
  it('adds a purchase entry', () => {
    useRequisitionStore.getState().initRequisition(makeLevel(), 'drive');
    useRequisitionStore.getState().setPurchaseQuantity('conveyor', 2);
    const { purchases, totalSpend } = useRequisitionStore.getState().requisition;
    expect(purchases).toHaveLength(1);
    expect(purchases[0].type).toBe('conveyor');
    expect(purchases[0].quantity).toBe(2);
    // drive discount: conveyor 10 * 0.8 = 8 * 2 = 16
    expect(totalSpend).toBe(16);
  });

  it('removes purchase when quantity set to 0', () => {
    useRequisitionStore.getState().initRequisition(makeLevel(), 'drive');
    useRequisitionStore.getState().setPurchaseQuantity('conveyor', 2);
    useRequisitionStore.getState().setPurchaseQuantity('conveyor', 0);
    expect(useRequisitionStore.getState().requisition.purchases).toHaveLength(0);
    expect(useRequisitionStore.getState().requisition.totalSpend).toBe(0);
  });

  it('updates quantity correctly on second call', () => {
    useRequisitionStore.getState().initRequisition(makeLevel(), null);
    useRequisitionStore.getState().setPurchaseQuantity('gear', 1);
    useRequisitionStore.getState().setPurchaseQuantity('gear', 3);
    const { purchases } = useRequisitionStore.getState().requisition;
    expect(purchases).toHaveLength(1);
    expect(purchases[0].quantity).toBe(3);
    // gear base: 10 * 3 = 30
    expect(useRequisitionStore.getState().requisition.totalSpend).toBe(30);
  });
});

describe('useRequisitionStore — setPurchaseNibbles', () => {
  it('adds a tape purchase', () => {
    useRequisitionStore.getState().initRequisition(makeLevel(), null);
    useRequisitionStore.getState().setPurchaseNibbles('TRAIL', 2);
    const { purchases, totalSpend } = useRequisitionStore.getState().requisition;
    const tapePurchase = purchases.find(p => p.type === 'TRAIL_TAPE');
    expect(tapePurchase).toBeDefined();
    expect(tapePurchase!.quantity).toBe(2);
    expect(tapePurchase!.unitPrice).toBe(NIBBLE_PRICE);
    expect(totalSpend).toBe(NIBBLE_PRICE * 2);
  });

  it('removes tape purchase when nibbles set to 0', () => {
    useRequisitionStore.getState().initRequisition(makeLevel(), null);
    useRequisitionStore.getState().setPurchaseNibbles('OUT', 3);
    useRequisitionStore.getState().setPurchaseNibbles('OUT', 0);
    const { purchases } = useRequisitionStore.getState().requisition;
    expect(purchases.find(p => p.type === 'OUT_TAPE')).toBeUndefined();
  });
});

describe('useRequisitionStore — budget helpers', () => {
  it('getBudgetRemaining returns creditBudget minus totalSpend', () => {
    useRequisitionStore.getState().initRequisition(makeLevel({ creditBudget: 100 }), null);
    useRequisitionStore.getState().setPurchaseQuantity('conveyor', 2); // 20 CR
    expect(useRequisitionStore.getState().getBudgetRemaining()).toBe(80);
  });

  it('canAffordMore returns false when budget is exhausted', () => {
    useRequisitionStore.getState().initRequisition(makeLevel({ creditBudget: 10 }), null);
    useRequisitionStore.getState().setPurchaseQuantity('conveyor', 1); // 10 CR
    expect(useRequisitionStore.getState().getBudgetRemaining()).toBe(0);
    expect(useRequisitionStore.getState().canAffordMore(1)).toBe(false);
  });
});

describe('useRequisitionStore — confirmRequisition', () => {
  it('marks confirmed and calls spendCredits', () => {
    useRequisitionStore.getState().initRequisition(makeLevel({ creditBudget: 100 }), null);
    useRequisitionStore.getState().setPurchaseQuantity('gear', 2); // 20 CR
    const mockSpend = jest.fn().mockReturnValue(true);
    const ok = useRequisitionStore.getState().confirmRequisition(mockSpend);
    expect(ok).toBe(true);
    expect(mockSpend).toHaveBeenCalledWith(20);
    expect(useRequisitionStore.getState().requisition.confirmed).toBe(true);
  });

  it('returns false and does not confirm if spendCredits fails', () => {
    useRequisitionStore.getState().initRequisition(makeLevel({ creditBudget: 100 }), null);
    useRequisitionStore.getState().setPurchaseQuantity('gear', 2);
    const mockSpend = jest.fn().mockReturnValue(false);
    const ok = useRequisitionStore.getState().confirmRequisition(mockSpend);
    expect(ok).toBe(false);
    expect(useRequisitionStore.getState().requisition.confirmed).toBe(false);
  });

  it('succeeds with zero spend (floor solve)', () => {
    useRequisitionStore.getState().initRequisition(makeLevel({ creditBudget: 100 }), null);
    const mockSpend = jest.fn();
    const ok = useRequisitionStore.getState().confirmRequisition(mockSpend);
    expect(ok).toBe(true);
    expect(mockSpend).not.toHaveBeenCalled();
  });
});

describe('useRequisitionStore — inventory management', () => {
  it('placeInventoryPiece marks first unplaced item of type as placed', () => {
    const level = makeLevel({ availablePieces: ['conveyor', 'conveyor'] });
    const purchases = [{ type: 'conveyor' as const, quantity: 1, unitPrice: 10, totalPrice: 10 }];
    const inv = buildInventoryForLevel(level, purchases);
    useRequisitionStore.setState({ inventory: inv, phase: 'placement' });

    useRequisitionStore.getState().placeInventoryPiece('conveyor');
    const pieces = useRequisitionStore.getState().inventory.pieces;
    const placed = pieces.filter(p => p.type === 'conveyor' && p.placed);
    const unplaced = pieces.filter(p => p.type === 'conveyor' && !p.placed);
    expect(placed).toHaveLength(1);
    expect(unplaced.length).toBeGreaterThanOrEqual(1);
  });

  it('unplaceInventoryPiece marks first placed item of type as unplaced', () => {
    const level = makeLevel({ availablePieces: ['gear'] });
    const inv = buildInventoryForLevel(level, []);
    useRequisitionStore.setState({ inventory: inv, phase: 'placement' });

    useRequisitionStore.getState().placeInventoryPiece('gear');
    expect(useRequisitionStore.getState().inventory.pieces.find(p => p.type === 'gear')?.placed).toBe(true);

    useRequisitionStore.getState().unplaceInventoryPiece('gear');
    expect(useRequisitionStore.getState().inventory.pieces.find(p => p.type === 'gear')?.placed).toBe(false);
  });

  it('getUnplacedPieces returns only unplaced items', () => {
    const level = makeLevel({ availablePieces: ['conveyor', 'gear'] });
    const inv = buildInventoryForLevel(level, []);
    useRequisitionStore.setState({ inventory: inv, phase: 'placement' });

    useRequisitionStore.getState().placeInventoryPiece('conveyor');
    const unplaced = useRequisitionStore.getState().getUnplacedPieces();
    expect(unplaced.every(p => !p.placed)).toBe(true);
    expect(unplaced.some(p => p.type === 'gear')).toBe(true);
    expect(unplaced.some(p => p.type === 'conveyor')).toBe(false);
  });
});

describe('buildInventoryForLevel', () => {
  it('includes pre-assigned pieces from availablePieces', () => {
    const level = makeLevel({ availablePieces: ['conveyor', 'gear'] });
    const inv = buildInventoryForLevel(level, []);
    expect(inv.pieces.some(p => p.type === 'conveyor' && p.source === 'preAssigned')).toBe(true);
    expect(inv.pieces.some(p => p.type === 'gear' && p.source === 'preAssigned')).toBe(true);
  });

  it('includes requisitioned pieces from purchases', () => {
    const level = makeLevel({ availablePieces: [] });
    const purchases = [{ type: 'scanner' as const, quantity: 2, unitPrice: 20, totalPrice: 40 }];
    const inv = buildInventoryForLevel(level, purchases);
    const scanners = inv.pieces.filter(p => p.type === 'scanner');
    expect(scanners).toHaveLength(2);
    expect(scanners.every(p => p.source === 'requisitioned')).toBe(true);
  });

  it('sets tape flags from freeTapes and purchases', () => {
    const level = makeLevel({ freeTapes: ['IN', 'TRAIL'], purchasableTapes: ['OUT'] });
    const purchases = [{ type: 'OUT_TAPE' as const, quantity: 1, unitPrice: 20, totalPrice: 20 }];
    const inv = buildInventoryForLevel(level, purchases);
    expect(inv.tapes.in).toBe(true);
    expect(inv.tapes.trail).toBe(true);
    expect(inv.tapes.out).toBe(true);
  });

  it('excludes source and terminal from pieces', () => {
    const level = makeLevel({ availablePieces: ['source', 'terminal', 'conveyor'] });
    const inv = buildInventoryForLevel(level, []);
    expect(inv.pieces.some(p => p.type === 'source')).toBe(false);
    expect(inv.pieces.some(p => p.type === 'terminal')).toBe(false);
    expect(inv.pieces.some(p => p.type === 'conveyor')).toBe(true);
  });

  it('assigns unique IDs to all pieces', () => {
    const level = makeLevel({ availablePieces: ['conveyor', 'conveyor', 'gear'] });
    const inv = buildInventoryForLevel(level, []);
    const ids = inv.pieces.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('useRequisitionStore — getPurchasedTapeTypes', () => {
  it('returns empty array when no tapes purchased', () => {
    useRequisitionStore.getState().initRequisition(makeLevel(), null);
    expect(useRequisitionStore.getState().getPurchasedTapeTypes()).toEqual([]);
  });

  it('returns TRAIL when trail tape purchased and active', () => {
    const level = makeLevel();
    useRequisitionStore.getState().initRequisition(level, null);
    useRequisitionStore.getState().setPurchaseNibbles('TRAIL', 2);
    const purchases = useRequisitionStore.getState().requisition.purchases;
    const inv = buildInventoryForLevel(level, purchases);
    useRequisitionStore.setState({
      inventory: inv,
      requisition: useRequisitionStore.getState().requisition,
    });
    const types = useRequisitionStore.getState().getPurchasedTapeTypes();
    expect(types).toContain('TRAIL');
  });
});
