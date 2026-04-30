import {
  PIECE_PRICES,
  NIBBLE_PRICE,
  CELLS_PER_NIBBLE,
  PHYSICS_PIECE_TYPES,
  PROTOCOL_PIECE_TYPES,
  getRequisitionPieceCategory,
  getRequisitionPrice,
  hasRequisitionDiscount,
  arcWheelSortKey,
} from '../../src/game/piecePrices';

describe('piecePrices — PIECE_PRICES constant', () => {
  it('defines prices for all physics pieces', () => {
    expect(PIECE_PRICES.conveyor).toBe(10);
    expect(PIECE_PRICES.gear).toBe(10);
    expect(PIECE_PRICES.splitter).toBe(15);
    expect(PIECE_PRICES.merger).toBe(15);
    expect(PIECE_PRICES.bridge).toBe(20);
  });

  it('defines prices for all protocol pieces', () => {
    expect(PIECE_PRICES.configNode).toBe(20);
    expect(PIECE_PRICES.scanner).toBe(20);
    expect(PIECE_PRICES.transmitter).toBe(20);
    expect(PIECE_PRICES.inverter).toBe(25);
    expect(PIECE_PRICES.counter).toBe(25);
    expect(PIECE_PRICES.latch).toBe(25);
  });

  it('exports nibble constants', () => {
    expect(NIBBLE_PRICE).toBe(20);
    expect(CELLS_PER_NIBBLE).toBe(4);
  });
});

describe('getRequisitionPieceCategory', () => {
  it('classifies physics pieces correctly', () => {
    expect(getRequisitionPieceCategory('conveyor')).toBe('physics');
    expect(getRequisitionPieceCategory('gear')).toBe('physics');
    expect(getRequisitionPieceCategory('splitter')).toBe('physics');
    expect(getRequisitionPieceCategory('merger')).toBe('physics');
    expect(getRequisitionPieceCategory('bridge')).toBe('physics');
  });

  it('classifies protocol pieces correctly', () => {
    expect(getRequisitionPieceCategory('configNode')).toBe('protocol');
    expect(getRequisitionPieceCategory('scanner')).toBe('protocol');
    expect(getRequisitionPieceCategory('transmitter')).toBe('protocol');
    expect(getRequisitionPieceCategory('inverter')).toBe('protocol');
    expect(getRequisitionPieceCategory('counter')).toBe('protocol');
    expect(getRequisitionPieceCategory('latch')).toBe('protocol');
  });

  it('classifies source/terminal/obstacle as other', () => {
    expect(getRequisitionPieceCategory('source')).toBe('other');
    expect(getRequisitionPieceCategory('terminal')).toBe('other');
    expect(getRequisitionPieceCategory('obstacle')).toBe('other');
  });
});

describe('getRequisitionPrice — discipline discounts', () => {
  it('returns base price with no discipline', () => {
    expect(getRequisitionPrice('conveyor', null)).toBe(10);
    expect(getRequisitionPrice('configNode', null)).toBe(20);
  });

  it('applies 20% discount for drive engineer on physics pieces', () => {
    // conveyor: 10 * 0.8 = 8 (rounded)
    expect(getRequisitionPrice('conveyor', 'drive')).toBe(8);
    // bridge: 20 * 0.8 = 16
    expect(getRequisitionPrice('bridge', 'drive')).toBe(16);
    // protocol pieces get no discount for drive
    expect(getRequisitionPrice('configNode', 'drive')).toBe(20);
  });

  it('applies 20% discount for systems architect on protocol pieces', () => {
    // configNode: 20 * 0.8 = 16
    expect(getRequisitionPrice('configNode', 'systems')).toBe(16);
    // latch: 25 * 0.8 = 20
    expect(getRequisitionPrice('latch', 'systems')).toBe(20);
    // physics pieces get no discount for systems
    expect(getRequisitionPrice('conveyor', 'systems')).toBe(10);
  });

  it('applies 10% discount for field operative on all pieces', () => {
    // conveyor: 10 * 0.9 = 9
    expect(getRequisitionPrice('conveyor', 'field')).toBe(9);
    // configNode: 20 * 0.9 = 18
    expect(getRequisitionPrice('configNode', 'field')).toBe(18);
    // latch: 25 * 0.9 = 22.5 rounds to 23 (Math.round)
    expect(getRequisitionPrice('latch', 'field')).toBe(23);
  });

  it('returns 0 for pieces with no price (source, terminal)', () => {
    expect(getRequisitionPrice('source', 'drive')).toBe(0);
    expect(getRequisitionPrice('terminal', 'systems')).toBe(0);
  });
});

describe('hasRequisitionDiscount', () => {
  it('returns true when discipline matches category', () => {
    expect(hasRequisitionDiscount('conveyor', 'drive')).toBe(true);
    expect(hasRequisitionDiscount('configNode', 'systems')).toBe(true);
    expect(hasRequisitionDiscount('conveyor', 'field')).toBe(true);
  });

  it('returns false when no discipline discount applies', () => {
    expect(hasRequisitionDiscount('conveyor', 'systems')).toBe(false);
    expect(hasRequisitionDiscount('configNode', 'drive')).toBe(false);
    expect(hasRequisitionDiscount('conveyor', null)).toBe(false);
  });
});

describe('arcWheelSortKey', () => {
  it('orders physics before protocol', () => {
    expect(arcWheelSortKey('conveyor')).toBeLessThan(arcWheelSortKey('configNode'));
    expect(arcWheelSortKey('bridge')).toBeLessThan(arcWheelSortKey('scanner'));
  });

  it('orders cheaper pieces first within a category', () => {
    expect(arcWheelSortKey('conveyor')).toBeLessThan(arcWheelSortKey('splitter'));
    expect(arcWheelSortKey('configNode')).toBeLessThan(arcWheelSortKey('inverter'));
  });

  it('includes all physics and protocol types', () => {
    for (const t of PHYSICS_PIECE_TYPES) {
      expect(arcWheelSortKey(t)).toBeDefined();
    }
    for (const t of PROTOCOL_PIECE_TYPES) {
      expect(arcWheelSortKey(t)).toBeDefined();
    }
  });
});
