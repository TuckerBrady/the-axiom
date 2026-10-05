// AXM-046 PR 1, R1.1 — READ/WRITE module engine.
// Clauses: AXM-045 DESIGN_SPEC v1.1 DR-12..DR-15, with the RFC-2119 detail in
// Pierce - System Engineer/AXM-045_ENGINE_IMPACT.md section 4 (12.x, 13.x, 14.x).
// Written red first.

import type { ExecutionStep, OutputTapeValue, PieceType, PlacedPiece } from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import { executeMachine, evaluateMinPieces, resetRunState } from '../../../src/game/engine';
import { calculateScore } from '../../../src/game/scoring';
import { ALL_LEVELS } from '../../../src/game/levels';
import { FLOOR_SOLVES, solvePieces } from '../../fixtures/floorSolves';
import { computeSplitterMagnets } from '../../../src/store/gameStore';
import { line, piece, pre, stateFor, E } from '../../fixtures/axm046EngineFixtures';

const blanks = (n: number) => new Array(n).fill(BLANK) as OutputTapeValue[];
const types = (steps: ExecutionStep[]) => steps.map(s => s.type);

function runPulses(state: ReturnType<typeof stateFor>, n: number): ExecutionStep[][] {
  const out: ExecutionStep[][] = [];
  for (let i = 0; i < n; i++) out.push(executeMachine(state, i));
  return out;
}

describe('DR-12 READ module (Source)', () => {
  it('12.3: sets TRAIL[N] = IN[N] on every pulse', () => {
    const pieces = line(['conveyor', 'conveyor'], { source: { module: 'read' } });
    const state = stateFor(pieces, [null, null, null], 0, { inputTape: [1, 0, 1] });
    runPulses(state, 3);
    expect(state.dataTrail.cells).toEqual([1, 0, 1]);
  });

  it('12.3: does nothing past the end of the trail', () => {
    const pieces = line(['conveyor'], { source: { module: 'read' } });
    const state = stateFor(pieces, [null], 0, { inputTape: [1, 1] });
    runPulses(state, 2);
    expect(state.dataTrail.cells).toEqual([1]);
  });

  it('12.2: fires even when the beam goes nowhere', () => {
    const source = pre('source', 0, 0, { module: 'read' });
    const state = stateFor([source], [null, null], 0, { inputTape: [0, 1] });
    const p1 = executeMachine(state, 0);
    executeMachine(state, 1);
    expect(state.dataTrail.cells).toEqual([0, 1]);
    expect(types(p1)).toContain('moduleRead');
  });

  it('12.4: does not move the trail head', () => {
    const pieces = line(['conveyor'], { source: { module: 'read' } });
    const state = stateFor(pieces, [null, null], 0, { inputTape: [1, 0] });
    runPulses(state, 2);
    expect(state.dataTrail.headPosition).toBe(0);
  });

  it('12.6: emits one moduleRead step, immediately after the Source step, with the Source id', () => {
    const pieces = line(['conveyor', 'conveyor'], { source: { module: 'read' } });
    const state = stateFor(pieces, [null], 0, { inputTape: [1] });
    const steps = executeMachine(state, 0);
    expect(steps[0].type).toBe('source');
    expect(steps[1]).toMatchObject({ type: 'moduleRead', pieceId: pieces[0].id, success: true });
    expect(types(steps).filter(t => t === 'moduleRead')).toHaveLength(1);
  });

  it('T-12.2: a trail-reading Config Node beside the Source passes with READ, fails without', () => {
    const withRead = line([piece('configNode', 0, 0, { configValue: 1 }), 'conveyor'], { source: { module: 'read' } });
    const without = line([piece('configNode', 0, 0, { configValue: 1 }), 'conveyor']);
    const a = executeMachine(stateFor(withRead, [null], 0, { inputTape: [1] }), 0);
    const b = executeMachine(stateFor(without, [null], 0, { inputTape: [1] }), 0);
    expect(a.find(s => s.type === 'configNode')?.success).toBe(true);
    expect(a.some(s => s.type === 'terminal' && s.success)).toBe(true);
    expect(b.find(s => s.type === 'configNode')?.success).toBe(false);
  });

  it('12.7: sets the module fired flag; resetRunState clears it', () => {
    const pieces = line(['conveyor'], { source: { module: 'read' } });
    const state = stateFor(pieces, [null], 0, { inputTape: [1] });
    executeMachine(state, 0);
    const source = state.pieces.find(p => p.type === 'source')!;
    expect(source.moduleFiredDuringRun).toBe(true);
    resetRunState(state.pieces);
    expect(source.moduleFiredDuringRun).toBe(false);
  });

  it('T-12.3: A1-5 floor solve with the Scanner swapped for a Conveyor and READ seated keeps the master TRAIL', () => {
    const level = ALL_LEVELS.find(l => l.id === 'A1-5')!;
    const solve = FLOOR_SOLVES['A1-5'].floor;
    const build = (useRead: boolean) => {
      const prePieces = level.prePlacedPieces.map(p => ({
        ...p,
        ports: p.ports.map(q => ({ ...q })),
        ...(useRead && p.type === 'source' ? { module: 'read' as const } : {}),
      }));
      const player = solvePieces(
        useRead
          ? solve.map(p => (p.type === 'scanner' ? { type: 'conveyor' as const, x: p.x, y: p.y, rotation: E } : p))
          : solve,
      );
      return stateFor(computeSplitterMagnets([...prePieces, ...player]), level.dataTrail.cells, level.dataTrail.headPosition, {
        inputTape: [...level.inputTape!],
        outputTape: blanks(level.inputTape!.length),
      });
    };
    const master = build(false);
    const modular = build(true);
    runPulses(master, level.inputTape!.length);
    runPulses(modular, level.inputTape!.length);
    expect(modular.dataTrail.cells).toEqual(master.dataTrail.cells);
  });
});

describe('DR-13 WRITE module (Terminal)', () => {
  it('13.3: writes the value arriving at the Terminal, after an Inverter', () => {
    const pieces = line(['inverter', 'conveyor'], { terminal: { module: 'write' } });
    const state = stateFor(pieces, [], 0, { inputTape: [1, 0, 1], outputTape: blanks(3) });
    runPulses(state, 3);
    expect(state.outputTape).toEqual([0, 1, 0]);
  });

  it('13.7: emits one moduleWrite step immediately before the Terminal step', () => {
    const pieces = line(['conveyor'], { terminal: { module: 'write' } });
    const state = stateFor(pieces, [], 0, { inputTape: [1], outputTape: blanks(1) });
    const steps = executeMachine(state, 0);
    const t = steps.findIndex(s => s.type === 'terminal' && s.success);
    const terminalId = pieces[pieces.length - 1].id;
    expect(steps[t - 1]).toMatchObject({ type: 'moduleWrite', pieceId: terminalId, success: true });
    expect(types(steps).filter(x => x === 'moduleWrite')).toHaveLength(1);
  });

  it('13.4: a gated pulse leaves OUT[N] BLANK and emits no moduleWrite', () => {
    // Config gate 1 reads the trail; pulse 0 trail is 0 (blocked), pulse 1 is 1.
    const pieces = line([piece('configNode', 0, 0, { configValue: 1 }), 'conveyor'], { terminal: { module: 'write' } });
    const state = stateFor(pieces, [0, 1], 0, { inputTape: [1, 1], outputTape: blanks(2) });
    const [p1, p2] = runPulses(state, 2);
    expect(state.outputTape).toEqual([BLANK, 1]);
    expect(types(p1)).not.toContain('moduleWrite');
    expect(types(p2)).toContain('moduleWrite');
  });

  it('13.4: a wrong-side arrival writes nothing', () => {
    const pieces = line(['conveyor'], { terminal: { module: 'write', entrySide: 'right' } });
    const state = stateFor(pieces, [], 0, { inputTape: [1], outputTape: blanks(1) });
    const steps = executeMachine(state, 0);
    expect(state.outputTape).toEqual([BLANK]);
    expect(types(steps)).not.toContain('moduleWrite');
  });

  it('13.6: never reads or modifies the Data Trail', () => {
    const pieces = line(['conveyor'], { terminal: { module: 'write' } });
    const state = stateFor(pieces, [0, null], 1, { inputTape: [1, 1], outputTape: blanks(2) });
    runPulses(state, 2);
    expect(state.dataTrail).toEqual({ cells: [0, null], headPosition: 1 });
  });

  it('T-13.3: NF-1 floor solve with the Transmitter swapped for a Conveyor and WRITE seated keeps the master OUT', () => {
    const level = ALL_LEVELS.find(l => l.id === 'NF-1')!;
    const solve = FLOOR_SOLVES['NF-1'].floor;
    const build = (useWrite: boolean) => {
      const prePieces = level.prePlacedPieces.map(p => ({
        ...p,
        ports: p.ports.map(q => ({ ...q })),
        ...(useWrite && p.type === 'terminal' ? { module: 'write' as const } : {}),
      }));
      const player = solvePieces(
        useWrite
          ? solve.map(p => (p.type === 'transmitter' ? { type: 'conveyor' as const, x: p.x, y: p.y, rotation: E } : p))
          : solve,
      );
      return stateFor(computeSplitterMagnets([...prePieces, ...player]), level.dataTrail.cells, level.dataTrail.headPosition, {
        inputTape: [...level.inputTape!],
        outputTape: blanks(level.inputTape!.length),
      });
    };
    const master = build(false);
    const modular = build(true);
    runPulses(master, level.inputTape!.length);
    runPulses(modular, level.inputTape!.length);
    expect(modular.outputTape).toEqual(master.outputTape);
    expect(modular.outputTape).toEqual([0, 1, 0, 0, 1]);
  });
});

describe('DR-14 no module seated', () => {
  it('14.1/14.2: a Source and Terminal without modules emit no module steps and write no tape', () => {
    const pieces = line(['conveyor']);
    const state = stateFor(pieces, [null], 0, { inputTape: [1], outputTape: blanks(1) });
    const steps = executeMachine(state, 0);
    expect(types(steps)).toEqual(['source', 'conveyor', 'terminal']);
    expect(state.dataTrail.cells).toEqual([null]);
    expect(state.outputTape).toEqual([BLANK]);
  });
});

describe('DR-15 scoring', () => {
  function scored(
    pieces: PlacedPiece[],
    steps: ExecutionStep[],
    purchasedTapeTypes: ('TRAIL' | 'OUT')[] = [],
    trayPieceTypes: PieceType[] = [],
  ) {
    return calculateScore({
      executionSteps: steps,
      placedPieces: pieces,
      optimalPieces: 1,
      trayPieceTypes,
      purchasedTapeTypes,
      discipline: 'systems',
    });
  }

  it('12.7: a moduleRead satisfies "trail utilised" exactly as a scanner step does', () => {
    const pieces = line(['conveyor'], { source: { module: 'read' } });
    const state = stateFor(pieces, [null], 0, { inputTape: [1] });
    const steps = executeMachine(state, 0);
    const withTrail = scored(state.pieces, steps, ['TRAIL']);
    const withoutTrail = scored(state.pieces, steps, []);
    expect(withTrail.breakdown.investment - withoutTrail.breakdown.investment).toBe(4);
  });

  it('13.7: a moduleWrite satisfies "OUT utilised"', () => {
    const pieces = line(['conveyor'], { terminal: { module: 'write' } });
    const state = stateFor(pieces, [], 0, { inputTape: [1], outputTape: blanks(1) });
    const steps = executeMachine(state, 0);
    const withOut = scored(state.pieces, steps, ['OUT']);
    const withoutOut = scored(state.pieces, steps, []);
    expect(withOut.breakdown.investment - withoutOut.breakdown.investment).toBe(4);
  });

  it('DR-15: a seated module that fired counts as an active Protocol piece', () => {
    const plain = line(['conveyor']);
    const seated = line(['conveyor'], { source: { module: 'read' } });
    const a = stateFor(plain, [null], 0, { inputTape: [1] });
    const b = stateFor(seated, [null], 0, { inputTape: [1] });
    // Both pieces come from the tray (the module under its persisted key,
    // 'scanner'), so nothing is purchased and Discipline takes half credit.
    const tray: PieceType[] = ['conveyor', 'scanner'];
    const sa = scored(a.pieces, executeMachine(a, 0), [], tray);
    const sb = scored(b.pieces, executeMachine(b, 0), [], tray);
    // Systems discipline rewards active Protocol pieces: 0 -> 1 of 4 (half
    // credit with no purchase) is round(0.25 * 10 * 0.5) = 1.
    expect(sa.breakdown.discipline).toBe(0);
    expect(sb.breakdown.discipline).toBe(1);
  });

  it('DR-15: a seated module that fired counts toward the minPieces floor', () => {
    const seated = line(['conveyor'], { source: { module: 'read' } });
    const state = stateFor(seated, [null], 0, { inputTape: [1] });
    executeMachine(state, 0);
    const level = { minPieces: 2 } as Parameters<typeof evaluateMinPieces>[0];
    expect(evaluateMinPieces(level, state.pieces)).toEqual({ met: true, active: 2, required: 2 });
  });
});
