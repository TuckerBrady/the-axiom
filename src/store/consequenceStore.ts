import { create } from 'zustand';
import type { NarrativeConsequence, CreditTransaction, MechanicalEffect } from '../game/types';
import { useEconomyStore } from './economyStore';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsequenceState {
  activeConsequences: NarrativeConsequence[];
  damagedSystems: string[];  // ShipSystem ids currently damaged by consequences
  cogsIntegrity: number;     // 0-100, starts at 100
  creditHistory: CreditTransaction[];
  acknowledgedEffects: string[]; // narrative effect descriptions player has dismissed

  // Actions
  applyConsequence: (consequence: NarrativeConsequence) => void;
  resolveConsequence: (id: string) => void;
  repairSystem: (system: string) => void;
  setCOGSIntegrity: (value: number) => void;
  logCreditTransaction: (amount: number, reason: string) => void;
  acknowledgeEffect: (description: string) => void;
  getActiveSectorModifiers: (sectorId: string) => NarrativeConsequence[];
  isDamaged: (system: string) => boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useConsequenceStore = create<ConsequenceState>((set, get) => ({
  activeConsequences: [],
  damagedSystems: [],
  cogsIntegrity: 100,
  creditHistory: [],
  acknowledgedEffects: [],

  applyConsequence: (consequence) => {
    const state = get();
    const newDamaged = [...state.damagedSystems];
    let newIntegrity = state.cogsIntegrity;

    for (const effect of consequence.mechanicalEffects) {
      switch (effect.type) {
        case 'damage_system':
          if (effect.system && !newDamaged.includes(effect.system)) {
            newDamaged.push(effect.system);
          }
          break;

        case 'steal_credits': {
          const economy = useEconomyStore.getState();
          const currentCredits = economy.credits;
          let stolen = 0;
          if (effect.creditPercent) {
            stolen = Math.round(currentCredits * effect.creditPercent);
            stolen = Math.max(50, Math.min(300, stolen));
          } else if (effect.creditAmount) {
            stolen = effect.creditAmount;
          }
          // Deduct from economy
          useEconomyStore.setState({ credits: Math.max(0, currentCredits - stolen) });
          get().logCreditTransaction(-stolen, 'Pirate boarding — credits seized');
          break;
        }

        case 'damage_cogs_integrity':
          if (effect.integrityAmount) {
            newIntegrity = Math.max(0, newIntegrity - effect.integrityAmount);
          }
          break;

        case 'lock_codex_entry':
        case 'add_modifier':
          // Stored in the consequence itself for later lookup
          break;
      }
    }

    set({
      activeConsequences: [...state.activeConsequences, consequence],
      damagedSystems: newDamaged,
      cogsIntegrity: newIntegrity,
    });
  },

  resolveConsequence: (id) => {
    set(s => ({
      activeConsequences: s.activeConsequences.filter(c => c.id !== id),
    }));
  },

  repairSystem: (system) => {
    set(s => ({
      damagedSystems: s.damagedSystems.filter(sys => sys !== system),
    }));
  },

  setCOGSIntegrity: (value) => {
    set({ cogsIntegrity: Math.max(0, Math.min(100, value)) });
  },

  logCreditTransaction: (amount, reason) => {
    set(s => ({
      creditHistory: [
        { amount, reason, timestamp: Date.now() },
        ...s.creditHistory,
      ].slice(0, 50), // keep last 50
    }));
  },

  acknowledgeEffect: (description) => {
    set(s => ({
      acknowledgedEffects: [...s.acknowledgedEffects, description],
    }));
  },

  getActiveSectorModifiers: (sectorId) => {
    return get().activeConsequences.filter(c => c.sectorId === sectorId);
  },

  isDamaged: (system) => {
    return get().damagedSystems.includes(system);
  },
}));
