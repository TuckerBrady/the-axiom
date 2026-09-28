export {
  buildSignalPath,
  posAlongPath,
  easeOut3,
  getBeamColor,
  animMap,
  TAPE_PIECE_COLORS,
  BEAM_MS_PER_CELL,
  SHIMMER_PERIOD_MS,
  DATA_GLOW_WIDTH_MULT,
  DATA_GLOW_OPACITY_MAX,
  DATA_TRAIL_OPACITY_MIN_FACTOR,
  shimmer,
} from './constants';
export {
  flashPiece,
  setHighlight,
  clearAllHighlights,
  wait,
} from './bubbleHelpers';
export {
  runScannerInteraction,
  runConfigNodeInteraction,
  runTransmitterInteraction,
  triggerPieceAnim,
} from './interactions';
export { runLinearPath, runPulse } from './beamAnimation';
export { runChargePhase, runReplayChargePhase } from './chargePhase';
export { runLockPhase, runWrongOutputRings, runReplayLockPhase } from './lockPhase';
export { runReplayLoop } from './replayLoop';
export type { ReplayLoopParams } from './replayLoop';
export { handleSuccess } from './successHandlers';
export type { SuccessParams } from './successHandlers';
export { handleWrongOutput, handleVoidFailure } from './failureHandlers';
export type { WrongOutputParams, VoidFailureParams } from './failureHandlers';
export {
  detectTransmitterBeforeGateBlock,
  splitStepsByPulse,
  GATING_PIECE_TYPES,
  TRANSMITTER_BEFORE_GATE_COGS_LINES,
} from './transmitterPlacementDiagnostic';
export { detectTerminalWrongSide } from './terminalWrongSideDiagnostic';
export {
  classifyRunFailure,
  pulseWasGated,
  pulseChipRows,
  GATE_STEP_TYPES,
  PULSE_CHIP_SIZE,
  PULSE_CHIP_GAP,
  PULSE_CHIP_BLOCK_PAD,
} from './failureOutcome';
export type { FailureOutcome } from './failureOutcome';
export { detectGearJam, gearJamLine } from './gearJamDiagnostic';
export type { GearJamReason } from './gearJamDiagnostic';
export type {
  EngagementContext,
  Pt,
  Segment,
  SignalPath,
  AnimMapEntry,
  TapeHighlight,
  TapeIndicatorBarState,
  GlowTravelerState,
  GlowTravelerLayer,
  ValueTravelRefs,
  GateOutcome,
  GateOutcomeMap,
  VoidPulseState,
  LockRing,
  SignalPhase,
  WireRef,
  MeasurementCache,
  BeamState,
  PieceAnimState,
  ChargeState,
  ExecutionStep,
  PlacedPiece,
  PieceType,
} from './types';
export {
  BEAM_INITIAL,
  PIECE_ANIM_INITIAL,
  CHARGE_INITIAL,
  TAPE_BAR_INITIAL,
  GLOW_TRAVELER_INITIAL,
} from './types';
export { runValueTravel, resetGlowTraveler } from './valueTravelAnimation';
export * as stateHelpers from './stateHelpers';
