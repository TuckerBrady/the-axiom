import { create } from 'zustand';
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
}));
