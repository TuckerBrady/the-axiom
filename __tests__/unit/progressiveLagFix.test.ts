// Source-contract guards for the progressive lag fix.
//
// Bug: Launch buttons used navigation.navigate('Gameplay'), so when
// the previous Gameplay instance was still in the native-stack
// history, navigate popped back to it instead of mounting fresh.
// Timers, animation refs, and the post-completion replay-loop flag
// (loopingRef) accumulated across levels.
//
// Fix: Launch screens (MissionDossier, DailyChallengeDossier) use
// navigation.replace('Gameplay'), forcing a fresh mount every
// transition. Belt-and-suspenders: GameplayScreen also resets
// loopingRef on unmount and on level.id change so the replay-loop
// flag never leaks even if a future caller forgets to use replace.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const missionDossierSrc = read('src/screens/MissionDossierScreen.tsx');
const dailyDossierSrc = read('src/screens/DailyChallengeDossierScreen.tsx');
const gameplaySrc = read('src/screens/GameplayScreen.tsx');

describe('Progressive lag fix — fresh GameplayScreen mount per level', () => {
  describe('Launch screens use navigation.replace, not navigation.navigate', () => {
    it('MissionDossierScreen.handleLaunch calls navigation.replace(\'Gameplay\')', () => {
      const handler = missionDossierSrc.match(
        /const handleLaunch = \(\) => \{[\s\S]*?\n  \};/,
      );
      expect(handler).not.toBeNull();
      expect(handler?.[0]).toMatch(/navigation\.replace\(\s*['"]Gameplay['"]\s*\)/);
      expect(handler?.[0]).not.toMatch(/navigation\.navigate\(\s*['"]Gameplay['"]/);
    });

    it('DailyChallengeDossierScreen.handleAccept calls navigation.replace(\'Gameplay\')', () => {
      const handler = dailyDossierSrc.match(
        /const handleAccept = async \(\) => \{[\s\S]*?\n  \};/,
      );
      expect(handler).not.toBeNull();
      expect(handler?.[0]).toMatch(/navigation\.replace\(\s*['"]Gameplay['"]\s*\)/);
      expect(handler?.[0]).not.toMatch(/navigation\.navigate\(\s*['"]Gameplay['"]/);
    });

    it('no remaining navigation.navigate(\'Gameplay\') call sites in modal launch screens', () => {
      // HubScreen is intentionally left on navigate — it lives in the
      // bottom-tab navigator, and replace from there would unmount
      // the entire Tabs container. The bug pattern (existing Gameplay
      // in stack) only manifests reliably from the Dossier launch
      // path, which this fix covers.
      expect(missionDossierSrc).not.toMatch(/navigation\.navigate\(\s*['"]Gameplay['"]/);
      expect(dailyDossierSrc).not.toMatch(/navigation\.navigate\(\s*['"]Gameplay['"]/);
    });
  });

  describe('Belt-and-suspenders: loopingRef is cleared across level transitions', () => {
    it('GameplayScreen unmount cleanup resets loopingRef.current to false', () => {
      // The cleanup useEffect with an empty deps array runs only on
      // unmount. With the replace-based fix every level transition
      // unmounts Gameplay, so this clears the flag in the normal
      // path. We grep the unmount cleanup block specifically.
      const cleanupBlock = gameplaySrc.match(
        /\/\/ ── Cleanup beam animation on unmount ──[\s\S]*?\}, \[\]\);/,
      );
      expect(cleanupBlock).not.toBeNull();
      expect(cleanupBlock?.[0]).toMatch(/loopingRef\.current\s*=\s*false/);
    });

    it('GameplayScreen resets loopingRef.current on level.id change', () => {
      // Even if a future caller stops using replace and Gameplay
      // stays mounted across levels, this effect ensures the
      // post-completion replay-loop flag does not bleed into the
      // next level's first run. Match the comment-anchored block.
      const levelChangeEffect = gameplaySrc.match(
        /\/\/ ── Reset replay-loop flag on level change[\s\S]*?\}, \[level\?\.id\]\);/,
      );
      expect(levelChangeEffect).not.toBeNull();
      expect(levelChangeEffect?.[0]).toMatch(/loopingRef\.current\s*=\s*false/);
    });
  });
});
