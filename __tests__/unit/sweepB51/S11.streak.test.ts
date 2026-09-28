// SWEEP-B51 S11 (AXM-040): Daily Transmission, a real streak.
// The streak day used to come from the day of the year, so a save under an
// hour old could show "Day 4 of 7" with three past days ticked (smoke
// 141-relaunch.png). It now comes from the last collect date and day.

import {
  DAILY_STREAK_KEY,
  yesterdayOf,
  nextStreakDay,
} from '../../../src/game/dailyStreak';

describe('SWEEP-B51 S11: streak rule', () => {
  test('[S11-1] yesterdayOf handles month and year rollover', () => {
    expect(DAILY_STREAK_KEY).toBe('@axiom_daily_streak_day');
    expect(yesterdayOf('2026-09-27')).toBe('2026-09-26');
    expect(yesterdayOf('2026-10-01')).toBe('2026-09-30');
    expect(yesterdayOf('2026-03-01')).toBe('2026-02-28');
    expect(yesterdayOf('2028-03-01')).toBe('2028-02-29');
    expect(yesterdayOf('2027-01-01')).toBe('2026-12-31');
    expect(yesterdayOf('2026-01-10')).toBe('2026-01-09');
  });

  test('[S11-1] first collect is day 1', () => {
    expect(nextStreakDay(null, null, '2026-09-27')).toBe(1);
  });

  test('[S11-1] consecutive days advance and day 7 wraps to 1', () => {
    expect(nextStreakDay('2026-09-26', 1, '2026-09-27')).toBe(2);
    expect(nextStreakDay('2026-09-30', 3, '2026-10-01')).toBe(4);
    expect(nextStreakDay('2026-12-31', 6, '2027-01-01')).toBe(7);
    expect(nextStreakDay('2026-09-26', 7, '2026-09-27')).toBe(1);
  });

  test('[S11-1] a missed day resets to 1', () => {
    expect(nextStreakDay('2026-09-25', 3, '2026-09-27')).toBe(1);
    expect(nextStreakDay('2026-08-26', 5, '2026-09-27')).toBe(1);
    // Collected already today (no advance).
    expect(nextStreakDay('2026-09-27', 3, '2026-09-27')).toBe(1);
  });

  test('[S11-1] a stale or corrupt stored day resets to 1', () => {
    expect(nextStreakDay('2026-09-26', null, '2026-09-27')).toBe(1);
    expect(nextStreakDay('2026-09-26', 0, '2026-09-27')).toBe(1);
    expect(nextStreakDay('2026-09-26', 8, '2026-09-27')).toBe(1);
    expect(nextStreakDay('2026-09-26', -2, '2026-09-27')).toBe(1);
    expect(nextStreakDay('2026-09-26', 2.5, '2026-09-27')).toBe(1);
    expect(nextStreakDay('2026-09-26', Number.NaN, '2026-09-27')).toBe(1);
    expect(nextStreakDay('not-a-date', 3, '2026-09-27')).toBe(1);
    expect(nextStreakDay('', 3, '2026-09-27')).toBe(1);
  });
});
