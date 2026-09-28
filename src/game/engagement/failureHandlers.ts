import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionStep, OutputTapeValue, PlacedPiece } from './types';
import { VOID_QUOTES } from '../voidQuotes';
import { detectGearJam, gearJamLine } from './gearJamDiagnostic';
import { detectTerminalWrongSide } from './terminalWrongSideDiagnostic';

export interface WrongOutputParams {
  steps: ExecutionStep[];
  expected: OutputTapeValue[];
  produced: OutputTapeValue[];
  isAxiomLevel: boolean;
  findBlownPiece: (failureType: 'void' | 'wrongOutput', steps: ExecutionStep[]) => PlacedPiece | null;
  deletePiece: (id: string) => void;
  setBlownCells: Dispatch<SetStateAction<Set<string>>>;
  setWrongOutputData: (data: { expected: OutputTapeValue[]; produced: OutputTapeValue[] } | null) => void;
  setShowWrongOutput: (show: boolean) => void;
  loseLife: () => void;
  // AXM-026 (SPEC_SOURCE_TERMINAL_PLACEMENT 6.5): cells next to a corner Source
  // or Terminal, and a directional Terminal's entry cell, never scar. The piece
  // is still removed and the life still spent; only the crater is skipped.
  // Optional so existing call sites and fixtures keep today's behavior.
  isScarImmune?: (gridX: number, gridY: number) => boolean;
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
    isScarImmune,
  } = params;

  if (!isAxiomLevel) {
    const blownPiece = findBlownPiece('wrongOutput', steps);
    if (blownPiece) {
      blowPiece(blownPiece, deletePiece, setBlownCells, isScarImmune);
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
  // REQ-G-08 pt 1: drawn once here, on entering the void state. Optional so
  // pre-existing call sites/fixtures that don't supply it still type-check;
  // when omitted the void modal keeps whatever index it last had.
  setVoidQuoteIndex?: (n: number) => void;
  setFlashColor: (c: string | null) => void;
  setShowTeachCard: (lines: string[] | null) => void;
  setShowVoid: (show: boolean) => void;
  triggerHints: (trigger: string) => void;
  redColor: string;
  // AXM-026 6.5 — see WrongOutputParams.isScarImmune.
  isScarImmune?: (gridX: number, gridY: number) => boolean;
  // SWEEP-B51 S3-9: the VOID modal's diagnostic line (a Gear jam), or null.
  setVoidDiagnosticLine?: (line: string | null) => void;
}

// Blows the blamed piece: always removed, and its cell scars unless the cell is
// scar immune (AXM-026 6.5).
function blowPiece(
  blownPiece: PlacedPiece,
  deletePiece: (id: string) => void,
  setBlownCells: Dispatch<SetStateAction<Set<string>>>,
  isScarImmune?: (gridX: number, gridY: number) => boolean,
): void {
  if (!isScarImmune?.(blownPiece.gridX, blownPiece.gridY)) {
    setBlownCells(prev => new Set(prev).add(`${blownPiece.gridX},${blownPiece.gridY}`));
  }
  deletePiece(blownPiece.id);
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
    setVoidQuoteIndex,
    setFlashColor,
    setShowTeachCard,
    setShowVoid,
    triggerHints,
    redColor,
    isScarImmune,
    setVoidDiagnosticLine,
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
      blowPiece(blownPiece, deletePiece, setBlownCells, isScarImmune);
    }
  }
  // REQ-G-08 pt 1: the index is drawn exactly once, here, on entering the
  // void state — not in GameplayModals' render path, which would reroll it
  // on every elapsedSeconds tick.
  setVoidQuoteIndex?.(Math.floor(Math.random() * VOID_QUOTES.length));
  // S3-9: a Gear jam names itself, unless a wrong-side Terminal already does.
  const gearJam = detectGearJam(steps);
  setVoidDiagnosticLine?.(gearJam && !detectTerminalWrongSide(steps) ? gearJamLine(gearJam) : null);
  setShowVoid(true);
  triggerHints('onVoid');
  return false;
}
