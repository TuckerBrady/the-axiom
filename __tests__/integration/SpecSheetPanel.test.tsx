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

  it('shows the expected IN -> OUT tape for a live output-gate level (Tucker 2026-06-16)', () => {
    // The output-match SHALL is abstract; the panel also shows the actual
    // required output tape so the player knows the target.
    expect(panelSrc).toMatch(/expectedOutputIsLiveGate\(level\)/);
    expect(panelSrc).toMatch(/REQUIRED OUTPUT/);
    expect(panelSrc).toMatch(/<TapeStrip[\s\S]*?label="OUT"[\s\S]*?level\.expectedOutput/);
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

describe('Spec Sheet — A1-1 hook uses the orb-highlight dialog (SE-TM-033)', () => {
  it('GameplayScreen renders the SpecSheetHook anchored to the HUD button ref', () => {
    expect(screenSrc).toMatch(/<SpecSheetHook/);
    expect(screenSrc).toMatch(/specSheetBtnRef/);
    expect(hudSrc).toMatch(/ref=\{specSheetBtnRef\}/);
  });

  it('the hook measures the button and shows a dialog (not a full-screen card)', () => {
    const hookSrc = read('src/components/gameplay/SpecSheetHook.tsx');
    expect(hookSrc).toMatch(/measureInWindow/);
    expect(hookSrc).toMatch(/CogsAvatar/);
  });
});

describe('Topology SHALL is graded at win time (SE-TM-035)', () => {
  it('GameplayScreen evaluates the topology gate and folds it into success', () => {
    expect(screenSrc).toMatch(/evaluateTopologyGate\(level, steps\)/);
    expect(screenSrc).toMatch(/!wrongOutput && metPulseRequirement && topoGate\.met/);
  });

  it('a correct output that violates topology shows the spec diagnostic, not a win', () => {
    expect(screenSrc).toMatch(/!topoGate\.met/);
    expect(screenSrc).toMatch(/setShowSpecNotMet\(true\)/);
  });

  it('A1-4 declares both the executed-path objective and the Spec Sheet topology field', () => {
    const levelsSrc = read('src/game/levels.ts');
    expect(levelsSrc).toMatch(/min_direction_changes['"]?,?\s*count:\s*2/);
    expect(levelsSrc).toMatch(/topologyRequirements:\s*\{\s*minDirectionChanges:\s*2/);
  });
});

describe('Spec Sheet — results checklist + MAY', () => {
  it('results modal builds the spec checklist (incl. MAY) from the run', () => {
    const modalsSrc = read('src/components/gameplay/GameplayModals.tsx');
    expect(modalsSrc).toMatch(/buildSpecChecklist\(/);
    expect(modalsSrc).toMatch(/metDescriptions/);
    expect(modalsSrc).toMatch(/SPECIFICATION/);
  });

  it('successHandler only awards MAY on a 3-star clear', () => {
    const handlerSrc = read('src/game/engagement/successHandlers.ts');
    expect(handlerSrc).toMatch(/result\.stars === 3/);
    expect(handlerSrc).toMatch(/evaluateMayConditions/);
  });
});
