import { create } from 'zustand';
import type {
  LevelDefinition,
  MachineState,
  PlacedPiece,
  PieceType,
  ExecutionStep,
} from '../game/types';
import {
  autoConnectPhysicsPieces,
  executeMachine,
  calculateStars,
  getDefaultPorts,
  getPieceCategory,
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
  placePiece: (type: PieceType, gridX: number, gridY: number) => void;
  movePiece: (pieceId: string, gridX: number, gridY: number) => void;
  deletePiece: (pieceId: string) => void;
  rotatePiece: (pieceId: string) => void;
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

  placePiece: (type, gridX, gridY) => {
    const state = get();
    const { machineState } = state;

    // Check if cell is occupied
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
      rotation: 0,
      isPrePlaced: false,
    };

    const pieces = [...machineState.pieces, newPiece];
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

    const pieces = machineState.pieces.map(p =>
      p.id === pieceId ? { ...p, gridX, gridY } : p,
    );
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

    const pieces = machineState.pieces.filter(p => p.id !== pieceId);
    const wires = autoConnectPhysicsPieces(pieces);

    set({
      machineState: { ...machineState, pieces, wires },
      selectedPlacedPiece: null,
    });
  },

  rotatePiece: (pieceId) => {
    const { machineState } = get();
    const pieces = machineState.pieces.map(p =>
      p.id === pieceId && !p.isPrePlaced
        ? { ...p, rotation: (p.rotation + 90) % 360 }
        : p,
    );
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

    const stateWithConfig: MachineState = {
      ...machineState,
      configuration,
      isRunning: true,
      status: 'running',
    };

    const steps = executeMachine(stateWithConfig);
    const succeeded = steps.some(s => s.type === 'output' && s.success);

    const playerPiecesUsed = machineState.pieces.filter(p => !p.isPrePlaced).length;
    const stars = succeeded && currentLevel
      ? calculateStars(steps, playerPiecesUsed, currentLevel.optimalPieces)
      : 0;

    set({
      executionSteps: steps,
      isExecuting: true,
      stars,
      machineState: {
        ...machineState,
        isRunning: true,
        status: succeeded ? 'idle' : 'void',
        signalPath: steps.map(s => s.pieceId),
        currentSignalStep: 0,
      },
    });

    return steps;
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
