/**
 * SWEEP-B51 S2 (AXM-040): the failure outcome classifier and pulse chip rows.
 */
import { ALL_LEVELS } from '../../../src/game/levels';
import type {
  ExecutionStep,
  LevelDefinition,
  MachineState,
  OutputTapeValue,
  PlacedPiece,
} from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import { autoConnectPhysicsPieces, executeMachine } from '../../../src/game/engine';
import { computeSplitterMagnets } from '../../../src/store/gameStore';
import { evaluateLiveGate } from '../../../src/game/spec/liveGate';
import { FLOOR_SOLVES, solvePieces, type SolvePiece } from '../../fixtures/floorSolves';
import {
  GATE_STEP_TYPES,
  PULSE_CHIP_GAP,
  PULSE_CHIP_SIZE,
  classifyRunFailure,
  pulseChipRows,
  pulseWasGated,
} from '../../../src/game/engagement/failureOutcome';

const step = (type: string, success: boolean): ExecutionStep => ({
  pieceId: `${type}-1`,
  type,
  timestamp: 0,
  success,
});

const base = {
  liveGate: false,
  hasTape: false,
  tapeMatches: false,
  requiredCount: 1,
  undeliveredCount: 0,
};

describe('SWEEP-B51 S2 failureOutcome', () => {
  test('[S2-1] GATE_STEP_TYPES is exactly configNode, counter, latch', () => {
    expect(Array.from(GATE_STEP_TYPES).sort()).toEqual(['configNode', 'counter', 'latch']);
  });

  test('[S2-1] pulseWasGated is true only for an undelivered pulse with a failed gate step', () => {
    expect(pulseWasGated([step('source', true), step('configNode', false), step('void', false)])).toBe(true);
    expect(pulseWasGated([step('source', true), step('counter', false)])).toBe(true);
    expect(pulseWasGated([step('source', true), step('latch', false)])).toBe(true);
    // Delivered: never gated, even with a failed gate step on another branch.
    expect(pulseWasGated([step('configNode', false), step('terminal', true)])).toBe(false);
    // Undelivered with no failed gate step: a lost route, not a gate.
    expect(pulseWasGated([step('source', true), step('conveyor', true), step('void', false)])).toBe(false);
    // A passing gate step is not a gate block.
    expect(pulseWasGated([step('configNode', true), step('void', false)])).toBe(false);
    // A failed non-gate step does not count.
    expect(pulseWasGated([step('gear', false), step('void', false)])).toBe(false);
    expect(pulseWasGated([])).toBe(false);
  });

  test('[S2-2] zero delivered with no gate is void on a stateless level', () => {
    expect(classifyRunFailure({ ...base, reachedPerPulse: [false], gatedPerPulse: [false] })).toBe('void');
    expect(classifyRunFailure({ ...base, requiredCount: 3, reachedPerPulse: [false, false, false], gatedPerPulse: [false, false, false] })).toBe('void');
  });

  test('[S2-2] zero delivered on a live-gate level is void even when a gate blocked', () => {
    expect(classifyRunFailure({
      ...base, liveGate: true, hasTape: true, tapeMatches: false, undeliveredCount: 2,
      reachedPerPulse: [false, false], gatedPerPulse: [true, true],
    })).toBe('void');
    expect(classifyRunFailure({
      ...base, liveGate: true, hasTape: true, tapeMatches: true,
      reachedPerPulse: [false, false], gatedPerPulse: [true, false],
    })).toBe('void');
  });

  test('[S2-2] zero delivered with every pulse gated is insufficientGated on a documentary level', () => {
    expect(classifyRunFailure({
      ...base, hasTape: true, requiredCount: 2,
      reachedPerPulse: [false, false], gatedPerPulse: [true, true],
    })).toBe('insufficientGated');
  });

  test('[S2-2] live-gate tape mismatch with a delivery is wrongOutput', () => {
    expect(classifyRunFailure({
      ...base, liveGate: true, hasTape: true, tapeMatches: false,
      reachedPerPulse: [true, false], gatedPerPulse: [false, true],
    })).toBe('wrongOutput');
  });

  test('[S2-2] live-gate tape match with an undelivered non-blank pulse is undelivered', () => {
    expect(classifyRunFailure({
      ...base, liveGate: true, hasTape: true, tapeMatches: true, undeliveredCount: 1,
      reachedPerPulse: [true, false], gatedPerPulse: [false, false],
    })).toBe('undelivered');
    expect(classifyRunFailure({
      ...base, liveGate: true, hasTape: true, tapeMatches: true, undeliveredCount: 0,
      reachedPerPulse: [true, false], gatedPerPulse: [false, true],
    })).toBe('none');
  });

  test('[S2-2] documentary all-delivered mismatch is wrongOutput', () => {
    expect(classifyRunFailure({
      ...base, hasTape: true, tapeMatches: false, requiredCount: 2,
      reachedPerPulse: [true, true], gatedPerPulse: [false, false],
    })).toBe('wrongOutput');
  });

  test('[S2-2] documentary short with a lost route pulse is insufficientRoute', () => {
    expect(classifyRunFailure({
      ...base, hasTape: true, tapeMatches: false, requiredCount: 3,
      reachedPerPulse: [true, false, false], gatedPerPulse: [false, true, false],
    })).toBe('insufficientRoute');
  });

  test('[S2-2] documentary short with only gated pulses is insufficientGated', () => {
    expect(classifyRunFailure({
      ...base, hasTape: true, tapeMatches: false, requiredCount: 3,
      reachedPerPulse: [true, false, false], gatedPerPulse: [false, true, true],
    })).toBe('insufficientGated');
    // Enough delivered: none, even with a gated pulse.
    expect(classifyRunFailure({
      ...base, hasTape: true, tapeMatches: false, requiredCount: 1,
      reachedPerPulse: [true, false], gatedPerPulse: [false, true],
    })).toBe('none');
  });

  test('[S2-7] pulseChipRows splits 0..8 as specified', () => {
    expect(pulseChipRows(0)).toEqual([]);
    expect(pulseChipRows(1)).toEqual([1]);
    expect(pulseChipRows(2)).toEqual([2]);
    expect(pulseChipRows(3)).toEqual([3]);
    expect(pulseChipRows(4)).toEqual([4]);
    expect(pulseChipRows(5)).toEqual([5]);
    expect(pulseChipRows(6)).toEqual([3, 3]);
    expect(pulseChipRows(7)).toEqual([4, 3]);
    expect(pulseChipRows(8)).toEqual([4, 4]);
  });

  test('[S2-7] the widest row fits 280pt', () => {
    expect(PULSE_CHIP_SIZE).toBe(48);
    expect(PULSE_CHIP_GAP).toBe(8);
    for (let count = 0; count <= 8; count++) {
      const widest = Math.max(0, ...pulseChipRows(count));
      const width = widest * PULSE_CHIP_SIZE + Math.max(0, widest - 1) * PULSE_CHIP_GAP;
      expect(width).toBeLessThanOrEqual(280);
    }
    expect(5 * PULSE_CHIP_SIZE + 4 * PULSE_CHIP_GAP).toBe(272);
  });
});

// ─── S2-9 GUARD ──────────────────────────────────────────────────────────────
// Every shipped floor and alternate solve, built as floorSolves.test.ts builds
// it (Splitter magnets recomputed), fed through the same derivation
// GameplayScreen uses, classifies as 'none'.

function freshPrePlaced(level: LevelDefinition): PlacedPiece[] {
  return level.prePlacedPieces.map(p => ({
    ...p,
    ports: p.ports.map(port => ({ ...port })),
    storedValue: p.type === 'latch' ? null : p.storedValue,
    firedDuringRun: false,
  }));
}

function outcomeFor(l: LevelDefinition, solve: SolvePiece[]) {
  const pieces = computeSplitterMagnets([...freshPrePlaced(l), ...solvePieces(solve)]);
  const hasInput = !!l.inputTape && l.inputTape.length > 0;
  const pulseCount = hasInput ? l.inputTape!.length : 1;
  const state: MachineState = {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { ...l.dataTrail, cells: [...l.dataTrail.cells] },
    configuration: 1,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    inputTape: hasInput ? [...l.inputTape!] : undefined,
    outputTape: hasInput
      ? (new Array(l.inputTape!.length).fill(BLANK) as OutputTapeValue[])
      : undefined,
  };
  const pulses: ExecutionStep[][] = [];
  for (let i = 0; i < pulseCount; i++) pulses.push(executeMachine(state, i));

  const hasTape = !!(l.inputTape && l.expectedOutput);
  const expected = l.expectedOutput;
  const out = state.outputTape;
  const tapeMatches = hasTape && !!out && !!expected &&
    out.length === expected.length && out.every((v, i) => v === expected[i]);
  const liveGate = hasTape && !!expected && !!l.inputTape && expected.length === l.inputTape.length;
  const reachedPerPulse = pulses.map(p => p.some(s => s.type === 'terminal' && s.success));
  const undeliveredCount = liveGate && expected
    ? evaluateLiveGate(expected, out, reachedPerPulse).undelivered.length
    : 0;
  return classifyRunFailure({
    liveGate,
    hasTape,
    tapeMatches,
    reachedPerPulse,
    gatedPerPulse: pulses.map(pulseWasGated),
    requiredCount: l.requiredTerminalCount ?? 1,
    undeliveredCount,
  });
}

describe('SWEEP-B51 S2-9 guard', () => {
  test('[S2-9] GUARD every shipped floor and alternate solve classifies as none', () => {
    const ids = Object.keys(FLOOR_SOLVES);
    expect(ids.length).toBeGreaterThan(0);
    const results: string[] = [];
    for (const id of ids) {
      const level = ALL_LEVELS.find(x => x.id === id);
      expect({ id, found: !!level }).toEqual({ id, found: true });
      for (const kind of ['floor', 'alternate'] as const) {
        results.push(`${id}/${kind}:${outcomeFor(level!, FLOOR_SOLVES[id][kind])}`);
      }
    }
    expect(results.filter(r => !r.endsWith(':none'))).toEqual([]);
  });
});
