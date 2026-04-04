import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Discipline = 'systems' | 'drive' | 'field' | null;

// Map onboarding labels to scoring disciplines
export const DISCIPLINE_MAP: Record<string, Discipline> = {
  architect: 'systems',
  engineer: 'drive',
  operative: 'field',
};

export const DISCIPLINE_LABELS: Record<NonNullable<Discipline>, string> = {
  systems: 'Systems Architect',
  drive: 'Drive Engineer',
  field: 'Field Operative',
};

interface PlayerState {
  name: string;
  discipline: Discipline;
  setName: (name: string) => void;
  setDiscipline: (d: Discipline) => void;
  hydrate: () => Promise<void>;
}

const DISCIPLINE_KEY = 'axiom_discipline';

export const usePlayerStore = create<PlayerState>((set) => ({
  name: '',
  discipline: null,
  setName: (name) => set({ name }),
  setDiscipline: (discipline) => {
    set({ discipline });
    if (discipline) {
      AsyncStorage.setItem(DISCIPLINE_KEY, discipline);
    }
  },
  hydrate: async () => {
    const stored = await AsyncStorage.getItem(DISCIPLINE_KEY);
    if (stored === 'systems' || stored === 'drive' || stored === 'field') {
      set({ discipline: stored });
    }
  },
}));
