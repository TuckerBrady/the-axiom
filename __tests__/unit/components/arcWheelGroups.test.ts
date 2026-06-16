// Arc Wheel grouping (the keystone of the lift): the wheel groups placement
// inventory by piece TYPE with a count, instead of one node per instance.

import { groupPieces, type ArcWheelPiece } from '../../../src/components/gameplay/arcWheelGroups';

function inv(id: string, type: ArcWheelPiece['type'], source: ArcWheelPiece['source'], isTape = false): ArcWheelPiece {
  return { id, type, source, placed: false, isTape };
}

describe('groupPieces', () => {
  it('collapses many instances of a type into one group with a count', () => {
    const pieces = [
      inv('a', 'conveyor', 'preAssigned'),
      inv('b', 'conveyor', 'requisitioned'),
      inv('c', 'conveyor', 'requisitioned'),
      inv('d', 'gear', 'preAssigned'),
    ];
    const groups = groupPieces(pieces);
    expect(groups).toHaveLength(2);
    const conv = groups.find(g => g.type === 'conveyor')!;
    expect(conv.count).toBe(3);
    expect(conv.repId).toBe('a'); // first instance is the representative
    const gear = groups.find(g => g.type === 'gear')!;
    expect(gear.count).toBe(1);
  });

  it('a group with any requisitioned instance reads as purchased (cyan source)', () => {
    const mixed = groupPieces([
      inv('a', 'conveyor', 'preAssigned'),
      inv('b', 'conveyor', 'requisitioned'),
    ]);
    expect(mixed[0].source).toBe('requisitioned');

    const pure = groupPieces([inv('a', 'gear', 'preAssigned')]);
    expect(pure[0].source).toBe('preAssigned');
  });

  it('preserves input (sort) order by first appearance of each type', () => {
    const groups = groupPieces([
      inv('a', 'gear', 'preAssigned'),
      inv('b', 'conveyor', 'preAssigned'),
      inv('c', 'gear', 'preAssigned'),
      inv('d', 'scanner', 'requisitioned'),
    ]);
    expect(groups.map(g => g.type)).toEqual(['gear', 'conveyor', 'scanner']);
  });

  it('carries the tape flag through', () => {
    const groups = groupPieces([inv('a', 'transmitter', 'requisitioned', true)]);
    expect(groups[0].isTape).toBe(true);
  });

  it('returns [] for an empty inventory', () => {
    expect(groupPieces([])).toEqual([]);
  });
});
