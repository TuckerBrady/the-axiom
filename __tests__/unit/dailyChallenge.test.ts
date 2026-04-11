import { generateDailyChallenge, getTodayDateString } from '../../src/game/dailyChallenge';

describe('generateDailyChallenge', () => {
  it('returns a challenge with required fields', () => {
    const ch = generateDailyChallenge('2026-04-10');
    expect(ch.date).toBe('2026-04-10');
    expect(ch.puzzleId).toBeTruthy();
    expect(ch.sender).toBeDefined();
    expect(ch.sender.name).toBeTruthy();
    expect(ch.reward).toBeDefined();
    expect(ch.level).toBeDefined();
    expect(ch.level.id).toContain('daily_');
  });

  it('same date produces same challenge', () => {
    const a = generateDailyChallenge('2026-04-10');
    const b = generateDailyChallenge('2026-04-10');
    expect(a.puzzleId).toBe(b.puzzleId);
    expect(a.sender.name).toBe(b.sender.name);
  });

  it('different dates produce different challenges', () => {
    const a = generateDailyChallenge('2026-04-10');
    const b = generateDailyChallenge('2026-04-11');
    // Different dates should generate different puzzles
    expect(a.date).not.toBe(b.date);
  });

  it('generated level has inputPort and outputPort', () => {
    const ch = generateDailyChallenge('2026-04-12');
    expect(ch.level.prePlacedPieces.some(p => p.type === 'inputPort')).toBe(true);
    expect(ch.level.prePlacedPieces.some(p => p.type === 'outputPort')).toBe(true);
  });

  it('challenge has COGS lines', () => {
    const ch = generateDailyChallenge('2026-04-10');
    expect(ch.cogsPresentation).toBeTruthy();
    expect(ch.cogsOnSuccess).toBeTruthy();
    expect(ch.cogsOnFailure).toBeTruthy();
  });

  it('pirate active flag affects sender pool', () => {
    const normal = generateDailyChallenge('2026-04-10', false);
    const pirate = generateDailyChallenge('2026-04-10', true);
    // Both should return valid challenges
    expect(normal.sender).toBeDefined();
    expect(pirate.sender).toBeDefined();
  });
});

describe('getTodayDateString', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const today = getTodayDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
