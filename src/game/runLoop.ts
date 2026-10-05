// AXM-046 PR 1 — the run loop of record.
//
// One run = the pulses a level executes, on one MachineState that persists
// trail, head, Latch and output-tape state across pulses. gameStore.engage and
// puzzleVerifier.runSolution both run through runMachine, so the live game and
// the verifier cannot disagree about how many pulses run or when a run stops.
//
// With no new flag set (no headMode, pulseCount, halt Terminal, checkpoints,
// expectedArrivals or expectedTrail) runMachine is exactly the master loop:
// `fallbackPulseCount` pulses of executeMachine(state, i), nothing else.
//
// Clauses: AXM-046 DESIGN_SPEC DR-1 (checkpoints), DR-7/DR-10 (driven head),
// DR-11 (run until halt), DR-13 (expectedArrivals, expectedTrail); twin scope
// DH-6..DH-9 (Pierce - System Engineer/AXM-046_TURING_ENGINE_SCOPE.md).

import type { ExecutionStep, LevelDefinition, MachineState, PlacedPiece } from './types';
import { executeMachine } from './engine';

// DR-11: the safety cap on a run-until-halt. Loop detection (non_halting)
// is the real stop; the cap only catches a machine whose state never repeats.
export const HALT_CAP = 16;

// The level fields the run loop reads. Every one is optional.
export type RunLevel = Pick<
  LevelDefinition,
  'headMode' | 'pulseCount' | 'checkpoints' | 'expectedArrivals' | 'expectedTrail' | 'inputTape'
>;

// A fault ends the run on the pulse it happens (1-based).
export type RunFault =
  | { kind: 'stamp_conflict'; pulse: number }
  | { kind: 'non_halting'; pulse: number }
  | { kind: 'halt_cap'; pulse: number };

export type MachineRun = {
  // Steps per pulse, in pulse order, and the same steps flattened.
  pulses: ExecutionStep[][];
  steps: ExecutionStep[];
  // Whether a Terminal accepted on each pulse.
  reachedPerPulse: boolean[];
  // DR-11 / DH-9: the head at the start of each pulse, for the replay, and
  // the head after the last pulse.
  headPerPulse: number[];
  finalHead: number;
  // The trail after each pulse, and after the run.
  trailPerPulse: (0 | 1 | null)[][];
  finalTrail: (0 | 1 | null)[];
  // DR-1: per pulse, the indices of the level's checkpoints the beam passed,
  // in the order it passed them. Empty lists when the level has none.
  checkpointsPerPulse: number[][];
  // The same, with the path-order relation evaluateRunRequirements needs.
  checkpointPathPerPulse: { order: number[]; precedes: (a: number, b: number) => boolean }[];
  // DR-11: a halt Terminal accepted and the run stopped there.
  halted: boolean;
  fault?: RunFault;
};

export type RunFailure =
  | RunFault
  // DR-1: index is the 0-based position in level.checkpoints of the first
  // checkpoint missed or passed out of order; pulse is 1-based.
  | { kind: 'checkpoint_missed'; index: number; pulse: number }
  // DR-13: 1-based pulses the Terminal accepted, expected vs actual.
  | { kind: 'arrivals_mismatch'; expected: number[]; actual: number[] }
  // DR-13: the final trail, expected vs actual.
  | { kind: 'trail_mismatch'; expected: (0 | 1 | null)[]; actual: (0 | 1 | null)[] };

// `failure` is set exactly when `passed` is false.
export type RunVerdict = { passed: boolean; failure?: RunFailure };

/** True when the board carries a halt Terminal (DR-11). */
export function hasHaltTerminal(pieces: PlacedPiece[]): boolean {
  return pieces.some(p => p.type === 'terminal' && p.halt === true);
}

/**
 * The fixed pulse count for a run that does not halt: the level's
 * `pulseCount` when set (twin scope DH-6), otherwise the caller's master
 * count (the IN tape length, or 1).
 */
export function resolvePulseCount(level: RunLevel, fallback: number): number {
  return level.pulseCount !== undefined ? level.pulseCount : fallback;
}

// DR-1 ruling (#100 review): the delivering path of one pulse. Walks back from
// the first accepting Terminal through each step's `from` (recorded when
// executeMachine runs with trackPath). Returns, for every piece on that path,
// the set of its ancestors on the path. A Merger contributes every inbound
// path it ORed, so the "path" can fork backwards into parallel branches.
function deliveringAncestors(steps: ExecutionStep[]): Map<string, Set<string>> | null {
  const terminal = steps.find(s => s.type === 'terminal' && s.success);
  if (!terminal) return null;
  const fromOf = new Map<string, string[]>();
  for (const s of steps) {
    if (s.success && s.from && !fromOf.has(s.pieceId)) fromOf.set(s.pieceId, s.from);
  }
  const ancestors = new Map<string, Set<string>>();
  const visit = (id: string): Set<string> => {
    const known = ancestors.get(id);
    if (known) return known;
    const set = new Set<string>();
    ancestors.set(id, set);
    for (const parent of fromOf.get(id) ?? []) {
      set.add(parent);
      for (const a of visit(parent)) set.add(a);
    }
    return set;
  };
  visit(terminal.pieceId);
  return ancestors;
}

/**
 * DR-1: the indices of `checkpoints` passed on one pulse, in path order.
 *
 * Ruling (#100 review): a checkpoint counts only when a piece on that cell is
 * on the path that reached the accepting Terminal on this pulse (any piece may
 * sit on a checkpoint, the Terminal included). A Splitter stub, or a gate
 * that held, does not count. A pulse with no accepted Terminal passes none.
 * Order is along the path: a piece comes after every piece upstream of it.
 * Two pieces on parallel branches into a Merger have no order between them;
 * this list sorts those by step order, but evaluateRunRequirements checks
 * true path order and fails them (see there).
 *
 * `steps` must come from executeMachine with `trackPath`; runMachine does that
 * whenever the level has checkpoints.
 */
export function checkpointsPassed(
  steps: ExecutionStep[],
  pieces: PlacedPiece[],
  checkpoints: { x: number; y: number }[] | undefined,
): number[] {
  return checkpointPath(steps, pieces, checkpoints).order;
}

function checkpointPath(
  steps: ExecutionStep[],
  pieces: PlacedPiece[],
  checkpoints: { x: number; y: number }[] | undefined,
): { order: number[]; precedes: (a: number, b: number) => boolean } {
  const none = { order: [], precedes: () => false };
  if (!checkpoints || checkpoints.length === 0) return none;
  const ancestors = deliveringAncestors(steps);
  if (!ancestors) return none;
  const byId = new Map(pieces.map(p => [p.id, p]));
  const pieceAt = new Map<number, string>();
  for (const s of steps) {
    if (!s.success || !ancestors.has(s.pieceId)) continue;
    const p = byId.get(s.pieceId);
    if (!p) continue;
    const index = checkpoints.findIndex(c => c.x === p.gridX && c.y === p.gridY);
    if (index >= 0 && !pieceAt.has(index)) pieceAt.set(index, s.pieceId);
  }
  const precedes = (a: number, b: number) => {
    const pa = pieceAt.get(a);
    const pb = pieceAt.get(b);
    return !!pa && !!pb && (ancestors.get(pb)?.has(pa) ?? false);
  };
  return { order: Array.from(pieceAt.keys()), precedes };
}

// DR-11: the whole machine state, for loop detection. Head, trail, every
// Latch's stored value and every Counter's count.
// Ruling (#100 review): the pulse index is part of the state only while the
// next pulse still reads IN (pulseIndex < inputTape.length). An empty IN
// tape, or a run past its end, no longer keeps a repeating loop alive until
// halt_cap.
// One addition, outside driven mode only: a pulse-mode Config Node reads
// TRAIL[pulseIndex] while pulseIndex < trail length (engine.ts configNode
// case), so the index stays in the state while that read is still indexed.
// Dropping it there could call a machine non-halting whose next read differs.
function machineStateKey(state: MachineState, pulseIndex: number, driven: boolean): string {
  const readsIn = pulseIndex < (state.inputTape?.length ?? 0);
  const readsTrailByPulse = !driven && pulseIndex < state.dataTrail.cells.length;
  return JSON.stringify([
    state.dataTrail.headPosition,
    state.dataTrail.cells,
    state.pieces.map(p =>
      p.type === 'latch' ? p.storedValue ?? null : p.type === 'counter' ? p.count ?? 0 : 0),
    readsIn || readsTrailByPulse ? pulseIndex : null,
  ]);
}

/**
 * Run a machine for a level. `fallbackPulseCount` is the master pulse count
 * the caller already used (gameStore: the IN tape length or 1; the verifier:
 * the same, with an empty tape counting as none).
 *
 * - Fixed run: resolvePulseCount pulses.
 * - Halt run (a Terminal with `halt: true`): pulses until a beam reaches the
 *   halt Terminal, which stops the run after that pulse commits. A repeated
 *   full machine state fails at once as non_halting; HALT_CAP pulses with no
 *   halt fail as halt_cap.
 * - Either run stops at once on a stamp_conflict.
 *
 * Callers own resetRunState: this function never resets piece state.
 */
export function runMachine(
  level: RunLevel,
  state: MachineState,
  fallbackPulseCount: number,
): MachineRun {
  const driven = level.headMode === 'driven';
  const trackPath = (level.checkpoints?.length ?? 0) > 0;
  const options = driven || trackPath
    ? { ...(driven ? { headMode: 'driven' as const } : {}), ...(trackPath ? { trackPath: true } : {}) }
    : undefined;
  const halting = hasHaltTerminal(state.pieces);
  const limit = halting ? HALT_CAP : resolvePulseCount(level, fallbackPulseCount);

  const run: MachineRun = {
    pulses: [],
    steps: [],
    reachedPerPulse: [],
    headPerPulse: [],
    finalHead: state.dataTrail.headPosition,
    trailPerPulse: [],
    finalTrail: state.dataTrail.cells,
    checkpointsPerPulse: [],
    checkpointPathPerPulse: [],
    halted: false,
  };

  const seen = new Set<string>();
  if (halting) seen.add(machineStateKey(state, 0, driven));

  for (let i = 0; i < limit; i++) {
    run.headPerPulse.push(state.dataTrail.headPosition);
    const steps = options ? executeMachine(state, i, options) : executeMachine(state, i);
    run.pulses.push(steps);
    run.steps.push(...steps);
    const accepted = steps.filter(s => s.type === 'terminal' && s.success);
    run.reachedPerPulse.push(accepted.length > 0);
    run.trailPerPulse.push([...state.dataTrail.cells]);
    const path = checkpointPath(steps, state.pieces, level.checkpoints);
    run.checkpointPathPerPulse.push(path);
    run.checkpointsPerPulse.push(path.order);

    if (steps.some(s => s.type === 'stampConflict')) {
      run.fault = { kind: 'stamp_conflict', pulse: i + 1 };
      break;
    }
    if (!halting) continue;

    const haltIds = new Set(state.pieces.filter(p => p.type === 'terminal' && p.halt).map(p => p.id));
    if (accepted.some(s => haltIds.has(s.pieceId))) {
      run.halted = true;
      break;
    }
    const key = machineStateKey(state, i + 1, driven);
    if (seen.has(key)) {
      run.fault = { kind: 'non_halting', pulse: i + 1 };
      break;
    }
    seen.add(key);
    if (i + 1 === limit) run.fault = { kind: 'halt_cap', pulse: limit };
  }

  run.finalHead = state.dataTrail.headPosition;
  run.finalTrail = [...state.dataTrail.cells];
  return run;
}

const sameList = <T>(a: readonly T[], b: readonly T[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The AXM-046 requirements a run must meet, on top of the existing win
 * condition (which the callers keep). Checked in this order, first failure
 * wins: a run fault; DR-1 checkpoints on every scored pulse (a pulse the
 * Terminal accepted); DR-13 expectedArrivals (exact set); DR-13
 * expectedTrail (exact final trail). A level with none of these flags and no
 * fault always passes.
 */
export function evaluateRunRequirements(level: RunLevel, run: MachineRun): RunVerdict {
  if (run.fault) return { passed: false, failure: run.fault };

  const checkpoints = level.checkpoints ?? [];
  if (checkpoints.length > 0) {
    for (let p = 0; p < run.pulses.length; p++) {
      if (!run.reachedPerPulse[p]) continue;
      const { order, precedes } = run.checkpointPathPerPulse[p];
      // Every checkpoint on the delivering path, each one strictly downstream
      // of the one listed before it (DR-1 ruling: path order).
      for (let k = 0; k < checkpoints.length; k++) {
        if (!order.includes(k) || (k > 0 && !precedes(k - 1, k))) {
          return { passed: false, failure: { kind: 'checkpoint_missed', index: k, pulse: p + 1 } };
        }
      }
    }
  }

  if (level.expectedArrivals) {
    const actual = run.reachedPerPulse.flatMap((r, i) => (r ? [i + 1] : []));
    const expected = [...level.expectedArrivals].sort((a, b) => a - b);
    if (!sameList(actual, expected)) {
      return { passed: false, failure: { kind: 'arrivals_mismatch', expected, actual } };
    }
  }

  if (level.expectedTrail) {
    if (!sameList(run.finalTrail, level.expectedTrail)) {
      return {
        passed: false,
        failure: { kind: 'trail_mismatch', expected: [...level.expectedTrail], actual: [...run.finalTrail] },
      };
    }
  }

  return { passed: true };
}

/** A one-line reason for a failed verdict, naming the failure kind first. */
export function describeRunFailure(failure: RunFailure): string {
  switch (failure.kind) {
    case 'checkpoint_missed':
      return `checkpoint_missed: checkpoint ${failure.index} on pulse ${failure.pulse}`;
    case 'arrivals_mismatch':
      return `arrivals_mismatch: expected [${failure.expected.join(',')}], got [${failure.actual.join(',')}]`;
    case 'trail_mismatch':
      return `trail_mismatch: expected [${failure.expected.join(',')}], got [${failure.actual.join(',')}]`;
    default:
      return `${failure.kind} on pulse ${failure.pulse}`;
  }
}
