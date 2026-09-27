// AXM-036 P12 (R-12.0, replacing S-DR-1) — Source/Terminal socket sides.
// Boards use FLOOR_SOLVES plus solvePieces and the level's pre-placed pieces
// (contract section 12a).

import type { MachineState, PlacedPiece } from '../../../src/game/types';
import { prePlaced } from '../../../src/game/levels';
import {
  levelA1_1,
  levelA1_2,
  levelA1_3,
  levelA1_4,
} from '../../../src/game/levels';
import { autoConnectPhysicsPieces, executeMachine, getDefaultPorts } from '../../../src/game/engine';
import { getEndpointSocketSides } from '../../../src/game/endpointSockets';
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

describe('[P12-1] A1-1 floor solve: Source outlet [right], Terminal socket [top]', () => {
  it('matches the traced beam', () => {
    const pieces = [...levelA1_1.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-1'].floor)];
    const sockets = getEndpointSocketSides(pieces);
    const source = findByType(pieces, 'source');
    const terminal = findByType(pieces, 'terminal');
    expect(sockets.get(source.id)).toEqual({ kind: 'outlet', sides: ['right'] });
    expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: ['top'] });
  });
});

describe('[P12-1] A1-1 alternate solve: Source outlet [bottom], Terminal socket [left]', () => {
  it('matches the traced beam', () => {
    const pieces = [...levelA1_1.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-1'].alternate)];
    const sockets = getEndpointSocketSides(pieces);
    const source = findByType(pieces, 'source');
    const terminal = findByType(pieces, 'terminal');
    expect(sockets.get(source.id)).toEqual({ kind: 'outlet', sides: ['bottom'] });
    expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: ['left'] });
  });
});

describe('[P12-1] empty board: Source and Terminal present with sides []', () => {
  it('has no connections', () => {
    const pieces = [...levelA1_1.prePlacedPieces];
    const sockets = getEndpointSocketSides(pieces);
    const source = findByType(pieces, 'source');
    const terminal = findByType(pieces, 'terminal');
    expect(sockets.get(source.id)).toEqual({ kind: 'outlet', sides: [] });
    expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: [] });
  });
});

describe('[P12-1] Source with two directional neighbours', () => {
  it('gives [right, bottom]', () => {
    const source = prePlaced('source', 0, 1);
    const terminal = prePlaced('terminal', 5, 5);
    const conveyorRight: PlacedPiece = {
      id: 'conv-right',
      type: 'conveyor',
      category: 'physics',
      gridX: 1,
      gridY: 1,
      ports: getDefaultPorts('placeholder' as never),
      rotation: 0,
    };
    const conveyorDown: PlacedPiece = {
      id: 'conv-down',
      type: 'conveyor',
      category: 'physics',
      gridX: 0,
      gridY: 2,
      ports: getDefaultPorts('placeholder' as never),
      rotation: 90,
    };
    const pieces = [source, terminal, conveyorRight, conveyorDown];
    const sockets = getEndpointSocketSides(pieces);
    expect(sockets.get(source.id)).toEqual({ kind: 'outlet', sides: ['right', 'bottom'] });
  });
});

describe('[P12-1] FND-2 case: no socket beside a Config Node the beam passes straight through', () => {
  it('drops the Config Node to Terminal side wire from the socket', () => {
    const source = prePlaced('source', 0, 1);
    const conv1: PlacedPiece = { id: 'c1', type: 'conveyor', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const conv2: PlacedPiece = { id: 'c2', type: 'conveyor', category: 'physics', gridX: 2, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const cfg: PlacedPiece = { id: 'cfg', type: 'configNode', category: 'protocol', gridX: 3, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0, configValue: 1 };
    const conv3: PlacedPiece = { id: 'c3', type: 'conveyor', category: 'physics', gridX: 4, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const terminal = prePlaced('terminal', 3, 2);
    const pieces = [source, conv1, conv2, cfg, conv3, terminal];

    // Precondition: autoConnectPhysicsPieces DOES wire the Config Node to the Terminal.
    const wires = autoConnectPhysicsPieces(pieces);
    const cfgToTerminal = wires.some(
      w => (w.fromPieceId === cfg.id && w.toPieceId === terminal.id) ||
        (w.fromPieceId === terminal.id && w.toPieceId === cfg.id),
    );
    expect(cfgToTerminal).toBe(true);

    const sockets = getEndpointSocketSides(pieces);
    expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: [] });
  });
});

describe('[P12-1] an unreached chain gives no socket', () => {
  it('a wired but unreached conveyor next to the Terminal gets []', () => {
    const source = prePlaced('source', 0, 1);
    const terminal = prePlaced('terminal', 5, 5);
    const unreachedConveyor: PlacedPiece = {
      id: 'unreached',
      type: 'conveyor',
      category: 'physics',
      gridX: 4,
      gridY: 5,
      ports: getDefaultPorts('placeholder' as never),
      rotation: 0,
    };
    const pieces = [source, terminal, unreachedConveyor];
    const wires = autoConnectPhysicsPieces(pieces);
    expect(wires.some(w => w.fromPieceId === unreachedConveyor.id || w.toPieceId === unreachedConveyor.id)).toBe(true);

    const sockets = getEndpointSocketSides(pieces);
    expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: [] });
  });
});

describe('[P12-1] Gear follows the engine, whatever it does', () => {
  it('the Terminal socket agrees with executeMachine, hard-coding neither answer', () => {
    const source = prePlaced('source', 0, 1);
    const gear: PlacedPiece = { id: 'gear1', type: 'gear', category: 'physics', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0 };
    const terminal = prePlaced('terminal', 2, 1);
    const pieces = [source, gear, terminal];

    const steps = executeMachine(makeState(pieces), 0);
    const reachedTerminal = steps.some(s => s.pieceId === terminal.id && s.type !== 'terminalRejected');

    const sockets = getEndpointSocketSides(pieces);
    const expected = reachedTerminal ? ['left'] : [];
    expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: expected });
  });
});

describe('[P12-1] a Config Node set against the trail does not stop the trace', () => {
  it('the trace ignores configValue entirely', () => {
    const source = prePlaced('source', 0, 1);
    const cfg: PlacedPiece = { id: 'cfg', type: 'configNode', category: 'protocol', gridX: 1, gridY: 1, ports: getDefaultPorts('placeholder' as never), rotation: 0, configValue: 0 };
    const terminal = prePlaced('terminal', 2, 1);
    const pieces = [source, cfg, terminal];
    const sockets = getEndpointSocketSides(pieces);
    expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: ['left'] });
  });
});

describe('[P12-1] directional Terminal is kind entry with [entrySide]', () => {
  it.each(['top', 'right', 'bottom', 'left'] as const)('entrySide %s', side => {
    const source = prePlaced('source', 0, 1);
    const terminal = prePlaced('terminal', 5, 5, { entrySide: side });
    const pieces = [source, terminal];
    const sockets = getEndpointSocketSides(pieces);
    expect(sockets.get(terminal.id)).toEqual({ kind: 'entry', sides: [side] });
  });
});

describe('[P12-1] only source and terminal pieces are keyed', () => {
  it('no other piece type appears in the map', () => {
    const pieces = [...levelA1_1.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-1'].floor)];
    const sockets = getEndpointSocketSides(pieces);
    expect(sockets.size).toBe(2);
    for (const piece of pieces) {
      if (piece.type === 'source' || piece.type === 'terminal') {
        expect(sockets.has(piece.id)).toBe(true);
      } else {
        expect(sockets.has(piece.id)).toBe(false);
      }
    }
  });
});

describe('[P12-1] agrees with executeMachine on the ungated A1 floor and alternate solves (A1-1, A1-2, A1-4)', () => {
  const cases: Array<{ level: typeof levelA1_1; key: string }> = [
    { level: levelA1_1, key: 'A1-1' },
    { level: levelA1_2, key: 'A1-2' },
    { level: levelA1_4, key: 'A1-4' },
  ];

  for (const { level, key } of cases) {
    for (const variant of ['floor', 'alternate'] as const) {
      it(`${key} ${variant}`, () => {
        const solve = FLOOR_SOLVES[key][variant];
        const pieces = [...level.prePlacedPieces, ...solvePieces(solve)];
        const wires = autoConnectPhysicsPieces(pieces);
        const steps = executeMachine(makeState(pieces, { wires }), 0);
        const terminal = findByType(pieces, 'terminal');
        const reached = steps.some(s => s.pieceId === terminal.id && s.type !== 'terminalRejected');
        expect(reached).toBe(true);

        // The socket side is the side facing the solve's adjacent piece.
        const adjacent = pieces.find(
          p =>
            p.id !== terminal.id &&
            Math.abs(p.gridX - terminal.gridX) + Math.abs(p.gridY - terminal.gridY) === 1,
        )!;
        let expectedSide: 'top' | 'right' | 'bottom' | 'left';
        const dx = terminal.gridX - adjacent.gridX;
        const dy = terminal.gridY - adjacent.gridY;
        if (dx === 1) expectedSide = 'left';
        else if (dx === -1) expectedSide = 'right';
        else if (dy === 1) expectedSide = 'top';
        else expectedSide = 'bottom';

        const sockets = getEndpointSocketSides(pieces);
        expect(sockets.get(terminal.id)).toEqual({ kind: 'socket', sides: [expectedSide] });
      });
    }
  }
});

describe('[P12-1] INVARIANT: every socket or outlet side is also a wired side', () => {
  it('holds on every loaded A1 floor/alternate board', () => {
    const boards: Array<{ pieces: PlacedPiece[] }> = [
      { pieces: [...levelA1_1.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-1'].floor)] },
      { pieces: [...levelA1_1.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-1'].alternate)] },
      { pieces: [...levelA1_2.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-2'].floor)] },
      { pieces: [...levelA1_3.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-3'].floor)] },
      { pieces: [...levelA1_4.prePlacedPieces, ...solvePieces(FLOOR_SOLVES['A1-4'].floor)] },
    ];
    for (const { pieces } of boards) {
      const wires = autoConnectPhysicsPieces(pieces);
      const sockets = getEndpointSocketSides(pieces);
      for (const piece of pieces) {
        if (piece.type !== 'source' && piece.type !== 'terminal') continue;
        const entry = sockets.get(piece.id);
        if (!entry) continue;
        for (const side of entry.sides) {
          const dx = side === 'right' ? 1 : side === 'left' ? -1 : 0;
          const dy = side === 'bottom' ? 1 : side === 'top' ? -1 : 0;
          const neighbor = pieces.find(p => p.gridX === piece.gridX + dx && p.gridY === piece.gridY + dy);
          expect(neighbor).toBeDefined();
          const isWired = wires.some(
            w =>
              (w.fromPieceId === piece.id && w.toPieceId === neighbor!.id) ||
              (w.fromPieceId === neighbor!.id && w.toPieceId === piece.id),
          );
          expect(isWired).toBe(true);
        }
      }
    }
  });
});

describe('[P12-1] endpointSockets.ts and beamTrace.ts do not reference wires', () => {
  it('source check', () => {
    const fs = require('fs');
    const path = require('path');
    const endpointSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/game/endpointSockets.ts'),
      'utf8',
    );
    const traceSrc = fs.readFileSync(path.resolve(__dirname, '../../../src/game/beamTrace.ts'), 'utf8');
    expect((endpointSrc.match(/wire/gi) || []).length).toBe(0);
    expect((traceSrc.match(/wire/gi) || []).length).toBe(0);
  });
});

describe("[P12-1] no Gear special case", () => {
  it('beamTrace.ts and endpointSockets.ts contain no gear literal', () => {
    const fs = require('fs');
    const path = require('path');
    const endpointSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../src/game/endpointSockets.ts'),
      'utf8',
    );
    const traceSrc = fs.readFileSync(path.resolve(__dirname, '../../../src/game/beamTrace.ts'), 'utf8');
    expect(endpointSrc).not.toMatch(/'gear'/);
    expect(traceSrc).not.toMatch(/'gear'/);
  });
});

describe('traceBeam (used by getEndpointSocketSides)', () => {
  it('records no entry side for a Source', () => {
    const source = prePlaced('source', 0, 1);
    const result = traceBeam([source]);
    expect(result.entry.get(source.id)).toBeUndefined();
    expect(result.edges).toEqual([]);
  });
});
