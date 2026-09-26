// Pre-written tests — SPEC_DIRECTIONAL_TERMINAL v1.0 section 11,
// directionalTerminalLevels.test.ts (AXM-029 PR 1). Level data invariants for
// directional Terminals. PR 1 is inert: no level sets entrySide yet, so the
// per-Terminal invariants (8.5.x) iterate an empty set until PR 3.
//
// [10.2] (floor-solve execution GUARD) lives in levelExecutionGuard.test.ts so
// its baseline could be recorded against the unmodified engine: this file does
// not compile there (it uses the new entrySide field).
import type { LevelDefinition, PlacedPiece, MachineState, OutputTapeValue } from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import {
  ALL_LEVELS, AXIOM_LEVELS, KEPLER_LEVELS, prePlaced,
} from '../../../src/game/levels';
import { canSendTo, executeMachine, autoConnectPhysicsPieces } from '../../../src/game/engine';
import { computeSplitterMagnets } from '../../../src/store/gameStore';

const OFFSET = {
  top: { dx: 0, dy: -1 },
  bottom: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} as const;

function directionalTerminals(level: LevelDefinition): PlacedPiece[] {
  return level.prePlacedPieces.filter(p => p.type === 'terminal' && p.entrySide !== undefined);
}

function entryCell(t: PlacedPiece): { gridX: number; gridY: number } {
  const o = OFFSET[t.entrySide!];
  return { gridX: t.gridX + o.dx, gridY: t.gridY + o.dy };
}

// [8.5.4] Floor solve and documented alternate solve per directional level,
// keyed by level id. PR 3 adds an entry for every level it makes directional;
// the test below fails for any directional level missing one.
const DIRECTIONAL_SOLVES: Record<string, { floor: PlacedPiece[]; alternate: PlacedPiece[] }> = {};

function runPulses(level: LevelDefinition, solution: PlacedPiece[]) {
  const pieces = computeSplitterMagnets([
    ...level.prePlacedPieces.map(p => ({ ...p })),
    ...solution.map(p => ({ ...p })),
  ]);
  const pulseCount = level.inputTape?.length ?? 1;
  const state: MachineState = {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
    configuration: 1,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    inputTape: level.inputTape ? [...level.inputTape] : undefined,
    outputTape: level.inputTape
      ? (new Array(level.inputTape.length).fill(BLANK) as OutputTapeValue[])
      : undefined,
  };
  return Array.from({ length: pulseCount }, (_, i) => executeMachine(state, i));
}

describe('Directional Terminal — level data', () => {
  it('[2.3] every pre-placed piece with entrySide is a terminal', () => {
    for (const level of ALL_LEVELS) {
      for (const p of level.prePlacedPieces) {
        if (p.entrySide !== undefined) expect(p.type).toBe('terminal');
      }
    }
  });

  it('[2.4] prePlaced copies entrySide onto the piece', () => {
    expect(prePlaced('terminal', 4, 4, { entrySide: 'top' }).entrySide).toBe('top');
  });

  it('[2.4] prePlaced without entrySide leaves the field absent', () => {
    expect('entrySide' in prePlaced('terminal', 4, 4)).toBe(false);
  });

  it('[8.1] no Axiom level has a Terminal with entrySide', () => {
    for (const level of AXIOM_LEVELS) {
      expect(directionalTerminals(level)).toHaveLength(0);
    }
  });

  it('[8.3] K1-1 to K1-6 have no directional Terminal', () => {
    const early = KEPLER_LEVELS.filter(l =>
      ['K1-1', 'K1-2', 'K1-3', 'K1-4', 'K1-5', 'K1-6'].includes(l.id));
    expect(early).toHaveLength(6);
    for (const level of early) {
      expect(directionalTerminals(level)).toHaveLength(0);
    }
  });

  it('[9.1] PR 1 is inert: no level sets entrySide (PR 3 replaces this with K1-7/8/10 exactly one each)', () => {
    for (const level of ALL_LEVELS) {
      expect(directionalTerminals(level)).toHaveLength(0);
    }
  });

  it('[8.5.1]-[8.5.3] every directional Terminal has a usable entry cell', () => {
    for (const level of ALL_LEVELS) {
      for (const t of directionalTerminals(level)) {
        const cell = entryCell(t);
        // 8.5.1 in bounds
        expect(cell.gridX).toBeGreaterThanOrEqual(0);
        expect(cell.gridX).toBeLessThan(level.gridWidth);
        expect(cell.gridY).toBeGreaterThanOrEqual(0);
        expect(cell.gridY).toBeLessThan(level.gridHeight);
        // 8.5.2 not damaged, not an obstacle
        const damaged = (level.damagedCells ?? []).some(
          d => d.gridX === cell.gridX && d.gridY === cell.gridY);
        expect(damaged).toBe(false);
        const occupant = level.prePlacedPieces.find(
          p => p.gridX === cell.gridX && p.gridY === cell.gridY);
        if (occupant) {
          expect(occupant.type).not.toBe('obstacle');
          // 8.5.3 a pre-placed occupant must feed the Terminal
          expect(canSendTo(occupant, t)).toBe(true);
        }
      }
    }
  });

  it('[8.5.4] floor and alternate solves deliver through the entry side', () => {
    for (const level of ALL_LEVELS) {
      if (directionalTerminals(level).length === 0) continue;
      const solves = DIRECTIONAL_SOLVES[level.id];
      expect(solves).toBeDefined();
      for (const solution of [solves.floor, solves.alternate]) {
        const pulses = runPulses(level, solution);
        const last = pulses[pulses.length - 1];
        expect(last.some(s => s.type === 'terminal' && s.success)).toBe(true);
        expect(last.filter(s => s.type === 'terminalRejected')).toHaveLength(0);
      }
    }
  });
});
