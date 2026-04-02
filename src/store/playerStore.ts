import { create } from 'zustand';

export type Discipline = 'architect' | 'engineer' | 'operative' | null;

interface PlayerState {
  name: string;
  discipline: Discipline;
  setName: (name: string) => void;
  setDiscipline: (d: Discipline) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  name: '',
  discipline: null,
  setName: (name) => set({ name }),
  setDiscipline: (discipline) => set({ discipline }),
}));
