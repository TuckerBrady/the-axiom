/**
 * Static analysis: HubScreen Zustand selector usage (PROMPT_121 Fix 1).
 *
 * Continuation of the bare-call audit from PROMPT_117/118. HubScreen
 * had five selector-less or multi-field store calls. React 18 +
 * Zustand v5 require selectors so useSyncExternalStore receives a
 * stable snapshot; bare `useStore()` returns a fresh state object
 * on every render and trips the "getSnapshot should be cached" /
 * "Maximum update depth exceeded" loop on Hub entry.
 *
 * Additional rule for HubScreen: `damagedSystems` is an array.
 * A plain selector that reads s.damagedSystems still returns a
 * fresh array reference whenever consequenceStore.set() runs, so
 * the selector must be wrapped in useShallow for element-wise
 * stability.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREEN_PATH = path.resolve(__dirname, '../../src/screens/HubScreen.tsx');

describe('HubScreen Zustand selector usage', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SCREEN_PATH, 'utf-8');
  });

  it('imports useShallow from zustand/react/shallow', () => {
    expect(source).toMatch(
      /import\s*\{[^}]*\buseShallow\b[^}]*\}\s*from\s*['"]zustand\/react\/shallow['"]/,
    );
  });

  it('does not call useLivesStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useLivesStore\(\)/);
  });

  it('does not call useEconomyStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useEconomyStore\(\)/);
  });

  it('does not call useChallengeStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useChallengeStore\(\)/);
  });

  it('does not call useProgressionStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useProgressionStore\(\)/);
  });

  it('wraps the damagedSystems selector with useShallow', () => {
    // damagedSystems is an array — a plain `s => s.damagedSystems`
    // returns a fresh reference whenever the consequence store
    // mutates anything, breaking snapshot stability.
    expect(source).toMatch(/useConsequenceStore\(\s*useShallow\(\s*s\s*=>\s*s\.damagedSystems\s*\)\s*\)/);
  });
});
