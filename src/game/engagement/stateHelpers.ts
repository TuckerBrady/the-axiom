import type { Dispatch, SetStateAction } from 'react';
import type {
  BeamState,
  PieceAnimState,
  ChargeState,
  Pt,
  VoidPulseState,
  SignalPhase,
} from './types';

// ── Beam state helpers ──

export function setBeamHeads(
  setter: Dispatch<SetStateAction<BeamState>>,
  heads: Pt[],
): void {
  setter(prev => ({ ...prev, heads }));
}

export function setBeamHeadColor(
  setter: Dispatch<SetStateAction<BeamState>>,
  headColor: string,
): void {
  setter(prev => ({ ...prev, headColor }));
}

export function setTrailSegments(
  setter: Dispatch<SetStateAction<BeamState>>,
  trails: { points: Pt[]; color: string }[],
): void {
  setter(prev => ({ ...prev, trails }));
}

export function setBranchTrails(
  setter: Dispatch<SetStateAction<BeamState>>,
  branchTrails: { points: Pt[]; color: string }[][],
): void {
  setter(prev => ({ ...prev, branchTrails }));
}

export function setVoidPulse(
  setter: Dispatch<SetStateAction<BeamState>>,
  voidPulse: VoidPulseState,
): void {
  setter(prev => ({ ...prev, voidPulse }));
}

export function setSignalPhase(
  setter: Dispatch<SetStateAction<BeamState>>,
  phase: SignalPhase,
): void {
  setter(prev => ({ ...prev, phase }));
}

export function updateLitWires(
  setter: Dispatch<SetStateAction<BeamState>>,
  updater: (prev: Set<string>) => Set<string>,
): void {
  setter(prev => ({ ...prev, litWires: updater(prev.litWires) }));
}

// ── Piece anim state helpers ──

export function updateFlashingPieces(
  setter: Dispatch<SetStateAction<PieceAnimState>>,
  updater: (prev: Map<string, string>) => Map<string, string>,
): void {
  setter(prev => ({ ...prev, flashing: updater(prev.flashing) }));
}

export function updateActiveAnimations(
  setter: Dispatch<SetStateAction<PieceAnimState>>,
  updater: (prev: Map<string, string>) => Map<string, string>,
): void {
  setter(prev => ({ ...prev, animations: updater(prev.animations) }));
}

export function updateGateResults(
  setter: Dispatch<SetStateAction<PieceAnimState>>,
  updater: (prev: Map<string, 'pass' | 'block'>) => Map<string, 'pass' | 'block'>,
): void {
  setter(prev => ({ ...prev, gates: updater(prev.gates) }));
}

export function updateFailColors(
  setter: Dispatch<SetStateAction<PieceAnimState>>,
  updater: (prev: Map<string, string>) => Map<string, string>,
): void {
  setter(prev => ({ ...prev, failColors: updater(prev.failColors) }));
}

export function setLockedPieces(
  setter: Dispatch<SetStateAction<PieceAnimState>>,
  locked: Set<string>,
): void {
  setter(prev => ({ ...prev, locked }));
}

// ── Charge state helpers ──

export function setChargePos(
  setter: Dispatch<SetStateAction<ChargeState>>,
  pos: Pt | null,
): void {
  setter(prev => ({ ...prev, pos }));
}

export function setChargeProgress(
  setter: Dispatch<SetStateAction<ChargeState>>,
  progress: number,
): void {
  setter(prev => ({ ...prev, progress }));
}
