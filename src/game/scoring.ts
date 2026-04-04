import type { ExecutionStep, PlacedPiece, PieceType } from './types';
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

// ─── Category 1: Efficiency (max 30) ─────────────────────────────────────────

function calcEfficiency(piecesUsed: number, optimal: number): number {
  const over = piecesUsed - optimal;
  if (over <= 0) return 30;
  if (over === 1) return 24;
  if (over === 2) return 18;
  return 10;
}

// ─── Category 2: Protocol Precision (max 25) ─────────────────────────────────

function calcProtocolPrecision(steps: ExecutionStep[]): number {
  const protocolTouched = steps.filter(
    s => s.success && PROTOCOL_TYPES.includes(s.type as PieceType),
  ).length;
  if (protocolTouched >= 5) return 25;
  if (protocolTouched >= 4) return 20;
  if (protocolTouched >= 3) return 15;
  if (protocolTouched >= 2) return 10;
  if (protocolTouched >= 1) return 5;
  return 0;
}

// ─── Category 3: Chain Integrity (max 20) ────────────────────────────────────

function calcChainIntegrity(steps: ExecutionStep[], playerPieces: PlacedPiece[]): number {
  const touchedIds = new Set(steps.map(s => s.pieceId));
  let score = 0;
  for (const p of playerPieces) {
    if (touchedIds.has(p.id)) {
      score += 4;
    } else {
      score -= 2;
    }
  }
  return Math.min(20, Math.max(0, score));
}

// ─── Category 4: Discipline Bonus (max 15) ───────────────────────────────────

function calcDisciplineBonus(
  steps: ExecutionStep[],
  playerPieces: PlacedPiece[],
  discipline: NonNullable<Discipline>,
): number {
  const touchedIds = new Set(steps.filter(s => s.success).map(s => s.pieceId));
  const protocolTouched = steps.filter(s => s.success && isProtocol(s.type as PieceType)).length;
  const physicsTouched = steps.filter(s => s.success && PHYSICS_TYPES.includes(s.type as PieceType)).length;
  const playerPhysics = playerPieces.filter(p => PHYSICS_TYPES.includes(p.type));
  const allPhysicsTouched = playerPhysics.every(p => touchedIds.has(p.id));
  const typesUsed = new Set(playerPieces.map(p => p.type));

  switch (discipline) {
    case 'systems':
      if (protocolTouched >= 2) return 15;
      if (protocolTouched === 1) return 8;
      return 0;
    case 'drive':
      if (playerPhysics.length >= 4 && allPhysicsTouched) return 15;
      if (playerPhysics.length >= 2 && allPhysicsTouched) return 8;
      return 0;
    case 'field':
      if (physicsTouched >= 1 && protocolTouched >= 1) return 15;
      if (typesUsed.size >= 3) return 8;
      return 0;
  }
}

// ─── Category 5: Speed Bonus (max 10) ────────────────────────────────────────

function calcSpeedBonus(engageDurationMs: number): number {
  const seconds = engageDurationMs / 1000;
  if (seconds < 10) return 10;
  if (seconds <= 20) return 7;
  if (seconds <= 45) return 4;
  return 0;
}

// ─── Main scoring function ───────────────────────────────────────────────────

export interface ScoreBreakdown {
  efficiency: number;
  protocolPrecision: number;
  chainIntegrity: number;
  disciplineBonus: number;
  speedBonus: number;
}

export interface ScoreResult {
  total: number;
  stars: 0 | 1 | 2 | 3;
  breakdown: ScoreBreakdown;
}

export function calculateScore(params: {
  executionSteps: ExecutionStep[];
  placedPieces: PlacedPiece[];
  optimalPieces: number;
  discipline: NonNullable<Discipline>;
  engageDurationMs: number;
}): ScoreResult {
  const { executionSteps, placedPieces, optimalPieces, discipline, engageDurationMs } = params;

  const playerPieces = placedPieces.filter(p => !p.isPrePlaced);
  const efficiency = calcEfficiency(playerPieces.length, optimalPieces);
  const protocolPrecision = calcProtocolPrecision(executionSteps);
  const chainIntegrity = calcChainIntegrity(executionSteps, playerPieces);
  const disciplineBonus = calcDisciplineBonus(executionSteps, playerPieces, discipline);
  const speedBonus = calcSpeedBonus(engageDurationMs);

  const total = efficiency + protocolPrecision + chainIntegrity + disciplineBonus + speedBonus;
  const stars = starsFromTotal(total);

  return {
    total,
    stars,
    breakdown: { efficiency, protocolPrecision, chainIntegrity, disciplineBonus, speedBonus },
  };
}

// ─── COGS score commentary ───────────────────────────────────────────────────

export function getCOGSScoreComment(
  breakdown: ScoreBreakdown,
  discipline: NonNullable<Discipline>,
  stars: 0 | 1 | 2 | 3,
  piecesUsed: number,
  optimal: number,
): string {
  const { efficiency, protocolPrecision, chainIntegrity, disciplineBonus, speedBonus } = breakdown;
  const total = efficiency + protocolPrecision + chainIntegrity + disciplineBonus + speedBonus;

  if (total === 100) {
    return 'One hundred points. I am revising my estimates of you upward. That is not something I do often.';
  }

  // Find weakest category and comment on it
  const categories = [
    { name: 'efficiency', score: efficiency, max: 30 },
    { name: 'protocol', score: protocolPrecision, max: 25 },
    { name: 'chain', score: chainIntegrity, max: 20 },
    { name: 'discipline', score: disciplineBonus, max: 15 },
    { name: 'speed', score: speedBonus, max: 10 },
  ];
  const weakest = categories.reduce((a, b) => (a.score / a.max < b.score / b.max ? a : b));

  if (stars === 3 && disciplineBonus >= 8) {
    switch (discipline) {
      case 'systems': return 'Protocol logic. Precise. My assessment stands.';
      case 'drive': return 'The chain held. Every piece earned its place.';
      case 'field': return 'Physics and Protocol in the same machine. It works. I am still surprised when it works.';
    }
  }

  if (weakest.name === 'efficiency' && efficiency < 18) {
    return `You used ${piecesUsed} pieces. The optimal is ${optimal}. I am noting the gap.`;
  }
  if (weakest.name === 'protocol' && protocolPrecision === 0) {
    if (discipline === 'systems') return 'A Systems Architect who used no Protocol pieces. I have questions.';
    return 'You avoided the Protocol catalogue entirely. Technically valid.';
  }
  if (weakest.name === 'chain' && chainIntegrity < 10) {
    return 'Several pieces you placed never saw the signal. I noticed.';
  }
  if (weakest.name === 'discipline' && disciplineBonus === 0) {
    switch (discipline) {
      case 'systems': return 'You are a Systems Architect who solved this without touching a single Config Node. I am choosing not to comment further.';
      case 'drive': return 'A Drive Engineer with a chain that short. We will work on this.';
      case 'field': return 'You are a Field Operative who used only one piece type. That is not adaptation. That is limitation.';
    }
  }
  if (weakest.name === 'speed' && speedBonus === 0) {
    return 'The solution was correct. The execution was considered. At considerable length.';
  }

  // Generic fallbacks by star rating
  if (stars === 3) return 'Optimal. I have updated my assessment accordingly.';
  if (stars === 2) return 'Functional. There was a more elegant solution.';
  if (stars === 1) return 'It worked. I will note that it barely worked.';
  return 'The machine did not lock. Review your approach.';
}
