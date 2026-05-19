/**
 * Static analysis: LevelSelectScreen Zustand selector usage (PROMPT_121 Fix 2).
 *
 * Same root cause as the PROMPT_117/118 selector tests. The screen
 * had one bare `useProgressionStore()` destructure of three fields;
 * this test pins it to individual single-field selectors.
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREEN_PATH = path.resolve(__dirname, '../../src/screens/LevelSelectScreen.tsx');

describe('LevelSelectScreen Zustand selector usage', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(SCREEN_PATH, 'utf-8');
  });

  it('does not call useProgressionStore() without a selector', () => {
    expect(source).not.toMatch(/=\s*useProgressionStore\(\)/);
  });

  it('reads activeSector via a single-field selector', () => {
    expect(source).toMatch(/useProgressionStore\(\s*s\s*=>\s*s\.activeSector\s*\)/);
  });

  it('reads isLevelCompleted via a single-field selector', () => {
    expect(source).toMatch(/useProgressionStore\(\s*s\s*=>\s*s\.isLevelCompleted\s*\)/);
  });

  it('reads getLevelStars via a single-field selector', () => {
    expect(source).toMatch(/useProgressionStore\(\s*s\s*=>\s*s\.getLevelStars\s*\)/);
  });
});
