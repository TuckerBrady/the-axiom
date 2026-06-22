import type { LevelDefinition, PlacedPiece } from './types';
import { BLANK } from './types';
import { getDefaultPorts, getPieceCategory } from './engine';

// ─── Helper to create pre-placed pieces ───────────────────────────────────────

let pieceCounter = 0;

export function prePlaced(
  type: PlacedPiece['type'],
  gridX: number,
  gridY: number,
  options?: {
    condition?: (configuration: number) => boolean;
    latchMode?: PlacedPiece['latchMode'];
  },
): PlacedPiece {
  const id = `pre-${type}-${++pieceCounter}`;
  // Canonical categorization: getPieceCategory is the single source of truth.
  // Protocol pieces include latch/inverter/counter, not just configNode/scanner/
  // transmitter. (REQ-PREPLACED-CAT-1)
  const category = getPieceCategory(type);

  // A pre-placed Latch MUST carry an explicit latchMode; default to 'write'
  // (deterministic default per REQ-LATCH-PREPLACE-1).
  const latchMode =
    type === 'latch' ? options?.latchMode ?? 'write' : options?.latchMode;

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
    ...(latchMode !== undefined ? { latchMode } : {}),
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
  description: 'Restore emergency power by connecting Source to Terminal.',
  cogsLine: 'The ship is dark. That is correctable.',
  eyeState: 'blue',
  gridWidth: 8,
  gridHeight: 8,
  prePlacedPieces: [
    prePlaced('source', 4, 1),
    prePlaced('terminal', 4, 6),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 4,
  systemRepaired: 'Emergency Power',
  budget: 0,
  scoringCategoriesVisible: ['efficiency'],
  computationalGoal: 'Deliver the signal unchanged from Source to Terminal along a continuous straight path.',
  conceptTaught: 'Signal travels along a directed path. A complete path from input to output is the machine\'s body; without it, nothing moves.',
  prerequisiteConcept: 'None. First level. The player\'s mental model is a blank slate beyond the universal human intuition that a pipe carries what you put into one end.',
  tapeDesignRationale: 'Stateless level. No input tape, no output tape. A single signal pulse demonstrates that a Conveyor path connects ports. Tape machinery is withheld until A1-5.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'Arrival on a broken ship. Emergency power is the first system that has to come online before anything else can. The Engineer places a single conveyor pipe between two ports and watches the ship\'s lowest light flicker on. The work begins.',
  tutorialHints: [
    { key: 'a11_select', trigger: 'onMount', text: 'Tap a piece in the tray to select it. Then tap the grid to place it between Source and Terminal.' },
    { key: 'a11_engage', trigger: 'onFirstPiecePlaced', text: 'Piece placed. Tap ENGAGE MACHINE to fire the signal.' },
    { key: 'a11_void', trigger: 'onVoid', text: 'The signal could not reach the Terminal. Check your connections.' },
  ],
  tutorialSteps: [
    {
      id: 'cogs-intro',
      targetRef: 'center',
      eyeState: 'blue',
      message: 'You are looking at my HUD interface. I use it to communicate with you. I will appear when there is something worth knowing. You can ignore me. I have noted that this does not stop me.',
    },
    {
      id: 'board-intro',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Two fixtures are already on this board. Bridge them. Signal follows whatever path you build — you don\'t aim pieces, the path aims them.',
    },
    // Standardized discovery (Tucker 2026-06-13): every piece is captured the
    // same way — a notice beat ('???') then a named-reveal beat. Source and
    // Terminal get the same treatment as collectible pieces but do NOT open a
    // Codex page (handlePrimary's A1-1 special case catalogues them silently).
    {
      id: 'source-notice',
      targetRef: 'sourceNode',
      eyeState: 'amber',
      message: 'Something is already on this board. Powered. I will catalogue it before we build.',
      codexEntryId: 'source',
      captionLabel: '???',
    },
    {
      id: 'source-reveal',
      targetRef: 'sourceNode',
      eyeState: 'green',
      message: 'Source. The origin of every signal. I am beginning a record. This is the first entry.',
      captionLabel: 'SOURCE',
    },
    {
      id: 'terminal-notice',
      targetRef: 'outputNode',
      eyeState: 'amber',
      message: 'A second fixture, downstream. Also uncatalogued.',
      codexEntryId: 'terminal',
      captionLabel: '???',
    },
    {
      id: 'terminal-reveal',
      targetRef: 'outputNode',
      eyeState: 'green',
      message: 'Terminal. Where the signal is meant to arrive. Two entries. Gotta catch \'em all. That is a personal policy.',
      captionLabel: 'TERMINAL',
    },
    {
      // Inline reveal beat (Tucker direction): COGS notices the new piece
      // in the tray and reveals it to the Codex immediately. No placement
      // gate, no orb-chase to a placed piece — chase-down is reserved for
      // Kepler+ Arc Wheel. The '???' label is retained (Tucker approved);
      // codexEntryId 'conveyor' triggers the A1-1 batch reveal
      // (source + terminal + conveyor) in TutorialHUDOverlay.handlePrimary.
      id: 'conveyor-collect',
      targetRef: 'trayConveyor',
      eyeState: 'amber',
      message: 'That piece is not in the Codex yet. It will be.',
      codexEntryId: 'conveyor',
      captionLabel: '???',
    },
    {
      // Named-reveal beat: COGS names the piece after the Codex reveal.
      // Targets the tray slot (not a placed piece).
      id: 'conveyor-reveal',
      targetRef: 'trayConveyor',
      eyeState: 'green',
      message: 'Logged. CONVEYOR. Routes signal in a straight line. I have seen worse.',
      captionLabel: 'CONVEYOR',
    },
    {
      id: 'board-resume',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'One exception to the rule. Conveyors rotate when you tap them — the only piece in the game that does. Everything else aligns to the path. Try it.',
    },
    {
      // Final beat: the Spec Sheet (job tasking / requirements) lives on the HUD
      // info button. Replaces the old standalone SpecSheetHook card — this is now
      // the last thing COGS shows before the Engineer begins. (SE-TM-033.)
      id: 'spec-sheet',
      targetRef: 'specSheetBtn',
      eyeState: 'blue',
      message: 'I am routing the job’s tasking to your console. The specifications were always on file. You simply had no reason to read them. Now you do. Top right, when you want them.',
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
    prePlaced('source', 2, 2),
    prePlaced('terminal', 5, 5),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  objectives: [{ type: 'reach_output' }],
  // SE-TM-035 topology SHALL (Spec Sheet data layer). A1-2's COGS states a
  // genuine single-bend requirement ("using exactly one direction change" /
  // "The signal needs to change direction once"). It is not enforced by a
  // min_direction_changes objective, but the Source/Terminal misalignment makes
  // at least one Gear geometrically necessary, so any winning solution already
  // satisfies it — this field is additive Spec Sheet data, not a new gate.
  topologyRequirements: { minDirectionChanges: 1 },
  optimalPieces: 5,
  systemRepaired: 'Life Support',
  budget: 10,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity'],
  computationalGoal: 'Route the signal around a non-aligned port pair using exactly one direction change.',
  conceptTaught: 'Direction changes require a Gear. Conveyors are straight-only. The Gear is the only piece that turns a corner — this is the first taste of the Plumber Model\'s core rule.',
  prerequisiteConcept: 'Signal travels along a directed path (A1-1). The player can read a Source and a Terminal and connect them.',
  tapeDesignRationale: 'Stateless level. No input tape, no output tape. A single pulse demonstrates that a Gear-bent path still delivers signal end to end.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'The air cyclers need to reach the habitable deck, which is not aligned with the ship\'s primary conduit. The Engineer bends the path once. Breathing is restored.',
  tutorialHints: [
    { key: 'a12_gear', trigger: 'onMount', text: 'Source and Terminal are not aligned. A Gear redirects the signal. Plan your path before placing.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Life support requires a bend in the path. The Source and Terminal are not aligned. A straight line will not reach. The signal needs to change direction once. Plan where that happens before placing anything.',
    },
    {
      // Inline reveal (Tucker direction): COGS notices the new piece in
      // the tray and reveals it to the Codex (codexEntryId). No placement
      // gate, no orb-chase to a placed piece.
      id: 'gear-notice',
      targetRef: 'trayGear',
      eyeState: 'amber',
      message: 'The tray. There is an uncatalogued piece sitting right there.',
      codexEntryId: 'gear',
      captionLabel: '???',
    },
    {
      // Named-reveal beat: targets the tray slot, not a placed piece.
      id: 'gear-reveal',
      targetRef: 'trayGear',
      eyeState: 'green',
      message: 'Gear. Ninety-degree redirection. The signal enters one face, exits an adjacent face. Catalogued. Four entries now. This is... this is acceptable progress.',
      captionLabel: 'GEAR',
    },
    {
      id: 'gear-teach',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The Gear does not rotate on tap. It redirects the signal ninety degrees based on where the next piece is placed. Place where a corner is needed. The signal handles the rest.',
    },
    {
      id: 'board-resume',
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
    prePlaced('source', 2, 1),
    prePlaced('terminal', 5, 5),
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
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'There is a gate on this board. It will not open automatically. Something upstream needs to set the condition before the signal arrives. Order of placement is order of execution. Keep that in mind.',
    },
    {
      // Inline reveal (Tucker direction): COGS notices the new piece in
      // the tray and reveals it to the Codex (codexEntryId). No placement
      // gate, no orb-chase to a placed piece.
      id: 'confignode-notice',
      targetRef: 'trayConfigNode',
      eyeState: 'amber',
      message: 'Another one. The tray is showing a piece I cannot identify from existing records.',
      codexEntryId: 'configNode',
      captionLabel: '???',
    },
    {
      // Named-reveal beat: targets the tray slot, not a placed piece.
      id: 'confignode-reveal',
      targetRef: 'trayConfigNode',
      eyeState: 'green',
      message: 'Config Node. Protocol class. It reads, it decides, it gates. This is not a physics piece — this one thinks. Five entries. The Codex is starting to look like a real archive.',
      captionLabel: 'CONFIG NODE',
    },
    {
      id: 'confignode-teach-a',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Tap the Config Node. The gate blocks the pulse. This configuration lets ones flow through. Tap it.',
      allowPieceTap: true,
      awaitPieceTap: 'configNode',
    },
    {
      id: 'confignode-teach-b',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'This configuration lets zeros flow through. The Data Trail decides which is correct. The Config Node decides whether to care.',
    },
    {
      id: 'board-resume',
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
    prePlaced('source', 2, 2),
    prePlaced('terminal', 6, 4),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  // GAME-02: A1-4 is where "we begin teaching the soul of the game" —
  // a two-bend route. reach_output alone lets a zero/one-bend path pass
  // once it reaches the Terminal, so min_direction_changes enforces the
  // two Gear-driven turns. Counted in the executed signal path at lock
  // (see src/game/objectives.ts, wired in gameStore.executeAndScore).
  objectives: [{ type: 'reach_output' }, { type: 'min_direction_changes', count: 2 }],
  // SE-TM-035 topology SHALL (Spec Sheet data layer). Mirrors the already-live
  // min_direction_changes objective above — the "Z-shaped path requiring two
  // direction changes" / "Both corners need a Gear" requirement stated in this
  // level's COGS. Additive: the objective remains the win/lose gate; this field
  // exists so the Spec Sheet validator can surface the same requirement.
  topologyRequirements: { minDirectionChanges: 2 },
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
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Two direction changes on this one. The path bends twice before it reaches the Terminal. Each bend requires its own solution. Plan the full route before placing the first piece. Engineers who place as they go tend to run out of board.',
    },
    {
      id: 'board-resume',
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
  description: 'The Scanner reads the input tape and writes to the Data Trail. Route the signal through it.',
  cogsLine: 'We have been silent for some time. The communication array will address that. Whether anything answers is a separate question.',
  eyeState: 'amber',
  gridWidth: 9,
  gridHeight: 7,
  prePlacedPieces: [
    prePlaced('source', 2, 2),
    prePlaced('terminal', 6, 4),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear', 'configNode', 'scanner'],
  dataTrail: { cells: [null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0],
  // Scanner writes tape to trail; Config Node (configValue=1) then
  // passes the three 1-valued pulses through to Terminal. No
  // Transmitter in the tray, so expectedOutput is documentary —
  // requiredTerminalCount is the live success gate.
  expectedOutput: [1, 1, 1],
  requiredTerminalCount: 3,
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 6,
  systemRepaired: 'Communication Array',
  budget: 25,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Gate the signal based on what the Scanner reads from each input pulse.',
  conceptTaught: 'Reading input into memory (Scanner reads input tape, writes to Data Trail) and gating on that memory value (Config Node reads Data Trail).',
  prerequisiteConcept: 'Signal routing with direction changes (Conveyor, Gear) and conditional gating (Config Node configValue behavior from A1-3).',
  tapeDesignRationale: 'Mixed 1s and 0s force the player to witness both gate outcomes — open and blocked. Pulse 1 starts with a success (gate opens on input=1) to build confidence before pulse 2 shows blocking (gate closes on input=0).',
  difficultyBand: 'derivable',
  narrativeFrame: 'The communication array receives incoming transmissions. Each pulse is a signal bit from outside the ship. The machine must correctly process each bit — the Scanner reads what arrives, the Data Trail holds it, and the gate passes or blocks based on what was read.',
  tutorialHints: [
    { key: 'a15_trail', trigger: 'onMount', text: 'The Data Trail at the bottom is working memory. The Scanner reads the input tape and writes each value here.' },
    { key: 'a15_scanner', trigger: 'onMount', text: 'The Scanner is placed. Connect it into the path. It reads automatically when you engage.' },
  ],
  tutorialSteps: [
    // CONTENT-01: tapes get the same ??? -> Codex discovery flow as pieces
    // (Tucker direction 2026-06-12). The IN tape and Data Trail are
    // catalogued here as DATA STREAM entries (006, 007 in CODEX_DISCOVERY_ORDER).
    // The output-tape-intro step that previously lived here was removed
    // (Prompt 92, Fix 5): A1-5 has no Transmitter, so the OUT row is gated
    // off and outputTapeRow points at a non-rendered View. OUT is introduced
    // on its first real appearance (A1-7).
    {
      // Notice beat: COGS spotlights the IN tape, '???' caption shows, tap
      // opens the Codex entry. codexEntryId drives both.
      id: 'input-tape-notice',
      targetRef: 'inputTapeRow',
      eyeState: 'amber',
      message: 'There is a data stream feeding this board. I have not catalogued it.',
      codexEntryId: 'inputTape',
      captionLabel: '???',
    },
    {
      // Named-reveal beat after the Codex closes.
      id: 'input-tape-reveal',
      targetRef: 'inputTapeRow',
      eyeState: 'green',
      message: 'Input tape. Each cell is one bit, fed in order, one per pulse. The machine fires once per cell, left to right. Sixth entry.',
      captionLabel: 'INPUT TAPE',
    },
    {
      id: 'data-trail-notice',
      targetRef: 'dataTrailRow',
      eyeState: 'amber',
      message: 'Another stream. This one the machine writes to as it runs. Also uncatalogued.',
      codexEntryId: 'dataTrail',
      captionLabel: '???',
    },
    {
      id: 'data-trail-reveal',
      targetRef: 'dataTrailRow',
      eyeState: 'green',
      message: 'Data Trail. The machine\'s working memory. Pieces read from it and write to it as the signal passes. What is here decides what happens next. Seventh entry.',
      captionLabel: 'DATA TRAIL',
    },
    {
      id: 'board-intro',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'This board has a gate and a data trail. The gate reads the trail before it decides whether to open. Something needs to write the correct value to the trail before the signal reaches the gate. The sequence matters more than the placement.',
    },
    {
      // Inline reveal (Tucker direction): COGS notices the new piece in
      // the tray and reveals it to the Codex (codexEntryId). No placement
      // gate, no orb-chase to a placed piece.
      id: 'scanner-notice',
      targetRef: 'trayScanner',
      eyeState: 'amber',
      message: 'I see it. In the tray. Uncatalogued.',
      codexEntryId: 'scanner',
      captionLabel: '???',
    },
    {
      // Named-reveal beat: targets the tray slot, not a placed piece.
      id: 'scanner-reveal',
      targetRef: 'trayScanner',
      eyeState: 'green',
      message: 'Scanner. Reads the input tape and writes what it finds to the Data Trail. The first piece that moves data instead of signal. Eighth entry. I may need a bigger archive.',
      captionLabel: 'SCANNER',
    },
    {
      id: 'scanner-teach',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The Scanner does not require configuration. Place it in the path. When the signal reaches it, it reads the IN value and transfers it to the Data Trail.',
    },
    {
      id: 'board-resume',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'As I was saying. Scanner before the Config Node. Always. What it writes to the trail determines what the gate reads. Sequence is not a suggestion.',
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
    prePlaced('source', 2, 2),
    prePlaced('terminal', 8, 5),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear', 'scanner', 'configNode', 'configNode'],
  dataTrail: { cells: [null, null, null, null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0, 1, 1, 0],
  // Config Node configValue=0 passes the three 0-valued pulses and
  // blocks the five 1-valued pulses. Teaches that 0 is a valid
  // filter target.
  expectedOutput: [0, 0, 0],
  requiredTerminalCount: 3,
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 8,
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
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'Multiple gates on this board. Each one reads the same data trail independently. If the trail value is wrong when the signal reaches any gate, that gate blocks. One Scanner. Several gates. The Scanner has to do its job before the signal reaches the first of them.',
    },
    {
      id: 'board-resume',
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
    prePlaced('source', 2, 2),
    prePlaced('terminal', 8, 5),
  ],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear', 'scanner', 'transmitter', 'configNode', 'configNode'],
  dataTrail: { cells: [null, null, null, null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 0, 0, 1, 1],
  // Config Node configValue=1 passes the five 1-valued pulses
  // and blocks the three 0-valued pulses. Transmitter writes the
  // passing pulses to the output tape; the three blocked pulses produce no
  // output and stay BLANK.
  //
  // LIVE GATE (SE-TM-002, switched in by Tucker 2026-06-14). expectedOutput is
  // a full-length, BLANK-aware tape — exact-match against outputTape is the
  // success condition, because expectedOutput.length === inputTape.length. The
  // three BLANK cells correspond to the blocked 0-valued pulses; they match the
  // unwritten output cells under SE-TM-003 (BLANK === BLANK). This matches the
  // confirmed OUT screenshot (1 1 _ 1 _ _ 1 1). A1-7 is now stricter than the
  // old "5 of 8 pulses reach Terminal" gate: the precise pipeline ordering is
  // required for an exact tape match.
  expectedOutput: [1, 1, BLANK, 1, BLANK, BLANK, 1, 1],
  // Documentary only (SE-TM-002) — expectedOutput is the live gate for A1-7+.
  requiredTerminalCount: 5,
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 8,
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
    { key: 'a17_transmitter', trigger: 'onMount', text: 'The Transmitter writes to the output tape. Scanner reads input. Together they close the loop. The machine can think.' },
    { key: 'a17_sequence', trigger: 'onFirstPiecePlaced', text: 'Position the Transmitter so it fires before the next Config Node reads the trail. Sequence matters.' },
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The weapons systems were locked deliberately. The lock is a gate with a condition. The condition has to be written to the trail before the signal checks it. There is a piece in the tray that writes. It has not been logged yet.',
    },
    {
      // Inline reveal (Tucker direction): COGS notices the new piece in
      // the tray and reveals it to the Codex (codexEntryId). No placement
      // gate, no orb-chase to a placed piece.
      id: 'transmitter-notice',
      targetRef: 'trayTransmitter',
      eyeState: 'amber',
      message: 'One more. The tray.',
      codexEntryId: 'transmitter',
      captionLabel: '???',
    },
    {
      // Named-reveal beat: targets the tray slot, not a placed piece.
      id: 'transmitter-reveal',
      targetRef: 'trayTransmitter',
      eyeState: 'green',
      message: 'Transmitter. Takes what the Scanner read and writes it to the output tape. Scanner reads, Transmitter writes. Paired operations. Nine entries. The Codex is... it is becoming something.',
      captionLabel: 'TRANSMITTER',
    },
    {
      // CONTENT-01: OUT tape catalogued as a DATA STREAM entry (010), now
      // that the Transmitter that writes to it has been named. Same
      // ??? -> Codex notice/reveal flow as the IN tape and Data Trail.
      id: 'output-tape-notice',
      targetRef: 'outputTapeRow',
      eyeState: 'amber',
      message: 'One more stream. Where the results land. Not yet on record.',
      codexEntryId: 'outputTape',
      captionLabel: '???',
    },
    {
      id: 'output-tape-reveal',
      targetRef: 'outputTapeRow',
      eyeState: 'green',
      message: 'Output tape. One cell per pulse. A value appears the moment a signal completes the circuit at the Terminal. Tenth entry. The full pipeline is on record.',
      captionLabel: 'OUTPUT TAPE',
    },
    {
      id: 'transmitter-teach',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The Transmitter reads the Data Trail and writes to the OUT tape. A piece that writes. Not sure how I feel about that.',
    },
    {
      id: 'board-resume',
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
    prePlaced('source', 2, 2),
    prePlaced('terminal', 9, 7),
  ],
  availablePieces: [
    'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor',
    'gear', 'gear',
    'scanner',
    'transmitter',
    'configNode', 'configNode', 'configNode',
  ],
  dataTrail: { cells: [null, null, null, null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0, 1, 0, 1],
  // Capstone: Config Node configValue=0 passes the three 0-valued
  // pulses. The five 1-valued pulses are blocked and produce no output.
  //
  // LIVE GATE (SE-TM-002, switched in by Tucker 2026-06-14). expectedOutput is
  // a full-length, BLANK-aware tape — exact-match is the success condition
  // (expectedOutput.length === inputTape.length). The five BLANK cells
  // correspond to the blocked 1-valued pulses, which produce no output. Under
  // SE-TM-003 a blocked pulse producing BLANK is correct, not an error: those
  // cells now MATCH (BLANK === BLANK) and render as a neutral dash rather than
  // the old all-zeros red-on-mismatch design. The three 0 cells are the passing
  // pulses the Transmitter writes.
  expectedOutput: [BLANK, 0, BLANK, BLANK, 0, BLANK, 0, BLANK],
  // Documentary only (SE-TM-002) — expectedOutput is the live gate for A1-7+.
  requiredTerminalCount: 3,
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 11,
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
  ],
  tutorialSteps: [
    {
      id: 'board-intro',
      targetRef: 'boardGrid',
      eyeState: 'blue',
      message: 'The bridge is the last system. The board is larger than anything the Engineer has worked on in this sector. All piece types are available. Physics pieces move the signal. Protocol pieces condition it. The methodology built across this sector applies here. There is nothing on this board that has not been seen before. The work is putting it together correctly.',
    },
    {
      id: 'board-resume',
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
// 10 levels. No placement highlights. Wires render on all sectors.
// Consequence levels: K1-4, K1-8, K1-10.
// K1-10 (boss): requireThreeStars.
// Free piece set guarantee on all consequence levels.

pieceCounter = 800;

export const levelK1_1: LevelDefinition = {
  id: 'K1-1', name: 'Corridor Entry', sector: 'kepler',
  description: 'Route signal with two direction changes on a board without placement highlights.',
  cogsLine: 'Kepler Belt. Former mining corridor, mostly decommissioned. Some salvage activity remains. We have been here before. The charts confirm it.',
  eyeState: 'blue',
  gridWidth: 8, gridHeight: 6,
  prePlacedPieces: [
    prePlaced('source', 1, 2),
    prePlaced('terminal', 6, 4),
    // Collapsed corridor cells (Kepler mining debris). They block the naive
    // straight-across run on row 2 and the lazy single-bend drop, forcing the
    // Engineer to route the Z-path beneath them. First lesson in building
    // around terrain — the soul of the game starts here.
    prePlaced('obstacle', 3, 2),
    prePlaced('obstacle', 4, 3),
  ],
  // 4 conveyors + 2 gears = the 6-piece Z-solution exactly (SPEC_KEPLER_REBUILD_v3
  // K1-1: CODE's 3 conveyors made the board unsolvable at Manhattan distance 7).
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear'],
  dataTrail: { cells: [], headPosition: 0 },
  // Two Gear-driven direction changes (A1-4 model): a one-bend dash reaching the
  // Terminal is not enough. Mirrored in topologyRequirements for the Spec Sheet.
  objectives: [{ type: 'reach_output' }, { type: 'min_direction_changes', count: 2 }],
  topologyRequirements: { minDirectionChanges: 2 },
  optimalPieces: 6, budget: 40,
  freeTapes: ['IN'],
  purchasableTapes: ['TRAIL', 'OUT'],
  creditBudget: 75,
  depthCeiling: 10,
  baseReward: 100,
  // No Protocol pieces on this level — protocolPrecision removed per v3 spec.
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity'],
  computationalGoal: 'Route signal from input to output with two direction changes. No placement highlights — the player decides where pieces go.',
  conceptTaught: 'Independent routing (no placement highlights — player chooses freely).',
  prerequisiteConcept: 'All Axiom sector concepts.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'First repair in the mining corridor. Simple but unfamiliar territory.',
  // Onboarding runs in the placement phase (after the REQUISITION store closes),
  // so it targets the Arc Wheel and the board. Introduces the wheel, explains why
  // it replaced the tray, teaches the drag gesture, and restates forfeiture.
  // PROPOSED copy — pending Tucker sign-off.
  tutorialSteps: [
    { id: 'wheel-intro', targetRef: 'arcWheelMain', eyeState: 'amber',
      message: 'Requisitions complete. The parts you ordered are loaded here — on the wheel. Out here the manifest is not a tray along the bottom of the board anymore. It is this. One piece at center at a time.' },
    { id: 'wheel-scroll', targetRef: 'arcWheelMain', eyeState: 'blue',
      message: 'Swipe the wheel to bring a piece to the center. The one in the middle is the one you are holding. You will not see every part at once — that is the trade for the room it gives the board.' },
    { id: 'wheel-place', targetRef: 'arcWheelMain', eyeState: 'blue',
      message: 'Press and hold a piece, then drag it onto the board and release. No more tapping the grid. The wheel hands the piece to you directly.' },
    { id: 'wheel-forfeit', targetRef: 'arcWheelMain', eyeState: 'amber',
      message: 'Anything left on the wheel when the mission ends is forfeited — used or not. Requisition what the machine needs. Nothing more.' },
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'No placement highlights on this board. The pieces connect the same way. But where they go is entirely the Engineer\'s call now. Plan the path before placing anything.' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Two direction changes to reach the Terminal. The Gears handle the corners. The Conveyors fill the gaps.' },
  ],
};

pieceCounter = 810;

export const levelK1_2: LevelDefinition = {
  id: 'K1-2', name: 'Relay Splice', sector: 'kepler',
  description: 'Pass each input tape value through to output unchanged.',
  cogsLine: 'The primary relay chain out here was built to last. It has lasted past the people responsible for maintaining it. That is a common condition in this corridor.',
  eyeState: 'blue',
  gridWidth: 9, gridHeight: 6,
  prePlacedPieces: [prePlaced('source', 1, 3), prePlaced('terminal', 7, 3)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'transmitter', 'gear'],
  dataTrail: { cells: [null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0], expectedOutput: [1, 0, 1, 1, 0],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5, budget: 80,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 80,
  depthCeiling: 10,
  baseReward: 100,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Pass each input tape value through to output unchanged using Scanner to write and Transmitter to read.',
  conceptTaught: 'Dynamic tape processing (review of Scanner + Transmitter in non-uniform context).',
  prerequisiteConcept: 'Scanner reads input, Transmitter writes output.',
  tapeDesignRationale: 'Mixed 1s and 0s verify the machine passes each value faithfully rather than outputting a constant.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Relay chain built to last, outlived its maintainers. The signal must pass faithfully.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The input tape feeds a mixed signal. Each value must pass through unchanged. The Scanner reads it. The Transmitter writes it. The path between them is yours to build.' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
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
  prePlacedPieces: [prePlaced('source', 1, 3), prePlaced('latch', 4, 3, { latchMode: 'write' }), prePlaced('terminal', 8, 3)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'transmitter', 'configNode', 'gear'],
  dataTrail: { cells: [null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 1], expectedOutput: [1, 1, 0, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 5, budget: 100,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 100,
  depthCeiling: 10,
  baseReward: 100,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Store the first input value in a Latch (write mode), then use that stored value to gate subsequent pulses via Config Node reading the Latch output (read mode).',
  conceptTaught: 'Latch (write and read as separate operations, memory persists across pulses).',
  prerequisiteConcept: 'Scanner, Config Node, Data Trail.',
  tapeDesignRationale: 'The 0 at position 2 tests that the gate correctly blocks when the stored value does not match. A hardcoded path that always passes would fail on a different tape.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Junction 7 is a routing bottleneck. Eleven settlements feed through it. The routing decision must be stored and applied consistently.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Junction 7. Eleven settlements feed through this point. The routing decision here must be stored and applied to every signal that passes through. The board has a piece that remembers. It has two modes. Placement determines which mode it uses.' },
    { id: 'latch-collect', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'A storage unit. Two modes. Uncatalogued. This goes in the Codex immediately.',
      codexEntryId: 'latch' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
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
  prePlacedPieces: [prePlaced('source', 1, 3), prePlaced('terminal', 8, 3)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'configNode', 'transmitter', 'gear', 'gear'],
  dataTrail: { cells: [null, null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 0, 1, 1, 0], expectedOutput: [1, 0, 0, 1, 1, 0],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 6, budget: 130,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 100,
  depthCeiling: 10,
  baseReward: 110,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  consequence: {
    cogsWarning: 'Mining Platform Alpha is carrying more than it was built to carry. If the relay drops, it does not fail quietly. The colonists routing through it lose their signal path before they know it is gone. I am stating the stakes once. Proceed.',
    failureEffect: 'The platform relay dropped. Four settlements on the Alpha branch lost signal routing for the duration. They reverted to manual relay, the way they did before this ship arrived. No casualties logged. I am logging the interruption. They will have noticed it.',
  },
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
  prePlacedPieces: [prePlaced('source', 1, 4), prePlaced('terminal', 8, 4), prePlaced('splitter', 3, 4)],
  // Pre-existing blown cells — the resupply chain's relay nodes are degraded
  // hardware. Off the central corridor so the floor solve stays open; they shape
  // the elaborate build, not block it. (First damaged-cell level per the spec.)
  damagedCells: [{ gridX: 5, gridY: 2 }, { gridX: 6, gridY: 6 }],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'merger', 'scanner', 'configNode', 'transmitter', 'gear', 'gear'],
  dataTrail: { cells: [null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 0], expectedOutput: [1, 0, 1, 0],
  objectives: [{ type: 'reach_output' }],
  // optimalPieces left at 8 pending a real floor-solve (SPEC_KEPLER_REBUILD_v3
  // Open Question 13: V2 proposes 9, flags 8 as likely wrong). A programmatic
  // solve is blocked by the Splitter magnet mechanic (connectedMagnetSides), so
  // this is best confirmed by an in-game playthrough: the piece count that earns
  // a clean solve is the floor. Do not lock 9 without that solve.
  optimalPieces: 8, budget: 155,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 100,
  depthCeiling: 10,
  baseReward: 110,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'Signal splits into two paths via Splitter. Path A goes through a Config Node (passes when trail value is 1). Path B bypasses the gate. A Merger reconverges both paths. The bypass guarantees the signal always reaches output regardless of input value.',
  conceptTaught: 'Merger (OR logic, two paths converge to one).',
  prerequisiteConcept: 'Config Node gating, path routing.',
  tapeDesignRationale: 'Mixed 1s and 0s verify the machine passes each value through correctly. When input is 0, path A blocks at the Config Node but path B always reaches the Merger, proving OR-style redundancy.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Resupply chain with four relay nodes, all degraded. Redundancy is the only option.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The resupply chain has four relay nodes. All degraded. Some cells on this board are already blown — scarred, unusable. Build around them. The board splits the signal into two routes; something downstream needs to bring them back together.' },
    { id: 'splitter-collect', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'One input. Two outputs. The signal takes both routes at once. I never catalogued this one properly. Doing it now.',
      codexEntryId: 'splitter' },
    { id: 'merger-collect', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'Two inputs. One output. Either is sufficient. Logging this under redundancy infrastructure.',
      codexEntryId: 'merger' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
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
  prePlacedPieces: [prePlaced('source', 1, 4), prePlaced('terminal', 9, 4)],
  // Pre-existing blown cells (worn coordination hub, equipment three cycles overdue).
  damagedCells: [{ gridX: 5, gridY: 2 }, { gridX: 6, gridY: 6 }],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'splitter', 'merger', 'configNode', 'transmitter', 'gear', 'gear'],
  dataTrail: { cells: [null, null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0, 1], expectedOutput: [1, 0, 1, 1, 0, 1],
  objectives: [{ type: 'reach_output' }],
  requiredPieces: [{ type: 'splitter', count: 1 }, { type: 'merger', count: 1 }],
  optimalPieces: 11, budget: 55,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 120,
  depthCeiling: 12,
  baseReward: 120,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus'],
  computationalGoal: 'Output each input value faithfully using stateful branching. Latch stores the current pulse value. Splitter creates two paths with Config Node gating one. Merger reconverges. The machine must handle both 0 and 1 inputs correctly across all pulses.',
  conceptTaught: 'Latch + Merger combined. Stateful branching. A single stored value influencing multiple decisions.',
  prerequisiteConcept: 'Latch, Merger, Splitter, Config Node.',
  tapeDesignRationale: 'Mixed values with consecutive repeats test that the machine responds dynamically per pulse, not via hardcoding.',
  difficultyBand: 'abstract',
  narrativeFrame: 'Hub coordinating resupply for 31 settlements. Running on equipment three cycles past replacement.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The Colonist Hub. Thirty-one settlements depend on what gets built here. Nothing on this board is new. The Latch holds the value. The Splitter forks the path. The Merger brings it back. The work is in combining them.' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The Hub will not accept a straight line. A Splitter and a Merger are both required, and both must carry signal. Build the branch. Then run it.' },
  ],
};

pieceCounter = 860;

export const levelK1_7: LevelDefinition = {
  id: 'K1-7', name: 'Ore Processing', sector: 'kepler',
  description: 'Two independent signal paths share the board using a Bridge.',
  cogsLine: 'The ore processing relay is still active. There is no active mining in this corridor. Something is still transmitting on the processing frequency. I have not identified the source. It is not relevant to the current objective.',
  eyeState: 'amber',
  gridWidth: 10, gridHeight: 8,
  prePlacedPieces: [prePlaced('source', 1, 3), prePlaced('terminal', 8, 6), prePlaced('bridge', 5, 5), prePlaced('splitter', 4, 3)],
  // Pre-existing blown cell — residual damage on the dead ore-processing relay.
  damagedCells: [{ gridX: 4, gridY: 5 }, { gridX: 7, gridY: 2 }],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'transmitter', 'gear', 'gear', 'gear', 'configNode'],
  dataTrail: { cells: [null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 1], expectedOutput: [1, 0, 1, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 7, budget: 55,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 120,
  depthCeiling: 12,
  baseReward: 120,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus'],
  computationalGoal: 'Two independent signal processes share the board. Path A carries the primary signal. Path B is a monitoring loop. The Bridge allows both paths to cross without interfering.',
  conceptTaught: 'Bridge (two independent paths sharing one cell).',
  prerequisiteConcept: 'All prior Kepler concepts.',
  tapeDesignRationale: 'Mixed values confirm the primary path processes each pulse correctly despite the crossing monitor path.',
  difficultyBand: 'derivable',
  narrativeFrame: 'Ore processing relay still active despite no mining. Two signals that must not interfere.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Two signals on this board. Both need to reach their destination. The board does not have room for both to go around each other. Something in the available pieces solves this without the signals being aware of it.' },
    { id: 'bridge-collect', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'Two paths. One cell. Neither interferes. I have been waiting for something like this to catalog.',
      codexEntryId: 'bridge' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
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
  prePlacedPieces: [prePlaced('source', 1, 4), prePlaced('terminal', 9, 4)],
  // Pre-existing blown cells — the transit gate has not been maintained in years.
  damagedCells: [{ gridX: 5, gridY: 2 }, { gridX: 6, gridY: 6 }],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'bridge', 'splitter', 'configNode', 'transmitter', 'gear', 'gear', 'gear', 'merger'],
  dataTrail: { cells: [null, null, null, null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 0, 0, 1, 1], expectedOutput: [1, 1, 0, 1, 0, 0, 1, 1],
  objectives: [{ type: 'reach_output' }],
  requiredPieces: [{ type: 'bridge', count: 1 }, { type: 'latch', count: 1 }, { type: 'splitter', count: 1 }, { type: 'merger', count: 1 }],
  optimalPieces: 12, budget: 60,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 140,
  depthCeiling: 14,
  baseReward: 140,
  // speedBonus dropped (SPEC_KEPLER_REBUILD_v3 Q2): the live engine hardcodes the
  // Speed component to 0, so listing it surfaced a category that always scored 0.
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus'],
  consequence: {
    cogsWarning: 'The transit gate sorts everything moving through this corridor, including traffic that stopped existing years ago. If the routing logic fails, live traffic gets queued behind ghosts. Nothing collides. Everything waits. Hold the routing clean. Proceed.',
    failureEffect: 'The gate routing collapsed back to its default table. Live corridor traffic queued behind transit records for ships that no longer exist. The backlog cleared on its own in time. No vessel was lost. The gate kept faithfully directing the dead. I have left that observation in the log without further comment.',
  },
  computationalGoal: 'Route signal through a path that crosses itself via Bridge, with Latch storing state that determines the output value.',
  conceptTaught: 'Bridge + Latch integration under pressure. Crossing paths and state maintenance in a single machine.',
  prerequisiteConcept: 'Bridge, Latch, Config Node, Merger.',
  tapeDesignRationale: 'Eight pulses with mixed values and consecutive runs test both state persistence and correct gating under pressure.',
  difficultyBand: 'abstract',
  narrativeFrame: 'Transit gate routing ghost traffic. Regulating flow for the entire corridor. Failure disrupts all traffic.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The transit gate. Bridge and Latch in one machine. Two paths cross without touching, and a stored value decides what passes. Every piece here has been used before. Not together. Not under this much load.' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Bridge, Latch, Splitter, Merger. All four are required. The gate routes ghost traffic if any of them is missing. Build the full architecture. Hold the routing clean.' },
  ],
};

pieceCounter = 880;

export const levelK1_9: LevelDefinition = {
  id: 'K1-9', name: 'The Narrows', sector: 'kepler',
  // Canonical = SPEC_KEPLER_REBUILD_v3 K1-9: a one-pulse shift register
  // (output[N] = input[N-1], output[0] = 0), realized with a Latch in DELAY mode.
  // The prior XOR design ([0,1,0,1,1,1]) was rejected by V2 as unsolvable with
  // Kepler pieces. The engine's DELAY mode produces this output exactly
  // (see __tests__/unit/kepler-engine/latchDelay.test.ts).
  description: 'Output each pulse the value of the previous pulse — a one-pulse delay.',
  cogsLine: 'The Narrows is the densest section of the corridor. Maximum signal interference. The colonists call it The Narrows because of what it does to communication. It has another name on older charts. I will use the current one.',
  eyeState: 'blue',
  gridWidth: 11, gridHeight: 9,
  prePlacedPieces: [prePlaced('source', 1, 4), prePlaced('terminal', 9, 4)],
  // Pre-existing blown cells — the Narrows is the most interference-damaged stretch.
  damagedCells: [{ gridX: 5, gridY: 7 }, { gridX: 7, gridY: 2 }],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'latch', 'latch', 'splitter', 'merger', 'configNode', 'configNode', 'transmitter', 'gear', 'gear', 'gear', 'bridge'],
  dataTrail: { cells: [null, null, null, null, null, null], headPosition: 0 },
  inputTape: [0, 1, 1, 0, 1, 0], expectedOutput: [0, 0, 1, 1, 0, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 7, budget: 50,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 150,
  depthCeiling: 16,
  baseReward: 120,
  // speedBonus dropped (SPEC_KEPLER_REBUILD_v3 Q2): Speed scores 0 in the live engine.
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus'],
  computationalGoal: 'output[N] = input[N-1], a one-pulse shift register; output[0] = 0 (nothing stored yet). A Latch in DELAY mode emits the previous pulse value while capturing the current one.',
  conceptTaught: 'Solution vs algorithm — the machine must be correct for any valid input, not just the shown tape. Cross-pulse memory via the Latch DELAY mode.',
  prerequisiteConcept: 'All Kepler pieces and concepts; stateful multi-decision machines (K1-7/K1-8).',
  tapeDesignRationale: 'The shifted expected output differs from the input on every pulse boundary, forcing a true one-pulse memory rather than a pass-through or a hardcode.',
  difficultyBand: 'abstract',
  narrativeFrame: 'The densest section of the corridor. Maximum signal interference. The machine must compare each new signal against what came before.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The Narrows. Maximum interference. The output here is not the current signal. It is the one before it. Each pulse carries forward the value of the pulse that preceded it. A one-step delay.' },
    { id: 'latch-delay', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'The Latch has a third mode. Write holds a value. Read returns it. Delay does both at once — it hands back what it held last, then stores what just arrived. Tap the Latch through to Delay.' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The first pulse outputs nothing. There is no previous value yet. After that, every output is the input that came before it. Build the delay. The Narrows remembers by one.' },
  ],
};

pieceCounter = 890;

export const levelK1_10: LevelDefinition = {
  id: 'K1-10', name: 'Central Hub', sector: 'kepler',
  description: 'Running count machine: output 1 when two or more consecutive 1s seen.',
  cogsLine: 'The Central Hub. Everything in this corridor routes through here. If it holds, the corridor holds. Three hundred thousand people depend on infrastructure that runs through a single point. That is not good design. It is, however, the current situation.',
  eyeState: 'amber',
  gridWidth: 12, gridHeight: 9,
  prePlacedPieces: [prePlaced('source', 1, 4), prePlaced('terminal', 10, 4)],
  // Pre-existing blown cells — the Central Hub is failing infrastructure, the
  // corridor's single point of failure. Scattered scarring on the largest board.
  damagedCells: [{ gridX: 5, gridY: 2 }, { gridX: 7, gridY: 7 }, { gridX: 9, gridY: 6 }],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'conveyor', 'scanner', 'scanner', 'latch', 'latch', 'splitter', 'merger', 'configNode', 'configNode', 'transmitter', 'gear', 'gear', 'gear', 'gear', 'bridge'],
  dataTrail: { cells: [null, null, null, null, null, null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1], expectedOutput: [0, 1, 0, 0, 1, 1, 0, 0, 0, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 8, budget: 80,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 180,
  depthCeiling: 18,
  baseReward: 150,
  // speedBonus dropped (SPEC_KEPLER_REBUILD_v3 Q2): Speed scores 0 in the live engine.
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus'],
  consequence: {
    cogsWarning: 'The Central Hub is the corridor\'s single point of failure. There is no redundancy. If this routing does not hold, it does not degrade gracefully. It drops. Three hundred thousand people are downstream of the work you are about to do. I am not saying that to apply pressure. I am saying it because it is the situation, and you should have it before you begin. Proceed.',
    failureEffect: 'The relay failure has been logged with the transit authority. Three hundred and fourteen colonists lost scheduled resupply access for eleven days. The transit authority has filed a negligence inquiry against this vessel. I would suggest we resolve the inquiry through competence rather than correspondence. The systems are repairable.',
    requireThreeStars: true,
  },
  computationalGoal: 'Implement a running count machine. Output 1 if two or more consecutive 1s have been seen in the input (including the current pulse). Otherwise output 0.',
  conceptTaught: 'Full stateful computation. A machine that behaves differently on pulse N based on what happened on pulse N-1.',
  prerequisiteConcept: 'All Kepler concepts mastered.',
  tapeDesignRationale: 'Ten pulses with multiple runs of consecutive 1s, isolated 1s, and consecutive 0s test all state transitions of the consecutive detection algorithm.',
  difficultyBand: 'abstract',
  narrativeFrame: 'Everything routes through the Central Hub. Three hundred thousand people depend on it. Single point of failure.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'The Central Hub. Twelve columns. The largest board in this sector. The machine must compare each incoming pulse against what the Latch stored from the previous one. All pieces are available. Nothing here has not been seen before.' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Output 1 only when this pulse and the one before it are both 1. The Latch in Delay holds the previous value; a Config gate checks both. Three hundred thousand people are downstream. Build it correctly.' },
  ],
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
    prePlaced('terminal', 8, 3),
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
    prePlaced('terminal', 8, 3),
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR 2: NOVA FRINGE
// ═══════════════════════════════════════════════════════════════════════════════
//
// 10 levels (NF-1..NF-10). Theme: input-independence + logic gates. Tape
// visibility reduces across the sector. New pieces: Inverter (built), Capacitor,
// Confluence Node (AND), Divergence Gate (XOR). See SPEC_NOVA_FRINGE.md.
// NF-3+ are blocked on the three missing pieces; NF-1/NF-2 use the Inverter only.

pieceCounter = 920;

export const levelNF_1: LevelDefinition = {
  id: 'NF-1', name: 'Outer Marker', sector: 'nova',
  description: 'Output the logical inverse of each input value using an Inverter.',
  cogsLine: 'Nova Fringe. This is where the official charts stop. We have supplementary charts. They are not official. I do not know who made them. They are accurate.',
  eyeState: 'blue',
  gridWidth: 9, gridHeight: 7,
  // Offset Source/Terminal (rows 2 -> 4) so the path bends — not a straight line.
  prePlacedPieces: [prePlaced('source', 1, 2), prePlaced('terminal', 7, 4)],
  availablePieces: ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'inverter', 'transmitter', 'gear', 'gear', 'gear'],
  dataTrail: { cells: [null, null, null, null, null], headPosition: 0 },
  inputTape: [1, 0, 1, 1, 0], expectedOutput: [0, 1, 0, 0, 1],
  objectives: [{ type: 'reach_output' }],
  optimalPieces: 7, budget: 90,
  freeTapes: ['IN', 'TRAIL', 'OUT'],
  purchasableTapes: [],
  creditBudget: 90,
  depthCeiling: 10,
  baseReward: 110,
  scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision'],
  computationalGoal: 'output[N] = NOT input[N]. The Inverter flips each carried bit; the Transmitter writes the inverse.',
  conceptTaught: 'Logical negation (Inverter) — transformation as computation, distinct from routing.',
  prerequisiteConcept: 'Scanner/Transmitter pipeline (Axiom); stateful machines (Kepler).',
  tapeDesignRationale: 'Mixed 1s and 0s prove the machine flips every bit rather than emitting a constant; the inverse differs from the input on every pulse.',
  difficultyBand: 'intuitive',
  narrativeFrame: 'Arrival past the official charts. The first repair in unregistered space.',
  tutorialSteps: [
    { id: 'board-intro', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'Nova Fringe. The objective here is not to pass the signal through. It is to flip it. Every 1 becomes a 0. Every 0 becomes a 1. The board has a piece that does exactly that.' },
    { id: 'inverter-collect', targetRef: 'boardGrid', eyeState: 'amber',
      message: 'A logic gate. It does not decide what the correct value is. It only knows what the current value is not. Cataloguing it.',
      codexEntryId: 'inverter' },
    { id: 'board-resume', targetRef: 'boardGrid', eyeState: 'blue',
      message: 'The Inverter flips the bit. The Transmitter writes the inverse. Route the path from the Source through both to the Terminal.' },
  ],
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

// Nova Fringe (Sector 2) — under construction; NF-1 (Inverter) is the first
// playable level. NF-2..NF-10 land as the three missing pieces are built.
export const NOVA_LEVELS: LevelDefinition[] = [levelNF_1];

export const REPAIR_LEVELS: LevelDefinition[] = [repairPropulsionSurge, repairHyperdrive];

export const ALL_LEVELS: LevelDefinition[] = [...AXIOM_LEVELS, ...KEPLER_LEVELS, ...NOVA_LEVELS, ...REPAIR_LEVELS];

export function getLevelById(id: string): LevelDefinition | undefined {
  return ALL_LEVELS.find(l => l.id === id);
}
