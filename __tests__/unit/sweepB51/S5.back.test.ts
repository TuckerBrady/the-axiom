/**
 * SWEEP-B51 S5 (AXM-040): Android BACK opens PAUSE and never leaves the level.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveGameplayBack } from '../../../src/game/gameplayBack';

const screen = fs.readFileSync(
  path.resolve(__dirname, '../../../src/screens/GameplayScreen.tsx'),
  'utf-8',
);

function backEffect(): string {
  const at = screen.indexOf("BackHandler.addEventListener('hardwareBackPress'");
  expect(at).toBeGreaterThan(-1);
  const start = screen.lastIndexOf('useEffect(', at);
  const end = screen.indexOf('}, [', at);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(at);
  return screen.slice(start, end);
}

describe('SWEEP-B51 S5 Android BACK', () => {
  test('[S5-1] resolveGameplayBack covers all four actions in priority order', () => {
    const r = (pauseOpen: boolean, abandonConfirmOpen: boolean, blockingOverlayOpen: boolean) =>
      resolveGameplayBack({ pauseOpen, abandonConfirmOpen, blockingOverlayOpen });
    // A blocking overlay wins over everything.
    expect(r(true, true, true)).toBe('consume');
    expect(r(false, false, true)).toBe('consume');
    expect(r(true, false, true)).toBe('consume');
    // Then the abandon confirm inside PAUSE.
    expect(r(true, true, false)).toBe('closeAbandonConfirm');
    // Then PAUSE itself.
    expect(r(true, false, false)).toBe('closePause');
    // Otherwise open PAUSE.
    expect(r(false, false, false)).toBe('openPause');
    // A stale abandon flag without PAUSE does not block opening it.
    expect(r(false, true, false)).toBe('openPause');
  });

  test('[S5-2] GameplayScreen registers and removes a hardwareBackPress handler that returns true', () => {
    expect(screen).toMatch(/import \{[^}]*\bBackHandler\b[^}]*\} from 'react-native';/);
    const effect = backEffect();
    expect(effect).toMatch(/const (\w+) = BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{/);
    const sub = effect.match(/const (\w+) = BackHandler\.addEventListener/)![1];
    expect(effect).toMatch(new RegExp(`return \\(\\) => ${sub}\\.remove\\(\\);`));
    // The handler has exactly one return, and it is true.
    const handler = effect.slice(effect.indexOf("'hardwareBackPress', () => {"), effect.indexOf(`return () => ${sub}.remove();`));
    const returns = handler.match(/return [^;]*;/g) ?? [];
    expect(returns).toEqual(['return true;']);
    // It applies each action.
    expect(handler).toMatch(/'openPause'\) setShowPauseModal\(true\)/);
    expect(handler).toMatch(/'closeAbandonConfirm'\) setShowAbandonConfirm\(false\)/);
    expect(handler).toMatch(/'closePause'\) setShowPauseModal\(false\)/);
    // Every blocking overlay is listed.
    for (const flag of [
      'showResults', 'showCompletionCard', 'showCompletionScene', 'showVoid', 'showWrongOutput',
      'showInsufficientPulses', 'showSpecNotMet', 'showRequiredNotEngaged', 'showOutOfLives',
    ]) {
      expect(handler).toContain(flag);
    }
  });

  test('[S5-2] the handler calls resolveGameplayBack', () => {
    expect(screen).toMatch(/import \{ resolveGameplayBack \} from '\.\.\/game\/gameplayBack';/);
    const effect = backEffect();
    expect(effect).toMatch(/resolveGameplayBack\(\{\s*pauseOpen: showPauseModal,\s*abandonConfirmOpen: showAbandonConfirm,\s*blockingOverlayOpen:/);
  });
});
