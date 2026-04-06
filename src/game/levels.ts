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
  cogsLine: 'The ship is dark. That is correctable.',
  eyeState: 'blue',
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
  tutorialSteps: [
    {
      id: 'source',
      label: 'SOURCE NODE',
      targetRef: 'sourceNode',
      eyeState: 'blue',
      message: 'This is the Source Node. Every machine on this ship starts here. Signal originates from this point. It is fixed. You work from it.',
      highlightWords: ['Source Node'],
    },
    {
      id: 'output',
      label: 'OUTPUT NODE',
      targetRef: 'outputNode',
      eyeState: 'blue',
      message: 'This is the Output Node. Your objective on every level. Connect a signal path from Source to Output and the circuit locks. Emergency power comes back online.',
      highlightWords: ['Output Node'],
    },
    {
      id: 'conveyor',
      label: 'CONVEYOR',
      targetRef: 'trayConveyor',
      eyeState: 'amber',
      message: 'First piece in your tray. The Conveyor. Before you place it, I am going to show you exactly how it works.',
      highlightAmberWords: ['Conveyor'],
      showDemo: true,
      demoText: 'Signal enters one end. Exits the other. Straight line only. Tap a placed Conveyor to rotate it. Four orientations available.',
      codexEntryId: 'conveyor',
    },
    {
      id: 'board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'amber',
      message: 'Place Conveyors in a straight line between Source and Output. Tap a placed piece to rotate it. The signal follows orientation. Build the path.',
      highlightWords: ['rotate it'],
    },
    {
      id: 'engage',
      label: 'ENGAGE',
      targetRef: 'engageButton',
      eyeState: 'blue',
      message: 'Path is set. Press Engage. The machine runs. Signal reaches Output. Emergency power restored. The Axiom comes back online.',
      highlightWords: ['Engage'],
    },
  ],
};

pieceCounter = 100;

export const levelA1_2: LevelDefinition = {
  id: 'A1-2',
  name: 'Life Support',
  sector: 'axiom',
  description: 'Reroute life support through a non-linear path.',
  cogsLine: 'Life support systems are the priority. Everything else is a secondary concern. Including efficiency.',
  eyeState: 'blue',
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
  tutorialSteps: [
    {
      id: 'gear-intro',
      label: 'GEAR',
      targetRef: 'trayGear',
      eyeState: 'amber',
      message: 'The Gear. The only Physics piece that changes signal direction. It accepts input from any adjacent port and routes the signal outward. This is how a machine bends.',
      highlightAmberWords: ['Gear'],
      showDemo: true,
      demoText: 'Signal enters from any side. Exits in a new direction. Place it at the corner of your path. Tap to rotate and set the output direction.',
      codexEntryId: 'gear',
    },
    {
      id: 'gear-board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'amber',
      message: 'Place the Conveyors to approach the bend. Then use the Gear to redirect. The signal follows the direction the Gear outputs. Plan the corner before placing anything.',
      highlightWords: ['Gear'],
    },
  ],
};

pieceCounter = 200;

export const levelA1_3: LevelDefinition = {
  id: 'A1-3',
  name: 'Navigation Array',
  sector: 'axiom',
  description: 'Activate the logic gate before the signal passes.',
  cogsLine: 'Navigation. Without it we are simply somewhere. With it, we are somewhere specific. The distinction matters.',
  eyeState: 'blue',
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
  tutorialSteps: [
    {
      id: 'confignode-intro',
      label: 'CONFIG NODE',
      targetRef: 'trayConfigNode',
      eyeState: 'amber',
      message: 'The Config Node. The first Protocol piece you will use. It does not carry signal blindly. It reads the current Configuration value and decides whether to pass or block. A gate with a condition.',
      highlightAmberWords: ['Config Node'],
      showDemo: true,
      demoText: 'Signal arrives at the Config Node. The condition is checked. If the Configuration value matches, the gate opens. If it does not, the signal stops here.',
      codexEntryId: 'config_node',
    },
    {
      id: 'confignode-board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The Data Trail on this level sets the Configuration before the signal reaches the gate. Place the Config Node on the path. The condition is already met. The gate will open.',
      highlightWords: ['Config Node', 'Data Trail'],
    },
  ],
};

pieceCounter = 300;

export const levelA1_4: LevelDefinition = {
  id: 'A1-4',
  name: 'Propulsion Core',
  sector: 'axiom',
  description: 'Route the signal through two relay points.',
  cogsLine: 'Propulsion restored means we have choices. Right now we have none. I find that unsatisfactory.',
  eyeState: 'blue',
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
  tutorialSteps: [
    {
      id: 'splitter-intro',
      label: 'SPLITTER',
      targetRef: 'traySplitter',
      eyeState: 'amber',
      message: 'The Splitter. One input, two outputs. Used when the signal needs to reach multiple destinations or when a path must branch. Rarely optimal. Often necessary.',
      highlightAmberWords: ['Splitter'],
      showDemo: true,
      demoText: 'Signal enters one side. Exits from two output ports simultaneously. Both paths must reach their destinations for the machine to complete.',
      codexEntryId: 'splitter',
    },
    {
      id: 'splitter-board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'amber',
      message: 'This route requires two Gears in sequence. Think about the direction the signal exits each Gear before placing the next piece. The path has a heading. Follow it.',
      highlightWords: ['Gears'],
    },
  ],
};

pieceCounter = 400;

export const levelA1_5: LevelDefinition = {
  id: 'A1-5',
  name: 'Communication Array',
  sector: 'axiom',
  description: 'The Scanner reads the Data Trail. Route the signal past it.',
  cogsLine: 'We have been silent for some time. The communication array will address that. Whether anything answers is a separate question.',
  eyeState: 'amber',
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
  tutorialSteps: [
    {
      id: 'scanner-intro',
      label: 'SCANNER',
      targetRef: 'trayScanner',
      eyeState: 'amber',
      message: 'The Scanner. Reads the Data Trail at the current position and sets the Configuration value accordingly. What it reads determines what happens next. This is how the machine becomes aware of its own memory.',
      highlightAmberWords: ['Scanner'],
      showDemo: true,
      demoText: 'The Scanner passes over the Data Trail. The value at that position is read. The Configuration updates. What the machine knows changes mid-execution.',
      codexEntryId: 'scanner',
    },
    {
      id: 'scanner-board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The Scanner reads. The Config Node decides. Connect them in sequence and the path will complete. The order of placement determines the order of execution.',
      highlightWords: ['Scanner', 'Config Node'],
    },
  ],
};

pieceCounter = 500;

export const levelA1_6: LevelDefinition = {
  id: 'A1-6',
  name: 'Sensor Grid',
  sector: 'axiom',
  description: 'Conditional routing with data trail awareness.',
  cogsLine: 'The sensor grid will tell us what is out there. I have some familiarity with what is out there. The grid will confirm it.',
  eyeState: 'blue',
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
  tutorialSteps: [
    {
      id: 'multconfig-board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Multiple Config Nodes on this level. Each one checks the Configuration value independently. The Scanner sets it once. That value must be correct when the signal reaches every gate.',
      highlightWords: ['Config Nodes', 'Scanner'],
    },
    {
      id: 'multconfig-strategy',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Read the full path before placing the first piece. If the Configuration is not set correctly before the first gate, nothing that follows will work. Plan in sequence.',
    },
  ],
};

pieceCounter = 600;

export const levelA1_7: LevelDefinition = {
  id: 'A1-7',
  name: 'Weapons Lock',
  sector: 'axiom',
  description: 'Write to the trail to set the correct value.',
  cogsLine: 'The weapons systems were locked. Not from damage. Someone locked them deliberately. I am noting this as a data point, not a concern.',
  eyeState: 'amber',
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
  tutorialSteps: [
    {
      id: 'transmitter-intro',
      label: 'TRANSMITTER',
      targetRef: 'trayTransmitter',
      eyeState: 'amber',
      message: 'The Transmitter. Writes a value to the Data Trail. Where the Scanner reads, the Transmitter writes. Together they allow a machine to change what it knows mid-execution. The most powerful piece in the catalogue. Also the most dangerous to misplace.',
      highlightAmberWords: ['Transmitter'],
      showDemo: true,
      demoText: 'The Transmitter writes to the Data Trail at its position. Place it before the Scanner on the signal path. The Scanner reads what the Transmitter wrote.',
      codexEntryId: 'transmitter',
    },
    {
      id: 'transmitter-board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'amber',
      message: 'The weapons systems were locked deliberately. The Transmitter sets the condition that unlocks them. Place it before the Config Node on the path. Sequence matters more than position.',
      highlightWords: ['Transmitter', 'Config Node'],
    },
  ],
};

pieceCounter = 700;

export const levelA1_8: LevelDefinition = {
  id: 'A1-8',
  name: 'Bridge Systems',
  sector: 'axiom',
  description: 'Final repair. All systems lead to this moment.',
  cogsLine: 'The bridge is the last system. When it is operational, the ship will be whole again. I have been waiting to say that accurately.',
  eyeState: 'amber',
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
  tutorialSteps: [
    {
      id: 'boss-tray',
      label: 'PIECE TRAY',
      targetRef: 'trayConveyor',
      eyeState: 'blue',
      message: 'The bridge is the last system. All piece types are available. Physics pieces move the signal. Protocol pieces condition it. The methodology built across this sector applies here.',
      highlightWords: ['Physics', 'Protocol'],
    },
    {
      id: 'boss-board',
      label: 'GAME BOARD',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'No single piece solves this. Place them in the right sequence and the bridge comes online. The Axiom has been waiting for this.',
    },
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
