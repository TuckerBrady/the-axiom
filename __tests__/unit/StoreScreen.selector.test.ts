/**
 * Static analysis: StoreScreen Zustand selector usage (PROMPT_121 Fix 4).
 *
 * The one remaining bare `useLivesStore()` destructure that
 * PROMPT_120 left in place while it added the Axiom sector guard
 * below it. This test pins both `credits` and `spendCredits` to
 * individual single-field selectors.
 *
 * The audit static-content test (StoreScreen.audit.test.ts) and
 * this selector test are complementary: the audit test verifies
 * Fix 6/7 (icon shape, FREE display, Axiom guard); this test
 * verifies the store-subscription shape.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREEN_PATH = path.resolve(__dirname, '../../src/screens/StoreScreen.tsx');

describe('StoreScreen Zustand selector usage', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SCREEN_PATH, 'utf-8');
  });

  it('does not call useLivesStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useLivesStore\(\)/);
  });

  it('reads credits via a single-field selector on useLivesStore', () => {
    expect(source).toMatch(/useLivesStore\(\s*s\s*=>\s*s\.credits\s*\)/);
  });

  it('reads spendCredits via a single-field selector on useLivesStore', () => {
    expect(source).toMatch(/useLivesStore\(\s*s\s*=>\s*s\.spendCredits\s*\)/);
  });
});
