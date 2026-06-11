// PROMPT_142 (Lane-1 UX/GAME batch) source-contract guards.
// Sibling to TutorialHUDOverlay.test.ts — same static-source pattern,
// kept isolated so this prompt's diff stays self-contained.

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');
const levelsSrc = read('src/game/levels.ts');

describe('PROMPT_142 -- UX-02: mission sub-header no longer renders', () => {
  it('the step.label text block is not rendered as a visible sub-header', () => {
    // The <Text style={st.label}>{step.label}</Text> block (or its
    // equivalent rendering of step.label as a sub-header) must be removed
    // or permanently gated off.
    const labelRender = overlaySrc.match(/<Text[^>]*style=\{st\.label\}[^>]*>\s*\{step\.label\}/);
    expect(labelRender).toBeNull();
  });
});

describe('PROMPT_142 -- UX-04: highlight square border is always amber', () => {
  it('borderColor for the portal/highlight square is hardcoded #F0B429, not conditional on eyeColor', () => {
    expect(overlaySrc).not.toMatch(/borderColor:\s*isCodexStep\s*\?\s*['"]#F0B429['"]\s*:\s*eyeColor/);
    // The hardcoded amber must still be present somewhere in the portal/highlight styling.
    expect(overlaySrc).toMatch(/#F0B429/);
  });
});

describe('PROMPT_142 -- UX-08: A1-8 post-Engage speed hint removed', () => {
  it('a18_speed hint no longer exists in levels.ts', () => {
    expect(levelsSrc).not.toMatch(/a18_speed/);
    expect(levelsSrc).not.toMatch(/Timer running\. Decisive solutions score higher\./);
  });
});

describe('PROMPT_142 -- UX-05: no stray spotlights on Source/Terminal during conveyor-collect/conveyor-reveal', () => {
  it('showSpotlights is false for trayConveyor-targeted steps', () => {
    // showSpotlights must remain gated to boardGrid steps only; trayConveyor
    // (or any non-boardGrid targetRef) must not trigger spotlight rendering.
    const showSpotlights = overlaySrc.match(/const showSpotlights\s*=[\s\S]*?;/);
    expect(showSpotlights).not.toBeNull();
    expect(showSpotlights![0]).toMatch(/isBoardStep/);
  });
});

describe('PROMPT_142 -- UX-07: board outline does not replay when targetRef is unchanged', () => {
  it('morphPortalIn or its caller guards against replaying the portal animation for an unchanged boardGrid target', () => {
    // Accept any of: a targetRef-equality check before invoking the portal
    // animation segment, or a previousTargetRef/prevStep ref comparison
    // gating the animated portal box update.
    const guarded =
      /previousTargetRef|prevTargetRef|prevStep.*targetRef|targetRef\s*===\s*previous/i.test(overlaySrc);
    expect(guarded).toBe(true);
  });
});
