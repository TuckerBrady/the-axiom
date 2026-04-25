import type { Dispatch, SetStateAction, MutableRefObject, RefObject } from 'react';
import type { Animated, View } from 'react-native';
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

export type TapeHighlight =
  | 'read'
  | 'write'
  | 'gate-pass'
  | 'gate-block'
  | 'departing';

export type TapeIndicatorBarState = {
  inIndex: number | null;      // active cell index for IN tape bar
  trailIndex: number | null;   // active cell index for TRAIL tape bar
  outIndex: number | null;     // active cell index for OUT tape bar
};

export const TAPE_BAR_INITIAL: TapeIndicatorBarState = {
  inIndex: null,
  trailIndex: null,
  outIndex: null,
};

export type GlowTravelerState = {
  visible: boolean;
  value: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  phase: 'idle' | 'liftoff' | 'travel' | 'impact';
};

export const GLOW_TRAVELER_INITIAL: GlowTravelerState = {
  visible: false,
  value: '',
  fromX: 0,
  fromY: 0,
  toX: 0,
  toY: 0,
  phase: 'idle',
};

export interface ValueTravelRefs {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
}

export type GateOutcome = 'passed' | 'blocked';

export type GateOutcomeMap = Map<number, GateOutcome>;

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

export interface SpotlightBeam {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  value: string;
  opacity: number;
}

export interface SpotlightState {
  beam: SpotlightBeam | null;
}

export const SPOTLIGHT_INITIAL: SpotlightState = { beam: null };

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
  setSpotlightState: Dispatch<SetStateAction<SpotlightState>>;
  setChargeState: Dispatch<SetStateAction<ChargeState>>;

  setLockRings: (rings: LockRing[]) => void;
  setTapeCellHighlights: Dispatch<SetStateAction<Map<string, TapeHighlight>>>;
  setTapeBarState: Dispatch<SetStateAction<TapeIndicatorBarState>>;
  setGlowTravelerState: Dispatch<SetStateAction<GlowTravelerState>>;
  valueTravelRefs: ValueTravelRefs;
  gateOutcomes: MutableRefObject<GateOutcomeMap>;
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
