import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PieceType } from '../game/types';
import { getPieceCost } from '../game/types';
import type { Discipline } from './playerStore';

interface EconomyState {
  credits: number;
  levelBudget: number;
  levelSpent: number;

  setLevelBudget: (amount: number) => void;
  spendCredits: (pieceType: PieceType, discipline: Discipline) => boolean;
  earnCredits: (amount: number) => void;
  resetLevelBudget: () => void;
  spendDirect: (amount: number) => boolean;
  hydrate: () => Promise<void>;
}

// ─── Persistence (AXM-039) ───────────────────────────────────────────────────
// Only `credits` is persisted. levelBudget and levelSpent are per-level and
// never written. Writes start only after hydrate() has read the stored value,
// so a default balance can never overwrite a saved one on a slow launch.

export const ECONOMY_CREDITS_KEY = 'axiom_economy_credits';

let hydrated = false;

function parseStoredCredits(raw: string | null): number | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isSafeInteger(n) ? n : null;
}

function writeCredits(credits: number): void {
  AsyncStorage.setItem(ECONOMY_CREDITS_KEY, String(credits)).catch(() => {});
}

export const useEconomyStore = create<EconomyState>((set, get) => ({
  credits: 100,
  levelBudget: 0,
  levelSpent: 0,

  setLevelBudget: (amount) => {
    set({ levelBudget: amount, levelSpent: 0 });
  },

  spendCredits: (pieceType, discipline) => {
    const cost = getPieceCost(pieceType, discipline);
    if (cost === 0) return true;

    const { levelBudget, levelSpent, credits } = get();
    const budgetRemaining = levelBudget - levelSpent;

    if (budgetRemaining >= cost) {
      set({ levelSpent: levelSpent + cost });
      return true;
    }

    const fromBudget = budgetRemaining;
    const fromCredits = cost - fromBudget;
    if (credits >= fromCredits) {
      set({
        levelSpent: levelSpent + fromBudget,
        credits: credits - fromCredits,
      });
      return true;
    }

    return false;
  },

  earnCredits: (amount) => {
    if (amount <= 0) return;
    set(s => ({ credits: s.credits + amount }));
  },

  resetLevelBudget: () => {
    set({ levelBudget: 0, levelSpent: 0 });
  },

  spendDirect: (amount) => {
    const state = get();
    if (state.credits < amount) return false;
    set({ credits: state.credits - amount });
    return true;
  },

  hydrate: async () => {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(ECONOMY_CREDITS_KEY);
    } catch {
      // Storage unreadable: defaults stand, and write-through stays off so a
      // default can never replace a saved balance we failed to read.
      return;
    }
    const stored = parseStoredCredits(raw);
    if (stored !== null) set({ credits: stored });
    hydrated = true;
    writeCredits(get().credits);
  },
}));

// Write-through: every credits change after hydrate, by any path (actions or
// setState, including the Settings dev tools), is written to storage.
useEconomyStore.subscribe((state, prev) => {
  if (!hydrated || state.credits === prev.credits) return;
  writeCredits(state.credits);
});
