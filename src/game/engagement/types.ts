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

export interface EngagementContext {
  CELL_SIZE: number;

  getPieceCenter: (pieceId: string) => Pt | null;
  machineStatePieces: PlacedPiece[];

  setBeamHeads: (heads: Pt[]) => void;
  setBeamHeadColor: (color: string) => void;
  setTrailSegments: (segs: { points: Pt[]; color: string }[]) => void;
  setBranchTrails: (trails: { points: Pt[]; color: string }[][]) => void;
  setVoidPulse: (pulse: VoidPulseState) => void;
  setLitWires: Dispatch<SetStateAction<Set<string>>>;
  setFlashingPieces: Dispatch<SetStateAction<Map<string, string>>>;
  setActiveAnimations: Dispatch<SetStateAction<Map<string, string>>>;
  setGateResults: Dispatch<SetStateAction<Map<string, 'pass' | 'block'>>>;
  setFailColors: Dispatch<SetStateAction<Map<string, string>>>;
  setLockedPieces: (pieces: Set<string>) => void;

  setChargePos: (pos: Pt | null) => void;
  setChargeProgress: (p: number) => void;
  setSignalPhase: (phase: SignalPhase) => void;
  setLockRings: (rings: LockRing[]) => void;

  setValueBubble: (b: ValueBubbleState) => void;
  setBubbleTrail: (trail: BubbleTrailItem[]) => void;
  valueBubblePosRef: MutableRefObject<{ x: number; y: number } | null>;
  bubbleHistoryRef: MutableRefObject<Array<{ x: number; y: number }>>;
  bubbleTrailRAFRef: MutableRefObject<number | null>;

  setTapeCellHighlights: Dispatch<SetStateAction<Map<string, TapeHighlight>>>;
  setVisualTrailOverride: Dispatch<SetStateAction<(number | null)[] | null>>;
  setVisualOutputOverride: Dispatch<SetStateAction<number[] | null>>;
  setCurrentPulseIndex: (i: number) => void;
  currentPulseRef: MutableRefObject<number>;

  animFrameRef: MutableRefObject<number | null>;
  flashTimersRef: MutableRefObject<ReturnType<typeof setTimeout>[]>;

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
