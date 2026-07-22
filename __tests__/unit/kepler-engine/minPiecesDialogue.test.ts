// Tests — buildMinPiecesCogsLine COGS copy for the minPieces hard-floor gate.
//
// The line is [PROPOSED] (pending Tucker sign-off). These tests pin its shape:
// dry COGS voice, no praise, no emojis. Counts are accepted for future
// data-driven copy but the current line intentionally omits raw tallies.

import { buildMinPiecesCogsLine } from '../../../src/game/engagement/requiredPiecesDialogue';

describe('buildMinPiecesCogsLine', () => {
  it('returns a non-empty line for any level/counts', () => {
    const line = buildMinPiecesCogsLine('K1-4', 4, 5);
    expect(line.length).toBeGreaterThan(0);
  });

  it('does not praise the Engineer', () => {
    const line = buildMinPiecesCogsLine('K1-10', 6, 8).toLowerCase();
    expect(line).not.toContain('good job');
    expect(line).not.toContain('well done');
    expect(line).not.toContain('great');
  });

  it('contains no emoji characters', () => {
    const line = buildMinPiecesCogsLine('K1-4', 4, 5);
    // Basic emoji / pictographic ranges.
    expect(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line)).toBe(false);
  });

  it('is stable regardless of the active/required counts (not yet data-driven)', () => {
    expect(buildMinPiecesCogsLine('K1-4', 0, 5)).toBe(
      buildMinPiecesCogsLine('K1-4', 4, 5),
    );
  });
});
