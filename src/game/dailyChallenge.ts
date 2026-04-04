import type {
  DailyChallenge, ChallengeSender, ChallengeReward,
  LevelDefinition, PieceType,
} from './types';
import { getDefaultPorts, getPieceCategory } from './engine';

// ─── Seeded random ───────────────────────────────────────────────────────────

function dateSeed(dateString: string): number {
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed += dateString.charCodeAt(i) * (i + 1);
  }
  return seed;
}

function seededPick<T>(arr: T[], seed: number, offset = 0): T {
  return arr[(seed + offset) % arr.length];
}

// ─── Sender pool ─────────────────────────────────────────────────────────────

const KNOWN_SENDERS: ChallengeSender[] = [
  {
    id: 'kepler_colonists',
    name: 'Kepler Station Council',
    type: 'known_contact',
    sector: 'Kepler Belt',
    description: 'The station council you helped restore power to.',
  },
  {
    id: 'nova_researcher',
    name: 'Dr. Yael Orin',
    type: 'known_contact',
    sector: 'Nova Fringe',
    description: 'A plasma physicist studying stellar formation.',
  },
];

const UNKNOWN_SENDERS: ChallengeSender[] = [
  {
    id: 'outer_rim_station',
    name: 'Unregistered Station — Outer Belt',
    type: 'unknown',
    sector: 'Unknown',
    description: 'No registration. Coordinates verified real.',
  },
  {
    id: 'derelict_signal',
    name: 'Automated Distress Beacon',
    type: 'distress',
    sector: 'Deep Void approach',
    description: 'An automated beacon. No crew detected.',
  },
  {
    id: 'colony_ship',
    name: 'Colony Vessel Perseverance',
    type: 'unknown',
    sector: 'Nova Fringe',
    description: 'A long-haul colony ship mid-transit.',
  },
];

const PIRATE_SENDER: ChallengeSender = {
  id: 'former_pirate',
  name: '[REDACTED]',
  type: 'pirate_adjacent',
  sector: 'Unknown',
  description: 'Coordinates match the vessel that boarded us.',
};

const GOV_SENDER: ChallengeSender = {
  id: 'sector_authority',
  name: 'Andros Cluster Authority',
  type: 'government',
  sector: 'Andros Cluster',
  description: 'The regional governing body.',
};

// ─── COGS presentation lines per sender ──────────────────────────────────────

const COGS_PRESENTATIONS: Record<string, string> = {
  kepler_colonists: 'The Kepler colonists. They have work. Given our history I call this a reasonable arrangement.',
  nova_researcher: 'A researcher in Nova Fringe. Dr. Orin. Legitimate credentials. The work is signal calibration through a plasma interference field. Technically interesting.',
  outer_rim_station: 'Unregistered sender. Outer belt coordinates. The credits are real. The sender is opaque. I leave this to you.',
  derelict_signal: 'An automated distress signal. No crew. The beacon is offering a reward — which I find unusual for an automated system. Something is aboard that vessel. Possibly. I am speculating.',
  colony_ship: 'A colony vessel in transit. They need a routing problem solved. Mid-journey. They cannot stop. Neither can we, technically. But the credits are good.',
  former_pirate: 'This transmission is from a vessel matching the profile of the ship that boarded us. They are offering work. I find that audacious. The credits are significant. I am conflicted. I will be honest about that.',
  sector_authority: 'The sector authority. Official channels. They rarely use official channels for small jobs. This is not a small job.',
};

const COGS_BRIEFS: string[] = [
  'The signal requires routing through a non-standard grid. Standard engineering. Above-average compensation.',
  'Calibration work. The grid is tight. The margin for error is narrow. I recommend attention to detail.',
  'Infrastructure repair. Remote location. The coordinates check out. The work is genuine.',
  'Emergency rerouting. Time-sensitive. The grid configuration is unusual but solvable.',
  'Diagnostic relay puzzle. They need confirmation their routing is viable before committing resources.',
];

const COGS_ON_ATTEMPT: string[] = [
  'Engaging. One attempt. Make it count.',
  'The puzzle is loaded. I will observe.',
  'Transmission accepted. The grid is live.',
];

const COGS_ON_SUCCESS: string[] = [
  'Three stars. The sender is satisfied. So am I. Credits transferred.',
  'Bounty complete. Optimal performance. I have updated the sender on our capabilities.',
  'Mission accomplished. The credits are yours. The reputation is ours.',
];

const COGS_ON_FAILURE: string[] = [
  'The mission window has closed. The reward is forfeited. I will not comment further.',
  'Sub-optimal. The sender will find another engineer. We move on.',
  'The bounty is lost. I am logging this for our records. That is all.',
];

const COGS_ON_DECLINE: string[] = [
  'Declined. The transmission will expire at midnight. I understand.',
  'Noted. The work will go to someone else. That is acceptable.',
  'You have declined. I will not ask why. The offer remains until midnight.',
];

// ─── Puzzle generation ───────────────────────────────────────────────────────

const GRID_OPTIONS: [number, number][] = [[7, 5], [8, 6], [9, 6]];

type PuzzleFocus = 'physics_heavy' | 'protocol_heavy' | 'mixed';

function generatePuzzleLevel(seed: number, date: string): LevelDefinition {
  const [gridW, gridH] = seededPick(GRID_OPTIONS, seed, 3);
  const focus: PuzzleFocus = seededPick(['physics_heavy', 'protocol_heavy', 'mixed'] as PuzzleFocus[], seed, 7);

  // Source and Output positions
  const sourceY = Math.floor(gridH / 2);
  const outputX = gridW - 2;

  // Pre-placed pieces
  const prePlaced: LevelDefinition['prePlacedPieces'] = [
    makePiece('source', 1, sourceY, true),
    makePiece('output', outputX, sourceY, true),
  ];

  let available: PieceType[] = [];
  let optimal = 3;

  switch (focus) {
    case 'physics_heavy':
      available = ['conveyor', 'conveyor', 'conveyor', 'conveyor', 'gear', 'gear', 'splitter'];
      optimal = seed % 2 === 0 ? 2 : 3;
      break;
    case 'protocol_heavy':
      available = ['conveyor', 'conveyor', 'conveyor', 'configNode', 'configNode', 'scanner', 'transmitter'];
      optimal = seed % 2 === 0 ? 3 : 4;
      break;
    case 'mixed':
      available = ['conveyor', 'conveyor', 'conveyor', 'gear', 'configNode', 'scanner', 'transmitter'];
      optimal = seed % 2 === 0 ? 4 : 5;
      break;
  }

  return {
    id: `DAILY-${date}`,
    name: 'Daily Bounty',
    sector: 'bounty',
    description: 'Incoming transmission — daily challenge puzzle.',
    cogsLine: 'Daily bounty. One attempt. Three stars required.',
    gridWidth: gridW,
    gridHeight: gridH,
    prePlacedPieces: prePlaced,
    availablePieces: available,
    dataTrail: focus === 'protocol_heavy' || focus === 'mixed'
      ? { cells: generateTrail(seed), headPosition: 0 }
      : { cells: [], headPosition: 0 },
    objectives: [{ type: 'reach_output' }],
    optimalPieces: optimal,
    budget: 30,
    scoringCategoriesVisible: ['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus'],
  };
}

function makePiece(type: PieceType, x: number, y: number, isPrePlaced: boolean) {
  return {
    id: `daily-${type}-${x}-${y}`,
    type,
    category: getPieceCategory(type),
    gridX: x,
    gridY: y,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced,
  };
}

function generateTrail(seed: number): (0 | 1)[] {
  const trail: (0 | 1)[] = [];
  for (let i = 0; i < 8; i++) {
    trail.push(((seed + i * 7) % 3 < 2 ? 1 : 0) as 0 | 1);
  }
  return trail;
}

// ─── Reward generation ───────────────────────────────────────────────────────

function generateReward(seed: number): ChallengeReward {
  const variant = seed % 5;
  switch (variant) {
    case 0: return { type: 'credits', creditAmount: 150 };
    case 1: return { type: 'credits', creditAmount: 200 };
    case 2: return { type: 'credits_and_bonus', creditAmount: 150, hintTokens: 2, bonusDescription: '2 Hint Tokens' };
    case 3: return { type: 'credits_and_bonus', creditAmount: 175, bonusDescription: 'Codex Lore Entry' };
    case 4: return { type: 'credits', creditAmount: 250 };
    default: return { type: 'credits', creditAmount: 150 };
  }
}

// ─── Sender selection ────────────────────────────────────────────────────────

function selectSender(seed: number, pirateConsequenceActive: boolean): ChallengeSender {
  // Weighted selection: known 40%, unknown 35%, pirate 15%, gov 10%
  const roll = seed % 100;
  if (roll < 40) return seededPick(KNOWN_SENDERS, seed, 11);
  if (roll < 75) return seededPick(UNKNOWN_SENDERS, seed, 13);
  if (roll < 90) {
    if (pirateConsequenceActive) return PIRATE_SENDER;
    return seededPick(UNKNOWN_SENDERS, seed, 17); // re-roll to unknown
  }
  return GOV_SENDER;
}

// ─── Main generation function ────────────────────────────────────────────────

export function generateDailyChallenge(
  dateString: string,
  pirateConsequenceActive = false,
): DailyChallenge {
  const seed = dateSeed(dateString);
  const sender = selectSender(seed, pirateConsequenceActive);
  const reward = generateReward(seed);
  const level = generatePuzzleLevel(seed, dateString);

  return {
    date: dateString,
    puzzleId: `DAILY-${dateString}`,
    sender,
    reward,
    cogsPresentation: COGS_PRESENTATIONS[sender.id] ?? 'Incoming transmission. Sender verified.',
    cogsFullBrief: seededPick(COGS_BRIEFS, seed, 19),
    cogsOnAttempt: seededPick(COGS_ON_ATTEMPT, seed, 23),
    cogsOnSuccess: seededPick(COGS_ON_SUCCESS, seed, 29),
    cogsOnFailure: seededPick(COGS_ON_FAILURE, seed, 31),
    cogsOnDecline: seededPick(COGS_ON_DECLINE, seed, 37),
    level,
  };
}

// ─── Date helper ─────────────────────────────────────────────────────────────

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
