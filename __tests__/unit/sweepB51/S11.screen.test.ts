// SWEEP-B51 S11 (AXM-040): DailyRewardScreen derives its streak day from
// the stored streak, not from the day of the year. Source-structure checks,
// read as UTF-8.

import * as fs from 'fs';
import * as path from 'path';

const src = fs
  .readFileSync(path.resolve(__dirname, '../../../src/screens/DailyRewardScreen.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

function handleCollectBody(): string {
  const start = src.indexOf('const handleCollect = async () => {');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('\n  };\n', start);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('SWEEP-B51 S11: DailyRewardScreen streak wiring', () => {
  test('[S11-2] DailyRewardScreen derives streakDay from nextStreakDay and writes DAILY_STREAK_KEY on collect', () => {
    expect(src).toMatch(/import\s*\{[^}]*\bnextStreakDay\b[^}]*\}\s*from\s*'\.\.\/game\/dailyStreak'/);
    expect(src).toMatch(/import\s*\{[^}]*\bDAILY_STREAK_KEY\b[^}]*\}\s*from\s*'\.\.\/game\/dailyStreak'/);
    // Both keys are read on mount.
    expect(src).toMatch(/AsyncStorage\.getItem\(DAILY_REWARD_KEY\)/);
    expect(src).toMatch(/AsyncStorage\.getItem\(DAILY_STREAK_KEY\)/);
    expect(src).toMatch(/nextStreakDay\(/);
    // Until both reads settle, neither the reward card nor COLLECT is live.
    expect(src).toMatch(/<Animated\.View\s+style=\{\[s\.rewardPod, rewardStyle\]\}\s+pointerEvents=\{streakLoaded \? 'auto' : 'none'\}/);
    expect(src).toMatch(/label="COLLECT"[\s\S]{0,120}disabled=\{!streakLoaded\}/);
    const collect = handleCollectBody();
    expect(collect).toMatch(/if \(!streakLoaded\) return;/);
    expect(collect).toMatch(/AsyncStorage\.setItem\(DAILY_REWARD_KEY,\s*getTodayString\(\)\)/);
    expect(collect).toMatch(/AsyncStorage\.setItem\(DAILY_STREAK_KEY,\s*String\(streakDay\)\)/);
  });

  test('[S11-2] the day-of-year derivation is gone', () => {
    expect(src).not.toMatch(/dayOfYear/);
    expect(src).not.toMatch(/getFullYear\(\), 0, 0/);
    expect(src).not.toMatch(/% 7\) \+ 1/);
  });

  test('[S11-3] the calendar labels are day numbers', () => {
    expect(src).not.toMatch(/DAY_NAMES/);
    expect(src).not.toMatch(/\['M', 'T', 'W', 'T', 'F', 'S', 'S'\]/);
    expect(src).toMatch(/<Text style=\{\[s\.calendarDayLabel, isFuture && \{ color: Colors\.dim \}\]\}>\s*\{dayNum\}\s*<\/Text>/);
    // Reward table and "Day N of 7" unchanged.
    expect(src).toContain('<Text style={s.subtitle}>Day {streakDay} of 7</Text>');
    expect(src).toContain("{ day: 7, type: 'combo', label: '150 CR + 1 Hint', amount: '150+1', cogsLine: 'Seven days. That is either dedication or habit. Either is acceptable.' },");
  });
});
