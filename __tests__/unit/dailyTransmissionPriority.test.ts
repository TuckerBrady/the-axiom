// Daily Transmission priority bug — regression guards.
//
// Bug: in the original RootNavigator, the launch flow checked
// SESSION_KEY before DAILY_REWARD_KEY and routed returning sessions
// straight to ReturnBrief, so Tucker only saw the daily transmission
// once (on the very first session, before SESSION_KEY existed) and
// never again. The DAILY_REWARD_KEY was also written eagerly inside
// the navigator's decision branch, meaning every launch consumed the
// day's reward whether or not the screen actually rendered.
//
// Fix:
//  - DailyReward takes priority over ReturnBrief.
//  - DAILY_REWARD_KEY is written by DailyRewardScreen on collect, not
//    on entry.
//  - DailyRewardScreen receives a `fromReturningSession` param so it
//    can route to ReturnBrief (for returning users) or Tabs (for
//    fresh sessions) after the user collects.

import * as fs from 'fs';
import * as path from 'path';
import {
  resolveInitialRoute,
  ONBOARDING_KEY,
  DAILY_REWARD_KEY,
  SESSION_KEY,
  getTodayString,
} from '../../src/navigation/resolveInitialRoute';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

function makeStore(initial: Record<string, string | null> = {}) {
  const map: Record<string, string | null> = { ...initial };
  return {
    getItem: async (k: string) => (k in map ? map[k] : null),
  };
}

const TODAY = '2026-05-01';
const YESTERDAY = '2026-04-30';

// ─── Behavioral tests for resolveInitialRoute ───────────────────────────────

describe('resolveInitialRoute — priority logic', () => {
  it("routes to Boot when onboarding hasn't completed", async () => {
    const r = await resolveInitialRoute(makeStore({}), TODAY);
    expect(r).toEqual({ route: 'Boot' });
  });

  it('routes to Boot even if other keys are set when onboarding is incomplete', async () => {
    const r = await resolveInitialRoute(
      makeStore({
        [SESSION_KEY]: '1700000000000',
        [DAILY_REWARD_KEY]: YESTERDAY,
      }),
      TODAY,
    );
    expect(r).toEqual({ route: 'Boot' });
  });

  it('routes to DailyReward when onboarded and reward not yet claimed today (no prior session)', async () => {
    const r = await resolveInitialRoute(
      makeStore({ [ONBOARDING_KEY]: 'true' }),
      TODAY,
    );
    expect(r).toEqual({ route: 'DailyReward', fromReturningSession: false });
  });

  it("routes to DailyReward when onboarded, reward not yet claimed today, AND user IS a returning session — this is the fix for the priority bug", async () => {
    const r = await resolveInitialRoute(
      makeStore({
        [ONBOARDING_KEY]: 'true',
        [SESSION_KEY]: '1700000000000',
        [DAILY_REWARD_KEY]: YESTERDAY,
      }),
      TODAY,
    );
    // CRITICAL: returning session must NOT suppress daily transmission.
    expect(r).toEqual({ route: 'DailyReward', fromReturningSession: true });
  });

  it("flags fromReturningSession=true so DailyRewardScreen routes onward to ReturnBrief after collect", async () => {
    const r = await resolveInitialRoute(
      makeStore({
        [ONBOARDING_KEY]: 'true',
        [SESSION_KEY]: '1700000000000',
      }),
      TODAY,
    );
    expect(r.route).toBe('DailyReward');
    if (r.route === 'DailyReward') {
      expect(r.fromReturningSession).toBe(true);
    }
  });

  it("flags fromReturningSession=false for first-ever launch so DailyRewardScreen routes onward to Tabs", async () => {
    const r = await resolveInitialRoute(
      makeStore({ [ONBOARDING_KEY]: 'true' }),
      TODAY,
    );
    expect(r.route).toBe('DailyReward');
    if (r.route === 'DailyReward') {
      expect(r.fromReturningSession).toBe(false);
    }
  });

  it('routes to ReturnBrief only when reward is already claimed for today AND a prior session exists', async () => {
    const r = await resolveInitialRoute(
      makeStore({
        [ONBOARDING_KEY]: 'true',
        [SESSION_KEY]: '1700000000000',
        [DAILY_REWARD_KEY]: TODAY,
      }),
      TODAY,
    );
    expect(r).toEqual({ route: 'ReturnBrief' });
  });

  it("routes to Tabs when reward is already claimed for today AND there's no prior session", async () => {
    const r = await resolveInitialRoute(
      makeStore({
        [ONBOARDING_KEY]: 'true',
        [DAILY_REWARD_KEY]: TODAY,
      }),
      TODAY,
    );
    expect(r).toEqual({ route: 'Tabs' });
  });

  it('does NOT mutate storage during route resolution (DAILY_REWARD_KEY is written on collect, not on entry)', async () => {
    // The store passed in only exposes getItem. If resolveInitialRoute
    // ever tried to write, the type system would catch it; if it tried
    // to call setItem on the production AsyncStorage, this test
    // wouldn't catch it — but we also verify in the source-contract
    // suite below that the navigator no longer calls
    // AsyncStorage.setItem(DAILY_REWARD_KEY, ...).
    const r = await resolveInitialRoute(
      makeStore({ [ONBOARDING_KEY]: 'true' }),
      TODAY,
    );
    expect(r.route).toBe('DailyReward');
  });
});

describe('getTodayString', () => {
  it('returns a YYYY-MM-DD string with zero-padded month and day', () => {
    const s = getTodayString();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── Source-contract guards on the wiring ───────────────────────────────────

describe('RootNavigator — source contract', () => {
  const navSrc = read('src/navigation/RootNavigator.tsx');

  it('imports the extracted resolver from ./resolveInitialRoute', () => {
    expect(navSrc).toMatch(
      /import\s+\{[^}]*\bresolveInitialRoute\b[^}]*\}\s+from\s+['"]\.\/resolveInitialRoute['"]/,
    );
  });

  it('does NOT write DAILY_REWARD_KEY at launch (the original eager write was the bug)', () => {
    // The navigator may still reference DAILY_REWARD_KEY indirectly
    // via the resolver, but it must not call setItem on it itself.
    expect(navSrc).not.toMatch(/setItem\([^)]*DAILY_REWARD_KEY/);
    expect(navSrc).not.toMatch(/setItem\([^)]*@axiom_last_daily_reward_date/);
  });

  it('passes fromReturningSession into the DailyReward screen as initialParams', () => {
    expect(navSrc).toMatch(
      /name=["']DailyReward["'][\s\S]*?initialParams=\{\s*\{\s*fromReturningSession:/,
    );
  });

  it('declares DailyReward param shape with optional fromReturningSession', () => {
    expect(navSrc).toMatch(
      /DailyReward:\s*\{\s*fromReturningSession\?:\s*boolean\s*\}\s*\|\s*undefined/,
    );
  });
});

describe('DailyRewardScreen — source contract', () => {
  const screenSrc = read('src/screens/DailyRewardScreen.tsx');

  it('reads fromReturningSession off route.params', () => {
    expect(screenSrc).toMatch(
      /route\.params\?\.fromReturningSession/,
    );
  });

  it('writes DAILY_REWARD_KEY on collect (not on entry)', () => {
    // The setItem call lives inside handleCollect — pin it by
    // matching against today's date helper usage.
    expect(screenSrc).toMatch(
      /AsyncStorage\.setItem\(DAILY_REWARD_KEY,\s*getTodayString\(\)\)/,
    );
  });

  it('routes to ReturnBrief when fromReturningSession is true, else Tabs', () => {
    expect(screenSrc).toMatch(
      /navigation\.replace\(\s*fromReturningSession\s*\?\s*['"]ReturnBrief['"]\s*:\s*['"]Tabs['"]\s*\)/,
    );
  });

  it('does NOT unconditionally replace to Tabs (the pre-fix behavior)', () => {
    expect(screenSrc).not.toMatch(/navigation\.replace\(\s*['"]Tabs['"]\s*\);[\s\S]{0,400}\}\s*;\s*\n\s*return \(/);
  });
});
