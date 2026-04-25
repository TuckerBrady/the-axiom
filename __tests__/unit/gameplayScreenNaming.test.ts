// Source-contract guard for the Prompt 83 rename. The old `isReplay`
// identifier in GameplayScreen.tsx was misleading — it actually meant
// "level has been previously completed" (suppresses tutorial). The
// rename to `isLevelPreviouslyCompleted` removed the ambiguity and
// this guard prevents a silent regression.

import * as fs from 'fs';
import * as path from 'path';

const gameplayScreenSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/screens/GameplayScreen.tsx'),
  'utf8',
);

describe('GameplayScreen naming', () => {
  it('uses isLevelPreviouslyCompleted, not the ambiguous isReplay', () => {
    expect(gameplayScreenSource).toMatch(
      /const isLevelPreviouslyCompleted = level \? isLevelDone\(level\.id\) : false;/,
    );
    expect(gameplayScreenSource).not.toMatch(/\bisReplay\b/);
  });

  it('tutorial overlay mount is gated on both isLevelPreviouslyCompleted AND !isExecuting', () => {
    // The overlay must unmount during beam execution to prevent the
    // measure-vs-setState render storm identified in TestFlight A1-7.
    const overlayGateRe =
      /!tutorialComplete\s+&&\s+!tutorialSkipped\s+&&\s+!isLevelPreviouslyCompleted\s+&&\s*\n?\s+!isExecuting\s+&&/;
    expect(gameplayScreenSource).toMatch(overlayGateRe);
  });

  it('wraps the root return in GameplayErrorBoundary and passes handleReset', () => {
    expect(gameplayScreenSource).toMatch(
      /import GameplayErrorBoundary from '\.\.\/components\/GameplayErrorBoundary'/,
    );
    expect(gameplayScreenSource).toMatch(
      /<GameplayErrorBoundary onReset=\{handleReset\}>/,
    );
  });
});
