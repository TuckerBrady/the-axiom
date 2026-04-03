// ─── Piece System ─────────────────────────────────────────────────────────────

export type PieceType =
  | 'source'
  | 'output'
  | 'conveyor'
  | 'gear'
  | 'splitter'
  | 'configNode'
  | 'scanner'
  | 'transmitter';

export type PieceCategory = 'physics' | 'protocol';

export type PortSide = 'top' | 'bottom' | 'left' | 'right';

export type Port = {
  id: string;
  side: PortSide;
  connected: boolean;
  connectedTo?: string;
};

export type PlacedPiece = {
  id: string;
  type: PieceType;
  category: PieceCategory;
  gridX: number;
  gridY: number;
  ports: Port[];
  rotation: number;
  isPrePlaced?: boolean;
  condition?: (configuration: number) => boolean;
};

// ─── Connections ──────────────────────────────────────────────────────────────

export type Wire = {
  id: string;
  fromPieceId: string;
  fromPortId: string;
  toPieceId: string;
  toPortId: string;
};

// ─── Data Trail (Turing tape) ─────────────────────────────────────────────────

export type DataTrail = {
  cells: (0 | 1)[];
  headPosition: number;
};

// ─── Machine State ────────────────────────────────────────────────────────────

export type MachineStatus = 'idle' | 'running' | 'locked' | 'void';

export type MachineState = {
  pieces: PlacedPiece[];
  wires: Wire[];
  dataTrail: DataTrail;
  configuration: number;
  isRunning: boolean;
  signalPath: string[];
  currentSignalStep: number;
  status: MachineStatus;
};

// ─── Level Definition ─────────────────────────────────────────────────────────

export type LevelObjective = {
  type: 'reach_output' | 'reach_output_with_value';
  requiredValue?: number;
};

export type LevelDefinition = {
  id: string;
  name: string;
  sector: string;
  description: string;
  cogsLine: string;
  gridWidth: number;
  gridHeight: number;
  prePlacedPieces: PlacedPiece[];
  availablePieces: PieceType[];
  dataTrail: DataTrail;
  objectives: LevelObjective[];
  optimalPieces: number;
  systemRepaired?: string;
};

// ─── Execution ────────────────────────────────────────────────────────────────

export type ExecutionStep = {
  pieceId: string;
  type: string;
  timestamp: number;
  success: boolean;
  message?: string;
};
