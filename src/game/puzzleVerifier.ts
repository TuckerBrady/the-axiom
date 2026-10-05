import type { LevelDefinition, PlacedPiece, MachineState, OutputTapeValue } from './types';
import { BLANK } from './types';
import { executeMachine, autoConnectPhysicsPieces } from './engine';
import { meetsDirectionObjectives, evaluateTopologyGate } from './objectives';
import { evaluateLiveGate } from './spec/liveGate';
import {
  describeRunFailure,
  evaluateRunRequirements,
  hasHaltTerminal,
  runMachine,
  type MachineRun,
  type RunVerdict,
} from './runLoop';

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
  // Number of pulses whose signal reached the Terminal. Documentary tape levels
  // (A1-5, A1-6) gate on this against requiredTerminalCount, as the live game does.
  reachedCount: number;
  // True if at least one output cell received a real (non-BLANK) write — i.e.
  // the solution genuinely interacts with the tape (a Transmitter fired).
  producedRealOutput: boolean;
  // Per-pulse Terminal-reached flags, in pulse order (P14-6). Live-gate levels
  // gate on this via evaluateLiveGate: a non-blank expected cell must have
  // reached the Terminal on its pulse, not merely match the output tape.
  reachedPerPulse: boolean[];
  // AXM-046 R1.7: the whole run (per-pulse steps, head, trail, checkpoints,
  // halt, fault) and its verdict against checkpoints, expectedArrivals and
  // expectedTrail. The verifier is the sim of record for the A1 levels.
  run: MachineRun;
  verdict: RunVerdict;
};

/**
 * Run an intended solution through the engine for every pulse, mirroring
 * gameStore.executeAndScore: one MachineState reused across pulses so dataTrail
 * and outputTape mutations persist, output tape pre-filled with BLANK.
 * AXM-046: the pulses run through runLoop.runMachine, the same loop the live
 * game uses (pulseCount, driven head, run until halt).
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

  const run = runMachine(level, state, pulseCount);
  const reachedPerPulse = run.reachedPerPulse;
  const reached = reachedPerPulse.filter(Boolean).length;
  const ranPulses = run.pulses.length;

  const producedRealOutput =
    !!outputTape && outputTape.some(v => v !== BLANK);

  return {
    outputTape,
    reachedEveryPulse: ranPulses > 0 && reached >= ranPulses,
    reachedCount: reached,
    producedRealOutput,
    reachedPerPulse,
    run,
    verdict: evaluateRunRequirements(level, run),
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
    if (liveGate) {
      // P14-6: tape match alone is not enough — every non-blank pulse must
      // also have reached the Terminal (R-14.1).
      won = evaluateLiveGate(expected, out, run.reachedPerPulse).passed;
    } else {
      // Documentary expectedOutput (A1-5, A1-6): GameplayScreen.handleEngage
      // gates on requiredTerminalCount and fails a run only as "wrong output"
      // when every pulse landed but the tape still disagrees. Mirror that
      // exactly; the old "every pulse AND tape match" rule could never pass a
      // documentary level, whose short expectedOutput never matches the
      // full-length output tape. (AXM-026: its floor solves exposed this.)
      const wrongOutput = run.reachedEveryPulse && !tapeMatches;
      won = !wrongOutput && run.reachedCount >= (level.requiredTerminalCount ?? 1);
    }
  } else if (level.expectedArrivals || hasHaltTerminal(allPieces)) {
    // AXM-046: a level that names its arrival pulses (DR-13), or runs until
    // halt (DR-11), does not need the Terminal on every pulse: dead-end
    // pulses are legal (DR-10). The run requirements below decide it.
    won = run.reachedCount >= 1;
  } else {
    won = run.reachedEveryPulse;
  }

  // AXM-046 R1.7: checkpoints, run faults, expectedArrivals, expectedTrail.
  if (!run.verdict.passed && run.verdict.failure) {
    return {
      solvable: false,
      failReason: `Solution does not satisfy the run requirements: ${describeRunFailure(run.verdict.failure)}`,
    };
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
      const steps = executeMachine(
        state, 0, level.headMode === 'driven' ? { headMode: 'driven' } : undefined);
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
