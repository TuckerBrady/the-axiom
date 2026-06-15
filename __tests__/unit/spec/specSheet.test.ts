// SE-TM-032 — Spec Sheet statement derivation. Asserts the derived statements
// match a hand-read of each Axiom level's data, doubling as a regression guard
// if level-data shape ever drifts.

import {
  levelA1_1,
  levelA1_2,
  levelA1_3,
  levelA1_4,
  levelA1_5,
  levelA1_6,
  levelA1_7,
  levelA1_8,
} from '../../../src/game/levels';
import { BLANK } from '../../../src/game/types';
import {
  deriveWillStatements,
  deriveShallStatements,
  deriveShouldStatements,
  expectedOutputIsLiveGate,
} from '../../../src/game/spec/specSheet';

const scoring = (cats: string[]) => cats.map(category => ({ type: 'scoringCategory', category }));

describe('expectedOutputIsLiveGate (SE-TM-002 discriminator)', () => {
  it('is false for stateless levels (no input tape)', () => {
    expect(expectedOutputIsLiveGate(levelA1_1)).toBe(false);
  });
  it('is false for short/documentary expectedOutput (A1-5/A1-6)', () => {
    expect(expectedOutputIsLiveGate(levelA1_5)).toBe(false);
    expect(expectedOutputIsLiveGate(levelA1_6)).toBe(false);
  });
  it('is true for full-length expectedOutput (A1-7/A1-8)', () => {
    expect(expectedOutputIsLiveGate(levelA1_7)).toBe(true);
    expect(expectedOutputIsLiveGate(levelA1_8)).toBe(true);
  });
});

describe('deriveWillStatements', () => {
  it('returns [] for stateless levels A1-1..A1-4', () => {
    expect(deriveWillStatements(levelA1_1)).toEqual([]);
    expect(deriveWillStatements(levelA1_2)).toEqual([]);
    expect(deriveWillStatements(levelA1_3)).toEqual([]);
    expect(deriveWillStatements(levelA1_4)).toEqual([]);
  });

  it('derives length + value range for tape levels', () => {
    expect(deriveWillStatements(levelA1_5)).toEqual([
      { type: 'inputTapeLength', value: 5 },
      { type: 'inputTapeValues', range: [0, 1] },
    ]);
    expect(deriveWillStatements(levelA1_7)).toEqual([
      { type: 'inputTapeLength', value: 8 },
      { type: 'inputTapeValues', range: [0, 1] },
    ]);
    expect(deriveWillStatements(levelA1_8)).toEqual([
      { type: 'inputTapeLength', value: 8 },
      { type: 'inputTapeValues', range: [0, 1] },
    ]);
  });
});

describe('deriveShallStatements', () => {
  it('A1-1: reachTerminal only (stateless, no topology)', () => {
    expect(deriveShallStatements(levelA1_1)).toEqual([{ type: 'reachTerminal' }]);
  });

  it('A1-2: reachTerminal + single-bend topology SHALL', () => {
    expect(deriveShallStatements(levelA1_2)).toEqual([
      { type: 'reachTerminal' },
      { type: 'topology', predicate: 'minDirectionChanges', value: 1 },
    ]);
  });

  it('A1-3: reachTerminal only (logic-gate level, no topology requirement)', () => {
    expect(deriveShallStatements(levelA1_3)).toEqual([{ type: 'reachTerminal' }]);
  });

  it('A1-4: reachTerminal + two-bend topology SHALL', () => {
    expect(deriveShallStatements(levelA1_4)).toEqual([
      { type: 'reachTerminal' },
      { type: 'topology', predicate: 'minDirectionChanges', value: 2 },
    ]);
  });

  it('A1-5/A1-6: requiredTerminalCount SHALL (short/documentary expectedOutput)', () => {
    expect(deriveShallStatements(levelA1_5)).toEqual([
      { type: 'requiredTerminalCount', value: 3 },
    ]);
    expect(deriveShallStatements(levelA1_6)).toEqual([
      { type: 'requiredTerminalCount', value: 3 },
    ]);
  });

  it('A1-7: literal output match against the full-length BLANK-aware tape', () => {
    expect(deriveShallStatements(levelA1_7)).toEqual([
      { type: 'literalOutputMatch', expected: [1, 1, BLANK, 1, BLANK, BLANK, 1, 1] },
    ]);
  });

  it('A1-8: literal output match against the full-length BLANK-aware tape', () => {
    expect(deriveShallStatements(levelA1_8)).toEqual([
      { type: 'literalOutputMatch', expected: [BLANK, 0, BLANK, BLANK, 0, BLANK, 0, BLANK] },
    ]);
  });
});

describe('deriveShouldStatements (from visible scoring categories)', () => {
  it('A1-1: single efficiency category', () => {
    expect(deriveShouldStatements(levelA1_1)).toEqual(scoring(['efficiency']));
  });

  it('A1-2: efficiency + chainIntegrity', () => {
    expect(deriveShouldStatements(levelA1_2)).toEqual(scoring(['efficiency', 'chainIntegrity']));
  });

  it('A1-7: three visible categories', () => {
    expect(deriveShouldStatements(levelA1_7)).toEqual(
      scoring(['efficiency', 'chainIntegrity', 'protocolPrecision']),
    );
  });

  it('A1-8: five visible categories (capstone)', () => {
    expect(deriveShouldStatements(levelA1_8)).toEqual(
      scoring(['efficiency', 'chainIntegrity', 'protocolPrecision', 'disciplineBonus', 'speedBonus']),
    );
  });
});

describe('topology SHALL is independent of the output/terminal SHALL', () => {
  it('A1-4 has both a completion SHALL and a topology SHALL', () => {
    const shalls = deriveShallStatements(levelA1_4);
    expect(shalls.some(s => s.type === 'reachTerminal')).toBe(true);
    expect(shalls.some(s => s.type === 'topology')).toBe(true);
  });

  it('tape levels with no topology requirement emit no topology SHALL', () => {
    expect(deriveShallStatements(levelA1_7).some(s => s.type === 'topology')).toBe(false);
  });
});
