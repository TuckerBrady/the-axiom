// AXM-026 — floor solves and alternate solves for every in-scope level.
// Spec: SPEC_SOURCE_TERMINAL_PLACEMENT v1.1, sections 7 and 9.3, pre-written
// cases from section 11 (bodies written here, assertions fixed by the spec).
//
// The live game recomputes Splitter magnets every time a piece is placed
// (gameStore.computeSplitterMagnets). verifyPuzzle does not, so each solve is
// run through that same step before it is verified: the fixture is checked
// against the board the Engineer would actually have built.

import { ALL_LEVELS, AXIOM_LEVELS, KEPLER_LEVELS } from '../../../src/game/levels';
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
  canSendTo,
  evaluateRequiredPieces,
  executeMachine,
} from '../../../src/game/engine';
import { verifyPuzzle, verifyPieceAvailability } from '../../../src/game/puzzleVerifier';
import { computeSplitterMagnets } from '../../../src/store/gameStore';
import { calculateScore } from '../../../src/game/scoring';
import { PIECE_PRICES } from '../../../src/game/piecePrices';
import { buildPieceTypesForLevel } from '../../../src/store/requisitionStore';
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

const DISCIPLINES = ['systems', 'drive', 'field'] as const;

// Scores a solve the way successHandlers.handleSuccess does: every pulse's
// steps, the whole board, the level's tray and depthCeiling. One total per
// discipline.
function scoresFor(l: LevelDefinition, solve: SolvePiece[]): number[] {
  const { level, player } = boardFor(l, solve);
  const { pulses, pieces } = runPulses(level, player);
  const steps = pulses.flat();
  return DISCIPLINES.map(discipline =>
    calculateScore({
      executionSteps: steps,
      placedPieces: pieces,
      optimalPieces: l.optimalPieces,
      trayPieceTypes: l.availablePieces,
      depthCeiling: l.depthCeiling,
      discipline,
    }).total);
}

// 7.10.3: the Codex state of an Engineer who has cleared every level before
// `levelId` in campaign order. Discovery happens through tutorial steps.
function discoveredBefore(levelId: string): string[] {
  const campaign = [...AXIOM_LEVELS, ...KEPLER_LEVELS];
  const ids = new Set<string>();
  for (const l of campaign) {
    if (l.id === levelId) break;
    for (const st of l.tutorialSteps ?? []) if (st.codexEntryId) ids.add(st.codexEntryId);
  }
  return Array.from(ids);
}

// Asserts 7.10.1 / 7.10.3 for one level's threeStar fixture.
function expectThreeStarReachable(id: string) {
  const l = ALL_LEVELS.find(x => x.id === id)!;
  const solve = solvesOf(id).threeStar!;
  expect({ id, hasThreeStar: !!solve }).toEqual({ id, hasThreeStar: true });

  const { level, player } = boardFor(l, solve);
  const result = verifyPuzzle(level, player);
  expect({ id, solvable: result.solvable, why: result.failReason })
    .toEqual({ id, solvable: true, why: undefined });

  // Which pieces are requisitioned: per type, everything beyond the tray count.
  const tray: Record<string, number> = {};
  for (const t of l.availablePieces) tray[t] = (tray[t] ?? 0) + 1;
  const used: Record<string, number> = {};
  for (const p of solve) used[p.type] = (used[p.type] ?? 0) + 1;
  const bought: Record<string, number> = {};
  for (const [t, n] of Object.entries(used)) if (n > (tray[t] ?? 0)) bought[t] = n - (tray[t] ?? 0);
  expect({ id, buysSomething: Object.keys(bought).length > 0 }).toEqual({ id, buysSomething: true });

  // 7.10.3: every piece on the board is active, so the whole tray allotment of
  // each bought type, and every bought piece, fired.
  const { pieces } = runPulses(level, player);
  const idle = pieces.filter(p => !p.isPrePlaced && p.firedDuringRun !== true).map(p => `${p.type}@${p.gridX},${p.gridY}`);
  expect({ id, idle }).toEqual({ id, idle: [] });

  // Score: at least 80 for at least one discipline.
  const best = Math.max(...scoresFor(l, solve));
  expect({ id, best, threeStars: best >= 80 }).toEqual({ id, best, threeStars: true });

  // Cost at REQUISITION base price (no discipline discount) within creditBudget.
  const cost = Object.entries(bought).reduce((sum, [t, n]) => sum + (PIECE_PRICES[t as SolvePiece['type']] ?? 0) * n, 0);
  expect({ id, cost, creditBudget: l.creditBudget, fits: cost <= (l.creditBudget ?? 0) })
    .toEqual({ id, cost, creditBudget: l.creditBudget, fits: true });

  // 7.10.3: each bought type is on offer in the REQUISITION store to an
  // Engineer who has cleared every earlier level, dev tools off.
  const offered = buildPieceTypesForLevel(l, discoveredBefore(id), false);
  expect({ id, bought: Object.keys(bought).sort(), offered: Object.keys(bought).filter(t => offered.includes(t as SolvePiece['type'])).sort() })
    .toEqual({ id, bought: Object.keys(bought).sort(), offered: Object.keys(bought).sort() });
}

const key = (x: number, y: number) => `${x},${y}`;

// T-Bot ruling on #67: a repair puzzle must require its repair pieces. With
// one pre-placed piece's cell closed (every other pre-placed piece left
// passable), no open-cell route may join Source to Terminal.
function routeExistsWithout(l: LevelDefinition, closed: PlacedPiece): boolean {
  const s = l.prePlacedPieces.find(p => p.type === 'source')!;
  const t = l.prePlacedPieces.find(p => p.type === 'terminal')!;
  const blocked = new Set<string>([key(closed.gridX, closed.gridY)]);
  for (const c of l.damagedCells ?? []) blocked.add(key(c.gridX, c.gridY));
  for (const p of l.prePlacedPieces) if (p.type === 'obstacle') blocked.add(key(p.gridX, p.gridY));
  const seen = new Set<string>([key(s.gridX, s.gridY)]);
  const queue: Array<[number, number]> = [[s.gridX, s.gridY]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    if (x === t.gridX && y === t.gridY) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= l.gridWidth || ny >= l.gridHeight) continue;
      const k = key(nx, ny);
      if (seen.has(k) || blocked.has(k)) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return false;
}

// 7.13's exhaustive list of pre-placed infrastructure that MAY move (7.13.1).
const MAY_MOVE: Record<string, string[]> = {
  'K1-3': ['latch'],
  'K1-5': ['splitter'],
  'K1-7': ['bridge', 'splitter'],
};

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

  it('[7.6.1] where depthCeiling is declared, depthCeiling - optimalPieces equals the master margin', () => {
    for (const l of inScope) {
      if (l.depthCeiling === undefined) continue;
      const m = snapshot[l.id] as { depthCeiling?: number; optimalPieces: number };
      expect({ id: l.id, margin: l.depthCeiling - l.optimalPieces })
        .toEqual({ id: l.id, margin: (m.depthCeiling ?? 0) - m.optimalPieces });
    }
  });

  it('[7.8] GUARD: budget and creditBudget deep-equal the master snapshot on every level', () => {
    for (const l of ALL_LEVELS) {
      const m = snapshot[l.id];
      expect({ id: l.id, budget: l.budget, creditBudget: l.creditBudget })
        .toEqual({ id: l.id, budget: m.budget, creditBudget: m.creditBudget });
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

  it('[7.10] the floor solve scores 45 or less for every discipline (DEC-1 positive control)', () => {
    for (const l of inScope) {
      const scores = scoresFor(l, solvesOf(l.id).floor);
      expect({ id: l.id, atMost45: scores.every(t => t <= 45), scores })
        .toEqual({ id: l.id, atMost45: true, scores });
    }
  });

  it('[7.10.1] K1-10: the threeStar fixture solves, buys legally, scores >= 80 and fits creditBudget', () => {
    expect(ALL_LEVELS.find(x => x.id === 'K1-10')!.consequence?.requireThreeStars).toBe(true);
    expectThreeStarReachable('K1-10');
  });

  it('[7.10.2] every other Kepler-or-later level with a threeStar fixture meets the same bar', () => {
    for (const l of inScope.filter(x => x.sector !== 'axiom' && x.id !== 'K1-10' && !!solvesOf(x.id).threeStar)) {
      expectThreeStarReachable(l.id);
    }
  });

  it('[7.13.1] pre-placed pieces off the 7.13 list stay on their master cell and both solves fire them', () => {
    for (const l of inScope) {
      const master = (snapshot[l.id] as { prePlacedPieces: Array<{ type: string; gridX: number; gridY: number }> }).prePlacedPieces;
      const pinned = l.prePlacedPieces.filter(p =>
        p.type !== 'source' && p.type !== 'terminal' && p.type !== 'obstacle'
        && !(MAY_MOVE[l.id] ?? []).includes(p.type));
      for (const p of pinned) {
        const onMasterCell = master.some(m => m.type === p.type && m.gridX === p.gridX && m.gridY === p.gridY);
        expect({ id: l.id, piece: `${p.type}@${p.gridX},${p.gridY}`, onMasterCell })
          .toEqual({ id: l.id, piece: `${p.type}@${p.gridX},${p.gridY}`, onMasterCell: true });
        for (const [name, solve] of [['floor', solvesOf(l.id).floor], ['alternate', solvesOf(l.id).alternate]] as const) {
          const { level, player } = boardFor(l, solve);
          const { pulses } = runPulses(level, player);
          const fired = pulses.some(steps => steps.some(st => st.pieceId === p.id && st.success));
          expect({ id: l.id, solve: name, piece: `${p.type}@${p.gridX},${p.gridY}`, fired })
            .toEqual({ id: l.id, solve: name, piece: `${p.type}@${p.gridX},${p.gridY}`, fired: true });
        }
      }
    }
  });

  it('T-Bot ruling (#67): no route around a repair puzzle\'s pre-placed repair pieces', () => {
    for (const id of ['REPAIR-PROP-SURGE', 'REPAIR-HYPERDRIVE']) {
      const l = ALL_LEVELS.find(x => x.id === id)!;
      const repairPieces = l.prePlacedPieces.filter(p => !['source', 'terminal', 'obstacle'].includes(p.type));
      expect(repairPieces.length).toBeGreaterThan(0);
      for (const p of repairPieces) {
        expect({ id, piece: `${p.type}@${p.gridX},${p.gridY}`, bypass: routeExistsWithout(l, p) })
          .toEqual({ id, piece: `${p.type}@${p.gridX},${p.gridY}`, bypass: false });
      }
    }
  });

  it('T-Bot ruling (#67, 7.13): the K1-7 floor solve feeds the Bridge on both of its inputs', () => {
    const l = ALL_LEVELS.find(x => x.id === 'K1-7')!;
    const { level, player } = boardFor(l, solvesOf('K1-7').floor);
    const { pulses, pieces } = runPulses(level, player);
    const bridgePiece = pieces.find(p => p.type === 'bridge')!;
    const fired = new Set(pulses.flat().filter(st => st.success).map(st => st.pieceId));
    const feeders = pieces.filter(p => p.id !== bridgePiece.id && fired.has(p.id)
      && Math.abs(p.gridX - bridgePiece.gridX) + Math.abs(p.gridY - bridgePiece.gridY) === 1
      && canSendTo(p, bridgePiece));
    expect(feeders.map(p => sideOf(p, bridgePiece)).sort()).toEqual(['left', 'top']);
  });

  it('[7.14] every Axiom tray type is introduced by the tutorial of this level or an earlier one', () => {
    const introduced = new Set<string>();
    for (const l of AXIOM_LEVELS) {
      for (const st of l.tutorialSteps ?? []) if (st.codexEntryId) introduced.add(st.codexEntryId);
      const untaught = Array.from(new Set(l.availablePieces)).filter(t => !introduced.has(t));
      expect({ id: l.id, untaught }).toEqual({ id: l.id, untaught: [] });
    }
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
