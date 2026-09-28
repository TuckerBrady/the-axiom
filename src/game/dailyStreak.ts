// SWEEP-B51 S11 (AXM-040): Daily Transmission streak.
//
// The streak day is earned, not read off the calendar: collecting on the day
// after the last collect advances it (7 wraps to 1); anything else, a missed
// day, a first collect, or a stored value that makes no sense, starts at 1.
// Dates are local-calendar `YYYY-MM-DD` strings, the same form
// DailyRewardScreen and resolveInitialRoute write for DAILY_REWARD_KEY.

export const DAILY_STREAK_KEY = '@axiom_daily_streak_day';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// The local-calendar day before `today`. Month and year rollover, and leap
// years, come from Date's own arithmetic. A string that is not `YYYY-MM-DD`
// gives '' (which never equals a stored date).
export function yesterdayOf(today: string): string {
  const m = DATE_RE.exec(today);
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nextStreakDay(
  lastDate: string | null,
  lastStreakDay: number | null,
  today: string,
): number {
  const consecutive = lastDate !== null && lastDate !== '' && lastDate === yesterdayOf(today);
  const validDay =
    lastStreakDay !== null &&
    Number.isInteger(lastStreakDay) &&
    lastStreakDay >= 1 &&
    lastStreakDay <= 7;
  if (consecutive && validDay) return (lastStreakDay as number) % 7 + 1;
  return 1;
}
