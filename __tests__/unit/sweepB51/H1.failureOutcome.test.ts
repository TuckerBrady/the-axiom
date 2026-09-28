/**
 * SWEEP-B51 H1 (AXM-040): the route line may only claim what the run shows
 * (contract v1.3 R-H1.3, clause H1-8). A short run whose lost pulses were
 * partly gated and partly lost to the route is 'insufficientMixed'.
 *
 * This suite imports only exports that exist on master, so its GUARDs
 * compile and pass there.
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
import { classifyRunFailure, pulseWasGated } from '../../../src/game/engagement/failureOutcome';

const base = {
  liveGate: false,
  hasTape: true,
  tapeMatches: false,
  undeliveredCount: 0,
};

// Fresh copies every run: executeMachine mutates pieces, and the level's
// pre-placed pieces are module singletons (as floorSolves.test.ts does).
function freshPrePlaced(level: LevelDefinition): PlacedPiece[] {
  return level.prePlacedPieces.map(p => ({
    ...p,
    ports: p.ports.map(port => ({ ...port })),
    storedValue: p.type === 'latch' ? null : p.storedValue,
    firedDuringRun: false,
  }));
}

function boardFor(level: LevelDefinition, solve: SolvePiece[]): PlacedPiece[] {
  return computeSplitterMagnets([...freshPrePlaced(level), ...solvePieces(solve)]);
}

function runPulses(level: LevelDefinition, pieces: PlacedPiece[]) {
  const hasInput = !!level.inputTape && level.inputTape.length > 0;
  const pulseCount = hasInput ? level.inputTape!.length : 1;
  const state: MachineState = {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
    configuration: 1,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    inputTape: hasInput ? [...level.inputTape!] : undefined,
    outputTape: hasInput
      ? (new Array(level.inputTape!.length).fill(BLANK) as OutputTapeValue[])
      : undefined,
  };
  const pulses: ExecutionStep[][] = [];
  for (let i = 0; i < pulseCount; i++) pulses.push(executeMachine(state, i));
  return { pulses, outputTape: state.outputTape };
}

// Feeds classifyRunFailure exactly as GameplayScreen does.
function classifyAsGameplay(level: LevelDefinition, pulses: ExecutionStep[][], outputTape?: OutputTapeValue[]) {
  const hasTape = !!(level.inputTape && level.expectedOutput);
  const expected = level.expectedOutput;
  const tapeMatches = hasTape && !!outputTape && !!expected &&
    outputTape.length === expected.length &&
    outputTape.every((v, i) => v === expected[i]);
  const liveGate = hasTape && !!expected && !!level.inputTape &&
    expected.length === level.inputTape.length;
  const reachedPerPulse = pulses.map(p => p.some(s => s.type === 'terminal' && s.success));
  const gatedPerPulse = pulses.map(pulseWasGated);
  const liveGateResult = liveGate && expected
    ? evaluateLiveGate(expected, outputTape ?? [], reachedPerPulse)
    : null;
  return {
    liveGate,
    reachedPerPulse,
    gatedPerPulse,
    outcome: classifyRunFailure({
      liveGate,
      hasTape,
      tapeMatches,
      reachedPerPulse,
      gatedPerPulse,
      requiredCount: level.requiredTerminalCount ?? 1,
      undeliveredCount: liveGateResult?.undelivered.length ?? 0,
    }),
  };
}

describe('SWEEP-B51 H1 failure outcome', () => {
  it('[H1-8] a short run with gated and route-lost pulses is insufficientMixed', () => {
    expect(classifyRunFailure({
      ...base, requiredCount: 3,
      reachedPerPulse: [true, false, false], gatedPerPulse: [false, true, false],
    })).toBe('insufficientMixed');
    expect(classifyRunFailure({
      ...base, hasTape: false, requiredCount: 4,
      reachedPerPulse: [true, false, true, false], gatedPerPulse: [false, false, false, true],
    })).toBe('insufficientMixed');
  });

  it('[H1-8] zero delivered with gated and route-lost pulses on a documentary level is insufficientMixed', () => {
    expect(classifyRunFailure({
      ...base, requiredCount: 5,
      reachedPerPulse: [false, false, false], gatedPerPulse: [true, false, true],
    })).toBe('insufficientMixed');
  });

  it('[H1-8] GUARD a short run whose lost pulses were all route-lost stays insufficientRoute', () => {
    expect(classifyRunFailure({
      ...base, requiredCount: 3,
      reachedPerPulse: [true, false, false], gatedPerPulse: [false, false, false],
    })).toBe('insufficientRoute');
    // A gated flag on a delivered pulse is not a lost pulse.
    expect(classifyRunFailure({
      ...base, requiredCount: 3,
      reachedPerPulse: [true, false], gatedPerPulse: [true, false],
    })).toBe('insufficientRoute');
    // Rule 1 still wins: nothing delivered and nothing gated is void.
    expect(classifyRunFailure({
      ...base, requiredCount: 3,
      reachedPerPulse: [false, false], gatedPerPulse: [false, false],
    })).toBe('void');
  });

  it('[H1-8] GUARD a short run whose lost pulses were all gated stays insufficientGated', () => {
    expect(classifyRunFailure({
      ...base, requiredCount: 3,
      reachedPerPulse: [true, false, false], gatedPerPulse: [false, true, true],
    })).toBe('insufficientGated');
    expect(classifyRunFailure({
      ...base, requiredCount: 2,
      reachedPerPulse: [false, false], gatedPerPulse: [true, true],
    })).toBe('insufficientGated');
  });

  it('[H1-8] the A1-6 smoke run classifies as insufficientMixed', () => {
    const level = ALL_LEVELS.find(l => l.id === 'A1-6')!;
    expect(level).toBeDefined();
    const floor = FLOOR_SOLVES['A1-6'].floor;

    // Path order, from a pulse that the intact floor delivers.
    const intact = boardFor(level, floor);
    const { pulses: intactPulses } = runPulses(level, intact);
    const delivered = intactPulses.find(p => p.some(s => s.type === 'terminal' && s.success));
    expect(delivered).toBeDefined();
    const order: string[] = [];
    for (const s of delivered!) if (!order.includes(s.pieceId)) order.push(s.pieceId);
    const byId = new Map(intact.map(p => [p.id, p]));
    const firstCfgIdx = order.findIndex(id => byId.get(id)?.type === 'configNode');
    expect(firstCfgIdx).toBeGreaterThan(-1);
    const cfg = byId.get(order[firstCfgIdx])!;
    const next = byId.get(order[firstCfgIdx + 1])!;
    expect(next).toBeDefined();
    expect(next.isPrePlaced).toBe(false);

    // First Config Node at 1, the piece right after it removed.
    const at = (p: { gridX: number; gridY: number }) => (s: SolvePiece) => s.x === p.gridX && s.y === p.gridY;
    expect(floor.filter(at(cfg))).toHaveLength(1);
    expect(floor.filter(at(next))).toHaveLength(1);
    const smoke: SolvePiece[] = floor
      .filter(s => !at(next)(s))
      .map(s => (at(cfg)(s) ? { ...s, configValue: 1 } : s));
    expect(smoke).toHaveLength(floor.length - 1);

    const { pulses, outputTape } = runPulses(level, boardFor(level, smoke));
    const r = classifyAsGameplay(level, pulses, outputTape);
    expect(r.liveGate).toBe(false);

    const lost = r.reachedPerPulse.flatMap((reached, i) => (reached ? [] : [i]));
    const gatedLost = lost.filter(i => r.gatedPerPulse[i]);
    const routeLost = lost.filter(i => !r.gatedPerPulse[i]);
    expect(gatedLost.length).toBeGreaterThanOrEqual(1);
    expect(routeLost.length).toBeGreaterThanOrEqual(1);

    expect(r.outcome).toBe('insufficientMixed');
  });
});
