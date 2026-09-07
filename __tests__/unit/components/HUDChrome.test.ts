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

  it('accepts levelTitle, levelId, timerText, pulseCounterText, onPause props', () => {
    // AXM-001 D-07: sectorTag (and its sectorBadge prop) was deleted
    // from the gameplay HUD -- the Mission Dossier and Sector Map
    // already establish the sector.
    expect(hudSrc).not.toMatch(/sectorBadge/);
    expect(hudSrc).toMatch(/levelId:\s*string/);
    expect(hudSrc).toMatch(/levelTitle:\s*string/);
    expect(hudSrc).toMatch(/timerText:\s*string \| null/);
    expect(hudSrc).toMatch(/pulseCounterText:\s*string \| null/);
    expect(hudSrc).toMatch(/onPause:\s*\(\)\s*=>\s*void/);
  });

  it('renders the timer text only when timerText is non-null', () => {
    expect(hudSrc).toMatch(/timerText !== null && \(\s*<Text/);
  });

  it('renders the pulse counter text only when pulseCounterText is non-null', () => {
    expect(hudSrc).toMatch(/pulseCounterText !== null && \(\s*<Text/);
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

  it('does not merge levelTag and levelName into one collapsed string (needs Tucker sign-off)', () => {
    // The review's proposed "A1-3 · Navigation Array" collapse is a
    // copy change gated on sign-off (Design Principle 2) -- it must
    // not land silently as part of this pass.
    expect(hudSrc).not.toMatch(/·/);
    expect(hudSrc).toMatch(/<Text style=\{styles\.levelTag\}>\{levelId\}<\/Text>/);
    expect(hudSrc).toMatch(/<Text style=\{styles\.levelName\}>\{levelTitle\}<\/Text>/);
  });
});
