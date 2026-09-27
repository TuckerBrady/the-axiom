// AXM-026 — Source and Terminal on opposite corners.
// Spec: SPEC_SOURCE_TERMINAL_PLACEMENT v1.1, section 11.
// The first describe block is the spec's pre-written test, landed verbatim.
// The second block carries the "further cases" (bodies written here, the
// assertions fixed by the spec).

import { ALL_LEVELS } from '../../../src/game/levels';
import type { LevelDefinition, PlacedPiece } from '../../../src/game/types';
import { canSendTo, getDefaultPorts } from '../../../src/game/engine';

type Cell = { x: number; y: number };
const EXEMPT_LIST: string[] = []; // v1.1: Tucker ruled no exemptions (Q1, 2026-09-26)

const corners = (l: LevelDefinition): Cell[] => [
  { x: 0, y: 0 }, { x: l.gridWidth - 1, y: 0 },
  { x: 0, y: l.gridHeight - 1 }, { x: l.gridWidth - 1, y: l.gridHeight - 1 },
];
const opposite = (l: LevelDefinition, c: Cell): Cell =>
  ({ x: l.gridWidth - 1 - c.x, y: l.gridHeight - 1 - c.y });
const dist = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const at = (p: PlacedPiece): Cell => ({ x: p.gridX, y: p.gridY });
const find = (l: LevelDefinition, t: string) => l.prePlacedPieces.find(p => p.type === t)!;
const inScope = ALL_LEVELS.filter(l => !l.placementExemption);

describe('AXM-026 placement', () => {
  it('[3.3] placementExemption appears only on the approved list, with a reason', () => {
    for (const l of ALL_LEVELS) {
      if (l.placementExemption !== undefined) {
        expect(EXEMPT_LIST).toContain(l.id);
        expect(l.placementExemption.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('[3.1] every level outside the approved list is in scope', () => {
    for (const l of ALL_LEVELS) {
      if (!EXEMPT_LIST.includes(l.id)) expect(l.placementExemption).toBeUndefined();
    }
  });

  it('[2.1] Source and Terminal sit in diagonally opposite corner zones', () => {
    for (const l of inScope) {
      const s = at(find(l, 'source'));
      const t = at(find(l, 'terminal'));
      const sc = corners(l).find(c => dist(c, s) <= 1);
      expect({ id: l.id, sourceInZone: !!sc }).toEqual({ id: l.id, sourceInZone: true });
      expect({ id: l.id, terminalOpposite: dist(opposite(l, sc!), t) <= 1 })
        .toEqual({ id: l.id, terminalOpposite: true });
    }
  });

  it('[2.4] distance ratio is at least (D-2)/D', () => {
    for (const l of inScope) {
      const D = (l.gridWidth - 1) + (l.gridHeight - 1);
      const d = dist(at(find(l, 'source')), at(find(l, 'terminal')));
      expect(d).toBeGreaterThanOrEqual(D - 2);
    }
  });

  it('[2.5] GUARD: grid dimensions unchanged', () => {
    const expected: Record<string, [number, number]> = {
      'A1-1': [8, 8], 'A1-2': [8, 7], 'A1-3': [9, 8], 'A1-4': [9, 7], 'A1-5': [9, 7],
      'A1-6': [10, 7], 'A1-7': [10, 7], 'A1-8': [11, 9],
      'K1-1': [8, 6], 'K1-2': [9, 6], 'K1-3': [10, 7], 'K1-4': [10, 7], 'K1-5': [10, 8],
      'K1-6': [11, 8], 'K1-7': [10, 8], 'K1-8': [11, 8], 'K1-9': [11, 9], 'K1-10': [12, 9],
      'REPAIR-PROP-SURGE': [9, 6], 'REPAIR-HYPERDRIVE': [9, 7], 'NF-1': [9, 7],
    };
    for (const [id, [w, h]] of Object.entries(expected)) {
      const l = ALL_LEVELS.find(x => x.id === id)!;
      expect([l.gridWidth, l.gridHeight]).toEqual([w, h]);
    }
  });
});

// ─── Further cases (spec section 11: bodies to Nash, assertions fixed) ────────

const key = (x: number, y: number) => `${x},${y}`;
const STEPS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const isCornerCell = (l: LevelDefinition, c: Cell) =>
  corners(l).some(k => k.x === c.x && k.y === c.y);

// Clause 1.6. `needed` says which way signal has to cross the edge between the
// fixture (Source or Terminal) and the neighbour: a pre-placed neighbour only
// counts as open when it can exchange signal in that direction.
function openNeighbours(
  l: LevelDefinition,
  fixture: PlacedPiece,
  needed: 'fromFixture' | 'intoFixture',
): Cell[] {
  const damaged = new Set((l.damagedCells ?? []).map(c => key(c.gridX, c.gridY)));
  const out: Cell[] = [];
  for (const [dx, dy] of STEPS) {
    const x = fixture.gridX + dx;
    const y = fixture.gridY + dy;
    if (x < 0 || y < 0 || x >= l.gridWidth || y >= l.gridHeight) continue;
    if (damaged.has(key(x, y))) continue;
    const occupant = l.prePlacedPieces.find(p => p.gridX === x && p.gridY === y);
    if (occupant) {
      if (occupant.type === 'obstacle') continue;
      const exchanges = needed === 'fromFixture'
        ? canSendTo(fixture, occupant)
        : canSendTo(occupant, fixture);
      if (!exchanges) continue;
    }
    out.push({ x, y });
  }
  return out;
}

function inGridNeighbourCount(l: LevelDefinition, c: Cell): number {
  return STEPS.filter(([dx, dy]) => {
    const x = c.x + dx;
    const y = c.y + dy;
    return x >= 0 && y >= 0 && x < l.gridWidth && y < l.gridHeight;
  }).length;
}

// Clause 5.1: cells a player route may use on the empty board. Pre-placed
// pieces, obstacles and damaged cells are not open (clause 1.6).
function openCellSet(l: LevelDefinition): Set<string> {
  const blocked = new Set<string>();
  for (const c of l.damagedCells ?? []) blocked.add(key(c.gridX, c.gridY));
  for (const p of l.prePlacedPieces) {
    if (p.type !== 'source' && p.type !== 'terminal') blocked.add(key(p.gridX, p.gridY));
  }
  const open = new Set<string>();
  for (let x = 0; x < l.gridWidth; x++) {
    for (let y = 0; y < l.gridHeight; y++) {
      if (!blocked.has(key(x, y))) open.add(key(x, y));
    }
  }
  return open;
}

// Fewest direction changes on any Source-to-Terminal route through open cells.
// 0-1 BFS over (cell, heading). Returns Infinity when no route exists.
function minDirectionChanges(l: LevelDefinition): number {
  const s = at(find(l, 'source'));
  const t = at(find(l, 'terminal'));
  const open = openCellSet(l);
  const best = new Map<string, number>();
  const deque: Array<{ x: number; y: number; dir: number; turns: number }> = [];
  STEPS.forEach(([dx, dy], dir) => {
    const x = s.x + dx;
    const y = s.y + dy;
    if (!open.has(key(x, y))) return;
    deque.push({ x, y, dir, turns: 0 });
  });
  let answer = Infinity;
  while (deque.length > 0) {
    const cur = deque.shift()!;
    const stateKey = `${cur.x},${cur.y},${cur.dir}`;
    if ((best.get(stateKey) ?? Infinity) <= cur.turns) continue;
    best.set(stateKey, cur.turns);
    if (cur.x === t.x && cur.y === t.y) {
      answer = Math.min(answer, cur.turns);
      continue;
    }
    STEPS.forEach(([dx, dy], dir) => {
      const x = cur.x + dx;
      const y = cur.y + dy;
      if (!open.has(key(x, y))) return;
      const turns = cur.turns + (dir === cur.dir ? 0 : 1);
      if (dir === cur.dir) deque.unshift({ x, y, dir, turns });
      else deque.push({ x, y, dir, turns });
    });
  }
  return answer;
}

function makeFixture(type: 'source' | 'terminal', x: number, y: number): PlacedPiece {
  return {
    id: `synthetic-${type}`, type, category: 'physics', gridX: x, gridY: y,
    ports: getDefaultPorts(type), rotation: 0, isPrePlaced: true,
  };
}

describe('AXM-026 placement — access and content', () => {
  it('[4.1] every in-scope Source has at least 2 open neighbours; a corner Source has exactly 2, both open', () => {
    for (const l of inScope) {
      const s = find(l, 'source');
      const open = openNeighbours(l, s, 'fromFixture');
      expect({ id: l.id, open: open.length >= 2 }).toEqual({ id: l.id, open: true });
      if (isCornerCell(l, at(s))) {
        expect({ id: l.id, neighbours: inGridNeighbourCount(l, at(s)), open: open.length })
          .toEqual({ id: l.id, neighbours: 2, open: 2 });
      }
    }
  });

  it('[4.2] every in-scope omnidirectional Terminal has at least 2 open neighbours; a corner Terminal: both', () => {
    for (const l of inScope) {
      const t = find(l, 'terminal');
      // A directional Terminal (SPEC_DIRECTIONAL_TERMINAL) is governed by its
      // clause 8.5 instead (clause 4.3 here). None exists on master yet.
      if ((t as PlacedPiece & { entrySide?: string }).entrySide !== undefined) continue;
      const open = openNeighbours(l, t, 'intoFixture');
      expect({ id: l.id, open: open.length >= 2 }).toEqual({ id: l.id, open: true });
      if (isCornerCell(l, at(t))) {
        expect({ id: l.id, neighbours: inGridNeighbourCount(l, at(t)), open: open.length })
          .toEqual({ id: l.id, neighbours: 2, open: 2 });
      }
    }
  });

  it('[5.1] positive control: an open 8x6 board with Source (1,0) and Terminal (6,5) is flagged', () => {
    const synthetic = {
      ...ALL_LEVELS.find(x => x.id === 'K1-1')!,
      id: 'SYNTHETIC-8x6',
      gridWidth: 8,
      gridHeight: 6,
      damagedCells: [],
      prePlacedPieces: [makeFixture('source', 1, 0), makeFixture('terminal', 6, 5)],
    } as LevelDefinition;
    expect(minDirectionChanges(synthetic)).toBeLessThanOrEqual(1);
  });

  it('[5.1] no in-scope Kepler-or-later level admits a Source-to-Terminal route with at most 1 direction change', () => {
    for (const l of inScope.filter(x => x.sector !== 'axiom')) {
      const changes = minDirectionChanges(l);
      expect({ id: l.id, atMostOne: changes <= 1 }).toEqual({ id: l.id, atMostOne: false });
    }
  });

  it('[5.3] Axiom levels (A1-6, A1-7, A1-8 included) are not subject to [5.1]', () => {
    const subject = inScope.filter(x => x.sector !== 'axiom').map(x => x.id);
    for (const id of ['A1-1', 'A1-2', 'A1-3', 'A1-4', 'A1-5', 'A1-6', 'A1-7', 'A1-8']) {
      expect(subject).not.toContain(id);
    }
  });
});
