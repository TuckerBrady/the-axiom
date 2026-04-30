// Source-contract tests for the extracted PieceTray component
// (Prompt 99B). The tray must NOT re-render during a beam tick — the
// parent unmounts it during isExecuting, but when mounted, its memo
// barrier must hold across parent re-renders.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const traySrc = read('src/components/gameplay/PieceTray.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');
const tutorialHookSrc = read('src/hooks/useGameplayTutorial.ts');

describe('PieceTray — extracted parts tray component', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(traySrc).toMatch(/export default React\.memo\(PieceTrayComponent\)/);
  });

  it('has an optional refs prop for backward compatibility (tray no longer requires tutorial refs)', () => {
    expect(traySrc).toMatch(/refs\?:\s*TutorialTrayRefs/);
    expect(traySrc).toMatch(/export interface TutorialTrayRefs/);
  });

  it('renders a TouchableOpacity per tray piece type', () => {
    expect(traySrc).toMatch(/trayPieceTypes\.map\(pt =>/);
    expect(traySrc).toMatch(/<TouchableOpacity/);
  });

  it('forwards measureRef per piece via the refs object when refs is provided', () => {
    expect(traySrc).toMatch(/measureRef = refs[\s\S]*?refs\.trayConveyor[\s\S]*?refs\.trayGear/);
  });

  it('disables tap callbacks when disabled or count <= 0', () => {
    expect(traySrc).toMatch(/disabled\?:\s*boolean/);
    expect(traySrc).toMatch(/disabled=\{disabled \|\| count <= 0\}/);
  });

  it('GameplayScreen imports and renders <PieceTray /> without refs (refs is now optional)', () => {
    expect(screenSrc).toMatch(
      /import PieceTray from '\.\.\/components\/gameplay\/PieceTray'/,
    );
    // refs prop removed from GameplayScreen — PieceTray is now used for
    // non-Arc-Wheel Axiom levels only; tutorial refs live in the Arc Wheel.
    expect(screenSrc).toMatch(/<PieceTray/);
    expect(screenSrc).not.toMatch(/refs=\{tutorialTrayRefs\}/);
  });

  it('useGameplayTutorial no longer has tutorialTrayRefs (tray refs replaced by arcWheelMainRef)', () => {
    expect(tutorialHookSrc).not.toMatch(/tutorialTrayRefs/);
    expect(tutorialHookSrc).toMatch(/arcWheelMainRef/);
    expect(tutorialHookSrc).toMatch(/placedPieceRef/);
  });

  it('GameplayScreen memoizes per-piece costs and affordability', () => {
    expect(screenSrc).toMatch(/const trayCosts = useMemo\(/);
    expect(screenSrc).toMatch(/const trayAffordable = useMemo\(/);
  });
});
