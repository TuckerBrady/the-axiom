import { create } from 'zustand';
import type {
  LevelDefinition,
  MachineState,
  PlacedPiece,
  PieceType,
  PortSide,
  ExecutionStep,
} from '../game/types';
import {
  autoConnectPhysicsPieces,
  executeMachine,
  calculateStars,
  getDefaultPorts,
  getPieceCategory,
  getOutputPorts,
} from '../game/engine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameState {
  // State
  currentLevel: LevelDefinition | null;
  machineState: MachineState;
  selectedPieceFromTray: PieceType | null;
  selectedPlacedPiece: string | null;
  executionSteps: ExecutionStep[];
  isExecuting: boolean;
  stars: number;
  debugMode: boolean;
  debugStepIndex: number;
  configuration: number;

  // Actions
  setLevel: (level: LevelDefinition) => void;
  placePiece: (type: PieceType, gridX: number, gridY: number, rotation?: number) => void;
  movePiece: (pieceId: string, gridX: number, gridY: number) => void;
  deletePiece: (pieceId: string) => void;
  rotatePiece: (pieceId: string) => void;
  updatePiece: (pieceId: string, fields: Partial<PlacedPiece>) => void;
  selectFromTray: (type: PieceType | null) => void;
  selectPlaced: (pieceId: string | null) => void;
  engage: () => ExecutionStep[];
  reset: () => void;
  toggleConfiguration: () => void;
  setDebugMode: (on: boolean) => void;
  debugNext: () => void;
  debugPrev: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const EMPTY_MACHINE: MachineState = {
  pieces: [],
  wires: [],
  dataTrail: { cells: [], headPosition: 0 },
  configuration: 0,
  isRunning: false,
  signalPath: [],
  currentSignalStep: 0,
  status: 'idle',
};

let placedPieceCounter = 100;

// ─── Splitter magnet computation ─────────────────────────────────────────────

const ADJACENT_OFFSETS: { side: PortSide; dx: number; dy: number }[] = [
  { side: 'top', dx: 0, dy: -1 },
  { side: 'bottom', dx: 0, dy: 1 },
  { side: 'left', dx: -1, dy: 0 },
  { side: 'right', dx: 1, dy: 0 },
];

const OPPOSITE_SIDE_MAP: Record<PortSide, PortSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * Scans all Splitter pieces and populates connectedMagnetSides.
 *
 * Step 1: Identify the input side — the side where an adjacent piece
 *   has an output port facing the Splitter (i.e. can send signal here).
 * Step 2: Assign magnets to the first 2 adjacent pieces on sides that
 *   are NOT the input side.
 *
 * If no upstream piece is found, falls back to first 2 adjacent pieces.
 */
export function computeSplitterMagnets(pieces: PlacedPiece[]): PlacedPiece[] {
  return pieces.map(p => {
    if (p.type !== 'splitter') return p;

    // Step 1: find the input side (upstream piece that can send signal here)
    let inputSide: PortSide | null = null;
    for (const { side, dx, dy } of ADJACENT_OFFSETS) {
      const neighbor = pieces.find(
        q => q.id !== p.id && q.gridX === p.gridX + dx && q.gridY === p.gridY + dy,
      );
      if (!neighbor) continue;
      // The neighbor faces the Splitter from the opposite side
      const neighborFacingSide = OPPOSITE_SIDE_MAP[side];
      const neighborOutputs = getOutputPorts(neighbor);
      if (neighborOutputs.includes(neighborFacingSide)) {
        inputSide = side;
        break;
      }
    }

    // Step 2: assign magnets to non-input adjacent pieces (max 2)
    const magnets: PortSide[] = [];
    for (const { side, dx, dy } of ADJACENT_OFFSETS) {
      if (magnets.length >= 2) break;
      if (side === inputSide) continue;
      const hasNeighbor = pieces.some(
        q => q.id !== p.id && q.gridX === p.gridX + dx && q.gridY === p.gridY + dy,
      );
      if (hasNeighbor) magnets.push(side);
    }

    return { ...p, connectedMagnetSides: magnets };
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
  currentLevel: null,
  machineState: { ...EMPTY_MACHINE },
  selectedPieceFromTray: null,
  selectedPlacedPiece: null,
  executionSteps: [],
  isExecuting: false,
  stars: 0,
  debugMode: false,
  debugStepIndex: 0,
  configuration: 0,

  setLevel: (level) => {
    const pieces = level.prePlacedPieces.map(p => ({ ...p, ports: p.ports.map(port => ({ ...port })) }));
    const wires = autoConnectPhysicsPieces(pieces);
    set({
      currentLevel: level,
      machineState: {
        pieces,
        wires,
        dataTrail: { ...level.dataTrail, cells: [...level.dataTrail.cells] },
        configuration: 0,
        isRunning: false,
        signalPath: [],
        currentSignalStep: 0,
        status: 'idle',
        inputTape: level.inputTape ? [...level.inputTape] : undefined,
        outputTape: level.inputTape ? new Array(level.inputTape.length).fill(-1) : undefined,
      },
      selectedPieceFromTray: null,
      selectedPlacedPiece: null,
      executionSteps: [],
      isExecuting: false,
      stars: 0,
      debugMode: false,
      debugStepIndex: 0,
      configuration: 0,
    });
  },

  placePiece: (type, gridX, gridY, rotation) => {
    const state = get();
    const { machineState } = state;

    const occupied = machineState.pieces.some(
      p => p.gridX === gridX && p.gridY === gridY,
    );
    if (occupied) return;

    const newPiece: PlacedPiece = {
      id: `piece-${++placedPieceCounter}`,
      type,
      category: getPieceCategory(type),
      gridX,
      gridY,
      ports: getDefaultPorts(type),
      // Splitter uses magnet mechanic — rotation is meaningless.
      rotation: type === 'splitter' ? 0 : (rotation ?? 0),
      isPrePlaced: false,
    };

    const rawPieces = [...machineState.pieces, newPiece];
    const pieces = computeSplitterMagnets(rawPieces);
    const wires = autoConnectPhysicsPieces(pieces);

    set({
      machineState: { ...machineState, pieces, wires },
      selectedPieceFromTray: null,
    });
  },

  movePiece: (pieceId, gridX, gridY) => {
    const { machineState } = get();
    const piece = machineState.pieces.find(p => p.id === pieceId);
    if (!piece || piece.isPrePlaced) return;

    // Check if target cell is occupied by another piece
    const occupied = machineState.pieces.some(
      p => p.id !== pieceId && p.gridX === gridX && p.gridY === gridY,
    );
    if (occupied) return;

    const rawPieces = machineState.pieces.map(p =>
      p.id === pieceId ? { ...p, gridX, gridY } : p,
    );
    const pieces = computeSplitterMagnets(rawPieces);
    const wires = autoConnectPhysicsPieces(pieces);

    set({
      machineState: { ...machineState, pieces, wires },
      selectedPlacedPiece: null,
    });
  },

  deletePiece: (pieceId) => {
    const { machineState } = get();
    const piece = machineState.pieces.find(p => p.id === pieceId);
    if (!piece || piece.isPrePlaced) return;

    const rawPieces = machineState.pieces.filter(p => p.id !== pieceId);
    const pieces = computeSplitterMagnets(rawPieces);
    const wires = autoConnectPhysicsPieces(pieces);

    set({
      machineState: { ...machineState, pieces, wires },
      selectedPlacedPiece: null,
    });
  },

  rotatePiece: (pieceId) => {
    const { machineState } = get();
    const rawPieces = machineState.pieces.map(p =>
      p.id === pieceId && !p.isPrePlaced
        ? { ...p, rotation: (p.rotation + 90) % 360 }
        : p,
    );
    const pieces = computeSplitterMagnets(rawPieces);
    const wires = autoConnectPhysicsPieces(pieces);
    set({ machineState: { ...machineState, pieces, wires } });
  },

  updatePiece: (pieceId, fields) => {
    const { machineState } = get();
    const rawPieces = machineState.pieces.map(p =>
      p.id === pieceId ? { ...p, ...fields } : p,
    );
    const pieces = computeSplitterMagnets(rawPieces);
    const wires = autoConnectPhysicsPieces(pieces);
    set({ machineState: { ...machineState, pieces, wires } });
  },

  selectFromTray: (type) => {
    set({ selectedPieceFromTray: type, selectedPlacedPiece: null });
  },

  selectPlaced: (pieceId) => {
    set({ selectedPlacedPiece: pieceId, selectedPieceFromTray: null });
  },

  engage: () => {
    const state = get();
    const { machineState, currentLevel, configuration } = state;

    const inputTape = currentLevel?.inputTape;
    const expectedOutput = currentLevel?.expectedOutput;
    const outputTape: number[] | undefined = inputTape
      ? new Array(inputTape.length).fill(-1)
      : undefined;

    const stateWithConfig: MachineState = {
      ...machineState,
      configuration,
      isRunning: true,
      status: 'running',
      inputTape: inputTape ? [...inputTape] : undefined,
      outputTape,
    };

    // Tape-enabled levels: run one pulse per tape cell, concatenating
    // execution steps. The animation layer already detects pulse
    // boundaries by counting source-typed steps.
    const pulseCount = inputTape ? inputTape.length : 1;
    let allSteps: ExecutionStep[] = [];
    for (let i = 0; i < pulseCount; i++) {
      const pulseSteps = executeMachine(stateWithConfig, i);
      allSteps = allSteps.concat(pulseSteps);
    }

    const reachedOutputEveryPulse =
      pulseCount > 0 &&
      allSteps.filter(s => s.type === 'terminal' && s.success).length >= pulseCount;

    // For tape levels, success additionally requires outputTape to match
    // expectedOutput. For legacy levels, the single-pulse output success
    // is sufficient.
    let succeeded: boolean;
    if (inputTape && expectedOutput) {
      const tapeMatches =
        outputTape !== undefined &&
        outputTape.length === expectedOutput.length &&
        outputTape.every((v, i) => v === expectedOutput[i]);
      succeeded = reachedOutputEveryPulse && tapeMatches;
    } else {
      succeeded = allSteps.some(s => s.type === 'terminal' && s.success);
    }

    const playerPiecesUsed = machineState.pieces.filter(p => !p.isPrePlaced).length;
    const totalTrayPieces = currentLevel?.availablePieces?.length ?? 0;
    const stars = succeeded && currentLevel
      ? calculateStars(allSteps, playerPiecesUsed, currentLevel.optimalPieces, totalTrayPieces)
      : 0;

    set({
      executionSteps: allSteps,
      isExecuting: true,
      stars,
      machineState: {
        ...machineState,
        isRunning: true,
        status: succeeded ? 'idle' : 'void',
        signalPath: allSteps.map(s => s.pieceId),
        currentSignalStep: 0,
        inputTape: inputTape ? [...inputTape] : undefined,
        outputTape: outputTape ? [...outputTape] : undefined,
      },
    });

    return allSteps;
  },

  reset: () => {
    const { currentLevel } = get();
    if (currentLevel) {
      get().setLevel(currentLevel);
    }
  },

  toggleConfiguration: () => {
    const { configuration } = get();
    set({ configuration: configuration === 0 ? 1 : 0 });
  },

  setDebugMode: (on) => {
    set({ debugMode: on, debugStepIndex: 0 });
  },

  debugNext: () => {
    const { debugStepIndex, executionSteps } = get();
    if (debugStepIndex < executionSteps.length - 1) {
      set({ debugStepIndex: debugStepIndex + 1 });
    }
  },

  debugPrev: () => {
    const { debugStepIndex } = get();
    if (debugStepIndex > 0) {
      set({ debugStepIndex: debugStepIndex - 1 });
    }
  },
}));
