// AXM-022 follow-up (Tucker, 2026-09-24): the Mission Dossier drew a BEST
// TIME tile. Time is tracked silently and never shown, so the tile and the
// bestTime route param that fed it are gone. A visible clock tells the
// Engineer to hurry, the opposite of building an elaborate machine.
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

const FILES = [
  'src/screens/MissionDossierScreen.tsx',
  'src/screens/LevelSelectScreen.tsx',
  'src/screens/SettingsScreen.tsx',
  'src/navigation/RootNavigator.tsx',
];

describe('Mission Dossier shows no clock', () => {
  it('has no BEST TIME tile', () => {
    expect(read('src/screens/MissionDossierScreen.tsx')).not.toMatch(/BEST TIME/);
  });

  it.each(FILES)('%s carries no bestTime param', file => {
    expect(read(file)).not.toMatch(/bestTime/);
  });

  it('keeps the PIECES USED and STAR RATING tiles, with no divider on the first', () => {
    const src = read('src/screens/MissionDossierScreen.tsx');
    expect(src).toMatch(/PIECES USED/);
    expect(src).toMatch(/STAR RATING/);
    const firstCell = src.indexOf('st.statCell');
    expect(src.slice(firstCell, firstCell + 40)).not.toMatch(/statBorder/);
  });
});
