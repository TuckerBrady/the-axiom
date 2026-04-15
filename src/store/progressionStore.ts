import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

type LevelResult = {
  stars: number;
  completedAt: number;
};

interface ProgressionState {
  // Map of levelId → best result
  completedLevels: Record<string, LevelResult>;
  // Which sector is currently selected for LevelSelect
  activeSector: string;

  // Actions
  completeLevel: (levelId: string, stars: number) => boolean; // returns true if first-time
  isLevelCompleted: (levelId: string) => boolean;
  getLevelStars: (levelId: string) => number;
  getSectorCompletedCount: (sectorPrefix: string) => number;
  setActiveSector: (sector: string) => void;
  hydrate: () => Promise<void>;
}

// ─── Storage keys ────────────────────────────────────────────────────────────

const PROGRESSION_KEY = 'axiom_progression_completed';
const ACTIVE_SECTOR_KEY = 'axiom_progression_active_sector';

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProgressionStore = create<ProgressionState>((set, get) => ({
  completedLevels: {},
  activeSector: 'A1',

  completeLevel: (levelId, stars) => {
    const { completedLevels } = get();
    const existing = completedLevels[levelId];
    const isFirstTime = !existing;

    set({
      completedLevels: {
        ...completedLevels,
        [levelId]: {
          stars: Math.max(stars, existing?.stars ?? 0),
          completedAt: Date.now(),
        },
      },
    });

    AsyncStorage.setItem(PROGRESSION_KEY, JSON.stringify(get().completedLevels));

    return isFirstTime;
  },

  isLevelCompleted: (levelId) => {
    return !!get().completedLevels[levelId];
  },

  getLevelStars: (levelId) => {
    return get().completedLevels[levelId]?.stars ?? 0;
  },

  getSectorCompletedCount: (sectorPrefix) => {
    const { completedLevels } = get();
    return Object.keys(completedLevels).filter(id => id.startsWith(sectorPrefix)).length;
  },

  setActiveSector: (sector) => {
    set({ activeSector: sector });
    AsyncStorage.setItem(ACTIVE_SECTOR_KEY, sector);
  },

  hydrate: async () => {
    const [storedCompleted, storedSector] = await Promise.all([
      AsyncStorage.getItem(PROGRESSION_KEY),
      AsyncStorage.getItem(ACTIVE_SECTOR_KEY),
    ]);
    if (storedCompleted) {
      try {
        const parsed = JSON.parse(storedCompleted);
        if (parsed && typeof parsed === 'object') {
          set({ completedLevels: parsed });
        }
      } catch {
        // Corrupted or malformed storage — leave default empty map
      }
    }
    if (storedSector && typeof storedSector === 'string') {
      set({ activeSector: storedSector });
    }
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const AXIOM_SECTOR_PREFIX = 'A1-';
export const KEPLER_SECTOR_PREFIX = '2-';
export const AXIOM_TOTAL_LEVELS = 8;

export const SHIP_SYSTEMS = [
  'Emergency Power',
  'Life Support',
  'Navigation Array',
  'Propulsion Core',
  'Communication Array',
  'Sensor Grid',
  'Weapons Lock',
  'Bridge Systems',
] as const;
