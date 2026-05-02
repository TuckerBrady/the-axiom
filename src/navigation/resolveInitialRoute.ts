// Pure decision logic for the launch route. Lives in its own file so
// unit tests can import it without dragging in React Native screens.
//
// Priority: Boot (onboarding) > DailyReward (once per calendar day) >
// ReturnBrief (returning session) > Tabs.
//
// Daily Transmission MUST take priority over ReturnBrief — otherwise
// every launch after the first session-tracking write permanently
// suppresses it (the bug Tucker hit).
//
// The DAILY_REWARD_KEY is intentionally NOT written here.
// DailyRewardScreen writes it on collect, so an aborted launch never
// silently consumes the day's reward.

export const ONBOARDING_KEY = '@axiom_onboarding_complete';
export const DAILY_REWARD_KEY = '@axiom_last_daily_reward_date';
export const SESSION_KEY = 'axiom_last_session';

export type InitialRouteResolution =
  | { route: 'Boot' }
  | { route: 'DailyReward'; fromReturningSession: boolean }
  | { route: 'ReturnBrief' }
  | { route: 'Tabs' };

export type StorageReader = {
  getItem: (key: string) => Promise<string | null>;
};

export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function resolveInitialRoute(
  storage: StorageReader,
  today: string = getTodayString(),
): Promise<InitialRouteResolution> {
  const onboarded = await storage.getItem(ONBOARDING_KEY);
  if (onboarded !== 'true') return { route: 'Boot' };

  const lastSession = await storage.getItem(SESSION_KEY);
  const lastReward = await storage.getItem(DAILY_REWARD_KEY);
  const needsReward = lastReward !== today;

  if (needsReward) {
    return { route: 'DailyReward', fromReturningSession: !!lastSession };
  }
  if (lastSession) return { route: 'ReturnBrief' };
  return { route: 'Tabs' };
}
