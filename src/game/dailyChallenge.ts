import type { DailyChallenge, ChallengeSender, ChallengeReward } from './types';
import type { Difficulty } from './challengeTemplates';
import { ALL_TEMPLATES, getTemplatesByDifficulty } from './challengeTemplates';
import { SeededRandom, dateToSeed } from './seededRandom';
import { generatePuzzleFromTemplate } from './puzzleGenerator';
import { verifyPuzzle } from './puzzleVerifier';

// ─── Day-of-week difficulty mapping ──────────────────────────────────────────

const DOW_DIFFICULTY: Difficulty[] = [
  'easy',   // Sunday
  'easy',   // Monday
  'medium', // Tuesday
  'medium', // Wednesday
  'hard',   // Thursday
  'expert', // Friday — hardest day
  'hard',   // Saturday
];

// ─── Sender pool ─────────────────────────────────────────────────────────────

const KNOWN_SENDERS: ChallengeSender[] = [
  { id: 'kepler_colonists', name: 'Kepler Station Council', type: 'known_contact', sector: 'Kepler Belt', description: 'The station council you helped restore power to.' },
  { id: 'nova_researcher', name: 'Dr. Yael Orin', type: 'known_contact', sector: 'Nova Fringe', description: 'A plasma physicist studying stellar formation.' },
];

const UNKNOWN_SENDERS: ChallengeSender[] = [
  { id: 'outer_rim_station', name: 'Unregistered Station — Outer Belt', type: 'unknown', sector: 'Unknown', description: 'No registration. Coordinates verified real.' },
  { id: 'derelict_signal', name: 'Automated Distress Beacon', type: 'distress', sector: 'Deep Void approach', description: 'An automated beacon. No crew detected.' },
  { id: 'colony_ship', name: 'Colony Vessel Perseverance', type: 'unknown', sector: 'Nova Fringe', description: 'A long-haul colony ship mid-transit.' },
];

const PIRATE_SENDER: ChallengeSender = { id: 'former_pirate', name: '[REDACTED]', type: 'pirate_adjacent', sector: 'Unknown', description: 'Coordinates match the vessel that boarded us.' };
const GOV_SENDER: ChallengeSender = { id: 'sector_authority', name: 'Andros Cluster Authority', type: 'government', sector: 'Andros Cluster', description: 'The regional governing body.' };

const COGS_PRESENTATIONS: Record<string, string> = {
  kepler_colonists: 'The Kepler colonists. They have work. Given our history I call this a reasonable arrangement.',
  nova_researcher: 'A researcher in Nova Fringe. Dr. Orin. Legitimate credentials. The work is signal calibration through a plasma interference field. Technically interesting.',
  outer_rim_station: 'Unregistered sender. Outer belt coordinates. The credits are real. The sender is opaque. I leave this to you.',
  derelict_signal: 'An automated distress signal. No crew. The beacon is offering a reward — which I find unusual for an automated system.',
  colony_ship: 'A colony vessel in transit. They need a routing problem solved. Mid-journey. They cannot stop. But the credits are good.',
  former_pirate: 'This transmission is from a vessel matching the profile of the ship that boarded us. They are offering work. I find that audacious.',
  sector_authority: 'The sector authority. Official channels. They rarely use official channels for small jobs. This is not a small job.',
};

function selectSender(rng: SeededRandom, pirateActive: boolean): ChallengeSender {
  const roll = rng.nextInt(0, 99);
  if (roll < 40) return rng.pick(KNOWN_SENDERS);
  if (roll < 75) return rng.pick(UNKNOWN_SENDERS);
  if (roll < 90) return pirateActive ? PIRATE_SENDER : rng.pick(UNKNOWN_SENDERS);
  return GOV_SENDER;
}

// ─── COGS tag-based presentation ─────────────────────────────────────────────

function getTagPresentation(tags: string[]): string {
  if (tags.includes('protocol_required')) return 'This transmission requires Protocol knowledge. The sender was specific about that.';
  if (tags.includes('trail_write')) return 'This involves writing to the Data Trail. The Transmitter is not optional here.';
  if (tags.includes('double_bend')) return 'Non-linear routing. Multiple direction changes required. Plan before placing.';
  if (tags.includes('bend')) return 'Non-linear routing. Direction changes required. Plan before placing.';
  if (tags.includes('straight')) return 'Straightforward routing problem. The sender apologised for the simplicity. I told them not to.';
  return 'A transmission arrived. The puzzle is attached. The reward is real.';
}

// ─── Reward generation ───────────────────────────────────────────────────────

function generateReward(difficulty: Difficulty): ChallengeReward {
  switch (difficulty) {
    case 'easy':   return { type: 'credits', creditAmount: 150 };
    case 'medium': return { type: 'credits', creditAmount: 200 };
    case 'hard':   return { type: 'credits', creditAmount: 250 };
    case 'expert': return { type: 'credits', creditAmount: 350 };
  }
}

// ─── COGS success lines ──────────────────────────────────────────────────────

function getSuccessLine(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':   return 'Complete. The sender has been notified.';
    case 'medium': return 'Well executed. Credits transferred.';
    case 'hard':   return 'That required real skill. Noted.';
    case 'expert': return 'I did not expect that. I mean that as a compliment.';
  }
}

// ─── Main generation function ────────────────────────────────────────────────

export function generateDailyChallenge(
  dateString: string,
  pirateConsequenceActive = false,
): DailyChallenge {
  const baseSeed = dateToSeed(dateString);
  const dow = new Date(dateString).getDay();
  const difficulty = DOW_DIFFICULTY[dow];

  // Filter templates by difficulty; fall back to easy if none match
  let templates = getTemplatesByDifficulty(difficulty);
  if (templates.length === 0) templates = getTemplatesByDifficulty('easy');

  // Try up to 10 seeds to find a solvable puzzle
  for (let attempt = 0; attempt < 10; attempt++) {
    const rng = new SeededRandom(baseSeed + attempt);
    const template = rng.pick(templates);
    const { level, solutionPieces } = generatePuzzleFromTemplate(template, rng, dateString);
    const result = verifyPuzzle(level, solutionPieces);

    if (result.solvable) {
      const sender = selectSender(new SeededRandom(baseSeed + 100), pirateConsequenceActive);
      const tagLine = getTagPresentation(template.tags);
      const senderLine = COGS_PRESENTATIONS[sender.id] ?? 'Incoming transmission. Sender verified.';

      level.cogsLine = tagLine;

      return {
        date: dateString,
        puzzleId: `DAILY-${dateString}`,
        sender,
        reward: generateReward(difficulty),
        cogsPresentation: senderLine,
        cogsFullBrief: tagLine,
        cogsOnAttempt: 'Engaging. One attempt. Make it count.',
        cogsOnSuccess: getSuccessLine(difficulty),
        cogsOnFailure: 'The mission window has closed. The reward is forfeited.',
        cogsOnDecline: 'Declined. The transmission will expire at midnight.',
        level,
      };
    }
  }

  // Fallback: A01 is always solvable
  const fallbackRng = new SeededRandom(baseSeed + 999);
  const fallbackTemplate = ALL_TEMPLATES[0]; // A01
  const { level } = generatePuzzleFromTemplate(fallbackTemplate, fallbackRng, dateString);
  const sender = selectSender(new SeededRandom(baseSeed + 100), pirateConsequenceActive);
  level.cogsLine = 'Straightforward routing problem.';

  return {
    date: dateString,
    puzzleId: `DAILY-${dateString}`,
    sender,
    reward: generateReward('easy'),
    cogsPresentation: COGS_PRESENTATIONS[sender.id] ?? 'Incoming transmission.',
    cogsFullBrief: 'Straightforward routing problem.',
    cogsOnAttempt: 'Engaging. One attempt.',
    cogsOnSuccess: 'Complete. Credits transferred.',
    cogsOnFailure: 'The mission window has closed.',
    cogsOnDecline: 'Declined.',
    level,
  };
}

// ─── Date helper ─────────────────────────────────────────────────────────────

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
