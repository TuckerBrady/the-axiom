import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CODEX_DISCOVERY_KEY = 'axiom_codex_discovered';

// The set of codex piece IDs the player has personally encountered.
// On a fresh install this is empty. Each tutorial step that carries
// a `codexEntryId` marks that piece discovered when the player
// advances past the step. Pieces NOT in this set render as
// "CLASSIFIED" in the Codex grid (Prompt 92, Fix 8) — except in
// dev / testflight builds, where SHOW_DEV_TOOLS short-circuits the
// gating so testers see the full inventory regardless of progress.
interface CodexState {
  // Stored as a plain string array for JSON-friendliness; exposed as
  // a Set via getter for O(1) membership checks at call sites.
  discoveredIds: string[];
  isDiscovered: (pieceId: string) => boolean;
  markDiscovered: (pieceId: string) => void;
  hydrate: () => Promise<void>;
}

function persist(ids: string[]): void {
  AsyncStorage.setItem(CODEX_DISCOVERY_KEY, JSON.stringify(ids)).catch(
    () => {
      /* fire and forget — discovery is monotonic, retries are harmless */
    },
  );
}

export const useCodexStore = create<CodexState>((set, get) => ({
  discoveredIds: [],
  isDiscovered: (pieceId: string) => get().discoveredIds.includes(pieceId),
  markDiscovered: (pieceId: string) => {
    const current = get().discoveredIds;
    if (current.includes(pieceId)) return; // monotonic — never un-discover
    const next = [...current, pieceId];
    set({ discoveredIds: next });
    persist(next);
  },
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(CODEX_DISCOVERY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Defensive: filter to strings in case storage was tampered.
          const valid = parsed.filter(
            (x): x is string => typeof x === 'string',
          );
          set({ discoveredIds: valid });
        }
      }
    } catch {
      /* corrupted storage — keep empty default */
    }
  },
}));
