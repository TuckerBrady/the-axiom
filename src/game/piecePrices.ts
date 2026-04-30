import type { PieceType } from './types';
import type { Discipline } from '../store/playerStore';

// ─── REQUISITION store pricing ────────────────────────────────────────────────
// These are the prices shown in the pre-game REQUISITION store for Kepler+
// levels. They are distinct from PIECE_COSTS (the Axiom tutorial placement
// costs). Both systems coexist; Axiom uses PIECE_COSTS, Kepler uses these.

export const PIECE_PRICES: Partial<Record<PieceType, number>> = {
  conveyor:    10,
  gear:        10,
  splitter:    15,
  merger:      15,
  bridge:      20,
  configNode:  20,
  scanner:     20,
  transmitter: 20,
  inverter:    25,
  counter:     25,
  latch:       25,
};

export const NIBBLE_PRICE = 20;
export const CELLS_PER_NIBBLE = 4;

const IN_CATEGORY_DISCOUNT = 0.20;
const FIELD_DISCOUNT = 0.10;

export const PHYSICS_PIECE_TYPES: PieceType[] = [
  'conveyor', 'gear', 'splitter', 'merger', 'bridge',
];

export const PROTOCOL_PIECE_TYPES: PieceType[] = [
  'configNode', 'scanner', 'transmitter', 'inverter', 'counter', 'latch',
];

export function getRequisitionPieceCategory(type: PieceType): 'physics' | 'protocol' | 'other' {
  if (PHYSICS_PIECE_TYPES.includes(type)) return 'physics';
  if (PROTOCOL_PIECE_TYPES.includes(type)) return 'protocol';
  return 'other';
}

export function getRequisitionPrice(
  type: PieceType,
  discipline: Discipline,
): number {
  const base = PIECE_PRICES[type] ?? 0;
  if (base === 0) return 0;
  const cat = getRequisitionPieceCategory(type);
  if (discipline === 'systems' && cat === 'protocol') {
    return Math.round(base * (1 - IN_CATEGORY_DISCOUNT));
  }
  if (discipline === 'drive' && cat === 'physics') {
    return Math.round(base * (1 - IN_CATEGORY_DISCOUNT));
  }
  if (discipline === 'field') {
    return Math.round(base * (1 - FIELD_DISCOUNT));
  }
  return base;
}

export function hasRequisitionDiscount(type: PieceType, discipline: Discipline): boolean {
  return getRequisitionPrice(type, discipline) < (PIECE_PRICES[type] ?? 0);
}

// Piece ordering for the Arc Wheel: Physics first, Protocol second, Data (tapes) third.
// Within category, price ascending.
export function arcWheelSortKey(type: PieceType): number {
  const cat = getRequisitionPieceCategory(type);
  const catOffset = cat === 'physics' ? 0 : cat === 'protocol' ? 1000 : 2000;
  return catOffset + (PIECE_PRICES[type] ?? 0);
}
