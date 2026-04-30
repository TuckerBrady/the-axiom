import { create } from 'zustand';
import type { PieceType, LevelDefinition } from '../game/types';
import type { Discipline } from './playerStore';
import {
  PIECE_PRICES,
  PHYSICS_PIECE_TYPES,
  PROTOCOL_PIECE_TYPES,
  getRequisitionPrice,
  arcWheelSortKey,
  NIBBLE_PRICE,
} from '../game/piecePrices';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TapeType = 'TRAIL' | 'OUT';

export type RequisitionPurchase = {
  type: PieceType | 'TRAIL_TAPE' | 'OUT_TAPE';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type RequisitionState = {
  purchases: RequisitionPurchase[];
  totalSpend: number;
  creditBudget: number;
  confirmed: boolean;
};

export type InventoryPiece = {
  id: string;
  type: PieceType;
  source: 'preAssigned' | 'requisitioned';
  placed: boolean;
};

export type InventoryState = {
  pieces: InventoryPiece[];
  tapes: {
    in: boolean;
    trail: boolean;
    out: boolean;
  };
};

export type GameplayPhase = 'requisition' | 'transitioning' | 'placement';

// ─── Store interface ──────────────────────────────────────────────────────────

interface RequisitionStoreState {
  phase: GameplayPhase;
  requisition: RequisitionState;
  inventory: InventoryState;

  // Which inventory piece is currently selected on the Arc Wheel (null = none)
  selectedInventoryId: string | null;

  // Internal: level data needed during the requisition phase
  _availablePieceTypes: PieceType[];  // purchasable piece types for this level
  _discipline: Discipline;

  // Actions
  initRequisition: (level: LevelDefinition, discipline: Discipline) => void;
  initPlacementOnly: (level: LevelDefinition) => void;
  setPurchaseQuantity: (type: PieceType, quantity: number) => void;
  setPurchaseNibbles: (tapeType: TapeType, nibbles: number) => void;
  confirmRequisition: (spendCredits: (amount: number) => boolean) => boolean;
  beginTransition: () => void;
  beginPlacement: () => void;
  selectInventoryPiece: (id: string | null) => void;
  placeInventoryPiece: (type: PieceType) => void;
  unplaceInventoryPiece: (type: PieceType) => void;
  resetRequisition: () => void;

  // Computed selectors (exposed as methods for simplicity)
  getUnplacedPieces: () => InventoryPiece[];
  getPurchasedTapeTypes: () => string[];
  getTotalSpend: () => number;
  getBudgetRemaining: () => number;
  canAffordMore: (unitPrice: number) => boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let inventoryCounter = 0;
function newInventoryId(): string {
  return `inv-${++inventoryCounter}`;
}

function buildPieceTypesForLevel(level: LevelDefinition): PieceType[] {
  // All physics and protocol types that have a price are candidates.
  // The store shows what the level makes available — currently all known
  // purchasable types (codex gating is applied at the UI layer).
  return [...PHYSICS_PIECE_TYPES, ...PROTOCOL_PIECE_TYPES].filter(
    pt => (PIECE_PRICES[pt] ?? 0) > 0 && !level.availablePieces.includes(pt),
  );
}

function buildInventoryFromLevel(
  level: LevelDefinition,
  purchases: RequisitionPurchase[],
): InventoryState {
  const pieces: InventoryPiece[] = [];

  // Pre-assigned pieces (one instance per entry in availablePieces)
  for (const type of level.availablePieces) {
    if (type === 'source' || type === 'terminal' || type === 'obstacle') continue;
    pieces.push({
      id: newInventoryId(),
      type,
      source: 'preAssigned',
      placed: false,
    });
  }

  // Requisitioned pieces
  for (const purchase of purchases) {
    if (purchase.type === 'TRAIL_TAPE' || purchase.type === 'OUT_TAPE') continue;
    for (let i = 0; i < purchase.quantity; i++) {
      pieces.push({
        id: newInventoryId(),
        type: purchase.type as PieceType,
        source: 'requisitioned',
        placed: false,
      });
    }
  }

  // Sort by Arc Wheel ordering (category first, price ascending)
  pieces.sort((a, b) => arcWheelSortKey(a.type) - arcWheelSortKey(b.type));

  const hasPurchasedTrail = purchases.some(p => p.type === 'TRAIL_TAPE' && p.quantity > 0);
  const hasPurchasedOut = purchases.some(p => p.type === 'OUT_TAPE' && p.quantity > 0);
  const freeTapes = level.freeTapes ?? ['IN'];

  return {
    pieces,
    tapes: {
      in: true,
      trail: freeTapes.includes('TRAIL') || hasPurchasedTrail,
      out: freeTapes.includes('OUT') || hasPurchasedOut,
    },
  };
}

const EMPTY_REQUISITION: RequisitionState = {
  purchases: [],
  totalSpend: 0,
  creditBudget: 0,
  confirmed: false,
};

const EMPTY_INVENTORY: InventoryState = {
  pieces: [],
  tapes: { in: true, trail: false, out: false },
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRequisitionStore = create<RequisitionStoreState>((set, get) => ({
  phase: 'requisition',
  requisition: { ...EMPTY_REQUISITION },
  inventory: { ...EMPTY_INVENTORY },
  selectedInventoryId: null,
  _availablePieceTypes: [],
  _discipline: null,

  initRequisition: (level, discipline) => {
    const creditBudget = level.creditBudget ?? 0;
    const purchasable = buildPieceTypesForLevel(level);
    set({
      phase: creditBudget > 0 ? 'requisition' : 'placement',
      requisition: {
        purchases: [],
        totalSpend: 0,
        creditBudget,
        confirmed: creditBudget === 0,
      },
      inventory: creditBudget === 0
        ? buildInventoryFromLevel(level, [])
        : { ...EMPTY_INVENTORY },
      selectedInventoryId: null,
      _availablePieceTypes: purchasable,
      _discipline: discipline,
    });

    // For levels with no budget, build inventory immediately with just pre-assigned
    if (creditBudget === 0) {
      set({ inventory: buildInventoryFromLevel(level, []) });
    }
  },

  initPlacementOnly: (level) => {
    set({
      phase: 'placement',
      requisition: { ...EMPTY_REQUISITION, confirmed: true },
      inventory: buildInventoryFromLevel(level, []),
      selectedInventoryId: null,
    });
  },

  setPurchaseQuantity: (type, quantity) => {
    const { requisition, _discipline } = get();
    const unitPrice = getRequisitionPrice(type, _discipline);
    const existingPurchases = requisition.purchases.filter(p => p.type !== type);
    const newPurchases = quantity > 0
      ? [...existingPurchases, { type, quantity, unitPrice, totalPrice: unitPrice * quantity }]
      : existingPurchases;
    const totalSpend = newPurchases.reduce((s, p) => s + p.totalPrice, 0);
    set({
      requisition: { ...requisition, purchases: newPurchases, totalSpend },
    });
  },

  setPurchaseNibbles: (tapeType, nibbles) => {
    const { requisition } = get();
    const storeType = tapeType === 'TRAIL' ? 'TRAIL_TAPE' : 'OUT_TAPE';
    const existingPurchases = requisition.purchases.filter(p => p.type !== storeType);
    const newPurchases = nibbles > 0
      ? [...existingPurchases, {
          type: storeType as 'TRAIL_TAPE' | 'OUT_TAPE',
          quantity: nibbles,
          unitPrice: NIBBLE_PRICE,
          totalPrice: NIBBLE_PRICE * nibbles,
        }]
      : existingPurchases;
    const totalSpend = newPurchases.reduce((s, p) => s + p.totalPrice, 0);
    set({
      requisition: { ...requisition, purchases: newPurchases, totalSpend },
    });
  },

  confirmRequisition: (spendCredits) => {
    const { requisition, phase } = get();
    if (phase !== 'requisition') return false;
    if (requisition.totalSpend > 0 && !spendCredits(requisition.totalSpend)) {
      return false;
    }
    set({
      requisition: { ...requisition, confirmed: true },
    });
    return true;
  },

  beginTransition: () => {
    set({ phase: 'transitioning' });
  },

  beginPlacement: () => {
    const { requisition } = get();
    // Build inventory is deferred until now so we have the confirmed purchases
    // Access current level via a closure — caller must pass it in if needed.
    // For now, inventory is built during confirmRequisition via the level ref.
    set({ phase: 'placement' });
  },

  selectInventoryPiece: (id) => {
    set({ selectedInventoryId: id });
  },

  placeInventoryPiece: (type) => {
    const { inventory } = get();
    const idx = inventory.pieces.findIndex(p => p.type === type && !p.placed);
    if (idx === -1) return;
    const pieces = [...inventory.pieces];
    pieces[idx] = { ...pieces[idx], placed: true };
    set({ inventory: { ...inventory, pieces }, selectedInventoryId: null });
  },

  unplaceInventoryPiece: (type) => {
    const { inventory } = get();
    const idx = inventory.pieces.findIndex(p => p.type === type && p.placed);
    if (idx === -1) return;
    const pieces = [...inventory.pieces];
    pieces[idx] = { ...pieces[idx], placed: false };
    set({ inventory: { ...inventory, pieces } });
  },

  resetRequisition: () => {
    set({
      phase: 'requisition',
      requisition: { ...EMPTY_REQUISITION },
      inventory: { ...EMPTY_INVENTORY },
      selectedInventoryId: null,
    });
  },

  getUnplacedPieces: () => {
    return get().inventory.pieces.filter(p => !p.placed);
  },

  getPurchasedTapeTypes: () => {
    const { requisition, inventory } = get();
    const result: string[] = [];
    if (requisition.purchases.some(p => p.type === 'TRAIL_TAPE' && p.quantity > 0) && inventory.tapes.trail) {
      result.push('TRAIL');
    }
    if (requisition.purchases.some(p => p.type === 'OUT_TAPE' && p.quantity > 0) && inventory.tapes.out) {
      result.push('OUT');
    }
    return result;
  },

  getTotalSpend: () => get().requisition.totalSpend,

  getBudgetRemaining: () => {
    const { requisition } = get();
    return requisition.creditBudget - requisition.totalSpend;
  },

  canAffordMore: (unitPrice) => {
    return get().getBudgetRemaining() >= unitPrice;
  },
}));

// ─── Accessor for the level build (called externally with level context) ─────

export function buildInventoryForLevel(level: LevelDefinition, purchases: RequisitionPurchase[]): InventoryState {
  return buildInventoryFromLevel(level, purchases);
}
