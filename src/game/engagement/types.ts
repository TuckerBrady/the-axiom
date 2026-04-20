import type { Dispatch, SetStateAction, MutableRefObject, RefObject } from 'react';
import type { View } from 'react-native';
import type { ExecutionStep, PlacedPiece, PieceType } from '../types';
import type { TapeCellContainerMeasure } from '../bubbleMath';

export type Pt = { x: number; y: number };

export type Segment = {
  s: number;
  e: number;
  l: number;
  dx: number;
  dy: number;
  x0: number;
  y0: number;
};

export type SignalPath = { segs: Segment[]; total: number };

export type AnimMapEntry = { tag: string; duration: number };

export type TapeHighlight = 'read' | 'write' | 'gate-pass' | 'gate-block';

export type ValueBubbleState = {
  screenX: number;
  screenY: number;
  color: string;
  value: string;
  size?: number;
} | null;

export type BubbleTrailItem = {
  x: number;
  y: number;
  opacity: number;
  size: number;
};

export type VoidPulseState = {
  x: number;
  y: number;
  r: number;
  opacity: number;
} | null;

export type LockRing = {
  x: number;
  y: number;
  r: number;
  opacity: number;
};

export type SignalPhase = 'idle' | 'charge' | 'beam' | 'lock';

export type WireRef = { fromPieceId: string; toPieceId: string };

export type MeasurementCache = {
  board: { x: number; y: number };
  input: TapeCellContainerMeasure | null;
  trail: TapeCellContainerMeasure | null;
  output: TapeCellContainerMeasure | null;
};

// Compound animation state objects. Grouping related fields into
// one useState call reduces per-frame setState invocations during
// the beam animation tick loop.

export interface BeamState {
  heads: Pt[];
  headColor: string;
  trails: { points: Pt[]; color: string }[];
  branchTrails: { points: Pt[]; color: string }[][];
  voidPulse: VoidPulseState;
  phase: SignalPhase;
  litWires: Set<string>;
}

export const BEAM_INITIAL: BeamState = {
  heads: [],
  headColor: '#8B5CF6',
  trails: [],
  branchTrails: [],
  voidPulse: null,
  phase: 'idle',
  litWires: new Set(),
};

export interface PieceAnimState {
  flashing: Map<string, string>;
  animations: Map<string, string>;
  gates: Map<string, 'pass' | 'block'>;
  failColors: Map<string, string>;
  locked: Set<string>;
}

export const PIECE_ANIM_INITIAL: PieceAnimState = {
  flashing: new Map(),
  animations: new Map(),
  gates: new Map(),
  failColors: new Map(),
  locked: new Set(),
};

export interface BubbleAnimState {
  bubble: ValueBubbleState;
  trail: BubbleTrailItem[];
}

export const BUBBLE_INITIAL: BubbleAnimState = { bubble: null, trail: [] };

export interface ChargeState {
  pos: Pt | null;
  progress: number;
}

export const CHARGE_INITIAL: ChargeState = { pos: null, progress: 0 };

export interface EngagementContext {
  CELL_SIZE: number;

  getPieceCenter: (pieceId: string) => Pt | null;
  machineStatePieces: PlacedPiece[];

  setBeamState: Dispatch<SetStateAction<BeamState>>;
  setPieceAnimState: Dispatch<SetStateAction<PieceAnimState>>;
  setBubbleAnimState: Dispatch<SetStateAction<BubbleAnimState>>;
  setChargeState: Dispatch<SetStateAction<ChargeState>>;

  setLockRings: (rings: LockRing[]) => void;
  setTapeCellHighlights: Dispatch<SetStateAction<Map<string, TapeHighlight>>>;
  setVisualTrailOverride: Dispatch<SetStateAction<(number | null)[] | null>>;
  setVisualOutputOverride: Dispatch<SetStateAction<number[] | null>>;
  setCurrentPulseIndex: (i: number) => void;
  currentPulseRef: MutableRefObject<number>;

  animFrameRef: MutableRefObject<number | null>;
  flashTimersRef: MutableRefObject<ReturnType<typeof setTimeout>[]>;
  valueBubblePosRef: MutableRefObject<{ x: number; y: number } | null>;
  bubbleHistoryRef: MutableRefObject<Array<{ x: number; y: number }>>;
  bubbleTrailRAFRef: MutableRefObject<number | null>;
  bubbleAnimRAFRef: MutableRefObject<number | null>;

  boardGridRef: RefObject<View | null>;
  inputTapeCellsRef: RefObject<View | null>;
  dataTrailCellsRef: RefObject<View | null>;
  outputTapeCellsRef: RefObject<View | null>;

  loopingRef: MutableRefObject<boolean>;
  wires: WireRef[];

  inputTape?: number[];

  cacheRef: MutableRefObject<MeasurementCache>;
}

export type { ExecutionStep, PlacedPiece, PieceType };
