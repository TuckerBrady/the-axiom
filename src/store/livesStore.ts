import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEconomyStore } from './economyStore';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_LIVES = 5;
const REGEN_MS = 30 * 60 * 1000; // 30 minutes per life
const REFILL_COST_CR = 30;

// ─── Types ───────────────────────────────────────────────────────────────────

// Lives only. Credits live in one ledger, useEconomyStore (AXM-039): the
// credit actions below delegate to it, so there is no second balance.
interface LivesState {
  lives: number;
  lastLifeLostAt: number | null;

  // Actions
  loseLife: () => void;
  refillLives: () => boolean; // returns false if insufficient credits
  addCredits: (amount: number) => void;
  spendCredits: (amount: number) => boolean; // returns false if insufficient
  regenerate: () => void; // call on app foreground
  hydrate: () => Promise<void>;

  // Legacy aliases (transitional — will be removed)
  circuits: number;
  cogs: number;
  addCircuits: (amount: number) => void;
  addCogs: (amount: number) => void;
  spendCogs: (amount: number) => boolean;
}

// ─── Persistence (AXM-039) ───────────────────────────────────────────────────
// { lives, lastLifeLostAt } is written on every change once hydrate() has
// read the stored value. Nothing is written before then.

export const LIVES_STATE_KEY = 'axiom_lives_state';

let hydrated = false;

type StoredLives = { lives: number; lastLifeLostAt: number | null };

function parseStoredLives(raw: string | null): StoredLives | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const { lives, lastLifeLostAt } = parsed as Record<string, unknown>;
  if (typeof lives !== 'number' || !Number.isInteger(lives) || lives < 0 || lives > MAX_LIVES) {
    return null;
  }
  if (lastLifeLostAt !== null && !(typeof lastLifeLostAt === 'number' && Number.isFinite(lastLifeLostAt))) {
    return null;
  }
  return { lives, lastLifeLostAt: lastLifeLostAt as number | null };
}

function writeLives(state: StoredLives): void {
  AsyncStorage.setItem(
    LIVES_STATE_KEY,
    JSON.stringify({ lives: state.lives, lastLifeLostAt: state.lastLifeLostAt }),
  ).catch(() => {});
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useLivesStore = create<LivesState>((set, get) => ({
  lives: MAX_LIVES,
  lastLifeLostAt: null,

  loseLife: () => {
    const { lives } = get();
    if (lives <= 0) return;
    set({
      lives: lives - 1,
      lastLifeLostAt: Date.now(),
    });
  },

  refillLives: () => {
    if (!useEconomyStore.getState().spendDirect(REFILL_COST_CR)) return false;
    set({
      lives: MAX_LIVES,
      lastLifeLostAt: null,
    });
    return true;
  },

  addCredits: (amount) => {
    useEconomyStore.getState().earnCredits(amount);
  },

  spendCredits: (amount) => {
    return useEconomyStore.getState().spendDirect(amount);
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

  hydrate: async () => {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(LIVES_STATE_KEY);
    } catch {
      // Storage unreadable: defaults stand and write-through stays off.
      return;
    }
    const stored = parseStoredLives(raw);
    if (stored) set(stored);
    hydrated = true;
    // Lives earned while the app was closed are granted on launch.
    get().regenerate();
    writeLives(get());
  },

  // Legacy aliases — point to the economy ledger
  get circuits() { return useEconomyStore.getState().credits; },
  get cogs() { return useEconomyStore.getState().credits; },
  addCircuits: (amount) => { get().addCredits(amount); },
  addCogs: (amount) => { get().addCredits(amount); },
  spendCogs: (amount) => { return get().spendCredits(amount); },
}));

// Write-through: every change to lives or lastLifeLostAt after hydrate, by
// any path (actions or setState, including the Settings dev tools).
useLivesStore.subscribe((state, prev) => {
  if (!hydrated) return;
  if (state.lives === prev.lives && state.lastLifeLostAt === prev.lastLifeLostAt) return;
  writeLives(state);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const MAX_LIVES_COUNT = MAX_LIVES;
export const REGEN_INTERVAL_MS = REGEN_MS;
export const REFILL_COST = REFILL_COST_CR;
