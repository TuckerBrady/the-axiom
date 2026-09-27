// AXM-036 P13 (R-13.1..R-13.4) — honest wires: WireOverlay draws only the
// wires whose two pieces are joined by a real beam path, found by
// traceBeam. Direction is ignored.
//
// beamWires lives in a NEW module, src/game/beamWires.ts (v1.5, R-13.4), so
// beamTrace.ts stays byte-identical and the merged P12 guard
// (`[P12-1] endpointSockets.ts and beamTrace.ts do not reference wires`)
// keeps passing unmodified.

import * as fs from 'fs';
import * as path from 'path';
import type { MachineState, PlacedPiece, Wire } from '../../../src/game/types';
import { prePlaced } from '../../../src/game/levels';
import { levelA1_1, levelA1_2, levelA1_3, levelA1_4 } from '../../../src/game/levels';
import {
  autoConnectPhysicsPieces,
  executeMachine,
  getDefaultPorts,
} from '../../../src/game/engine';
import { getEndpointSocketSides as getEndpointSocketSidesDirect } from '../../../src/game/endpointSockets';
import { beamWires } from '../../../src/game/beamWires';
import { traceBeam } from '../../../src/game/beamTrace';
import { FLOOR_SOLVES, solvePieces } from '../../fixtures/floorSolves';

function findByType(pieces: PlacedPiece[], type: PlacedPiece['type']): PlacedPiece {
  const p = pieces.find(pp => pp.type === type);
  if (!p) throw new Error(`no ${type} in board`);
  return p;
}

function makeState(pieces: PlacedPiece[], overrides?: Partial<MachineState>): MachineState {
  return {
    pieces,
    wires: autoConnectPhysicsPieces(pieces),
    dataTrail: { cells: [], headPosition: 0 },
    configuration: 0,
    isRunning: false,
    signalPath: [],
    currentSignalStep: 0,
    status: 'idle',
    ...overrides,
  };
}

function wirePair(w: Wire): [string, string] {
  return [w.fromPieceId, w.toPieceId];
}

describe('[P13-1] FND-2 board: the Config Node to Terminal side wire is dropped', () => {
  it('keeps the beam-path wires and omits the Config Node to Terminal wire', () => {
    const source = prePlaced('source', 0, 1);
    const conv1: PlacedPiece = { id: 'c1', type: 'conveyor', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const conv2: PlacedPiece = { id: 'c2', type: 'conveyor', category: 'physics', gridX: 2, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const cfg: PlacedPiece = { id: 'cfg', type: 'configNode', category: 'protocol', gridX: 3, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0, configValue: 1 };
    const conv3: PlacedPiece = { id: 'c3', type: 'conveyor', category: 'physics', gridX: 4, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const terminal = prePlaced('terminal', 3, 2);
    const pieces = [source, conv1, conv2, cfg, conv3, terminal];

    const wires = autoConnectPhysicsPieces(pieces);
    const cfgToTerminal = wires.some(
      w => (w.fromPieceId === cfg.id && w.toPieceId === terminal.id) ||
        (w.fromPieceId === terminal.id && w.toPieceId === cfg.id),
    );
    expect(cfgToTerminal).toBe(true);

    const kept = beamWires(pieces, wires);
    const keptCfgToTerminal = kept.some(
      w => (w.fromPieceId === cfg.id && w.toPieceId === terminal.id) ||
        (w.fromPieceId === terminal.id && w.toPieceId === cfg.id),
    );
    expect(keptCfgToTerminal).toBe(false);

    const expectPairKept = (aId: string, bId: string) => {
      const found = kept.some(
        w => (w.fromPieceId === aId && w.toPieceId === bId) ||
          (w.fromPieceId === bId && w.toPieceId === aId),
      );
      expect(found).toBe(true);
    };
    expectPairKept(source.id, conv1.id);
    expectPairKept(conv1.id, conv2.id);
    expectPairKept(conv2.id, cfg.id);
    expectPairKept(cfg.id, conv3.id);
  });
});

describe('[P13-1] unreached chain: no wires until it joins the Source', () => {
  it('gives [] before joining, keeps every wire on the path after', () => {
    const source = prePlaced('source', 0, 1);
    const terminal = prePlaced('terminal', 7, 6);
    const conv: PlacedPiece = { id: 'conv', type: 'conveyor', category: 'physics', gridX: 6, gridY: 6, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const pieces = [source, terminal, conv];
    const wires = autoConnectPhysicsPieces(pieces);
    expect(beamWires(pieces, wires)).toEqual([]);

    // Connect the run: Source (0,1) into a Gear at (1,1) (a Conveyor cannot
    // corner — its input and output ports are always opposite sides; a Gear
    // accepts and emits on every side). The Gear turns the signal south down
    // column 1 to (1,5) via conveyors, a second Gear at (1,6) turns it east,
    // conveyors carry it along row 6 to (5,6), and the existing `conv` at
    // (6,6) (rotation 0: accepts from the left, exactly the direction this
    // run approaches from) carries it into the Terminal (7,6).
    const path: PlacedPiece[] = [
      { id: 'gear-turn-1', type: 'gear', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 },
    ];
    for (let y = 2; y <= 5; y++) {
      path.push({ id: `p-1-${y}`, type: 'conveyor', category: 'physics', gridX: 1, gridY: y, ports: getDefaultPorts('placeholder' as never), rotation: 90 });
    }
    path.push({ id: 'gear-turn-2', type: 'gear', category: 'physics', gridX: 1, gridY: 6, ports: getDefaultPorts('placeholder' as never), rotation: 0 });
    for (let x = 2; x <= 5; x++) {
      path.push({ id: `p-${x}-6`, type: 'conveyor', category: 'physics', gridX: x, gridY: 6, ports: getDefaultPorts('placeholder' as never), rotation: 0 });
    }
    const fullPieces = [source, terminal, conv, ...path];
    const fullWires = autoConnectPhysicsPieces(fullPieces);
    const state = makeState(fullPieces, { wires: fullWires });
    const steps = executeMachine(state, 0);
    const reached = steps.some(s => s.pieceId === terminal.id && s.type !== 'terminalRejected');
    expect(reached).toBe(true);

    const kept = beamWires(fullPieces, fullWires);
    const { edges } = traceBeam(fullPieces);
    for (const edge of edges) {
      const onPath = kept.some(
        w => (w.fromPieceId === edge.from && w.toPieceId === edge.to) ||
          (w.fromPieceId === edge.to && w.toPieceId === edge.from),
      );
      expect(onPath).toBe(true);
    }
  });
});

describe('[P13-1] direction-agnostic', () => {
  it('keeps the Gear-Gear wire even though autoConnect stores it against the beam', () => {
    const source = prePlaced('source', 0, 1);
    const gearB: PlacedPiece = { id: 'gearB', type: 'gear', category: 'physics', gridX: 2, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const gearA: PlacedPiece = { id: 'gearA', type: 'gear', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const terminal = prePlaced('terminal', 3, 1);
    // Pieces listed in the order [Source (0,1), Gear (2,1), Gear (1,1), Terminal (3,1)].
    const pieces = [source, gearB, gearA, terminal];

    const wires = autoConnectPhysicsPieces(pieces);
    const gearWire = wires.find(
      w => (w.fromPieceId === gearA.id && w.toPieceId === gearB.id) ||
        (w.fromPieceId === gearB.id && w.toPieceId === gearA.id),
    );
    expect(gearWire).toBeDefined();
    // Precondition: autoConnect stores it (2,1) -> (1,1), against the beam
    // direction, which goes (1,1) -> (2,1).
    expect(gearWire!.fromPieceId).toBe(gearB.id);
    expect(gearWire!.toPieceId).toBe(gearA.id);

    const kept = beamWires(pieces, wires);
    const keptGearWire = kept.some(
      w => (w.fromPieceId === gearA.id && w.toPieceId === gearB.id) ||
        (w.fromPieceId === gearB.id && w.toPieceId === gearA.id),
    );
    expect(keptGearWire).toBe(true);
  });
});

describe('[P13-1] every floor and alternate solve', () => {
  const cases: Array<{ level: typeof levelA1_1; key: string }> = [
    { level: levelA1_1, key: 'A1-1' },
    { level: levelA1_2, key: 'A1-2' },
    { level: levelA1_3, key: 'A1-3' },
    { level: levelA1_4, key: 'A1-4' },
  ];

  for (const { level, key } of cases) {
    for (const variant of ['floor', 'alternate'] as const) {
      it(`${key} ${variant}`, () => {
        const solve = FLOOR_SOLVES[key][variant];
        const pieces = [...level.prePlacedPieces, ...solvePieces(solve)];
        const wires = autoConnectPhysicsPieces(pieces);
        const kept = beamWires(pieces, wires);

        // The kept set is a subset of autoConnectPhysicsPieces.
        for (const w of kept) {
          expect(wires).toContain(w);
        }

        // Kept pairs equal the set of unordered pairs of traceBeam edges
        // whose pieces are adjacent and wired.
        const { edges } = traceBeam(pieces);
        const byId = new Map(pieces.map(p => [p.id, p] as const));
        const expectedPairs = new Set<string>();
        for (const edge of edges) {
          const a = byId.get(edge.from);
          const b = byId.get(edge.to);
          if (!a || !b) continue;
          const adjacent = Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY) === 1;
          if (!adjacent) continue;
          const isWired = wires.some(
            w => (w.fromPieceId === edge.from && w.toPieceId === edge.to) ||
              (w.fromPieceId === edge.to && w.toPieceId === edge.from),
          );
          if (!isWired) continue;
          expectedPairs.add([edge.from, edge.to].sort().join('::'));
        }
        const keptPairs = new Set(kept.map(w => [w.fromPieceId, w.toPieceId].sort().join('::')));
        expect(keptPairs).toEqual(expectedPairs);
      });
    }
  }
});

describe('[P13-1] sockets agree with wires', () => {
  it('every kept wire incident to a Source or Terminal lies on a socket/outlet side', () => {
    const boards = [
      { level: levelA1_1, key: 'A1-1', variant: 'floor' as const },
      { level: levelA1_1, key: 'A1-1', variant: 'alternate' as const },
      { level: levelA1_2, key: 'A1-2', variant: 'floor' as const },
      { level: levelA1_3, key: 'A1-3', variant: 'floor' as const },
      { level: levelA1_4, key: 'A1-4', variant: 'floor' as const },
    ];
    for (const { level, key, variant } of boards) {
      const pieces = [...level.prePlacedPieces, ...solvePieces(FLOOR_SOLVES[key][variant])];
      const wires = autoConnectPhysicsPieces(pieces);
      const kept = beamWires(pieces, wires);
      const sockets = getEndpointSocketSidesDirect(pieces);
      const byId = new Map(pieces.map(p => [p.id, p] as const));

      for (const w of kept) {
        for (const [selfId, otherId] of [wirePair(w), [w.toPieceId, w.fromPieceId] as [string, string]]) {
          const piece = byId.get(selfId);
          if (!piece || (piece.type !== 'source' && piece.type !== 'terminal')) continue;
          const other = byId.get(otherId);
          if (!other) continue;
          const entry = sockets.get(piece.id);
          expect(entry).toBeDefined();
          const dx = other.gridX - piece.gridX;
          const dy = other.gridY - piece.gridY;
          let side: 'top' | 'right' | 'bottom' | 'left';
          if (dx === 1) side = 'right';
          else if (dx === -1) side = 'left';
          else if (dy === 1) side = 'bottom';
          else side = 'top';
          expect(entry!.sides).toContain(side);
        }
      }
    }
  });
});

describe('[P13-1] follows the engine on the Gear', () => {
  it('the Gear-Terminal wire is kept iff executeMachine records a successful terminal step', () => {
    const source = prePlaced('source', 0, 1);
    const gear: PlacedPiece = { id: 'gear1', type: 'gear', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const terminal = prePlaced('terminal', 2, 1);
    const pieces = [source, gear, terminal];
    const wires = autoConnectPhysicsPieces(pieces);

    const steps = executeMachine(makeState(pieces, { wires }), 0);
    const reachedTerminal = steps.some(s => s.pieceId === terminal.id && s.type !== 'terminalRejected');

    const kept = beamWires(pieces, wires);
    const keptGearTerminal = kept.some(
      w => (w.fromPieceId === gear.id && w.toPieceId === terminal.id) ||
        (w.fromPieceId === terminal.id && w.toPieceId === gear.id),
    );
    expect(keptGearTerminal).toBe(reachedTerminal);
  });
});

describe("[P13-1] beamWires.ts delegates to traceBeam", () => {
  it('imports traceBeam, does no traversal of its own, and has no gear literal', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../src/game/beamWires.ts'), 'utf8');
    expect(src).toMatch(/traceBeam/);
    expect(src).not.toMatch(/getDirectionalNeighbors|getEmittingSides|getOutputPorts|getInputPorts/);
    expect(src).not.toMatch(/'gear'/);
  });
});

describe('[P12-1] endpointSockets.ts and beamTrace.ts do not reference wires', () => {
  it('the merged P12 guard still holds after P13', () => {
    const endpointSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/game/endpointSockets.ts'),
      'utf8',
    );
    const traceSrc = fs.readFileSync(path.resolve(__dirname, '../../../src/game/beamTrace.ts'), 'utf8');
    expect((endpointSrc.match(/wire/gi) || []).length).toBe(0);
    expect((traceSrc.match(/wire/gi) || []).length).toBe(0);
  });
});
