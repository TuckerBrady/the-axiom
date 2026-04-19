import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionStep, PlacedPiece } from './types';

export interface WrongOutputParams {
  steps: ExecutionStep[];
  expected: number[];
  produced: number[];
  isAxiomLevel: boolean;
  findBlownPiece: (failureType: 'void' | 'wrongOutput', steps: ExecutionStep[]) => PlacedPiece | null;
  deletePiece: (id: string) => void;
  setBlownCells: Dispatch<SetStateAction<Set<string>>>;
  setWrongOutputData: (data: { expected: number[]; produced: number[] } | null) => void;
  setShowWrongOutput: (show: boolean) => void;
  loseLife: () => void;
}

export function handleWrongOutput(params: WrongOutputParams): void {
  const {
    steps,
    expected,
    produced,
    isAxiomLevel,
    findBlownPiece,
    deletePiece,
    setBlownCells,
    setWrongOutputData,
    setShowWrongOutput,
    loseLife,
  } = params;

  if (!isAxiomLevel) {
    const blownPiece = findBlownPiece('wrongOutput', steps);
    if (blownPiece) {
      setBlownCells(prev => new Set(prev).add(`${blownPiece.gridX},${blownPiece.gridY}`));
      deletePiece(blownPiece.id);
    }
  }
  setWrongOutputData({ expected: [...expected], produced: [...produced] });
  setShowWrongOutput(true);
  loseLife();
}

export interface VoidFailureParams {
  steps: ExecutionStep[];
  levelId: string;
  isAxiomLevel: boolean;
  failCount: number;
  findBlownPiece: (failureType: 'void' | 'wrongOutput', steps: ExecutionStep[]) => PlacedPiece | null;
  deletePiece: (id: string) => void;
  setBlownCells: Dispatch<SetStateAction<Set<string>>>;
  setFailCount: (n: number) => void;
  setFlashColor: (c: string | null) => void;
  setShowTeachCard: (lines: string[] | null) => void;
  setShowVoid: (show: boolean) => void;
  triggerHints: (trigger: string) => void;
  redColor: string;
}

// Handles the void-failure path:
// - Red flash 3x
// - Increments fail count
// - Emits A1-3 teaching cards at fail 1 and 2 (returns true so caller can bail)
// - Otherwise: blows a piece (non-Axiom) and shows the void modal
// Returns true when a teaching card was shown (caller should return early).
export async function handleVoidFailure(params: VoidFailureParams): Promise<boolean> {
  const {
    steps,
    levelId,
    isAxiomLevel,
    failCount,
    findBlownPiece,
    deletePiece,
    setBlownCells,
    setFailCount,
    setFlashColor,
    setShowTeachCard,
    setShowVoid,
    triggerHints,
    redColor,
  } = params;

  for (let f = 0; f < 3; f++) {
    setFlashColor(redColor);
    await new Promise(resolve => setTimeout(resolve, 150));
    setFlashColor(null);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await new Promise(resolve => setTimeout(resolve, 200));

  const newFailCount = failCount + 1;
  setFailCount(newFailCount);

  if (levelId === 'A1-3' && newFailCount === 1) {
    setShowTeachCard([
      'The Config Node blocked the signal.',
      'A Config Node reads the current Configuration value. It only passes the signal when that value matches its condition.',
      'The condition here requires Configuration = 1. Check that Configuration is set to ACTIVE before engaging.',
      'The Data Trail at the bottom is the memory. The Scanner reads it. What it reads can affect the Configuration.',
    ]);
    return true;
  }
  if (levelId === 'A1-3' && newFailCount === 2) {
    setShowTeachCard([
      'Still blocked. Let me be more direct.',
      'The Data Trail reads left to right as the signal travels. Cell 0 first, then cell 1, then cell 2.',
      'The Scanner reads the trail value at the current head position when the signal reaches it.',
      'Check which value the Scanner will read. If it reads 1, the Config Node opens. If it reads 0, it stays closed.',
      'Toggle the Configuration to ACTIVE before engaging. That is the key.',
    ]);
    return true;
  }

  if (!isAxiomLevel) {
    const blownPiece = findBlownPiece('void', steps);
    if (blownPiece) {
      setBlownCells(prev => new Set(prev).add(`${blownPiece.gridX},${blownPiece.gridY}`));
      deletePiece(blownPiece.id);
    }
  }
  setShowVoid(true);
  triggerHints('onVoid');
  return false;
}
