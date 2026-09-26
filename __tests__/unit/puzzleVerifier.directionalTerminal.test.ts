// Pre-written tests — SPEC_DIRECTIONAL_TERMINAL v1.0 section 11,
// puzzleVerifier.directionalTerminal.test.ts (AXM-029 PR 1). Clause [3.8]: no
// consumer that counts Terminal arrivals may count a terminalRejected step.
import type { LevelDefinition, PlacedPiece, MachineState, ExecutionStep, OutputTapeValue } from '../../src/game/types';
import { BLANK } from '../../src/game/types';
import { executeMachine, autoConnectPhysicsPieces, getDefaultPorts } from '../../src/game/engine';
import { verifyPuzzle, runSolution } from '../../src/game/puzzleVerifier';

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

// Source (0,0) and a Terminal at (1,1) whose entry side is 'left'. A Gear at
// (1,0) delivers into the Terminal's top: a wrong-side arrival, the only one.
function makeLevel(overrides?: Partial<LevelDefinition>): LevelDefinition {
  return {
    id: 'TEST-DT',
    name: 'Directional Terminal fixture',
    sector: 'test',
    description: '',
    cogsLine: '',
    gridWidth: 4,
    gridHeight: 4,
    prePlacedPieces: [
      makePiece('s', 'source', 0, 0, { isPrePlaced: true }),
      makePiece('t', 'terminal', 1, 1, { isPrePlaced: true, entrySide: 'left' }),
    ],
    availablePieces: ['gear'],
    dataTrail: { cells: [], headPosition: 0 },
    objectives: [{ type: 'reach_output' }],
    optimalPieces: 1,
    ...overrides,
  };
}

const wrongSideSolution = (): PlacedPiece[] => [makePiece('g', 'gear', 1, 0)];

describe('puzzleVerifier — directional Terminal', () => {
  it('[3.8] a solution whose only arrival is a wrong-side arrival is not solvable', () => {
    expect(verifyPuzzle(makeLevel(), wrongSideSolution()).solvable).toBe(false);
  });

  it('[3.8] three pulses that each end in terminalRejected count as 0 reached', () => {
    const level = makeLevel({ inputTape: [1, 0, 1], requiredTerminalCount: 3 });
    const pieces = [
      ...level.prePlacedPieces.map(p => ({ ...p })),
      ...wrongSideSolution(),
    ];
    const state: MachineState = {
      pieces,
      wires: autoConnectPhysicsPieces(pieces),
      dataTrail: { cells: [], headPosition: 0 },
      configuration: 1,
      isRunning: false,
      signalPath: [],
      currentSignalStep: 0,
      status: 'idle',
      inputTape: [...level.inputTape!],
      outputTape: new Array(level.inputTape!.length).fill(BLANK) as OutputTapeValue[],
    };
    const pulses: ExecutionStep[][] = [];
    for (let i = 0; i < level.inputTape!.length; i++) {
      pulses.push(executeMachine(state, i));
    }
    for (const pulse of pulses) {
      expect(pulse[pulse.length - 1].type).toBe('terminalRejected');
    }
    // The live requiredTerminalCount gate counts terminal && success steps
    // across the concatenated pulses (see requiredTerminalCount.test.ts).
    const all = pulses.flat();
    const reachedCount = all.filter(s => s.type === 'terminal' && s.success).length;
    expect(reachedCount).toBe(0);
    expect(reachedCount >= level.requiredTerminalCount!).toBe(false);
    expect(runSolution(level, wrongSideSolution()).reachedEveryPulse).toBe(false);
  });
});
