/**
 * Static analysis: ReturnBriefScreen must use Zustand selectors.
 *
 * Same root-cause class as GameplayScreen.selector.test.ts:
 * selector-less store hook calls cause getSnapshot to return the
 * entire state object, which fails React's snapshot-stability
 * verification and triggers an infinite re-render loop.
 *
 * This screen mounts on app focus and reads from four stores —
 * progression, consequence, economy, and challenge. All four must
 * use field-level selectors.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREEN_PATH = path.resolve(
  __dirname,
  '../../src/screens/ReturnBriefScreen.tsx',
);

describe('ReturnBriefScreen Zustand selector usage', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SCREEN_PATH, 'utf-8');
  });

  it('does not call useProgressionStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useProgressionStore\(\)/);
  });

  it('does not call useConsequenceStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useConsequenceStore\(\)/);
  });

  it('does not call useEconomyStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useEconomyStore\(\)/);
  });

  it('does not call useChallengeStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useChallengeStore\(\)/);
  });
});
