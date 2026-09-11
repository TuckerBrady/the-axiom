// ─── Scoring Algorithm v2 (ENG-001 / AXM-010) ────────────────────────────────
//
// Implements project-docs/SPECS/scoring-algorithm-v2.md in full. Ratified as
// DEC-1 (Handoff 003, 2026-09-10), superseding the model this file
// previously implemented (Completion Bonus / Machine Complexity / Protocol
// Precision / Path Integrity / Speed Bonus / Elaboration Bonus).
//
// Six categories, four available on a floor solve (scaled so a perfect floor
// solve caps at 45 — REQ-32), two gated entirely behind investment. See the
// spec's Part 1 (design principles) and Part 3 (per-category REQ-8..REQ-27)
// for the normative text each function below implements.

import type { ExecutionStep, PlacedPiece, PieceType } from './types';
import type { Discipline } from '../store/playerStore';
import type { TapeType } from '../store/requisitionStore';

// ─── Score thresholds (REQ-30) ───────────────────────────────────────────────

function starsFromTotal(total: number): 0 | 1 | 2 | 3 {
  if (total >= 80) return 3;
  if (total >= 55) return 2;
  if (total >= 30) return 1;
  return 0;
}

// ─── Active-piece helpers ────────────────────────────────────────────────────

function getActiveIds(steps: ExecutionStep[]): Set<string> {
  return new Set(steps.filter(s => s.success).map(s => s.pieceId));
}

// Splits playerPieces into tray-supplied (pre-assigned, "floor solve" set)
// vs purchased, then identifies which purchased pieces were in the active
// signal path. A piece is "purchased" (REQ-43/44) when it isn't accounted
// for by the level's free tray allotment — matched by type/count, not
// identity, since the tray doesn't track per-instance provenance.
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

// REQ-16/23: the binary investment gate. Signal Depth and Diversity are 0
// unless at least one purchased piece was active — a gradient here would
// let a floor solve creep points into either category and break the
// floor-solve ceiling (REQ-1/32).
function investmentGate(purchasedActiveCount: number): 0 | 1 {
  return purchasedActiveCount >= 1 ? 1 : 0;
}

// ─── Category 1: Completion (max 25) — REQ-8/9/10 ────────────────────────────

function calcCompletion(succeeded: boolean): number {
  return succeeded ? 25 : 0;
}

// ─── Category 2: Path Integrity (max 15) — REQ-11/12/13 ──────────────────────

function calcPathIntegrity(activeCount: number, totalPlayerCount: number): number {
  if (totalPlayerCount === 0) return 15; // vacuously true — no dead weight
  return Math.round((activeCount / totalPlayerCount) * 15);
}

// ─── Category 3: Signal Depth (max 14) — REQ-14/15/16/17 ─────────────────────

function calcSignalDepth(
  activeCount: number,
  depthCeiling: number,
  purchasedActiveCount: number,
): number {
  if (investmentGate(purchasedActiveCount) === 0) return 0;
  const raw = (Math.min(activeCount, depthCeiling) / depthCeiling) * 14;
  return Math.round(raw);
}

// ─── Category 4: Investment (max 25) — REQ-18/19/20/21 ───────────────────────

function calcInvestment(
  purchasedActiveCount: number,
  trailUtilized: boolean,
  outUtilized: boolean,
): number {
  const piecePoints = Math.min(purchasedActiveCount * 3, 17);
  const tapePoints = (trailUtilized ? 4 : 0) + (outUtilized ? 4 : 0);
  return Math.min(piecePoints + tapePoints, 25);
}

// ─── Category 5: Diversity (max 11) — REQ-22/23/24 ───────────────────────────

function calcDiversity(distinctActiveTypes: number, purchasedActiveCount: number): number {
  if (investmentGate(purchasedActiveCount) === 0) return 0;
  const raw = (Math.min(distinctActiveTypes, 6) / 6) * 11;
  return Math.round(raw);
}

// ─── Category 6: Discipline (max 10) — REQ-25/26/27 ──────────────────────────
// Each archetype now rewards ELABORATION within its domain (Part 9), not
// minimalism or mere presence. Half credit (not zero) on a floor solve, so
// a clean floor solve still earns some Discipline points.

function calcDiscipline(
  discipline: NonNullable<Discipline>,
  protocolActive: number,
  physicsActive: number,
  purchasedActiveCount: number,
): number {
  let raw: number;
  if (discipline === 'systems') {
    // Systems Architect — Protocol depth. 4+ active Protocol = full credit.
    raw = (Math.min(protocolActive, 4) / 4) * 10;
  } else if (discipline === 'drive') {
    // Drive Engineer — Physics depth. 5+ active Physics = full credit
    // (higher threshold: Physics pieces are cheaper and more available).
    raw = (Math.min(physicsActive, 5) / 5) * 10;
  } else {
    // Field Operative — balanced elaboration. 3+ of EACH = full credit.
    raw = (Math.min(Math.min(protocolActive, physicsActive), 3) / 3) * 10;
  }
  const gate = purchasedActiveCount >= 1 ? 1.0 : 0.5;
  return Math.round(raw * gate);
}

// ─── ScoreBreakdown (REQ-61) ──────────────────────────────────────────────────

export interface ScoreBreakdown {
  completion: number;    // 0 or 25
  pathIntegrity: number; // 0-15
  signalDepth: number;   // 0-14
  investment: number;    // 0-25
  diversity: number;     // 0-11
  discipline: number;    // 0-10
  // Informational only — never enters the total. Purchased pieces the
  // Engineer never placed (REQ-43); the results screen uses this to tell
  // them what they forfeited, separate from anything that affected score.
  forfeitedPurchasedCount: number;
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
  optimalPieces: number;           // floor-solve piece count (level.optimalPieces)
  trayPieceTypes?: PieceType[];    // level's pre-assigned tray (level.availablePieces)
  // Tapes the Engineer PURCHASED this level (not necessarily utilized —
  // REQ-20 utilization is verified here from executionSteps, not trusted
  // from the caller).
  purchasedTapeTypes?: TapeType[];
  depthCeiling?: number;            // level.depthCeiling; defaults to optimalPieces * 2 (REQ-17)
  forfeitedPurchasedCount?: number; // informational only (see ScoreBreakdown)
  discipline: NonNullable<Discipline>;
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

  // REQ-17: depthCeiling defaults to floorSolvePieces * 2, floored at 1 to
  // avoid a divide-by-zero on a level with an optimalPieces of 0.
  const effectiveDepthCeiling = (params.depthCeiling && params.depthCeiling > 0)
    ? params.depthCeiling
    : Math.max(optimalPieces * 2, 1);

  // REQ-45/46: pre-placed pieces (Source, Terminal, pre-placed Resonators)
  // never count in any category's numerator or denominator.
  const playerPieces = placedPieces.filter(p => !p.isPrePlaced);
  const activeIds = getActiveIds(executionSteps);
  const activePlayerPieces = playerPieces.filter(p => activeIds.has(p.id));

  const { purchasedActive } = splitPurchased(executionSteps, playerPieces, trayPieceTypes);
  const purchasedActiveCount = purchasedActive.length;

  // REQ-20: a purchased tape only contributes to Investment if it was
  // actually utilized THIS run — a Scanner (or a write-mode Latch, this
  // codebase's "Capacitor") touched the Data Trail, or a Transmitter wrote
  // the output tape. Buying the tape alone earns nothing (REQ-40).
  const trailUtilized = executionSteps.some(s => {
    if (!s.success) return false;
    if (s.type === 'scanner') return true;
    if (s.type === 'latch') {
      const piece = placedPieces.find(p => p.id === s.pieceId);
      return (piece?.latchMode ?? 'write') === 'write';
    }
    return false;
  });
  const outUtilized = executionSteps.some(s => s.success && s.type === 'transmitter');
  const trailTapeContributes = purchasedTapeTypes.includes('TRAIL') && trailUtilized;
  const outTapeContributes = purchasedTapeTypes.includes('OUT') && outUtilized;

  const protocolActive = activePlayerPieces.filter(p => p.category === 'protocol').length;
  const physicsActive = activePlayerPieces.filter(p => p.category === 'physics').length;
  const distinctActiveTypes = new Set(activePlayerPieces.map(p => p.type)).size;

  const completion    = calcCompletion(succeeded);
  const pathIntegrity = calcPathIntegrity(activePlayerPieces.length, playerPieces.length);
  const signalDepth   = calcSignalDepth(activePlayerPieces.length, effectiveDepthCeiling, purchasedActiveCount);
  const investment    = calcInvestment(purchasedActiveCount, trailTapeContributes, outTapeContributes);
  const diversity     = calcDiversity(distinctActiveTypes, purchasedActiveCount);
  const discipline    = calcDiscipline(params.discipline, protocolActive, physicsActive, purchasedActiveCount);

  // REQ-28/29
  const rawTotal = completion + pathIntegrity + signalDepth + investment + diversity + discipline;
  const total = Math.max(0, Math.min(100, rawTotal));
  const stars = starsFromTotal(total);

  return {
    total,
    stars,
    breakdown: {
      completion,
      pathIntegrity,
      signalDepth,
      investment,
      diversity,
      discipline,
      forfeitedPurchasedCount: params.forfeitedPurchasedCount ?? 0,
    },
  };
}

// ─── Credit economy (Part 6 — REQ-34..37) ────────────────────────────────────

// REQ-34: recommended payout formula. Pays SOME credits at any score (a
// floor of 0.3x base) scaling up to the full base at a perfect 100, so
// there's always something to show for an attempt, and a well-built machine
// (high score, driven by Investment/Signal Depth/Diversity) earns back more
// than a well-built machine cost to build (REQ-35's virtuous cycle) — this
// replaces the v1 mechanic of returning a fraction of what was actually
// spent this level.
export function calculatePayout(total: number, baseReward: number): number {
  const scoreMultiplier = Math.max(0, Math.min(100, total)) / 100;
  return Math.round(baseReward * (0.3 + 0.7 * scoreMultiplier));
}

// REQ-37: tutorial levels are free to play — flat payout, no score scaling.
export const TUTORIAL_FLAT_PAYOUT = 25;

// REQ-63 default for levels that don't declare an explicit baseReward.
// Not a balance judgment (level design owns that) — this is a floor so
// every level pays out something sensible even before it's been tuned.
// Flagged in AXM-010's PR as a placeholder for Tucker/level-design review.
export function defaultBaseReward(level: { sector: string; optimalPieces: number }): number {
  if (level.sector === 'axiom') return TUTORIAL_FLAT_PAYOUT;
  return 40 + level.optimalPieces * 8;
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
  consequence: import('./types').ConsequenceConfig | undefined,
  succeeded: boolean,
  stars: 0 | 1 | 2 | 3,
): boolean {
  if (!consequence) return false;
  if (!succeeded) return true;
  if (consequence.requireThreeStars && stars < 3) return true;
  return false;
}

export function getConsequenceFailureLine(
  consequence: import('./types').ConsequenceConfig,
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
