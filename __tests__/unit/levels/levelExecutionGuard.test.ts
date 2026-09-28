// GUARD — SPEC_DIRECTIONAL_TERMINAL v1.0 clauses [0.2] and [10.2] (AXM-029 PR 1).
//
// Every level on master before PR 1 must produce identical execution steps
// after it. The repo keeps no per-level floor-solve fixture, so this guard
// derives a deterministic routing solve for every level and pins its steps in
// a Jest snapshot. The snapshot was recorded against the unmodified engine
// (origin/master f6dfbe1) before any PR 1 engine change, so a diff here means
// PR 1 changed how an existing level executes.
//
// Per level, three machines, each run for every pulse of the level's tape on
// one shared state (as gameStore / puzzleVerifier.runSolution do):
//   - prePlacedOnly: the board as the level ships it.
//   - conveyorRoute: shortest free-cell path Source -> Terminal, Conveyors on
//     straights and Gears on turns (the classic routing floor solve).
//   - gearRoute: the same path laid entirely in Gears (since SWEEP-B51 S3 a
//     Gear leaves through exactly one perpendicular side, so straight runs of
//     Gears jam; the snapshot records where each route now stops).
import type {
  LevelDefinition, PlacedPiece, MachineState, OutputTapeValue, PortSide,
} from '../../../src/game/types';
import { BLANK } from '../../../src/game/types';
import { ALL_LEVELS } from '../../../src/game/levels';
import { executeMachine, autoConnectPhysicsPieces, getDefaultPorts } from '../../../src/game/engine';
import { computeSplitterMagnets } from '../../../src/store/gameStore';

const DIRS: { side: PortSide; dx: number; dy: number; rotation: number }[] = [
  { side: 'right', dx: 1, dy: 0, rotation: 0 },
  { side: 'bottom', dx: 0, dy: 1, rotation: 90 },
  { side: 'left', dx: -1, dy: 0, rotation: 180 },
  { side: 'top', dx: 0, dy: -1, rotation: 270 },
];

type Cell = { x: number; y: number };

// AXM-026: `throughInfrastructure` lets the route pass through pre-placed
// non-obstacle pieces. Used only as a fallback for a level with no free-cell
// route at all: the repair puzzles, walled off so every route runs through
// their repair pieces (T-Bot ruling on PR #67). Every other level still takes
// the free-cell route, exactly as before.
function shortestPath(level: LevelDefinition, throughInfrastructure = false): Cell[] | null {
  const source = level.prePlacedPieces.find(p => p.type === 'source');
  const terminal = level.prePlacedPieces.find(p => p.type === 'terminal');
  if (!source || !terminal) return null;
  const key = (x: number, y: number) => `${x},${y}`;
  const blocked = new Set<string>([
    ...level.prePlacedPieces
      .filter(p => !throughInfrastructure || p.type === 'obstacle')
      .map(p => key(p.gridX, p.gridY)),
    ...(level.damagedCells ?? []).map(d => key(d.gridX, d.gridY)),
  ]);
  const goal = key(terminal.gridX, terminal.gridY);
  const prev = new Map<string, string | null>([[key(source.gridX, source.gridY), null]]);
  const queue: Cell[] = [{ x: source.gridX, y: source.gridY }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const d of DIRS) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      const k = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= level.gridWidth || ny >= level.gridHeight) continue;
      if (prev.has(k)) continue;
      if (k !== goal && blocked.has(k)) continue;
      prev.set(k, key(cur.x, cur.y));
      if (k === goal) {
        const cells: Cell[] = [];
        for (let at: string | null = k; at !== null; at = prev.get(at) ?? null) {
          const [x, y] = at.split(',').map(Number);
          cells.unshift({ x, y });
        }
        return cells;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function routeFor(level: LevelDefinition): Cell[] | null {
  return shortestPath(level) ?? shortestPath(level, true);
}

function dirBetween(a: Cell, b: Cell) {
  return DIRS.find(d => d.dx === b.x - a.x && d.dy === b.y - a.y)!;
}

function routeSolve(level: LevelDefinition, path: Cell[], style: 'conveyor' | 'gear'): PlacedPiece[] {
  const pieces: PlacedPiece[] = [];
  // path[0] is the Source cell, path[last] the Terminal cell.
  for (let i = 1; i < path.length - 1; i++) {
    // AXM-026: a fallback route crosses pre-placed pieces; leave those cells be.
    if (level.prePlacedPieces.some(p => p.gridX === path[i].x && p.gridY === path[i].y)) continue;
    const inDir = dirBetween(path[i - 1], path[i]);
    const outDir = dirBetween(path[i], path[i + 1]);
    const type = style === 'conveyor' && inDir === outDir ? 'conveyor' : 'gear';
    pieces.push({
      id: `guard-${style}-${i}`,
      type,
      category: 'physics',
      gridX: path[i].x,
      gridY: path[i].y,
      ports: getDefaultPorts(type),
      rotation: type === 'conveyor' ? outDir.rotation : 0,
      isPrePlaced: false,
    });
  }
  return pieces;
}

function runAllPulses(level: LevelDefinition, solution: PlacedPiece[]) {
  // Fresh copies: executeMachine mutates per-run piece state (firedDuringRun,
  // Latch storedValue, Counter count).
  const pieces = computeSplitterMagnets([
    ...level.prePlacedPieces.map(p => ({ ...p, ports: p.ports.map(port => ({ ...port })) })),
    ...solution,
  ]);
  const pulseCount = level.inputTape && level.inputTape.length > 0 ? level.inputTape.length : 1;
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
  const pulses = Array.from({ length: pulseCount }, (_, i) =>
    executeMachine(state, i).map(s => ({
      pieceId: s.pieceId,
      type: s.type,
      success: s.success,
      message: s.message,
    })),
  );
  return { pulses, outputTape: state.outputTape, dataTrail: state.dataTrail.cells };
}

describe('[10.2] GUARD: existing levels execute identically', () => {
  it('covers every level with a routable Source -> Terminal path', () => {
    for (const level of ALL_LEVELS) {
      expect({ level: level.id, routable: routeFor(level) !== null })
        .toEqual({ level: level.id, routable: true });
    }
  });

  for (const level of ALL_LEVELS) {
    it(`${level.id}: execution steps match the pre-PR-1 baseline`, () => {
      const path = routeFor(level)!;
      const conveyorRoute = routeSolve(level, path, 'conveyor');
      const gearRoute = routeSolve(level, path, 'gear');
      const record = {
        prePlacedOnly: runAllPulses(level, []),
        conveyorRoute: runAllPulses(level, conveyorRoute),
        gearRoute: runAllPulses(level, gearRoute),
      };
      // The routing solve must actually reach the Terminal on some pulse, or
      // it guards nothing about Terminal acceptance.
      const reachesTerminal = (r: typeof record.conveyorRoute) =>
        r.pulses.some(p => p.some(s => s.type === 'terminal' && s.success));
      expect(reachesTerminal(record.gearRoute) || reachesTerminal(record.conveyorRoute)).toBe(true);
      expect(record).toMatchSnapshot();
    });
  }
});
