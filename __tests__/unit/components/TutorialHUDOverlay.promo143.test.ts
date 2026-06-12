// PROMPT_143 (Codex-discovery '???' caption — restore + generalize)
// source-contract + discovery-state guards. Sibling to
// TutorialHUDOverlay.promo142.test.ts — same static-source pattern, kept
// isolated so this prompt's diff stays self-contained. The unit tier here
// does not render JSX (see PROMPT_142 precedent); the visibility-toggle
// block exercises the real useCodexStore against the documented gate.

import * as fs from 'fs';
import * as path from 'path';

import { useCodexStore } from '../../../src/store/codexStore';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');
const levelsSrc = read('src/game/levels.ts');

describe('PROMPT_143 -- Codex-discovery "???" caption restored and generalized', () => {
  it('renders a "???" caption gated on isCodexStep && !isDiscovered(codexEntryId)', () => {
    // Source must contain a render path for '???' that checks BOTH
    // step.codexEntryId presence and useCodexStore discovery state --
    // not a hardcoded per-level string match.
    //
    // Assert against the actual rendered JSX text node (>???<), not a
    // quoted '???' literal: the caption renders as a bare JSX text node
    // (<Text ...>???</Text>) with no surrounding quotes. The earlier
    // /['"]\?\?\?['"]/ regex only matched the quoted '???' / "???" inside
    // source comments, so it passed without ever exercising the real glyph
    // (PROMPT_143_FIX).
    expect(overlaySrc).toMatch(/>\s*\?\?\?\s*</);
    expect(overlaySrc).toMatch(/isDiscovered/);
  });

  it('does not resurrect the removed per-step mission sub-header for non-codex steps', () => {
    // The UX-02 removal must stand: no unconditional render of step.label
    // as a generic sub-header for steps without codexEntryId.
    const labelRender = overlaySrc.match(/<Text[^>]*style=\{st\.label\}[^>]*>\s*\{step\.label\}/);
    expect(labelRender).toBeNull();
  });

  it('A1-1 conveyor-collect step still carries codexEntryId "conveyor"', () => {
    expect(levelsSrc).toMatch(/codexEntryId:\s*['"]conveyor['"]/);
  });

  it('at least one non-A1-1 level step carries a codexEntryId (generalization target)', () => {
    // e.g. gear / configNode / scanner / transmitter PIECE TRAY steps
    const nonA1_1CodexIds = ['gear', 'configNode', 'scanner', 'transmitter'];
    const hasAtLeastOne = nonA1_1CodexIds.some(id =>
      new RegExp(`codexEntryId:\\s*['"]${id}['"]`).test(levelsSrc),
    );
    expect(hasAtLeastOne).toBe(true);
  });

  it('gates the "???" caption on the derived showCodexDiscoveryCaption boolean', () => {
    // The caption must be driven by a hoisted derived boolean, not inlined
    // per-level conditionals.
    expect(overlaySrc).toMatch(/showCodexDiscoveryCaption/);
  });
});

// The documented gate (Implementation step 1):
//   isCodexStep && !!step.codexEntryId && !isDiscovered(step.codexEntryId)
// isCodexStep === !!step.codexEntryId, so the gate reduces to:
//   !!step.codexEntryId && !isDiscovered(step.codexEntryId)
const captionVisible = (step: { codexEntryId?: string }): boolean =>
  !!step.codexEntryId &&
  !useCodexStore.getState().isDiscovered(step.codexEntryId);

describe('PROMPT_143 -- "???" visibility toggles with discovery state', () => {
  beforeEach(() => {
    // Reset discovery state between cases (monotonic store, no un-discover API).
    useCodexStore.setState({ discoveredIds: [] });
  });

  it('an undiscovered codexEntryId step shows "???"', () => {
    expect(captionVisible({ codexEntryId: 'gear' })).toBe(true);
  });

  it('a discovered codexEntryId step does not show "???"', () => {
    useCodexStore.getState().markDiscovered('gear');
    expect(captionVisible({ codexEntryId: 'gear' })).toBe(false);
  });

  it('a step with no codexEntryId never shows "???"', () => {
    useCodexStore.getState().markDiscovered('gear');
    expect(captionVisible({ codexEntryId: undefined })).toBe(false);
    expect(captionVisible({})).toBe(false);
  });
});
