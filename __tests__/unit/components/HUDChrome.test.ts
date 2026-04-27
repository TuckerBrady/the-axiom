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

  it('accepts levelTitle, sectorBadge, levelId, timerText, pulseCounterText, onPause props', () => {
    expect(hudSrc).toMatch(/sectorBadge:\s*string/);
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
});
