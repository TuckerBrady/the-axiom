import { useCallback, useEffect, useRef, useState } from 'react';
import type { LevelDefinition, PlacedPiece, ExecutionStep } from '../game/types';
import { useGameStore } from '../store/gameStore';

export interface UseGameplayFailureResult {
  blownCells: Set<string>;
  setBlownCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  failCount: number;
  setFailCount: React.Dispatch<React.SetStateAction<number>>;
  blownCellsRef: React.MutableRefObject<Set<string>>;
  findBlownPiece: (
    failureType: 'void' | 'wrongOutput',
    steps: ExecutionStep[],
  ) => PlacedPiece | null;
  getBlownCellCOGSLine: (count: number) => string | null;
}

/**
 * Pre-existing blown cells (craters) a level ships with. Kepler is a worn-out
 * mining belt — its boards are well-used hardware that arrive already damaged,
 * so some cells are blown before the Engineer ever touches them. These seed the
 * SAME `blownCells` set as failure craters, so pre-existing and player-caused
 * damage render and reject placement identically. Wires the long-defined but
 * previously unused `LevelDefinition.damagedCells` field (kepler-belt-levels.md
 * "damagedCells": reject placement when the target cell is in the array).
 */
export function seedBlownCells(level: LevelDefinition | null): Set<string> {
  return new Set((level?.damagedCells ?? []).map(c => `${c.gridX},${c.gridY}`));
}

// Reserved for future Axiom-level-specific failure handling. Phase 1
// does not branch on `isAxiomLevel` but the public surface keeps it for
// parity with the other useGameplay* hooks (Phase 2+).
export function useGameplayFailure(
  level: LevelDefinition | null,
  isAxiomLevel: boolean,
): UseGameplayFailureResult {
  const [blownCells, setBlownCells] = useState<Set<string>>(() => seedBlownCells(level));
  const [failCount, setFailCount] = useState(0);
  const blownCellsRef = useRef<Set<string>>(seedBlownCells(level));

  useEffect(() => {
    blownCellsRef.current = blownCells;
  }, [blownCells]);

  useEffect(() => {
    // Re-seed pre-existing craters on level change; failures then add to them.
    setBlownCells(seedBlownCells(level));
    setFailCount(0);
  }, [level?.id]);

  const findBlownPiece = useCallback(
    (
      failureType: 'void' | 'wrongOutput',
      steps: ExecutionStep[],
    ): PlacedPiece | null => {
      const allPieces = useGameStore.getState().machineState.pieces;
      let candidate: PlacedPiece | null = null;

      if (failureType === 'wrongOutput') {
        candidate = allPieces.find(p => p.type === 'transmitter') ?? null;
      } else {
        for (let i = steps.length - 1; i >= 0; i--) {
          const piece = allPieces.find(p => p.id === steps[i].pieceId);
          if (piece) { candidate = piece; break; }
        }
      }

      if (!candidate) return null;

      if (candidate.isPrePlaced) {
        const playerPieces = allPieces.filter(p =>
          !p.isPrePlaced && !blownCells.has(`${p.gridX},${p.gridY}`)
        );
        if (playerPieces.length === 0) return null;
        let nearest = playerPieces[0];
        let bestDist =
          Math.abs(nearest.gridX - candidate.gridX) +
          Math.abs(nearest.gridY - candidate.gridY);
        for (let i = 1; i < playerPieces.length; i++) {
          const d =
            Math.abs(playerPieces[i].gridX - candidate.gridX) +
            Math.abs(playerPieces[i].gridY - candidate.gridY);
          if (d < bestDist) {
            bestDist = d;
            nearest = playerPieces[i];
          }
        }
        return nearest;
      }

      if (blownCells.has(`${candidate.gridX},${candidate.gridY}`)) return null;
      return candidate;
    },
    [blownCells],
  );

  const getBlownCellCOGSLine = (count: number): string | null => {
    if (count === 0) return null;
    if (count === 1)
      return '"The board took damage. That cell is no longer available. Route around it."';
    if (count === 2)
      return '"Another cell lost. The board is becoming... constrained."';
    return '"I would recommend fewer failed attempts."';
  };

  return {
    blownCells,
    setBlownCells,
    failCount,
    setFailCount,
    blownCellsRef,
    findBlownPiece,
    getBlownCellCOGSLine,
  };
}
