// Pure Arc Wheel grouping logic — no React Native imports, so it can be unit
// tested directly (the .tsx component is RN-bound and only source-inspected).
//
// The wheel groups the placement inventory by piece TYPE with a count, rather
// than rendering one node per instance (the pre-lift behavior: buying 8
// Conveyors produced 8 nodes to scroll past). `repId` keeps a representative
// instance id so the parent's instance-id select/drag contract is unchanged;
// placement is by type and decrements the count.

import type { PieceType } from '../../game/types';
import type { InventoryPiece } from '../../store/requisitionStore';

export interface ArcWheelPiece extends InventoryPiece {
  isTape?: boolean;
}

export interface Group {
  type: PieceType;
  count: number;
  repId: string;
  source: InventoryPiece['source'];
  isTape: boolean;
}

export function groupPieces(pieces: ArcWheelPiece[]): Group[] {
  const order: PieceType[] = [];
  const byType = new Map<PieceType, Group>();
  for (const p of pieces) {
    const existing = byType.get(p.type);
    if (existing) {
      existing.count += 1;
      // A requisitioned instance in the group reads as "purchased" (cyan).
      if (p.source === 'requisitioned') existing.source = 'requisitioned';
    } else {
      order.push(p.type);
      byType.set(p.type, {
        type: p.type,
        count: 1,
        repId: p.id,
        source: p.source,
        isTape: p.isTape ?? false,
      });
    }
  }
  // `pieces` arrives pre-sorted by arcWheelSortKey (category, then price), so
  // first-seen order already groups Physics → Protocol as intended.
  return order.map(t => byType.get(t)!);
}
