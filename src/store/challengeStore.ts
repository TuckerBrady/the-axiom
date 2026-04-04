import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyChallenge, ChallengeRecord } from '../game/types';
import { generateDailyChallenge, getTodayDateString } from '../game/dailyChallenge';

const CHALLENGE_DATE_KEY = 'axiom_daily_challenge_last_date';
const CHALLENGE_ATTEMPTED_PREFIX = 'axiom_daily_challenge_';
const CHALLENGE_RESULT_PREFIX = 'axiom_daily_challenge_';

interface ChallengeState {
  currentChallenge: DailyChallenge | null;
  challengeStatus: 'available' | 'attempted' | 'completed' | 'declined';
  challengeHistory: ChallengeRecord[];
  currentStreak: number;
  bestStreak: number;
  totalEarned: number;

  // Actions
  loadOrGenerateChallenge: (pirateActive?: boolean) => Promise<void>;
  markAttempted: () => Promise<void>;
  recordResult: (record: ChallengeRecord) => void;
  declineChallenge: () => Promise<void>;
}

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  currentChallenge: null,
  challengeStatus: 'available',
  challengeHistory: [],
  currentStreak: 0,
  bestStreak: 0,
  totalEarned: 0,

  loadOrGenerateChallenge: async (pirateActive = false) => {
    const today = getTodayDateString();
    const lastDate = await AsyncStorage.getItem(CHALLENGE_DATE_KEY);

    if (lastDate === today && get().currentChallenge) {
      // Already loaded for today — check status
      const attempted = await AsyncStorage.getItem(`${CHALLENGE_ATTEMPTED_PREFIX}${today}_attempted`);
      const result = await AsyncStorage.getItem(`${CHALLENGE_RESULT_PREFIX}${today}_result`);
      if (result) {
        set({ challengeStatus: 'completed' });
      } else if (attempted) {
        set({ challengeStatus: 'attempted' });
      }
      return;
    }

    // Generate new challenge for today
    const challenge = generateDailyChallenge(today, pirateActive);
    await AsyncStorage.setItem(CHALLENGE_DATE_KEY, today);

    // Check if already attempted today (app restart case)
    const attempted = await AsyncStorage.getItem(`${CHALLENGE_ATTEMPTED_PREFIX}${today}_attempted`);
    const result = await AsyncStorage.getItem(`${CHALLENGE_RESULT_PREFIX}${today}_result`);

    let status: ChallengeState['challengeStatus'] = 'available';
    if (result) status = 'completed';
    else if (attempted) status = 'attempted';

    set({ currentChallenge: challenge, challengeStatus: status });
  },

  markAttempted: async () => {
    const today = getTodayDateString();
    await AsyncStorage.setItem(`${CHALLENGE_ATTEMPTED_PREFIX}${today}_attempted`, '1');
    set({ challengeStatus: 'attempted' });
  },

  recordResult: (record) => {
    const state = get();
    const history = [record, ...state.challengeHistory].slice(0, 30);
    let streak = state.currentStreak;
    let best = state.bestStreak;
    let earned = state.totalEarned;

    if (record.result === '3star') {
      streak += 1;
      best = Math.max(best, streak);
      earned += record.creditsEarned;
    } else {
      streak = 0;
    }

    // Persist result
    const today = getTodayDateString();
    AsyncStorage.setItem(`${CHALLENGE_RESULT_PREFIX}${today}_result`, record.result);
    if (record.result === '3star') {
      AsyncStorage.setItem(`${CHALLENGE_RESULT_PREFIX}${today}_reward_earned`, '1');
    }

    set({
      challengeHistory: history,
      currentStreak: streak,
      bestStreak: best,
      totalEarned: earned,
      challengeStatus: 'completed',
    });
  },

  declineChallenge: async () => {
    const today = getTodayDateString();
    await AsyncStorage.setItem(`${CHALLENGE_RESULT_PREFIX}${today}_result`, 'declined');
    set({ challengeStatus: 'declined' });
  },
}));

// ─── COGS streak lines ───────────────────────────────────────────────────────

export function getStreakCOGSLine(streak: number): string | null {
  if (streak === 3) return 'Three consecutive bounties completed. I am noting the consistency.';
  if (streak === 7) return 'Seven days. You are either dedicated or this has become a habit. Either is acceptable.';
  if (streak === 30) return 'Thirty days. I have recalibrated my assessment of your reliability upward. Significantly.';
  return null;
}
