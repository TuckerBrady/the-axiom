import { useGameStore } from '../../src/store/gameStore';
import { computeSplitterMagnets } from '../../src/store/gameStore';
import { getDefaultPorts } from '../../src/game/engine';
import type { PlacedPiece, LevelDefinition } from '../../src/game/types';

function makePiece(
  id: string, type: PlacedPiece['type'], gridX: number, gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  const category =
    ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'].includes(type)
      ? 'protocol' as const : 'physics' as const;
  return {
    id, type, category, gridX, gridY,
    ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false,
    ...overrides,
  };
}

const MINIMAL_LEVEL: LevelDefinition = {
  id: 'test',
  name: 'Test Level',
  sector: 'axiom',
  description: 'Test',
  cogsLine: 'Test',
  gridWidth: 8,
  gridHeight: 7,
  prePlacedPieces: [
    makePiece('pre-in', 'inputPort', 1, 3, { isPrePlaced: true }),
    makePiece('pre-out', 'outputPort', 6, 3, { isPrePlaced: true }),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'splitter'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
};

beforeEach(() => {
  useGameStore.getState().setLevel(MINIMAL_LEVEL);
});

describe('placePiece', () => {
  it('adds a piece at the correct grid position', () => {
    useGameStore.getState().placePiece('conveyor', 2, 3);
    const pieces = useGameStore.getState().machineState.pieces;
    const placed = pieces.find(p => p.gridX === 2 && p.gridY === 3 && !p.isPrePlaced);
    expect(placed).toBeDefined();
    expect(placed!.type).toBe('conveyor');
  });

  it('rejects placement on an occupied cell', () => {
    useGameStore.getState().placePiece('conveyor', 2, 3);
    const countBefore = useGameStore.getState().machineState.pieces.length;
    useGameStore.getState().placePiece('conveyor', 2, 3);
    const countAfter = useGameStore.getState().machineState.pieces.length;
    expect(countAfter).toBe(countBefore);
  });

  it('sets rotation to 0 for splitter type', () => {
    useGameStore.getState().placePiece('splitter', 3, 3, 90);
    const pieces = useGameStore.getState().machineState.pieces;
    const sp = pieces.find(p => p.type === 'splitter' && !p.isPrePlaced);
    expect(sp?.rotation).toBe(0);
  });
});

describe('deletePiece', () => {
  it('removes a piece from machineState', () => {
    useGameStore.getState().placePiece('conveyor', 2, 3);
    const pieces = useGameStore.getState().machineState.pieces;
    const placed = pieces.find(p => p.gridX === 2 && p.gridY === 3 && !p.isPrePlaced);
    expect(placed).toBeDefined();
    useGameStore.getState().deletePiece(placed!.id);
    const after = useGameStore.getState().machineState.pieces;
    expect(after.find(p => p.id === placed!.id)).toBeUndefined();
  });

  it('does not remove pre-placed pieces', () => {
    const pre = useGameStore.getState().machineState.pieces.find(p => p.isPrePlaced);
    expect(pre).toBeDefined();
    useGameStore.getState().deletePiece(pre!.id);
    const after = useGameStore.getState().machineState.pieces;
    expect(after.find(p => p.id === pre!.id)).toBeDefined();
  });

  it('recalculates wires after removal', () => {
    useGameStore.getState().placePiece('conveyor', 2, 3);
    const wiresBefore = useGameStore.getState().machineState.wires.length;
    const placed = useGameStore.getState().machineState.pieces.find(
      p => p.gridX === 2 && p.gridY === 3 && !p.isPrePlaced,
    )!;
    useGameStore.getState().deletePiece(placed.id);
    const wiresAfter = useGameStore.getState().machineState.wires.length;
    expect(wiresAfter).toBeLessThanOrEqual(wiresBefore);
  });
});

describe('movePiece', () => {
  it('updates gridX and gridY', () => {
    useGameStore.getState().placePiece('conveyor', 2, 3);
    const placed = useGameStore.getState().machineState.pieces.find(
      p => p.gridX === 2 && p.gridY === 3 && !p.isPrePlaced,
    )!;
    useGameStore.getState().movePiece(placed.id, 3, 3);
    const moved = useGameStore.getState().machineState.pieces.find(p => p.id === placed.id);
    expect(moved?.gridX).toBe(3);
    expect(moved?.gridY).toBe(3);
  });
});

describe('rotatePiece', () => {
  it('rotates a conveyor by 90 degrees', () => {
    useGameStore.getState().placePiece('conveyor', 2, 3);
    const placed = useGameStore.getState().machineState.pieces.find(
      p => p.gridX === 2 && p.gridY === 3 && !p.isPrePlaced,
    )!;
    expect(placed.rotation).toBe(0);
    useGameStore.getState().rotatePiece(placed.id);
    const rotated = useGameStore.getState().machineState.pieces.find(p => p.id === placed.id);
    expect(rotated?.rotation).toBe(90);
  });
});

describe('computeSplitterMagnets', () => {
  it('is called on placePiece — splitter gets connectedMagnetSides', () => {
    useGameStore.getState().placePiece('conveyor', 3, 3);
    useGameStore.getState().placePiece('splitter', 4, 3);
    const sp = useGameStore.getState().machineState.pieces.find(
      p => p.type === 'splitter' && !p.isPrePlaced,
    );
    expect(sp?.connectedMagnetSides).toBeDefined();
    expect(sp!.connectedMagnetSides!.length).toBeGreaterThanOrEqual(1);
  });
});
