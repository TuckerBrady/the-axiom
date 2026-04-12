import { create } from 'zustand';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_LIVES = 5;
const REGEN_MS = 30 * 60 * 1000; // 30 minutes per life
const REFILL_COST_CR = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

interface LivesState {
  lives: number;
  lastLifeLostAt: number | null;
  credits: number;

  // Actions
  loseLife: () => void;
  refillLives: () => boolean; // returns false if insufficient credits
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean; // returns false if insufficient
  regenerate: () => void; // call on app foreground

  // Legacy aliases (transitional — will be removed)
  circuits: number;
  cogs: number;
  addCircuits: (amount: number) => void;
  addCogs: (amount: number) => void;
  spendCogs: (amount: number) => boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useLivesStore = create<LivesState>((set, get) => ({
  lives: MAX_LIVES,
  lastLifeLostAt: null,
  credits: 500,

  loseLife: () => {
    const { lives } = get();
    if (lives <= 0) return;
    set({
      lives: lives - 1,
      lastLifeLostAt: Date.now(),
    });
  },

  refillLives: () => {
    const { credits } = get();
    if (credits < REFILL_COST_CR) return false;
    set({
      lives: MAX_LIVES,
      credits: credits - REFILL_COST_CR,
      lastLifeLostAt: null,
    });
    return true;
  },

  addCredits: (amount) => {
    set(s => ({ credits: s.credits + amount }));
  },

  spendCredits: (amount) => {
    const { credits } = get();
    if (credits < amount) return false;
    set({ credits: credits - amount });
    return true;
  },

  regenerate: () => {
    const { lives, lastLifeLostAt } = get();
    if (lives >= MAX_LIVES || !lastLifeLostAt) return;
    const elapsed = Date.now() - lastLifeLostAt;
    const livesGained = Math.floor(elapsed / REGEN_MS);
    if (livesGained <= 0) return;
    const newLives = Math.min(lives + livesGained, MAX_LIVES);
    set({
      lives: newLives,
      lastLifeLostAt: newLives >= MAX_LIVES ? null : lastLifeLostAt + livesGained * REGEN_MS,
    });
  },

  // Legacy aliases — point to credits
  get circuits() { return get().credits; },
  get cogs() { return get().credits; },
  addCircuits: (amount) => { get().addCredits(amount); },
  addCogs: (amount) => { get().addCredits(amount); },
  spendCogs: (amount) => { return get().spendCredits(amount); },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const MAX_LIVES_COUNT = MAX_LIVES;
export const REGEN_INTERVAL_MS = REGEN_MS;
export const REFILL_COST = REFILL_COST_CR;
