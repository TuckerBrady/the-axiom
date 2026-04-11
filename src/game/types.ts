// ─── Piece System ─────────────────────────────────────────────────────────────

export type PieceType =
  | 'inputPort'
  | 'outputPort'
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
  | 'latch';

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
  latchMode?: 'write' | 'read';
  storedValue?: number | null;
  // Splitter magnet mechanic — the two sides where magnets connected
  // to adjacent pieces. Max 2. Populated by computeSplitterMagnets.
  connectedMagnetSides?: PortSide[];
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
  cells: (0 | 1)[];
  headPosition: number;
};

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
  outputTape?: number[];
};

// ─── Level Definition ─────────────────────────────────────────────────────────

export type LevelObjective = {
  type: 'reach_output' | 'reach_output_with_value';
  requiredValue?: number;
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
  expectedOutput?: number[];
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
  configNode: 25,
  scanner: 30,
  transmitter: 35,
};

const PROTOCOL_PIECES: PieceType[] = ['configNode', 'scanner', 'transmitter'];
const PHYSICS_PIECES: PieceType[] = ['conveyor', 'gear', 'splitter'];

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

export type TutorialStepEye = 'blue' | 'amber';

export type TutorialStep = {
  id: string;
  label: string;
  targetRef: string;
  eyeState: TutorialStepEye;
  message: string;
  highlightWords?: string[];
  highlightAmberWords?: string[];
  showDemo?: boolean;
  demoText?: string;
  codexEntryId?: string;
};

// ─── Scoring Category Visibility ─────────────────────────────────────────────

export type ScoringCategory = 'efficiency' | 'chainIntegrity' | 'protocolPrecision' | 'disciplineBonus' | 'speedBonus';

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
