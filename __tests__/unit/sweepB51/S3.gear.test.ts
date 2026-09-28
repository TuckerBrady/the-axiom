/**
 * SWEEP-B51 S3 (AXM-038): a Gear is 1 in / 1 out.
 *
 * A Gear accepts from any side and leaves through exactly one of the two sides
 * perpendicular to its entry. Candidates are the perpendicular neighbours that
 * accept on the facing side and have not been visited on this pulse. One
 * candidate: turn. Zero: jam 'noExit'. Two: jam 'twoExits'.
 *
 * `gearExits` and `ExecutionStep.gearJam` are read through loose types so this
 * file compiles on master too: the [S3-5] GUARD must run (and pass) there.
 */
import * as engine from '../../../src/game/engine';
import { autoConnectPhysicsPieces, executeMachine, getDefaultPorts } from '../../../src/game/engine';
import { traceBeam } from '../../../src/game/beamTrace';
import { beamWires } from '../../../src/game/beamWires';
import { verifyPuzzle } from '../../../src/game/puzzleVerifier';
import { computeSplitterMagnets } from '../../../src/store/gameStore';
import { ALL_LEVELS } from '../../../src/game/levels';
import { FLOOR_SOLVES, solvePieces } from '../../fixtures/floorSolves';
import type { ExecutionStep, LevelDefinition, MachineState, PlacedPiece, PortSide } from '../../../src/game/types';

type GearExitsFn = (
  piece: PlacedPiece, allPieces: PlacedPiece[], entrySide?: PortSide, visited?: Set<string>,
) => { exits: PlacedPiece[]; jam: null | 'noExit' | 'twoExits' };
const gearExits = (...args: Parameters<GearExitsFn>): ReturnType<GearExitsFn> =>
  (engine as unknown as { gearExits: GearExitsFn }).gearExits(...args);
const jamOf = (s: ExecutionStep) => (s as ExecutionStep & { gearJam?: string }).gearJam;

function makePiece(
  id: string, type: PlacedPiece['type'], gridX: number, gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  const category =
    ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'].includes(type)
      ? 'protocol' as const : 'physics' as const;
  return {
    id, type, category, gridX, gridY,
    ports: getDefaultPorts(type), rotation: 0, isPrePlaced: false,
    ...overrides,
  };
}

function makeState(pieces: PlacedPiece[]): MachineState {
  return {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { cells: [], headPosition: 0 },
    configuration: 0,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
  };
}

const run = (pieces: PlacedPiece[]) => executeMachine(makeState(pieces));
const reached = (steps: ExecutionStep[]) => steps.some(s => s.type === 'terminal' && s.success);
const visitedIds = (steps: ExecutionStep[]) => steps.map(s => s.pieceId);

describe('SWEEP-B51 S3 Gear routing', () => {
  test('[S3-1] a Gear never passes straight', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('t', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    expect(reached(run(pieces))).toBe(false);
  });

  test('[S3-2] a Gear turns into its one perpendicular exit', () => {
    const s = makePiece('s', 'source', 0, 0, { isPrePlaced: true });
    const g = makePiece('g', 'gear', 1, 0);
    const t = makePiece('t', 'terminal', 1, 1, { isPrePlaced: true });
    const steps = run([s, g, t]);
    expect(reached(steps)).toBe(true);
    const gearStep = steps.find(x => x.pieceId === 'g')!;
    expect(gearStep.success).toBe(true);
    expect(gearStep.message).toBe('Signal redirected by gear');
    expect(jamOf(gearStep)).toBeUndefined();
    const result = gearExits(g, [s, g, t], 'left', new Set(['s', 'g']));
    expect(result.jam).toBeNull();
    expect(result.exits.map(p => p.id)).toEqual(['t']);
  });

  test('[S3-2] a straight-ahead neighbour is never entered from a Gear', () => {
    // Source (0,1) -> Gear (1,1). Straight ahead, Conveyor (2,1) accepts from
    // the left. Below, a Conveyor (1,2) facing down leads to the Terminal.
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 1),
      makePiece('straight', 'conveyor', 2, 1),
      makePiece('down', 'conveyor', 1, 2, { rotation: 90 }),
      makePiece('t', 'terminal', 1, 3, { isPrePlaced: true }),
    ];
    const steps = run(pieces);
    expect(reached(steps)).toBe(true);
    expect(visitedIds(steps)).not.toContain('straight');
    expect(traceBeam(pieces).entry.has('straight')).toBe(false);
  });

  test('[S3-3] two accepting perpendicular exits jam with twoExits', () => {
    const pieces = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 1),
      makePiece('up', 'gear', 1, 0),
      makePiece('down', 'gear', 1, 2),
      makePiece('t', 'terminal', 2, 2, { isPrePlaced: true }),
    ];
    const steps = run(pieces);
    expect(reached(steps)).toBe(false);
    const gearStep = steps.find(x => x.pieceId === 'g')!;
    expect(gearStep.type).toBe('gear');
    expect(gearStep.success).toBe(false);
    expect(jamOf(gearStep)).toBe('twoExits');
    expect(visitedIds(steps)).not.toContain('up');
    expect(visitedIds(steps)).not.toContain('down');
    expect(steps[steps.length - 1].type).toBe('void');
  });

  test('[S3-3] no accepting perpendicular exit jams with noExit', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('t', 'terminal', 2, 0, { isPrePlaced: true }),
    ];
    const steps = run(pieces);
    const gearStep = steps.find(x => x.pieceId === 'g')!;
    expect(gearStep.type).toBe('gear');
    expect(gearStep.success).toBe(false);
    expect(jamOf(gearStep)).toBe('noExit');
    expect(steps[steps.length - 1].type).toBe('void');
    expect(steps.some(x => x.pieceId === 't')).toBe(false);
  });

  test('[S3-3] jam step messages are exact', () => {
    const noExit = run([
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('t', 'terminal', 2, 0, { isPrePlaced: true }),
    ]).find(x => x.pieceId === 'g')!;
    expect(noExit.message).toBe('Gear jammed — no perpendicular exit');
    const twoExits = run([
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 1),
      makePiece('up', 'gear', 1, 0),
      makePiece('down', 'gear', 1, 2),
      makePiece('t', 'terminal', 3, 3, { isPrePlaced: true }),
    ]).find(x => x.pieceId === 'g')!;
    expect(twoExits.message).toBe('Gear jammed — two perpendicular exits');
  });

  test('[S3-4] an already-visited piece is not a Gear exit, so a four-Gear jog reaches the Terminal', () => {
    const s = makePiece('s', 'source', 0, 1, { isPrePlaced: true });
    const g1 = makePiece('g1', 'gear', 1, 1);
    const g2 = makePiece('g2', 'gear', 1, 2);
    const g3 = makePiece('g3', 'gear', 2, 2);
    const g4 = makePiece('g4', 'gear', 2, 1);
    const t = makePiece('t', 'terminal', 3, 1, { isPrePlaced: true });
    const pieces = [s, g1, g2, g3, g4, t];
    expect(reached(run(pieces))).toBe(true);
    // The last Gear sits beside the first: visited, so it is not a candidate.
    expect(gearExits(g4, pieces, 'bottom', new Set(['s', 'g1', 'g2', 'g3', 'g4'])))
      .toEqual({ exits: [t], jam: null });
    // Without the visited set the first Gear would be a false second exit.
    expect(gearExits(g4, pieces, 'bottom').jam).toBe('twoExits');
    // No entry side: zero candidates.
    expect(gearExits(g1, pieces).jam).toBe('noExit');
    expect(gearExits(g1, pieces).exits).toEqual([]);
  });

  test("[S3-4] a directional Terminal met on a Gear's perpendicular wrong side is still rejected", () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('t', 'terminal', 1, 1, { isPrePlaced: true, entrySide: 'left' }),
    ];
    const steps = run(pieces);
    expect(reached(steps)).toBe(false);
    const rejectedIdx = steps.findIndex(x => x.type === 'terminalRejected');
    expect(rejectedIdx).toBeGreaterThan(-1);
    expect(steps[rejectedIdx].side).toBe('top');
    const gearIdx = steps.findIndex(x => x.pieceId === 'g');
    expect(jamOf(steps[gearIdx])).toBe('noExit');
    expect(gearIdx).toBeLessThan(rejectedIdx);
    // The record already ends on the rejection: no generic void step after it.
    expect(steps[steps.length - 1].type).toBe('terminalRejected');
  });

  test('[S3-4] traceBeam stops at a jammed Gear', () => {
    const straight = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 0),
      makePiece('c', 'conveyor', 2, 0),
      makePiece('t', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const a = traceBeam(straight);
    expect(a.entry.has('g')).toBe(true);
    expect(a.entry.has('c')).toBe(false);
    expect(a.edges.some(e => e.from === 'g')).toBe(false);

    const two = [
      makePiece('s', 'source', 0, 1, { isPrePlaced: true }),
      makePiece('g', 'gear', 1, 1),
      makePiece('up', 'gear', 1, 0),
      makePiece('down', 'gear', 1, 2),
    ];
    const b = traceBeam(two);
    expect(b.entry.has('up')).toBe(false);
    expect(b.entry.has('down')).toBe(false);
  });

  test("[S3-4] a Gear feeding a Merger's second input keeps its lit wire and the engine still delivers", () => {
    const pieces = [
      makePiece('s', 'source', 1, 1, { isPrePlaced: true }),
      makePiece('c1', 'conveyor', 2, 1, { rotation: 0 }),
      makePiece('gA', 'gear', 1, 0),
      makePiece('c2', 'conveyor', 2, 0, { rotation: 0 }),
      makePiece('gB', 'gear', 3, 0),
      makePiece('m', 'merger', 3, 1, { rotation: 0 }),
      makePiece('c3', 'conveyor', 4, 1, { rotation: 0 }),
      makePiece('t', 'terminal', 5, 1, { isPrePlaced: true }),
    ];
    const steps = run(pieces);
    expect(reached(steps)).toBe(true);
    const gearIdx = steps.findIndex(x => x.pieceId === 'gB');
    expect(gearIdx).toBeGreaterThanOrEqual(0);
    expect(steps[gearIdx].success).toBe(true);
    expect(steps[gearIdx + 1].pieceId).toBe('m');

    const { edges } = traceBeam(pieces);
    expect(edges).toContainEqual({ from: 'gB', to: 'm' });

    const kept = beamWires(pieces, autoConnectPhysicsPieces(pieces));
    expect(kept.some(w =>
      (w.fromPieceId === 'gB' && w.toPieceId === 'm') ||
      (w.fromPieceId === 'm' && w.toPieceId === 'gB'),
    )).toBe(true);
  });

  test('[S3-4] engine and traceBeam agree on every Gear decision across 5000 seeded physics-only boards', () => {
    // mulberry32: a small deterministic PRNG, so a failing seed replays exactly.
    const prng = (seed: number) => {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const W = 5;
    const H = 4;
    const POOL: PlacedPiece['type'][] = [
      'conveyor', 'conveyor', 'gear', 'gear', 'gear', 'merger', 'bridge', 'splitter',
    ];
    const ROTATIONS = [0, 90, 180, 270] as const;
    const NOT_VISITED = new Set(['void', 'terminalRejected', 'error']);

    const buildBoard = (seed: number): PlacedPiece[] => {
      const rand = prng(seed);
      const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
      const cells: [number, number][] = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push([x, y]);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      const extra = 4 + Math.floor(rand() * 10); // 4..13
      const pieces: PlacedPiece[] = [
        makePiece('src', 'source', cells[0][0], cells[0][1], {
          isPrePlaced: true, rotation: pick(ROTATIONS),
        }),
      ];
      for (let k = 1; k <= extra; k++) {
        const type = pick(POOL);
        pieces.push(makePiece(`${type}${k}`, type, cells[k][0], cells[k][1], {
          rotation: pick(ROTATIONS),
        }));
      }
      return computeSplitterMagnets(pieces);
    };

    let disagreements = 0;
    let firstFailingSeed: number | null = null;
    let gearStepsChecked = 0;
    for (let seed = 0; seed < 5000; seed++) {
      const board = buildBoard(seed);
      expect(board.some(p => p.type === 'terminal')).toBe(false);
      const steps = executeMachine(makeState(board.map(p => ({ ...p }))));
      const trace = traceBeam(board.map(p => ({ ...p })));

      const engineIds = new Set(steps.filter(s => !NOT_VISITED.has(s.type)).map(s => s.pieceId));
      const traceIds = new Set(trace.entry.keys());
      let ok = engineIds.size === traceIds.size && [...engineIds].every(id => traceIds.has(id));

      for (const step of steps) {
        if (step.type !== 'gear') continue;
        gearStepsChecked++;
        const outEdges = trace.edges.filter(e => e.from === step.pieceId).length;
        if (step.success ? outEdges !== 1 : outEdges !== 0) ok = false;
      }

      if (!ok) {
        disagreements++;
        if (firstFailingSeed === null) firstFailingSeed = seed;
      }
    }
    expect(gearStepsChecked).toBeGreaterThan(0);
    expect({ disagreements, firstFailingSeed }).toEqual({ disagreements: 0, firstFailingSeed: null });
  });

  test('[S3-5] GUARD non-Gear pieces route exactly as before on a Conveyor-only board', () => {
    const across = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('c1', 'conveyor', 1, 0),
      makePiece('c2', 'conveyor', 2, 0),
      makePiece('t', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    expect(run(across).map(x => `${x.pieceId}:${x.type}:${x.success}`)).toEqual([
      's:source:true', 'c1:conveyor:true', 'c2:conveyor:true', 't:terminal:true',
    ]);
    expect(Array.from(traceBeam(across).entry.entries())).toEqual([
      ['s', undefined], ['c1', 'left'], ['c2', 'left'], ['t', 'left'],
    ]);

    const down = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('d1', 'conveyor', 0, 1, { rotation: 90 }),
      makePiece('d2', 'conveyor', 0, 2, { rotation: 90 }),
      makePiece('t', 'terminal', 0, 3, { isPrePlaced: true }),
    ];
    expect(run(down).map(x => `${x.pieceId}:${x.type}:${x.success}`)).toEqual([
      's:source:true', 'd1:conveyor:true', 'd2:conveyor:true', 't:terminal:true',
    ]);
    expect(Array.from(traceBeam(down).entry.entries())).toEqual([
      ['s', undefined], ['d1', 'top'], ['d2', 'top'], ['t', 'top'],
    ]);
  });

  test('[S3-6] every shipped floor, alternate and threeStar solve still verifies', () => {
    const fresh = (level: LevelDefinition): PlacedPiece[] =>
      level.prePlacedPieces.map(p => ({
        ...p,
        ports: p.ports.map(port => ({ ...port })),
        storedValue: p.type === 'latch' ? null : p.storedValue,
        firedDuringRun: false,
      }));
    const failed: string[] = [];
    let checked = 0;
    for (const [id, solves] of Object.entries(FLOOR_SOLVES)) {
      const level = ALL_LEVELS.find(l => l.id === id)!;
      for (const kind of ['floor', 'alternate', 'threeStar'] as const) {
        const solve = solves[kind];
        if (!solve) continue;
        const all = computeSplitterMagnets([...fresh(level), ...solvePieces(solve)]);
        const board = { ...level, prePlacedPieces: all.filter(p => p.isPrePlaced) };
        const result = verifyPuzzle(board, all.filter(p => !p.isPrePlaced));
        checked++;
        if (!result.solvable) failed.push(`${id}/${kind}: ${result.failReason}`);
      }
    }
    expect(checked).toBe(43);
    expect(failed).toEqual([]);
  });
});
