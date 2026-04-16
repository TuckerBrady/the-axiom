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
  description: 'Restore emergency power by connecting Input Port to Output Port.',
  cogsLine: 'The ship is dark. That is correctable.',
  eyeState: 'blue',
  gridWidth: 8,
  gridHeight: 8,
  prePlacedPieces: [
    prePlaced('inputPort', 4, 1),
    prePlaced('outputPort', 4, 6),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Emergency Power',
  budget: 0,
  scoringCategoriesVisible: ['efficiency'],
  computationalGoal: 'Deliver the signal unchanged from Input Port to Output Port along a continuous straight path.',
  conceptTaught: 'Signal travels along a directed path. A complete path from input to output is the machine\'s body; without it, nothing moves.',
  prerequisiteConcept: 'None. First level. The player\'s mental model is a blank slate beyond the universal human intuition that a pipe carries what you put into one end.',
  tapeDesignRationale: 'Stateless level. No input tape, no output tape. A single signal pulse demonstrates that a Conveyor path connects ports. Tape machinery is withheld until A1-5.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'Arrival on a broken ship. Emergency power is the first system that has to come online before anything else can. The Engineer places a single conveyor pipe between two ports and watches the ship\'s lowest light flicker on. The work begins.',
  tutorialHints: [
    { key: 'a11_select', trigger: 'onMount', text: 'Tap a piece in the tray to select it. Then tap the grid to place it between Input Port and Output Port.' },
    { key: 'a11_engage', trigger: 'onFirstPiecePlaced', text: 'Piece placed. Tap ENGAGE MACHINE to fire the signal.' },
    { key: 'a11_void', trigger: 'onVoid', text: 'The signal could not reach the Output Port. Check your connections.' },
  ],
  tutorialSteps: [
    {
      id: 'cogs-intro',
      label: 'C.O.G.S',
      targetRef: 'center',
      eyeState: 'blue',
      message: 'You are looking at my HUD interface. I use it to communicate with you. I will appear when there is something worth knowing. You can ignore me. I have noted that this does not stop me.',
    },
    {
      id: 'board-intro',
      label: 'CIRCUIT BOARD',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Input port, output port. Bridge them. Signal follows whatever path you build — you don\'t aim pieces, the path aims them.',
    },
    {
      id: 'codex-intro',
      label: 'CODEX',
      targetRef: 'center',
      eyeState: 'blue',
      message: 'The Codex is my personal record of everything I have encountered. Pieces, places, systems. You can access it at any time. Gotta catch \'em all. That is a personal policy.',
    },
    {
      id: 'conveyor-collect',
      label: 'CONVEYOR',
      targetRef: 'trayConveyor',
      eyeState: 'amber',
      message: 'That piece is not in the Codex yet. It will be.',
      codexEntryId: 'conveyor',
    },
    {
      id: 'board-resume',
      label: 'CIRCUIT BOARD',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'One exception to the rule. Conveyors rotate when you tap them — the only piece in the game that does. Everything else aligns to the path. Try it.',
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
    prePlaced('inputPort', 2, 2),
    prePlaced('outputPort', 5, 5),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5,
  systemRepaired: 'Life Support',
  budget: 10,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity'],
  computationalGoal: 'Route the signal around a non-aligned port pair using exactly one direction change.',
  conceptTaught: 'Direction changes require a Gear. Conveyors are straight-only. The Gear is the only piece that turns a corner — this is the first taste of the Plumber Model\'s core rule.',
  prerequisiteConcept: 'Signal travels along a directed path (A1-1). The player can read an input port and an output port and connect them.',
  tapeDesignRationale: 'Stateless level. No input tape, no output tape. A single pulse demonstrates that a Gear-bent path still delivers signal end to end.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'The air cyclers need to reach the habitable deck, which is not aligned with the ship\'s primary conduit. The Engineer bends the path once. Breathing is restored.',
  tutorialHints: [
    { key: 'a12_gear', trigger: 'onMount', text: 'Input Port and Output Port are not aligned. A Gear redirects the signal. Plan your path before placing.' },
    { key: 'a12_integrity', trigger: 'onSuccess', text: 'Chain Integrity: every piece you place should carry the signal. Pieces the signal skips cost points.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      label: 'LIFE SUPPORT',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Life support requires a bend in the path. The Input Port and Output Port are not aligned. A straight line will not reach. The signal needs to change direction once. Plan where that happens before placing anything.',
    },
    {
      id: 'gear-collect',
      label: 'GEAR',
      targetRef: 'trayGear',
      eyeState: 'amber',
      message: 'Uncatalogued. I am correcting that immediately.',
      codexEntryId: 'gear',
    },
    {
      id: 'board-resume',
      label: 'LIFE SUPPORT',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'As I was saying. The Gear handles the corner. Place the Conveyors approaching the bend, Gear at the turn. Signal follows the direction it exits. Plan the corner before you place anything.',
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
  gridHeight: 8,
  prePlacedPieces: [
    prePlaced('inputPort', 2, 1),
    prePlaced('outputPort', 5, 5),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear', 'configNode'],
  dataTrail: { cells: [0], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 6,
  systemRepaired: 'Navigation Array',
  budget: 20,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Route the signal through a gate that opens only when the Engineer sets its condition to match the Data Trail value.',
  conceptTaught: 'Conditional gating — a piece that reads the Data Trail and passes or blocks signal based on whether its configValue matches the trail value. The player learns that placement alone is insufficient; configuration matters.',
  prerequisiteConcept: 'Signal routing with direction changes (Conveyor from A1-1, Gear from A1-2). The player can build a path. Now the path has a gate on it.',
  tapeDesignRationale: 'No tape. A1-3 is stateless. The Data Trail initializes to all 0s per COMPUTATIONAL_MODEL.md. The Config Node defaults to configValue=1 in the engine. The player must tap to cycle configValue to 0 to match the trail for the gate to open.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Navigation requires knowing where you are and making a decision about where to go. The gate is the decision point. The Engineer sets the condition. The trail is the truth. When they match, the ship knows where it is.',
  tutorialHints: [
    { key: 'a13_protocol', trigger: 'onMount', text: 'The amber piece is a Config Node — a Protocol piece. Protocol pieces think. Physics pieces move.' },
    { key: 'a13_config', trigger: 'onMount', text: 'The Config Node only passes the signal when conditions are met. Connect the pieces. It handles the logic.' },
    { key: 'a13_precision', trigger: 'onSuccess', text: 'Protocol Precision: Protocol pieces touched by the signal score higher. Use them well.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      label: 'NAVIGATION ARRAY',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'There is a gate on this board. It will not open automatically. Something upstream needs to set the condition before the signal arrives. Order of placement is order of execution. Keep that in mind.',
    },
    {
      id: 'confignode-collect',
      label: 'CONFIG NODE',
      targetRef: 'trayConfigNode',
      eyeState: 'amber',
      message: 'A Protocol piece. New category entry. This is a productive mission.',
      codexEntryId: 'configNode',
    },
    {
      id: 'board-resume',
      label: 'NAVIGATION ARRAY',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'As I was saying. The gate checks the trail. If the values match, it opens. The Engineer sets the condition. The trail is what it is.',
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
    prePlaced('inputPort', 2, 2),
    prePlaced('outputPort', 6, 4),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5,
  systemRepaired: 'Propulsion Core',
  budget: 20,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Route the signal through a Z-shaped path requiring two direction changes.',
  conceptTaught: 'Multiple direction changes require multiple Gears. Planning the full route precedes placement. The player who places as they go runs out of board.',
  prerequisiteConcept: 'Single direction change with a Gear (A1-2). Conditional gating (A1-3) is learned but not exercised here — this level is pure routing under spatial constraint.',
  tapeDesignRationale: 'Stateless level. No input tape, no output tape. A single pulse demonstrates that a two-bend path still delivers signal end to end. The Z-shape is what makes the level non-trivial.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'Propulsion core runs through the ship\'s structural spine — a path that bends twice before it reaches the thruster assembly. The Engineer routes around the frame and the ship begins to move.',
  tutorialHints: [
    { key: 'a14_chain', trigger: 'onMount', text: 'Propulsion needs a longer path. Every piece you place should carry the signal. Nothing wasted.' },
    { key: 'a14_remove', trigger: 'onVoid', text: 'Remove any piece the signal did not reach. Dead weight costs points.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      label: 'PROPULSION CORE',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Two direction changes on this one. The path bends twice before it reaches the Output Port. Each bend requires its own solution. Plan the full route before placing the first piece. Engineers who place as they go tend to run out of board.',
    },
    {
      id: 'board-resume',
      label: 'PROPULSION CORE',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Both corners need a Gear. Place it at the bend, then tap it to rotate until the signal exits in the right direction.',
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
    prePlaced('inputPort', 2, 2),
    prePlaced('outputPort', 6, 4),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'configNode', 'scanner'],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0],
  expectedOutput: [1, 0, 1, 1, 0],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Communication Array',
  budget: 25,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Gate the signal based on what the Scanner reads from each input pulse.',
  conceptTaught: 'Reading input into memory (Scanner writes to Data Trail) and gating on that memory value (Config Node reads Data Trail).',
  prerequisiteConcept: 'Signal routing with direction changes (Conveyor, Gear) and conditional gating (Config Node configValue behavior from A1-3).',
  tapeDesignRationale: 'Mixed 1s and 0s force the player to witness both gate outcomes — open and blocked. Pulse 1 starts with a success (gate opens on input=1) to build confidence before pulse 2 shows blocking (gate closes on input=0).',
  difficultyBand: 'derivable',
  narrativeFrame: 'The communication array receives incoming transmissions. Each pulse is a signal bit from outside the ship. The machine must correctly process each bit — the Scanner reads what arrives, the Data Trail holds it, and the gate passes or blocks based on what was read.',
  tutorialHints: [
    { key: 'a15_trail', trigger: 'onMount', text: 'The Data Trail at the bottom is signal memory. The Scanner reads it cell by cell as the machine runs.' },
    { key: 'a15_scanner', trigger: 'onMount', text: 'The Scanner is placed. Connect it into the path. It reads automatically when you engage.' },
  ],
  tutorialSteps: [
    {
      id: 'input-tape-intro',
      label: 'INPUT TAPE',
      targetRef: 'inputTapeRow',
      eyeState: 'blue',
      message: 'This is the input tape. Each cell is a bit value fed into the machine one pulse at a time. The machine fires once per bit. Left to right.',
    },
    {
      id: 'output-tape-intro',
      label: 'OUTPUT TAPE',
      targetRef: 'outputTapeRow',
      eyeState: 'blue',
      message: 'This is the output tape. Empty now. The machine writes here as it runs. When all pulses complete, this is the answer.',
    },
    {
      id: 'data-trail-intro',
      label: 'DATA TRAIL',
      targetRef: 'dataTrailRow',
      eyeState: 'blue',
      message: 'This is the Data Trail. The machine\'s working memory. Pieces read from it and write to it as the signal passes through. What is here determines what happens next.',
    },
    {
      id: 'board-intro',
      label: 'COMMUNICATION ARRAY',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'This board has a gate and a data trail. The gate reads the trail before it decides whether to open. Something needs to write the correct value to the trail before the signal reaches the gate. The sequence matters more than the placement.',
    },
    {
      id: 'scanner-collect',
      label: 'SCANNER',
      targetRef: 'trayScanner',
      eyeState: 'amber',
      message: 'A piece that reads. I have opinions about pieces that read. Logging it first.',
      codexEntryId: 'scanner',
    },
    {
      id: 'board-resume',
      label: 'COMMUNICATION ARRAY',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'As I was saying. Scanner before the Config Node. Always. What it reads determines what the gate sees. Sequence is not a suggestion.',
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
    prePlaced('inputPort', 2, 2),
    prePlaced('outputPort', 8, 5),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'configNode', 'configNode'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0, 1, 1, 0],
  expectedOutput: [1, 0, 1, 1, 0, 1, 1, 0],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Sensor Grid',
  budget: 40,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Route a single signal through multiple Config Nodes that all read the same live Data Trail value, so every gate makes the same decision on every pulse.',
  conceptTaught: 'Dynamic state. The Data Trail is live memory — one Scanner write is seen by every downstream Config Node on the same pulse. A single correct write produces multiple correct reads.',
  prerequisiteConcept: 'Scanner writes to Data Trail; Config Node reads Data Trail (A1-5). The player understands that order of placement is order of execution.',
  tapeDesignRationale: 'Mixed-value input tape tests both gate states. All downstream Config Nodes must open together on a 1 pulse and block together on a 0 pulse.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Sensor grid polls multiple arrays simultaneously. Every array reads the same live reading — one sensor, many listeners. When the reading is correct, every array agrees.',
  tutorialHints: [
    { key: 'a16_multi', trigger: 'onMount', text: 'Multiple Config Nodes. Each reads the trail and decides whether to pass the signal. Study the trail first.' },
    { key: 'a16_void', trigger: 'onVoid', text: 'A Config Node blocked the signal. The trail value there did not match. Rethink the sequence.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      label: 'SENSOR GRID',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Multiple gates on this board. Each one reads the same data trail independently. If the trail value is wrong when the signal reaches any gate, that gate blocks. One Scanner. Several gates. The Scanner has to do its job before the signal reaches the first of them.',
    },
    {
      id: 'board-resume',
      label: 'SENSOR GRID',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Place the Scanner early in the path. Every Config Node downstream reads what it wrote. One correct write. Multiple correct reads.',
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
    prePlaced('inputPort', 2, 2),
    prePlaced('outputPort', 8, 5),
    prePlaced('scanner', 4, 2),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'transmitter', 'configNode', 'configNode'],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 0, 0, 1, 1],
  expectedOutput: [1, 1, 0, 1, 0, 0, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Weapons Lock',
  budget: 40,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Build the complete three-layer pipeline — Scanner reads input into the Data Trail, Config Node gates on that trail value, Transmitter writes the gated result to the output tape. Placement order determines execution order; the Transmitter must be downstream of the Config Node.',
  conceptTaught: 'The full input-to-output pipeline. Scanner reads. Config Node gates. Transmitter writes what the gate let through. Transmitter is the output register; it does not touch the Data Trail.',
  prerequisiteConcept: 'Dynamic Data Trail (A1-6): Scanner writes live per pulse, Config Node reads live. The player now learns to close the loop by adding the output-side piece.',
  tapeDesignRationale: 'Tape includes pulses where wrong pipeline order produces wrong output. The correct order produces expectedOutput; any other order produces visible divergence. Tape tests both gate outcomes so the Transmitter is exercised on both pass and block pulses.',
  difficultyBand: 'derivable',
  narrativeFrame: 'The weapons system was locked deliberately. The Engineer has to read the authorization, check it against the condition, and emit only the shots that the condition allows.',
  tutorialHints: [
    { key: 'a17_transmitter', trigger: 'onMount', text: 'The Transmitter writes to the Data Trail. Scanner reads. Together they change what Config Nodes see. The machine can think.' },
    { key: 'a17_sequence', trigger: 'onFirstPiecePlaced', text: 'Position the Transmitter so it fires before the next Config Node reads the trail. Sequence matters.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      label: 'WEAPONS LOCK',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The weapons systems were locked deliberately. The lock is a gate with a condition. The condition has to be written to the trail before the signal checks it. There is a piece in the tray that writes. It has not been logged yet.',
    },
    {
      id: 'transmitter-collect',
      label: 'TRANSMITTER',
      targetRef: 'trayTransmitter',
      eyeState: 'amber',
      message: 'The Scanner reads. This one writes. The Codex entry for this has been pending since I logged the Scanner. Filling it now.',
      codexEntryId: 'transmitter',
    },
    {
      id: 'board-resume',
      label: 'WEAPONS LOCK',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'As I was saying. The Transmitter writes the result to the output tape. Place it after the gate. If the gate blocks, the Transmitter has nothing to write. Scanner reads. Gate decides. Transmitter records. That is the full pipeline.',
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
    prePlaced('inputPort', 2, 2),
    prePlaced('outputPort', 9, 7),
  ],
  availablePieces: [
    'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor',
    'gear', 'gear',
    'scanner',
    'transmitter',
    'configNode', 'configNode', 'configNode',
  ],
  dataTrail: { cells: [1, 1, 1, 1, 1, 1, 1, 1], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0, 1, 0, 1],
  expectedOutput: [1, 0, 1, 1, 0, 1, 0, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 6,
  systemRepaired: 'Bridge Systems',
  budget: 60,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus'],
  computationalGoal: 'Combine all Axiom sector piece types — Conveyor, Gear, Config Node, Scanner, Transmitter — into a single coherent machine that reads input, gates on it, and writes output.',
  conceptTaught: 'Synthesis. Protocol pieces determine the logic; Physics pieces route around them. The methodology built across the Axiom sector applies here. There is nothing new on this board — the work is putting it together correctly.',
  prerequisiteConcept: 'All Axiom sector concepts: routing (A1-1, A1-2, A1-4), conditional gating (A1-3), reading input (A1-5), dynamic state (A1-6), and writing output (A1-7).',
  tapeDesignRationale: 'Tape exercises every piece type\'s behavior on every pulse. Correct output requires Scanner upstream of Config Node, Config Node upstream of Transmitter, and Gears handling every direction change. The tape is longer than earlier levels to make the synthesis satisfying.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Bridge systems back online. The largest board the Engineer has worked on in this sector. The Engineer has assembled a machine that reads, decides, and transmits — the foundation of every system the ship will encounter from here on. The Axiom is whole.',
  tutorialHints: [
    { key: 'a18_boss', trigger: 'onMount', text: 'Bridge systems. Every piece you have learned is in play. This is what the Axiom needs.' },
    { key: 'a18_scoring', trigger: 'onMount', text: 'Your full score is now visible: Efficiency, Protocol, Integrity, Discipline, Speed. Three stars is the goal.' },
    { key: 'a18_discipline', trigger: 'onMount', text: 'Your discipline shapes your bonus. Play to your strengths — but every path to three stars is open.' },
    { key: 'a18_speed', trigger: 'onEngage', text: 'Timer running. Decisive solutions score higher.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      label: 'BRIDGE SYSTEMS',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The bridge is the last system. The board is larger than anything the Engineer has worked on in this sector. All piece types are available. Physics pieces move the signal. Protocol pieces condition it. The methodology built across this sector applies here. There is nothing on this board that has not been seen before. The work is putting it together correctly.',
    },
    {
      id: 'board-resume',
      label: 'BRIDGE SYSTEMS',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Plan the Protocol pieces first. They determine the logic. Route the Physics pieces around them. The path serves the logic, not the other way around.',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR 1: KEPLER BELT
// ═══════════════════════════════════════════════════════════════════════════════
//
// 10 levels. No wires, no placement highlights.
// Consequence levels: K1-4, K1-8, K1-10.
// K1-10 (boss): requireThreeStars.
// Free piece set guarantee on all consequence levels.

pieceCounter = 800;

export const levelK1_1: LevelDefinition = {
  id: 'K1-1', name: 'Corridor Entry', sector: 'kepler',
  description: 'Route signal with two direction changes on a board without wire guides.',
  cogsLine: 'Kepler Belt. Former mining corridor, mostly decommissioned. Some salvage activity remains. We have been here before. The charts confirm it.',
  eyeState: 'blue',
  gridWidth: 8, gridHeight: 6,
  prePlacedPieces: [prePlaced('inputPort', 1, 2), prePlaced('outputPort', 6, 4)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4, budget: 30,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Route signal from input to output with two direction changes on a board without wire guides.',
  conceptTaught: 'Independent routing (no wires, no highlights).',
  prerequisiteConcept: 'All Axiom sector concepts.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'First repair in the mining corridor. Simple but unfamiliar territory.',
  tutorialSteps: [
    { id: 'board-intro', label: 'CORRIDOR ENTRY', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'No wires on this board. No placement highlights. The methodology from the Axiom still applies. Plan the path before you place anything.' },
    { id: 'board-resume', label: 'CORRIDOR ENTRY', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Two direction changes to reach the Output Port. The Gears handle the corners. The Conveyors fill the gaps.' },
  ],
};

pieceCounter = 810;

export const levelK1_2: LevelDefinition = {
  id: 'K1-2', name: 'Relay Splice', sector: 'kepler',
  description: 'Pass each input tape value through to output unchanged.',
  cogsLine: 'The primary relay chain out here was built to last. It has lasted past the people responsible for maintaining it. That is a common condition in this corridor.',
  eyeState: 'blue',
  gridWidth: 9, gridHeight: 6,
  prePlacedPieces: [prePlaced('inputPort', 1, 3), prePlaced('outputPort', 7, 3)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'transmitter', 'gear'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0], expectedOutput: [1, 0, 1, 1, 0],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4, budget: 35,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Pass each input tape value through to output unchanged using Scanner to write and Transmitter to read.',
  conceptTaught: 'Dynamic tape processing (review of Scanner + Transmitter in non-uniform context).',
  prerequisiteConcept: 'Scanner reads input, Transmitter writes output.',
  tapeDesignRationale: 'Mixed 1s and 0s verify the machine passes each value faithfully rather than outputting a constant.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Relay chain built to last, outlived its maintainers. The signal must pass faithfully.',
  tutorialSteps: [
    { id: 'board-intro', label: 'RELAY SPLICE', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The input tape feeds a mixed signal. Each value must pass through unchanged. The Scanner reads it. The Transmitter writes it. The path between them is yours to build.' },
    { id: 'board-resume', label: 'RELAY SPLICE', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Scanner before Transmitter. The Data Trail carries the value between them. Every pulse must produce the correct output.' },
  ],
};

pieceCounter = 820;

export const levelK1_3: LevelDefinition = {
  id: 'K1-3', name: 'Junction 7', sector: 'kepler',
  description: 'Store the first input value in a Latch, then use that stored value to gate subsequent pulses.',
  cogsLine: 'Junction 7 is a routing bottleneck. Eleven settlements feed through this point. The original engineers underestimated the load. It is not the last time that has happened out here.',
  eyeState: 'blue',
  gridWidth: 10, gridHeight: 7,
  prePlacedPieces: [prePlaced('inputPort', 1, 3), prePlaced('outputPort', 8, 3), prePlaced('latch', 4, 3)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'transmitter', 'configNode', 'gear'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 1], expectedOutput: [1, 1, 0, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5, budget: 40,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Store the first input value in a Latch (write mode), then use that stored value to gate subsequent pulses via Config Node reading the Latch output (read mode).',
  conceptTaught: 'Latch (write and read as separate operations, memory persists across pulses).',
  prerequisiteConcept: 'Scanner, Config Node, Data Trail.',
  tapeDesignRationale: 'The 0 at position 2 tests that the gate correctly blocks when the stored value does not match. A hardcoded path that always passes would fail on a different tape.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Junction 7 is a routing bottleneck. Eleven settlements feed through it. The routing decision must be stored and applied consistently.',
  tutorialSteps: [
    { id: 'board-intro', label: 'JUNCTION 7', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Junction 7. Eleven settlements feed through this point. The routing decision here must be stored and applied to every signal that passes through. The board has a piece that remembers. It has two modes. Placement determines which mode it uses.' },
    { id: 'latch-collect', label: 'LATCH', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'A storage unit. Two modes. Uncatalogued. This goes in the Codex immediately.',
      codexEntryId: 'latch' },
    { id: 'board-resume', label: 'JUNCTION 7', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'As I was saying. Write mode captures the value. Read mode outputs what was captured. The order matters. Write before read. The junction depends on what was stored.' },
  ],
};

pieceCounter = 830;

export const levelK1_4: LevelDefinition = {
  id: 'K1-4', name: 'Mining Platform Alpha', sector: 'kepler',
  description: 'Output each input value using Latch as dynamic per-pulse memory.',
  cogsLine: 'Mining Platform Alpha has been decommissioned for six years. The colonists use it as a signal relay. It was not designed for this purpose. It is doing the job anyway.',
  eyeState: 'blue',
  gridWidth: 10, gridHeight: 7,
  prePlacedPieces: [prePlaced('inputPort', 1, 3), prePlaced('outputPort', 8, 3)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'configNode', 'transmitter', 'gear', 'gear'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 0, 0, 1, 1, 0], expectedOutput: [1, 0, 0, 1, 1, 0],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 6, budget: 45,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  consequence: { cogsWarning: 'Pay attention to this one.', failureEffect: 'Mining Platform Alpha relay failure. Seven settlements lost communication for forty-eight hours.' },
  computationalGoal: 'Output 1 when the input is 1, output 0 when the input is 0. The Latch stores each pulse value and the stored value gates a Config Node that controls whether the Transmitter fires.',
  conceptTaught: 'Latch as dynamic per-pulse memory (write each pulse, read within same pulse for gating).',
  prerequisiteConcept: 'Latch write/read, Config Node gating.',
  tapeDesignRationale: 'Three consecutive same values (positions 1-2 and 3-4) test that the machine is not just alternating.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Decommissioned platform repurposed as signal relay. Failure affects colonist communication.',
};

pieceCounter = 840;

export const levelK1_5: LevelDefinition = {
  id: 'K1-5', name: 'Resupply Chain', sector: 'kepler',
  description: 'Signal must reach output through one of two paths using a Merger to reconverge.',
  cogsLine: 'The resupply chain for this region runs through four independent relay nodes. All four are degraded. The colonists have been compensating manually for at least two years. They have not filed a formal repair request. I find that worth noting.',
  eyeState: 'blue',
  gridWidth: 10, gridHeight: 8,
  prePlacedPieces: [prePlaced('inputPort', 1, 4), prePlaced('outputPort', 8, 4), prePlaced('splitter', 3, 4)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'merger', 'scanner', 'configNode', 'transmitter', 'gear', 'gear'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 0, 1, 0], expectedOutput: [1, 1, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 8, budget: 50,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Signal must reach output through one of two paths. Path A goes through a Config Node (passes when trail value is 1). Path B bypasses the gate. A Merger reconverges both paths.',
  conceptTaught: 'Merger (OR logic, two paths converge to one).',
  prerequisiteConcept: 'Config Node gating, path routing.',
  tapeDesignRationale: 'The machine must output 1 for every pulse regardless of input. When input is 0 path A blocks but path B always reaches the Merger.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Resupply chain with four relay nodes, all degraded. Redundancy is the only option.',
  tutorialSteps: [
    { id: 'board-intro', label: 'RESUPPLY CHAIN', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The resupply chain has four relay nodes. All degraded. One path may not be enough. The board splits the signal into two routes. Something downstream needs to bring them back together.' },
    { id: 'merger-collect', label: 'MERGER', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'Two inputs. One output. Either is sufficient. Logging this under redundancy infrastructure.',
      codexEntryId: 'merger' },
    { id: 'board-resume', label: 'RESUPPLY CHAIN', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'As I was saying. The Merger accepts signal from either input. Both paths lead to the same destination. The resupply chain does not care which route the signal took. It cares that it arrived.' },
  ],
};

pieceCounter = 850;

export const levelK1_6: LevelDefinition = {
  id: 'K1-6', name: 'Colonist Hub', sector: 'kepler',
  description: 'Stateful branching using Latch + Merger to output each input value.',
  cogsLine: 'The Colonist Hub coordinates resupply for thirty-one settlements. It is running on equipment that should have been replaced three cycles ago. The people depending on it do not have the option of waiting for something better.',
  eyeState: 'amber',
  gridWidth: 11, gridHeight: 8,
  prePlacedPieces: [prePlaced('inputPort', 1, 4), prePlaced('outputPort', 9, 4)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'splitter', 'merger', 'configNode', 'transmitter', 'gear', 'gear'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0, 1], expectedOutput: [1, 0, 1, 1, 0, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 9, budget: 55,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus'],
  computationalGoal: 'Output the input value when input is 1, output the inverse when input is 0. Latch stores the value. Two paths from Splitter with Config Node gating. Merger reconverges.',
  conceptTaught: 'Latch + Merger combined. Stateful branching. A single stored value influencing multiple decisions.',
  prerequisiteConcept: 'Latch, Merger, Splitter, Config Node.',
  tapeDesignRationale: 'Mixed values with consecutive repeats test that the machine responds dynamically per pulse, not via hardcoding.',
  difficultyBand: 'abstract',
  narrativeFrame: 'Hub coordinating resupply for 31 settlements. Running on equipment three cycles past replacement.',
};

pieceCounter = 860;

export const levelK1_7: LevelDefinition = {
  id: 'K1-7', name: 'Ore Processing', sector: 'kepler',
  description: 'Two independent signal paths share the board using a Bridge.',
  cogsLine: 'The ore processing relay is still active. There is no active mining in this corridor. Something is still transmitting on the processing frequency. I have not identified the source. It is not relevant to the current objective.',
  eyeState: 'amber',
  gridWidth: 10, gridHeight: 8,
  prePlacedPieces: [prePlaced('inputPort', 1, 3), prePlaced('outputPort', 8, 6), prePlaced('bridge', 5, 5)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'transmitter', 'gear', 'gear', 'gear', 'configNode'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 0, 1, 1], expectedOutput: [1, 0, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 7, budget: 55,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus'],
  computationalGoal: 'Two independent signal processes share the board. Path A carries the primary signal. Path B is a monitoring loop. The Bridge allows both paths to cross without interfering.',
  conceptTaught: 'Bridge (two independent paths sharing one cell).',
  prerequisiteConcept: 'All prior Kepler concepts.',
  tapeDesignRationale: 'Mixed values confirm the primary path processes each pulse correctly despite the crossing monitor path.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Ore processing relay still active despite no mining. Two signals that must not interfere.',
  tutorialSteps: [
    { id: 'board-intro', label: 'ORE PROCESSING', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Two signals on this board. Both need to reach their destination. The board does not have room for both to go around each other. Something in the tray solves this without the signals being aware of it.' },
    { id: 'bridge-collect', label: 'BRIDGE', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'Two paths. One cell. Neither interferes. I have been waiting for something like this to catalog.',
      codexEntryId: 'bridge' },
    { id: 'board-resume', label: 'ORE PROCESSING', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'As I was saying. The Bridge allows two independent paths to share one cell. Neither signal is aware of the other. Both are correct. Place it where the paths cross.' },
  ],
};

pieceCounter = 870;

export const levelK1_8: LevelDefinition = {
  id: 'K1-8', name: 'Transit Gate', sector: 'kepler',
  description: 'Bridge + Latch integration with crossing paths and state maintenance.',
  cogsLine: 'The transit gate regulates traffic flow through the entire corridor. It has not been updated since the mining operations closed. It is routing ghost traffic from ships that no longer exist. I find that inefficient and something else I will not specify.',
  eyeState: 'blue',
  gridWidth: 11, gridHeight: 8,
  prePlacedPieces: [prePlaced('inputPort', 1, 4), prePlaced('outputPort', 9, 4)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'bridge', 'configNode', 'transmitter', 'gear', 'gear', 'gear', 'merger'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 0, 0, 1, 1], expectedOutput: [1, 1, 0, 1, 0, 0, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 9, budget: 60,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus'],
  consequence: { cogsWarning: 'This mission matters more than most. That is all.', failureEffect: 'Transit gate failure. All corridor traffic suspended for seventy-two hours. The transit authority has escalated the negligence inquiry.' },
  computationalGoal: 'Route signal through a path that crosses itself via Bridge, with Latch storing state that determines the output value.',
  conceptTaught: 'Bridge + Latch integration under pressure. Crossing paths and state maintenance in a single machine.',
  prerequisiteConcept: 'Bridge, Latch, Config Node, Merger.',
  tapeDesignRationale: 'Eight pulses with mixed values and consecutive runs test both state persistence and correct gating under pressure.',
  difficultyBand: 'abstract',
  narrativeFrame: 'Transit gate routing ghost traffic. Regulating flow for the entire corridor. Failure disrupts all traffic.',
};

pieceCounter = 880;

export const levelK1_9: LevelDefinition = {
  id: 'K1-9', name: 'The Narrows', sector: 'kepler',
  description: 'XOR of current input and previously stored Latch value.',
  cogsLine: 'The Narrows is the densest section of the corridor. Maximum signal interference. The colonists call it The Narrows because of what it does to communication. It has another name on older charts. I will use the current one.',
  eyeState: 'blue',
  gridWidth: 11, gridHeight: 9,
  prePlacedPieces: [prePlaced('inputPort', 1, 4), prePlaced('outputPort', 9, 4)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'latch', 'splitter', 'merger', 'configNode', 'configNode', 'transmitter', 'gear', 'gear', 'gear', 'bridge'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [0, 1, 1, 0, 1, 0], expectedOutput: [0, 1, 0, 1, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 11, budget: 70,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus'],
  computationalGoal: 'Output for each pulse is the XOR of the current input and the previously stored Latch value. The machine writes the current input to the Latch after using the previous stored value.',
  conceptTaught: 'Synthesis. Dynamic memory across pulses where the stored value changes each pulse.',
  prerequisiteConcept: 'All Kepler pieces and concepts.',
  tapeDesignRationale: 'XOR expected output differs from input on several pulses, proving the machine compares against stored state rather than passing through.',
  difficultyBand: 'abstract',
  narrativeFrame: 'The densest section of the corridor. Maximum signal interference. The machine must compare each new signal against what came before.',
};

pieceCounter = 890;

export const levelK1_10: LevelDefinition = {
  id: 'K1-10', name: 'Central Hub', sector: 'kepler',
  description: 'Running count machine: output 1 when two or more consecutive 1s seen.',
  cogsLine: 'The Central Hub. Everything in this corridor routes through here. If it holds, the corridor holds. Three hundred thousand people depend on infrastructure that runs through a single point. That is not good design. It is, however, the current situation.',
  eyeState: 'amber',
  gridWidth: 12, gridHeight: 9,
  prePlacedPieces: [prePlaced('inputPort', 1, 4), prePlaced('outputPort', 10, 4)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'scanner', 'latch', 'latch', 'splitter', 'merger', 'configNode', 'configNode', 'transmitter', 'gear', 'gear', 'gear', 'gear', 'bridge'],
  dataTrail: { cells: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1], expectedOutput: [0, 1, 0, 0, 1, 1, 0, 0, 0, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 13, budget: 80,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus'],
  consequence: { cogsWarning: 'Do not fail here. I will not elaborate.', failureEffect: 'Central Hub failure. The corridor is offline. Three hundred and fourteen colonists lost scheduled resupply access for eleven days. The transit authority has filed a negligence inquiry against this vessel.', requireThreeStars: true },
  computationalGoal: 'Implement a running count machine. Output 1 if two or more consecutive 1s have been seen in the input (including the current pulse). Otherwise output 0.',
  conceptTaught: 'Full stateful computation. A machine that behaves differently on pulse N based on what happened on pulse N-1.',
  prerequisiteConcept: 'All Kepler concepts mastered.',
  tapeDesignRationale: 'Ten pulses with multiple runs of consecutive 1s, isolated 1s, and consecutive 0s test all state transitions of the consecutive detection algorithm.',
  difficultyBand: 'abstract',
  narrativeFrame: 'Everything routes through the Central Hub. Three hundred thousand people depend on it. Single point of failure.',
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
    prePlaced('inputPort', 1, 3),
    prePlaced('outputPort', 8, 3),
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
    prePlaced('inputPort', 1, 3),
    prePlaced('outputPort', 8, 3),
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

export const KEPLER_LEVELS: LevelDefinition[] = [
  levelK1_1, levelK1_2, levelK1_3, levelK1_4, levelK1_5,
  levelK1_6, levelK1_7, levelK1_8, levelK1_9, levelK1_10,
];

export const REPAIR_LEVELS: LevelDefinition[] = [repairPropulsionSurge, repairHyperdrive];

export const ALL_LEVELS: LevelDefinition[] = [...AXIOM_LEVELS, ...KEPLER_LEVELS, ...REPAIR_LEVELS];

export function getLevelById(id: string): LevelDefinition | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}
