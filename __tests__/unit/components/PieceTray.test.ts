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

describe('PieceTray — extracted parts tray component', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(traySrc).toMatch(/export default React\.memo\(PieceTrayComponent\)/);
  });

  it('takes a refs prop forwarded as a single object (so identity is stable)', () => {
    expect(traySrc).toMatch(/refs:\s*TutorialTrayRefs/);
    expect(traySrc).toMatch(/export interface TutorialTrayRefs/);
  });

  it('renders a TouchableOpacity per tray piece type', () => {
    expect(traySrc).toMatch(/trayPieceTypes\.map\(pt =>/);
    expect(traySrc).toMatch(/<TouchableOpacity/);
  });

  it('forwards measureRef per piece via the refs object (not via closure capture)', () => {
    expect(traySrc).toMatch(/measureRef =\s*\n[\s\S]*?refs\.trayConveyor[\s\S]*?refs\.trayGear/);
  });

  it('disables tap callbacks when disabled or count <= 0', () => {
    expect(traySrc).toMatch(/disabled\?:\s*boolean/);
    expect(traySrc).toMatch(/disabled=\{disabled \|\| count <= 0\}/);
  });

  it('GameplayScreen imports and renders <PieceTray />', () => {
    expect(screenSrc).toMatch(
      /import PieceTray from '\.\.\/components\/gameplay\/PieceTray'/,
    );
    expect(screenSrc).toMatch(/<PieceTray[\s\S]*?refs=\{tutorialTrayRefs\}/);
  });

  it('GameplayScreen memoizes the refs object via useMemo with empty deps', () => {
    expect(screenSrc).toMatch(
      /const tutorialTrayRefs = useMemo\([\s\S]*?trayConveyor: trayConveyorRef[\s\S]*?\}\),\s*\[\],\s*\)/,
    );
  });

  it('GameplayScreen memoizes per-piece costs and affordability', () => {
    expect(screenSrc).toMatch(/const trayCosts = useMemo\(/);
    expect(screenSrc).toMatch(/const trayAffordable = useMemo\(/);
  });
});
