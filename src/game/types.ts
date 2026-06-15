// ─── Piece System ─────────────────────────────────────────────────────────────

export type PieceType =
  | 'source'
  | 'terminal'
  | 'conveyor'
  | 'gear'
  | 'splitter'
  | 'configNode'
  | 'scanner'
  | 'transmitter'
  | 'merger'
  | 'bridge'
  | 'inverter'
  | 'counter'
  | 'latch'
  | 'obstacle';

export type PieceCategory = 'physics' | 'protocol';

export type PortSide = 'top' | 'bottom' | 'left' | 'right';

export type Port = {
  id: string;
  side: PortSide;
  connected: boolean;
  connectedTo?: string;
};

export type PlacedPiece = {
  id: string;
  type: PieceType;
  category: PieceCategory;
  gridX: number;
  gridY: number;
  ports: Port[];
  rotation: number;
  isPrePlaced?: boolean;
  condition?: (configuration: number) => boolean;
  // Config Node per-piece gate value (0 or 1). Default 1.
  configValue?: number;
  // Counter state — increments per pulse, resets when threshold reached
  threshold?: number;
  count?: number;
  // Latch state — persists across pulses within one run
  latchMode?: 'write' | 'read' | 'delay';
  storedValue?: number | null;
  // Splitter magnet mechanic — the two sides where magnets connected
  // to adjacent pieces. Max 2. Populated by computeSplitterMagnets.
  connectedMagnetSides?: PortSide[];
  // Set to true when piece is activated during a run. Reset before each run.
  firedDuringRun?: boolean;
};

// ─── Connections ──────────────────────────────────────────────────────────────

export type Wire = {
  id: string;
  fromPieceId: string;
  fromPortId: string;
  toPieceId: string;
  toPortId: string;
};

// ─── Data Trail (Turing tape) ─────────────────────────────────────────────────

export type DataTrail = {
  cells: (0 | 1 | null)[];
  headPosition: number;
};

// ─── Output Tape BLANK semantics (SE-TM-003) ──────────────────────────────────
//
// An output-tape cell is BLANK until a Transmitter writes a value to it for
// that pulse. BLANK is a first-class tape symbol — distinct from the numeric
// values 0 and 1 at the type level (not merely by the old `-1` convention),
// so the comparator can treat "this pulse must produce no output" as a real
// requirement rather than a sentinel hack.
//
// Representation: a string-literal const. It is `===`-comparable to itself
// (so the `outputTape.every((v, i) => v === expectedOutput[i])` win check
// works unchanged), survives any JSON round-trip a numeric/Symbol sentinel
// would not, and can never collide with a legitimate 0/1 tape value.
export const BLANK = '__BLANK__' as const;
export type Blank = typeof BLANK;

// A single output-tape cell: a written digit, or BLANK if no Transmitter
// wrote to it on that pulse.
export type OutputTapeValue = number | Blank;

// ─── Machine State ────────────────────────────────────────────────────────────

export type MachineStatus = 'idle' | 'running' | 'locked' | 'void';

export type MachineState = {
  pieces: PlacedPiece[];
  wires: Wire[];
  dataTrail: DataTrail;
  configuration: number;
  isRunning: boolean;
  signalPath: string[];
  currentSignalStep: number;
  status: MachineStatus;
  // Turing tape — populated for tape-enabled levels. outputTape accumulates
  // across pulses; inputTape is read-only per pulse.
  inputTape?: number[];
  // outputTape cells start as BLANK and are overwritten with a written
  // digit when a Transmitter fires for that pulse (SE-TM-003).
  outputTape?: OutputTapeValue[];
};

// ─── Level Definition ─────────────────────────────────────────────────────────

export type LevelObjective = {
  type: 'reach_output' | 'reach_output_with_value' | 'min_direction_changes';
  requiredValue?: number;
  // min_direction_changes — the minimum number of Gear-driven direction
  // changes the executed signal path must contain (GAME-02). A1-4 sets
  // count: 2 to enforce the two-bend route that teaches multi-turn routing.
  count?: number;
};

// ─── Consequence Level Config ─────────────────────────────────────────────

export type ConsequenceConfig = {
  // COGS pre-launch line — weight only, no specifics
  cogsWarning: string;
  // What breaks on failure (hidden from player until failure occurs)
  failureEffect: string;
  // For boss consequence levels: require 3 stars to avoid consequence
  requireThreeStars?: boolean;
};

export type LevelDefinition = {
  id: string;
  name: string;
  sector: string;
  description: string;
  cogsLine: string;
  eyeState?: 'blue' | 'amber' | 'green' | 'red' | 'dark';
  gridWidth: number;
  gridHeight: number;
  prePlacedPieces: PlacedPiece[];
  availablePieces: PieceType[];
  dataTrail: DataTrail;
  objectives: LevelObjective[];
  optimalPieces: number;
  systemRepaired?: string;
  budget?: number;
  tutorialHints?: TutorialHint[];
  tutorialSteps?: TutorialStep[];
  scoringCategoriesVisible?: ScoringCategory[];
  // Consequence levels — undefined for normal levels
  consequence?: ConsequenceConfig;
  // Turing tape — optional. When defined, level runs N pulses and the
  // engine threads pulseIndex through protocol pieces. Single-pulse
  // levels leave both undefined.
  inputTape?: number[];
  // expectedOutput may include BLANK (SE-TM-003): a level CAN require that a
  // given pulse produce no output. The comparison is a plain `===` per cell,
  // so BLANK in expectedOutput matches a BLANK (unwritten) output cell.
  expectedOutput?: OutputTapeValue[];
  // Minimum number of pulses that must reach Terminal for the level
  // to pass. If omitted, defaults to 1 (any single successful pulse
  // is sufficient). For tape-enabled levels without a Transmitter,
  // this replaces expectedOutput as the success condition.
  requiredTerminalCount?: number;
  // Documentation fields — not rendered in game. Used by level designers
  // to verify each level teaches what it claims to teach.
  computationalGoal?: string;
  conceptTaught?: string;
  prerequisiteConcept?: string;
  tapeDesignRationale?: string;
  difficultyBand?: 'intuitive' | 'derivable' | 'abstract' | 'hidden';
  narrativeFrame?: string;
  // Economy fields (v3) — drive the REQUISITION store in Kepler+
  freeTapes?: ('IN' | 'TRAIL' | 'OUT')[];
  purchasableTapes?: ('TRAIL' | 'OUT')[];
  creditBudget?: number;
  depthCeiling?: number;
  baseReward?: number;
  // Kepler mechanics — not used in K1-1 but type is defined here
  damagedCells?: Array<{ gridX: number; gridY: number }>;
  requiredPieces?: Array<{ type: string; count: number; reason?: string }>;
  // Board-topology requirements (SE-TM-035). Additive/documentary data the
  // Spec Sheet surfaces and the topology validator evaluates. Independent of
  // the output-tape comparator (SE-TM-001/002) — a level may have a topology
  // requirement, an output requirement, both, or neither. Declaring this field
  // does NOT by itself gate win/lose: A1-4 already enforces its two-bend
  // requirement via a `min_direction_changes` objective, so its
  // topologyRequirements mirror an already-live gate rather than adding one.
  topologyRequirements?: TopologyRequirements;
  // MAY conditions (SE-TM-031a) — optional "above and beyond" goals that pay a
  // bonus on a 3-star clear. Never required for completion or 3 stars. Surfaced
  // on the Spec Sheet MAY section. Absent on Axiom levels by design.
  mayConditions?: MayCondition[];
};

// ─── Topology Requirements (SE-TM-035) ────────────────────────────────────────
//
// A board-topology SHALL: a structural condition the placed machine must meet,
// expressed as facts about the pieces on the board (not the output tape). The
// validator (src/game/spec/topologyValidator.ts) holds a predicate registry
// keyed by these fields, so adding a future predicate type (e.g. corruption/
// drift per Section 8 #1, Unit E) means adding a key here and an evaluator
// there — no rewrite of the consumers.
export type TopologyRequirements = {
  // Minimum number of direction-change pieces (Gears) the machine must contain.
  // The Gear is the only piece that redirects the signal (see engine.ts gear
  // case / objectives.ts countDirectionChanges), so each placed Gear is one
  // direction change.
  minDirectionChanges?: number;
};

// ─── MAY conditions (SE-TM-031a) ───────────────────────────────────────────
//
// The "above and beyond" incentive track. A MAY condition is OPTIONAL — it
// never gates stars or completion (CLAUDE.md Design Principle 10, free-to-play
// guarantee: a MAY must never be required for 3 stars, and a MAY-gated reward
// must never be the only path to anything needed for free completion). Meeting
// one alongside a 3-star clear pays a bonus ON TOP of the normal CR reward.
//
// Per the discovery spec these are effectively absent in the Axiom sector
// (Spec Sheets there are simple/guaranteed-by-passing) and become meaningful
// from Kepler, where variable inputs + the expanding tray give "above and
// beyond" room to exist. The data model ships now so Kepler levels can declare
// them without engine changes.

// A post-run predicate over the completed machine. Evaluated only on success.
export type MayPredicate =
  // Solved using no more than `max` player-placed pieces.
  | { type: 'underPieceCount'; max: number }
  // Solved without placing any Protocol-category piece.
  | { type: 'noProtocolPieces' }
  // Locked within `max` seconds of engaging.
  | { type: 'underSeconds'; max: number };

// What meeting a MAY condition pays out. `credits` is additive to the level's
// normal reward. `powerup` is a STUB reward type only — no power-up system
// exists yet (SE-TM-031a); it is recorded but not granted until that system
// lands. Surfaced so level data can be authored ahead of the feature.
export type MayReward =
  | { type: 'credits'; amount: number }
  | { type: 'powerup'; powerupId: string };

export type MayCondition = {
  id: string;
  // [PROPOSED] COGS-voice line describing the optional goal. Must describe the
  // goal, never leak the solution. Surfaced as the MAY section on the Spec Sheet.
  description: string;
  predicate: MayPredicate;
  reward: MayReward;
};

// ─── Ship Systems ────────────────────────────────────────────────────────

export type ShipSystem =
  | 'emergencyPower'
  | 'lifeSupport'
  | 'navigationArray'
  | 'propulsionCore'
  | 'communicationArray'
  | 'sensorGrid'
  | 'weaponsLock'
  | 'bridgeSystems';

// ─── Narrative Consequence System ────────────────────────────────────────

export type LevelModifier = {
  type: 'reduced_piece_set' | 'no_hints' | 'harder_grid';
  description: string;
};

export type MechanicalEffect = {
  type: 'damage_system' | 'steal_credits' | 'lock_codex_entry' |
        'add_modifier' | 'damage_cogs_integrity';
  system?: ShipSystem;
  creditAmount?: number;
  creditPercent?: number;
  codexEntryId?: string;
  modifier?: LevelModifier;
  integrityAmount?: number;
};

export type NarrativeEffect = {
  type: 'hostile_contact' | 'mystery_deepen' | 'codex_redact' |
        'sector_modifier';
  description: string;
  duration: 'permanent' | 'next_n_levels';
  levelsAffected?: number;
};

export type NarrativeConsequence = {
  id: string;
  sectorId: string;
  triggerLevelId: string;
  triggerCondition: 'fail' | 'below3star' | 'below2star';
  mechanicalEffects: MechanicalEffect[];
  narrativeEffects: NarrativeEffect[];
  cogsImmediateResponse: string;
  cogsLaterReaction: string;
  cogsOnRepair: string;
};

export type CreditTransaction = {
  amount: number;
  reason: string;
  timestamp: number;
};

// ─── Piece Costs ─────────────────────────────────────────────────────────

export const PIECE_COSTS: Partial<Record<PieceType, number>> = {
  conveyor: 5,
  gear: 10,
  splitter: 15,
  merger: 15,
  bridge: 20,
  configNode: 25,
  scanner: 30,
  latch: 30,
  transmitter: 35,
};

const PROTOCOL_PIECES: PieceType[] = ['configNode', 'scanner', 'transmitter', 'latch'];
const PHYSICS_PIECES: PieceType[] = ['conveyor', 'gear', 'splitter', 'merger', 'bridge'];

export function getPieceCost(
  pieceType: PieceType,
  discipline: 'systems' | 'drive' | 'field' | null,
): number {
  const base = PIECE_COSTS[pieceType] ?? 0;
  if (base === 0) return 0;
  if (discipline === 'systems' && PROTOCOL_PIECES.includes(pieceType)) {
    return Math.floor(base * 0.8);
  }
  if (discipline === 'drive' && PHYSICS_PIECES.includes(pieceType)) {
    return Math.floor(base * 0.8);
  }
  if (discipline === 'field') {
    return Math.floor(base * 0.9);
  }
  return base;
}

// ─── Tutorial Hints ──────────────────────────────────────────────────────────

export type TutorialTrigger = 'onMount' | 'onFirstPiecePlaced' | 'onEngage' | 'onVoid' | 'onSuccess';

export type TutorialHint = {
  key: string;
  trigger: TutorialTrigger;
  text: string;
};

export type TutorialStepEye = 'blue' | 'amber' | 'green';

export type TutorialStep = {
  id: string;
  // PROMPT_146: legacy per-step mission sub-header. Its only renderer was
  // removed (UX-02), and superseded by the generic '???' discovery caption
  // (PROMPT_143). Retained as an optional field for now; data removed from
  // levels.ts. Full type-field removal is a follow-up candidate.
  label?: string;
  targetRef: string;
  eyeState: TutorialStepEye;
  message: string;
  highlightWords?: string[];
  highlightAmberWords?: string[];
  showDemo?: boolean;
  demoText?: string;
  codexEntryId?: string;
  // Discovery caption rendered as a label above the highlight square. Holds
  // either '???' (a "notice" beat — COGS has not catalogued it yet) or the
  // piece/entity name (a "reveal" beat — e.g. 'CONVEYOR', 'SOURCE'). The same
  // label slot hosts both across the capture, so every piece is discovered the
  // same way. Decoupled from persisted discovery state so the caption replays
  // with the tutorial (the tutorial is a re-enactment).
  captionLabel?: string;
  // Beat 2: pause tutorial until this piece type is placed on the board
  awaitPlacement?: PieceType;
  // Beat 4: allow taps to pass through the overlay to the board beneath
  allowPieceTap?: boolean;
  // Beat 4a: advance automatically when this piece type is tapped on board
  awaitPieceTap?: PieceType;
};

// ─── Scoring Category Visibility ─────────────────────────────────────────────

export type ScoringCategory = 'efficiency' | 'chainIntegrity' | 'protocolPrecision' | 'disciplineBonus' | 'speedBonus' | 'elaboration';

// ─── Daily Challenge ─────────────────────────────────────────────────────────

export type ChallengeSender = {
  id: string;
  name: string;
  type: 'known_contact' | 'unknown' | 'pirate_adjacent' | 'government' | 'distress';
  sector: string;
  description: string;
};

export type ChallengeReward = {
  type: 'credits' | 'rare_piece_unlock' | 'hint_tokens' | 'codex_entry' | 'credits_and_bonus';
  creditAmount?: number;
  hintTokens?: number;
  codexEntryId?: string;
  bonusDescription?: string;
};

export type DailyChallenge = {
  date: string;
  puzzleId: string;
  sender: ChallengeSender;
  reward: ChallengeReward;
  cogsPresentation: string;
  cogsFullBrief: string;
  cogsOnAttempt: string;
  cogsOnSuccess: string;
  cogsOnFailure: string;
  cogsOnDecline: string;
  level: LevelDefinition;
};

export type ChallengeRecord = {
  date: string;
  senderName: string;
  result: '3star' | 'sub3star' | 'failed' | 'declined';
  creditsEarned: number;
  puzzleType: string;
};

// ─── Execution ────────────────────────────────────────────────────────────────

export type ExecutionStep = {
  pieceId: string;
  type: string;
  timestamp: number;
  success: boolean;
  message?: string;
  branchId?: string;
};
