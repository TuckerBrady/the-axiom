import type { LevelDefinition, PlacedPiece, MachineState } from './types';
import { executeMachine, autoConnectPhysicsPieces } from './engine';

export type VerificationResult = {
  solvable: boolean;
  optimalSolution?: PlacedPiece[];
  actualOptimalCount?: number;
  failReason?: string;
};

/**
 * Verifies a generated puzzle is solvable by running the intended
 * solution through executeMachine().
 */
export function verifyPuzzle(
  level: LevelDefinition,
  solutionPieces: PlacedPiece[],
): VerificationResult {
  // Combine pre-placed + solution pieces
  const allPieces = [...level.prePlacedPieces, ...solutionPieces];

  // Check no overlapping positions
  const posSet = new Set<string>();
  for (const p of allPieces) {
    const key = `${p.gridX},${p.gridY}`;
    if (posSet.has(key)) {
      return { solvable: false, failReason: `Overlapping pieces at (${p.gridX},${p.gridY})` };
    }
    posSet.add(key);
  }

  // Check all pieces are within grid bounds
  for (const p of allPieces) {
    if (p.gridX < 0 || p.gridX >= level.gridWidth || p.gridY < 0 || p.gridY >= level.gridHeight) {
      return { solvable: false, failReason: `Piece at (${p.gridX},${p.gridY}) outside grid ${level.gridWidth}x${level.gridHeight}` };
    }
  }

  // Auto-connect and build machine state
  const wires = autoConnectPhysicsPieces(allPieces);
  const state: MachineState = {
    pieces: allPieces,
    wires,
    dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
    configuration: 1, // assume active for configNode checks
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
  };

  // Execute
  const steps = executeMachine(state);
  const succeeded = steps.some(s => s.type === 'outputPort' && s.success);

  if (succeeded) {
    return {
      solvable: true,
      optimalSolution: solutionPieces,
      actualOptimalCount: solutionPieces.length,
    };
  }

  // Find failure reason from steps
  const voidStep = steps.find(s => s.type === 'void');
  const failedStep = steps.find(s => !s.success && s.type !== 'void');
  const reason = voidStep?.message ?? failedStep?.message ?? 'Signal did not reach output';

  return { solvable: false, failReason: reason };
}

/**
 * Verify that the available pieces contain at least the solution pieces.
 */
export function verifyPieceAvailability(
  level: LevelDefinition,
  solutionPieces: PlacedPiece[],
): boolean {
  const needed: Partial<Record<string, number>> = {};
  for (const p of solutionPieces) {
    needed[p.type] = (needed[p.type] ?? 0) + 1;
  }
  const available: Partial<Record<string, number>> = {};
  for (const pt of level.availablePieces) {
    available[pt] = (available[pt] ?? 0) + 1;
  }
  for (const [type, count] of Object.entries(needed)) {
    if ((available[type] ?? 0) < count!) return false;
  }
  return true;
}
