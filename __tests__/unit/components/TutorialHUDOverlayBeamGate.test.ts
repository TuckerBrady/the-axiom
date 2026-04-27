// Source-contract tests for the Prompt 99B isBeamActive prop on
// TutorialHUDOverlay. PERFORMANCE_CONTRACT 6.2.1 forbids
// measureInWindow during the beam tick loop; clause 6.2.2 requires
// one delayed re-measure after the beam settles.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('TutorialHUDOverlay — isBeamActive measure-suspend (Prompt 99B Fix 8)', () => {
  it('declares isBeamActive as an optional boolean prop defaulting to false', () => {
    expect(overlaySrc).toMatch(/isBeamActive\?:\s*boolean/);
    expect(overlaySrc).toMatch(/isBeamActive = false/);
  });

  it('tracks the prop in a ref so callbacks do not reallocate when it flips', () => {
    expect(overlaySrc).toMatch(/const isBeamActiveRef = useRef\(isBeamActive\)/);
    expect(overlaySrc).toMatch(/isBeamActiveRef\.current = isBeamActive/);
  });

  it('tryMeasure bails out early when isBeamActiveRef.current is true', () => {
    const tm = overlaySrc.match(
      /const tryMeasure = \(\) => \{[\s\S]*?if \(isBeamActiveRef\.current\) return;/,
    );
    expect(tm).not.toBeNull();
  });

  it('re-triggers a delayed measure when isBeamActive flips back to false', () => {
    expect(overlaySrc).toMatch(
      /if \(wasActive && !isBeamActive\) \{[\s\S]*?setTimeout\([\s\S]*?\}, 120\)/,
    );
  });

  it('exports the overlay wrapped in React.memo so identical-prop re-renders short-circuit', () => {
    expect(overlaySrc).toMatch(/export default React\.memo\(TutorialHUDOverlayComponent\)/);
  });

  it('GameplayScreen passes isBeamActive based on beamState.phase', () => {
    expect(screenSrc).toMatch(
      /<TutorialHUDOverlay[\s\S]*?isBeamActive=\{beamState\.phase !== 'idle'\}/,
    );
  });
});
