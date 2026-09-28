/**
 * SWEEP-B51 S1 (AXM-039): wiring, source-structure checks (UTF-8 reads).
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../../../', rel), 'utf-8');

describe('SWEEP-B51 S1 wiring', () => {
  test('[S1-6] RootNavigator hydrates the economy and lives stores', () => {
    const src = read('src/navigation/RootNavigator.tsx');
    const start = src.indexOf('usePlayerStore.getState().hydrate()');
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('}, []);', start);
    const effect = src.slice(start, end);
    expect(effect).toMatch(/useEconomyStore\.getState\(\)\.hydrate\(\)/);
    expect(effect).toMatch(/useLivesStore\.getState\(\)\.hydrate\(\)/);
  });

  test('[S1-7] StoreScreen reads credits from the economy store', () => {
    const src = read('src/screens/StoreScreen.tsx');
    expect(src).toMatch(/useEconomyStore\(\s*s\s*=>\s*s\.credits\s*\)/);
    expect(src).not.toMatch(/useLivesStore\(\s*s\s*=>\s*s\.credits\s*\)/);
  });

  test('[S1-7] GameplayScreen passes economy credits as livesCredits', () => {
    const src = read('src/screens/GameplayScreen.tsx');
    expect(src).toMatch(/livesCredits=\{credits\}/);
    const start = src.indexOf('useLivesStore(useShallow(');
    expect(start).toBeGreaterThan(-1);
    const selector = src.slice(start, src.indexOf('})));', start));
    expect(selector).not.toMatch(/credits/);
  });
});
