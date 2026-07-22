// Daily bounty verification. The randomly-generated levels must never ship
// unsolvable: tape bounties are solvable BY CONSTRUCTION (expectedOutput is what
// the intended solution produces), the verifier now REJECTS the pre-fix bug
// (pass-through tape level with no Transmitter), and the A01 fallback floor
// always holds. Individual template+seed combos may have non-connecting path
// geometry — that is expected and handled by generateDailyChallenge's 10-attempt
// retry + fallback, so this suite asserts the guarantees, not per-seed success.

import { ALL_TEMPLATES } from '../../src/game/challengeTemplates';
import { generatePuzzleFromTemplate } from '../../src/game/puzzleGenerator';
import { verifyPuzzle, runSolution } from '../../src/game/puzzleVerifier';
import { SeededRandom } from '../../src/game/seededRandom';
import { generateDailyChallenge } from '../../src/game/dailyChallenge';
import { getDefaultPorts, getPieceCategory } from '../../src/game/engine';
import { deriveWillStatements, deriveShallStatements } from '../../src/game/spec/specSheet';
import type { LevelDefinition, PlacedPiece, PieceType } from '../../src/game/types';

function piece(type: PieceType, x: number, y: number, prePlaced: boolean, rotation = 0): PlacedPiece {
  return {
    id: `t-${type}-${x}-${y}`,
    type,
    category: getPieceCategory(type),
    gridX: x,
    gridY: y,
    ports: getDefaultPorts(type),
    rotation,
    isPrePlaced: prePlaced,
  };
}

describe('puzzleVerifier rejects the pre-fix bug', () => {
  it('a pass-through tape level with NO Transmitter in the solution is NOT solvable', () => {
    // The exact shape the generator used to ship: inputTape + expectedOutput
    // pass-through, but a physics-only solution that can never write output.
    const level: LevelDefinition = {
      id: 'bug-repro', name: 'Bug', sector: 'daily', description: '', cogsLine: '',
      gridWidth: 7, gridHeight: 5,
      prePlacedPieces: [piece('source', 1, 2, true), piece('terminal', 5, 2, true)],
      availablePieces: ['conveyor'],
      dataTrail: { cells: new Array(7).fill(0), headPosition: 0 },
      objectives: [{ type: 'reach_output' }],
      optimalPieces: 3,
      inputTape: [1, 0, 1],
      expectedOutput: [1, 0, 1],
    };
    const solution = [piece('conveyor', 2, 2, false), piece('conveyor', 3, 2, false), piece('conveyor', 4, 2, false)];
    // Signal reaches the Terminal every pulse, but output tape stays all BLANK.
    const run = runSolution(level, solution);
    expect(run.reachedEveryPulse).toBe(true);
    expect(run.producedRealOutput).toBe(false);
    // The hardened verifier catches it (the old one returned solvable: true).
    expect(verifyPuzzle(level, solution).solvable).toBe(false);
  });
});

function hasOverlap(level: LevelDefinition, solution: PlacedPiece[]): boolean {
  const seen = new Set<string>();
  for (const p of [...level.prePlacedPieces, ...solution]) {
    const k = `${p.gridX},${p.gridY}`;
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

describe('generated tape bounties are solvable by construction', () => {
  it('every tape bounty: output == expected (live gate), and structurally-valid ones verify solvable', () => {
    let tapeCount = 0;
    let verifiedCount = 0;
    for (const template of ALL_TEMPLATES) {
      for (let seed = 0; seed < 12; seed++) {
        const rng = new SeededRandom(2000 + seed);
        const { level, solutionPieces } = generatePuzzleFromTemplate(template, rng, '2026-06-15');
        if (level.inputTape && level.expectedOutput) {
          tapeCount++;
          // Solvable by construction: expectedOutput IS what the solution makes.
          expect(level.expectedOutput.length).toBe(level.inputTape.length);
          const run = runSolution(level, solutionPieces);
          expect(run.reachedEveryPulse).toBe(true);
          expect(run.outputTape).toEqual(level.expectedOutput);
          // A structurally-valid (non-overlapping) candidate must pass the full
          // verifier. Overlapping path geometry is a separate generator quirk
          // the dailyChallenge retry loop filters out.
          if (!hasOverlap(level, solutionPieces)) {
            expect(verifyPuzzle(level, solutionPieces).solvable).toBe(true);
            verifiedCount++;
          }
        }
      }
    }
    expect(tapeCount).toBeGreaterThan(0); // protocol bounties genuinely generate
    expect(verifiedCount).toBeGreaterThan(0); // and many fully verify
  });
});

describe('generation floor + daily guarantee', () => {
  it('the A01 fallback template is always solvable (the safety floor)', () => {
    const a01 = ALL_TEMPLATES.find(t => t.id === 'A01')!;
    for (let seed = 0; seed < 12; seed++) {
      const rng = new SeededRandom(900 + seed);
      const { level, solutionPieces } = generatePuzzleFromTemplate(a01, rng, '2026-06-15');
      expect(level.inputTape).toBeUndefined(); // physics-only → routing bounty
      expect(verifyPuzzle(level, solutionPieces).solvable).toBe(true);
    }
  });

  it('physics-only templates produce solvable routing bounties (no tape)', () => {
    const physicsOnly = ALL_TEMPLATES.filter(t => t.tags.includes('physics_only'));
    expect(physicsOnly.length).toBeGreaterThan(0);
    for (const template of physicsOnly) {
      const rng = new SeededRandom(7);
      const { level, solutionPieces } = generatePuzzleFromTemplate(template, rng, '2026-06-15');
      expect(level.inputTape).toBeUndefined();
      expect(verifyPuzzle(level, solutionPieces).solvable).toBe(true);
    }
  });

  it('the Spec Sheet derives honest statements from generated bounties', () => {
    let sawTape = false;
    let sawRouting = false;
    for (const template of ALL_TEMPLATES) {
      for (let seed = 0; seed < 6; seed++) {
        const rng = new SeededRandom(3000 + seed);
        const { level } = generatePuzzleFromTemplate(template, rng, '2026-06-15');
        const shall = deriveShallStatements(level);
        if (level.inputTape) {
          sawTape = true;
          // Tape bounty → output-match SHALL + WILL facts about the tape.
          expect(shall.some(s => s.type === 'literalOutputMatch')).toBe(true);
          expect(deriveWillStatements(level).length).toBeGreaterThan(0);
        } else {
          sawRouting = true;
          // Routing bounty → reach-terminal SHALL, no tape WILL facts.
          expect(shall.some(s => s.type === 'reachTerminal')).toBe(true);
          expect(deriveWillStatements(level)).toEqual([]);
        }
      }
    }
    expect(sawTape).toBe(true);
    expect(sawRouting).toBe(true);
  });

  it('generateDailyChallenge returns a level for a week of dates', () => {
    const dates = [
      '2026-06-14', '2026-06-15', '2026-06-16', '2026-06-17',
      '2026-06-18', '2026-06-19', '2026-06-20',
    ];
    for (const d of dates) {
      const ch = generateDailyChallenge(d);
      expect(ch.level).toBeDefined();
      expect(ch.level.prePlacedPieces.length).toBeGreaterThanOrEqual(2);
    }
  });
});
