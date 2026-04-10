import type { PlacedPiece, PortSide } from '../../src/game/types';
import { getInputPorts, getOutputPorts, getDefaultPorts } from '../../src/game/engine';
import { computeSplitterMagnets } from '../../src/store/gameStore';

function makePiece(
  id: string,
  type: PlacedPiece['type'],
  gridX: number,
  gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  return {
    id,
    type,
    category: type === 'configNode' || type === 'scanner' || type === 'transmitter'
      || type === 'inverter' || type === 'counter' || type === 'latch'
      ? 'protocol' : 'physics',
    gridX,
    gridY,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: false,
    ...overrides,
  };
}

// ─── computeSplitterMagnets ──────────────────────────────────────────────────

describe('computeSplitterMagnets', () => {
  it('returns empty magnets when splitter has no adjacent pieces', () => {
    const pieces = [
      makePiece('s1', 'splitter', 3, 3),
    ];
    const result = computeSplitterMagnets(pieces);
    const splitter = result.find(p => p.id === 's1')!;
    expect(splitter.connectedMagnetSides).toEqual([]);
  });

  it('connects one magnet when one adjacent piece exists', () => {
    const pieces = [
      makePiece('s1', 'splitter', 3, 3),
      makePiece('c1', 'conveyor', 4, 3), // right of splitter
    ];
    const result = computeSplitterMagnets(pieces);
    const splitter = result.find(p => p.id === 's1')!;
    expect(splitter.connectedMagnetSides).toEqual(['right']);
  });

  it('connects two magnets when two adjacent pieces exist', () => {
    const pieces = [
      makePiece('s1', 'splitter', 3, 3),
      makePiece('c1', 'conveyor', 3, 2), // top of splitter
      makePiece('c2', 'conveyor', 4, 3), // right of splitter
    ];
    const result = computeSplitterMagnets(pieces);
    const splitter = result.find(p => p.id === 's1')!;
    expect(splitter.connectedMagnetSides).toHaveLength(2);
    expect(splitter.connectedMagnetSides).toContain('top');
    expect(splitter.connectedMagnetSides).toContain('right');
  });

  it('caps at 2 magnets even with 3+ adjacent pieces', () => {
    const pieces = [
      makePiece('s1', 'splitter', 3, 3),
      makePiece('c1', 'conveyor', 3, 2), // top
      makePiece('c2', 'conveyor', 3, 4), // bottom
      makePiece('c3', 'conveyor', 2, 3), // left
      makePiece('c4', 'conveyor', 4, 3), // right
    ];
    const result = computeSplitterMagnets(pieces);
    const splitter = result.find(p => p.id === 's1')!;
    expect(splitter.connectedMagnetSides).toHaveLength(2);
  });

  it('does not modify non-splitter pieces', () => {
    const pieces = [
      makePiece('c1', 'conveyor', 3, 3),
      makePiece('c2', 'conveyor', 4, 3),
    ];
    const result = computeSplitterMagnets(pieces);
    expect(result[0].connectedMagnetSides).toBeUndefined();
    expect(result[1].connectedMagnetSides).toBeUndefined();
  });

  it('retracts magnets when adjacent piece is removed', () => {
    // First: two adjacent pieces
    const piecesWithTwo = [
      makePiece('s1', 'splitter', 3, 3),
      makePiece('c1', 'conveyor', 4, 3),
      makePiece('c2', 'conveyor', 3, 4),
    ];
    const withTwo = computeSplitterMagnets(piecesWithTwo);
    expect(withTwo.find(p => p.id === 's1')!.connectedMagnetSides).toHaveLength(2);

    // Then: remove one
    const piecesWithOne = piecesWithTwo.filter(p => p.id !== 'c2');
    const withOne = computeSplitterMagnets(piecesWithOne);
    expect(withOne.find(p => p.id === 's1')!.connectedMagnetSides).toEqual(['right']);
  });
});

// ─── Engine port resolution ──────────────────────────────────────────────────

describe('Splitter engine port resolution', () => {
  it('getOutputPorts returns connectedMagnetSides when 2 magnets', () => {
    const piece = makePiece('s1', 'splitter', 3, 3, {
      connectedMagnetSides: ['right', 'bottom'],
    });
    const outputs = getOutputPorts(piece);
    expect(outputs).toEqual(['right', 'bottom']);
  });

  it('getOutputPorts returns empty when fewer than 2 magnets', () => {
    const piece1 = makePiece('s1', 'splitter', 3, 3, {
      connectedMagnetSides: ['right'],
    });
    expect(getOutputPorts(piece1)).toEqual([]);

    const piece0 = makePiece('s2', 'splitter', 3, 3, {
      connectedMagnetSides: [],
    });
    expect(getOutputPorts(piece0)).toEqual([]);
  });

  it('getOutputPorts returns empty when connectedMagnetSides undefined', () => {
    const piece = makePiece('s1', 'splitter', 3, 3);
    expect(getOutputPorts(piece)).toEqual([]);
  });

  it('getInputPorts returns non-magnet sides when magnets connected', () => {
    const piece = makePiece('s1', 'splitter', 3, 3, {
      connectedMagnetSides: ['right', 'bottom'],
    });
    const inputs = getInputPorts(piece);
    expect(inputs).toContain('top');
    expect(inputs).toContain('left');
    expect(inputs).not.toContain('right');
    expect(inputs).not.toContain('bottom');
  });

  it('getInputPorts returns all sides when no magnets', () => {
    const piece = makePiece('s1', 'splitter', 3, 3);
    const inputs = getInputPorts(piece);
    expect(inputs).toEqual(['top', 'bottom', 'left', 'right']);
  });

  it('Splitter blocks (no outputs) when fewer than 2 magnets', () => {
    const piece = makePiece('s1', 'splitter', 3, 3, {
      connectedMagnetSides: ['right'],
    });
    // No outputs means getDirectionalNeighbors returns empty = signal stops
    expect(getOutputPorts(piece)).toEqual([]);
  });
});
