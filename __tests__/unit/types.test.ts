import { getPieceCost, PIECE_COSTS } from '../../src/game/types';

describe('getPieceCost', () => {
  it('returns 0 for source/terminal (no cost)', () => {
    expect(getPieceCost('source', null)).toBe(0);
    expect(getPieceCost('terminal', null)).toBe(0);
  });

  it('returns base cost for conveyor', () => {
    expect(getPieceCost('conveyor', null)).toBe(5);
  });

  it('systems discipline gives 20% discount on protocol pieces', () => {
    const base = PIECE_COSTS['configNode'] ?? 25;
    const discounted = getPieceCost('configNode', 'systems');
    expect(discounted).toBe(Math.floor(base * 0.8));
  });

  it('drive discipline gives 20% discount on physics pieces', () => {
    const base = PIECE_COSTS['conveyor'] ?? 5;
    const discounted = getPieceCost('conveyor', 'drive');
    expect(discounted).toBe(Math.floor(base * 0.8));
  });

  it('field discipline gives 10% discount on all pieces', () => {
    const base = PIECE_COSTS['gear'] ?? 10;
    const discounted = getPieceCost('gear', 'field');
    expect(discounted).toBe(Math.floor(base * 0.9));
  });

  it('no discount for non-matching discipline', () => {
    expect(getPieceCost('conveyor', 'systems')).toBe(PIECE_COSTS['conveyor'] ?? 5);
  });
});
