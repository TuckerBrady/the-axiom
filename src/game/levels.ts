import type { LevelDefinition, PlacedPiece } from './types';
import { getDefaultPorts } from './engine';

// ─── Helper to create pre-placed pieces ───────────────────────────────────────

let pieceCounter = 0;

function prePlaced(
  type: PlacedPiece['type'],
  gridX: number,
  gridY: number,
  options?: {
    condition?: (configuration: number) => boolean;
  },
): PlacedPiece {
  const id = `pre-${type}-${++pieceCounter}`;
  const category =
    type === 'configNode' || type === 'scanner' || type === 'transmitter'
      ? 'protocol'
      : 'physics';

  return {
    id,
    type,
    category,
    gridX,
    gridY,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: true,
    condition: options?.condition,
  };
}

// Reset counter for deterministic IDs
pieceCounter = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR 0: THE AXIOM — Ship repair campaign
// ═══════════════════════════════════════════════════════════════════════════════

export const levelA1_1: LevelDefinition = {
  id: 'A1-1',
  name: 'Emergency Power',
  sector: 'The Axiom',
  description: 'Restore emergency power by connecting Source to Output.',
  cogsLine: 'Main power conduit is severed. Connect Source to Output. Do not overthink this.',
  gridWidth: 7,
  gridHeight: 5,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('output', 5, 2),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 1,
  systemRepaired: 'Emergency Power',
};

pieceCounter = 100;

export const levelA1_2: LevelDefinition = {
  id: 'A1-2',
  name: 'Life Support',
  sector: 'The Axiom',
  description: 'Reroute life support through a non-linear path.',
  cogsLine: 'Life support requires a non-linear path. The Gear will redirect the signal.',
  gridWidth: 7,
  gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('output', 5, 4),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 2,
  systemRepaired: 'Life Support',
};

pieceCounter = 200;

export const levelA1_3: LevelDefinition = {
  id: 'A1-3',
  name: 'Navigation Array',
  sector: 'The Axiom',
  description: 'Activate the logic gate before the signal passes.',
  cogsLine: 'The navigation array has a logic gate. Configuration must be active before the signal passes.',
  gridWidth: 8,
  gridHeight: 5,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('output', 6, 2),
    prePlaced('configNode', 3, 2, { condition: (c: number) => c === 1 }),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'configNode'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 3,
  systemRepaired: 'Navigation Array',
};

pieceCounter = 300;

export const levelA1_4: LevelDefinition = {
  id: 'A1-4',
  name: 'Propulsion Core',
  sector: 'The Axiom',
  description: 'Route the signal through two relay points.',
  cogsLine: 'Propulsion requires routing through two relay points. Plan the path before placing.',
  gridWidth: 8,
  gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 6, 2),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 3,
  systemRepaired: 'Propulsion Core',
};

pieceCounter = 400;

export const levelA1_5: LevelDefinition = {
  id: 'A1-5',
  name: 'Communication Array',
  sector: 'The Axiom',
  description: 'The Scanner reads the Data Trail. Route the signal past it.',
  cogsLine: 'The communication array reads the Data Trail. The Scanner is already in position.',
  gridWidth: 8,
  gridHeight: 5,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('output', 6, 2),
    prePlaced('scanner', 4, 2),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'configNode'],
  dataTrail: { cells: [1, 0, 1, 0, 1, 0, 1, 0], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 2,
  systemRepaired: 'Communication Array',
};

pieceCounter = 500;

export const levelA1_6: LevelDefinition = {
  id: 'A1-6',
  name: 'Sensor Grid',
  sector: 'The Axiom',
  description: 'Conditional routing with data trail awareness.',
  cogsLine: 'Sensor grid requires conditional routing. Read the trail carefully.',
  gridWidth: 9,
  gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 7, 3),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'configNode', 'configNode'],
  dataTrail: { cells: [1, 1, 0, 0, 1, 1, 0, 0], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Sensor Grid',
};

pieceCounter = 600;

export const levelA1_7: LevelDefinition = {
  id: 'A1-7',
  name: 'Weapons Lock',
  sector: 'The Axiom',
  description: 'Write to the trail to set the correct value.',
  cogsLine: 'Weapons lock requires writing to the trail. The Transmitter will set the correct value.',
  gridWidth: 9,
  gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 7, 3),
    prePlaced('scanner', 4, 3),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'transmitter', 'configNode', 'configNode'],
  dataTrail: { cells: [0, 1, 0, 1, 0, 1, 0, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Weapons Lock',
};

pieceCounter = 700;

export const levelA1_8: LevelDefinition = {
  id: 'A1-8',
  name: 'Bridge Systems',
  sector: 'The Axiom',
  description: 'Final repair. All systems lead to this moment.',
  cogsLine: 'Bridge systems. This is the final repair. Every system we have restored leads to this moment.',
  gridWidth: 10,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 8, 3),
  ],
  availablePieces: [
    'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor',
    'gear', 'gear',
    'scanner',
    'transmitter',
    'configNode', 'configNode', 'configNode',
  ],
  dataTrail: { cells: [1, 0, 1, 1, 0, 1, 0, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 6,
  systemRepaired: 'Bridge Systems',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR 1: KEPLER BELT
// ═══════════════════════════════════════════════════════════════════════════════

pieceCounter = 800;

// ─── Level 2-1: Power Grid Alpha ──────────────────────────────────────────────

export const level2_1: LevelDefinition = {
  id: '2-1',
  name: 'Power Grid Alpha',
  sector: 'Kepler Belt',
  description: 'Connect the Source to the Output using Conveyors.',
  cogsLine:
    'Power conduit is offline. Connect Source to Output. This is the simplest possible repair. I expect it done quickly.',
  gridWidth: 8,
  gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 6, 3),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 1,
};

// ─── Level 2-2: Relay Junction ────────────────────────────────────────────────

pieceCounter = 810;

export const level2_2: LevelDefinition = {
  id: '2-2',
  name: 'Relay Junction',
  sector: 'Kepler Belt',
  description: 'Use a Gear to redirect the signal path.',
  cogsLine:
    'The relay junction requires a non-linear path. A Gear will redirect the signal. Think before you place.',
  gridWidth: 8,
  gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('output', 6, 5),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 2,
};

// ─── Level 2-3: Config Breach ─────────────────────────────────────────────────

pieceCounter = 820;

export const level2_3: LevelDefinition = {
  id: '2-3',
  name: 'Config Breach',
  sector: 'Kepler Belt',
  description: 'The Config Node blocks signals unless configuration is set correctly.',
  cogsLine:
    'The Config Node will only pass the signal when Configuration is active. You need to set it correctly first.',
  gridWidth: 9,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 7, 3),
    prePlaced('configNode', 4, 3, {
      condition: (configuration: number) => configuration === 1,
    }),
  ],
  availablePieces: ['conveyor', 'conveyor', 'configNode'],
  dataTrail: { cells: [1, 0, 1, 0, 1, 0, 1, 0], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 3,
};

// ─── All levels ───────────────────────────────────────────────────────────────

export const AXIOM_LEVELS: LevelDefinition[] = [
  levelA1_1, levelA1_2, levelA1_3, levelA1_4,
  levelA1_5, levelA1_6, levelA1_7, levelA1_8,
];

export const KEPLER_LEVELS: LevelDefinition[] = [level2_1, level2_2, level2_3];

export const ALL_LEVELS: LevelDefinition[] = [...AXIOM_LEVELS, ...KEPLER_LEVELS];

export function getLevelById(id: string): LevelDefinition | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}
