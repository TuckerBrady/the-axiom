// Pure grouping, consume-order and filter logic for the PieceTray, kept free
// of React Native / SVG imports so it can be unit-tested without a render
// environment.
import type { PieceType } from '../../game/types';
import type { InventoryPiece } from '../../store/requisitionStore';
import { getRequisitionPieceCategory } from '../../game/piecePrices';

export interface TrayPiece extends InventoryPiece {
  isTape?: boolean;
}

// One tray item per piece TYPE rather than per instance — duplicates collapse
// into a single item carrying a count badge. Placement consumes by type, so a
// representative id is all the tray needs to report for selection / drag.
// AXM-013: the count is split by source so the Engineer can see what was
// bought and is still unspent (forfeited at level end).
export interface PieceGroup {
  key: string;
  type: PieceType;
  isTape: boolean;
  // Source of the instance that will be placed next (requisitioned first).
  source: InventoryPiece['source'];
  count: number;
  preAssignedCount: number;
  requisitionedCount: number;
  repId: string;
}

export function groupTrayPieces(pieces: TrayPiece[]): PieceGroup[] {
  const order: PieceGroup[] = [];
  const byKey = new Map<string, PieceGroup>();
  for (const p of pieces) {
    if (p.placed) continue;
    const isTape = p.isTape ?? false;
    const key = `${p.type}:${isTape ? 'tape' : 'piece'}`;
    let g = byKey.get(key);
    if (!g) {
      g = {
        key, type: p.type, isTape, source: p.source,
        count: 0, preAssignedCount: 0, requisitionedCount: 0, repId: p.id,
      };
      byKey.set(key, g);
      order.push(g);
    }
    g.count += 1;
    if (p.source === 'requisitioned') {
      // The first requisitioned instance becomes the representative: it is
      // the one placement will consume.
      if (g.requisitionedCount === 0) {
        g.repId = p.id;
        g.source = 'requisitioned';
      }
      g.requisitionedCount += 1;
    } else {
      g.preAssignedCount += 1;
    }
  }
  return order;
}

// ─── Consume order ───────────────────────────────────────────────────────────
// Pre-assigned and requisitioned instances are physically identical. Placing
// requisitioned ones first makes "unspent requisitioned" equal "bought and
// never needed", which is exactly what the forfeit rule should charge. Returns
// run the other way (pre-assigned first) so the invariant holds after any
// sequence of place / long-press-return.

function firstIndex(
  pieces: InventoryPiece[],
  type: PieceType,
  placed: boolean,
  preferred: InventoryPiece['source'],
): number {
  let fallback = -1;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.type !== type || p.placed !== placed) continue;
    if (p.source === preferred) return i;
    if (fallback === -1) fallback = i;
  }
  return fallback;
}

export function nextPlacementIndex(pieces: InventoryPiece[], type: PieceType): number {
  return firstIndex(pieces, type, false, 'requisitioned');
}

export function nextReturnIndex(pieces: InventoryPiece[], type: PieceType): number {
  return firstIndex(pieces, type, true, 'preAssigned');
}

// ─── Filter chips ────────────────────────────────────────────────────────────

// Chips appear only when the level's tray holds more than this many items.
export const FILTER_CHIP_THRESHOLD = 6;

export type TrayFilter = 'ALL' | 'PHYSICS' | 'PROTOCOL' | 'TAPES';

export interface TrayCategorised {
  type: PieceType;
  isTape: boolean;
}

export function shouldShowFilterChips(itemCount: number): boolean {
  return itemCount > FILTER_CHIP_THRESHOLD;
}

export function trayItemCategory(item: TrayCategorised): Exclude<TrayFilter, 'ALL'> | null {
  if (item.isTape) return 'TAPES';
  const cat = getRequisitionPieceCategory(item.type);
  if (cat === 'physics') return 'PHYSICS';
  if (cat === 'protocol') return 'PROTOCOL';
  return null;
}

export function trayFilterChips(items: TrayCategorised[]): TrayFilter[] {
  const chips: TrayFilter[] = ['ALL', 'PHYSICS', 'PROTOCOL'];
  if (items.some(i => i.isTape)) chips.push('TAPES');
  return chips;
}

export function applyTrayFilter<T extends TrayCategorised>(items: T[], filter: TrayFilter): T[] {
  if (filter === 'ALL') return items;
  return items.filter(i => trayItemCategory(i) === filter);
}
