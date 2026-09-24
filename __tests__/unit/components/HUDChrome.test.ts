// Source-contract tests for the extracted HUDChrome component
// (Prompt 99B). Validates the memo barrier and the contract that the
// top bar receives no beam-related props.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const hudSrc = read('src/components/gameplay/HUDChrome.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');

describe('HUDChrome — extracted top bar component', () => {
  it('exports a default React.memo-wrapped component', () => {
    expect(hudSrc).toMatch(/export default React\.memo\(HUDChromeComponent\)/);
  });

  it('declares a Props interface with no beam-state references', () => {
    expect(hudSrc).toMatch(/interface Props\s*\{/);
    expect(hudSrc).not.toMatch(/beamState/);
    expect(hudSrc).not.toMatch(/pieceAnimState/);
    expect(hudSrc).not.toMatch(/litWires/);
  });

  it('accepts levelTitle, levelId, pulseCounterText, onPause props', () => {
    // AXM-001 D-07: sectorTag (and its sectorBadge prop) was deleted
    // from the gameplay HUD -- the Mission Dossier and Sector Map
    // already establish the sector.
    expect(hudSrc).not.toMatch(/sectorBadge/);
    expect(hudSrc).toMatch(/levelId:\s*string/);
    expect(hudSrc).toMatch(/levelTitle:\s*string/);
    // AXM-022 (Tucker, 2026-09-23): the visible timer is gone.
    expect(hudSrc).not.toMatch(/timerText/);
    expect(hudSrc).toMatch(/pulseCounterText:\s*string \| null/);
    expect(hudSrc).toMatch(/onPause:\s*\(\)\s*=>\s*void/);
  });

  // AXM-022 supersedes the old conditional-timer contract: elapsed time is
  // tracked silently and never drawn, on the HUD or the pause screen.
  it('renders no timer and passes none from GameplayScreen', () => {
    expect(hudSrc).not.toMatch(/timerText|styles\.timer/);
    expect(screenSrc).not.toMatch(/<HUDChrome[\s\S]{0,600}timerText/);
    expect(screenSrc).not.toMatch(/formatMMSS/);
  });

  // REQ-G-02 (Handoff 003, ratified 2026-09-10) supersedes the conditional
  // mount this test used to pin: mounting the row only during 'beam' phase
  // added ~19pt to the HUD in the same frame ENGAGE fires. It is now always
  // rendered, present and empty when idle.
  it('always renders the pulse counter Text, falling back to an empty string when pulseCounterText is null', () => {
    expect(hudSrc).not.toMatch(/pulseCounterText !== null && \(/);
    expect(hudSrc).toMatch(/<Text style=\{styles\.pulseCounterText\}[^>]*>\s*\{pulseCounterText \?\? ''\}\s*<\/Text>/);
  });

  it('the pulse counter row has a fixed height and is left-aligned (REQ-G-02)', () => {
    const styleBlock = hudSrc.slice(hudSrc.indexOf('pulseCounterText: {'));
    expect(styleBlock).toMatch(/height:\s*16/);
    expect(styleBlock).toMatch(/textAlign:\s*'left'/);
  });

  it('GameplayScreen imports and renders <HUDChrome />', () => {
    expect(screenSrc).toMatch(
      /import HUDChrome from '\.\.\/components\/gameplay\/HUDChrome'/,
    );
    expect(screenSrc).toMatch(/<HUDChrome[\s\S]*?onPause=\{handlePauseOpen\}/);
  });

  it('GameplayScreen passes onPause via a useCallback-stabilized handler', () => {
    expect(screenSrc).toMatch(
      /const handlePauseOpen = useCallback\(\(\) => \{[\s\S]*?setShowPauseModal\(true\);[\s\S]*?\}, \[\]\)/,
    );
  });

  it('GameplayScreen no longer passes sectorBadge to HUDChrome', () => {
    expect(screenSrc).not.toMatch(/<HUDChrome[\s\S]{0,400}sectorBadge/);
  });
});

describe('HUDChrome — AXM-001 D-07: contrast and type floor', () => {
  it('no rendered text style has a fontSize literal below 11', () => {
    const styleBlock = hudSrc.slice(hudSrc.indexOf('const styles = StyleSheet.create'));
    const sizes = [...styleBlock.matchAll(/fontSize:\s*(?:FontSizes\.floor|(\d+))/g)]
      .map(m => (m[1] ? parseInt(m[1], 10) : 11));
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.every(n => n >= 11)).toBe(true);
  });

  it('deletes the 1.5:1-contrast #1A3050 pulse-counter color from the HUD', () => {
    expect(hudSrc).not.toMatch(/#1A3050/i);
  });

  it('pauseBtn and specSheetBtn are 44x44 touch targets', () => {
    expect(hudSrc).toMatch(/pauseBtn:\s*\{\s*width:\s*44,\s*height:\s*44/);
    expect(hudSrc).toMatch(/specSheetBtn:\s*\{\s*width:\s*44,\s*height:\s*44/);
  });

  // AXM-002 part 1: Tucker approved the one-line merge 2026-09-23, which
  // retires the sign-off gate this test used to pin (Design Principle 2).
  it('merges levelTag and levelName into one line joined by a spaced middle dot', () => {
    expect(hudSrc).toMatch(
      /<Text style=\{styles\.levelLine\} numberOfLines=\{1\} ellipsizeMode="tail">\s*<Text style=\{styles\.levelTag\}>\{levelId\}<\/Text>\s*\{' · '\}\s*<Text style=\{styles\.levelName\}>\{levelTitle\}<\/Text>\s*<\/Text>/,
    );
  });
});
