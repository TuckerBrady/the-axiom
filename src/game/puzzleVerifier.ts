import type { LevelDefinition, PlacedPiece, MachineState, OutputTapeValue } from './types';
import { BLANK } from './types';
import { executeMachine, autoConnectPhysicsPieces } from './engine';
import { meetsDirectionObjectives, evaluateTopologyGate } from './objectives';

export type VerificationResult = {
  solvable: boolean;
  optimalSolution?: PlacedPiece[];
  actualOptimalCount?: number;
  failReason?: string;
};

// Result of executing an intended solution through the real engine, across all
// pulses, with output-tape state initialized and persisted exactly as
// gameStore.executeAndScore does. This is the single source of truth both the
// generator (to DERIVE expectedOutput) and the verifier (to GATE solvability)
// run against — so a shipped bounty's win condition always matches a solution
// that actually wins it.
export type SolutionRun = {
  outputTape?: OutputTapeValue[];
  reachedEveryPulse: boolean;
  // True if at least one output cell received a real (non-BLANK) write — i.e.
  // the solution genuinely interacts with the tape (a Transmitter fired).
  producedRealOutput: boolean;
};

/**
 * Run an intended solution through the engine for every pulse, mirroring
 * gameStore.executeAndScore: one MachineState reused across pulses so dataTrail
 * and outputTape mutations persist, output tape pre-filled with BLANK.
 */
export function runSolution(
  level: LevelDefinition,
  solutionPieces: PlacedPiece[],
): SolutionRun {
  const allPieces = [...level.prePlacedPieces, ...solutionPieces];
  const wires = autoConnectPhysicsPieces(allPieces);

  const hasTape = !!level.inputTape && level.inputTape.length > 0;
  const pulseCount = hasTape ? level.inputTape!.length : 1;
  const outputTape: OutputTapeValue[] | undefined = hasTape
    ? (new Array(level.inputTape!.length).fill(BLANK) as OutputTapeValue[])
    : undefined;

  // Single state object reused across pulses (mutation persists trail + output).
  const state: MachineState = {
    pieces: allPieces,
    wires,
    dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
    configuration: 1, // assume active so configNode gates open during verification
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    inputTape: hasTape ? [...level.inputTape!] : undefined,
    outputTape,
  };

  let reached = 0;
  for (let i = 0; i < pulseCount; i++) {
    const steps = executeMachine(state, i);
    if (steps.some(s => s.type === 'terminal' && s.success)) reached += 1;
  }

  const producedRealOutput =
    !!outputTape && outputTape.some(v => v !== BLANK);

  return {
    outputTape,
    reachedEveryPulse: pulseCount > 0 && reached >= pulseCount,
    producedRealOutput,
  };
}

/**
 * Verifies a generated puzzle is solvable by running the intended solution
 * through the engine and checking it satisfies the SAME win condition the live
 * game enforces (SE-TM-001/002): exact output-tape match for live-gate tape
 * levels, terminal-every-pulse for documentary tape levels, reach-terminal for
 * routing levels — plus any direction objective / topology SHALL (SE-TM-035).
 */
export function verifyPuzzle(
  level: LevelDefinition,
  solutionPieces: PlacedPiece[],
): VerificationResult {
  const allPieces = [...level.prePlacedPieces, ...solutionPieces];

  // Structural checks: no overlaps, all in bounds.
  const posSet = new Set<string>();
  for (const p of allPieces) {
    const key = `${p.gridX},${p.gridY}`;
    if (posSet.has(key)) {
      return { solvable: false, failReason: `Overlapping pieces at (${p.gridX},${p.gridY})` };
    }
    posSet.add(key);
  }
  for (const p of allPieces) {
    if (p.gridX < 0 || p.gridX >= level.gridWidth || p.gridY < 0 || p.gridY >= level.gridHeight) {
      return { solvable: false, failReason: `Piece at (${p.gridX},${p.gridY}) outside grid ${level.gridWidth}x${level.gridHeight}` };
    }
  }

  const run = runSolution(level, solutionPieces);

  // Replicate the live win condition.
  let won: boolean;
  const hasTape = !!level.inputTape && !!level.expectedOutput;
  if (hasTape) {
    const expected = level.expectedOutput!;
    const out = run.outputTape;
    const tapeMatches =
      !!out && out.length === expected.length && out.every((v, i) => v === expected[i]);
    const liveGate = expected.length === level.inputTape!.length;
    won = liveGate ? tapeMatches : run.reachedEveryPulse && tapeMatches;
  } else {
    won = run.reachedEveryPulse;
  }

  // Structural / topology SHALL must also hold (graded the same way at play).
  if (won) {
    // Direction objectives are evaluated against executed steps; re-run once to
    // collect steps for that check only when objectives demand it.
    const needsDirection = level.objectives.some(o => o.type === 'min_direction_changes')
      || (level.topologyRequirements?.minDirectionChanges ?? 0) > 0;
    if (needsDirection) {
      const allPiecesForSteps = [...level.prePlacedPieces, ...solutionPieces];
      const wires = autoConnectPhysicsPieces(allPiecesForSteps);
      const state: MachineState = {
        pieces: allPiecesForSteps, wires,
        dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
        configuration: 1, isRunning: false, signalPath: [], currentSignalStep: 0, status: 'idle',
        inputTape: level.inputTape ? [...level.inputTape] : undefined,
        outputTape: level.inputTape ? (new Array(level.inputTape.length).fill(BLANK) as OutputTapeValue[]) : undefined,
      };
      const steps = executeMachine(state, 0);
      if (!meetsDirectionObjectives(level.objectives, steps)) {
        return { solvable: false, failReason: 'Solution does not satisfy direction objectives' };
      }
      if (!evaluateTopologyGate(level, steps).met) {
        return { solvable: false, failReason: 'Solution does not satisfy topology SHALL' };
      }
    }
  }

  if (won) {
    return { solvable: true, optimalSolution: solutionPieces, actualOptimalCount: solutionPieces.length };
  }
  return { solvable: false, failReason: 'Solution does not satisfy the win condition (output tape / terminal)' };
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
