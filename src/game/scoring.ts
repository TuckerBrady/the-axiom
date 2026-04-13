import type { ExecutionStep, PlacedPiece, PieceType, ConsequenceConfig } from './types';
import type { Discipline } from '../store/playerStore';

// ─── Score thresholds ────────────────────────────────────────────────────────

function starsFromTotal(total: number): 0 | 1 | 2 | 3 {
  if (total >= 80) return 3;
  if (total >= 55) return 2;
  if (total >= 30) return 1;
  return 0;
}

// ─── Category helpers ────────────────────────────────────────────────────────

const PROTOCOL_TYPES: PieceType[] = ['configNode', 'scanner', 'transmitter'];
const PHYSICS_TYPES: PieceType[] = ['conveyor', 'gear', 'splitter'];

function isProtocol(type: PieceType): boolean {
  return PROTOCOL_TYPES.includes(type);
}

// ─── Category 1: Completion Bonus (max 25) ───────────────────────────────────

function calcCompletionBonus(succeeded: boolean): number {
  return succeeded ? 25 : 0;
}

// ─── Category 2: Machine Complexity (max 30) ─────────────────────────────────
// Rewards using ALL tray pieces in a working machine.
// "Active" means the piece was placed AND signal passed through it.

function calcMachineComplexity(
  steps: ExecutionStep[],
  playerPieces: PlacedPiece[],
  totalTrayPieces: number,
): number {
  if (totalTrayPieces <= 0) return 30; // No tray → full marks
  const touchedIds = new Set(steps.filter(s => s.success).map(s => s.pieceId));
  const activePieces = playerPieces.filter(p => touchedIds.has(p.id)).length;
  return Math.round((activePieces / totalTrayPieces) * 30);
}

// ─── Category 3: Protocol Precision (max 20) ─────────────────────────────────
// Percentage of Protocol pieces that were touched by signal.

function calcProtocolPrecision(steps: ExecutionStep[]): number {
  const protocolTouched = steps.filter(
    s => s.success && PROTOCOL_TYPES.includes(s.type as PieceType),
  ).length;
  if (protocolTouched >= 5) return 20;
  if (protocolTouched >= 4) return 16;
  if (protocolTouched >= 3) return 12;
  if (protocolTouched >= 2) return 8;
  if (protocolTouched >= 1) return 4;
  return 0;
}

// ─── Category 4: Path Integrity (max 15) ─────────────────────────────────────
// Percentage of ALL placed pieces that were touched by signal.
// Rewards clean machines where every piece contributes.

function calcPathIntegrity(steps: ExecutionStep[], playerPieces: PlacedPiece[]): number {
  if (playerPieces.length === 0) return 15;
  const touchedIds = new Set(steps.map(s => s.pieceId));
  const touched = playerPieces.filter(p => touchedIds.has(p.id)).length;
  return Math.round((touched / playerPieces.length) * 15);
}

// ─── Category 5: Speed Bonus (max 10) ────────────────────────────────────────

function calcSpeedBonus(engageDurationMs: number, elapsedSeconds?: number): number {
  const seconds = elapsedSeconds && elapsedSeconds > 0 ? elapsedSeconds : engageDurationMs / 1000;
  if (seconds < 10) return 10;
  if (seconds <= 20) return 7;
  if (seconds <= 45) return 4;
  return 0;
}

// ─── Main scoring function ───────────────────────────────────────────────────

export interface ScoreBreakdown {
  completionBonus: number;
  machineComplexity: number;
  protocolPrecision: number;
  pathIntegrity: number;
  speedBonus: number;
  // Legacy aliases for backward compatibility in UI
  efficiency: number;
  chainIntegrity: number;
  disciplineBonus: number;
}

export interface ScoreResult {
  total: number;
  stars: 0 | 1 | 2 | 3;
  breakdown: ScoreBreakdown;
}

export function calculateScore(params: {
  executionSteps: ExecutionStep[];
  placedPieces: PlacedPiece[];
  optimalPieces: number; // Reference only — not used in scoring. Scoring rewards using all tray pieces.
  totalTrayPieces?: number;
  discipline: NonNullable<Discipline>;
  engageDurationMs: number;
  elapsedSeconds?: number;
  succeeded?: boolean;
}): ScoreResult {
  const { executionSteps, placedPieces, totalTrayPieces, engageDurationMs, elapsedSeconds } = params;
  const succeeded = params.succeeded ?? executionSteps.some(s => s.type === 'outputPort' && s.success);

  const playerPieces = placedPieces.filter(p => !p.isPrePlaced);
  const trayTotal = totalTrayPieces ?? playerPieces.length; // fallback to placed count

  const completionBonus = calcCompletionBonus(succeeded);
  const machineComplexity = calcMachineComplexity(executionSteps, playerPieces, trayTotal);
  const protocolPrecision = calcProtocolPrecision(executionSteps);
  const pathIntegrity = calcPathIntegrity(executionSteps, playerPieces);
  const speedBonus = calcSpeedBonus(engageDurationMs, elapsedSeconds);

  const total = completionBonus + machineComplexity + protocolPrecision + pathIntegrity + speedBonus;
  const stars = starsFromTotal(total);

  return {
    total,
    stars,
    breakdown: {
      completionBonus,
      machineComplexity,
      protocolPrecision,
      pathIntegrity,
      speedBonus,
      // Legacy aliases — map to closest new category
      efficiency: completionBonus,
      chainIntegrity: pathIntegrity,
      disciplineBonus: machineComplexity,
    },
  };
}

// ─── Consequence level check ─────────────────────────────────────────────────

/**
 * Determines whether a consequence level's penalty triggers.
 *
 * Standard consequence levels (K2-4, K2-8):
 *   Any completion avoids the consequence. 1 star is fine.
 *
 * Boss consequence levels (K2-10, requireThreeStars: true):
 *   3 stars required. 1-2 stars triggers consequence even on completion.
 *
 * Free piece set guarantee: every consequence level's availablePieces
 * array MUST be verified solvable at 3 stars without spending any credits.
 * The solve path exists. Credits are emergency only.
 */
export function doesConsequenceTrigger(
  consequence: ConsequenceConfig | undefined,
  succeeded: boolean,
  stars: 0 | 1 | 2 | 3,
): boolean {
  if (!consequence) return false;
  if (!succeeded) return true;
  if (consequence.requireThreeStars && stars < 3) return true;
  return false;
}

export function getConsequenceFailureLine(
  consequence: ConsequenceConfig,
  succeeded: boolean,
  stars: 0 | 1 | 2 | 3,
): string {
  if (!succeeded) {
    return consequence.failureEffect;
  }
  // Completed but not enough stars (boss level)
  if (consequence.requireThreeStars && stars < 3) {
    return 'You completed the mission. It was not enough. Precision matters here. The consequence stands.';
  }
  return '';
}

// ─── COGS score commentary ───────────────────────────────────────────────────

export function getCOGSScoreComment(
  breakdown: ScoreBreakdown,
  discipline: NonNullable<Discipline>,
  stars: 0 | 1 | 2 | 3,
  piecesUsed: number,
  totalTrayPieces: number,
): string {
  const total = breakdown.completionBonus + breakdown.machineComplexity +
    breakdown.protocolPrecision + breakdown.pathIntegrity + breakdown.speedBonus;

  if (total === 100) {
    return 'One hundred points. I am revising my estimates of you upward. That is not something I do often.';
  }

  if (stars === 3 && breakdown.machineComplexity >= 25) {
    return 'Full machine. Every piece working. That is the correct approach.';
  }

  if (breakdown.machineComplexity < 15) {
    return `You used ${piecesUsed} of ${totalTrayPieces} available pieces. The machine could be more elaborate. I encourage ambition.`;
  }
  if (breakdown.protocolPrecision === 0) {
    return 'You avoided the Protocol catalogue entirely. Technically valid.';
  }
  if (breakdown.pathIntegrity < 8) {
    return 'Several pieces you placed never saw the signal. I noticed.';
  }
  if (breakdown.speedBonus === 0) {
    return 'The solution was correct. The execution was considered. At considerable length.';
  }

  // Generic fallbacks by star rating
  if (stars === 3) return 'Optimal. I have updated my assessment accordingly.';
  if (stars === 2) return 'Functional. There was a more elaborate solution.';
  if (stars === 1) return 'It worked. I will note that it barely worked.';
  return 'The machine did not lock. Review your approach.';
}

// ─── Tutorial (Axiom) COGS quotes — honest about score, always 3 stars ──────

export function getTutorialCOGSComment(
  rawScore: number,
  discipline: NonNullable<Discipline>,
): string {
  if (rawScore >= 80) {
    switch (discipline) {
      case 'systems': return 'Optimal routing. Protocol instinct is correct.';
      case 'drive': return 'Clean chain. Every piece fired. Well done.';
      case 'field': return 'Efficient and adaptable. I have no notes.';
    }
  }
  if (rawScore >= 55) {
    switch (discipline) {
      case 'systems': return 'Functional. The solution worked. It was not particularly elegant, but it worked.';
      case 'drive': return 'The chain held. Some redundancy I noted. We will address that in later missions.';
      case 'field': return 'Complete. Not your most efficient work. Three stars recorded regardless. You are learning. That is the point.';
    }
  }
  switch (discipline) {
    case 'systems': return 'The mission is complete. I am recording three stars because this is a training level. The actual score was... noted.';
    case 'drive': return 'It ran. Eventually. Three stars, as required by the training protocol. Between us: there is room to improve.';
    case 'field': return 'Completed. I will be honest — the scoring engine was not impressed. But you finished it. That counts. Three stars.';
  }
}
