// AXM-021 (found in #48 review, 2026-09-23): the paid 50 CR board repair
// cleared blownCells to an empty set, which erased the level's own terrain
// damage (level.damagedCells, seeded by seedBlownCells) along with the
// player's failure craters. A repair removes what the player blew, never the
// board the level shipped with.

import * as fs from 'fs';
import * as path from 'path';
import { seedBlownCells } from '../../src/hooks/useGameplayFailure';
import type { LevelDefinition } from '../../src/game/types';

const modalsSrc = fs.readFileSync(
  path.resolve(__dirname, '../../src/components/gameplay/GameplayModals.tsx'),
  'utf8',
);

// Each paid-repair press handler: from spendDirect(50) to the handleReset() it ends in.
function repairHandlers(src: string): string[] {
  const out: string[] = [];
  let i = src.indexOf('spendDirect(50)');
  while (i !== -1) {
    out.push(src.slice(i, src.indexOf('handleReset()', i)));
    i = src.indexOf('spendDirect(50)', i + 1);
  }
  return out;
}

describe('AXM-021 — paid repair keeps the level\'s own damage', () => {
  it('finds both paid repairs (wrong output and void)', () => {
    expect(repairHandlers(modalsSrc)).toHaveLength(2);
  });

  it('never clears blownCells to an empty set', () => {
    expect(modalsSrc).not.toMatch(/setBlownCells\(new Set\(\)\)/);
  });

  it('each paid repair re-seeds from the level', () => {
    for (const h of repairHandlers(modalsSrc)) {
      expect(h).toMatch(/setBlownCells\(seedBlownCells\(level\)\)/);
    }
  });

  it('the re-seed is the level\'s terrain damage and nothing else', () => {
    const level = { damagedCells: [{ gridX: 2, gridY: 3 }, { gridX: 5, gridY: 1 }] } as unknown as LevelDefinition;
    expect([...seedBlownCells(level)].sort()).toEqual(['2,3', '5,1']);
  });
});
