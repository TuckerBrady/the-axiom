// AXM-013 — placement rules shared by every sector's PieceTray.
import { useRequisitionStore, type GameplayPhase } from '../store/requisitionStore';
import { nextPlacementIndex } from '../components/gameplay/trayGrouping';
import type { PieceType } from './types';

// The tray is mounted for the whole Axiom level, and for the whole Kepler+
// placement phase. It never coexists with the REQUISITION store, and nothing
// can be bought mid-level. One element, one host (REQ-A-1/A-2): callers vary
// its props, never swap it for a second tray.
export function shouldMountTray({
  isAxiomLevel,
  phase,
}: {
  isAxiomLevel: boolean;
  phase: GameplayPhase;
}): boolean {
  return isAxiomLevel || phase === 'placement';
}

// Kepler+ placement consumes an inventory instance (requisitioned first).
// Credits were spent in the REQUISITION store, so this never touches the
// economy store. Returns false when no instance of the type is left.
export function placeFromKeplerInventory(type: PieceType): boolean {
  const store = useRequisitionStore.getState();
  if (nextPlacementIndex(store.inventory.pieces, type) === -1) return false;
  store.placeInventoryPiece(type);
  return true;
}
