/**
 * Static analysis: SectorMapScreen Zustand selector usage (PROMPT_121 Fix 3).
 *
 * One bare `useProgressionStore()` destructure converted to two
 * individual selectors. Same pattern as the other PROMPT_117/118/121
 * selector guards.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREEN_PATH = path.resolve(__dirname, '../../src/screens/SectorMapScreen.tsx');

describe('SectorMapScreen Zustand selector usage', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SCREEN_PATH, 'utf-8');
  });

  it('does not call useProgressionStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useProgressionStore\(\)/);
  });

  it('reads getSectorCompletedCount via a single-field selector', () => {
    expect(source).toMatch(/useProgressionStore\(\s*s\s*=>\s*s\.getSectorCompletedCount\s*\)/);
  });

  it('reads setActiveSector via a single-field selector', () => {
    expect(source).toMatch(/useProgressionStore\(\s*s\s*=>\s*s\.setActiveSector\s*\)/);
  });
});
