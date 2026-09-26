import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LevelDefinition, PlacedPiece, ExecutionStep } from '../game/types';
import { useGameStore } from '../store/gameStore';

export interface UseGameplayFailureResult {
  blownCells: Set<string>;
  setBlownCells: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Cells blown during the CURRENT run — a strict subset of blownCells.
  // Terrain damage (level.damagedCells) is never in here, and a failure
  // crater leaves it the moment the next run starts (settleLiveBurns).
  // Drives the "live burn" ember on DamagedCell; see
  // src/components/gameplay/DamagedCell.tsx.
  liveBurnCells: Set<string>;
  // Called at the top of every run: everything currently blown becomes
  // settled terrain, so the board remembers the failure as a plain missing
  // plate rather than keeping an ember on it forever.
  settleLiveBurns: () => void;
  failCount: number;
  setFailCount: React.Dispatch<React.SetStateAction<number>>;
  // REQ-G-08 part 1: the void quote's index is drawn once, on entering the
  // void state (see failureHandlers.handleVoidFailure), and held here
  // alongside failCount — not redrawn on every GameplayModals re-render.
  voidQuoteIndex: number;
  setVoidQuoteIndex: React.Dispatch<React.SetStateAction<number>>;
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

/**
 * AXM-021 (T-Bot ruling 2026-09-26): true when the player has blown at least
 * one cell. The level's own damagedCells never count, so a paid board reset is
 * only offered when it would change something.
 */
export function hasPlayerCraters(blownCells: Set<string>, level: LevelDefinition | null): boolean {
  const seed = seedBlownCells(level);
  for (const key of blownCells) if (!seed.has(key)) return true;
  return false;
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
  const [voidQuoteIndex, setVoidQuoteIndex] = useState(0);
  const blownCellsRef = useRef<Set<string>>(seedBlownCells(level));
  // Everything the board has already "accepted" as terrain: the level's own
  // damage plus any crater from a previous run. blownCells minus this is the
  // live-burn set. Keeping it as state (not a ref) is deliberate — the
  // derived set has to recompute when a run settles.
  const [settledCells, setSettledCells] = useState<Set<string>>(() => seedBlownCells(level));

  useEffect(() => {
    blownCellsRef.current = blownCells;
  }, [blownCells]);

  useEffect(() => {
    // Re-seed pre-existing craters on level change; failures then add to them.
    setBlownCells(seedBlownCells(level));
    setSettledCells(seedBlownCells(level));
    setFailCount(0);
  }, [level?.id]);

  const liveBurnCells = useMemo(() => {
    const live = new Set<string>();
    blownCells.forEach(key => {
      if (!settledCells.has(key)) live.add(key);
    });
    return live;
  }, [blownCells, settledCells]);

  const settleLiveBurns = useCallback(() => {
    setSettledCells(prev => {
      const current = blownCellsRef.current;
      // A retry clears blownCells entirely; settled must shrink with it so a
      // cell blown again later still reads as a fresh burn.
      if (prev.size === current.size) {
        let same = true;
        current.forEach(k => { if (!prev.has(k)) same = false; });
        if (same) return prev;
      }
      return new Set(current);
    });
  }, []);

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
    liveBurnCells,
    settleLiveBurns,
    failCount,
    setFailCount,
    voidQuoteIndex,
    setVoidQuoteIndex,
    blownCellsRef,
    findBlownPiece,
    getBlownCellCOGSLine,
  };
}
