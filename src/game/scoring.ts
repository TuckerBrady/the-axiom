import type { ExecutionStep, PlacedPiece, PieceType, ConsequenceConfig } from './types';
import type { Discipline } from '../store/playerStore';

// ─── Score thresholds ────────────────────────────────────────────────────────

function starsFromTotal(total: number): 0 | 1 | 2 | 3 {
  if (total >= 80) return 3;
  if (total >= 55) return 2;
  if (total >= 30) return 1;
  return 0;
}

// ─── Piece type sets ─────────────────────────────────────────────────────────

const PROTOCOL_TYPES: PieceType[] = [
  'configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch',
];

// ─── Active-piece helpers ────────────────────────────────────────────────────

function getActiveIds(steps: ExecutionStep[]): Set<string> {
  return new Set(steps.filter(s => s.success).map(s => s.pieceId));
}

// Splits playerPieces into tray-supplied vs purchased, then identifies
// which purchased pieces were in the active signal path.
function splitPurchased(
  steps: ExecutionStep[],
  playerPieces: PlacedPiece[],
  trayPieceTypes: PieceType[],
): { purchasedPieces: PlacedPiece[]; purchasedActive: PlacedPiece[] } {
  const trayCounts: Partial<Record<PieceType, number>> = {};
  for (const pt of trayPieceTypes) {
    trayCounts[pt] = (trayCounts[pt] ?? 0) + 1;
  }
  const remaining: Partial<Record<PieceType, number>> = { ...trayCounts };
  const purchasedPieces: PlacedPiece[] = [];
  for (const p of playerPieces) {
    if ((remaining[p.type] ?? 0) > 0) {
      remaining[p.type] = remaining[p.type]! - 1;
    } else {
      purchasedPieces.push(p);
    }
  }
  const activeIds = getActiveIds(steps);
  return {
    purchasedPieces,
    purchasedActive: purchasedPieces.filter(p => activeIds.has(p.id)),
  };
}

// ─── Category 1: Completion (max 25) ─────────────────────────────────────────
// lock = 25, void = 0. "lock" means signal reached Terminal (reach_output) or
// output tape matches expected (tape levels). Both are captured by `succeeded`.

function calcCompletion(succeeded: boolean): number {
  return succeeded ? 25 : 0;
}

// ─── Category 2: Path Integrity (max 15) ─────────────────────────────────────
// active player pieces / total player pieces * 15

function calcPathIntegrity(steps: ExecutionStep[], playerPieces: PlacedPiece[]): number {
  if (playerPieces.length === 0) return 15;
  const activeIds = getActiveIds(steps);
  const active = playerPieces.filter(p => activeIds.has(p.id)).length;
  return Math.round((active / playerPieces.length) * 15);
}

// ─── Category 3: Signal Depth (max 14) ───────────────────────────────────────
// Gated: 0 if no purchased active pieces (enforces floor-solve ceiling of 45).
// Otherwise: active player pieces / depthCeiling * 14.

function calcSignalDepth(
  steps: ExecutionStep[],
  playerPieces: PlacedPiece[],
  purchasedActiveCount: number,
  depthCeiling: number,
): number {
  if (purchasedActiveCount === 0) return 0;
  const activeIds = getActiveIds(steps);
  const activePieces = playerPieces.filter(p => activeIds.has(p.id)).length;
  return Math.min(Math.round((activePieces / depthCeiling) * 14), 14);
}

// ─── Category 4: Investment (max 25) ─────────────────────────────────────────
// purchasedActive * 3 (cap 17) + tape investment (4 per purchased tape utilized, cap 8)

function calcInvestment(
  purchasedActiveCount: number,
  purchasedTapeTypesCount: number,
): number {
  const piecePoints = Math.min(purchasedActiveCount * 3, 17);
  const tapePoints = Math.min(purchasedTapeTypesCount * 4, 8);
  return piecePoints + tapePoints;
}

// ─── Category 5: Diversity (max 11) ──────────────────────────────────────────
// Gated: 0 if no purchased active pieces (enforces floor-solve ceiling of 45).
// distinct active player piece types / 6 * 11.

function calcDiversity(
  steps: ExecutionStep[],
  playerPieces: PlacedPiece[],
  purchasedActiveCount: number,
): number {
  if (purchasedActiveCount === 0) return 0;
  const activeIds = getActiveIds(steps);
  const activeTypes = new Set(
    playerPieces.filter(p => activeIds.has(p.id)).map(p => p.type),
  );
  return Math.min(Math.round((activeTypes.size / 6) * 11), 11);
}

// ─── Category 6: Discipline (max 10) ─────────────────────────────────────────
// Half credit (5) if no purchased active pieces. Full credit (10) otherwise.

function calcDiscipline(purchasedActiveCount: number): number {
  return purchasedActiveCount > 0 ? 10 : 5;
}

// ─── ScoreBreakdown ───────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  // v2 canonical fields (max: 25 + 15 + 14 + 25 + 11 + 10 = 100)
  completion: number;
  pathIntegrity: number;
  signalDepth: number;
  investment: number;
  diversity: number;
  discipline: number;

  // v1 backward-compat aliases — UI and older consumers read these
  completionBonus: number;       // = completion
  machineComplexity: number;     // = investment
  protocolPrecision: number;     // = diversity
  speedBonus: number;            // 0 (removed in v2)
  elaboration: number;           // = signalDepth
  purchasedTouchedCount: number; // = purchasedActiveCount (drives credit multiplier)

  // pre-v1 legacy aliases
  efficiency: number;            // = completion
  chainIntegrity: number;        // = pathIntegrity
  disciplineBonus: number;       // = discipline
}

export interface ScoreResult {
  total: number;
  stars: 0 | 1 | 2 | 3;
  breakdown: ScoreBreakdown;
}

// ─── Main scoring function ───────────────────────────────────────────────────

export function calculateScore(params: {
  executionSteps: ExecutionStep[];
  placedPieces: PlacedPiece[];
  optimalPieces: number;
  totalTrayPieces?: number;       // retained for compat, not used in v2
  trayPieceTypes?: PieceType[];
  purchasedTapeTypes?: string[];  // tape types purchased AND utilized by the player
  depthCeiling?: number;          // from level definition; defaults to optimalPieces * 2
  discipline: NonNullable<Discipline>;
  engageDurationMs: number;       // retained for compat, not used in v2
  elapsedSeconds?: number;        // retained for compat, not used in v2
  succeeded?: boolean;
}): ScoreResult {
  const {
    executionSteps,
    placedPieces,
    optimalPieces,
    trayPieceTypes = [],
    purchasedTapeTypes = [],
  } = params;

  const succeeded = params.succeeded
    ?? executionSteps.some(s => s.type === 'terminal' && s.success);

  // depthCeiling defaults to optimalPieces * 2, with a floor of 1 to avoid /0
  const effectiveDepthCeiling = (params.depthCeiling && params.depthCeiling > 0)
    ? params.depthCeiling
    : Math.max(optimalPieces * 2, 1);

  const playerPieces = placedPieces.filter(p => !p.isPrePlaced);
  const { purchasedActive } = splitPurchased(executionSteps, playerPieces, trayPieceTypes);
  const purchasedActiveCount = purchasedActive.length;

  const completion    = calcCompletion(succeeded);
  const pathIntegrity = calcPathIntegrity(executionSteps, playerPieces);
  const signalDepth   = calcSignalDepth(executionSteps, playerPieces, purchasedActiveCount, effectiveDepthCeiling);
  const investment    = calcInvestment(purchasedActiveCount, purchasedTapeTypes.length);
  const diversity     = calcDiversity(executionSteps, playerPieces, purchasedActiveCount);
  const discipline    = calcDiscipline(purchasedActiveCount);

  const total = completion + pathIntegrity + signalDepth + investment + diversity + discipline;
  const stars = starsFromTotal(total);

  return {
    total,
    stars,
    breakdown: {
      // v2 canonical
      completion,
      pathIntegrity,
      signalDepth,
      investment,
      diversity,
      discipline,
      // v1 compat aliases
      completionBonus: completion,
      machineComplexity: investment,
      protocolPrecision: diversity,
      speedBonus: 0,
      elaboration: signalDepth,
      purchasedTouchedCount: purchasedActiveCount,
      // pre-v1 aliases
      efficiency: completion,
      chainIntegrity: pathIntegrity,
      disciplineBonus: discipline,
    },
  };
}

// ─── Consequence level check ─────────────────────────────────────────────────

/**
 * Determines whether a consequence level's penalty triggers.
 *
 * Standard consequence levels (K1-4, K1-8):
 *   Any completion avoids the consequence. 1 star is fine.
 *
 * Boss consequence levels (K1-10, requireThreeStars: true):
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
  const total = breakdown.completion + breakdown.pathIntegrity + breakdown.signalDepth +
    breakdown.investment + breakdown.diversity + breakdown.discipline;

  if (total >= 100) {
    return 'One hundred points. I am revising my estimates of you upward. That is not something I do often.';
  }
  if (breakdown.investment >= 17) {
    return 'Unnecessary complexity. Approved. The machine is better for it.';
  }
  if (stars === 3 && breakdown.investment >= 12) {
    return 'Full machine. Every piece working. That is the correct approach.';
  }
  if (breakdown.investment < 6) {
    return `You used ${piecesUsed} of ${totalTrayPieces} available pieces. The machine could be more elaborate. I encourage ambition.`;
  }
  if (breakdown.diversity === 0) {
    return 'You avoided the Protocol catalogue entirely. Technically valid.';
  }
  if (breakdown.pathIntegrity < 8) {
    return 'Several pieces you placed never saw the signal. I noticed.';
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
