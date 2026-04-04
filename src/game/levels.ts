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
  sector: 'axiom',
  description: 'Restore emergency power by connecting Source to Output.',
  cogsLine: 'Main power conduit is severed. Four relay points between Source and Output. Connect them.',
  gridWidth: 8,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 6, 3),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Emergency Power',
  budget: 0,
  scoringCategoriesVisible: ['efficiency'],
  tutorialHints: [
    { key: 'a11_select', trigger: 'onMount', text: 'Tap a piece in the tray to select it. Then tap the grid to place it between Source and Output.' },
    { key: 'a11_engage', trigger: 'onFirstPiecePlaced', text: 'Piece placed. Tap ENGAGE MACHINE to fire the signal.' },
    { key: 'a11_void', trigger: 'onVoid', text: 'The signal could not reach Output. Check your connections.' },
    { key: 'a11_success', trigger: 'onSuccess', text: 'Emergency power restored. Source to Output. That is how every machine works.' },
  ],
};

pieceCounter = 100;

export const levelA1_2: LevelDefinition = {
  id: 'A1-2',
  name: 'Life Support',
  sector: 'axiom',
  description: 'Reroute life support through a non-linear path.',
  cogsLine: 'Life support requires a non-linear path. The Gear will redirect the signal.',
  gridWidth: 8,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('output', 5, 4),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5,
  systemRepaired: 'Life Support',
  budget: 10,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity'],
  tutorialHints: [
    { key: 'a12_gear', trigger: 'onMount', text: 'Source and Output are not aligned. A Gear redirects the signal. Plan your path before placing.' },
    { key: 'a12_integrity', trigger: 'onSuccess', text: 'Chain Integrity: every piece you place should carry the signal. Pieces the signal skips cost points.' },
  ],
};

pieceCounter = 200;

export const levelA1_3: LevelDefinition = {
  id: 'A1-3',
  name: 'Navigation Array',
  sector: 'axiom',
  description: 'Activate the logic gate before the signal passes.',
  cogsLine: 'The navigation array has a logic gate. Configuration must be active before the signal can pass.',
  gridWidth: 9,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 7, 3),
    prePlaced('configNode', 4, 3, { condition: (c: number) => c === 1 }),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'configNode'],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Navigation Array',
  budget: 20,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  tutorialHints: [
    { key: 'a13_protocol', trigger: 'onMount', text: 'The amber piece is a Config Node — a Protocol piece. Protocol pieces think. Physics pieces move.' },
    { key: 'a13_config', trigger: 'onMount', text: 'The Config Node only passes the signal when conditions are met. Connect the pieces. It handles the logic.' },
    { key: 'a13_precision', trigger: 'onSuccess', text: 'Protocol Precision: Protocol pieces touched by the signal score higher. Use them well.' },
  ],
};

pieceCounter = 300;

export const levelA1_4: LevelDefinition = {
  id: 'A1-4',
  name: 'Propulsion Core',
  sector: 'axiom',
  description: 'Route the signal through two relay points.',
  cogsLine: 'Propulsion core requires routing through two relay points. Plan the path before placing.',
  gridWidth: 9,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 6, 2),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5,
  systemRepaired: 'Propulsion Core',
  budget: 20,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  tutorialHints: [
    { key: 'a14_chain', trigger: 'onMount', text: 'Propulsion needs a longer path. Every piece you place should carry the signal. Nothing wasted.' },
    { key: 'a14_remove', trigger: 'onVoid', text: 'Remove any piece the signal did not reach. Dead weight costs points.' },
  ],
};

pieceCounter = 400;

export const levelA1_5: LevelDefinition = {
  id: 'A1-5',
  name: 'Communication Array',
  sector: 'axiom',
  description: 'The Scanner reads the Data Trail. Route the signal past it.',
  cogsLine: 'The communication array reads the Data Trail. The Scanner is already in position.',
  gridWidth: 9,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('output', 7, 2),
    prePlaced('scanner', 4, 2),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'configNode'],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Communication Array',
  budget: 25,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  tutorialHints: [
    { key: 'a15_trail', trigger: 'onMount', text: 'The Data Trail at the bottom is signal memory. The Scanner reads it cell by cell as the machine runs.' },
    { key: 'a15_scanner', trigger: 'onMount', text: 'The Scanner is placed. Connect it into the path. It reads automatically when you engage.' },
  ],
};

pieceCounter = 500;

export const levelA1_6: LevelDefinition = {
  id: 'A1-6',
  name: 'Sensor Grid',
  sector: 'axiom',
  description: 'Conditional routing with data trail awareness.',
  cogsLine: 'Sensor grid requires conditional routing. Read the trail carefully before placing.',
  gridWidth: 10,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 8, 3),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'configNode', 'configNode'],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Sensor Grid',
  budget: 40,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  tutorialHints: [
    { key: 'a16_multi', trigger: 'onMount', text: 'Multiple Config Nodes. Each reads the trail and decides whether to pass the signal. Study the trail first.' },
    { key: 'a16_void', trigger: 'onVoid', text: 'A Config Node blocked the signal. The trail value there did not match. Rethink the sequence.' },
  ],
};

pieceCounter = 600;

export const levelA1_7: LevelDefinition = {
  id: 'A1-7',
  name: 'Weapons Lock',
  sector: 'axiom',
  description: 'Write to the trail to set the correct value.',
  cogsLine: 'Weapons lock requires writing to the trail. The Transmitter will set the correct value.',
  gridWidth: 10,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 8, 3),
    prePlaced('scanner', 4, 3),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'transmitter', 'configNode', 'configNode'],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Weapons Lock',
  budget: 40,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  tutorialHints: [
    { key: 'a17_transmitter', trigger: 'onMount', text: 'The Transmitter writes to the Data Trail. Scanner reads. Together they change what Config Nodes see. The machine can think.' },
    { key: 'a17_sequence', trigger: 'onFirstPiecePlaced', text: 'Position the Transmitter so it fires before the next Config Node reads the trail. Sequence matters.' },
  ],
};

pieceCounter = 700;

export const levelA1_8: LevelDefinition = {
  id: 'A1-8',
  name: 'Bridge Systems',
  sector: 'axiom',
  description: 'Final repair. All systems lead to this moment.',
  cogsLine: 'Bridge systems. This is the final repair. Every system we have restored leads to this moment.',
  gridWidth: 11,
  gridHeight: 9,
  prePlacedPieces: [
    prePlaced('source', 1, 4),
    prePlaced('output', 9, 4),
  ],
  availablePieces: [
    'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor',
    'gear', 'gear',
    'scanner',
    'transmitter',
    'configNode', 'configNode', 'configNode',
  ],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 6,
  systemRepaired: 'Bridge Systems',
  budget: 60,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus'],
  tutorialHints: [
    { key: 'a18_boss', trigger: 'onMount', text: 'Bridge systems. Every piece you have learned is in play. This is what the Axiom needs.' },
    { key: 'a18_scoring', trigger: 'onMount', text: 'Your full score is now visible: Efficiency, Protocol, Integrity, Discipline, Speed. Three stars is the goal.' },
    { key: 'a18_discipline', trigger: 'onMount', text: 'Your discipline shapes your bonus. Play to your strengths — but every path to three stars is open.' },
    { key: 'a18_speed', trigger: 'onEngage', text: 'Timer running. Decisive solutions score higher.' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR 1: KEPLER BELT
// ═══════════════════════════════════════════════════════════════════════════════
//
// CONSEQUENCE LEVEL DESIGN RULES:
// - K2-4, K2-8: standard consequence. Any completion (1+ stars) avoids penalty.
// - K2-10 (boss): requireThreeStars. 1-2 stars triggers consequence.
// - COGS pre-launch lines are weight only, no specifics:
//     K2-4:  "Pay attention to this one."
//     K2-8:  "This mission matters more than most. That is all."
//     K2-10: "Do not fail here. I will not elaborate."
// - No Shield purchase, no MISSION RISK section, no repair cost preview.
// - Node visual: copper pulsing ring, no tooltip/label explaining risk.
// - On failure: dramatic consequence reveal (ship zone darkens, COGS eyes shift).
//
// FREE PIECE SET GUARANTEE:
// Every consequence level's availablePieces array MUST be verified solvable
// at 3 stars without spending any credits. The solve path exists.
// Credits are emergency only — for reactive in-level spending when stuck.

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

// ─── Repair Puzzles (consequence-triggered) ──────────────────────────────────

pieceCounter = 900;

// Triggered by Kepler boss consequence — propulsion surge damage
export const repairPropulsionSurge: LevelDefinition = {
  id: 'REPAIR-PROP-SURGE',
  name: 'Propulsion Core Emergency Restart',
  sector: 'kepler',
  description: 'The colonists jury-rigged the propulsion routing. Undo the damage.',
  cogsLine: 'The surge damaged the propulsion routing. The colonists\' wiring is now in the mix. This will be more complex than a standard repair.',
  gridWidth: 9,
  gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 8, 3),
    prePlaced('configNode', 4, 3, { condition: (c: number) => c === 1 }),
    prePlaced('scanner', 6, 3),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear', 'transmitter'],
  dataTrail: { cells: [1, 0, 1, 0, 1, 1, 0, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  budget: 40,
  systemRepaired: 'Propulsion Core',
};

pieceCounter = 910;

// Triggered by Nova Fringe pirate consequence — hyperdrive damage
export const repairHyperdrive: LevelDefinition = {
  id: 'REPAIR-HYPERDRIVE',
  name: 'Hyperdrive Restart Sequence',
  sector: 'nova',
  description: 'The pirates disabled the hyperdrive routing. Full Protocol coordination required.',
  cogsLine: 'The pirates disabled the hyperdrive routing before they left. Thorough of them. The restart sequence requires full Protocol coordination.',
  gridWidth: 9,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 1, 3),
    prePlaced('output', 8, 3),
    prePlaced('scanner', 3, 3),
    prePlaced('scanner', 6, 4),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'configNode', 'configNode', 'transmitter', 'transmitter'],
  dataTrail: { cells: [1, 1, 0, 1, 0, 0, 1, 1], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5,
  budget: 50,
  systemRepaired: 'Propulsion Core',
};

// ─── All levels ───────────────────────────────────────────────────────────────

export const AXIOM_LEVELS: LevelDefinition[] = [
  levelA1_1, levelA1_2, levelA1_3, levelA1_4,
  levelA1_5, levelA1_6, levelA1_7, levelA1_8,
];

export const KEPLER_LEVELS: LevelDefinition[] = [level2_1, level2_2, level2_3];

export const REPAIR_LEVELS: LevelDefinition[] = [repairPropulsionSurge, repairHyperdrive];

export const ALL_LEVELS: LevelDefinition[] = [...AXIOM_LEVELS, ...KEPLER_LEVELS, ...REPAIR_LEVELS];

export function getLevelById(id: string): LevelDefinition | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}
