// SE-TM-001 / SE-TM-003 — BLANK output-tape semantics.
//
// These tests pin the two properties the win-condition comparator relies on:
//   1. BLANK is `===`-equal to itself (so `outputTape.every(v === expected[i])`
//      treats a "must produce no output" cell as a first-class match), and
//   2. BLANK is distinct from every numeric tape value (0 and 1), so an
//      unwritten cell never silently satisfies a value requirement.

import { BLANK, type OutputTapeValue } from '../../src/game/types';

// Mirror of the comparator used in gameStore.engage() and GameplayScreen:
//   outputTape.length === expectedOutput.length &&
//   outputTape.every((v, i) => v === expectedOutput[i])
function tapeMatches(
  produced: OutputTapeValue[],
  expected: OutputTapeValue[],
): boolean {
  return (
    produced.length === expected.length &&
    produced.every((v, i) => v === expected[i])
  );
}

describe('BLANK sentinel identity (SE-TM-003)', () => {
  it('is === equal to itself', () => {
    expect(BLANK === BLANK).toBe(true);
  });

  it('is distinct from 0 and 1', () => {
    expect((BLANK as unknown) === 0).toBe(false);
    expect((BLANK as unknown) === 1).toBe(false);
  });

  it('is distinct from the legacy -1 / -2 sentinels', () => {
    expect((BLANK as unknown) === -1).toBe(false);
    expect((BLANK as unknown) === -2).toBe(false);
  });
});

describe('BLANK-aware tapeMatches comparator (SE-TM-001)', () => {
  it('matches when an expected BLANK lines up with an unwritten cell', () => {
    const produced: OutputTapeValue[] = [1, BLANK, 1, BLANK];
    const expected: OutputTapeValue[] = [1, BLANK, 1, BLANK];
    expect(tapeMatches(produced, expected)).toBe(true);
  });

  it('mismatches when a pulse expected BLANK but wrote a value', () => {
    const produced: OutputTapeValue[] = [1, 0, 1, 1];
    const expected: OutputTapeValue[] = [1, BLANK, 1, BLANK];
    expect(tapeMatches(produced, expected)).toBe(false);
  });

  it('mismatches when a pulse expected a value but produced BLANK', () => {
    const produced: OutputTapeValue[] = [1, BLANK, 1, BLANK];
    const expected: OutputTapeValue[] = [1, 1, 1, 1];
    expect(tapeMatches(produced, expected)).toBe(false);
  });

  it('matches an all-written tape against an all-value expectedOutput', () => {
    expect(tapeMatches([1, 1, 0, 1], [1, 1, 0, 1])).toBe(true);
  });

  it('mismatches on length difference (short/documentary expectedOutput)', () => {
    // A short/documentary expectedOutput (e.g. A1-5/A1-6's length-3 tape) never
    // lines up with a full-length output tape — the length guard alone rejects
    // it, which is why such levels stay on requiredTerminalCount, not tapeMatches.
    const produced: OutputTapeValue[] = [1, 1, BLANK, 1, BLANK, BLANK, 1, 1];
    const expected: OutputTapeValue[] = [1, 1, 1, 1, 1];
    expect(tapeMatches(produced, expected)).toBe(false);
  });
});
