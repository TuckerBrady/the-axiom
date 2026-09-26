// Pre-written tests — K1-7 Ore Processing, Blocker 3 floor-solve fix.
// Spec: kepler-belt-levels-v2-part2.md §K1-7 — ORE PROCESSING.
//
// Blocker 3 fix (Tucker authorization 2026-04-30):
//   - Removed redundant Conveyor at (7,6) from Path A.
//   - Transmitter now occupies (7,6) directly. Terminal stays at (8,6).
//   - optimalPieces updated from 8 to 7.
//
// AXM-026 (SPEC_SOURCE_TERMINAL_PLACEMENT 7.1 / 8.2): the Blocker 3 floor solve is
// superseded by the K1-7 fixture in __tests__/fixtures/floorSolves.ts, run through
// the real engine by __tests__/unit/levels/floorSolves.test.ts. The level-data
// assertions below now pin that fixture's count (12).

import { getLevelById } from '../../src/game/levels';
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

// ── K1-7 level definition assertions ─────────────────────────────────────────

describe('K1-7 Ore Processing — Blocker 3 fix: level definition', () => {
  // Blocker 3 set 7 (from 8). AXM-026 supersedes this floor solve with the K1-7
  // fixture in __tests__/fixtures/floorSolves.ts (SPEC_SOURCE_TERMINAL_PLACEMENT
  // 7.1, 8.2), proven by __tests__/unit/levels/floorSolves.test.ts: 12 pieces.
  it('optimalPieces is 12 (AXM-026 floor fixture; was 7 after Blocker 3)', () => {
    const level = getLevelById('K1-7');
    expect(level).toBeDefined();
    expect(level!.optimalPieces).toBe(12);
  });

  it('no tray Conveyor occupies (7,6) — coordinate collision resolved', () => {
    const level = getLevelById('K1-7');
    // The pre-placed pieces list must not contain a Conveyor at (7,6).
    // A Transmitter at (7,6) is correct; a Conveyor at (7,6) is the collision.
    const conveyorAt76 = level!.prePlacedPieces.find(
      p => p.type === 'conveyor' && p.gridX === 7 && p.gridY === 6,
    );
    expect(conveyorAt76).toBeUndefined();
  });

  it('expectedOutput is [1,0,1,1] — unchanged by Blocker 3 fix', () => {
    const level = getLevelById('K1-7');
    expect(level!.expectedOutput).toEqual([1, 0, 1, 1]);
  });
});

// ── K1-7 Path A floor solve: 7-piece machine produces correct output ──────────
//
// Floor solve (post Blocker 3 fix):
//   Scanner(2,3) → Conveyor(3,3) → [Splitter(4,3) pre-placed] → Gear(5,3)
//   → Conveyor(5,4) → [Bridge(5,5) pre-placed] → Conveyor(5,6) → Gear(6,6)
//   → Transmitter(7,6) → Terminal(8,6)
//
// Tray pieces: Scanner + Conveyor + Gear + Conveyor + Conveyor + Gear + Transmitter = 7.
//
// This is a simplified straight-line equivalent test. The full K1-7 topology
// (Splitter + Bridge crossing) requires engine verification per REQ-62.

describe('K1-7 floor solve — 7-piece pass-through (REQ-T-1 compliance)', () => {
  it('Scanner → Transmitter → Terminal: output tracks input on all 4 pulses', () => {
    // Simplified linear chain (without Splitter/Bridge for unit-test isolation).
    // Validates that a 7-piece floor-solve path produces correct output.
    const pieces = [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('sc', 'scanner', 1, 0),
      makePiece('cv1', 'conveyor', 2, 0),
      makePiece('cv2', 'conveyor', 3, 0),
      makePiece('cv3', 'conveyor', 4, 0),
      makePiece('tx', 'transmitter', 5, 0),
      makePiece('o', 'terminal', 6, 0, { isPrePlaced: true }),
    ];
    const inputs = [1, 0, 1, 1];
    const state = makeState(pieces, {
      inputTape: inputs,
      outputTape: inputs.map(() => -1 as number),
      dataTrail: { cells: [null, null, null, null], headPosition: 0 },
    });
    for (let pulse = 0; pulse < inputs.length; pulse++) {
      executeMachine(state, pulse);
    }
    // K1-7 expectedOutput [1,0,1,1] — identity pass-through.
    expect(state.outputTape).toEqual([1, 0, 1, 1]);
  });

  it('the floor solve count is encoded, and the tray carries more than it', () => {
    const level = getLevelById('K1-7');
    // AXM-026: the floor solve is the 12-piece K1-7 fixture (floorSolves.ts).
    expect(level!.optimalPieces).toBe(12);
    // The tray (21 pieces) must carry more than the floor solve so the
    // alternate solve and scar reroutes have pieces to work with.
    expect(level!.availablePieces.length).toBeGreaterThan(12);
  });
});
