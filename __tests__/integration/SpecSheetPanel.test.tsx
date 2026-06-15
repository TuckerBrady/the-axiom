// SE-TM-030 — Spec Sheet panel UI contract (Unit C Part 2).
//
// The panel render path is exercised on device via Maestro; the panel's own
// logic (statement derivation + copy) is unit-tested in
// __tests__/unit/spec/{specSheet,specSheetCopy}.test.ts. Here we verify the
// component's contract by source inspection (the established pattern for
// gameplay components — see GameplayModals.test.tsx): it renders the four
// RFC-2119 sections from the data layer, stays read-only, and is wired into
// the HUD and screen.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.resolve(repoRoot, rel), 'utf8');

const panelSrc = read('src/components/gameplay/SpecSheetPanel.tsx');
const hudSrc = read('src/components/gameplay/HUDChrome.tsx');
const screenSrc = read('src/screens/GameplayScreen.tsx');
const modalsHookSrc = read('src/hooks/useGameplayModals.ts');

describe('SpecSheetPanel — renders the four RFC-2119 sections', () => {
  it.each(['WILL', 'SHALL', 'SHOULD', 'MAY'])(
    'renders a %s section header',
    label => {
      expect(panelSrc).toContain(`label="${label}"`);
    },
  );

  it('consumes the Part 1 derive functions', () => {
    expect(panelSrc).toMatch(/deriveWillStatements/);
    expect(panelSrc).toMatch(/deriveShallStatements/);
    expect(panelSrc).toMatch(/deriveShouldStatements/);
  });

  it('consumes the Part 2 copy layer (does not hand-write sentences inline)', () => {
    expect(panelSrc).toMatch(/willStatementToCopy/);
    expect(panelSrc).toMatch(/shallStatementToCopy/);
    expect(panelSrc).toMatch(/shouldStatementToCopy/);
  });

  it('reads MAY copy from the level conditions, not a derive function', () => {
    expect(panelSrc).toMatch(/mayConditions/);
  });
});

describe('SpecSheetPanel — read-only contract', () => {
  it('owns no state (no useState) and runs no effects (no useEffect)', () => {
    expect(panelSrc).not.toMatch(/\buseState\b/);
    expect(panelSrc).not.toMatch(/\buseEffect\b/);
  });

  it('never touches scoring, win condition, or game stores', () => {
    expect(panelSrc).not.toMatch(/calculateScore|useGameStore|useEconomyStore|earnCredits|setShowResults/);
  });

  it('is gated on a visible flag', () => {
    expect(panelSrc).toMatch(/if \(!visible\) return null/);
  });
});

describe('Spec Sheet — HUD + screen wiring', () => {
  it('HUDChrome renders the revived InfoIcon as the Spec Sheet button', () => {
    expect(hudSrc).toMatch(/InfoIcon/);
    expect(hudSrc).toMatch(/onOpenSpecSheet/);
  });

  it('GameplayScreen wires the open handler to HUDChrome and mounts the panel', () => {
    expect(screenSrc).toMatch(/onOpenSpecSheet=\{handleSpecSheetOpen\}/);
    expect(screenSrc).toMatch(/<SpecSheetPanel/);
  });

  it('A1-1 activation hook is one-time (AsyncStorage seen-flag) and points at the icon', () => {
    expect(modalsHookSrc).toMatch(/axiom_spec_sheet_hook_seen/);
    expect(modalsHookSrc).toMatch(/level\.id !== 'A1-1'/);
    expect(screenSrc).toMatch(/SPEC_SHEET_ACTIVATION_HOOK/);
  });
});

describe('Spec Sheet — MAY bonus surfaced on results', () => {
  it('results modal renders the MAY bonus block', () => {
    const modalsSrc = read('src/components/gameplay/GameplayModals.tsx');
    expect(modalsSrc).toMatch(/mayBonus &&/);
    expect(modalsSrc).toMatch(/metDescriptions/);
  });

  it('successHandler only awards MAY on a 3-star clear', () => {
    const handlerSrc = read('src/game/engagement/successHandlers.ts');
    expect(handlerSrc).toMatch(/result\.stars === 3/);
    expect(handlerSrc).toMatch(/evaluateMayConditions/);
  });
});
