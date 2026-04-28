import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Animated as RNAnimated } from 'react-native';
import type { PlacedPiece } from '../game/types';
import {
  BEAM_INITIAL,
  PIECE_ANIM_INITIAL,
  CHARGE_INITIAL,
  type BeamState,
  type PieceAnimState,
  type ChargeState,
  type MeasurementCache,
  type Pt,
} from '../game/engagement';

export interface PieceAnimProps {
  animType: string | undefined;
  gateResult: 'pass' | 'block' | null;
  failColor: string | null;
  flashColor: string | null;
  flashCounter: number;
}

export interface UseBeamEngineResult {
  // Render state
  beamState: BeamState;
  pieceAnimState: PieceAnimState;
  chargeState: ChargeState;
  lockRingCenter: Pt | null;
  voidBurstCenter: Pt | null;
  currentPulseIndex: number;
  flashColor: string | null;
  pieceAnimProps: Map<string, PieceAnimProps>;
  // Animated.Values (for BeamOverlay)
  beamOpacity: RNAnimated.Value;
  chargeProgressAnim: RNAnimated.Value;
  lockRingProgressAnim: RNAnimated.Value;
  voidPulseRingProgressAnim: RNAnimated.Value;
  // Refs (for EngagementContext)
  animFrameRef: React.MutableRefObject<Map<number | null, number | null>>;
  loopingRef: React.MutableRefObject<boolean>;
  flashTimersRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>;
  safetyTimersRef: React.MutableRefObject<ReturnType<typeof setTimeout>[]>;
  terminalSuccessCountRef: React.MutableRefObject<number>;
  currentPulseRef: React.MutableRefObject<number>;
  cacheRef: React.MutableRefObject<MeasurementCache>;
  runIdRef: React.MutableRefObject<number>;
  // Setters (for EngagementContext)
  setBeamState: Dispatch<SetStateAction<BeamState>>;
  setPieceAnimState: Dispatch<SetStateAction<PieceAnimState>>;
  setChargeState: Dispatch<SetStateAction<ChargeState>>;
  setLockRingCenter: Dispatch<SetStateAction<Pt | null>>;
  setVoidBurstCenter: Dispatch<SetStateAction<Pt | null>>;
  setCurrentPulseIndex: (i: number) => void;
  setFlashColor: Dispatch<SetStateAction<string | null>>;
  // Lifecycle
  cancelAllFrames: () => void;
  resetBeam: () => void;
}

export function useBeamEngine(
  machineStatePieces: PlacedPiece[],
): UseBeamEngineResult {
  const [beamState, setBeamState] = useState<BeamState>(BEAM_INITIAL);
  const [pieceAnimState, setPieceAnimState] = useState<PieceAnimState>(PIECE_ANIM_INITIAL);
  const [chargeState, setChargeState] = useState<ChargeState>(CHARGE_INITIAL);
  const [lockRingCenter, setLockRingCenter] = useState<Pt | null>(null);
  const [voidBurstCenter, setVoidBurstCenter] = useState<Pt | null>(null);
  const [currentPulseIndex, setCurrentPulseIndex] = useState(0);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // Native-driver Animated.Values — allocated once per mount, stable across re-renders.
  const beamOpacity = useRef(new RNAnimated.Value(1)).current;
  const chargeProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const lockRingProgressAnim = useRef(new RNAnimated.Value(0)).current;
  const voidPulseRingProgressAnim = useRef(new RNAnimated.Value(0)).current;

  // Per-slot RAF id Map (key null = main beam; 0/1 = Splitter branches).
  const animFrameRef = useRef<Map<number | null, number | null>>(new Map());
  const loopingRef = useRef(false);
  const flashTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Safety timers are a separate bucket from flashTimersRef so the per-pulse
  // sweep does not clear an in-flight 8s force-resume timer (Prompt 95, Fix 7).
  const safetyTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Counts pulses that reached Terminal successfully during handleEngage.
  const terminalSuccessCountRef = useRef(0);
  // Sync read of currentPulseIndex inside EngagementContext callbacks.
  const currentPulseRef = useRef(0);
  const cacheRef = useRef<MeasurementCache>({
    board: { x: 0, y: 0 },
    input: null,
    trail: null,
    output: null,
  });
  // Incremented at the start of each handleEngage call. Stale async callbacks
  // compare their captured runId against this ref and no-op on mismatch (A1-7 fix).
  const runIdRef = useRef(0);

  const cancelAllFrames = useCallback(() => {
    animFrameRef.current.forEach(id => { if (id != null) cancelAnimationFrame(id); });
    animFrameRef.current.clear();
    flashTimersRef.current.forEach(t => clearTimeout(t));
    flashTimersRef.current = [];
    safetyTimersRef.current.forEach(t => clearTimeout(t));
    safetyTimersRef.current = [];
    loopingRef.current = false;
  }, []);

  const resetBeam = useCallback(() => {
    cancelAllFrames();
    setBeamState(BEAM_INITIAL);
    setPieceAnimState(PIECE_ANIM_INITIAL);
    setChargeState(CHARGE_INITIAL);
    setLockRingCenter(null);
    setVoidBurstCenter(null);
    setFlashColor(null);
    chargeProgressAnim.setValue(0);
    lockRingProgressAnim.setValue(0);
    voidPulseRingProgressAnim.setValue(0);
    setCurrentPulseIndex(0);
    terminalSuccessCountRef.current = 0;
    currentPulseRef.current = 0;
    cacheRef.current = { board: { x: 0, y: 0 }, input: null, trail: null, output: null };
    beamOpacity.setValue(1);
  }, [cancelAllFrames, beamOpacity, chargeProgressAnim, lockRingProgressAnim, voidPulseRingProgressAnim]);

  const pieceAnimProps = useMemo(() => {
    const map = new Map<string, PieceAnimProps>();
    for (const piece of machineStatePieces) {
      map.set(piece.id, {
        animType: pieceAnimState.animations.get(piece.id),
        gateResult: pieceAnimState.gates.get(piece.id) ?? null,
        failColor: pieceAnimState.failColors.get(piece.id) ?? null,
        flashColor: pieceAnimState.flashing.get(piece.id) ?? null,
        flashCounter: pieceAnimState.flashCounter.get(piece.id) ?? 0,
      });
    }
    return map;
  }, [
    machineStatePieces,
    pieceAnimState.animations,
    pieceAnimState.gates,
    pieceAnimState.failColors,
    pieceAnimState.flashing,
    pieceAnimState.flashCounter,
  ]);

  return {
    beamState,
    pieceAnimState,
    chargeState,
    lockRingCenter,
    voidBurstCenter,
    currentPulseIndex,
    flashColor,
    pieceAnimProps,
    beamOpacity,
    chargeProgressAnim,
    lockRingProgressAnim,
    voidPulseRingProgressAnim,
    animFrameRef,
    loopingRef,
    flashTimersRef,
    safetyTimersRef,
    terminalSuccessCountRef,
    currentPulseRef,
    cacheRef,
    runIdRef,
    setBeamState,
    setPieceAnimState,
    setChargeState,
    setLockRingCenter,
    setVoidBurstCenter,
    setCurrentPulseIndex,
    setFlashColor,
    cancelAllFrames,
    resetBeam,
  };
}
