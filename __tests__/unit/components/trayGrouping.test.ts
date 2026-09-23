import {
  groupTrayPieces,
  nextPlacementIndex,
  nextReturnIndex,
  FILTER_CHIP_THRESHOLD,
  shouldShowFilterChips,
  trayFilterChips,
  trayItemCategory,
  applyTrayFilter,
  type TrayPiece,
} from '../../../src/components/gameplay/trayGrouping';

function piece(over: Partial<TrayPiece> & { id: string; type: TrayPiece['type'] }): TrayPiece {
  return { source: 'preAssigned', placed: false, ...over };
}

describe('groupTrayPieces', () => {
  it('collapses duplicate types into one group with a count', () => {
    const groups = groupTrayPieces([
      piece({ id: 'a', type: 'conveyor' }),
      piece({ id: 'b', type: 'conveyor' }),
      piece({ id: 'c', type: 'gear' }),
      piece({ id: 'd', type: 'conveyor' }),
    ]);
    expect(groups).toHaveLength(2);
    const conv = groups.find(g => g.type === 'conveyor')!;
    const gear = groups.find(g => g.type === 'gear')!;
    expect(conv.count).toBe(3);
    expect(gear.count).toBe(1);
  });

  it('uses the first piece of a type as the representative id', () => {
    const groups = groupTrayPieces([
      piece({ id: 'first', type: 'conveyor' }),
      piece({ id: 'second', type: 'conveyor' }),
    ]);
    expect(groups[0].repId).toBe('first');
  });

  it('preserves first-seen ordering of types', () => {
    const groups = groupTrayPieces([
      piece({ id: 'g1', type: 'gear' }),
      piece({ id: 'c1', type: 'conveyor' }),
      piece({ id: 'g2', type: 'gear' }),
    ]);
    expect(groups.map(g => g.type)).toEqual(['gear', 'conveyor']);
  });

  it('keeps tape and non-tape of the same type in separate groups', () => {
    const groups = groupTrayPieces([
      piece({ id: 'p', type: 'transmitter' }),
      piece({ id: 't', type: 'transmitter', isTape: true }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.every(g => g.count === 1)).toBe(true);
  });

  it('carries the representative source onto the group', () => {
    const groups = groupTrayPieces([
      piece({ id: 'a', type: 'scanner', source: 'requisitioned' }),
    ]);
    expect(groups[0].source).toBe('requisitioned');
  });

  it('returns an empty list for no pieces', () => {
    expect(groupTrayPieces([])).toEqual([]);
  });

  // AXM-013 — the count badge splits by source.
  it('splits each group count into pre-assigned and requisitioned', () => {
    const [conv] = groupTrayPieces([
      piece({ id: 'a', type: 'conveyor' }),
      piece({ id: 'b', type: 'conveyor', source: 'requisitioned' }),
      piece({ id: 'c', type: 'conveyor', source: 'requisitioned' }),
    ]);
    expect(conv.count).toBe(3);
    expect(conv.preAssignedCount).toBe(1);
    expect(conv.requisitionedCount).toBe(2);
  });

  it('prefers a requisitioned instance as the representative (it is placed first)', () => {
    const [conv] = groupTrayPieces([
      piece({ id: 'pre', type: 'conveyor' }),
      piece({ id: 'req', type: 'conveyor', source: 'requisitioned' }),
    ]);
    expect(conv.repId).toBe('req');
    expect(conv.source).toBe('requisitioned');
  });

  it('ignores placed instances when counting', () => {
    const groups = groupTrayPieces([
      piece({ id: 'a', type: 'gear', placed: true }),
      piece({ id: 'b', type: 'gear' }),
    ]);
    expect(groups[0].count).toBe(1);
  });

  it('drops a type from the tray when its count reaches zero', () => {
    const groups = groupTrayPieces([
      piece({ id: 'a', type: 'gear', placed: true }),
      piece({ id: 'b', type: 'conveyor' }),
    ]);
    expect(groups.map(g => g.type)).toEqual(['conveyor']);
  });
});

describe('consume order — requisitioned first, returned pre-assigned first', () => {
  const inv = (): TrayPiece[] => [
    piece({ id: 'pre1', type: 'scanner' }),
    piece({ id: 'req1', type: 'scanner', source: 'requisitioned' }),
    piece({ id: 'pre2', type: 'scanner' }),
    piece({ id: 'req2', type: 'scanner', source: 'requisitioned' }),
    piece({ id: 'g', type: 'gear' }),
  ];

  it('places requisitioned instances before pre-assigned ones', () => {
    const pieces = inv();
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const idx = nextPlacementIndex(pieces, 'scanner');
      order.push(pieces[idx].id);
      pieces[idx] = { ...pieces[idx], placed: true };
    }
    expect(order).toEqual(['req1', 'req2', 'pre1', 'pre2']);
    expect(nextPlacementIndex(pieces, 'scanner')).toBe(-1);
  });

  it('returns pre-assigned instances before requisitioned ones', () => {
    const pieces = inv().map(p => ({ ...p, placed: true }));
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      const idx = nextReturnIndex(pieces, 'scanner');
      order.push(pieces[idx].id);
      pieces[idx] = { ...pieces[idx], placed: false };
    }
    expect(order).toEqual(['pre1', 'pre2', 'req1', 'req2']);
    expect(nextReturnIndex(pieces, 'scanner')).toBe(-1);
  });

  it('keeps the forfeit count equal to requisitioned-and-never-needed after place/return churn', () => {
    const pieces = inv();
    const place = () => { const i = nextPlacementIndex(pieces, 'scanner'); pieces[i] = { ...pieces[i], placed: true }; };
    const ret = () => { const i = nextReturnIndex(pieces, 'scanner'); pieces[i] = { ...pieces[i], placed: false }; };
    place(); place(); place(); ret(); ret(); place();
    // Two on the board: both must be the requisitioned ones.
    const placed = pieces.filter(p => p.type === 'scanner' && p.placed);
    expect(placed.map(p => p.source)).toEqual(['requisitioned', 'requisitioned']);
    const forfeit = pieces.filter(p => p.source === 'requisitioned' && !p.placed);
    expect(forfeit).toHaveLength(0);
  });

  it('never touches other types', () => {
    const pieces = inv();
    expect(pieces[nextPlacementIndex(pieces, 'gear')].id).toBe('g');
    expect(nextPlacementIndex(pieces, 'conveyor')).toBe(-1);
  });
});

describe('filter chips — only when the tray needs them', () => {
  it('names the threshold 6', () => {
    expect(FILTER_CHIP_THRESHOLD).toBe(6);
  });

  it('shows chips only above the threshold', () => {
    expect(shouldShowFilterChips(6)).toBe(false);
    expect(shouldShowFilterChips(7)).toBe(true);
    expect(shouldShowFilterChips(0)).toBe(false);
  });

  it('categorises by the canonical Physics/Protocol split, tapes separately', () => {
    expect(trayItemCategory({ type: 'conveyor', isTape: false })).toBe('PHYSICS');
    expect(trayItemCategory({ type: 'bridge', isTape: false })).toBe('PHYSICS');
    expect(trayItemCategory({ type: 'merger', isTape: false })).toBe('PHYSICS');
    expect(trayItemCategory({ type: 'latch', isTape: false })).toBe('PROTOCOL');
    expect(trayItemCategory({ type: 'counter', isTape: false })).toBe('PROTOCOL');
    expect(trayItemCategory({ type: 'transmitter', isTape: true })).toBe('TAPES');
  });

  it('orders chips ALL, PHYSICS, PROTOCOL and adds TAPES only when a tape item exists', () => {
    expect(trayFilterChips([{ type: 'conveyor', isTape: false }])).toEqual(['ALL', 'PHYSICS', 'PROTOCOL']);
    expect(trayFilterChips([
      { type: 'conveyor', isTape: false },
      { type: 'transmitter', isTape: true },
    ])).toEqual(['ALL', 'PHYSICS', 'PROTOCOL', 'TAPES']);
  });

  it('filters items by category; ALL passes everything', () => {
    const items = [
      { type: 'conveyor' as const, isTape: false },
      { type: 'scanner' as const, isTape: false },
      { type: 'transmitter' as const, isTape: true },
    ];
    expect(applyTrayFilter(items, 'ALL')).toHaveLength(3);
    expect(applyTrayFilter(items, 'PHYSICS').map(i => i.type)).toEqual(['conveyor']);
    expect(applyTrayFilter(items, 'PROTOCOL').map(i => i.type)).toEqual(['scanner']);
    expect(applyTrayFilter(items, 'TAPES').map(i => i.isTape)).toEqual([true]);
  });
});
