interface ScoreInput {
  timeMs: number;
  piecesUsed: number;
  parPieces: number;
  completed: boolean;
  noDamage: boolean;
  firstAttempt: boolean;
}

function calculateScore(input: ScoreInput): number {
  if (!input.completed) return 0;
  let score = 1000;
  const timeSeconds = input.timeMs / 1000;
  if (timeSeconds > 30) score -= Math.floor(timeSeconds - 30);
  const excessPieces = Math.max(0, input.piecesUsed - input.parPieces);
  score -= excessPieces * 50;
  if (input.noDamage) score += 200;
  if (input.firstAttempt) score += 100;
  return Math.max(0, score);
}

describe('Scoring engine', () => {
  it('returns 0 for incomplete level', () => {
    expect(calculateScore({
      timeMs: 10000, piecesUsed: 3, parPieces: 3,
      completed: false, noDamage: false, firstAttempt: false
    })).toBe(0);
  });

  it('awards base 1000 for fast clean completion', () => {
    expect(calculateScore({
      timeMs: 15000, piecesUsed: 3, parPieces: 3,
      completed: true, noDamage: false, firstAttempt: false
    })).toBe(1000);
  });

  it('applies no-damage bonus', () => {
    const score = calculateScore({
      timeMs: 15000, piecesUsed: 3, parPieces: 3,
      completed: true, noDamage: true, firstAttempt: false
    });
    expect(score).toBe(1200);
  });

  it('applies first attempt bonus', () => {
    const score = calculateScore({
      timeMs: 15000, piecesUsed: 3, parPieces: 3,
      completed: true, noDamage: false, firstAttempt: true
    });
    expect(score).toBe(1100);
  });

  it('penalises excess pieces', () => {
    const score = calculateScore({
      timeMs: 15000, piecesUsed: 5, parPieces: 3,
      completed: true, noDamage: false, firstAttempt: false
    });
    expect(score).toBe(900);
  });

  it('score never goes below 0', () => {
    const score = calculateScore({
      timeMs: 999000, piecesUsed: 50, parPieces: 3,
      completed: true, noDamage: false, firstAttempt: false
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
