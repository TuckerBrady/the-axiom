// AXM-036 P1 — [P1-1] the obstacle icon renders the same terrain geometry as
// a level-seeded damaged cell (Tucker ruling R-1: "unusable cell" gets one
// look on the board), minus the ember (a cell blown by the CURRENT run).
//
// react-native-svg components do not produce an inspectable tree under this
// repo's jest harness — react-test-renderer's toJSON() comes back `null` for
// them (no native view registry under test), which is why DamagedCell.test.ts
// and PieceIcon.designReview.test.ts both use source-contract checks instead
// of rendering. This test follows the same established pattern, and gets its
// equality proof for free from `getObstacleIconPaths`, the pure export
// PieceIcon.tsx's obstacle case actually calls to build its Path `d` props
// (same extraction pattern as damagedCellGeometry.ts itself — "so the
// scaling rules are directly unit-testable").

import * as fs from 'fs';
import * as path from 'path';
import { getObstacleIconPaths } from '../../src/components/PieceIcon';
import { damagedCellGeometry } from '../../src/components/gameplay/damagedCellGeometry';

const repoRoot = path.resolve(__dirname, '../..');
const pieceIconSrc = fs.readFileSync(path.resolve(repoRoot, 'src/components/PieceIcon.tsx'), 'utf8');

describe('PieceIcon obstacle — [P1-1] matches DamagedCell terrain, ember excluded', () => {
  it('obstacle icon paths equal DamagedCell terrain paths (ember excluded)', () => {
    // DamagedCell(size=40, live=false)'s own Path `d` strings, taken straight
    // from the geometry module it draws from (DamagedCell.tsx: wallShadow,
    // wallLight, rimLight and both brackets are each a <Path>; the ember
    // AnimatedPath is excluded here by construction — it is drawn from
    // `g.ember`, which is deliberately left out below).
    const g = damagedCellGeometry(40);
    const damagedCellPathsMinusEmber = new Set([g.wallShadow, g.wallLight, g.rimLight, ...g.brackets]);

    const obstaclePaths = new Set(getObstacleIconPaths(40));

    expect(damagedCellPathsMinusEmber.size).toBeGreaterThan(0);
    expect(obstaclePaths).toEqual(damagedCellPathsMinusEmber);

    // The ember itself must not be among them.
    expect(obstaclePaths.has(g.ember)).toBe(false);
  });

  it('the obstacle case renders every returned path and no other, and never the ember', () => {
    const caseStart = pieceIconSrc.indexOf("case 'obstacle':");
    const caseEnd = pieceIconSrc.indexOf("\n    case '", caseStart + 1);
    expect(caseStart).toBeGreaterThan(-1);
    const obstacleCase = pieceIconSrc.slice(caseStart, caseEnd === -1 ? undefined : caseEnd);

    expect(obstacleCase).toMatch(/getObstacleIconPaths\(40\)/);
    expect(obstacleCase).toMatch(/damagedCellGeometry\(40\)/);
    // Exactly five Path elements draw from the returned tuple.
    expect(obstacleCase).toMatch(/d=\{wallShadowD\}/);
    expect(obstacleCase).toMatch(/d=\{wallLightD\}/);
    expect(obstacleCase).toMatch(/d=\{rimLightD\}/);
    expect(obstacleCase).toMatch(/d=\{bracket0D\}/);
    expect(obstacleCase).toMatch(/d=\{bracket1D\}/);
    // No ember reference anywhere in the case.
    expect(obstacleCase).not.toMatch(/\.ember\b/);
    expect(obstacleCase).not.toMatch(/Colors\.tapeOutBar/);
  });

  it('no rubble path remains', () => {
    const caseStart = pieceIconSrc.indexOf("case 'obstacle':");
    const caseEnd = pieceIconSrc.indexOf("\n    case '", caseStart + 1);
    const obstacleCase = pieceIconSrc.slice(caseStart, caseEnd === -1 ? undefined : caseEnd);
    expect(obstacleCase).not.toMatch(/M5 29 L13 15/);
    expect(pieceIconSrc).not.toMatch(/M5 29 L13 15/);
  });
});
