import { PIECE_COSTS, getPieceCost } from '../../src/game/types';
import type { PieceType } from '../../src/game/types';

describe('PIECE_COSTS', () => {
  it('has correct values for all priced pieces', () => {
    expect(PIECE_COSTS.conveyor).toBe(5);
    expect(PIECE_COSTS.gear).toBe(10);
    expect(PIECE_COSTS.splitter).toBe(15);
    expect(PIECE_COSTS.merger).toBe(15);
    expect(PIECE_COSTS.bridge).toBe(20);
    expect(PIECE_COSTS.configNode).toBe(25);
    expect(PIECE_COSTS.scanner).toBe(30);
    expect(PIECE_COSTS.latch).toBe(30);
    expect(PIECE_COSTS.transmitter).toBe(35);
  });
});

describe('getPieceCost', () => {
  it('returns base cost with no discipline', () => {
    expect(getPieceCost('conveyor', null)).toBe(5);
    expect(getPieceCost('scanner', null)).toBe(30);
    expect(getPieceCost('latch', null)).toBe(30);
    expect(getPieceCost('merger', null)).toBe(15);
    expect(getPieceCost('bridge', null)).toBe(20);
  });

  it('applies systems discount to protocol pieces', () => {
    expect(getPieceCost('configNode', 'systems')).toBe(20);
    expect(getPieceCost('scanner', 'systems')).toBe(24);
    expect(getPieceCost('transmitter', 'systems')).toBe(28);
    expect(getPieceCost('latch', 'systems')).toBe(24);
  });

  it('does not apply systems discount to physics pieces', () => {
    expect(getPieceCost('conveyor', 'systems')).toBe(5);
    expect(getPieceCost('gear', 'systems')).toBe(10);
    expect(getPieceCost('merger', 'systems')).toBe(15);
    expect(getPieceCost('bridge', 'systems')).toBe(20);
  });

  it('applies drive discount to physics pieces', () => {
    expect(getPieceCost('conveyor', 'drive')).toBe(4);
    expect(getPieceCost('gear', 'drive')).toBe(8);
    expect(getPieceCost('splitter', 'drive')).toBe(12);
    expect(getPieceCost('merger', 'drive')).toBe(12);
    expect(getPieceCost('bridge', 'drive')).toBe(16);
  });

  it('does not apply drive discount to protocol pieces', () => {
    expect(getPieceCost('scanner', 'drive')).toBe(30);
    expect(getPieceCost('latch', 'drive')).toBe(30);
  });

  it('applies field discount to all pieces', () => {
    expect(getPieceCost('conveyor', 'field')).toBe(4);
    expect(getPieceCost('scanner', 'field')).toBe(27);
    expect(getPieceCost('latch', 'field')).toBe(27);
    expect(getPieceCost('merger', 'field')).toBe(13);
    expect(getPieceCost('bridge', 'field')).toBe(18);
  });

  it('returns 0 for unknown piece type', () => {
    expect(getPieceCost('inputPort' as PieceType, null)).toBe(0);
    expect(getPieceCost('outputPort' as PieceType, null)).toBe(0);
  });
});
