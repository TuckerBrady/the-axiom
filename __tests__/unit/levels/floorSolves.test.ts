// AXM-026 — floor solves and alternate solves for every in-scope level.
// Spec: SPEC_SOURCE_TERMINAL_PLACEMENT v1.1, sections 7 and 9.3, pre-written
// cases from section 11 (bodies written here, assertions fixed by the spec).
//
// The live game recomputes Splitter magnets every time a piece is placed
// (gameStore.computeSplitterMagnets). verifyPuzzle does not, so each solve is
// run through that same step before it is verified: the fixture is checked
// against the board the Engineer would actually have built.

import { ALL_LEVELS } from '../../../src/game/levels';
import type {
  ExecutionStep,
  LevelDefinition,
  MachineState,
  OutputTapeValue,
  PlacedPiece,
  PortSide,
} from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import {
  autoConnectPhysicsPieces,
  evaluateRequiredPieces,
  executeMachine,
} from '../../../src/game/engine';
import { verifyPuzzle, verifyPieceAvailability } from '../../../src/game/puzzleVerifier';
import { computeSplitterMagnets } from '../../../src/store/gameStore';
import { calculateScore } from '../../../src/game/scoring';
import { PIECE_PRICES } from '../../../src/game/piecePrices';
import {
  FLOOR_SOLVES,
  solvePieces,
  type SolvePiece,
} from '../../fixtures/floorSolves';
import masterSnapshot from '../../fixtures/levelsMasterSnapshot.json';

const EXEMPT_LIST: string[] = []; // v1.1: no exemptions (Q1, 2026-09-26)
const inScope = ALL_LEVELS.filter(l => !l.placementExemption);
const snapshot = masterSnapshot as unknown as Record<string, Record<string, unknown>>;

// Fresh copies every run: executeMachine mutates pieces (Latch storedValue,
// firedDuringRun), and the level's pre-placed pieces are module singletons.
function freshPrePlaced(level: LevelDefinition): PlacedPiece[] {
  return level.prePlacedPieces.map(p => ({
    ...p,
    ports: p.ports.map(port => ({ ...port })),
    storedValue: p.type === 'latch' ? null : p.storedValue,
    firedDuringRun: false,
  }));
}

// The board as the live game holds it after the solve is placed.
function boardFor(level: LevelDefinition, solve: SolvePiece[]) {
  const all = computeSplitterMagnets([...freshPrePlaced(level), ...solvePieces(solve)]);
  return {
    level: { ...level, prePlacedPieces: all.filter(p => p.isPrePlaced) },
    player: all.filter(p => !p.isPrePlaced),
  };
}

// Mirrors puzzleVerifier.runSolution, keeping every pulse's steps.
function runPulses(level: LevelDefinition, player: PlacedPiece[]) {
  const pieces = [...level.prePlacedPieces, ...player];
  const hasTape = !!level.inputTape && level.inputTape.length > 0;
  const pulseCount = hasTape ? level.inputTape!.length : 1;
  const state: MachineState = {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
    configuration: 1,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    inputTape: hasTape ? [...level.inputTape!] : undefined,
    outputTape: hasTape
      ? (new Array(level.inputTape!.length).fill(BLANK) as OutputTapeValue[])
      : undefined,
  };
  const pulses: ExecutionStep[][] = [];
  for (let i = 0; i < pulseCount; i++) pulses.push(executeMachine(state, i));
  return { pulses, pieces };
}

const solvesOf = (id: string) => FLOOR_SOLVES[id];
const cellKey = (p: { x: number; y: number }) => `${p.x},${p.y}`;
const signature = (s: SolvePiece[]) =>
  s.map(p => `${p.type}@${p.x},${p.y}r${p.rotation ?? 0}c${p.configValue ?? ''}l${p.latchMode ?? ''}`)
    .sort()
    .join('|');

const SECTOR_BUFFER: Record<string, number> = { kepler: 50, nova: 75 };

function floorCost(solve: SolvePiece[]): number {
  return solve.reduce((sum, p) => sum + (PIECE_PRICES[p.type] ?? 0), 0);
}

function sideOf(from: { gridX: number; gridY: number }, to: { gridX: number; gridY: number }): PortSide | null {
  const dx = from.gridX - to.gridX;
  const dy = from.gridY - to.gridY;
  if (dx === -1 && dy === 0) return 'left';
  if (dx === 1 && dy === 0) return 'right';
  if (dx === 0 && dy === -1) return 'top';
  if (dx === 0 && dy === 1) return 'bottom';
  return null;
}

describe('AXM-026 floor solves', () => {
  it('[7.1] every in-scope level has a floor-solve fixture and a distinct alternate-solve fixture', () => {
    for (const l of inScope) {
      const s = solvesOf(l.id);
      expect({ id: l.id, hasFixture: !!s }).toEqual({ id: l.id, hasFixture: true });
      expect(s.floor.length).toBeGreaterThan(0);
      expect(s.alternate.length).toBeGreaterThan(0);
      expect({ id: l.id, distinct: signature(s.floor) !== signature(s.alternate) })
        .toEqual({ id: l.id, distinct: true });
    }
  });

  it('solve fixtures never place a piece on a damaged cell', () => {
    for (const l of inScope) {
      const damaged = new Set((l.damagedCells ?? []).map(c => `${c.gridX},${c.gridY}`));
      for (const p of [...solvesOf(l.id).floor, ...solvesOf(l.id).alternate]) {
        expect({ id: l.id, cell: cellKey(p), damaged: damaged.has(cellKey(p)) })
          .toEqual({ id: l.id, cell: cellKey(p), damaged: false });
      }
    }
  });

  it('[7.2] the floor solve solves the level with tray and pre-placed pieces only', () => {
    for (const l of inScope) {
      const { level, player } = boardFor(l, solvesOf(l.id).floor);
      const result = verifyPuzzle(level, player);
      expect({ id: l.id, solvable: result.solvable, why: result.failReason })
        .toEqual({ id: l.id, solvable: true, why: undefined });
      expect({ id: l.id, available: verifyPieceAvailability(l, player) })
        .toEqual({ id: l.id, available: true });
    }
  });

  it('[7.3] the alternate solve solves the level and uses at least as many player pieces', () => {
    for (const l of inScope) {
      const s = solvesOf(l.id);
      const { level, player } = boardFor(l, s.alternate);
      const result = verifyPuzzle(level, player);
      expect({ id: l.id, solvable: result.solvable, why: result.failReason })
        .toEqual({ id: l.id, solvable: true, why: undefined });
      expect({ id: l.id, available: verifyPieceAvailability(l, player) })
        .toEqual({ id: l.id, available: true });
      expect(s.alternate.length).toBeGreaterThanOrEqual(s.floor.length);
    }
  });

  it('[7.4] K1-7, K1-8, K1-10: both solves enter the Terminal from the documented side', () => {
    for (const id of ['K1-7', 'K1-8', 'K1-10']) {
      const l = ALL_LEVELS.find(x => x.id === id)!;
      const s = solvesOf(id);
      expect({ id, documented: !!s.terminalEntrySide }).toEqual({ id, documented: true });
      for (const solve of [s.floor, s.alternate]) {
        const { level, player } = boardFor(l, solve);
        const { pulses, pieces } = runPulses(level, player);
        const terminal = pieces.find(p => p.type === 'terminal')!;
        let delivered = 0;
        for (const steps of pulses) {
          const t = steps.findIndex(st => st.type === 'terminal' && st.success);
          if (t < 0) continue;
          delivered += 1;
          const before = pieces.find(p => p.id === steps[t - 1].pieceId)!;
          expect({ id, side: sideOf(before, terminal) }).toEqual({ id, side: s.terminalEntrySide });
        }
        expect(delivered).toBeGreaterThan(0);
      }
    }
  });

  it('[7.5] optimalPieces equals the floor solve piece count', () => {
    for (const l of inScope) {
      expect({ id: l.id, optimalPieces: l.optimalPieces })
        .toEqual({ id: l.id, optimalPieces: solvesOf(l.id).floor.length });
    }
  });

  it('[7.6] depthCeiling is undefined or at least optimalPieces', () => {
    for (const l of inScope) {
      if (l.depthCeiling === undefined) continue;
      expect({ id: l.id, ok: l.depthCeiling >= l.optimalPieces }).toEqual({ id: l.id, ok: true });
    }
  });

  it('[7.7] minPieces is undefined or at most optimalPieces', () => {
    for (const l of inScope) {
      if (l.minPieces === undefined) continue;
      expect({ id: l.id, ok: l.minPieces <= l.optimalPieces }).toEqual({ id: l.id, ok: true });
    }
  });

  it('[7.8] budget is undefined or covers the floor cost plus the sector fresh-board buffer', () => {
    // The fresh-board buffer is defined for Kepler (50 CR) and later sectors
    // (75 CR). The Axiom has no fresh board and charges nothing for placement,
    // so the clause has no buffer to apply there.
    for (const l of inScope.filter(x => SECTOR_BUFFER[x.sector] !== undefined)) {
      if (l.budget === undefined) continue;
      const needed = floorCost(solvesOf(l.id).floor) + SECTOR_BUFFER[l.sector];
      expect({ id: l.id, budget: l.budget, needed, ok: l.budget >= needed })
        .toEqual({ id: l.id, budget: l.budget, needed, ok: true });
    }
  });

  it('[7.9] requiredPieces are satisfied by the floor solve', () => {
    for (const l of inScope.filter(x => (x.requiredPieces?.length ?? 0) > 0)) {
      const { level, player } = boardFor(l, solvesOf(l.id).floor);
      const { pieces } = runPulses(level, player);
      const runStates = pieces.map(p => ({ pieceId: p.id, firedDuringRun: p.firedDuringRun === true }));
      expect({ id: l.id, result: evaluateRequiredPieces(l, runStates, pieces).result })
        .toEqual({ id: l.id, result: 'satisfied' });
    }
  });

  // [7.10] cannot hold under the scoring model on master. scoring-algorithm-v2
  // REQ-1 and REQ-3 cap a solve built only from issued pieces at one star
  // (calculateScore tops out at 45 without a purchased piece), so no floor
  // solve scores 80. The assertion is kept exactly as the spec states it and
  // marked as a known failure; it turns red the day the conflict is resolved,
  // which is the signal to drop `.failing`. Raised as an open question on the
  // AXM-026 PR.
  function bestFloorScore(l: LevelDefinition): number {
    const { level, player } = boardFor(l, solvesOf(l.id).floor);
    const { pulses, pieces } = runPulses(level, player);
    const steps = pulses.flat();
    return Math.max(...(['systems', 'drive', 'field'] as const).map(discipline =>
      calculateScore({
        executionSteps: steps,
        placedPieces: pieces,
        optimalPieces: l.optimalPieces,
        trayPieceTypes: l.availablePieces,
        depthCeiling: l.depthCeiling,
        discipline,
      }).total));
  }

  it.failing('[7.10] scoring the floor-solve run yields at least 80 (three stars)', () => {
    for (const l of inScope) {
      expect({ id: l.id, threeStars: bestFloorScore(l) >= 80 }).toEqual({ id: l.id, threeStars: true });
    }
  });

  it.failing('[7.10] K1-10 (requireThreeStars): the floor solve scores at least 80', () => {
    const l = ALL_LEVELS.find(x => x.id === 'K1-10')!;
    expect(l.consequence?.requireThreeStars).toBe(true);
    expect(bestFloorScore(l)).toBeGreaterThanOrEqual(80);
  });

  it('[7.12] GUARD: tapes, requiredTerminalCount and objectives match master', () => {
    for (const l of ALL_LEVELS) {
      const m = snapshot[l.id];
      expect({ id: l.id, known: !!m }).toEqual({ id: l.id, known: true });
      const now = JSON.parse(JSON.stringify({
        inputTape: l.inputTape,
        expectedOutput: l.expectedOutput,
        requiredTerminalCount: l.requiredTerminalCount,
        objectives: l.objectives,
      }));
      expect({ id: l.id, ...now }).toEqual({
        id: l.id,
        inputTape: m.inputTape,
        expectedOutput: m.expectedOutput,
        requiredTerminalCount: m.requiredTerminalCount,
        objectives: m.objectives,
      });
    }
  });

  it('[9.3] GUARD: every exempt level deep-equals its master snapshot, ignoring placementExemption', () => {
    expect(Object.keys(snapshot).sort()).toEqual(ALL_LEVELS.map(l => l.id).sort());
    for (const l of ALL_LEVELS.filter(x => EXEMPT_LIST.includes(x.id))) {
      const { placementExemption: _ignored, ...rest } = l;
      expect(JSON.parse(JSON.stringify(rest))).toEqual(snapshot[l.id]);
    }
  });
});
