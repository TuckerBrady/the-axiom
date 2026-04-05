import { describe, it, expect } from '@jest/globals';

const SECTORS = [
  { id: 0, name: 'The Axiom', levels: 8, requiredSector: null },
  { id: 1, name: 'Kepler Belt', levels: 10, requiredSector: 0 },
  { id: 2, name: 'Nova Fringe', levels: 10, requiredSector: 1 },
  { id: 3, name: 'The Rift', levels: 8, requiredSector: 2 },
  { id: 4, name: 'Deep Void', levels: 12, requiredSector: 3 },
];

function isSectorUnlocked(sectorId: number, completedSectors: number[]): boolean {
  const sector = SECTORS.find(s => s.id === sectorId);
  if (!sector) return false;
  if (sector.requiredSector === null) return true;
  return completedSectors.includes(sector.requiredSector);
}

function getTotalLevels(): number {
  return SECTORS.reduce((sum, s) => sum + s.levels, 0);
}

describe('Level unlock logic', () => {
  it('Sector 0 (The Axiom) is always unlocked', () => {
    expect(isSectorUnlocked(0, [])).toBe(true);
  });

  it('Kepler Belt unlocks after completing Sector 0', () => {
    expect(isSectorUnlocked(1, [0])).toBe(true);
  });

  it('Kepler Belt is locked without completing Sector 0', () => {
    expect(isSectorUnlocked(1, [])).toBe(false);
  });

  it('Deep Void requires Sector 3 completion', () => {
    expect(isSectorUnlocked(4, [0, 1, 2, 3])).toBe(true);
    expect(isSectorUnlocked(4, [0, 1, 2])).toBe(false);
  });

  it('total levels across all sectors equals 48', () => {
    expect(getTotalLevels()).toBe(48);
  });

  it('there are exactly 5 sectors', () => {
    expect(SECTORS).toHaveLength(5);
  });
});
