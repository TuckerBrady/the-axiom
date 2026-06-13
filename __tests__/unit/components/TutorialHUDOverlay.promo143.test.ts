// Codex-discovery '???' caption — source-contract + behavior guards.
//
// History: PROMPT_143 introduced the '???' caption gated on persisted
// discovery state (isCodexStep && !isDiscovered). Tucker note 2026-06-13:
// on replay the Conveyor's '???' never showed because the piece was already
// discovered in a prior session. The caption is now gated on an explicit
// per-step `unknownCaption` flag instead — the tutorial is a re-enactment, so
// the caption must replay regardless of persisted discovery, and it must stay
// OFF the Source/Terminal steps (where COGS names the entity outright).

import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.resolve(repoRoot, p), 'utf8');

const overlaySrc = read('src/components/TutorialHUDOverlay.tsx');
const levelsSrc = read('src/game/levels.ts');

describe('Codex-discovery "???" caption — flag-driven', () => {
  it('renders a "???" caption gated on the step\'s unknownCaption flag', () => {
    // The caption renders as a bare JSX text node (<Text ...>???</Text>).
    expect(overlaySrc).toMatch(/>\s*\?\?\?\s*</);
    // Gate is the explicit per-step flag, not persisted discovery state.
    expect(overlaySrc).toMatch(/showCodexDiscoveryCaption\s*=\s*!!step\.unknownCaption/);
  });

  it('no longer gates the caption on persisted discovery (isDiscovered)', () => {
    // The caption must replay across sessions, so it must not depend on the
    // monotonic codex discovery store.
    expect(overlaySrc).not.toMatch(/showCodexDiscoveryCaption[\s\S]{0,80}isDiscovered/);
  });

  it('does not resurrect the removed per-step mission sub-header for non-codex steps', () => {
    const labelRender = overlaySrc.match(/<Text[^>]*style=\{st\.label\}[^>]*>\s*\{step\.label\}/);
    expect(labelRender).toBeNull();
  });

  it('A1-1 conveyor-collect carries codexEntryId "conveyor" and unknownCaption', () => {
    expect(levelsSrc).toMatch(
      /id: 'conveyor-collect'[\s\S]*?codexEntryId: 'conveyor'[\s\S]*?unknownCaption: true/,
    );
  });

  it('every piece/tape notice step carries unknownCaption: true', () => {
    const noticeIds = [
      'conveyor-collect', 'gear-notice', 'confignode-notice', 'scanner-notice',
      'transmitter-notice', 'input-tape-notice', 'data-trail-notice', 'output-tape-notice',
    ];
    for (const id of noticeIds) {
      expect(levelsSrc).toMatch(new RegExp(`id: '${id}'[\\s\\S]*?unknownCaption: true`));
    }
  });

  it('Source and Terminal steps do NOT carry unknownCaption (COGS names them)', () => {
    // Scope each check to the step's own object so a later step's flag does
    // not leak in.
    for (const id of ['source-collect', 'terminal-collect']) {
      const block = levelsSrc.match(new RegExp(`id: '${id}'[\\s\\S]*?\\},`));
      expect(block).not.toBeNull();
      expect(block![0]).not.toContain('unknownCaption');
    }
  });
});

// Behavior model of the gate: derived purely from the step flag, independent
// of discovery state.
const captionVisible = (step: { unknownCaption?: boolean }): boolean =>
  !!step.unknownCaption;

describe('"???" visibility is flag-driven, not discovery-driven', () => {
  it('a notice step shows "???"', () => {
    expect(captionVisible({ unknownCaption: true })).toBe(true);
  });

  it('a non-notice step does not show "???"', () => {
    expect(captionVisible({})).toBe(false);
    expect(captionVisible({ unknownCaption: false })).toBe(false);
  });
});
