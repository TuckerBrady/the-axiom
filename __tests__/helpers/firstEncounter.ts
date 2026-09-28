// SWEEP-B51 S13-2: the level where a piece first appears, derived from the
// shipped level data. Lives under __tests__ because nothing in src/ needs it.

import { ALL_LEVELS } from '../../src/game/levels';
import type { PieceType } from '../../src/game/types';

export const SECTOR_NAMES: Record<string, string> = {
  axiom: 'THE AXIOM',
  kepler: 'KEPLER BELT',
  nova: 'NOVA FRINGE',
};

/**
 * `<SECTOR> — <levelId> <levelName>` for the first level in ALL_LEVELS order
 * whose availablePieces or prePlacedPieces contain `type`, or null when no
 * shipped level uses it.
 */
export function firstEncounterFor(type: PieceType): string | null {
  const level = ALL_LEVELS.find(
    l =>
      l.availablePieces.includes(type) ||
      l.prePlacedPieces.some(p => p.type === type),
  );
  if (!level) return null;
  const sector = SECTOR_NAMES[level.sector] ?? level.sector.toUpperCase();
  return `${sector} — ${level.id} ${level.name}`;
}
