import { groupArcWheelPieces, type ArcWheelPiece } from '../../../src/components/gameplay/arcWheelGrouping';

function piece(over: Partial<ArcWheelPiece> & { id: string; type: ArcWheelPiece['type'] }): ArcWheelPiece {
  return { source: 'preAssigned', placed: false, ...over };
}

describe('groupArcWheelPieces', () => {
  it('collapses duplicate types into one group with a count', () => {
    const groups = groupArcWheelPieces([
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
    const groups = groupArcWheelPieces([
      piece({ id: 'first', type: 'conveyor' }),
      piece({ id: 'second', type: 'conveyor' }),
    ]);
    expect(groups[0].repId).toBe('first');
  });

  it('preserves first-seen ordering of types', () => {
    const groups = groupArcWheelPieces([
      piece({ id: 'g1', type: 'gear' }),
      piece({ id: 'c1', type: 'conveyor' }),
      piece({ id: 'g2', type: 'gear' }),
    ]);
    expect(groups.map(g => g.type)).toEqual(['gear', 'conveyor']);
  });

  it('keeps tape and non-tape of the same type in separate groups', () => {
    const groups = groupArcWheelPieces([
      piece({ id: 'p', type: 'transmitter' }),
      piece({ id: 't', type: 'transmitter', isTape: true }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.every(g => g.count === 1)).toBe(true);
  });

  it('carries the representative source onto the group', () => {
    const groups = groupArcWheelPieces([
      piece({ id: 'a', type: 'scanner', source: 'requisitioned' }),
    ]);
    expect(groups[0].source).toBe('requisitioned');
  });

  it('returns an empty list for no pieces', () => {
    expect(groupArcWheelPieces([])).toEqual([]);
  });
});
