// Nova Fringe (Sector 2) — NF-1 Outer Marker (Inverter).
// Spec: project-docs/SPECS/SPEC_NOVA_FRINGE.md.
//
// NF-1 is the first Nova level and the only one buildable before the three
// missing pieces (Capacitor, Confluence Node, Divergence Gate) are built — it
// uses the already-implemented Inverter. These tests lock the level data and
// prove an Inverter floor solve produces NOT(input) through the real engine.

import { getLevelById, NOVA_LEVELS } from '../../src/game/levels';
import type { PlacedPiece, MachineState } from '../../src/game/types';
import {
  executeMachine,
  autoConnectPhysicsPieces,
  getDefaultPorts,
} from '../../src/game/engine';

function makePiece(
  id: string,
  type: PlacedPiece['type'],
  gridX: number,
  gridY: number,
  overrides?: Partial<PlacedPiece>,
): PlacedPiece {
  const category =
    ['configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch'].includes(type)
      ? ('protocol' as const)
      : ('physics' as const);
  return {
    id,
    type,
    category,
    gridX,
    gridY,
    ports: getDefaultPorts(type),
    rotation: 0,
    isPrePlaced: false,
    ...overrides,
  };
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

// ── NF-1 level definition ─────────────────────────────────────────────────────

describe('NF-1 Outer Marker — level definition', () => {
  it('exists, is a Nova level, and is in NOVA_LEVELS', () => {
    const level = getLevelById('NF-1');
    expect(level).toBeDefined();
    expect(level!.sector).toBe('nova');
    expect(NOVA_LEVELS.some(l => l.id === 'NF-1')).toBe(true);
  });

  it('expectedOutput is the bitwise inverse of the input', () => {
    const level = getLevelById('NF-1')!;
    const input = level.inputTape!;
    const expected = level.expectedOutput!;
    expect(expected.length).toBe(input.length);
    for (let i = 0; i < input.length; i++) {
      expect(expected[i]).toBe(1 - input[i]);
    }
  });

  it('ships the Inverter and carries the v3 economy fields', () => {
    const level = getLevelById('NF-1')!;
    expect(level.availablePieces).toContain('inverter');
    expect(typeof level.creditBudget).toBe('number');
    expect(level.freeTapes).toContain('IN');
  });

  it('Source and Terminal are not on the same row (not a straight line)', () => {
    const level = getLevelById('NF-1')!;
    const source = level.prePlacedPieces.find(p => p.type === 'source')!;
    const terminal = level.prePlacedPieces.find(p => p.type === 'terminal')!;
    expect(source.gridY).not.toBe(terminal.gridY);
  });
});

// ── NF-1 floor solve: Inverter chain produces NOT(input) ──────────────────────
//
// Simplified linear chain (geometry-independent): Source -> Inverter ->
// Transmitter -> Terminal. The carried signal value is the input bit, the
// Inverter flips it, and the Transmitter writes the inverse (Model β).

describe('NF-1 floor solve — Inverter writes NOT(input) on every pulse', () => {
  it('Source -> Inverter -> Transmitter -> Terminal emits the inverse tape', () => {
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('inv', 'inverter', 1, 0),
      makePiece('tx', 'transmitter', 2, 0),
      makePiece('o', 'terminal', 3, 0, { isPrePlaced: true }),
    ];
    const inputs = [1, 0, 1, 1, 0];
    const state = makeState(pieces, {
      inputTape: inputs,
      outputTape: inputs.map(() => -1 as number),
      dataTrail: { cells: Array(inputs.length).fill(null), headPosition: 0 },
    });
    for (let pulse = 0; pulse < inputs.length; pulse++) {
      executeMachine(state, pulse);
    }
    // NF-1 canonical expectedOutput.
    expect(state.outputTape).toEqual([0, 1, 0, 0, 1]);
    expect(state.outputTape).toEqual(getLevelById('NF-1')!.expectedOutput);
  });
});
