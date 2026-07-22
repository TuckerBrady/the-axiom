// Replay Tutorial — player-facing setting that re-runs the opening A1-1
// walkthrough without wiping progress. Source-match tests (mirroring the
// SpecSheetPanel / PieceTray wiring tests) since the wiring is JSX + a gate.

import * as fs from 'fs';
import * as path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const settingsSrc = read('src/screens/SettingsScreen.tsx');
const gameplaySrc = read('src/screens/GameplayScreen.tsx');

describe('Replay Tutorial — Settings wiring', () => {
  it('exposes a player-facing "Replay Tutorial" row', () => {
    expect(settingsSrc).toMatch(/label="Replay Tutorial"/);
    expect(settingsSrc).toMatch(/onPress=\{handleReplayTutorial\}/);
  });

  it('arms the force-show flag and launches Gameplay at A1-1', () => {
    expect(settingsSrc).toMatch(/axiom_tutorial_force_show/);
    expect(settingsSrc).toMatch(/getLevelById\('A1-1'\)/);
    expect(settingsSrc).toMatch(/setLevel\(a11\)/);
    expect(settingsSrc).toMatch(/navigation\.navigate\('Gameplay'\)/);
  });

  it('lives in the player-facing GAMEPLAY section, before the dev-tools block', () => {
    const gameplayHdr = settingsSrc.indexOf('title="GAMEPLAY"');
    const replayRow = settingsSrc.indexOf('label="Replay Tutorial"');
    const devBlock = settingsSrc.indexOf('SHOW_DEV_TOOLS &&');
    expect(gameplayHdr).toBeGreaterThan(-1);
    expect(replayRow).toBeGreaterThan(gameplayHdr);
    expect(replayRow).toBeLessThan(devBlock);
  });
});

describe('Replay Tutorial — GameplayScreen override', () => {
  it('reads the force-show flag into a forceTutorial override', () => {
    expect(gameplaySrc).toMatch(/forceTutorial/);
    expect(gameplaySrc).toMatch(/axiom_tutorial_force_show/);
  });

  it('the overlay gate lets forceTutorial bypass the previously-completed check', () => {
    expect(gameplaySrc).toMatch(/forceTutorial \|\| \(!tutorialComplete && !tutorialSkipped && !isLevelPreviouslyCompleted\)/);
  });

  it('clears the override when the overlay completes or is skipped', () => {
    expect(gameplaySrc).toMatch(/setTutorialComplete\(true\); setForceTutorial\(false\)/);
    expect(gameplaySrc).toMatch(/setTutorialSkipped\(true\); setForceTutorial\(false\)/);
  });
});
