/**
 * SWEEP-B51 S3 (AXM-038): the daily bounty generator under the Gear rule.
 * A Gear placed straight in a row can never pass the signal, so a straight
 * template that requires a Gear lays a four-Gear jog instead (S3-7).
 */
import { ALL_TEMPLATES } from '../../../src/game/challengeTemplates';
import { generatePuzzleFromTemplate } from '../../../src/game/puzzleGenerator';
import { verifyPuzzle } from '../../../src/game/puzzleVerifier';
import { SeededRandom } from '../../../src/game/seededRandom';

// Overlapping candidates are a pre-existing geometry quirk of the bend and
// double-bend builders (unchanged by S3); generateDailyChallenge's retry loop
// discards them, and bountyVerification.test.ts excludes them the same way.
// They are reported separately so no other failure can hide among them.
const OVERLAP = /^Overlapping pieces/;

function run(templates: typeof ALL_TEMPLATES, seeds: number) {
  const bad: string[] = [];
  const overlaps: string[] = [];
  for (const template of templates) {
    for (let seed = 0; seed < seeds; seed++) {
      const { level, solutionPieces } = generatePuzzleFromTemplate(template, new SeededRandom(seed), '2026-09-27');
      const result = verifyPuzzle(level, solutionPieces);
      if (result.solvable) continue;
      const line = `${template.id}#${seed}: ${result.failReason}`;
      if (OVERLAP.test(result.failReason ?? '')) overlaps.push(line);
      else bad.push(line);
    }
  }
  return { bad, overlaps };
}

describe('SWEEP-B51 S3 generator', () => {
  test('[S3-7] straight-shape bounties that require a Gear verify for seeds 0..49', () => {
    const gearStraight = ALL_TEMPLATES.filter(
      t => t.pattern.solutionShape === 'straight' && t.pattern.requiredPieceTypes.includes('gear'),
    );
    expect(gearStraight.length).toBeGreaterThan(0);
    // No exclusions for these: every one of the 50 seeds must verify.
    const { bad, overlaps } = run(gearStraight, 50);
    expect([...bad, ...overlaps]).toEqual([]);
    // The jog: four Gears at (m, y), (m, y+d), (m+1, y+d), (m+1, y).
    const { level, solutionPieces } = generatePuzzleFromTemplate(gearStraight[0], new SeededRandom(0), '2026-09-27');
    const source = level.prePlacedPieces.find(p => p.type === 'source')!;
    const gears = solutionPieces.filter(p => p.type === 'gear').map(p => `${p.gridX},${p.gridY}`).sort();
    const terminal = level.prePlacedPieces.find(p => p.type === 'terminal')!;
    const m = source.gridX + Math.floor((terminal.gridX - source.gridX) / 2);
    const y = source.gridY;
    expect(gears).toEqual([`${m},${y}`, `${m},${y + 1}`, `${m + 1},${y}`, `${m + 1},${y + 1}`].sort());
  });

  test('[S3-7] every template verifies for seeds 0..19', () => {
    const { bad, overlaps } = run(ALL_TEMPLATES, 20);
    expect(bad).toEqual([]);
    // Only non-straight builders produce overlapping candidates.
    const straightIds = new Set(ALL_TEMPLATES.filter(t => t.pattern.solutionShape === 'straight').map(t => t.id));
    expect(overlaps.filter(o => straightIds.has(o.split('#')[0]))).toEqual([]);
  });
});
