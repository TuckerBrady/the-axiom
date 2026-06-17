// Pure grouping logic for the Arc Wheel, kept free of React Native / SVG
// imports so it can be unit-tested without a render environment.
import type { PieceType } from '../../game/types';
import type { InventoryPiece } from '../../store/requisitionStore';

export interface ArcWheelPiece extends InventoryPiece {
  isTape?: boolean;
}

// One node per piece TYPE rather than per instance — the wheel collapses
// duplicates into a single node carrying a count badge, mirroring the Axiom
// piece tray. Placement consumes by type, so a representative id is all the
// wheel needs to report for selection / drag.
export interface PieceGroup {
  key: string;
  type: PieceType;
  isTape: boolean;
  source: InventoryPiece['source'];
  count: number;
  repId: string;
}

export function groupArcWheelPieces(pieces: ArcWheelPiece[]): PieceGroup[] {
  const order: PieceGroup[] = [];
  const byKey = new Map<string, PieceGroup>();
  for (const p of pieces) {
    const isTape = p.isTape ?? false;
    const key = `${p.type}:${isTape ? 'tape' : 'piece'}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const g: PieceGroup = {
        key, type: p.type, isTape, source: p.source, count: 1, repId: p.id,
      };
      byKey.set(key, g);
      order.push(g);
    }
  }
  return order;
}
